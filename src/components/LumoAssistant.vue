<template>
  <div class="lumo-assistant">
    <!-- Floating Container -->
    <div ref="floatingContainer" class="lumo-floating-container">
      <!-- Live2D Canvas - 點擊可打開/關閉對話框 -->
      <canvas ref="canvas" class="lumo-canvas" style="cursor: pointer" />
      <!-- Shadow Element -->
      <div ref="shadow" class="lumo-shadow" />
    </div>

    <!-- 💬 對話框 -->
    <div ref="dialogBox" class="lumo-dialog-box" v-show="state.isDialogVisible">
      <div class="dialog-header">
        <div class="dialog-title">Lumo Assistant</div>
      </div>
      <div class="dialog-content">
        <div ref="dialogText" class="dialog-text">
          <!-- 文字會通過 JavaScript 動態插入 -->
        </div>
      </div>
      <div class="dialog-footer">
        <div class="dialog-indicator">
          <span ref="dotIndicator" class="indicator-dot"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

// Refs
const floatingContainer = ref(null)
const canvas = ref(null)
const shadow = ref(null)
const dialogBox = ref(null)
const dialogText = ref(null)
const dotIndicator = ref(null)

// State
const state = reactive({
  app: null,
  model: null,
  resizeTimer: null,
  targetParamX: 0,
  targetParamY: 0,
  currentParamX: 0,
  currentParamY: 0,
  easingFactor: 0.05,
  particles: [],
  particleCtx: null,
  animationFrameId: null,
  // 💬 對話框狀態
  dialogMessages: [
    '你好！我是 Lumo，虛擬交通助手。',
    '我負責實時監控和分析交通流量數據。',
    '通過 AI 分析，我能預測交通擁堵情況。',
    '讓我們一起建立更智能的城市交通系統！',
  ],
  currentMessageIndex: 0,
  isDialogVisible: false, // 默認隱藏對話框
  dialogInterval: null,
})

// Initialize
async function initialize() {
  try {
    // 檢查必要的庫 - 使用重試機制
    let retryCount = 0
    const maxRetries = 50
    while (
      (typeof window.PIXI === 'undefined' || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) &&
      retryCount < maxRetries
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      retryCount++
    }

    if (typeof window.PIXI === 'undefined') {
      console.error('❌ PIXI 庫未加載')
      return
    }

    if (!window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) {
      console.error('❌ PIXI Live2D 擴展未加載')
      return
    }

    if (!canvas.value) {
      console.error('❌ Canvas 未找到')
      return
    }

    // 建立 PIXI 應用
    state.app = new window.PIXI.Application({
      view: canvas.value,
      autoStart: true,
      resizeTo: window,
      transparent: true,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    })

    // 加載 Live2D 模型
    const modelPath = '/Lumo/Resources/robot/robot.model3.json'
    state.model = await window.PIXI.live2d.Live2DModel.from(modelPath)
    // 將模型添加到舞台
    state.app.stage.addChild(state.model)

    // 初始化佈局
    updateLayout()
    window.addEventListener('resize', onResize)

    // 啟用滑鼠追蹤
    setupMouseTracking()

    // 啟用浮動動畫
    startFloatingAnimation()

    // 🖱️ 在 Canvas 上添加點擊事件監聽器
    canvas.value.addEventListener('click', () => {
      console.log('🖱️ Canvas 被點擊，切換對話框狀態')
      toggleDialog()
    })
  } catch (error) {
    console.error('❌ Lumo 初始化失敗:', error)
    console.error('詳細信息:', error.stack)
  }
}

// Update layout
function updateLayout() {
  if (!state.model || !state.app) return

  const screenWidth = state.app.screen.width
  const screenHeight = state.app.screen.height

  if (!screenWidth || !screenHeight || !state.model.internalModel) {
    requestAnimationFrame(() => updateLayout())
    return
  }

  const { width: modelWidth, height: modelHeight } = state.model.internalModel

  if (modelHeight === 0 || modelWidth === 0) {
    requestAnimationFrame(() => updateLayout())
    return
  }

  const margin = 10
  const usableWidth = screenWidth - 2 * margin
  const usableHeight = screenHeight - 2 * margin

  const scaleToWidth = usableWidth / modelWidth
  const scaleToHeight = usableHeight / modelHeight
  let scale = Math.min(scaleToWidth, scaleToHeight)

  if (!isFinite(scale) || scale <= 0) scale = 0.5

  state.model.scale.set(scale)
  state.model.anchor.set(0.5, 1)
  state.model.position.set(screenWidth / 2, screenHeight - margin)
}

// Handle resize
function onResize() {
  clearTimeout(state.resizeTimer)
  state.resizeTimer = setTimeout(() => {
    updateLayout()
  }, 100)
}

// Setup mouse tracking
function setupMouseTracking() {
  if (!state.model || !state.app) return

  window.addEventListener('pointermove', (e) => {
    state.targetParamX = (e.clientX / window.innerWidth - 0.5) * 60
    state.targetParamY = (e.clientY / window.innerHeight - 0.5) * -60
  })

  document.addEventListener('mouseleave', () => {
    state.targetParamX = 0
    state.targetParamY = 0
  })

  state.app.ticker.add(() => {
    state.currentParamX += (state.targetParamX - state.currentParamX) * state.easingFactor
    state.currentParamY += (state.targetParamY - state.currentParamY) * state.easingFactor

    if (state.model?.internalModel?.coreModel) {
      state.model.internalModel.coreModel.setParameterValueById('BODY_ANGLE_X', state.currentParamX)
      state.model.internalModel.coreModel.setParameterValueById('BODY_ANGLE_Y', state.currentParamY)
    }
  })
}

// Start floating animation
async function startFloatingAnimation() {
  // ✅ 建立 timeline 時明確指定 paused: false
  const tl = gsap.timeline({
    repeat: -1,
    yoyo: true,
    paused: false,
  })

  // 🎯 容器上下浮動
  tl.to(canvas.value, {
    y: -20,
    duration: 5,
    ease: 'sine.inOut',
  })

  // 🎯 陰影同步：往上浮動時縮小，往下浮動時放大
  tl.to(shadow.value, {
    scale: 0.8,
    opacity: 0.5,
    duration: 5,
    ease: 'sine.inOut',
  })
}

// 💬 顯示對話框文字（帶打字效果）
function showDialogMessage(messageIndex) {
  if (!dialogText.value) return

  const message = state.dialogMessages[messageIndex] || ''
  let currentIndex = 0

  // 清空文字
  dialogText.value.textContent = ''

  // 使用 GSAP timeline 實現打字效果
  const charTimeline = gsap.timeline()

  const addChar = () => {
    if (currentIndex < message.length) {
      dialogText.value.textContent += message[currentIndex]
      currentIndex++
      charTimeline.call(addChar, null, `+=${0.05}`) // 每個字 50ms
    }
  }

  charTimeline.call(addChar)
}

// 💬 播放下一句對話
function playNextDialog() {
  showDialogMessage(state.currentMessageIndex)
  state.currentMessageIndex = (state.currentMessageIndex + 1) % state.dialogMessages.length

  // 更新指示器動畫
  if (dotIndicator.value) {
    gsap.to(dotIndicator.value, {
      opacity: 0.3,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
    })
  }
}

// 💬 開啟對話框
function openDialog() {
  if (state.isDialogVisible) return

  console.log('📖 開啟對話框')
  state.isDialogVisible = true
  state.currentMessageIndex = 0

  // 確保 dialogBox 已掛載
  if (!dialogBox.value) {
    console.warn('⚠️ dialogBox 未掛載')
    return
  }

  // 對話框進場動畫
  gsap.fromTo(
    dialogBox.value,
    { y: 20, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: 'back.out',
    },
  )

  // 立即播放第一條消息
  showDialogMessage(0)

  // 每隔 4 秒播放下一條消息
  if (state.dialogInterval) {
    clearInterval(state.dialogInterval)
  }
  state.dialogInterval = setInterval(() => {
    playNextDialog()
  }, 4000)

  console.log('✅ 對話框已打開，isDialogVisible =', state.isDialogVisible)
}

// 💬 關閉對話框
function closeDialog() {
  if (!state.isDialogVisible) return

  console.log('📖 關閉對話框')

  // 確保 dialogBox 已掛載
  if (!dialogBox.value) {
    console.warn('⚠️ dialogBox 未掛載')
    state.isDialogVisible = false
    return
  }

  // 對話框退場動畫
  gsap.to(dialogBox.value, {
    y: 20,
    opacity: 0,
    duration: 0.5,
    ease: 'back.in',
    onComplete: () => {
      console.log('✅ 對話框動畫完成')
      state.isDialogVisible = false

      // 清理 interval
      if (state.dialogInterval) {
        clearInterval(state.dialogInterval)
        state.dialogInterval = null
      }

      console.log('✅ 對話框已關閉，isDialogVisible =', state.isDialogVisible)
    },
  })
}

// 💬 切換對話框顯示/隱藏
function toggleDialog() {
  console.log('🔄 toggleDialog 被呼叫，當前狀態:', state.isDialogVisible)

  if (state.isDialogVisible) {
    closeDialog()
  } else {
    openDialog()
  }
}

// 💬 初始化對話框動畫
function initializeDialog() {
  // 初始狀態：對話框隱藏
  // 等待用戶點擊 Lumo 來開啟對話框
}
onMounted(() => {
  initialize()
  initializeDialog()
})

onBeforeUnmount(() => {
  if (state.floatingTimeline) {
    state.floatingTimeline.kill()
  }
  if (state.dialogInterval) {
    clearInterval(state.dialogInterval)
  }
  if (state.app) {
    state.app.destroy()
  }
  clearTimeout(state.resizeTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.lumo-assistant {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 12px;
  display: flex;
}

.lumo-floating-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.lumo-canvas {
  width: 320px;
  height: 150px;
  position: relative;
  top: 20px;
}

.lumo-shadow {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 20px;

  /* 🎆 多層次科技感漸層 - 藍紫漸變 */
  background:
    radial-gradient(ellipse 120px 30px at 50% 30%, rgba(0, 200, 255, 0.8) 0%, transparent 60%),
    radial-gradient(ellipse 150px 25px at 50% 50%, rgba(100, 150, 255, 0.5) 0%, transparent 70%),
    radial-gradient(ellipse 140px 20px at 50% 70%, rgba(200, 100, 255, 0.4) 0%, transparent 80%);

  border-radius: 50%;

  /* 🌟 多層次濾鏡效果 - 發光 + 模糊 + 飽和度 */
  filter: blur(12px) drop-shadow(0 0 15px rgba(0, 200, 255, 0.6)) drop-shadow(0 0 30px rgba(150, 100, 255, 0.3))
    saturate(1.3);

  z-index: 1;
  pointer-events: none;
  opacity: 0.8;

  /* 動畫性能優化 */
  will-change: transform, opacity, filter;
  transform-origin: center center;

  /* 陰影本身的發光效果 */
  box-shadow:
    0 0 25px rgba(0, 200, 255, 0.5),
    0 0 40px rgba(150, 100, 255, 0.3),
    inset -30px -5px 40px rgba(0, 255, 200, 0.2);
}

/* 💬 對話框樣式 */
.lumo-dialog-box {
  position: absolute;
  top: 100px;
  right: -250px;
  width: 320px;
  background: linear-gradient(135deg, rgba(0, 20, 40, 0.95) 0%, rgba(10, 30, 60, 0.95) 100%);
  border: 2px solid rgba(0, 200, 255, 0.5);
  border-radius: 16px;
  box-shadow:
    0 0 20px rgba(0, 200, 255, 0.3),
    0 0 40px rgba(150, 100, 255, 0.2),
    inset 0 0 20px rgba(0, 200, 255, 0.1);
  backdrop-filter: blur(10px);
  z-index: 10;
  overflow: hidden;
  pointer-events: auto;
}

.dialog-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 200, 255, 0.3);
  background: linear-gradient(90deg, rgba(0, 150, 255, 0.1) 0%, rgba(150, 100, 255, 0.1) 100%);
}

.dialog-title {
  font-size: 14px;
  font-weight: 600;
  color: #00c8ff;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(0, 200, 255, 0.5);
}

.dialog-content {
  padding: 20px 16px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-text {
  font-size: 14px;
  color: #ffffff;
  line-height: 1.6;
  letter-spacing: 0.5px;
  text-align: center;
  font-weight: 300;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;

  /* 文字發光效果 */
  text-shadow:
    0 0 5px rgba(0, 200, 255, 0.3),
    0 0 10px rgba(100, 150, 255, 0.2);
}

.dialog-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(0, 200, 255, 0.3);
  display: flex;
  justify-content: center;
  background: linear-gradient(90deg, rgba(0, 150, 255, 0.05) 0%, rgba(150, 100, 255, 0.05) 100%);
}

.dialog-indicator {
  display: flex;
  gap: 6px;
  align-items: center;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(0, 200, 255, 0.8), rgba(100, 150, 255, 0.6));
  box-shadow: 0 0 8px rgba(0, 200, 255, 0.6);
  opacity: 0.8;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 0.8;
    box-shadow: 0 0 8px rgba(0, 200, 255, 0.6);
  }
  50% {
    opacity: 0.4;
    box-shadow: 0 0 12px rgba(0, 200, 255, 0.8);
  }
}

/* 對話框響應式調整 */
@media (max-width: 600px) {
  .lumo-dialog-box {
    width: 280px;
    top: 10px;
    right: 10px;
  }

  .dialog-text {
    font-size: 13px;
  }
}
</style>
