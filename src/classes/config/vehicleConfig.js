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
  TIME_MULTIPLIER: 1, // 控制整體動畫速度：越小越快，越大越慢（0.5=2倍速，2=半速）

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

  // 🚦 等待燈號變化時的減速設定
  WAITING_FOR_LIGHT: {
    SLOW_SPEED: 0.6, // 等待燈號時的減速速度（60%）
    STOP_DISTANCE_THRESHOLD: 5, // 接近停止線的距離閾值（5px內停止）
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

  // 🚗 綠燈跟車速度設定（根據距離比例）
  GREEN_LIGHT_FOLLOWING: {
    LANE1: {
      // 1號車道（左轉）- 更謹慎
      VERY_CLOSE: 0.15, // distance <= gap * 0.4
      CLOSE: 0.4, // distance <= gap * 0.7
      NORMAL: 0.7, // distance <= gap * 1.0
      FAR: 1.0, // distance > gap * 1.0
    },
    OTHER_LANES: {
      // 其他車道（直行）- 較快
      VERY_CLOSE: 0.2, // distance <= gap * 0.4
      CLOSE: 0.5, // distance <= gap * 0.7
      NORMAL: 0.8, // distance <= gap * 1.0
      FAR: 1.0, // distance > gap * 1.0
    },
    // 距離閾值比例
    DISTANCE_THRESHOLDS: {
      VERY_CLOSE: 0.4, // 非常接近
      CLOSE: 0.7, // 接近
      NORMAL: 1.0, // 正常
    },
  },

  // 🔄 恢復移動速度設定（resumeMovement）
  RESUME_SPEED: {
    QUEUE_ZONE: {
      // 在排隊區域的速度設定
      VERY_CLOSE: 0, // distance <= gap * 0.3
      CLOSE: 0.15, // distance <= gap * 0.6
      NORMAL: 0.3, // distance <= gap * 0.8
      FAR: 0.5, // distance > gap * 0.8
    },
    NON_QUEUE_ZONE: {
      // 非排隊區域的速度設定
      VERY_CLOSE: 0, // distance <= gap * 0.3
      CLOSE: 0.2, // distance <= gap * 0.6
      NORMAL: 0.5, // distance <= gap * 1.0
      FAR: 0.8, // distance > gap * 1.0
    },
    // 距離閾值比例
    DISTANCE_THRESHOLDS: {
      VERY_CLOSE: 0.3,
      CLOSE: 0.6,
      NORMAL: 0.8,
      FAR: 1.0,
    },
  },

  // ⚡ 跟車檢測間隔 (毫秒)
  CHECK_INTERVAL: 500, // 跟車狀態檢查間隔（優化：從1500ms降低到500ms以提高響應速度）

  // 🔄 推力設定
  PUSH_FORCE: {
    STOPPED_VEHICLE: 0.05, // 停車車輛的推力係數
  },

  // 🧠 智能減速預測設定
  PREDICTIVE_SLOWDOWN: {
    ENABLED: true, // 啟用智能預測減速
    RELATIVE_SPEED_THRESHOLD: 0.2, // 相對速度閾值（當速度差異大於此值時啟動預測）
    PREDICTION_DISTANCE_MULTIPLIER: 1.5, // 預測距離倍數（根據相對速度計算提前減速距離）
    MIN_PREDICTION_DISTANCE: 30, // 最小預測距離（像素）
    MAX_PREDICTION_DISTANCE: 80, // 最大預測距離（像素）
  },

  // 🚗 碰撞後自動跟隨設定
  AUTO_FOLLOW_AFTER_COLLISION: {
    ENABLED: true, // 啟用碰撞後自動跟隨
    MIN_FOLLOW_DISTANCE: 8, // 最小跟隨距離（px）- 低於此距離停止
    TARGET_FOLLOW_DISTANCE: 25, // 目標跟隨距離（px）- 理想間距
    MAX_FOLLOW_DISTANCE: 50, // 最大跟隨距離（px）- 超過此距離啟動跟隨

    // 跟隨速度設定（根據距離動態調整）
    FOLLOW_SPEEDS: {
      VERY_CLOSE: 0.05, // 非常接近（8-15px）- 微調速度
      CLOSE: 0.12, // 接近（15-25px）- 慢速靠近
      NORMAL: 0.18, // 正常（25-35px）- 一般跟隨
      FAR: 0.25, // 較遠（35-50px）- 快速跟隨
    },

    // 距離判斷閾值
    DISTANCE_THRESHOLDS: {
      VERY_CLOSE: 15, // 非常接近閾值（px）
      CLOSE: 25, // 接近閾值（px）
      NORMAL: 35, // 正常閾值（px）
    },

    // 🎯 長距離排隊追趕設定（解決碰撞後大空隙問題）
    LONG_DISTANCE_QUEUE_CATCH_UP: {
      ENABLED: true, // 啟用長距離追趕
      MIN_CATCH_UP_DISTANCE: 55, // 最小追趕距離（px）
      MAX_CATCH_UP_DISTANCE: 300, // 最大追趕距離（px）
      NORMAL_SPEED_THRESHOLD: 150, // 正常速度閾值（px）

      // 多段式速度控制
      CATCH_UP_SPEED: 0.35, // 基礎追趕速度（中等距離）
      NORMAL_DRIVE_SPEED: 0.9, // 遠距離接近正常行駛速度

      // 生成時安全距離檢查
      SAFE_SPAWN_DISTANCE: 100, // 生成時與前車最小安全距離（px）
    },
  },
}

// ===== 碰撞檢測設定 =====
export const COLLISION_CONFIG = {
  // 🎯 檢測距離設定 (像素) - 從 CollisionController 硬編碼移至配置
  DETECTION_DISTANCES: {
    FRONT_CHECK: 100, // 前方碰撞檢測距離
    SIDE_CHECK: 50, // 側向碰撞檢測距離
    INTERSECTION_CHECK: 80, // 路口碰撞檢測距離
    STOP_DISTANCE: 12, // 停止距離（原 CollisionController.STOP_DISTANCE）
    SLOW_DISTANCE: 25, // 減速距離（原 CollisionController.SLOW_DISTANCE）
    LANE_TOLERANCE: 25, // 車道對齊容差（原 CollisionController.LANE_TOLERANCE）
  },

  // ⚠️ 威脅等級設定
  THREAT_LEVELS: {
    NO_THREAT: 0, // 無威脅
    SLOW_DOWN: 1, // 減速
    STOP: 2, // 停車
    EMERGENCY_STOP: 3, // 緊急停車
    OVERLAPPING: 4, // 重疊
  },

  // ⏱️ 檢測間隔設定（毫秒）
  CHECK_INTERVAL: 100, // 碰撞檢查間隔
  SIMPLE_CHECK_INTERVAL: 50, // 簡單碰撞檢查間隔（優化：更頻繁的檢查）
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
