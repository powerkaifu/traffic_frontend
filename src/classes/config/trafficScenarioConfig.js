/**
 * 交通情境配置檔
 * 統一管理所有交通相關的參數設定，包括時段情境、車型組合、密度閾值等
 * 由 AutoTrafficGenerator 和 MainLayout 共同使用
 *
 * ========================================
 * 📊 基於VD真實數據範圍（2024/12-2025/05）
 * ========================================
 *
 * 數據來源：VLRJM60、VLRJX00、VLRJX20 三個VD偵測器
 *
 * 【速度範圍 (km/h)】
 *   - 整體：20-50 (平均 28-40)
 *   - 機車：30-60 (平均 38-49)
 *   - 小客車：20-50 (平均 30-41)
 *   - 大客車：15-45 (平均 19-39)
 *
 * 【佔有率範圍 (%)】
 *   - 順暢：5-15%
 *   - 一般：15-30%
 *   - 壅塞：30-60%
 *   - 嚴重：60-100%
 *
 * 【流量範圍 (輛/5分鐘)】
 *   - 機車：1-10 (平均 3-5)
 *   - 小客車：1-10 (平均 4-5)
 *   - 大客車：0-5 (平均 1.5-2.6)
 *
 * ========================================
 * 🚗 車輛生成速度與數量最相關的屬性：
 * ========================================
 *
 * 【手動模式】- 由 MainLayout.vue 的拉桿控制：
 * 1. manualInterval (生成間隔拉桿) - 直接決定基礎生成間隔
 * 2. manualPeakMultiplier (流量強度拉桿) - 倍率，數值越大車流越密集
 *
 * 【自動模式】- 由時段自動切換：
 * 1. interval.normal - 基礎生成間隔 (毫秒)
 * 2. peakMultiplier - 車流強度倍率，影響實際生成速度
 *
 * 【共同影響】：
 * 3. maxLiveVehicles - 同時場上最大車輛數，達到上限會暫停生成
 * 4. vehicleTypes - 各車型權重，影響生成的車型比例
 *
 * ========================================
 * 🔧 實際生成公式：
 * ========================================
 * 手動模式：finalInterval = manualInterval / manualPeakMultiplier
 * 自動模式：base = interval.normal / peakMultiplier (還會根據密度動態調整)
 * 最終延遲：Math.max(min, Math.min(max, calculated_interval))
 *
 * ⚠️  interval.min 和 interval.max 主要用於：
 *    - UI 顯示參考範圍
 *    - 限制最終計算結果的邊界值
 *    - 不直接參與生成，而是作為約束條件
 *
 * ========================================
 * 🎯 VD數據匹配原則：
 * ========================================
 * 1. 視覺車流量必須與傳送給後端的特徵數據匹配
 * 2. 所有特徵值必須在VD訓練數據範圍內
 * 3. 尖峰=高流量(12輛/5分)+高佔有率(40-60%)+低速(20-35km/h)
 * 4. 離峰=中流量(6輛/5分)+中佔有率(15-30%)+中速(30-45km/h)
 * 5. 凌晨=低流量(2輛/5分)+低佔有率(5-15%)+高速(40-60km/h)
 *
 */

/**
 * 時段交通情境配置（基於VD真實數據）
 *
 * 使用檔案和方法：
 * - MainLayout.vue:
 *   * template 中的情境按鈕顯示 (timeScenarios)
 *   * currentScenarioDetails computed 屬性
 *   * switchToTimeScenario() 方法
 *   * updateGenerationConfig() 方法
 * - AutoTrafficGenerator.js: 暫時未直接使用，使用 getScenarioByTime() 函數替代
 *
 * 🎯 VD數據對應：
 * - 尖峰：基於 VLRJX20（東向，易壅塞）高峰時段數據
 * - 離峰：基於 VLRJM60（西向，中等流量）一般時段數據
 * - 凌晨：基於 VLRJX00（南北向，順暢）深夜時段數據
 */
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

    // 🎯 目標特徵（傳送給後端的VD數據）
    targetFeatures: {
      totalVolumePer5Min: 12, // 總車流：12輛/5分鐘
      occupancy: 50, // 佔有率：50%
      speed: 28, // 平均速度：28 km/h
      volumeByType: {
        motor: 5, // 機車：5輛/5分鐘
        small: 6, // 小客車：6輛/5分鐘
        large: 1, // 大客車：1輛/5分鐘
      },
    },

    config: {
      // 目標：12輛/5分鐘 → 300秒/12輛 = 25秒/輛 = 25000ms
      // 實際：3000ms / 4.0 = 750ms → 約16輛/5分鐘（考慮動態調整）
      interval: { min: 2000, max: 5000, normal: 3000 },
      vehicleTypes: [
        { type: 'motor', weight: 50 }, // 機車 50%（尖峰時段機車多）
        { type: 'small', weight: 40 }, // 小客車 40%
        { type: 'large', weight: 10 }, // 大客車 10%
      ],
      peakMultiplier: 4.0, // 高強度，實際間隔 = 3000/4.0 = 750ms
      maxLiveVehicles: 60, // 允許較多車輛同時在場
      densityThresholds: { light: 10, moderate: 20, heavy: 30, congested: 40 },
      description: '尖峰時段 - 高流量高佔有率低速度',
    },
  },
  {
    key: 'off_peak',
    name: '離峰時段',
    shortName: '離峰',
    icon: '🌞',
    timeRange: '09:00-16:00,19:00-22:00',
    hourRanges: [
      { start: 9, end: 16 },
      { start: 19, end: 22 },
    ],

    // 🎯 目標特徵（傳送給後端的VD數據）
    targetFeatures: {
      totalVolumePer5Min: 6, // 總車流：6輛/5分鐘
      occupancy: 22, // 佔有率：22%
      speed: 35, // 平均速度：35 km/h
      volumeByType: {
        motor: 2, // 機車：2輛/5分鐘
        small: 3, // 小客車：3輛/5分鐘
        large: 1, // 大客車：1輛/5分鐘
      },
    },

    config: {
      // 目標：6輛/5分鐘 → 300秒/6輛 = 50秒/輛 = 50000ms
      // 實際：6000ms / 2.5 = 2400ms → 約7-8輛/5分鐘
      interval: { min: 4000, max: 10000, normal: 6000 },
      vehicleTypes: [
        { type: 'motor', weight: 30 }, // 機車 30%
        { type: 'small', weight: 55 }, // 小客車 55%（離峰時段小客車較多）
        { type: 'large', weight: 15 }, // 大客車 15%
      ],
      peakMultiplier: 2.5, // 中等強度，實際間隔 = 6000/2.5 = 2400ms
      maxLiveVehicles: 40, // 中等車輛數
      densityThresholds: { light: 10, moderate: 20, heavy: 30, congested: 40 },
      description: '離峰時段 - 中等流量正常佔有率正常速度',
    },
  },
  {
    key: 'late_night',
    name: '凌晨時段',
    shortName: '凌晨',
    icon: '🌙',
    timeRange: '23:00-06:00',
    hourRanges: [
      { start: 23, end: 24 },
      { start: 0, end: 6 },
    ],

    // 🎯 目標特徵（傳送給後端的VD數據）
    targetFeatures: {
      totalVolumePer5Min: 2, // 總車流：2輛/5分鐘
      occupancy: 8, // 佔有率：8%
      speed: 48, // 平均速度：48 km/h
      volumeByType: {
        motor: 1, // 機車：1輛/5分鐘（凌晨主要是機車）
        small: 1, // 小客車：1輛/5分鐘
        large: 0, // 大客車：0輛/5分鐘
      },
    },

    config: {
      // 目標：2輛/5分鐘 → 300秒/2輛 = 150秒/輛 = 150000ms
      // 實際：25000ms / 1.0 = 25000ms → 約2.4輛/5分鐘
      interval: { min: 15000, max: 40000, normal: 25000 },

      vehicleTypes: [
        { type: 'motor', weight: 70 }, // 機車 70%（凌晨機車占多數）
        { type: 'small', weight: 25 }, // 小客車 25%
        { type: 'large', weight: 5 }, // 大客車 5%（很少）
      ],

      peakMultiplier: 1.0, // 正常強度，不加速
      maxLiveVehicles: 15, // 少量車輛
      densityThresholds: { light: 10, moderate: 20, heavy: 30, congested: 40 },
      description: '凌晨時段 - 低流量低佔有率高速度',
    },
  },
]

/**
 * 車型組合配置
 *
 * 使用檔案和方法：
 * - AutoTrafficGenerator.js:
 *   * constructor 中的 this.vehicleMixes 屬性初始化
 *   * 原本的 trafficProfiles 陣列中 vehicleMix 屬性對應
 *   * 用於決定不同交通狀況下的車型產生比例
 */
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

/**
 * 預設配置
 *
 * 使用檔案和方法：
 * - AutoTrafficGenerator.js:
 *   * constructor 中的 this.defaultConfig 屬性
 *   * this.config 的初始值來源
 *   * updateConfig() 方法的基礎設定
 */
export const defaultConfig = {
  interval: { min: 3000, max: 8000, normal: 5000 },
  peakMultiplier: 1.5,
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

/**
 * 根據當前時間取得對應的交通情境配置（基於VD真實數據）
 *
 * 使用檔案和方法：
 * - AutoTrafficGenerator.js:
 *   * _applyTrafficProfile() 方法中呼叫
 *   * 自動模式下根據模擬時間決定交通情境
 *   * 替代原本的硬編碼時段判斷邏輯
 *
 * @param {Date} currentTime - 當前時間
 * @returns {Object} 交通情境配置，包含 name, interval, peakMultiplier, vehicleTypes, description
 *
 * 🎯 VD數據範圍保證：
 * - 所有配置確保傳送給後端的數據在VD訓練範圍內
 * - 流量：1-15輛/5分鐘
 * - 佔有率：5-60%
 * - 速度：20-60 km/h
 */
export function getScenarioByTime(currentTime) {
  const currentHour = currentTime.getHours()

  // 00:00-06:00 深夜（凌晨低峰）
  // 參考：VD深夜數據，極低流量
  if (currentHour >= 0 && currentHour < 6) {
    return {
      name: '深夜',
      interval: { min: 20000, max: 45000, normal: 30000 },
      peakMultiplier: 0.8, // 實際間隔 = 30000/0.8 = 37500ms → 約1.6輛/5分鐘
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

  // 07:00-09:00 早尖峰（最高峰）
  // 參考：VLRJX20 尖峰時段數據
  else if (currentHour >= 7 && currentHour < 9) {
    return {
      name: '早尖峰',
      interval: { min: 2000, max: 4500, normal: 2800 },
      peakMultiplier: 4.2, // 實際間隔 = 2800/4.2 = 667ms → 約14輛/5分鐘
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

  // 11:00-14:00 午間（穩定）
  // 參考：VD午間時段數據
  else if (currentHour >= 11 && currentHour < 14) {
    return {
      name: '午間',
      interval: { min: 3500, max: 7000, normal: 5000 },
      peakMultiplier: 3.0, // 實際間隔 = 5000/3.0 = 1667ms → 約8輛/5分鐘
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

  // 16:00-17:00 傍晚前（開始壅塞）
  // 參考：VD傍晚前時段數據
  else if (currentHour >= 16 && currentHour < 17) {
    return {
      name: '傍晚前',
      interval: { min: 2500, max: 5000, normal: 3500 },
      peakMultiplier: 3.8, // 實際間隔 = 3500/3.8 = 921ms → 約11輛/5分鐘
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

  // 21:00-23:00 深夜前（持續降低）
  // 參考：VD深夜前時段數據
  else if (currentHour >= 21 && currentHour < 23) {
    return {
      name: '深夜前',
      interval: { min: 8000, max: 16000, normal: 11000 },
      peakMultiplier: 1.8, // 實際間隔 = 11000/1.8 = 6111ms → 約3.5輛/5分鐘
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

/**
 * 根據 key 取得時段情境配置
 *
 * 使用檔案和方法：
 * - MainLayout.vue:
 *   * switchToTimeScenario() 方法中可能使用
 *   * 未來擴展手動模式情境切換功能時使用
 *
 * @param {string} scenarioKey - 情境 key (peak_hours, off_peak, late_night)
 * @returns {Object|null} 情境配置物件，如果找不到則返回 null
 */
export function getScenarioByKey(scenarioKey) {
  return timeScenarios.find((scenario) => scenario.key === scenarioKey) || null
}
