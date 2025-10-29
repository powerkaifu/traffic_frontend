<template>
  <div class="lumo-assistant">
    <!-- Live2D Canvas -->
    <canvas ref="canvas" class="lumo-canvas" />

    <!-- 加載指示器 -->
    <div v-if="!loaded" class="loading-indicator">
      <div class="spinner" />
      <p>加載 Lumo Live2D 模型中...</p>
    </div>
  </div>
</template>

<script>
import { LumoStatusCheck } from '../utils/LumoStatusCheck'

export default {
  name: 'LumoAssistant',

  data() {
    return {
      loaded: false,
      app: null,
      model: null,
      resizeTimer: null,
      targetParamX: 0,
      targetParamY: 0,
      currentParamX: 0,
      currentParamY: 0,
      easingFactor: 0.05,
    }
  },

  async mounted() {
    // 打印狀態報告
    await LumoStatusCheck.printStatus()
    await this.initialize()
  },

  methods: {
    async initialize() {
      try {
        // 等待 DOM 完全準備好
        await this.$nextTick()

        // 檢查必要的庫 - 使用重試機制
        let retryCount = 0
        const maxRetries = 50 // 5 秒（50 * 100ms）
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

        const canvas = this.$refs.canvas
        if (!canvas) {
          console.error('❌ Canvas 未找到')
          return
        }

        console.log('✅ 所有庫已加載，開始初始化 PIXI 應用...')

        // 建立 PIXI 應用
        this.app = new window.PIXI.Application({
          view: canvas,
          autoStart: true,
          resizeTo: window,
          transparent: true,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        })

        console.log('✅ PIXI 應用已創建，開始加載模型...')

        // 加載 Live2D 模型 - 使用相對於 public 的路徑
        const modelPath = '/Lumo/Resources/robot/robot.model3.json'

        try {
          this.model = await window.PIXI.live2d.Live2DModel.from(modelPath)
          console.log('✅ 模型已加載:', modelPath)
        } catch (modelError) {
          console.error('❌ 模型加載失敗:', modelPath, modelError)
          // 嘗試備用路徑
          const backupPath = '/src/Lumo/Resources/robot/robot.model3.json'
          console.log('嘗試備用路徑:', backupPath)
          this.model = await window.PIXI.live2d.Live2DModel.from(backupPath)
          console.log('✅ 模型已加載（備用路徑）:', backupPath)
        }

        this.app.stage.addChild(this.model)
        console.log('✅ 模型已添加到舞台')

        // 初始化佈局
        this.updateLayout()
        window.addEventListener('resize', this.onResize.bind(this))

        // 啟用滑鼠追蹤
        this.setupMouseTracking()

        this.loaded = true
        console.log('✅ Lumo Live2D 已成功加載')
      } catch (error) {
        console.error('❌ Lumo 初始化失敗:', error)
        console.error('詳細信息:', error.stack)
      }
    },

    /**
     * 更新模型的大小和位置
     */
    updateLayout() {
      if (!this.model || !this.app) return

      const screenWidth = this.app.screen.width
      const screenHeight = this.app.screen.height

      if (!screenWidth || !screenHeight || !this.model.internalModel) {
        requestAnimationFrame(() => this.updateLayout())
        return
      }

      const { width: modelWidth, height: modelHeight } = this.model.internalModel

      if (modelHeight === 0 || modelWidth === 0) {
        requestAnimationFrame(() => this.updateLayout())
        return
      }

      // 計算縮放比例 - 填滿整個容器
      const margin = 10
      const usableWidth = screenWidth - 2 * margin
      const usableHeight = screenHeight - 2 * margin

      const scaleToWidth = usableWidth / modelWidth
      const scaleToHeight = usableHeight / modelHeight
      let scale = Math.min(scaleToWidth, scaleToHeight)

      // 允許模型填滿容器（移除最大尺寸限制）
      // 舊限制: const maxScale = (screenHeight / modelHeight) * 0.2
      // 新規則: 讓模型盡可能大地填滿容器

      // 防止無效值
      if (!isFinite(scale) || scale <= 0) scale = 0.5

      // 應用縮放和位置
      this.model.scale.set(scale)
      this.model.anchor.set(0.5, 1) // 水平居中，底部對齊
      this.model.position.set(screenWidth / 2, screenHeight - margin) // 水平居中放置
    },

    /**
     * Resize 事件處理（帶 debounce）
     */
    onResize() {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        this.updateLayout()
      }, 100)
    },

    /**
     * 設置滑鼠追蹤
     */
    setupMouseTracking() {
      if (!this.model || !this.app) return

      // 滑鼠移動
      window.addEventListener('pointermove', (e) => {
        this.targetParamX = (e.clientX / window.innerWidth - 0.5) * 60
        this.targetParamY = (e.clientY / window.innerHeight - 0.5) * -60
      })

      // 滑鼠離開
      document.addEventListener('mouseleave', () => {
        this.targetParamX = 0
        this.targetParamY = 0
      })

      // 每幀更新參數（平滑動畫）
      this.app.ticker.add(() => {
        this.currentParamX += (this.targetParamX - this.currentParamX) * this.easingFactor
        this.currentParamY += (this.targetParamY - this.currentParamY) * this.easingFactor

        if (this.model?.internalModel?.coreModel) {
          this.model.internalModel.coreModel.setParameterValueById('BODY_ANGLE_X', this.currentParamX)
          this.model.internalModel.coreModel.setParameterValueById('BODY_ANGLE_Y', this.currentParamY)
        }
      })

      console.log('✅ 滑鼠追蹤已啟用 - Lumo 會跟隨你的滑鼠')
    },
  },

  beforeUnmount() {
    if (this.app) {
      this.app.destroy()
    }
    clearTimeout(this.resizeTimer)
    window.removeEventListener('resize', this.onResize)
  },
}
</script>

<style scoped>
.lumo-assistant {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
}

.lumo-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  gap: 12px;
  z-index: 100;
  border-radius: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(100, 150, 255, 0.2);
  border-top-color: #6496ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-indicator p {
  color: #666;
  font-size: 14px;
  margin: 0;
}
</style>
