/**
 * Vehicle.js - 車輛實體類別
 */
/* eslint-disable */
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { speedConfig, stopLineConfig } from './config/trafficConfig.js' // 引入統一的速度設定和停止線配置
import { StopLineController } from './vehicle_utils/StopLineController.js' // 🚀 新增：停止線控制器
import { CollisionController } from './vehicle_utils/CollisionController.js' // 🚀 新增：碰撞控制器（整合 SimpleCollisionDetector）
import VehicleConfig, {
  ANIMATION_CONFIG,
  TRAFFIC_LIGHT_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  COLLISION_CONFIG,
  GENERATION_CONFIG,
  VEHICLE_EXIT_CONFIG,
  VEHICLE_RECYCLING_CONFIG,
  LANE_CHANGING_CONFIG,
} from './config/vehicleConfig.js' // 🚀 整合：車輛行為配置
import { STOP_LINE_CONFIG } from './config/stopLineConfig.js' // 🚀 導入：停止線配置
import {
  VehicleStaticManager,
  VehiclePositionSpeedUtils,
  RandomSpeedUtils,
  LaneLabelUtils,
  SpeedLineUtils,
  VehicleDOMUtils,
  AnimationDurationUtils,
  CurrentSpeedUtils,
  BoundaryCheckUtils,
  HeadPositionUtils,
  BoundingBoxUtils,
  StopLineUtils,
  CollisionQueryUtils,
  StopLineAlignmentUtils,
  StopMovementUtils,
  TrafficLightSlowDownUtils,
  TrafficLightDirectResponseUtils,
  ResumeMovementUtils,
} from './utils/VehicleUtilities.js' // 🚀 新增：車輛工具類

// 註冊 GSAP 插件
gsap.registerPlugin(MotionPathPlugin)

export default class Vehicle {
  // 🚨 靜態屬性現已由 VehicleStaticManager 統一管理
  // 為了向後兼容性，保留這些 getter
  static get timeMultiplier() {
    return VehicleStaticManager.getTimeMultiplier()
  }

  static set timeMultiplier(value) {
    VehicleStaticManager.setTimeMultiplier(value)
  }

  static get antiShakeGlobalCooldown() {
    return VehicleStaticManager.antiShakeGlobalCooldown
  }

  static get lastGlobalAdjustTime() {
    return VehicleStaticManager.lastGlobalAdjustTime
  }

  static set lastGlobalAdjustTime(value) {
    VehicleStaticManager.lastGlobalAdjustTime = value
  }

  constructor(x, y, direction = 'east', vehicleType = 'large', laneNumber = 1) {
    // Factory Pattern: 根據不同參數創建不同類型的車輛實例
    this.direction = direction
    this.vehicleType = vehicleType // 車輛類型（motor, small, large）
    this.laneNumber = laneNumber // 車道編號

    // State Pattern: 定義車輛的各種狀態
    this.currentState = 'waiting' // 初始狀態
    this.movementTimeline = null
    this.originalTimeScale = null // 用於保存原始的timeScale
    this.isAtStopLine = false
    this.waitingForGreen = false
    this.hasPassedStopLine = false // 標記是否已經通過停止線
    this.periodicCheckTimer = null // 定期檢查定時器
    this.containerPosition = null // 記錄容器位置，用於檢測佈局變化
    this.justCreated = true // 新增：標記車輛剛創建，避免立即檢測碰撞

    // 🚨 新增：防抖動機制
    this.lastPositionAdjustTime = 0 // 上次位置調整時間
    this.positionAdjustCooldown = ANIMATION_CONFIG.COOLDOWN_TIMES.POSITION_ADJUST // 使用配置的位置調整冷卻時間
    this.isAdjustingPosition = false // 是否正在調整位置

    // 🚨 新增：防止時間縮放抖動
    this.lastTimeScaleChange = 0 // 上次時間縮放變更時間
    this.timeScaleDebounceDelay = ANIMATION_CONFIG.COOLDOWN_TIMES.TIMESCALE_DEBOUNCE // 使用配置的時間縮放防抖延遲
    this.pendingTimeScale = null // 待應用的時間縮放值
    this.timeScaleTimeout = null // 時間縮放更新定時器

    // 🚨 新增：停止線區域特殊防護
    this.stopLineStabilized = false // 是否在停止線區域已穩定
    this.stopLineStabilizeTime = 0 // 停止線穩定時間
    this.stopLineNoAdjustZone = false // 停止線禁止調整區域標記

    // 💨 新增：加速效果相關
    this.speedLines = null // 速度線元素
    this.isAccelerating = false // 是否正在加速
    this.lastSpeed = 0 // 上次速度（用於判斷加速）

    // 數據收集相關屬性
    this.createdAt = new Date().toISOString()
    this.startPosition = { x, y }
    this.currentSpeed = 0
    this.maxSpeed = 0
    this.totalDistance = 0
    this.movementStartTime = null
    this.movementEndTime = null

    // 🔄 新增：循環流量相關屬性（改進 7）
    this.recycleCount = 0 // 車輛被回收的次數
    this.lastRecycleTime = 0 // 上次回收時間
    this.isBeingRecycled = false // 是否正在被回收中（防止重複回收）

    // 🛣️ 新增：車道變換相關屬性（改進 8）
    this.laneChangeCount = 0 // 車輛變道的次數
    this.lastLaneChangeTime = 0 // 上次變道時間
    this.isChangingLane = false // 是否正在變道中（防止重複變道）
    this.targetLaneNumber = laneNumber // 目標車道號
    this.targetLaneX = null // 目標車道的 X 座標
    this.originalLaneNumber = laneNumber // 原始車道號（便於恢復）

    // 🌤️ 【新增】天氣相關屬性
    this.weatherMultiplier = 1.0 // 初始天氣倍數為 1.0 (晴天)
    // 嘗試從 window.liveVehicles 或 vehicleAdded 事件取得 speed
    let externalSpeed = null
    if (window.liveVehicles && Array.isArray(window.liveVehicles)) {
      // 依 id, direction, type 找 speed
      const match = window.liveVehicles.find(
        (v) => v.direction === direction && v.type === vehicleType && v.laneNumber === laneNumber && v.speed,
      )
      if (match) externalSpeed = match.speed
    }
    // 若外部有 speed，優先用；否則用原本隨機
    this.initialSpeed = externalSpeed || this.generateRandomSpeed()

    // Composite Pattern: 車輛由多個元件組成（主體元素）
    this.element = this.createElement()

    // Factory Pattern: 生成唯一識別ID
    this.id = 'vehicle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)

    // 🔴【防重複】標記是否已被移除
    this.isRemoved = false

    // Composite Pattern: 等待一個幀以確保 DOM 已準備好，再設置車輛的初始視覺屬性
    Promise.resolve().then(() => {
      gsap.set(this.element, {
        x: x,
        y: y,
        opacity: 1,
        scale: 1,
      })
    })

    // 新增車道編號標籤顯示
    this.createLaneLabel()

    // Observer Pattern: 通知交通控制器車輛生成事件
    this.notifyTrafficController()

    // Strategy Pattern: 使用延遲策略避免剛生成就被卡住
    setTimeout(() => {
      this.justCreated = false
    }, ANIMATION_CONFIG.INITIALIZATION_DELAY) // 減少到500毫秒，讓車輛更快進入正常行駛狀態

    // 🚨 新增：防停滯機制
    this.lastMovementTime = Date.now()
    this.stuckCheckTimer = null
    this.setupAntiStuckMechanism()

    // 🚀 新增：停止線控制器
    this.stopLineController = new StopLineController(this)

    // 🚀 新增：碰撞控制器（整合 SimpleCollisionDetector 功能）
    this.collisionController = CollisionController.createForLane(this, laneNumber)

    // 🌤️ 【新增】監聽天氣改變事件
    this.weatherChangeHandler = (event) => {
      this.onWeatherChanged(event.detail)
    }
    window.addEventListener('weatherChanged', this.weatherChangeHandler)

    // 🚦 【新增】監聽燈號變化事件，讓等待的車輛立即響應
    this.lightStateChangeHandler = (event) => {
      const { direction, state } = event.detail

      // 只關注本方向的燈號變化
      if (direction !== this.direction) {
        return
      }

      // 如果車輛在停止線等待且燈號變化，重新檢查是否可以通行
      if (this.waitingForGreen && this.isAtStopLine) {
        // 異步重新評估，避免在事件處理中進行複雜操作
        setTimeout(() => {
          // 重置狀態以便重新檢查停止線邏輯
          this.isAtStopLine = false
          this.waitingForGreen = false
        }, 50) // 短暫延遲確保燈號狀態已完全更新
      }
    }
    window.addEventListener('lightStateChanged', this.lightStateChangeHandler)
  }

  // 🚨 新增：防停滯機制
  setupAntiStuckMechanism() {
    // 每5秒檢查車輛是否停滯
    this.stuckCheckTimer = setInterval(() => {
      this.checkAndResolveStuckState()
    }, 5000)
  }

  // 🚨 新增：檢查並解決停滯狀態
  checkAndResolveStuckState() {
    if (!this.element || !this.element.parentNode) {
      // 車輛已被移除，清理計時器
      if (this.stuckCheckTimer) {
        clearInterval(this.stuckCheckTimer)
        this.stuckCheckTimer = null
      }
      return
    }

    const now = Date.now()
    const stuckDuration = now - this.lastMovementTime

    // 如果車輛停滯超過10秒，需要檢查是否是合理的燈號等待
    if (stuckDuration > ANIMATION_CONFIG.STUCK_CHECK_THRESHOLD) {
      // 🚨 修改：檢查當前燈號狀態，只有在綠燈但車輛仍停滯時才強制恢復
      const trafficController = window.trafficController
      if (trafficController && this.direction) {
        const currentLightState = trafficController.getCurrentLightState(this.direction)
      }
    }
  }

  // 🚨 新增：強制解除停滯
  forceUnstuck() {
    try {
      // 🚨 修改：先檢查燈號狀態，只有在綠燈時才強制恢復
      const trafficController = window.trafficController
      if (!trafficController || !this.direction) {
        console.warn(`⚠️ [${this.id}] 無法取得交通控制器或方向，跳過強制恢復`)
        return
      }

      const currentLightState = trafficController.getCurrentLightState(this.direction)
      if (currentLightState !== 'green') {
        return
      }

      // 重置移動時間
      this.lastMovementTime = Date.now()

      // 如果有移動時間軸且被暫停，嘗試恢復
      if (this.movementTimeline) {
        if (this.movementTimeline.timeScale() === 0) {
          // 恢復為原始速度，而不是慢速度
          const targetTimeScale = this.originalTimeScale || 1
          this.movementTimeline.timeScale(targetTimeScale)
        }

        if (this.movementTimeline.paused()) {
          this.movementTimeline.resume()
        }
      }

      // 更新狀態
      this.waitingForGreen = false
      this.currentState = 'moving'
    } catch (error) {
      console.error(`❌ [${this.id}] 強制恢復失敗:`, error)
    }
  }

  // Observer Pattern: 實現觀察者模式，通知交通控制器和數據收集器
  notifyTrafficController() {
    if (window.trafficController) {
      // Strategy Pattern: 車輛類型映射策略
      const vehicleTypeMapping = {
        large: 'large',
        small: 'small',
        motor: 'motor',
      }

      const mappedType = vehicleTypeMapping[this.vehicleType] || 'small'
      window.trafficController.incrementVehicleData(this.direction, mappedType)
    }

    // 通知數據收集器車輛已創建
    this.notifyDataCollector('added')
  }

  // 通知數據收集器
  notifyDataCollector(action, additionalData = {}) {
    const eventData = {
      vehicleId: this.id,
      direction: this.direction,
      type: this.vehicleType,
      speed: this.currentSpeed || this.initialSpeed,
      timestamp: new Date().toISOString(),
      laneNumber: this.laneNumber,
      position: this.getCurrentPosition(),
      ...additionalData,
    }

    const eventName = action === 'added' ? 'vehicleAdded' : 'vehicleRemoved'

    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: eventData,
      }),
    )
  }

  // 🌤️ 【新增】天氣改變事件處理器
  onWeatherChanged(weatherData) {
    const { weather, multiplier } = weatherData
    console.log(`🌤️ [車輛 ${this.id}] 天氣改變: ${weather} (倍數: ${multiplier.toFixed(2)}x)`)

    // 如果車輛還有活動的動畫時間軸，更新時間縮放
    if (this.movementTimeline && !this.movementTimeline.paused()) {
      // 獲取當前的時間縮放（可能因紅綠燈被改變）
      const currentTimeScale = this.movementTimeline.timeScale()

      // 計算新的時間縮放 = 當前時間縮放 / 舊的天氣倍數 × 新的天氣倍數
      // 由於我們不知道舊的天氣倍數，我們使用簡化方式：
      // 直接設定新的倍數（假設上次是 1.0）
      const newTimeScale = currentTimeScale * (multiplier / (this.weatherMultiplier || 1.0))

      // 更新天氣倍數
      this.weatherMultiplier = multiplier

      // 應用新的時間縮放
      this.movementTimeline.timeScale(newTimeScale)

      console.log(
        `🌤️ [車輛 ${this.id}] 速度已更新: 時間縮放 ${currentTimeScale.toFixed(2)}x -> ${newTimeScale.toFixed(2)}x`,
      )
    } else {
      // 車輛還沒開始移動，只記錄天氣倍數
      this.weatherMultiplier = multiplier
      console.log(`🌤️ [車輛 ${this.id}] 天氣倍數已設置 (車輛尚未移動): ${multiplier.toFixed(2)}x`)
    }
  }

  // Strategy Pattern: 基於車輛類型的速度生成策略
  generateRandomSpeed() {
    // 委託給 RandomSpeedUtils 生成隨機速度
    return RandomSpeedUtils.generateRandomSpeed(this.vehicleType)
  }

  // Template Method Pattern: 計算動畫持續時間的模板方法
  calculateAnimationDuration(distance = DISTANCE_CONFIG.DEFAULT_CROSSING_DISTANCE) {
    // 🚀 DRY 優化：使用工具類計算動畫時間
    return AnimationDurationUtils.calculateDuration(this.initialSpeed, distance)
  }

  // Factory Pattern: 創建車輛DOM元素的工廠方法
  createElement() {
    // Factory Pattern: 根據車輛配置創建對應的DOM元素
    const vehicleConfig = this.getVehicleConfig()

    // 委託給 VehicleDOMUtils 創建元素
    const div = VehicleDOMUtils.createVehicleElement(vehicleConfig, {
      rotation: vehicleConfig.rotation,
      scaleX: vehicleConfig.scaleX,
      vehicleType: this.vehicleType,
    })

    div.vehicleInstance = this // 保存車輛實例的引用

    // 💨 新增：創建速度線容器，委託給 SpeedLineUtils
    this.speedLines = SpeedLineUtils.createSpeedLines(div, vehicleConfig, this.direction)

    return div
  }

  // 💨 新增：顯示加速效果
  showAccelerationEffect(isIntense = false) {
    if (!this.speedLines) return

    this.isAccelerating = true

    // 委託給 SpeedLineUtils 顯示加速效果
    SpeedLineUtils.showAccelerationEffect(this.speedLines, isIntense)

    // 延遲後標記為非加速狀態
    setTimeout(
      () => {
        this.isAccelerating = false
      },
      isIntense ? 1100 : 800,
    )
  }

  // 💨 新增：隱藏加速效果
  hideAccelerationEffect() {
    if (!this.speedLines) return

    // 委託給 SpeedLineUtils 隱藏加速效果
    SpeedLineUtils.hideAccelerationEffect(this.speedLines)
  }

  // Composite Pattern: 創建車道編號標籤組件
  createLaneLabel() {
    // 委託給 LaneLabelUtils 建立標籤
    this.laneLabel = LaneLabelUtils.createLaneLabel(this.laneNumber, this.direction)
  }

  // Factory Pattern + Strategy Pattern: 獲取車輛配置的工廠策略方法
  getVehicleConfig() {
    // Factory Pattern: 基於車輛類型和方向創建配置
    // Strategy Pattern: 每種車輛類型和方向組合都有不同的策略

    const vehicleConfigs = {
      large: {
        east: { width: 35, height: 20, image: '/images/car/lCar_east.webp', rotation: 0 },
        west: { width: 35, height: 20, image: '/images/car/lCar_east.webp', rotation: 0, scaleX: -1 },
        north: { width: 35, height: 20, image: '/images/car/lCar_east.webp', rotation: -90 },
        south: { width: 35, height: 20, image: '/images/car/lCar_east.webp', rotation: 90 },
      },
      small: {
        east: { width: 30, height: 18, image: '/images/car/sCar_east.webp', rotation: 0 },
        west: { width: 30, height: 18, image: '/images/car/sCar_east.webp', rotation: 0, scaleX: -1 },
        north: { width: 30, height: 18, image: '/images/car/sCar_east.webp', rotation: -90 },
        south: { width: 30, height: 18, image: '/images/car/sCar_east.webp', rotation: 90 },
      },
      motor: {
        east: { width: 25, height: 15, image: '/images/car/mCar_east.webp', rotation: 0 },
        west: { width: 25, height: 15, image: '/images/car/mCar_east.webp', rotation: 0, scaleX: -1 },
        north: { width: 25, height: 15, image: '/images/car/mCar_east.webp', rotation: -90 },
        south: { width: 25, height: 15, image: '/images/car/mCar_east.webp', rotation: 90 },
      },
    }
    return vehicleConfigs[this.vehicleType]?.[this.direction] || vehicleConfigs.large.east
  }

  // Strategy Pattern: 根據方向計算停止線位置的策略方法
  // 🚀 簡化：委託給停止線控制器
  getStopLinePosition() {
    return this.stopLineController.getStopLinePosition()
  }

  // Observer Pattern: 檢測容器位置變化的觀察者方法
  checkLayoutChange() {
    // Observer Pattern: 監控容器位置變化（抽屜開關等）
    const container = document.querySelector('.crossroad-area')
    if (!container) return false

    const currentRect = container.getBoundingClientRect()

    if (!this.containerPosition) {
      // 第一次記錄位置
      this.containerPosition = {
        left: currentRect.left,
        top: currentRect.top,
        width: currentRect.width,
        height: currentRect.height,
      }
      return false
    }

    // 檢查位置是否發生明顯變化（容忍2px的誤差）
    const tolerance = 2
    const changed =
      Math.abs(currentRect.left - this.containerPosition.left) > tolerance ||
      Math.abs(currentRect.top - this.containerPosition.top) > tolerance ||
      Math.abs(currentRect.width - this.containerPosition.width) > tolerance ||
      Math.abs(currentRect.height - this.containerPosition.height) > tolerance

    if (changed) {
      this.containerPosition = {
        left: currentRect.left,
        top: currentRect.top,
        width: currentRect.width,
        height: currentRect.height,
      }
    }

    return changed
  }

  // Strategy Pattern: 檢查車輛是否已離開畫面邊界
  checkOutOfBounds(position) {
    // 🚨 改進：使用SVG座標系統定義邊界，更適合MotionPath
    // SVG viewBox="0 0 1400 1000"，所以我們基於這個座標系統定義邊界
    const svgBounds = {
      left: -100, // 左側邊界（SVG座標）
      right: 1500, // 右側邊界（SVG座標）- 比viewBox稍大
      top: -100, // 上方邊界（SVG座標）
      bottom: 1100, // 下方邊界（SVG座標）- 比viewBox稍大
    }

    const isOutOfBounds = this.checkBoundsForDirection(position, svgBounds)

    return isOutOfBounds
  }

  // 輔助方法：根據方向檢查邊界
  checkBoundsForDirection(position, bounds) {
    // 🚀 DRY 優化：使用工具類檢查邊界
    return BoundaryCheckUtils.checkBounds(position, bounds, this.direction)
  }

  // Template Method Pattern: 檢查是否到達停止線的模板方法
  // � 簡化：委託給停止線控制器
  checkStopLine() {
    // 🚀 DRY 優化：使用工具類檢查停止線
    return StopLineUtils.shouldStop(this.stopLineController)
  }

  // Template Method Pattern: 計算車輛到停止線距離的模板方法
  // 🚀 簡化：委託給停止線控制器
  getDistanceToStopLine() {
    // 🚀 DRY 優化：使用工具類獲取距離
    return StopLineUtils.getDistance(this.stopLineController)
  }

  // 🚀 簡化：使用停止線控制器處理交通燈邏輯
  checkTrafficLightSlowDown(trafficController) {
    // 🚀 DRY 優化：使用工具類檢查交通燈減速
    return TrafficLightSlowDownUtils.checkSlowDown({
      hasPassedStopLine: this.hasPassedStopLine,
      waitingForGreen: this.waitingForGreen,
      isAtStopLine: this.isAtStopLine,
      stopLineController: this.stopLineController,
      trafficController: trafficController,
    })
  }

  // 🚨 新增：獲取當前速度比例的輔助方法
  getCurrentSpeedRatio() {
    // 🚀 DRY 優化：使用工具類計算當前速度比例
    return CurrentSpeedUtils.getSpeedRatio(this.movementTimeline, this.originalTimeScale)
  }

  // 🌤️ 獲取天氣對速度的影響倍數
  getWeatherSpeedMultiplier() {
    // 🚀 DRY 優化：使用統一的工具類方法
    return VehiclePositionSpeedUtils.getWeatherSpeedMultiplier()
  }

  // Adapter Pattern: 獲取當前位置的適配器方法
  getCurrentPosition() {
    // 🚀 DRY 優化：使用統一的工具類方法
    if (!this.element) {
      // ⚠️ 防護：如果 element 未定義，使用起始位置
      // 這通常發生在車輛初始化的非常早期階段
      return this.startPosition || { x: 0, y: 0 }
    }
    return VehiclePositionSpeedUtils.getCurrentPosition(this.element)
  }

  // Strategy Pattern: 根據方向計算車頭位置的策略方法
  getVehicleHeadPosition() {
    // 🚀 DRY 優化：使用工具類計算車頭位置
    const currentPos = this.getCurrentPosition()
    const vehicleConfig = this.getVehicleConfig()
    const vehicleSize = { width: vehicleConfig.width, height: vehicleConfig.height }
    return HeadPositionUtils.getHeadPosition(currentPos, vehicleSize, this.direction)
  }

  // Factory Pattern: 獲取車輛邊界框的工廠方法
  getBoundingBox() {
    // 🚀 DRY 優化：使用工具類計算邊界框
    const pos = this.getCurrentPosition()
    const vehicleConfig = this.getVehicleConfig()
    const vehicleSize = { width: vehicleConfig.width, height: vehicleConfig.height }
    return BoundingBoxUtils.getBoundingBox(pos, vehicleSize)
  }

  // 🚨 極簡化碰撞檢測：只檢測 5px 間距，停止或繼續
  // 🚨 新增：檢查是否是同車道最接近停止線的車輛
  // 🚀 簡化：委託給碰撞控制器
  isClosestToStopLine(allVehicles) {
    // 🚀 DRY 優化：使用工具類檢查
    return CollisionQueryUtils.isClosestToStopLine(this.collisionController, allVehicles)
  }

  // 🎯 新增：獲取附近車輛，優化檢查範圍
  // 🚀 簡化：委託給碰撞控制器
  getNearbyVehicles(allVehicles) {
    return this.collisionController.getNearbyVehicles(allVehicles)
  }

  // 🎯 新增：判斷是否在危險區域
  // 🚀 簡化：委託給碰撞控制器
  isInCriticalZone() {
    return this.collisionController.isInCriticalZone()
  }

  // 🚀 簡化：委託給碰撞控制器
  smartCollisionCheck(allVehicles) {
    return this.collisionController.smartCollisionCheck(allVehicles)
  }

  // 🚀 簡化：委託給碰撞控制器
  performDetailedCollisionCheck(vehicles) {
    return this.collisionController.performDetailedCollisionCheck(vehicles)
  }

  // 🚀 簡化：委託給碰撞控制器
  checkSimpleCollision(allVehicles) {
    return this.collisionController.checkSimpleCollision(allVehicles)
  }

  // 🚨 移除：setDebouncedTimeScale 方法已不再需要，使用直接的 timeScale 設置

  // 🚨 新增：十字路口橫向碰撞檢測（防止車輛穿越）
  // 🚨【重寫】路口碰撞檢測 - 簡化版本，只保留5px間距檢測
  // 🚨 移除：不再檢測橫向碰撞，簡化系統
  // checkCrossDirectionCollision 已被移除，使用統一的 checkSimpleCollision

  // 🚨 移除：不再使用複雜的跟車模式，使用統一的停止/繼續邏輯
  // enterFollowingMode 和 exitFollowingMode 已被移除

  // State Pattern: 停止移動狀態控制方法
  // � 簡化：使用停止線控制器處理停車邏輯
  stopMovement() {
    // 🚀 DRY 優化：使用工具類處理停止移動
    if (StopMovementUtils.pauseAnimation(this.movementTimeline)) {
      // 精確對齊到停止線位置
      StopLineAlignmentUtils.performAlignment(this.stopLineController)

      // 更新狀態
      const newState = StopMovementUtils.updateStopState({ currentState: this.currentState })
      if (newState) {
        this.currentState = newState
      }

      // 標記已經到達停止線
      this.isAtStopLine = true
    }
  }

  // 🚨 極簡化恢復移動方法
  // � DRY 優化：委託給恢復移動工具類
  resumeMovement(allVehicles = []) {
    ResumeMovementUtils.executeResume(this, allVehicles, {
      duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.SMOOTH,
      ease: 'power2.out',
    })
  }

  // Command Pattern + State Pattern: 強制恢復移動命令
  // � 移除 forceResumeMovement 方法 - 功能已被 directTrafficLightResponse 替代

  // 🚨 移除：adjustPositionForSafety 方法已不再需要，使用簡單的 5px 間隙檢測

  // 🚨 新增：檢查車輛是否靠近停止線
  isNearStopLine() {
    const distanceToStopLine = this.getDistanceToStopLine()
    if (distanceToStopLine === null) return false

    // 使用配置的停止線附近區域範圍
    const stopLineProximity = STOP_LINE_CONFIG.DETECTION.PROXIMITY_RANGE
    return Math.abs(distanceToStopLine) <= stopLineProximity
  }

  // Composite Pattern: 將車輛添加到容器的組合方法
  addTo(container) {
    // 防呆：檢查容器是否存在
    if (!container) {
      // console.warn('[Vehicle] addTo: 目標容器不存在，無法加入車輛！', container)
      return
    }
    // Composite Pattern: 將車輛元素添加到容器中，形成組合結構
    container.appendChild(this.element)
    // 初始化時記錄容器位置
    this.checkLayoutChange()
  }

  // Helper Method: 根據方向獲取結束位置的輔助方法
  getDirectionEndPosition() {
    const currentPos = this.getCurrentPosition()

    switch (this.direction) {
      case 'east':
        return { x: 1400, y: currentPos.y }
      case 'west':
        return { x: 0, y: currentPos.y }
      case 'north':
        return { x: currentPos.x, y: 0 }
      case 'south':
        return { x: currentPos.x, y: 1000 }
      default:
        return { x: 1400, y: currentPos.y }
    }
  }

  // Helper Method: 獲取車輛對應的路徑ID
  getPathId() {
    // 將車輛的方向和車道號轉換為對應的路徑ID
    return `${this.direction}Lane${this.laneNumber}Straight`
  }

  // Helper Method: 獲取車輛對應的SVG路徑元素ID
  getSvgPathId() {
    // SVG 元素的ID格式
    return `${this.direction}Lane${this.laneNumber}Straight`
  }

  // Static Method: 獲取距離配置
  static getDistanceConfig() {
    return {
      followingDistance: {
        motor: 15, // 縮短跟車距離
        small: 12, // 縮短跟車距離
        large: 20, // 縮短跟車距離
      },
      safeDistance: {
        motor: 10, // 縮短安全距離
        small: 8, // 縮短安全距離
        large: 15, // 縮短安全距離
      },
      stopLineBuffer: STOP_LINE_CONFIG.VEHICLE_CONFIG.STOP_LINE_BUFFER, // 使用配置的停止線緩衝距離
      speedConfig: speedConfig,
      timeMultiplier: this.timeMultiplier,
    }
  }

  // Static Method: 獲取指定方向和車道的路徑起始位置
  static getPathStartPosition(direction, laneNumber) {
    const pathId = `${direction}Lane${laneNumber}Straight`
    const pathElement = document.querySelector(`#${pathId}`)

    if (!pathElement) {
      console.warn(`⚠️ 找不到路徑元素: #${pathId}`)
      return null
    }

    try {
      // 獲取路徑的起始點（t=0的位置）
      const startPoint = pathElement.getPointAtLength(0)

      // 根據 SVG viewBox="0 0 1400 1000" 座標系統返回位置
      return {
        x: startPoint.x,
        y: startPoint.y,
      }
    } catch (error) {
      return null
    }
  }

  // Command Pattern + Observer Pattern: 使用 MotionPath 的移動命令（專注於往東路徑）
  moveAlongPath(trafficController, allVehicles = [], onVehicleOutOfBounds = null) {
    // Command Pattern: 將複雜的路徑移動邏輯封裝為可執行的命令
    return new Promise((resolve) => {
      // 獲取 SVG 路徑元素
      const pathElement = document.querySelector(`#${this.getSvgPathId()}`)
      if (!pathElement) {
        console.error(`❌ 找不到 SVG 路徑元素: #${this.getSvgPathId()}`)
        // 回退到舊的移動方式
        const endPosition = this.getDirectionEndPosition()
        this.moveToWithTrafficControl(endPosition.x, endPosition.y, 10, trafficController, allVehicles).then(resolve)
        return
      }

      // 記錄移動開始時間和初始化數據
      this.movementStartTime = new Date().toISOString()

      // 🌤️ 初始化速度時考慮天氣影響
      const weatherMultiplier = this.getWeatherSpeedMultiplier()
      const effectiveSpeed = Math.round(this.initialSpeed * weatherMultiplier)

      this.currentSpeed = effectiveSpeed
      this.maxSpeed = effectiveSpeed

      let lastPosition = this.getCurrentPosition()
      let lastTime = Date.now()

      // 計算動畫持續時間 - 🚨 根據實際路徑長度計算
      let animationDuration = this.calculateAnimationDuration()
      if (this.initialSpeed) {
        try {
          // 🚨 使用實際路徑長度計算動畫時間，並加入全局時間縮放
          const pathLength = pathElement.getTotalLength()
          const realDistance = (pathLength / 100) * 15 // 轉換為實際距離（米）
          const speedMs = (this.initialSpeed * 1000) / 3600 // 轉換為 m/s
          let theoreticalTime = realDistance / speedMs
          // 🎬 動畫速度控制：TIME_MULTIPLIER 越小越快，越大越慢
          theoreticalTime *= Vehicle.timeMultiplier

          // 🌤️ 天氣影響：根據天氣調整速度（降低速度 = 增加時間）
          const weatherMultiplier = this.getWeatherSpeedMultiplier()
          if (weatherMultiplier < 1.0) {
            // 速度降低時，時間需要增加（時間 = 1 / 速度）
            theoreticalTime /= weatherMultiplier
          }

          animationDuration = Math.max(1, Math.min(30, theoreticalTime)) // 擴大時間範圍
        } catch (error) {
          console.warn(`⚠️ 無法計算路徑長度，使用預設動畫時間:`, error)
          animationDuration = this.calculateAnimationDuration()
        }
      }

      // Strategy Pattern: 使用延遲策略避免剛生成就被碰撞檢測影響
      // 等待DOM更新完成
      Promise.resolve()
        .then(() => {
          // 確保元素已添加到DOM中
          if (!this.element || !this.element.parentNode) {
            console.warn(`⚠️ [${this.id}] 車輛元素尚未添加到DOM中，等待下一幀`)
            return new Promise((resolve) => requestAnimationFrame(resolve))
          }
        })
        .then(() => {
          // 🚨 修正：所有車輛（包括1號左轉車道）都應該先移動到停止線排隊
          // 燈號限制僅在停止線處檢查，而不是在起始位置就限制
          this.currentState = 'moving'
          this.waitingForGreen = false
          this.isAtStopLine = false
          this.hasPassedStopLine = false

          // Observer Pattern: 確保只有一個定期檢查定時器運行
          if (this.periodicCheckTimer) {
            clearInterval(this.periodicCheckTimer)
            this.periodicCheckTimer = null
          }

          this.periodicCheckTimer = setInterval(() => {
            // � 統一交通燈響應：使用 directTrafficLightResponse 處理所有燈號變化
            this.directTrafficLightResponse(trafficController)

            // 🚨 簡化：檢查是否可以恢復移動（僅限碰撞相關）
            if (
              this.currentState === 'waitingForVehicle' ||
              this.currentState === 'autoFollowing' ||
              this.currentState === 'rejoiningQueue' ||
              this.currentState === 'gapRecovery'
            ) {
              this.resumeMovement(allVehicles)
            }
          }, 50) // 統一使用50ms間隔，與後面的邏輯一致

          // 邊界檢測標記 - 避免重複觸發 (移到正確位置)
          let hasBeenRemovedFromCollision = false

          // Template Method Pattern: 創建 MotionPath 移動時間線
          this.movementTimeline = gsap.timeline({
            onStart: () => {
              // 🚨 開始移動時更新時間
              this.lastMovementTime = Date.now()
            },
            onUpdate: () => {
              // 🚨 防守：車輛已銷毀時，不執行更新邏輯（車輛可能已被移除，但GSAP動畫仍繼續執行）
              if (!this.element) {
                return
              }

              // 🚨 移動中持續更新時間
              this.lastMovementTime = Date.now()

              // 計算當前速度（與原方法相同的邏輯）
              const currentPos = this.getCurrentPosition()
              const currentTime = Date.now()
              const deltaTime = (currentTime - lastTime) / 1000

              if (deltaTime > 0) {
                const deltaDistance = Math.sqrt(
                  Math.pow(currentPos.x - lastPosition.x, 2) + Math.pow(currentPos.y - lastPosition.y, 2),
                )
                const pixelSpeed = deltaDistance / deltaTime
                const meterSpeed = (pixelSpeed / 100) * 15
                let kmhSpeed = meterSpeed * 3.6

                // 🌤️ 應用天氣影響到速度計算
                const weatherMultiplier = this.getWeatherSpeedMultiplier()
                kmhSpeed *= weatherMultiplier

                this.currentSpeed = Math.round(kmhSpeed)
                this.maxSpeed = Math.max(this.maxSpeed, this.currentSpeed)
                lastPosition = currentPos
                lastTime = currentTime
              }

              // 檢測佈局變化
              this.checkLayoutChange()

              // 檢查是否離開畫面邊界
              const isOutOfBounds = this.checkOutOfBounds(currentPos)
              if (isOutOfBounds && !hasBeenRemovedFromCollision && onVehicleOutOfBounds) {
                hasBeenRemovedFromCollision = true
                onVehicleOutOfBounds(this.id)
                // 修復：避免車輛突然消失，讓動畫自然完成
                return
              }

              // � 【優化】已通過停止線的車輛無需碰撞檢測和跟隨
              // 在綠燈通行時，車子只需保持勻速前進，跳過所有碰撞邏輯
              if (this.hasPassedStopLine) {
                // 車輛已通過停止線，恢復到正常速度並繼續前進
                if (this.movementTimeline) {
                  const currentTimeScale = this.movementTimeline.timeScale()
                  if (currentTimeScale < 1) {
                    gsap.to(this.movementTimeline, {
                      timeScale: 1,
                      duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.SMOOTH,
                      ease: 'power2.out',
                    })
                    this.currentState = 'throughIntersection'
                  }
                }
                return // 跳過所有碰撞檢測和跟隨邏輯
              }

              // �🚨 簡化碰撞檢測系統 - 區分第一台車和後續車輛
              const shouldStop = this.collisionController.checkSimpleCollision(allVehicles)
              const isFirstVehicle = this.collisionController.isClosestToStopLine(allVehicles)

              // 🚗 優先處理重新加入隊列動作（碰撞後的車輛需要融入隊伍）
              if (shouldStop && shouldStop.action === 'rejoin_queue') {
                gsap.to(this.movementTimeline, {
                  timeScale: shouldStop.targetSpeed,
                  duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
                  ease: 'power2.out',
                })
                this.currentState = 'rejoiningQueue' // 設為重新加入隊列狀態
                return
              }

              // � 優先處理緊急間距恢復（防止碰撞失效）
              if (
                shouldStop &&
                (shouldStop.action === 'gap_recovery' || shouldStop.action === 'emergency_gap_recovery')
              ) {
                // 🔧 極速下防穿透：立即強制暫停
                if (this.movementTimeline) {
                  this.movementTimeline.pause()
                  this.movementTimeline.timeScale(shouldStop.targetSpeed)
                  if (shouldStop.targetSpeed > 0) {
                    this.movementTimeline.play()
                  }
                }
                this.currentState = 'gapRecovery' // 設為間距恢復狀態
                return
              }

              // 🚨 安全優先：處理跟隨模式中的完全停止指令（targetSpeed=0）
              if (shouldStop && shouldStop.action === 'follow' && shouldStop.targetSpeed === 0) {
                if (this.movementTimeline) {
                  this.movementTimeline.pause()
                  this.movementTimeline.timeScale(0)
                }
                this.currentState = 'safetyStopped'
                return
              }

              // �🚗 優先處理自動跟隨模式
              if (shouldStop && shouldStop.autoFollowing && shouldStop.targetSpeed > 0) {
                gsap.to(this.movementTimeline, {
                  timeScale: shouldStop.targetSpeed,
                  duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
                  ease: 'power2.out',
                })
                this.currentState = 'autoFollowing' // 設為自動跟隨狀態
                return
              }

              if (shouldStop) {
                const distance = shouldStop.distance
                const requiredGap = shouldStop.requiredGap || 12
                // 🚨 綠燈跟車邏輯：如果是綠燈且前車正在移動，根據距離調整速度
                const currentLightState = trafficController.getCurrentLightState(this.direction)

                // 🚨 修正：1號車道在左轉綠燈時也應執行跟車邏輯
                const isValidLightForFollowing =
                  (this.laneNumber === 1 && (currentLightState === 'leftGreen' || currentLightState === 'green')) ||
                  (this.laneNumber !== 1 && currentLightState === 'green')

                if (
                  isValidLightForFollowing &&
                  !this.waitingForGreen &&
                  shouldStop.frontVehicleIsMoving &&
                  this.movementTimeline
                ) {
                  // 🚨 綠燈跟車：根據距離調整速度（使用配置）
                  const isLane1 = this.laneNumber === 1
                  const thresholds = FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.DISTANCE_THRESHOLDS
                  const speeds = isLane1
                    ? FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.LANE1
                    : FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.OTHER_LANES

                  let targetSpeed
                  if (distance <= requiredGap * thresholds.VERY_CLOSE) {
                    targetSpeed = speeds.VERY_CLOSE
                  } else if (distance <= requiredGap * thresholds.CLOSE) {
                    targetSpeed = speeds.CLOSE
                  } else if (distance <= requiredGap * thresholds.NORMAL) {
                    targetSpeed = speeds.NORMAL
                  } else {
                    targetSpeed = speeds.FAR
                  }

                  // 平滑調整速度
                  gsap.to(this.movementTimeline, {
                    timeScale: targetSpeed,
                    duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
                    ease: 'power2.out',
                  })
                  this.currentState = 'following'
                  return
                }

                // 🚨 特殊處理：如果是第一台車且前方車輛在停止線等待，則繼續前進到停止線
                if (
                  isFirstVehicle &&
                  shouldStop.frontVehicleAtStopLine &&
                  !shouldStop.frontVehicleIsMoving &&
                  !this.waitingForGreen &&
                  this.movementTimeline
                ) {
                  // 🚨 再次確認當前燈號狀態，防止在紅燈時啟動
                  const recheckLightState = trafficController.getCurrentLightState(this.direction)
                  if (recheckLightState === 'green' && !this.waitingForGreen) {
                    // 第一台車：前方車輛在停止線等待且不移動，繼續前進到停止線
                    const currentTimeScale = this.movementTimeline.timeScale()
                    if (currentTimeScale < 1) {
                      this.movementTimeline.timeScale(1)
                      this.currentState = 'moving'
                    }
                  }
                } else if (!shouldStop.frontVehicleIsMoving) {
                  // 前方車輛停止且不移動：停止跟車
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'stopped'
                  return
                }
              } else if (this.movementTimeline) {
                // 🚨 無碰撞風險時，平滑恢復到正常速度（而非立即設定為1）
                const currentTimeScale = this.movementTimeline.timeScale()
                if (currentTimeScale < 1) {
                  // 🚨 檢查當前燈號狀態，根據車道類型決定是否恢復移動
                  const currentLightState = trafficController.getCurrentLightState(this.direction)

                  // 🚦 判斷車輛是否可以通行
                  // 🚨 修正：1號車道在直行綠燈時也應執行碰撞檢測，只是不能通過停止線
                  const canProceed =
                    this.laneNumber === 1
                      ? currentLightState === 'leftGreen' || currentLightState === 'green' // 左轉車道在任何綠燈時都執行碰撞檢測
                      : currentLightState === 'green' // 直行車道需要直行綠燈

                  if (canProceed) {
                    // 平滑恢復到正常速度，避免突然加速
                    gsap.to(this.movementTimeline, {
                      timeScale: 1,
                      duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.SMOOTH, // 使用配置的平滑過渡時間
                      ease: 'power2.out',
                    })
                    this.currentState = 'moving'
                    const laneType = this.laneNumber === 1 ? '左轉' : '直行'
                    const lightType = this.laneNumber === 1 ? '左轉綠燈' : '直行綠燈'
                  } else {
                    const laneType = this.laneNumber === 1 ? '左轉' : '直行'
                  }
                }
              }

              // 簡化紅綠燈檢查 - 處理綠燈恢復和左轉等待
              if (!shouldStop) {
                const slowDownInfo = this.checkTrafficLightSlowDown(trafficController)
                if (slowDownInfo && slowDownInfo.action === 'resume_from_slow') {
                  this.currentState = 'moving'
                  if (this.originalTimeScale) {
                    gsap.to(this.movementTimeline, {
                      timeScale: this.originalTimeScale,
                      duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.INSTANT, // 使用配置的瞬間變化時間
                      ease: ANIMATION_CONFIG.EASING.NONE, // 使用配置的緩動效果
                    })
                    this.originalTimeScale = null
                  }
                } else if (slowDownInfo && slowDownInfo.action === 'stop_for_left_turn_wait') {
                  // 🚦 左轉車道在直行綠燈時必須停止
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'waitingForLeftTurnGreen'
                  this.waitingForGreen = true
                } else if (slowDownInfo && slowDownInfo.action === 'stop_for_straight_wait') {
                  // 🚦 直行車道在左轉綠燈時必須停止
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'waitingForStraightGreen'
                  this.waitingForGreen = true
                }
              }

              // 等待前車的恢復檢查
              if (
                this.currentState === 'waitingForVehicle' ||
                this.currentState === 'autoFollowing' ||
                this.currentState === 'rejoiningQueue' ||
                this.currentState === 'gapRecovery'
              ) {
                this.resumeMovement(allVehicles)
              }

              // 停止線檢查和紅綠燈控制流程
              if (!this.hasPassedStopLine && this.checkStopLine() && !this.waitingForGreen && !this.isAtStopLine) {
                this.isAtStopLine = true
                const lightState = trafficController.getCurrentLightState(this.direction)

                // 🚨 修正：決定是否在停止線等待
                // - 非1號車道：在 red/yellow/allRed/非綠燈 時停止；綠燈時放行
                // - 1號車道（左轉）：在 red/yellow/allRed/直行綠燈 時停止；左轉綠燈時放行
                const shouldStop =
                  lightState === 'red' ||
                  lightState === 'yellow' ||
                  lightState === 'allRed' ||
                  (this.laneNumber === 1 && lightState === 'green') // ✅ 只在"直行綠燈"時停止，"左轉綠燈"時放行

                if (shouldStop) {
                  if (this.currentState === 'slowing_for_light' || this.currentState === 'slowing_for_red') {
                    gsap.to(this.movementTimeline, {
                      timeScale: 0,
                      duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.INSTANT, // 幾乎立即停車，消除停止線緩速
                      ease: ANIMATION_CONFIG.EASING.NONE,
                      onComplete: () => {
                        this.stopMovement()
                        this.waitingForGreen = true
                        // 設置1號車道的等待狀態
                        if (this.laneNumber === 1 && lightState === 'green') {
                          this.currentState = 'waitingForLeftTurnGreen'
                        }
                      },
                    })
                  } else {
                    this.stopMovement()
                    this.waitingForGreen = true
                    // 設置1號車道的等待狀態
                    if (this.laneNumber === 1 && lightState === 'green') {
                      this.currentState = 'waitingForLeftTurnGreen'
                    }
                  }
                } else {
                  // 🚨 修正：檢查1號車道是否為左轉綠燈
                  const canProceed =
                    (this.laneNumber !== 1 && lightState === 'green') || // 非1號車道的綠燈
                    (this.laneNumber === 1 && lightState === 'leftGreen') // 1號車道的左轉綠燈

                  if (canProceed) {
                    // 可以通過停止線
                    this.isAtStopLine = false
                    this.hasPassedStopLine = true
                  } else {
                    // 不能通過，需要等待
                    this.stopMovement()
                    this.waitingForGreen = true
                    if (this.laneNumber === 1) {
                      this.currentState = 'waitingForLeftTurnGreen'
                    }
                  }
                }
              }
            },
            onComplete: () => {
              // 清理定期檢查定時器
              if (this.periodicCheckTimer) {
                clearInterval(this.periodicCheckTimer)
                this.periodicCheckTimer = null
              }

              this.currentState = 'completed'

              // 🚨 立即移除機制：動畫完成時立刻從碰撞檢測中移除
              if (!hasBeenRemovedFromCollision && onVehicleOutOfBounds) {
                hasBeenRemovedFromCollision = true
                onVehicleOutOfBounds(this.id)
              }

              this.remove() // 🚨 動畫完成強制移除 DOM
              resolve()
            },
          })

          // 🚨 車輛已在 IndexPage.vue 中使用 getPathStartPosition() 創建在正確位置
          // 移除多餘的位置設置，避免視覺跳躍

          // 🚨 如果有初始 progress，先使用 gsap.set() 將元素設置到該路徑位置
          if (this.progress && this.progress !== 0) {
            const pathId = this.getSvgPathId()
            const pathElement = document.getElementById(pathId)
            if (pathElement && pathElement.getTotalLength) {
              const pathLength = pathElement.getTotalLength()
              // 計算路徑上的絕對位置（支援負 progress，但不會真的在路徑外）
              const pathDistance = Math.max(0, this.progress * pathLength)
              const point = pathElement.getPointAtLength(pathDistance)
              if (point) {
                gsap.set(this.element, {
                  x: point.x,
                  y: point.y,
                })
                console.log(
                  `🚗 [${this.id}] 設置初始位置: progress=${this.progress.toFixed(3)} → (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`,
                )
              }
            }
          }

          this.movementTimeline.to(this.element, {
            duration: animationDuration,
            motionPath: {
              path: `#${this.getSvgPathId()}`, // 使用選擇器字串
              align: `#${this.getSvgPathId()}`, // 重要：對齊到路徑
              alignOrigin: [0.5, 0.5], // 車輛中心對齊
              autoRotate: true, // 啟用自動旋轉，車輛會跟隨路徑方向
            },
            ease: 'none',
            // 🚨 使用 gsap.set() 預先定位，而不使用 progress 物件
          })

          // 🚨 移除：不再在初始化時暫停車輛
          // 所有車輛（包括1號左轉車道）都應該立即開始移動到停止線排隊
          // 燈號限制僅在到達停止線時才檢查
        }, 100) // 延遲100毫秒開始移動
    })
  }

  // Command Pattern + Observer Pattern: 帶有交通燈控制的移動命令
  moveToWithTrafficControl(targetX, targetY, duration, trafficController, allVehicles = []) {
    // Command Pattern: 將複雜的移動邏輯封裝為可執行的命令
    return new Promise((resolve) => {
      // 記錄移動開始時間和初始化數據
      this.movementStartTime = new Date().toISOString()

      // 🌤️ 初始化速度時考慮天氣影響
      const weatherMultiplier = this.getWeatherSpeedMultiplier()
      const effectiveSpeed = Math.round(this.initialSpeed * weatherMultiplier)

      this.currentSpeed = effectiveSpeed
      this.maxSpeed = effectiveSpeed

      // 計算總距離 - 根據車輛方向確保正交移動
      const startPos = this.getCurrentPosition()

      // 根據車輛方向調整目標位置，確保只能90度或180度移動
      let finalTargetX, finalTargetY
      if (this.direction === 'east' || this.direction === 'west') {
        finalTargetX = targetX
        finalTargetY = startPos.y
      } else if (this.direction === 'north' || this.direction === 'south') {
        finalTargetX = startPos.x
        finalTargetY = targetY
      } else {
        finalTargetX = targetX
        finalTargetY = targetY
      }

      this.totalDistance = Math.sqrt(Math.pow(finalTargetX - startPos.x, 2) + Math.pow(finalTargetY - startPos.y, 2))

      let lastPosition = startPos
      let lastTime = Date.now()

      // 動畫 duration 根據 speed 動態計算
      let animationDuration = duration
      // speed 單位 km/h，換算公式：
      // 假設 100px = 15m，則 totalDistance px = totalDistance/100*15 m
      // speed km/h = speed*1000/3600 m/s
      // 動畫時間 = 距離(米) / 速度(米/秒)
      if (this.initialSpeed && this.totalDistance > 0) {
        const realDistance = (this.totalDistance / 100) * 15
        const speedMs = (this.initialSpeed * 1000) / 3600
        let theoreticalTime = realDistance / speedMs
        // 🎬 動畫速度控制：TIME_MULTIPLIER 越小越快，越大越慢
        theoreticalTime *= Vehicle.timeMultiplier
        // 擴大合理範圍以支援更大的速度變化
        animationDuration = Math.max(1, Math.min(30, theoreticalTime))
      }

      // Strategy Pattern: 使用延遲策略避免剛生成就被碰撞檢測影響
      setTimeout(() => {
        this.currentState = 'moving'
        this.targetX = finalTargetX
        this.targetY = finalTargetY

        // 🚨 修復：車輛開始移動時不應該因紅燈立即停止
        // 應該讓車輛前進到停止線，再由停止線檢查邏輯決定是否停車
        this.waitingForGreen = false
        this.isAtStopLine = false
        this.hasPassedStopLine = false

        // Observer Pattern: 確保只有一個定期檢查定時器運行
        if (this.periodicCheckTimer) {
          clearInterval(this.periodicCheckTimer)
          this.periodicCheckTimer = null
        }

        this.periodicCheckTimer = setInterval(() => {
          // 🚨 統一交通燈響應：使用 directTrafficLightResponse 處理所有燈號變化
          this.directTrafficLightResponse(trafficController)
        }, 50) // 改為每0.05秒檢查一次，更快速回應        // Template Method Pattern: 創建移動時間線模板
        this.movementTimeline = gsap.timeline({
          onUpdate: () => {
            // 🚨 防守：車輛已銷毀時，不執行更新邏輯（車輛可能已被移除，但GSAP動畫仍繼續執行）
            if (!this.element) {
              return
            }

            // 計算當前速度
            const currentPos = this.getCurrentPosition()
            const currentTime = Date.now()
            const deltaTime = (currentTime - lastTime) / 1000 // 轉換為秒

            if (deltaTime > 0) {
              const deltaDistance = Math.sqrt(
                Math.pow(currentPos.x - lastPosition.x, 2) + Math.pow(currentPos.y - lastPosition.y, 2),
              )

              // 計算像素/秒速度，然後轉換為 km/h (假設100像素 = 15米)
              const pixelSpeed = deltaDistance / deltaTime
              const meterSpeed = (pixelSpeed / 100) * 15 // 轉換為 m/s
              let kmhSpeed = meterSpeed * 3.6 // 轉換為 km/h

              // 🌤️ 應用天氣影響到速度計算
              const weatherMultiplier = this.getWeatherSpeedMultiplier()
              kmhSpeed *= weatherMultiplier

              this.currentSpeed = Math.round(kmhSpeed)
              this.maxSpeed = Math.max(this.maxSpeed, this.currentSpeed)

              lastPosition = currentPos
              lastTime = currentTime
            }

            // Observer Pattern: 檢測佈局變化（抽屜開關等）
            this.checkLayoutChange()

            // Strategy Pattern: 檢查車輛是否已離開畫面邊界
            const isOutOfBounds = this.checkOutOfBounds(currentPos)
            if (isOutOfBounds) {
              // this.movementTimeline.progress(1) // 強制完成動畫
              return
            }

            // 檢查是否接近終點 - 提前標記為完成狀態
            const distanceToTarget = Math.sqrt(
              Math.pow(currentPos.x - this.targetX, 2) + Math.pow(currentPos.y - this.targetY, 2),
            )

            // 如果距離終點很近，標記為即將完成
            if (distanceToTarget < 20 && this.currentState !== 'nearComplete') {
              this.currentState = 'nearComplete'
            }

            // 僅東西向車輛才會因極接近終點強制結束，南北向讓動畫自然結束
            if ((this.direction === 'east' || this.direction === 'west') && distanceToTarget < 10) {
              this.movementTimeline.progress(1) // 強制完成動畫
              return
            }

            // 🚨 統一間距碰撞檢測：檢查12px統一間距
            const collision = this.collisionController.checkSimpleCollision(allVehicles)

            if (collision && collision.shouldStop) {
              const distance = collision.distance
              const requiredGap = collision.requiredGap || DISTANCE_CONFIG.MIN_GAP

              // 🚨 基於距離的漸進式停車（使用配置）
              const thresholds = FOLLOWING_CONFIG.RESUME_SPEED.DISTANCE_THRESHOLDS
              const speeds = FOLLOWING_CONFIG.RESUME_SPEED.NON_QUEUE_ZONE

              let targetSpeed
              if (distance <= requiredGap * thresholds.VERY_CLOSE) {
                targetSpeed = speeds.VERY_CLOSE // 完全停止
              } else if (distance <= requiredGap * thresholds.CLOSE) {
                targetSpeed = speeds.CLOSE // 大幅減速
              } else if (distance <= requiredGap * thresholds.NORMAL) {
                targetSpeed = speeds.NORMAL // 適度減速
              } else {
                targetSpeed = speeds.FAR // 輕微減速
              }

              gsap.to(this.movementTimeline, {
                timeScale: targetSpeed,
                duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
                ease: 'power2.out',
              })

              this.currentState = targetSpeed === 0 ? 'waitingForVehicle' : 'slowing'
              return
            }

            // 處理簡化的紅綠燈邏輯
            const slowDownInfo = this.checkTrafficLightSlowDown(trafficController)
            if (slowDownInfo) {
              if (slowDownInfo.action === 'resume_from_slow') {
                this.currentState = 'moving'
                if (this.originalTimeScale) {
                  gsap.to(this.movementTimeline, {
                    timeScale: this.originalTimeScale,
                    duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.INSTANT, // 幾乎立即恢復正常速度
                    ease: ANIMATION_CONFIG.EASING.NONE,
                  })
                  this.originalTimeScale = null
                }
              } else if (slowDownInfo.action === 'stop_for_left_turn_wait') {
                // 🚦 修復：左轉車道只有在停止線附近才停止等待左轉綠燈
                const distanceToStopLine = this.getDistanceToStopLine()

                if (
                  distanceToStopLine !== null &&
                  Math.abs(distanceToStopLine) <= STOP_LINE_CONFIG.TRAFFIC_LIGHT.APPROACH_DISTANCE
                ) {
                  // 接近停止線，停車等待左轉綠燈（使用配置）
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'waitingForLeftTurnGreen'
                  this.waitingForGreen = true
                } else {
                  // 距離停止線還遠，減速但不停車（使用配置）
                  gsap.to(this.movementTimeline, {
                    timeScale: TRAFFIC_LIGHT_CONFIG.WAITING_FOR_LIGHT.SLOW_SPEED,
                    duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
                    ease: 'power2.out',
                  })
                  this.currentState = 'slowing_for_left_turn_queue'
                }
              } else if (slowDownInfo.action === 'stop_for_straight_wait') {
                // 🚦 新增：直行車道在左轉綠燈時的處理
                const distanceToStopLine = this.getDistanceToStopLine()

                if (
                  distanceToStopLine !== null &&
                  Math.abs(distanceToStopLine) <= TRAFFIC_LIGHT_CONFIG.WAITING_FOR_LIGHT.STOP_DISTANCE_THRESHOLD
                ) {
                  // 接近停止線，停車等待直行綠燈（使用配置）
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'waitingForStraightGreen'
                  this.waitingForGreen = true
                } else {
                  // 距離停止線還遠，減速但不停車（使用配置）
                  gsap.to(this.movementTimeline, {
                    timeScale: TRAFFIC_LIGHT_CONFIG.WAITING_FOR_LIGHT.SLOW_SPEED,
                    duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
                    ease: 'power2.out',
                  })
                  this.currentState = 'slowing_for_straight_queue'
                }
              }
            }

            // 如果當前狀態是等待前車，檢查是否可以恢復移動
            if (
              this.currentState === 'waitingForVehicle' ||
              this.currentState === 'rejoiningQueue' ||
              this.currentState === 'gapRecovery'
            ) {
              // 如果前方車輛已離開安全距離，恢復移動
              this.resumeMovement(allVehicles)
            }

            // Template Method Pattern: 停止線檢查和紅綠燈控制流程
            if (!this.hasPassedStopLine && this.checkStopLine() && !this.waitingForGreen && !this.isAtStopLine) {
              this.isAtStopLine = true

              // 檢查紅綠燈狀態
              const lightState = trafficController.getCurrentLightState(this.direction)

              // 🚦 左轉車道特殊邏輯：在直行綠燈時也要停止
              const shouldStopAtLine =
                lightState === 'red' ||
                lightState === 'allRed' ||
                lightState === 'yellow' ||
                (this.laneNumber === 1 && lightState === 'green') // 左轉車道在直行綠燈時停止

              if (shouldStopAtLine) {
                // 如果正在減速，讓它平滑停止
                if (this.currentState === 'slowing_for_light' || this.currentState === 'slowing_for_red') {
                  gsap.to(this.movementTimeline, {
                    timeScale: 0,
                    duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.INSTANT, // 幾乎立即停車，消除停止線緩速
                    ease: ANIMATION_CONFIG.EASING.NONE,
                    onComplete: () => {
                      this.stopMovement()
                      this.waitingForGreen = true
                    },
                  })
                } else {
                  this.stopMovement()
                  this.waitingForGreen = true
                }

                // 🚨 移除重複的觀察者邏輯，讓 directTrafficLightResponse 處理狀態變化

                //  移除超時機制：讓車輛完全依賴 directTrafficLightResponse 和燈號狀態
              } else {
                // 🚨 修正：檢查是否真的可以通過停止線
                const canProceed =
                  (this.laneNumber !== 1 && lightState === 'green') || // 非1號車道的綠燈
                  (this.laneNumber === 1 && lightState === 'leftGreen') // 1號車道需要左轉綠燈

                if (canProceed) {
                  // 可以通過停止線
                  this.isAtStopLine = false
                  this.hasPassedStopLine = true
                } else {
                  // 應該停止等待（這種情況理論上不應該出現，因為上面的 shouldStopAtLine 應該已經處理了）
                  this.stopMovement()
                  this.waitingForGreen = true
                  if (this.laneNumber === 1) {
                    this.currentState = 'waitingForLeftTurnGreen'
                  }
                }
              }
            }
          },
          onComplete: () => {
            // Template Method Pattern: 完成時的清理模板
            // 清理定期檢查定時器
            if (this.periodicCheckTimer) {
              clearInterval(this.periodicCheckTimer)
              this.periodicCheckTimer = null
            }

            // 強制完成 - 避免精度問題導致Promise不resolve
            this.currentState = 'completed'
            resolve()
          },
        })

        // Command Pattern: 添加移動動畫命令 - 確保車輛只能沿正交方向移動

        // 根據車輛方向決定移動路徑，確保只能90度或180度直線移動
        if (this.direction === 'east' || this.direction === 'west') {
          this.movementTimeline.to(this.element, {
            x: finalTargetX,
            y: finalTargetY,
            duration: animationDuration,
            ease: 'none',
          })
        } else if (this.direction === 'north' || this.direction === 'south') {
          this.movementTimeline.to(this.element, {
            x: finalTargetX,
            y: finalTargetY,
            duration: animationDuration,
            ease: 'none',
          })
        } else {
          this.movementTimeline.to(this.element, {
            x: finalTargetX,
            y: finalTargetY,
            duration: animationDuration,
            ease: 'none',
          })
        }
      }, 100) // 延遲100毫秒開始移動，讓車輛有時間初始化
    })
  }

  // 🚗 新增：檢查車輛是否已超出容器邊界
  isVehicleExited() {
    if (!this.element) {
      return false
    }

    const currentPos = this.getCurrentPosition()
    const containerWidth = window.innerWidth || document.body.clientWidth
    const containerHeight = window.innerHeight || document.body.clientHeight
    const margin = VEHICLE_EXIT_CONFIG.BOUNDARY_MARGIN

    // 檢查車輛是否超出邊界
    const exitedLeft = currentPos.x < -margin
    const exitedRight = currentPos.x > containerWidth + margin
    const exitedTop = currentPos.y < -margin
    const exitedBottom = currentPos.y > containerHeight + margin

    return exitedLeft || exitedRight || exitedTop || exitedBottom
  }

  // 🔄 新增：回收車輛（改進 7 - 循環流量機制）
  // 將超出邊界的車輛回收到相反方向的起點
  recycleVehicle() {
    // 防止重複回收
    if (this.isBeingRecycled) {
      return false
    }

    // 檢查是否啟用循環機制
    if (!VEHICLE_RECYCLING_CONFIG.ENABLED) {
      return false
    }

    // 檢查回收次數限制
    const maxRecycles = VEHICLE_RECYCLING_CONFIG.MAX_RECYCLES_PER_VEHICLE
    if (maxRecycles !== null && this.recycleCount >= maxRecycles) {
      console.log(`🚨 [${this.id}] 回收次數已達上限 (${this.recycleCount}/${maxRecycles})，進行正常移除`)
      return false
    }

    // 檢查冷卻時間
    const now = Date.now()
    if (now - this.lastRecycleTime < VEHICLE_RECYCLING_CONFIG.RECYCLE_COOLDOWN) {
      return false
    }

    // 標記正在回收
    this.isBeingRecycled = true

    // 暫停現有動畫
    if (this.movementTimeline) {
      this.movementTimeline.pause()
    }

    // 計算回收位置
    const containerWidth = window.innerWidth || document.body.clientWidth
    const containerHeight = window.innerHeight || document.body.clientHeight

    let newX = this.startPosition.x
    let newY = this.startPosition.y

    // 根據方向計算回收位置
    switch (this.direction) {
      case 'east':
        // 東向車輛回收到西邊
        newX = -50
        newY = this.startPosition.y
        break
      case 'west':
        // 西向車輛回收到東邊
        newX = containerWidth + 50
        newY = this.startPosition.y
        break
      case 'north':
        // 北向車輛回收到南邊
        newX = this.startPosition.x
        newY = containerHeight + 50
        break
      case 'south':
        // 南向車輛回收到北邊
        newX = this.startPosition.x
        newY = -50
        break
    }

    // 重置車輛狀態
    const resetConfig = VEHICLE_RECYCLING_CONFIG.RESET_ON_RECYCLE
    if (resetConfig.resetTravelData) {
      this.totalDistance = 0
      this.movementStartTime = null
    }
    if (resetConfig.resetSpeedData) {
      this.currentSpeed = 0
      this.maxSpeed = 0
    }

    // 重置動畫
    if (this.movementTimeline) {
      this.movementTimeline.kill()
      this.movementTimeline = null
    }

    // 移動到回收位置
    gsap.set(this.element, {
      x: newX,
      y: newY,
    })

    // 重置狀態
    this.currentState = resetConfig.currentState
    this.isAtStopLine = false
    this.waitingForGreen = false
    this.hasPassedStopLine = false

    // 更新回收計數和時間
    this.recycleCount += 1
    this.lastRecycleTime = now

    // 標記回收完成
    this.isBeingRecycled = false

    // 通知回收事件（用於統計）
    if (window.trafficController && window.trafficController.onVehicleRecycled) {
      window.trafficController.onVehicleRecycled({
        vehicleId: this.id,
        direction: this.direction,
        recycleCount: this.recycleCount,
        timestamp: now,
      })
    }

    return true
  }

  // 🛣️ 新增：檢查是否可以變道（改進 8）
  canChangeLane(allVehicles = []) {
    // 檢查 1: 車道變換啟用？
    if (!LANE_CHANGING_CONFIG.ENABLED) {
      return false
    }

    // 檢查 2: 是否已在變道中？
    if (this.isChangingLane) {
      return false
    }

    // 檢查 3: 冷卻時間是否已過？
    const now = Date.now()
    if (now - this.lastLaneChangeTime < LANE_CHANGING_CONFIG.LANE_CHANGE_COOLDOWN) {
      return false
    }

    // 檢查 4: 速度是否足夠？
    if (this.currentSpeed < LANE_CHANGING_CONFIG.MIN_SPEED_FOR_CHANGE) {
      return false
    }

    // 檢查 5: 是否超過最大變道次數？
    const maxChanges = LANE_CHANGING_CONFIG.MAX_LANE_CHANGES_PER_VEHICLE
    if (maxChanges !== null && this.laneChangeCount >= maxChanges) {
      return false
    }

    // 檢查 6: 目標車道是否有效且可用？
    const directionRules = LANE_CHANGING_CONFIG.DIRECTION_RULES[this.direction]
    if (!directionRules) {
      return false // 方向不支援
    }

    return true
  }

  // 🛣️ 新增：變道邏輯（改進 8）
  // 決定是否應該變道以及變到哪個車道
  decideLaneChange(allVehicles = []) {
    if (!this.canChangeLane(allVehicles)) {
      return null // 無法變道
    }

    const directionRules = LANE_CHANGING_CONFIG.DIRECTION_RULES[this.direction]
    const minLane = directionRules.MIN_LANE
    const maxLane = directionRules.MAX_LANE
    const preferredLanes = directionRules.PREFERRED_LANES || []

    // 計算前方距離
    const frontVehicleInfo = this.collisionController?.checkSimpleCollision(allVehicles)
    if (!frontVehicleInfo || !frontVehicleInfo.distance || frontVehicleInfo.distance > 150) {
      return null // 前方距離足夠，無需變道
    }

    // 尋找最佳的目標車道
    let bestLane = null
    let bestScore = -Infinity

    for (let lane = minLane; lane <= maxLane; lane++) {
      if (lane === this.laneNumber) {
        continue // 跳過當前車道
      }

      // 計算該車道的評分
      const laneVehicles = allVehicles.filter((v) => v.laneNumber === lane && v.direction === this.direction)
      const laneScore = this.calculateLaneScore(lane, laneVehicles, preferredLanes)

      if (laneScore > bestScore) {
        bestScore = laneScore
        bestLane = lane
      }
    }

    return bestLane
  }

  // 🛣️ 新增：計算車道評分
  calculateLaneScore(lane, vehiclesInLane, preferredLanes) {
    let score = 0

    // 優先車道得分加成
    if (preferredLanes.includes(lane)) {
      score += 10
    }

    // 車道流量越少越好
    const vehicleCount = vehiclesInLane.length
    score -= vehicleCount * 5

    // 計算該車道的平均速度
    const avgSpeed =
      vehiclesInLane.length > 0
        ? vehiclesInLane.reduce((sum, v) => sum + (v.currentSpeed || 0), 0) / vehiclesInLane.length
        : 60

    // 速度越快越好
    score += avgSpeed * 0.1

    return score
  }

  // 🛣️ 新增：執行變道（改進 8）
  changeLane(targetLane) {
    // 防止重複變道
    if (this.isChangingLane) {
      return false
    }

    // 驗證目標車道
    const directionRules = LANE_CHANGING_CONFIG.DIRECTION_RULES[this.direction]
    if (!directionRules || targetLane < directionRules.MIN_LANE || targetLane > directionRules.MAX_LANE) {
      return false
    }

    // 標記正在變道
    this.isChangingLane = true

    // 記錄變道開始時間
    const changeStartTime = Date.now()

    // 記錄原始車道
    const originalLane = this.laneNumber
    this.originalLaneNumber = originalLane

    // 更新目標車道
    this.laneNumber = targetLane
    this.targetLaneNumber = targetLane
    this.lastLaneChangeTime = changeStartTime

    // 計算車道寬度（用於位置調整）
    const laneWidth = 60 // 假設每個車道寬度約 60px
    const laneDifference = targetLane - originalLane
    const yOffset = laneDifference * laneWidth

    // 執行平滑變道動畫
    if (this.movementTimeline) {
      gsap.to(this.element, {
        y: `+=${yOffset}`,
        duration: LANE_CHANGING_CONFIG.LANE_CHANGE_DURATION,
        ease: 'power2.inOut',
        onComplete: () => {
          // 變道完成
          this.isChangingLane = false
          this.laneChangeCount += 1

          // 記錄變道事件
          if (LANE_CHANGING_CONFIG.ENABLE_LANE_CHANGE_LOGGING) {
            console.log(`🛣️ [${this.id}] 成功變道: ${originalLane} → ${targetLane} (第 ${this.laneChangeCount} 次變道)`)
          }

          // 通知控制器
          if (window.trafficController && window.trafficController.onLaneChanged) {
            window.trafficController.onLaneChanged({
              vehicleId: this.id,
              fromLane: originalLane,
              toLane: targetLane,
              laneChangeCount: this.laneChangeCount,
              timestamp: Date.now(),
            })
          }
        },
      })
    }

    return true
  }

  // Template Method Pattern: 移除車輛的清理模板方法
  remove() {
    // 🔴【防重複】確保 remove() 只執行一次
    if (this.isRemoved) {
      return
    }
    this.isRemoved = true

    // 記錄移除時間
    this.movementEndTime = new Date().toISOString()

    // 計算行駛數據
    this.travelTime = this.movementStartTime
      ? (new Date(this.movementEndTime) - new Date(this.movementStartTime)) / 1000
      : 0

    // 通知數據收集器車輛已移除
    this.notifyDataCollector('removed', {
      finalSpeed: this.currentSpeed,
      maxSpeed: this.maxSpeed,
      totalDistance: this.totalDistance,
      travelTime: this.travelTime,
      startPosition: this.startPosition,
      finalPosition: this.getCurrentPosition(),
      recycleCount: this.recycleCount,
      laneChangeCount: this.laneChangeCount,
    })

    // Template Method Pattern: 定義車輛移除的標準清理流程

    // 🚨【關鍵】完全殺死所有 GSAP 動畫 - 防止僵屍動畫繼續計算
    try {
      // 殺死針對此對象的所有動畫
      gsap.killTweensOf(this)
      gsap.killTweensOf(this.element)

      // 如果有其他關鍵屬性存儲了動畫，也要殺死
      if (this.displayObject) {
        gsap.killTweensOf(this.displayObject)
      }
      if (this.path) {
        gsap.killTweensOf(this.path)
      }
    } catch (e) {
      console.warn(`⚠️ GSAP 清理異常: ${e.message}`)
    }

    // 清理定時器
    if (this.periodicCheckTimer) {
      clearInterval(this.periodicCheckTimer)
      this.periodicCheckTimer = null
    }

    // 🚨 清理防停滯計時器
    if (this.stuckCheckTimer) {
      clearInterval(this.stuckCheckTimer)
      this.stuckCheckTimer = null
    }

    // 清理時間線
    if (this.movementTimeline) {
      this.movementTimeline.kill()
      this.movementTimeline = null
    }

    // 清理車道標籤
    if (this.laneLabel) {
      LaneLabelUtils.removeLaneLabel(this.laneLabel)
      this.laneLabel = null
    }

    // 🚀 清理停止線控制器
    if (this.stopLineController) {
      this.stopLineController.dispose()
      this.stopLineController = null
    }

    // 🚀 清理碰撞控制器（整合 SimpleCollisionDetector 功能）
    if (this.collisionController) {
      this.collisionController.dispose()
      this.collisionController = null
    }

    // 🌤️ 【新增】移除天氣改變事件監聽器
    if (this.weatherChangeHandler) {
      window.removeEventListener('weatherChanged', this.weatherChangeHandler)
      this.weatherChangeHandler = null
    }

    // 🚦 【新增】移除燈號變化事件監聽器
    if (this.lightStateChangeHandler) {
      window.removeEventListener('lightStateChanged', this.lightStateChangeHandler)
      this.lightStateChangeHandler = null
    }

    // 移除DOM元素
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    // 🚨 強制釋放 DOM 參考，防止殘留
    this.element = null
    this.laneLabel = null
  }

  // 🚨 新增：綠燈跟車檢查
  // 🚨 新增：簡化直接燈號響應邏輯
  directTrafficLightResponse(trafficController) {
    if (!this.direction || !trafficController || !this.movementTimeline) return

    // 🚀 DRY 優化：委託給交通燈響應工具類
    TrafficLightDirectResponseUtils.handleDirectResponse(this, trafficController)
  }
}
