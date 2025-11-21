/**
 * ambulanceConfig.js - 救護車安全通行系統配置
 *
 * 定義救護車通過路口時的路權清除邏輯相關參數
 * 包括階段距離閾值、速度調整倍數、恢復時間等
 *
 * 設計理念：
 * - 預測性清空路口，而非被動反應
 * - 分階段漸進式處理，避免突兀變化
 * - 最小化對其他車輛的影響範圍
 */

// ===== 階段距離配置 =====
/**
 * 🚑 救護車通行四階段距離閾值（像素）
 *
 * 距離計算基準：救護車車頭到路口中心停止線的方向性距離
 * - 正值：救護車尚未到達停止線
 * - 負值：救護車已通過停止線
 */
export const AMBULANCE_STAGES = {
  // 階段 1️⃣：預警階段 - 開始監測並標記衝突車道
  WARNING_DISTANCE: 400, // 🚨 400px：大幅提前預警（從250改為400），讓車輛更早知道

  // 階段 2️⃣：路權清除階段 - 主動清空衝突車道
  CLEARANCE_DISTANCE: 350, // 🚨 350px：提前執行減速（從200改為350），給予更多反應時間

  // 階段 3️⃣：通過階段 - 救護車進入路口核心區域
  TRANSIT_DISTANCE: 100, // 100px：進入路口，維持清空狀態

  // 階段 4️⃣：恢復階段 - 救護車已通過，恢復正常交通
  RECOVERY_DISTANCE: -100, // 🚨 -100px：提早恢復（從-150改為-100），避免救護車在路口消失
}

// ===== 速度調整倍數配置 =====
/**
 * 🎛️ 不同場景下的速度調整倍數
 *
 * 倍數說明：
 * - 1.0 = 正常速度
 * - > 1.0 = 加速（用於快速清空路口）
 * - < 1.0 = 減速（用於避讓或停止）
 * - 0.0 = 完全停止
 *
 * 🚨 安全優先原則：所有速度倍數都設置得非常保守，
 * 確保絕對不會發生碰撞，即使犧牲一些流暢度
 */
export const SPEED_MULTIPLIERS = {
  // === 對向車輛（與救護車反向同軸線）===
  OPPOSING_EMERGENCY_BRAKE: 0.0, // 🚨 對向車輛在路口內：完全停止（從0.3改為0.0）
  OPPOSING_SLOW: 0.1, // 🚨 對向車輛在路口外：極慢速度（從0.5改為0.1）

  // === 垂直車道（與救護車垂直方向）===
  PERPENDICULAR_ACCELERATE: 0.0, // 🚨 禁用加速通過，改為停止（從1.2改為0.0）
  PERPENDICULAR_STOP: 0.0, // 垂直車道中距離：完全停止
  PERPENDICULAR_SLOW: 0.2, // 🚨 垂直車道遠距離：極慢速度（從0.6改為0.2）

  // === 同向車輛（與救護車同方向）===
  SAME_DIRECTION_YIELD: 0.1, // 🚨 同向前方車輛：幾乎停止（從0.2改為0.1）

  // === 恢復階段漸進速度 ===
  RECOVERY_STEP_1: 0.6, // 恢復第一步
  RECOVERY_STEP_2: 0.8, // 恢復第二步
  RECOVERY_STEP_3: 1.0, // 恢復第三步（正常）
}

// ===== 距離判定閾值配置 =====
/**
 * 📏 各類車輛行為判定的距離閾值
 *
 * 🚨 安全優先：擴大停止範圍，提前減速/停止
 */
export const DISTANCE_THRESHOLDS = {
  // 垂直車道車輛距離路口中心的判定
  PERPENDICULAR_ACCELERATE_THRESHOLD: 0, // 🚨 禁用加速通過（設為0，永遠不會觸發）
  PERPENDICULAR_STOP_THRESHOLD: 250, // 🚨 大幅擴大停止範圍（從150改為250）

  // 對向車輛距離路口中心的判定
  OPPOSING_EMERGENCY_THRESHOLD: 150, // 🚨 擴大緊急剎車範圍（從100改為150）
  OPPOSING_SLOW_THRESHOLD: 250, // 🚨 擴大減速範圍（從200改為250）

  // 現有避讓半徑（擴展使用）
  YIELD_RADIUS: 150, // 150px：同向避讓範圍
}

// ===== 救護車影響範圍配置 =====
/**
 * 🎯 救護車偵測範圍控制（三階段）
 *
 * 階段A: 進場車道 - 救護車尚未通過停止線
 * 階段B: 離開車道 - 救護車已完全離開路口中央
 * 階段C: 路口中央 - 救護車在路口核心區域
 *
 * 邏輯：
 * - A/B 階段（車道上）：只影響同向前方車輛
 * - C 階段（路口中央）：500px 半徑影響所有車輛
 *
 * 🎯 左轉車自動處理：
 * - 左轉前：只影響原車道同向車
 * - 左轉中：進入路口中央，500px 全影響
 * - 左轉後：只影響新車道同向車
 */
export const INFLUENCE_RANGE = {
  // 🔵 車道階段（A: 進場, B: 離開）
  ON_LANE: {
    OPPOSING: 0, // 🚨 車道上不影響對向車輛
    PERPENDICULAR: 0, // 🚨 車道上不影響垂直車輛
    SAME_DIRECTION: 200, // 同向車輛：影響前方 200px 內的車
  },

  // 🔴 路口中央階段（C: 通過停止線後）
  IN_INTERSECTION: {
    OPPOSING: 200, // 對向車輛：500px 半徑範圍
    PERPENDICULAR: 200, // 垂直車輛：500px 半徑範圍
    SAME_DIRECTION: 200, // 同向車輛：500px 半徑範圍（統一）
  },

  // 🎯 路口範圍判定閾值
  INTERSECTION_BOUNDS: {
    ENTRY_THRESHOLD: 0, // 進入路口：通過停止線（距路口 <= 0px）
    EXIT_THRESHOLD: -200, // 離開路口：距路口 < -200px 時視為已離開
  },
}

// ===== 恢復時間配置 =====
/**
 * ⏱️ 恢復階段的時間控制
 *
 * 採用分步恢復策略，避免車輛突然加速造成視覺突兀
 */
export const RECOVERY_TIMING = {
  STEP_DELAY_MS: 100, // 每步之間的延遲（毫秒）
  TOTAL_DURATION_MS: 300, // 總恢復時間（3步 × 100ms）
}

// ===== 調試配置 =====
/**
 * 🔧 開發調試用配置
 */
export const DEBUG_CONFIG = {
  // 控制台日誌開關
  LOG_STAGE_CHANGES: true, // 記錄階段變化
  LOG_SPEED_ADJUSTMENTS: true, // 🚨 臨時啟用：調試恢復問題
  LOG_AFFECTED_VEHICLES: true, // 記錄受影響的車輛

  // 視覺調試
  HIGHLIGHT_AFFECTED_VEHICLES: false, // 高亮顯示受影響的車輛（需實現）
  SHOW_CLEARANCE_ZONE: false, // 顯示清除區域範圍（需實現）
}

// ===== 工具函數 =====
/**
 * 根據救護車方向獲取對向方向
 * @param {string} ambulanceDirection - 救護車方向 ('east', 'west', 'south', 'north')
 * @returns {string} 對向方向
 */
export function getOppositeDirection(ambulanceDirection) {
  const opposites = {
    east: 'west',
    west: 'east',
    south: 'north',
    north: 'south',
  }
  return opposites[ambulanceDirection]
}

/**
 * 根據救護車方向獲取垂直方向列表
 * @param {string} ambulanceDirection - 救護車方向
 * @returns {string[]} 垂直方向數組
 */
export function getPerpendicularDirections(ambulanceDirection) {
  const perpendiculars = {
    east: ['south', 'north'],
    west: ['south', 'north'],
    south: ['east', 'west'],
    north: ['east', 'west'],
  }
  return perpendiculars[ambulanceDirection]
}

/**
 * 獲取可能與救護車衝突的所有車道
 * @param {string} ambulanceDirection - 救護車方向
 * @returns {string[]} 衝突車道列表（格式：'direction-laneNumber'）
 */
export function getConflictingLanes(ambulanceDirection) {
  const lanes = [1, 2, 3, 4]
  const conflictDirections = [
    getOppositeDirection(ambulanceDirection),
    ...getPerpendicularDirections(ambulanceDirection),
  ]

  const conflictingLanes = []
  conflictDirections.forEach((direction) => {
    lanes.forEach((lane) => {
      conflictingLanes.push(`${direction}-${lane}`)
    })
  })

  return conflictingLanes
}

// ===== 默認導出 =====
export default {
  AMBULANCE_STAGES,
  SPEED_MULTIPLIERS,
  DISTANCE_THRESHOLDS,
  INFLUENCE_RANGE,
  RECOVERY_TIMING,
  DEBUG_CONFIG,
  getOppositeDirection,
  getPerpendicularDirections,
  getConflictingLanes,
}
