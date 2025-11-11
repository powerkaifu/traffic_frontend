/**
 * TrafficDataCollector.js - 交通數據收集器
 */

import { getCurrentTimePeriod } from './config/vdNormalizationConfig.js'
import { VOLUME_LIMITS_CONFIG } from './config/vehicleConfig.js'

export default class TrafficDataCollector {
  constructor() {
    this.isCollecting = false
    this.config = {
      collectionInterval: 30000,
      apiSendInterval: 60000,
      dataWindowSize: 300000,
      maxHistorySize: 100,
      // VD數據範圍約束配置
      volumeLimits: {
        maxVolumePerType: 20, // 每種車型最大Volume（基於VD訓練數據範圍）
        maxTotalVolume: 50, // 每個方向總Volume上限
        enableVolumeNormalization: true, // 啟用Volume正規化
        enableDataCapping: true, // 啟用數據上限截斷
      },
      // 速度範圍約束（基於VD數據觀察）
      speedLimits: {
        minSpeed: 0,
        maxSpeed: 80, // km/h
        defaultSpeed: 40,
      },
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

    // 🔧 修正：立即啟動車輛事件監聽，不受綠燈限制
    this.startVehicleEventListening()

    // 綠燈事件監聽（僅用於重置和發送 API）
    this.greenLightListenerStart = () => {
      console.log('🟢 綠燈開始，重置數據收集週期')
      this.greenLightActive = true
      this.resetCurrentPeriod()
    }
    this.greenLightListenerEnd = () => {
      console.log('🔴 綠燈結束，發送 API')
      this.greenLightActive = false
      this.finalizeCurrentPeriodAndSend()
    }
    window.addEventListener('greenLightStarted', this.greenLightListenerStart)
    window.addEventListener('greenLightEnded', this.greenLightListenerEnd)

    // 若要保留原本定時收集，可選擇啟用
    // this.startPeriodicCollection()

    console.log('🚀 交通數據收集器已啟動 (持續監聽模式)')
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
    // 🔧 修正：移除綠燈檢查，持續監聽所有車輛事件
    // 防止重複註冊監聽器
    if (this.vehicleAddedListener || this.vehicleRemovedListener) {
      console.log('⚠️ 車輛事件監聽器已存在，跳過註冊')
      return
    }

    this.vehicleAddedListener = (event) => {
      const { direction, type, vehicleId, speed, timestamp } = event.detail
      this.recordVehicleData(direction, type, {
        vehicleId: vehicleId || `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        speed: speed || 0,
        timestamp: timestamp || new Date().toISOString(),
        action: 'added',
      })

      // 🔥 立即更新平均速度和佔用率
      this.calculateAverageSpeeds()
      this.calculateOccupancy()

      // 🔥 立即觸發UI更新事件
      window.dispatchEvent(
        new CustomEvent('trafficDataUpdated', {
          detail: {
            currentData: this.getCurrentPeriodSummary(),
            timestamp: new Date().toISOString(),
            source: 'vehicle_added',
          },
        }),
      )
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

    console.log('🎧 開始監聽車輛事件 (持續監聽模式)')
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
   * 計算佔用率 ✅ 改進版：使用統一的容量配置（VOLUME_LIMITS_CONFIG）
   */
  calculateOccupancy() {
    const directions = ['east', 'west', 'south', 'north']

    // ✅ 導入時段判定函數，動態調整最大容量
    const timePeriod = getCurrentTimePeriod()

    // ✅ 從 VOLUME_LIMITS_CONFIG 獲取該時段的最大後端容量（統一配置來源）
    // 使用 maxLiveVehiclesForBackend 作為占用率計算的基準容量
    const maxCapacity = VOLUME_LIMITS_CONFIG[timePeriod]?.maxLiveVehiclesForBackend || 25

    directions.forEach((direction) => {
      const totalVehicles = this.currentPeriodData.totalCount[direction].total

      // ✅ 占有率計算公式（標準 VD 公式）
      // 占有率 = (當前車輛數 / 最大容量) × 100%
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

    // 應用數據範圍約束
    const normalizedSummary = this.normalizeDataForBackend(summary)

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
          motor_count: normalizedSummary.totalCount.east.motor,
          small_car_count: normalizedSummary.totalCount.east.small,
          large_car_count: normalizedSummary.totalCount.east.large,
          total_count: normalizedSummary.totalCount.east.total,
          average_speed: normalizedSummary.averageSpeed.east.overall,
          motor_speed: normalizedSummary.averageSpeed.east.motor,
          small_car_speed: normalizedSummary.averageSpeed.east.small,
          large_car_speed: normalizedSummary.averageSpeed.east.large,
          occupancy: normalizedSummary.occupancy.east,
        },
        west: {
          motor_count: normalizedSummary.totalCount.west.motor,
          small_car_count: normalizedSummary.totalCount.west.small,
          large_car_count: normalizedSummary.totalCount.west.large,
          total_count: normalizedSummary.totalCount.west.total,
          average_speed: normalizedSummary.averageSpeed.west.overall,
          motor_speed: normalizedSummary.averageSpeed.west.motor,
          small_car_speed: normalizedSummary.averageSpeed.west.small,
          large_car_speed: normalizedSummary.averageSpeed.west.large,
          occupancy: normalizedSummary.occupancy.west,
        },
        south: {
          motor_count: normalizedSummary.totalCount.south.motor,
          small_car_count: normalizedSummary.totalCount.south.small,
          large_car_count: normalizedSummary.totalCount.south.large,
          total_count: normalizedSummary.totalCount.south.total,
          average_speed: normalizedSummary.averageSpeed.south.overall,
          motor_speed: normalizedSummary.averageSpeed.south.motor,
          small_car_speed: normalizedSummary.averageSpeed.south.small,
          large_car_speed: normalizedSummary.averageSpeed.south.large,
          occupancy: normalizedSummary.occupancy.south,
        },
        north: {
          motor_count: normalizedSummary.totalCount.north.motor,
          small_car_count: normalizedSummary.totalCount.north.small,
          large_car_count: normalizedSummary.totalCount.north.large,
          total_count: normalizedSummary.totalCount.north.total,
          average_speed: normalizedSummary.averageSpeed.north.overall,
          motor_speed: normalizedSummary.averageSpeed.north.motor,
          small_car_speed: normalizedSummary.averageSpeed.north.small,
          large_car_speed: normalizedSummary.averageSpeed.north.large,
          occupancy: normalizedSummary.occupancy.north,
        },
      },
      metadata: {
        collector_version: '1.1.0',
        total_vehicles_processed: Object.values(normalizedSummary.totalCount).reduce(
          (total, direction) => total + direction.total,
          0,
        ),
        collection_method: 'real_time_event_based',
        data_normalized: this.config.volumeLimits.enableVolumeNormalization,
        volume_capped: this.config.volumeLimits.enableDataCapping,
        backend_compatibility: 'vd_data_range_0_20',
      },
    }
  }

  /**
   * 對數據進行後端兼容性正規化
   */
  normalizeDataForBackend(summary) {
    const normalized = JSON.parse(JSON.stringify(summary))
    const directions = ['east', 'west', 'south', 'north']
    const vehicleTypes = ['motor', 'small', 'large']

    console.log('📊 開始數據正規化，確保後端AI模型兼容性...')

    // ✅ 新增：速度限制配置
    const SPEED_LIMITS = {
      motor: { min: 0, max: 90 }, // 機車最高 90 km/h
      small: { min: 0, max: 120 }, // 小型車最高 120 km/h
      large: { min: 0, max: 100 }, // 大型車最高 100 km/h
      overall: { min: 0, max: 120 }, // 整體平均最高 120 km/h
    }

    let adjustmentsMade = false

    directions.forEach((direction) => {
      vehicleTypes.forEach((type) => {
        const originalCount = normalized.totalCount[direction][type]

        // 應用Volume上限約束
        if (this.config.volumeLimits.enableDataCapping) {
          if (originalCount > this.config.volumeLimits.maxVolumePerType) {
            normalized.totalCount[direction][type] = this.config.volumeLimits.maxVolumePerType
            adjustmentsMade = true
            console.log(
              `⚠️ ${direction}-${type} Volume從 ${originalCount} 調整至 ${this.config.volumeLimits.maxVolumePerType}`,
            )
          }
        }

        // ✅ 改進：速度範圍約束（使用車型特定的限制）
        const originalSpeed = normalized.averageSpeed[direction][type]
        const speedLimit = SPEED_LIMITS[type] || this.config.speedLimits

        if (originalSpeed > speedLimit.max) {
          console.warn(
            `⚠️ [速度調整] ${direction}-${type} 速度 ${originalSpeed} km/h 超過上限 ${speedLimit.max} km/h，已修正`,
          )
          normalized.averageSpeed[direction][type] = speedLimit.max
          adjustmentsMade = true
        } else if (originalSpeed < speedLimit.min) {
          console.warn(
            `⚠️ [速度調整] ${direction}-${type} 速度 ${originalSpeed} km/h 低於下限 ${speedLimit.min} km/h，已修正`,
          )
          normalized.averageSpeed[direction][type] = speedLimit.min
          adjustmentsMade = true
        }
      })

      // 重新計算總計數
      normalized.totalCount[direction].total =
        normalized.totalCount[direction].motor +
        normalized.totalCount[direction].small +
        normalized.totalCount[direction].large

      // 檢查總Volume是否超過上限
      if (
        this.config.volumeLimits.enableDataCapping &&
        normalized.totalCount[direction].total > this.config.volumeLimits.maxTotalVolume
      ) {
        // 按比例縮放
        const scale = this.config.volumeLimits.maxTotalVolume / normalized.totalCount[direction].total
        vehicleTypes.forEach((type) => {
          normalized.totalCount[direction][type] = Math.floor(normalized.totalCount[direction][type] * scale)
        })
        normalized.totalCount[direction].total =
          normalized.totalCount[direction].motor +
          normalized.totalCount[direction].small +
          normalized.totalCount[direction].large
        adjustmentsMade = true
        console.log(`⚠️ ${direction} 總Volume已按比例縮放至 ${normalized.totalCount[direction].total}`)
      }

      // 重新計算整體平均速度
      const totalVehicles = normalized.totalCount[direction].total
      if (totalVehicles > 0) {
        const weightedSpeed =
          normalized.averageSpeed[direction].motor * normalized.totalCount[direction].motor +
          normalized.averageSpeed[direction].small * normalized.totalCount[direction].small +
          normalized.averageSpeed[direction].large * normalized.totalCount[direction].large
        normalized.averageSpeed[direction].overall = Math.round(weightedSpeed / totalVehicles)

        // ✅ 改進：檢查整體平均速度上限
        if (normalized.averageSpeed[direction].overall > SPEED_LIMITS.overall.max) {
          console.warn(
            `⚠️ [整體速度調整] ${direction}方向 整體平均速度 ${normalized.averageSpeed[direction].overall} km/h 超過上限，已修正至 ${SPEED_LIMITS.overall.max}`,
          )
          normalized.averageSpeed[direction].overall = SPEED_LIMITS.overall.max
          adjustmentsMade = true
        }
      } else {
        normalized.averageSpeed[direction].overall = 0
      }

      // 佔用率約束（0-100%）
      if (normalized.occupancy[direction] > 100) {
        normalized.occupancy[direction] = 100
        adjustmentsMade = true
      } else if (normalized.occupancy[direction] < 0) {
        normalized.occupancy[direction] = 0
        adjustmentsMade = true
      }
    })

    if (adjustmentsMade) {
      console.log('✅ 數據正規化完成，已確保與後端AI模型訓練範圍一致')
    } else {
      console.log('✅ 數據在允許範圍內，無需調整')
    }

    return normalized
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

  // 為了相容性，提供 getRealTimeData 別名
  getRealTimeData() {
    return this.getCurrentPeriodSummary()
  }

  /**
   * 設置VD數據兼容性配置
   */
  setVDCompatibilityConfig(config) {
    const vdConfig = {
      volumeLimits: {
        maxVolumePerType: config.maxVolumePerType || 20,
        maxTotalVolume: config.maxTotalVolume || 50,
        enableVolumeNormalization: config.enableVolumeNormalization !== false,
        enableDataCapping: config.enableDataCapping !== false,
      },
      speedLimits: {
        minSpeed: config.minSpeed || 0,
        maxSpeed: config.maxSpeed || 80,
        defaultSpeed: config.defaultSpeed || 40,
      },
    }

    this.updateConfig(vdConfig)
    console.log('🔧 VD數據兼容性配置已更新:', vdConfig)
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    console.log('⚙️ 數據收集器配置已更新:', newConfig)

    // 如果正在運行，重新啟動以應用新配置
    if (this.isCollecting) {
      console.log('� 重新啟動以應用新配置...')
      this.stop()
      setTimeout(() => this.start(), 1000)
    }
  }
}
