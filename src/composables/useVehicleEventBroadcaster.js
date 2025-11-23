/**
 * useVehicleEventBroadcaster.js
 *
 * Vue Composable - 管理全域事件廣播器的單例
 *
 * 作用：
 * - 確保整個應用只有一個 VehicleEventBroadcaster 實例
 * - 提供 Vue 風格的 API
 */

import VehicleEventBroadcaster from '../classes/VehicleEventBroadcaster.js'
import { logger } from '../utils/logger.js'

// 單例實例
let broadcasterInstance = null

/**
 * 獲取全域事件廣播器實例（單例模式）
 * @returns {VehicleEventBroadcaster}
 */
export function useVehicleEventBroadcaster() {
  if (!broadcasterInstance) {
    broadcasterInstance = new VehicleEventBroadcaster()
    logger.log('🆕 [useVehicleEventBroadcaster] 創建新的 broadcaster 實例')
  }
  return broadcasterInstance
}

/**
 * 銷毀全域事件廣播器實例
 */
export function destroyVehicleEventBroadcaster() {
  if (broadcasterInstance) {
    logger.log('🛑 [useVehicleEventBroadcaster] 銷毀 broadcaster 實例')
    broadcasterInstance.destroy()
    broadcasterInstance = null
  }
}

/**
 * 獲取廣播器統計資訊（調試用）
 * @returns {Object|null}
 */
export function getVehicleEventBroadcasterStats() {
  return broadcasterInstance ? broadcasterInstance.getStats() : null
}
