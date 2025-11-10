/**
 * LaneConfig.js - 車道配置集中管理
 * 所有與車道相關的常數統一定義於此
 * 確保車道寬度、數量等參數在整個應用中保持一致
 */

export const LaneConfig = {
  // 基本車道配置
  LANE_WIDTH: 60, // 每條車道寬度（像素）
  LANE_COUNT: 4, // 每個方向的車道數
  LANE_SPACING: 5, // 車道間距（像素）

  // 計算衍生的值
  get TOTAL_WIDTH() {
    return this.LANE_WIDTH * this.LANE_COUNT + this.LANE_SPACING * (this.LANE_COUNT - 1)
  },

  // 車道編號和標籤
  LANE_LABELS: {
    1: '快車道', // 第 1 車道（最靠邊）
    2: '行車道 1', // 第 2 車道
    3: '行車道 2', // 第 3 車道
    4: '超車道', // 第 4 車道（最中間）
  },

  // 方向相關配置
  DIRECTIONS: {
    NORTH: {
      label: '北方',
      angle: 0,
      id: 'north',
    },
    SOUTH: {
      label: '南方',
      angle: 180,
      id: 'south',
    },
    EAST: {
      label: '東方',
      angle: 90,
      id: 'east',
    },
    WEST: {
      label: '西方',
      angle: 270,
      id: 'west',
    },
  },

  // 路口配置
  INTERSECTION: {
    WIDTH: 300, // 路口寬度
    HEIGHT: 300, // 路口高度
    BORDER_WIDTH: 2, // 邊線寬度
    STOP_LINE_WIDTH: 5, // 停止線寬度
  },

  // 車道位置計算方法
  getLaneX(laneNumber) {
    // laneNumber: 1 ~ LANE_COUNT
    return (laneNumber - 1) * (this.LANE_WIDTH + this.LANE_SPACING) + this.LANE_WIDTH / 2
  },

  getLaneY(laneNumber) {
    // 同上
    return (laneNumber - 1) * (this.LANE_WIDTH + this.LANE_SPACING) + this.LANE_WIDTH / 2
  },

  // 驗證車道編號
  isValidLane(laneNumber) {
    return laneNumber >= 1 && laneNumber <= this.LANE_COUNT
  },

  // 驗證方向
  isValidDirection(direction) {
    return ['north', 'south', 'east', 'west'].includes(direction?.toLowerCase())
  },
}

// 為了向後兼容，導出常用常數
export const { LANE_WIDTH, LANE_COUNT, LANE_SPACING } = LaneConfig
