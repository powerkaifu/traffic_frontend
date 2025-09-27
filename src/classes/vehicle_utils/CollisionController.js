/**
 * 碰撞控制器
 * 負責處理所有碰撞檢測與跟車相關邏輯，讓 Vehicle.js 保持簡潔
 */

import { COLLISION_CONFIG } from '../config/vehicleConfig.js'

export class CollisionController {
  constructor(vehicle) {
    this.vehicle = vehicle
    this.lastCollisionCheck = 0 // 上次碰撞檢查時間
    this.collisionCheckInterval = COLLISION_CONFIG.CHECK_INTERVAL // 碰撞檢查間隔（毫秒）
    this.nearbyVehicleRange = 100 // 附近車輛檢查範圍
  }

  /**
   * 判斷是否最接近停止線
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {boolean} true表示是最接近停止線的車輛
   */
  isClosestToStopLine(allVehicles) {
    const stopLine = this.vehicle.getStopLinePosition()
    if (!stopLine.x && !stopLine.y) return true

    const currentPosition = this.vehicle.getCurrentPosition()
    let myDistanceToStopLine = 0

    // 計算當前車輛到停止線的距離
    if (this.vehicle.direction === 'east') {
      myDistanceToStopLine = Math.max(0, stopLine.x - currentPosition.x)
    } else if (this.vehicle.direction === 'west') {
      myDistanceToStopLine = Math.max(0, currentPosition.x - stopLine.x)
    } else if (this.vehicle.direction === 'north') {
      myDistanceToStopLine = Math.max(0, currentPosition.y - stopLine.y)
    } else if (this.vehicle.direction === 'south') {
      myDistanceToStopLine = Math.max(0, stopLine.y - currentPosition.y)
    }

    // 檢查同車道是否有更接近停止線的車輛
    for (let vehicle of allVehicles) {
      if (
        vehicle.id === this.vehicle.id ||
        vehicle.direction !== this.vehicle.direction ||
        vehicle.laneNumber !== this.vehicle.laneNumber
      )
        continue

      const otherPosition = vehicle.getCurrentPosition()
      let otherDistanceToStopLine = 0

      if (this.vehicle.direction === 'east') {
        otherDistanceToStopLine = Math.max(0, stopLine.x - otherPosition.x)
      } else if (this.vehicle.direction === 'west') {
        otherDistanceToStopLine = Math.max(0, otherPosition.x - stopLine.x)
      } else if (this.vehicle.direction === 'north') {
        otherDistanceToStopLine = Math.max(0, otherPosition.y - stopLine.y)
      } else if (this.vehicle.direction === 'south') {
        otherDistanceToStopLine = Math.max(0, stopLine.y - otherPosition.y)
      }

      // 如果有其他車輛更接近停止線，則當前車輛不是最前面的
      if (otherDistanceToStopLine < myDistanceToStopLine && otherDistanceToStopLine >= 0) {
        return false
      }
    }

    return true // 當前車輛是該車道最接近停止線的車
  }

  /**
   * 獲取附近車輛，優化檢查範圍
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {Array} 附近車輛陣列
   */
  getNearbyVehicles(allVehicles) {
    const currentBox = this.vehicle.getBoundingBox()
    const nearbyVehicles = []

    for (let vehicle of allVehicles) {
      if (vehicle.id === this.vehicle.id || vehicle.direction !== this.vehicle.direction) continue

      const otherBox = vehicle.getBoundingBox()
      let distance = 0
      let isInRange = false

      // 根據方向計算是否在檢查範圍內
      switch (this.vehicle.direction) {
        case 'east':
          distance = Math.abs(otherBox.centerX - currentBox.centerX)
          isInRange =
            otherBox.centerX > currentBox.centerX &&
            distance <= this.nearbyVehicleRange &&
            Math.abs(otherBox.centerY - currentBox.centerY) < 30
          break
        case 'west':
          distance = Math.abs(otherBox.centerX - currentBox.centerX)
          isInRange =
            otherBox.centerX < currentBox.centerX &&
            distance <= this.nearbyVehicleRange &&
            Math.abs(otherBox.centerY - currentBox.centerY) < 30
          break
        case 'north':
          distance = Math.abs(otherBox.centerY - currentBox.centerY)
          isInRange =
            otherBox.centerY < currentBox.centerY &&
            distance <= this.nearbyVehicleRange &&
            Math.abs(otherBox.centerX - currentBox.centerX) < 30
          break
        case 'south':
          distance = Math.abs(otherBox.centerY - currentBox.centerY)
          isInRange =
            otherBox.centerY > currentBox.centerY &&
            distance <= this.nearbyVehicleRange &&
            Math.abs(otherBox.centerX - currentBox.centerX) < 30
          break
      }

      if (isInRange) {
        nearbyVehicles.push(vehicle)
      }
    }

    return nearbyVehicles
  }

  /**
   * 判斷是否在危險區域
   * @returns {boolean} true表示在危險區域
   */
  isInCriticalZone() {
    // 檢查是否接近停止線
    const distanceToStopLine = this.vehicle.getDistanceToStopLine()
    if (distanceToStopLine !== null && Math.abs(distanceToStopLine) < 20) {
      return true
    }

    // 檢查是否處於關鍵狀態
    return this.vehicle.currentState === 'slowing' || this.vehicle.currentState === 'waitingForVehicle'
  }

  /**
   * 智能碰撞檢查
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  smartCollisionCheck(allVehicles) {
    const currentTime = Date.now()
    const timeSinceLastCheck = currentTime - this.lastCollisionCheck

    // 智能檢查策略
    const shouldCheck =
      timeSinceLastCheck > this.collisionCheckInterval || // 定期檢查
      this.isInCriticalZone() || // 危險區域
      this.vehicle.currentState === 'moving' // 移動狀態

    if (!shouldCheck) {
      return null // 跳過檢查，節省性能
    }

    this.lastCollisionCheck = currentTime

    // 只檢查附近車輛，而不是所有車輛
    const nearbyVehicles = this.getNearbyVehicles(allVehicles)

    if (nearbyVehicles.length === 0) {
      return null // 附近沒有車輛，節省性能
    }

    // 🎯 性能優化：記錄檢查數量對比
    if (Math.random() < 0.01) {
      // 1%概率記錄（避免日誌過多）
      console.log(`🎯 [${this.vehicle.id}] 智能檢查: 從${allVehicles.length}台車縮減到${nearbyVehicles.length}台車`)
    }

    // 使用原有的碰撞檢查邏輯，但只檢查附近車輛
    return this.performDetailedCollisionCheck(nearbyVehicles)
  }

  /**
   * 詳細碰撞檢查（從原 checkSimpleCollision 分離出來）
   * @param {Array} vehicles 要檢查的車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  performDetailedCollisionCheck(vehicles) {
    // 跳過剛創建的車輛
    if (this.vehicle.justCreated) {
      return null
    }

    const currentBox = this.vehicle.getBoundingBox()
    const UNIFORM_GAP = 12 // 統一安全距離（適用於所有車輛狀態）

    for (let vehicle of vehicles) {
      const otherBox = vehicle.getBoundingBox()
      let distance = 0
      let isFrontVehicle = false

      // 簡單方向檢測
      if (this.vehicle.direction === 'east') {
        isFrontVehicle = otherBox.centerX > currentBox.centerX && Math.abs(otherBox.centerY - currentBox.centerY) < 30
        distance = isFrontVehicle ? otherBox.left - currentBox.right : 0
      } else if (this.vehicle.direction === 'west') {
        isFrontVehicle = otherBox.centerX < currentBox.centerX && Math.abs(otherBox.centerY - currentBox.centerY) < 30
        distance = isFrontVehicle ? currentBox.left - otherBox.right : 0
      } else if (this.vehicle.direction === 'north') {
        isFrontVehicle = otherBox.centerY < currentBox.centerY && Math.abs(otherBox.centerX - currentBox.centerX) < 30
        distance = isFrontVehicle ? currentBox.top - otherBox.bottom : 0
      } else if (this.vehicle.direction === 'south') {
        isFrontVehicle = otherBox.centerY > currentBox.centerY && Math.abs(otherBox.centerX - currentBox.centerX) < 30
        distance = isFrontVehicle ? otherBox.top - currentBox.bottom : 0
      }

      if (isFrontVehicle && distance < UNIFORM_GAP && distance >= 0) {
        // 檢查前方車輛狀態
        const isAtStopLine = vehicle.isAtStopLine || vehicle.waitingForGreen
        const isMoving =
          vehicle.movementTimeline && vehicle.movementTimeline.timeScale() > 0 && !vehicle.movementTimeline.paused()

        return {
          shouldStop: true,
          vehicle: vehicle,
          distance: distance,
          requiredGap: UNIFORM_GAP,
          frontVehicleAtStopLine: isAtStopLine,
          frontVehicleIsMoving: isMoving,
        }
      }
    }

    return null // 沒有碰撞威脅
  }

  /**
   * 簡單碰撞檢查（委託給碰撞檢測器）
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  checkSimpleCollision(allVehicles) {
    // 使用車輛的碰撞檢測器
    return this.vehicle.collisionDetector.detectCollision(allVehicles)
  }

  /**
   * 清理資源
   */
  dispose() {
    this.vehicle = null
  }
}
