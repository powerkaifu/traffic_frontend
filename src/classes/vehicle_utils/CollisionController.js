/**
 * 碰撞控制器
 * 負責處理所有碰撞檢測與跟車相關邏輯，讓 Vehicle.js 保持簡潔
 * 整合了 SimpleCollisionDetector 的功能
 */

import { COLLISION_CONFIG, FOLLOWING_CONFIG, DISTANCE_CONFIG } from '../config/vehicleConfig.js'

export class CollisionController {
  constructor(vehicle) {
    this.vehicle = vehicle
    this.lastCollisionCheck = 0 // 上次碰撞檢查時間
    this.collisionCheckInterval = COLLISION_CONFIG.CHECK_INTERVAL // 碰撞檢查間隔（毫秒）
    this.nearbyVehicleRange = DISTANCE_CONFIG.NEARBY_VEHICLE_RANGE // 附近車輛檢查範圍（使用配置）

    // SimpleCollisionDetector 整合的屬性
    this.lastCheckTime = 0
    this.checkInterval = COLLISION_CONFIG.SIMPLE_CHECK_INTERVAL // 使用配置的檢查間隔
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
   * 🚦 檢查當前交通燈是否允許車輛通行
   * @returns {boolean} true表示交通燈允許通行
   */
  canProceedWithCurrentLight() {
    try {
      // 嘗試從車輛的運行環境中獲取交通燈狀態
      if (typeof window !== 'undefined' && window.trafficController) {
        const currentLightState = window.trafficController.getCurrentLightState(this.vehicle.direction)

        // 🚦 嚴格的交通燈邏輯，特別針對1號車道（左轉車道）
        let canProceed = false

        if (this.vehicle.laneNumber === 1) {
          // 🚦 1號車道（左轉車道）：只有左轉綠燈才允許通行
          canProceed = currentLightState === 'leftGreen'
        } else {
          // 🚦 其他車道（直行車道）：綠燈允許通行
          canProceed = currentLightState === 'green'
        }

        return canProceed
      }
    } catch (error) {
      console.warn(`[${this.vehicle.id}] 無法獲取交通燈狀態:`, error)
    }

    return false // 預設不允許通行，保持安全
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
    const canProceedWithTrafficLight = this.canProceedWithCurrentLight()

    if (hasPassedStopLine) {
      return null // 不阻止移動，允許穿透
    } else if (canProceedWithTrafficLight && this.vehicle.laneNumber !== 1) {
      // ✅ 非1號車道且交通燈允許通行：允許穿透超車
      return null // 不阻止移動，允許穿透
    } else {
      // 🚦❌ 1號車道或交通燈不允許：執行智能排隊機制
      // 🚦 重要：1號車道即使在左轉綠燈時也要執行排隊檢測，參照直行車道模式
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
    const canProceedWithTrafficLight = this.canProceedWithCurrentLight()

    // 🚦 使用配置文件的排隊參數
    const baseGap = DISTANCE_CONFIG.BASE_DISTANCES.MIN_GAP // 25px

    // 🚦 根據車道和交通燈狀態動態調整排隊參數
    let QUEUE_GAP, MIN_FOLLOW_DISTANCE

    if (this.vehicle.laneNumber === 1) {
      if (canProceedWithTrafficLight) {
        // 🚦 1號車道左轉綠燈：使用較寬鬆的參數
        QUEUE_GAP = baseGap * 0.8 // 20px
        MIN_FOLLOW_DISTANCE = baseGap * 0.5 // 12.5px
      } else {
        // 🚦 1號車道紅燈：使用嚴格的排隊距離
        QUEUE_GAP = baseGap // 25px
        MIN_FOLLOW_DISTANCE = baseGap * 0.6 // 15px
      }
    } else {
      // 🚦 其他車道：標準參數
      QUEUE_GAP = baseGap // 25px
      MIN_FOLLOW_DISTANCE = baseGap * 0.5 // 12.5px
    }

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

    // 如果沒有前方車輛，檢查是否接近停止線或前方已停車輛
    if (!closestFrontVehicle) {
      return this.checkStopLineApproach(allVehicles, QUEUE_GAP, MIN_FOLLOW_DISTANCE)
    }

    // 🚦 核心改進：根據不同情況決定是否允許車輛繼續前進
    const frontVehiclePassedStopLine = closestFrontVehicle
      ? this.isOtherVehiclePassedStopLine(closestFrontVehicle)
      : false
    const frontVehicleMoving =
      closestFrontVehicle &&
      closestFrontVehicle.movementTimeline &&
      closestFrontVehicle.movementTimeline.timeScale() > 0 &&
      !closestFrontVehicle.movementTimeline.paused()

    // 🚦 情況1：前車已通過停止線 - 允許繼續前進到停止線
    if (frontVehiclePassedStopLine) {
      // 🚦 1號車道特殊處理：即使前車通過停止線，也要檢查基本距離
      if (this.vehicle.laneNumber === 1 && !canProceedWithTrafficLight && minDistance < MIN_FOLLOW_DISTANCE) {
        return {
          shouldStop: true,
          shouldFollow: false,
          vehicle: closestFrontVehicle,
          distance: minDistance,
          requiredGap: QUEUE_GAP,
          reason: `1號車道前車通過停止線但距離太近: 距離${minDistance.toFixed(1)}px`,
          targetSpeed: 0,
        }
      }

      return null // 不阻止移動，讓車輛繼續前進到停止線
    }

    // 🚦 情況2：前車正在移動且距離合理 - 跟隨前進
    if (frontVehicleMoving && minDistance >= MIN_FOLLOW_DISTANCE) {
      // 🚦 計算目標速度，1號車道左轉綠燈時允許更高速度
      let targetSpeed = Math.min(0.9, Math.max(0.3, minDistance / QUEUE_GAP)) // 基礎速度 0.3-0.9

      if (this.vehicle.laneNumber === 1 && canProceedWithTrafficLight) {
        // 🚦 1號車道左轉綠燈：允許更高速度和更流暢的跟車
        targetSpeed = Math.min(1.0, Math.max(0.5, (minDistance / QUEUE_GAP) * 1.2))
      }

      return {
        shouldStop: false,
        shouldFollow: true,
        vehicle: closestFrontVehicle,
        distance: minDistance,
        requiredGap: QUEUE_GAP,
        reason: `跟隨前車排隊移動: 距離${minDistance.toFixed(1)}px`,
        targetSpeed: targetSpeed,
      }
    }

    // 🚦 情況3：距離太近但前車已停止 - 改進邏輯：始終允許慢速前進以保持安全距離
    if (minDistance < MIN_FOLLOW_DISTANCE) {
      // 檢查前車是否已停止
      const frontIsStopped =
        !closestFrontVehicle ||
        closestFrontVehicle.currentState === 'waitingForVehicle' ||
        closestFrontVehicle.currentState === 'stopped' ||
        closestFrontVehicle.waitingForGreen ||
        (closestFrontVehicle.movementTimeline && closestFrontVehicle.movementTimeline.timeScale() <= 0.01)

      // 🚦 改進邏輯：即使距離太近，也應該允許後車繼續緩慢前進
      // 後車會自動調整速度以保持安全距離，而不是停止不動
      if (frontIsStopped) {
        // 🎯 根據距離動態計算目標速度
        // 距離越小速度越慢，確保逐步靠近停止線而不是卡住
        let targetSpeed = 0.08 // 基礎超慢速度 (8%)

        // 如果有極少量空間，使用更慢的速度
        if (minDistance <= 2) {
          targetSpeed = 0.05 // 極慢速度 (5%) - 幾乎停止但仍然前進
        } else if (minDistance <= 4) {
          targetSpeed = 0.08 // 超慢速度 (8%)
        } else if (minDistance <= QUEUE_GAP * 0.2) {
          targetSpeed = 0.12 // 很慢速度 (12%)
        } else if (minDistance <= QUEUE_GAP * 0.4) {
          targetSpeed = 0.15 // 慢速度 (15%)
        }

        return {
          shouldStop: false,
          shouldFollow: true,
          vehicle: closestFrontVehicle,
          distance: minDistance,
          requiredGap: QUEUE_GAP,
          reason: `保持安全距離緩慢前進: 距離${minDistance.toFixed(1)}px, 目標速度${(targetSpeed * 100).toFixed(0)}%`,
          targetSpeed: targetSpeed,
        }
      }

      // 🚦 如果前車仍在移動，使用標準跟隨邏輯
      return {
        shouldStop: false,
        shouldFollow: true,
        vehicle: closestFrontVehicle,
        distance: minDistance,
        requiredGap: QUEUE_GAP,
        reason: `前車仍在移動，保持安全距離: 距離${minDistance.toFixed(1)}px`,
        targetSpeed: 0.15,
      }
    }

    return null // 不阻止移動，讓車輛自由前進
  }

  /**
   * 🚦 檢查接近停止線的情況
   * @returns {Object|null} 停止線檢查結果
   */
  checkStopLineApproach(allVehicles = [], queueGap = 15, minFollow = 8) {
    // 檢查停止線與前方已停止車輛，並維持 queueGap 的距離
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

    // 找尋同車道且已停止的前方車輛，確保與其保持安全距離
    let nearestStoppedFront = null
    let nearestStoppedDistance = Infinity

    for (let v of allVehicles) {
      if (
        v.id === this.vehicle.id ||
        v.direction !== this.vehicle.direction ||
        v.laneNumber !== this.vehicle.laneNumber
      )
        continue
      const otherPos = v.getCurrentPosition()
      if (!otherPos) continue

      const d = this.calculateDirectionalDistance(currentPos, otherPos)
      // 如果前方車輛在停止或等待狀態，視為停止車輛
      const isStopped =
        v.currentState === 'waitingForVehicle' ||
        v.currentState === 'stopped' ||
        v.waitingForGreen ||
        (v.movementTimeline && v.movementTimeline.timeScale() <= 0.01)
      if (d >= 0 && isStopped && d < nearestStoppedDistance) {
        nearestStoppedFront = v
        nearestStoppedDistance = d
      }
    }

    // 如果發現前方已停止車輛，且距離小於 queueGap 或小於 minFollow，則停止
    if (nearestStoppedFront && (nearestStoppedDistance < queueGap || nearestStoppedDistance < minFollow)) {
      return {
        shouldStop: true,
        shouldFollow: false,
        vehicle: nearestStoppedFront,
        distance: nearestStoppedDistance,
        requiredGap: queueGap,
        reason: `接近停止車輛，保持距離`,
        targetSpeed: 0,
      }
    }

    // 如果沒有停止車輛，但到停止線的距離小於 queueGap，則緩慢前進到保持距離位置
    if (distanceToStopLine <= queueGap) {
      // 計算合適速度以逐步靠近但不壓上
      const speedRatio = Math.max(0.0, distanceToStopLine / Math.max(1, queueGap))

      return {
        shouldStop: false,
        shouldFollow: true,
        vehicle: null,
        distance: distanceToStopLine,
        requiredGap: queueGap,
        reason: `接近停止線，保持距離並減速`,
        targetSpeed: Math.max(0.05, speedRatio),
      }
    }

    return null
  }

  /**
   * 詳細碰撞檢查（從原 checkSimpleCollision 分離出來）
   * @param {Array} vehicles 要檢查的車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  performDetailedCollisionCheck(vehicles) {
    // 對於剛創建的車輛，不完全跳過檢查，而是使用寬鬆檢查
    if (this.vehicle.justCreated) {
      // 寬鬆檢查：允許向停止線前進，但避免與前車瞬間重疊
      const currentBox = this.vehicle.getBoundingBox()
      const relaxedGap = this.vehicle.laneNumber === 1 ? 14 : 10 // 新車使用較寬鬆的間距

      for (let vehicle of vehicles) {
        if (vehicle.id === this.vehicle.id) continue
        const otherBox = vehicle.getBoundingBox()
        let distance = 0
        let isFrontVehicle = false

        // 複製方向檢測邏輯以判斷前車
        if (this.vehicle.direction === 'east') {
          isFrontVehicle = otherBox.centerX > currentBox.centerX && Math.abs(otherBox.centerY - currentBox.centerY) < 30
          distance = isFrontVehicle ? otherBox.left - currentBox.right : -1
        } else if (this.vehicle.direction === 'west') {
          isFrontVehicle = otherBox.centerX < currentBox.centerX && Math.abs(otherBox.centerY - currentBox.centerY) < 30
          distance = isFrontVehicle ? currentBox.left - otherBox.right : -1
        } else if (this.vehicle.direction === 'north') {
          isFrontVehicle = otherBox.centerY < currentBox.centerY && Math.abs(otherBox.centerX - currentBox.centerX) < 30
          distance = isFrontVehicle ? currentBox.top - otherBox.bottom : -1
        } else if (this.vehicle.direction === 'south') {
          isFrontVehicle = otherBox.centerY > currentBox.centerY && Math.abs(otherBox.centerX - currentBox.centerX) < 30
          distance = isFrontVehicle ? otherBox.top - currentBox.bottom : -1
        }

        if (isFrontVehicle && distance >= 0) {
          // 非常接近（瞬間重疊風險） -> 極慢速前進而非停止
          if (distance < Math.max(4, relaxedGap * 0.4)) {
            return {
              shouldStop: false,
              shouldFollow: true,
              vehicle: vehicle,
              distance: distance,
              requiredGap: relaxedGap,
              reason: '新生成車輛：距離過近，超慢速前進',
              targetSpeed: 0.05, // 極慢速度而非停止
            }
          }

          // 接近但不致命 -> 慢速跟隨，逐步靠近停止線
          if (distance < relaxedGap) {
            return {
              shouldStop: false,
              shouldFollow: true,
              vehicle: vehicle,
              distance: distance,
              requiredGap: relaxedGap,
              reason: '新生成車輛：寬鬆跟隨前車以形成排隊',
              targetSpeed: 0.18,
            }
          }
        }
      }

      // 若沒有前車威脅，允許前進（以正常速度由其他邏輯控制）
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

        // 🚦 改進邏輯：即使距離很近也允許緩慢跟隨而不是完全停止
        let targetSpeed = 0.08 // 預設超慢速度

        if (distance <= 3) {
          targetSpeed = 0.03 // 極極慢 (3%)
        } else if (distance <= 5) {
          targetSpeed = 0.05 // 極慢 (5%)
        } else if (distance <= LANE_1_ENHANCED_GAP * 0.5) {
          targetSpeed = 0.08 // 超慢 (8%)
        }

        return {
          shouldStop: false,
          shouldFollow: true,
          vehicle: vehicle,
          distance: distance,
          requiredGap: LANE_1_ENHANCED_GAP,
          frontVehicleAtStopLine: isAtStopLine,
          frontVehicleIsMoving: isMoving,
          targetSpeed: targetSpeed,
          reason: `車距近但保持緩慢前進: ${distance.toFixed(1)}px, 前車狀態: ${isMoving ? '移動' : '停止'}`,
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

    // 🚦 核心邏輯：根據停止線位置和交通燈狀態決定碰撞策略
    const hasPassedStopLine = this.isVehiclePassedStopLine()
    const canProceedWithTrafficLight = this.canProceedWithCurrentLight()

    // 🚦 特別處理1號車道：即使交通燈允許通行，也要更謹慎地檢查距離
    if (hasPassedStopLine) {
      // ✅ 已通過停止線：完全允許穿透
      return null
    } else if (canProceedWithTrafficLight && this.vehicle.laneNumber !== 1) {
      // ✅ 非1號車道且交通燈允許通行：允許穿透
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

      if (distance > 0 && distance < COLLISION_CONFIG.DETECTION_DISTANCES.SLOW_DISTANCE && distance < minDistance) {
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

    // 🚦 根據車道和交通燈狀態調整碰撞檢測參數
    const isLane1WithLeftGreen = this.vehicle.laneNumber === 1 && canProceedWithTrafficLight

    // 🚦 1號車道在左轉綠燈時使用較寬鬆的距離要求
    const effectiveStopDistance = isLane1WithLeftGreen
      ? COLLISION_CONFIG.DETECTION_DISTANCES.STOP_DISTANCE * 0.7 // 7px instead of 12px
      : COLLISION_CONFIG.DETECTION_DISTANCES.STOP_DISTANCE

    const effectiveSlowDistance = isLane1WithLeftGreen
      ? COLLISION_CONFIG.DETECTION_DISTANCES.SLOW_DISTANCE * 0.8 // 20px instead of 25px
      : COLLISION_CONFIG.DETECTION_DISTANCES.SLOW_DISTANCE

    if (distance <= effectiveStopDistance) {
      // 🚗 改進邏輯：即使距離過近，也應允許緩慢前進以保持安全距離
      const frontVehicleSpeed = threatVehicle.movementTimeline ? threatVehicle.movementTimeline.timeScale() : 0
      const frontIsStopped = frontVehicleSpeed <= 0.1

      // 🎯 動態計算跟隨速度，即使是最小距離也允許超慢速前進
      let targetSpeed = 0.05 // 預設超慢速度 (5%)

      if (frontIsStopped) {
        // 前車已停止，計算適當的跟隨速度
        if (distance <= 2) {
          targetSpeed = 0.03 // 極極慢速度 (3%) - 最小化前進速度
        } else if (distance <= 4) {
          targetSpeed = 0.05 // 極慢速度 (5%)
        } else if (distance <= 7) {
          targetSpeed = 0.08 // 超慢速度 (8%)
        } else if (distance <= effectiveStopDistance) {
          targetSpeed = 0.12 // 慢速度 (12%)
        }
      } else {
        // 前車正在移動，使用更快的跟隨速度
        if (distance <= effectiveStopDistance * 0.5) {
          targetSpeed = 0.2 // 20% 速度
        } else {
          targetSpeed = 0.4 // 40% 速度
        }
      }

      return {
        action: 'follow',
        vehicle: threatVehicle,
        distance: distance,
        shouldStop: false, // 🚦 改為不停止，而是超慢速前進
        shouldFollow: true,
        frontVehicleIsMoving: frontVehicleSpeed > 0.1,
        targetSpeed: targetSpeed,
        requiredGap: effectiveStopDistance,
        autoFollowing: true, // 標記為自動跟隨模式
        reason: `距離過近但保持緩慢前進: ${distance.toFixed(1)}px, 前車速度${(frontVehicleSpeed * 100).toFixed(0)}%, 目標速度${(targetSpeed * 100).toFixed(0)}%`,
      }
    }

    if (distance <= effectiveSlowDistance) {
      // 檢查前車速度，防止快車穿越慢車
      const frontVehicleSpeed = threatVehicle.movementTimeline ? threatVehicle.movementTimeline.timeScale() : 0
      const mySpeed = this.vehicle.movementTimeline ? this.vehicle.movementTimeline.timeScale() : 0

      // 🧠 智能預測減速：根據相對速度提前減速
      const prediction = this.predictiveSlowdown(threatVehicle, distance)

      // 如果前車較慢或停止，後車必須更大幅度減速
      let speedRatio
      if (frontVehicleSpeed <= 0.1) {
        // 前車停止：使用標準的緩慢前進速度
        if (distance > effectiveStopDistance + 2) {
          // 使用配置的最小跟車速度
          speedRatio = FOLLOWING_CONFIG.SPEED_RATIOS.MIN_SPEED_RATIO // 0.15
        } else {
          // 距離太近仍需停止
          speedRatio = 0
        }
      } else if (prediction.shouldSlowDown) {
        // 🧠 使用智能預測的推薦速度
        speedRatio = prediction.recommendedSpeed
      } else if (frontVehicleSpeed < mySpeed) {
        // 前車較慢，後車速度不能超過前車
        speedRatio = Math.min(
          frontVehicleSpeed * 0.8,
          Math.max(
            FOLLOWING_CONFIG.SPEED_RATIOS.MIN_ABSOLUTE_RATIO,
            (distance - effectiveStopDistance) / (effectiveSlowDistance - effectiveStopDistance),
          ),
        )
      } else {
        // 正常跟車，1號車道左轉綠燈時允許較高速度
        const baseSpeedRatio = Math.max(
          FOLLOWING_CONFIG.SPEED_RATIOS.MIN_ABSOLUTE_RATIO,
          (distance - effectiveStopDistance) / (effectiveSlowDistance - effectiveStopDistance),
        )
        speedRatio = isLane1WithLeftGreen ? Math.min(1.0, baseSpeedRatio * 1.2) : baseSpeedRatio
      }

      return {
        action: 'follow',
        vehicle: threatVehicle,
        distance: distance,
        shouldStop: speedRatio === 0,
        shouldFollow: true,
        targetSpeed: speedRatio,
        requiredGap: effectiveStopDistance,
        reason: prediction.shouldSlowDown
          ? prediction.reason
          : `跟車模式: ${distance.toFixed(1)}px, 速度: ${(speedRatio * 100).toFixed(0)}%, 前車速度: ${(frontVehicleSpeed * 100).toFixed(0)}% ${isLane1WithLeftGreen ? '(1號車道左轉綠燈)' : ''}`,
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
      return Math.abs(myPos.y - otherPos.y) <= COLLISION_CONFIG.DETECTION_DISTANCES.LANE_TOLERANCE
    } else {
      // 南北向：檢查X軸對齊
      return Math.abs(myPos.x - otherPos.x) <= COLLISION_CONFIG.DETECTION_DISTANCES.LANE_TOLERANCE
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
   * 🧠 計算相對速度（後車速度 - 前車速度）
   * @param {Vehicle} frontVehicle 前方車輛
   * @returns {number} 相對速度比例（0-1）
   */
  calculateRelativeSpeed(frontVehicle) {
    if (!frontVehicle || !frontVehicle.movementTimeline || !this.vehicle.movementTimeline) {
      return 0
    }

    const mySpeed = this.vehicle.movementTimeline.timeScale()
    const frontSpeed = frontVehicle.movementTimeline.paused() ? 0 : frontVehicle.movementTimeline.timeScale()

    return mySpeed - frontSpeed
  }

  /**
   * 🧠 智能預測減速距離
   * @param {Vehicle} frontVehicle 前方車輛
   * @param {number} currentDistance 當前距離
   * @returns {Object} 預測結果 {shouldSlowDown, recommendedSpeed, reason}
   */
  predictiveSlowdown(frontVehicle, currentDistance) {
    if (!FOLLOWING_CONFIG.PREDICTIVE_SLOWDOWN.ENABLED) {
      return { shouldSlowDown: false, recommendedSpeed: 1.0, reason: '預測減速未啟用' }
    }

    const relativeSpeed = this.calculateRelativeSpeed(frontVehicle)

    // 如果後車速度不快於前車，不需要預測減速
    if (relativeSpeed <= FOLLOWING_CONFIG.PREDICTIVE_SLOWDOWN.RELATIVE_SPEED_THRESHOLD) {
      return { shouldSlowDown: false, recommendedSpeed: 1.0, reason: '相對速度安全' }
    }

    // 計算預測距離：根據相對速度動態調整
    const predictionDistance = Math.min(
      FOLLOWING_CONFIG.PREDICTIVE_SLOWDOWN.MAX_PREDICTION_DISTANCE,
      Math.max(
        FOLLOWING_CONFIG.PREDICTIVE_SLOWDOWN.MIN_PREDICTION_DISTANCE,
        currentDistance * FOLLOWING_CONFIG.PREDICTIVE_SLOWDOWN.PREDICTION_DISTANCE_MULTIPLIER * relativeSpeed,
      ),
    )

    // 如果當前距離小於預測距離，需要減速
    if (currentDistance < predictionDistance) {
      // 計算推薦速度：距離越近，速度越低
      const distanceRatio = currentDistance / predictionDistance
      const baseSpeed = 0.3 // 基礎速度
      const recommendedSpeed = Math.max(baseSpeed, distanceRatio * 0.9)

      return {
        shouldSlowDown: true,
        recommendedSpeed: recommendedSpeed,
        reason: `預測減速: 相對速度${relativeSpeed.toFixed(2)}, 距離${currentDistance.toFixed(1)}px < 預測距離${predictionDistance.toFixed(1)}px`,
      }
    }

    return { shouldSlowDown: false, recommendedSpeed: 1.0, reason: '距離充足' }
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
    this.vehicle = null
  }

  /**
   * 工廠方法：創建特定配置的碰撞控制器
   */
  static createForLane(vehicle, laneNumber) {
    const controller = new CollisionController(vehicle)

    // 根據車道調整檢查間隔和參數
    if (laneNumber === 1) {
      // 左轉車道：更頻繁檢查，更嚴格的距離控制
      controller.setCheckInterval(25) // 更頻繁檢查：25ms
      controller.nearbyVehicleRange = 80 // 較小的檢查範圍，專注於近距離車輛
    } else {
      // 直行車道：標準設定
      controller.setCheckInterval(50)
      controller.nearbyVehicleRange = 100
    }

    return controller
  }
}
