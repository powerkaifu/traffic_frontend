/**
 * 車道路徑計算工具
 * 用於計算交通模擬中各個車道的路徑
 */

/**
 * 創建車道路徑計算器
 * @param {HTMLElement} containerElement - 交通路口容器元素
 * @returns {Object} 包含所有車道路徑計算函數的對象
 */
export function createLanePathCalculator() {
  // ==================== 往東車道路徑 ====================

  // 往東車道 1 路徑 - 📝可編輯
  const getEastLane1Path = () => {
    return 'M-300,521 C100,521 300,521 700,521 C1100,521 1300,521 1700,521'
  }

  // 往東車道 2 路徑
  const getEastLane2Path = () => {
    // 使用用戶編輯後的路徑
    return 'M0,560 L1400,560'
  }

  // 往東車道 3 路徑
  const getEastLane3Path = () => {
    return 'M0,599 L1400,599'
  }
  // 往東車道 4 路徑 - 📝可編輯
  const getEastLane4Path = () => {
    return 'M-330.922,652.46C-110.929,652.46,203.438,648.153,439.046,648.475,438.885,806.311,222.805,1211.391,221.281,1327.157'
  }

  // ==================== 往西車道路徑 ====================
  // 往西車道 1 路徑 - 📝可編輯
  const getWestLane1Path = () => {
    return 'M1700,480 C1300,480 1100,480 700,480 C300,480 100,480 -300,480'
  }
  // 往西車道 2 路徑
  const getWestLane2Path = () => {
    return 'M1400,441 L0,441'
  }
  // 往西車道 3 路徑
  const getWestLane3Path = () => {
    return 'M1400,402 L0,402'
  }
  // 往西車道 4 路徑 - 📝可編輯
  const getWestLane4Path = () => {
    return 'M336.985,-419.466C337.031,-351.966,338.26,187.757,337.351,233.582,272.363,234.094,40.025,235.666,-222.587,235.267'
  }

  // ==================== 往南車道路徑 ====================
  // 往南車道 1 路徑 - 📝可編輯
  const getSouthLane1Path = () => {
    return 'M680,-300 C680,200 680,600 680,500 C680,800 680,1000 680,1300'
  }
  // 往南車道 2 路徑
  const getSouthLane2Path = () => {
    return 'M640,-300 L640,1300'
  }
  // 往南車道 3 路徑
  const getSouthLane3Path = () => {
    return 'M601,-300 L601,1300'
  }
  // 往南車道 4 路徑 - 📝可編輯
  const getSouthLane4Path = () => {
    return 'M561.979,521 C561.979,521 561.979,521 561.979,521 C561.979,654.098 561.979,687.934 561.979,1304.668'
  }

  // ==================== 往北車道路徑 ====================
  // 往北車道 1 路徑 - 📝可編輯
  const getNorthLane1Path = () => {
    return 'M720,1300 C720,800 720,600 720,500 C720,400 720,200 720,-300'
  }
  // 往北車道 2 路徑
  const getNorthLane2Path = () => {
    return 'M760,1300 L760,-300'
  }
  // 往北車道 3 路徑
  const getNorthLane3Path = () => {
    return 'M799,1300 L799,-300'
  }
  // 往北車道 4 路徑 - 📝可編輯
  const getNorthLane4Path = () => {
    return 'M838.021,1304.668 C838.021,687.934 838.021,654.098 838.021,521 C838.021,521 838.021,521 838.021,521'
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
