/**
 * CollisionFollowingController.js - 碰撞排隊控制器
 *
 * 職責：
 * - 檢測前方碰撞
 * - 計算與前車的距離
 * - 當距離 ≤ SAFE_DISTANCE 時停止車輛
 * - 當距離 > SAFE_DISTANCE 時允許車輛自由行駛
 *
 * 特點：
 * - 只處理排隊停止，不進行動態減速
 * - 邏輯簡潔、單一職責
 * - 直接控制 timeScale，不受其他邏輯干擾
 * - 優先級：停止線前（排隊）> 通過停止線後（禁用）
 */

import { FOLLOWING_CONFIG } from '../config/vehicleConfig.js'

export class CollisionFollowingController {
  constructor(vehicle) {
    this.vehicle = vehicle
    this.lastCheckTime = 0
    this.checkInterval = 0 // 🆕 改為 0：每次 updateLogic 都執行碰撞檢測（已由 RAF 按 100ms 頻率調用）
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

    // 🆕 改進：通過停止線後的車輛無需碰撞檢測（進入十字路口自由通行）
    if (this.vehicle.hasPassedStopLine) {
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    // 🚨 防守：等待綠燈時不進行碰撞跟隨檢測（由信號燈邏輯單獨控制）
    // 注意：isAtStopLine 可以進行碰撞排隊，但 waitingForGreen 時跳過
    if (this.vehicle.waitingForGreen) {
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

    // 🔑 簡化排隊邏輯：二元決策
    // 只有兩種狀態：停止 或 自由
    if (distance <= safeDistance) {
      // 🛑 距離 ≤ 25px：完全停止
      this._applyStop()
      return { isFollowing: true, distance, action: 'stop', frontVehicle }
    } else {
      // ✅ 距離 > 25px：恢復原速（解除停止狀態）
      this._restoreSpeed()
      return { isFollowing: false, distance, action: 'resume', frontVehicle }
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
      // 🔑 基本篩選：同方向、同車道、不是自己、沒被移除
      if (
        other.id === this.vehicle.id ||
        other.direction !== this.vehicle.direction ||
        other.laneNumber !== this.vehicle.laneNumber ||
        other.isRemoved
      ) {
        continue
      }

      // � 排除新進場的車輛
      // justCreated 在 500ms 後會自動變為 false
      if (other.justCreated) {
        continue
      }

      // 計算距離
      const distance = this._calculateDistance(this.vehicle, other)

      // 🔑 只關注前方車輛（距離 > 0）且是最近的
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
   * 只有在沒有其他邏輯控制時才停止
   * @private
   */
  _applyStop() {
    if (!this.vehicle.movementTimeline) return

    const currentTimeScale = this.vehicle.movementTimeline.timeScale()

    // 🔑 關鍵改進：只在未被其他邏輯控制時才停止
    // 如果已經被停止線/信號燈邏輯停止，不要覆蓋
    if (currentTimeScale !== 0) {
      // 不是停止狀態，設定為停止
      this.vehicle.movementTimeline.timeScale(0)
      this.vehicle.isInCollisionStop = true
    }
  }

  /**
   * 恢復原速（解除停止狀態）
   * 當距離 > SAFE_DISTANCE 時，車輛應恢復正常速度
   * @private
   */
  _restoreSpeed() {
    if (!this.vehicle.movementTimeline) return

    const currentTimeScale = this.vehicle.movementTimeline.timeScale()

    // 🔑 關鍵改進：只恢復由碰撞系統設定的停止
    // 不要恢復由停止線/信號燈邏輯設定的停止
    if (currentTimeScale === 0 && this.vehicle.isInCollisionStop === true) {
      // 這是碰撞系統的停止，現在可以恢復
      this.vehicle.movementTimeline.timeScale(1.0)
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
