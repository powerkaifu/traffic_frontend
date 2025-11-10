/**
 * ColorConstants.js - 顏色常數集中管理
 * 所有應用中的顏色常數統一定義在此
 * 便於主題切換、顏色一致性管理
 */

export const ColorConstants = {
  // 信號燈顏色
  TRAFFIC_LIGHT: {
    RED: '#FF0000', // 紅燈
    YELLOW: '#FFFF00', // 黃燈
    GREEN: '#00FF00', // 綠燈
  },

  // UI 元素顏色
  UI: {
    PRIMARY: '#1976D2', // 主色
    SECONDARY: '#424242', // 次要色
    SUCCESS: '#4CAF50', // 成功
    ERROR: '#F44336', // 錯誤
    WARNING: '#FF9800', // 警告
    INFO: '#2196F3', // 信息
  },

  // 車輛顏色
  VEHICLE: {
    MOTOR: '#FFA500', // 機車 - 橙色
    SMALL: '#4169E1', // 小客車 - 皇家藍
    LARGE: '#DC143C', // 大型車 - 深紅色
    SELECTED: '#00FFFF', // 已選中 - 青色
  },

  // 背景和邊框
  BACKGROUND: {
    PRIMARY: '#FFFFFF', // 主背景
    SECONDARY: '#F5F5F5', // 次要背景
    DARK: '#121212', // 深色背景
  },

  // 文字顏色
  TEXT: {
    PRIMARY: '#000000', // 主文字
    SECONDARY: '#666666', // 次要文字
    LIGHT: '#FFFFFF', // 淺色文字
  },

  // 狀態指示色
  STATUS: {
    ACTIVE: '#4CAF50', // 激活 - 綠色
    INACTIVE: '#9E9E9E', // 未激活 - 灰色
    LOADING: '#FF9800', // 加載中 - 橙色
    ERROR: '#F44336', // 錯誤 - 紅色
  },
}

// 為了向後兼容，導出单個常數
export const { TRAFFIC_LIGHT, UI, VEHICLE, BACKGROUND, TEXT, STATUS } = ColorConstants
