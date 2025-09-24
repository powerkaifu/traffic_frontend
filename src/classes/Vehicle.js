/**
 * Vehicle.js - 車輛實體類別
 */
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { speedConfig, stopLineConfig } from './config/trafficConfig.js' // 引入統一的速度設定和停止線配置

// 註冊 GSAP 插件
gsap.registerPlugin(MotionPathPlugin)

export default class Vehicle {
  // 靜態屬性：統一控制動畫速度
  static timeMultiplier = 1 // 控制整體動畫速度，數字越小動畫越快（0.4 = 2.5倍速）

  // 🚨 新增：全局抖動抑制機制
  static antiShakeGlobalCooldown = 100 // 全局冷卻時間（毫秒）
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
    this.positionAdjustCooldown = 500 // 位置調整冷卻時間（毫秒）
    this.isAdjustingPosition = false // 是否正在調整位置

    // 🚨 新增：防止時間縮放抖動
    this.lastTimeScaleChange = 0 // 上次時間縮放變更時間
    this.timeScaleDebounceDelay = 200 // 時間縮放變更防抖延遲（毫秒）
    this.pendingTimeScale = null // 待應用的時間縮放值
    this.timeScaleTimeout = null // 時間縮放更新定時器

    // 🚨 新增：停止線區域特殊防護
    this.stopLineStabilized = false // 是否在停止線區域已穩定
    this.stopLineStabilizeTime = 0 // 停止線穩定時間
    this.stopLineNoAdjustZone = false // 停止線禁止調整區域標記

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

      console.log(`🚗 [${this.id}] 車輛在 (${x}, ${y}) 立即顯示`)
    })

    // 新增車道編號標籤顯示
    this.createLaneLabel()

    // Observer Pattern: 通知交通控制器車輛生成事件
    this.notifyTrafficController()

    // Strategy Pattern: 使用延遲策略避免剛生成就被卡住
    setTimeout(() => {
      this.justCreated = false
    }, 500) // 減少到500毫秒，讓車輛更快進入正常行駛狀態

    // 🚨 新增：防停滯機制
    this.lastMovementTime = Date.now()
    this.stuckCheckTimer = null
    this.setupAntiStuckMechanism()
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

    // 如果車輛停滯超過10秒，強制恢復
    if (stuckDuration > 10000) {
      console.log(`🚨 [${this.id}] 檢測到長時間停滯(${(stuckDuration / 1000).toFixed(1)}s)，執行強制恢復`)
      this.forceUnstuck()
    }
  }

  // 🚨 新增：強制解除停滯
  forceUnstuck() {
    try {
      // 重置移動時間
      this.lastMovementTime = Date.now()

      // 如果有移動時間軸且被暫停，嘗試恢復
      if (this.movementTimeline) {
        if (this.movementTimeline.timeScale() === 0) {
          // 恢復為原始速度，而不是慢速度
          const targetTimeScale = this.originalTimeScale || 1
          this.movementTimeline.timeScale(targetTimeScale)
          console.log(`🔧 [${this.id}] 恢復時間軸移動到原始速度: ${targetTimeScale}`)
        }

        if (this.movementTimeline.paused()) {
          this.movementTimeline.resume()
          console.log(`🔧 [${this.id}] 恢復暫停的動畫`)
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
      return 30 // 返回一個安全預設值
    }
    const randomSpeed = range.min + Math.random() * (range.max - range.min)
    return Math.round(randomSpeed)
  }

  // Template Method Pattern: 計算動畫持續時間的模板方法
  calculateAnimationDuration(distance = 800) {
    // Template Method Pattern: 定義計算動畫時間的標準流程
    // 假設路口通過距離約 800 像素
    const speed = this.initialSpeed // km/h
    const speedMs = (speed * 1000) / 3600 // 轉換為 m/s

    // 假設 100 像素 = 15 米（調整比例尺，讓距離感更真實）
    const realDistance = (distance / 100) * 15 // 轉換為實際距離（米）

    // 計算理論時間（秒）
    const theoreticalTime = realDistance / speedMs

    // 加快動畫速度：使用更小的時間倍數
    // 使用統一的動畫速度控制
    const adjustedTheoretical = theoreticalTime * Vehicle.timeMultiplier

    // 調整時間範圍以適應新的速度
    const minTime = 3 // 最短3秒
    const maxTime = 15 // 最長15秒
    const adjustedTime = Math.max(minTime, Math.min(maxTime, adjustedTheoretical))

    return adjustedTime
  }

  // Factory Pattern: 創建車輛DOM元素的工廠方法
  createElement() {
    // Factory Pattern: 根據車輛配置創建對應的DOM元素
    const vehicleConfig = this.getVehicleConfig()

    const div = document.createElement('div')
    div.className = 'vehicle' // 改為 vehicle 類名
    div.vehicleInstance = this // 保存車輛實例的引用
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
    `
    return div
  }

  // Composite Pattern: 創建車道編號標籤組件
  createLaneLabel() {
    // Composite Pattern: 創建車道編號標籤作為車輛的子組件
    this.laneLabel = document.createElement('div')
    this.laneLabel.className = 'lane-label'
    this.laneLabel.textContent = this.laneNumber
    this.laneLabel.style.cssText = `
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 1px 4px;
      border-radius: 8px;
      border: 1px solid #ffcc00;
      z-index: 15;
      pointer-events: none;
      min-width: 12px;
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

    // 🚨 針對 MotionPath 動畫優化：使用統一朝向的圖片，讓 autoRotate 處理旋轉
    const vehicleConfigs = {
      large: {
        // MotionPath 模式：所有方向都使用向右的圖片，由 autoRotate 處理旋轉
        east: { width: 35, height: 20, image: '/images/car/lCar_right.png' },
        west: { width: 35, height: 20, image: '/images/car/lCar_right.png' },
        north: { width: 35, height: 20, image: '/images/car/lCar_right.png' },
        south: { width: 35, height: 20, image: '/images/car/lCar_right.png' },
      },
      small: {
        // MotionPath 模式：所有方向都使用向右的圖片，由 autoRotate 處理旋轉
        east: { width: 30, height: 18, image: '/images/car/sCar_right.png' },
        west: { width: 30, height: 18, image: '/images/car/sCar_right.png' },
        north: { width: 30, height: 18, image: '/images/car/sCar_right.png' },
        south: { width: 30, height: 18, image: '/images/car/sCar_right.png' },
      },
      motor: {
        // MotionPath 模式：所有方向都使用向右的圖片，由 autoRotate 處理旋轉
        east: { width: 25, height: 15, image: '/images/car/mCar_right.png' },
        west: { width: 25, height: 15, image: '/images/car/mCar_right.png' },
        north: { width: 25, height: 15, image: '/images/car/mCar_right.png' },
        south: { width: 25, height: 15, image: '/images/car/mCar_right.png' },
      },
    }
    return vehicleConfigs[this.vehicleType]?.[this.direction] || vehicleConfigs.large[this.direction]
  }

  // Strategy Pattern: 根據方向計算停止線位置的策略方法
  getStopLinePosition() {
    // Strategy Pattern: 每個方向都有不同的停止線計算策略
    // 使用中央參考矩形來統一計算停止線位置
    const centralRef = document.querySelector('.central-reference')
    if (!centralRef) return { x: null, y: null }

    const container = document.querySelector('.crossroad-area')
    if (!container) return { x: null, y: null }

    // 每次都重新獲取容器位置，以適應抽屜狀態變化
    const centralRect = centralRef.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // 計算中央矩形相對於容器的位置
    const centralX = centralRect.left - containerRect.left
    const centralY = centralRect.top - containerRect.top
    const centralWidth = centralRect.width
    const centralHeight = centralRect.height

    // 從配置中獲取各方向的偏移設定
    const offsets = stopLineConfig.directionOffsets

    // 根據方向計算停止線位置（基於中央矩形的邊緣和配置偏移）
    // Strategy Pattern: 不同方向使用不同的停止線定位策略
    if (this.direction === 'east') {
      return {
        x: centralX + offsets.east.offsetX,
        y: null,
      }
    } else if (this.direction === 'west') {
      return {
        x: centralX + centralWidth + offsets.west.offsetX,
        y: null,
      }
    } else if (this.direction === 'north') {
      return {
        x: null,
        y: centralY + centralHeight - offsets.north.offsetY,
      }
    } else if (this.direction === 'south') {
      return {
        x: null,
        y: centralY + offsets.south.offsetY,
      }
    }

    return { x: null, y: null }
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

    // 添加更詳細的邊界檢測調試信息
    if (isOutOfBounds && (this.id.endsWith('1') || Math.random() < 0.1)) {
      console.log(`🚗 [${this.id}] 邊界檢測詳情:`, {
        position: `(${position.x.toFixed(1)}, ${position.y.toFixed(1)})`,
        direction: this.direction,
        bounds: svgBounds,
        isOutOfBounds,
      })
    }

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
  checkStopLine() {
    // Template Method Pattern: 定義停止線檢查的標準流程
    const stopLine = this.getStopLinePosition() // 這裡會獲取實際的停止線位置

    if (!stopLine.x && !stopLine.y) return false

    // 使用車頭位置進行停止線檢測
    const vehicleHead = this.getVehicleHeadPosition()

    // 🚨 修正：設為0，要求第一台車精確到達停止線
    const sensitivity = 0

    // Strategy Pattern: 不同方向使用不同的停止線檢查策略
    if (this.direction === 'east') {
      // 車頭在右側，檢查車頭X座標是否到達或超過停止線
      return vehicleHead.x >= stopLine.x + sensitivity && !this.isAtStopLine
    } else if (this.direction === 'west') {
      // 車頭在左側，檢查車頭X座標是否到達或超過停止線
      return vehicleHead.x <= stopLine.x - sensitivity && !this.isAtStopLine
    } else if (this.direction === 'north') {
      // 車頭在上方，檢查車頭Y座標是否到達或超過停止線
      return vehicleHead.y <= stopLine.y - sensitivity && !this.isAtStopLine
    } else if (this.direction === 'south') {
      // 車頭在下方，檢查車頭Y座標是否到達或超過停止線
      return vehicleHead.y >= stopLine.y + sensitivity && !this.isAtStopLine
    }
    return false
  }

  // Template Method Pattern: 計算車輛到停止線距離的模板方法
  getDistanceToStopLine() {
    // Template Method Pattern: 定義距離計算的標準流程
    const stopLine = this.getStopLinePosition()
    if (!stopLine.x && !stopLine.y) return null

    const vehicleHead = this.getVehicleHeadPosition()

    // Strategy Pattern: 根據方向使用不同的距離計算策略
    if (this.direction === 'east') {
      // 東向：車頭到停止線的X軸距離
      return stopLine.x - vehicleHead.x
    } else if (this.direction === 'west') {
      // 西向：車頭到停止線的X軸距離
      return vehicleHead.x - stopLine.x
    } else if (this.direction === 'north') {
      // 北向：車頭到停止線的Y軸距離
      return vehicleHead.y - stopLine.y
    } else if (this.direction === 'south') {
      // 南向：車頭到停止線的Y軸距離
      return stopLine.y - vehicleHead.y
    }

    return null
  }

  // 檢查是否需要為紅燈減速或黃燈加速，同時考慮前方車輛距離
  checkTrafficLightSlowDown(trafficController) {
    if (this.hasPassedStopLine || this.waitingForGreen || this.isAtStopLine) {
      return null
    }

    const lightState = trafficController.getCurrentLightState(this.direction)
    if (lightState === 'green') {
      if (this.currentState === 'slowing_for_light' || this.currentState === 'accelerating_for_yellow') {
        // 如果之前在減速或黃燈加速，但燈變綠了，就恢復正常速度
        return { action: 'resume_from_slow' }
      }
      return null
    }

    const distanceToStopLine = this.getDistanceToStopLine()
    if (distanceToStopLine === null || distanceToStopLine <= 0) {
      return null
    }

    // 🚨 新增：黃燈加速邏輯
    if (lightState === 'yellow') {
      // 黃燈智能判斷：根據距離停止線的遠近決定加速通過還是減速停止
      const yellowAccelerateDistance = 100 // 黃燈加速判斷距離（調整為更保守）
      const yellowStopDistance = 40 // 黃燈停車判斷距離（調整為更安全）

      if (distanceToStopLine > yellowAccelerateDistance) {
        // 距離較遠：加速通過
        console.log(`🟡 [${this.id}] 黃燈加速通過！距離停止線: ${distanceToStopLine.toFixed(1)}px`)
        return {
          action: 'accelerate_for_yellow',
          targetSpeedRatio: 1.3, // 調整為130%的原始速度（更安全）
        }
      } else if (distanceToStopLine <= yellowStopDistance) {
        // 距離很近：急剎車停止
        const speedRatio = Math.max(0.05, (distanceToStopLine / yellowStopDistance) * 0.2)
        console.log(`🟡 [${this.id}] 黃燈距離太近，緊急停車！距離: ${distanceToStopLine.toFixed(1)}px`)
        return {
          action: 'slow_for_light',
          targetSpeedRatio: speedRatio,
        }
      } else {
        // 中等距離：判斷當前速度，快速車輛繼續加速，慢速車輛減速停止
        const currentSpeed = this.getCurrentSpeedRatio()
        if (currentSpeed > 0.7) {
          // 調整閾值為更保守的70%
          // 高速車輛：適度加速通過
          console.log(`🟡 [${this.id}] 黃燈高速適度加速通過！當前速度比例: ${currentSpeed.toFixed(2)}`)
          return {
            action: 'accelerate_for_yellow',
            targetSpeedRatio: 1.2, // 調整為120%的原始速度
          }
        } else {
          // 低速車輛：減速停止
          console.log(`🟡 [${this.id}] 黃燈低速減速停止！當前速度比例: ${currentSpeed.toFixed(2)}`)
          const speedRatio = Math.max(0.1, (distanceToStopLine / yellowAccelerateDistance) * 0.5)
          return {
            action: 'slow_for_light',
            targetSpeedRatio: speedRatio,
          }
        }
      }
    }

    // 移除紅燈時的緩速效果，車輛保持正常速度直到停止線
    if (lightState === 'red') {
      // 只有當車子檢查到應該停止時，才在 checkStopLine() 中處理停車邏輯
      // 不在這裡提前減速，避免緩速效果
      return null
    }

    return null
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
  isClosestToStopLine(allVehicles) {
    const stopLine = this.getStopLinePosition()
    if (!stopLine.x && !stopLine.y) return true

    const currentPosition = this.getCurrentPosition()
    let myDistanceToStopLine = 0

    // 計算當前車輛到停止線的距離
    if (this.direction === 'east') {
      myDistanceToStopLine = Math.max(0, stopLine.x - currentPosition.x)
    } else if (this.direction === 'west') {
      myDistanceToStopLine = Math.max(0, currentPosition.x - stopLine.x)
    } else if (this.direction === 'north') {
      myDistanceToStopLine = Math.max(0, currentPosition.y - stopLine.y)
    } else if (this.direction === 'south') {
      myDistanceToStopLine = Math.max(0, stopLine.y - currentPosition.y)
    }

    // 檢查同車道是否有更接近停止線的車輛
    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id || vehicle.direction !== this.direction || vehicle.laneNumber !== this.laneNumber)
        continue

      const otherPosition = vehicle.getCurrentPosition()
      let otherDistanceToStopLine = 0

      if (this.direction === 'east') {
        otherDistanceToStopLine = Math.max(0, stopLine.x - otherPosition.x)
      } else if (this.direction === 'west') {
        otherDistanceToStopLine = Math.max(0, otherPosition.x - stopLine.x)
      } else if (this.direction === 'north') {
        otherDistanceToStopLine = Math.max(0, otherPosition.y - stopLine.y)
      } else if (this.direction === 'south') {
        otherDistanceToStopLine = Math.max(0, stopLine.y - otherPosition.y)
      }

      // 如果有其他車輛更接近停止線，則當前車輛不是最前面的
      if (otherDistanceToStopLine < myDistanceToStopLine && otherDistanceToStopLine >= 0) {
        return false
      }
    }

    return true // 當前車輛是該車道最接近停止線的車
  }

  checkSimpleCollision(allVehicles) {
    // 跳過剛創建的車輛
    if (this.justCreated) {
      return null
    }

    const currentBox = this.getBoundingBox()
    const SAFE_GAP = 20 // 車輛間安全距離

    // 只檢查同方向的前方車輛
    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id || vehicle.direction !== this.direction) continue

      const otherBox = vehicle.getBoundingBox()
      let distance = 0
      let isFrontVehicle = false

      // 簡單方向檢測
      if (this.direction === 'east') {
        isFrontVehicle = otherBox.centerX > currentBox.centerX && Math.abs(otherBox.centerY - currentBox.centerY) < 30
        distance = isFrontVehicle ? otherBox.left - currentBox.right : 0
      } else if (this.direction === 'west') {
        isFrontVehicle = otherBox.centerX < currentBox.centerX && Math.abs(otherBox.centerY - currentBox.centerY) < 30
        distance = isFrontVehicle ? currentBox.left - otherBox.right : 0
      } else if (this.direction === 'north') {
        isFrontVehicle = otherBox.centerY < currentBox.centerY && Math.abs(otherBox.centerX - currentBox.centerX) < 30
        distance = isFrontVehicle ? currentBox.top - otherBox.bottom : 0
      } else if (this.direction === 'south') {
        isFrontVehicle = otherBox.centerY > currentBox.centerY && Math.abs(otherBox.centerX - currentBox.centerX) < 30
        distance = isFrontVehicle ? otherBox.top - currentBox.bottom : 0
      }

      if (isFrontVehicle && distance < SAFE_GAP && distance >= 0) {
        // 🚨 新增：檢查前方車輛是否在停止線等待
        const isAtStopLine = vehicle.isAtStopLine || vehicle.waitingForGreen

        return {
          shouldStop: true,
          vehicle: vehicle,
          distance: distance,
          frontVehicleAtStopLine: isAtStopLine, // 標記前方車輛是否在停止線
        }
      }
    }

    return null // 沒有碰撞威脅
  }

  // 🚨 移除：setDebouncedTimeScale 方法已不再需要，使用直接的 timeScale 設置

  // 🚨 新增：十字路口橫向碰撞檢測（防止車輛穿越）
  // 🚨【重寫】路口碰撞檢測 - 簡化版本，只保留5px間距檢測
  // 🚨 移除：不再檢測橫向碰撞，簡化系統
  // checkCrossDirectionCollision 已被移除，使用統一的 checkSimpleCollision

  // 🚨 移除：不再使用複雜的跟車模式，使用統一的停止/繼續邏輯
  // enterFollowingMode 和 exitFollowingMode 已被移除

  // State Pattern: 停止移動狀態控制方法
  stopMovement() {
    // State Pattern: 管理車輛從移動狀態轉換為等待狀態
    if (this.movementTimeline) {
      this.movementTimeline.pause()
      if (
        this.currentState !== 'waitingForVehicle' &&
        this.currentState !== 'waiting' &&
        this.currentState !== 'following'
      ) {
        this.currentState = 'waiting'
      }
    }
  }

  // 🚨 極簡化恢復移動方法
  resumeMovement(allVehicles = []) {
    if (this.movementTimeline && (this.currentState === 'waiting' || this.currentState === 'waitingForVehicle')) {
      const collision = this.checkSimpleCollision(allVehicles)

      if (!collision) {
        // 沒有前車，直接恢復移動
        this.movementTimeline.resume()
        this.currentState = 'moving'
        console.log(`🚗 [${this.id}] 前方無車輛，恢復移動`)
      } else {
        // 有前車在5px範圍內，繼續等待
        console.log(`🚗 [${this.id}] 前車距離: ${collision.distance.toFixed(1)}px，繼續等待`)
      }
    }
  }

  // Command Pattern + State Pattern: 強制恢復移動命令
  forceResumeMovement(allVehicles = []) {
    // Command Pattern: 將強制啟動封裝為可執行的命令
    // State Pattern: 強制狀態轉換，用於綠燈時的啟動
    if (this.movementTimeline) {
      // 🚦 綠燈啟動時重置停止線穩定狀態，允許正常行駛
      this.stopLineStabilized = false
      this.stopLineStabilizeTime = 0
      this.stopLineNoAdjustZone = false

      // 檢查前方車輛
      const collision = this.checkSimpleCollision(allVehicles)

      if (!collision) {
        // 立即啟動，不延遲（移除隨機延遲）
        if (this.waitingForGreen && this.movementTimeline) {
          // 如果 timeScale 為 0，需要恢復 timeScale
          if (this.movementTimeline.timeScale() === 0) {
            const targetTimeScale = this.originalTimeScale || 1
            gsap.to(this.movementTimeline, {
              timeScale: targetTimeScale,
              duration: 0.05, // 立即恢復，消除緩速
              ease: 'none',
              onComplete: () => {
                this.movementTimeline.resume()
                this.currentState = 'moving'
                this.waitingForGreen = false
                this.originalTimeScale = null
                console.log(`🟢 [${this.id}] 綠燈強制啟動完成`)
              },
            })
          } else {
            this.movementTimeline.resume()
            this.currentState = 'moving'
            this.waitingForGreen = false
            console.log(`🟢 [${this.id}] 綠燈立即啟動`)
          }
        }
      } else {
        console.log(`🟡 [${this.id}] 前方車輛太近，等待空間清理`)
      }
    }
  }

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

  // Static Method: 獲取指定方向和車道的路徑起始位置
  static getPathStartPosition(direction, laneNumber) {
    const pathId = `${direction}Lane${laneNumber}Straight`
    console.log(`🔍 查找路徑元素: #${pathId}`)
    const pathElement = document.querySelector(`#${pathId}`)

    if (!pathElement) {
      console.warn(`⚠️ 找不到路徑元素: #${pathId}`)
      return null
    }

    try {
      // 獲取路徑的起始點（t=0的位置）
      const startPoint = pathElement.getPointAtLength(0)
      console.log(`✅ 獲取路徑起始位置 ${pathId}:`, startPoint)

      // 根據 SVG viewBox="0 0 1400 1000" 座標系統返回位置
      return {
        x: startPoint.x,
        y: startPoint.y,
      }
    } catch (error) {
      console.error(`❌ 獲取路徑起始位置失敗: ${pathId}`, error)
      return null
    }
  }

  // Command Pattern + Observer Pattern: 使用 MotionPath 的移動命令（專注於往東路徑）
  moveAlongPath(trafficController, allVehicles = [], onVehicleOutOfBounds = null) {
    // Command Pattern: 將複雜的路徑移動邏輯封裝為可執行的命令
    return new Promise((resolve) => {
      // 🚨 新增：支援所有四個方向的 MotionPath 動畫
      console.log(`🚗 [${this.id}] ${this.direction}向車輛開始 MotionPath 動畫 - 車道: ${this.laneNumber}`)

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
          // 使用統一的動畫速度控制
          theoreticalTime *= Vehicle.timeMultiplier
          animationDuration = Math.max(3, Math.min(15, theoreticalTime)) // 調整時間範圍
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
          this.currentState = 'moving'
          this.waitingForGreen = false
          this.isAtStopLine = false
          this.hasPassedStopLine = false

          // Observer Pattern: 定期檢查機制，防止車輛卡住
          this.periodicCheckTimer = setInterval(() => {
            // 綠燈檢查邏輯（與原方法相同）
            if (this.waitingForGreen) {
              const currentLightState = trafficController.getCurrentLightState(this.direction)
              if (currentLightState === 'green') {
                if (this.movementTimeline.timeScale() === 0) {
                  this.waitForIntersectionClearance(allVehicles, () => {
                    const targetTimeScale = this.originalTimeScale || 1
                    gsap.to(this.movementTimeline, {
                      timeScale: targetTimeScale,
                      duration: 0.05, // 立即啟動，消除緩速
                      ease: 'none',
                      onComplete: () => {
                        this.movementTimeline.resume()
                        this.currentState = 'moving'
                        this.waitingForGreen = false
                        this.isAtStopLine = false
                        this.hasPassedStopLine = true
                        this.originalTimeScale = null
                      },
                    })
                  })
                } else {
                  this.waitForIntersectionClearance(allVehicles, () => {
                    this.forceResumeMovement(allVehicles)
                    this.isAtStopLine = false
                    this.hasPassedStopLine = true
                  })
                }
              }
            }

            // 🚨 簡化：只檢查是否可以恢復移動
            if (this.currentState === 'waitingForVehicle') {
              this.resumeMovement(allVehicles)
            }

            // 🚨 移除：複雜的跟隨模式檢查邏輯已被移除
          }, 1500) // 🚨 改善：縮短檢查間隔從2000ms到1500ms，讓車輛更快恢復

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
                console.log(`🚗 [${this.id}] 離開邊界，從碰撞檢測中移除`)
                onVehicleOutOfBounds(this.id)
                this.remove() // 🚨 強制移除 DOM
                return
              }

              // 🚨 簡化碰撞檢測系統 - 區分第一台車和後續車輛
              const shouldStop = this.checkSimpleCollision(allVehicles)
              const isFirstVehicle = this.isClosestToStopLine(allVehicles)

              if (shouldStop) {
                // 🚨 新增：特殊處理 - 如果是第一台車且前方車輛在停止線等待，則繼續前進到停止線
                if (isFirstVehicle && shouldStop.frontVehicleAtStopLine) {
                  // 第一台車：前方車輛在停止線等待，繼續前進到停止線
                  console.log(`🚗 [${this.id}] 第一台車，前方車輛在停止線等待，繼續前進到停止線`)
                  const currentTimeScale = this.movementTimeline.timeScale()
                  if (currentTimeScale < 1) {
                    this.movementTimeline.timeScale(1)
                    this.currentState = 'moving'
                  }
                } else {
                  // 後續車輛或第一台車遇到移動中的車輛：停止跟車
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'stopped'
                  console.log(`🛑 [${this.id}] ${isFirstVehicle ? '第一台車遇到移動車輛' : '後續車輛跟車'}，停止`)
                  return
                }
              } else {
                // 無碰撞風險，恢復正常速度
                const currentTimeScale = this.movementTimeline.timeScale()
                if (currentTimeScale < 1 && this.currentState === 'stopped') {
                  this.movementTimeline.timeScale(1)
                  this.currentState = 'moving'
                  console.log(`🚗 [${this.id}] 恢復正常速度`)
                }
              }

              // 紅燈減速或黃燈加速檢查（如果沒有碰撞風險的情況下）
              if (!shouldStop) {
                const slowDownInfo = this.checkTrafficLightSlowDown(trafficController)
                if (slowDownInfo) {
                  if (slowDownInfo.action === 'slow_for_light') {
                    this.currentState = 'slowing_for_light'
                    if (!this.originalTimeScale) {
                      this.originalTimeScale = this.movementTimeline.timeScale()
                    }
                    gsap.to(this.movementTimeline, {
                      timeScale: this.originalTimeScale * slowDownInfo.targetSpeedRatio,
                      duration: 0.05, // 幾乎立即的速度變化，消除緩速
                      ease: 'none',
                    })
                  } else if (slowDownInfo.action === 'accelerate_for_yellow') {
                    // 🚨 新增：黃燈加速邏輯
                    this.currentState = 'accelerating_for_yellow'
                    if (!this.originalTimeScale) {
                      this.originalTimeScale = this.movementTimeline.timeScale()
                    }
                    console.log(`🟡⚡ [${this.id}] 黃燈加速！目標速度比例: ${slowDownInfo.targetSpeedRatio}`)
                    gsap.to(this.movementTimeline, {
                      timeScale: this.originalTimeScale * slowDownInfo.targetSpeedRatio,
                      duration: 0.05, // 立即加速響應，消除緩速
                      ease: 'none',
                    })
                  } else if (slowDownInfo.action === 'resume_from_slow') {
                    this.currentState = 'moving'
                    if (this.originalTimeScale) {
                      gsap.to(this.movementTimeline, {
                        timeScale: this.originalTimeScale,
                        duration: 0.05, // 幾乎立即恢復正常速度
                        ease: 'none',
                      })
                      this.originalTimeScale = null
                    }
                  }
                }
              }

              // 等待前車的恢復檢查
              if (this.currentState === 'waitingForVehicle') {
                this.resumeMovement(allVehicles)
              }

              // 停止線檢查和紅綠燈控制流程（與原方法相同的邏輯）
              if (!this.hasPassedStopLine && this.checkStopLine() && !this.waitingForGreen && !this.isAtStopLine) {
                this.isAtStopLine = true
                const lightState = trafficController.getCurrentLightState(this.direction)

                if (lightState === 'red' || lightState === 'yellow') {
                  if (this.currentState === 'slowing_for_light') {
                    gsap.to(this.movementTimeline, {
                      timeScale: 0,
                      duration: 0.05, // 幾乎立即停車，消除停止線緩速
                      ease: 'none',
                      onComplete: () => {
                        this.stopMovement()
                        this.waitingForGreen = true
                      },
                    })
                  } else {
                    this.stopMovement()
                    this.waitingForGreen = true
                  }

                  // 添加燈號變化觀察者
                  const onLightChange = (direction, state) => {
                    if (direction === this.direction && state === 'green' && this.waitingForGreen) {
                      this.waitForIntersectionClearance(allVehicles, () => {
                        this.forceResumeMovement(allVehicles)
                        this.isAtStopLine = false
                        this.hasPassedStopLine = true
                      })
                      trafficController.removeObserver(onLightChange)
                    }
                  }

                  trafficController.addObserver(onLightChange)

                  // 超時機制
                  setTimeout(() => {
                    if (this.waitingForGreen && this.direction) {
                      const currentLightState = trafficController.getCurrentLightState(this.direction)
                      if (currentLightState === 'green') {
                        if (this.movementTimeline.timeScale() === 0) {
                          this.waitForIntersectionClearance(allVehicles, () => {
                            const targetTimeScale = this.originalTimeScale || 1
                            gsap.to(this.movementTimeline, {
                              timeScale: targetTimeScale,
                              duration: 0.05, // 立即啟動，消除緩速
                              ease: 'none',
                              onComplete: () => {
                                this.movementTimeline.resume()
                                this.currentState = 'moving'
                                this.waitingForGreen = false
                                this.isAtStopLine = false
                                this.hasPassedStopLine = true
                                this.originalTimeScale = null
                              },
                            })
                          })
                        } else {
                          this.waitForIntersectionClearance(allVehicles, () => {
                            this.forceResumeMovement(allVehicles)
                            this.isAtStopLine = false
                            this.hasPassedStopLine = true
                          })
                        }
                        trafficController.removeObserver(onLightChange)
                      }
                    }
                  }, 100) // 改為0.1秒超時，立即回應綠燈
                } else {
                  // 綠燈時直接通過
                  this.isAtStopLine = false
                  this.hasPassedStopLine = true
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
              console.log(`🚗 [${this.id}] 路徑動畫已完成`)

              // 🚨 立即移除機制：動畫完成時立刻從碰撞檢測中移除
              if (!hasBeenRemovedFromCollision && onVehicleOutOfBounds) {
                hasBeenRemovedFromCollision = true
                console.log(`🚗 [${this.id}] 動畫完成，立即從碰撞檢測中移除`)
                onVehicleOutOfBounds(this.id)
              }
              this.remove() // 🚨 動畫完成強制移除 DOM
              resolve()
            },
          })

          // 使用 MotionPathPlugin 創建路徑動畫 - 根據官方文件的建議語法
          console.log(`🚗 [${this.id}] 開始 MotionPath 動畫，路徑: #${this.getSvgPathId()}`)

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
        // 使用統一的動畫速度控制
        theoreticalTime *= Vehicle.timeMultiplier
        // 限制合理範圍
        animationDuration = Math.max(3, Math.min(15, theoreticalTime))
      }

      // Strategy Pattern: 使用延遲策略避免剛生成就被碰撞檢測影響
      setTimeout(() => {
        this.currentState = 'moving'
        this.targetX = finalTargetX
        this.targetY = finalTargetY

        // 重要：強制清除可能的等待狀態，確保新生成的車輛能夠開始移動
        this.waitingForGreen = false
        this.isAtStopLine = false
        this.hasPassedStopLine = false

        // Observer Pattern: 定期檢查機制，防止車輛卡住
        this.periodicCheckTimer = setInterval(() => {
          // 如果車輛在等待綠燈，但實際上是綠燈，則強制啟動
          if (this.waitingForGreen) {
            const currentLightState = trafficController.getCurrentLightState(this.direction)
            if (currentLightState === 'green') {
              // 檢查 timeScale，如果為 0 需要特殊處理
              if (this.movementTimeline.timeScale() === 0) {
                // 使用智能等待機制
                this.waitForIntersectionClearance(allVehicles, () => {
                  const targetTimeScale = this.originalTimeScale || 1
                  gsap.to(this.movementTimeline, {
                    timeScale: targetTimeScale,
                    duration: 0.05, // 立即啟動，消除緩速
                    ease: 'none',
                    onComplete: () => {
                      this.movementTimeline.resume()
                      this.currentState = 'moving'
                      this.waitingForGreen = false
                      this.isAtStopLine = false
                      this.hasPassedStopLine = true
                      this.originalTimeScale = null
                    },
                  })
                })
              } else {
                // 使用智能等待機制
                this.waitForIntersectionClearance(allVehicles, () => {
                  this.forceResumeMovement(allVehicles)
                  this.isAtStopLine = false
                  this.hasPassedStopLine = true
                })
              }
            }
          }

          // 🚨 簡化檢查：只處理等待車輛的恢復
          if (this.currentState === 'waitingForVehicle') {
            this.resumeMovement(allVehicles)
          }
        }, 100) // 改為每0.1秒檢查一次，快速回應綠燈

        // Template Method Pattern: 創建移動時間線模板
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

            // 🚨 極簡化碰撞檢測：只檢查5px間距，停止或繼續
            const collision = this.checkSimpleCollision(allVehicles)

            if (collision && collision.shouldStop) {
              // 前車太近，停止移動
              this.stopMovement()
              this.currentState = 'waitingForVehicle'
              console.log(`🛑 [${this.id}] 前車距離: ${collision.distance.toFixed(1)}px，停止移動`)
              return
            }

            // 處理紅燈減速或黃燈加速
            const slowDownInfo = this.checkTrafficLightSlowDown(trafficController)
            if (slowDownInfo) {
              if (slowDownInfo.action === 'slow_for_light') {
                this.currentState = 'slowing_for_light'
                if (!this.originalTimeScale) {
                  this.originalTimeScale = this.movementTimeline.timeScale()
                }
                gsap.to(this.movementTimeline, {
                  timeScale: this.originalTimeScale * slowDownInfo.targetSpeedRatio,
                  duration: 0.05, // 立即速度變化，消除緩速
                  ease: 'none',
                })
              } else if (slowDownInfo.action === 'accelerate_for_yellow') {
                this.currentState = 'accelerating_for_yellow'
                if (!this.originalTimeScale) {
                  this.originalTimeScale = this.movementTimeline.timeScale()
                }
                console.log(`🟡⚡ [${this.id}] 黃燈加速！目標速度比例: ${slowDownInfo.targetSpeedRatio}`)
                gsap.to(this.movementTimeline, {
                  timeScale: this.originalTimeScale * slowDownInfo.targetSpeedRatio,
                  duration: 0.05, // 立即加速響應，消除緩速
                  ease: 'none',
                })
              } else if (slowDownInfo.action === 'resume_from_slow') {
                this.currentState = 'moving'
                if (this.originalTimeScale) {
                  gsap.to(this.movementTimeline, {
                    timeScale: this.originalTimeScale,
                    duration: 0.05, // 幾乎立即恢復正常速度
                    ease: 'none',
                  })
                  this.originalTimeScale = null
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

              if (
                lightState === 'red' ||
                (lightState === 'yellow' && this.currentState !== 'accelerating_for_yellow')
              ) {
                // 🚨 修改：黃燈加速的車輛不應在此停下，讓它們通過
                // 如果正在減速，讓它平滑停止
                if (this.currentState === 'slowing_for_light') {
                  gsap.to(this.movementTimeline, {
                    timeScale: 0,
                    duration: 0.05, // 幾乎立即停車，消除停止線緩速
                    ease: 'none',
                    onComplete: () => {
                      this.stopMovement()
                      this.waitingForGreen = true
                    },
                  })
                } else {
                  this.stopMovement()
                  this.waitingForGreen = true
                }

                // Observer Pattern: 監聽紅綠燈變化的觀察者實現
                const onLightChange = (direction, state) => {
                  if (direction === this.direction && state === 'green' && this.waitingForGreen) {
                    // 智能等待：檢查路口是否安全
                    this.waitForIntersectionClearance(allVehicles, () => {
                      // 路口清空後才啟動
                      this.forceResumeMovement(allVehicles)
                      this.isAtStopLine = false
                      this.hasPassedStopLine = true
                    })

                    // 移除觀察者
                    trafficController.removeObserver(onLightChange)
                  }
                }

                // Observer Pattern: 添加觀察者
                trafficController.addObserver(onLightChange)

                // Strategy Pattern: 設置超時機制，防止觀察者失效
                setTimeout(() => {
                  if (this.waitingForGreen && this.direction) {
                    const currentLightState = trafficController.getCurrentLightState(this.direction)

                    if (currentLightState === 'green') {
                      // 檢查 timeScale，如果為 0 需要特殊處理
                      if (this.movementTimeline.timeScale() === 0) {
                        // 使用智能等待機制
                        this.waitForIntersectionClearance(allVehicles, () => {
                          const targetTimeScale = this.originalTimeScale || 1
                          gsap.to(this.movementTimeline, {
                            timeScale: targetTimeScale,
                            duration: 0.05, // 立即啟動，消除緩速
                            ease: 'none',
                            onComplete: () => {
                              this.movementTimeline.resume()
                              this.currentState = 'moving'
                              this.waitingForGreen = false
                              this.isAtStopLine = false
                              this.hasPassedStopLine = true
                              this.originalTimeScale = null
                            },
                          })
                        })
                      } else {
                        // 使用智能等待機制
                        this.waitForIntersectionClearance(allVehicles, () => {
                          this.forceResumeMovement(allVehicles)
                          this.isAtStopLine = false
                          this.hasPassedStopLine = true
                        })
                      }
                      trafficController.removeObserver(onLightChange)
                    }
                  }
                }, 1000) // 1秒後檢查
              } else if (lightState === 'yellow' && this.currentState === 'accelerating_for_yellow') {
                // 🚨 新增：黃燈加速車輛直接通過，不停在停止線
                console.log(`🟡⚡ [${this.id}] 黃燈加速車輛通過停止線`)
                this.isAtStopLine = false
                this.hasPassedStopLine = true
              } else {
                // 綠燈時直接通過，標記已通過停止線
                this.isAtStopLine = false
                this.hasPassedStopLine = true
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

  // Command Pattern: 淡出動畫命令
  fadeOut(duration = 1) {
    // Command Pattern: 將淡出動畫封裝為可執行的命令
    return gsap.to(this.element, {
      opacity: 0,
      scale: 0.8,
      duration: duration,
      ease: 'none',
    })
  }

  // 🚗 淡入效果 - 修改為立即顯示，不使用動畫
  // eslint-disable-next-line no-unused-vars
  fadeIn(duration = 1) {
    // 🚗 修改：立即設置為完全可見，不使用動畫
    return new Promise((resolve) => {
      if (!this.element) {
        resolve()
        return
      }

      gsap.set(this.element, { opacity: 1, scale: 1 })
      console.log(`🚗 [${this.id}] 車輛立即顯示`)
      resolve()
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

    // 移除DOM元素
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    // 🚨 強制釋放 DOM 參考，防止殘留
    this.element = null
    this.laneLabel = null
  }

  // 檢測路口是否有對向車輛（用於綠燈啟動前的安全檢查）
  checkIntersectionClearance(allVehicles) {
    const intersectionCenter = this.getIntersectionCenter()
    const intersectionRadius = 80 // 路口檢測半徑

    // 獲取垂直方向的車輛
    const perpendicularDirections = this.getPerpendicularDirections()

    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id) continue

      // 只檢查垂直方向的車輛
      if (!perpendicularDirections.includes(vehicle.direction)) continue

      const vehiclePos = vehicle.getCurrentPosition()
      const distanceToCenter = Math.sqrt(
        Math.pow(vehiclePos.x - intersectionCenter.x, 2) + Math.pow(vehiclePos.y - intersectionCenter.y, 2),
      )

      // 如果對向車輛在路口範圍內
      if (distanceToCenter < intersectionRadius) {
        return {
          hasConflictingVehicle: true,
          conflictingVehicle: vehicle,
          distance: distanceToCenter,
        }
      }
    }

    return { hasConflictingVehicle: false }
  }

  // 獲取垂直方向的方向數組
  getPerpendicularDirections() {
    if (this.direction === 'east' || this.direction === 'west') {
      return ['north', 'south']
    } else {
      return ['east', 'west']
    }
  }

  // 獲取路口中心點（如果之前沒有的話）
  getIntersectionCenter() {
    const centralRef = document.querySelector('.central-reference')
    if (!centralRef) return { x: 400, y: 300 } // 默認中心點

    const container = document.querySelector('.crossroad-area')
    if (!container) return { x: 400, y: 300 }

    const centralRect = centralRef.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    return {
      x: centralRect.left - containerRect.left + centralRect.width / 2,
      y: centralRect.top - containerRect.top + centralRect.height / 2,
    }
  }

  // 智能等待路口清空
  waitForIntersectionClearance(allVehicles, callback) {
    const checkClearance = () => {
      const clearanceResult = this.checkIntersectionClearance(allVehicles)

      if (!clearanceResult.hasConflictingVehicle) {
        // 🚨 修正：綠燈時立即執行，無延遲
        callback()
        return
      }

      // 還有對向車輛，繼續等待
      gsap.delayedCall(0.3, checkClearance) // 縮短檢查間隔到0.3秒
    }

    // 開始檢查
    checkClearance()
  }
}
