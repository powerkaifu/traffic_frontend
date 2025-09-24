/**
 * index.js - 配置檔案統一匯出入口
 *
 * 這個檔案作為配置系統的單一匯入點
 * 方便其他模組統一管理所有配置項目
 *
 * 🎯 使用方式：
 * import { ANIMATION_CONFIG, speedConfig } from './config'
 */

// 從各個配置檔案匯入所有設定
import {
  ANIMATION_CONFIG,
  TRAFFIC_LIGHT_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  COLLISION_CONFIG,
  PATH_CONFIG,
  DEBUG_CONFIG,
} from './vehicleConfig.js'

import { speedConfig, lightConfig, vehicleGenerationConfig, roadConfig } from './trafficConfig.js'

// ===== 統一匯出所有配置 =====
export {
  // 來自 vehicleConfig.js 的行為配置
  ANIMATION_CONFIG,
  TRAFFIC_LIGHT_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  COLLISION_CONFIG,
  PATH_CONFIG,
  DEBUG_CONFIG,

  // 來自 trafficConfig.js 的系統配置
  speedConfig,
  lightConfig,
  vehicleGenerationConfig,
  roadConfig,
}

// ===== 預設配置集合 =====
/**
 * 🎛️ 完整的配置物件
 * 適用於需要存取所有配置的場景
 */
export default {
  // 車輛行為配置
  animation: ANIMATION_CONFIG,
  trafficLight: TRAFFIC_LIGHT_CONFIG,
  distance: DISTANCE_CONFIG,
  following: FOLLOWING_CONFIG,
  collision: COLLISION_CONFIG,
  path: PATH_CONFIG,
  debug: DEBUG_CONFIG,

  // 系統基礎配置
  speed: speedConfig,
  light: lightConfig,
  generation: vehicleGenerationConfig,
  road: roadConfig,
}

/**
 * 📚 快速參考指南：
 *
 * 🚗 車輛行為調整：
 * - ANIMATION_CONFIG：動畫速度、緩動效果、冷卻時間
 * - TRAFFIC_LIGHT_CONFIG：紅綠燈響應行為
 * - DISTANCE_CONFIG：車輛間距、安全距離
 * - FOLLOWING_CONFIG：跟車行為、速度計算
 * - COLLISION_CONFIG：碰撞檢測參數
 *
 * 🚦 系統基礎設定：
 * - speedConfig：各類車輛的速度範圍
 * - lightConfig：交通燈時間控制
 * - vehicleGenerationConfig：車輛生成頻率與機率
 * - roadConfig：道路幾何參數
 *
 * 🔧 匯入範例：
 * ```javascript
 * // 匯入特定配置
 * import { ANIMATION_CONFIG, speedConfig } from './config'
 *
 * // 匯入所有配置
 * import allConfig from './config'
 * const speed = allConfig.speed.small.max
 *
 * // 匯入多個配置
 * import {
 *   DISTANCE_CONFIG,
 *   FOLLOWING_CONFIG,
 *   lightConfig
 * } from './config'
 * ```
 */
