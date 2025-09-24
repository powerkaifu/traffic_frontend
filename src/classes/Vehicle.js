/**
 * Vehicle.js - 車輛實體類別
 */
/* eslint-disable */
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

    // 🎯 新增：智能碰撞檢查控制
    this.lastCollisionCheck = 0 // 上次碰撞檢查時間
    this.collisionCheckInterval = 100 // 碰撞檢查間隔（毫秒）
    this.criticalZoneThreshold = 50 // 危險區域閾值（像素）
    this.nearbyVehicleRange = 100 // 附近車輛檢查範圍（像素）
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
    if (stuckDuration > 10000) {
      // 🚨 修改：檢查當前燈號狀態，只有在綠燈但車輛仍停滯時才強制恢復
      const trafficController = window.trafficController
      if (trafficController && this.direction) {
        const currentLightState = trafficController.getCurrentLightState(this.direction)
        if (currentLightState === 'green' && !this.hasPassedStopLine) {
          console.log(`🚨 [${this.id}] 綠燈但停滯(${(stuckDuration / 1000).toFixed(1)}s)，執行強制恢復`)
          this.forceUnstuck()
        } else if (currentLightState === 'red' || currentLightState === 'allRed') {
          console.log(`🛑 [${this.id}] 紅燈等待停滯(${(stuckDuration / 1000).toFixed(1)}s)，這是正常的`)
          // 紅燈時停滯是正常的，重置停滯時間避免重複警告
          this.lastMovementTime = now
        }
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
        console.log(`🛑 [${this.id}] ${currentLightState}燈狀態，不執行強制恢復`)
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
          console.log(`🔧 [${this.id}] 綠燈時恢復時間軸移動到原始速度: ${targetTimeScale}`)
        }

        if (this.movementTimeline.paused()) {
          this.movementTimeline.resume()
          console.log(`🔧 [${this.id}] 綠燈時恢復暫停的動畫`)
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

    // 🚨 修正：在到達停止線前就檢測，讓車輛有足夠時間停車
    const sensitivity = 10 // 正值表示在停止線前10px就檢測

    // Strategy Pattern: 不同方向使用不同的停止線檢查策略
    if (this.direction === 'east') {
      // 車頭在右側，檢查車頭X座標是否接近停止線
      return vehicleHead.x >= stopLine.x - sensitivity && !this.isAtStopLine
    } else if (this.direction === 'west') {
      // 車頭在左側，檢查車頭X座標是否接近停止線
      return vehicleHead.x <= stopLine.x + sensitivity && !this.isAtStopLine
    } else if (this.direction === 'north') {
      // 車頭在上方，檢查車頭Y座標是否接近停止線
      return vehicleHead.y <= stopLine.y + sensitivity && !this.isAtStopLine
    } else if (this.direction === 'south') {
      // 車頭在下方，檢查車頭Y座標是否接近停止線
      return vehicleHead.y >= stopLine.y - sensitivity && !this.isAtStopLine
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

  // 簡化交通燈檢查：只處理綠燈通行和紅燈停止
  checkTrafficLightSlowDown(trafficController) {
    if (this.hasPassedStopLine || this.waitingForGreen || this.isAtStopLine) {
      return null
    }

    const lightState = trafficController.getCurrentLightState(this.direction)

    // 綠燈：恢復正常速度（如果之前在減速）
    if (lightState === 'green') {
      if (this.currentState === 'slowing_for_light' || this.currentState === 'slowing_for_red') {
        return { action: 'resume_from_slow' }
      }
      return null
    }

    // 紅燈或黃燈：準備停車，但不提前減速
    // 讓車輛保持正常速度直到停止線，然後直接停止
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

  // 🎯 新增：獲取附近車輛，優化檢查範圍
  getNearbyVehicles(allVehicles) {
    const currentBox = this.getBoundingBox()
    const nearbyVehicles = []

    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id || vehicle.direction !== this.direction) continue

      const otherBox = vehicle.getBoundingBox()
      let distance = 0
      let isInRange = false

      // 根據方向計算是否在檢查範圍內
      switch (this.direction) {
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

  // 🎯 新增：判斷是否在危險區域
  isInCriticalZone() {
    // 檢查是否接近停止線
    const distanceToStopLine = this.getDistanceToStopLine()
    const nearStopLine = distanceToStopLine !== null && Math.abs(distanceToStopLine) < this.criticalZoneThreshold

    // 檢查移動狀態
    const isMoving = this.movementTimeline && this.movementTimeline.timeScale() > 0 && !this.movementTimeline.paused()

    return nearStopLine || isMoving || this.currentState === 'moving'
  }

  // 🎯 新增：智能碰撞檢查
  smartCollisionCheck(allVehicles) {
    const currentTime = Date.now()
    const timeSinceLastCheck = currentTime - this.lastCollisionCheck

    // 智能檢查策略
    const shouldCheck =
      timeSinceLastCheck > this.collisionCheckInterval || // 定期檢查
      this.isInCriticalZone() || // 危險區域
      this.currentState === 'moving' // 移動狀態

    if (!shouldCheck) {
      return null // 跳過檢查，節省性能
    }

    this.lastCollisionCheck = currentTime

    // 只檢查附近車輛，而不是所有車輛
    const nearbyVehicles = this.getNearbyVehicles(allVehicles)

    if (nearbyVehicles.length === 0) {
      return null // 附近沒有車輛，節省性能
    }

    // 使用原有的碰撞檢查邏輯，但只檢查附近車輛
    return this.performDetailedCollisionCheck(nearbyVehicles)
  }

  // 🎯 新增：詳細碰撞檢查（從原 checkSimpleCollision 分離出來）
  performDetailedCollisionCheck(vehicles) {
    // 跳過剛創建的車輛
    if (this.justCreated) {
      return null
    }

    const currentBox = this.getBoundingBox()
    const currentPos = this.getCurrentPosition()

    // 🎯 參考 c24a1ff commit 的距離系統
    const isJustStartedMoving =
      this.currentState === 'moving' &&
      this.movementStartTime &&
      Date.now() - new Date(this.movementStartTime).getTime() < 2000

    const safeDistance = isJustStartedMoving ? 8 : 15 // 安全距離
    const stopDistance = isJustStartedMoving ? 5 : 10 // 停止距離 (回復到歷史版本的 5-10px)

    // 根據車輛狀態調整距離
    let adjustedSafeDistance = safeDistance
    let adjustedStopDistance = stopDistance

    if (this.currentState === 'slowing_for_light' || this.waitingForGreen) {
      adjustedSafeDistance = safeDistance * 1.5
      adjustedStopDistance = stopDistance * 1.5
    }

    for (let vehicle of vehicles) {
      if (!vehicle.element || !vehicle.element.parentNode) continue

      const otherBox = vehicle.getBoundingBox()
      const otherPos = vehicle.getCurrentPosition()

      let inSameLane = false
      let isFront = false
      let distance = 0

      // 精確的方向和距離計算
      if (this.direction === 'east') {
        inSameLane = Math.abs(currentPos.y - otherPos.y) < 25
        isFront = otherBox.left > currentBox.right
        distance = isFront ? otherBox.left - currentBox.right : 0
        // 調試信息：東向車輛距離計算
        if (isFront && distance < 10) {
          console.log(
            `🚗 [${this.id}] 東向距離檢測: 前車${vehicle.id}, 距離=${distance.toFixed(1)}px, 當前車右邊=${currentBox.right.toFixed(1)}, 前車左邊=${otherBox.left.toFixed(1)}`,
          )
        }
      } else if (this.direction === 'west') {
        inSameLane = Math.abs(currentPos.y - otherPos.y) < 25
        isFront = otherBox.right < currentBox.left
        distance = isFront ? currentBox.left - otherBox.right : 0
        // 調試信息：西向車輛距離計算
        if (isFront && distance < 10) {
          console.log(
            `🚗 [${this.id}] 西向距離檢測: 前車${vehicle.id}, 距離=${distance.toFixed(1)}px, 當前車左邊=${currentBox.left.toFixed(1)}, 前車右邊=${otherBox.right.toFixed(1)}`,
          )
        }
      } else if (this.direction === 'north') {
        inSameLane = Math.abs(currentPos.x - otherPos.x) < 25
        isFront = otherBox.bottom < currentBox.top
        distance = isFront ? currentBox.top - otherBox.bottom : 0
      } else if (this.direction === 'south') {
        inSameLane = Math.abs(currentPos.x - otherPos.x) < 25
        isFront = otherBox.top > currentBox.bottom
        distance = isFront ? otherBox.top - currentBox.bottom : 0
      }

      // 檢查重疊
      let isOverlapping = false
      if (this.direction === 'east' || this.direction === 'west') {
        isOverlapping = !(currentBox.right <= otherBox.left || currentBox.left >= otherBox.right) && inSameLane
      } else {
        isOverlapping = !(currentBox.bottom <= otherBox.top || currentBox.top >= otherBox.bottom) && inSameLane
      }

      if (isOverlapping) {
        return {
          vehicle: vehicle,
          distance: 0,
          shouldStop: true,
          shouldFollow: false,
          followingSpeed: null,
          isOverlapping: true,
        }
      }

      // 檢查是否在前方且距離需要處理
      if (inSameLane && isFront && distance < adjustedSafeDistance) {
        // 🎯 嚴格的停車條件：距離小於等於停車距離時必須停止
        if (distance <= adjustedStopDistance) {
          return {
            vehicle: vehicle,
            distance: distance,
            shouldStop: true,
            shouldFollow: false,
            followingSpeed: null,
            isOverlapping: false,
          }
        }

        // 🎯 參考 c24a1ff commit：計算跟車理想距離
        const followingDistance = adjustedSafeDistance * 0.6 // 歷史版本的跟車距離
        const shouldFollow = distance > adjustedStopDistance && distance <= followingDistance

        return {
          vehicle: vehicle,
          distance: distance,
          shouldStop: false, // 在跟車範圍內不需要完全停止
          shouldFollow: shouldFollow,
          followingSpeed: shouldFollow ? this.calculateFollowingSpeed(vehicle, distance, followingDistance) : null,
          frontVehicleIsMoving: this.isFrontVehicleMoving(vehicle),
          frontVehicleAtStopLine: this.isFrontVehicleAtStopLine(vehicle),
          isOverlapping: false,
        }
      }
    }

    return null // 沒有碰撞威脅
  }

  checkSimpleCollision(allVehicles) {
    // 🎯 使用智能碰撞檢查，優化性能
    return this.smartCollisionCheck(allVehicles)
  }

  // 🚨 移除：setDebouncedTimeScale 方法已不再需要，使用直接的 timeScale 設置

  // 🚨 新增：十字路口橫向碰撞檢測（防止車輛穿越）
  // 🚨【重寫】路口碰撞檢測 - 簡化版本，只保留5px間距檢測
  // 🚨 移除：不再檢測橫向碰撞，簡化系統
  // checkCrossDirectionCollision 已被移除，使用統一的 checkSimpleCollision

  // 🚨 移除：不再使用複雜的跟車模式，使用統一的停止/繼續邏輯
  // enterFollowingMode 和 exitFollowingMode 已被移除

  // 🎯【新增】跟車模式系統（基於歷史版本優化）
  enterFollowingMode(targetSpeed) {
    if (!this.movementTimeline) return

    // 避免重複設置相同的跟車速度
    if (
      this.currentState === 'following' &&
      Math.abs(this.movementTimeline.timeScale() * this.initialSpeed - targetSpeed) < 2
    ) {
      return
    }

    this.currentState = 'following'

    // 計算目標timeScale，基於初始速度和目標速度的比例
    const baseTimeScale = this.originalTimeScale || 1
    const targetTimeScale = (targetSpeed / this.initialSpeed) * baseTimeScale

    // 平滑調整到目標速度
    gsap.to(this.movementTimeline, {
      timeScale: Math.max(0.1, targetTimeScale), // 最低timeScale為0.1
      duration: 0.5,
      ease: 'power2.out',
    })

    console.log(`🚗 [${this.id}] 進入跟車模式，目標速度: ${targetSpeed}km/h`)
  }

  // 退出跟車模式恢復正常速度
  exitFollowingMode() {
    if (!this.movementTimeline || this.currentState !== 'following') return

    this.currentState = 'moving'
    const targetTimeScale = this.originalTimeScale || 1

    gsap.to(this.movementTimeline, {
      timeScale: targetTimeScale,
      duration: 0.3,
      ease: 'power2.inOut',
    })

    console.log(`🚗 [${this.id}] 退出跟車模式，恢復正常速度`)
  }

  // 🎯 智能跟車速度計算（歷史版本邏輯）
  calculateFollowingSpeed(frontVehicle, distance, idealDistance) {
    let frontVehicleSpeed = frontVehicle.currentSpeed || frontVehicle.initialSpeed || this.initialSpeed

    // 🎯 參考 c24a1ff commit：前車狀態更精確判斷
    if (
      frontVehicle.currentState === 'waiting' ||
      frontVehicle.currentState === 'waitingForVehicle' ||
      frontVehicle.currentState === 'stopped' ||
      frontVehicle.waitingForGreen ||
      (frontVehicle.movementTimeline && frontVehicle.movementTimeline.timeScale() < 0.1)
    ) {
      return 0
    }

    // 🎯 歷史版本邏輯：更緊密的跟車距離控制
    const distanceFactor = Math.min(1, distance / idealDistance)

    // 跟車速度略低於前方車輛，避免追尾
    const baseFollowingSpeed = Math.min(frontVehicleSpeed * 0.9, this.initialSpeed)

    // 距離越近，速度越慢，但保持更緊密的跟車
    const adjustedSpeed = baseFollowingSpeed * Math.max(0.3, distanceFactor)

    // 🎯 改進：允許更低的最低速度以實現緊密排隊
    return Math.max(adjustedSpeed, this.initialSpeed * 0.1)
  }

  // 🎯 新增：判斷前方車輛是否在移動
  isFrontVehicleMoving(frontVehicle) {
    return (
      frontVehicle.currentState === 'moving' ||
      frontVehicle.currentState === 'following' ||
      (frontVehicle.movementTimeline && frontVehicle.movementTimeline.timeScale() > 0.1)
    )
  }

  // 🎯 新增：判斷前方車輛是否在停止線等待
  isFrontVehicleAtStopLine(frontVehicle) {
    return frontVehicle.isAtStopLine || frontVehicle.waitingForGreen
  }

  // State Pattern: 停止移動狀態控制方法
  stopMovement() {
    // State Pattern: 管理車輛從移動狀態轉換為等待狀態
    if (this.movementTimeline) {
      // 🚨 精確停車：確保車頭剛好在停止線上
      const stopLine = this.getStopLinePosition()
      const vehicleHead = this.getVehicleHeadPosition()

      if (stopLine && (stopLine.x || stopLine.y)) {
        // 計算需要微調的距離
        let adjustDistance = 0

        if (this.direction === 'east') {
          // 東向：車頭應該停在停止線的X座標上
          adjustDistance = vehicleHead.x - stopLine.x
        } else if (this.direction === 'west') {
          // 西向：車頭應該停在停止線的X座標上
          adjustDistance = stopLine.x - vehicleHead.x
        } else if (this.direction === 'north') {
          // 北向：車頭應該停在停止線的Y座標上
          adjustDistance = stopLine.y - vehicleHead.y
        } else if (this.direction === 'south') {
          // 南向：車頭應該停在停止線的Y座標上
          adjustDistance = vehicleHead.y - stopLine.y
        }

        // 如果超過停止線超過5px，需要微調回來
        if (adjustDistance > 5) {
          console.log(`🚗 [${this.id}] 停車位置微調: ${adjustDistance.toFixed(1)}px`)

          // 計算需要倒退的進度
          const currentProgress = this.movementTimeline.progress()
          const totalDistance = 300 // 假設路徑總長度為300px
          const adjustRatio = adjustDistance / totalDistance
          const newProgress = Math.max(0, currentProgress - adjustRatio)

          // 微調到正確位置
          this.movementTimeline.progress(newProgress)
        }
      }

      this.movementTimeline.pause()
      if (this.currentState !== 'waitingForVehicle' && this.currentState !== 'waiting') {
        this.currentState = 'waiting'
      }
    }
  }

  // 🚨 極簡化恢復移動方法
  // 🚨 基於距離的平滑恢復移動
  resumeMovement(allVehicles = []) {
    if (
      this.movementTimeline &&
      (this.currentState === 'waiting' || this.currentState === 'waitingForVehicle' || this.currentState === 'slowing')
    ) {
      const collision = this.checkSimpleCollision(allVehicles)

      if (!collision) {
        // 沒有前車，平滑恢復到正常速度
        gsap.to(this.movementTimeline, {
          timeScale: 1,
          duration: 0.5,
          ease: 'power2.out',
        })
        this.currentState = 'moving'
        console.log(`🚗 [${this.id}] 前方無車輛，平滑恢復移動`)
      } else {
        // 有前車，根據距離調整速度
        const distance = collision.distance
        const requiredGap = collision.requiredGap || 5

        let targetSpeed
        if (distance <= requiredGap * 0.3) {
          targetSpeed = 0 // 完全停止
        } else if (distance <= requiredGap * 0.6) {
          targetSpeed = 0.2 // 大幅減速
        } else if (distance <= requiredGap * 0.8) {
          targetSpeed = 0.5 // 適度減速
        } else {
          targetSpeed = 0.8 // 可以較快移動
        }

        gsap.to(this.movementTimeline, {
          timeScale: targetSpeed,
          duration: 0.3,
          ease: 'power2.out',
        })

        console.log(`🚗 [${this.id}] 前車距離: ${distance.toFixed(1)}px，調整速度至${targetSpeed}`)
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
                console.log(`🚗 [${this.id}] 離開邊界，從碰撞檢測中移除`)
                onVehicleOutOfBounds(this.id)
                // 修復：避免車輛突然消失，讓動畫自然完成
                return
              }

              // 🎯【升級】智能碰撞處理 + 跟車模式
              const shouldStop = this.checkSimpleCollision(allVehicles)
              const isFirstVehicle = this.isClosestToStopLine(allVehicles)

              if (shouldStop) {
                // 🎯 檢查是否應該啟用跟車模式
                if (shouldStop.shouldFollow && shouldStop.followingSpeed !== null) {
                  this.enterFollowingMode(shouldStop.followingSpeed)
                  return
                }

                const distance = shouldStop.distance
                const requiredGap = shouldStop.requiredGap || 5

                // 基於距離的漸進式速度控制
                console.log(`🚗 [${this.id}] 碰撞檢測: 距離${distance.toFixed(1)}px, 需求${requiredGap}px`)

                // 綠燈跟車邏輯：如果是綠燈且前車正在移動，根據距離調整速度
                const currentLightState = trafficController.getCurrentLightState(this.direction)

                if (
                  currentLightState === 'green' &&
                  !this.waitingForGreen &&
                  shouldStop.frontVehicleIsMoving &&
                  this.movementTimeline
                ) {
                  // 距離感知速度控制 - 使用與碰撞檢測相同的停止距離
                  let targetSpeed
                  const isJustStartedMoving =
                    this.currentState === 'moving' &&
                    this.movementStartTime &&
                    Date.now() - new Date(this.movementStartTime).getTime() < 2000
                  const stopDistance = isJustStartedMoving ? 5 : 10 // 與 performDetailedCollisionCheck 一致

                  if (distance <= stopDistance) {
                    // 達到停止距離：完全停止
                    targetSpeed = 0
                    console.log(`🛑 [${this.id}] 達到停止距離 ${distance.toFixed(1)}px ≤ ${stopDistance}px，完全停止`)
                  } else if (distance <= requiredGap * 0.5) {
                    // 距離太近：大幅減速
                    targetSpeed = 0.2
                  } else if (distance <= requiredGap * 0.8) {
                    // 距離適中：適度速度
                    targetSpeed = 0.5
                  } else if (distance <= requiredGap * 1.2) {
                    // 距離接近理想：接近正常速度
                    targetSpeed = 0.8
                  } else {
                    // 距離充足：正常速度
                    targetSpeed = 1.0
                  }

                  // 平滑調整速度，包括停止狀態
                  if (targetSpeed === 0) {
                    // 完全停止
                    this.movementTimeline.timeScale(0)
                    this.currentState = 'stopped'
                  } else {
                    // 調整速度
                    gsap.to(this.movementTimeline, {
                      timeScale: targetSpeed,
                      duration: 0.3,
                      ease: 'power2.out',
                    })
                    this.currentState = 'following'
                  }

                  console.log(`🟢🚗 [${this.id}] 綠燈距離感知跟車：距離${distance.toFixed(1)}px → 速度${targetSpeed}`)
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
                    console.log(`🚗 [${this.id}] 綠燈時第一台車，前方車輛在停止線等待，繼續前進到停止線`)
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
                  console.log(`🛑 [${this.id}] ${isFirstVehicle ? '第一台車遇到停止車輛' : '後續車輛跟車停止'}`)
                  return
                }
              } else if (this.movementTimeline) {
                // 🎯 新增：退出跟車模式
                if (this.currentState === 'following') {
                  this.exitFollowingMode()
                }

                // 無碰撞風險時，平滑恢復到正常速度
                const currentTimeScale = this.movementTimeline.timeScale()
                if (currentTimeScale < 1) {
                  // 檢查當前燈號狀態，只有綠燈時才恢復移動
                  const currentLightState = trafficController.getCurrentLightState(this.direction)
                  if (currentLightState === 'green') {
                    // 平滑恢復到正常速度，避免突然加速
                    gsap.to(this.movementTimeline, {
                      timeScale: 1,
                      duration: 0.5,
                      ease: 'power2.out',
                    })
                    this.currentState = 'moving'
                  }
                }
              }

              // 簡化紅綠燈檢查 - 只處理綠燈恢復
              if (!shouldStop) {
                const slowDownInfo = this.checkTrafficLightSlowDown(trafficController)
                if (slowDownInfo && slowDownInfo.action === 'resume_from_slow') {
                  this.currentState = 'moving'
                  if (this.originalTimeScale) {
                    gsap.to(this.movementTimeline, {
                      timeScale: this.originalTimeScale,
                      duration: 0.05,
                      ease: 'none',
                    })
                    this.originalTimeScale = null
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

                if (lightState === 'red' || lightState === 'yellow' || lightState === 'allRed') {
                  if (this.currentState === 'slowing_for_light' || this.currentState === 'slowing_for_red') {
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
                  // � 移除手動觀察者：讓 directTrafficLightResponse 統一處理燈號變化
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

            // 🚨 統一間距碰撞檢測：檢查10px統一間距
            const collision = this.checkSimpleCollision(allVehicles)

            if (collision && collision.shouldStop) {
              const distance = collision.distance
              const requiredGap = collision.requiredGap || 5

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
                duration: 0.3,
                ease: 'power2.out',
              })

              this.currentState = targetSpeed === 0 ? 'waitingForVehicle' : 'slowing'
              console.log(`🛑 [${this.id}] 前車距離: ${distance.toFixed(1)}px，調整速度至${targetSpeed}`)
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

              if (lightState === 'red' || lightState === 'allRed' || lightState === 'yellow') {
                // 如果正在減速，讓它平滑停止
                if (this.currentState === 'slowing_for_light' || this.currentState === 'slowing_for_red') {
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

                // 🚨 移除重複的觀察者邏輯，讓 directTrafficLightResponse 處理狀態變化

                //  移除超時機制：讓車輛完全依賴 directTrafficLightResponse 和燈號狀態
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

  // 🚨 新增：綠燈跟車檢查
  // 🚨 新增：簡化直接燈號響應邏輯
  // 🎯【恢復歷史版本】等待路口清空機制 - 實現自然的綠燈起步延遲
  waitForIntersectionClearance(allVehicles, callback) {
    const checkClearance = () => {
      const clearanceResult = this.checkIntersectionClearance(allVehicles)

      if (!clearanceResult.hasConflictingVehicle) {
        // 路口清空，但增加隨機延遲模擬真實起步反應
        const randomDelay = 0.5 + Math.random() * 1.0 // 0.5-1.5秒隨機延遲
        console.log(`🚦 [${this.id}] 路口清空，${randomDelay.toFixed(1)}秒後起步`)
        gsap.delayedCall(randomDelay, callback)
        return
      }

      // 仍有衝突車輛，繼續等待
      gsap.delayedCall(0.5, checkClearance) // 每0.5秒重新檢查
    }

    // 開始檢查
    checkClearance()
  }

  // 🎯【恢復歷史版本】檢查路口是否有衝突車輛（橫向車道）
  checkIntersectionClearance(allVehicles) {
    const intersectionCenter = this.getIntersectionCenter()
    const intersectionRadius = 80 // 路口檢查半徑

    // 取得垂直方向
    const perpendicularDirections = this.getPerpendicularDirections()

    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id) continue

      // 只檢查垂直方向的車輛
      if (!perpendicularDirections.includes(vehicle.direction)) continue

      const vehiclePos = vehicle.getCurrentPosition()
      const distanceToCenter = Math.sqrt(
        Math.pow(vehiclePos.x - intersectionCenter.x, 2) + Math.pow(vehiclePos.y - intersectionCenter.y, 2),
      )

      // 如果有車輛在路口內
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

  // 🎯【恢復歷史版本】取得垂直方向
  getPerpendicularDirections() {
    if (this.direction === 'east' || this.direction === 'west') {
      return ['north', 'south']
    } else {
      return ['east', 'west']
    }
  }

  // 🎯【恢復歷史版本】取得路口中央座標（基於UI中央參考點）
  getIntersectionCenter() {
    const centralRef = document.querySelector('.central-reference')
    if (!centralRef) return { x: 400, y: 300 } // 預設中央座標
    const container = document.querySelector('.crossroad-area')
    if (!container) return { x: 400, y: 300 }

    const centralRect = centralRef.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    return {
      x: centralRect.left - containerRect.left + centralRect.width / 2,
      y: centralRect.top - containerRect.top + centralRect.height / 2,
    }
  }

  directTrafficLightResponse(trafficController) {
    if (!this.direction || !trafficController || !this.movementTimeline) return

    const currentLightState = trafficController.getCurrentLightState(this.direction)

    // 🔴 紅燈：不在此處直接停車，讓移動邏輯中的停止線檢查來處理紅燈停車
    // 這樣可確保車輛會前進到停止線才停，而不是立即原地停車

    // 🟢 綠燈：使用路口清空機制實現自然起步延遲
    if (currentLightState === 'green') {
      // 檢查所有可能需要啟動的狀態
      const needsToStart =
        this.waitingForGreen || // 等待綠燈狀態
        this.movementTimeline.timeScale() === 0 || // 時間軸停止
        this.currentState === 'waiting' || // 等待狀態
        this.currentState === 'stopped' || // 停止狀態
        this.currentState === 'waitingForVehicle' || // 等待前車狀態
        this.movementTimeline.paused() // 時間軸暫停

      if (needsToStart) {
        // 🎯 新增：使用路口清空等待機制，模擬真實綠燈起步延遲
        console.log(`�🚦 [${this.id}] 綠燈檢測，等待路口清空並準備起步...`)

        // 檢查所有車輛以決定起步時機
        const allVehicles = window.liveVehicles || []

        this.waitForIntersectionClearance(allVehicles, () => {
          // 安全檢查：確保時間軸仍然存在且燈號仍為綠燈
          if (this.movementTimeline && trafficController.getCurrentLightState(this.direction) === 'green') {
            // 平滑恢復移動
            gsap.to(this.movementTimeline, {
              timeScale: this.originalTimeScale || 1,
              duration: 0.3,
              ease: 'power2.inOut',
              onComplete: () => {
                this.movementTimeline.resume()
                this.waitingForGreen = false
                this.isAtStopLine = false
                this.hasPassedStopLine = true
                this.currentState = 'moving'
                this.originalTimeScale = null
              },
            })
            console.log(`🟢🚦 [${this.id}] 綠燈安全起步 (路口清空確認)`)
          }
        })
      }
    }
  }

  // 🚨 移除 checkGreenLightFollowing 方法 - 功能已被 directTrafficLightResponse 替代且未被使用

  // 🚨 移除 enforceTrafficSignalCompliance 方法 - 功能已被 directTrafficLightResponse 替代且未被使用
}
