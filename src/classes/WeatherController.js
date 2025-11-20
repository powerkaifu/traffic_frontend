/**
 * WeatherController.js - 天氣效果控制器
 *
 * 使用 GSAP 動畫實現各種天氣效果
 * 包括：雨天、霧天、雪天等
 */

import { gsap } from 'gsap'
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

    console.log('🌤️ 天氣系統已初始化')
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

      // 移除所有 GSAP 動畫
      if (particle._gsapTimelineId) {
        gsap.killTweensOf(particle)
      }

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
      console.log(`🌤️ 關閉天氣效果：${weatherType} -> ${WEATHER_TYPES.CLEAR}`)
      weatherType = WEATHER_TYPES.CLEAR
    }

    // 如果已經是目標天氣，無需切換
    if (this.currentWeather === weatherType) {
      console.log(`🌤️ 天氣已經是 ${weatherType}，無需切換`)
      return
    }

    console.log(`🌤️ 切換天氣：${this.currentWeather} -> ${weatherType}`)

    // 先清除當前天氣效果
    await this.clearWeather()

    // 設定新天氣
    this.currentWeather = weatherType

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

    this.isActive = weatherType !== WEATHER_TYPES.CLEAR

    // 🌤️ 【新增】廣播天氣改變事件，讓已在路上的車輛受影響
    const weatherMultiplier = this.getSpeedMultiplier()
    window.dispatchEvent(
      new CustomEvent('weatherChanged', {
        detail: {
          weather: weatherType,
          multiplier: weatherMultiplier,
          timestamp: Date.now(),
        },
      }),
    )
    console.log(`🌤️ 廣播天氣改變事件: ${weatherType} (倍數: ${weatherMultiplier.toFixed(2)}x)`)
  }

  /**
   * 創建雨天效果
   * @param {string} intensity - 雨勢強度（LIGHT, NORMAL, HEAVY）
   */
  createRain(intensity = 'NORMAL') {
    const config = RAIN_CONFIG
    const particleCount = config.PARTICLE_COUNT[intensity]

    console.log(`🌧️ 創建雨天效果，強度：${intensity}，粒子數：${particleCount}`)

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

    // 🚀 優化：使用 DocumentFragment 批量添加粒子
    const fragment = document.createDocumentFragment()

    // 生成雨滴
    for (let i = 0; i < actualCount; i++) {
      const raindrop = this.getOrCreateParticle() // 🔄 從池獲取或創建
      this.styleRaindrop(raindrop) // 應用樣式
      fragment.appendChild(raindrop) // 添加到片段中
      this.particles.push(raindrop)

      // 延遲啟動動畫，創造更自然的效果
      setTimeout(
        () => {
          this.animateRaindrop(raindrop)
        },
        i * TRANSITION_CONFIG.PARTICLE_SPAWN_DELAY * 1000,
      )
    }

    // 一次性添加到容器
    rainContainer.appendChild(fragment)

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
   */
  animateRaindrop(raindrop) {
    const config = RAIN_CONFIG.ANIMATION
    const duration = config.MIN_DURATION + Math.random() * (config.MAX_DURATION - config.MIN_DURATION)

    // 下落動畫
    const tween = gsap.to(raindrop, {
      y: '120vh', // 落到螢幕下方
      x: `+=${config.WIND_OFFSET}`, // 風向偏移
      duration: duration,
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

    console.log('🌫️ 創建霧天效果')

    // 🚀 優化：使用 DocumentFragment 批量添加霧氣層
    const fragment = document.createDocumentFragment()

    // 創建多層霧氣
    for (let i = 0; i < config.APPEARANCE.LAYERS; i++) {
      const fogLayer = document.createElement('div')
      fogLayer.className = 'fog-layer'

      const opacity =
        config.ANIMATION.OPACITY_RANGE[0] +
        Math.random() * (config.ANIMATION.OPACITY_RANGE[1] - config.ANIMATION.OPACITY_RANGE[0])

      fogLayer.style.cssText = `
        position: absolute;
        top: ${i * 30}%;
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

    // 一次性添加到天氣層
    this.weatherLayer.appendChild(fragment)

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

    console.log('❄️ 創建雪天效果')

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

    // 🚀 優化：使用 DocumentFragment 批量添加粒子
    const fragment = document.createDocumentFragment()

    // 生成雪花
    for (let i = 0; i < particleCount; i++) {
      const snowflake = this.createSnowflake()
      fragment.appendChild(snowflake)
      this.particles.push(snowflake)

      // 延遲啟動動畫
      setTimeout(
        () => {
          this.animateSnowflake(snowflake)
        },
        i * TRANSITION_CONFIG.PARTICLE_SPAWN_DELAY * 1000,
      )
    }

    // 一次性添加到容器
    snowContainer.appendChild(fragment)

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
   */
  animateSnowflake(snowflake) {
    const config = SNOW_CONFIG.ANIMATION
    const duration = config.MIN_DURATION + Math.random() * (config.MAX_DURATION - config.MIN_DURATION)

    // 下落動畫（包含擺動）
    const tween = gsap.to(snowflake, {
      y: '110vh',
      x: `+=${Math.random() * config.SWING_AMOUNT - config.SWING_AMOUNT / 2}`,
      duration: duration,
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

    console.log('⚡ 創建閃電效果')

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
    const interval = (config.MIN_INTERVAL + Math.random() * (config.MAX_INTERVAL - config.MIN_INTERVAL)) * 1000

    this.lightningInterval = setTimeout(() => {
      this.triggerLightning()
    }, interval)
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
      setTimeout(() => {
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
      }, config.DOUBLE_FLASH_DELAY * 1000)
    }

    // 安排下一次閃電
    this.scheduleLightning()
  }

  /**
   * 清除天氣效果
   */
  async clearWeather() {
    return new Promise((resolve) => {
      if (this.particles.length === 0 && this.animations.length === 0 && !this.lightningInterval) {
        resolve()
        return
      }

      console.log('🧹 清除天氣效果')

      // 停止閃電定時器
      if (this.lightningInterval) {
        clearTimeout(this.lightningInterval)
        this.lightningInterval = null
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

    console.log('🌤️ 天氣系統已銷毀')
  }
}

export default WeatherController
