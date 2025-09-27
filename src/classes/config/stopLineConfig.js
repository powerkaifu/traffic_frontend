/**
 * 停止線配置文件
 * 集中管理所有停止線相關參數
 */

export const STOP_LINE_CONFIG = {
  // 檢測敏感度配置
  DETECTION: {
    SENSITIVITY: 2, // 在停止線前多少px觸發檢測
    ADJUSTMENT_THRESHOLD: 0.5, // 位置微調的最小閾值
  },

  // 停車目標位置配置
  TARGET_POSITION: {
    EAST: 5, // 東向：停止線前5px
    WEST: 5, // 西向：停止線前5px
    NORTH: 5, // 北向：停止線前5px
    SOUTH: 5, // 南向：停止線前5px
  },

  // 交通燈邏輯相關距離
  TRAFFIC_LIGHT: {
    QUEUE_DISTANCE: 10, // 排隊判斷距離
    APPROACH_DISTANCE: 5, // 接近停車判斷距離
  },

  // 停止線狀態定義
  STATES: {
    APPROACHING: 'approaching',
    AT_STOP_LINE: 'at_stop_line',
    PASSED: 'passed',
    WAITING: 'waiting',
  },
}

// 從 trafficConfig 導入停止線偏移配置
import { stopLineConfig } from './trafficConfig.js'
export const STOP_LINE_OFFSETS = stopLineConfig.directionOffsets
