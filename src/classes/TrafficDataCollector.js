/**
 * TrafficDataCollector.js - 交通數據收集器
 */

export default class TrafficDataCollector {
  constructor() {
    this.isCollecting = false
    this.config = {
      collectionInterval: 30000,
      apiSendInterval: 60000,
      dataWindowSize: 300000,
      maxHistorySize: 100,
    }
    this.currentPeriodData = {
      startTime: null,
      endTime: null,
      vehicles: {
        east: { motor: [], small: [], large: [] },
        west: { motor: [], small: [], large: [] },
        south: { motor: [], small: [], large: [] },
        north: { motor: [], small: [], large: [] },
      },
      totalCount: {
        east: { motor: 0, small: 0, large: 0, total: 0 },
        west: { motor: 0, small: 0, large: 0, total: 0 },
        south: { motor: 0, small: 0, large: 0, total: 0 },
        north: { motor: 0, small: 0, large: 0, total: 0 },
      },
      averageSpeed: {
        east: { motor: 0, small: 0, large: 0, overall: 0 },
        west: { motor: 0, small: 0, large: 0, overall: 0 },
        south: { motor: 0, small: 0, large: 0, overall: 0 },
        north: { motor: 0, small: 0, large: 0, overall: 0 },
      },
      occupancy: {
        east: 0,
        west: 0,
        south: 0,
        north: 0,
      },
    }
    this.historyData = []
    this.collectionTimer = null
    this.vehicleAddedListener = null
    this.vehicleRemovedListener = null
    // 綠燈週期收集
    this.greenLightActive = false
    this.greenLightListenerStart = null
    this.greenLightListenerEnd = null
    // API endpoint 統一由 controller 管理
    console.log('📊 交通數據收集器已初始化')
  }

  /**
   * 開始數據收集
   */
  start() {
    if (this.isCollecting) {
      console.log('⚠️ 數據收集器已在運行中')
      return
    }

    this.isCollecting = true
    this.resetCurrentPeriod()

    // 綠燈事件監聽
    this.greenLightListenerStart = () => {
      console.log('🟢 綠燈開始，啟動車輛事件收集')
      this.greenLightActive = true
      this.resetCurrentPeriod()
      this.startVehicleEventListening()
    }
    this.greenLightListenerEnd = () => {
      console.log('� 綠燈結束，停止收集並送出 API')
      this.greenLightActive = false
      this.stopVehicleEventListening()
      this.finalizeCurrentPeriodAndSend()
    }
    window.addEventListener('greenLightStarted', this.greenLightListenerStart)
    window.addEventListener('greenLightEnded', this.greenLightListenerEnd)

    // 若要保留原本定時收集，可選擇啟用
    // this.startPeriodicCollection()

    console.log('🚀 交通數據收集器已啟動 (綠燈週期模式)')
  }

  /**
   * 停止數據收集
   */
  stop() {
    if (!this.isCollecting) {
      console.log('⚠️ 數據收集器未在運行')
      return
    }

    this.isCollecting = false

    // 清理定時器
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer)
      this.collectionTimer = null
    }

    // 移除綠燈事件監聽
    if (this.greenLightListenerStart) {
      window.removeEventListener('greenLightStarted', this.greenLightListenerStart)
      this.greenLightListenerStart = null
    }
    if (this.greenLightListenerEnd) {
      window.removeEventListener('greenLightEnded', this.greenLightListenerEnd)
      this.greenLightListenerEnd = null
    }

    // 停止事件監聽
    this.stopVehicleEventListening()

    // 最後一次數據傳送
    this.finalizeCurrentPeriodAndSend()

    console.log('🛑 交通數據收集器已停止')
  }

  /**
   * 開始監聽車輛事件
   */
  startVehicleEventListening() {
    // 僅在綠燈期間啟用
    if (!this.greenLightActive) return
    this.vehicleAddedListener = (event) => {
      const { direction, type, vehicleId, speed, timestamp } = event.detail
      this.recordVehicleData(direction, type, {
        vehicleId: vehicleId || `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        speed: speed || 0,
        timestamp: timestamp || new Date().toISOString(),
        action: 'added',
      })
    }

    this.vehicleRemovedListener = (event) => {
      const { direction, type, vehicleId, finalSpeed, travelTime } = event.detail
      this.recordVehicleData(direction, type, {
        vehicleId: vehicleId || `unknown_${Date.now()}`,
        finalSpeed: finalSpeed || 0,
        travelTime: travelTime || 0,
        timestamp: new Date().toISOString(),
        action: 'removed',
      })
    }

    window.addEventListener('vehicleAdded', this.vehicleAddedListener)
    window.addEventListener('vehicleRemoved', this.vehicleRemovedListener)

    console.log('🎧 開始監聽車輛事件 (綠燈期間)')
  }

  /**
   * 停止監聽車輛事件
   */
  stopVehicleEventListening() {
    if (this.vehicleAddedListener) {
      window.removeEventListener('vehicleAdded', this.vehicleAddedListener)
      this.vehicleAddedListener = null
    }

    if (this.vehicleRemovedListener) {
      window.removeEventListener('vehicleRemoved', this.vehicleRemovedListener)
      this.vehicleRemovedListener = null
    }

    console.log('🔇 停止監聽車輛事件')
  }

  /**
   * 記錄車輛數據
   */
  recordVehicleData(direction, type, vehicleData) {
    if (!this.currentPeriodData.vehicles[direction] || !this.currentPeriodData.vehicles[direction][type]) {
      console.warn(`⚠️ 無效的方向或車輛類型: ${direction}, ${type}`)
      return
    }

    // 記錄到當前期間的車輛詳細數據
    this.currentPeriodData.vehicles[direction][type].push(vehicleData)

    // 更新計數
    if (vehicleData.action === 'added') {
      this.currentPeriodData.totalCount[direction][type]++
      this.currentPeriodData.totalCount[direction].total++
    }
  }

  /**
   * 開始定期數據收集
   */
  startPeriodicCollection() {
    this.collectionTimer = setInterval(() => {
      this.collectCurrentTrafficState()
    }, this.config.collectionInterval)
  }

  /**
   * (已移除) 定期API傳送功能
   */
  // 已移除 startPeriodicApiSend()

  /**
   * 收集當前交通狀態
   */
  collectCurrentTrafficState() {
    console.log('📊 收集當前交通狀態...')

    // 計算平均速度
    this.calculateAverageSpeeds()

    // 計算佔用率
    this.calculateOccupancy()

    // 觸發數據更新事件
    window.dispatchEvent(
      new CustomEvent('trafficDataUpdated', {
        detail: {
          currentData: this.getCurrentPeriodSummary(),
          timestamp: new Date().toISOString(),
        },
      }),
    )

    console.log('✅ 交通狀態收集完成')
  }

  /**
   * 計算平均速度
   */
  calculateAverageSpeeds() {
    const directions = ['east', 'west', 'south', 'north']
    const vehicleTypes = ['motor', 'small', 'large']

    directions.forEach((direction) => {
      let totalSpeed = 0
      let totalVehicles = 0

      vehicleTypes.forEach((type) => {
        const vehicles = this.currentPeriodData.vehicles[direction][type]
        const speeds = vehicles.filter((v) => v.speed && v.speed > 0).map((v) => v.speed)

        if (speeds.length > 0) {
          const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
          this.currentPeriodData.averageSpeed[direction][type] = Math.round(avgSpeed)
          totalSpeed += avgSpeed * speeds.length
          totalVehicles += speeds.length
        } else {
          this.currentPeriodData.averageSpeed[direction][type] = 0
        }
      })

      // 計算整體平均速度
      this.currentPeriodData.averageSpeed[direction].overall =
        totalVehicles > 0 ? Math.round(totalSpeed / totalVehicles) : 0
    })
  }

  /**
   * 計算佔用率
   */
  calculateOccupancy() {
    const directions = ['east', 'west', 'south', 'north']

    directions.forEach((direction) => {
      const totalVehicles = this.currentPeriodData.totalCount[direction].total

      // 簡化的佔用率計算 (可以根據實際需求調整)
      // 假設每個方向最大容量為50輛車
      const maxCapacity = 50
      const occupancy = Math.min((totalVehicles / maxCapacity) * 100, 100)

      this.currentPeriodData.occupancy[direction] = Math.round(occupancy * 10) / 10
    })
  }

  /**
   * 完成當前期間並傳送數據
   */
  async finalizeCurrentPeriodAndSend() {
    console.log('📤 完成當前期間數據收集...')

    // 設置結束時間
    this.currentPeriodData.endTime = new Date().toISOString()

    // 最後一次狀態收集
    this.collectCurrentTrafficState()

    // 保存到歷史記錄
    this.saveToHistory()

    // 重置當前期間
    this.resetCurrentPeriod()

    console.log('✅ 數據期間完成並已歸零')
  }

  /**
   * 準備API數據格式
   */
  prepareApiData() {
    const summary = this.getCurrentPeriodSummary()

    return {
      timestamp: new Date().toISOString(),
      collection_period: {
        start_time: this.currentPeriodData.startTime,
        end_time: this.currentPeriodData.endTime,
        duration_seconds:
          this.currentPeriodData.endTime && this.currentPeriodData.startTime
            ? (new Date(this.currentPeriodData.endTime) - new Date(this.currentPeriodData.startTime)) / 1000
            : 0,
      },
      traffic_flow: {
        east: {
          motor_count: summary.totalCount.east.motor,
          small_car_count: summary.totalCount.east.small,
          large_car_count: summary.totalCount.east.large,
          total_count: summary.totalCount.east.total,
          average_speed: summary.averageSpeed.east.overall,
          motor_speed: summary.averageSpeed.east.motor,
          small_car_speed: summary.averageSpeed.east.small,
          large_car_speed: summary.averageSpeed.east.large,
          occupancy: summary.occupancy.east,
        },
        west: {
          motor_count: summary.totalCount.west.motor,
          small_car_count: summary.totalCount.west.small,
          large_car_count: summary.totalCount.west.large,
          total_count: summary.totalCount.west.total,
          average_speed: summary.averageSpeed.west.overall,
          motor_speed: summary.averageSpeed.west.motor,
          small_car_speed: summary.averageSpeed.west.small,
          large_car_speed: summary.averageSpeed.west.large,
          occupancy: summary.occupancy.west,
        },
        south: {
          motor_count: summary.totalCount.south.motor,
          small_car_count: summary.totalCount.south.small,
          large_car_count: summary.totalCount.south.large,
          total_count: summary.totalCount.south.total,
          average_speed: summary.averageSpeed.south.overall,
          motor_speed: summary.averageSpeed.south.motor,
          small_car_speed: summary.averageSpeed.south.small,
          large_car_speed: summary.averageSpeed.south.large,
          occupancy: summary.occupancy.south,
        },
        north: {
          motor_count: summary.totalCount.north.motor,
          small_car_count: summary.totalCount.north.small,
          large_car_count: summary.totalCount.north.large,
          total_count: summary.totalCount.north.total,
          average_speed: summary.averageSpeed.north.overall,
          motor_speed: summary.averageSpeed.north.motor,
          small_car_speed: summary.averageSpeed.north.small,
          large_car_speed: summary.averageSpeed.north.large,
          occupancy: summary.occupancy.north,
        },
      },
      metadata: {
        collector_version: '1.0.0',
        total_vehicles_processed: Object.values(summary.totalCount).reduce(
          (total, direction) => total + direction.total,
          0,
        ),
        collection_method: 'real_time_event_based',
      },
    }
  }

  /**
   * 保存到歷史記錄
   */
  saveToHistory() {
    const summary = this.getCurrentPeriodSummary()

    this.historyData.push({
      ...summary,
      savedAt: new Date().toISOString(),
    })

    // 限制歷史記錄大小
    if (this.historyData.length > this.config.maxHistorySize) {
      this.historyData = this.historyData.slice(-this.config.maxHistorySize)
    }

    console.log(`📚 已保存到歷史記錄 (共 ${this.historyData.length} 筆)`)
  }

  /**
   * 重置當前期間數據
   */
  resetCurrentPeriod() {
    this.currentPeriodData = {
      startTime: new Date().toISOString(),
      endTime: null,
      vehicles: {
        east: { motor: [], small: [], large: [] },
        west: { motor: [], small: [], large: [] },
        south: { motor: [], small: [], large: [] },
        north: { motor: [], small: [], large: [] },
      },
      totalCount: {
        east: { motor: 0, small: 0, large: 0, total: 0 },
        west: { motor: 0, small: 0, large: 0, total: 0 },
        south: { motor: 0, small: 0, large: 0, total: 0 },
        north: { motor: 0, small: 0, large: 0, total: 0 },
      },
      averageSpeed: {
        east: { motor: 0, small: 0, large: 0, overall: 0 },
        west: { motor: 0, small: 0, large: 0, overall: 0 },
        south: { motor: 0, small: 0, large: 0, overall: 0 },
        north: { motor: 0, small: 0, large: 0, overall: 0 },
      },
      occupancy: {
        east: 0,
        west: 0,
        south: 0,
        north: 0,
      },
    }

    console.log('🔄 TrafficDataCollector: 當前期間數據已重置')

    // 觸發數據重置事件
    window.dispatchEvent(
      new CustomEvent('trafficDataReset', {
        detail: {
          timestamp: new Date().toISOString(),
          source: 'data_collector_reset',
        },
      }),
    )
  }

  /**
   * 獲取當前期間摘要
   */
  getCurrentPeriodSummary() {
    return {
      startTime: this.currentPeriodData.startTime,
      endTime: this.currentPeriodData.endTime,
      totalCount: JSON.parse(JSON.stringify(this.currentPeriodData.totalCount)),
      averageSpeed: JSON.parse(JSON.stringify(this.currentPeriodData.averageSpeed)),
      occupancy: JSON.parse(JSON.stringify(this.currentPeriodData.occupancy)),
    }
  }

  /**
   * 獲取歷史數據
   */
  getHistoryData(limit = 10) {
    return this.historyData.slice(-limit)
  }

  /**
   * 獲取即時數據 (用於UI顯示)
   */
  getRealTimeData() {
    // 確保返回最新的計算結果
    this.calculateAverageSpeeds()
    this.calculateOccupancy()

    return this.getCurrentPeriodSummary()
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    console.log('⚙️ 數據收集器配置已更新:', newConfig)

    // 如果正在運行，重新啟動以應用新配置
    if (this.isCollecting) {
      console.log('🔄 重新啟動以應用新配置...')
      this.stop()
      setTimeout(() => this.start(), 1000)
    }
  }

  /**
   * 獲取統計信息
   */
  getStatistics() {
    const currentSummary = this.getCurrentPeriodSummary()
    const totalProcessed = Object.values(currentSummary.totalCount).reduce(
      (total, direction) => total + direction.total,
      0,
    )

    return {
      isCollecting: this.isCollecting,
      currentPeriod: currentSummary,
      historyCount: this.historyData.length,
      totalVehiclesInCurrentPeriod: totalProcessed,
      config: this.config,
      uptime: this.currentPeriodData.startTime ? (new Date() - new Date(this.currentPeriodData.startTime)) / 1000 : 0,
    }
  }

  /**
   * 手動觸發數據傳送
   */
  async forceSendData() {
    console.log('🚀 手動觸發數據傳送...')
    await this.finalizeCurrentPeriodAndSend()
  }

  /**
   * 清除所有數據
   */
  clearAllData() {
    this.historyData = []
    this.resetCurrentPeriod()
    console.log('🗑️ 所有數據已清除')
  }
}
