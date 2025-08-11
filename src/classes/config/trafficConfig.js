/**
 * trafficConfig.js - 交通模擬系統的統一設定檔
 * 遵循「單一事實來源 (Single Source of Truth)」原則，
 * 將共享的設定（如車輛速度）集中管理。
 */

// 速度設定 (單位: km/h)
// 這是所有車輛速度的唯一來源。
export const speedConfig = {
  large: { min: 20, max: 30 }, // 大型車速度範圍
  small: { min: 30, max: 40 }, // 小型車速度範圍
  motor: { min: 40, max: 50 }, // 機車速度範圍
}

// 自動為每個速度範圍計算平均值，方便其他模組直接使用
Object.values(speedConfig).forEach((range) => {
  range.avg = Math.round((range.min + range.max) / 2)
})
