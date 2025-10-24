/**
 * VD 正規化工具類
 * 負責將前端模擬數據轉換為後端模型訓練的真實範圍
 *
 * 核心邏輯：
 * 前端數據 (displayMultiplier × VD真實值) → 正規化轉換 → VD真實範圍
 */

import {
  getCurrentTimePeriod,
  getTimePeriodByHour,
  getNormalizationConfig,
  getCurrentNormalizationParams,
  getNormalizationParamsByHour,
} from '../config/vdNormalizationConfig.js'

class VDNormalizationUtils {
  /**
   * 獲取當前時刻的時段和正規化參數
   * @param {string} intersectionId - 路口 ID
   * @returns {object} { period, params }
   */
  static getCurrentTimePeriodAndParams(intersectionId) {
    const period = getCurrentTimePeriod()
    const params = getCurrentNormalizationParams(intersectionId)
    return { period, params }
  }

  /**
   * 獲取指定小時的時段和正規化參數
   * @param {string} intersectionId - 路口 ID
   * @param {number} hour - 小時 (0-23)
   * @returns {object} { period, params }
   */
  static getTimePeriodAndParamsByHour(intersectionId, hour) {
    const period = getTimePeriodByHour(hour)
    const params = getNormalizationParamsByHour(intersectionId, hour)
    return { period, params }
  }

  /**
   * 核心正規化函數：將前端數據轉換為VD真實範圍
   *
   * 公式：
   * normalizedValue = frontendValue / displayMultiplier
   *
   * @param {object} frontendData - 前端生成的數據
   * @param {string} intersectionId - 路口 ID
   * @param {string} [period] - 時段 (可選，不提供時自動識別)
   * @returns {object} 正規化後的數據
   *
   * @example
   * // 前端生成 60 輛車，VLRJM60 尖峰時段
   * const frontendData = {
   *   volume: 60,
   *   speed: 45,
   *   occupancy: 0.35
   * }
   * const normalized = VDNormalizationUtils.denormalizeToVDRange(
   *   frontendData,
   *   'VLRJM60',
   *   'peak_hours'
   * )
   * // Result: { volume: 8.33, speed: 45, occupancy: 0.35 }
   */
  static denormalizeToVDRange(frontendData, intersectionId, period = null) {
    // 如果沒有指定時段，自動識別
    if (!period) {
      period = getCurrentTimePeriod()
    }

    // 獲取正規化參數
    const config = getNormalizationConfig(intersectionId)
    const params = config[period]

    if (!params) {
      console.error(`[VD正規化] 無效的時段: ${period}`)
      return frontendData
    }

    // 執行正規化轉換
    const normalizedData = {}
    const displayMultiplier = params.displayMultiplier

    // 流量正規化 (輛/5分鐘)
    if (frontendData.volume !== undefined) {
      normalizedData.volume = Math.round((frontendData.volume / displayMultiplier) * 100) / 100
      // 確保在有效範圍內
      normalizedData.volume = Math.max(params.volume.min, Math.min(params.volume.max, normalizedData.volume))
    }

    // 速度不需要正規化，直接保留
    if (frontendData.speed !== undefined) {
      normalizedData.speed = frontendData.speed
    }

    // 佔有率正規化
    if (frontendData.occupancy !== undefined) {
      normalizedData.occupancy = Math.round((frontendData.occupancy / displayMultiplier) * 100) / 100
      normalizedData.occupancy = Math.max(
        params.occupancy.min / 100,
        Math.min(params.occupancy.max / 100, normalizedData.occupancy),
      )
    }

    // 車型流量正規化
    const vehicleTypes = ['volume_m', 'volume_s', 'volume_l', 'volume_t']
    vehicleTypes.forEach((type) => {
      if (frontendData[type] !== undefined) {
        normalizedData[type] = Math.round((frontendData[type] / displayMultiplier) * 100) / 100
      }
    })

    return normalizedData
  }

  /**
   * 驗證正規化後的數據是否在有效範圍內
   *
   * @param {object} normalizedData - 正規化後的數據
   * @param {string} intersectionId - 路口 ID
   * @param {string} [period] - 時段 (可選)
   * @returns {object} { isValid, errors, warnings }
   */
  static validateNormalizedData(normalizedData, intersectionId, period = null) {
    if (!period) {
      period = getCurrentTimePeriod()
    }

    const config = getNormalizationConfig(intersectionId)
    const params = config[period]
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    // 驗證流量
    if (normalizedData.volume !== undefined) {
      if (normalizedData.volume < params.volume.min) {
        result.warnings.push(`流量 ${normalizedData.volume} 輛低於最小值 ${params.volume.min} 輛`)
      }
      if (normalizedData.volume > params.volume.max) {
        result.errors.push(`流量 ${normalizedData.volume} 輛超過最大值 ${params.volume.max} 輛`)
        result.isValid = false
      }
    }

    // 驗證佔有率
    if (normalizedData.occupancy !== undefined) {
      const occupancyPercent = normalizedData.occupancy * 100
      if (occupancyPercent < params.occupancy.min) {
        result.warnings.push(`佔有率 ${occupancyPercent}% 低於最小值 ${params.occupancy.min}%`)
      }
      if (occupancyPercent > params.occupancy.max) {
        result.errors.push(`佔有率 ${occupancyPercent}% 超過最大值 ${params.occupancy.max}%`)
        result.isValid = false
      }
    }

    // 驗證速度
    if (normalizedData.speed !== undefined) {
      if (normalizedData.speed < params.speed.min) {
        result.warnings.push(`速度 ${normalizedData.speed} km/h 低於最小值 ${params.speed.min} km/h`)
      }
      if (normalizedData.speed > params.speed.max) {
        result.warnings.push(`速度 ${normalizedData.speed} km/h 超過最大值 ${params.speed.max} km/h`)
      }
    }

    return result
  }

  /**
   * 批量正規化數據
   * 用於同時處理多個車道的數據
   *
   * @param {object} frontendDataMap - 多個車道的前端數據
   * @param {string} intersectionId - 路口 ID
   * @param {string} [period] - 時段 (可選)
   * @returns {object} 正規化後的數據集
   *
   * @example
   * const frontendDataMap = {
   *   'VD-M60-0112': { volume: 60, speed: 45, occupancy: 0.35 },
   *   'VD-M60-0113': { volume: 62, speed: 47, occupancy: 0.38 }
   * }
   * const normalized = VDNormalizationUtils.normalizeMultipleLanes(
   *   frontendDataMap,
   *   'VLRJM60'
   * )
   */
  static normalizeMultipleLanes(frontendDataMap, intersectionId, period = null) {
    const normalizedMap = {}

    for (const [laneId, laneData] of Object.entries(frontendDataMap)) {
      normalizedMap[laneId] = this.denormalizeToVDRange(laneData, intersectionId, period)
    }

    return normalizedMap
  }

  /**
   * 獲取當前時段的顯示倍數
   * 用於視覺層與API層之間的轉換
   *
   * @param {string} intersectionId - 路口 ID
   * @param {number} [hour] - 小時 (可選，不提供時使用當前時間)
   * @returns {number} displayMultiplier
   */
  static getDisplayMultiplier(intersectionId, hour = null) {
    let period
    if (hour !== null && hour !== undefined) {
      period = getTimePeriodByHour(hour)
    } else {
      period = getCurrentTimePeriod()
    }

    const config = getNormalizationConfig(intersectionId)
    return config[period]?.displayMultiplier || 1
  }

  /**
   * 計算所需的前端視覺車輛數
   * 基於目標VD真實值和displayMultiplier
   *
   * @param {number} targetVDVolume - 目標VD真實流量 (輛/5分鐘)
   * @param {string} intersectionId - 路口 ID
   * @param {string} [period] - 時段 (可選)
   * @returns {number} 前端應生成的車輛數
   *
   * @example
   * // VLRJM60 尖峰時段，目標7輛
   * const frontendVolume = VDNormalizationUtils.calculateFrontendVolume(7, 'VLRJM60', 'peak_hours')
   * // Result: 50.4 輛 (7 × 7.2)
   */
  static calculateFrontendVolume(targetVDVolume, intersectionId, period = null) {
    if (!period) {
      period = getCurrentTimePeriod()
    }

    const config = getNormalizationConfig(intersectionId)
    const params = config[period]
    return Math.round(targetVDVolume * params.displayMultiplier * 100) / 100
  }

  /**
   * 生成日誌信息，用於調試
   *
   * @param {object} frontendData - 前端數據
   * @param {object} normalizedData - 正規化後的數據
   * @param {string} intersectionId - 路口 ID
   * @param {string} period - 時段
   * @returns {string} 日誌信息
   */
  static generateDebugLog(frontendData, normalizedData, intersectionId, period) {
    const multiplier = this.getDisplayMultiplier(intersectionId)
    return `[VD正規化] ${intersectionId} ${period}
    前端: Volume=${frontendData.volume} Speed=${frontendData.speed} Occupancy=${frontendData.occupancy}
    倍數: ${multiplier}x
    正規化: Volume=${normalizedData.volume} Speed=${normalizedData.speed} Occupancy=${normalizedData.occupancy}`
  }
}

export default VDNormalizationUtils
