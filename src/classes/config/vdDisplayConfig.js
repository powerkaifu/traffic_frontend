/**
 * VD 數據顯示映射配置系統
 * ═══════════════════════════════════════════════════════════════════
 *
 * 目的：解決訓練數據 (≤50 輛) 與視覺展示 (需要 50-150 輛) 的矛盾
 *
 * 核心概念：
 * 1. 訓練數據：原始 VD 特徵 (1-50 輛) → 發送給後端模型
 * 2. 顯示數據：經過縮放 (50-150 輛) → 在畫面上視覺展示
 * 3. 生成間隔：根據目標顯示流量動態計算
 *
 * ⚠️ 重要：發送給後端的仍是原始數據，只有前端顯示會縮放
 */

export const VD_DISPLAY_CONFIG = {
  /**
   * ═══════════════════════════════════════════════════════════════
   * 尖峰時段配置 (Peak Hours: 7-9, 17-19)
   * ═══════════════════════════════════════════════════════════════
   */
  peak_hours: {
    // 訓練數據特徵範圍 (發送給後端)
    vd_train_volume_min: 20,
    vd_train_volume_max: 30,

    // 目標顯示流量 (在畫面上展示)
    // 💡 微調提示：增加這個值讓畫面更擁擠，減少讓畫面更寬鬆
    display_volume_min: 70,
    display_volume_max: 105,

    // 自動計算的縮放倍數 (基於min值)
    // display_volume_min / vd_train_volume_min = 70 / 20 = 3.5x
    display_scale: 3.5,

    // 生成間隔 (秒)
    // 💡 微調提示：減小值 (如 0.6) 生成更快；增大值 (如 1.0) 生成更慢
    generation_interval: 0.8,

    // 時段描述
    label: '尖峰 (Peak)',
    description: '目標：流暢的車流，視覺上明顯擁擠',
  },

  /**
   * ═══════════════════════════════════════════════════════════════
   * 離峰時段配置 (Off-Peak: 10-16, 20-23)
   * ═══════════════════════════════════════════════════════════════
   */
  off_peak: {
    // 訓練數據特徵範圍
    vd_train_volume_min: 5,
    vd_train_volume_max: 10,

    // 目標顯示流量
    // 💡 微調提示：調整這個值來改變離峰的「擁擠感」
    display_volume_min: 30,
    display_volume_max: 50,

    // 自動計算的縮放倍數
    // display_volume_min / vd_train_volume_min = 30 / 5 = 6.0x
    display_scale: 6.0,

    // 生成間隔
    // 💡 微調提示：原本 5.8s 可能顯示不夠多；試試 2.5s
    generation_interval: 2.5,

    label: '離峰 (Off-Peak)',
    description: '目標：稀疏的車流，視覺上明顯寬鬆',
  },

  /**
   * ═══════════════════════════════════════════════════════════════
   * 凌晨時段配置 (Late Night: 0-6)
   * ═══════════════════════════════════════════════════════════════
   */
  late_night: {
    // 訓練數據特徵範圍
    vd_train_volume_min: 1,
    vd_train_volume_max: 5,

    // 目標顯示流量
    // 💡 微調提示：調整來改變凌晨的稀疏程度
    display_volume_min: 10,
    display_volume_max: 20,

    // 自動計算的縮放倍數
    // display_volume_min / vd_train_volume_min = 10 / 1 = 10.0x
    display_scale: 10.0,

    // 生成間隔
    // 💡 微調提示：凌晨最稀疏，間隔最長
    generation_interval: 4.0,

    label: '凌晨 (Late Night)',
    description: '目標：極稀疏的車流，視覺上非常空曠',
  },
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * 🔧 快速微調指南
 * ═══════════════════════════════════════════════════════════════════
 *
 * 問題：尖峰時期看起來不夠擁擠？
 * 解決：減小 generation_interval (如 0.6 改為 0.5)
 *       或增大 display_volume_max (如 105 改為 120)
 *
 * 問題：離峰時期還是看起來很擁擠？
 * 解決：增大 generation_interval (如 2.5 改為 3.5)
 *       或減小 display_volume_max (如 50 改為 40)
 *
 * 問題：凌晨時期找不到車？
 * 解決：增大 display_volume_max (如 20 改為 30)
 *       或減小 generation_interval (如 4.0 改為 3.0)
 *
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * 獲取指定時段的配置
 * @param {string} timePeriod - 時段名稱 ('peak_hours', 'off_peak', 'late_night')
 * @returns {Object} 該時段的完整配置
 */
export function getDisplayConfig(timePeriod) {
  return VD_DISPLAY_CONFIG[timePeriod] || VD_DISPLAY_CONFIG.off_peak
}

/**
 * 計算顯示用的車輛數量 (應用縮放倍數)
 * @param {number} trainingVolumeT - 訓練數據流量 (1-50)
 * @param {string} timePeriod - 時段名稱
 * @returns {number} 顯示用的流量 (縮放後)
 */
export function calculateDisplayVolume(trainingVolumeT, timePeriod) {
  const config = getDisplayConfig(timePeriod)
  const scaled = Math.round(trainingVolumeT * config.display_scale)

  // 確保在目標範圍內
  return Math.max(config.display_volume_min, Math.min(scaled, config.display_volume_max))
}

/**
 * 計算最優生成間隔 (基於目標顯示流量)
 * @param {string} timePeriod - 時段名稱
 * @param {number} simulationDuration - 模擬時長 (秒，預設 300 = 5 分鐘)
 * @returns {Object} 包含間隔和統計信息
 */
export function calculateGenerationMetrics(timePeriod, simulationDuration = 300) {
  const config = getDisplayConfig(timePeriod)

  // 基於目標顯示流量計算
  const avgDisplayVolume = (config.display_volume_min + config.display_volume_max) / 2
  const calculatedInterval = (simulationDuration / avgDisplayVolume).toFixed(2)

  return {
    // 配置中的間隔
    configured_interval: config.generation_interval,

    // 基於顯示流量計算的間隔
    calculated_interval: parseFloat(calculatedInterval),

    // 該間隔下的預期車輛數/分鐘
    vehicles_per_minute_configured: (60 / config.generation_interval).toFixed(1),
    vehicles_per_minute_calculated: (60 / calculatedInterval).toFixed(1),

    // 5分鐘內的預期車輛總數
    expected_vehicles_5min_configured: Math.round(300 / config.generation_interval),
    expected_vehicles_5min_calculated: Math.round(simulationDuration / calculatedInterval),
  }
}

/**
 * 生成配置預覽 (用於 console 輸出或 UI 顯示)
 * @returns {string} 格式化的配置摘要
 */
export function generateConfigPreview() {
  let preview = `
╔════════════════════════════════════════════════════════════════╗
║           VD 顯示映射配置預覽 (Display Mapping Config)          ║
╚════════════════════════════════════════════════════════════════╝

`

  Object.entries(VD_DISPLAY_CONFIG).forEach(([key, config]) => {
    const metrics = calculateGenerationMetrics(key)
    preview += `
【${config.label}】
  描述: ${config.description}

  訓練數據範圍:   ${config.vd_train_volume_min}-${config.vd_train_volume_max} 輛 (發送給後端)
  顯示流量目標:   ${config.display_volume_min}-${config.display_volume_max} 輛 (畫面展示)
  縮放倍數:       ${config.display_scale.toFixed(1)}x
  生成間隔:       ${config.generation_interval}s (每輛車生成間隔)

  預期流量統計:
    - 每分鐘生成:   ${metrics.vehicles_per_minute_configured} 輛
    - 5分鐘預期:    ${metrics.expected_vehicles_5min_configured} 輛
    - 10分鐘預期:   ${metrics.expected_vehicles_5min_configured * 2} 輛
`
  })

  preview += `
╔════════════════════════════════════════════════════════════════╗
║ 💡 提示：直接編輯上面的 generation_interval 和 display_volume   ║
║    就能立即改變行為。刷新頁面後新設定會生效。                  ║
╚════════════════════════════════════════════════════════════════╝
`
  return preview
}

/**
 * 導出所有配置用於調試
 */
export function exportConfigForDebug() {
  return {
    config: VD_DISPLAY_CONFIG,
    preview: generateConfigPreview(),
    allMetrics: {
      peak_hours: calculateGenerationMetrics('peak_hours'),
      off_peak: calculateGenerationMetrics('off_peak'),
      late_night: calculateGenerationMetrics('late_night'),
    },
  }
}
