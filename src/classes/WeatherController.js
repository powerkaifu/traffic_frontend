/**
 * WeatherController.js - 天氣效果控制器
 *
 * 使用 GSAP 動畫實現各種天氣效果
 * 包括：雨天、霧天、雪天等
 */

import { gsap } from 'gsap'
import { logger } from '../utils/logger.js' // 統一日誌工具
import {
  WEATHER_TYPES,
  RAIN_CONFIG,
  FOG_CONFIG,
  SNOW_CONFIG,
  TRANSITION_CONFIG,
  PERFORMANCE_CONFIG,
  WEATHER_SPEED_MULTIPLIERS,
  WEATHER_SYSTEM_CONFIG,
} from './config/weatherConfig.js'
import { VehicleStaticManager } from './utils/VehicleUtilities.js' // 用於更新全域天氣速度倍數

export class WeatherController {
  constructor(container) {
    this.container = container // 天氣效果容器
    this.currentWeather = WEATHER_TYPES.CLEAR // 當前天氣
    this.weatherLayer = null // 天氣效果圖層
    this.particles = [] // 粒子陣列
    this.animations = [] // 動畫陣列
    this.isActive = false // 是否啟用天氣效果
    this.lightningInterval = null // 閃電定時器
    this.lightningLayer = null // 閃電圖層
    this.generationTask = null // 🆕 生成任務 ID (requestAnimationFrame)

    // 🆕 粒子池管理（優化記憶體）
    this.particlePool = [] // 可回收粒子池
    this.maxPoolSize = 500 // 最大池大小
    this.poolStats = { getCount: 0, recycleCount: 0 } // 池統計

    this.init()
  }

  /**
   * 初始化天氣系統
   */
  init() {
    // 創建天氣效果圖層
    this.weatherLayer = document.createElement('div')
    this.weatherLayer.className = 'weather-layer'
    this.weatherLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      overflow: hidden;
    `

    // 添加到容器
    if (this.container) {
      this.container.appendChild(this.weatherLayer)
    }

    logger.log('🌤️ 天氣系統已初始化')
  }

  /**
   * 🆕 從粒子池獲取粒子或創建新粒子
   * @returns {HTMLElement} 粒子元素
   */
  getOrCreateParticle() {
    if (this.particlePool.length > 0) {
      const particle = this.particlePool.pop()
      this.poolStats.getCount++
      return particle
    }
    return this.createNewParticleElement()
  }

  /**
   * 🆕 創建新粒子元素
   * @returns {HTMLElement} 粒子元素
   */
  createNewParticleElement() {
    const particle = document.createElement('div')
    particle.className = 'particle'
    particle.style.cssText = `
      position: absolute;
      pointer-events: none;
    `
    return particle
  }

  /**
   * 🆕 將粒子回收到池中
   * @param {HTMLElement} particle - 粒子元素
   */
  recycleParticle(particle) {
    if (this.particlePool.length < this.maxPoolSize) {
      // 重置粒子狀態
      particle.style.opacity = '1'
      particle.style.transform = 'translate(0, 0)'
      particle.textContent = ''

      // 🚀 優化：移除 gsap.killTweensOf(particle)
      // 因為 clearWeather 已經統一殺死了所有動畫 (this.animations)
      // 而且個別殺死數百個粒子的動畫非常耗時

      // 從 DOM 中移除
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle)
      }

      // 放入池中
      this.particlePool.push(particle)
      this.poolStats.recycleCount++
    } else {
      // 池滿，直接刪除
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle)
      }
    }
  }

  /**
   * 🆕 清空所有粒子並回收到池中
   */
  clearAllParticles() {
    this.particles.forEach((particle) => {
      this.recycleParticle(particle)
    })
    this.particles = []
  }

  /**
   * 🆕 打印粒子池統計信息
   */
  printPoolStats() {
    const usage = ((this.particlePool.length / this.maxPoolSize) * 100).toFixed(1)
    console.log(
      `📦 粒子池統計 - 池大小: ${this.particlePool.length}/${this.maxPoolSize} (${usage}%) | 獲取: ${this.poolStats.getCount} | 回收: ${this.poolStats.recycleCount}`,
    )
  }

  /**
   * 切換天氣
   * @param {string} weatherType - 天氣類型
   */
  async changeWeather(weatherType) {
    // 如果點擊當前已啟用的天氣，則切換回晴天（關閉效果）
    if (this.currentWeather === weatherType && weatherType !== WEATHER_TYPES.CLEAR) {
      logger.log(`🌤️ 關閉天氣效果：${weatherType} -> ${WEATHER_TYPES.CLEAR}`)
      weatherType = WEATHER_TYPES.CLEAR
    }

    // 如果已經是目標天氣，無需切換
    if (this.currentWeather === weatherType) {
      logger.log(`🌤️ 天氣已經是 ${weatherType}，無需切換`)
      return
    }

    logger.log(`🌤️ 切換天氣：${this.currentWeather} -> ${weatherType}`)

    // 先清除當前天氣效果
    await this.clearWeather()

    // 設定新天氣
    this.currentWeather = weatherType

    // 🚨 修復：在創建天氣效果之前設置 isActive，否則漸進式生成會立即返回
    this.isActive = weatherType !== WEATHER_TYPES.CLEAR

    // 根據天氣類型啟用對應效果
    switch (weatherType) {
      case WEATHER_TYPES.RAIN:
        this.createRain('NORMAL')
        break
      case WEATHER_TYPES.HEAVY_RAIN:
        this.createRain('HEAVY')
        this.createLightning() // 大雨時啟用閃電效果
        break
      case WEATHER_TYPES.FOG:
        this.createFog()
        break
      case WEATHER_TYPES.SNOW:
        this.createSnow()
        break
      case WEATHER_TYPES.CLEAR:
      default:
        // 晴天不需要額外效果
        break
    }

    // 🌤️ 【最佳化】立即廣播天氣改變事件（不延遲）
    // 原因：AutoTrafficGenerator 會在 _smoothSpeedTransition 中平滑改變速度
    //      所有車輛會通過 weatherSpeedChange 事件立即收到通知
    //      無需延遲，避免用戶感受到明顯的卡頓
    // 時間軸：
    // - 0ms: 廣播 weatherChanged 和 weatherSpeedChange 事件
    // - 0-2s: 粒子漸進生成 + 速度平滑過度（同時進行）
    // - 2s+: 完成過度，回到正常狀態
    const weatherMultiplier = this.getSpeedMultiplier()

    // 🚨 【修復】更新全域靜態變數，讓新生成的車輛也使用正確的天氣速度
    VehicleStaticManager.setWeatherSpeedMultiplier(weatherMultiplier)

    // 廣播天氣改變事件（用於 AutoTrafficGenerator 和其他系統）
    window.dispatchEvent(
      new CustomEvent('weatherChanged', {
        detail: {
          weather: weatherType,
          multiplier: weatherMultiplier,
          timestamp: Date.now(),
        },
      }),
    )

    // 🚨 【修復】廣播天氣速度變化事件（用於 VehicleEventBroadcaster 通知所有車輛）
    window.dispatchEvent(
      new CustomEvent('weatherSpeedChange', {
        detail: {
          multiplier: weatherMultiplier,
          weather: weatherType,
          timestamp: Date.now(),
        },
      }),
    )

    // 🔍 臨時調試：強制輸出以確認事件發送
    console.log(
      `🌤️ [WeatherController] 已發送 weatherSpeedChange 事件: ${weatherType} = ${weatherMultiplier.toFixed(2)}x (全域倍數已更新)`,
    )

    logger.debug('Weather', `廣播天氣改變事件: ${weatherType} (倍數: ${weatherMultiplier.toFixed(2)}x)`)
  }

  /**
   * 創建雨天效果
   * @param {string} intensity - 雨勢強度（LIGHT, NORMAL, HEAVY）
   */
  createRain(intensity = 'NORMAL') {
    const config = RAIN_CONFIG
    const particleCount = config.PARTICLE_COUNT[intensity]

    logger.log(`🌧️ 創建雨天效果，強度：${intensity}，粒子數：${particleCount}`)

    // 效能模式調整
    const actualCount = PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MODE
      ? Math.floor(particleCount * PERFORMANCE_CONFIG.PERFORMANCE_PARTICLE_RATIO)
      : particleCount

    // 創建雨滴容器
    const rainContainer = document.createElement('div')
    rainContainer.className = 'rain-container'
    rainContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `
    this.weatherLayer.appendChild(rainContainer)

    // 🚀 優化：使用 GSAP ticker 替代 requestAnimationFrame
    // 這樣可以確保粒子生成與 GSAP 的更新循環同步，減少 CPU 爭用
    let createdCount = 0
    const batchSize = 50 // 每幀生成的粒子數

    const generateBatch = () => {
      // 如果天氣已改變或系統已停用，停止生成
      if (
        !this.isActive ||
        (this.currentWeather !== WEATHER_TYPES.RAIN && this.currentWeather !== WEATHER_TYPES.HEAVY_RAIN)
      ) {
        gsap.ticker.remove(generateBatch)
        this.generationTask = null
        return
      }

      const fragment = document.createDocumentFragment()
      const limit = Math.min(actualCount - createdCount, batchSize)

      for (let i = 0; i < limit; i++) {
        const raindrop = this.getOrCreateParticle() // 🔄 從池獲取或創建
        this.styleRaindrop(raindrop) // 應用樣式
        fragment.appendChild(raindrop) // 添加到片段中
        this.particles.push(raindrop)

        // 延遲啟動動畫，創造更自然的效果
        // 🚀 優化：移除 setTimeout，改用 GSAP delay
        const delay = (createdCount + i) * TRANSITION_CONFIG.PARTICLE_SPAWN_DELAY
        this.animateRaindrop(raindrop, delay)
      }

      // 將這一批次添加到容器
      rainContainer.appendChild(fragment)
      createdCount += limit

      // 如果生成完成
      if (createdCount >= actualCount) {
        gsap.ticker.remove(generateBatch)
        this.generationTask = null
        logger.debug('Weather', `粒子生成完成 共生成 ${createdCount} 個粒子`)

        // 通知系統粒子生成已完成，可以恢復其他計算
        window.dispatchEvent(
          new CustomEvent('particleGenerationComplete', {
            detail: {
              particleCount: createdCount,
              timestamp: Date.now(),
            },
          }),
        )
      }
    }

    // 啟動生成任務 (添加到 GSAP ticker)
    this.generationTask = generateBatch
    gsap.ticker.add(generateBatch)

    // 淡入效果
    gsap.from(rainContainer, {
      opacity: 0,
      duration: TRANSITION_CONFIG.FADE_DURATION,
    })
  }

  /**
   * 🆕 為雨滴應用樣式
   * @param {HTMLElement} raindrop - 雨滴元素
   */
  styleRaindrop(raindrop) {
    const config = RAIN_CONFIG.APPEARANCE

    // 隨機位置
    const x = Math.random() * 100 // 百分比
    const y = -20 // 從螢幕上方開始

    // 隨機高度
    const height = config.MIN_HEIGHT + Math.random() * (config.MAX_HEIGHT - config.MIN_HEIGHT)

    // 隨機透明度
    const opacity = config.OPACITY_RANGE[0] + Math.random() * (config.OPACITY_RANGE[1] - config.OPACITY_RANGE[0])

    raindrop.style.cssText = `
      position: absolute;
      left: ${x}%;
      top: ${y}%;
      width: ${config.WIDTH}px;
      height: ${height}px;
      background: ${config.COLOR};
      opacity: ${opacity};
      border-radius: 50%;
      transform: rotate(${RAIN_CONFIG.ANIMATION.ROTATION}deg);
    `
  }

  /**
   * 創建單個雨滴元素
   */
  createRaindrop() {
    const config = RAIN_CONFIG.APPEARANCE
    const raindrop = document.createElement('div')

    // 隨機位置
    const x = Math.random() * 100 // 百分比
    const y = -20 // 從螢幕上方開始

    // 隨機高度
    const height = config.MIN_HEIGHT + Math.random() * (config.MAX_HEIGHT - config.MIN_HEIGHT)

    // 隨機透明度
    const opacity = config.OPACITY_RANGE[0] + Math.random() * (config.OPACITY_RANGE[1] - config.OPACITY_RANGE[0])

    raindrop.style.cssText = `
      position: absolute;
      left: ${x}%;
      top: ${y}%;
      width: ${config.WIDTH}px;
      height: ${height}px;
      background: ${config.COLOR};
      opacity: ${opacity};
      border-radius: 50%;
      transform: rotate(${RAIN_CONFIG.ANIMATION.ROTATION}deg);
    `

    return raindrop
  }

  /**
   * 雨滴動畫
   * @param {HTMLElement} raindrop - 雨滴元素
   * @param {number} delay - 動畫延遲時間（秒）
   */
  animateRaindrop(raindrop, delay = 0) {
    const config = RAIN_CONFIG.ANIMATION
    const duration = config.MIN_DURATION + Math.random() * (config.MAX_DURATION - config.MIN_DURATION)

    // 下落動畫
    const tween = gsap.to(raindrop, {
      y: '120vh', // 落到螢幕下方
      x: `+=${config.WIND_OFFSET}`, // 風向偏移
      duration: duration,
      delay: delay, // 🚀 使用 GSAP delay
      ease: 'none',
      repeat: -1, // 無限循環
      onRepeat: () => {
        // 重置位置
        gsap.set(raindrop, {
          x: Math.random() * 100 + '%',
          y: '-20%',
        })
      },
    })

    this.animations.push(tween)
  }

  /**
   * 創建霧天效果
   */
  createFog() {
    const config = FOG_CONFIG

    logger.log('🌫️ 創建霧天效果')

    // 🚀 優化：使用漸進式生成 (Progressive Generation)
    let createdLayerCount = 0
    const totalLayers = config.APPEARANCE.LAYERS
    // 霧氣層數較少，可以一次生成一層，或者分批
    // 由於層數通常很少 (例如 3-5 層)，我們可以每幀生成一層，或者一次生成所有 (如果數量少)
    // 為了保持一致性，我們使用分批邏輯，但 batchSize 設為 1 或 2

    const batchSize = 2

    const generateBatch = () => {
      if (!this.isActive || this.currentWeather !== WEATHER_TYPES.FOG) {
        gsap.ticker.remove(generateBatch)
        this.generationTask = null
        return
      }

      const fragment = document.createDocumentFragment()

      // 1. 處理霧氣層
      const limit = Math.min(totalLayers - createdLayerCount, batchSize)

      for (let i = 0; i < limit; i++) {
        const layerIndex = createdLayerCount + i
        const fogLayer = document.createElement('div')
        fogLayer.className = 'fog-layer'

        const opacity =
          config.ANIMATION.OPACITY_RANGE[0] +
          Math.random() * (config.ANIMATION.OPACITY_RANGE[1] - config.ANIMATION.OPACITY_RANGE[0])

        fogLayer.style.cssText = `
          position: absolute;
          top: ${layerIndex * 30}%;
          left: -10%;
          width: 120%;
          height: 100%;
          background: ${config.APPEARANCE.COLOR};
          opacity: ${opacity};
          filter: blur(${config.APPEARANCE.BLUR_AMOUNT});
        `

        fragment.appendChild(fogLayer)
        this.particles.push(fogLayer)

        // 飄移動畫
        const tween = gsap.to(fogLayer, {
          x: '10%',
          duration: config.ANIMATION.DRIFT_SPEED,
          ease: 'none',
          repeat: -1,
          yoyo: true,
        })

        this.animations.push(tween)
      }

      createdLayerCount += limit

      // 2. 如果霧氣層生成完畢，且還沒添加能見度層，則添加
      // 這裡簡化邏輯：最後一批次時添加能見度層
      if (createdLayerCount >= totalLayers && !this.hasAddedFogVisibility) {
        // 添加能見度效果
        const visibilityOverlay = document.createElement('div')
        visibilityOverlay.className = 'fog-visibility'
        visibilityOverlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.1);
          filter: ${config.VISIBILITY.FILTER};
          opacity: ${config.VISIBILITY.OPACITY};
        `
        fragment.appendChild(visibilityOverlay)
        this.particles.push(visibilityOverlay)
        this.hasAddedFogVisibility = true
      }

      this.weatherLayer.appendChild(fragment)

      if (createdLayerCount >= totalLayers) {
        gsap.ticker.remove(generateBatch)
        this.generationTask = null
        this.hasAddedFogVisibility = false // 重置標記供下次使用
      }
    }

    this.hasAddedFogVisibility = false
    this.generationTask = generateBatch
    gsap.ticker.add(generateBatch)

    // 淡入效果
    gsap.from(this.weatherLayer, {
      opacity: 0,
      duration: TRANSITION_CONFIG.FADE_DURATION,
    })
  }

  /**
   * 創建雪天效果
   */
  createSnow() {
    const config = SNOW_CONFIG

    logger.log('❄️ 創建雪天效果')

    // 效能模式調整
    const particleCount = PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MODE
      ? Math.floor(config.PARTICLE_COUNT * PERFORMANCE_CONFIG.PERFORMANCE_PARTICLE_RATIO)
      : config.PARTICLE_COUNT

    // 創建雪花容器
    const snowContainer = document.createElement('div')
    snowContainer.className = 'snow-container'
    snowContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `
    this.weatherLayer.appendChild(snowContainer)

    // 🚀 優化：使用漸進式生成 (Progressive Generation)
    let createdCount = 0
    const batchSize = 50 // 每幀生成的粒子數

    const generateBatch = () => {
      if (!this.isActive || this.currentWeather !== WEATHER_TYPES.SNOW) {
        gsap.ticker.remove(generateBatch)
        this.generationTask = null
        return
      }

      const fragment = document.createDocumentFragment()
      const limit = Math.min(particleCount - createdCount, batchSize)

      for (let i = 0; i < limit; i++) {
        const snowflake = this.createSnowflake()
        fragment.appendChild(snowflake)
        this.particles.push(snowflake)

        // 延遲啟動動畫
        // 🚀 優化：移除 setTimeout，改用 GSAP delay
        const delay = (createdCount + i) * TRANSITION_CONFIG.PARTICLE_SPAWN_DELAY
        this.animateSnowflake(snowflake, delay)
      }

      snowContainer.appendChild(fragment)
      createdCount += limit

      if (createdCount >= particleCount) {
        gsap.ticker.remove(generateBatch)
        this.generationTask = null
      }
    }

    this.generationTask = generateBatch
    gsap.ticker.add(generateBatch)

    // 淡入效果
    gsap.from(snowContainer, {
      opacity: 0,
      duration: TRANSITION_CONFIG.FADE_DURATION,
    })
  }

  /**
   * 創建單個雪花元素
   */
  createSnowflake() {
    const config = SNOW_CONFIG.APPEARANCE
    const snowflake = document.createElement('div')

    // 隨機位置
    const x = Math.random() * 100
    const y = -10

    // 隨機大小
    const size = config.SIZE_RANGE[0] + Math.random() * (config.SIZE_RANGE[1] - config.SIZE_RANGE[0])

    snowflake.style.cssText = `
      position: absolute;
      left: ${x}%;
      top: ${y}%;
      width: ${size}px;
      height: ${size}px;
      background: ${config.COLOR};
      border-radius: 50%;
      filter: blur(${config.BLUR});
    `

    return snowflake
  }

  /**
   * 雪花動畫
   * @param {HTMLElement} snowflake - 雪花元素
   * @param {number} delay - 動畫延遲時間（秒）
   */
  animateSnowflake(snowflake, delay = 0) {
    const config = SNOW_CONFIG.ANIMATION
    const duration = config.MIN_DURATION + Math.random() * (config.MAX_DURATION - config.MIN_DURATION)

    // 下落動畫（包含擺動）
    const tween = gsap.to(snowflake, {
      y: '110vh',
      x: `+=${Math.random() * config.SWING_AMOUNT - config.SWING_AMOUNT / 2}`,
      duration: duration,
      delay: delay, // 🚀 使用 GSAP delay
      ease: 'none',
      repeat: -1,
      onRepeat: () => {
        // 重置位置
        gsap.set(snowflake, {
          x: Math.random() * 100 + '%',
          y: '-10%',
        })
      },
    })

    this.animations.push(tween)
  }

  /**
   * 創建閃電效果（用於大雨天氣）
   */
  createLightning() {
    const config = RAIN_CONFIG.LIGHTNING

    if (!config.ENABLED) {
      return
    }

    logger.log('⚡ 創建閃電效果')

    // 創建閃電圖層
    this.lightningLayer = document.createElement('div')
    this.lightningLayer.className = 'lightning-layer'
    this.lightningLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${config.FLASH_COLOR};
      opacity: 0;
      pointer-events: none;
      z-index: 1001;
    `

    this.weatherLayer.appendChild(this.lightningLayer)

    // 啟動閃電循環
    this.scheduleLightning()
  }

  /**
   * 安排下一次閃電
   */
  scheduleLightning() {
    const config = RAIN_CONFIG.LIGHTNING

    // 清除舊的定時器
    if (this.lightningInterval) {
      clearTimeout(this.lightningInterval)
    }

    // 隨機間隔時間
    const interval = config.MIN_INTERVAL + Math.random() * (config.MAX_INTERVAL - config.MIN_INTERVAL)

    // 🚀 優化：改用累積計時器而非 setTimeout，由主循環驅動
    this.lightningNextScheduleTime = Date.now() + interval * 1000
  }

  /**
   * 觸發閃電效果
   */
  triggerLightning() {
    if (!this.lightningLayer) {
      return
    }

    const config = RAIN_CONFIG.LIGHTNING

    // 單次閃電
    gsap.to(this.lightningLayer, {
      opacity: 1,
      duration: config.FLASH_DURATION * 0.3,
      ease: 'power2.in',
      onComplete: () => {
        gsap.to(this.lightningLayer, {
          opacity: 0,
          duration: config.FLASH_DURATION * 0.7,
          ease: 'power2.out',
        })
      },
    })

    // 有機率觸發雙重閃電
    if (Math.random() < config.DOUBLE_FLASH_CHANCE) {
      // 🚀 優化：使用 GSAP delayedCall 替代 setTimeout，確保與 RAF 同步
      gsap.delayedCall(config.DOUBLE_FLASH_DELAY, () => {
        if (this.lightningLayer) {
          gsap.to(this.lightningLayer, {
            opacity: 0.8,
            duration: config.FLASH_DURATION * 0.4,
            ease: 'power2.in',
            onComplete: () => {
              gsap.to(this.lightningLayer, {
                opacity: 0,
                duration: config.FLASH_DURATION * 0.6,
                ease: 'power2.out',
              })
            },
          })
        }
      })
    }

    // 安排下一次閃電
    this.scheduleLightning()
  }

  /**
   * 清除天氣效果
   */
  async clearWeather() {
    return new Promise((resolve) => {
      if (
        this.particles.length === 0 &&
        this.animations.length === 0 &&
        !this.lightningInterval &&
        !this.generationTask
      ) {
        resolve()
        return
      }

      logger.debug('Weather', '清除天氣效果')

      // 停止閃電定時器
      if (this.lightningInterval) {
        clearTimeout(this.lightningInterval)
        this.lightningInterval = null
      }

      // 🆕 取消正在進行的生成任務
      if (this.generationTask) {
        // 🚀 優化：從 GSAP ticker 移除
        gsap.ticker.remove(this.generationTask)
        this.generationTask = null
      }

      // 清除閃電圖層引用
      this.lightningLayer = null

      // 停止所有動畫
      this.animations.forEach((tween) => {
        tween.kill()
      })
      this.animations = []

      // 🆕 將粒子回收到池中（優化記憶體）
      this.clearAllParticles()

      // 淡出並移除所有粒子
      gsap.to(this.weatherLayer, {
        opacity: 0,
        duration: TRANSITION_CONFIG.FADE_DURATION,
        onComplete: () => {
          // 清空天氣圖層
          if (this.weatherLayer) {
            this.weatherLayer.innerHTML = ''
            // 重置 opacity 為 1，以便下次天氣效果可以正常顯示
            gsap.set(this.weatherLayer, { opacity: 1 })
          }
          this.particles = []
          this.isActive = false
          resolve()
        },
      })
    })
  }

  /**
   * 獲取當前天氣對速度的影響係數
   */
  /**
   * 獲取速度倍數
   * 根據當前天氣返回相應的速度倍數
   * 【重要】所有倍數都在 weatherConfig.js 中定義，可以輕鬆調整
   */
  getSpeedMultiplier() {
    // 檢查配置中是否禁用了天氣系統
    if (!WEATHER_SYSTEM_CONFIG.BEHAVIOR.ENABLED) {
      return 1.0
    }

    // 檢查天氣是否應該影響速度
    if (!WEATHER_SYSTEM_CONFIG.IMPACT.AFFECTS_VEHICLE_SPEED) {
      return 1.0
    }

    // 從配置中獲取天氣倍數
    const weatherConfig = WEATHER_SPEED_MULTIPLIERS[this.currentWeather]

    if (weatherConfig) {
      if (WEATHER_SYSTEM_CONFIG.BEHAVIOR.DEBUG_LOG) {
        // console.log(
        //   `🌤️ [WeatherController] 獲取速度倍數: ${this.currentWeather} = ${weatherConfig.multiplier.toFixed(2)}x (${weatherConfig.description})`,
        // )
      }
      return weatherConfig.multiplier
    }

    // 如果找不到配置，回退到晴天
    console.warn(`⚠️ [WeatherController] 找不到天氣配置: ${this.currentWeather}，使用晴天倍數`)
    return 1.0
  }

  /**
   * 獲取當前天氣類型
   */
  getCurrentWeather() {
    return this.currentWeather
  }

  /**
   * 銷毀天氣系統
   */
  destroy() {
    this.clearWeather()

    // 清除閃電定時器
    if (this.lightningInterval) {
      clearTimeout(this.lightningInterval)
      this.lightningInterval = null
    }

    if (this.weatherLayer && this.weatherLayer.parentNode) {
      this.weatherLayer.parentNode.removeChild(this.weatherLayer)
    }

    this.weatherLayer = null
    this.lightningLayer = null
    this.container = null

    logger.log('🌤️ 天氣系統已銷毀')
  }
}

export default WeatherController
