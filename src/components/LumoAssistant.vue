<template>
  <div class="lumo-assistant">
    <!-- Floating Container -->
    <div class="lumo-floating-container">
      <!-- Live2D Canvas - 點擊可打開/關閉對話框 -->
      <canvas ref="canvas" class="lumo-canvas" style="cursor: pointer" />
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
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

// 註冊 GSAP 插件
gsap.registerPlugin(SplitText)

// ========================================
// 💬 Props 定義
// ========================================
const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
})

// ========================================
// 🎬 全局動畫管理 - 處理標籤頁可見性
// ========================================
let isAnimationsPaused = false
const pausedTimelines = [] // 記錄所有被暫停的時間軸

// ✅ 【修復】保存事件監聽器引用，以便後續清理
const eventHandlers = {
  pointerMove: null,
  mouseLeave: null,
  canvasClick: null,
}

function pauseAllAnimations() {
  if (!isAnimationsPaused) {
    try {
      // 1️⃣ 暫停全局時間軸
      gsap.globalTimeline.pause()

      // 2️⃣ 暫停所有活動的 GSAP 動畫（包括車輛、天氣等）
      // ✅ 【修復】清空之前的 pausedTimelines 以防止累積引用
      pausedTimelines.length = 0
      const allTweens = gsap.getTweensOf()
      allTweens.forEach((tween) => {
        if (tween && !tween.paused()) {
          pausedTimelines.push(tween)
          tween.pause()
        }
      })

      // 3️⃣ 暫停車輛的移動時間軸（通過全局變量存取）
      // ✅ 【修復】檢查 window.liveVehicles（更可靠）而不是 window.allVehicles
      const liveVehicles = window.liveVehicles || window.allVehicles || []
      if (liveVehicles && liveVehicles.length > 0) {
        liveVehicles.forEach((vehicle) => {
          if (vehicle && vehicle.movementTimeline && !vehicle.movementTimeline.paused()) {
            pausedTimelines.push(vehicle.movementTimeline)
            vehicle.movementTimeline.pause()
          }
        })
      }

      isAnimationsPaused = true
    } catch (error) {
      console.error('🔴 [Lumo] pauseAllAnimations 出現錯誤:', error)
    }
  }
}

function resumeAllAnimations() {
  if (isAnimationsPaused) {
    // 1️⃣ 恢復全局時間軸
    gsap.globalTimeline.play()

    // 2️⃣ 恢復所有被暫停的動畫
    // ✅ 【修復】使用 for 迴圈並驗證 timeline 有效性，防止懸空引用
    for (let i = pausedTimelines.length - 1; i >= 0; i--) {
      const timeline = pausedTimelines[i]
      if (timeline && typeof timeline.play === 'function') {
        try {
          if (timeline.paused?.()) {
            timeline.play()
          }
        } catch (e) {
          console.warn(`[Lumo] 恢復動畫失敗: ${e.message}`)
        }
      }
    }
    pausedTimelines.length = 0 // 清空列表

    isAnimationsPaused = false
  }
}

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
    messageCharStagger: 0.025, // 字符之間的延遲（秒）
    dialogOpenDuration: 0.6, // 對話框打開動畫時長（秒）
    dialogCloseDuration: 0.5, // 對話框關閉動畫時長（秒）
    typingCharDuration: 0.05, // 每個字符顯示時長（秒）
    isOpenOnInit: false, // 初始化時是否打開對話框
    autoRepeat: true, // 對話框是否自動循環播放
  },
  // 💬 Tooltip 訊息配置（滑鼠移過去時顯示）
  tooltips: {
    // === Logo ===
    logo: '💡哈哈，被你發現了嗎？！我們的專題名稱「AI 智慧交通控制信號」～ 智慧綠燈控，AI 算你行！意思是我們 AI 不只幫大家計算通行時間，還超級無敵厲害的呢～💪',

    // === 頂部導航按鈕 ===
    simulationBtn: '🚗 場景模擬 - 即時生成車流數據，模擬真實交通環境，幫助您理解交通流量的動態變化！',
    visualizationBtn: '📊 視覺化數據 - 將複雜的交通數據轉化為直觀的圖表和分析，讓數據洞察一目了然！',
    adminBtn: '⚙️ 後台管理 - 進入系統配置中心，管理車流數據、調整參數設置，掌控整個交通系統！',
    menuBtn: '☰ 打開側邊欄 - 調整車流情景、配置模擬參數、掌握系統所有設置！',

    // === VD 情景選擇按鈕 ===
    peakHours: '🚀 尖峰時段 - 早上 7-9 點、晚上 5-7 點的車流高峰，體驗最繁忙的交通狀況！',
    offPeak: '🌞 離峰時段 - 白天 10-16 點、晚上 20-23 點，交通流暢舒適的時段！',
    lateNight: '🌙 凌晨時段 - 午夜 00-06 點的低流量時段，很少看到車流擁堵的情況！',

    // === 資料區塊 ===
    dataSection:
      '📊 特徵模擬數據 - 展示即時的交通流量特徵數據，包含平均車速、占用率和各類型車流量，幫助您全面了解路口交通狀況！',

    // === 控制與統計 ===
    // (已移除)

    // === 模式切換 ===
    modeToggle:
      '🔄 模式切換 - 在「情境手動模式」和「每日自動模式」之間切換。情境手動模式讓您自由選擇交通情景，自動模式是每日縮時的模擬！',

    // === 頂部按鈕 ===
    tooltipToggle: '💡 Lumo 提示開關 - 開啟或關閉 hover 時顯示的功能說明提示文字',

    // === 十字路口下方區域 ===
    crossroadBelow: '🤔 這邊有什麼東西嗎？...似乎什麼都沒有呢，但感覺可能會發生什麼有趣的事情哦！',
  },
  // 🎯 浮動動畫配置
  floating: {
    floatDistance: 20, // 浮動距離（像素）
    floatDuration: 5, // 浮動周期（秒）
  },

  // 👁️ 鼠標追蹤配置
  mouseTracking: {
    paramRangeX: 60, // X 軸參數範圍
    paramRangeY: 60, // Y 軸參數範圍
    easingFactor: 0.05, // 緩動因子（越小越平順）
  },

  // ✨ 聚光燈配置
  spotlight: {
    width: 100, // 聚光燈寬度（像素，border-left/right）
    height: 600, // 聚光燈高度（像素，border-bottom）
    offsetX: 0, // 聚光燈水平位置（像素，正值往右）
    offsetY: 80, // 聚光燈垂直位置（負值表示在下方）
    rotation: -45, // 聚光燈旋轉角度（度數，0-360）
    opacity: 0.75, // 聚光燈三角形透明度（0-1）
    blurAmount: 50, // 模糊程度（像素）
    shadowBlur: 10, // 發光陰影模糊（像素）
    shadowIntensity: 0.1, // 發光強度（0-1）
  },
}

// Refs
const canvas = ref(null)
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
  isAnimating: false, // 🔒 防護標誌：防止動畫進行中時重複觸發
})

// 💬 對話框 Timeline（不放在 reactive 中，直接使用變量）
let dialogTimeline = null

// ========================================
// 💥 P1 修復：監聽 visible prop，控制 PIXI Ticker
// ========================================
watch(
  () => props.visible,
  (newValue) => {
    if (state.app && state.app.ticker) {
      if (newValue) {
        state.app.ticker.start()
      } else {
        state.app.ticker.stop()
      }
    }
  },
)

// Initialize
async function initialize() {
  try {
    // ========================================
    // ✅ [字體預加載] 在初始化時就加載字體
    // ========================================
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready
      } catch (e) {
        console.warn('⚠️ [Lumo 字體] 字體預加載無法完成（非致命):', e)
      }
    }

    // ========================================
    // 💥 P3 修復：動態加載 Live2D 資源
    // ========================================

    // 輔助函式：動態載入 JS
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        // 檢查腳本是否已經加載
        if (src.includes('pixi') && typeof window.PIXI !== 'undefined') {
          resolve()
          return
        }
        if (src.includes('cubismcore') && typeof window.Live2DCubismCore !== 'undefined') {
          resolve()
          return
        }
        if (src.includes('cubism4') && typeof window.LIVE2DCUBISM4 !== 'undefined') {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = () => {
          resolve()
        }
        script.onerror = () => {
          const error = `❌ [Lumo P3] 加載失敗: ${src}`
          console.error(error)
          reject(new Error(error))
        }
        document.head.appendChild(script)
      })
    }

    // 加載三個必要的庫
    try {
      if (typeof window.PIXI === 'undefined') {
        await loadScript('/libs/pixi.min.js')
      }

      if (typeof window.Live2DCubismCore === 'undefined') {
        await loadScript('/libs/live2dcubismcore.min.js')
      }

      if (typeof window.LIVE2DCUBISM4 === 'undefined') {
        await loadScript('/libs/cubism4.js')
      }
    } catch (error) {
      console.error('❌ [Lumo P3] 動態加載 Live2D 資源失敗:', error)
      return
    }

    // ========================================
    // 原始初始化邏輯
    // ========================================
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

    // 🎯 P1 修復：初始化時檢查 visible，如果不可見就停止 ticker
    if (!props.visible && state.app && state.app.ticker) {
      state.app.ticker.stop()
    }

    // 🖱️ Canvas 點擊事件監聽 - ✅ 保存引用以便清理
    eventHandlers.canvasClick = () => {
      // 切換對話框
      toggleDialog()
    }
    canvas.value.addEventListener('click', eventHandlers.canvasClick)
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

  // ✅ 【修復】保存事件監聽器引用，以便卸載時清理
  eventHandlers.pointerMove = (e) => {
    state.targetParamX = (e.clientX / window.innerWidth - 0.5) * config.mouseTracking.paramRangeX
    state.targetParamY = (e.clientY / window.innerHeight - 0.5) * -config.mouseTracking.paramRangeY
  }

  eventHandlers.mouseLeave = () => {
    state.targetParamX = 0
    state.targetParamY = 0
  }

  window.addEventListener('pointermove', eventHandlers.pointerMove)
  document.addEventListener('mouseleave', eventHandlers.mouseLeave)

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
}

// 💬 顯示對話框文字（使用 GSAP SplitText 帶打字效果）
async function showDialogMessage(messageIndex) {
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

  // ✅ [字體加載] 確保字體已加載再進行 SplitText
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch (e) {
      console.warn('⚠️ [Lumo] 字體加載警告:', e)
    }
  }

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

// ⚙️ 輔助函數：設置 Spotlight CSS 變數（避免重複代碼）
function setSpotlightStyles() {
  if (!spotlight.value) return
  const s = config.spotlight
  spotlight.value.style.setProperty('--spotlight-width', `${s.width}px`)
  spotlight.value.style.setProperty('--spotlight-height', `${s.height}px`)
  spotlight.value.style.setProperty('--spotlight-offset-x', `${s.offsetX}px`)
  spotlight.value.style.setProperty('--spotlight-offset-y', `${s.offsetY}px`)
  spotlight.value.style.setProperty('--spotlight-rotation', `${s.rotation}deg`)
  spotlight.value.style.setProperty('--spotlight-opacity', s.opacity)
  spotlight.value.style.setProperty('--spotlight-blur', `${s.blurAmount}px`)
  spotlight.value.style.setProperty('--spotlight-shadow-blur', `${s.shadowBlur}px`)
  spotlight.value.style.setProperty('--spotlight-intensity', s.shadowIntensity)
}

// 💬 開啟對話框
function openDialog() {
  state.isDialogVisible = true

  // 🔒 防護：防止重複打開
  if (state.isAnimating) return
  state.isAnimating = true

  state.currentMessageIndex = 0

  if (!dialogBox.value) {
    state.isAnimating = false
    return
  }

  nextTick(() => {
    // ✨ 設置 Spotlight 的 CSS 變數
    setSpotlightStyles()

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
        onComplete: () => {
          state.isAnimating = false // 🔒 動畫完成後解除鎖定
        },
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
      dialogTimeline.call(
        async () => {
          await showDialogMessage(index)
          state.currentMessageIndex = index
        },
        [],
        time,
      )
    })

    // 設置 Timeline 總時長
    const totalDuration = config.dialog.messages.length * messageInterval
    dialogTimeline.set({}, {}, totalDuration)
  })
}

// 💬 關閉對話框
function closeDialog() {
  if (!state.isDialogVisible) return

  // 🔒 防護：動畫進行中不允許重複觸發
  if (state.isAnimating) return
  state.isAnimating = true

  if (!dialogBox.value) {
    state.isDialogVisible = false
    state.isAnimating = false
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
      state.isAnimating = false // 🔒 動畫完成後解除鎖定

      if (dialogTimeline) {
        dialogTimeline.kill()
        dialogTimeline = null
      }
    },
  })
}

// 💬 切換對話框顯示/隱藏
function toggleDialog() {
  // 🔒 防護：動畫進行中不允許切換
  if (state.isAnimating) return

  if (state.isDialogVisible) {
    closeDialog()
  } else {
    openDialog()
  }
}

// ========================================
// 🎬 標籤頁可見性變化處理器
// ========================================
function handleVisibilityChange() {
  if (document.hidden) {
    pauseAllAnimations()
  } else {
    resumeAllAnimations()
  }
}

onMounted(() => {
  initialize()

  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 延遲執行以確保 DOM 已準備好
  nextTick(() => {
    // 根據配置決定是否打開對話框
    if (config.dialog.isOpenOnInit) {
      openDialog()
    }

    // 設置全局 Tooltip 管理器供 MainLayout 使用
    window.lumoTooltipManager = {
      currentTimeout: null,
      showAnimationTimer: null,
      isTooltipEnabled: false, // 💡 預設關閉，避免加載時顯示訊息
      show(message) {
        // 如果 Tooltip 被禁用，直接返回
        if (!this.isTooltipEnabled) return
        // 取消舊的關閉延遲
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout)
        }
        if (this.showAnimationTimer) {
          clearTimeout(this.showAnimationTimer)
        }

        // 需要重新顯示時，先確保狀態正確
        const wasVisible = state.isDialogVisible

        // 立即顯示對話框
        state.isDialogVisible = true

        // ✨ 設置 Spotlight 的 CSS 變數（確保統一配置）
        setSpotlightStyles()

        // 顯示自定義消息
        if (dialogText.value) {
          // 清除之前的文字動畫
          gsap.killTweensOf(dialogText.value.querySelectorAll('.char'))

          dialogText.value.innerHTML = ''
          dialogText.value.textContent = message

          // 使用 SplitText 分割文字為字符（打字效果）
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

          // 創建打字效果 Timeline
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
                // 在當前字符後面插入光標（HMR 安全檢查）
                if (char.parentNode) {
                  char.parentNode.insertBefore(cursor, char.nextSibling)
                }
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

              // 使用 GSAP 直接控制光標閃爍動畫
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

        // 打開對話框動畫
        if (dialogBox.value) {
          dialogBox.value.classList.add('active')

          // 如果已經可見，跳過進場動畫，直接更新內容
          if (!wasVisible) {
            gsap.fromTo(
              dialogBox.value,
              { y: 20, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.4,
                ease: 'back.out',
              },
            )
          }
        }

        // 打開 Spotlight 動畫
        if (spotlight.value) {
          spotlight.value.classList.add('active')

          // 如果已經可見，跳過進場動畫
          if (!wasVisible) {
            gsap.fromTo(
              spotlight.value,
              { opacity: 0, scale: 0.5 },
              {
                opacity: 1,
                scale: 1,
                duration: 0.3,
                ease: 'back.out',
              },
            )
          }
        }
      },
      // 🚑 新增：強制顯示緊急訊息（不受 isTooltipEnabled 限制）
      showEmergency(message) {
        // 取消舊的關閉延遲
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout)
        }
        if (this.showAnimationTimer) {
          clearTimeout(this.showAnimationTimer)
        }

        // 需要重新顯示時，先確保狀態正確
        const wasVisible = state.isDialogVisible

        // 立即顯示對話框
        state.isDialogVisible = true

        // ✨ 設置 Spotlight 的 CSS 變數（確保統一配置）
        setSpotlightStyles()

        // 顯示自定義消息
        if (dialogText.value) {
          // 清除之前的文字動畫
          gsap.killTweensOf(dialogText.value.querySelectorAll('.char'))

          dialogText.value.innerHTML = ''
          dialogText.value.textContent = message

          // 使用 SplitText 分割文字為字符（打字效果）
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

          // 創建打字效果 Timeline
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
                // 在當前字符後面插入光標（HMR 安全檢查）
                if (char.parentNode) {
                  char.parentNode.insertBefore(cursor, char.nextSibling)
                }
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

              // 使用 GSAP 直接控制光標閃爍動畫
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

        // 打開對話框動畫
        if (dialogBox.value) {
          dialogBox.value.classList.add('active')

          // 如果已經可見，跳過進場動畫，直接更新內容
          if (!wasVisible) {
            gsap.fromTo(
              dialogBox.value,
              { y: 20, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.4,
                ease: 'back.out',
              },
            )
          }
        }

        // 打開 Spotlight 動畫
        if (spotlight.value) {
          spotlight.value.classList.add('active')

          // 如果已經可見，跳過進場動畫
          if (!wasVisible) {
            gsap.fromTo(
              spotlight.value,
              { opacity: 0, scale: 0.5 },
              {
                opacity: 1,
                scale: 1,
                duration: 0.3,
                ease: 'back.out',
              },
            )
          }
        }

        // 🚑 救護車警告訊息：5 秒後自動關閉
        if (message && message.includes('🚑')) {
          this.currentTimeout = setTimeout(() => {
            this.hide()
          }, 5000) // 5000ms = 5 秒
        }
      },
      hide() {
        // 設置延遲隱藏以避免頻繁切換
        this.currentTimeout = setTimeout(() => {
          if (state.isDialogVisible) {
            closeDialog()
          }
        }, 300)
      },
    }

    // 🌍 暴露 config 到全局，讓其他組件可以訪問 tooltips
    window.lumoConfig = config
  })
})

onBeforeUnmount(() => {
  // ✅ 【修復】移除所有事件監聽器
  if (eventHandlers.pointerMove) {
    window.removeEventListener('pointermove', eventHandlers.pointerMove)
    eventHandlers.pointerMove = null
  }

  if (eventHandlers.mouseLeave) {
    document.removeEventListener('mouseleave', eventHandlers.mouseLeave)
    eventHandlers.mouseLeave = null
  }

  if (eventHandlers.canvasClick && canvas.value) {
    canvas.value.removeEventListener('click', eventHandlers.canvasClick)
    eventHandlers.canvasClick = null
  }

  // 🎬 移除標籤頁可見性監聽
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // 🎬 清理所有 GSAP 動畫
  if (state.floatingTimeline) {
    state.floatingTimeline.kill()
    state.floatingTimeline = null
  }
  if (dialogTimeline) {
    dialogTimeline.kill()
    dialogTimeline = null
  }

  // 🎬 殺死所有活躍的 GSAP tweens（包括打字效果）
  gsap.killTweensOf('*')

  // 🎨 安全地銷毀 PIXI 應用
  if (state.app) {
    try {
      // 先停止 ticker
      if (state.app.ticker) {
        state.app.ticker.stop()
      }

      // 先移除所有子元素
      if (state.app.stage && state.app.stage.children) {
        state.app.stage.removeChildren()
      }

      // 💥【P2 修復】使用正確的銷毀參數，徹底釋放 WebGL 資源
      // removeView: false 避免 canvas 相關錯誤，其他參數確保紋理被完全釋放
      state.app.destroy(false, { children: true, texture: true, baseTexture: true })
      state.app = null
    } catch (error) {
      console.warn('⚠️ [LumoAssistant] PIXI 銷毀時出現錯誤（已忽略）:', error)
    }
  }

  // 💥【P2 修復】銷毀 Live2D 模型
  if (state.model) {
    try {
      if (typeof state.model.destroy === 'function') {
        state.model.destroy()
      }
      state.model = null
    } catch (error) {
      console.warn('⚠️ [LumoAssistant] Live2D 模型銷毀時出現錯誤（已忽略）:', error)
    }
  }

  // ✅ 【修復】清理全局引用
  if (window.lumoTooltipManager) {
    delete window.lumoTooltipManager
  }
  if (window.lumoConfig) {
    delete window.lumoConfig
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
  width: 350px;
  height: 160px;
  position: relative;
  top: 20px;
  left: -30px;
  cursor: pointer;
  transition: all 0.1s ease;
}

/*  Canvas 倒影效果 */
.lumo-canvas {
  -webkit-box-reflect: below -5px linear-gradient(to bottom, transparent 0%, rgba(0, 200, 255, 0.3) 100%);
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
  top: 100px;
  left: 200px;
  width: 500px;
  background: linear-gradient(135deg, rgba(0, 20, 40, 0.4) 0%, rgba(10, 30, 60, 0.4) 100%);
  border: 2px solid rgba(0, 200, 255, 0.8);
  border-radius: 16px;
  box-shadow:
    0 0 25px rgba(0, 200, 255, 0.5),
    0 0 45px rgba(150, 100, 255, 0.3),
    inset 0 0 20px rgba(0, 200, 255, 0.1);
  backdrop-filter: blur(2px);
  z-index: 10;
  pointer-events: none; /* 🎯 改為 none，讓滑鼠事件穿透訊息框 */
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
  border-color: transparent rgba(0, 200, 255, 0.8) transparent transparent;
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
  border-color: transparent rgba(0, 15, 30, 0.9) transparent transparent;
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
  pointer-events: auto; /* 🎯 確保按鈕可以點擊 */
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
  padding: 30px 20px 20px;
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
  pointer-events: auto; /* 🎯 確保指示點可以點擊 */
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
