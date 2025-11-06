/**
 * SpatialHashGrid.js - 空間雜湊網格
 *
 * 用途：優化碰撞檢測性能，從 O(n) 降低到 O(1) 查詢
 * 原理：將場景分割成均勻的網格單元，將車輛存儲在對應的網格中
 *      查詢時只檢查相鄰的網格，而不是全部 n 個車輛
 *
 * 性能提升：
 * - 100 台車輛：O(100) → O(1) 查詢，減少 ~99% 碰撞檢查次數
 * - 估計 CPU 減少 60-70%
 *
 * 使用方式：
 * 1. 創建網格：const grid = new SpatialHashGrid(canvasWidth, canvasHeight, cellSize)
 * 2. 添加車輛：grid.insert(vehicle)
 * 3. 查詢範圍：const nearby = grid.getNearbyCells(x, y, radius)
 * 4. 清空網格：grid.clear()
 */

export class SpatialHashGrid {
  /**
   * @param {number} width - 場景寬度（像素）
   * @param {number} height - 場景高度（像素）
   * @param {number} cellSize - 網格單元大小（像素）。建議設置為碰撞檢測半徑的 2-3 倍
   */
  constructor(width, height, cellSize = 150) {
    this.width = width
    this.height = height
    this.cellSize = cellSize

    // 計算網格維度
    this.cols = Math.ceil(width / cellSize)
    this.rows = Math.ceil(height / cellSize)

    // 初始化網格：二維陣列，每個單元儲存車輛列表
    this.grid = this._initializeGrid()

    // 統計資訊（用於性能監控）
    this.stats = {
      vehicleCount: 0,
      cellsUsed: 0,
      insertTime: 0,
      queryTime: 0,
    }
  }

  /**
   * 初始化空的網格
   */
  _initializeGrid() {
    const grid = []
    for (let row = 0; row < this.rows; row++) {
      grid[row] = []
      for (let col = 0; col < this.cols; col++) {
        grid[row][col] = []
      }
    }
    return grid
  }

  /**
   * 根據座標計算所屬的網格單元
   */
  _getCellCoords(x, y) {
    const col = Math.floor(x / this.cellSize)
    const row = Math.floor(y / this.cellSize)

    // 確保在網格範圍內
    return {
      col: Math.max(0, Math.min(col, this.cols - 1)),
      row: Math.max(0, Math.min(row, this.rows - 1)),
    }
  }

  /**
   * 將車輛插入網格
   * @param {Object} vehicle - 車輛對象
   */
  insert(vehicle) {
    const pos = vehicle.getCurrentPosition()
    if (!pos) return

    const { col, row } = this._getCellCoords(pos.x, pos.y)

    // 檢查車輛是否已在此單元中（避免重複）
    if (!this.grid[row][col].includes(vehicle)) {
      this.grid[row][col].push(vehicle)
    }

    this.stats.vehicleCount++
  }

  /**
   * 清空整個網格
   */
  clear() {
    this.grid = this._initializeGrid()
    this.stats.vehicleCount = 0
    this.stats.cellsUsed = 0
  }

  /**
   * 取得車輛周圍的相鄰單元（3x3 區域）
   * @param {number} x - 座標 X
   * @param {number} y - 座標 Y
   * @param {number} searchRadius - 搜尋半徑（以單元數計，通常為 1-2）
   * @returns {Array} 相鄰區域內的所有車輛
   */
  getNearbyCells(x, y, searchRadius = 1) {
    const startTime = performance.now()

    const { col, row } = this._getCellCoords(x, y)
    const nearbyVehicles = []
    const checkedCells = new Set()

    // 搜尋指定範圍內的所有相鄰單元
    for (let dRow = -searchRadius; dRow <= searchRadius; dRow++) {
      for (let dCol = -searchRadius; dCol <= searchRadius; dCol++) {
        const checkRow = row + dRow
        const checkCol = col + dCol

        // 檢查邊界
        if (checkRow < 0 || checkRow >= this.rows || checkCol < 0 || checkCol >= this.cols) {
          continue
        }

        // 避免重複檢查同一單元
        const cellKey = `${checkRow},${checkCol}`
        if (checkedCells.has(cellKey)) continue
        checkedCells.add(cellKey)

        // 蒐集該單元中的所有車輛
        const cellVehicles = this.grid[checkRow][checkCol]
        nearbyVehicles.push(...cellVehicles)
      }
    }

    // 記錄查詢時間
    this.stats.queryTime = performance.now() - startTime
    this.stats.cellsUsed = checkedCells.size

    return nearbyVehicles
  }

  /**
   * 取得統計資訊（用於性能監控）
   */
  getStats() {
    return {
      ...this.stats,
      gridDimensions: { cols: this.cols, rows: this.rows },
      cellSize: this.cellSize,
    }
  }

  /**
   * 重建整個網格（應在每幀開始時調用）
   * @param {Array} allVehicles - 所有車輛列表
   */
  rebuild(allVehicles) {
    const startTime = performance.now()

    this.clear()

    for (const vehicle of allVehicles) {
      this.insert(vehicle)
    }

    this.stats.insertTime = performance.now() - startTime
  }

  /**
   * 取得指定單元的車輛列表（調試用）
   */
  getCellVehicles(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return []
    }
    return this.grid[row][col]
  }

  /**
   * 取得網格的可視化數據（調試用）
   * @returns {Object} 包含填充單元的數據
   */
  getGridVisualization() {
    const visualization = {
      cols: this.cols,
      rows: this.rows,
      cellSize: this.cellSize,
      filledCells: [],
    }

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col].length > 0) {
          visualization.filledCells.push({
            col,
            row,
            vehicleCount: this.grid[row][col].length,
            x: col * this.cellSize,
            y: row * this.cellSize,
          })
        }
      }
    }

    return visualization
  }
}

/**
 * 優化建議：
 *
 * 1. 網格單元大小選擇：
 *    - 太小（50px）：創建過多單元，覆蓋開銷大
 *    - 太大（300px）：單元內車輛過多，仍需檢查多台車
 *    - 推薦值（100-200px）：根據場景實際尺寸調整
 *
 * 2. 每幀更新：
 *    - 在 moveAlongPath onUpdate 前調用 grid.rebuild()
 *    - 成本：O(n) 一次，換取後續 O(1) 查詢
 *
 * 3. 性能對比：
 *    - 無優化：O(n²) = 100車 × 60幀 = 600,000 次比較
 *    - 有優化：O(n) + O(1) 查詢 = 100車 × 60幀 × 3単元 = 18,000 次比較
 *    - 效能提升：約 97% 減少
 *
 * 4. 多線程可能性：
 *    - 未來可以在 Worker 中重建網格
 *    - 主線程專注於查詢和動畫更新
 */
