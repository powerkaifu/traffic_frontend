/**
 * 停止線控制器
 * 負責處理所有停止線相關邏輯，讓 Vehicle.js 保持簡潔
 */

import { STOP_LINE_CONFIG, STOP_LINE_OFFSETS } from '../config/stopLineConfig.js'

export class StopLineController {
  constructor(vehicle) {
    this.vehicle = vehicle
    this.state = STOP_LINE_CONFIG.STATES.APPROACHING
    this.stopLinePosition = null
    this.lastCheck = 0
  }

  /**
   * 獲取停止線位置
   * @returns {Object} {x, y} 座標，null表示該方向沒有對應座標
   */
  getStopLinePosition() {
    // 使用車輛的位置計算系統保持一致性
    const centralRef = document.querySelector('.central-reference')
    if (!centralRef) return { x: null, y: null }

    const container = document.querySelector('.crossroad-area')
    if (!container) return { x: null, y: null }

    // 獲取相對座標（與車輛位置系統一致）
    const centralRect = centralRef.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // 計算中央矩形相對於容器的位置
    const centralX = centralRect.left - containerRect.left
    const centralY = centralRect.top - containerRect.top
    const centralWidth = centralRect.width
    const centralHeight = centralRect.height

    const offsets = STOP_LINE_OFFSETS

    let position = { x: null, y: null }

    switch (this.vehicle.direction) {
      case 'east':
        // 東向：停在中央矩形左邊界
        position = { x: centralX + offsets.east.offsetX, y: null }
        break
      case 'west':
        // 西向：停在中央矩形右邊界
        position = { x: centralX + centralWidth + offsets.west.offsetX, y: null }
        break
      case 'north':
        // 北向：停在中央矩形下邊界
        position = { x: null, y: centralY + centralHeight - offsets.north.offsetY }
        break
      case 'south':
        // 南向：停在中央矩形上邊界
        position = { x: null, y: centralY + offsets.south.offsetY }
        break
    }

    return position
  }

  /**
   * 獲取車頭位置
   * @returns {Object} {x, y} 車頭座標
   */
  getVehicleHeadPosition() {
    const currentPos = this.vehicle.getCurrentPosition()
    const vehicleConfig = this.vehicle.getVehicleConfig()
    const size = { width: vehicleConfig.width, height: vehicleConfig.height }

    switch (this.vehicle.direction) {
      case 'east':
        return { x: currentPos.x + size.width, y: currentPos.y + size.height / 2 }
      case 'west':
        return { x: currentPos.x, y: currentPos.y + size.height / 2 }
      case 'north':
        return { x: currentPos.x + size.width / 2, y: currentPos.y }
      case 'south':
        return { x: currentPos.x + size.width / 2, y: currentPos.y + size.height }
      default:
        return currentPos
    }
  }

  /**
   * 計算車頭到停止線的距離
   * @returns {number|null} 距離（像素），null表示無法計算
   */
  getDistanceToStopLine() {
    const stopLine = this.getStopLinePosition()
    if (!stopLine.x && !stopLine.y) return null

    const vehicleHead = this.getVehicleHeadPosition()
    let distance = null

    switch (this.vehicle.direction) {
      case 'east':
        // 東向：車頭在右側，正值表示還沒到停止線
        distance = stopLine.x - vehicleHead.x
        break
      case 'west':
        // 西向：車頭在左側，正值表示還沒到停止線
        distance = vehicleHead.x - stopLine.x
        break
      case 'north':
        // 北向：車頭在上方，正值表示還沒到停止線
        distance = vehicleHead.y - stopLine.y
        break
      case 'south':
        // 南向：車頭在下方，正值表示還沒到停止線
        distance = stopLine.y - vehicleHead.y
        break
      default:
        return null
    }

    return distance
  }

  /**
   * 檢查是否應該在停止線停車
   * @returns {boolean} true表示應該停車
   */
  shouldStopAtLine() {
    if (this.vehicle.hasPassedStopLine || this.vehicle.isAtStopLine) {
      return false
    }

    const stopLine = this.getStopLinePosition()
    if (!stopLine.x && !stopLine.y) return false

    const vehicleHead = this.getVehicleHeadPosition()
    const sensitivity = STOP_LINE_CONFIG.DETECTION.SENSITIVITY

    switch (this.vehicle.direction) {
      case 'east':
        return vehicleHead.x >= stopLine.x - sensitivity
      case 'west':
        return vehicleHead.x <= stopLine.x + sensitivity
      case 'north':
        return vehicleHead.y <= stopLine.y + sensitivity
      case 'south':
        return vehicleHead.y >= stopLine.y - sensitivity
      default:
        return false
    }
  }

  /**
   * 調整車輛位置以精確對齊停止線
   * @returns {boolean} true表示成功調整
   */
  alignToStopLine() {
    const stopLine = this.getStopLinePosition()
    if (!stopLine.x && !stopLine.y) return false

    const currentPos = this.vehicle.getCurrentPosition()
    const vehicleConfig = this.vehicle.getVehicleConfig()
    const size = { width: vehicleConfig.width, height: vehicleConfig.height }

    // 計算車輛應該停在的位置（車輛左上角座標）
    let targetX = currentPos.x
    let targetY = currentPos.y

    switch (this.vehicle.direction) {
      case 'east':
        // 東向：車頭（右側）應該對齊停止線
        targetX = stopLine.x - size.width
        break
      case 'west':
        // 西向：車頭（左側）應該對齊停止線
        targetX = stopLine.x
        break
      case 'north':
        // 北向：車頭（上方）應該對齊停止線
        targetY = stopLine.y
        break
      case 'south':
        // 南向：車頭（下方）應該對齊停止線
        targetY = stopLine.y - size.height
        break
    }

    // 使用 GSAP 平滑地調整到精確位置
    const gsap = window.gsap
    if (gsap) {
      gsap.to(this.vehicle.element, {
        x: targetX,
        y: targetY,
        duration: 0.1,
        ease: 'power2.out',
      })
      return true
    }

    return false
  }

  /**
   * 獲取理想停車位置（停止線前幾px）
   * @returns {Object} {x, y} 目標位置座標
   */
  getTargetStopPosition() {
    const stopLine = this.getStopLinePosition()
    if (!stopLine.x && !stopLine.y) return null

    const targetOffset = STOP_LINE_CONFIG.TARGET_POSITION

    switch (this.vehicle.direction) {
      case 'east':
        // 東向：停在停止線前（X軸減少）
        return { x: stopLine.x - targetOffset.EAST, y: null }
      case 'west':
        // 西向：停在停止線前（X軸增加）
        return { x: stopLine.x + targetOffset.WEST, y: null }
      case 'north':
        // 北向：停在停止線前（Y軸增加）
        return { x: null, y: stopLine.y + targetOffset.NORTH }
      case 'south':
        // 南向：停在停止線前（Y軸減少）
        return { x: null, y: stopLine.y - targetOffset.SOUTH }
      default:
        return null
    }
  }

  /**
   * 執行停車位置微調（僅在特殊情況下使用）
   * @param {boolean} force 是否強制執行微調
   * @returns {boolean} true表示有進行微調
   */
  adjustStopPosition(force = false) {
    if (!this.vehicle.movementTimeline) return false

    // 如果車輛已經停在停止線，不進行微調（避免反彈）
    if (this.vehicle.isAtStopLine && !force) {
      return false
    }

    const targetPos = this.getTargetStopPosition()
    if (!targetPos) return false

    const vehicleHead = this.getVehicleHeadPosition()
    let adjustDistance = 0

    // 計算需要調整的距離
    switch (this.vehicle.direction) {
      case 'east':
        adjustDistance = vehicleHead.x - targetPos.x
        break
      case 'west':
        adjustDistance = targetPos.x - vehicleHead.x
        break
      case 'north':
        adjustDistance = targetPos.y - vehicleHead.y
        break
      case 'south':
        adjustDistance = vehicleHead.y - targetPos.y
        break
    }

    // 只有在偏差很大時才進行微調
    const threshold = STOP_LINE_CONFIG.DETECTION.ADJUSTMENT_THRESHOLD * 2 // 提高閾值
    if (Math.abs(adjustDistance) > threshold) {
      const currentProgress = this.vehicle.movementTimeline.progress()
      const totalDistance = 300 // 假設路徑總長度
      const adjustRatio = Math.abs(adjustDistance) / totalDistance

      let newProgress
      if (adjustDistance > 0) {
        // 車輛超過目標位置，需要倒退
        newProgress = Math.max(0, currentProgress - adjustRatio)
      } else {
        // 車輛未到目標位置，需要前進
        newProgress = Math.min(1, currentProgress + adjustRatio)
      }

      this.vehicle.movementTimeline.progress(newProgress)
      console.log(
        `� [${this.vehicle.id}] ${this.vehicle.direction} 強制微調: ${adjustDistance.toFixed(1)}px (閾值: ${threshold})`,
      )
      return true
    }

    return false
  }

  /**
   * 檢查交通燈相關的停止線邏輯
   * @param {Object} trafficController 交通燈控制器
   * @returns {Object|null} 返回動作建議或null
   */
  checkTrafficLightLogic(trafficController) {
    const lightState = trafficController.getCurrentLightState(this.vehicle.direction)
    const distanceToStopLine = this.getDistanceToStopLine()

    // 車道專用邏輯
    if (this.vehicle.laneNumber === 1) {
      // 左轉車道
      if (lightState === 'leftGreen') {
        return { action: 'resume', reason: '左轉綠燈通行' }
      } else if (lightState === 'green') {
        if (
          distanceToStopLine !== null &&
          Math.abs(distanceToStopLine) <= STOP_LINE_CONFIG.TRAFFIC_LIGHT.QUEUE_DISTANCE
        ) {
          return { action: 'stop_for_left_turn_wait', reason: '等待左轉綠燈' }
        }
      }
    } else {
      // 直行車道
      if (lightState === 'green') {
        return { action: 'resume', reason: '直行綠燈通行' }
      } else if (lightState === 'leftGreen') {
        if (
          distanceToStopLine !== null &&
          Math.abs(distanceToStopLine) <= STOP_LINE_CONFIG.TRAFFIC_LIGHT.QUEUE_DISTANCE
        ) {
          return { action: 'stop_for_straight_wait', reason: '等待直行綠燈' }
        }
      }
    }

    return null
  }

  /**
   * 更新停止線狀態
   */
  updateState() {
    if (this.vehicle.hasPassedStopLine) {
      this.state = STOP_LINE_CONFIG.STATES.PASSED
    } else if (this.vehicle.isAtStopLine) {
      this.state = STOP_LINE_CONFIG.STATES.AT_STOP_LINE
    } else if (this.shouldStopAtLine()) {
      this.state = STOP_LINE_CONFIG.STATES.APPROACHING
    }
  }

  /**
   * 清理資源
   */
  dispose() {
    this.vehicle = null
    this.stopLinePosition = null
  }
}
