/**
 * VehicleUtilities.js - 車輛工具類
 *
 * 提供可重複使用的靜態方法和屬性管理器
 * 用於避免 Vehicle.js 中的重複代碼
 *
 * DRY 原則應用：
 * - 提取靜態屬性管理
 * - 提取通用的位置/速度計算
 * - 統一配置訪問
 */

import { gsap } from 'gsap'
import { ANIMATION_CONFIG } from '../config/vehicleConfig.js'
import { speedConfig } from '../config/trafficConfig.js'

/**
 * 車輛靜態屬性管理
 * 管理所有車輛共享的全域配置
 */
export class VehicleStaticManager {
  // 🎬 動畫速度倍數（影響所有車輛的動畫速度）
  static timeMultiplier = ANIMATION_CONFIG.TIME_MULTIPLIER

  // 🚨 防抖動機制：全域冷卻時間
  static antiShakeGlobalCooldown = ANIMATION_CONFIG.COOLDOWN_TIMES.GLOBAL_ANTI_SHAKE
  static lastGlobalAdjustTime = 0

  // 🌤️ 天氣速度倍數（影響所有車輛的移動速度）
  static weatherSpeedMultiplier = 1.0

  /**
   * 設置時間倍數（用於全域速度調整）
   * @param {number} multiplier - 時間倍數
   */
  static setTimeMultiplier(multiplier) {
    this.timeMultiplier = multiplier
  }

  /**
   * 獲取時間倍數
   * @returns {number} 當前時間倍數
   */
  static getTimeMultiplier() {
    return this.timeMultiplier
  }

  /**
   * 設置天氣速度倍數
   * @param {number} multiplier - 天氣速度倍數
   */
  static setWeatherSpeedMultiplier(multiplier) {
    this.weatherSpeedMultiplier = multiplier
  }

  /**
   * 獲取天氣速度倍數
   * @returns {number} 當前天氣速度倍數
   */
  static getWeatherSpeedMultiplier() {
    return this.weatherSpeedMultiplier
  }

  /**
   * 檢查全域抖動冷卻是否已過期
   * @returns {boolean} 是否可以進行全域調整
   */
  static canPerformGlobalAdjust() {
    const now = Date.now()
    return now - this.lastGlobalAdjustTime >= this.antiShakeGlobalCooldown
  }

  /**
   * 更新全域調整時間戳
   */
  static updateGlobalAdjustTime() {
    this.lastGlobalAdjustTime = Date.now()
  }

  /**
   * 重置全域調整時間（用於調試或特殊情況）
   */
  static resetGlobalAdjustTime() {
    this.lastGlobalAdjustTime = 0
  }
}

/**
 * 車輛位置和速度工具
 * 提供統一的位置/速度計算和獲取方法
 */
export class VehiclePositionSpeedUtils {
  /**
   * 獲取車輛當前位置
   * Adapter Pattern：將 GSAP 座標系統轉換為標準座標
   *
   * @param {HTMLElement} element - 車輛 DOM 元素
   * @returns {Object} {x, y} 座標對象
   */
  static getCurrentPosition(element) {
    if (!element) {
      // 靜默返回預設位置，上層 Vehicle.getCurrentPosition() 已負責日誌和防護
      return { x: 0, y: 0 }
    }

    return {
      x: gsap.getProperty(element, 'x') || 0,
      y: gsap.getProperty(element, 'y') || 0,
    }
  }

  /**
   * 安全地獲取座標，帶有驗證
   * @param {Object} position - {x, y} 座標對象
   * @returns {Object} 驗證後的座標
   */
  static validatePosition(position) {
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      console.warn('⚠️ [VehicleUtilities] validatePosition: 無效的座標', position)
      return { x: 0, y: 0 }
    }
    return position
  }

  /**
   * 計算兩點之間的距離
   * @param {Object} pos1 - 第一個座標 {x, y}
   * @param {Object} pos2 - 第二個座標 {x, y}
   * @returns {number} 距離（像素）
   */
  static calculateDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 計算方向（度數）
   * @param {Object} from - 起點 {x, y}
   * @param {Object} to - 終點 {x, y}
   * @returns {number} 方向（0-360 度）
   */
  static calculateDirection(from, to) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    return Math.atan2(dy, dx) * (180 / Math.PI)
  }
}

/**
 * 配置驗證工具
 * 確保配置對象完整和有效
 */
export class ConfigValidationUtils {
  /**
   * 驗證車輛配置完整性
   * @param {Object} config - 車輛配置對象
   * @returns {boolean} 是否有效
   */
  static validateVehicleConfig(config) {
    if (!config) {
      console.warn('⚠️ [ConfigValidationUtils] 車輛配置不存在')
      return false
    }

    const requiredFields = ['width', 'height', 'image']
    const missingFields = requiredFields.filter((field) => config[field] === undefined)

    if (missingFields.length > 0) {
      console.warn(`⚠️ [ConfigValidationUtils] 缺失必要欄位: ${missingFields.join(', ')}`)
      return false
    }

    return true
  }

  /**
   * 驗證速度配置
   * @param {Object} speedConfig - 速度配置對象
   * @returns {boolean} 是否有效
   */
  static validateSpeedConfig(speedConfig) {
    if (!speedConfig || typeof speedConfig.min !== 'number' || typeof speedConfig.max !== 'number') {
      return false
    }

    if (speedConfig.min < 0 || speedConfig.max < 0 || speedConfig.min > speedConfig.max) {
      console.warn('⚠️ [ConfigValidationUtils] 速度配置無效:', speedConfig)
      return false
    }

    return true
  }
}

/**
 * 防抖/防多次觸發工具
 * 用於避免短時間內多次調整
 */
export class DebounceUtils {
  /**
   * 檢查是否應該進行操作（根據冷卻時間）
   * @param {number} lastExecuteTime - 上次執行時間戳
   * @param {number} cooldownMs - 冷卻時間（毫秒）
   * @returns {boolean} 是否應該執行
   */
  static shouldExecute(lastExecuteTime, cooldownMs) {
    const now = Date.now()
    return now - lastExecuteTime >= cooldownMs
  }

  /**
   * 獲取距離下次可執行的時間
   * @param {number} lastExecuteTime - 上次執行時間戳
   * @param {number} cooldownMs - 冷卻時間（毫秒）
   * @returns {number} 等待時間（毫秒）
   */
  static getWaitTime(lastExecuteTime, cooldownMs) {
    const now = Date.now()
    const waitTime = cooldownMs - (now - lastExecuteTime)
    return Math.max(0, waitTime)
  }
}

/**
 * 隨機速度生成工具
 * 根據車輛類型生成隨機初始速度
 */
export class RandomSpeedUtils {
  /**
   * 生成車輛隨機速度
   * Strategy Pattern：不同車輛類型使用不同速度策略
   *
   * @param {string} vehicleType - 車輛類型 ('motor', 'small', 'large')
   * @returns {number} 隨機速度值（四捨五入）
   */
  static generateRandomSpeed(vehicleType) {
    // 確保 speedConfig 可用
    if (!speedConfig) {
      console.warn('⚠️ [RandomSpeedUtils] speedConfig 未定義，使用預設值')
      return 40 // 預設速度 40 km/h
    }

    // 獲取車輛類型的速度範圍
    const range = speedConfig[vehicleType] || speedConfig.small
    if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') {
      console.warn(`⚠️ [RandomSpeedUtils] 無效的速度範圍: ${vehicleType}`, range)
      return 40 // 預設速度
    }

    // 生成指定範圍內的隨機速度
    const randomSpeed = range.min + Math.random() * (range.max - range.min)
    const finalSpeed = Math.round(randomSpeed)

    // 🚑 調試：記錄救護車速度
    if (vehicleType === 'ambulance') {
      console.log(`🚑 [RandomSpeedUtils] 救護車速度: ${finalSpeed} km/h (範圍: ${range.min}-${range.max})`)
    }

    return finalSpeed
  }
}

/**
 * 車道標籤工具
 * 創建和管理車輛的車道編號標籤
 */
export class LaneLabelUtils {
  /**
   * 創建車道標籤元素
   * Composite Pattern：創建車道編號標籤作為子組件
   *
   * @param {number} laneNumber - 車道編號
   * @param {string} direction - 車輛方向 ('east', 'west', 'north', 'south')
   * @returns {HTMLElement} 車道標籤 DOM 元素
   */
  static createLaneLabel(laneNumber, direction) {
    const label = document.createElement('div')
    label.className = 'lane-label'
    label.textContent = laneNumber

    // 根據方向設置位置和旋轉
    let labelTransform = this.getLabelTransform(direction)

    label.style.cssText = `
      position: absolute;
      ${labelTransform}
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 2px;
      border-radius: 50%;
      border: 1px solid #ffcc00;
      z-index: 15;
      pointer-events: none;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    `

    return label
  }

  /**
   * 根據方向取得標籤的位置和旋轉 CSS
   * @param {string} direction - 車輛方向
   * @returns {string} CSS transform 字串
   */
  static getLabelTransform(direction) {
    const transforms = {
      east: 'top: -8px; left: 50%; transform: translateX(-50%);',
      west: 'top: 5px; left: 50%; transform: translateX(-50%) rotate(180deg);',
      north: 'top: 5px; left: 50%; transform: translateX(-50%) rotate(90deg);',
      south: 'top: -8px; left: 50%; transform: translateX(-50%) rotate(-90deg);',
    }

    return transforms[direction] || transforms.east // 預設為 east 方向
  }

  /**
   * 移除標籤元素
   * @param {HTMLElement} labelElement - 要移除的標籤元素
   */
  static removeLaneLabel(labelElement) {
    if (labelElement && labelElement.parentNode) {
      labelElement.parentNode.removeChild(labelElement)
    }
  }
}

/**
 * 速度線工具
 * 創建和管理車輛加速效果的速度線
 */
export class SpeedLineUtils {
  /**
   * 創建速度線容器
   * @param {HTMLElement} container - 父容器
   * @param {Object} vehicleConfig - 車輛配置對象
   * @param {string} direction - 車輛方向
   * @returns {HTMLElement} 速度線容器
   */
  static createSpeedLines(container, vehicleConfig, direction) {
    const speedLines = document.createElement('div')
    speedLines.className = 'speed-lines'

    // 根據方向決定速度線的位置和方向
    const lineStyle = this.getSpeedLineStyle(vehicleConfig, direction)

    speedLines.style.cssText = `
      position: absolute;
      ${lineStyle.position}
      width: ${lineStyle.width};
      height: ${lineStyle.height};
      opacity: 0;
      pointer-events: none;
      z-index: 5;
    `

    // 創建 3 條速度線
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('div')
      line.style.cssText = `
        position: absolute;
        ${lineStyle.linePosition}
        ${lineStyle.lineSize}
        background: linear-gradient(90deg, transparent, rgba(100, 150, 255, 0.6), transparent);
        border-radius: 2px;
        transform: translateX(${-i * 10}px);
      `
      speedLines.appendChild(line)
    }

    container.appendChild(speedLines)
    return speedLines
  }

  /**
   * 根據方向和配置獲取速度線樣式
   * @param {Object} vehicleConfig - 車輛配置
   * @param {string} direction - 車輛方向
   * @returns {Object} 樣式配置
   */
  static getSpeedLineStyle(vehicleConfig, direction) {
    const width = vehicleConfig.width
    const height = vehicleConfig.height

    switch (direction) {
      case 'east':
        return {
          position: 'left: -30px; top: 50%; transform: translateY(-50%);',
          width: '30px',
          height: `${height}px`,
          linePosition: 'left: 0;',
          lineSize: 'width: 15px; height: 2px; top: 30%;',
        }
      case 'west':
        return {
          position: 'right: -30px; top: 50%; transform: translateY(-50%);',
          width: '30px',
          height: `${height}px`,
          linePosition: 'right: 0;',
          lineSize: 'width: 15px; height: 2px; top: 30%;',
        }
      case 'north':
        return {
          position: 'top: -30px; left: 50%; transform: translateX(-50%);',
          width: `${width}px`,
          height: '30px',
          linePosition: 'top: 0;',
          lineSize: 'width: 2px; height: 15px; left: 50%;',
        }
      case 'south':
        return {
          position: 'bottom: -30px; left: 50%; transform: translateX(-50%);',
          width: `${width}px`,
          height: '30px',
          linePosition: 'bottom: 0;',
          lineSize: 'width: 2px; height: 15px; left: 50%;',
        }
      default:
        return {
          position: 'left: -30px; top: 50%;',
          width: '30px',
          height: `${height}px`,
          linePosition: 'left: 0;',
          lineSize: 'width: 15px; height: 2px;',
        }
    }
  }

  /**
   * 顯示加速效果
   * @param {HTMLElement} speedLines - 速度線元素
   * @param {boolean} isIntense - 是否為強烈加速
   */
  static showAccelerationEffect(speedLines, isIntense = false) {
    if (!speedLines) return

    const opacity = isIntense ? 0.8 : 0.5
    const duration = isIntense ? 0.8 : 0.5

    // 淡入速度線
    gsap.to(speedLines, {
      opacity: opacity,
      duration: 0.2,
      ease: 'power2.out',
    })

    // 自動淡出
    gsap.to(speedLines, {
      opacity: 0,
      duration: 0.3,
      delay: duration,
      ease: 'power2.in',
    })
  }

  /**
   * 隱藏加速效果
   * @param {HTMLElement} speedLines - 速度線元素
   */
  static hideAccelerationEffect(speedLines) {
    if (!speedLines) return

    gsap.to(speedLines, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    })
  }

  /**
   * 移除速度線元素
   * @param {HTMLElement} speedLines - 速度線元素
   */
  static removeSpeedLines(speedLines) {
    if (speedLines && speedLines.parentNode) {
      speedLines.parentNode.removeChild(speedLines)
    }
  }
}

/**
 * DOM 創建工具
 * 統一管理車輛 DOM 元素的創建和樣式
 */
export class VehicleDOMUtils {
  /**
   * 創建車輛 DOM 元素
   * @param {Object} vehicleConfig - 車輛配置
   * @param {Object} options - 選項 { rotation, scaleX, vehicleType }
   * @returns {HTMLElement} 車輛 DOM 元素
   */
  static createVehicleElement(vehicleConfig, options = {}) {
    const { rotation, scaleX } = options

    const div = document.createElement('div')
    div.className = 'vehicle'

    // 設置基礎樣式
    div.style.position = 'absolute'
    div.style.width = `${vehicleConfig.width}px`
    div.style.height = `${vehicleConfig.height}px`
    div.style.zIndex = '10'
    div.style.top = '0'
    div.style.left = '0'
    div.style.willChange = 'transform'
    div.style.transformOrigin = 'center center'

    // 構建 transform 樣式
    let transformValues = []
    if (rotation !== undefined) {
      transformValues.push(`rotate(${rotation}deg)`)
    }
    if (scaleX !== undefined) {
      transformValues.push(`scaleX(${scaleX})`)
    }
    if (transformValues.length > 0) {
      div.style.transform = transformValues.join(' ')
    }

    // 🚨 救護車特殊處理：使用雙層結構避免 filter 影響紅十字
    if (options.vehicleType === 'ambulance') {
      // 🏷️ 添加特殊 class 標記救護車
      div.classList.add('ambulance-vehicle')

      // ❌ 救護車不在外層設置背景圖片，只在內層設置
      // 創建內層圖片容器（套用 filter）
      const imageContainer = document.createElement('div')
      imageContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('${vehicleConfig.image}');
        background-size: contain;
        background-repeat: no-repeat;
        filter: grayscale(100%) brightness(2.5) contrast(1.2);
      `
      div.appendChild(imageContainer)

      // 創建紅色十字標記（在外層，不受 filter 影響）
      const crossMark = document.createElement('div')
      crossMark.className = 'ambulance-cross'
      // 十字尺寸為車體的 50%
      const crossWidth = vehicleConfig.width * 0.4
      const crossHeight = vehicleConfig.height * 0.6
      crossMark.style.cssText = `
        position: absolute;
        top: calc(50% - 1px);
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${crossWidth}px;
        height: ${crossHeight}px;
        pointer-events: none;
        z-index: 2;
      `

      // 創建十字的橫線（線條寬度 4px）
      const horizontal = document.createElement('div')
      horizontal.style.cssText = `
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        width: 100%;
        height: 4px;
        background: #ff0000;
        box-shadow: 0 0 4px rgba(255, 0, 0, 0.8);
      `

      // 創建十字的豎線（線條寬度 4px）
      const vertical = document.createElement('div')
      vertical.style.cssText = `
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 100%;
        background: #ff0000;
        box-shadow: 0 0 4px rgba(255, 0, 0, 0.8);
      `

      crossMark.appendChild(horizontal)
      crossMark.appendChild(vertical)
      div.appendChild(crossMark)
    } else {
      // 普通車輛：直接在外層設置背景圖片
      div.style.backgroundImage = `url('${vehicleConfig.image}')`
      div.style.backgroundSize = 'contain'
      div.style.backgroundRepeat = 'no-repeat'
    }

    return div
  }
}

/**
 * 動畫時間計算工具
 * 處理動畫時間的計算，帶有 NaN 防護
 */
export class AnimationDurationUtils {
  /**
   * 計算動畫持續時間
   * @param {number} initialSpeed - 車輛初始速度 (km/h)
   * @param {number} distance - 距離（像素）
   * @returns {number} 動畫持續時間（秒）
   */
  static calculateDuration(initialSpeed, distance = 800) {
    // 轉換速度：km/h → m/s
    const speedMs = (initialSpeed * 1000) / 3600

    // 防護：避免除以零
    if (speedMs <= 0) {
      return ANIMATION_CONFIG.MIN_ANIMATION_TIME
    }

    // 距離轉換：100 像素 = 15 米
    const pixelsPerMeter = 100 / 15
    const realDistance = distance / pixelsPerMeter

    // 計算理論時間
    let theoreticalTime = realDistance / speedMs

    // 防護：NaN 檢查
    if (!isFinite(theoreticalTime) || theoreticalTime < 0) {
      theoreticalTime = ANIMATION_CONFIG.MIN_ANIMATION_TIME
    }

    // 應用時間倍數
    const adjustedTheoretical = theoreticalTime * VehicleStaticManager.getTimeMultiplier()

    // 在允許範圍內夾緊
    const minTime = ANIMATION_CONFIG.MIN_ANIMATION_TIME
    const maxTime = ANIMATION_CONFIG.MAX_ANIMATION_TIME
    const adjustedTime = Math.max(minTime, Math.min(maxTime, adjustedTheoretical))

    return adjustedTime
  }
}

/**
 * 當前速度工具
 * 計算車輛當前速度比例，帶有 Infinity 防護
 */
export class CurrentSpeedUtils {
  /**
   * 計算當前速度比例
   * @param {Object} movementTimeline - GSAP 動畫時間軸
   * @param {number} originalTimeScale - 原始時間縮放
   * @returns {number} 速度比例
   */
  static getSpeedRatio(movementTimeline, originalTimeScale = 1.0) {
    // 沒有時間軸時返回預設速度比
    if (!movementTimeline) {
      return 1.0
    }

    try {
      // 獲取當前時間軸的速度縮放
      const currentTimeScale = movementTimeline.timeScale()

      // 防護：Infinity 檢查
      if (!isFinite(currentTimeScale)) {
        return 1.0
      }

      const baseTimeScale = originalTimeScale || 1.0

      // 防護：避免除以零
      if (baseTimeScale <= 0) {
        return 1.0
      }

      const ratio = currentTimeScale / baseTimeScale

      // 防護：確保返回有效的數值
      return isFinite(ratio) ? ratio : 1.0
    } catch (error) {
      // 異常防護
      console.warn('Error calculating speed ratio:', error)
      return 1.0
    }
  }

  /**
   * 計算停止距離（基於黃燈決策邏輯）
   * 公式：stopping_distance = (speed²) / (2 × deceleration) + safety_margin
   *
   * @param {number} currentSpeedRatio - 當前速度比例 (0-1)
   * @param {number} initialSpeed - 初始速度 (px/frame)
   * @param {number} deceleration - 減速度 (px/frame²)
   * @param {number} safetyMargin - 安全邊距 (px)
   * @returns {number} 停止距離
   */
  static calculateStoppingDistance(currentSpeedRatio, initialSpeed, deceleration, safetyMargin = 0) {
    if (!currentSpeedRatio || !initialSpeed || !deceleration) {
      return 0
    }

    const speedInPixelsPerFrame = currentSpeedRatio * initialSpeed
    const stoppingDistance = (speedInPixelsPerFrame * speedInPixelsPerFrame) / (2 * deceleration) + safetyMargin

    return Math.max(0, stoppingDistance)
  }

  /**
   * 計算轉彎時的最大速度
   * 根據轉彎半徑計算速度比例
   *
   * @param {number} turningRadius - 轉彎半徑 (px)
   * @param {number} maxSpeed - 最大速度 (px/s)
   * @returns {number} 轉彎最大速度比例 (0-1)
   */
  static calculateTurnSpeedRatio(turningRadius, maxSpeed = 30) {
    if (!turningRadius || turningRadius <= 0 || !maxSpeed) {
      return 1.0
    }

    // 根據轉彎半徑計算速度比例
    // 轉彎半徑越小，速度比例越低
    const speedRatio = Math.max(0.2, Math.min(1.0, turningRadius / 100))
    return speedRatio
  }

  /**
   * 根據燈號狀態計算應用的速度比例
   * 用於黃燈、紅燈等特殊燈號狀態
   *
   * @param {string} lightState - 燈號狀態 (red, yellow, green, leftGreen, allRed)
   * @param {number} currentSpeedRatio - 當前速度比例
   * @param {boolean} shouldBrake - 是否應該剎車
   * @returns {number} 應用的速度比例
   */
  static getSpeedRatioForLightState(lightState, currentSpeedRatio = 1.0, shouldBrake = false) {
    if (shouldBrake) {
      return 0 // 剎車到完全停止
    }

    // 對於不同的燈號狀態返回相應的速度比例
    switch (lightState) {
      case 'red':
      case 'allRed':
        return 0 // 紅燈時停止
      case 'yellow':
        return currentSpeedRatio // 黃燈時保持當前速度（由決策邏輯控制）
      case 'green':
      case 'leftGreen':
        return currentSpeedRatio // 綠燈時正常速度
      default:
        return currentSpeedRatio
    }
  }

  /**
   * 計算平滑加速/減速的速度進度
   * 使用緩動曲線計算中間速度
   *
   * @param {number} startSpeed - 起始速度
   * @param {number} endSpeed - 結束速度
   * @param {number} progress - 進度 (0-1)
   * @param {string} easing - 緩動函式 (linear, ease-in, ease-out, ease-in-out)
   * @returns {number} 當前速度
   */
  static interpolateSpeed(startSpeed, endSpeed, progress, easing = 'linear') {
    if (progress <= 0) return startSpeed
    if (progress >= 1) return endSpeed

    let easedProgress = progress

    // 應用緩動函式
    switch (easing) {
      case 'ease-in':
        easedProgress = progress * progress
        break
      case 'ease-out':
        easedProgress = 1 - (1 - progress) * (1 - progress)
        break
      case 'ease-in-out':
        easedProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress
        break
      case 'linear':
      default:
        easedProgress = progress
        break
    }

    return startSpeed + (endSpeed - startSpeed) * easedProgress
  }

  /**
   * 驗證速度是否有效
   *
   * @param {number} speed - 速度值
   * @returns {boolean} 是否有效
   */
  static isValidSpeed(speed) {
    return typeof speed === 'number' && isFinite(speed) && speed >= 0
  }

  /**
   * 規範化速度到有效範圍
   *
   * @param {number} speed - 速度值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number} 規範化後的速度
   */
  static normalizeSpeed(speed, min = 0, max = 1) {
    if (!this.isValidSpeed(speed)) {
      return min
    }

    return Math.max(min, Math.min(max, speed))
  }
}

/**
 * 邊界檢測工具
 * 根據方向檢查是否超出邊界
 */
export class BoundaryCheckUtils {
  /**
   * 檢查位置是否超出邊界（根據方向）
   * @param {Object} position - 當前位置 {x, y}
   * @param {Object} bounds - 邊界 {left, right, top, bottom}
   * @param {string} direction - 車輛方向 (east|west|north|south)
   * @returns {boolean} 是否已超出邊界
   */
  static checkBounds(position, bounds, direction) {
    // 防護：位置檢查
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return false
    }

    // 防護：邊界檢查
    if (!bounds || typeof bounds.right !== 'number') {
      return false
    }

    // 根據方向檢查邊界
    switch (direction) {
      case 'east':
        return position.x >= bounds.right
      case 'west':
        return position.x <= bounds.left
      case 'north':
        return position.y <= bounds.top
      case 'south':
        return position.y >= bounds.bottom
      default:
        return false
    }
  }
}

/**
 * 車頭位置工具
 * 根據方向計算車輛車頭位置
 */
export class HeadPositionUtils {
  /**
   * 計算車頭位置
   * @param {Object} currentPos - 當前車位置 {x, y}
   * @param {Object} vehicleSize - 車輛尺寸 {width, height}
   * @param {string} direction - 車輛方向 (east|west|north|south)
   * @returns {Object} 車頭位置 {x, y}
   */
  static getHeadPosition(currentPos, vehicleSize, direction) {
    // 防護：參數檢查
    if (!currentPos || !vehicleSize || !direction) {
      return currentPos || { x: 0, y: 0 }
    }

    const { width, height } = vehicleSize

    // 根據方向決定車頭位置
    switch (direction) {
      case 'east':
        // 東向車頭在右側
        return { x: currentPos.x + width, y: currentPos.y + height / 2 }
      case 'west':
        // 西向車頭在左側
        return { x: currentPos.x, y: currentPos.y + height / 2 }
      case 'north':
        // 北向車頭在上方
        return { x: currentPos.x + width / 2, y: currentPos.y }
      case 'south':
        // 南向車頭在下方
        return { x: currentPos.x + width / 2, y: currentPos.y + height }
      default:
        // 預設返回左上角位置
        return currentPos
    }
  }
}

/**
 * 邊界框工具
 * 計算和管理車輛的邊界框
 */
export class BoundingBoxUtils {
  /**
   * 計算邊界框
   * @param {Object} position - 當前位置 {x, y}
   * @param {Object} vehicleSize - 車輛尺寸 {width, height}
   * @returns {Object} 邊界框 {left, right, top, bottom, centerX, centerY}
   */
  static getBoundingBox(position, vehicleSize) {
    // 防護：參數檢查
    if (!position || !vehicleSize) {
      return {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        centerX: 0,
        centerY: 0,
      }
    }

    const { x, y } = position
    const { width, height } = vehicleSize

    return {
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    }
  }
}

/**
 * 停止線工具
 * 統一管理停止線相關的邏輯查詢
 */
export class StopLineUtils {
  /**
   * 檢查是否應該停在停止線
   * @param {Object} stopLineController - 停止線控制器實例
   * @returns {boolean} 是否應該停止
   */
  static shouldStop(stopLineController) {
    // 防護：控制器檢查
    if (!stopLineController || typeof stopLineController.shouldStopAtLine !== 'function') {
      return false
    }

    try {
      return stopLineController.shouldStopAtLine()
    } catch (error) {
      console.warn('Error checking stop line:', error)
      return false
    }
  }

  /**
   * 獲取到停止線的距離
   * @param {Object} stopLineController - 停止線控制器實例
   * @returns {number} 距離（像素）
   */
  static getDistance(stopLineController) {
    // 防護：控制器檢查
    if (!stopLineController || typeof stopLineController.getDistanceToStopLine !== 'function') {
      return Infinity
    }

    try {
      const distance = stopLineController.getDistanceToStopLine()
      return isFinite(distance) ? distance : Infinity
    } catch (error) {
      console.warn('Error getting distance to stop line:', error)
      return Infinity
    }
  }
}

/**
 * 碰撞檢測查詢工具
 * 統一管理碰撞控制器相關的邏輯查詢
 */
export class CollisionQueryUtils {
  /**
   * 檢查是否是最接近停止線的車輛
   * @param {Object} collisionController - 碰撞控制器實例
   * @param {Array} allVehicles - 所有車輛陣列
   * @returns {boolean} 是否是最接近的
   */
  static isClosestToStopLine(collisionController, allVehicles) {
    // 防護：控制器和陣列檢查
    if (
      !collisionController ||
      typeof collisionController.isClosestToStopLine !== 'function' ||
      !Array.isArray(allVehicles)
    ) {
      return false
    }

    try {
      return collisionController.isClosestToStopLine(allVehicles)
    } catch (error) {
      console.warn('Error checking if closest to stop line:', error)
      return false
    }
  }
}

/**
 * 停止線對齊工具
 * 處理車輛停止線對齊相關的邏輯
 */
export class StopLineAlignmentUtils {
  /**
   * 執行停止線對齊
   * @param {Object} stopLineController - 停止線控制器實例
   * @returns {boolean} 是否成功對齊
   */
  static performAlignment(stopLineController) {
    // 防護：控制器檢查
    if (!stopLineController || typeof stopLineController.alignToStopLine !== 'function') {
      return false
    }

    try {
      stopLineController.alignToStopLine()
      return true
    } catch (error) {
      console.warn('Error aligning to stop line:', error)
      return false
    }
  }
}

/**
 * 停止移動工具
 * 處理車輛停止移動相關的邏輯
 */
export class StopMovementUtils {
  /**
   * 暫停車輛動畫
   * @param {Object} movementTimeline - GSAP 動畫時間軸
   * @returns {boolean} 是否成功暫停
   */
  static pauseAnimation(movementTimeline) {
    // 防護：時間軸檢查
    if (!movementTimeline || typeof movementTimeline.pause !== 'function') {
      return false
    }

    try {
      movementTimeline.pause()
      return true
    } catch (error) {
      console.warn('Error pausing animation:', error)
      return false
    }
  }

  /**
   * 更新停止移動的相關狀態
   * @param {Object} stateUpdate - 狀態更新物件 {currentState}
   */
  static updateStopState(stateUpdate = {}) {
    const { currentState } = stateUpdate

    // 更新狀態（如果不是等待狀態，設為等待）
    if (currentState && currentState !== 'waitingForVehicle' && currentState !== 'waiting') {
      return 'waiting'
    }

    return currentState
  }

  /**
   * 重置停止線狀態
   * @param {Object} stopLineController - 停止線控制器實例
   * @returns {boolean} 是否成功重置
   */
  static resetStopLineState(stopLineController) {
    // 防護：控制器檢查
    if (!stopLineController) {
      return false
    }

    try {
      if (stopLineController.state !== undefined) {
        stopLineController.state = 'approaching'
      }
      return true
    } catch (error) {
      console.warn('Error resetting stop line state:', error)
      return false
    }
  }
}

/**
 * 交通燈減速工具
 * 處理交通燈相關的減速邏輯
 */
export class TrafficLightSlowDownUtils {
  /**
   * 檢查交通燈減速
   * @param {Object} params - 參數物件
   * @returns {Object|null} 減速信息或null
   */
  static checkSlowDown(params = {}) {
    const { hasPassedStopLine, waitingForGreen, isAtStopLine, stopLineController, trafficController } = params

    // 防護：檢查是否應該返回 null
    if (hasPassedStopLine || waitingForGreen || isAtStopLine) {
      return null
    }

    // 防護：檢查停止線控制器
    if (!stopLineController || typeof stopLineController.checkTrafficLightLogic !== 'function') {
      return null
    }

    try {
      return stopLineController.checkTrafficLightLogic(trafficController)
    } catch (error) {
      console.warn('Error checking traffic light slow down:', error)
      return null
    }
  }
}

/**
 * 交通燈直接響應工具
 * 處理交通燈的直接響應邏輯（複雜的狀態機）
 */
export class TrafficLightDirectResponseUtils {
  /**
   * 檢查是否已通過停止線
   * @param {Object} params - 參數物件 {hasPassedStopLine, movementTimeline, currentState}
   * @returns {boolean} 是否需要提前返回
   */
  static checkPassedStopLine(params = {}) {
    const { hasPassedStopLine, movementTimeline, currentState } = params

    if (!hasPassedStopLine) {
      return false
    }

    // 已通過停止線的車輛保持移動狀態
    if (movementTimeline && (currentState !== 'moving' || movementTimeline.timeScale() === 0)) {
      if (typeof movementTimeline.timeScale === 'function') {
        // 🌤️ 使用天氣倍數而不是硬編碼的 1
        movementTimeline.timeScale(VehicleStaticManager.getWeatherSpeedMultiplier())
      }
      if (typeof movementTimeline.resume === 'function') {
        movementTimeline.resume()
      }
    }

    return true // 提早返回
  }

  /**
   * 判斷車輛是否可以通行
   * @param {string} currentLightState - 當前燈號狀態
   * @param {number} laneNumber - 車道號
   * @returns {boolean} 是否可以通行
   */
  static canProceed(currentLightState, laneNumber) {
    if (!currentLightState) {
      return false
    }

    // 直行綠燈且非左轉車道
    if (currentLightState === 'green' && laneNumber !== 1) {
      return true
    }

    // 左轉綠燈且為左轉車道
    if (currentLightState === 'leftGreen' && laneNumber === 1) {
      return true
    }

    return false
  }

  /**
   * 檢查是否需要啟動移動
   * @param {Object} params - 參數物件
   * @returns {boolean} 是否需要啟動
   */
  static needsToStart(params = {}) {
    const { waitingForGreen, movementTimeline, currentState } = params

    if (waitingForGreen) return true
    if (movementTimeline && movementTimeline.timeScale() === 0) return true

    const statesRequiringStart = [
      'waiting',
      'stopped',
      'waitingForVehicle',
      'waitingForLeftTurnGreen',
      'waitingForStraightGreen',
    ]

    if (statesRequiringStart.includes(currentState)) return true
    if (movementTimeline && typeof movementTimeline.paused === 'function' && movementTimeline.paused()) return true

    return false
  }

  /**
   * 執行綠燈啟動
   * @param {Object} params - 參數物件
   * @returns {Object} 更新的狀態
   */
  static executeGreenStart(params = {}) {
    const { movementTimeline } = params

    if (!movementTimeline) {
      return {}
    }

    try {
      if (typeof movementTimeline.timeScale === 'function') {
        // 🌤️ 使用天氣倍數而不是硬編碼的 1
        movementTimeline.timeScale(VehicleStaticManager.getWeatherSpeedMultiplier())
      }
      if (typeof movementTimeline.resume === 'function') {
        movementTimeline.resume()
      }

      return {
        waitingForGreen: false,
        isAtStopLine: false,
        currentState: 'moving',
      }
    } catch (error) {
      console.warn('Error executing green light start:', error)
      return {}
    }
  }

  /**
   * 完整的交通燈響應處理（委託模式）
   * @param {Object} vehicleInstance - Vehicle 實例
   * @param {Object} trafficController - 交通控制器
   */
  static handleDirectResponse(vehicleInstance, trafficController) {
    // 基本防護
    if (!vehicleInstance.direction || !trafficController || !vehicleInstance.movementTimeline) {
      return
    }

    // 🛑 新增：如果車輛在碰撞停止狀態，不要覆蓋其 timeScale
    if (vehicleInstance.isInCollisionStop) {
      return
    }

    const currentLightState = trafficController.getCurrentLightState(vehicleInstance.direction)

    // 檢查是否已通過停止線
    if (
      this.checkPassedStopLine({
        hasPassedStopLine: vehicleInstance.hasPassedStopLine,
        movementTimeline: vehicleInstance.movementTimeline,
        currentState: vehicleInstance.currentState,
      })
    ) {
      return
    }

    // 綠燈響應
    if (currentLightState === 'green' || currentLightState === 'leftGreen') {
      if (this.canProceed(currentLightState, vehicleInstance.laneNumber)) {
        if (
          this.needsToStart({
            waitingForGreen: vehicleInstance.waitingForGreen,
            movementTimeline: vehicleInstance.movementTimeline,
            currentState: vehicleInstance.currentState,
          })
        ) {
          const stateUpdates = this.executeGreenStart({
            movementTimeline: vehicleInstance.movementTimeline,
          })
          Object.assign(vehicleInstance, stateUpdates)
        }
      }
    }
  }
}

/**
 * 恢復移動工具
 * 處理車輛從停止或減速狀態恢復到移動的邏輯
 */
export class ResumeMovementUtils {
  /**
   * 執行恢復移動（簡化版）
   *
   * 說明：碰撞檢測已完全移至 CollisionFollowingController
   * 此方法只負責在停止線後恢復移動
   *
   * @param {Object} vehicle - 車輛實例
   * @param {Array} allVehicles - 所有車輛陣列
   * @param {Object} animationConfig - 動畫配置
   */
  static executeResume(vehicle, allVehicles, animationConfig = {}) {
    if (!vehicle || !vehicle.movementTimeline) return

    const { duration = 0.5, ease = 'power2.out' } = animationConfig

    // 🚨 簡化：只負責恢復停止線處的車輛
    // 其他碰撞邏輯由 CollisionFollowingController 處理

    // 如果車輛在停止線或等待綠燈，由停止線邏輯控制
    if (vehicle.isAtStopLine || vehicle.waitingForGreen) {
      return
    }

    // 如果已通過停止線，確保速度恢復到 1
    if (vehicle.hasPassedStopLine && vehicle.movementTimeline.timeScale() < 0.95) {
      gsap.to(vehicle.movementTimeline, {
        // 🌤️ 使用天氣倍數而不是硬編碼的 1
        timeScale: VehicleStaticManager.getWeatherSpeedMultiplier(),
        duration,
        ease,
      })
      vehicle.currentState = 'moving'
    }
  }
}

/**
 * 默認導出：包含所有工具類
 */
export default {
  VehicleStaticManager,
  VehiclePositionSpeedUtils,
  ConfigValidationUtils,
  DebounceUtils,
  RandomSpeedUtils,
  LaneLabelUtils,
  SpeedLineUtils,
  VehicleDOMUtils,
  AnimationDurationUtils,
  CurrentSpeedUtils,
  BoundaryCheckUtils,
  HeadPositionUtils,
  BoundingBoxUtils,
  StopLineUtils,
  CollisionQueryUtils,
  StopLineAlignmentUtils,
  StopMovementUtils,
  TrafficLightSlowDownUtils,
  TrafficLightDirectResponseUtils,
  ResumeMovementUtils,
}
