/**
 * 交通情境配置檔
 * 統一管理所有交通相關的參數設定，包括時段情境、車型組合、密度閾值等
 * 由 AutoTrafficGenerator 和 MainLayout 共同使用
 */

// 時段交通情境配置
export const timeScenarios = [
  {
    key: 'peak_hours',
    name: '尖峰時段',
    shortName: '尖峰',
    icon: '🚀',
    timeRange: '07:00-08:00,17:00-18:00',
    hourRanges: [
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

// 車型組合配置（AutoTrafficGenerator 使用）
export const vehicleMixes = {
  light: {
    motor: 0.2,
    small: 0.7,
    large: 0.1,
  },
  normal: {
    motor: 0.4,
    small: 0.5,
    large: 0.1,
  },
  heavy: {
    motor: 0.6,
    small: 0.3,
    large: 0.1,
  },
}

// 預設配置
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

// 交通配置檔案結構（AutoTrafficGenerator 使用）
export const trafficProfiles = [
  {
    name: '深夜',
    hours: { start: 0, end: 6 },
    config: {
      interval: { min: 20000, max: 40000, normal: 30000 },
      peakMultiplier: 1,
      vehicleTypes: [
        { type: 'motor', weight: 80 },
        { type: 'small', weight: 15 },
        { type: 'large', weight: 5 },
      ],
    },
  },
  {
    name: '上午尖峰',
    hours: { start: 7, end: 8 },
    config: {
      interval: { min: 4000, max: 7000, normal: 5500 },
      peakMultiplier: 3.5,
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 10 },
      ],
    },
  },
  {
    name: '日間離峰',
    hours: { start: 9, end: 16 },
    config: {
      interval: { min: 4000, max: 6000, normal: 5000 },
      peakMultiplier: 2.5,
      vehicleTypes: [
        { type: 'motor', weight: 30 },
        { type: 'small', weight: 55 },
        { type: 'large', weight: 15 },
      ],
    },
  },
  {
    name: '傍晚尖峰',
    hours: { start: 17, end: 18 },
    config: {
      interval: { min: 4000, max: 7000, normal: 5500 },
      peakMultiplier: 3.5,
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 10 },
      ],
    },
  },
  {
    name: '夜晚',
    hours: { start: 19, end: 22 },
    config: {
      interval: { min: 4000, max: 6000, normal: 5000 },
      peakMultiplier: 2.5,
      vehicleTypes: [
        { type: 'motor', weight: 30 },
        { type: 'small', weight: 55 },
        { type: 'large', weight: 15 },
      ],
    },
  },
]

/**
 * 根據當前時間取得對應的交通情境配置
 * @param {Date} currentTime - 當前時間
 * @returns {Object} 交通情境配置
 */
export function getScenarioByTime(currentTime) {
  const currentHour = currentTime.getHours()

  // 尖峰時段
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
  // 離峰時段
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
  // 凌晨時段
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
 * @param {string} scenarioKey - 情境 key
 * @returns {Object|null} 情境配置
 */
export function getScenarioByKey(scenarioKey) {
  return timeScenarios.find((scenario) => scenario.key === scenarioKey) || null
}
