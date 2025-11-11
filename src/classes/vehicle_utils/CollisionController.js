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
  TARGET_SPACING: 15, // 🎯 東西向目標間距（px）
  TARGET_SPACING_VERTICAL: 30, // 🎯 南北向目標間距（px）- 南北向車更短，需要稍大的間距來保持視覺一致
  STOP_LINE_OFFSET: 0, // 🎯 停止線距離（px）- 停止線對齁位置（0 = 精準停在停止線）
  // 🔧 方向特定的停止線精確調整（用於微調對齑精度）
  // ⚠️ 每個方向可能有不同的誤差，這裡可以進行微調
  // 正值 = 提前停止（停在停止線前）
  // 負值 = 延遲停止（停在停止線後）
  STOP_LINE_OFFSET_BY_DIRECTION: {
    east: 0, // 東向精確調整（px）- 修改此值校正東向誤差
    west: 0, // 西向精確調整（px）- 修改此值校正西向誤差
    north: 0, // 北向精確調整（px）- 修改此值校正北向誤差
    south: 0, // 南向精確調整（px）- 修改此值校正南向誤差
  },
  CRAWL_SPEED: 0.02, // 蠕行速度：當距離 < TARGET_SPACING 時的跟隨速度（降低至 0.02 以提高精度）
  DETECTION_RANGE: 300, // 碰撞檢測範圍：檢查前方最多 300px 內的車輛

  // 🔧 停止線位置配置（從 HTML 元素計算）
  STOP_LINE_POSITIONS: {
    east: null, // 東向停止線 X 座標
    west: null, // 西向停止線 X 座標
    north: null, // 北向停止線 Y 座標
    south: null, // 南向停止線 Y 座標
  },
}

export class CollisionController {
  constructor(vehicle, trafficController = null) {
    this.vehicle = vehicle
    this.trafficController = trafficController
    this.lastCheckTime = 0
    this.checkInterval = 10 // 每 10ms 檢查一次（高頻率：5 倍提升，防止靠近時穿過）
  }

  /**
   * 設置交通燈控制器（外部注入）
   */
  setTrafficController(trafficController) {
    this.trafficController = trafficController
  }

  /**
   * 🔧 內部計算：獲取停止線位置
   * 直接從 DOM 計算，確保精度
   */
  _getStopLinePosition() {
    const centralRef = document.querySelector('.central-reference')
    const container = document.querySelector('.crossroad-area')
    if (!centralRef || !container) return null

    const centralRect = centralRef.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const centralX = centralRect.left - containerRect.left
    const centralY = centralRect.top - containerRect.top
    const centralWidth = centralRect.width
    const centralHeight = centralRect.height

    switch (this.vehicle.direction) {
      case 'east':
        return { type: 'x', value: centralX } // 東向停止線在中央矩形左邊界
      case 'west':
        return { type: 'x', value: centralX + centralWidth } // 西向停止線在中央矩形右邊界
      case 'north':
        return { type: 'y', value: centralY + centralHeight } // 北向停止線在中央矩形下邊界
      case 'south':
        return { type: 'y', value: centralY } // 南向停止線在中央矩形上邊界
      default:
        return null
    }
  }

  /**
   * 🔧 內部計算：獲取車頭位置
   * 直接從車輛元素計算，確保精度
   */
  _getVehicleHeadPosition() {
    const element = this.vehicle.element
    if (!element) return null

    const rect = element.getBoundingClientRect()
    const container = document.querySelector('.crossroad-area')
    if (!container) return null
    const containerRect = container.getBoundingClientRect()

    // 車輛在容器中的相對位置
    const x = rect.left - containerRect.left
    const y = rect.top - containerRect.top
    const width = rect.width
    const height = rect.height

    switch (this.vehicle.direction) {
      case 'east':
        return { type: 'x', value: x + width } // 東向車頭在右側
      case 'west':
        return { type: 'x', value: x } // 西向車頭在左側
      case 'north':
        return { type: 'y', value: y } // 北向車頭在上方
      case 'south':
        return { type: 'y', value: y + height } // 南向車頭在下方
      default:
        return null
    }
  }

  /**
   * 🔧 內部計算：直接計算距離停止線的距離
   * 不依賴外部方法，完全控制精度
   */
  _calculateDistanceToStopLine() {
    const stopLine = this._getStopLinePosition()
    const vehicleHead = this._getVehicleHeadPosition()

    if (!stopLine || !vehicleHead) return null

    const directionOffset = COLLISION_CONFIG.STOP_LINE_OFFSET_BY_DIRECTION[this.vehicle.direction] || 0
    const effectiveOffset = COLLISION_CONFIG.STOP_LINE_OFFSET + directionOffset

    // 計算距離：停止線位置 - 車頭位置 - 偏移
    let distance = null
    if (stopLine.type === 'x' && vehicleHead.type === 'x') {
      // 東西向
      if (this.vehicle.direction === 'east') {
        // 東向：距離 = 停止線 - 車頭 - 偏移
        distance = stopLine.value - effectiveOffset - vehicleHead.value
      } else {
        // 西向：距離 = 車頭 - 停止線 - 偏移
        distance = vehicleHead.value - (stopLine.value + effectiveOffset)
      }
    } else if (stopLine.type === 'y' && vehicleHead.type === 'y') {
      // 南北向
      if (this.vehicle.direction === 'south') {
        // 南向：距離 = 停止線 - 車頭 - 偏移
        distance = stopLine.value - effectiveOffset - vehicleHead.value
      } else {
        // 北向：距離 = 車頭 - 停止線 - 偏移
        distance = vehicleHead.value - (stopLine.value + effectiveOffset)
      }
    }

    return distance
  }

  /**
   * 簡化版碰撞檢查
   * 邏輯：
   * 1. 燈號停止（紅/黃/全紅）→ 停止
   * 2. 距離停止線太近（< 停止線偏移）→ 停止（精準對齐）
   * 3. 距離 < TARGET_SPACING → 停止（前車碰撞檢測）
   * 4. 距離 >= TARGET_SPACING → 自由加速
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

    // 第二步：檢查距離停止線是否太近（精準對齁）
    // 🔧 使用內部計算的距離，確保精度
    const distanceToStopLine = this._calculateDistanceToStopLine()
    if (distanceToStopLine !== null && distanceToStopLine !== undefined) {
      // 🔧 激進的停止邏輯：只要接近停止線就停止
      // STOP_LINE_OFFSET = 0 時：距離 <= 1px 就停止
      const effectiveOffset =
        COLLISION_CONFIG.STOP_LINE_OFFSET +
        (COLLISION_CONFIG.STOP_LINE_OFFSET_BY_DIRECTION[this.vehicle.direction] || 0)

      // 停止判斷：距離 <= 偏移量 + 容差 1px
      if (distanceToStopLine <= effectiveOffset + 1) {
        return {
          targetSpeed: 0,
          reason: `停止線對齁：距離${distanceToStopLine.toFixed(2)}px，目標${effectiveOffset}px`,
          distance: distanceToStopLine,
          action: 'align_to_stop_line',
        }
      }
    }

    // 第三步：檢查前方碰撞
    const frontVehicle = this._findClosestFrontVehicle(allVehicles)
    if (!frontVehicle) {
      return null // 沒有前車
    }

    const distance = this._getDistance(this.vehicle, frontVehicle)
    const frontSpeed = frontVehicle.movementTimeline?.timeScale() || 0

    // 🎯 根據方向選擇不同的 TARGET_SPACING
    // 南北向車更短，需要稍大的間距保持視覺一致
    const targetSpacing =
      this.vehicle.direction === 'south' || this.vehicle.direction === 'north'
        ? COLLISION_CONFIG.TARGET_SPACING_VERTICAL
        : COLLISION_CONFIG.TARGET_SPACING

    // 🎯 兩段邏輯：
    // 1. 距離 < TARGET_SPACING：停止或蠕行（最小安全間距）
    // 2. 距離 >= TARGET_SPACING：自由加速

    if (distance < targetSpacing) {
      // 距離 < TARGET_SPACING：太近了，直接停止（已關閉蠕行跟隨）
      return {
        targetSpeed: 0,
        reason: `停止：距離${distance.toFixed(1)}px < 最小間距${targetSpacing}px（蠕行已關閉）`,
        distance: distance,
        frontVehicle: frontVehicle,
        frontVehicleIsMoving: frontSpeed > 0.01,
        action: 'stop',
      }
    }

    // 距離 >= TARGET_SPACING：自由加速
    return {
      targetSpeed: undefined, // 允許自由加速
      reason: `自由：距離${distance.toFixed(1)}px >= 最小間距${targetSpacing}px`,
      distance: distance,
      frontVehicle: frontVehicle,
      frontVehicleIsMoving: frontSpeed > 0.01,
      action: 'free',
    }
  }

  /**
   * 檢查燈號停止規則
   * 規則：
   * - 紅燈/全紅且接近停止線時 → 停止
   * - 黃燈 → 允許繼續走
   * - 綠燈、左轉綠燈 → 放行
   * 返回值：{ targetSpeed, reason, distance, action } 或 null
   */
  _checkTrafficLightStop() {
    if (!this.trafficController) {
      return null
    }

    // 🔧 使用內部計算的距離
    const distanceToStopLine = this._calculateDistanceToStopLine()
    if (distanceToStopLine === null || distanceToStopLine === undefined) {
      return null
    }

    // 獲取當前燈號狀態
    const lightState = this.trafficController.getCurrentLightState(this.vehicle.direction)

    // 黃燈：允許繼續走
    if (lightState === 'yellow') {
      return null
    }

    // 紅燈/全紅：接近停止線時停止
    const stopLightStates = ['red', 'allRed']
    if (stopLightStates.includes(lightState)) {
      const effectiveOffset =
        COLLISION_CONFIG.STOP_LINE_OFFSET +
        (COLLISION_CONFIG.STOP_LINE_OFFSET_BY_DIRECTION[this.vehicle.direction] || 0)

      // 🔧 激進的停止：距離 <= 偏移量 + 1px 時停止
      if (distanceToStopLine <= effectiveOffset + 1) {
        return {
          targetSpeed: 0,
          reason: `燈號停止（${lightState}）：距離${distanceToStopLine.toFixed(2)}px，目標${effectiveOffset}px`,
          distance: distanceToStopLine,
          lightState: lightState,
          action: 'traffic_light_stop',
        }
      }

      return null
    }

    // 綠燈或左轉綠燈：允許通過
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
   *
   * ⚠️ 重要：南北向和東西向車的長度不同
   * 東西向：width = 25-35px（長軸）
   * 南北向：height = 15-20px（短軸，旋轉後作為長軸）
   * 為保持一致的視覺間距，我們基於前車的方向來計算長度
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

    // 獲取兩車的配置
    const config1 = vehicle1.getVehicleConfig()
    const config2 = vehicle2.getVehicleConfig()

    // 根據方向確定「縱軸長度」（前進方向的長度）
    let vehicle1Length = 0
    let vehicle2Length = 0

    switch (vehicle1.direction) {
      case 'east':
      case 'west':
        // 水平移動：width 是縱軸（前進方向的長度）
        vehicle1Length = config1.width
        vehicle2Length = config2.width
        break
      case 'south':
      case 'north':
        // 垂直移動：height 是縱軸（旋轉後為前進方向的長度）
        vehicle1Length = config1.height
        vehicle2Length = config2.height
        break
    }

    // 實際間距 = 中心距離 - 車1後半長 - 車2前半長
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

// 🔧 導出配置供其他模塊使用
export { COLLISION_CONFIG }

// ⚠️ 碰撞檢查簡單直覺：
// 距離 < TARGET_SPACING → 停止或蠕行
// 距離 >= TARGET_SPACING → 自由加速
