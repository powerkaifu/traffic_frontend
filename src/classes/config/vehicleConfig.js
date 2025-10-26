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
  TIME_MULTIPLIER: 0.5, // 控制整體動畫速度：越小越快，越大越慢（0.5=2倍速，2=半速）

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
  //  等待燈號變化時的減速設定
  WAITING_FOR_LIGHT: {
    SLOW_SPEED: 0.6, // 等待燈號時的減速速度（60%）
    STOP_DISTANCE_THRESHOLD: 5, // 接近停止線的距離閾值（5px內停止）
  },
}

// ===== 車輛尺寸設定 (改進：解決重疊問題) =====
export const VEHICLE_DIMENSIONS = {
  // 🚗 各車種的長度（像素）
  motorcycle: { length: 25, width: 10 },  // 機車
  car: { length: 60, width: 20 },         // 小汽車
  truck: { length: 120, width: 25 },      // 卡車
}

// ===== 車道生成設定 (改進：解決重疊問題) =====
export const LANE_SPAWN_CONFIG = {
  // 🚗 車輛之間的安全距離（像素）
  SAFE_DISTANCE: 15,
  
  // 🚗 入口前的緩衝區（像素）- 新車從 Path 外緩衝區開始進入
  ENTRY_BUFFER: 100,
  
  // 🚨 是否啟用動態 Progress 生成（推薦啟用）
  ENABLE_DYNAMIC_PROGRESS: true,
  
  // 🚨 是否啟用負 Progress（讓新車從 Path 外開始）
  ENABLE_NEGATIVE_PROGRESS: true,
}

// ===== 車輛間距與安全距離設定 =====
export const DISTANCE_CONFIG = {
  // 🚗 唯一需要調整的參數
  MIN_GAP: 25, // 車輛停車時的間隔距離（像素）- 調整此值可改變排隊間距

  // 🔧 碰撞檢測內部使用（不建議修改，會影響碰撞檢測功能）
  SAFE_FOLLOWING: 35, // 跟車安全距離
  EMERGENCY_STOP: 50, // 緊急停車距離
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
    CRAWL_SPEED_RATIO: 0.05, // 碰撞後爬行速度比例 (5%)

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
    NEARBY_VEHICLE_RANGE: 100, // 附近車輛檢查範圍
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

// ===== 生成間隔設定 =====
export const GENERATION_CONFIG = {
  // 🚗 每個車道的最大車輛數
  MAX_VEHICLES_PER_LANE: 25,

  // 🚗 車道入口最小間距
  LANE_ENTRANCE_MIN_SPACING: 20,

  // ⏰ 時間段生成間隔設定（秒）
  GENERATION_INTERVALS: {
    MIDNIGHT: 3.0, // 午夜段 (00:00-06:59)
    PEAK: 0.5, // 尖峰時段 (07:00-09:59, 17:00-19:59)
    OFF_PEAK: 1.5, // 離峰時段 (10:00-16:59, 20:00-23:59)
  },
}

// ===== 車輛退出檢測設定 =====
export const VEHICLE_EXIT_CONFIG = {
  // 🚗 車輛超出邊界的檢測範圍（像素）
  BOUNDARY_MARGIN: 50,

  // 🔄 檢測間隔（毫秒）
  CHECK_INTERVAL: 100,
}

// ===== 循環流量機制設定 =====
export const VEHICLE_RECYCLING_CONFIG = {
  // 🔄 是否啟用循環流量機制（回收車輛而不是刪除）
  ENABLED: true,

  // 📍 各方向的回收點位置（路口邊界外）
  // 當車輛超出邊界時，回收到相反方向的起點
  RECYCLE_POSITIONS: {
    east: { x: 0, y: null }, // 東向車輛回收到西邊 (x=0)
    west: { x: null, y: null }, // 西向車輛回收到東邊 (邊界外)
    north: { x: null, y: 0 }, // 北向車輛回收到南邊 (y=0)
    south: { x: null, y: null }, // 南向車輛回收到北邊 (邊界外)
  },

  // 🔧 回收時的車輛狀態重置
  RESET_ON_RECYCLE: {
    speed: 0, // 回收後的初始速度
    currentState: 'waiting', // 回收後的初始狀態
    resetTravelData: true, // 是否重置行駛數據
    resetSpeedData: true, // 是否重置速度數據
  },

  // ⚙️ 回收機制調整
  MAX_RECYCLES_PER_VEHICLE: null, // 單個車輛的最大循環次數 (null = 無限)
  RECYCLE_COOLDOWN: 500, // 回收後的冷卻時間（毫秒），防止立即再次超出邊界
  ENABLE_RECYCLE_LOGGING: true, // 是否記錄回收事件
}

// ===== 車道變換設定 (改進 8) =====
export const LANE_CHANGING_CONFIG = {
  // 🚦 車道變換啟用設定
  ENABLED: true, // 是否啟用車道變換

  // 📏 車道變換條件
  MIN_SPEED_FOR_CHANGE: 20, // 最小速度才能變道 (km/h) - 低速下不建議變道
  MAX_LANE_CHANGES_PER_VEHICLE: null, // 單個車輛的最大變道次數 (null = 無限)

  // ⏱️ 車道變換冷卻時間 (毫秒)
  LANE_CHANGE_COOLDOWN: 2000, // 兩次變道間的最小間隔時間
  LANE_CHANGE_DURATION: 1.5, // 完成一次變道需要的時間 (秒)

  // 🎯 變道決策條件
  CHANGE_CONDITIONS: {
    // 前方車輛距離過近時考慮變道
    MIN_FRONT_VEHICLE_DISTANCE: 100, // 發現前方車輛距離 (px)

    // 旁邊車道的條件
    SIDE_LANE_MIN_GAP: 80, // 旁邊車道的最小間隔 (px)
    SIDE_LANE_MIN_CLEAR_DISTANCE: 50, // 旁邊車道要清空的距離 (px)

    // 目標車道的流量條件
    TARGET_LANE_MAX_VEHICLES: 20, // 目標車道最多車輛數
    TARGET_LANE_AVG_SPEED_THRESHOLD: 35, // 目標車道平均速度閾值 (km/h)
  },

  // 🚗 不同方向的變道規則
  DIRECTION_RULES: {
    // 南北向 (vertical) - 可在 1-4 號車道間變道
    east: {
      MIN_LANE: 1,
      MAX_LANE: 4,
      PREFERRED_LANES: [2, 3], // 偏好的車道
    },
    west: {
      MIN_LANE: 1,
      MAX_LANE: 4,
      PREFERRED_LANES: [2, 3],
    },
    north: {
      MIN_LANE: 1,
      MAX_LANE: 4,
      PREFERRED_LANES: [2, 3],
    },
    south: {
      MIN_LANE: 1,
      MAX_LANE: 4,
      PREFERRED_LANES: [2, 3],
    },
  },

  // 🔍 變道策略 (aggressive, moderate, conservative)
  STRATEGY: 'moderate', // 變道策略：激進、中等、保守

  // 📊 變道日誌設定
  ENABLE_LANE_CHANGE_LOGGING: true, // 是否記錄變道事件
}

// ===== 匯出所有設定 =====
export default {
  ANIMATION_CONFIG,
  TRAFFIC_LIGHT_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  COLLISION_CONFIG,
  GENERATION_CONFIG,
  VEHICLE_EXIT_CONFIG,
  VEHICLE_RECYCLING_CONFIG,
  LANE_CHANGING_CONFIG,
  VEHICLE_DIMENSIONS,
  LANE_SPAWN_CONFIG,
}
