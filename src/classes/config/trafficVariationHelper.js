/**
 * trafficVariationHelper.js
 * 為交通參數添加真實的隨機變化，讓模擬更貼近現實
 */

/**
 * 為數值添加隨機變化
 * @param {number} baseValue - 基準值
 * @param {number} variationPercent - 變化百分比 (例如: 15 表示 ±15%)
 * @returns {number} 應用變化後的值
 */
export function addVariation(baseValue, variationPercent = 10) {
  const variation = baseValue * (variationPercent / 100)
  const randomOffset = (Math.random() * 2 - 1) * variation // -variation 到 +variation
  return Math.max(0, Math.round(baseValue + randomOffset))
}

/**
 * 為區間對象添加變化
 * @param {Object} interval - 包含 min, max, normal 的區間對象
 * @param {number} variationPercent - 變化百分比
 * @returns {Object} 應用變化後的區間對象
 */
export function addIntervalVariation(interval, variationPercent = 10) {
  return {
    min: addVariation(interval.min, variationPercent),
    max: addVariation(interval.max, variationPercent),
    normal: addVariation(interval.normal, variationPercent),
  }
}

/**
 * 為車型權重添加變化（保持總和為100）
 * @param {Array} vehicleTypes - 車型配置數組 [{type, weight}, ...]
 * @param {number} variationPercent - 變化百分比
 * @returns {Array} 應用變化後的車型配置
 */
export function addVehicleTypeVariation(vehicleTypes, variationPercent = 5) {
  // 為每個車型添加隨機變化
  const varied = vehicleTypes.map((vt) => ({
    ...vt,
    weight: Math.max(0, vt.weight + (Math.random() * 2 - 1) * variationPercent),
  }))

  // 重新正規化，確保總和為100
  const totalWeight = varied.reduce((sum, vt) => sum + vt.weight, 0)
  return varied.map((vt) => ({
    ...vt,
    weight: Math.round((vt.weight / totalWeight) * 100),
  }))
}

/**
 * 為速度範圍添加變化
 * @param {Object} speedRange - 包含 min, max 的速度範圍
 * @param {number} variationKmh - 速度變化量 (km/h)
 * @returns {Object} 應用變化後的速度範圍
 */
export function addSpeedVariation(speedRange, variationKmh = 5) {
  const minOffset = (Math.random() * 2 - 1) * variationKmh
  const maxOffset = (Math.random() * 2 - 1) * variationKmh

  return {
    min: Math.max(5, Math.round(speedRange.min + minOffset)), // 最低速度不低於5
    max: Math.round(speedRange.max + maxOffset),
  }
}

/**
 * 為整個時段配置添加真實變化
 * @param {Object} baseConfig - 基礎配置對象
 * @param {Object} options - 變化選項
 * @returns {Object} 應用變化後的配置
 */
export function applyRealisticVariation(baseConfig, options = {}) {
  const {
    intervalVariation = 10, // 生成間隔變化 ±10%
    vehicleTypeVariation = 5, // 車型比例變化 ±5%
    speedVariation = 5, // 速度變化 ±5 km/h
    multiplierVariation = 0.1, // 倍數變化 ±0.1
  } = options

  const varied = { ...baseConfig }

  // 1. 生成間隔變化
  if (varied.interval) {
    varied.interval = addIntervalVariation(varied.interval, intervalVariation)
  }

  // 2. 車型比例變化
  if (varied.vehicleTypes) {
    varied.vehicleTypes = addVehicleTypeVariation(varied.vehicleTypes, vehicleTypeVariation)
  }

  // 3. 峰值倍數變化
  if (typeof varied.peakMultiplier === 'number') {
    const offset = (Math.random() * 2 - 1) * multiplierVariation
    varied.peakMultiplier = Math.max(0.5, Number((varied.peakMultiplier + offset).toFixed(2)))
  }

  // 4. 速度範圍變化
  if (varied.targetFeatures?.speedByType) {
    const speedByType = { ...varied.targetFeatures.speedByType }
    for (const type in speedByType) {
      speedByType[type] = addSpeedVariation(speedByType[type], speedVariation)
    }
    varied.targetFeatures = {
      ...varied.targetFeatures,
      speedByType,
    }
  }

  return varied
}

/**
 * 基於時段特性的智能變化
 * 不同時段使用不同的變化幅度，讓尖峰時段更穩定，離峰時段更隨機
 * @param {Object} baseConfig - 基礎配置
 * @param {string} timePeriod - 時段類型 ('peak', 'off_peak', 'late_night')
 * @returns {Object} 智能變化後的配置
 */
export function applySmartVariation(baseConfig, timePeriod = 'off_peak') {
  let options = {}

  switch (timePeriod) {
    case 'peak':
      // 尖峰時段：變化較小，流量相對穩定
      options = {
        intervalVariation: 8, // ±8% -> 可改為 5-15
        vehicleTypeVariation: 6, // ±6% -> 可改為 2-8
        speedVariation: 3, // ±3 km/h -> 可改為 2-10
        multiplierVariation: 0.05, // ±0.05 -> 可改為 0.02-0.15
      }
      break

    case 'late_night':
      // 凌晨時段：變化較大，流量很不穩定
      options = {
        intervalVariation: 20, // ±20% -> 可改為 15-30
        vehicleTypeVariation: 10, // ±10% -> 可改為 5-15
        speedVariation: 10, // ±10 km/h -> 可改為 5-12
        multiplierVariation: 0.15, // ±0.15 -> 可改為 0.1-0.2
      }
      break

    case 'off_peak':
    default:
      // 離峰時段：中等變化
      options = {
        intervalVariation: 12, // ±12% -> 可改為 8-18
        vehicleTypeVariation: 6, // ±6% -> 可改為 4-10
        speedVariation: 5, // ±5 km/h -> 可改為 3-8
        multiplierVariation: 0.1, // ±0.1 -> 可改為 0.05-0.15
      }
      break
  }

  return applyRealisticVariation(baseConfig, options)
}

/**
 * 週期性波動（模擬真實交通的微小週期變化）
 * 例如：每5分鐘有一個小高峰，每15分鐘有較大起伏
 * @param {Object} baseConfig - 基礎配置
 * @param {number} elapsedMinutes - 已經過的模擬分鐘數
 * @returns {Object} 應用週期波動後的配置
 */
export function applyCyclicVariation(baseConfig, elapsedMinutes = 0) {
  const config = { ...baseConfig }

  // 5分鐘週期：小幅波動 (±5%)
  const shortCycle = Math.sin((elapsedMinutes / 5) * Math.PI * 2) * 0.05

  // 15分鐘週期：中幅波動 (±10%)
  const mediumCycle = Math.sin((elapsedMinutes / 15) * Math.PI * 2) * 0.1

  // 30分鐘週期：大幅波動 (±8%)
  const longCycle = Math.sin((elapsedMinutes / 30) * Math.PI * 2) * 0.08

  // 組合週期影響
  const totalCyclicEffect = 1 + shortCycle + mediumCycle + longCycle

  // 應用到生成間隔
  if (config.interval?.normal) {
    config.interval.normal = Math.round(config.interval.normal * totalCyclicEffect)
  }

  // 應用到峰值倍數
  if (typeof config.peakMultiplier === 'number') {
    config.peakMultiplier = Number((config.peakMultiplier * totalCyclicEffect).toFixed(2))
  }

  return config
}

/**
 * 完整的真實交通變化系統
 * 結合即時隨機變化、週期波動和時段特性
 * @param {Object} baseConfig - 基礎配置
 * @param {Object} context - 上下文信息
 * @returns {Object} 最終配置
 */
export function applyFullRealisticVariation(baseConfig, context = {}) {
  const {
    timePeriod = 'off_peak', // 時段類型
    elapsedMinutes = 0, // 已經過的分鐘數
    enableCyclicVariation = true, // 是否啟用週期波動
  } = context

  let config = { ...baseConfig }

  // 1. 基於時段的智能變化
  config = applySmartVariation(config, timePeriod)

  // 2. 可選：週期性波動
  if (enableCyclicVariation) {
    config = applyCyclicVariation(config, elapsedMinutes)
  }

  return config
}
