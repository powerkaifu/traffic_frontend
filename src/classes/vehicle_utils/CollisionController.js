/**
 * 碰撞控制器 - 簡化版 v2
 * 負責：
 * 1. 檢查燈號停止（紅燈、黃燈、全紅時停止）
 * 2. 檢查前方碰撞（距離 < 30px）
 * 3. 返回停止或蠕行的指令
 */

// 🎯 可配置參數（全局）
const COLLISION_CONFIG = {
  // 燈號停止距離：當車距離停止線 < 此值時，檢查燈號是否需要停止
  TRAFFIC_LIGHT_CHECK_DISTANCE: 100, // px，可調整

  // 前方碰撞距離：當前車距離 < 此值時，認定為碰撞
  COLLISION_THRESHOLD: 30, // px，可調整

  // 車輛間最小安全間距：當檢測到前車時，保持此間距
  MIN_SAFE_DISTANCE: 30, // px，可調整

  // 蠕行速度：碰撞檢測到前車移動時的緩慢跟隨速度
  CRAWL_SPEED: 0.05, // 相對速度，可調整
}

export class CollisionController {
  constructor(vehicle, trafficController = null) {
    this.vehicle = vehicle
    this.trafficController = trafficController
    this.lastCheckTime = 0
    this.checkInterval = 50 // 每 50ms 檢查一次
  }

  /**
   * 設置交通燈控制器（外部注入）
   */
  setTrafficController(trafficController) {
    this.trafficController = trafficController
  }

  /**
   * 簡化版碰撞檢查
   * 優先級：
   * 1. 燈號停止（紅/黃/全紅）
   * 2. 前方碰撞
   * 返回值：{ targetSpeed, reason } 或 null
   */
  checkSimpleCollision(allVehicles) {
    const now = Date.now()
    if (now - this.lastCheckTime < this.checkInterval) {
      return null
    }
    this.lastCheckTime = now

    // 第一步：檢查燈號停止
    const trafficLightStop = this._checkTrafficLightStop()
    if (trafficLightStop) {
      return trafficLightStop
    }

    // 第二步：檢查前方碰撞
    const frontVehicle = this._findClosestFrontVehicle(allVehicles)
    if (!frontVehicle) {
      return null // 沒有前車
    }

    // 計算距離
    const distance = this._getDistance(this.vehicle, frontVehicle)

    // 🛑 碰撞定義：距離 < COLLISION_THRESHOLD
    if (distance < COLLISION_CONFIG.COLLISION_THRESHOLD) {
      // 前車是否停止了？
      const frontSpeed = frontVehicle.movementTimeline?.timeScale() || 0

      if (frontSpeed <= 0.01) {
        // 前車已停止 -> 我也停止
        return {
          targetSpeed: 0,
          reason: `碰撞：前車已停止，距離${distance.toFixed(1)}px`,
        }
      } else {
        // 前車在移動 -> 蠕行跟隨
        return {
          targetSpeed: COLLISION_CONFIG.CRAWL_SPEED,
          reason: `碰撞：前車移動中，蠕行跟隨，距離${distance.toFixed(1)}px`,
        }
      }
    }

    return null
  }

  /**
   * 檢查燈號停止規則
   * 規則：
   * - 距離停止線 < 0（已越過）→ 不受燈號影響
   * - 距離停止線 >= TRAFFIC_LIGHT_CHECK_DISTANCE（遠離停止線）→ 繼續前進
   * - 距離停止線 < TRAFFIC_LIGHT_CHECK_DISTANCE（接近停止線）→ 檢查燈號
   *   - 紅燈、黃燈、全紅 → 停止
   *   - 綠燈、左轉綠燈 → 放行
   */
  _checkTrafficLightStop() {
    if (!this.trafficController) {
      return null
    }

    // 計算距離停止線的距離
    const distanceToStopLine = this.vehicle.position?.distance || Infinity

    // 已越過停止線，不受燈號限制
    if (distanceToStopLine < 0) {
      return null
    }

    // 距離停止線 >= TRAFFIC_LIGHT_CHECK_DISTANCE，距離還很遠，繼續前進（不受燈號限制）
    if (distanceToStopLine >= COLLISION_CONFIG.TRAFFIC_LIGHT_CHECK_DISTANCE) {
      return null
    }

    // 只有接近停止線（< TRAFFIC_LIGHT_CHECK_DISTANCE）時，才檢查燈號是否需要停止
    // 獲取當前燈號狀態
    const lightState = this.trafficController.getCurrentLightState(this.vehicle.direction)

    // 需要停止的燈號：red（紅）、yellow（黃）、allRed（全紅）
    const stopLightStates = ['red', 'yellow', 'allRed']

    if (stopLightStates.includes(lightState)) {
      return {
        targetSpeed: 0,
        reason: `燈號停止：${lightState}，距離停止線${distanceToStopLine.toFixed(1)}px`,
      }
    }

    return null
  } /**
   * 找前方最近的車輛
   */
  _findClosestFrontVehicle(allVehicles) {
    let closest = null
    let minDistance = Infinity

    const myPos = this.vehicle.getCurrentPosition()
    if (!myPos) return null

    for (const other of allVehicles) {
      // 同方向同車道
      if (
        other.id === this.vehicle.id ||
        other.direction !== this.vehicle.direction ||
        other.laneNumber !== this.vehicle.laneNumber
      ) {
        continue
      }

      const otherPos = other.getCurrentPosition()
      if (!otherPos) continue

      const distance = this._getDistance(this.vehicle, other)

      // 只看前方的車（距離 > 0）且在檢查範圍內（< 200px）
      if (distance > 0 && distance < 200 && distance < minDistance) {
        closest = other
        minDistance = distance
      }
    }

    return closest
  }

  /**
   * 計算兩車之間的距離
   */
  _getDistance(vehicle1, vehicle2) {
    const pos1 = vehicle1.getCurrentPosition()
    const pos2 = vehicle2.getCurrentPosition()

    if (!pos1 || !pos2) return Infinity

    switch (vehicle1.direction) {
      case 'east':
        return pos2.x - pos1.x
      case 'west':
        return pos1.x - pos2.x
      case 'south':
        return pos2.y - pos1.y
      case 'north':
        return pos1.y - pos2.y
      default:
        return Infinity
    }
  }

  /**
   * 檢查該車是否是最接近停止線的車
   * 用途：判斷該車是否是同方向同車道的首車
   */
  isClosestToStopLine(allVehicles) {
    const myDistance = this.vehicle.position?.distance || Infinity

    // 遍歷所有車輛
    for (const other of allVehicles) {
      // 同方向同車道的其他車
      if (
        other.id === this.vehicle.id ||
        other.direction !== this.vehicle.direction ||
        other.laneNumber !== this.vehicle.laneNumber
      ) {
        continue
      }

      const otherDistance = other.position?.distance || Infinity

      // 如果有其他車距離停止線更近，則我不是最接近的
      if (otherDistance > 0 && otherDistance < myDistance) {
        return false
      }
    }

    return true
  }

  /**
   * 清理資源（用於車輛銷毀時）
   */
  dispose() {
    // 簡化版碰撞控制器沒有需要清理的外部資源
    // 只需將引用置空
    this.vehicle = null
    this.trafficController = null
  }
}

/**
 * 🎯 全局配置管理函數
 * 用於調整碰撞和燈號停止的參數
 */
export function updateCollisionConfig(newConfig) {
  Object.assign(COLLISION_CONFIG, newConfig)
  console.log('🔧 [CollisionConfig] 已更新配置:', COLLISION_CONFIG)
}

/**
 * 🎯 獲取當前配置
 */
export function getCollisionConfig() {
  return { ...COLLISION_CONFIG }
}

/**
 * 🎯 重置配置到默認值
 */
export function resetCollisionConfig() {
  Object.assign(COLLISION_CONFIG, {
    TRAFFIC_LIGHT_CHECK_DISTANCE: 100,
    COLLISION_THRESHOLD: 30,
    MIN_SAFE_DISTANCE: 30,
    CRAWL_SPEED: 0.05,
  })
  console.log('✅ [CollisionConfig] 已重置為默認值')
}
