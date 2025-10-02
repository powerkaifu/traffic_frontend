/**
 * 停止線配置文件
 * 集中管理所有停止線相關參數
 */

export const STOP_LINE_CONFIG = {
  // 檢測敏感度配置
  DETECTION: {
    SENSITIVITY: 10, // 在停止線前多少px觸發檢測（增加靈敏度，讓車輛更早檢測到停止線）
    ADJUSTMENT_THRESHOLD: 0.5, // 位置微調的最小閾值
  },

  // 停車目標位置配置
  TARGET_POSITION: {
    EAST: 0, // 東向：車頭剛好對齊停止線
    WEST: 0, // 西向：車頭剛好對齊停止線
    NORTH: 0, // 北向：車頭剛好對齊停止線
    SOUTH: 0, // 南向：車頭剛好對齊停止線
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
