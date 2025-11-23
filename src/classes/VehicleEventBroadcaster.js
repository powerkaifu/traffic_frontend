/**
 * VehicleEventBroadcaster.js
 *
 * 全域事件管理器 - 優化事件監聽器架構
 *
 * 作用：
 * - 集中管理車輛的事件監聽，避免每輛車都添加全域監聽器
 * - 維護按方向分組的車輛集合
 * - 精準分發事件給相關車輛
 *
 * 優化效果：
 * - 事件監聽器：從 400+ 個減少到 2 個
 * - 通知效率：從 O(N) 提升到 O(M)（M = 該方向車輛數）
 */

import { logger } from '../utils/logger.js'

export default class VehicleEventBroadcaster {
  constructor() {
    // 按方向分組的車輛集合（用於 lightStateChanged）
    this.vehiclesByDirection = {
      north: new Set(),
      south: new Set(),
      east: new Set(),
      west: new Set(),
    }

    // 所有車輛的集合（用於 weatherSpeedChange）
    this.allVehicles = new Set()

    // 綁定方法到實例（確保 this 正確）
    this.handleLightStateChanged = this.handleLightStateChanged.bind(this)
    this.handleWeatherSpeedChange = this.handleWeatherSpeedChange.bind(this)

    // 設置全域監聽器
    this.setupGlobalListeners()

    logger.log('✅ [VehicleEventBroadcaster] 已初始化 - 使用全域事件管理器模式')
  }

  /**
   * 設置全域監聽器（只需 2 個）
   */
  setupGlobalListeners() {
    window.addEventListener('lightStateChanged', this.handleLightStateChanged)
    window.addEventListener('weatherSpeedChange', this.handleWeatherSpeedChange)
    logger.log('📡 [VehicleEventBroadcaster] 全域監聽器已設置 (2 個)')
  }

  /**
   * 註冊車輛到管理器
   * @param {Vehicle} vehicle - 車輛實例
   */
  register(vehicle) {
    if (!vehicle || !vehicle.direction) {
      logger.warn('⚠️ [VehicleEventBroadcaster] 無效的車輛，無法註冊')
      return
    }

    // 添加到方向集合
    this.vehiclesByDirection[vehicle.direction]?.add(vehicle)

    // 添加到全部車輛集合
    this.allVehicles.add(vehicle)

    logger.debug(
      'Broadcaster',
      `[${vehicle.id}] 已註冊 - ${vehicle.direction} 方向車輛數: ${this.vehiclesByDirection[vehicle.direction]?.size || 0}`,
    )
  }

  /**
   * 從管理器取消註冊車輛
   * @param {Vehicle} vehicle - 車輛實例
   */
  unregister(vehicle) {
    if (!vehicle || !vehicle.direction) {
      return
    }

    // 從方向集合移除
    this.vehiclesByDirection[vehicle.direction]?.delete(vehicle)

    // 從全部車輛集合移除
    this.allVehicles.delete(vehicle)

    logger.debug(
      'Broadcaster',
      `[${vehicle.id}] 已取消註冊 - ${vehicle.direction} 方向剩餘車輛數: ${this.vehiclesByDirection[vehicle.direction]?.size || 0}`,
    )
  }

  /**
   * 處理紅綠燈狀態變化事件
   * @param {CustomEvent} event - 紅綠燈事件
   */
  handleLightStateChanged(event) {
    const { direction, state } = event.detail

    if (!direction || !state) {
      logger.warn('⚠️ [VehicleEventBroadcaster] 無效的燈號事件', event.detail)
      return
    }

    // 只通知該方向的車輛
    const vehicles = this.vehiclesByDirection[direction]
    if (!vehicles || vehicles.size === 0) {
      return
    }

    logger.debug('Broadcast', `🚦 分發燈號變化 ${direction} ${state} → ${vehicles.size} 輛車`)

    // 遍歷該方向的所有車輛
    vehicles.forEach((vehicle) => {
      try {
        // 調用車輛的回調方法
        if (vehicle && typeof vehicle.onLightStateChanged === 'function') {
          vehicle.onLightStateChanged(state, direction)
        }
      } catch (error) {
        logger.warn(`⚠️ [VehicleEventBroadcaster] 車輛 ${vehicle?.id} 處理燈號變化失敗:`, error)
      }
    })
  }

  /**
   * 處理天氣速度變化事件
   * @param {CustomEvent} event - 天氣事件
   */
  handleWeatherSpeedChange(event) {
    const { multiplier } = event.detail

    if (typeof multiplier !== 'number') {
      logger.warn('⚠️ [VehicleEventBroadcaster] 無效的天氣倍數', event.detail)
      return
    }

    // 通知所有車輛
    logger.debug('Broadcast', `🌤️ 分發天氣變化 ${multiplier}x → ${this.allVehicles.size} 輛車`)

    this.allVehicles.forEach((vehicle) => {
      try {
        // 調用車輛的回調方法
        if (vehicle && typeof vehicle.onWeatherSpeedChange === 'function') {
          vehicle.onWeatherSpeedChange(multiplier)
        }
      } catch (error) {
        logger.warn(`⚠️ [VehicleEventBroadcaster] 車輛 ${vehicle?.id} 處理天氣變化失敗:`, error)
      }
    })
  }

  /**
   * 獲取統計資訊（用於調試）
   */
  getStats() {
    return {
      totalVehicles: this.allVehicles.size,
      north: this.vehiclesByDirection.north.size,
      south: this.vehiclesByDirection.south.size,
      east: this.vehiclesByDirection.east.size,
      west: this.vehiclesByDirection.west.size,
    }
  }

  /**
   * 銷毀管理器，清理所有資源
   */
  destroy() {
    logger.log('🛑 [VehicleEventBroadcaster] 開始銷毀...')

    // 移除全域監聽器
    window.removeEventListener('lightStateChanged', this.handleLightStateChanged)
    window.removeEventListener('weatherSpeedChange', this.handleWeatherSpeedChange)

    // 清空所有集合
    this.vehiclesByDirection = {
      north: new Set(),
      south: new Set(),
      east: new Set(),
      west: new Set(),
    }
    this.allVehicles.clear()

    logger.log('✅ [VehicleEventBroadcaster] 已銷毀')
  }
}
