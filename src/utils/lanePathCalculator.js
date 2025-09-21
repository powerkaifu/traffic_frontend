/**
 * 車道路徑計算工具
 * 用於計算交通模擬中各個車道的路徑
 */

/**
 * 車道路徑配置物件
 * 包含所有編輯過的路徑數據，方便統一管理和更新
 *
 * 🔧 更新路徑的方法：
 * 1. 直接修改此物件中的路徑字串
 * 2. 或使用 updateLanePathsConfig() 函數來批次更新
 *
 * 📝 路徑命名規則：
 * - eastLane1Straight: 東向第1車道直行路徑 (可編輯)
 * - eastLane2Straight: 東向第2車道直行路徑
 * - eastLane3Straight: 東向第3車道直行路徑
 * - eastLane4Straight: 東向第4車道直行路徑 (可編輯)
 * 其他方向車道依此類推
 */
const LANE_PATHS_CONFIG = {
  eastLane1Straight: 'M-300,521C100,521,300,521,700,521,1100,521,1300,521,1700,521',
  eastLane2Straight: 'M0,560 L1400,560',
  eastLane3Straight: 'M0,599 L1400,599',
  eastLane4Straight:
    'M-330.922,652.46C-110.929,652.46,275.092,649.552,510.73,649.879,510.564,807.706,283.239,1198.737,281.722,1314.506',
  westLane1Straight: 'M1700,480C1300,480,1100,480,700,480,300,480,100,480,-300,480',
  westLane2Straight: 'M1400,441 L0,441',
  westLane3Straight: 'M1400,402 L0,402',
  westLane4Straight:
    'M1429.152,301.616C1419.4885,301.61725,1141.16175,266.4605,1124.496,267.314,1125.515,186.283,83.569,-301.227,81.026,-560.314',
  southLane1Straight: 'M680,-300C680,200,680,600,680,500,680,800,680,1000,680,1300',
  southLane2Straight: 'M640,-300 L640,1300',
  southLane3Straight: 'M601,-300 L601,1300',
  southLane4Straight: 'M82.661,258.148C82.661,258.148,536.677,-308.806,536.677,-247.139',
  northLane1Straight: 'M720,1300C720,800,720,600,720,500,720,400,720,200,720,-300',
  northLane2Straight: 'M760,1300 L760,-300',
  northLane3Straight: 'M799,1300 L799,-300',
  northLane4Straight:
    'M847.86,1296.234C847.86,1080.377,846.066,765.659,848.953,646.073,1021.946,645.234,1411.513,644.693,1411.513,644.693',
}
/**
 * 創建車道路徑計算器
 * @param {HTMLElement} containerElement - 交通路口容器元素
 * @returns {Object} 包含所有車道路徑計算函數的對象
 */

export function createLanePathCalculator() {
  // ==================== 往東車道路徑 ====================

  // 往東車道 1 路徑 - 📝可編輯
  const getEastLane1Path = () => {
    return LANE_PATHS_CONFIG.eastLane1Straight
  }

  // 往東車道 2 路徑
  const getEastLane2Path = () => {
    return LANE_PATHS_CONFIG.eastLane2Straight
  }

  // 往東車道 3 路徑
  const getEastLane3Path = () => {
    return LANE_PATHS_CONFIG.eastLane3Straight
  }
  // 往東車道 4 路徑 - 📝可編輯
  const getEastLane4Path = () => {
    return LANE_PATHS_CONFIG.eastLane4Straight
  }

  // ==================== 往西車道路徑 ====================
  // 往西車道 1 路徑 - 📝可編輯
  const getWestLane1Path = () => {
    return LANE_PATHS_CONFIG.westLane1Straight
  }
  // 往西車道 2 路徑
  const getWestLane2Path = () => {
    return LANE_PATHS_CONFIG.westLane2Straight
  }
  // 往西車道 3 路徑
  const getWestLane3Path = () => {
    return LANE_PATHS_CONFIG.westLane3Straight
  }
  // 往西車道 4 路徑 - 📝可編輯
  const getWestLane4Path = () => {
    return LANE_PATHS_CONFIG.westLane4Straight
  }

  // ==================== 往南車道路徑 ====================
  // 往南車道 1 路徑 - 📝可編輯
  const getSouthLane1Path = () => {
    return LANE_PATHS_CONFIG.southLane1Straight
  }
  // 往南車道 2 路徑
  const getSouthLane2Path = () => {
    return LANE_PATHS_CONFIG.southLane2Straight
  }
  // 往南車道 3 路徑
  const getSouthLane3Path = () => {
    return LANE_PATHS_CONFIG.southLane3Straight
  }
  // 往南車道 4 路徑 - 📝可編輯
  const getSouthLane4Path = () => {
    return LANE_PATHS_CONFIG.southLane4Straight
  }

  // ==================== 往北車道路徑 ====================
  // 往北車道 1 路徑 - 📝可編輯
  const getNorthLane1Path = () => {
    return LANE_PATHS_CONFIG.northLane1Straight
  }
  // 往北車道 2 路徑
  const getNorthLane2Path = () => {
    return LANE_PATHS_CONFIG.northLane2Straight
  }
  // 往北車道 3 路徑
  const getNorthLane3Path = () => {
    return LANE_PATHS_CONFIG.northLane3Straight
  }
  // 往北車道 4 路徑 - 📝可編輯
  const getNorthLane4Path = () => {
    return LANE_PATHS_CONFIG.northLane4Straight
  }

  // 返回所有路徑計算函數
  return {
    // 東向車道
    getEastLane1Path,
    getEastLane2Path,
    getEastLane3Path,
    getEastLane4Path,

    // 西向車道
    getWestLane1Path,
    getWestLane2Path,
    getWestLane3Path,
    getWestLane4Path,

    // 南向車道
    getSouthLane1Path,
    getSouthLane2Path,
    getSouthLane3Path,
    getSouthLane4Path,

    // 北向車道
    getNorthLane1Path,
    getNorthLane2Path,
    getNorthLane3Path,
    getNorthLane4Path,
  }
}

/**
 * 更新車道路徑配置
 * 方便貼上新的路徑物件來更新所有路徑
 * @param {Object} newPathsConfig - 新的路徑配置物件
 *
 * 使用範例：
 * updateLanePathsConfig({
 *   eastLane1Straight: "M-300,521 C100,521...",
 *   eastLane2Straight: "M0,560 L1400,560",
 *   // ... 其他路徑
 * })
 */
export function updateLanePathsConfig(newPathsConfig) {
  Object.assign(LANE_PATHS_CONFIG, newPathsConfig)
  console.log('車道路徑配置已更新:', newPathsConfig)
}

/**
 * 獲取當前車道路徑配置
 * @returns {Object} 當前的路徑配置物件
 */
export function getLanePathsConfig() {
  return { ...LANE_PATHS_CONFIG }
}

/**
 * 獲取所有車道路徑函數名稱列表
 * @returns {Array<string>} 車道路徑函數名稱陣列
 */
export function getAllLanePathFunctions() {
  return [
    'getEastLane1Path',
    'getEastLane2Path',
    'getEastLane3Path',
    'getEastLane4Path',
    'getWestLane1Path',
    'getWestLane2Path',
    'getWestLane3Path',
    'getWestLane4Path',
    'getSouthLane1Path',
    'getSouthLane2Path',
    'getSouthLane3Path',
    'getSouthLane4Path',
    'getNorthLane1Path',
    'getNorthLane2Path',
    'getNorthLane3Path',
    'getNorthLane4Path',
  ]
}
