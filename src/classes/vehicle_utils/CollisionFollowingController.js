/**
 * CollisionFollowingController.js - 碰撞後跟隨控制器
 *
 * 職責：
 * - 檢測前方碰撞
 * - 計算與前車的距離
 * - 根據安全距離決定車輛速度
 * - 確保車輛保持設定的安全距離，不重疊
 *
 * 特點：
 * - 邏輯簡潔、單一職責
 * - 直接控制 timeScale，不受其他邏輯干擾
 * - 優先級最高，在其他邏輯之後執行
 */

import { FOLLOWING_CONFIG } from '../config/vehicleConfig.js'

export class CollisionFollowingController {
  constructor(vehicle) {
    this.vehicle = vehicle
    this.lastCheckTime = 0
    this.checkInterval = 10 // 檢查間隔（毫秒）
    this.lastDistance = Infinity // 上次距離
  }

  /**
   * 執行碰撞跟隨控制
   * 這是主要的執行方法，應該在 updateLogic 的最後被呼叫
   *
   * @param {Array} allVehicles - 所有車輛陣列
   * @returns {Object} 控制結果 { isFollowing, distance, action }
   */
  execute(allVehicles = []) {
    // 防守：檢查必要條件
    if (!this.vehicle || !allVehicles || allVehicles.length === 0) {
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    // 🚨 防守：新進場的車輛（justCreated=true）不進行碰撞檢測
    if (this.vehicle.justCreated) {
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    // 🚨 防守：進場不足 500ms 的新車輛也免除碰撞檢測
    const vehicleAge = Date.now() - new Date(this.vehicle.createdAt).getTime()
    if (vehicleAge < 500) {
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    // 🚨 防守：停止線附近和等待綠燈時，不進行碰撞跟隨檢測
    if (this.vehicle.isAtStopLine || this.vehicle.waitingForGreen) {
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    const now = Date.now()
    if (now - this.lastCheckTime < this.checkInterval) {
      return { isFollowing: false, distance: this.lastDistance, action: 'none' }
    }
    this.lastCheckTime = now

    // 查找前方最近的同車道車輛
    const frontVehicle = this._findFrontVehicle(allVehicles)

    if (!frontVehicle) {
      // 前方無車
      this.lastDistance = Infinity
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    // 計算距離
    const distance = this._calculateDistance(this.vehicle, frontVehicle)
    this.lastDistance = distance

    // 獲取安全距離設定
    const safeDistance = FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION.SAFE_DISTANCE

    // 根據距離決定行動
    if (distance <= safeDistance) {
      // 距離已達安全距離，完全停止
      this._applyStop()
      return { isFollowing: true, distance, action: 'stop', frontVehicle }
    } else if (distance <= 400) {
      // 🔥 改進：距離在 25px 到 400px 之間時，都進行動態減速
      // 這樣能更早地接近前車，避免 200px+ 的大距離
      const distanceDiff = distance - safeDistance
      this._applySlow(distanceDiff, safeDistance)
      return { isFollowing: true, distance, action: 'slow', frontVehicle }
    } else {
      // 距離太遠（> 400px），不需要跟隨
      // 保持原速，讓其他系統控制
      return { isFollowing: false, distance, action: 'none' }
    }
  }

  /**
   * 查找前方最近的同車道車輛
   * @private
   */
  _findFrontVehicle(allVehicles) {
    let closestVehicle = null
    let minDistance = Infinity

    for (const other of allVehicles) {
      // 篩選條件：同方向、同車道、不是自己、不是新進場車輛
      if (
        other.id === this.vehicle.id ||
        other.direction !== this.vehicle.direction ||
        other.laneNumber !== this.vehicle.laneNumber ||
        other.isRemoved ||
        other.justCreated // 🚨 排除剛進場的車輛（justCreated=true）
      ) {
        continue
      }

      // 🚨 排除進場不超過 500ms 的車輛（讓它們有時間上路）
      const vehicleAge = Date.now() - new Date(other.createdAt).getTime()
      if (vehicleAge < 500) {
        continue
      }

      // 計算距離
      const distance = this._calculateDistance(this.vehicle, other)

      // 只關注前方車輛（距離 > 0）且是最近的
      if (distance > 0 && distance < minDistance) {
        closestVehicle = other
        minDistance = distance
      }
    }

    return closestVehicle
  }

  /**
   * 計算兩台車之間的距離（從 this.vehicle 到 other 的間距）
   * @private
   */
  _calculateDistance(vehicle1, vehicle2) {
    const pos1 = vehicle1.getCurrentPosition()
    const pos2 = vehicle2.getCurrentPosition()

    if (!pos1 || !pos2) return Infinity

    // 根據方向計算中心點間距
    let centerDistance = 0
    switch (vehicle1.direction) {
      case 'east':
        centerDistance = pos2.x - pos1.x
        break
      case 'west':
        centerDistance = pos1.x - pos2.x
        break
      case 'south':
        centerDistance = pos2.y - pos1.y
        break
      case 'north':
        centerDistance = pos1.y - pos2.y
        break
      default:
        return Infinity
    }

    // 獲取車輛尺寸
    const config1 = vehicle1.getVehicleConfig()
    const config2 = vehicle2.getVehicleConfig()

    let vehicle1Length = 0
    let vehicle2Length = 0

    switch (vehicle1.direction) {
      case 'east':
      case 'west':
        vehicle1Length = config1.width
        vehicle2Length = config2.width
        break
      case 'south':
      case 'north':
        vehicle1Length = config1.height
        vehicle2Length = config2.height
        break
    }

    // 實際間距 = 中心距離 - 兩輛車的半長度
    const actualSpacing = centerDistance - vehicle1Length / 2 - vehicle2Length / 2
    return actualSpacing
  }

  /**
   * 應用完全停止
   * @private
   */
  _applyStop() {
    if (this.vehicle.movementTimeline && this.vehicle.movementTimeline.timeScale() !== 0) {
      this.vehicle.movementTimeline.timeScale(0)
      this.vehicle.isInCollisionStop = true
    }
  }

  /**
   * 應用微速前進
   * @private
   */
  _applySlow(distanceDiff, safeDistance) {
    // 🚨 改進：距離越大，速度越快（而不是固定的微速）
    // 目標：快速接近到安全距離，然後微調
    const minSlowSpeed = 0.05 // 最小微速前進速度（5%）
    const maxApproachSpeed = 0.3 // 最大接近速度（30%）
    const approachThreshold = 150 // 超過150px時開始快速接近

    let newTimeScale = minSlowSpeed

    if (distanceDiff > approachThreshold) {
      // 距離很遠時：快速接近
      newTimeScale = maxApproachSpeed
    } else if (distanceDiff > safeDistance) {
      // 在安全距離附近時：線性插值，逐漸減速
      const ratio = (distanceDiff - safeDistance) / (approachThreshold - safeDistance)
      newTimeScale = minSlowSpeed + (maxApproachSpeed - minSlowSpeed) * ratio
    }

    if (this.vehicle.movementTimeline) {
      this.vehicle.movementTimeline.timeScale(newTimeScale)
      this.vehicle.isInCollisionStop = false
    }
  }

  /**
   * 清理
   */
  dispose() {
    this.vehicle = null
  }
}

export default CollisionFollowingController
