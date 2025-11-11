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
  eastLane1Straight:
    'M-300,521C-180,521,-96.957,519.724,-7.286,519.825,201.949,520.056,366.4284,521.5501,541.147,519.581,631.133,516.244,713.663,488.456,721.795,346.294,724.381,161.668,715.632,-218.348,714.656,-302.695',
  eastLane2Straight: 'M-200,560C-100,560,100,560,300,560,600,560,900,560,1400,560',
  eastLane3Straight: 'M-200,599C-100,599,100,599,300,599,600,599,900,599,1400,599',
  eastLane4Straight:
    'M-330.922,652.46C-242.9248,652.46,-160.868,644.768,-30.277,643.961,165.601,642.749,547.41,635.268,573.922,649.867,583.4341,655.1047,582.432,717.392,570.581,775.908,555.406,850.836,558.2782,1218.0057,557.224,1299.044',
  westLane1Straight:
    'M1416.063,481.404C1397.83665,481.404,1061.244,482.988,847.669,482.245,663.964,485.0992,670.889,652.06,677.918,961.814,680.042,1112.826,679.177,1255.225,676.905,1292.447',
  westLane2Straight: 'M1400,441 L0,441',
  westLane3Straight: 'M1400,402 L0,402',
  westLane4Straight:
    'M1410.879,356.436C1409.4084,356.436,1247.815,357.703,1094.623,357.888,1007.80825,357.98405,905.246,360.52,844.309,358.556,816.045,357.645,819.738,285.069,832.652,183.815,835.737,16.586,844.1325,-217.2169,844.776,-290.715',
  southLane1Straight:
    'M681.404,-297.187C681.404,-293.453,678.558,142.478,680.972,371.7,701.439,472.207,770.86,529.376,911.137,523.332,1144.311,522.757,1425.7389,522.6191,1427.789,522.688',
  southLane2Straight: 'M640,-300 L640,1300',
  southLane3Straight: 'M601,-300 L601,1300',
  southLane4Straight:
    'M562,-300C562,-60,568.635,237.762,563.503,357.023,562.436,381.759,441.668,371.195,337.722,361.25,235.209,355.87,155.0295,360.16,-23.79,356.54',
  northLane1Straight:
    'M720,1300C720,975,720.19,775.315,720.344,638.739,723.663,550.055,634.038,476.792,542.889,480.319,400.88,480.115,284.254,482.488,5.942,481.526',
  northLane2Straight: 'M760,1300 L760,-300',
  northLane3Straight: 'M799,1300 L799,-300',
  northLane4Straight:
    'M839.459,1301.833C839.459,1127.52767,835.796,768.989,835.993,661.642,836.027,642.698,837.53925,631.5777,837.753,630.672,886.014,604.182,938.8986,621.7097,1082.037,639.165,1137.101,637.888,1433.912,643.292,1433.912,643.292',
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
