/**
 * VD 正規化工具類
 * 負責將前端模擬數據轉換為後端模型訓練的真實範圍
 *
 * 核心邏輯（新）：
 * 1. 基準值 = VD_PATTERN_RANGES[timePeriod][vdId].baseline
 * 2. 變動值 = 基準值 × flowVariation.multiplier（根據生成間隔）
 * 3. 最終值 = 基準值 + (變動值 - 基準值) × 隨機因子
 * 4. 確保範圍內：clamp(finalValue, range)
 */

import {
  getCurrentTimePeriod,
  getTimePeriodByHour,
  getNormalizationConfig,
  getCurrentNormalizationParams,
  getNormalizationParamsByHour,
} from '../config/vdNormalizationConfig.js'
import { VD_PATTERN_RANGES, getIntervalMultiplier, getDisplayMultiplier } from '../config/vdPatternConfig.js'

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
   * 核心正規化函數（改進版）：將前端數據轉換為VD真實範圍
   *
   * 邏輯：
   * 1. 獲取時段對應的基準值配置
   * 2. 根據生成速度計算調整倍數
   * 3. 計算動態變動值
   * 4. 確保所有數據在歷史統計範圍內
   *
   * @param {object} frontendData - 前端生成的數據
   *   - volume_m: 機車流量
   *   - volume_s: 小車流量
   *   - volume_l: 大車流量
   *   - volume / volume_t: 總流量
   *   - speed: 平均速度
   *   - occupancy: 佔有率 (0-1 或百分比)
   *
   * @param {string} intersectionId - 路口 ID ('VLRJM60', 'VLRJX00', 'VLRJX20')
   * @param {string} [timePeriod] - 時段 ('peak_hours', 'off_peak', 'late_night')
   * @param {object} [flowVariation] - 流量變動配置 { intensity, multiplier, currentInterval }
   *
   * @returns {object} 正規化後的數據
   *
   * @example
   * const frontendData = {
   *   volume_m: 20,
   *   volume_s: 25,
   *   volume_l: 5,
   *   volume: 50,
   *   speed: 45,
   *   occupancy: 0.35
   * }
   * const flowVar = { multiplier: 1.2, intensity: 0.8 }
   * const normalized = VDNormalizationUtils.denormalizeToVDRange(
   *   frontendData,
   *   'VLRJM60',
   *   'peak_hours',
   *   flowVar
   * )
   */
  static denormalizeToVDRange(frontendData, intersectionId, timePeriod = null, flowVariation = null) {
    try {
      // 容錯 1: 驗證路口 ID
      const validIntersectionIds = ['VLRJM60', 'VLRJX00', 'VLRJX20']
      if (!validIntersectionIds.includes(intersectionId)) {
        console.warn(`⚠️ [正規化容錯] 無效的路口 ID: ${intersectionId}，使用 VLRJM60`)
        intersectionId = 'VLRJM60'
      }

      // 如果沒有指定時段，從全局獲取
      if (!timePeriod) {
        timePeriod = window.selectedTrafficTimePeriod || getCurrentTimePeriod() || 'off_peak'
      }

      // 容錯 2: 驗證時段
      const validPeriods = ['peak_hours', 'off_peak', 'late_night']
      if (!validPeriods.includes(timePeriod)) {
        console.warn(`⚠️ [正規化容錯] 無效的時段: ${timePeriod}，使用離峰時段`)
        timePeriod = 'off_peak'
      }

      // 🎯 新增：嘗試從 VD_PATTERN_RANGES 獲取配置
      const patternConfig = VD_PATTERN_RANGES[timePeriod]?.[intersectionId]

      if (!patternConfig) {
        console.warn(`⚠️ [正規化] 未找到 ${intersectionId} 的 ${timePeriod} 配置，使用基礎正規化`)
        // 回退到舊方法
        return this._denormalizeWithLegacyMethod(frontendData, intersectionId, timePeriod)
      }

      const { baseline, range } = patternConfig

      // 計算流量倍數
      let multiplier = 1.0
      if (flowVariation && flowVariation.multiplier) {
        multiplier = flowVariation.multiplier
      } else if (flowVariation && flowVariation.currentInterval) {
        multiplier = getIntervalMultiplier(flowVariation.currentInterval, timePeriod, intersectionId)
      }

      console.log(
        `📊 [VD正規化] ${intersectionId} ${timePeriod} - 流量倍數: ${multiplier.toFixed(2)}, 基準值: ${baseline.Volume_T.toFixed(2)} 輛`,
      )

      // 🎯 新邏輯：基準值 + 變動值
      // 變動值 = (基準值 × 倍數 - 基準值) × 隨機因子
      const targetVolume = baseline.Volume_T * multiplier
      const variation = targetVolume - baseline.Volume_T
      const randomFactor = 0.8 + Math.random() * 0.4 // 0.8 - 1.2

      // 計算最終流量（確保在範圍內）
      let finalVolume = baseline.Volume_T + variation * randomFactor
      finalVolume = Math.max(range.Volume_T[0], Math.min(range.Volume_T[1], finalVolume))

      // 車型流量按比例分配
      const volumeRatio = finalVolume / baseline.Volume_T
      const volume_m = Math.round(baseline.Volume_M * volumeRatio)
      const volume_s = Math.round(baseline.Volume_S * volumeRatio)
      const volume_l = Math.round(baseline.Volume_L * volumeRatio)

      // 確保車型流量在範圍內
      const finalVolumeM = Math.max(range.Volume_M[0], Math.min(range.Volume_M[1], volume_m))
      const finalVolumeS = Math.max(range.Volume_S[0], Math.min(range.Volume_S[1], volume_s))
      const finalVolumeL = Math.max(range.Volume_L[0], Math.min(range.Volume_L[1], volume_l))

      // 總流量 = 三種車型之和
      const totalFlow = finalVolumeM + finalVolumeS + finalVolumeL

      // 佔有率：基準值 + 隨機波動
      let occupancy = baseline.Occupancy + (Math.random() - 0.5) * 4
      occupancy = Math.max(range.Occupancy[0], Math.min(range.Occupancy[1], occupancy))

      // 速度：基準值 + 隨機波動
      let speed = baseline.Speed + (Math.random() - 0.5) * 5
      speed = Math.max(range.Speed[0], Math.min(range.Speed[1], speed))

      // 車型平均速度（使用基準值，因為前端無法提供）
      const speedM = baseline.Speed + (Math.random() - 0.5) * 3
      const speedS = baseline.Speed + (Math.random() - 0.5) * 3
      const speedL = baseline.Speed + (Math.random() - 0.5) * 3

      const normalizedData = {
        volume_m: finalVolumeM,
        volume_s: finalVolumeS,
        volume_l: finalVolumeL,
        volume: totalFlow,
        volume_t: totalFlow,
        occupancy: occupancy / 100, // 轉換為小數
        speed: Math.round(speed * 10) / 10,
        speed_m: Math.round(speedM * 10) / 10,
        speed_s: Math.round(speedS * 10) / 10,
        speed_l: Math.round(speedL * 10) / 10,
        // 添加調試信息
        _debugInfo: {
          baseline: baseline.Volume_T,
          multiplier: multiplier,
          targetVolume: targetVolume,
          variation: variation,
          randomFactor: randomFactor,
        },
      }

      console.log(
        `✅ [VD正規化完成] ${intersectionId}: 前端${(frontendData.volume || 0).toFixed(1)} → VD${totalFlow} 輛 (占用率${occupancy.toFixed(1)}%, 速度${speed.toFixed(1)}km/h)`,
      )

      return normalizedData
    } catch (error) {
      console.error(`❌ [正規化異常] ${error.message}，路口: ${intersectionId}，時段: ${timePeriod}`)
      return frontendData || {}
    }
  }

  /**
   * 舊方法：使用遺留的正規化邏輯（回退方案）
   * @private
   */
  static _denormalizeWithLegacyMethod(frontendData, intersectionId, period) {
    const config = getNormalizationConfig(intersectionId)
    const params = config?.[period]

    if (!params) {
      console.warn(`⚠️ [正規化容錯失敗] 無法獲取參數，返回原始數據`)
      return frontendData
    }

    const normalizedData = {}
    let displayMultiplier = params.displayMultiplier || 1.0

    if (displayMultiplier <= 0) {
      displayMultiplier = 1.0
    }

    // 流量正規化
    if (frontendData.volume !== undefined && frontendData.volume !== null) {
      normalizedData.volume = Math.round((frontendData.volume / displayMultiplier) * 100) / 100
      normalizedData.volume = Math.max(
        params.volume?.min || 0,
        Math.min(params.volume?.max || 45, normalizedData.volume),
      )
    }

    // 速度
    if (frontendData.speed !== undefined && frontendData.speed !== null) {
      normalizedData.speed = frontendData.speed
    }

    // 佔有率
    if (frontendData.occupancy !== undefined && frontendData.occupancy !== null) {
      normalizedData.occupancy = Math.round((frontendData.occupancy / displayMultiplier) * 100) / 100
      normalizedData.occupancy = Math.max(
        (params.occupancy?.min || 0) / 100,
        Math.min((params.occupancy?.max || 100) / 100, normalizedData.occupancy),
      )
    }

    // 車型流量
    const vehicleTypes = ['volume_m', 'volume_s', 'volume_l', 'volume_t']
    vehicleTypes.forEach((type) => {
      if (frontendData[type] !== undefined && frontendData[type] !== null) {
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
   * @returns {object} { isValid, errors, warnings, period }
   */
  static validateNormalizedData(normalizedData, intersectionId, period = null) {
    try {
      if (!period) {
        period = window.selectedTrafficTimePeriod || getCurrentTimePeriod()
      }

      const patternConfig = VD_PATTERN_RANGES[period]?.[intersectionId]
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        period: period,
      }

      if (!patternConfig) {
        result.errors.push(`無效的配置: ${period} - ${intersectionId}`)
        result.isValid = false
        return result
      }

      const { range } = patternConfig

      // 驗證流量
      const volume = normalizedData.volume || normalizedData.volume_t || 0
      if (volume < range.Volume_T[0]) {
        result.warnings.push(`流量 ${volume} 輛低於最小值 ${range.Volume_T[0]} 輛`)
      }
      if (volume > range.Volume_T[1]) {
        result.errors.push(`流量 ${volume} 輛超過最大值 ${range.Volume_T[1]} 輛`)
        result.isValid = false
      }

      // 驗證速度
      const speed = normalizedData.speed || 0
      if (speed < range.Speed[0] || speed > range.Speed[1]) {
        result.warnings.push(`速度 ${speed} km/h 超出範圍 [${range.Speed[0]}, ${range.Speed[1]}]`)
      }

      return result
    } catch (error) {
      console.error(`❌ [驗證異常] ${error.message}`)
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        period: period,
      }
    }
  }

  /**
   * 獲取當前時段的顯示倍數
   *
   * @param {string} intersectionId - 路口 ID
   * @param {number} [hour] - 小時 (可選)
   * @returns {number} displayMultiplier
   */
  static getDisplayMultiplier(intersectionId, hour = null) {
    let period
    if (hour !== null && hour !== undefined) {
      period = getTimePeriodByHour(hour)
    } else {
      period = window.selectedTrafficTimePeriod || getCurrentTimePeriod() || 'off_peak'
    }

    return getDisplayMultiplier(period, intersectionId)
  }

  /**
   * 生成日誌信息
   */
  static generateDebugLog(frontendData, normalizedData, intersectionId, period) {
    const multiplier = this.getDisplayMultiplier(intersectionId)
    return `[VD正規化] ${intersectionId} ${period}
    前端: Volume=${frontendData.volume} Speed=${frontendData.speed}
    倍數: ${multiplier}x
    正規化: Volume=${normalizedData.volume} Speed=${normalizedData.speed}`
  }
}

export default VDNormalizationUtils
