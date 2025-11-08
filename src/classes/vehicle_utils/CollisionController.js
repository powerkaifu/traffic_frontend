/**
 * 碰撞控制器
 * 負責處理所有碰撞檢測與跟車相關邏輯，讓 Vehicle.js 保持簡潔
 * 整合了 SimpleCollisionDetector 的功能
 *
 * 🚀 第1階段優化：集成 SpatialHashGrid
 * - 將碰撞檢測從 O(n) 優化到 O(1) 查詢
 * - 預期 CPU 減少 60-70%
 */

import {
  COLLISION_CONFIG,
  FOLLOWING_CONFIG,
  DISTANCE_CONFIG,
  ANIMATION_CONFIG,
  LANE_SPAWN_CONFIG,
} from '../config/vehicleConfig.js'
import { SpatialHashGrid } from '../optimization/SpatialHashGrid.js'

export class CollisionController {
  // 🚀 第1階段優化：全局空間分割網格（在 IndexPage.vue 中初始化）
  static spatialGrid = null

  constructor(vehicle, simulationStore = null) {
    // ✅ Phase 6：注入 simulationStore 參數
    this.simulationStore = simulationStore

    this.vehicle = vehicle
    this.lastCollisionCheck = 0 // 上次碰撞檢查時間
    this.collisionCheckInterval = COLLISION_CONFIG.CHECK_INTERVAL // 碰撞檢查間隔（毫秒）
    this.nearbyVehicleRange = COLLISION_CONFIG.DETECTION_DISTANCES.NEARBY_VEHICLE_RANGE // 附近車輛檢查範圍（使用配置）

    // SimpleCollisionDetector 整合的屬性
    this.lastCheckTime = 0

    // 🆕 根據 TIME_MULTIPLIER 自動調整檢查間隔
    this.checkInterval = this._calculateAdaptiveCheckInterval()

    // 🚀 第2階段優化：前車緩存機制
    // 避免每幀重新搜索前方車輛，只在車輛進出視野時更新
    this.cachedFrontVehicle = null // 緩存的前方車輛
    this.cachedFrontDistance = Infinity // 緩存的前方距離
    this.lastFrontVehicleUpdateTime = 0 // 上次更新前車緩存的時間
    this.frontVehicleCacheUpdateInterval = 100 // 前車緩存更新間隔（毫秒）
    this.frontVehicleOutOfRangeCounter = 0 // 計數器：前車超出範圍的次數

    // 🚀 優化 1-8：新增快取機制
    this.cachedPosition = null // 緩存的車輛位置
    this.cachedPositionTime = 0 // 位置緩存時間戳
    this.positionCacheInterval = 5 // 位置緩存間隔 (5ms)

    this.cachedBoundingBox = null // 緩存的邊界框
    this.lastBoxCacheTime = 0 // 邊界框緩存時間
    this.boundingBoxCacheInterval = 10 // 邊界框緩存間隔 (10ms)

    this.sameDirectionVehiclesCache = [] // 同方向車輛快取
    this.lastDirectionFilterTime = 0 // 上次過濾時間
    this.directionFilterCacheInterval = 100 // 同方向快取間隔 (100ms)

    this.cachedLightState = null // 緩存的燈號狀態
    this.cachedCanProceed = false // 緩存的通行允許
    this.lastLightStateCacheTime = 0 // 燈號快取時間
    this.lightStateCacheInterval = 50 // 燈號快取間隔 (50ms)

    this.cachedStopLineDistance = null // 緩存的停止線距離
    this.lastStopLineDistanceTime = 0 // 停止線距離快取時間
    this.stopLineDistanceCacheInterval = 20 // 停止線快取間隔 (20ms)
  }

  /**
   * 🚀 靜態方法：初始化全局空間分割網格
   * 應在 IndexPage.vue mounted 時調用一次
   */
  static initializeSpatialGrid(canvasWidth, canvasHeight, cellSize = 150) {
    CollisionController.spatialGrid = new SpatialHashGrid(canvasWidth, canvasHeight, cellSize)
  }

  /**
   * 🚀 靜態方法：重建空間分割網格
   * 應在每幀動畫開始時調用
   */
  static rebuildSpatialGrid(allVehicles) {
    if (CollisionController.spatialGrid && allVehicles.length > 0) {
      CollisionController.spatialGrid.rebuild(allVehicles)
    }
  }

  /**
   * 🆕 根據 TIME_MULTIPLIER 計算自適應碰撞檢查間隔
   * @returns {number} 調整後的檢查間隔（毫秒）
   *
   * 當動畫加速（TIME_MULTIPLIER < 1）時，檢查間隔需要相應減少
   * 例如：TIME_MULTIPLIER=0.1 → checkInterval = 50 * 0.1 = 5ms
   * 這確保了無論動畫速度如何，碰撞檢測相對頻率始終一致
   */
  _calculateAdaptiveCheckInterval() {
    // 檢查是否啟用時間補償
    if (!COLLISION_CONFIG.TIME_MULTIPLIER_COMPENSATION?.ENABLED) {
      return COLLISION_CONFIG.SIMPLE_CHECK_INTERVAL
    }

    const timeMultiplier = ANIMATION_CONFIG.TIME_MULTIPLIER
    const baseInterval = COLLISION_CONFIG.SIMPLE_CHECK_INTERVAL
    let minInterval = COLLISION_CONFIG.TIME_MULTIPLIER_COMPENSATION.MIN_CHECK_INTERVAL

    // 激進模式：極快的動畫（TIME_MULTIPLIER < 0.15）進行額外優化
    if (COLLISION_CONFIG.TIME_MULTIPLIER_COMPENSATION.ULTRA_AGGRESSIVE_MODE && timeMultiplier < 0.15) {
      minInterval = Math.max(0.5, minInterval * 0.25) // 更激進：2ms → 0.5ms
    }

    // 計算補償後的檢查間隔
    const compensatedInterval = Math.max(minInterval, baseInterval * timeMultiplier)

    return compensatedInterval
  }

  /**
   * 🆕 更新碰撞檢查間隔（當 TIME_MULTIPLIER 改變時調用）
   */
  updateCheckIntervalForTimeMultiplier() {
    this.checkInterval = this._calculateAdaptiveCheckInterval()
  }

  /**
   * 🚀 第2階段優化：快速查詢前方最近的車輛（使用緩存）
   * @param {Array} sameDirectionVehicles - 同方向同車道的車輛列表
   * @returns {Object|null} 前方最近的車輛對象或 null
   */
  getCachedFrontVehicle(sameDirectionVehicles) {
    const now = Date.now()

    // 檢查緩存是否需要更新
    // 條件1：距上次更新已超過更新間隔
    // 條件2：緩存的前車已被銷毀或不在列表中
    // 條件3：緩存距離過大（超出有效檢測範圍）
    const needsUpdate =
      now - this.lastFrontVehicleUpdateTime > this.frontVehicleCacheUpdateInterval ||
      !this.cachedFrontVehicle ||
      !sameDirectionVehicles.includes(this.cachedFrontVehicle) ||
      this.cachedFrontDistance > COLLISION_CONFIG.DETECTION_DISTANCES.SLOW_DISTANCE * 2

    if (!needsUpdate) {
      // 使用緩存的前車
      return this.cachedFrontVehicle
    }

    // 需要更新緩存：搜索最近的前車
    const myPos = this.vehicle.getCurrentPosition()
    if (!myPos) return null

    let closest = null
    let minDistance = Infinity

    for (const vehicle of sameDirectionVehicles) {
      const vehiclePos = vehicle.getCurrentPosition()
      if (!vehiclePos) continue

      const distance = this.calculateDirectionalDistance(myPos, vehiclePos)

      // 只檢查前方的車輛
      if (distance > 0 && distance < minDistance) {
        minDistance = distance
        closest = vehicle
      }
    }

    // 更新緩存
    this.lastFrontVehicleUpdateTime = now
    this.cachedFrontVehicle = closest
    this.cachedFrontDistance = minDistance

    return closest
  }

  /**
   * 🚀 第2階段優化：清空前車緩存
   * 應在車輛離開場景或狀態發生重大變化時調用
   */
  clearFrontVehicleCache() {
    this.cachedFrontVehicle = null
    this.cachedFrontDistance = Infinity
    this.lastFrontVehicleUpdateTime = 0
    this.frontVehicleOutOfRangeCounter = 0
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

  // ========== 優化 3：統一方向檢測方法 ==========
  /**
   * 統一的方向檢測，替換重複的 switch 語句
   * @param {string} direction - 方向字符串 (例如 'east', 'west', 'north', 'south')
   * @returns {number} 方向常數 (0-3)
   */
  getDirectionConstant(direction) {
    if (!direction) return 0
    const dirMap = { east: 0, west: 1, north: 2, south: 3, up: 0, down: 1, left: 2, right: 3 }
    return dirMap[direction] ?? 0
  }

  /**
   * 統一的方向向量獲取
   * @param {number} dirConstant - 方向常數
   * @returns {object} {x, y} 方向向量
   */
  getDirectionVector(dirConstant) {
    const vectors = [
      { x: 1, y: 0 }, // east/right
      { x: -1, y: 0 }, // west/left
      { x: 0, y: -1 }, // north/up
      { x: 0, y: 1 }, // south/down
    ]
    return vectors[dirConstant] || { x: 0, y: 0 }
  }

  // ========== 優化 5：統一燈號狀態快取 ==========
  /**
   * 統一快取燈號狀態查詢
   * @returns {string} 燈號狀態字符串
   */
  getCachedLightState() {
    const now = Date.now()
    if (this.cachedLightState !== null && now - this.lastLightStateCacheTime < this.lightStateCacheInterval) {
      return this.cachedLightState
    }

    let lightState = 'unknown'
    try {
      if (typeof window !== 'undefined' && window.trafficController) {
        lightState = window.trafficController.getCurrentLightState(this.vehicle.direction)
      }
    } catch (error) {
      console.warn(`[${this.vehicle.id}] 燈號快取查詢失敗:`, error)
    }

    this.cachedLightState = lightState
    this.lastLightStateCacheTime = now
    return lightState
  }

  // ========== 優化 8：統一停止線距離計算 ==========
  /**
   * 統一計算停止線距離
   * @returns {number} 到停止線的距離
   */
  getStopLineDistance() {
    const now = Date.now()
    if (
      this.cachedStopLineDistance !== null &&
      now - this.lastStopLineDistanceTime < this.stopLineDistanceCacheInterval
    ) {
      return this.cachedStopLineDistance
    }

    const stopLine = this.vehicle.getStopLinePosition()
    const currentPos = this.vehicle.getCurrentPosition()

    if (!stopLine || !currentPos) {
      this.cachedStopLineDistance = Infinity
      this.lastStopLineDistanceTime = now
      return Infinity
    }

    let distance = Infinity
    const direction = this.vehicle.direction

    if (direction === 'east') {
      distance = stopLine.x - currentPos.x
    } else if (direction === 'west') {
      distance = currentPos.x - stopLine.x
    } else if (direction === 'north') {
      distance = currentPos.y - stopLine.y
    } else if (direction === 'south') {
      distance = stopLine.y - currentPos.y
    }

    this.cachedStopLineDistance = distance
    this.lastStopLineDistanceTime = now
    return distance
  }

  /**
   * 🆕 Phase 6：判斷車輛是否在停止線附近（燈號感知碰撞檢測）
   * @returns {Object} {isNear: boolean, distance: number, lightState: string}
   */
  isNearStopLineForCollisionDetection() {
    try {
      if (typeof window === 'undefined' || !window.trafficController) {
        return { isNear: false, distance: Infinity, lightState: 'unknown' }
      }

      const currentLightState = window.trafficController.getCurrentLightState(this.vehicle.direction)
      const stopLine = this.vehicle.getStopLinePosition()
      const myPos = this.vehicle.getCurrentPosition()

      if (!stopLine || !myPos) {
        return { isNear: false, distance: Infinity, lightState: currentLightState }
      }

      // 計算到停止線的有向距離
      let distance = 0
      switch (this.vehicle.direction) {
        case 'east':
          distance = stopLine.x - myPos.x
          break
        case 'west':
          distance = myPos.x - stopLine.x
          break
        case 'north':
          distance = myPos.y - stopLine.y
          break
        case 'south':
          distance = stopLine.y - myPos.y
          break
      }

      // 根據燈號狀態決定檢測距離
      let checkDistance = 0
      if (currentLightState === 'yellow') {
        checkDistance = COLLISION_CONFIG.YELLOW_LIGHT_CHECK_DISTANCE || 120
      } else if (currentLightState === 'red') {
        checkDistance = COLLISION_CONFIG.STOP_LINE_CHECK_DISTANCE || 80
      } else {
        // 綠燈時不需要停止線限制（Phase 5E 已處理）
        return { isNear: false, distance: distance, lightState: currentLightState }
      }

      // 判斷是否在停止線附近（允許往後超過停止線）
      const isNear = distance >= -20 && distance <= checkDistance

      return { isNear, distance, lightState: currentLightState }
    } catch (error) {
      console.warn(`[${this.vehicle.id}] 停止線距離檢查失敗:`, error)
      return { isNear: false, distance: Infinity, lightState: 'unknown' }
    }
  }

  /**
   * 🆕 Phase 6：根據燈號獲取適當的碰撞檢查間隔
   * @returns {number} 碰撞檢查間隔（毫秒）
   */
  getAdaptiveCollisionCheckInterval() {
    try {
      if (typeof window === 'undefined' || !window.trafficController) {
        return COLLISION_CONFIG.CHECK_INTERVAL || 175
      }

      const currentLightState = window.trafficController.getCurrentLightState(this.vehicle.direction)
      const stopLineInfo = this.isNearStopLineForCollisionDetection()

      // 🔧 根據車輛速度動態調整檢查間隔
      // 高速車輛（特別是機車）需要更頻繁的碰撞檢測
      const vehicleSpeed = this.vehicle.currentSpeed || 0
      let speedAdjustedInterval = COLLISION_CONFIG.CHECK_INTERVAL || 175

      // 當速度 > 1.5 時，開始加密檢查
      if (vehicleSpeed > 1.5) {
        // 根據速度線性遞減檢查間隔
        // 例如：speed=2 → interval=120ms, speed=3 → interval=70ms, speed=4+ → interval=30ms
        speedAdjustedInterval = Math.max(30, 175 - (vehicleSpeed - 1.5) * 30)
      }

      // 只在停止線附近才進行碰撞檢測（除非車輛速度很快）
      if (!stopLineInfo.isNear && vehicleSpeed <= 1.5) {
        return Infinity // 遠離停止線且低速，不需要檢測
      }

      // 高速車輛即使遠離停止線也要檢測（防止機車重疊）
      if (!stopLineInfo.isNear && vehicleSpeed > 1.5) {
        return speedAdjustedInterval // 高速車輛保持頻繁檢測
      }

      // 在停止線附近時，根據燈號狀態選擇檢查間隔
      if (currentLightState === 'yellow') {
        const yellowInterval = COLLISION_CONFIG.YELLOW_LIGHT_CHECK_INTERVAL || 75
        // 高速時進一步加密檢查
        if (vehicleSpeed > 1.5) {
          return Math.min(yellowInterval, speedAdjustedInterval)
        }
        return yellowInterval
      } else if (currentLightState === 'red') {
        const redInterval = COLLISION_CONFIG.RED_LIGHT_CHECK_INTERVAL || 175
        // 高速時採用速度調整的間隔
        if (vehicleSpeed > 1.5) {
          return Math.min(redInterval, speedAdjustedInterval)
        }
        return redInterval
      }

      return speedAdjustedInterval
    } catch (error) {
      console.warn(`[${this.vehicle.id}] 適應性碰撞檢查間隔計算失敗:`, error)
      return COLLISION_CONFIG.CHECK_INTERVAL || 175
    }
  }

  /**
   * 🚀 DRY 優化：計算車輛到停止線的距離（統一方法）
   * 用於避免重複的 4 向距離計算代碼
   * @param {Object} vehicle - 車輛對象
   * @param {Object} stopLine - 停止線位置 {x, y}
   * @returns {number} 距離，若無法計算則返回 Infinity
   */
  static getDistanceToStopLine(vehicle, stopLine) {
    if (!vehicle || !stopLine) return Infinity

    const pos = vehicle.getCurrentPosition()
    if (!pos) return Infinity

    switch (vehicle.direction) {
      case 'east':
        return Math.max(0, stopLine.x - pos.x)
      case 'west':
        return Math.max(0, pos.x - stopLine.x)
      case 'north':
        return Math.max(0, pos.y - stopLine.y)
      case 'south':
        return Math.max(0, stopLine.y - pos.y)
      default:
        return Infinity
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

    // 🚀 DRY 優化：使用統一方法計算自己到停止線的距離
    const myDistanceToStopLine = CollisionController.getDistanceToStopLine(this.vehicle, stopLine)

    // 檢查同車道是否有更接近停止線的車輛
    for (let vehicle of allVehicles) {
      if (
        vehicle.id === this.vehicle.id ||
        vehicle.direction !== this.vehicle.direction ||
        vehicle.laneNumber !== this.vehicle.laneNumber
      )
        continue

      // 🚀 DRY 優化：使用統一方法計算其他車輛的距離
      const otherDistanceToStopLine = CollisionController.getDistanceToStopLine(vehicle, stopLine)

      // 如果有其他車輛更接近停止線，則當前車輛不是最前面的
      if (otherDistanceToStopLine < myDistanceToStopLine && otherDistanceToStopLine >= 0) {
        return false
      }
    }

    return true // 當前車輛是該車道最接近停止線的車
  }

  /**
   * 🚀 DRY 優化：檢查目標車輛是否在前方範圍內
   * 用於統一 getNearbyVehicles 和其他方向判斷
   * @param {Object} myBox - 當前車輛的邊界框
   * @param {Object} otherBox - 目標車輛的邊界框
   * @param {string} direction - 車輛方向 (east|west|north|south)
   * @param {number} rangeLimit - 檢查範圍限制（像素）
   * @returns {number} 距離，若不在範圍內則返回 Infinity
   */
  static getForwardVehicleDistance(myBox, otherBox, direction, rangeLimit) {
    if (!myBox || !otherBox) return Infinity

    const lateralDiff = 30 // 橫向容差
    const maxRange = rangeLimit || Infinity

    switch (direction) {
      case 'east':
        if (otherBox.centerX > myBox.centerX && Math.abs(otherBox.centerY - myBox.centerY) < lateralDiff) {
          const distance = Math.abs(otherBox.centerX - myBox.centerX)
          return distance <= maxRange ? distance : Infinity
        }
        return Infinity

      case 'west':
        if (otherBox.centerX < myBox.centerX && Math.abs(otherBox.centerY - myBox.centerY) < lateralDiff) {
          const distance = Math.abs(otherBox.centerX - myBox.centerX)
          return distance <= maxRange ? distance : Infinity
        }
        return Infinity

      case 'north':
        if (otherBox.centerY < myBox.centerY && Math.abs(otherBox.centerX - myBox.centerX) < lateralDiff) {
          const distance = Math.abs(otherBox.centerY - myBox.centerY)
          return distance <= maxRange ? distance : Infinity
        }
        return Infinity

      case 'south':
        if (otherBox.centerY > myBox.centerY && Math.abs(otherBox.centerX - myBox.centerX) < lateralDiff) {
          const distance = Math.abs(otherBox.centerY - myBox.centerY)
          return distance <= maxRange ? distance : Infinity
        }
        return Infinity

      default:
        return Infinity
    }
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
      // 🚀 DRY 優化：使用統一方法檢查前方範圍
      const distance = CollisionController.getForwardVehicleDistance(
        currentBox,
        otherBox,
        this.vehicle.direction,
        this.nearbyVehicleRange,
      )

      if (distance !== Infinity) {
        nearbyVehicles.push(vehicle)
      }
    }

    return nearbyVehicles
  }

  /**
   * 判斷是否在危險區域
   * 危險區域包括：接近停止線 + 處於關鍵狀態
   * @returns {boolean} true表示在危險區域
   */
  isInCriticalZone() {
    // 🚀 DRY 優化：提取危險狀態列表
    const criticalStates = ['slowing', 'waitingForVehicle', 'stopped', 'autoFollowing']
    const isInCriticalState = criticalStates.includes(this.vehicle.currentState)

    // 檢查是否接近停止線（< 20 像素）
    const distanceToStopLine = this.vehicle.getDistanceToStopLine()
    const isNearStopLine = distanceToStopLine !== null && Math.abs(distanceToStopLine) < 20

    // 任一條件滿足即為危險區域
    return isInCriticalState || isNearStopLine
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
   * 🚀 優化 4：使用同方向快取，只檢查最近的2-3輛車
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  performQueueingCollisionCheck(allVehicles) {
    const currentBox = this.vehicle.getBoundingBox()
    const canProceedWithTrafficLight = this.canProceedWithCurrentLight()

    // 🚦 使用配置文件的排隊參數
    const baseGap = DISTANCE_CONFIG.MIN_GAP // 25px

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

    // 🚀 優化 4：只檢查同方向同車道的車輛，使用快取過濾
    const now = Date.now()
    const needsDirectionUpdate = now - this.lastDirectionFilterTime > this.directionFilterCacheInterval

    if (needsDirectionUpdate) {
      this.sameDirectionVehiclesCache = allVehicles.filter(
        (v) =>
          v.id !== this.vehicle.id &&
          v.direction === this.vehicle.direction &&
          v.laneNumber === this.vehicle.laneNumber,
      )
      this.lastDirectionFilterTime = now
    }

    const samePathVehicles = this.sameDirectionVehiclesCache

    // 🚀 優化 7：只檢查最近的2-3輛前方車輛而不是全部
    let frontCandidates = []
    const maxCandidates = 3 // 只檢查最近的3輛車

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

      if (isFrontVehicle && distance >= 0) {
        frontCandidates.push({ vehicle, distance })
      }
    }

    // 按距離排序並只保留最近的N輛
    frontCandidates.sort((a, b) => a.distance - b.distance)
    frontCandidates = frontCandidates.slice(0, maxCandidates)

    // 找到最近的前方車輛
    const closestFrontVehicle = frontCandidates.length > 0 ? frontCandidates[0].vehicle : null
    const minDistance = frontCandidates.length > 0 ? frontCandidates[0].distance : Infinity

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
   * 🚨 新增：檢查是否剛剛發生碰撞（被停止的車輛需要重新加入隊列）
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {boolean} true表示需要融入隊列
   */
  shouldReEnqueueAfterCollision(allVehicles) {
    // 🚨 重設計隊列融合邏輯（修復版本）
    // 原始設計問題1：依賴於 currentState 判斷不準確
    // 原始設計問題2：「距離停止線 < 100px 不融合」邏輯反了！
    // 新設計：只要車速低 + 前方有停止的車，就應該融合

    const myPos = this.vehicle.getCurrentPosition()
    const mySpeed = this.vehicle.movementTimeline ? this.vehicle.movementTimeline.timeScale() : 0

    // 條件1：車輛基本在停止狀態（速度接近 0）
    // 注意：0.15 的閾值較寬鬆，允許極低速移動也認為是停止
    if (mySpeed > 0.15) {
      return false // 車輛還在移動，不是碰撞停止狀態
    }

    // 條件2：檢查前方是否有停止的同車道車輛
    // 🚨 修復：移除「距離停止線」的限制
    // 原因：碰撞可能發生在距離停止線任何距離的地方
    // 只要前方有停止的車，就應該融合
    const sameDirectionVehicles = allVehicles.filter(
      (v) =>
        v.id !== this.vehicle.id && v.direction === this.vehicle.direction && v.laneNumber === this.vehicle.laneNumber,
    )

    if (sameDirectionVehicles.length === 0) {
      return false // 沒有前方車輛
    }

    // 條件3：尋找前方停止的車輛
    for (let other of sameDirectionVehicles) {
      const otherPos = other.getCurrentPosition()
      if (!otherPos) continue

      const distance = this.calculateDirectionalDistance(myPos, otherPos)
      const otherSpeed = other.movementTimeline ? other.movementTimeline.timeScale() : 0

      // 🚨 修復：確認前方車輛確實停止且在合理距離內
      // 距離範圍：10-400px（至少 10px 安全距離，最多 400px）
      if (distance > 10 && distance < 400 && otherSpeed <= 0.15) {
        // 確保前方車輛確實在停止或等待狀態
        // 🚨 重要：包含所有可能導致車輛停止的狀態
        const isInQueue =
          other.isAtStopLine ||
          other.waitingForGreen ||
          other.currentState === 'stopped' ||
          other.currentState === 'gapRecovery' ||
          other.currentState === 'collision' || // ✅ 車輛在碰撞狀態
          other.currentState === 'safetyStopped' || // ✅ 車輛安全停止
          other.currentState === 'rejoiningQueue' || // ✅ 車輛正在重新加入隊列
          other.currentState === 'autoFollowing' || // ✅ 車輛自動跟隨
          other.currentState === 'following' // ✅ 車輛跟隨

        if (isInQueue) {
          return true // ✅ 應該融入隊伍！
        }
      }
    }

    return false
  }

  /**
   * 🚨 新增：尋找當前車道的隊伍最後方車輛
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {Vehicle|null} 隊伍最後方的車輛
   */
  findQueueTailVehicle(allVehicles) {
    const myPos = this.vehicle.getCurrentPosition()
    const mySpeed = this.vehicle.movementTimeline ? this.vehicle.movementTimeline.timeScale() : 0

    // 🚨 修復：不只找停止的車輛，也要找所有在同方向同車道且速度低於我們的車輛
    // 這樣即使前方車輛正在減速，碰撞車輛也能跟在它後面融入隊伍
    const samePathVehicles = allVehicles.filter((v) => {
      if (v.id === this.vehicle.id) return false
      if (v.direction !== this.vehicle.direction) return false
      if (v.laneNumber !== this.vehicle.laneNumber) return false

      const vSpeed = v.movementTimeline ? v.movementTimeline.timeScale() : 0

      // 🚨 條件：前方車輛要麼停止，要麼速度比我們低（表示在減速/排隊）
      return vSpeed <= 0.15 || vSpeed <= mySpeed - 0.1
    })

    if (samePathVehicles.length === 0) {
      return null
    }

    // 找到離我最近的停止/減速車輛（即隊伍最後方）
    let closestToMe = null
    let maxDistance = -Infinity

    for (let v of samePathVehicles) {
      const vPos = v.getCurrentPosition()
      if (!vPos) continue

      const distance = this.calculateDirectionalDistance(myPos, vPos)
      // 🔧 激進設置：擴大搜尋範圍從 200px 到 400px（從 200 改為 400）
      if (distance >= 0 && distance > maxDistance && distance < 400) {
        maxDistance = distance
        closestToMe = v
      }
    }

    return closestToMe
  }

  /**
   * 簡單碰撞檢查（整合 SimpleCollisionDetector 功能）
   * 🚨 改進：強制執行最小間距檢測，防止碰撞失效
   * @param {Array} allVehicles 所有車輛陣列
   * @returns {Object|null} 碰撞結果或null
   */
  checkSimpleCollision(allVehicles) {
    // 🆕 Phase 6：停止線限制碰撞檢測 + 速度感知
    // 獲取適應性檢查間隔（根據燈號和停止線距離和車速）
    const adaptiveInterval = this.getAdaptiveCollisionCheckInterval()

    // 性能優化：限制檢查頻率
    const now = Date.now()
    if (now - this.lastCheckTime < adaptiveInterval) {
      return null
    }

    // 🆕 Phase 6：根據燈號狀態判斷是否需要檢測碰撞
    const stopLineInfo = this.isNearStopLineForCollisionDetection()
    const vehicleSpeed = this.vehicle.currentSpeed || 0

    // 碰撞檢測觸發條件：
    // 1. 綠燈時：完全跳過（Phase 5E 邏輯）
    // 2. 紅燈 OR 黃燈時：始終檢測（無論距離）
    // 3. 高速車輛（速度 > 1.5）：始終檢測（防止重疊）
    // 4. 其他情況：只在停止線附近檢測
    if (stopLineInfo.lightState === 'green' && vehicleSpeed <= 1.5) {
      return null // 綠燈且低速時完全跳過碰撞檢測
    }

    // 高速車輛即使綠燈也要檢測（防止高速重疊）
    if (stopLineInfo.lightState === 'green' && vehicleSpeed > 1.5) {
      // 高速綠燈仍需檢測
    }

    // 紅燈和黃燈時，始終進行碰撞檢測（不受停止線距離限制）
    // 其他狀態只在停止線附近檢測
    if (
      stopLineInfo.lightState !== 'red' &&
      stopLineInfo.lightState !== 'yellow' &&
      !stopLineInfo.isNear &&
      vehicleSpeed <= 1.5
    ) {
      return null // 非紅/黃燈且遠離停止線且低速，不檢測
    }

    this.lastCheckTime = now

    const myPos = this.vehicle.getCurrentPosition()
    if (!myPos) {
      return null
    }

    // 🚨 新增：檢查是否需要重新加入隊列
    if (this.shouldReEnqueueAfterCollision(allVehicles)) {
      // 尋找隊伍最後方的車輛，朝向它前進以融入隊列
      const queueTail = this.findQueueTailVehicle(allVehicles)
      if (queueTail) {
        const tailPos = queueTail.getCurrentPosition()
        if (tailPos) {
          const distance = this.calculateDirectionalDistance(myPos, tailPos)
          // 🚨 修復：覆蓋所有距離情況，確保總是返回 rejoin_queue 動作
          let targetSpeed = 0.05 // 預設超慢速
          let reason = ''

          if (distance > 100) {
            targetSpeed = 0.6 // 距離遠，加速前進
            reason = `重新加入隊列：快速前進 (距離${distance.toFixed(1)}px)`
          } else if (distance > 50) {
            targetSpeed = 0.4 // 中等距離，中速前進
            reason = `重新加入隊列：朝向隊伍最後方前進 (距離${distance.toFixed(1)}px)`
          } else if (distance > 30) {
            targetSpeed = 0.2 // 較近，開始減速
            reason = `接近隊伍最後方，減速 (距離${distance.toFixed(1)}px)`
          } else if (distance > 15) {
            targetSpeed = 0.1 // 很近，極慢速
            reason = `非常接近隊伍，極慢速 (距離${distance.toFixed(1)}px)`
          } else {
            targetSpeed = 0.03 // 極端接近，微調速度
            reason = `已接近安全距離，微調速度 (距離${distance.toFixed(1)}px)`
          }

          return {
            action: 'rejoin_queue',
            vehicle: queueTail,
            distance: distance,
            shouldStop: false,
            shouldFollow: true,
            targetSpeed: targetSpeed,
            requiredGap: 15,
            reason: reason,
          }
        }
      }
    }

    // 只檢查同方向的車輛
    let sameDirectionVehicles = allVehicles.filter(
      (v) =>
        v.id !== this.vehicle.id && v.direction === this.vehicle.direction && v.laneNumber === this.vehicle.laneNumber,
    )

    if (sameDirectionVehicles.length === 0) {
      return null
    }

    // � 第1階段優化：使用空間分割網格而不是全量搜索
    // 獲取附近的車輛（只檢查相鄰的網格單元，而不是全部車輛）
    // 這將查詢從 O(n) 降低到 O(1)
    let nearbyVehicles = []
    if (CollisionController.spatialGrid) {
      // 使用空間網格查詢附近的車輛
      nearbyVehicles = CollisionController.spatialGrid.getNearbyCells(myPos.x, myPos.y, 1)
      // 進一步篩選只保留同方向同車道的車輛
      sameDirectionVehicles = nearbyVehicles.filter(
        (v) =>
          v.id !== this.vehicle.id &&
          v.direction === this.vehicle.direction &&
          v.laneNumber === this.vehicle.laneNumber,
      )
    }

    if (sameDirectionVehicles.length === 0) {
      return null
    }

    // �🚨 性能優化：只檢查前方最近的 3 台車
    // 按照方向排序，找出前方的車輛，然後只檢查最近的 3 台
    sameDirectionVehicles = sameDirectionVehicles
      .map((v) => ({
        vehicle: v,
        distance: this.calculateDirectionalDistance(myPos, v.getCurrentPosition()),
      }))
      .filter((item) => item.distance > 0) // 只取前方車輛
      .sort((a, b) => a.distance - b.distance) // 按距離排序
      .slice(0, 3) // 只保留最近的 3 台
      .map((item) => item.vehicle)

    if (sameDirectionVehicles.length === 0) {
      return null
    }

    // 🚨 關鍵修復：在 TIME_MULTIPLIER: 0.1 極速下，必須首先進行強制最小間距檢查
    // 防止碰撞檢查被其他邏輯跳過導致車輛相互穿透
    const minGapCheckResult = this.performMinimumGapCheck(sameDirectionVehicles, stopLineInfo)
    if (minGapCheckResult) {
      return minGapCheckResult
    }

    // 🚦 只有在通過最小間距檢查後，才根據停止線位置決定是否允許穿透
    const hasPassedStopLine = this.isVehiclePassedStopLine()
    const canProceedWithTrafficLight = this.canProceedWithCurrentLight()

    if (hasPassedStopLine) {
      // ✅ 已通過停止線：完全允許穿透（已通過最小間距檢查）
      return null
    } else if (canProceedWithTrafficLight && this.vehicle.laneNumber !== 1) {
      // ✅ 非1號車道且交通燈允許通行：允許穿透（已通過最小間距檢查）
      return null
    }

    // 尋找最近的前方車輛（已優化為只檢查前 3 台）
    // 🚀 第2階段優化：使用前車緩存，避免每次都搜索
    let closestThreat = null
    let minDistance = Infinity

    // 首先嘗試使用緩存的前車
    const cachedFront = this.getCachedFrontVehicle(sameDirectionVehicles)

    if (cachedFront) {
      const cachedFrontPos = cachedFront.getCurrentPosition()
      if (cachedFrontPos) {
        const cachedDistance = this.calculateDirectionalDistance(myPos, cachedFrontPos)

        // 如果緩存的前車仍然有效（在有效檢測範圍內），直接使用
        if (cachedDistance > 0 && cachedDistance < COLLISION_CONFIG.DETECTION_DISTANCES.SLOW_DISTANCE * 1.5) {
          closestThreat = {
            vehicle: cachedFront,
            distance: cachedDistance,
          }
          minDistance = cachedDistance
        } else {
          // 緩存的前車已超出範圍，重新搜索
          for (let other of sameDirectionVehicles) {
            const otherPos = other.getCurrentPosition()
            if (!otherPos) continue

            const distance = this.calculateDirectionalDistance(myPos, otherPos)

            if (
              distance > 0 &&
              distance < COLLISION_CONFIG.DETECTION_DISTANCES.SLOW_DISTANCE &&
              distance < minDistance
            ) {
              minDistance = distance
              closestThreat = {
                vehicle: other,
                distance: distance,
              }
            }
          }

          // 更新緩存
          if (closestThreat) {
            this.cachedFrontVehicle = closestThreat.vehicle
            this.cachedFrontDistance = minDistance
          }
        }
      }
    } else {
      // 無緩存，進行完整搜索
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
      // � 安全優先：極小距離範圍內必須完全或幾乎完全停止
      // 在 TIME_MULTIPLIER: 0.1 極速下，任何正速度都會導致重疊
      const frontVehicleSpeed = threatVehicle.movementTimeline ? threatVehicle.movementTimeline.timeScale() : 0

      // 🚨 關鍵修復：不允許在危險距離內繼續前進
      let targetSpeed = 0 // 預設：完全停止

      if (distance <= 7) {
        // 危險區域：距離 <= 7px，必須完全停止
        targetSpeed = 0
      } else if (distance <= effectiveStopDistance) {
        // 警告區域：距離 7-12px，允許極限速度（0.001 = 0.1%）
        // 這個速度在檢查間隔內基本不會導致移動
        targetSpeed = 0.001
      }

      return {
        action: 'follow',
        vehicle: threatVehicle,
        distance: distance,
        shouldStop: targetSpeed === 0, // 如果 targetSpeed=0 則標記為停止
        shouldFollow: true,
        frontVehicleIsMoving: frontVehicleSpeed > 0.1,
        targetSpeed: targetSpeed,
        requiredGap: effectiveStopDistance,
        autoFollowing: true, // 標記為自動跟隨模式
        reason:
          targetSpeed === 0
            ? `安全停止：距離${distance.toFixed(1)}px ≤ 7px，禁止前進`
            : `極限速度：距離${distance.toFixed(1)}px，速度0.1%`,
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
        // 前車停止：不要完全停止，而是繼續用極低速度前進
        if (distance > effectiveStopDistance + 2) {
          // 距離還夠：使用配置的最小跟車速度
          speedRatio = FOLLOWING_CONFIG.SPEED_RATIOS.MIN_SPEED_RATIO // 0.15
        } else {
          // 距離太近但仍允許極慢前進（而非完全停止）
          speedRatio = FOLLOWING_CONFIG.SPEED_RATIOS.CRAWL_SPEED_RATIO || 0.05
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
   * 🚨 新增：強制最小間距檢查 - 防止碰撞失效
   * 這是最後一道防線，確保任何情況下都不會重疊
   * @param {Array} sameDirectionVehicles 同方向的車輛陣列
   * @returns {Object|null} 如果檢測到危險則返回減速指令
   */
  /**
   * 🚀 優化 7：執行最小間距檢查 - 只檢查最近的2輛車
   * @param {Array} sameDirectionVehicles 同方向車輛列表
   * @returns {Object|null} 衝突結果或null
   */
  performMinimumGapCheck(sameDirectionVehicles, stopLineInfo) {
    const myPos = this.vehicle.getCurrentPosition()
    const ABSOLUTE_MIN_GAP = 2 // 極小最小間距（2px）

    // 判斷是否在停止線區域
    const isInStopLineZone =
      stopLineInfo && (stopLineInfo.isNear || stopLineInfo.lightState === 'red' || stopLineInfo.lightState === 'yellow')

    // 🚀 優化 7：只檢查最近的2輛前方車輛而不是全部
    let frontVehicles = []

    for (let other of sameDirectionVehicles) {
      const otherPos = other.getCurrentPosition()
      if (!otherPos) continue

      const distance = this.calculateDirectionalDistance(myPos, otherPos)
      if (distance >= 0) {
        // 只考慮前方車輛
        frontVehicles.push({ vehicle: other, distance })
      }
    }

    // 按距離排序並只保留最近的2輛
    frontVehicles.sort((a, b) => a.distance - b.distance)
    frontVehicles = frontVehicles.slice(0, 2)

    for (let { vehicle: other, distance } of frontVehicles) {
      // 🚨 極速下防穿透：距離太近立即停止
      if (distance >= 0 && distance < ABSOLUTE_MIN_GAP) {
        // 極端情況：完全停止
        // � 死鎖恢復機制：無論前車狀態如何，都返回 gap_recovery
        // 這樣車輛會進入可恢復狀態，週期性檢查會持續嘗試恢復
        // const otherSpeed = other.movementTimeline ? other.movementTimeline.timeScale() : 0

        // 💡 關鍵改進：返回能夠觸發恢復邏輯的響應
        return {
          action: 'gap_recovery', // 改為 gap_recovery 而不是 emergency_gap_recovery
          vehicle: other,
          distance: distance,
          shouldStop: true,
          shouldFollow: true, // 允許持續跟隨評估
          targetSpeed: isInStopLineZone ? 0 : 0.02, // 停止線區域完全停止，開放道路爬行
          requiredGap: isInStopLineZone ? 15 : ABSOLUTE_MIN_GAP, // 停止線區域需要 15px 的隊列間距
          reason: `緊急停止：距離${distance.toFixed(1)}px，避免重疊`,
          isEmergencyStop: true, // 標記為緊急停止
        }
      } else if (distance >= 0 && distance < ABSOLUTE_MIN_GAP + 5) {
        // 接近但未到危險邊緣，極慢速
        // � 死鎖恢復：前車停止時也嘗試以極慢速前進
        const otherSpeed = other.movementTimeline ? other.movementTimeline.timeScale() : 0

        // 💡 改進邏輯：根據前車狀態調整復甦速度
        let targetSpeed = isInStopLineZone ? 0 : 0.05 // 停止線區域停止，開放道路較慢爬行
        if (!isInStopLineZone && otherSpeed <= 0.15 && distance < 3) {
          // 在開放道路逐漸加速恢復
          targetSpeed = 0.02 // 稍微快一點以便逐漸恢復
        }

        return {
          action: 'gap_recovery',
          vehicle: other,
          distance: distance,
          shouldStop: false,
          shouldFollow: true,
          targetSpeed: targetSpeed,
          requiredGap: ABSOLUTE_MIN_GAP,
          reason: `間距警告：距離${distance.toFixed(1)}px，極慢速前進`,
        }
      }
    }

    return null
  }

  /**
   * ✅ Phase 8：調整位置以保持最小間距
   * 當碰撞且距離 < requiredGap 時，調整位置使車輛後退保持安全距離
   * @param {Vehicle} frontVehicle - 前方車輛
   * @param {number} requiredGap - 所需的最小間距（像素）
   */
  adjustPositionToMaintainGap(frontVehicle, requiredGap) {
    if (!frontVehicle || !this.vehicle.element) {
      return
    }

    const myPos = this.vehicle.getCurrentPosition()
    const frontPos = frontVehicle.getCurrentPosition()

    if (!myPos || !frontPos) {
      return
    }

    // 計算需要調整的距離（後退量）
    const currentDistance = this.calculateDirectionalDistance(myPos, frontPos)
    const adjustmentNeeded = requiredGap - currentDistance

    if (adjustmentNeeded <= 0) {
      // 距離已經足夠，無需調整
      return
    }

    // 根據方向調整位置
    try {
      // 使用 gsap.to 進行平滑的位置調整，而不是突然跳動
      const adjustmentDuration = 0.1 // 100ms 的平滑調整
      const gsap = window.gsap

      switch (this.vehicle.direction) {
        case 'east':
          // 東向：後退（向西移動）
          gsap.to(this.vehicle.element, {
            x: `-=${adjustmentNeeded}`,
            duration: adjustmentDuration,
            overwrite: 'auto',
          })
          break

        case 'west':
          // 西向：後退（向東移動）
          gsap.to(this.vehicle.element, {
            x: `+=${adjustmentNeeded}`,
            duration: adjustmentDuration,
            overwrite: 'auto',
          })
          break

        case 'north':
          // 北向：後退（向南移動）
          gsap.to(this.vehicle.element, {
            y: `+=${adjustmentNeeded}`,
            duration: adjustmentDuration,
            overwrite: 'auto',
          })
          break

        case 'south':
          // 南向：後退（向北移動）
          gsap.to(this.vehicle.element, {
            y: `-=${adjustmentNeeded}`,
            duration: adjustmentDuration,
            overwrite: 'auto',
          })
          break
      }
    } catch (error) {
      console.warn(`⚠️ [${this.vehicle.id}] 位置調整失敗:`, error.message)
    }
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

    // 🚨 修復：使用統一的固定車輛尺寸來計算距離，確保所有車輛間距一致
    // 不再使用實際車輛尺寸，避免不同類型車輛間距不同
    const UNIFORM_VEHICLE_SIZE = 20 // 統一使用 20px 作為車輛基礎尺寸

    switch (this.vehicle.direction) {
      case 'east':
        // 東向：檢查右邊的車輛
        if (otherPos.x <= myPos.x) return -1 // 不在前方
        return otherPos.x - myPos.x - UNIFORM_VEHICLE_SIZE

      case 'west':
        // 西向：檢查左邊的車輛
        if (otherPos.x >= myPos.x) return -1 // 不在前方
        return myPos.x - otherPos.x - UNIFORM_VEHICLE_SIZE

      case 'north':
        // 北向：檢查上方的車輛
        if (otherPos.y >= myPos.y) return -1 // 不在前方
        return myPos.y - otherPos.y - UNIFORM_VEHICLE_SIZE

      case 'south':
        // 南向：檢查下方的車輛
        if (otherPos.y <= myPos.y) return -1 // 不在前方
        return otherPos.y - myPos.y - UNIFORM_VEHICLE_SIZE

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
    // 🚨 修復：統一使用固定尺寸來計算距離，確保所有車輛間距一致
    // 不再根據車輛類型返回不同尺寸
    return { width: 20, height: 40 } // 使用最大尺寸確保安全且一致的間距
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
   * 🚦【Phase 5A 新增】獲取某方向停止線的擁塞率
   * 用於 TrafficLightController 的下游預測和 AutoTrafficGenerator 的動態限制
   * @param {string} direction - 方向 ('north', 'south', 'east', 'west')
   * @returns {number} 擁塞率 (0.0 = 空, 1.0 = 滿)
   */
  getStopLineCongestionRate(direction) {
    const vehicles = this.getVehiclesAtStopLine(direction)
    const limit = this._getStopLineLimit(direction)
    return Math.min(1.0, vehicles.length / limit)
  }

  /**
   * 🚦【Phase 5A 新增】獲取停止線前等待的車輛
   * 篩選停止線前 50px 內、未通過停止線的車輛
   * @param {string} direction - 方向 ('north', 'south', 'east', 'west')
   * @returns {Array<Vehicle>} 停止線前的車輛陣列
   */
  getVehiclesAtStopLine(direction) {
    if (!window.liveVehicles) return []

    const stopLine = this.vehicle.getStopLinePosition()
    if (!stopLine || (!stopLine.x && !stopLine.y)) return []

    const BUFFER = LANE_SPAWN_CONFIG.ENTRY_BUFFER // 停止線檢測緩衝區（像素）

    return window.liveVehicles.filter((v) => {
      // 方向必須一致
      if (v.direction !== direction) return false

      // 已通過停止線的不算
      if (v.hasPassedStopLine) return false

      const pos = v.getCurrentPosition()
      if (!pos) return false

      // 根據方向判斷是否在停止線前
      switch (direction) {
        case 'east':
          return pos.x < stopLine.x + BUFFER && pos.x >= stopLine.x - 100
        case 'west':
          return pos.x > stopLine.x - BUFFER && pos.x <= stopLine.x + 100
        case 'north':
          return pos.y > stopLine.y - BUFFER && pos.y <= stopLine.y + 100
        case 'south':
          return pos.y < stopLine.y + BUFFER && pos.y >= stopLine.y - 100
        default:
          return false
      }
    })
  }

  /**
   * 🚦【Phase 5A 新增】獲取某方向停止線的車輛數量
   * @param {string} direction - 方向
   * @returns {number} 車輛數量
   */
  getStopLineVehicleCount(direction) {
    return this.getVehiclesAtStopLine(direction).length
  }

  /**
   * 🚦【Phase 5A 新增】獲取停止線限制
   * 從配置中獲取停止線限制值
   * @param {string} direction - 方向
   * @returns {number} 停止線限制 (預設 25)
   */
  _getStopLineLimit(direction) {
    try {
      // 嘗試從全局配置獲取
      if (window.STOP_LINE_VEHICLE_LIMITS && window.STOP_LINE_VEHICLE_LIMITS[direction]) {
        return window.STOP_LINE_VEHICLE_LIMITS[direction]
      }
    } catch {
      // 忽略錯誤
    }
    // 預設值
    return 25
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
  static createForLane(vehicle, laneNumber, simulationStore = null) {
    const controller = new CollisionController(vehicle, simulationStore)

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

  /**
   * 🔧 新增：獲取當前碰撞狀態（用於死鎖恢復監控）
   * @param {Array} sameDirectionVehicles - 同方向車輛陣列
   * @returns {Object|null} 碰撞信息 {distance, vehicle, ...} 或 null
   */
  getCurrentCollisionState(sameDirectionVehicles) {
    if (!sameDirectionVehicles || sameDirectionVehicles.length === 0) {
      return null
    }

    // ✅ 新增：獲取停止線資訊，傳遞給 performMinimumGapCheck
    const stopLineInfo = this.isNearStopLineForCollisionDetection()

    // 使用現有的 performMinimumGapCheck 方法
    return this.performMinimumGapCheck(sameDirectionVehicles, stopLineInfo)
  }

  /**
   * 🔧 新增：檢查恢復進度指標
   * 監控間距變化趨勢
   * @param {Object} previousCollision - 上次碰撞狀態
   * @param {Object} currentCollision - 當前碰撞狀態
   * @returns {Object} 進度指標 {isProgressing, distanceChange, reason}
   */
  checkRecoveryProgress(previousCollision, currentCollision) {
    if (!previousCollision || !currentCollision) {
      return { isProgressing: false, distanceChange: 0, reason: '無法比較' }
    }

    const previousDistance = previousCollision.distance || 0
    const currentDistance = currentCollision.distance || 0
    const distanceChange = currentDistance - previousDistance // 負值表示拉近，正值表示拉遠

    const MIN_PROGRESS_DISTANCE = 1 // 最小進度距離（像素）
    const isProgressing = distanceChange > MIN_PROGRESS_DISTANCE

    return {
      isProgressing,
      distanceChange: distanceChange.toFixed(2),
      reason: isProgressing ? '恢復中' : '無進展',
      previousDistance: previousDistance.toFixed(1),
      currentDistance: currentDistance.toFixed(1),
    }
  }
}
