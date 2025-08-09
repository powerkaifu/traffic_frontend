/**
 * Vehicle.js - 車輛實體類別
 */
import { gsap } from 'gsap'

export default class Vehicle {
  constructor(x, y, direction = 'east', vehicleType = 'large', laneNumber = 1) {
    // Factory Pattern: 根據不同參數創建不同類型的車輛實例
    this.direction = direction
    this.vehicleType = vehicleType // 車輛類型（motor, small, large）
    this.laneNumber = laneNumber // 車道編號

    // State Pattern: 定義車輛的各種狀態
    this.currentState = 'waiting' // 初始狀態
    this.movementTimeline = null
    this.isAtStopLine = false
    this.waitingForGreen = false
    this.hasPassedStopLine = false // 標記是否已經通過停止線
    this.periodicCheckTimer = null // 定期檢查定時器
    this.containerPosition = null // 記錄容器位置，用於檢測佈局變化
    this.justCreated = true // 新增：標記車輛剛創建，避免立即檢測碰撞

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

    // Composite Pattern: 設置車輛的初始視覺屬性
    gsap.set(this.element, {
      x: x,
      y: y,
      opacity: 0, // 初始設為透明
      scale: 0.5, // 初始設為縮小
    })

    // 創建車道編號標籤
    this.createLaneNumberLabel()

    // Observer Pattern: 通知交通控制器車輛生成事件
    this.notifyTrafficController()

    // Strategy Pattern: 使用延遲策略避免剛生成就被卡住
    setTimeout(() => {
      this.justCreated = false
    }, 1000) // 增加到1000毫秒，確保車輛有足夠時間啟動移動
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
      window.trafficController.updateVehicleData(this.direction, mappedType)
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
    const speedRanges = {
      large: { min: 25, max: 35 }, // km/h (降低速度)
      small: { min: 30, max: 45 }, // km/h (降低速度)
      motor: { min: 35, max: 60 }, // km/h (降低最高速度)
    }

    const range = speedRanges[this.vehicleType] || speedRanges.small
    const randomSpeed = range.min + Math.random() * (range.max - range.min)
    return Math.round(randomSpeed)
  }

  // Template Method Pattern: 計算動畫持續時間的模板方法
  calculateAnimationDuration(distance = 800) {
    // Template Method Pattern: 定義計算動畫時間的標準流程
    // 假設路口通過距離約 800 像素
    const speed = this.generateRandomSpeed() // km/h
    const speedMs = (speed * 1000) / 3600 // 轉換為 m/s

    // 假設 100 像素 = 15 米（調整比例尺，讓距離感更真實）
    const realDistance = (distance / 100) * 15 // 轉換為實際距離（米）

    // 計算理論時間（秒）
    const theoreticalTime = realDistance / speedMs

    // 增加動畫持續時間倍數，讓車輛移動更自然
    const timeMultiplier = 2.5 // 將時間增加2.5倍，讓動畫更慢更自然
    const adjustedTheoretical = theoreticalTime * timeMultiplier

    // 為了視覺效果，將時間控制在合理範圍內（7-24秒，調快1秒）
    const minTime = 7 // 最短7秒
    const maxTime = 24 // 最長24秒
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
      transform: translate(-50%, -50%);
    `
    return div
  }

  // Composite Pattern: 創建車道編號標籤組件
  createLaneNumberLabel() {
    // Composite Pattern: 為車輛添加子組件（標籤）
    const label = document.createElement('div')
    label.className = 'vehicle-lane-label' // 改為 vehicle 類名
    label.textContent = this.laneNumber

    // Strategy Pattern: 根據車輛方向使用不同的標籤定位策略
    let labelPosition = ''
    if (this.direction === 'north') {
      // 北向：標籤放在車輛尾部（下方）
      labelPosition = `
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 2px;
      `
    } else if (this.direction === 'south') {
      // 南向：標籤放在車輛尾部（上方）
      labelPosition = `
        top: -18px;
        left: 50%;
        transform: translateX(-50%);
      `
    } else {
      // 水平方向：標籤放在車輛上方
      labelPosition = `
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
      `
    }

    label.style.cssText = `
      position: absolute;
      ${labelPosition}
      background: rgba(0, 123, 255, 0.9);
      color: white;
      font-size: 9px;
      font-weight: bold;
      padding: 1px 5px;
      border-radius: 7px;
      border: 1px solid #0066cc;
      z-index: 20;
      pointer-events: none;
      min-width: 16px;
      text-align: center;
      font-family: Arial, sans-serif;
    `

    this.element.appendChild(label)
    this.laneLabel = label
  }

  // Factory Pattern + Strategy Pattern: 獲取車輛配置的工廠策略方法
  getVehicleConfig() {
    // Factory Pattern: 基於車輛類型和方向創建配置
    // Strategy Pattern: 每種車輛類型和方向組合都有不同的策略
    const vehicleConfigs = {
      large: {
        east: { width: 35, height: 20, image: '/images/car/lCar_right.png' },
        west: { width: 35, height: 20, image: '/images/car/lCar_left.png' },
        north: { width: 20, height: 35, image: '/images/car/lCar_top.png' },
        south: { width: 20, height: 35, image: '/images/car/lCar_down.png' },
      },
      small: {
        east: { width: 30, height: 18, image: '/images/car/sCar_right.png' },
        west: { width: 30, height: 18, image: '/images/car/sCar_left.png' },
        north: { width: 18, height: 30, image: '/images/car/sCar_top.png' },
        south: { width: 18, height: 30, image: '/images/car/sCar_down.png' },
      },
      motor: {
        east: { width: 25, height: 15, image: '/images/car/mCar_right.png' },
        west: { width: 25, height: 15, image: '/images/car/mCar_left.png' },
        north: { width: 15, height: 25, image: '/images/car/mCar_top.png' },
        south: { width: 15, height: 25, image: '/images/car/mCar_down.png' },
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

    // 根據方向計算停止線位置（基於中央矩形的邊緣）
    // Strategy Pattern: 不同方向使用不同的停止線定位策略
    if (this.direction === 'east') {
      return { x: centralX, y: null }
    } else if (this.direction === 'west') {
      return { x: centralX + centralWidth, y: null }
    } else if (this.direction === 'north') {
      const northOffset = 150 // 車頭停在矩形下邊界下方5px
      return { x: null, y: centralY + centralHeight - northOffset }
    } else if (this.direction === 'south') {
      const southOffset = -150 // 車頭停在矩形上邊界上方5px
      return { x: null, y: centralY + southOffset }
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
    // 定義畫面邊界（包含安全邊距）
    const bounds = {
      left: -50, // 縮小左邊界，讓車輛更容易觸發完成
      right: 1050, // 縮小右邊界
      top: -50, // 縮小上邊界
      bottom: 650, // 縮小下邊界
    }

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

    // Strategy Pattern: 不同方向使用不同的停止線檢查策略
    if (this.direction === 'east') {
      // 車頭在右側，檢查車頭X座標是否到達停止線
      return vehicleHead.x >= stopLine.x && !this.isAtStopLine
    } else if (this.direction === 'west') {
      // 車頭在左側，檢查車頭X座標是否到達停止線
      return vehicleHead.x <= stopLine.x && !this.isAtStopLine
    } else if (this.direction === 'north') {
      // 車頭在上方，檢查車頭Y座標是否到達停止線
      return vehicleHead.y <= stopLine.y && !this.isAtStopLine
    } else if (this.direction === 'south') {
      // 車頭在下方，檢查車頭Y座標是否到達停止線
      return vehicleHead.y >= stopLine.y && !this.isAtStopLine
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

  // Template Method Pattern + Strategy Pattern: 前方碰撞檢測的模板策略方法
  checkFrontCollision(allVehicles) {
    // Strategy Pattern: 剛創建的車輛使用跳過檢測的策略
    if (this.justCreated) {
      return null
    }

    // 新增：如果車輛剛開始移動且移動時間少於2秒，放寬碰撞檢測
    const isJustStartedMoving =
      this.currentState === 'moving' &&
      this.movementStartTime &&
      Date.now() - new Date(this.movementStartTime).getTime() < 2000

    // Template Method Pattern: 定義碰撞檢測的標準流程
    const currentPos = this.getCurrentPosition()
    const currentBox = this.getBoundingBox()

    // 安全跟車距離 - 根據車輛狀態動態調整
    const safeDistance = isJustStartedMoving ? 5 : 10 // 剛開始移動時放寬距離要求
    const stopDistance = isJustStartedMoving ? 2 : 5 // 剛開始移動時放寬停止距離

    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id || vehicle.direction !== this.direction) continue

      const otherPos = vehicle.getCurrentPosition()
      const otherBox = vehicle.getBoundingBox()

      // 檢查是否在同一車道（更精確的車道檢測）
      // Strategy Pattern: 每個方向使用不同的車道檢測和距離計算策略
      let inSameLane = false
      let isFront = false
      let distanceToFrontVehicle = 0

      if (this.direction === 'east') {
        // 東向：檢查Y軸位置是否在同一車道，X軸是否在前方
        inSameLane = Math.abs(currentPos.y - otherPos.y) < 25 // 車道寬度容錯
        isFront = otherBox.left > currentBox.right // 前車的左邊 > 本車的右邊
        distanceToFrontVehicle = otherBox.left - currentBox.right
      } else if (this.direction === 'west') {
        // 西向：檢查Y軸位置是否在同一車道，X軸是否在前方
        inSameLane = Math.abs(currentPos.y - otherPos.y) < 25
        isFront = otherBox.right < currentBox.left // 前車的右邊 < 本車的左邊
        distanceToFrontVehicle = currentBox.left - otherBox.right
      } else if (this.direction === 'north') {
        // 北向：檢查X軸位置是否在同一車道，Y軸是否在前方
        inSameLane = Math.abs(currentPos.x - otherPos.x) < 25
        isFront = otherBox.bottom < currentBox.top // 前車的底部 < 本車的頂部
        distanceToFrontVehicle = currentBox.top - otherBox.bottom
      } else if (this.direction === 'south') {
        // 南向：檢查X軸位置是否在同一車道，Y軸是否在前方
        inSameLane = Math.abs(currentPos.x - otherPos.x) < 25
        isFront = otherBox.top > currentBox.bottom // 前車的頂部 > 本車的底部
        distanceToFrontVehicle = otherBox.top - currentBox.bottom
      }

      // 檢查是否有重疊或距離太近
      let isOverlapping = false
      if (this.direction === 'east' || this.direction === 'west') {
        // 水平方向：檢查X軸重疊
        isOverlapping = !(currentBox.right <= otherBox.left || currentBox.left >= otherBox.right) && inSameLane
      } else {
        // 垂直方向：檢查Y軸重疊
        isOverlapping = !(currentBox.bottom <= otherBox.top || currentBox.top >= otherBox.bottom) && inSameLane
      }

      // 如果重疊，立即停止
      if (isOverlapping) {
        return {
          vehicle: vehicle,
          distance: 0,
          shouldStop: true,
          isOverlapping: true,
        }
      }

      // 如果在同一車道且在前方，且距離小於安全距離
      if (inSameLane && isFront && distanceToFrontVehicle < safeDistance) {
        return {
          vehicle: vehicle,
          distance: distanceToFrontVehicle,
          shouldStop: distanceToFrontVehicle < stopDistance,
          isOverlapping: false,
        }
      }
    }
    return null
  }

  // State Pattern: 停止移動狀態控制方法
  stopMovement() {
    // State Pattern: 管理車輛從移動狀態轉換為等待狀態
    if (this.movementTimeline) {
      this.movementTimeline.pause()
      if (this.currentState !== 'waitingForVehicle' && this.currentState !== 'waiting') {
        this.currentState = 'waiting'
      }
    }
  }

  // State Pattern: 恢復移動狀態控制方法
  resumeMovement(allVehicles = []) {
    // State Pattern: 管理車輛從等待狀態轉換為移動狀態
    if (this.movementTimeline && (this.currentState === 'waiting' || this.currentState === 'waitingForVehicle')) {
      // 再次檢查前方是否還有車輛
      const frontCollision = this.checkFrontCollision(allVehicles)

      // 如果沒有碰撞，或者沒有重疊且不需要停止，且前車在移動，則可以恢復移動
      if (
        !frontCollision ||
        (!frontCollision.isOverlapping &&
          !frontCollision.shouldStop &&
          frontCollision.vehicle.currentState === 'moving')
      ) {
        this.movementTimeline.resume()
        this.currentState = 'moving'
      }
    }
  }

  // Command Pattern + State Pattern: 強制恢復移動命令
  forceResumeMovement(allVehicles = []) {
    // Command Pattern: 將強制啟動封裝為可執行的命令
    // State Pattern: 強制狀態轉換，用於綠燈時的啟動
    if (this.movementTimeline) {
      // 檢查前方車輛，確保沒有重疊
      const frontCollision = this.checkFrontCollision(allVehicles)

      // 只有在沒有重疊且距離足夠時才恢復移動
      if (!frontCollision || (!frontCollision.isOverlapping && frontCollision.distance > 10)) {
        // Strategy Pattern: 使用隨機延遲策略讓車輛啟動更生動
        const randomDelay = Math.random() * 2

        // Command Pattern: 使用 GSAP 的 delayedCall 實現延遲命令執行
        gsap.delayedCall(randomDelay, () => {
          // 再次檢查車輛狀態，確保仍然需要啟動
          if (this.waitingForGreen && this.movementTimeline) {
            this.movementTimeline.resume()
            this.currentState = 'moving'
            this.waitingForGreen = false
          }
        })
      } else {
        // 車輛前方太近，等待空間
      }
    }
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
        // 增加視覺倍數（原本 2.5），可微調
        const timeMultiplier = 2.5
        theoreticalTime *= timeMultiplier
        // 限制合理範圍
        animationDuration = Math.max(7, Math.min(24, theoreticalTime))
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
              this.forceResumeMovement(allVehicles)
              this.isAtStopLine = false
              this.hasPassedStopLine = true
            }
          }

          // 如果車輛在等待前車，但前車已經走了，也要檢查
          if (this.currentState === 'waitingForVehicle') {
            const frontCollision = this.checkFrontCollision(allVehicles)
            // 確保沒有重疊且距離足夠才恢復移動
            if (!frontCollision || (!frontCollision.isOverlapping && frontCollision.distance > 15)) {
              this.resumeMovement(allVehicles)
            }
          }
        }, 2000) // 每2秒檢查一次

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

            // Template Method Pattern: 前方車輛碰撞檢測流程
            // 接近終點的車輛跳過碰撞檢測，直接通過到邊界
            if (this.currentState !== 'nearComplete') {
              const frontCollision = this.checkFrontCollision(allVehicles)

              if (frontCollision) {
                const { vehicle: frontVehicle, shouldStop, isOverlapping } = frontCollision

                // 如果有重疊，立即停車
                if (isOverlapping) {
                  if (this.currentState === 'moving') {
                    this.stopMovement()
                    this.currentState = 'waitingForVehicle'
                  }
                  return
                }

                // 如果前方車輛停止或距離太近，則停車
                if (
                  frontVehicle.currentState === 'waiting' ||
                  frontVehicle.currentState === 'waitingForVehicle' ||
                  shouldStop
                ) {
                  if (this.currentState === 'moving') {
                    this.stopMovement()
                    this.currentState = 'waitingForVehicle'
                  }
                  return
                }
              }
            } else if (this.currentState === 'waitingForVehicle') {
              // 如果前方車輛已離開安全距離，恢復移動
              this.resumeMovement(allVehicles)
            }

            // Template Method Pattern: 停止線檢查和紅綠燈控制流程
            if (!this.hasPassedStopLine && this.checkStopLine() && !this.waitingForGreen && !this.isAtStopLine) {
              this.isAtStopLine = true

              // 檢查紅綠燈狀態
              const lightState = trafficController.getCurrentLightState(this.direction)

              if (lightState === 'red' || lightState === 'yellow') {
                this.stopMovement()
                this.waitingForGreen = true

                // Observer Pattern: 監聽紅綠燈變化的觀察者實現
                const onLightChange = (direction, state) => {
                  if (direction === this.direction && state === 'green' && this.waitingForGreen) {
                    // 使用強制恢復移動方法（內含隨機延遲）
                    this.forceResumeMovement(allVehicles)
                    this.isAtStopLine = false
                    this.hasPassedStopLine = true // 標記已通過停止線

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
                      this.forceResumeMovement(allVehicles)
                      this.isAtStopLine = false
                      this.hasPassedStopLine = true
                      trafficController.removeObserver(onLightChange)
                    }
                  }
                }, 1000) // 1秒後檢查
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
      ease: 'power2.out',
    })
  }

  // Command Pattern: 淡入動畫命令
  fadeIn(duration = 1) {
    // Command Pattern: 將淡入動畫封裝為可執行的命令
    return gsap.to(this.element, {
      opacity: 1,
      scale: 1,
      duration: duration,
      ease: 'back.out(1.7)',
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

    // 清理時間線
    if (this.movementTimeline) {
      this.movementTimeline.kill()
      this.movementTimeline = null
    }

    // 移除DOM元素
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
  }
}
