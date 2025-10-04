/**
 * weatherConfig.js - 天氣效果設定檔
 *
 * 這個檔案包含了所有天氣相關的設定值
 * 方便進行統一管理和調整
 */

// ===== 天氣類型定義 =====
export const WEATHER_TYPES = {
  CLEAR: 'clear', // 晴天
  RAIN: 'rain', // 雨天
  HEAVY_RAIN: 'heavyRain', // 大雨
  FOG: 'fog', // 霧天
  SNOW: 'snow', // 雪天（選配）
}

// ===== 雨天效果設定 =====
export const RAIN_CONFIG = {
  // 雨滴數量設定
  PARTICLE_COUNT: {
    LIGHT: 100, // 小雨
    NORMAL: 200, // 中雨
    HEAVY: 300, // 大雨
  },

  // 雨滴外觀設定
  APPEARANCE: {
    WIDTH: 2, // 雨滴寬度（像素）
    MIN_HEIGHT: 10, // 最小高度（像素）
    MAX_HEIGHT: 20, // 最大高度（像素）
    COLOR: 'rgba(174, 194, 224, 0.5)', // 雨滴顏色
    OPACITY_RANGE: [0.2, 0.6], // 透明度範圍
  },

  // 雨滴動畫設定
  ANIMATION: {
    MIN_DURATION: 0.5, // 最短下落時間（秒）
    MAX_DURATION: 1.5, // 最長下落時間（秒）
    WIND_OFFSET: 30, // 風向偏移（像素）
    ROTATION: 10, // 雨滴傾斜角度（度）
  },

  // 速度影響
  SPEED_REDUCTION: {
    LIGHT: 0.9, // 小雨：速度降至90%
    NORMAL: 0.8, // 中雨：速度降至80%
    HEAVY: 0.7, // 大雨：速度降至70%
  },
}

// ===== 霧天效果設定 =====
export const FOG_CONFIG = {
  // 霧氣外觀設定
  APPEARANCE: {
    COLOR: 'rgba(200, 200, 200, 0.3)', // 霧氣顏色
    BLUR_AMOUNT: '10px', // 模糊程度
    LAYERS: 3, // 霧氣層數
  },

  // 霧氣動畫設定
  ANIMATION: {
    DRIFT_SPEED: 30, // 飄移速度（秒）
    OPACITY_RANGE: [0.2, 0.5], // 透明度範圍
  },

  // 能見度設定
  VISIBILITY: {
    FILTER: 'brightness(0.8) contrast(0.9)', // 降低亮度和對比度
    OPACITY: 0.85, // 整體透明度
  },

  // 速度影響
  SPEED_REDUCTION: 0.75, // 速度降至75%
}

// ===== 雪天效果設定（選配） =====
export const SNOW_CONFIG = {
  // 雪花數量設定
  PARTICLE_COUNT: 150,

  // 雪花外觀設定
  APPEARANCE: {
    SIZE_RANGE: [2, 6], // 大小範圍（像素）
    COLOR: 'rgba(255, 255, 255, 0.8)', // 雪花顏色
    BLUR: '1px', // 模糊效果
  },

  // 雪花動畫設定
  ANIMATION: {
    MIN_DURATION: 3, // 最短下落時間（秒）
    MAX_DURATION: 8, // 最長下落時間（秒）
    SWING_AMOUNT: 50, // 擺動幅度（像素）
  },

  // 速度影響
  SPEED_REDUCTION: 0.6, // 速度降至60%
}

// ===== 天氣轉換設定 =====
export const TRANSITION_CONFIG = {
  // 淡入淡出時間
  FADE_DURATION: 1.0, // 1秒

  // 粒子生成延遲
  PARTICLE_SPAWN_DELAY: 0.05, // 每個粒子延遲0.05秒生成
}

// ===== 性能優化設定 =====
export const PERFORMANCE_CONFIG = {
  // 降低粒子數量（效能模式）
  ENABLE_PERFORMANCE_MODE: false, // 是否啟用效能模式
  PERFORMANCE_PARTICLE_RATIO: 0.5, // 效能模式下粒子數量比例

  // 更新頻率
  UPDATE_INTERVAL: 16, // 更新間隔（毫秒，約60fps）
}

// ===== 匯出所有設定 =====
export default {
  WEATHER_TYPES,
  RAIN_CONFIG,
  FOG_CONFIG,
  SNOW_CONFIG,
  TRANSITION_CONFIG,
  PERFORMANCE_CONFIG,
}
