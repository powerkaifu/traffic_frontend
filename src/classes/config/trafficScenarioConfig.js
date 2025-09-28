/**
 * 交通情境配置檔
 * 統一管理所有交通相關的參數設定，包括時段情境、車型組合、密度閾值等
 * 由 AutoTrafficGenerator 和 MainLayout 共同使用
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
 */

/**
 * 時段交通情境配置
 *
 * 使用檔案和方法：
 * - MainLayout.vue:
 *   * template 中的情境按鈕顯示 (timeScenarios)
 *   * currentScenarioDetails computed 屬性
 *   * switchToTimeScenario() 方法
 *   * updateGenerationConfig() 方法
 * - AutoTrafficGenerator.js: 暫時未直接使用，使用 getScenarioByTime() 函數替代
 */
export const timeScenarios = [
  {
    key: 'peak_hours',
    name: '尖峰時段',
    shortName: '尖峰',
    icon: '🚀',
    timeRange: '07:00-08:00,17:00-18:00',
    hourRanges: [
      // 目前暫未使用，預留給未來擴展
      { start: 7, end: 8 },
      { start: 17, end: 18 },
    ],
    config: {
      interval: { min: 4000, max: 7000, normal: 5500 },
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 10 },
      ],
      peakMultiplier: 3.5,
      maxLiveVehicles: 100,
      densityThresholds: { light: 10, moderate: 20, heavy: 30, congested: 40 },
      description: '尖峰時段',
    },
  },
  {
    key: 'off_peak',
    name: '離峰時段',
    shortName: '離峰',
    icon: '🌞',
    timeRange: '09:00-16:00,19:00-22:00',
    hourRanges: [
      // 預留擴展用
      { start: 9, end: 16 },
      { start: 19, end: 22 },
    ],
    config: {
      interval: { min: 4000, max: 6000, normal: 5000 },
      vehicleTypes: [
        { type: 'motor', weight: 30 },
        { type: 'small', weight: 55 },
        { type: 'large', weight: 15 },
      ],
      peakMultiplier: 2.5,
      maxLiveVehicles: 100,
      densityThresholds: { light: 10, moderate: 20, heavy: 30, congested: 40 },
      description: '離峰時段',
    },
  },
  {
    key: 'late_night',
    name: '凌晨時段',
    shortName: '凌晨',
    icon: '🌙',
    timeRange: '23:00-06:00',
    hourRanges: [
      // 預留擴展用
      { start: 23, end: 24 },
      { start: 0, end: 6 },
    ],
    config: {
      interval: { min: 20000, max: 40000, normal: 30000 },

      vehicleTypes: [
        { type: 'motor', weight: 80 },
        { type: 'small', weight: 15 },
        { type: 'large', weight: 5 },
      ],

      peakMultiplier: 1,

      maxLiveVehicles: 100,

      densityThresholds: { light: 10, moderate: 20, heavy: 30, congested: 40 },

      description: '凌晨時段',
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
 * 根據當前時間取得對應的交通情境配置
 *
 * 使用檔案和方法：
 * - AutoTrafficGenerator.js:
 *   * _applyTrafficProfile() 方法中呼叫
 *   * 自動模式下根據模擬時間決定交通情境
 *   * 替代原本的硬編碼時段判斷邏輯
 *
 * @param {Date} currentTime - 當前時間
 * @returns {Object} 交通情境配置，包含 name, interval, peakMultiplier, vehicleTypes, description
 */
export function getScenarioByTime(currentTime) {
  const currentHour = currentTime.getHours()

  // 尖峰時段 (7-8時, 17-18時)
  if ((currentHour >= 7 && currentHour < 8) || (currentHour >= 17 && currentHour < 18)) {
    return {
      name: '尖峰',
      interval: { min: 4000, max: 7000, normal: 5500 },
      peakMultiplier: 3.5,
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 10 },
      ],
      description: '尖峰時段',
    }
  }
  // 離峰時段 (9-16時, 19-22時)
  else if ((currentHour >= 9 && currentHour < 16) || (currentHour >= 19 && currentHour < 22)) {
    return {
      name: '離峰',
      interval: { min: 4000, max: 6000, normal: 5000 },
      peakMultiplier: 2.5,
      vehicleTypes: [
        { type: 'motor', weight: 30 },
        { type: 'small', weight: 55 },
        { type: 'large', weight: 15 },
      ],
      description: '離峰時段',
    }
  }
  // 凌晨時段 (其他時間)
  else {
    return {
      name: '凌晨',
      interval: { min: 20000, max: 40000, normal: 30000 },
      peakMultiplier: 1,
      vehicleTypes: [
        { type: 'motor', weight: 80 },
        { type: 'small', weight: 15 },
        { type: 'large', weight: 5 },
      ],
      description: '凌晨時段',
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
