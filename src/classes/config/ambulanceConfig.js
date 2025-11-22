/**
 * ambulanceConfig.js - 救護車被動感應系統配置
 *
 * 新架構：每輛車自己偵測救護車距離並調整速度
 * 由 Vehicle.updateEmergencyProximity() 處理
 */

// ===== 距離閾值配置 =====
/**
 * 🎯 車輛感應救護車的距離閾值（像素）
 *
 * 每輛車會計算到最近救護車的距離，根據距離決定速度倍數
 */
export const DISTANCE_THRESHOLDS = {
  STOP: 120, // < 120px: 完全停止 (0.0x)
  SLOW: 250, // 120-250px: 極慢速度 (0.15x) - 提前減速
  YIELD: 350, // 250-400px: 減速 (0.3x) - 預警範圍擴大
  // > 400px: 正常速度 (1.0x) - 不受影響
}

// ===== 速度倍數配置 =====
/**
 * 🎛️ 不同距離對應的速度倍數
 */
export const SPEED_MULTIPLIERS = {
  STOP: 0.0, // 完全停止
  SLOW: 0.15, // 極慢速度（更明顯）
  YIELD: 0.3, // 減速（更明顯）
  NORMAL: 1.0, // 正常速度
}

// ===== 默認導出 =====
export default {
  DISTANCE_THRESHOLDS,
  SPEED_MULTIPLIERS,
}
