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
  WARNING_DISTANCE: 250, // 250px：提前預警，給系統準備時間

  // 階段 2️⃣：路權清除階段 - 主動清空衝突車道
  CLEARANCE_DISTANCE: 200, // 200px：開始執行減速/停車指令

  // 階段 3️⃣：通過階段 - 救護車進入路口核心區域
  TRANSIT_DISTANCE: 100, // 100px：進入路口，維持清空狀態

  // 階段 4️⃣：恢復階段 - 救護車已通過，恢復正常交通
  RECOVERY_DISTANCE: -150, // -150px：已完全通過路口，開始恢復
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
 */
export const SPEED_MULTIPLIERS = {
  // === 對向車輛（與救護車反向同軸線）===
  OPPOSING_EMERGENCY_BRAKE: 0.3, // 對向車輛在路口內：緊急剎車
  OPPOSING_SLOW: 0.5, // 對向車輛在路口外：減速觀望

  // === 垂直車道（與救護車垂直方向）===
  PERPENDICULAR_ACCELERATE: 1.2, // 垂直車道綠燈且距離很近：加速通過清空路口
  PERPENDICULAR_STOP: 0.0, // 垂直車道中距離：完全停止
  PERPENDICULAR_SLOW: 0.6, // 垂直車道遠距離：減速觀望

  // === 同向車輛（與救護車同方向）===
  SAME_DIRECTION_YIELD: 0.2, // 同向前方車輛：大幅減速靠邊避讓

  // === 恢復階段漸進速度 ===
  RECOVERY_STEP_1: 0.6, // 恢復第一步
  RECOVERY_STEP_2: 0.8, // 恢復第二步
  RECOVERY_STEP_3: 1.0, // 恢復第三步（正常）
}

// ===== 距離判定閾值配置 =====
/**
 * 📏 各類車輛行為判定的距離閾值
 */
export const DISTANCE_THRESHOLDS = {
  // 垂直車道車輛距離路口中心的判定
  PERPENDICULAR_ACCELERATE_THRESHOLD: 50, // < 50px：加速通過
  PERPENDICULAR_STOP_THRESHOLD: 150, // 50-150px：停止

  // 對向車輛距離路口中心的判定
  OPPOSING_EMERGENCY_THRESHOLD: 100, // < 100px：緊急剎車
  OPPOSING_SLOW_THRESHOLD: 200, // 100-200px：減速

  // 現有避讓半徑（擴展使用）
  YIELD_RADIUS: 150, // 150px：同向避讓範圍
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
  LOG_SPEED_ADJUSTMENTS: false, // 記錄速度調整（會產生大量日誌）
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
  RECOVERY_TIMING,
  DEBUG_CONFIG,
  getOppositeDirection,
  getPerpendicularDirections,
  getConflictingLanes,
}
