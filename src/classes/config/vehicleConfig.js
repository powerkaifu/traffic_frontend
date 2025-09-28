/**
 * vehicleConfig.js - 車輛行為設定檔
 *
 * 這個檔案包含了所有車輛相關的重複使用屬性和設定值
 * 方便進行統一管理和調整，遵循「單一事實來源」原則
 *
 * 🔧 調整建議：
 * - 數值越小 = 反應越快、動作越敏感
 * - 數值越大 = 反應越慢、動作越平穩
 */

// ===== 動畫與時間設定 =====
export const ANIMATION_CONFIG = {
  // 🎬 全域動畫控制
  TIME_MULTIPLIER: 1.0, // 控制整體動畫速度：越小越快，越大越慢（0.5=2倍速，2=半速）

  // ⚡ 速度變化動畫時間 (秒)
  SPEED_CHANGE_DURATION: {
    INSTANT: 0.05, // 幾乎立即的速度變化（紅燈停車用）
    FAST: 0.2, // 快速響應（綠燈啟動用）
    NORMAL: 0.3, // 一般速度變化
    SMOOTH: 0.5, // 平滑過渡
    GENTLE: 0.8, // 溫和變化
    VERY_SMOOTH: 1.0, // 非常平滑的變化
    ULTRA_SMOOTH: 1.2, // 超平滑變化
  },

  // 🚫 防抖和冷卻設定 (毫秒)
  COOLDOWN_TIMES: {
    GLOBAL_ANTI_SHAKE: 100, // 全域抖動防護冷卻時間
    POSITION_ADJUST: 500, // 位置調整冷卻時間
    TIMESCALE_DEBOUNCE: 200, // 時間縮放變更防抖延遲
  },

  // 🎯 動畫緩動設定
  EASING: {
    NONE: 'none', // 線性動畫，無緩動效果
    // 其他緩動效果已移除以避免車輛抖動
  },

  // ⏰ 初始化和時間限制設定
  INITIALIZATION_DELAY: 500, // 車輛初始化延遲時間（毫秒）
  MIN_ANIMATION_TIME: 1, // 最短動畫時間（秒）- 降低以支援更快速度
  MAX_ANIMATION_TIME: 30, // 最長動畫時間（秒）- 提高以支援更慢速度
  STUCK_CHECK_THRESHOLD: 10000, // 車輛停滯檢查閾值（毫秒）
}

// ===== 交通燈響應設定 =====
export const TRAFFIC_LIGHT_CONFIG = {
  // 🟡 黃燈行為設定 (像素)
  YELLOW_LIGHT: {
    ACCELERATE_DISTANCE: 100, // 黃燈時加速通過的判斷距離
    STOP_DISTANCE: 40, // 黃燈時停車的判斷距離
    SPEED_THRESHOLD: 0.7, // 高速/低速車輛判斷閾值 (70%)
    ACCELERATE_MULTIPLIER: {
      CONSERVATIVE: 1.2, // 保守加速倍數 (120%)
      AGGRESSIVE: 1.3, // 積極加速倍數 (130%)
    },
  },

  // 🔴 紅燈減速設定 (像素)
  RED_LIGHT: {
    SLOW_DOWN_DISTANCE: 60, // 開始減速的距離
    CRITICAL_DISTANCE: 15, // 緊急減速距離
    MEDIUM_DISTANCE: 35, // 中等減速距離
    SPEED_RATIOS: {
      CRITICAL: 0.05, // 緊急減速時的最低速度比例
      EMERGENCY: 0.15, // 緊急情況速度比例
      MEDIUM: 0.6, // 中等距離速度比例
      GRADUAL: 1.0, // 漸進減速比例
    },
  },
}

// ===== 車輛間距與安全距離設定 =====
export const DISTANCE_CONFIG = {
  // 🚗 基礎安全距離 (像素)
  BASE_DISTANCES: {
    MIN_GAP: 25, // 最小車輛間隙
    SAFE_FOLLOWING: 35, // 安全跟車距離
    EMERGENCY_STOP: 50, // 緊急停車距離
    REQUIRED_SAFETY: 20, // 基礎安全距離
    HYSTERESIS_BUFFER: 1, // 遲滯緩衝區
  },

  // 📏 距離調整倍數
  DISTANCE_MULTIPLIERS: {
    // 一般情況調整
    NORMAL_MIN_GAP: 0.9, // 一般最小間隙倍數
    NORMAL_SAFE: 0.95, // 一般安全距離倍數

    // 擁擠情況調整
    CONGESTED_MIN_GAP: 0.5, // 擁擠時最小間隙倍數
    CONGESTED_SAFE: 0.7, // 擁擠時安全距離倍數
    CONGESTED_STOP: 0.5, // 擁擠時停車距離倍數

    // 紅燈排隊調整
    RED_LIGHT_MIN_GAP: 2.0, // 紅燈排隊最小間隙倍數
    RED_LIGHT_SAFE: 2.5, // 紅燈排隊安全距離倍數
    RED_LIGHT_STOP: 1.8, // 紅燈排隊停車距離倍數

    // 等紅燈車輛調整
    WAITING_ADJUSTMENT: 1.2, // 前方車輛等紅燈時的調整倍數
  },

  // 🎯 特殊距離設定
  SPECIAL_DISTANCES: {
    RED_LIGHT_WAIT: 25, // 前車等紅燈時需要的更大距離
    STOP_LINE_TOLERANCE: 2, // 停止線容錯範圍
    STOP_LINE_OFFSET: {
      NORTH: 0, // 北向停車偏移
      SOUTH: 0, // 南向停車偏移
    },
  },

  // 🔧 系統設定項
  CRITICAL_ZONE_THRESHOLD: 50, // 危險區域閾值（像素）
  NEARBY_VEHICLE_RANGE: 100, // 附近車輛檢查範圍（像素）
  DEFAULT_CROSSING_DISTANCE: 800, // 預設路口通過距離（像素）
  DEFAULT_SPEED: 30, // 預設速度（km/h）
  PIXELS_PER_METER: 100, // 像素轉換為米的比例（100像素）
  METERS_PER_UNIT: 15, // 每單位的米數
}

// ===== 跟車行為設定 =====
export const FOLLOWING_CONFIG = {
  // 🎯 跟車速度計算
  SPEED_RATIOS: {
    // 根據距離調整跟車速度
    VERY_CLOSE: { front: 0.6, self: 0.4 }, // 很近時：前車60%，自己40%
    CLOSE: { front: 0.8, self: 0.7 }, // 接近時：前車80%，自己70%
    NORMAL: { front: 0.95, self: 0.9 }, // 正常時：前車95%，自己90%

    // 最低速度限制
    MIN_SPEED_RATIO: 0.15, // 最低速度比例 (15%)
    MIN_ABSOLUTE_RATIO: 0.1, // 絕對最低速度比例 (10%)

    // 溫和跟車設定
    GENTLE_THRESHOLD: 5, // 速度差異小於5時使用溫和跟車
    GENTLE_RATIO: 0.1, // 溫和跟車時的最低速度比例
  },

  // ⚡ 跟車檢測間隔 (毫秒)
  CHECK_INTERVAL: 1500, // 跟車狀態檢查間隔（從2000ms優化到1500ms）

  // 🔄 推力設定
  PUSH_FORCE: {
    STOPPED_VEHICLE: 0.05, // 停車車輛的推力係數
  },
}

// ===== 碰撞檢測設定 =====
export const COLLISION_CONFIG = {
  // 🎯 檢測距離設定 (像素)
  DETECTION_DISTANCES: {
    FRONT_CHECK: 100, // 前方碰撞檢測距離
    SIDE_CHECK: 50, // 側向碰撞檢測距離
    INTERSECTION_CHECK: 80, // 路口碰撞檢測距離
  },

  // ⚠️ 威脅等級設定
  THREAT_LEVELS: {
    NO_THREAT: 0, // 無威脅
    SLOW_DOWN: 1, // 減速
    STOP: 2, // 停車
    EMERGENCY_STOP: 3, // 緊急停車
    OVERLAPPING: 4, // 重疊
  },

  // ⏱️ 檢測間隔設定
  CHECK_INTERVAL: 100, // 碰撞檢查間隔（毫秒）
}

// ===== 動畫路徑設定 =====
export const PATH_CONFIG = {
  // 📐 路徑計算設定
  DISTANCE_SCALE: {
    PIXEL_TO_METER: 100 / 15, // 100像素 = 15米的比例尺
    DEFAULT_DISTANCE: 800, // 預設路口通過距離（像素）
    SPEED_BASE: 50, // 速度基準值 (km/h)
  },

  // ⏱️ 時間限制設定 (秒)
  TIME_LIMITS: {
    MIN_TIME: 3, // 最短通過時間
    MAX_TIME: 15, // 最長通過時間
  },
}

// ===== 除錯與日誌設定 =====
export const DEBUG_CONFIG = {
  // 🔍 日誌輸出機率
  LOG_PROBABILITY: 0.1, // 10%機率輸出調試信息（避免控制台被淹沒）

  // 📊 性能監控設定
  PERFORMANCE: {
    ENABLE_TIMING: false, // 是否啟用性能計時
    ENABLE_MEMORY: false, // 是否啟用記憶體監控
  },
}

// ===== 匯出所有設定 =====
export default {
  ANIMATION_CONFIG,
  TRAFFIC_LIGHT_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  COLLISION_CONFIG,
  PATH_CONFIG,
  DEBUG_CONFIG,
}
