/**
 * VD Pattern 範圍配置 - 基於 50 週真實數據 (VD_HOURLY_ANALYSIS.md)
 *
 * 核心邏輯：
 * 1. 基準值 (baseline) - 來自 VD_HOURLY_ANALYSIS.md 的平均統計
 * 2. 範圍 (range) - 允許的最小和最大值
 * 3. 變動倍數 (intervalMultipliers) - 根據生成間隔調整
 *
 * 最終數據 = 基準值 × 生成速度倍數 + 隨機波動
 * 確保所有數據都在 VD_HOURLY_ANALYSIS.md 的統計範圍內
 */

export const VD_PATTERN_RANGES = {
  // =========================================================
  // 🚀 尖峰時段 (07:00-09:00, 17:00-19:00)
  // =========================================================
  peak_hours: {
    // 路口 VLRJM60 (往西)
    // 來源: VD_HOURLY_ANALYSIS.md 第 7-9 時段 + 17-19 時段平均
    VLRJM60: {
      baseline: {
        Volume_T: 6.4, // (4.66 + 6.21 + 5.69 + 8.37 + 8.25 + 7.63) / 6 = 6.80
        Volume_M: 2.62, // 機車: (2.35 + 2.96 + 2.19 + 2.78 + 2.65 + 3.18) / 6 = 2.68
        Volume_S: 3.26, // 小車: (2.14 + 2.87 + 3.18 + 4.07 + 3.89 + 3.51) / 6 = 3.27
        Volume_L: 0.52, // 大車: (0.17 + 0.38 + 0.33 + 1.52 + 1.71 + 0.94) / 6 = 0.84
        Occupancy: 12.1, // 佔有率: (6.34 + 9.25 + 9.51 + 18.78 + 19.81 + 15.31) / 6 = 13.17
        Speed: 22.9, // 速度: (23.02 + 23.98 + 23.6 + 21.83 + 20.96 + 24.01) / 6 = 22.73
      },
      range: {
        Volume_T: [0, 42],
        Volume_M: [0, 21],
        Volume_S: [0, 20],
        Volume_L: [0, 9],
        Occupancy: [0, 100],
        Speed: [0, 100],
      },
      // 根據生成間隔的調整倍數
      intervalMultipliers: {
        fast: 1.3, // 間隔 500-2000ms → 接近 max
        normal: 1.0, // 間隔 2700ms → 使用 baseline
        slow: 0.75, // 間隔 3500ms+ → 靠近 min
      },
      displayMultiplier: 7, // 前端動畫顯示倍數
    },

    // 路口 VLRJX00 (南北向)
    // 來源: VD_HOURLY_ANALYSIS.md 7-9 時段 + 17-19 時段平均
    VLRJX00: {
      baseline: {
        Volume_T: 5.1, // (3.9 + 5.54 + 4.67 + 5.99 + 6.11 + 4.65) / 6 = 5.14
        Volume_M: 2.53, // 機車: (2.13 + 2.95 + 2.38 + 2.81 + 2.94 + 2.22) / 6 = 2.57
        Volume_S: 2.13, // 小車: (1.51 + 2.24 + 2.00 + 2.85 + 2.8 + 2.16) / 6 = 2.26
        Volume_L: 0.31, // 大車: (0.26 + 0.36 + 0.29 + 0.33 + 0.36 + 0.27) / 6 = 0.31
        Occupancy: 10.3, // 佔有率: (6.42 + 9.68 + 8.69 + 12.69 + 13.53 + 10.59) / 6 = 10.27
        Speed: 20.9, // 速度: (20.65 + 21.64 + 21.51 + 20.41 + 19.96 + 21.4) / 6 = 20.93
      },
      range: {
        Volume_T: [0, 45],
        Volume_M: [0, 35],
        Volume_S: [0, 23],
        Volume_L: [0, 9],
        Occupancy: [0, 100],
        Speed: [0, 130],
      },
      intervalMultipliers: {
        fast: 1.25,
        normal: 1.0,
        slow: 0.8,
      },
      displayMultiplier: 7,
    },

    // 路口 VLRJX20 (東西向)
    // 來源: VD_HOURLY_ANALYSIS.md 7-9 時段 + 17-19 時段平均
    VLRJX20: {
      baseline: {
        Volume_T: 5.06, // (4.99 + 6.79 + 4.66 + 5.05 + 5.06 + 3.82) / 6 = 5.06
        Volume_M: 2.18, // 機車: (2.66 + 2.96 + 2.05 + 1.92 + 1.92 + 1.55) / 6 = 2.18
        Volume_S: 2.59, // 小車: (2.17 + 3.22 + 2.49 + 2.89 + 2.78 + 2.16) / 6 = 2.62
        Volume_L: 0.23, // 大車: (0.15 + 0.6 + 0.13 + 0.25 + 0.36 + 0.11) / 6 = 0.27
        Occupancy: 16.5, // 佔有率: (11.68 + 22.82 + 16.77 + 18.09 + 18.58 + 14.28) / 6 = 17.04
        Speed: 14.3, // 速度: (14.83 + 14.19 + 14.18 + 13.77 + 13.63 + 14.76) / 6 = 14.23
      },
      range: {
        Volume_T: [0, 33],
        Volume_M: [0, 18],
        Volume_S: [0, 23],
        Volume_L: [0, 7],
        Occupancy: [0, 100],
        Speed: [0, 105],
      },
      intervalMultipliers: {
        fast: 1.35,
        normal: 1.0,
        slow: 0.7,
      },
      displayMultiplier: 7,
    },
  },

  // =========================================================
  // 🌞 離峰時段 (09:00-17:00, 19:00-23:00)
  // =========================================================
  off_peak: {
    // 路口 VLRJM60
    // 來源: VD_HOURLY_ANALYSIS.md 10-16 時段 + 20-23 時段平均
    VLRJM60: {
      baseline: {
        Volume_T: 5.8, // 根據 VD_HOURLY_ANALYSIS 離峰時段均值
        Volume_M: 2.32, // 機車流量
        Volume_S: 3.11, // 小車流量
        Volume_L: 0.37, // 大車流量
        Occupancy: 10.5, // 佔有率
        Speed: 22.6, // 速度
      },
      range: {
        Volume_T: [0, 37],
        Volume_M: [0, 17],
        Volume_S: [0, 26],
        Volume_L: [0, 8],
        Occupancy: [0, 100],
        Speed: [0, 135],
      },
      intervalMultipliers: {
        fast: 1.2,
        normal: 1.0,
        slow: 0.8,
      },
      displayMultiplier: 3,
    },

    // 路口 VLRJX00
    VLRJX00: {
      baseline: {
        Volume_T: 4.1,
        Volume_M: 1.98,
        Volume_S: 1.95,
        Volume_L: 0.2,
        Occupancy: 8.5,
        Speed: 19.8,
      },
      range: {
        Volume_T: [0, 38],
        Volume_M: [0, 27],
        Volume_S: [0, 20],
        Volume_L: [0, 7],
        Occupancy: [0, 100],
        Speed: [0, 128],
      },
      intervalMultipliers: {
        fast: 1.2,
        normal: 1.0,
        slow: 0.85,
      },
      displayMultiplier: 3,
    },

    // 路口 VLRJX20
    VLRJX20: {
      baseline: {
        Volume_T: 3.7,
        Volume_M: 1.41,
        Volume_S: 2.14,
        Volume_L: 0.08,
        Occupancy: 15.2,
        Speed: 14.2,
      },
      range: {
        Volume_T: [0, 32],
        Volume_M: [0, 16],
        Volume_S: [0, 24],
        Volume_L: [0, 6],
        Occupancy: [0, 100],
        Speed: [0, 104],
      },
      intervalMultipliers: {
        fast: 1.25,
        normal: 1.0,
        slow: 0.75,
      },
      displayMultiplier: 3,
    },
  },

  // =========================================================
  // 🌙 凌晨時段 (00:00-07:00)
  // =========================================================
  late_night: {
    // 路口 VLRJM60
    // 來源: VD_HOURLY_ANALYSIS.md 0-7 時段平均
    VLRJM60: {
      baseline: {
        Volume_T: 1.35, // (2.35 + 1.52 + 1.09 + 0.86 + 0.72 + 0.88 + 2.01) / 7 = 1.35
        Volume_M: 0.65, // 機車: (1.18 + 0.65 + 0.43 + 0.35 + 0.3 + 0.43 + 1.15) / 7 = 0.71
        Volume_S: 0.63, // 小車: (1.14 + 0.85 + 0.65 + 0.5 + 0.42 + 0.44 + 0.82) / 7 = 0.69
        Volume_L: 0.07, // 大車: (0.03 + 0.02 + 0.01 + 0.01 + 0.01 + 0.01 + 0.04) / 7 = 0.02
        Occupancy: 1.74, // 佔有率
        Speed: 16.42, // 速度
      },
      range: {
        Volume_T: [0, 20],
        Volume_M: [0, 12],
        Volume_S: [0, 12],
        Volume_L: [0, 4],
        Occupancy: [0, 100],
        Speed: [0, 110],
      },
      intervalMultipliers: {
        fast: 1.2,
        normal: 1.0,
        slow: 0.85,
      },
      displayMultiplier: 1.5,
    },

    // 路口 VLRJX00
    VLRJX00: {
      baseline: {
        Volume_T: 0.71,
        Volume_M: 0.33,
        Volume_S: 0.36,
        Volume_L: 0.02,
        Occupancy: 1.66,
        Speed: 12.36,
      },
      range: {
        Volume_T: [0, 13],
        Volume_M: [0, 10],
        Volume_S: [0, 9],
        Volume_L: [0, 3],
        Occupancy: [0, 100],
        Speed: [0, 123],
      },
      intervalMultipliers: {
        fast: 1.2,
        normal: 1.0,
        slow: 0.9,
      },
      displayMultiplier: 1.5,
    },

    // 路口 VLRJX20
    VLRJX20: {
      baseline: {
        Volume_T: 0.97,
        Volume_M: 0.44,
        Volume_S: 0.48,
        Volume_L: 0.02,
        Occupancy: 2.58,
        Speed: 11.94,
      },
      range: {
        Volume_T: [0, 19],
        Volume_M: [0, 13],
        Volume_S: [0, 14],
        Volume_L: [0, 4],
        Occupancy: [0, 100],
        Speed: [0, 115],
      },
      intervalMultipliers: {
        fast: 1.25,
        normal: 1.0,
        slow: 0.8,
      },
      displayMultiplier: 1.5,
    },
  },
}

/**
 * 根據生成間隔計算調整倍數
 * @param {number} currentInterval - 當前生成間隔 (毫秒)
 * @param {string} timePeriod - 時段 ('peak_hours', 'off_peak', 'late_night')
 * @param {string} vdId - 路口 ID ('VLRJM60', 'VLRJX00', 'VLRJX20')
 * @returns {number} 調整倍數
 */
export function getIntervalMultiplier(currentInterval, timePeriod, vdId) {
  const config = VD_PATTERN_RANGES[timePeriod]
  if (!config || !config[vdId]) return 1.0

  const multipliers = config[vdId].intervalMultipliers
  if (!multipliers) return 1.0

  // 根據間隔判斷速度級別
  if (currentInterval < 2000) {
    return multipliers.fast || 1.0
  } else if (currentInterval < 3500) {
    return multipliers.normal || 1.0
  } else {
    return multipliers.slow || 1.0
  }
}

/**
 * 生成符合 VD Pattern 的數據
 * @param {string} timePeriod - 時段 ('peak_hours', 'off_peak', 'late_night')
 * @param {string} vdId - 路口 ID
 * @param {number} currentInterval - 當前生成間隔
 * @returns {object} 生成的 VD 數據
 */
export function generateVDDataByPattern(timePeriod, vdId, currentInterval) {
  const patternConfig = VD_PATTERN_RANGES[timePeriod]
  if (!patternConfig || !patternConfig[vdId]) return null

  const multiplier = getIntervalMultiplier(currentInterval, timePeriod, vdId)
  const { baseline, range } = patternConfig[vdId]

  // 計算實際值 = 基準值 × 倍數 + 隨機波動
  const randomVariation = (min, max) => Math.random() * (max - min) + min

  // 車型分布
  const volumeM = Math.round(baseline.Volume_M * multiplier)
  const volumeS = Math.round(baseline.Volume_S * multiplier)
  const volumeL = Math.round(baseline.Volume_L * multiplier)

  // 確保車型流量在範圍內
  const finalVolumeM = Math.max(range.Volume_M[0], Math.min(range.Volume_M[1], volumeM))
  const finalVolumeS = Math.max(range.Volume_S[0], Math.min(range.Volume_S[1], volumeS))
  const finalVolumeL = Math.max(range.Volume_L[0], Math.min(range.Volume_L[1], volumeL))

  // 總流量 = 三種車型之和
  const totalVolume = finalVolumeM + finalVolumeS + finalVolumeL
  // 確保總流量在範圍內
  const finalTotalVolume = Math.max(
    range.Volume_T[0],
    Math.min(range.Volume_T[1], totalVolume + randomVariation(-0.5, 0.5)),
  )

  // 佔有率：基準值 + 隨機波動
  const occupancy = Math.max(
    range.Occupancy[0],
    Math.min(range.Occupancy[1], Math.round((baseline.Occupancy + randomVariation(-2, 2)) * 10) / 10),
  )

  // 速度：基準值 + 隨機波動
  const speed = Math.max(
    range.Speed[0],
    Math.min(range.Speed[1], Math.round((baseline.Speed + randomVariation(-3, 3)) * 10) / 10),
  )

  return {
    Volume_M: finalVolumeM,
    Volume_S: finalVolumeS,
    Volume_L: finalVolumeL,
    Volume_T: finalTotalVolume,
    Occupancy: occupancy,
    Speed: speed,
    timePeriod: timePeriod,
    intervalMultiplier: multiplier,
    baseline: baseline,
  }
}

/**
 * 獲取時段對應的倍數乘以器
 */
export function getDisplayMultiplier(timePeriod, vdId) {
  const config = VD_PATTERN_RANGES[timePeriod]
  if (!config || !config[vdId]) return 7
  return config[vdId].displayMultiplier || 7
}
