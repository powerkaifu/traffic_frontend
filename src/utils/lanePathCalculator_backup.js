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
    if (!containerElement) {
      return 'M100,500 L1300,500' // 預設路徑，SVG viewBox中心水平線
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500  // SVG viewBox 中心Y座標

    // 所有東向車道使用相同的Y座標：SVG中心水平線
    const eastLaneY = svgCenterY

    // 水平線從左到右，延伸到viewBox邊緣
    const startX = 100   // 從viewBox左邊開始
    const endX = 1300    // 到viewBox右邊結束

    return `M${startX},${eastLaneY} L${endX},${eastLaneY}`
  }

  const getEastLane2Path = () => {
    if (!containerElement) {
      return 'M100,500 L1300,500' // 預設路徑，SVG viewBox中心水平線
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500  // SVG viewBox 中心Y座標

    // 所有東向車道使用相同的Y座標：SVG中心水平線
    const eastLaneY = svgCenterY

    // 水平線從左到右，延伸到viewBox邊緣
    const startX = 100   // 從viewBox左邊開始
    const endX = 1300    // 到viewBox右邊結束

    return `M${startX},${eastLaneY} L${endX},${eastLaneY}`
  }

  const getEastLane3Path = () => {
    if (!containerElement) {
      return 'M100,500 L1300,500' // 預設路徑，SVG viewBox中心水平線
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500  // SVG viewBox 中心Y座標

    // 所有東向車道使用相同的Y座標：SVG中心水平線
    const eastLaneY = svgCenterY

    // 水平線從左到右，延伸到viewBox邊緣
    const startX = 100   // 從viewBox左邊開始
    const endX = 1300    // 到viewBox右邊結束

    return `M${startX},${eastLaneY} L${endX},${eastLaneY}`
  }

  const getEastLane4Path = () => {
    if (!containerElement) {
      return 'M100,500 L1300,500' // 預設路徑，SVG viewBox中心水平線
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500  // SVG viewBox 中心Y座標

    // 所有東向車道使用相同的Y座標：SVG中心水平線
    const eastLaneY = svgCenterY

    // 水平線從左到右，延伸到viewBox邊緣
    const startX = 100   // 從viewBox左邊開始
    const endX = 1300    // 到viewBox右邊結束

    return `M${startX},${eastLaneY} L${endX},${eastLaneY}`
  }

  // ==================== 往西車道路徑 ====================

  const getWestLane1Path = () => {
    if (!containerElement) {
      return 'M1300,500 L100,500' // 預設路徑，SVG viewBox中心水平線，從右到左
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500  // SVG viewBox 中心Y座標

    // 所有西向車道使用相同的Y座標：SVG中心水平線
    const westLaneY = svgCenterY

    // 水平線從右到左，延伸到viewBox邊緣
    const startX = 1300  // 從viewBox右邊開始
    const endX = 100     // 到viewBox左邊結束

    return `M${startX},${westLaneY} L${endX},${westLaneY}`
  }

  const getWestLane2Path = () => {
    if (!containerElement) {
      return 'M1300,500 L100,500' // 預設路徑，SVG viewBox中心水平線，從右到左
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500  // SVG viewBox 中心Y座標

    // 所有西向車道使用相同的Y座標：SVG中心水平線
    const westLaneY = svgCenterY

    // 水平線從右到左，延伸到viewBox邊緣
    const startX = 1300  // 從viewBox右邊開始
    const endX = 100     // 到viewBox左邊結束

    return `M${startX},${westLaneY} L${endX},${westLaneY}`
  }

  const getWestLane3Path = () => {
    if (!containerElement) {
      return 'M1300,500 L100,500' // 預設路徑，SVG viewBox中心水平線，從右到左
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500  // SVG viewBox 中心Y座標

    // 所有西向車道使用相同的Y座標：SVG中心水平線
    const westLaneY = svgCenterY

    // 水平線從右到左，延伸到viewBox邊緣
    const startX = 1300  // 從viewBox右邊開始
    const endX = 100     // 到viewBox左邊結束

    return `M${startX},${westLaneY} L${endX},${westLaneY}`
  }

  const getWestLane4Path = () => {
    if (!containerElement) {
      return 'M1300,500 L100,500' // 預設路徑，SVG viewBox中心水平線，從右到左
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterY = 500  // SVG viewBox 中心Y座標

    // 所有西向車道使用相同的Y座標：SVG中心水平線
    const westLaneY = svgCenterY

    // 水平線從右到左，延伸到viewBox邊緣
    const startX = 1300  // 從viewBox右邊開始
    const endX = 100     // 到viewBox左邊結束

    return `M${startX},${westLaneY} L${endX},${westLaneY}`
  }

  // ==================== 往南車道路徑 ====================

  const getSouthLane1Path = () => {
    if (!containerElement) {
      return 'M700,100 L700,900' // 預設路徑，SVG viewBox中心垂直線，從上到下
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterX = 700  // SVG viewBox 中心X座標

    // 所有南向車道使用相同的X座標：SVG中心垂直線
    const southLaneX = svgCenterX

    // 垂直線從上到下，延伸到viewBox邊緣
    const startY = 100   // 從viewBox上邊開始
    const endY = 900     // 到viewBox下邊結束

    return `M${southLaneX},${startY} L${southLaneX},${endY}`
  }

  const getSouthLane2Path = () => {
    if (!containerElement) {
      return 'M700,100 L700,900' // 預設路徑，SVG viewBox中心垂直線，從上到下
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterX = 700  // SVG viewBox 中心X座標

    // 所有南向車道使用相同的X座標：SVG中心垂直線
    const southLaneX = svgCenterX

    // 垂直線從上到下，延伸到viewBox邊緣
    const startY = 100   // 從viewBox上邊開始
    const endY = 900     // 到viewBox下邊結束

    return `M${southLaneX},${startY} L${southLaneX},${endY}`
  }

  const getSouthLane3Path = () => {
    if (!containerElement) {
      return 'M700,100 L700,900' // 預設路徑，SVG viewBox中心垂直線，從上到下
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterX = 700  // SVG viewBox 中心X座標

    // 所有南向車道使用相同的X座標：SVG中心垂直線
    const southLaneX = svgCenterX

    // 垂直線從上到下，延伸到viewBox邊緣
    const startY = 100   // 從viewBox上邊開始
    const endY = 900     // 到viewBox下邊結束

    return `M${southLaneX},${startY} L${southLaneX},${endY}`
  }

  const getSouthLane4Path = () => {
    if (!containerElement) {
      return 'M700,100 L700,900' // 預設路徑，SVG viewBox中心垂直線，從上到下
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterX = 700  // SVG viewBox 中心X座標

    // 所有南向車道使用相同的X座標：SVG中心垂直線
    const southLaneX = svgCenterX

    // 垂直線從上到下，延伸到viewBox邊緣
    const startY = 100   // 從viewBox上邊開始
    const endY = 900     // 到viewBox下邊結束

    return `M${southLaneX},${startY} L${southLaneX},${endY}`
  }

  // ==================== 往北車道路徑 ====================

  const getNorthLane1Path = () => {
    if (!containerElement) {
      return 'M700,900 L700,100' // 預設路徑，SVG viewBox中心垂直線，從下到上
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterX = 700  // SVG viewBox 中心X座標

    // 所有北向車道使用相同的X座標：SVG中心垂直線
    const northLaneX = svgCenterX

    // 垂直線從下到上，延伸到viewBox邊緣
    const startY = 900   // 從viewBox下邊開始
    const endY = 100     // 到viewBox上邊結束

    return `M${northLaneX},${startY} L${northLaneX},${endY}`
  }

  const getNorthLane2Path = () => {
    if (!containerElement) {
      return 'M700,900 L700,100' // 預設路徑，SVG viewBox中心垂直線，從下到上
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterX = 700  // SVG viewBox 中心X座標

    // 所有北向車道使用相同的X座標：SVG中心垂直線
    const northLaneX = svgCenterX

    // 垂直線從下到上，延伸到viewBox邊緣
    const startY = 900   // 從viewBox下邊開始
    const endY = 100     // 到viewBox上邊結束

    return `M${northLaneX},${startY} L${northLaneX},${endY}`
  }

  const getNorthLane3Path = () => {
    if (!containerElement) {
      return 'M700,900 L700,100' // 預設路徑，SVG viewBox中心垂直線，從下到上
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterX = 700  // SVG viewBox 中心X座標

    // 所有北向車道使用相同的X座標：SVG中心垂直線
    const northLaneX = svgCenterX

    // 垂直線從下到上，延伸到viewBox邊緣
    const startY = 900   // 從viewBox下邊開始
    const endY = 100     // 到viewBox上邊結束

    return `M${northLaneX},${startY} L${northLaneX},${endY}`
  }

  const getNorthLane4Path = () => {
    if (!containerElement) {
      return 'M700,900 L700,100' // 預設路徑，SVG viewBox中心垂直線，從下到上
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000)
    const svgCenterX = 700  // SVG viewBox 中心X座標

    // 所有北向車道使用相同的X座標：SVG中心垂直線
    const northLaneX = svgCenterX

    // 垂直線從下到上，延伸到viewBox邊緣
    const startY = 900   // 從viewBox下邊開始
    const endY = 100     // 到viewBox上邊結束

    return `M${northLaneX},${startY} L${northLaneX},${endY}`
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