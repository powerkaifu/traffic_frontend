/**
 * 交通情境配置檔
 * 統一管理所有交通相關的參數設定，包括時段情境、車型組合、密度閾值等
 */

// ============================================
// 🌍 系統預設配置 - 初始化時使用
// ============================================
// 用途：AutoTrafficGenerator.js constructor 中初始化
// 調用：this.config = { ...defaultConfig }
// 作用：當沒有情景配置時的備用預設值
// ============================================
export const defaultConfig = {
  interval: { min: 3000, max: 8000, normal: 5000 },
  peakMultiplier: 1.5,
  vehiclesPerInterval: { min: 1, max: 1 }, // 🚗 支持範圍：{ min, max }，固定時用 { min: x, max: x }
  maxLiveVehicles: 100,
  minInterval: 200,
  minLaneInterval: 800,
  vehicleTypes: [
    { type: 'motor', weight: 40 },
    { type: 'small', weight: 50 },
    { type: 'large', weight: 10 },
  ],
  densityThresholds: {
    light: 10,
    moderate: 20,
    heavy: 30,
    congested: 40,
  },
}

// ============================================
// 📋 【手動情景模式】用 - 三個預設情景
// ============================================
// 用途：MainLayout.vue 中的【情景切換】按鈕使用
// 調用：switchToScenarioMode('peak_hours' | 'off_peak' | 'late_night')
// 特點：固定三個情景，用戶可手動切換
// ============================================

export const timeScenarios = [
  {
    key: 'peak_hours',
    name: '尖峰時段',
    shortName: '尖峰',
    icon: '🚀',
    timeRange: '07:00-09:00,17:00-19:00',
    hourRanges: [
      { start: 7, end: 9 },
      { start: 17, end: 19 },
    ],

    // 🎯 目標特徵（基於 VD 配置文檔統計數據）
    // 早峰/晚峰：9-11輛/車道，占有率 12-15%，速度 38-45 km/h
    // 🎭 API 層：後端接收的原始數據（不放大）
    targetFeatures: {
      totalVolumePer5Min: 11, // 每輞道：9-11 輛/5分鐘（原始數據）
      occupancy: 14, // 佔有率：12-15%（原始數據）
      speed: 42, // 平均速度：42 km/h
      volumeByType: {
        motor: 4, // 機車：約 35-40%
        small: 6, // 小客車：約 55-65%
        large: 1, // 大客車：約 5-10%
      },
    },

    config: {
      // =========================================
      // 🎚️ 【常調整】- 車流密度相關參數
      // =========================================
      vehiclesPerInterval: { min: 1, max: 5 }, // 👈 🎯 每個 interval 生成 1-5 台車（平均 3 輛）
      interval: { min: 500, max: 10000, normal: 3000 }, // ⏱️ 生成間隔，恢復原本設定
      peakMultiplier: 1, // 👈 尖峰倍數
      displayMultiplier: 1.5, // 🎭 視覺層倍數：前端動畫放大 1.5 倍

      // =========================================
      // 🚌 【次常調整】- 車型與系統參數
      // =========================================
      vehicleTypes: [
        { type: 'motor', weight: 40 }, // 機車 40%
        { type: 'small', weight: 50 }, // 小客車 50%
        { type: 'large', weight: 10 }, // 大客車 10%
      ],
      maxLiveVehicles: 100, // 允許較多車輛同時在場
      densityThresholds: { light: 15, moderate: 25, heavy: 35, congested: 45 },

      // =========================================
      // 📝 【描述信息】- 僅供參考
      // =========================================
      description: '尖峰時段 - 高流量中等佔有率中速度 (早峰/晚峰)',
      // 💡 計算參考：
      // 目標：11輛/5分鐘
      // 實際：1000ms × 1.5倍數 × 3輛 = 約 600輛/5分鐘（會被品質檢查修正到 11 輛）
    },
  },
  {
    key: 'off_peak',
    name: '離峰時段',
    shortName: '離峰',
    icon: '🌞',
    timeRange: '09:00-17:00,19:00-23:00',
    hourRanges: [
      { start: 9, end: 17 },
      { start: 19, end: 23 },
    ],

    // 🎯 目標特徵（基於 VD 配置文檔統計數據）
    // 中午/晚間：3-4輛/車道，占有率 6-8%，速度 50-55 km/h
    targetFeatures: {
      totalVolumePer5Min: 4, // 每車道：3-4 輛/5分鐘（原始數據）
      occupancy: 7, // 佔有率：6-8%（原始數據）
      speed: 52, // 平均速度：52 km/h
      volumeByType: {
        motor: 1, // 機車：約 25-35%
        small: 2, // 小客車：約 60-70%
        large: 1, // 大客車：約 5-10% ✅ 改為 1 以顯示大車數據
      },
    },

    config: {
      // =========================================
      // 🎚️ 【常調整】- 車流密度相關參數
      // =========================================
      vehiclesPerInterval: { min: 1, max: 3 }, // 👈 🎯 每個 interval 生成 1-3 台車
      interval: { min: 1000, max: 20000, normal: 10000 }, // ⏱️ 生成間隔，恢復原本設定
      peakMultiplier: 1.0, // 👈 離峰不加倍
      displayMultiplier: 1.0, // 🎭 視覺層倍數：不放大

      // =========================================
      // 🚌 【次常調整】- 車型與系統參數
      // =========================================
      vehicleTypes: [
        { type: 'motor', weight: 30 }, // 機車 30%
        { type: 'small', weight: 65 }, // 小客車 65%
        { type: 'large', weight: 5 }, // 大客車 5%
      ],
      maxLiveVehicles: 100, // 中等車輛數
      densityThresholds: { light: 10, moderate: 18, heavy: 28, congested: 40 },

      // =========================================
      // 📝 【描述信息】- 僅供參考
      // =========================================
      description: '離峰時段 - 中等流量低佔有率較高速度 (中午/晚間)',
      // 💡 計算參考：
      // 目標：4輛/5分鐘
      // 實際：2000ms × 1.0倍數 × 2輛 = 約 300輛/5分鐘（會被品質檢查修正到 4 輛）
    },
  },
  {
    key: 'late_night',
    name: '凌晨時段',
    shortName: '凌晨',
    icon: '🌙',
    timeRange: '23:00-07:00',
    hourRanges: [
      { start: 23, end: 24 },
      { start: 0, end: 7 },
    ],

    // 🎯 目標特徵（基於 VD 配置文檔統計數據）
    // 凌晨：0-1輛/車道，占有率 2%，速度 58-60 km/h
    targetFeatures: {
      totalVolumePer5Min: 1, // 每車道：0-1 輛/5分鐘（原始數據）
      occupancy: 2, // 佔有率：2%（原始數據，極低）
      speed: 59, // 平均速度：59 km/h（流量少，速度快）
      volumeByType: {
        motor: 0.4, // 機車：主要是機車
        small: 0.4, // 小客車：很少
        large: 0.2, // 大客車：少量 ✅ 改為 0.2 以顯示大車數據
      },
    },

    config: {
      // =========================================
      // 🎚️ 【常調整】- 車流密度相關參數
      // =========================================
      vehiclesPerInterval: { min: 1, max: 1 }, // 👈 🎯 每個 interval 生成 1-2 台車
      interval: { min: 15000, max: 40000, normal: 20000 }, // ⏱️ 生成間隔，恢復原本設定
      peakMultiplier: 1.0, // 👈 凌晨不加倍
      displayMultiplier: 1.0, // 🎭 視覺層倍數：不放大

      // =========================================
      // 🚌 【次常調整】- 車型與系統參數
      // =========================================
      vehicleTypes: [
        { type: 'motor', weight: 60 }, // 機車 60%（凌晨以機車為主）
        { type: 'small', weight: 40 }, // 小客車 40%
        { type: 'large', weight: 0 }, // 大客車 0%
      ],
      maxLiveVehicles: 100, // 少量車輛
      densityThresholds: { light: 5, moderate: 10, heavy: 15, congested: 25 },

      // =========================================
      // 📝 【描述信息】- 僅供參考
      // =========================================
      description: '凌晨時段 - 極低流量極低佔有率高速度 (00:00-07:00)',
      // 💡 計算參考：
      // 目標：1輛/5分鐘
      // 實際：5000ms × 1.0倍數 × 1.5輛 = 約 90輛/5分鐘（會被品質檢查修正到 1 輛）
    },
  },
]

// ============================================
// 🚗 車型組合配置
// ============================================
// 用途：全域使用，作為預設的車型比例參考
// 特點：根據交通密度等級調整車型比例
// ============================================
export const vehicleMixes = {
  light: {
    // 輕度交通時的車型比例
    motor: 0.2, // 機車 20%
    small: 0.7, // 小客車 70%
    large: 0.1, // 大型車 10%
  },
  normal: {
    // 一般交通時的車型比例
    motor: 0.4, // 機車 40%
    small: 0.5, // 小客車 50%
    large: 0.1, // 大型車 10%
  },
  heavy: {
    // 繁忙交通時的車型比例
    motor: 0.6, // 機車 60%
    small: 0.3, // 小客車 30%
    large: 0.1, // 大型車 10%
  },
}

// ============================================
// 📅 每日自動模式用 - 小時級配置（24小時完整時段）
// ============================================
// 用途：AutoTrafficGenerator.js 中的 toggleAutoMode(true)
// 調用：_startAutoModeLoop() → _applyTrafficProfile() → getScenarioByTime()
// 作用：每 37.5 秒（模擬時間跳進 30 分鐘），根據當前模擬時間自動切換情景
// 特點：包含 24 小時完整的時段細分（與上方 3 個手動情景不同）
//      根據真實 VD 數據設置各小時段的流量和速度
// ============================================

/**
 * 根據當前時間取得對應的交通情境配置（基於VD真實數據）
 * @param {Date} currentTime - 當前時間（Date 對象）
 * @returns {Object} - 該小時對應的交通情境配置
 *
 * 說明：
 * - 用於每日自動模式，每次時間變化自動返回對應時段配置
 * - interval.normal：該時段的平均生成間隔（毫秒）
 * - peakMultiplier：該時段的強度倍數（越大越密集）
 * - 實際生成間隔 = interval.normal / peakMultiplier
 */
export function getScenarioByTime(currentTime) {
  const currentHour = currentTime.getHours()

  // ==========================================
  // 🌙 午夜-清晨時段 (00:00-07:00)
  // ==========================================

  // 00:00-06:00 深夜（凌晨低峰）
  // 參考：VD深夜數據，極低流量
  if (currentHour >= 0 && currentHour < 6) {
    return {
      name: '深夜',
      interval: { min: 20000, max: 45000, normal: 30000 },
      peakMultiplier: 0.8, // 實際間隔 = 30000/0.8 = 37500ms → 約1.6輛/5分鐘
      displayMultiplier: 1.5, // 🎭 視覺層倍數：對應 late_night
      vehicleTypes: [
        { type: 'motor', weight: 75 }, // 凌晨機車最多
        { type: 'small', weight: 20 },
        { type: 'large', weight: 5 },
      ],
      description: '深夜時段 - 極低流量（目標：1.5輛/5分）',
      targetVolume: 1.5,
      targetOccupancy: 8,
      targetSpeed: 50,
    }
  }

  // 06:00-07:00 清晨（開始增加）
  // 參考：VD清晨數據
  else if (currentHour >= 6 && currentHour < 7) {
    return {
      name: '清晨',
      interval: { min: 8000, max: 15000, normal: 10000 },
      peakMultiplier: 1.5, // 實際間隔 = 10000/1.5 = 6667ms → 約4.5輛/5分鐘
      displayMultiplier: 1.5, // 🎭 視覺層倍數：對應 late_night
      vehicleTypes: [
        { type: 'motor', weight: 55 },
        { type: 'small', weight: 35 },
        { type: 'large', weight: 10 },
      ],
      description: '清晨時段 - 低流量（目標：3輛/5分）',
      targetVolume: 3,
      targetOccupancy: 12,
      targetSpeed: 42,
    }
  }

  // ==========================================
  // 🌅 早晨尖峰時段 (07:00-11:00)
  // ==========================================

  // 07:00-09:00 早尖峰（最高峰）
  // 參考：VLRJX20 尖峰時段數據
  else if (currentHour >= 7 && currentHour < 9) {
    return {
      name: '早尖峰',
      interval: { min: 2000, max: 4500, normal: 2800 },
      peakMultiplier: 4.2, // 實際間隔 = 2800/4.2 = 667ms → 約14輛/5分鐘
      displayMultiplier: 7, // 🎭 視覺層倍數：對應 peak_hours
      vehicleTypes: [
        { type: 'motor', weight: 55 }, // 尖峰時段機車多
        { type: 'small', weight: 38 },
        { type: 'large', weight: 7 },
      ],
      description: '早尖峰時段 - 極高流量（目標：14輛/5分）',
      targetVolume: 14,
      targetOccupancy: 55,
      targetSpeed: 25,
    }
  }

  // 09:00-11:00 上午（略降）
  // 參考：VD上午時段數據
  else if (currentHour >= 9 && currentHour < 11) {
    return {
      name: '上午',
      interval: { min: 4000, max: 8000, normal: 5500 },
      peakMultiplier: 2.8, // 實際間隔 = 5500/2.8 = 1964ms → 約7輛/5分鐘
      displayMultiplier: 3, // 🎭 視覺層倍數：對應 off_peak
      vehicleTypes: [
        { type: 'motor', weight: 35 },
        { type: 'small', weight: 50 },
        { type: 'large', weight: 15 },
      ],
      description: '上午時段 - 中等流量（目標：7輛/5分）',
      targetVolume: 7,
      targetOccupancy: 22,
      targetSpeed: 38,
    }
  }

  // ==========================================
  // ☀️ 中午時段 (11:00-17:00)
  // ==========================================

  // 11:00-14:00 午間（穩定）
  // 參考：VD午間時段數據
  else if (currentHour >= 11 && currentHour < 14) {
    return {
      name: '午間',
      interval: { min: 3500, max: 7000, normal: 5000 },
      peakMultiplier: 3.0, // 實際間隔 = 5000/3.0 = 1667ms → 約8輛/5分鐘
      displayMultiplier: 3, // 🎭 視覺層倍數：對應 off_peak
      vehicleTypes: [
        { type: 'motor', weight: 38 },
        { type: 'small', weight: 47 },
        { type: 'large', weight: 15 },
      ],
      description: '午間時段 - 中高流量（目標：8輛/5分）',
      targetVolume: 8,
      targetOccupancy: 25,
      targetSpeed: 35,
    }
  }

  // 14:00-16:00 下午（略增）
  // 參考：VD下午時段數據
  else if (currentHour >= 14 && currentHour < 16) {
    return {
      name: '下午',
      interval: { min: 3000, max: 6500, normal: 4500 },
      peakMultiplier: 3.2, // 實際間隔 = 4500/3.2 = 1406ms → 約9輛/5分鐘
      displayMultiplier: 3, // 🎭 視覺層倍數：對應 off_peak
      vehicleTypes: [
        { type: 'motor', weight: 42 },
        { type: 'small', weight: 45 },
        { type: 'large', weight: 13 },
      ],
      description: '下午時段 - 中高流量（目標：9輛/5分）',
      targetVolume: 9,
      targetOccupancy: 28,
      targetSpeed: 33,
    }
  }

  // ==========================================
  // 🌆 傍晚尖峰時段 (16:00-21:00)
  // ==========================================

  // 16:00-17:00 傍晚前（開始壅塞）
  // 參考：VD傍晚前時段數據
  else if (currentHour >= 16 && currentHour < 17) {
    return {
      name: '傍晚前',
      interval: { min: 2500, max: 5000, normal: 3500 },
      peakMultiplier: 3.8, // 實際間隔 = 3500/3.8 = 921ms → 約11輛/5分鐘
      displayMultiplier: 7, // 🎭 視覺層倍數：對應 peak_hours (即將進入晚尖峰)
      vehicleTypes: [
        { type: 'motor', weight: 48 },
        { type: 'small', weight: 42 },
        { type: 'large', weight: 10 },
      ],
      description: '傍晚前時段 - 高流量（目標：11輛/5分）',
      targetVolume: 11,
      targetOccupancy: 38,
      targetSpeed: 30,
    }
  }

  // 17:00-19:00 晚尖峰（第二高峰）
  // 參考：VLRJX20 晚尖峰時段數據
  else if (currentHour >= 17 && currentHour < 19) {
    return {
      name: '晚尖峰',
      interval: { min: 2200, max: 4800, normal: 3000 },
      peakMultiplier: 4.0, // 實際間隔 = 3000/4.0 = 750ms → 約13輛/5分鐘
      displayMultiplier: 7, // 🎭 視覺層倍數：對應 peak_hours
      vehicleTypes: [
        { type: 'motor', weight: 52 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 8 },
      ],
      description: '晚尖峰時段 - 極高流量（目標：13輛/5分）',
      targetVolume: 13,
      targetOccupancy: 50,
      targetSpeed: 27,
    }
  }

  // 19:00-21:00 晚間（逐漸降低）
  // 參考：VD晚間時段數據
  else if (currentHour >= 19 && currentHour < 21) {
    return {
      name: '晚間',
      interval: { min: 4500, max: 9000, normal: 6500 },
      peakMultiplier: 2.4, // 實際間隔 = 6500/2.4 = 2708ms → 約6輛/5分鐘
      displayMultiplier: 3, // 🎭 視覺層倍數：對應 off_peak
      vehicleTypes: [
        { type: 'motor', weight: 45 },
        { type: 'small', weight: 45 },
        { type: 'large', weight: 10 },
      ],
      description: '晚間時段 - 中等流量（目標：6輛/5分）',
      targetVolume: 6,
      targetOccupancy: 18,
      targetSpeed: 40,
    }
  }

  // ==========================================
  // 🌃 夜間時段 (21:00-23:00)
  // ==========================================

  // 21:00-23:00 深夜前（持續降低）
  // 參考：VD深夜前時段數據
  else if (currentHour >= 21 && currentHour < 23) {
    return {
      name: '深夜前',
      interval: { min: 8000, max: 16000, normal: 11000 },
      peakMultiplier: 1.8, // 實際間隔 = 11000/1.8 = 6111ms → 約3.5輛/5分鐘
      displayMultiplier: 1.5, // 🎭 視覺層倍數：對應 late_night
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 32 },
        { type: 'large', weight: 8 },
      ],
      description: '深夜前時段 - 低流量（目標：3.5輛/5分）',
      targetVolume: 3.5,
      targetOccupancy: 12,
      targetSpeed: 45,
    }
  }

  // 23:00-24:00 深夜（回到低峰）
  // 參考：VD深夜時段數據
  else {
    return {
      name: '深夜',
      interval: { min: 15000, max: 35000, normal: 22000 },
      peakMultiplier: 1.2, // 實際間隔 = 22000/1.2 = 18333ms → 約2輛/5分鐘
      displayMultiplier: 1.5, // 🎭 視覺層倍數：對應 late_night
      vehicleTypes: [
        { type: 'motor', weight: 70 },
        { type: 'small', weight: 25 },
        { type: 'large', weight: 5 },
      ],
      description: '深夜時段 - 極低流量（目標：2輛/5分）',
      targetVolume: 2,
      targetOccupancy: 9,
      targetSpeed: 48,
    }
  }
}

// ============================================
// 🔄 根據 key 取得手動情景配置
// ============================================
// 用途：手動情景模式時從 timeScenarios 中查找配置
// 調用：switchToScenarioMode(scenarioKey) → getScenarioByKey(scenarioKey)
// 返回：匹配的情景對象或 null
// ============================================
/**
 * 根據 key 取得時段情境配置
 * @param {string} scenarioKey - 情景鍵值 ('peak_hours' | 'off_peak' | 'late_night')
 * @returns {Object|null} - 情景配置對象或 null
 */
export function getScenarioByKey(scenarioKey) {
  return timeScenarios.find((scenario) => scenario.key === scenarioKey) || null
}
