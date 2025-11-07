/**
 * 🚦 綠燈時間預測配置文件
 *
 * 用途：調整 AI 模型預測的綠燈秒數，將其從 80-99 秒範圍縮放到 70-85 秒
 * 修改此文件可即時改變綠燈時間預測，無需修改核心邏輯
 *
 * @author Traffic System
 * @version 1.0.0
 */

export const GREEN_LIGHT_PREDICTION_CONFIG = {
  /**
   * ════════════════════════════════════════════════════════════════
   * 📊 【第 1 層】發送前數據正規化調整
   * ════════════════════════════════════════════════════════════════
   *
   * 在發送 API 數據到後端 AI 模型之前，對流量數據進行調整
   * 這會影響 AI 模型的輸入，進而影響預測結果
   *
   * 調整策略：
   * - 降低流量數據 → AI 認為交通量少 → 預測綠燈時間短
   * - 提高流量數據 → AI 認為交通量多 → 預測綠燈時間長
   */

  /**
   * 尖峰時段（07:00-09:00, 17:00-19:00）流量調整係數
   *
   * 預期效果：
   * - 0.80: 流量 ↓20% → 預測時間約 ↓20% (99秒 → ~79秒)
   * - 0.85: 流量 ↓15% → 預測時間約 ↓15% (99秒 → ~84秒) ⭐ 推薦
   * - 0.90: 流量 ↓10% → 預測時間約 ↓10% (99秒 → ~89秒)
   * - 0.95: 流量 ↓5%  → 預測時間約 ↓5%  (99秒 → ~94秒)
   * - 1.00: 流量不變   → 預測時間不變     (99秒 → 99秒)
   *
   * @type {number}
   * @default 0.85
   */
  PEAK_HOUR_VOLUME_ADJUSTMENT: 0.85,

  /**
   * 離峰時段（09:00-17:00）流量調整係數
   *
   * 預期效果：
   * - 0.80: 流量 ↓20% → 預測時間約 ↓20% (80秒 → ~64秒)
   * - 0.85: 流量 ↓15% → 預測時間約 ↓15% (80秒 → ~68秒)
   * - 0.90: 流量 ↓10% → 預測時間約 ↓10% (80秒 → ~72秒) ⭐ 推薦
   * - 0.95: 流量 ↓5%  → 預測時間約 ↓5%  (80秒 → ~76秒)
   * - 1.00: 流量不變   → 預測時間不變     (80秒 → 80秒)
   *
   * @type {number}
   * @default 0.90
   */
  OFF_PEAK_HOUR_VOLUME_ADJUSTMENT: 0.9,

  /**
   * 夜間時段（19:00-07:00）流量調整係數
   *
   * 預期效果：
   * - 0.85: 流量 ↓15% → 預測時間約 ↓15% (60秒 → ~51秒)
   * - 0.90: 流量 ↓10% → 預測時間約 ↓10% (60秒 → ~54秒) ⭐ 推薦
   * - 0.95: 流量 ↓5%  → 預測時間約 ↓5%  (60秒 → ~57秒)
   * - 1.00: 流量不變   → 預測時間不變     (60秒 → 60秒)
   *
   * @type {number}
   * @default 0.90
   */
  NIGHT_HOUR_VOLUME_ADJUSTMENT: 0.9,

  /**
   * ════════════════════════════════════════════════════════════════
   * 🎯 【第 2 層】預測結果時間映射
   * ════════════════════════════════════════════════════════════════
   *
   * 在接收到 AI 模型的預測結果後，對時間進行二次調整
   * 這是最終的調整層，直接影響用戶看到的綠燈秒數
   *
   * 調整策略：
   * - 係數 < 1.0: 預測時間變短 (99秒 → 85秒)
   * - 係數 = 1.0: 不調整 (保持原始預測)
   * - 係數 > 1.0: 預測時間變長 (but not recommended)
   */

  /**
   * 尖峰時段預測結果時間映射係數
   *
   * 說明：將 AI 預測的秒數乘以此係數
   *
   * 預期效果：
   * - 0.80: 預測 ↓20% (99秒 → ~79秒, 80秒 → ~64秒)
   * - 0.85: 預測 ↓15% (99秒 → ~84秒, 80秒 → ~68秒)
   * - 0.858: 預測 ↓14% (99秒 → ~85秒, 80秒 → ~69秒) ⭐ 推薦
   * - 0.90: 預測 ↓10% (99秒 → ~89秒, 80秒 → ~72秒)
   * - 1.00: 不調整 (保持原始值)
   *
   * 💡 提示：可與 PEAK_HOUR_VOLUME_ADJUSTMENT 組合使用以獲得更細緻的調整
   * 例：雙層調整可達到 85% × 85.8% ≈ 73% 效果
   *
   * @type {number}
   * @default 0.858
   */
  PEAK_HOUR_TIME_MAP: 0.858,

  /**
   * 離峰時段預測結果時間映射係數
   *
   * 說明：將 AI 預測的秒數乘以此係數
   *
   * 預期效果：
   * - 0.80: 預測 ↓20% (90秒 → ~72秒, 70秒 → ~56秒)
   * - 0.85: 預測 ↓15% (90秒 → ~76秒, 70秒 → ~59秒)
   * - 0.90: 預測 ↓10% (90秒 → ~81秒, 70秒 → ~63秒) ⭐ 推薦
   * - 0.95: 預測 ↓5%  (90秒 → ~85秒, 70秒 → ~66秒)
   * - 1.00: 不調整 (保持原始值)
   *
   * 💡 提示：可與 OFF_PEAK_HOUR_VOLUME_ADJUSTMENT 組合使用
   * 例：雙層調整可達到 90% × 90% = 81% 效果
   *
   * @type {number}
   * @default 0.90
   */
  OFF_PEAK_HOUR_TIME_MAP: 0.9,

  /**
   * 夜間時段預測結果時間映射係數
   *
   * 說明：將 AI 預測的秒數乘以此係數
   *
   * 預期效果：
   * - 0.80: 預測 ↓20% (60秒 → ~48秒, 50秒 → ~40秒)
   * - 0.85: 預測 ↓15% (60秒 → ~51秒, 50秒 → ~42秒)
   * - 0.90: 預測 ↓10% (60秒 → ~54秒, 50秒 → ~45秒) ⭐ 推薦
   * - 1.00: 不調整 (保持原始值)
   *
   * @type {number}
   * @default 0.90
   */
  NIGHT_HOUR_TIME_MAP: 0.9,

  /**
   * ════════════════════════════════════════════════════════════════
   * 🎚️ 【高級選項】精細控制
   * ════════════════════════════════════════════════════════════════
   */

  /**
   * 是否啟用數據正規化調整（第 1 層）
   *
   * - true: 發送前調整流量數據（推薦使用）
   * - false: 不調整，直接發送原始數據
   *
   * @type {boolean}
   * @default true
   */
  ENABLE_VOLUME_ADJUSTMENT: true,

  /**
   * 是否啟用時間映射調整（第 2 層）
   *
   * - true: 接收預測後調整時間（推薦使用）
   * - false: 不調整，使用原始預測值
   *
   * @type {boolean}
   * @default true
   */
  ENABLE_TIME_MAPPING: false,

  /**
   * 是否在控制台列印詳細的調整日誌
   *
   * - true: 在 DevTools Console 中顯示調整過程
   * - false: 靜默運行
   *
   * 💡 開發時推薦開啟，便於觀察調整效果
   *
   * @type {boolean}
   * @default true
   */
  ENABLE_DEBUG_LOG: true,

  /**
   * 最小綠燈時間（秒）
   * 如果調整後的時間低於此值，將使用此最小值
   *
   * @type {number}
   * @default 40
   */
  MIN_GREEN_LIGHT_SECONDS: 40,

  /**
   * 最大綠燈時間（秒）
   * 如果調整後的時間超過此值，將使用此最大值
   *
   * @type {number}
   * @default 120
   */
  MAX_GREEN_LIGHT_SECONDS: 120,

  /**
   * ════════════════════════════════════════════════════════════════
   * 📈 【調整指南】
   * ════════════════════════════════════════════════════════════════
   *
   * 🎯 目標：調整綠燈時間到 70-85 秒範圍
   *
   * 📋 常見調整場景：
   *
   * 1️⃣ 綠燈時間太長（>85秒）
   *    → 降低係數（例：0.85 → 0.80）
   *    → 同時調整兩層效果最好
   *    → 預期：每降低 5% 約減少 5 秒
   *
   * 2️⃣ 綠燈時間太短（<70秒）
   *    → 提高係數（例：0.80 → 0.85）
   *    → 同時調整兩層效果最好
   *    → 預期：每提高 5% 約增加 5 秒
   *
   * 3️⃣ 尖峰和離峰時段差異大
   *    → 分別調整尖峰和離峰係數
   *    → 例：尖峰 0.80，離峰 0.95
   *
   * 4️⃣ 精確控制（需要微調）
   *    → 使用雙層調整：
   *    → 第 1 層(發送前)：粗調 90% 或 95%
   *    → 第 2 層(結果後)：細調 85% 或 90%
   *
   * ⚡ 快速參考表：
   * ┌─────────────────────────────────────────────────────┐
   * │ 原始 │ 係數 │ 結果 │ 場景                        │
   * ├─────────────────────────────────────────────────────┤
   * │ 99秒 │0.80 │~79秒 │ 需要大幅縮短                │
   * │ 99秒 │0.85 │~84秒 │ 正常縮短（推薦）            │
   * │ 99秒 │0.90 │~89秒 │ 輕微縮短                    │
   * │ 80秒 │0.85 │~68秒 │ 中等縮短                    │
   * │ 80秒 │0.90 │~72秒 │ 輕微縮短（推薦）            │
   * │ 60秒 │0.90 │~54秒 │ 離峰微調                    │
   * └─────────────────────────────────────────────────────┘
   *
   * ════════════════════════════════════════════════════════════════
   */
}

/**
 * 🔧 幫助函數：根據當前時段獲取對應的係數
 *
 * @param {string} type - 調整類型：'volume' 或 'time'
 * @param {number} hour - 當前小時（0-23）
 * @returns {number} 對應的係數
 *
 * @example
 * // 獲取上午 8 點（尖峰）的流量調整係數
 * const coeff = getAdjustmentCoefficient('volume', 8)
 * // 返回：0.85
 */
export const getAdjustmentCoefficient = (type, hour = new Date().getHours()) => {
  // 判斷當前時段
  const isPeakHour = (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)
  const isNightHour = hour >= 19 || hour < 7

  if (type === 'volume') {
    if (isPeakHour) return GREEN_LIGHT_PREDICTION_CONFIG.PEAK_HOUR_VOLUME_ADJUSTMENT
    if (isNightHour) return GREEN_LIGHT_PREDICTION_CONFIG.NIGHT_HOUR_VOLUME_ADJUSTMENT
    return GREEN_LIGHT_PREDICTION_CONFIG.OFF_PEAK_HOUR_VOLUME_ADJUSTMENT
  } else if (type === 'time') {
    if (isPeakHour) return GREEN_LIGHT_PREDICTION_CONFIG.PEAK_HOUR_TIME_MAP
    if (isNightHour) return GREEN_LIGHT_PREDICTION_CONFIG.NIGHT_HOUR_TIME_MAP
    return GREEN_LIGHT_PREDICTION_CONFIG.OFF_PEAK_HOUR_TIME_MAP
  }

  return 1.0 // 預設不調整
}

/**
 * 🔧 幫助函數：應用綠燈時間調整
 *
 * @param {number} originalSeconds - 原始秒數
 * @param {number} hour - 當前小時
 * @returns {number} 調整後的秒數
 *
 * @example
 * // 調整 99 秒綠燈時間（假設現在是上午 8 點）
 * const adjusted = applyGreenLightAdjustment(99, 8)
 * // 返回：85（99 × 0.85 × 0.858 ≈ 73，再乘以另一個調整...）
 */
export const applyGreenLightAdjustment = (originalSeconds, hour = new Date().getHours()) => {
  const config = GREEN_LIGHT_PREDICTION_CONFIG

  // 如果禁用調整，直接返回原始值
  if (!config.ENABLE_VOLUME_ADJUSTMENT && !config.ENABLE_TIME_MAPPING) {
    return originalSeconds
  }

  let adjusted = originalSeconds

  // 應用時間映射調整（第 2 層）
  if (config.ENABLE_TIME_MAPPING) {
    const timeMapCoeff = getAdjustmentCoefficient('time', hour)
    adjusted = adjusted * timeMapCoeff

    if (config.ENABLE_DEBUG_LOG) {
      console.log(`🎯 [綠燈時間映射] ${originalSeconds}秒 × ${timeMapCoeff} = ${Math.round(adjusted)}秒`)
    }
  }

  // 限制在最小和最大值之間
  adjusted = Math.max(config.MIN_GREEN_LIGHT_SECONDS, Math.min(config.MAX_GREEN_LIGHT_SECONDS, adjusted))

  if (config.ENABLE_DEBUG_LOG) {
    console.log(`✅ [綠燈時間最終值] ${Math.round(adjusted)}秒`)
  }

  return Math.round(adjusted)
}

export default GREEN_LIGHT_PREDICTION_CONFIG
