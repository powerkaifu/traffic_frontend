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
      console.warn('❌ [VehicleUtilities] getCurrentPosition: element 未定義')
      return { x: 0, y: 0 }
    }

    return {
      x: gsap.getProperty(element, 'x') || 0,
      y: gsap.getProperty(element, 'y') || 0,
    }
  }

  /**
   * 獲取天氣速度倍數
   * 從全域天氣控制器獲取速度影響係數
   *
   * @returns {number} 天氣倍數（1.0 = 無影響，<1.0 = 減速，>1.0 = 加速）
   */
  static getWeatherSpeedMultiplier() {
    // ✅ 安全的全域訪問：檢查存在性和類型
    if (window.weatherController && typeof window.weatherController.getSpeedMultiplier === 'function') {
      try {
        const multiplier = window.weatherController.getSpeedMultiplier()
        // ✅ 驗證返回值
        if (typeof multiplier === 'number' && Number.isFinite(multiplier) && multiplier > 0) {
          return multiplier
        }
      } catch (error) {
        console.warn('⚠️ [VehicleUtilities] 獲取天氣倍數失敗:', error)
      }
    }
    return 1.0 // 預設：無影響
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
    return Math.round(randomSpeed)
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
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
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
 * 默認導出：包含所有工具類
 */
export default {
  VehicleStaticManager,
  VehiclePositionSpeedUtils,
  ConfigValidationUtils,
  DebounceUtils,
  RandomSpeedUtils,
  LaneLabelUtils,
}
