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
  constructor(vehicle) {
    this.vehicle = vehicle
    this.lastCheckTime = 0
    this.checkInterval = 50 // 50ms檢查間隔，平衡性能與響應性

    // 距離配置
    this.STOP_DISTANCE = 5 // 5px以內立即停止
    this.SLOW_DISTANCE = 25 // 25px以內開始減速
    this.LANE_TOLERANCE = 30 // 車道對齊容差

    console.log(`🔧 [${this.vehicle.id}] SimpleCollisionDetector 已初始化`)
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

      if (distance > 0 && distance < this.SLOW_DISTANCE && distance < minDistance) {
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

    if (distance <= this.STOP_DISTANCE) {
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

    if (distance <= this.SLOW_DISTANCE) {
      // 根據距離計算跟車速度 (距離越近速度越慢)
      const speedRatio = Math.max(0.1, (distance - this.STOP_DISTANCE) / (this.SLOW_DISTANCE - this.STOP_DISTANCE))
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

    // 獲取車輛尺寸
    const vehicleSize = this.getVehicleSize()

    switch (this.vehicle.direction) {
      case 'east':
        // 東向：檢查右邊的車輛
        if (otherPos.x <= myPos.x) return -1 // 不在前方
        return otherPos.x - myPos.x - vehicleSize.width

      case 'west':
        // 西向：檢查左邊的車輛
        if (otherPos.x >= myPos.x) return -1 // 不在前方
        return myPos.x - otherPos.x - vehicleSize.width

      case 'north':
        // 北向：檢查上方的車輛
        if (otherPos.y >= myPos.y) return -1 // 不在前方
        return myPos.y - otherPos.y - vehicleSize.height

      case 'south':
        // 南向：檢查下方的車輛
        if (otherPos.y <= myPos.y) return -1 // 不在前方
        return otherPos.y - myPos.y - vehicleSize.height

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
      return Math.abs(myPos.y - otherPos.y) <= this.LANE_TOLERANCE
    } else {
      // 南北向：檢查X軸對齊
      return Math.abs(myPos.x - otherPos.x) <= this.LANE_TOLERANCE
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
      stopDistance: this.STOP_DISTANCE,
      slowDistance: this.SLOW_DISTANCE,
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
    console.log(`🔧 [${this.vehicle.id}] 碰撞檢查間隔設為: ${this.checkInterval}ms`)
  }

  /**
   * 設置距離參數
   */
  setDistances(stopDistance, slowDistance) {
    this.STOP_DISTANCE = Math.max(1, stopDistance)
    this.SLOW_DISTANCE = Math.max(this.STOP_DISTANCE + 5, slowDistance)
    console.log(`🔧 [${this.vehicle.id}] 距離參數設為: 停止=${this.STOP_DISTANCE}px, 減速=${this.SLOW_DISTANCE}px`)
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

    // 根據車道調整參數
    if (laneNumber === 1) {
      // 左轉車道：更保守的距離設定
      detector.setDistances(8, 30)
      detector.setCheckInterval(40) // 更頻繁檢查
    } else {
      // 直行車道：標準設定
      detector.setDistances(5, 25)
      detector.setCheckInterval(50)
    }

    return detector
  }

  static createFastDetector(vehicle) {
    const detector = new SimpleCollisionDetector(vehicle)
    detector.setCheckInterval(25) // 高頻檢查
    detector.setDistances(3, 20) // 更緊密間距
    return detector
  }

  static createConservativeDetector(vehicle) {
    const detector = new SimpleCollisionDetector(vehicle)
    detector.setCheckInterval(75) // 低頻檢查
    detector.setDistances(10, 35) // 更寬鬆間距
    return detector
  }
}
