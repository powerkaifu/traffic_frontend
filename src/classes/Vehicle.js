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
  PATH_CONFIG,
  DEBUG_CONFIG,
} from './config/vehicleConfig.js' // 🚀 整合：車輛行為配置

// 註冊 GSAP 插件
gsap.registerPlugin(MotionPathPlugin)

export default class Vehicle {
  // 靜態屬性：統一控制動畫速度
  static timeMultiplier = ANIMATION_CONFIG.TIME_MULTIPLIER // 從配置讀取動畫速度倍數

  // 🚨 新增：全局抖動抑制機制
  static antiShakeGlobalCooldown = ANIMATION_CONFIG.COOLDOWN_TIMES.GLOBAL_ANTI_SHAKE // 使用配置的冷卻時間
  static lastGlobalAdjustTime = 0 // 上次全局調整時間

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

  // Strategy Pattern: 基於車輛類型的速度生成策略
  generateRandomSpeed() {
    // Strategy Pattern: 不同車輛類型使用不同速度策略
    const range = speedConfig[this.vehicleType] || speedConfig.small
    if (!range) {
      console.warn(`[Vehicle] 未找到車輛類型 '${this.vehicleType}' 的速度設定，使用預設值。`)
      return DISTANCE_CONFIG.DEFAULT_SPEED // 返回一個安全預設值
    }
    const randomSpeed = range.min + Math.random() * (range.max - range.min)
    return Math.round(randomSpeed)
  }

  // Template Method Pattern: 計算動畫持續時間的模板方法
  calculateAnimationDuration(distance = DISTANCE_CONFIG.DEFAULT_CROSSING_DISTANCE) {
    // Template Method Pattern: 定義計算動畫時間的標準流程
    // 假設路口通過距離約 800 像素
    const speed = this.initialSpeed // km/h
    const speedMs = (speed * 1000) / 3600 // 轉換為 m/s

    // 假設 100 像素 = 15 米（調整比例尺，讓距離感更真實）
    const realDistance = (distance / DISTANCE_CONFIG.PIXELS_PER_METER) * DISTANCE_CONFIG.METERS_PER_UNIT // 轉換為實際距離（米）

    // 計算理論時間（秒）
    const theoreticalTime = realDistance / speedMs

    // 🎬 動畫速度控制：TIME_MULTIPLIER 越小越快，越大越慢
    const adjustedTheoretical = theoreticalTime * Vehicle.timeMultiplier

    // 調整時間範圍以支援更大的速度變化範圍
    const minTime = ANIMATION_CONFIG.MIN_ANIMATION_TIME // 最短1秒
    const maxTime = ANIMATION_CONFIG.MAX_ANIMATION_TIME // 最長30秒
    const adjustedTime = Math.max(minTime, Math.min(maxTime, adjustedTheoretical))

    return adjustedTime
  }

  // Factory Pattern: 創建車輛DOM元素的工廠方法
  createElement() {
    // Factory Pattern: 根據車輛配置創建對應的DOM元素
    const vehicleConfig = this.getVehicleConfig()

    // 構建 transform 樣式
    let transform = ''
    if (vehicleConfig.rotation !== undefined) {
      transform += `rotate(${vehicleConfig.rotation}deg) `
    }
    if (vehicleConfig.scaleX !== undefined) {
      transform += `scaleX(${vehicleConfig.scaleX}) `
    }

    const div = document.createElement('div')
    div.className = 'vehicle' // 改為 vehicle 類名
    div.vehicleInstance = this // 保存車輛實例的引用
    
    // 🌓 新增：計算陰影大小（根據車型）
    const shadowSize = this.vehicleType === 'large' ? 10 : this.vehicleType === 'small' ? 8 : 6
    
    div.style.cssText = `
      position: absolute;
      width: ${vehicleConfig.width}px;
      height: ${vehicleConfig.height}px;
      background-image: url('${vehicleConfig.image}');
      background-size: contain;
      background-repeat: no-repeat;
      z-index: 10;
      top: 0;
      left: 0;
      ${transform ? `transform: ${transform.trim()};` : ''}
      transform-origin: center center;
      filter: drop-shadow(3px 3px ${shadowSize}px rgba(0, 0, 0, 0.4));
    `
    
    // 💨 新增：創建速度線容器
    this.createSpeedLines(div, vehicleConfig)
    
    return div
  }

  // 💨 新增：創建速度線效果
  createSpeedLines(container, vehicleConfig) {
    this.speedLines = document.createElement('div')
    this.speedLines.className = 'speed-lines'
    
    // 根據方向決定速度線的位置和方向
    const lineStyle = this.getSpeedLineStyle(vehicleConfig)
    
    this.speedLines.style.cssText = `
      position: absolute;
      ${lineStyle.position}
      width: ${lineStyle.width};
      height: ${lineStyle.height};
      opacity: 0;
      pointer-events: none;
      z-index: 5;
    `
    
    // 創建3條速度線
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('div')
      line.style.cssText = `
        position: absolute;
        ${lineStyle.linePosition}
        ${lineStyle.lineSize}
        background: linear-gradient(90deg, transparent, rgba(100, 150, 255, 0.6), transparent);
        border-radius: 2px;
        transform: translateX(${-i * 10}px);
      `
      this.speedLines.appendChild(line)
    }
    
    container.appendChild(this.speedLines)
  }

  // 💨 新增：根據方向獲取速度線樣式
  getSpeedLineStyle(vehicleConfig) {
    const width = vehicleConfig.width
    const height = vehicleConfig.height
    
    switch (this.direction) {
      case 'east':
        return {
          position: 'left: -30px; top: 50%; transform: translateY(-50%);',
          width: '30px',
          height: `${height}px`,
          linePosition: 'left: 0;',
          lineSize: 'width: 15px; height: 2px; top: 30%;',
        }
      case 'west':
        return {
          position: 'right: -30px; top: 50%; transform: translateY(-50%);',
          width: '30px',
          height: `${height}px`,
          linePosition: 'right: 0;',
          lineSize: 'width: 15px; height: 2px; top: 30%;',
        }
      case 'north':
        return {
          position: 'top: -30px; left: 50%; transform: translateX(-50%);',
          width: `${width}px`,
          height: '30px',
          linePosition: 'top: 0;',
          lineSize: 'width: 2px; height: 15px; left: 50%;',
        }
      case 'south':
        return {
          position: 'bottom: -30px; left: 50%; transform: translateX(-50%);',
          width: `${width}px`,
          height: '30px',
          linePosition: 'bottom: 0;',
          lineSize: 'width: 2px; height: 15px; left: 50%;',
        }
      default:
        return {
          position: 'left: -30px; top: 50%;',
          width: '30px',
          height: `${height}px`,
          linePosition: 'left: 0;',
          lineSize: 'width: 15px; height: 2px;',
        }
    }
  }

  // 💨 新增：顯示加速效果
  showAccelerationEffect(isIntense = false) {
    if (!this.speedLines) return
    
    this.isAccelerating = true
    
    // 根據是否強烈加速調整效果
    const opacity = isIntense ? 0.8 : 0.5
    const duration = isIntense ? 0.8 : 0.5
    
    // 淡入速度線
    gsap.to(this.speedLines, {
      opacity: opacity,
      duration: 0.2,
      ease: 'power2.out',
    })
    
    // 自動淡出
    gsap.to(this.speedLines, {
      opacity: 0,
      duration: 0.3,
      delay: duration,
      ease: 'power2.in',
      onComplete: () => {
        this.isAccelerating = false
      },
    })
  }

  // 💨 新增：隱藏加速效果
  hideAccelerationEffect() {
    if (!this.speedLines) return
    
    gsap.to(this.speedLines, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        this.isAccelerating = false
      },
    })
  }

  // Composite Pattern: 創建車道編號標籤組件
  createLaneLabel() {
    // Composite Pattern: 創建車道編號標籤作為車輛的子組件
    this.laneLabel = document.createElement('div')
    this.laneLabel.className = 'lane-label'
    this.laneLabel.textContent = this.laneNumber

    // 根據車輛方向設置標籤位置和旋轉角度
    let labelTransform = ''
    switch (this.direction) {
      case 'east':
        labelTransform = 'top: -8px; left: 50%; transform: translateX(-50%);'
        break
      case 'west':
        labelTransform = 'top: 5px; left: 50%; transform: translateX(-50%) rotate(180deg);'
        break
      case 'north':
        labelTransform = 'top: 5px; left: 50%; transform: translateX(-50%) rotate(90deg);'
        break
      case 'south':
        labelTransform = 'top: -8px; left: 50%; transform: translateX(-50%) rotate(-90deg);'
        break
      default:
        labelTransform = 'top: -8px; left: 50%; transform: translateX(-50%);'
    }

    this.laneLabel.style.cssText = `
      position: absolute;
      ${labelTransform}
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 2px;
      border-radius: 50%;
      border: 1px solid #ffcc00;
      z-index: 15;
      pointer-events: none;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    `

    // 將標籤添加到車輛元素中
    this.element.appendChild(this.laneLabel)
  }

  // Factory Pattern + Strategy Pattern: 獲取車輛配置的工廠策略方法
  getVehicleConfig() {
    // Factory Pattern: 基於車輛類型和方向創建配置
    // Strategy Pattern: 每種車輛類型和方向組合都有不同的策略

    const vehicleConfigs = {
      large: {
        east: { width: 35, height: 20, image: '/images/car/lCar_east.png', rotation: 0 },
        west: { width: 35, height: 20, image: '/images/car/lCar_east.png', rotation: 0, scaleX: -1 },
        north: { width: 35, height: 20, image: '/images/car/lCar_east.png', rotation: -90 },
        south: { width: 35, height: 20, image: '/images/car/lCar_east.png', rotation: 90 },
      },
      small: {
        east: { width: 30, height: 18, image: '/images/car/sCar_east.png', rotation: 0 },
        west: { width: 30, height: 18, image: '/images/car/sCar_east.png', rotation: 0, scaleX: -1 },
        north: { width: 30, height: 18, image: '/images/car/sCar_east.png', rotation: -90 },
        south: { width: 30, height: 18, image: '/images/car/sCar_east.png', rotation: 90 },
      },
      motor: {
        east: { width: 25, height: 15, image: '/images/car/mCar_east.png', rotation: 0 },
        west: { width: 25, height: 15, image: '/images/car/mCar_east.png', rotation: 0, scaleX: -1 },
        north: { width: 25, height: 15, image: '/images/car/mCar_east.png', rotation: -90 },
        south: { width: 25, height: 15, image: '/images/car/mCar_east.png', rotation: 90 },
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
    // 根據方向檢查是否已完全離開對應邊界
    switch (this.direction) {
      case 'east':
        return position.x >= bounds.right
      case 'west':
        return position.x <= bounds.left
      case 'north':
        return position.y <= bounds.top
      case 'south':
        return position.y >= bounds.bottom
      default:
        return false
    }
  }

  // Template Method Pattern: 檢查是否到達停止線的模板方法
  // � 簡化：委託給停止線控制器
  checkStopLine() {
    return this.stopLineController.shouldStopAtLine()
  }

  // Template Method Pattern: 計算車輛到停止線距離的模板方法
  // 🚀 簡化：委託給停止線控制器
  getDistanceToStopLine() {
    return this.stopLineController.getDistanceToStopLine()
  }

  // 🚀 簡化：使用停止線控制器處理交通燈邏輯
  checkTrafficLightSlowDown(trafficController) {
    if (this.hasPassedStopLine || this.waitingForGreen || this.isAtStopLine) {
      return null
    }

    return this.stopLineController.checkTrafficLightLogic(trafficController)
  }

  // 🚨 新增：獲取當前速度比例的輔助方法
  getCurrentSpeedRatio() {
    if (!this.movementTimeline) {
      return 1.0 // 預設速度比例
    }

    // 獲取當前時間軸的速度縮放
    const currentTimeScale = this.movementTimeline.timeScale()

    // 如果有原始時間縮放，使用它作為基準
    const baseTimeScale = this.originalTimeScale || 1.0

    // 計算相對於基準速度的比例
    return currentTimeScale / baseTimeScale
  }

  // Adapter Pattern: 獲取當前位置的適配器方法
  getCurrentPosition() {
    // Adapter Pattern: 將GSAP的座標系統適配為標準座標
    return {
      x: gsap.getProperty(this.element, 'x'),
      y: gsap.getProperty(this.element, 'y'),
    }
  }

  // Strategy Pattern: 根據方向計算車頭位置的策略方法
  getVehicleHeadPosition() {
    // Strategy Pattern: 每個方向都有不同的車頭位置計算策略
    const currentPos = this.getCurrentPosition()
    const vehicleConfig = this.getVehicleConfig()
    const size = { width: vehicleConfig.width, height: vehicleConfig.height }

    // Strategy Pattern: 根據車輛行駛方向決定車頭位置
    if (this.direction === 'east') {
      // 東向車頭在右側
      return { x: currentPos.x + size.width, y: currentPos.y + size.height / 2 }
    } else if (this.direction === 'west') {
      // 西向車頭在左側
      return { x: currentPos.x, y: currentPos.y + size.height / 2 }
    } else if (this.direction === 'north') {
      // 北向車頭在上方
      return { x: currentPos.x + size.width / 2, y: currentPos.y }
    } else if (this.direction === 'south') {
      // 南向車頭在下方
      return { x: currentPos.x + size.width / 2, y: currentPos.y + size.height }
    }

    return currentPos // 預設返回左上角位置
  }

  // Factory Pattern: 獲取車輛邊界框的工廠方法
  getBoundingBox() {
    // Factory Pattern: 根據當前位置和車輛配置創建邊界框對象
    const pos = this.getCurrentPosition()
    const vehicleConfig = this.getVehicleConfig()
    const size = { width: vehicleConfig.width, height: vehicleConfig.height }

    return {
      left: pos.x,
      right: pos.x + size.width,
      top: pos.y,
      bottom: pos.y + size.height,
      centerX: pos.x + size.width / 2,
      centerY: pos.y + size.height / 2,
    }
  }

  // 🚨 極簡化碰撞檢測：只檢測 5px 間距，停止或繼續
  // 🚨 新增：檢查是否是同車道最接近停止線的車輛
  // 🚀 簡化：委託給碰撞控制器
  isClosestToStopLine(allVehicles) {
    return this.collisionController.isClosestToStopLine(allVehicles)
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
    if (this.movementTimeline) {
      // 暫停動畫
      this.movementTimeline.pause()

      // 精確對齊到停止線位置
      if (this.stopLineController) {
        this.stopLineController.alignToStopLine()
      }

      if (this.currentState !== 'waitingForVehicle' && this.currentState !== 'waiting') {
        this.currentState = 'waiting'
      }

      // 標記已經到達停止線
      this.isAtStopLine = true
    }
  }

  // 🚨 極簡化恢復移動方法
  // 🚨 基於距離的平滑恢復移動
  resumeMovement(allVehicles = []) {
    if (
      this.movementTimeline &&
      (this.currentState === 'waiting' || this.currentState === 'waitingForVehicle' || this.currentState === 'slowing')
    ) {
      const collision = this.collisionController.checkSimpleCollision(allVehicles)

      if (!collision) {
        // 沒有前車，平滑恢復到正常速度
        gsap.to(this.movementTimeline, {
          timeScale: 1,
          duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.SMOOTH, // 使用配置的平滑速度變化時間
          ease: 'power2.out',
        })
        this.currentState = 'moving'

        // 💨 新增：顯示加速效果（綠燈啟動）
        this.showAccelerationEffect(false)

        // 重置停止線狀態，準備識別下一個停止線
        this.isAtStopLine = false
        if (this.stopLineController) {
          this.stopLineController.state = 'approaching'
        }
      } else {
        // 有前車，根據距離調整速度
        const distance = collision.distance
        const requiredGap = collision.requiredGap || 12

        let targetSpeed
        if (distance <= requiredGap * 0.3) {
          targetSpeed = 0 // 完全停止
        } else if (distance <= requiredGap * 0.6) {
          targetSpeed = 0.2 // 大幅減速
        } else if (distance <= requiredGap * 0.8) {
          targetSpeed = 0.5 // 適度減速
        } else {
          targetSpeed = 0.8 // 可以較快移動
          
          // 💨 新增：較快移動時顯示加速效果
          if (targetSpeed >= 0.7 && this.currentState !== 'moving') {
            this.showAccelerationEffect(false)
          }
        }

        gsap.to(this.movementTimeline, {
          timeScale: targetSpeed,
          duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL, // 使用配置的一般速度變化時間
          ease: 'power2.out',
        })
      }
    }
  }

  // Command Pattern + State Pattern: 強制恢復移動命令
  // � 移除 forceResumeMovement 方法 - 功能已被 directTrafficLightResponse 替代

  // 🚨 移除：adjustPositionForSafety 方法已不再需要，使用簡單的 5px 間隙檢測

  // 🚨 新增：檢查車輛是否靠近停止線
  isNearStopLine() {
    const distanceToStopLine = this.getDistanceToStopLine()
    if (distanceToStopLine === null) return false

    // 定義停止線附近區域為50px範圍
    const stopLineProximity = 50
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
      stopLineBuffer: 5, // 縮短停止線緩衝距離
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
      this.currentSpeed = this.initialSpeed
      this.maxSpeed = this.initialSpeed

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
            if (this.currentState === 'waitingForVehicle') {
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
                const kmhSpeed = meterSpeed * 3.6
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

              // 🚨 簡化碰撞檢測系統 - 區分第一台車和後續車輛
              const shouldStop = this.collisionController.checkSimpleCollision(allVehicles)
              const isFirstVehicle = this.collisionController.isClosestToStopLine(allVehicles)

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
                  // 🚨 1號車道使用更嚴格的距離控制
                  const isLane1 = this.laneNumber === 1
                  let targetSpeed

                  if (distance <= requiredGap * 0.4) {
                    // 1號車道：更嚴格的距離控制
                    targetSpeed = isLane1 ? 0.15 : 0.2
                  } else if (distance <= requiredGap * 0.7) {
                    // 距離適中：適度速度
                    targetSpeed = isLane1 ? 0.4 : 0.5
                  } else if (distance <= requiredGap * 1.0) {
                    // 距離接近理想：接近正常速度
                    targetSpeed = isLane1 ? 0.7 : 0.8
                  } else {
                    // 距離充足：正常速度
                    targetSpeed = 1.0
                  }

                  // 平滑調整速度
                  gsap.to(this.movementTimeline, {
                    timeScale: targetSpeed,
                    duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL, // 使用配置的一般速度變化時間
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
              if (this.currentState === 'waitingForVehicle') {
                this.resumeMovement(allVehicles)
              }

              // 停止線檢查和紅綠燈控制流程
              if (!this.hasPassedStopLine && this.checkStopLine() && !this.waitingForGreen && !this.isAtStopLine) {
                this.isAtStopLine = true
                const lightState = trafficController.getCurrentLightState(this.direction)

                // 🚨 修正：1號車道的特殊燈號邏輯
                const shouldStop =
                  lightState === 'red' ||
                  lightState === 'yellow' ||
                  lightState === 'allRed' ||
                  (this.laneNumber === 1 && lightState === 'green') // 1號車道在直行綠燈時也要停止等待左轉綠燈

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

          this.movementTimeline.to(this.element, {
            duration: animationDuration,
            motionPath: {
              path: `#${this.getSvgPathId()}`, // 使用選擇器字串
              align: `#${this.getSvgPathId()}`, // 重要：對齊到路徑
              alignOrigin: [0.5, 0.5], // 車輛中心對齊
              autoRotate: true, // 啟用自動旋轉，車輛會跟隨路徑方向
            },
            ease: 'none',
            // 🚨 移除重複的 onUpdate，統一在時間線級別處理
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
      this.currentSpeed = this.initialSpeed
      this.maxSpeed = this.initialSpeed

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
              const kmhSpeed = meterSpeed * 3.6 // 轉換為 km/h

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
              const requiredGap = collision.requiredGap || 12

              // 🚨 基於距離的漸進式停車，而非直接停止
              let targetSpeed
              if (distance <= requiredGap * 0.3) {
                targetSpeed = 0 // 完全停止
              } else if (distance <= requiredGap * 0.6) {
                targetSpeed = 0.2 // 大幅減速
              } else if (distance <= requiredGap * 0.8) {
                targetSpeed = 0.5 // 適度減速
              } else {
                targetSpeed = 0.8 // 輕微減速
              }

              gsap.to(this.movementTimeline, {
                timeScale: targetSpeed,
                duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL, // 使用配置的一般速度變化時間
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

                if (distanceToStopLine !== null && Math.abs(distanceToStopLine) <= 5) {
                  // 接近停止線，停車等待左轉綠燈
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'waitingForLeftTurnGreen'
                  this.waitingForGreen = true
                } else {
                  // 距離停止線還遠，減速但不停車
                  gsap.to(this.movementTimeline, {
                    timeScale: 0.6, // 減速到60%
                    duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
                    ease: 'power2.out',
                  })
                  this.currentState = 'slowing_for_left_turn_queue'
                }
              } else if (slowDownInfo.action === 'stop_for_straight_wait') {
                // 🚦 新增：直行車道在左轉綠燈時的處理
                const distanceToStopLine = this.getDistanceToStopLine()

                if (distanceToStopLine !== null && Math.abs(distanceToStopLine) <= 5) {
                  // 接近停止線，停車等待直行綠燈
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'waitingForStraightGreen'
                  this.waitingForGreen = true
                } else {
                  // 距離停止線還遠，減速但不停車
                  gsap.to(this.movementTimeline, {
                    timeScale: 0.6, // 減速到60%
                    duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
                    ease: 'power2.out',
                  })
                  this.currentState = 'slowing_for_straight_queue'
                }
              }
            }

            // 如果當前狀態是等待前車，檢查是否可以恢復移動
            if (this.currentState === 'waitingForVehicle') {
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

  // Template Method Pattern: 移除車輛的清理模板方法
  remove() {
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
    })

    // Template Method Pattern: 定義車輛移除的標準清理流程
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
    if (this.laneLabel && this.laneLabel.parentNode) {
      this.laneLabel.parentNode.removeChild(this.laneLabel)
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

    const currentLightState = trafficController.getCurrentLightState(this.direction)

    // � 重要：已通過停止線的車輛不再受燈號約束，繼續完成動畫
    if (this.hasPassedStopLine) {
      // 確保已通過停止線的車輛保持移動狀態
      if (this.currentState !== 'moving' || this.movementTimeline.timeScale() === 0) {
        this.currentState = 'moving'
        this.movementTimeline.timeScale(1)
        this.movementTimeline.resume()
      }
      return // 已通過停止線，不再檢查燈號
    }

    // �🔴 紅燈：不在此處直接停車，讓移動邏輯中的停止線檢查來處理紅燈停車
    // 這樣可確保車輛會前進到停止線才停，而不是立即原地停車

    // 🟢 綠燈響應：根據車道類型決定是否可以移動
    if (currentLightState === 'green' || currentLightState === 'leftGreen') {
      // 🚦 嚴格的車道燈號匹配檢查
      const canProceed =
        (currentLightState === 'green' && this.laneNumber !== 1) || // 直行綠燈且非左轉車道
        (currentLightState === 'leftGreen' && this.laneNumber === 1) // 左轉綠燈且為左轉車道

      if (canProceed) {
        // 🚨 修復：檢查所有可能需要啟動的狀態
        const needsToStart =
          this.waitingForGreen || // 等待綠燈狀態
          this.movementTimeline.timeScale() === 0 || // 時間軸停止
          this.currentState === 'waiting' || // 等待狀態
          this.currentState === 'stopped' || // 停止狀態
          this.currentState === 'waitingForVehicle' || // 等待前車狀態
          this.currentState === 'waitingForLeftTurnGreen' || // 等待左轉綠燈狀態
          this.currentState === 'waitingForStraightGreen' || // 等待直行綠燈狀態
          this.movementTimeline.paused() // 時間軸暫停

        if (needsToStart) {
          // 🚨 綠燈時強制啟動，不受碰撞檢查影響
          this.movementTimeline.timeScale(1)
          this.movementTimeline.resume()
          this.waitingForGreen = false
          this.isAtStopLine = false
          this.currentState = 'moving'

          const lightType = currentLightState === 'leftGreen' ? '左轉綠燈' : '直行綠燈'
        }
      } else {
        // 🚨 修正：移除1號車道在途中的燈號限制
        // 1號車道車輛應該先移動到停止線進行排隊
        // 燈號限制將在停止線處處理，而不是在移動途中
      }
    } else {
      // 🚨 修正：移除1號車道在途中的燈號限制
      // 讓所有車輛都能先到達停止線排隊
      // 燈號限制將在停止線檢查邏輯中處理
    }
  }
}
