<template>
  <div class="lumo-assistant">
    <!-- Floating Container -->
    <div class="lumo-floating-container">
      <!-- Live2D Canvas - 點擊可打開/關閉對話框 -->
      <canvas ref="canvas" class="lumo-canvas" style="cursor: pointer" />
      <!-- Shadow Element -->
      <div ref="shadow" class="lumo-shadow" />
      <!-- ✨ Spotlight 效果 -->
      <div ref="spotlight" class="lumo-spotlight" />
    </div>

    <!-- 💬 對話框 -->
    <div ref="dialogBox" class="lumo-dialog-box" v-show="state.isDialogVisible">
      <button class="dialog-close-btn" @click="closeDialog">✕</button>
      <div class="dialog-content">
        <div ref="dialogText" class="dialog-text">
          <!-- 文字會通過 JavaScript 動態插入 -->
        </div>
      </div>
      <!-- 💬 消息指示器 - 顯示現在是第幾句話 -->
      <div class="message-indicators">
        <span
          v-for="(msg, i) in config.dialog.messages"
          :key="i"
          :class="{ active: i === state.currentMessageIndex }"
          class="indicator-dot"
        ></span>
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

// ========================================
// 🎛️ 配置參數 - 在這裡調整組件行為
// ========================================
const config = {
  // 🎙️ 對話框配置
  dialog: {
    messages: [
      '✨ 哈囉！我是你的 Lumo 助手，很高興認識你！',
      '🚗 我可以即時模擬車流，幫你了解交通狀況！',
      '🚦 透過路口車流預測綠燈秒數，讓通行更順暢。',
      '📊 將複雜的交通數據視覺化，讓資訊一目了然。',
      '🌍 我的目標是讓城市交通更流暢、更高效！',
      '😊 我會繼續努力，為用路人創造更順暢的出行體驗！',
    ],
    messageInterval: 6, // 每句話間隔時間（秒）
    messageCharStagger: 0.05, // 字符之間的延遲（秒）
    dialogOpenDuration: 0.6, // 對話框打開動畫時長（秒）
    dialogCloseDuration: 0.5, // 對話框關閉動畫時長（秒）
    typingCharDuration: 0.05, // 每個字符顯示時長（秒）
    isOpenOnInit: false, // 初始化時是否打開對話框
    autoRepeat: true, // 對話框是否自動循環播放
  },

  // 🎯 浮動動畫配置
  floating: {
    floatDistance: 20, // 浮動距離（像素）
    floatDuration: 5, // 浮動周期（秒）
    shadowScale: 0.8, // 陰影縮放比例
    shadowOpacity: 0.5, // 陰影透明度
  },

  // 👁️ 鼠標追蹤配置
  mouseTracking: {
    paramRangeX: 60, // X 軸參數範圍
    paramRangeY: 60, // Y 軸參數範圍
    easingFactor: 0.05, // 緩動因子（越小越平順）
  },

  // ✨ 聚光燈配置
  spotlight: {
    width: 150, // 聚光燈寬度（像素，border-left/right）
    height: 500, // 聚光燈高度（像素，border-bottom）
    offsetX: 30, // 聚光燈水平位置（像素，正值往右）
    offsetY: -100, // 聚光燈垂直位置（負值表示在下方）
    rotation: -20, // 聚光燈旋轉角度（度數，0-360）
    opacity: 0.3, // 聚光燈三角形透明度（0-1）
    blurAmount: 30, // 模糊程度（像素）
    shadowBlur: 50, // 發光陰影模糊（像素）
    shadowIntensity: 0.8, // 發光強度（0-1）
  },
}

// Refs
const canvas = ref(null)
const shadow = ref(null)
const spotlight = ref(null)
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
  easingFactor: config.mouseTracking.easingFactor,
  // 💬 對話框狀態
  dialogMessages: config.dialog.messages,
  currentMessageIndex: 0,
  isDialogVisible: config.dialog.isOpenOnInit, // 根據配置決定初始狀態
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

    // 🖱️ Canvas 點擊事件監聽
    canvas.value.addEventListener('click', () => {
      // 觸發搖晃動畫
      triggerCanvasShake()
      // 切換對話框
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
    state.targetParamX = (e.clientX / window.innerWidth - 0.5) * config.mouseTracking.paramRangeX
    state.targetParamY = (e.clientY / window.innerHeight - 0.5) * -config.mouseTracking.paramRangeY
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
    y: -config.floating.floatDistance,
    duration: config.floating.floatDuration,
    ease: 'sine.inOut',
  })

  // 🎯 陰影同步：往上浮動時縮小，往下浮動時放大
  tl.to(shadow.value, {
    scale: config.floating.shadowScale,
    opacity: config.floating.shadowOpacity,
    duration: config.floating.floatDuration,
    ease: 'sine.inOut',
  })
}

// 💬 顯示對話框文字（使用 GSAP SplitText 帶打字效果）
function showDialogMessage(messageIndex) {
  if (!dialogText.value) return

  const message = state.dialogMessages[messageIndex] || ''

  // 清除所有舊的動畫和 DOM
  gsap.killTweensOf(dialogText.value)
  const oldChars = dialogText.value.querySelectorAll('.char')
  if (oldChars.length > 0) {
    gsap.killTweensOf(oldChars)
  }

  // 重置 DOM 內容
  dialogText.value.innerHTML = ''
  dialogText.value.textContent = message

  // 使用 SplitText 分割文字為字符
  const split = new SplitText(dialogText.value, {
    type: 'chars',
    charsClass: 'char',
  })

  const chars = split.chars
  if (chars.length === 0) return

  // 設置初始狀態 - 所有字符先隱藏
  gsap.set(chars, {
    opacity: 0,
  })

  // 創建動畫 - 使用 stagger 實現逐字打字效果
  const tl = gsap.timeline()

  // 創建光標元素
  const cursor = document.createElement('span')
  cursor.className = 'typing-cursor'
  cursor.textContent = '│'

  // 計算 stagger 延遲
  const charDuration = config.dialog.typingCharDuration
  const staggerDelay = config.dialog.messageCharStagger

  // 為每個字符創建出現和光標更新的時序
  chars.forEach((char, index) => {
    const time = index * staggerDelay

    // 字符出現動畫
    tl.to(
      char,
      {
        opacity: 1,
        duration: charDuration,
        ease: 'steps(1)',
      },
      time,
    )

    // 字符出現後，將光標移到該字符後面
    tl.call(
      () => {
        // 移除舊光標
        if (cursor.parentNode) {
          cursor.remove()
        }
        // 在當前字符後面插入光標
        char.parentNode.insertBefore(cursor, char.nextSibling)
      },
      null,
      time + charDuration * 0.5,
    )
  })

  // 動畫完成後：光標留在文字尾巴繼續閃爍
  tl.call(() => {
    // 先 revert（合併所有字符）
    split.revert()

    // revert 後，重新添加光標到文字容器末尾
    // 清除舊光標
    const oldCursor = dialogText.value.querySelector('.typing-cursor')
    if (oldCursor) {
      oldCursor.remove()
    }

    // 使用 nextTick 確保 DOM 更新後再添加光標
    nextTick(() => {
      // 確保光標有正確的類名和內容
      cursor.className = 'typing-cursor'
      cursor.textContent = '│'
      dialogText.value.appendChild(cursor)

      // 使用 GSAP 直接控制光標閃爍動畫（避免 CSS scoped 作用域問題）
      const cursorBlink = gsap.timeline({ repeat: -1, repeatDelay: 0 })
      cursorBlink.to(
        cursor,
        {
          opacity: 0,
          duration: 0.3,
          ease: 'none',
        },
        0,
      )
      cursorBlink.to(
        cursor,
        {
          opacity: 1,
          duration: 0.3,
          ease: 'none',
        },
        0.3,
      )
    })
  })
}

// 💬 開啟對話框
function openDialog() {
  state.isDialogVisible = true
  state.currentMessageIndex = 0

  if (!dialogBox.value) return

  nextTick(() => {
    // ✨ 設置 Spotlight 的 CSS 變數
    spotlight.value.style.setProperty('--spotlight-width', `${config.spotlight.width}px`)
    spotlight.value.style.setProperty('--spotlight-height', `${config.spotlight.height}px`)
    spotlight.value.style.setProperty('--spotlight-offset-x', `${config.spotlight.offsetX}px`)
    spotlight.value.style.setProperty('--spotlight-offset-y', `${config.spotlight.offsetY}px`)
    spotlight.value.style.setProperty('--spotlight-rotation', `${config.spotlight.rotation}deg`)
    spotlight.value.style.setProperty('--spotlight-opacity', config.spotlight.opacity)
    spotlight.value.style.setProperty('--spotlight-blur', `${config.spotlight.blurAmount}px`)
    spotlight.value.style.setProperty('--spotlight-shadow-blur', `${config.spotlight.shadowBlur}px`)
    spotlight.value.style.setProperty('--spotlight-intensity', config.spotlight.shadowIntensity)

    // Spotlight 進場動畫
    spotlight.value.classList.add('active')
    gsap.fromTo(
      spotlight.value,
      { opacity: 0, scale: 0.5 },
      {
        opacity: 1,
        scale: 1,
        duration: config.dialog.dialogOpenDuration * 0.8,
        ease: 'back.out',
      },
    )

    // 對話框進場動畫
    gsap.fromTo(
      dialogBox.value,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: config.dialog.dialogOpenDuration,
        ease: 'back.out',
      },
    )

    // 建立 Timeline 管理消息播放時序
    if (dialogTimeline) {
      dialogTimeline.kill()
    }

    dialogTimeline = gsap.timeline({
      repeat: config.dialog.autoRepeat ? -1 : 0, // 根據配置決定是否循環
      repeatDelay: 0,
    })

    // 根據消息數量動態生成播放時序
    const messageInterval = config.dialog.messageInterval
    config.dialog.messages.forEach((msg, index) => {
      const time = index * messageInterval
      dialogTimeline.add(() => {
        showDialogMessage(index)
        state.currentMessageIndex = (index + 1) % config.dialog.messages.length
      }, time)
    })

    // 設置 Timeline 總時長
    const totalDuration = config.dialog.messages.length * messageInterval
    dialogTimeline.set({}, {}, totalDuration)
  })
}

// 💬 關閉對話框
function closeDialog() {
  if (!state.isDialogVisible) return

  if (!dialogBox.value) {
    state.isDialogVisible = false
    return
  }

  // ✨ Spotlight 退場動畫並移除脈衝效果
  spotlight.value.classList.remove('active')
  gsap.to(spotlight.value, {
    opacity: 0,
    scale: 0.5,
    duration: config.dialog.dialogCloseDuration,
    ease: 'back.in',
  })

  gsap.to(dialogBox.value, {
    y: 20,
    opacity: 0,
    duration: config.dialog.dialogCloseDuration,
    ease: 'back.in',
    onComplete: () => {
      state.isDialogVisible = false

      if (dialogTimeline) {
        dialogTimeline.kill()
        dialogTimeline = null
      }
    },
  })
}

// 💬 切換對話框顯示/隱藏
function toggleDialog() {
  if (state.isDialogVisible) {
    closeDialog()
  } else {
    openDialog()
  }
}

// 🎯 觸發 Lumo 搖晃動畫
function triggerCanvasShake() {
  if (!canvas.value) return

  // 移除舊的搖晃效果
  canvas.value.classList.remove('shake')

  // 觸發重排以重新開始動畫
  void canvas.value.offsetWidth

  // 添加搖晃類名
  canvas.value.classList.add('shake')

  // 動畫完成後移除類名
  setTimeout(() => {
    canvas.value.classList.remove('shake')
  }, 400)
}

onMounted(() => {
  initialize()

  // 延遲執行以確保 DOM 已準備好
  nextTick(() => {
    // 根據配置決定是否打開對話框
    if (config.dialog.isOpenOnInit) {
      openDialog()
    }
  })
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
  cursor: pointer;
  transition: all 0.1s ease;
}

/* 🎯 Lumo 被點擊時的搖晃動畫 */
.lumo-canvas.shake {
  animation: canvasShake 0.4s ease-in-out;
}

@keyframes canvasShake {
  0%,
  100% {
    transform: translateX(0) rotate(0deg);
  }
  25% {
    transform: translateX(-4px) rotate(-1deg);
  }
  50% {
    transform: translateX(4px) rotate(1deg);
  }
  75% {
    transform: translateX(-2px) rotate(-0.5deg);
  }
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

/* ✨ Spotlight 效果 - 從下往上照在 Lumo 身上 */
.lumo-spotlight {
  position: absolute;
  bottom: var(--spotlight-offset-y, -100px);
  left: calc(50% + var(--spotlight-offset-x, 0px));
  transform: translateX(-50%) rotate(var(--spotlight-rotation, 0deg));
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: -1;
  opacity: 0;
  /* 旋轉中心設在聚光燈頂部中間（底面中心） */
  transform-origin: center bottom;

  /* 三角形聚光燈 - 頂點朝下（指向 Lumo），底面在下方 */
  border-left: var(--spotlight-width, 150px) solid transparent;
  border-right: var(--spotlight-width, 150px) solid transparent;
  border-bottom: var(--spotlight-height, 500px) solid rgba(0, 220, 255, var(--spotlight-opacity, 0.5));

  /* 聚光燈模糊效果 - 柔和打在 Lumo 身上 */
  filter: blur(var(--spotlight-blur, 40px))
    drop-shadow(0 -20px var(--spotlight-shadow-blur, 50px) rgba(0, 200, 255, var(--spotlight-intensity, 0.8)));
}

/* 💬 對話框樣式 */
.lumo-dialog-box {
  position: absolute;
  top: 110px;
  left: 200px;
  width: 550px;
  background: linear-gradient(135deg, rgba(0, 20, 40, 0.4) 0%, rgba(10, 30, 60, 0.4) 100%);
  border: 2px solid rgba(0, 200, 255, 0.8);
  border-radius: 16px;
  box-shadow:
    0 0 25px rgba(0, 200, 255, 0.5),
    0 0 45px rgba(150, 100, 255, 0.3),
    inset 0 0 20px rgba(0, 200, 255, 0.1);
  backdrop-filter: blur(2px);
  z-index: 10;
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

/* 💬 對話框關閉按鈕 */
.dialog-close-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: rgba(0, 200, 255, 0.7);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: 0.2s ease;
  z-index: 11;
}

.dialog-close-btn:hover {
  color: rgba(0, 200, 255, 1);
  background: rgba(0, 200, 255, 0.1);
  border: 1px solid rgba(0, 200, 255, 0.5);
}

.dialog-close-btn:active {
  transform: scale(0.95);
}

.dialog-content {
  padding: 30px 20px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-text {
  color: #ffffff;
  line-height: 1.6;
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  font-weight: 300;
  text-align: center;
  /* 文字發光效果 */
  text-shadow:
    0 0 5px rgba(0, 200, 255, 0.3),
    0 0 10px rgba(100, 150, 255, 0.2);
  position: relative;
  display: inline-block;
}

/* 💬 動態光標樣式 */
.typing-cursor {
  display: inline-block;
  color: rgba(0, 200, 255, 0.9);
  font-weight: bold;
  animation: cursorBlink 0.6s steps(2) infinite !important;
  margin: 0 1px;
  width: auto;
  height: 1em;
}

@keyframes cursorBlink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

/* 💬 消息指示器容器 */
.message-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 15px 0;
  border-top: 1px solid rgba(0, 200, 255, 0.2);
}

/* 💬 單個指示點 */
.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(0, 200, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 200, 255, 0.5);
}

/* 💬 活躍的指示點 */
.indicator-dot.active {
  background: rgba(0, 200, 255, 0.9);
  width: 12px;
  height: 12px;
  box-shadow: 0 0 12px rgba(0, 200, 255, 0.6);
  animation: indicatorPulse 1s ease-in-out infinite;
}

/* ✨ 指示點脈衝動畫 */
@keyframes indicatorPulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 12px rgba(0, 200, 255, 0.6);
  }
  50% {
    transform: scale(1.3);
    box-shadow: 0 0 20px rgba(0, 200, 255, 0.8);
  }
}

/* 💬 非活躍點懸停效果 */
.indicator-dot:hover:not(.active) {
  background: rgba(0, 200, 255, 0.5);
  transform: scale(1.2);
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
