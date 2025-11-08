/**
 * 停止線配置文件
 * 集中管理所有停止線相關參數
 */

export const STOP_LINE_CONFIG = {
  // 檢測敏感度配置
  DETECTION: {
    SENSITIVITY: 10, // ✅ P3 修復: 從 10 提高到 15 - 給予系統更多反應時間以捕捉高速車輛
    ADJUSTMENT_THRESHOLD: 0.5, // 位置微調的最小閾值
    PROXIMITY_RANGE: 50, // 停止線附近區域範圍（px）- isNearStopLine 使用
  },

  // 停車目標位置配置（單位：px）
  // 正值：車輛停在停止線前（距離停止線 N px）
  // 負值：車輛停在停止線後（越過停止線 N px）
  // 0：車頭剛好對齊停止線
  TARGET_POSITION: {
    EAST: -2, // 東向：0 = 車頭對齊停止線，正值 = 停在停止線前
    WEST: -2, // 西向：0 = 車頭對齊停止線，正值 = 停在停止線前
    NORTH: -5, // 北向：0 = 車頭對齊停止線，正值 = 停在停止線前
    SOUTH: -5, // 南向：0 = 車頭對齊停止線，正值 = 停在停止線前
  },

  // 交通燈邏輯相關距離
  TRAFFIC_LIGHT: {
    QUEUE_DISTANCE: 10, // 排隊判斷距離
    APPROACH_DISTANCE: 5, // 接近停車判斷距離（靠近停止線多少px開始準備停車）
  },

  // 車輛配置相關（getVehicleConfig 使用）
  VEHICLE_CONFIG: {
    STOP_LINE_BUFFER: 5, // 停止線緩衝距離
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
