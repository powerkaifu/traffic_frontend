/**
 * ambulanceConfig.js - 救護車被動感應系統配置
 *
 * 新架構：每輛車自己偵測救護車距離並調整速度
 * 由 Vehicle.updateEmergencyProximity() 處理
 */

/**
 * 🚑 救護車偵測與避讓配置
 * 集中管理所有救護車相關的參數
 */

// 🎯 中央區域範圍配置（對向/垂直車輛互相偵測的區域）
export const CENTRAL_ZONE_CONFIG = {
  MIN_PROGRESS: 0.1, // 中央區域起始點（路徑進度 10%）
  MAX_PROGRESS: 0.5, // 中央區域結束點（路徑進度 50%）
  // 說明：對向/垂直車輛只有在雙方都在此區域內時才會互相避讓
  // 同向車輛永遠互相偵測，不受此限制
}

// 📏 距離閾值配置（根據距離決定減速程度）
export const DISTANCE_THRESHOLDS = {
  STOP: 120, // < 120px: 完全停止 (0.0x)
  SLOW: 250, // 120-250px: 極慢速度 (0.15x) - 提前減速
  YIELD: 350, // 250-350px: 減速 (0.3x) - 預警範圍擴大
  // > 350px: 正常速度 (1.0x) - 不受影響
}

// 🚦 速度倍數配置（不同距離下的速度調整）
export const SPEED_MULTIPLIERS = {
  STOP: 0.0, // 完全停止
  SLOW: 0.15, // 極慢速度（更明顯）
  YIELD: 0.3, // 減速（更明顯）
  NORMAL: 1.0, // 正常速度
}

// 🚨 救護車生成控制配置（防止連點濫用）
export const SPAWN_CONTROL = {
  COOLDOWN_SECONDS: 4, // ⚙️ 冷卻時間（秒數）- 改這個參數就能變動冷卻時間
  MAX_ACTIVE_AMBULANCES: 3, // 同時存在的最大救護車數量
  SHOW_COOLDOWN_TOAST: true, // 是否顯示冷卻提示
}

// ===== 救護車生成配置 =====
/**
 * 🚑 控制救護車的自動生成行為
 * 每次生成後，會在 MIN_INTERVAL ~ MAX_INTERVAL 之間隨機選擇下次生成時間
 */
export const SPAWN_CONFIG = {
  ENABLED: true, // 是否啟用隨機救護車生成
  MIN_INTERVAL: 120000, // 最小間隔（120秒）
  MAX_INTERVAL: 300000, // 最大間隔（300秒）
}

// ===== 默認導出 =====
export default {
  DISTANCE_THRESHOLDS,
  SPEED_MULTIPLIERS,
  SPAWN_CONFIG,
}
