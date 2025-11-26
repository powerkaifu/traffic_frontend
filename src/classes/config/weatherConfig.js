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

  // 閃電效果設定（僅用於大雨）
  LIGHTNING: {
    ENABLED: true, // 是否啟用閃電效果
    MIN_INTERVAL: 3, // 最短間隔時間（秒）
    MAX_INTERVAL: 8, // 最長間隔時間（秒）
    FLASH_DURATION: 0.2, // 閃光持續時間（秒）
    FLASH_COLOR: 'rgba(255, 255, 255, 0.4)', // 閃電顏色
    DOUBLE_FLASH_CHANCE: 0.3, // 雙重閃電機率（30%）
    DOUBLE_FLASH_DELAY: 0.15, // 雙重閃電間隔（秒）
  },
}

// ===== 霧天效果設定 =====
export const FOG_CONFIG = {
  // 霧氣外觀設定
  APPEARANCE: {
    COLOR: 'rgba(220, 220, 220, 0.35)', // 霧氣顏色 (稍微降低透明度)
    LAYERS: 4, // 霧氣層數 (減少到 4 層)

    // 每層的詳細配置 (由遠到近)
    LAYER_CONFIG: [
      { blur: '50px', opacity: [0.2, 0.3], speed: 40, scale: 1.2, depth: 1 }, // 遠景層
      { blur: '35px', opacity: [0.25, 0.35], speed: 30, scale: 1.2, depth: 2 }, // 中景層
      { blur: '25px', opacity: [0.3, 0.4], speed: 22, scale: 1.2, depth: 3 }, // 近景層
      { blur: '18px', opacity: [0.35, 0.45], speed: 16, scale: 1.2, depth: 4 }, // 最近層
    ],
  },

  // 霧氣動畫設定
  ANIMATION: {
    USE_SVG_FILTER: true, // 啟用 SVG 濾鏡 (創造自然紋理)
    MULTI_DIRECTION: true, // 啟用多方向移動 (X + Y 軸)
    TURBULENCE_ANIMATION: false, // 🚫 禁用紊流動畫 (避免紋理蠕動造成上下移動錯覺)

    // SVG 濾鏡參數
    SVG_TURBULENCE: {
      baseFrequency: '0.012 0.006', // 紊流基礎頻率 (降低頻率讓紋理更平滑)
      numOctaves: 2, // 細節層次 (減少到 2)
      seed: 0, // 隨機種子
    },
  },

  // 能見度設定
  VISIBILITY: {
    FILTER: 'brightness(0.85) contrast(0.92)', // 降低亮度和對比度
    OPACITY: 0.88, // 整體透明度
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
  FADE_DURATION: 0.5, // 0.5秒

  // 粒子生成延遲
  PARTICLE_SPAWN_DELAY: 0.05, // 每個粒子延遲0.05秒生成
}

// ===== 性能優化設定 =====
export const PERFORMANCE_CONFIG = {
  // 降低粒子數量（效能模式）
  ENABLE_PERFORMANCE_MODE: true, // 是否啟用效能模式 ✅ 已啟用
  PERFORMANCE_PARTICLE_RATIO: 0.6, // 效能模式下粒子數量比例（改為 0.6 保持視覺效果）

  // 更新頻率
  UPDATE_INTERVAL: 16, // 更新間隔（毫秒，約60fps）
}

// ===== 🌤️ 天氣速度倍數設定（可調參數）=====
// 【重要】調整這些值來改變天氣對車速的影響
export const WEATHER_SPEED_MULTIPLIERS = {
  // 晴天
  [WEATHER_TYPES.CLEAR]: {
    name: '晴天',
    multiplier: 1.0, // 100% 正常速度
    description: '晴朗無雲，交通流暢',
  },

  // 雨天 - 三個等級
  [WEATHER_TYPES.RAIN]: {
    name: '雨天',
    multiplier: 0.8, // 80% 速度（建議值）
    description: '中等雨量，降速 20%',
    // 詳細設定（可選）
    detailed: {
      LIGHT: 0.9, // 輕雨：90% 速度
      NORMAL: 0.8, // 中雨：80% 速度
      HEAVY: 0.7, // 大雨：70% 速度
    },
  },

  // 大雨 + 閃電
  [WEATHER_TYPES.HEAVY_RAIN]: {
    name: '大雨',
    multiplier: 0.55, // 60% 速度
    description: '大雨伴隨閃電，降速 30%',
  },

  // 霧天
  [WEATHER_TYPES.FOG]: {
    name: '霧天',
    multiplier: 0.4, // 75% 速度
    description: '濃霧，能見度低，降速 25%',
  },

  // 雪天
  [WEATHER_TYPES.SNOW]: {
    name: '雪天',
    multiplier: 0.2, // 60% 速度
    description: '下雪，路面濕滑，降速 40%',
  },
}

// ===== 🎛️ 全局天氣系統設定 =====
export const WEATHER_SYSTEM_CONFIG = {
  // 天氣改變行為
  BEHAVIOR: {
    // 是否啟用天氣系統
    ENABLED: true,

    // 天氣改變時是否平滑過渡（暫時保留為未來擴展）
    SMOOTH_TRANSITION: false,

    // 天氣改變延遲時間（毫秒）
    CHANGE_DELAY: 0,

    // 是否在控制台輸出調試信息
    DEBUG_LOG: true,
  },

  // 天氣影響範圍
  IMPACT: {
    // 是否影響車輛速度
    AFFECTS_VEHICLE_SPEED: true,

    // 是否影響車流量
    AFFECTS_TRAFFIC_VOLUME: false, // 暫時未實現

    // 是否影響駕駛行為（例如跟車距離）
    AFFECTS_DRIVING_BEHAVIOR: false, // 暫時未實現
  },

  // 預設天氣
  DEFAULT_WEATHER: WEATHER_TYPES.CLEAR,

  // 天氣列表順序（用於 UI 顯示）
  WEATHER_ORDER: [
    WEATHER_TYPES.CLEAR,
    WEATHER_TYPES.RAIN,
    WEATHER_TYPES.HEAVY_RAIN,
    WEATHER_TYPES.FOG,
    WEATHER_TYPES.SNOW,
  ],
}

// ===== 匯出所有設定 =====
export default {
  WEATHER_TYPES,
  RAIN_CONFIG,
  FOG_CONFIG,
  SNOW_CONFIG,
  TRANSITION_CONFIG,
  PERFORMANCE_CONFIG,
  WEATHER_SPEED_MULTIPLIERS,
  WEATHER_SYSTEM_CONFIG,
}
