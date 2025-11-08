/**
 * Vehicle.js - 車輛實體類別
 */
/* eslint-disable */
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { speedConfig } from './config/trafficConfig.js' // 引入統一的速度設定
import { StopLineController } from './vehicle_utils/StopLineController.js' // 🚀 新增：停止線控制器
import { CollisionController } from './vehicle_utils/CollisionController.js' // 🚀 新增：碰撞控制器（整合 SimpleCollisionDetector）
import {
  ANIMATION_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  VEHICLE_EXIT_CONFIG,
  VEHICLE_RECYCLING_CONFIG,
  LANE_CHANGING_CONFIG,
  YELLOW_LIGHT_DECISION_CONFIG,
  TURN_SPEED_CONFIG,
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

  constructor(x, y, direction = 'east', vehicleType = 'large', laneNumber = 1, simulationStore = null) {
    // ✅ Phase 6：保存 simulationStore 參數
    this.simulationStore = simulationStore
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

    // 🔧 新增：死鎖恢復機制追蹤
    this.gapRecoveryStartTime = null // gapRecovery 開始時間
    this.gapRecoveryMaxDuration = 5000 // gapRecovery 最大持續時間（毫秒）
    this.lastGapDistance = Infinity // 上次的間距
    this.gapRecoveryNoProgressCount = 0 // 沒有進展的計數器
    this.gapRecoveryCheckInterval = 100 // 恢復進度檢查間隔（毫秒）
    this.lastGapRecoveryCheck = 0 // 上次恢復進度檢查時間

    // 🎯 新增：停止原因三態區分
    // 區分排隊停止、碰撞停止、跟隨停止
    this.stopReason = null // 停止原因：'queue', 'collision', 'following', null
    this.stopReasonChangedTime = 0 // 停止原因改變的時間
    this.isInQueue = false // 是否在排隊中
    this.isInCollision = false // 是否在碰撞恢復中
    this.queueFrontVehicle = null // 排隊的前車
    this.collisionFrontVehicle = null // 碰撞的前車

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

    // 🚀 第3階段優化：黃燈決策降頻和緩存
    this.lastYellowDecisionTime = 0 // 上次黃燈決策的時間
    this.yellowDecisionCacheInterval = 50 // 黃燈決策檢查間隔（毫秒，20 Hz）
    this.cachedYellowDecision = null // 緩存的黃燈決策結果

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

    // ✅ Phase 4：新增完成標誌（用於 IndexPage RAF 迴圈識別已完成的車輛）
    this.isCompleted = false

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
    // ❌ 移除：this.setupAntiStuckMechanism() （改由 IndexPage mainSimulationLoop 每 5 秒驅動）

    // 🚀 新增：停止線控制器
    this.stopLineController = new StopLineController(this)

    // 🚀 新增：碰撞控制器（整合 SimpleCollisionDetector 功能）
    this.collisionController = CollisionController.createForLane(this, laneNumber, this.simulationStore)

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
    // ❌ 移除：setInterval（改由 IndexPage mainSimulationLoop 每 5 秒驅動 checkAndResolveStuckState()）
    // 此方法現在由 RAF 直接調用，無需設置自己的定時器
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

  //  新增：死鎖恢復進度檢查
  /**
   * 檢查並推進 gapRecovery 狀態的進度
   * 監控：
   * 1. 間距是否已恢復到安全值 → 轉換回 autoFollowing
   * 2. 恢復是否超時 → 轉換回 autoFollowing（強制恢復）
   * 3. 恢復進度是否停滯 → 計數增加
   * @param {Array} allVehicles - 所有車輛陣列
   */
  checkAndProgressGapRecovery(allVehicles) {
    if (!this.collisionController || this.currentState !== 'gapRecovery') {
      return
    }

    const now = Date.now()

    // 初始化恢復開始時間
    if (this.gapRecoveryStartTime === null) {
      this.gapRecoveryStartTime = now
      this.lastGapDistance = Infinity
      this.gapRecoveryNoProgressCount = 0
      return
    }

    // 檢查超時（最多5秒）
    const elapsedTime = now - this.gapRecoveryStartTime
    if (elapsedTime > this.gapRecoveryMaxDuration) {
      console.log(
        `⏱️ [${this.id}] gapRecovery 超時（${elapsedTime}ms > ${this.gapRecoveryMaxDuration}ms），強制轉換回 autoFollowing`,
      )
      this._transitionFromGapRecoveryToAutoFollowing('timeout')
      return
    }

    // 定期檢查恢復進度
    if (now - this.lastGapRecoveryCheck < this.gapRecoveryCheckInterval) {
      return
    }

    this.lastGapRecoveryCheck = now

    // 獲取當前碰撞狀態以檢查間距
    const collision = this.collisionController.checkSimpleCollision(allVehicles)

    if (!collision) {
      // 無碰撞 = 恢復成功
      console.log(`✅ [${this.id}] gapRecovery 完成（無碰撞），轉換回 autoFollowing`)
      this._transitionFromGapRecoveryToAutoFollowing('success')
      return
    }

    // 間距恢復檢查
    const currentDistance = collision.distance || 0
    const SAFE_GAP = FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION.MIN_FOLLOW_DISTANCE // 安全間距
    const PROGRESS_THRESHOLD = 2 // 進度檢查閾值（像素）

    if (currentDistance > SAFE_GAP) {
      // 間距已恢復到安全值
      console.log(`✅ [${this.id}] 間距已恢復（${currentDistance.toFixed(1)}px > ${SAFE_GAP}px），轉換回 autoFollowing`)
      this._transitionFromGapRecoveryToAutoFollowing('gap_recovered')
      return
    }

    // 檢查恢復進度
    if (this.lastGapDistance - currentDistance < PROGRESS_THRESHOLD) {
      this.gapRecoveryNoProgressCount++

      // 如果沒有進展次數過多，強制轉換
      if (this.gapRecoveryNoProgressCount > 20) {
        console.warn(
          `⚠️ [${this.id}] gapRecovery 無進展（>20次檢查），距離: ${currentDistance.toFixed(1)}px，強制轉換回 autoFollowing`,
        )
        this._transitionFromGapRecoveryToAutoFollowing('no_progress')
        return
      }
    } else {
      // 有進展，重置計數器
      this.gapRecoveryNoProgressCount = 0
    }

    // 更新上次間距
    this.lastGapDistance = currentDistance
  }

  // 🔧 新增：從 gapRecovery 轉換到 autoFollowing
  /**
   * 私有方法：轉換狀態邏輯
   * @param {string} reason - 轉換原因（'success', 'gap_recovered', 'timeout', 'no_progress'）
   */
  _transitionFromGapRecoveryToAutoFollowing(reason = 'unknown') {
    // 重置恢復相關的追蹤變數
    this.gapRecoveryStartTime = null
    this.lastGapDistance = Infinity
    this.gapRecoveryNoProgressCount = 0

    // 轉換狀態
    this.currentState = 'autoFollowing'

    // 恢復速度到預設值
    if (this.movementTimeline && this.movementTimeline.timeScale() <= 0.1) {
      gsap.to(this.movementTimeline, {
        timeScale: 0.5,
        duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.SMOOTH || 0.5,
        ease: 'power2.out',
      })
    }
  }

  // 🎯 新增：更新停止原因（三態區分）
  /**
   * 更新車輛的停止原因，區分排隊停止、碰撞停止和跟隨停止
   * @param {string} newReason - 新的停止原因（'queue', 'collision', 'following', null）
   * @param {Object} frontVehicle - 前方車輛（可選）
   */
  updateStopReason(newReason, frontVehicle = null) {
    if (this.stopReason === newReason) {
      // 原因未改變，不需要更新
      return
    }

    this.stopReason = newReason
    this.stopReasonChangedTime = Date.now()

    // 根據停止原因設置相應的標記
    switch (newReason) {
      case 'queue':
        // 排隊停止：前車已停止，我也停止
        this.isInQueue = true
        this.isInCollision = false
        this.queueFrontVehicle = frontVehicle
        break

      case 'collision':
        // 碰撞停止：緊急停止以避免碰撞
        this.isInQueue = false
        this.isInCollision = true
        this.collisionFrontVehicle = frontVehicle
        break

      case 'following':
        // 跟隨停止：保持安全速度跟隨前車
        this.isInQueue = false
        this.isInCollision = false
        this.queueFrontVehicle = null
        this.collisionFrontVehicle = null
        break

      default:
        // 無停止原因
        this.isInQueue = false
        this.isInCollision = false
        this.queueFrontVehicle = null
        this.collisionFrontVehicle = null
    }

    // 記錄日誌便於調試
    if (newReason) {
      console.log(`🎯 [${this.id}] 停止原因更新: ${newReason}${frontVehicle ? ` (前車: ${frontVehicle.id})` : ''}`)
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

    // ✅ Phase 7：使用 Store emit() 替代 window.dispatchEvent
    if (this.simulationStore) {
      this.simulationStore.emit(eventName, eventData)
    } else {
      // 🆘 備用：如果 Store 不可用，使用 window.dispatchEvent
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: eventData,
        }),
      )
    }
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

    // ✅ 立即設置初始位置到 (startPosition.x, startPosition.y)，避免視覺跳動
    gsap.set(div, {
      x: this.startPosition.x,
      y: this.startPosition.y,
    })

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

  // 🨨 新增：統一停止線檢查和交通燈響應
  // Command Pattern: 將停止線檢查和交通燈響應邏輯封裝為一個命令
  checkStopLineAndRespond(trafficController, allVehicles = []) {
    // 檢查四個前置條件
    if (this.hasPassedStopLine || !this.checkStopLine() || this.waitingForGreen || this.isAtStopLine) {
      return // 前置條件不滿足，無需響應
    }

    // 設置已到達停止線標記
    this.isAtStopLine = true
    const lightState = trafficController.getCurrentLightState(this.direction)

    // 🟡 P0 FIX #1：決定是否停止（基於燈號和決策邏輯）
    let shouldStop = false
    if (lightState === 'yellow') {
      // 🟡 黃燈時：使用新的決策邏輯
      const decision = this.makeYellowLightDecision()
      shouldStop = decision.action === 'brake'
      if (YELLOW_LIGHT_DECISION_CONFIG.DEBUG.ENABLED) {
        console.log(`🟡 [${this.id}] 黃燈決策執行: ${decision.decision} → ${decision.action}`)
      }
    } else {
      // 紅燈、全紅、或其他燈號
      shouldStop = lightState === 'red' || lightState === 'allRed' || (this.laneNumber === 1 && lightState === 'green') // 1號車道（左轉）在直行綠燈時停止
    }

    // 🚦 執行停止邏輯
    if (shouldStop) {
      this._performStopAtLine(lightState)
      return
    }

    // 🚦 檢查是否可以通過停止線
    const canProceed = this._canProceedThroughStopLine(lightState)
    if (canProceed) {
      // 可以通過停止線
      this.isAtStopLine = false
      this.hasPassedStopLine = true
    } else {
      // 不能通過，需要等待
      this._performStopAtLine(lightState)
    }
  }

  // Helper Method: 執行停止邏輯
  _performStopAtLine(lightState) {
    // 🚨 立即停止（不使用動畫過渡），防止超過停止線
    if (this.movementTimeline) {
      // 直接暫停時間軸，確保立即停止
      this.movementTimeline.pause()
      this.movementTimeline.timeScale(0)
    }

    // 執行停止邏輯
    this.stopMovement()
    this.waitingForGreen = true

    // 設置1號車道的等待狀態
    if (this.laneNumber === 1 && lightState === 'green') {
      this.currentState = 'waitingForLeftTurnGreen'
    }
  }

  // Helper Method: 檢查是否可以通過停止線
  _canProceedThroughStopLine(lightState) {
    // 🚨 修正：檢查1號車道是否為左轉綠燈
    const isNonLane1GreenLight = this.laneNumber !== 1 && lightState === 'green'
    const isLane1LeftTurnGreen = this.laneNumber === 1 && lightState === 'leftGreen'
    const isYellowAndCanAccelerate = lightState === 'yellow' && this.makeYellowLightDecision().action === 'accelerate'

    return isNonLane1GreenLight || isLane1LeftTurnGreen || isYellowAndCanAccelerate
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

  // 🚨 P0 FIX #1：黃燈決策方法 - 決定是否衝過黃燈或停止
  makeYellowLightDecision() {
    // 檢查配置是否啟用黃燈決策邏輯
    if (!YELLOW_LIGHT_DECISION_CONFIG.DECISION_LOGIC.ENABLED) {
      return { action: 'none', decision: 'disabled' }
    }

    // 🚀 第3階段優化：黃燈決策降頻
    // 每 50ms (20 Hz) 只進行一次完整決策計算，其他時間使用緩存結果
    const now = Date.now()
    if (now - this.lastYellowDecisionTime < this.yellowDecisionCacheInterval) {
      // 使用緩存的決策結果
      if (this.cachedYellowDecision) {
        return this.cachedYellowDecision
      }
    }

    // 獲取當前速度和位置
    const currentSpeed = this.getCurrentSpeedRatio() || 0
    const distanceToStopLine = this.getDistanceToStopLine()

    // 無法計算距離時，採用保守策略（停止）
    if (distanceToStopLine === null || distanceToStopLine === undefined) {
      const decision = { action: 'brake', decision: 'unknown_distance' }
      this.cachedYellowDecision = decision
      this.lastYellowDecisionTime = now
      return decision
    }

    // 如果距離為負，表示已超過停止線，應該加速通過
    if (distanceToStopLine < 0) {
      const decision = { action: 'accelerate', decision: 'already_past' }
      this.cachedYellowDecision = decision
      this.lastYellowDecisionTime = now
      return decision
    }

    // 計算安全停止距離
    // 公式：stopping_distance = (speed²) / (2 × deceleration) + safety_margin
    const deceleration = YELLOW_LIGHT_DECISION_CONFIG.DECELERATION_RATE
    const speedInPixelsPerFrame = currentSpeed * this.initialSpeed
    const stoppingDistance =
      (speedInPixelsPerFrame * speedInPixelsPerFrame) / (2 * deceleration) +
      YELLOW_LIGHT_DECISION_CONFIG.SAFE_STOPPING_MARGIN

    // 決策邏輯
    let decision
    if (distanceToStopLine > stoppingDistance) {
      // 能夠安全停止 → 減速停車
      if (YELLOW_LIGHT_DECISION_CONFIG.DEBUG.LOG_DECISIONS) {
        console.log(
          `🟡 [${this.id}] 黃燈決策：停止 (距離=${distanceToStopLine.toFixed(1)}, 停止距=${stoppingDistance.toFixed(1)})`,
        )
      }
      decision = {
        action: 'brake',
        decision: 'safe_to_stop',
        stoppingDistance: stoppingDistance,
        distanceToStopLine: distanceToStopLine,
      }
    } else {
      // 無法安全停止 → 加速通過
      if (YELLOW_LIGHT_DECISION_CONFIG.DEBUG.LOG_DECISIONS) {
        console.log(
          `🟡 [${this.id}] 黃燈決策：衝過 (距離=${distanceToStopLine.toFixed(1)}, 停止距=${stoppingDistance.toFixed(1)})`,
        )
      }
      decision = {
        action: 'accelerate',
        decision: 'cannot_stop_safely',
        stoppingDistance: stoppingDistance,
        distanceToStopLine: distanceToStopLine,
      }
    }

    // 更新緩存
    this.cachedYellowDecision = decision
    this.lastYellowDecisionTime = now

    return decision
  }

  // 🚨 P0 FIX #2：檢測車輛是否在轉向路段
  isOnTurnSection() {
    if (!this.position || !this.position.progress) {
      return false
    }

    // 根據方向判斷轉向部分的進度範圍
    // 轉向通常發生在路徑的 15-40% 部分（路口中心轉向區域）
    const progress = this.position.progress
    const turnStartProgress = 0.15
    const turnEndProgress = 0.45

    const isInTurnZone = progress > turnStartProgress && progress < turnEndProgress

    if (TURN_SPEED_CONFIG.DEBUG.ENABLED) {
      console.log(`🔄 [${this.id}] 轉向檢測: progress=${progress.toFixed(3)}, inTurn=${isInTurnZone}`)
    }

    return isInTurnZone
  }

  // 🚨 P0 FIX #2：根據路徑曲率估計轉向半徑
  estimateTurnRadius() {
    // 簡化估計：根據不同方向和車道的典型轉向半徑
    // 實際應用中，應根據SVG路徑的控制點計算

    if (this.laneNumber === 1) {
      // 左轉車道：較小的轉向半徑
      if (this.direction === 'east') return 30 // 東向左轉
      if (this.direction === 'north') return 30 // 北向左轉
      if (this.direction === 'west') return 30 // 西向左轉
      if (this.direction === 'south') return 30 // 南向左轉
    }

    // 直行車道（其他車道）：較大的轉向半徑
    if (this.direction === 'east') return 70 // 東向直行
    if (this.direction === 'north') return 70 // 北向直行
    if (this.direction === 'west') return 70 // 西向直行
    if (this.direction === 'south') return 70 // 南向直行

    // 預設值
    return 70
  }

  // 🚨 P0 FIX #2：根據轉向半徑計算最大轉向速度
  calculateMaxTurnSpeed(turnRadius) {
    // 根據轉向半徑從配置表中獲取最大速度
    const speedMap = TURN_SPEED_CONFIG.TURN_RADIUS_TO_SPEED
    let maxTurnSpeed = speedMap.VERY_WIDE_150PX // 預設值：最寬轉向

    if (turnRadius <= 30) {
      maxTurnSpeed = speedMap.TIGHT_30PX
    } else if (turnRadius <= 50) {
      maxTurnSpeed = speedMap.TIGHT_50PX
    } else if (turnRadius <= 70) {
      maxTurnSpeed = speedMap.NORMAL_70PX
    } else if (turnRadius <= 100) {
      maxTurnSpeed = speedMap.WIDE_100PX
    } else {
      maxTurnSpeed = speedMap.VERY_WIDE_150PX
    }

    // 🚨 進一步應用路口轉向速度上限（額外安全限制）
    const intersectionLimit = TURN_SPEED_CONFIG.INTERSECTION_TURN_SPEED
    maxTurnSpeed = Math.min(maxTurnSpeed, intersectionLimit)

    // 📊 計算速度比例 (相對於 initialSpeed)
    // initialSpeed 的單位是 km/h，需要轉換為像素/秒進行比較
    // 假設 100px = 15m，100 km/h ≈ 27.78 m/s ≈ 185 px/s
    const speedMultiplier = 1.85 // px/s per 1 km/h
    const currentMaxPixelSpeed = (this.initialSpeed || 50) * speedMultiplier
    const speedRatio = Math.max(0, Math.min(1, maxTurnSpeed / currentMaxPixelSpeed))

    if (TURN_SPEED_CONFIG.DEBUG.ENABLED) {
      console.log(
        `🚗 [${this.id}] calculateMaxTurnSpeed: radius=${turnRadius}, ` +
          `maxSpeed=${maxTurnSpeed.toFixed(0)}px/s, currentMax=${currentMaxPixelSpeed.toFixed(0)}px/s, ` +
          `ratio=${speedRatio.toFixed(3)}`,
      )
    }

    // 確保比例在 0-1 之間，最低 0.2 (避免完全停止轉向)
    return Math.max(0.2, Math.min(1, speedRatio))
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
        // 🚨 修正：SVG 路徑必須存在，不再使用備用方式
        console.error(`❌ 無法獲取路徑，車輛 ${this.id} 無法移動，請檢查 SVG 配置`)
        resolve()
        return
      }

      // 🚀 第1階段優化：在第一個 vehicle 的 onUpdate 時初始化 SpatialHashGrid
      // 使用靜態計數器確保只執行一次
      if (!Vehicle._spatialGridFrameInitialized) {
        Vehicle._spatialGridFrameInitialized = true
        // SpatialHashGrid 將在第一幀時重建
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

          // ❌ 移除：setInterval（改由 IndexPage mainSimulationLoop 每 50ms 驅動 directTrafficLightResponse 和 resumeMovement）
          // 此方法現在由 RAF 直接調用，無需設置自己的定時器

          // 邊界檢測標記 - 避免重複觸發 (移到正確位置)
          let hasBeenRemovedFromCollision = false

          // Template Method Pattern: 創建 MotionPath 移動時間線
          this.movementTimeline = gsap.timeline({
            onStart: () => {
              // 🚨 開始移動時更新時間
              this.lastMovementTime = Date.now()
            },
            onUpdate: () => {
              // � 第1階段優化：每幀重建 SpatialHashGrid（用於優化碰撞檢測）
              // 原因：100輛車 × 每輛車onUpdate = 每幀100次rebuildSpatialGrid → 卡頓
              // if (allVehicles.length > 0) {
              //   CollisionController.rebuildSpatialGrid(allVehicles)
              // }

              // �🚨 防守：車輛已銷毀時，不執行更新邏輯（車輛可能已被移除，但GSAP動畫仍繼續執行）
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

              // 🚨 P0 FIX #2：轉向速度控制 - 檢查是否在轉向區域
              let isOnTurnSection = false
              if (this.hasPassedStopLine && TURN_SPEED_CONFIG.TURN_DETECTION.ENABLED) {
                isOnTurnSection = this.isOnTurnSection()

                if (isOnTurnSection) {
                  // 車輛正在轉向：應用轉向速度限制
                  const turnRadius = this.estimateTurnRadius()
                  const maxTurnSpeedRatio = this.calculateMaxTurnSpeed(turnRadius)
                  const currentTimeScale = this.movementTimeline.timeScale()

                  // 只在需要減速時調整（避免不必要的動畫）
                  if (currentTimeScale > maxTurnSpeedRatio + 0.05) {
                    // 🚨 直接設置，避免重複創建動畫
                    this.movementTimeline.timeScale(maxTurnSpeedRatio)
                    if (TURN_SPEED_CONFIG.DEBUG.ENABLED) {
                      console.log(
                        `🔄 [${this.id}] 轉向減速: radius=${turnRadius}, speedRatio=${maxTurnSpeedRatio.toFixed(2)}`,
                      )
                    }
                  }
                } else if (this.hasPassedStopLine) {
                  // 不在轉向區域：可以恢復正常速度
                  const currentTimeScale = this.movementTimeline.timeScale()
                  if (currentTimeScale < 0.95) {
                    // 🚨 直接設置，避免重複創建動畫
                    this.movementTimeline.timeScale(1)
                  }
                }
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
              // 【優化】已通過停止線的車輛無需碰撞檢測和跟隨
              // 在綠燈通行時，車子只需保持勻速前進，跳過所有碰撞邏輯
              if (this.hasPassedStopLine) {
                // 車輛已通過停止線，恢復到正常速度並繼續前進
                if (this.movementTimeline && !isOnTurnSection) {
                  const currentTimeScale = this.movementTimeline.timeScale()
                  if (currentTimeScale < 0.95) {
                    // 🚨 直接設置，避免重複創建動畫
                    this.movementTimeline.timeScale(1)
                    this.currentState = 'throughIntersection'
                  }
                }
                return // 跳過所有碰撞檢測和跟隨邏輯
              }

              // �🚨 簡化碰撞檢測系統 - 區分第一台車和後續車輛
              // ✅ Phase 5E: 綠燈優先邏輯 - 移除「綠燈後立即加速時的碰撞」
              // 當燈號變綠且車輛準備通過停止線時，無條件加速（跳過碰撞檢測）
              // ═══════════════════════════════════════════════════════════════════════
              // 【Phase 3 - 碰撞檢測遷移】✅ 碰撞邏輯已移至 IndexPage.vue mainSimulationLoop
              // 此處移除所有碰撞檢測邏輯（每幀執行 60Hz），改由 IndexPage.vue 50ms 執行一次
              // 預期效果：減少 67% 的碰撞檢測調用（從 6000/秒 → 2000/秒）
              // ═══════════════════════════════════════════════════════════════════════

              // 停止線檢查和紅綠燈控制流程
              this.checkStopLineAndRespond(trafficController, allVehicles)
            },
            onComplete: () => {
              // 清理定期檢查定時器
              if (this.periodicCheckTimer) {
                clearInterval(this.periodicCheckTimer)
                this.periodicCheckTimer = null
              }

              this.currentState = 'completed'

              // 🚨 立即移除機制：動畫完成時立刻從碰撞檢測中移除
              // ✅ 改為傳遞整個 vehicle 實例，而不是 vehicleId
              if (!hasBeenRemovedFromCollision && onVehicleOutOfBounds) {
                hasBeenRemovedFromCollision = true
                onVehicleOutOfBounds(this) // 👈 傳遞 this 而不是 this.id
              }

              // ✅ 不再調用 this.remove()，改由 IndexPage 透過 pool.release() 來回收
              // this.remove() // � 註解掉
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
          } else {
            // ✅ 若無初始 progress，強制設置到 Path 起始點 (progress = 0)
            const pathId = this.getSvgPathId()
            const pathElement = document.getElementById(pathId)
            if (pathElement && pathElement.getTotalLength) {
              const point = pathElement.getPointAtLength(0) // 路徑起始點
              if (point) {
                gsap.set(this.element, {
                  x: point.x,
                  y: point.y,
                })
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

  //  新增：回收車輛（改進 7 - 循環流量機制）
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
    const laneWidth = TURN_SPEED_CONFIG.LANE_WIDTH // 從配置取得車道寬度
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
    this.isCompleted = true // ✅ Phase 4：標記為已完成，由 IndexPage RAF 迴圈集中處理

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

    // ✅ Phase 4 修改：只標記完成，不執行清理
    // 所有清理邏輯由 IndexPage RAF 迴圈統一執行
    // 這樣可以避免異步清理導致的時序問題

    // ✅ Phase 7：派發 vehicleRemoved 事件，使用 Store emit() 替代 window.dispatchEvent
    const vehicleRemovedDetail = {
      vehicleId: this.id,
      direction: this.direction,
      type: this.vehicleType,
      timestamp: Date.now(),
      travelTime: this.travelTime,
    }

    if (this.simulationStore) {
      this.simulationStore.emit('vehicleRemoved', vehicleRemovedDetail)
    } else {
      // 🆘 備用：如果 Store 不可用，使用 window.dispatchEvent
      window.dispatchEvent(
        new CustomEvent('vehicleRemoved', {
          detail: vehicleRemovedDetail,
        }),
      )
    }
  }

  // 🚀【物件池】重置方法：將車輛恢復到初始狀態以供重複使用
  // 這比 performCleanup() 更輕量 - 隱藏元素但保留在 DOM 中
  reset(direction, laneNumber, vehicleType, store) {
    // 防護：提供合理的預設值
    direction = direction || this.direction || 'east'
    laneNumber = laneNumber || this.laneNumber || 1
    vehicleType = vehicleType || this.vehicleType || 'small'
    store = store || this.simulationStore || null

    console.log(`🔄 [Vehicle.reset] ${this.id}: direction=${direction}, lane=${laneNumber}, type=${vehicleType}`)

    // ✅ 【關鍵】隱藏元素但不移除 DOM
    if (this.element) {
      gsap.set(this.element, {
        autoAlpha: 0, // opacity: 0, visibility: hidden
        x: -9999,
        y: -9999,
        rotation: 0,
      })

      // 🚨【修復】無論車型是否改變，都要更新圖片和樣式
      const vehicleTypeChanged = this.vehicleType !== vehicleType
      
      // 更新車型
      this.vehicleType = vehicleType
      const vehicleConfig = this.getVehicleConfig()
      
      // ✅ 總是設置圖片和樣式（即使車型未變）
      this.element.style.backgroundImage = `url('${vehicleConfig.image}')`
      this.element.style.width = vehicleConfig.width + 'px'
      this.element.style.height = vehicleConfig.height + 'px'
      this.element.style.backgroundSize = 'contain'
      this.element.style.backgroundPosition = 'center'
      this.element.style.backgroundRepeat = 'no-repeat'
      
      if (vehicleConfig.scaleX) {
        this.element.style.transform = `scaleX(${vehicleConfig.scaleX})`
      }
    }

    // 🔄 重置方向和車道
    this.direction = direction
    this.laneNumber = laneNumber
    this.simulationStore = store

    // 🔄 重置移動狀態
    this.progress = 0
    this.speed = 0
    this.currentSpeed = 0
    this.maxSpeed = 0
    this.initialSpeed = this.generateRandomSpeed()

    // 🔄 重置停止線狀態
    this.isAtStopLine = false
    this.hasPassedStopLine = false
    this.waitingForGreen = false
    this.currentState = 'waiting'

    // 🔄 重置完成狀態
    this.isRemoved = false
    this.isCompleted = false
    this.isAnimationStarted = false

    // 🔄 重置碰撞和隊列狀態
    this.isInCollision = false
    this.isInQueue = false
    this.queueFrontVehicle = null
    this.collisionFrontVehicle = null

    // 🔄 重置數據收集相關
    this.travelTime = 0
    this.totalDistance = 0
    this.laneChangeCount = 0

    // 🚨 殺死所有進行中的 GSAP 動畫
    try {
      gsap.killTweensOf(this)
      gsap.killTweensOf(this.element)
      if (this.displayObject) {
        gsap.killTweensOf(this.displayObject)
      }
      if (this.path) {
        gsap.killTweensOf(this.path)
      }
    } catch (e) {
      console.warn(`⚠️ [Vehicle.reset] GSAP 清理異常: ${e.message}`)
    }

    // 🧹 清理定時器
    if (this.periodicCheckTimer) {
      clearInterval(this.periodicCheckTimer)
      this.periodicCheckTimer = null
    }

    if (this.stuckCheckTimer) {
      clearInterval(this.stuckCheckTimer)
      this.stuckCheckTimer = null
    }

    // 清理時間線但不殺死（會在新動畫開始時重建）
    if (this.movementTimeline) {
      this.movementTimeline.kill()
      this.movementTimeline = null
    }
  }

  // ✅ Phase 4 新增：集中清理方法（由 IndexPage RAF 迴圈調用）
  async performCleanup() {
    if (!this.isRemoved) {
      return
    }

    try {
      // 🚨【關鍵】完全殺死所有 GSAP 動畫 - 防止僵屍動畫繼續計算
      gsap.killTweensOf(this)
      gsap.killTweensOf(this.element)

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

    console.log(`🗑️ [${this.id}] 已完成清理`)
  }

  // 🚨 新增：綠燈跟車檢查
  // 🚨 新增：簡化直接燈號響應邏輯
  directTrafficLightResponse(trafficController) {
    if (!this.direction || !trafficController || !this.movementTimeline) return

    // 🚀 DRY 優化：委託給交通燈響應工具類
    TrafficLightDirectResponseUtils.handleDirectResponse(this, trafficController)
  }
}
