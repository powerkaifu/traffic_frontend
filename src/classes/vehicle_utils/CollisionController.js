/**
 * 碰撞控制器
 * 負責處理所有碰撞檢測與跟車相關邏輯，讓 Vehicle.js 保持簡潔
 * 整合了 SimpleCollisionDetector 的功能
 */

import { COLLISION_CONFIG } from '../config/vehicleConfig.js'

export class CollisionController {
  // 🔧 SimpleCollisionDetector 整合的距離參數
  static STOP_DISTANCE = 12 // 停止距離（px）
  static SLOW_DISTANCE = 25 // 減速距離（px）
  static LANE_TOLERANCE = 25 // 車道對齊容差（px）

  constructor(vehicle) {
    this.vehicle = vehicle
    this.lastCollisionCheck = 0 // 上次碰撞檢查時間
    this.collisionCheckInterval = COLLISION_CONFIG.CHECK_INTERVAL // 碰撞檢查間隔（毫秒）
    this.nearbyVehicleRange = 100 // 附近車輛檢查範圍

    // SimpleCollisionDetector 整合的屬性
    this.lastCheckTime = 0
    this.checkInterval = 50 // 50ms檢查間隔，平衡性能與響應性

    console.log(`🔧 [${this.vehicle.id}] CollisionController 已初始化（整合 SimpleCollisionDetector）`)
    console.log(
      `⚙️ 當前距離設定: STOP=${CollisionController.STOP_DISTANCE}px, SLOW=${CollisionController.SLOW_DISTANCE}px`,
    )
  }

  /**
   * 🚦 判斷車輛是否已經通過停止線
   * @returns {boolean} true表示已通過停止線
   */
  isVehiclePassedStopLine() {
    // 首先檢查車輛的內建標記
    if (this.vehicle.hasPassedStopLine) {
      return true
    }

    const stopLine = this.vehicle.getStopLinePosition()
    const currentPos = this.vehicle.getCurrentPosition()

    if ((!stopLine.x && !stopLine.y) || !currentPos) {
      return false // 無法判斷時預設為未通過
    }

    let hasPassedStopLine = false

    // 根據車輛方向判斷是否已通過停止線
    switch (this.vehicle.direction) {
      case 'east':
        hasPassedStopLine = currentPos.x > stopLine.x
        break
      case 'west':
        hasPassedStopLine = currentPos.x < stopLine.x
        break
      case 'north':
        hasPassedStopLine = currentPos.y < stopLine.y
        break
      case 'south':
        hasPassedStopLine = currentPos.y > stopLine.y
        break
    }

    return hasPassedStopLine
  }

  /**
   * 🚦 判斷另一輛車是否已經通過停止線
   * @param {Vehicle} otherVehicle 其他車輛
   * @returns {boolean}
   */
  isOtherVehiclePassedStopLine(otherVehicle) {
    if (otherVehicle.hasPassedStopLine) {
      return true
    }

    const stopLine = otherVehicle.getStopLinePosition()
    const otherPos = otherVehicle.getCurrentPosition()

    if ((!stopLine.x && !stopLine.y) || !otherPos) {
      return false
    }

    switch (otherVehicle.direction) {
      case 'east':
        return otherPos.x > stopLine.x
      case 'west':
        return otherPos.x < stopLine.x
      case 'north':
        return otherPos.y < stopLine.y
      case 'south':
        return otherPos.y > stopLine.y
      default:
        return false
    }
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
   * 🚦 智能碰撞檢查 - 根據停止線位置採用不同策略
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

    // 🚦 根據當前車輛是否通過停止線決定碰撞策略
    const hasPassedStopLine = this.isVehiclePassedStopLine()

    if (hasPassedStopLine) {
      // ✅ 已通過停止線：允許穿透超車，不進行嚴格碰撞檢測
      console.log(`🚦✅ [${this.vehicle.id}] 已通過停止線，啟用穿透模式`)
      return null // 不阻止移動，允許穿透
    } else {
      // 🚦❌ 未通過停止線：執行嚴格排隊機制
      console.log(`🚦❌ [${this.vehicle.id}] 未通過停止線，執行排隊檢測`)
      return this.performQueueingCollisionCheck(allVehicles)
    }
  }

  /**
   * 🚗 停止線前排隊碰撞檢測 - 確保車輛逐一接近停止線
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  performQueueingCollisionCheck(allVehicles) {
    const currentBox = this.vehicle.getBoundingBox()
    const QUEUE_GAP = 15 // 排隊安全距離

    // 只檢查同方向同車道的車輛
    const samePathVehicles = allVehicles.filter(
      (v) =>
        v.id !== this.vehicle.id && v.direction === this.vehicle.direction && v.laneNumber === this.vehicle.laneNumber,
    )

    let closestFrontVehicle = null
    let minDistance = Infinity

    for (let vehicle of samePathVehicles) {
      const otherBox = vehicle.getBoundingBox()
      let distance = 0
      let isFrontVehicle = false

      // 檢查是否為前方車輛
      switch (this.vehicle.direction) {
        case 'east':
          isFrontVehicle = otherBox.centerX > currentBox.centerX && Math.abs(otherBox.centerY - currentBox.centerY) < 30
          distance = isFrontVehicle ? otherBox.left - currentBox.right : Infinity
          break
        case 'west':
          isFrontVehicle = otherBox.centerX < currentBox.centerX && Math.abs(otherBox.centerY - currentBox.centerY) < 30
          distance = isFrontVehicle ? currentBox.left - otherBox.right : Infinity
          break
        case 'north':
          isFrontVehicle = otherBox.centerY < currentBox.centerY && Math.abs(otherBox.centerX - currentBox.centerX) < 30
          distance = isFrontVehicle ? currentBox.top - otherBox.bottom : Infinity
          break
        case 'south':
          isFrontVehicle = otherBox.centerY > currentBox.centerY && Math.abs(otherBox.centerX - currentBox.centerX) < 30
          distance = isFrontVehicle ? otherBox.top - currentBox.bottom : Infinity
          break
      }

      // 找到最近的前方車輛
      if (isFrontVehicle && distance < minDistance && distance >= 0) {
        minDistance = distance
        closestFrontVehicle = vehicle
      }
    }

    // 如果沒有前方車輛，檢查是否接近停止線
    if (!closestFrontVehicle) {
      return this.checkStopLineApproach()
    }

    // 檢查與前車距離
    if (minDistance < QUEUE_GAP) {
      // 🚦 關鍵：檢查前車是否也在停止線前排隊
      const frontVehiclePassedStopLine = this.isOtherVehiclePassedStopLine(closestFrontVehicle)

      if (frontVehiclePassedStopLine) {
        // ✅ 前車已通過停止線，允許當前車輛繼續前進到停止線
        console.log(`🚦➡️ [${this.vehicle.id}] 前車已通過停止線，繼續前進到停止線`)
        return this.checkStopLineApproach()
      } else {
        // ❌ 前車仍在停止線前，需要排隊等待
        const frontVehicleMoving =
          closestFrontVehicle.movementTimeline &&
          closestFrontVehicle.movementTimeline.timeScale() > 0 &&
          !closestFrontVehicle.movementTimeline.paused()

        return {
          shouldStop: !frontVehicleMoving, // 前車停止時才完全停止
          shouldFollow: frontVehicleMoving, // 前車移動時跟隨
          vehicle: closestFrontVehicle,
          distance: minDistance,
          requiredGap: QUEUE_GAP,
          reason: `停止線前排隊: 距離${minDistance.toFixed(1)}px, 前車${frontVehicleMoving ? '移動中' : '已停止'}`,
          targetSpeed: frontVehicleMoving ? Math.min(0.8, minDistance / QUEUE_GAP) : 0,
        }
      }
    }

    // 距離足夠，檢查停止線
    return this.checkStopLineApproach()
  }

  /**
   * 🚦 檢查接近停止線的情況
   * @returns {Object|null} 停止線檢查結果
   */
  checkStopLineApproach() {
    const stopLine = this.vehicle.getStopLinePosition()
    const currentPos = this.vehicle.getCurrentPosition()

    if ((!stopLine.x && !stopLine.y) || !currentPos) {
      return null // 無停止線資訊，允許通行
    }

    let distanceToStopLine = 0

    // 計算到停止線的距離
    switch (this.vehicle.direction) {
      case 'east':
        distanceToStopLine = Math.max(0, stopLine.x - currentPos.x)
        break
      case 'west':
        distanceToStopLine = Math.max(0, currentPos.x - stopLine.x)
        break
      case 'north':
        distanceToStopLine = Math.max(0, currentPos.y - stopLine.y)
        break
      case 'south':
        distanceToStopLine = Math.max(0, stopLine.y - currentPos.y)
        break
    }

    // 如果距離停止線很近且燈號不允許通行，則停止
    if (distanceToStopLine < 20) {
      // 20px內接近停止線
      // 這裡可以加入交通燈檢查邏輯
      console.log(`🚦🔴 [${this.vehicle.id}] 接近停止線: ${distanceToStopLine.toFixed(1)}px`)
      return null // 讓交通燈邏輯處理停止
    }

    return null // 允許繼續前進
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

    // 🚨 1號車道特殊處理：使用更大的安全距離
    const LANE_1_ENHANCED_GAP = this.vehicle.laneNumber === 1 ? 18 : UNIFORM_GAP // 1號車道使用18px安全距離

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

      if (isFrontVehicle && distance < LANE_1_ENHANCED_GAP && distance >= 0) {
        // 檢查前方車輛狀態
        const isAtStopLine = vehicle.isAtStopLine || vehicle.waitingForGreen
        const isMoving =
          vehicle.movementTimeline && vehicle.movementTimeline.timeScale() > 0 && !vehicle.movementTimeline.paused()

        return {
          shouldStop: true,
          vehicle: vehicle,
          distance: distance,
          requiredGap: LANE_1_ENHANCED_GAP, // 使用對應的安全距離
          frontVehicleAtStopLine: isAtStopLine,
          frontVehicleIsMoving: isMoving,
        }
      }
    }

    return null // 沒有碰撞威脅
  }

  /**
   * 簡單碰撞檢查（整合 SimpleCollisionDetector 功能）
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  checkSimpleCollision(allVehicles) {
    // 性能優化：限制檢查頻率
    const now = Date.now()
    if (now - this.lastCheckTime < this.checkInterval) {
      return null
    }
    this.lastCheckTime = now

    const myPos = this.vehicle.getCurrentPosition()
    if (!myPos) {
      return null
    }

    // 🚦 核心邏輯：根據停止線位置決定碰撞策略
    const hasPassedStopLine = this.isVehiclePassedStopLine()

    if (hasPassedStopLine) {
      // ✅ 已通過停止線：允許穿透，不進行碰撞檢測
      console.log(`🚦✅ [${this.vehicle.id}] 簡單檢測：已通過停止線，允許穿透`)
      return null
    }

    // ❌ 未通過停止線：執行原有碰撞檢測
    console.log(`🚦❌ [${this.vehicle.id}] 簡單檢測：未通過停止線，執行碰撞檢測`)

    // 只檢查同方向的車輛
    const sameDirectionVehicles = allVehicles.filter(
      (v) =>
        v.id !== this.vehicle.id && v.direction === this.vehicle.direction && v.laneNumber === this.vehicle.laneNumber,
    )

    if (sameDirectionVehicles.length === 0) {
      return null
    }

    // 尋找最近的前方車輛
    let closestThreat = null
    let minDistance = Infinity

    for (let other of sameDirectionVehicles) {
      const otherPos = other.getCurrentPosition()
      if (!otherPos) continue

      const distance = this.calculateDirectionalDistance(myPos, otherPos)

      if (distance > 0 && distance < CollisionController.SLOW_DISTANCE && distance < minDistance) {
        minDistance = distance
        closestThreat = {
          vehicle: other,
          distance: distance,
        }
      }
    }

    if (!closestThreat) {
      return null
    }

    // 根據距離決定動作
    const { distance, vehicle: threatVehicle } = closestThreat

    if (distance <= CollisionController.STOP_DISTANCE) {
      return {
        action: 'stop',
        vehicle: threatVehicle,
        distance: distance,
        shouldStop: true,
        shouldFollow: false,
        targetSpeed: 0,
        requiredGap: CollisionController.STOP_DISTANCE,
        reason: `距離過近需停止: ${distance.toFixed(1)}px`,
      }
    }

    if (distance <= CollisionController.SLOW_DISTANCE) {
      // 檢查前車速度，防止快車穿越慢車
      const frontVehicleSpeed = threatVehicle.movementTimeline ? threatVehicle.movementTimeline.timeScale() : 0
      const mySpeed = this.vehicle.movementTimeline ? this.vehicle.movementTimeline.timeScale() : 0

      // 如果前車較慢或停止，後車必須更大幅度減速
      let speedRatio
      if (frontVehicleSpeed <= 0.1) {
        // 前車停止，後車也必須停止
        speedRatio = 0
      } else if (frontVehicleSpeed < mySpeed) {
        // 前車較慢，後車速度不能超過前車
        speedRatio = Math.min(
          frontVehicleSpeed * 0.8,
          Math.max(
            0.1,
            (distance - CollisionController.STOP_DISTANCE) /
              (CollisionController.SLOW_DISTANCE - CollisionController.STOP_DISTANCE),
          ),
        )
      } else {
        // 正常跟車
        speedRatio = Math.max(
          0.1,
          (distance - CollisionController.STOP_DISTANCE) /
            (CollisionController.SLOW_DISTANCE - CollisionController.STOP_DISTANCE),
        )
      }

      return {
        action: 'follow',
        vehicle: threatVehicle,
        distance: distance,
        shouldStop: speedRatio === 0,
        shouldFollow: true,
        targetSpeed: speedRatio,
        requiredGap: CollisionController.STOP_DISTANCE,
        reason: `跟車模式: ${distance.toFixed(1)}px, 速度: ${(speedRatio * 100).toFixed(0)}%, 前車速度: ${(frontVehicleSpeed * 100).toFixed(0)}%`,
      }
    }

    return null
  }

  /**
   * 計算方向性距離
   * 根據車輛行進方向，只計算前方車輛的距離
   */
  calculateDirectionalDistance(myPos, otherPos) {
    // 首先檢查是否在同一車道
    if (!this.isInSameLane(myPos, otherPos)) {
      return -1 // 不在同車道，無需檢測
    }

    // 獲取車輛尺寸 - 統一使用較小的尺寸確保間距一致
    const vehicleSize = this.getVehicleSize()
    const uniformSize = Math.min(vehicleSize.width, vehicleSize.height) // 使用較小的尺寸

    switch (this.vehicle.direction) {
      case 'east':
        // 東向：檢查右邊的車輛
        if (otherPos.x <= myPos.x) return -1 // 不在前方
        return otherPos.x - myPos.x - uniformSize

      case 'west':
        // 西向：檢查左邊的車輛
        if (otherPos.x >= myPos.x) return -1 // 不在前方
        return myPos.x - otherPos.x - uniformSize

      case 'north':
        // 北向：檢查上方的車輛
        if (otherPos.y >= myPos.y) return -1 // 不在前方
        return myPos.y - otherPos.y - uniformSize

      case 'south':
        // 南向：檢查下方的車輛
        if (otherPos.y <= myPos.y) return -1 // 不在前方
        return otherPos.y - myPos.y - uniformSize

      default:
        console.warn(`🚨 [${this.vehicle.id}] 未知的方向: ${this.vehicle.direction}`)
        return -1
    }
  }

  /**
   * 檢查兩車是否在同一車道
   */
  isInSameLane(myPos, otherPos) {
    if (this.vehicle.direction === 'east' || this.vehicle.direction === 'west') {
      // 東西向：檢查Y軸對齊
      return Math.abs(myPos.y - otherPos.y) <= CollisionController.LANE_TOLERANCE
    } else {
      // 南北向：檢查X軸對齊
      return Math.abs(myPos.x - otherPos.x) <= CollisionController.LANE_TOLERANCE
    }
  }

  /**
   * 獲取車輛尺寸
   */
  getVehicleSize() {
    // 根據車輛類型返回不同尺寸
    const sizeMap = {
      small: { width: 15, height: 30 },
      medium: { width: 18, height: 35 },
      large: { width: 20, height: 40 },
    }

    return sizeMap[this.vehicle.vehicleType] || sizeMap['large']
  }

  /**
   * 設置檢查間隔
   */
  setCheckInterval(interval) {
    this.checkInterval = Math.max(10, interval) // 最小10ms
  }

  /**
   * 清理資源
   */
  dispose() {
    console.log(`🗑️ [${this.vehicle.id}] CollisionController 已清理（包含 SimpleCollisionDetector 功能）`)
    this.vehicle = null
  }

  /**
   * 工廠方法：創建特定配置的碰撞控制器
   */
  static createForLane(vehicle, laneNumber) {
    const controller = new CollisionController(vehicle)

    // 根據車道調整檢查間隔
    if (laneNumber === 1) {
      // 左轉車道：更頻繁檢查，減少重疊風險
      controller.setCheckInterval(30) // 從40ms改為30ms，更頻繁檢查
    } else {
      // 直行車道：標準設定
      controller.setCheckInterval(50)
    }

    return controller
  }
}
