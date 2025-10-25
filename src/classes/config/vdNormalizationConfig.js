/**
 * VD 正規化配置
 * 基於 50 週 VD 數據統計（VD_HOURLY_ANALYSIS.md）
 * 用於將前端模擬數據轉換為後端模型訓練的真實範圍
 */

/**
 * 時段定義
 * 基於 VD_HOURLY_ANALYSIS.md 的時段分類
 */
export const TIME_PERIODS = {
  peak_hours: {
    name: '尖峰時段',
    icon: '🚀',
    hours: [7, 8, 9, 17, 18, 19],
    description: '早峰(07:00-09:00)和晚峰(17:00-19:00)',
  },
  off_peak: {
    name: '離峰時段',
    icon: '🌞',
    hours: [10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23],
    description: '午間離峰(10:00-16:00)和晚間離峰(20:00-23:00)',
  },
  late_night: {
    name: '凌晨時段',
    icon: '🌙',
    hours: [0, 1, 2, 3, 4, 5, 6],
    description: '凌晨離峰(00:00-06:00)',
  },
}

/**
 * 獲取當前時段
 */
export function getCurrentTimePeriod() {
  const hour = new Date().getHours()

  if (TIME_PERIODS.peak_hours.hours.includes(hour)) {
    return 'peak_hours'
  } else if (TIME_PERIODS.late_night.hours.includes(hour)) {
    return 'late_night'
  } else {
    return 'off_peak'
  }
}

/**
 * 獲取指定小時的時段
 */
export function getTimePeriodByHour(hour) {
  if (TIME_PERIODS.peak_hours.hours.includes(hour)) {
    return 'peak_hours'
  } else if (TIME_PERIODS.late_night.hours.includes(hour)) {
    return 'late_night'
  } else {
    return 'off_peak'
  }
}

/**
 * VD 正規化參數 - VLRJM60
 * 基於 VD_HOURLY_ANALYSIS.md 的統計數據
 * 包含：min/max/avg (平均值)、p95 (95 百分位數)
 */
export const VLRJM60_NORMALIZATION = {
  // 尖峰時段 (07:00-09:00, 17:00-19:00)
  peak_hours: {
    // 流量統計 (輛/5分鐘)
    volume: {
      min: 0,
      max: 42,
      avg: 6.8, // 目標值：前端應轉換為此值
      p95: 23, // P95 上限
    },
    // 佔有率統計 (%)
    occupancy: {
      min: 0,
      max: 100,
      avg: 13.17,
      p95: 49,
    },
    // 速度統計 (km/h)
    speed: {
      min: 0,
      max: 100,
      avg: 22.9,
      p95: 50,
    },
    // 車型分布
    vehicleDistribution: {
      motor: 0.38, // 機車 38%
      small: 0.58, // 小型車 58%
      large: 0.04, // 大型車 4%
    },
    // 正規化倍數：前端 / VD 真實 = 7.2 倍
    displayMultiplier: 7.2,
  },

  // 離峰時段 (09:00-17:00, 19:00-23:00)
  off_peak: {
    volume: {
      min: 0,
      max: 37,
      avg: 5.96,
      p95: 21,
    },
    occupancy: {
      min: 0,
      max: 100,
      avg: 11.25,
      p95: 39,
    },
    speed: {
      min: 0,
      max: 135,
      avg: 22.62,
      p95: 49,
    },
    vehicleDistribution: {
      motor: 0.35,
      small: 0.61,
      large: 0.04,
    },
    displayMultiplier: 3.0, // 離峰倍數較低
  },

  // 凌晨時段 (00:00-06:00)
  late_night: {
    volume: {
      min: 0,
      max: 20,
      avg: 1.35,
      p95: 8,
    },
    occupancy: {
      min: 0,
      max: 100,
      avg: 1.74,
      p95: 10,
    },
    speed: {
      min: 0,
      max: 110,
      avg: 16.42,
      p95: 63,
    },
    vehicleDistribution: {
      motor: 0.4,
      small: 0.56,
      large: 0.04,
    },
    displayMultiplier: 1.3, // 凌晨倍數 1.3x
  },
}

/**
 * VD 正規化參數 - VLRJX00
 */
export const VLRJX00_NORMALIZATION = {
  peak_hours: {
    volume: {
      min: 0,
      max: 45,
      avg: 5.14,
      p95: 21,
    },
    occupancy: {
      min: 0,
      max: 100,
      avg: 10.27,
      p95: 42,
    },
    speed: {
      min: 0,
      max: 130,
      avg: 20.93,
      p95: 55,
    },
    vehicleDistribution: {
      motor: 0.37,
      small: 0.59,
      large: 0.04,
    },
    displayMultiplier: 6.8,
  },

  off_peak: {
    volume: {
      min: 0,
      max: 38,
      avg: 4.1,
      p95: 17,
    },
    occupancy: {
      min: 0,
      max: 100,
      avg: 8.41,
      p95: 35,
    },
    speed: {
      min: 0,
      max: 126,
      avg: 20.52,
      p95: 55,
    },
    vehicleDistribution: {
      motor: 0.32,
      small: 0.63,
      large: 0.05,
    },
    displayMultiplier: 2.9,
  },

  late_night: {
    volume: {
      min: 0,
      max: 19,
      avg: 0.71,
      p95: 17,
    },
    occupancy: {
      min: 0,
      max: 100,
      avg: 1.88,
      p95: 10,
    },
    speed: {
      min: 0,
      max: 131,
      avg: 12.08,
      p95: 62,
    },
    vehicleDistribution: {
      motor: 0.35,
      small: 0.6,
      large: 0.05,
    },
    displayMultiplier: 1.3,
  },
}

/**
 * VD 正規化參數 - VLRJX20
 */
export const VLRJX20_NORMALIZATION = {
  peak_hours: {
    volume: {
      min: 0,
      max: 48,
      avg: 5.06,
      p95: 23,
    },
    occupancy: {
      min: 0,
      max: 100,
      avg: 17.04,
      p95: 79,
    },
    speed: {
      min: 0,
      max: 104,
      avg: 14.23,
      p95: 44,
    },
    vehicleDistribution: {
      motor: 0.4,
      small: 0.55,
      large: 0.05,
    },
    displayMultiplier: 8.0, // VLRJX20 尖峰倍數最高
  },

  off_peak: {
    volume: {
      min: 0,
      max: 34,
      avg: 3.7,
      p95: 16,
    },
    occupancy: {
      min: 0,
      max: 100,
      avg: 14.59,
      p95: 74,
    },
    speed: {
      min: 0,
      max: 90,
      avg: 14.37,
      p95: 45,
    },
    vehicleDistribution: {
      motor: 0.38,
      small: 0.57,
      large: 0.05,
    },
    displayMultiplier: 3.5,
  },

  late_night: {
    volume: {
      min: 0,
      max: 17,
      avg: 0.97,
      p95: 16,
    },
    occupancy: {
      min: 0,
      max: 100,
      avg: 2.02,
      p95: 2,
    },
    speed: {
      min: 0,
      max: 120,
      avg: 11.72,
      p95: 56,
    },
    vehicleDistribution: {
      motor: 0.42,
      small: 0.53,
      large: 0.05,
    },
    displayMultiplier: 1.8,
  },
}

/**
 * 獲取路口的正規化配置
 * @param {string} intersectionId - 路口 ID (VLRJM60, VLRJX00, VLRJX20)
 * @returns {object} 路口的正規化配置對象
 */
export function getNormalizationConfig(intersectionId) {
  switch (intersectionId) {
    case 'VLRJM60':
      return VLRJM60_NORMALIZATION
    case 'VLRJX00':
      return VLRJX00_NORMALIZATION
    case 'VLRJX20':
      return VLRJX20_NORMALIZATION
    default:
      console.warn(`未知的路口 ID: ${intersectionId}，使用 VLRJM60 配置`)
      return VLRJM60_NORMALIZATION
  }
}

/**
 * 獲取當前時間的正規化參數
 * @param {string} intersectionId - 路口 ID
 * @returns {object} 當前時段的正規化參數
 */
export function getCurrentNormalizationParams(intersectionId) {
  const config = getNormalizationConfig(intersectionId)
  const period = getCurrentTimePeriod()
  return config[period]
}

/**
 * 獲取指定時間的正規化參數
 * @param {string} intersectionId - 路口 ID
 * @param {number} hour - 小時 (0-23)
 * @returns {object} 指定時段的正規化參數
 */
export function getNormalizationParamsByHour(intersectionId, hour) {
  const config = getNormalizationConfig(intersectionId)
  const period = getTimePeriodByHour(hour)
  return config[period]
}

/**
 * 時段信息
 */
export function getTimePeriodInfo(period) {
  return TIME_PERIODS[period]
}

export default {
  TIME_PERIODS,
  getCurrentTimePeriod,
  getTimePeriodByHour,
  VLRJM60_NORMALIZATION,
  VLRJX00_NORMALIZATION,
  VLRJX20_NORMALIZATION,
  getNormalizationConfig,
  getCurrentNormalizationParams,
  getNormalizationParamsByHour,
  getTimePeriodInfo,
}
