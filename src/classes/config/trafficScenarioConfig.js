/**
 * 交通情景配置檔
 * 統一管理所有交通相關的參數設定，包括時段情景、車型組合、密度閾值等
 */

// 🚨 導入 displayMultiplier 配置
import { VOLUME_LIMITS_CONFIG } from './vehicleConfig.js'

// ============================================
// 🛠️ 【全局車輛管理配置】
// ============================================
// 用途：全系統範圍內控制同時在場的車輛數量上限
// 調用：AutoTrafficGenerator.checkVehicleLimit()、IndexPage.cleanupVehicles()
// 作用：防止車輛生成過多導致記憶體溢出和卡頓
// ✅ 統一分配方案：全域 100 → 每方向 25（100÷4） → 每車道 6（取整後 25÷4 ≈ 6.25）
// 說明：使用 6 輛/車道可確保每方向不會超過 24 輛 (6 * 4 = 24)，低於 VOLUME_LIMITS_CONFIG 的上限
// ============================================
export const GLOBAL_MAX_LIVE_VEHICLES = VOLUME_LIMITS_CONFIG.peak_hours.maxLiveVehicles // ✅ 從配置獲取

// ============================================
// �🌍 系統預設配置 - 初始化時使用
// ============================================
// 用途：AutoTrafficGenerator.js constructor 中初始化
// 調用：this.config = { ...defaultConfig }
// 作用：當沒有情景配置時的備用預設值
// ============================================
export const defaultConfig = {
  interval: { min: 3000, max: 8000, normal: 5000 },
  peakMultiplier: 1.5,
  vehiclesPerInterval: { min: 1, max: 1 }, // 🚗 支持範圍：{ min, max }，固定時用 { min: x, max: x }
  maxLiveVehicles: GLOBAL_MAX_LIVE_VEHICLES, // ✅ 使用全局配置
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
// 🚦 【停止線車輛限制配置】
// ============================================
// 用途：限制每個方向停止線前的最大車輛數量
// 調用：AutoTrafficGenerator._generateVehicle() 前檢查
// 作用：當停止線前的車輛達到上限時，停止生成新車輛
// ✅ 統一分配方案：全局 100 ÷ 4方向 = 各 25 輛
// ============================================
export const STOP_LINE_VEHICLE_LIMITS = {
  east: 25, // 東向停止線最大車輛數（100÷4=25）
  west: 25, // 西向停止線最大車輛數（100÷4=25）
  north: 25, // 北向停止線最大車輛數（100÷4=25）
  south: 25, // 南向停止線最大車輛數（100÷4=25）
}

// ============================================
// �📋 【手動情景模式】用 - 三個預設情景
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

    // 早峰/晚峰：7輛/車道，占有率 10%，速度 38-45 km/h
    // 🎭 API 層：後端接收的原始數據（不放大）
    // 📊 調整邏輯：降低生成數據以避免後端飽和（99秒）
    targetFeatures: {
      totalVolumePer5Min: 7, // 每輞道：7 輛/5分鐘（從 11 降低 36%）
      occupancy: 10, // 佔有率：10%（從 14 降低 29%）
      speed: 42, // 平均速度：42 km/h
      volumeByType: {
        motor: 5, // 機車：約 50%
        small: 3, // 小客車：約 30%
        large: 2, // 大客車：約 20%
      },
    },

    config: {
      // =========================================
      // 🎚️ 【常調整】- 車流密度相關參數
      // =========================================
      vehiclesPerInterval: { min: 1, max: 3 },
      interval: { min: 1000, max: 5000, normal: 2000 },
      peakMultiplier: 1, // 👈 尖峰倍數
      displayMultiplier: VOLUME_LIMITS_CONFIG['peak_hours'].displayMultiplier,

      // =========================================
      // 🚌 【次常調整】- 車型與系統參數
      // =========================================
      vehicleTypes: [
        { type: 'motor', weight: 50 }, // 機車 40%
        { type: 'small', weight: 30 }, // 小客車 40%
        { type: 'large', weight: 20 }, // 大客車 20%
      ],
      maxLiveVehicles: GLOBAL_MAX_LIVE_VEHICLES, // ✅ 使用全局配置
      densityThresholds: { light: 15, moderate: 25, heavy: 35, congested: 45 },

      // =========================================
      // 📝 【描述信息】- 僅供參考
      // =========================================
      description: '尖峰時段 - 高流量中等佔有率中速度 (早峰/晚峰)',
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
        motor: 4, // 機車：約 40%
        small: 4, // 小客車：約 40%
        large: 2, // 大客車：約 20%
      },
    },

    config: {
      // =========================================
      // 🎚️ 【常調整】- 車流密度相關參數
      // =========================================
      vehiclesPerInterval: { min: 1, max: 3 }, // 👈 🎯 FIXED: 改為單一生成模式，避免爆發
      interval: { min: 6000, max: 12000, normal: 5000 }, // ⏱️ FIXED: 延長到 8 秒基準，避免短時間內堆積
      peakMultiplier: 1.0, // 👈 離峰不加倍
      displayMultiplier: VOLUME_LIMITS_CONFIG['off_peak'].displayMultiplier, // ✅ 從配置讀取（預設為 1.0）

      // =========================================
      // 🚌 【次常調整】- 車型與系統參數
      // =========================================
      vehicleTypes: [
        { type: 'motor', weight: 40 }, // 機車 40%
        { type: 'small', weight: 40 }, // 小客車 40%
        { type: 'large', weight: 20 }, // 大客車 20%
      ],
      maxLiveVehicles: GLOBAL_MAX_LIVE_VEHICLES, // ✅ 使用全局配置
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
        motor: 0.6, // 機車：主要是機車
        small: 0.4, // 小客車：很少
        large: 0.0, // 大客車：少量 ✅ 改為 0.2 以顯示大車數據
      },
    },

    config: {
      // =========================================
      // 🎚️ 【常調整】- 車流密度相關參數
      // =========================================
      vehiclesPerInterval: { min: 1, max: 1 }, // 👈 🎯 每個 interval 只生成 1 台車
      interval: { min: 15000, max: 30000, normal: 10000 }, // ⏱️ 生成間隔 15-30 秒（超級稀疏）
      peakMultiplier: 1.0, // 👈 凌晨不加倍
      displayMultiplier: VOLUME_LIMITS_CONFIG['late_night'].displayMultiplier, // ✅ 從配置讀取（預設為 1.0）

      // =========================================
      // 🚌 【次常調整】- 車型與系統參數
      // =========================================
      vehicleTypes: [
        { type: 'motor', weight: 60 }, // 機車 60%（凌晨以機車為主）
        { type: 'small', weight: 40 }, // 小客車 40%
        { type: 'large', weight: 0 }, // 大客車 0%
      ],
      maxLiveVehicles: GLOBAL_MAX_LIVE_VEHICLES, // ✅ 使用全局配置
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
  // 參考：late_night 情景模式
  if (currentHour >= 0 && currentHour < 6) {
    return {
      name: '深夜',
      interval: { min: 15000, max: 40000, normal: 20000 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['late_night'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 0 },
      ],
      description: '深夜時段 - 極低流量',
    }
  }

  // 06:00-07:00 清晨（開始增加）
  // 參考：late_night → off_peak 過渡
  else if (currentHour >= 6 && currentHour < 7) {
    return {
      name: '清晨',
      interval: { min: 12000, max: 20000, normal: 16000 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['late_night'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 55 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 5 },
      ],
      description: '清晨時段 - 低流量（過渡段：late_night→peak_hours）',
    }
  }

  // ==========================================
  // 🌅 早晨尖峰時段 (07:00-11:00)
  // ==========================================

  // 07:00-09:00 早尖峰（最高峰）
  // 參考：peak_hours 情景模式
  else if (currentHour >= 7 && currentHour < 9) {
    return {
      name: '早尖峰',
      // 與手動情景 peak_hours 保持一致：更短的平均生成間隔與較高的每 interval 車量
      interval: { min: 2000, max: 8000, normal: 3500 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['peak_hours'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 40 },
        { type: 'small', weight: 50 },
        { type: 'large', weight: 10 },
      ],
      description: '早尖峰時段 - 極高流量',
    }
  }

  // 09:00-11:00 上午（略降至中等）
  // 參考：peak_hours → off_peak 過渡
  else if (currentHour >= 9 && currentHour < 11) {
    return {
      name: '上午',
      interval: { min: 5000, max: 9000, normal: 7500 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['off_peak'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 35 },
        { type: 'small', weight: 55 },
        { type: 'large', weight: 10 },
      ],
      description: '上午時段 - 中等流量（過渡段：peak_hours→off_peak）',
    }
  }

  // ==========================================
  // ☀️ 中午時段 (11:00-17:00)
  // ==========================================

  // 11:00-14:00 午間（穩定離峰）
  // 參考：off_peak 情景模式
  else if (currentHour >= 11 && currentHour < 14) {
    return {
      name: '午間',
      interval: { min: 5000, max: 10000, normal: 8500 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['off_peak'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 30 },
        { type: 'small', weight: 65 },
        { type: 'large', weight: 5 },
      ],
      description: '午間時段 - 中等流量',
    }
  }

  // 14:00-16:00 下午（穩定離峰，略升）
  // 參考：off_peak 情景模式
  else if (currentHour >= 14 && currentHour < 16) {
    return {
      name: '下午',
      interval: { min: 5000, max: 10000, normal: 8500 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['off_peak'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 32 },
        { type: 'small', weight: 63 },
        { type: 'large', weight: 5 },
      ],
      description: '下午時段 - 中等流量',
    }
  }

  // ==========================================
  // 🌆 傍晚尖峰時段 (16:00-21:00)
  // ==========================================

  // 16:00-17:00 傍晚前（開始壅塞）
  // 參考：off_peak → peak_hours 過渡
  else if (currentHour >= 16 && currentHour < 17) {
    return {
      name: '傍晚前',
      interval: { min: 4000, max: 9000, normal: 7000 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['off_peak'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 36 },
        { type: 'small', weight: 58 },
        { type: 'large', weight: 6 },
      ],
      description: '傍晚前時段 - 高流量（過渡段：off_peak→peak_hours）',
    }
  }

  // 17:00-19:00 晚尖峰（高峰）
  // 參考：peak_hours 情景模式
  else if (currentHour >= 17 && currentHour < 19) {
    return {
      name: '晚尖峰',
      // 與手動情景 peak_hours 保持一致
      interval: { min: 2000, max: 8000, normal: 3500 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['peak_hours'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 40 },
        { type: 'small', weight: 50 },
        { type: 'large', weight: 10 },
      ],
      description: '晚尖峰時段 - 極高流量',
    }
  }

  // 19:00-21:00 晚間（逐漸降低）
  // 參考：peak_hours → off_peak 過渡
  else if (currentHour >= 19 && currentHour < 21) {
    return {
      name: '晚間',
      interval: { min: 5000, max: 10000, normal: 8500 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['off_peak'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 32 },
        { type: 'small', weight: 63 },
        { type: 'large', weight: 5 },
      ],
      description: '晚間時段 - 中等流量',
    }
  }

  // ==========================================
  // 🌃 夜間時段 (21:00-23:00)
  // ==========================================

  // 21:00-23:00 深夜前（持續降低）
  // 參考：off_peak → late_night 過渡
  else if (currentHour >= 21 && currentHour < 23) {
    return {
      name: '深夜前',
      interval: { min: 12000, max: 20000, normal: 16000 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['late_night'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 50 },
        { type: 'small', weight: 45 },
        { type: 'large', weight: 5 },
      ],
      description: '深夜前時段 - 低流量（過渡段：off_peak→late_night）',
    }
  }

  // 23:00-24:00 深夜（回到低峰）
  // 參考：late_night 情景模式
  else {
    return {
      name: '深夜',
      interval: { min: 15000, max: 40000, normal: 20000 },
      peakMultiplier: 1.0,
      displayMultiplier: VOLUME_LIMITS_CONFIG['late_night'].displayMultiplier,
      vehiclesPerInterval: { min: 1, max: 1 },
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 0 },
      ],
      description: '深夜時段 - 極低流量',
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
