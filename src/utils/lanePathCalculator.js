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

  const getEastLane1Path = () => {
    // 使用用戶編輯後的路徑
    return 'M-300,521 C100,521 300,521 700,521 C1100,521 1300,521 1700,521'
  }

  const getEastLane2Path = () => {
    // 使用用戶編輯後的路徑
    return 'M0,560 L1400,560'
  }

  const getEastLane3Path = () => {
    // 使用用戶編輯後的路徑
    return 'M0,599 L1400,599'
  }

  const getEastLane4Path = () => {
    // 使用用戶編輯後的路徑
    return 'M-330.922,652.46C-110.929,652.46,-14.423,653.776,221.175,654.098,221.018,811.934,219.994,1188.904,218.47,1304.668'
  } // ==================== 往西車道路徑 ====================

  const getWestLane1Path = () => {
    // 使用用戶編輯後的路徑
    return 'M1700,480 C1300,480 1100,480 700,480 C300,480 100,480 -300,480'
  }

  const getWestLane2Path = () => {
    // 使用用戶編輯後的路徑
    return 'M1400,441 L0,441'
  }

  const getWestLane3Path = () => {
    // 使用用戶編輯後的路徑
    return 'M1400,402 L0,402'
  }

  const getWestLane4Path = () => {
    // 使用用戶編輯後的路徑
    return 'M336.985,-419.466C337.031,-351.966,338.26,187.757,337.351,233.582,272.363,234.094,40.025,235.666,-222.587,235.267'
  }

  // ==================== 往南車道路徑 ====================

  const getSouthLane1Path = () => {
    return 'M680,-300 C680,200 680,600 680,500 C680,800 680,1000 680,1300'
  }

  const getSouthLane2Path = () => {
    // 使用用戶編輯後的路徑
    return 'M640,-300 L640,1300'
  }

  const getSouthLane3Path = () => {
    // 使用用戶編輯後的路徑
    return 'M601,-300 L601,1300'
  }

  const getSouthLane4Path = () => {
    return 'M561.979,521 C561.979,521 561.979,521 561.979,521 C561.979,654.098 561.979,687.934 561.979,1304.668'
  }

  // ==================== 往北車道路徑 ====================

  const getNorthLane1Path = () => {
    return 'M720,1300 C720,800 720,600 720,500 C720,400 720,200 720,-300'
  }

  const getNorthLane2Path = () => {
    // 使用用戶編輯後的路徑
    return 'M760,1300 L760,-300'
  }

  const getNorthLane3Path = () => {
    // 使用用戶編輯後的路徑
    return 'M799,1300 L799,-300'
  }

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
