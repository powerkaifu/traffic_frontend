/**
 * AnimationDefaults.js - 動畫預設配置集中管理
 * 所有動畫相關的預設參數統一定義於此
 * 確保整個應用的動畫表現一致
 */

export const AnimationDefaults = {
  // 數字動畫預設值
  NUMBER: {
    duration: 0.8, // 動畫時長（秒）
    decimals: 0, // 小數位數
    ease: 'power2.out', // 緩動函數
    delimiter: ',', // 千位分隔符
  },

  // 數據面板動畫
  DATA_PANEL: {
    duration: 0.8, // 數據更新動畫時長
    staggerDelay: 0.05, // 交錯延遲
  },

  // 信號燈轉換動畫
  TRAFFIC_LIGHT: {
    transitionDuration: 0.3, // 信號轉換時長
    pulseScale: 1.1, // 閃爍放大倍數
    pulseDuration: 0.2, // 閃爍時長
  },

  // 車輛移動動畫
  VEHICLE: {
    movementDuration: 0.5, // 車輛移動時長
    rotationDuration: 0.3, // 車輛旋轉時長
  },

  // 面板進出動畫
  PANEL: {
    slideInDuration: 0.3, // 滑入時長
    slideOutDuration: 0.25, // 滑出時長
    fadeInDuration: 0.2, // 淡入時長
    fadeOutDuration: 0.15, // 淡出時長
  },

  // 常見後綴和前綴
  FORMAT: {
    TIME_SUFFIX: ' 秒', // 時間後綴
    SPEED_SUFFIX: ' km/h', // 速度後綴
    PERCENTAGE_SUFFIX: '%', // 百分比後綴
    VEHICLE_COUNT_SUFFIX: ' 輛', // 車輛數後綴
    CURRENCY_PREFIX: '$', // 貨幣前綴
  },

  // 常見配置集合
  COMMON: {
    // 快速動畫
    FAST: {
      duration: 0.3,
      ease: 'power2.inOut',
    },
    // 標準動畫
    NORMAL: {
      duration: 0.6,
      ease: 'power2.out',
    },
    // 緩慢動畫
    SLOW: {
      duration: 1.2,
      ease: 'power2.out',
    },
  },
}

// 為了向後兼容，導出所有子配置
export const { NUMBER, DATA_PANEL, TRAFFIC_LIGHT, VEHICLE, PANEL, FORMAT, COMMON } = AnimationDefaults
