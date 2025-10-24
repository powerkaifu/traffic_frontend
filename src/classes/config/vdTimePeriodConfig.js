/**
 * VD 時段配置
 * 基於 50 週實測數據分析 (2024-02-26 至 2025-05-25, 728,473 筆紀錄)
 *
 * 用於前端自動模式生成符合真實車流的模擬數據
 */

export const VD_TIME_PERIOD_CONFIG = {
  // =========================================
  // VLRJM60 - 東西向主幹道 (3 車道)
  // =========================================
  VLRJM60: {
    name: 'VLRJM60',
    direction: 'east-west',
    description: '東西向主幹道',
    lanes: 3,
    dataPoints: 171034, // 50週實測數據筆數

    timePeriods: {
      // 凌晨 (00:00-06:59) - 最輕時段
      early_morning: {
        hours: [0, 1, 2, 3, 4, 5, 6],
        avgOccupancy: 4.7,
        avgOccupancyRange: [3.2, 6.5], // P25-P75
        avgVehiclesPerRecord: 2.9,
        avgVehiclesPerLane: 1.0, // 2.9 ÷ 3 車道
        avgSpeed: 44,
        speedRange: [40, 49],
        vehicleDistribution: {
          M: 0.25, // 機車
          S: 0.75, // 小客車
          L: 0.0, // 大客車
          T: 0.0, // 聯結車
        },
        expectedGreenLightSeconds: '32-42',
        peakMultiplier: 0.28, // 相對流量倍數
      },

      // 早峰 (07:00-09:59) - 上班時段
      morning_peak: {
        hours: [7, 8, 9],
        avgOccupancy: 12.9,
        avgOccupancyRange: [8.5, 17.8],
        avgVehiclesPerRecord: 8.0,
        avgVehiclesPerLane: 2.7, // 8.0 ÷ 3 車道
        avgSpeed: 36,
        speedRange: [27, 41],
        vehicleDistribution: {
          M: 0.3,
          S: 0.7,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '48-58',
        peakMultiplier: 0.9,
      },

      // 中午離峰 (10:00-16:59) - 基準時段
      midday_off_peak: {
        hours: [10, 11, 12, 13, 14, 15, 16],
        avgOccupancy: 18.7,
        avgOccupancyRange: [12.2, 26.5],
        avgVehiclesPerRecord: 8.7,
        avgVehiclesPerLane: 2.9, // 8.7 ÷ 3 車道
        avgSpeed: 31,
        speedRange: [25, 38],
        vehicleDistribution: {
          M: 0.3,
          S: 0.7,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '45-55',
        peakMultiplier: 1.0, // 基準
      },

      // 晚峰 (17:00-19:59) - 最擁擠時段 ⭐
      evening_peak: {
        hours: [17, 18, 19],
        avgOccupancy: 23.2,
        avgOccupancyRange: [16.8, 31.5],
        avgVehiclesPerRecord: 10.1,
        avgVehiclesPerLane: 3.4, // 10.1 ÷ 3 車道
        avgSpeed: 29,
        speedRange: [24, 36],
        vehicleDistribution: {
          M: 0.35,
          S: 0.65,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '60-70',
        peakMultiplier: 1.1,
      },

      // 晚間離峰 (20:00-23:59) - 下班後
      night_off_peak: {
        hours: [20, 21, 22, 23],
        avgOccupancy: 11.8,
        avgOccupancyRange: [8.0, 16.2],
        avgVehiclesPerRecord: 7.2,
        avgVehiclesPerLane: 2.4, // 7.2 ÷ 3 車道
        avgSpeed: 38,
        speedRange: [31, 42],
        vehicleDistribution: {
          M: 0.28,
          S: 0.72,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '40-50',
        peakMultiplier: 0.66,
      },
    },
  },

  // =========================================
  // VLRJX00 - 南北向主幹道 (4 車道)
  // =========================================
  VLRJX00: {
    name: 'VLRJX00',
    direction: 'north-south',
    description: '南北向主幹道',
    lanes: 4,
    dataPoints: 339237, // 50週實測數據筆數

    timePeriods: {
      // 凌晨 (00:00-06:59)
      early_morning: {
        hours: [0, 1, 2, 3, 4, 5, 6],
        avgOccupancy: 7.6,
        avgOccupancyRange: [3.0, 12.5],
        avgVehiclesPerRecord: 2.4,
        avgVehiclesPerLane: 0.6, // 2.4 ÷ 4 車道
        avgSpeed: 49,
        speedRange: [40, 49],
        vehicleDistribution: {
          M: 0.18,
          S: 0.82,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '32-42',
        peakMultiplier: 0.28,
      },

      // 早峰 (07:00-09:59)
      morning_peak: {
        hours: [7, 8, 9],
        avgOccupancy: 15.9,
        avgOccupancyRange: [11.0, 22.0],
        avgVehiclesPerRecord: 8.9,
        avgVehiclesPerLane: 2.2, // 8.9 ÷ 4 車道
        avgSpeed: 41,
        speedRange: [32, 42],
        vehicleDistribution: {
          M: 0.28,
          S: 0.72,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '48-58',
        peakMultiplier: 0.9,
      },

      // 中午離峰 (10:00-16:59)
      midday_off_peak: {
        hours: [10, 11, 12, 13, 14, 15, 16],
        avgOccupancy: 18.1,
        avgOccupancyRange: [14.0, 23.8],
        avgVehiclesPerRecord: 8.8,
        avgVehiclesPerLane: 2.2, // 8.8 ÷ 4 車道
        avgSpeed: 38,
        speedRange: [25, 38],
        vehicleDistribution: {
          M: 0.26,
          S: 0.74,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '45-55',
        peakMultiplier: 1.0,
      },

      // 晚峰 (17:00-19:59)
      evening_peak: {
        hours: [17, 18, 19],
        avgOccupancy: 21.4,
        avgOccupancyRange: [16.0, 28.5],
        avgVehiclesPerRecord: 9.6,
        avgVehiclesPerLane: 2.4, // 9.6 ÷ 4 車道
        avgSpeed: 36,
        speedRange: [24, 36],
        vehicleDistribution: {
          M: 0.32,
          S: 0.68,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '55-65',
        peakMultiplier: 1.1,
      },

      // 晚間離峰 (20:00-23:59)
      night_off_peak: {
        hours: [20, 21, 22, 23],
        avgOccupancy: 12.5,
        avgOccupancyRange: [7.0, 18.5],
        avgVehiclesPerRecord: 5.6,
        avgVehiclesPerLane: 1.4, // 5.6 ÷ 4 車道
        avgSpeed: 42,
        speedRange: [31, 42],
        vehicleDistribution: {
          M: 0.22,
          S: 0.78,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '40-50',
        peakMultiplier: 0.66,
      },
    },
  },

  // =========================================
  // VLRJX20 - 路口轉彎車道 (5 車道)
  // =========================================
  VLRJX20: {
    name: 'VLRJX20',
    direction: 'intersection-turn',
    description: '路口轉彎車道（左轉/右轉）',
    lanes: 5,
    dataPoints: 218202, // 50週實測數據筆數

    timePeriods: {
      // 凌晨 (00:00-06:59)
      early_morning: {
        hours: [0, 1, 2, 3, 4, 5, 6],
        avgOccupancy: 6.9,
        avgOccupancyRange: [4.0, 10.5],
        avgVehiclesPerRecord: 2.7,
        avgVehiclesPerLane: 0.54, // 2.7 ÷ 5 車道
        avgSpeed: 40,
        speedRange: [31, 40],
        vehicleDistribution: {
          M: 0.26,
          S: 0.74,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '32-42',
        peakMultiplier: 0.28,
      },

      // 早峰 (07:00-09:59) - 轉彎車道超高流量 ⭐
      morning_peak: {
        hours: [7, 8, 9],
        avgOccupancy: 32.2, // 轉彎車道占有率最高
        avgOccupancyRange: [24.0, 42.5],
        avgVehiclesPerRecord: 9.9,
        avgVehiclesPerLane: 2.0, // 9.9 ÷ 5 車道
        avgSpeed: 27,
        speedRange: [22, 32],
        vehicleDistribution: {
          M: 0.38,
          S: 0.62,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '60-70',
        peakMultiplier: 0.9,
      },

      // 中午離峰 (10:00-16:59)
      midday_off_peak: {
        hours: [10, 11, 12, 13, 14, 15, 16],
        avgOccupancy: 30.8,
        avgOccupancyRange: [21.0, 40.5],
        avgVehiclesPerRecord: 7.1,
        avgVehiclesPerLane: 1.4, // 7.1 ÷ 5 車道
        avgSpeed: 25,
        speedRange: [20, 30],
        vehicleDistribution: {
          M: 0.35,
          S: 0.65,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '50-60',
        peakMultiplier: 1.0,
      },

      // 晚峰 (17:00-19:59)
      evening_peak: {
        hours: [17, 18, 19],
        avgOccupancy: 29.4,
        avgOccupancyRange: [21.0, 38.5],
        avgVehiclesPerRecord: 7.6,
        avgVehiclesPerLane: 1.5, // 7.6 ÷ 5 車道
        avgSpeed: 24,
        speedRange: [19, 29],
        vehicleDistribution: {
          M: 0.42,
          S: 0.58,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '60-70',
        peakMultiplier: 1.1,
      },

      // 晚間離峰 (20:00-23:59)
      night_off_peak: {
        hours: [20, 21, 22, 23],
        avgOccupancy: 20.0,
        avgOccupancyRange: [11.0, 28.5],
        avgVehiclesPerRecord: 5.2,
        avgVehiclesPerLane: 1.0, // 5.2 ÷ 5 車道
        avgSpeed: 31,
        speedRange: [25, 36],
        vehicleDistribution: {
          M: 0.3,
          S: 0.7,
          L: 0.0,
          T: 0.0,
        },
        expectedGreenLightSeconds: '40-50',
        peakMultiplier: 0.66,
      },
    },
  },
}

/**
 * 根據小時判斷時段
 * @param {number} hour - 小時 (0-23)
 * @returns {string} - 時段名稱
 */
export function getTimePeriodByHour(hour) {
  if (hour >= 0 && hour < 7) return 'early_morning'
  if (hour >= 7 && hour < 10) return 'morning_peak'
  if (hour >= 10 && hour < 17) return 'midday_off_peak'
  if (hour >= 17 && hour < 20) return 'evening_peak'
  return 'night_off_peak'
}

/**
 * 獲取指定 VD 和時段的配置
 * @param {string} vdId - VD 站點 ID
 * @param {number} hour - 小時 (0-23)
 * @returns {object} - 時段配置
 */
export function getVDTimePeriodConfig(vdId, hour) {
  const timePeriod = getTimePeriodByHour(hour)
  const vdConfig = VD_TIME_PERIOD_CONFIG[vdId]

  if (!vdConfig) {
    console.error(`❌ 未知的 VD ID: ${vdId}`)
    return null
  }

  return vdConfig.timePeriods[timePeriod]
}

/**
 * 在時段參數範圍內隨機生成數據
 * @param {object} periodConfig - 時段配置
 * @returns {object} - 生成的 VD 數據
 */
export function generateVDDataInRange(periodConfig) {
  if (!periodConfig) return null

  // 在占有率範圍內隨機生成
  const occupancy = randomInRange(periodConfig.avgOccupancyRange[0], periodConfig.avgOccupancyRange[1])

  // 生成各車型數量 (基於分布比例和平均車輛數)
  const totalVehicles = Math.round(
    randomInRange(periodConfig.avgVehiclesPerRecord * 0.7, periodConfig.avgVehiclesPerRecord * 1.3),
  )

  const distribution = periodConfig.vehicleDistribution
  const volumeM = Math.round(totalVehicles * distribution.M)
  const volumeS = Math.round(totalVehicles * distribution.S)
  const volumeL = Math.round(totalVehicles * distribution.L)
  const volumeT = Math.round(totalVehicles * distribution.T)

  // 生成各車型速度
  const speedRange = periodConfig.speedRange
  const baseSpeed = randomInRange(speedRange[0], speedRange[1])
  const speedM = baseSpeed - randomInRange(0, 3)
  const speedS = baseSpeed
  const speedL = baseSpeed - randomInRange(2, 5)
  const speedT = baseSpeed - randomInRange(3, 6)

  return {
    occupancy: Math.round(occupancy * 10) / 10, // 一位小數
    volumeM: Math.max(0, volumeM),
    volumeS: Math.max(0, volumeS),
    volumeL: Math.max(0, volumeL),
    volumeT: Math.max(0, volumeT),
    speedM: Math.max(0, speedM),
    speedS: Math.max(0, speedS),
    speedL: Math.max(0, speedL),
    speedT: Math.max(0, speedT),
    expectedGreenSeconds: periodConfig.expectedGreenLightSeconds,
    isPeakHour: ['morning_peak', 'evening_peak'].includes(getTimePeriodByHour(Math.floor(Math.random() * 24))) ? 1 : 0,
  }
}

/**
 * 輔助函數：生成指定範圍內的隨機數
 */
function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}

export default VD_TIME_PERIOD_CONFIG
