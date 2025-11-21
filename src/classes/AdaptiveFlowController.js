/**
 * AdaptiveFlowController.js - 自適應交通流控制器
 *
 * 功能：
 * 1. 計算時間佔有率 (Time Occupancy) - 交通工程標準公式
 * 2. 基於佔有率動態調整車流生成速率
 * 3. 監控多個方向的交通流狀態
 * 4. 提供交通流數據用於系統分析
 *
 * 公式：
 * O = Σ(檢測區被佔用時間) / 總檢測時間 × 100%
 *
 * 參數：
 * - DETECTION_ZONE_LENGTH: 50m （檢測區長度）
 * - CHECK_INTERVAL: 100ms （檢查週期）
 * - CALCULATION_PERIOD: 60s （計算週期）
 */

export default class AdaptiveFlowController {
  constructor(trafficController) {
    this.trafficController = trafficController

    // ===============================================
    // 🎯 【檢測區配置】
    // ===============================================
    // 定義在停止線前方的檢測區
    // 單位：像素（1像素 ≈ 0.1米，所以50米 ≈ 500像素）
    this.DETECTION_ZONE_LENGTH = 500 // 像素，對應 50 米

    // ===============================================
    // ⏱️ 【時間配置】
    // ===============================================
    this.CHECK_INTERVAL = 100 // 檢查間隔（毫秒）
    this.CALCULATION_PERIOD = 60000 // 計算週期（毫秒）= 60 秒

    // ===============================================
    // 📊 【方向和車道配置】
    // ===============================================
    this.directions = ['north', 'south', 'east', 'west']
    this.lanesPerDirection = 4 // 每個方向 4 條車道

    // ===============================================
    // 📈 【佔有率臨界值配置】
    // ===============================================
    this.occupancyThresholds = {
      underflow: 30, // 低於 30% - 增加生成速率
      normal: 70, // 高於 70% - 減少生成速率
      // 30% ~ 70% - 保持當前速率
    }

    // ===============================================
    // 🚗 【生成速率調整係數】
    // ===============================================
    this.generationRateAdjustment = {
      increase: 1.2, // 增加 20%
      decrease: 0.8, // 減少 20%
      maintain: 1.0, // 保持不變
    }

    // ===============================================
    // 💾 【運行時數據存儲】
    // ===============================================
    // 按方向存儲佔用時間和計算結果
    this.occupancyData = {}
    this.occupancyHistory = {} // 歷史數據用於分析

    // 初始化各方向的數據
    this.directions.forEach((direction) => {
      this.occupancyData[direction] = {
        occupiedTimeMs: 0, // 累計被佔用時間（毫秒）
        totalTimeMs: 0, // 總檢測時間（毫秒）
        occupancyPercentage: 0, // 佔有率百分比
        vehiclesInZone: 0, // 檢測區內車輛數
        adjustmentFactor: 1.0, // 當前生成速率調整係數
        lastUpdated: Date.now(), // 最後更新時間
      }

      this.occupancyHistory[direction] = [] // 初始化歷史記錄
    })

    // ===============================================
    // 🔄 【定時器和運行狀態】
    // ===============================================
    this.isRunning = false
    this.checkTimer = null
    this.calculationTimer = null
    this.lastCalculationTime = Date.now()
  }

  /**
   * 啟動自適應流量控制
   */
  start() {
    if (this.isRunning) return

    this.isRunning = true
    console.log('✅ AdaptiveFlowController started')

    // 啟動定期檢查
    this._startPeriodicCheck()

    // 啟動定期計算
    this._startPeriodicCalculation()
  }

  /**
   * 停止自適應流量控制
   */
  stop() {
    this.isRunning = false
    clearInterval(this.checkTimer)
    this.checkTimer = null
    clearInterval(this.calculationTimer)
    this.calculationTimer = null
    console.log('⛔ AdaptiveFlowController stopped')
  }

  /**
   * 啟動定期檢查（每 100ms 檢查一次）
   * @private
   */
  _startPeriodicCheck() {
    this.checkTimer = setInterval(() => {
      if (!this.isRunning) return
      this._updateOccupiedTime()
    }, this.CHECK_INTERVAL)
  }

  /**
   * 啟動定期計算（每 60s 計算一次佔有率）
   * @private
   */
  _startPeriodicCalculation() {
    this.calculationTimer = setInterval(() => {
      if (!this.isRunning) return
      this._calculateAndAdjust()
    }, this.CALCULATION_PERIOD)
  }

  /**
   * 更新被佔用時間
   * 遍歷所有方向，檢查每個方向的車輛是否在檢測區內
   * @private
   */
  _updateOccupiedTime() {
    this.directions.forEach((direction) => {
      const vehiclesInZone = this._getVehiclesInDetectionZone(direction)
      this.occupancyData[direction].vehiclesInZone = vehiclesInZone.length

      // 如果檢測區內有車輛，累計被佔用時間
      if (vehiclesInZone.length > 0) {
        this.occupancyData[direction].occupiedTimeMs += this.CHECK_INTERVAL
      }

      // 累計總檢測時間
      this.occupancyData[direction].totalTimeMs += this.CHECK_INTERVAL
    })
  }

  /**
   * 計算佔有率並調整生成速率
   * @private
   */
  _calculateAndAdjust() {
    this.directions.forEach((direction) => {
      const data = this.occupancyData[direction]

      // 計算時間佔有率百分比
      if (data.totalTimeMs > 0) {
        data.occupancyPercentage = (data.occupiedTimeMs / data.totalTimeMs) * 100
      }

      // 根據佔有率調整生成速率
      let adjustmentFactor = this.generationRateAdjustment.maintain

      if (data.occupancyPercentage < this.occupancyThresholds.underflow) {
        // 低佔有率 - 增加生成速率
        adjustmentFactor = this.generationRateAdjustment.increase
      } else if (data.occupancyPercentage > this.occupancyThresholds.normal) {
        // 高佔有率 - 減少生成速率
        adjustmentFactor = this.generationRateAdjustment.decrease
      }

      data.adjustmentFactor = adjustmentFactor
      data.lastUpdated = Date.now()

      // 記錄歷史數據
      this.occupancyHistory[direction].push({
        timestamp: Date.now(),
        occupancyPercentage: data.occupancyPercentage,
        vehiclesInZone: data.vehiclesInZone,
        adjustmentFactor: adjustmentFactor,
      })

      // 限制歷史記錄的大小（只保留最近 100 條記錄，約 100 分鐘）
      if (this.occupancyHistory[direction].length > 100) {
        this.occupancyHistory[direction].shift()
      }

      console.log(
        `📊 [${direction}] 佔有率: ${data.occupancyPercentage.toFixed(2)}% | 車輛: ${data.vehiclesInZone} | 調整係數: ${adjustmentFactor.toFixed(2)}x`,
      )

      // 應用調整到生成器
      this._applyAdjustmentToGenerator(direction, adjustmentFactor)

      // 重置計數器準備下一個週期
      data.occupiedTimeMs = 0
      data.totalTimeMs = 0
    })
  }

  /**
   * 獲取在檢測區內的車輛列表
   * 檢測區定義為：停止線前方 DETECTION_ZONE_LENGTH 像素範圍內的車輛
   * @param {string} direction - 方向 ('north', 'south', 'east', 'west')
   * @returns {Array} 在檢測區內的車輛陣列
   * @private
   */
  _getVehiclesInDetectionZone(direction) {
    if (!this.trafficController || !this.trafficController.vehicles) {
      return []
    }

    const vehicles = this.trafficController.vehicles
    const vehiclesInZone = []

    vehicles.forEach((vehicle) => {
      if (vehicle.direction === direction) {
        // 根據方向判斷車輛是否在檢測區內
        const isInZone = this._isVehicleInZone(vehicle, direction)
        if (isInZone) {
          vehiclesInZone.push(vehicle)
        }
      }
    })

    return vehiclesInZone
  }

  /**
   * 判斷單個車輛是否在檢測區內
   * 基於車輛的頭部位置（headPos）和檢測區長度
   * @param {Vehicle} vehicle - 車輛對象
   * @param {string} direction - 方向
   * @returns {boolean} 是否在檢測區內
   * @private
   */
  _isVehicleInZone(vehicle, direction) {
    if (!vehicle || vehicle.headPos === undefined) {
      return false
    }

    // 獲取停止線位置
    const stopLinePos = this._getStopLinePosition(direction)
    if (stopLinePos === null) {
      return false
    }

    // 根據方向判斷檢測區範圍
    switch (direction) {
      case 'east': // 向東行駛的車輛
        // 車輛在停止線西側（小於停止線）且在檢測區內
        return vehicle.headPos > stopLinePos - this.DETECTION_ZONE_LENGTH && vehicle.headPos < stopLinePos

      case 'west': // 向西行駛的車輛
        // 車輛在停止線東側（大於停止線）且在檢測區內
        return vehicle.headPos < stopLinePos + this.DETECTION_ZONE_LENGTH && vehicle.headPos > stopLinePos

      case 'south': // 向南行駛的車輛
        // 車輛在停止線上側（小於停止線）且在檢測區內
        return vehicle.headPos > stopLinePos - this.DETECTION_ZONE_LENGTH && vehicle.headPos < stopLinePos

      case 'north': // 向北行駛的車輛
        // 車輛在停止線下側（大於停止線）且在檢測區內
        return vehicle.headPos < stopLinePos + this.DETECTION_ZONE_LENGTH && vehicle.headPos > stopLinePos

      default:
        return false
    }
  }

  /**
   * 獲取指定方向的停止線位置
   * 從配置獲取，支持動態更新
   * @param {string} direction - 方向
   * @returns {number|null} 停止線位置（像素）
   * @private
   */
  _getStopLinePosition(direction) {
    // 優先從交通控制器配置取得（支持動態更新）
    if (this.trafficController && this.trafficController.trafficConfig?.stopLinePositions) {
      return this.trafficController.trafficConfig.stopLinePositions[direction] || null
    }

    // 備用預設值（應該移到 trafficConfig）
    const stopLinePositions = {
      east: 650, // 東方停止線 X 座標
      west: 180, // 西方停止線 X 座標
      south: 480, // 南方停止線 Y 座標
      north: 320, // 北方停止線 Y 座標
    }

    return stopLinePositions[direction] || null
  }

  /**
   * 應用調整係數到生成器
   * 通過修改當前配置的生成間隔來實現速率調整
   * @param {string} direction - 方向
   * @param {number} adjustmentFactor - 調整係數 (< 1 減少, > 1 增加)
   * @private
   */
  _applyAdjustmentToGenerator(direction, adjustmentFactor) {
    if (!this.trafficController || !this.trafficController.autoTrafficGenerator) {
      return
    }

    const generator = this.trafficController.autoTrafficGenerator

    // 獲取當前配置
    if (!generator.config) {
      return
    }

    // 應用調整係數到生成間隔
    // 調整係數越大，生成間隔越小（生成速率越快）
    const currentInterval = generator.config.interval || {}
    const normalInterval = currentInterval.normal || 5000

    // 計算新的間隔
    const adjustedInterval = Math.round(normalInterval / adjustmentFactor)

    // 更新配置
    generator.config.interval = {
      ...currentInterval,
      min: Math.round(adjustedInterval * 0.8),
      max: Math.round(adjustedInterval * 1.2),
      normal: adjustedInterval,
    }

    // 注：也可以調整 vehiclesPerInterval 進行微調
    // generator.config.vehiclesPerInterval = { min: 1, max: Math.ceil(adjustmentFactor) }
  }

  /**
   * 獲取指定方向的佔有率數據
   * @param {string} direction - 方向
   * @returns {Object} 佔有率數據
   */
  getOccupancyData(direction) {
    return this.occupancyData[direction] || {}
  }

  /**
   * 獲取所有方向的佔有率數據
   * @returns {Object} 所有方向的佔有率數據
   */
  getAllOccupancyData() {
    return this.occupancyData
  }

  /**
   * 獲取指定方向的歷史數據
   * @param {string} direction - 方向
   * @param {number} limit - 限制記錄數（默認 10）
   * @returns {Array} 歷史數據
   */
  getOccupancyHistory(direction, limit = 10) {
    const history = this.occupancyHistory[direction] || []
    return history.slice(-limit)
  }

  /**
   * 重置所有數據（用於重新開始監控）
   */
  reset() {
    this.directions.forEach((direction) => {
      this.occupancyData[direction] = {
        occupiedTimeMs: 0,
        totalTimeMs: 0,
        occupancyPercentage: 0,
        vehiclesInZone: 0,
        adjustmentFactor: 1.0,
        lastUpdated: Date.now(),
      }
      this.occupancyHistory[direction] = []
    })
    this.lastCalculationTime = Date.now()
    console.log('🔄 AdaptiveFlowController reset')
  }

  /**
   * 更新檢測區長度（用於動態調整）
   * @param {number} newLength - 新的檢測區長度（像素）
   */
  setDetectionZoneLength(newLength) {
    this.DETECTION_ZONE_LENGTH = newLength
    console.log(`🔧 檢測區長度更新為: ${newLength}px (${newLength / 10}m)`)
  }

  /**
   * 更新佔有率臨界值（用於動態調整）
   * @param {Object} newThresholds - 新的臨界值 { underflow, normal }
   */
  setOccupancyThresholds(newThresholds) {
    if (newThresholds.underflow !== undefined) {
      this.occupancyThresholds.underflow = newThresholds.underflow
    }
    if (newThresholds.normal !== undefined) {
      this.occupancyThresholds.normal = newThresholds.normal
    }
    console.log(
      `🎚️ 佔有率臨界值更新為: underflow=${this.occupancyThresholds.underflow}%, normal=${this.occupancyThresholds.normal}%`,
    )
  }

  /**
   * 更新生成速率調整係數（用於動態調整）
   * @param {Object} newAdjustments - 新的調整係數 { increase, decrease, maintain }
   */
  setGenerationRateAdjustment(newAdjustments) {
    if (newAdjustments.increase !== undefined) {
      this.generationRateAdjustment.increase = newAdjustments.increase
    }
    if (newAdjustments.decrease !== undefined) {
      this.generationRateAdjustment.decrease = newAdjustments.decrease
    }
    console.log(
      `⚙️ 生成速率調整係數更新為: increase=${this.generationRateAdjustment.increase}, decrease=${this.generationRateAdjustment.decrease}`,
    )
  }

  /**
   * 獲取當前系統狀態摘要
   * @returns {Object} 系統狀態摘要
   */
  getStatusSummary() {
    const summary = {
      isRunning: this.isRunning,
      timestamp: Date.now(),
      occupancy: {},
      averageOccupancy: 0,
    }

    let totalOccupancy = 0
    this.directions.forEach((direction) => {
      const occupancy = this.occupancyData[direction].occupancyPercentage
      summary.occupancy[direction] = occupancy.toFixed(2)
      totalOccupancy += occupancy
    })

    summary.averageOccupancy = (totalOccupancy / this.directions.length).toFixed(2)

    return summary
  }
}
