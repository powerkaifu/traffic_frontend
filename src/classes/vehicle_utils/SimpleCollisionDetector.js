/**
 * SimpleCollisionDetector.js - 簡化版碰撞檢測器
 *
 * 設計理念：
 * - 只檢測前方車輛，忽略側面和後方
 * - 統一的5px停止間距，避免重疊
 * - 高性能：50ms檢查間隔，只計算必要的距離
 * - 清晰的API：返回簡單的action指令
 */

export class SimpleCollisionDetector {
  // 🔧 可直接修改的距離參數 - 讓使用者自由調整
  static STOP_DISTANCE = 2 // 停止距離（px）- 可直接修改此值
  static SLOW_DISTANCE = 15 // 減速距離（px）- 可直接修改此值
  static LANE_TOLERANCE = 30 // 車道對齊容差（px）- 可直接修改此值

  constructor(vehicle) {
    this.vehicle = vehicle
    this.lastCheckTime = 0
    this.checkInterval = 50 // 50ms檢查間隔，平衡性能與響應性

    console.log(`🔧 [${this.vehicle.id}] SimpleCollisionDetector 已初始化`)
    console.log(
      `� 當前距離設定: STOP=${SimpleCollisionDetector.STOP_DISTANCE}px, SLOW=${SimpleCollisionDetector.SLOW_DISTANCE}px`,
    )
  }

  /**
   * 主要碰撞檢測方法
   * @param {Array} allVehicles - 所有車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  detectCollision(allVehicles) {
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

      if (distance > 0 && distance < SimpleCollisionDetector.SLOW_DISTANCE && distance < minDistance) {
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

    if (distance <= SimpleCollisionDetector.STOP_DISTANCE) {
      return {
        action: 'stop',
        vehicle: threatVehicle,
        distance: distance,
        shouldStop: true,
        shouldFollow: false,
        targetSpeed: 0,
        reason: `距離過近需停止: ${distance.toFixed(1)}px`,
      }
    }

    if (distance <= SimpleCollisionDetector.SLOW_DISTANCE) {
      // 根據距離計算跟車速度 (距離越近速度越慢)
      const speedRatio = Math.max(
        0.1,
        (distance - SimpleCollisionDetector.STOP_DISTANCE) /
          (SimpleCollisionDetector.SLOW_DISTANCE - SimpleCollisionDetector.STOP_DISTANCE),
      )
      return {
        action: 'follow',
        vehicle: threatVehicle,
        distance: distance,
        shouldStop: false,
        shouldFollow: true,
        targetSpeed: speedRatio,
        reason: `跟車模式: ${distance.toFixed(1)}px, 速度: ${(speedRatio * 100).toFixed(0)}%`,
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
      return Math.abs(myPos.y - otherPos.y) <= SimpleCollisionDetector.LANE_TOLERANCE
    } else {
      // 南北向：檢查X軸對齊
      return Math.abs(myPos.x - otherPos.x) <= SimpleCollisionDetector.LANE_TOLERANCE
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
   * 獲取碰撞檢測統計信息
   */
  getStats() {
    return {
      checkInterval: this.checkInterval,
      stopDistance: SimpleCollisionDetector.STOP_DISTANCE,
      slowDistance: SimpleCollisionDetector.SLOW_DISTANCE,
      laneNumber: this.vehicle.laneNumber,
      direction: this.vehicle.direction,
      vehicleType: this.vehicle.vehicleType,
    }
  }

  /**
   * 調試方法：顯示當前檢測狀態
   */
  debugInfo() {
    const pos = this.vehicle.getCurrentPosition()
    return {
      vehicleId: this.vehicle.id,
      position: pos,
      direction: this.vehicle.direction,
      laneNumber: this.vehicle.laneNumber,
      lastCheckTime: this.lastCheckTime,
      checkInterval: this.checkInterval,
    }
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
    console.log(`🗑️ [${this.vehicle.id}] SimpleCollisionDetector 已清理`)
  }
}

/**
 * 工廠方法：創建特定配置的碰撞檢測器
 */
export class CollisionDetectorFactory {
  static createForLane(vehicle, laneNumber) {
    const detector = new SimpleCollisionDetector(vehicle)

    // 根據車道調整檢查間隔
    if (laneNumber === 1) {
      // 左轉車道：更頻繁檢查
      detector.setCheckInterval(40)
    } else {
      // 直行車道：標準設定
      detector.setCheckInterval(50)
    }

    return detector
  }

  static createFastDetector(vehicle) {
    const detector = new SimpleCollisionDetector(vehicle)
    detector.setCheckInterval(25) // 高頻檢查
    return detector
  }

  static createConservativeDetector(vehicle) {
    const detector = new SimpleCollisionDetector(vehicle)
    detector.setCheckInterval(75) // 低頻檢查
    return detector
  }
}
