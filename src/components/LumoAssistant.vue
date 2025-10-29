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
      <div class="dialog-content">
        <div ref="dialogText" class="dialog-text">
          <!-- 文字會通過 JavaScript 動態插入 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

// 註冊 GSAP 插件
gsap.registerPlugin(SplitText)

// Refs
const floatingContainer = ref(null)
const canvas = ref(null)
const shadow = ref(null)
const dialogBox = ref(null)
const dialogText = ref(null)

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
    '你好！我是 Lumo 小助手！',
    '我負責模擬車流和分析交通流量數據。',
    '通過車流數據，我能預測綠燈秒數。',
    '讓我們一起建立更智能的城市交通系統！',
  ],
  currentMessageIndex: 0,
  isDialogVisible: false, // 默認隱藏對話框
})

// 💬 對話框 Timeline（不放在 reactive 中，直接使用變量）
let dialogTimeline = null

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

// 💬 顯示對話框文字（使用 GSAP SplitText 帶打字效果）
function showDialogMessage(messageIndex) {
  console.log(`\n📝 ===== showDialogMessage 開始 =====`)
  console.log(`messageIndex: ${messageIndex}`)
  console.log(`dialogText.value: ${dialogText.value}`)
  console.log(`dialogText.value?.textContent: "${dialogText.value?.textContent}"`)

  if (!dialogText.value) {
    console.error(`❌ dialogText.value 為空！`)
    return
  }

  const message = state.dialogMessages[messageIndex] || ''
  console.log(`message: "${message}"`)

  // 🔄 首先清除所有舊的動畫
  gsap.killTweensOf(dialogText.value)
  const oldChars = dialogText.value.querySelectorAll('.char')
  console.log(`oldChars 數量: ${oldChars.length}`)
  if (oldChars.length > 0) {
    gsap.killTweensOf(oldChars)
  }

  // 清空並重置 DOM
  dialogText.value.innerHTML = ''
  console.log(`✅ 已清空 innerHTML`)

  // 設置純文本內容
  dialogText.value.textContent = message
  console.log(`✅ 已設置 textContent: "${dialogText.value.textContent}"`)

  // 使用 SplitText 將文字分割成字符
  console.log(`開始 SplitText 分割...`)
  const split = new SplitText(dialogText.value, {
    type: 'chars',
    charsClass: 'char', // 給每個字符添加類名
  })

  const chars = split.chars
  console.log(`✅ SplitText 分割完成，字符數: ${chars.length}`)
  console.log(`DOM 內容: ${dialogText.value.innerHTML}`)

  if (chars.length === 0) {
    console.warn(`⚠️ 沒有字符被分割，textContent: "${dialogText.value.textContent}"`)
    return
  }

  // 設置初始狀態 - 所有字符透明
  console.log(`設置初始狀態...`)
  gsap.set(chars, {
    opacity: 0,
    y: 10,
  })
  console.log(`✅ 初始狀態設置完成`)

  // 創建動畫時間軸
  const tl = gsap.timeline()
  console.log(`✅ Timeline 建立`)

  // 逐字動畫進入
  console.log(`開始動畫...`)
  tl.to(
    chars,
    {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.06, // 每個字間隔 60ms
      ease: 'back.out',
    },
    0, // 立即開始
  )
  console.log(`✅ 動畫已添加到 Timeline`)

  // 動畫完成後重新合併文字
  tl.call(() => {
    split.revert()
    console.log(`✅ 第 ${messageIndex + 1} 句對話顯示完成`)
  })

  console.log(`📝 ===== showDialogMessage 結束 =====\n`)
}

// 💬 關閉對話框
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

  // ⏳ 等待 DOM 更新後再播放動畫
  // （v-show 需要時間同步，確保 DOM 在可見狀態下）
  nextTick(() => {
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

    // 🎬 建立 Timeline 管理所有消息播放時序
    if (dialogTimeline) {
      dialogTimeline.kill()
    }

    dialogTimeline = gsap.timeline({
      repeat: -1, // 無限循環
      repeatDelay: 0, // 循環無延遲
    })

    console.log('🎬 Timeline 已建立')

    // 第一句話立即播放
    dialogTimeline.add(() => {
      console.log('📝 Timeline.add: 播放第 1 句')
      showDialogMessage(0)
      state.currentMessageIndex = 1
    }, 0)

    // 第二句話 - 等 4 秒後播放
    dialogTimeline.add(() => {
      console.log('📝 Timeline.add: 播放第 2 句')
      showDialogMessage(1)
      state.currentMessageIndex = 2
    }, 4)

    // 第三句話 - 等 8 秒後播放
    dialogTimeline.add(() => {
      console.log('📝 Timeline.add: 播放第 3 句')
      showDialogMessage(2)
      state.currentMessageIndex = 3
    }, 8)

    // 第四句話 - 等 12 秒後播放
    dialogTimeline.add(() => {
      console.log('📝 Timeline.add: 播放第 4 句')
      showDialogMessage(3)
      state.currentMessageIndex = 0
    }, 12)

    // 添加一個空動畫來設定 Timeline 的總時長（16秒）
    dialogTimeline.set({}, {}, 16)

    console.log(`✅ Timeline 設置完成，總時長: ${dialogTimeline.totalDuration()}`)
  })

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

      // 清理 Timeline
      if (dialogTimeline) {
        dialogTimeline.kill()
        dialogTimeline = null
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
  if (dialogTimeline) {
    dialogTimeline.kill()
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
  left: -30px;
}

.lumo-shadow {
  position: absolute;
  bottom: 20px;
  left: 15%;
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
  top: 120px;
  right: -220px;
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
  overflow: visible;
  pointer-events: auto;
}

/* 💬 對話框三角形指針（指向 Lumo） */
.lumo-dialog-box::before {
  content: '';
  position: absolute;
  left: -22px;
  top: 15px;
  width: 0;
  height: 0;
  border-style: solid;
  /* 向左指向：上下邊界透明，右邊是實心顏色 */
  border-width: 12px 22px 12px 0;
  border-color: transparent rgba(0, 200, 255, 0.5) transparent transparent;
}

/* 💬 對話框三角形指針內部填充 */
.lumo-dialog-box::after {
  content: '';
  position: absolute;
  left: -18px;
  top: 18px;
  width: 0;
  height: 0;
  border-style: solid;
  /* 內部三角形，填充對話框背景色 */
  border-width: 9px 18px 9px 0;
  border-color: transparent rgba(0, 20, 40, 0.95) transparent transparent;
}

.dialog-content {
  padding: 24px 20px;
  min-height: 80px;
}

.dialog-text {
  color: #ffffff;
  line-height: 1.6;
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  font-weight: 300;
  min-height: 60px;
  /* 文字發光效果 */
  text-shadow:
    0 0 5px rgba(0, 200, 255, 0.3),
    0 0 10px rgba(100, 150, 255, 0.2);
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
