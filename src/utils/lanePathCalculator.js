/**
 * 車道路徑計算工具
 * 用於計算交通模擬中各個車道的 SVG 路徑
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
      return 'M-200,600 L1400,600' // 預設路徑，橫跨更廣
    }

    const containerHeight = containerElement.offsetHeight
    const containerWidth = containerElement.offsetWidth
    const centerY = containerHeight / 2

    // 根據 TrafficLightController.js 中的計算：往東車道1的 Y 偏移為 92
    const eastLane1Y = centerY + 197

    // 起點：畫面左側外部，更遠 (-200)
    // 終點：畫面右側外部，延伸更遠 (containerWidth + 400)
    const startX = -200
    const endX = containerWidth + 400

    return `M${startX},${eastLane1Y} L${endX},${eastLane1Y}`
  }

  const getEastLane2Path = () => {
    if (!containerElement) {
      return 'M-200,570 L1400,570' // 預設路徑，橫跨更廣
    }

    const containerHeight = containerElement.offsetHeight
    const containerWidth = containerElement.offsetWidth
    const centerY = containerHeight / 2

    // 根據 TrafficLightController.js 中的計算：往東車道2的 Y 偏移為 63
    const eastLane2Y = centerY + 170

    // 起點：畫面左側外部，更遠 (-200)
    // 終點：畫面右側外部，延伸更遠 (containerWidth + 400)
    const startX = -200
    const endX = containerWidth + 400

    return `M${startX},${eastLane2Y} L${endX},${eastLane2Y}`
  }

  const getEastLane3Path = () => {
    if (!containerElement) {
      return 'M-200,540 L1400,540' // 預設路徑，橫跨更廣
    }

    const containerHeight = containerElement.offsetHeight
    const containerWidth = containerElement.offsetWidth
    const centerY = containerHeight / 2

    // 根據 TrafficLightController.js 中的計算：往東車道3的 Y 偏移為 35
    const eastLane3Y = centerY + 142

    // 起點：畫面左側外部，更遠 (-200)
    // 終點：畫面右側外部，延伸更遠 (containerWidth + 400)
    const startX = -200
    const endX = containerWidth + 400

    return `M${startX},${eastLane3Y} L${endX},${eastLane3Y}`
  }

  const getEastLane4Path = () => {
    if (!containerElement) {
      return 'M-200,510 L1400,510' // 預設路徑，橫跨更廣
    }

    const containerHeight = containerElement.offsetHeight
    const containerWidth = containerElement.offsetWidth
    const centerY = containerHeight / 2

    // 根據 TrafficLightController.js 中的計算：往東車道4的 Y 偏移為 6
    const eastLane4Y = centerY + 113

    // 起點：畫面左側外部，更遠 (-200)
    // 終點：畫面右側外部，延伸更遠 (containerWidth + 400)
    const startX = -200
    const endX = containerWidth + 400

    return `M${startX},${eastLane4Y} L${endX},${eastLane4Y}`
  }

  // ==================== 往西車道路徑 ====================

  const getWestLane1Path = () => {
    if (!containerElement) {
      return 'M1400,400 L-200,400' // 預設路徑，從右到左
    }

    const containerHeight = containerElement.offsetHeight
    const containerWidth = containerElement.offsetWidth
    const centerY = containerHeight / 2

    // 根據 TrafficLightController.js 中的計算：往西車道1的 Y 偏移為 -23
    const westLane1Y = centerY + 85

    // 起點：畫面右側外部 (containerWidth + 400)
    // 終點：畫面左側外部 (-200)
    const startX = containerWidth + 400
    const endX = -200

    return `M${startX},${westLane1Y} L${endX},${westLane1Y}`
  }

  const getWestLane2Path = () => {
    if (!containerElement) {
      return 'M1400,430 L-200,430' // 預設路徑，從右到左
    }

    const containerHeight = containerElement.offsetHeight
    const containerWidth = containerElement.offsetWidth
    const centerY = containerHeight / 2

    // 往西車道2的 Y 偏移為 -52
    const westLane2Y = centerY + 57

    // 起點：畫面右側外部 (containerWidth + 400)
    // 終點：畫面左側外部 (-200)
    const startX = containerWidth + 400
    const endX = -200

    return `M${startX},${westLane2Y} L${endX},${westLane2Y}`
  }

  const getWestLane3Path = () => {
    if (!containerElement) {
      return 'M1400,460 L-200,460' // 預設路徑，從右到左
    }

    const containerHeight = containerElement.offsetHeight
    const containerWidth = containerElement.offsetWidth
    const centerY = containerHeight / 2

    // 往西車道3的 Y 偏移為 -79
    const westLane3Y = centerY + 30

    // 起點：畫面右側外部 (containerWidth + 400)
    // 終點：畫面左側外部 (-200)
    const startX = containerWidth + 400
    const endX = -200

    return `M${startX},${westLane3Y} L${endX},${westLane3Y}`
  }

  const getWestLane4Path = () => {
    if (!containerElement) {
      return 'M1400,490 L-200,490' // 預設路徑，從右到左
    }

    const containerHeight = containerElement.offsetHeight
    const containerWidth = containerElement.offsetWidth
    const centerY = containerHeight / 2

    // 往西車道4的 Y 偏移為 -109
    const westLane4Y = centerY + 2

    // 起點：畫面右側外部 (containerWidth + 400)
    // 終點：畫面左側外部 (-200)
    const startX = containerWidth + 400
    const endX = -200

    return `M${startX},${westLane4Y} L${endX},${westLane4Y}`
  }

  // ==================== 往南車道路徑 ====================

  const getSouthLane1Path = () => {
    if (!containerElement) {
      return 'M500,-600 L500,1400' // 預設路徑，從上到下，更長的垂直路徑
    }

    const containerWidth = containerElement.offsetWidth
    const centerX = containerWidth / 2

    // 往南車道1的 X 偏移為 -23
    const southLane1X = centerX + 185

    // 使用瀏覽器視窗高度來計算更長的垂直路徑
    const browserHeight = window.innerHeight
    // 起點：從瀏覽器頂部更上方開始 (-browserHeight)
    // 終點：延伸到瀏覽器底部更下方 (browserHeight * 2)
    const startY = -browserHeight
    const endY = browserHeight * 2

    return `M${southLane1X},${startY} L${southLane1X},${endY}`
  }

  const getSouthLane2Path = () => {
    if (!containerElement) {
      return 'M470,-600 L470,1400' // 預設路徑，從上到下，更長的垂直路徑
    }

    const containerWidth = containerElement.offsetWidth
    const centerX = containerWidth / 2

    // 往南車道2的 X 偏移為 -51
    const southLane2X = centerX + 158

    // 使用瀏覽器視窗高度來計算更長的垂直路徑
    const browserHeight = window.innerHeight
    // 起點：從瀏覽器頂部更上方開始 (-browserHeight)
    // 終點：延伸到瀏覽器底部更下方 (browserHeight * 2)
    const startY = -browserHeight
    const endY = browserHeight * 2

    return `M${southLane2X},${startY} L${southLane2X},${endY}`
  }

  const getSouthLane3Path = () => {
    if (!containerElement) {
      return 'M440,-600 L440,1400' // 預設路徑，從上到下，更長的垂直路徑
    }

    const containerWidth = containerElement.offsetWidth
    const centerX = containerWidth / 2

    // 往南車道3的 X 偏移為 -78
    const southLane3X = centerX + 130

    // 使用瀏覽器視窗高度來計算更長的垂直路徑
    const browserHeight = window.innerHeight
    // 起點：從瀏覽器頂部更上方開始 (-browserHeight)
    // 終點：延伸到瀏覽器底部更下方 (browserHeight * 2)
    const startY = -browserHeight
    const endY = browserHeight * 2

    return `M${southLane3X},${startY} L${southLane3X},${endY}`
  }

  const getSouthLane4Path = () => {
    if (!containerElement) {
      return 'M410,-600 L410,1400' // 預設路徑，從上到下，更長的垂直路徑
    }

    const containerWidth = containerElement.offsetWidth
    const centerX = containerWidth / 2

    // 往南車道4的 X 偏移為 -107
    const southLane4X = centerX + 102

    // 使用瀏覽器視窗高度來計算更長的垂直路徑
    const browserHeight = window.innerHeight
    // 起點：從瀏覽器頂部更上方開始 (-browserHeight)
    // 終點：延伸到瀏覽器底部更下方 (browserHeight * 2)
    const startY = -browserHeight
    const endY = browserHeight * 2

    return `M${southLane4X},${startY} L${southLane4X},${endY}`
  }

  // ==================== 往北車道路徑 ====================

  const getNorthLane1Path = () => {
    if (!containerElement) {
      return 'M530,-600 L530,1400' // 預設路徑，從下到上，橫跨瀏覽器高度
    }

    const containerWidth = containerElement.offsetWidth
    const centerX = containerWidth / 2

    // 往北車道1在往南車道1的右邊，X偏移為 +28 (往南是+185，往北從+213開始)
    const northLane1X = centerX + 213

    // 使用瀏覽器視窗高度來計算完全橫跨的垂直路徑
    const browserHeight = window.innerHeight
    // 起點：從瀏覽器底部更下方開始 (browserHeight * 2)
    // 終點：延伸到瀏覽器頂部更上方 (-browserHeight)
    const startY = browserHeight * 2
    const endY = -browserHeight

    return `M${northLane1X},${startY} L${northLane1X},${endY}`
  }

  const getNorthLane2Path = () => {
    if (!containerElement) {
      return 'M560,-600 L560,1400' // 預設路徑，從下到上，橫跨瀏覽器高度
    }

    const containerWidth = containerElement.offsetWidth
    const centerX = containerWidth / 2

    // 往北車道2的 X 偏移為 +241
    const northLane2X = centerX + 241

    // 使用瀏覽器視窗高度來計算完全橫跨的垂直路徑
    const browserHeight = window.innerHeight
    // 起點：從瀏覽器底部更下方開始 (browserHeight * 2)
    // 終點：延伸到瀏覽器頂部更上方 (-browserHeight)
    const startY = browserHeight * 2
    const endY = -browserHeight

    return `M${northLane2X},${startY} L${northLane2X},${endY}`
  }

  const getNorthLane3Path = () => {
    if (!containerElement) {
      return 'M590,-600 L590,1400' // 預設路徑，從下到上，橫跨瀏覽器高度
    }

    const containerWidth = containerElement.offsetWidth
    const centerX = containerWidth / 2

    // 往北車道3的 X 偏移為 +268
    const northLane3X = centerX + 268

    // 使用瀏覽器視窗高度來計算完全橫跨的垂直路徑
    const browserHeight = window.innerHeight
    // 起點：從瀏覽器底部更下方開始 (browserHeight * 2)
    // 終點：延伸到瀏覽器頂部更上方 (-browserHeight)
    const startY = browserHeight * 2
    const endY = -browserHeight

    return `M${northLane3X},${startY} L${northLane3X},${endY}`
  }

  const getNorthLane4Path = () => {
    if (!containerElement) {
      return 'M620,-600 L620,1400' // 預設路徑，從下到上，橫跨瀏覽器高度
    }

    const containerWidth = containerElement.offsetWidth
    const centerX = containerWidth / 2

    // 往北車道4的 X 偏移為 +296
    const northLane4X = centerX + 296

    // 使用瀏覽器視窗高度來計算完全橫跨的垂直路徑
    const browserHeight = window.innerHeight
    // 起點：從瀏覽器底部更下方開始 (browserHeight * 2)
    // 終點：延伸到瀏覽器頂部更上方 (-browserHeight)
    const startY = browserHeight * 2
    const endY = -browserHeight

    return `M${northLane4X},${startY} L${northLane4X},${endY}`
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
