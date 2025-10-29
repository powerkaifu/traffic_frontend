<template>
  <div class="lumo-assistant">
    <!-- Floating Container -->
    <div ref="floatingContainer" class="lumo-floating-container">
      <!-- Live2D Canvas -->
      <canvas ref="canvas" class="lumo-canvas" />
      <!-- Shadow Element -->
      <div ref="shadow" class="lumo-shadow" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import gsap from 'gsap'

// Refs
const floatingContainer = ref(null)
const canvas = ref(null)
const shadow = ref(null)

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
  floatingTimeline: null,
})

// Initialize
async function initialize() {
  try {
    await nextTick()

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

    console.log('✅ 所有庫已加載，開始初始化 PIXI 應用...')

    // 建立 PIXI 應用
    state.app = new window.PIXI.Application({
      view: canvas.value,
      autoStart: true,
      resizeTo: window,
      transparent: true,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    })

    console.log('✅ PIXI 應用已創建，開始加載模型...')

    // 加載 Live2D 模型
    const modelPath = '/Lumo/Resources/robot/robot.model3.json'

    try {
      state.model = await window.PIXI.live2d.Live2DModel.from(modelPath)
      console.log('✅ 模型已加載:', modelPath)
    } catch (modelError) {
      console.error('❌ 模型加載失敗:', modelPath, modelError)
      const backupPath = '/src/Lumo/Resources/robot/robot.model3.json'
      console.log('嘗試備用路徑:', backupPath)
      state.model = await window.PIXI.live2d.Live2DModel.from(backupPath)
      console.log('✅ 模型已加載（備用路徑）:', backupPath)
    }

    state.app.stage.addChild(state.model)
    console.log('✅ 模型已添加到舞台')

    // 初始化佈局
    updateLayout()
    window.addEventListener('resize', onResize)

    // 啟用滑鼠追蹤
    setupMouseTracking()

    // 啟用浮動動畫
    startFloatingAnimation()

    console.log('✅ Lumo Live2D 已成功加載')
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

  console.log('✅ 滑鼠追蹤已啟用 - Lumo 會跟隨你的滑鼠')
}

// Start floating animation
async function startFloatingAnimation() {
  await nextTick() // ✅ 確保 DOM 已掛載

  if (!floatingContainer.value) {
    console.warn('⚠️ 浮動容器未找到')
    return
  }

  if (!shadow.value) {
    console.warn('⚠️ 陰影元素未找到')
    return
  }

  console.log('🎬 開始浮動動畫...')

  if (state.floatingTimeline) {
    state.floatingTimeline.kill()
  }

  // ✅ 建立 timeline 時明確指定 paused: false
  const tl = gsap.timeline({
    repeat: -1,
    yoyo: true,
    paused: false,
  })

  // 🎯 容器上下浮動 (2秒一個循環)
  tl.to(floatingContainer.value, {
    y: -80,
    duration: 2,
    ease: 'sine.inOut',
  })

  // ✅ 陰影動畫用 timeline.add() + gsap.to() 確保有效
  tl.to(shadow.value, {
    scale: 0.6,
    opacity: 0,
    duration: 2,
    ease: 'sine.inOut',
  })
}

// Lifecycle
onMounted(() => {
  initialize()
})

onBeforeUnmount(() => {
  if (state.floatingTimeline) {
    state.floatingTimeline.kill()
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
  overflow: hidden;
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
  will-change: transform;
}

.lumo-canvas {
  width: 300px;
  height: 150px;
  display: block;
  position: relative;
  z-index: 10;
}

.lumo-shadow {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 40px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 70%);
  background: red;
  border-radius: 50%;
  filter: blur(15px);
  z-index: 1;
  pointer-events: none;
  opacity: 0.3;
  will-change: transform, filter, opacity;
}
</style>
