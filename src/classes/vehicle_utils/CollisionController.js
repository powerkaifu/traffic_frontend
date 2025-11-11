/**
 * 碰撞控制器 - 簡化版 v2
 * 負責：
 * 1. 檢查燈號停止（紅燈、黃燈、全紅時停止）
 * 2. 檢查前方碰撞（距離 < 30px）
 * 3. 返回停止或蠕行的指令
 */

// 🎯 可配置參數（全局）
const COLLISION_CONFIG = {
  TRAFFIC_LIGHT_CHECK_DISTANCE: 100, // 燈號停止距離：當車距離停止線 < 此值時，檢查燈號是否需要停止
  TARGET_SPACING: 10, // 🎯 目標間距：排隊時車輛之間保持的一致距離（px）。設定 10px 就保持 10px，直覺易懂
  CRAWL_SPEED: 0.05, // 蠕行速度：當距離 < TARGET_SPACING 時的跟隨速度
  DETECTION_RANGE: 300, // 碰撞檢測範圍：檢查前方最多 300px 內的車輛
}

export class CollisionController {
  constructor(vehicle, trafficController = null) {
    this.vehicle = vehicle
    this.trafficController = trafficController
    this.lastCheckTime = 0
    this.checkInterval = 20 // 每 20ms 檢查一次（改善：更高頻率以防止穿過）
  }

  /**
   * 設置交通燈控制器（外部注入）
   */
  setTrafficController(trafficController) {
    this.trafficController = trafficController
  }

  /**
   * 簡化版碰撞檢查
   * 邏輯：
   * 1. 燈號停止（紅/黃/全紅）→ 停止
   * 2. 距離 < TARGET_SPACING → 停止或蠕行
   * 3. 距離 >= TARGET_SPACING → 自由加速
   *
   * 返回值：{ targetSpeed, reason, distance, frontVehicle, ... } 或 null
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

    const distance = this._getDistance(this.vehicle, frontVehicle)
    const frontSpeed = frontVehicle.movementTimeline?.timeScale() || 0

    // 簡單直覺邏輯：
    // 如果距離 < TARGET_SPACING，則需要控制距離
    if (distance < COLLISION_CONFIG.TARGET_SPACING) {
      // 前車停止了？
      if (frontSpeed <= 0.01) {
        // 我也停止
        return {
          targetSpeed: 0,
          reason: `停止：前車停止，距離${distance.toFixed(1)}px < 目標間距${COLLISION_CONFIG.TARGET_SPACING}px`,
          distance: distance,
          frontVehicle: frontVehicle,
          frontVehicleIsMoving: false,
          action: 'stop',
        }
      } else {
        // 前車在移動，蠕行跟隨以維持距離
        return {
          targetSpeed: COLLISION_CONFIG.CRAWL_SPEED,
          reason: `蠕行：前車移動，距離${distance.toFixed(1)}px，跟隨維持距離`,
          distance: distance,
          frontVehicle: frontVehicle,
          frontVehicleIsMoving: true,
          action: 'crawl',
        }
      }
    }

    // 距離 >= TARGET_SPACING，距離足夠
    return {
      targetSpeed: undefined, // 允許自由加速
      reason: `自由：距離${distance.toFixed(1)}px >= 目標間距${COLLISION_CONFIG.TARGET_SPACING}px`,
      distance: distance,
      frontVehicle: frontVehicle,
      frontVehicleIsMoving: frontSpeed > 0.01,
      action: 'free',
    }
  }

  /**
   * 檢查燈號停止規則
   * 規則：
   * - 距離停止線 < 0（已越過）→ 不受燈號影響
   * - 距離停止線 >= TRAFFIC_LIGHT_CHECK_DISTANCE（遠離停止線）→ 繼續前進
   * - 距離停止線 < TRAFFIC_LIGHT_CHECK_DISTANCE（接近停止線）→ 檢查燈號
   *   - 紅燈、黃燈、全紅 → 停止
   *   - 綠燈、左轉綠燈 → 放行
   * 返回值：{ targetSpeed=0, reason, distance, action='traffic_light_stop' } 或 null
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
        distance: distanceToStopLine,
        lightState: lightState,
        action: 'traffic_light_stop',
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

      // 只看前方的車（距離 > 0）且在檢查範圍內（< DETECTION_RANGE）
      if (distance > 0 && distance < COLLISION_CONFIG.DETECTION_RANGE && distance < minDistance) {
        closest = other
        minDistance = distance
      }
    }

    return closest
  }

  /**
   * 計算兩車之間的距離（中心到中心）
   * 然後根據車寬度調整為「邊界到邊界的實際間距」
   */
  _getDistance(vehicle1, vehicle2) {
    const pos1 = vehicle1.getCurrentPosition()
    const pos2 = vehicle2.getCurrentPosition()

    if (!pos1 || !pos2) return Infinity

    // 中心到中心的距離
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

    // 獲取兩車的寬度（根據方向調整）
    const config1 = vehicle1.getVehicleConfig()
    const config2 = vehicle2.getVehicleConfig()

    // 根據方向確定「長軸」（前進方向的長度）
    let vehicle1Length = 0
    let vehicle2Length = 0

    switch (vehicle1.direction) {
      case 'east':
      case 'west':
        // 水平移動，width 是前進方向的長度
        vehicle1Length = config1.width
        vehicle2Length = config2.width
        break
      case 'south':
      case 'north':
        // 垂直移動，height 是前進方向的長度（旋轉後）
        vehicle1Length = config1.height
        vehicle2Length = config2.height
        break
    }

    // 實際間距 = 中心距離 - vehicle1後半長 - vehicle2前半長
    // = centerDistance - (vehicle1Length/2) - (vehicle2Length/2)
    const actualSpacing = centerDistance - vehicle1Length / 2 - vehicle2Length / 2

    return actualSpacing
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
    TARGET_SPACING: 30,
    CRAWL_SPEED: 0.05,
    DETECTION_RANGE: 300,
  })
  console.log('✅ [CollisionConfig] 已重置為默認值')
}
