/**
 * 車道路徑計算工具
 * 用於計算交通模擬中各個車道的路徑
 */

/**
 * 創建車道路徑計算器
 * @param {HTMLElement} containerElement - 交通路口容器元素
 * @returns {Object} 包含所有車道路徑計算函數的對象
 */
export function createLanePathCalculator(containerElement) {
  // ==================== 往東車道路徑 ====================

  const getEastLane1Path = () => {
    // 使用用戶編輯後的路徑
    return 'M-300,521 C100,521 300,521 700,521 C1100,521 1300,521 1700,521'
  }

  const getEastLane2Path = () => {
    if (!containerElement) {
      return 'M100,500 L1300,500' // 預設路徑，SVG viewBox中心水平線
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500 // SVG viewBox 中心Y座標

    // 所有東向車道使用相同的Y座標：SVG中心水平線
    const eastLaneY = svgCenterY + 60

    // 水平線從左到右，延伸到viewBox邊緣
    const startX = 0 // 從viewBox左邊開始
    const endX = 1400 // 到viewBox右邊結束

    return `M${startX},${eastLaneY} L${endX},${eastLaneY}`
  }

  const getEastLane3Path = () => {
    if (!containerElement) {
      return 'M100,500 L1300,500' // 預設路徑，SVG viewBox中心水平線
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500 // SVG viewBox 中心Y座標

    // 所有東向車道使用相同的Y座標：SVG中心水平線
    const eastLaneY = svgCenterY + 99

    // 水平線從左到右，延伸到viewBox邊緣
    const startX = 0 // 從viewBox左邊開始
    const endX = 1400 // 到viewBox右邊結束

    return `M${startX},${eastLaneY} L${endX},${eastLaneY}`
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
    if (!containerElement) {
      return 'M1300,500 L100,500' // 預設路徑，SVG viewBox中心水平線，從右到左
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500 - 59 // SVG viewBox 中心Y座標

    // 所有西向車道使用相同的Y座標：SVG中心水平線
    const westLaneY = svgCenterY

    // 水平線從右到左，延伸到viewBox邊緣
    const startX = 1400 // 從viewBox右邊開始
    const endX = 0 // 到viewBox左邊結束

    return `M${startX},${westLaneY} L${endX},${westLaneY}`
  }

  const getWestLane3Path = () => {
    if (!containerElement) {
      return 'M1300,500 L100,500' // 預設路徑，SVG viewBox中心水平線，從右到左
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500 // SVG viewBox 中心Y座標

    // 所有西向車道使用相同的Y座標：SVG中心水平線
    const westLaneY = svgCenterY - 98

    // 水平線從右到左，延伸到viewBox邊緣
    const startX = 1400 // 從viewBox右邊開始
    const endX = 0 // 到viewBox左邊結束

    return `M${startX},${westLaneY} L${endX},${westLaneY}`
  }

  const getWestLane4Path = () => {
    return 'M1694.822,325.51 C1509.375,325.51 1345.429,325.51 1253.896,325.51 C1218.929,325.51 1182.18,327.034 1140.36,328.798 C1067.05,332.826 841.082,340.478 670.821,346.98 C607.969,349.446 580.063,350.832 538.361,353.066 C455.023,357.526 270.831,365.986 156.821,371.51 C38.8213,377.26 -68.1825,381.87 -330.822,395.51'
  }

  // ==================== 往南車道路徑 ====================

  const getSouthLane1Path = () => {
    return 'M680,-300 C680,200 680,600 680,500 C680,800 680,1000 680,1300'
  }

  const getSouthLane2Path = () => {
    if (!containerElement) {
      return 'M640,-200 L640,1200' // 預設路徑，延伸更長的垂直線
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterX = 700 // SVG viewBox 中心X座標
    const containerHeight = containerElement.offsetHeight

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const heightExtensionRatio = Math.max(1.5, containerHeight / 1000) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * heightExtensionRatio

    // 所有南向車道使用相同的X座標：SVG中心垂直線
    const southLaneX = svgCenterX - 60

    // 垂直線從上到下，動態計算延伸距離
    const startY = -dynamicExtension // 根據容器高度動態計算起始點
    const endY = 1000 + dynamicExtension // 根據容器高度動態計算結束點

    return `M${southLaneX},${startY} L${southLaneX},${endY}`
  }

  const getSouthLane3Path = () => {
    if (!containerElement) {
      return 'M601,-200 L601,1200' // 預設路徑，延伸更長的垂直線
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterX = 700 // SVG viewBox 中心X座標
    const containerHeight = containerElement.offsetHeight

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const heightExtensionRatio = Math.max(1.5, containerHeight / 1000) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * heightExtensionRatio

    // 所有南向車道使用相同的X座標：SVG中心垂直線
    const southLaneX = svgCenterX - 99

    // 垂直線從上到下，動態計算延伸距離
    const startY = -dynamicExtension // 根據容器高度動態計算起始點
    const endY = 1000 + dynamicExtension // 根據容器高度動態計算結束點

    return `M${southLaneX},${startY} L${southLaneX},${endY}`
  }

  const getSouthLane4Path = () => {
    return 'M561.979,521 C561.979,521 561.979,521 561.979,521 C561.979,654.098 561.979,687.934 561.979,1304.668'
  }

  // ==================== 往北車道路徑 ====================

  const getNorthLane1Path = () => {
    return 'M720,1300 C720,800 720,600 720,500 C720,400 720,200 720,-300'
  }

  const getNorthLane2Path = () => {
    if (!containerElement) {
      return 'M760,1200 L760,-200' // 預設路徑，延伸更長的垂直線，從下到上
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterX = 700 // SVG viewBox 中心X座標
    const containerHeight = containerElement.offsetHeight

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const heightExtensionRatio = Math.max(1.5, containerHeight / 1000) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * heightExtensionRatio

    // 所有北向車道使用相同的X座標：SVG中心垂直線
    const northLaneX = svgCenterX + 60

    // 垂直線從下到上，動態計算延伸距離
    const startY = 1000 + dynamicExtension // 根據容器高度動態計算起始點
    const endY = -dynamicExtension // 根據容器高度動態計算結束點

    return `M${northLaneX},${startY} L${northLaneX},${endY}`
  }

  const getNorthLane3Path = () => {
    if (!containerElement) {
      return 'M799,1200 L799,-200' // 預設路徑，延伸更長的垂直線，從下到上
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterX = 700 // SVG viewBox 中心X座標
    const containerHeight = containerElement.offsetHeight

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const heightExtensionRatio = Math.max(1.5, containerHeight / 1000) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * heightExtensionRatio

    // 所有北向車道使用相同的X座標：SVG中心垂直線
    const northLaneX = svgCenterX + 99

    // 垂直線從下到上，動態計算延伸距離
    const startY = 1000 + dynamicExtension // 根據容器高度動態計算起始點
    const endY = -dynamicExtension // 根據容器高度動態計算結束點

    return `M${northLaneX},${startY} L${northLaneX},${endY}`
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
