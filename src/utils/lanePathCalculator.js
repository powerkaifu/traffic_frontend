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
      return 'M-200,521 C200,521 600,521 700,521 C800,521 1200,521 1600,521' // 預設曲線路徑
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterY = 500 // SVG viewBox 中心Y座標
    const containerWidth = containerElement.offsetWidth

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const widthExtensionRatio = Math.max(1.5, containerWidth / 1400) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * widthExtensionRatio

    // 所有東向車道使用相同的Y座標：SVG中心水平線
    const eastLaneY = svgCenterY + 21

    // 曲線路徑從左到右，動態計算延伸距離
    const startX = -dynamicExtension // 根據容器寬度動態計算起始點
    const endX = 1400 + dynamicExtension // 根據容器寬度動態計算結束點
    const midX = 700 // 中點X座標
    const cp1X = startX + (midX - startX) * 0.4 // 第一個控制點
    const cp2X = startX + (midX - startX) * 0.6 // 第二個控制點
    const cp3X = midX + (endX - midX) * 0.4 // 第三個控制點
    const cp4X = midX + (endX - midX) * 0.6 // 第四個控制點

    return `M${startX},${eastLaneY} C${cp1X},${eastLaneY} ${cp2X},${eastLaneY} ${midX},${eastLaneY} C${cp3X},${eastLaneY} ${cp4X},${eastLaneY} ${endX},${eastLaneY}`
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
    if (!containerElement) {
      return 'M-200,637 C200,637 600,637 700,637 C800,637 1200,637 1600,637' // 預設曲線路徑
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterY = 500 // SVG viewBox 中心Y座標
    const containerWidth = containerElement.offsetWidth

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const widthExtensionRatio = Math.max(1.5, containerWidth / 1400) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * widthExtensionRatio

    // 所有東向車道使用相同的Y座標：SVG中心水平線
    const eastLaneY = svgCenterY + 137

    // 曲線路徑從左到右，動態計算延伸距離
    const startX = -dynamicExtension // 根據容器寬度動態計算起始點
    const endX = 1400 + dynamicExtension // 根據容器寬度動態計算結束點
    const midX = 700 // 中點X座標
    const cp1X = startX + (midX - startX) * 0.4 // 第一個控制點
    const cp2X = startX + (midX - startX) * 0.6 // 第二個控制點
    const cp3X = midX + (endX - midX) * 0.4 // 第三個控制點
    const cp4X = midX + (endX - midX) * 0.6 // 第四個控制點

    return `M${startX},${eastLaneY} C${cp1X},${eastLaneY} ${cp2X},${eastLaneY} ${midX},${eastLaneY} C${cp3X},${eastLaneY} ${cp4X},${eastLaneY} ${endX},${eastLaneY}`
  } // ==================== 往西車道路徑 ====================

  const getWestLane1Path = () => {
    if (!containerElement) {
      return 'M1600,480 C1200,480 800,480 700,480 C600,480 200,480 -200,480' // 預設曲線路徑，從右到左
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterY = 500 // SVG viewBox 中心Y座標
    const containerWidth = containerElement.offsetWidth

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const widthExtensionRatio = Math.max(1.5, containerWidth / 1400) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * widthExtensionRatio

    // 所有西向車道使用相同的Y座標：SVG中心水平線
    const westLaneY = svgCenterY - 20

    // 曲線路徑從右到左，動態計算延伸距離
    const startX = 1400 + dynamicExtension // 從viewBox右邊延伸開始
    const endX = -dynamicExtension // 到viewBox左邊延伸結束
    const midX = 700 // 中點X座標
    const cp1X = startX - (startX - midX) * 0.4 // 第一個控制點
    const cp2X = startX - (startX - midX) * 0.6 // 第二個控制點
    const cp3X = midX - (midX - endX) * 0.4 // 第三個控制點
    const cp4X = midX - (midX - endX) * 0.6 // 第四個控制點

    return `M${startX},${westLaneY} C${cp1X},${westLaneY} ${cp2X},${westLaneY} ${midX},${westLaneY} C${cp3X},${westLaneY} ${cp4X},${westLaneY} ${endX},${westLaneY}`
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
    if (!containerElement) {
      return 'M1600,362 C1200,362 800,362 700,362 C600,362 200,362 -200,362' // 預設曲線路徑，從右到左
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterY = 500 // SVG viewBox 中心Y座標
    const containerWidth = containerElement.offsetWidth

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const widthExtensionRatio = Math.max(1.5, containerWidth / 1400) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * widthExtensionRatio

    // 所有西向車道使用相同的Y座標：SVG中心水平線
    const westLaneY = svgCenterY - 138

    // 曲線路徑從右到左，動態計算延伸距離
    const startX = 1400 + dynamicExtension // 從viewBox右邊延伸開始
    const endX = -dynamicExtension // 到viewBox左邊延伸結束
    const midX = 700 // 中點X座標
    const cp1X = startX - (startX - midX) * 0.4 // 第一個控制點
    const cp2X = startX - (startX - midX) * 0.6 // 第二個控制點
    const cp3X = midX - (midX - endX) * 0.4 // 第三個控制點
    const cp4X = midX - (midX - endX) * 0.6 // 第四個控制點

    return `M${startX},${westLaneY} C${cp1X},${westLaneY} ${cp2X},${westLaneY} ${midX},${westLaneY} C${cp3X},${westLaneY} ${cp4X},${westLaneY} ${endX},${westLaneY}`
  }

  // ==================== 往南車道路徑 ====================

  const getSouthLane1Path = () => {
    if (!containerElement) {
      return 'M680,-200 C680,200 680,600 680,500 C680,800 680,1000 680,1200' // 預設曲線路徑，從上到下
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterX = 700 // SVG viewBox 中心X座標
    const containerHeight = containerElement.offsetHeight

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const heightExtensionRatio = Math.max(1.5, containerHeight / 1000) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * heightExtensionRatio

    // 所有南向車道使用相同的X座標：SVG中心垂直線
    const southLaneX = svgCenterX - 20

    // 曲線路徑從上到下，動態計算延伸距離
    const startY = -dynamicExtension // 根據容器高度動態計算起始點
    const endY = 1000 + dynamicExtension // 根據容器高度動態計算結束點
    const midY = 500 // 中點Y座標
    const cp1Y = startY + (midY - startY) * 0.4 // 第一個控制點
    const cp2Y = startY + (midY - startY) * 0.6 // 第二個控制點
    const cp3Y = midY + (endY - midY) * 0.4 // 第三個控制點
    const cp4Y = midY + (endY - midY) * 0.6 // 第四個控制點

    return `M${southLaneX},${startY} C${southLaneX},${cp1Y} ${southLaneX},${cp2Y} ${southLaneX},${midY} C${southLaneX},${cp3Y} ${southLaneX},${cp4Y} ${southLaneX},${endY}`
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
    if (!containerElement) {
      return 'M562,-200 C562,200 562,600 562,500 C562,800 562,1000 562,1200' // 預設曲線路徑，從上到下
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterX = 700 // SVG viewBox 中心X座標
    const containerHeight = containerElement.offsetHeight

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const heightExtensionRatio = Math.max(1.5, containerHeight / 1000) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * heightExtensionRatio

    // 所有南向車道使用相同的X座標：SVG中心垂直線
    const southLaneX = svgCenterX - 138

    // 曲線路徑從上到下，動態計算延伸距離
    const startY = -dynamicExtension // 根據容器高度動態計算起始點
    const endY = 1000 + dynamicExtension // 根據容器高度動態計算結束點
    const midY = 500 // 中點Y座標
    const cp1Y = startY + (midY - startY) * 0.4 // 第一個控制點
    const cp2Y = startY + (midY - startY) * 0.6 // 第二個控制點
    const cp3Y = midY + (endY - midY) * 0.4 // 第三個控制點
    const cp4Y = midY + (endY - midY) * 0.6 // 第四個控制點

    return `M${southLaneX},${startY} C${southLaneX},${cp1Y} ${southLaneX},${cp2Y} ${southLaneX},${midY} C${southLaneX},${cp3Y} ${southLaneX},${cp4Y} ${southLaneX},${endY}`
  }

  // ==================== 往北車道路徑 ====================

  const getNorthLane1Path = () => {
    if (!containerElement) {
      return 'M720,1200 C720,800 720,600 720,500 C720,400 720,200 720,-200' // 預設曲線路徑，從下到上
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterX = 700 // SVG viewBox 中心X座標
    const containerHeight = containerElement.offsetHeight

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const heightExtensionRatio = Math.max(1.5, containerHeight / 1000) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * heightExtensionRatio

    // 所有北向車道使用相同的X座標：SVG中心垂直線
    const northLaneX = svgCenterX + 20

    // 曲線路徑從下到上，動態計算延伸距離
    const startY = 1000 + dynamicExtension // 根據容器高度動態計算起始點
    const endY = -dynamicExtension // 根據容器高度動態計算結束點
    const midY = 500 // 中點Y座標
    const cp1Y = startY - (startY - midY) * 0.4 // 第一個控制點
    const cp2Y = startY - (startY - midY) * 0.6 // 第二個控制點
    const cp3Y = midY - (midY - endY) * 0.4 // 第三個控制點
    const cp4Y = midY - (midY - endY) * 0.6 // 第四個控制點

    return `M${northLaneX},${startY} C${northLaneX},${cp1Y} ${northLaneX},${cp2Y} ${northLaneX},${midY} C${northLaneX},${cp3Y} ${northLaneX},${cp4Y} ${northLaneX},${endY}`
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
    if (!containerElement) {
      return 'M838,1200 C838,800 838,600 838,500 C838,400 838,200 838,-200' // 預設曲線路徑，從下到上
    }

    // 使用SVG viewBox坐標系統 (0,0,1400,1000) + 動態延伸
    const svgCenterX = 700 // SVG viewBox 中心X座標
    const containerHeight = containerElement.offsetHeight

    // 計算延伸比例，確保在所有裝置上都能覆蓋整個螢幕
    const heightExtensionRatio = Math.max(1.5, containerHeight / 1000) // 最少延伸1.5倍
    const baseExtension = 200 // 基礎延伸距離
    const dynamicExtension = baseExtension * heightExtensionRatio

    // 所有北向車道使用相同的X座標：SVG中心垂直線
    const northLaneX = svgCenterX + 138

    // 曲線路徑從下到上，動態計算延伸距離
    const startY = 1000 + dynamicExtension // 根據容器高度動態計算起始點
    const endY = -dynamicExtension // 根據容器高度動態計算結束點
    const midY = 500 // 中點Y座標
    const cp1Y = startY - (startY - midY) * 0.4 // 第一個控制點
    const cp2Y = startY - (startY - midY) * 0.6 // 第二個控制點
    const cp3Y = midY - (midY - endY) * 0.4 // 第三個控制點
    const cp4Y = midY - (midY - endY) * 0.6 // 第四個控制點

    return `M${northLaneX},${startY} C${northLaneX},${cp1Y} ${northLaneX},${cp2Y} ${northLaneX},${midY} C${northLaneX},${cp3Y} ${northLaneX},${cp4Y} ${northLaneX},${endY}`
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
