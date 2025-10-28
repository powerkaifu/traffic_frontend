/**
 * vdMapping.js - VD 時段特徵映射配置
 *
 * 根據分析的 VD 數據，建立「時段標籤」到「真實VD特徵」的映射
 * 確保前端發送給後端模型的特徵與訓練數據一致
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 核心映射邏輯：
 * ═══════════════════════════════════════════════════════════════════════
 * 用戶選擇時段 → 前端映射到真實小時 + 車輛數特徵 → 發送給後端模型
 *
 * 例如：
 * - 用戶選「尖峰」→ 映射到 hour=[7,8,9,17,18,19] + vehicle_count=95
 * - 用戶選「離峰」→ 映射到 hour=[10-16,20-23] + vehicle_count=40
 * - 用戶選「凌晨」→ 映射到 hour=[0-6] + vehicle_count=12
 * ═══════════════════════════════════════════════════════════════════════
 */

export const VD_TIME_MAPPING = {
  // ═══════════════════════════════════════════════════════════════════════
  // 尖峰時段 (Peak Hours)
  // ═══════════════════════════════════════════════════════════════════════
  peak: {
    // 根據VD數據分析，尖峰出現在這些小時
    // VLRJM60: 07:00-10:00, 16:00-19:00 的車輛數明顯上升
    // VLRJX00: 07:30-09:30, 16:30-18:30 的車輛數明顯上升
    // VLRJX20: 08:30-10:30, 17:30-19:30 的車輛數明顯上升
    hours: [7, 8, 9, 17, 18, 19],

    // 尖峰時段的車輛數範圍（基於VD實測統計）
    // VLRJM60 尖峰平均: 95輛, 範圍: 60-156輛
    // VLRJX00 尖峰平均: 105輛, 範圍: 65-189輛
    // VLRJX20 尖峰平均: 92輛, 範圍: 55-142輛
    vehicleCountRange: [60, 156],
    avgVehicleCount: 95,

    // 模型訓練時的典型特徵
    typicalFeatures: {
      hourRange: [7, 19],
      vehicleCountMean: 95,
      vehicleCountStdDev: 25,
      occupancyMean: 0.35,
      occupancyStdDev: 0.12,
      speedMean: 32,
    },

    // 用於前端顯示和統計
    displayLabel: '尖峰時段',
    displayColor: '#FF4444',
    description: '早上 7-10 點、下午 5-7 點交通繁忙時段',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 離峰時段 (Off-Peak Hours)
  // ═══════════════════════════════════════════════════════════════════════
  offPeak: {
    // 根據VD數據分析，離峰出現在這些小時
    // VLRJM60: 10:00-16:00, 19:00-23:00 的車輛數相對穩定但低於尖峰
    // VLRJX00: 10:00-16:00, 19:00-23:00 的車輛數相對穩定
    // VLRJX20: 11:00-16:00, 20:00-23:00 的車輛數相對穩定
    hours: [10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23],

    // 離峰時段的車輛數範圍（基於VD實測統計）
    // VLRJM60 離峰平均: 40輛, 範圍: 20-60輛
    // VLRJX00 離峰平均: 42輛, 範圍: 15-65輛
    // VLRJX20 離峰平均: 38輛, 範圍: 18-58輛
    vehicleCountRange: [20, 60],
    avgVehicleCount: 40,

    // 模型訓練時的典型特徵
    typicalFeatures: {
      hourRange: [10, 23],
      vehicleCountMean: 40,
      vehicleCountStdDev: 12,
      occupancyMean: 0.18,
      occupancyStdDev: 0.08,
      speedMean: 38,
    },

    // 用於前端顯示和統計
    displayLabel: '離峰時段',
    displayColor: '#4444FF',
    description: '上午 10-16 點、晚上 19-23 點交通較輕時段',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 凌晨時段 (Midnight Hours)
  // ═══════════════════════════════════════════════════════════════════════
  midnight: {
    // 根據VD數據分析，凌晨出現在這些小時
    // VLRJM60: 00:00-07:00 的車輛數明顯下降到最低
    // VLRJX00: 01:00-06:00 的車輛數最低
    // VLRJX20: 03:00-06:00 的車輛數最低
    hours: [0, 1, 2, 3, 4, 5, 6],

    // 凌晨時段的車輛數範圍（基於VD實測統計）
    // VLRJM60 凌晨平均: 12輛, 範圍: 1-30輛
    // VLRJX00 凌晨平均: 8輛, 範圍: 1-28輛
    // VLRJX20 凌晨平均: 10輛, 範圍: 3-25輛
    vehicleCountRange: [1, 30],
    avgVehicleCount: 12,

    // 模型訓練時的典型特徵
    typicalFeatures: {
      hourRange: [0, 6],
      vehicleCountMean: 12,
      vehicleCountStdDev: 6,
      occupancyMean: 0.08,
      occupancyStdDev: 0.04,
      speedMean: 44,
    },

    // 用於前端顯示和統計
    displayLabel: '凌晨時段',
    displayColor: '#444444',
    description: '00:00-07:00 交通最輕時段',
  },
}

/**
 * 獲取指定時段的映射配置
 * @param {string} timeSlot - 時段標籤 ('peak' | 'offPeak' | 'midnight')
 * @returns {Object} VD 特徵映射配置
 */
export function getVDMappingForTimeSlot(timeSlot) {
  return VD_TIME_MAPPING[timeSlot] || VD_TIME_MAPPING.offPeak
}

/**
 * 從時段映射中隨機選擇一個小時
 * @param {string} timeSlot - 時段標籤
 * @returns {number} 隨機選擇的小時 (0-23)
 */
export function getRandomHourForTimeSlot(timeSlot) {
  const mapping = getVDMappingForTimeSlot(timeSlot)
  const hours = mapping.hours
  return hours[Math.floor(Math.random() * hours.length)]
}

/**
 * 從時段映射中隨機選擇一個車輛數（在範圍內）
 * @param {string} timeSlot - 時段標籤
 * @returns {number} 隨機選擇的車輛數
 */
export function getRandomVehicleCountForTimeSlot(timeSlot) {
  const mapping = getVDMappingForTimeSlot(timeSlot)
  const [min, max] = mapping.vehicleCountRange
  // 使用正態分佈，更符合真實交通流的特性
  const mean = mapping.avgVehicleCount
  const stdDev = (max - min) / 4 // 估算標準差為範圍的 1/4
  return Math.max(min, Math.min(max, Math.round(gaussianRandom(mean, stdDev))))
}

/**
 * 獲取時段的典型特徵（用於發送給模型）
 * @param {string} timeSlot - 時段標籤
 * @returns {Object} 包含 hour、vehicle_count、occupancy 等模型特徵
 */
export function getTypicalFeaturesForTimeSlot(timeSlot) {
  const mapping = getVDMappingForTimeSlot(timeSlot)
  return {
    hour: getRandomHourForTimeSlot(timeSlot),
    vehicle_count: getRandomVehicleCountForTimeSlot(timeSlot),
    occupancy: mapping.typicalFeatures.occupancyMean,
    speed: mapping.typicalFeatures.speedMean,
    timeSlot: timeSlot,
    description: mapping.description,
  }
}

/**
 * 獲取所有可用的時段列表
 * @returns {Array<string>} ['peak', 'offPeak', 'midnight']
 */
export function getAllTimeSlots() {
  return Object.keys(VD_TIME_MAPPING)
}

/**
 * 高斯分佈隨機數生成器（用於生成更符合真實分佈的車輛數）
 * @param {number} mean - 平均值
 * @param {number} stdDev - 標準差
 * @returns {number} 高斯分佈的隨機數
 */
function gaussianRandom(mean, stdDev) {
  // Box-Muller 轉換
  let u1, u2
  do {
    u1 = Math.random()
  } while (u1 === 0) // 轉換 (0, 1] 為 (0, 1)
  u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return z0 * stdDev + mean
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 使用說明
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 在前端使用時段映射：
 *
 * 1. 獲取時段配置：
 *    const mapping = getVDMappingForTimeSlot('peak')
 *
 * 2. 獲取隨機小時：
 *    const hour = getRandomHourForTimeSlot('peak')  // 返回 7, 8, 9, 17, 18, 或 19
 *
 * 3. 獲取隨機車輛數：
 *    const vehicles = getRandomVehicleCountForTimeSlot('peak')  // 返回 60-156 範圍內的數值
 *
 * 4. 獲取完整特徵（直接發送給模型）：
 *    const features = getTypicalFeaturesForTimeSlot('peak')
 *    // 返回 { hour: 8, vehicle_count: 92, occupancy: 0.35, speed: 32, ... }
 *
 * 5. 在 TrafficLightController.callApi() 中使用：
 *    const timeSlot = getCurrentTimePeriod()  // 'peak', 'offPeak', 或 'midnight'
 *    const vdFeatures = getTypicalFeaturesForTimeSlot(timeSlot)
 *    // 發送 vdFeatures 到後端模型，而非只發送 timeSlot 標籤
 * ═══════════════════════════════════════════════════════════════════════
 */
