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
   * @param {Object} trafficController - 信號燈控制器，用於判斷是否應該穿透
   * @returns {Object} 控制結果 { isFollowing, distance, action }
   */
  execute(allVehicles = [], trafficController = null) {
    // 防守：檢查必要條件
    if (!this.vehicle || !allVehicles || allVehicles.length === 0) {
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    // 🚑 救護車特權：救護車無需排隊，直接通行
    if (this.vehicle.vehicleType === 'ambulance') {
      return { isFollowing: false, distance: Infinity, action: 'emergency_bypass' }
    }

    // 🚨 防守：新進場的車輛（justCreated=true）不進行碰撞檢測
    if (this.vehicle.justCreated) {
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    // 🆕 改進：通過停止線後的車輛無需碰撞檢測（進入十字路口自由通行）
    if (this.vehicle.hasPassedStopLine) {
      return { isFollowing: false, distance: Infinity, action: 'none' }
    }

    // 🚨 防守：等待綠燈時需要檢查前車狀態
    // 如果前車已經通過停止線，應該清除等待狀態
    if (this.vehicle.waitingForGreen) {
      const frontVehicle = this._findFrontVehicle(allVehicles)
      if (!frontVehicle || frontVehicle.hasPassedStopLine) {
        // 前車已通過或沒有前車，允許這輛車嘗試通過
        // 不返回，繼續執行碰撞檢測邏輯以確保可以安全移動
      } else {
        // 前車仍在停止線前排隊，保持等待
        return { isFollowing: false, distance: Infinity, action: 'none' }
      }
    }

    // 🟢 新增：根據信號燈類型決定哪些車道可以穿透
    // 直行綠燈：2-4 號自由通行，1 號排隊
    // 左轉綠燈：1 號自由通行，2-4 號排隊
    if (trafficController && this._canSkipCollision(trafficController)) {
      // 🔑 關鍵修復：綠燈期間需要恢復車輛運動
      if (this.vehicle.movementTimeline && this.vehicle.movementTimeline.timeScale() === 0) {
        this.vehicle.movementTimeline.timeScale(1)
        this.vehicle.isInCollisionStop = false
      }
      return { isFollowing: false, distance: Infinity, action: 'green_light_bypass' }
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

    // 🆕 獲取方向特定的安全距離設定
    const safeDistance = this._getSafeDistance()

    // 🔑 簡化排隊邏輯：二元決策
    // 只有兩種狀態：停止 或 自由
    if (distance <= safeDistance) {
      // 🛑 距離 ≤ 安全距離：完全停止
      this._applyStop()
      return { isFollowing: true, distance, action: 'stop', frontVehicle }
    } else {
      // ✅ 距離 > 安全距離：恢復原速（解除停止狀態）
      this._restoreSpeed()
      return { isFollowing: false, distance, action: 'resume', frontVehicle }
    }
  }

  /**
   * 判斷是否可以跳過碰撞檢測
   * 根據信號燈類型和車道號決定：
   * - 直行綠燈（green）：2-4 號車道穿透，1 號排隊
   * - 左轉綠燈（leftGreen）：1 號車道穿透，2-4 號排隊
   * @private
   */
  _canSkipCollision(trafficController) {
    if (!trafficController) return false

    const lightState = trafficController.getCurrentLightState(this.vehicle.direction)

    // 直行綠燈：只有 2-4 號車道可以穿透
    if (lightState === 'green') {
      return this.vehicle.laneNumber >= 2 && this.vehicle.laneNumber <= 4
    }

    // 左轉綠燈：只有 1 號車道可以穿透
    if (lightState === 'leftGreen') {
      return this.vehicle.laneNumber === 1
    }

    // 其他信號（黃燈、紅燈）：無法穿透
    return false
  }

  /**
   * 根據方向獲取安全距離
   * 水平方向（東西向）和垂直方向（南北向）使用不同的間距
   * @private
   */
  _getSafeDistance() {
    const isVertical = this.vehicle.direction === 'north' || this.vehicle.direction === 'south'

    if (isVertical) {
      // 垂直方向使用更大的間距
      return FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION.SAFE_DISTANCE_VERTICAL || 25
    } else {
      // 水平方向使用基本間距
      return FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION.SAFE_DISTANCE || 15
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
