/**
 * Vehicle.js - 車輛實體類別
 */
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { speedConfig } from './config/trafficConfig.js' // 引入統一的速度設定

// 註冊 GSAP 插件
gsap.registerPlugin(MotionPathPlugin)

export default class Vehicle {
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
      opacity: 1, // 🚗 修改：立即可見，不使用淡入動畫
      scale: 1, // 🚗 修改：正常大小，不使用縮放動畫
    })

    console.log(`🚗 [${this.id}] 車輛在 (${x}, ${y}) 立即顯示`)

    // 新增車道編號標籤顯示
    this.createLaneLabel()

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

    // 增加動畫持續時間倍數，讓車輛移動更自然
    const timeMultiplier = 1.0 // 調整時間倍數，讓動畫速度差異更明顯
    const adjustedTheoretical = theoreticalTime * timeMultiplier

    // 為了視覺效果，將時間控制在合理範圍內（調整範圍以適應新的倍數）
    const minTime = 7 // 最短7秒
    const maxTime = 35 // 最長35秒
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

    // 根據方向計算停止線位置（基於中央矩形的邊緣）
    // Strategy Pattern: 不同方向使用不同的停止線定位策略
    if (this.direction === 'east') {
      return { x: centralX, y: null }
    } else if (this.direction === 'west') {
      return { x: centralX + centralWidth, y: null }
    } else if (this.direction === 'north') {
      const northOffset = 0 // 車頭停在矩形下邊界下方5px
      return { x: null, y: centralY + centralHeight - northOffset }
    } else if (this.direction === 'south') {
      const southOffset = 0 // 車頭停在矩形上邊界上方5px
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

  // 新增：檢查是否需要為紅燈減速
  checkTrafficLightSlowDown(trafficController) {
    if (this.hasPassedStopLine || this.waitingForGreen || this.isAtStopLine) {
      return null
    }

    const lightState = trafficController.getCurrentLightState(this.direction)
    if (lightState === 'green') {
      if (this.currentState === 'slowing_for_light') {
        // 如果之前在減速，但燈變綠了，就恢復
        return { action: 'resume_from_slow' }
      }
      return null
    }

    const distanceToStopLine = this.getDistanceToStopLine()
    if (distanceToStopLine === null || distanceToStopLine <= 0) {
      return null
    }

    const slowDownDistance = 50 // 從50px開始減速

    if (lightState === 'red' || lightState === 'yellow') {
      if (distanceToStopLine <= slowDownDistance) {
        // 根據距離計算速度比例，越近越慢
        const speedRatio = (distanceToStopLine / slowDownDistance) * 0.8 // 乘以0.8讓減速更明顯
        return {
          action: 'slow_for_light',
          targetSpeedRatio: Math.max(0.05, speedRatio), // 最低速度為5%
        }
      }
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

  // 🚨 全新重寫：更精確的碰撞檢測系統
  checkFrontCollision(allVehicles) {
    // 跳過剛創建的車輛
    if (this.justCreated) {
      return null
    }

    const currentBox = this.getBoundingBox()
    const vehicleConfig = this.getVehicleConfig()

    // 🚨 基於車輛實際大小的動態安全距離
    const vehicleLength = Math.max(vehicleConfig.width, vehicleConfig.height)
    const minimumGap = vehicleLength * 0.8 // 最小間隙為車輛長度的80%
    const safeFollowingDistance = vehicleLength * 1.5 // 安全跟車距離
    const emergencyStopDistance = vehicleLength * 0.3 // 緊急停車距離

    // 🚨 根據車輛狀態動態調整距離
    let actualMinGap = minimumGap
    let actualSafeDistance = safeFollowingDistance
    let actualStopDistance = emergencyStopDistance

    // 高密度交通調整
    const vehicleCount = allVehicles.filter((v) => v.direction === this.direction).length
    if (vehicleCount > 8) {
      actualMinGap *= 0.8
      actualSafeDistance *= 0.9
    }

    // 等待紅綠燈時增加距離
    if (this.currentState === 'slowing_for_light' || this.waitingForGreen) {
      actualMinGap *= 2.0
      actualSafeDistance *= 2.5
      actualStopDistance *= 1.5
    }

    let closestVehicle = null
    let minDistance = Infinity

    // 🚨 改進的車道檢測：基於車輛中心點和車道寬度
    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id || vehicle.direction !== this.direction) continue

      const otherBox = vehicle.getBoundingBox()

      // 🚨 精確的車道檢測：使用車輛中心點
      const currentCenter = { x: currentBox.centerX, y: currentBox.centerY }
      const otherCenter = { x: otherBox.centerX, y: otherBox.centerY }

      let inSameLane = false
      let isFrontVehicle = false
      let distance = 0

      // 根據方向計算車道和距離
      if (this.direction === 'east') {
        // 東向：Y軸差異小於車道寬度的一半，且其他車在前方
        inSameLane = Math.abs(currentCenter.y - otherCenter.y) < 25 // 車道寬度約50px
        isFrontVehicle = otherCenter.x > currentCenter.x
        distance = isFrontVehicle ? otherBox.left - currentBox.right : currentBox.left - otherBox.right
      } else if (this.direction === 'west') {
        inSameLane = Math.abs(currentCenter.y - otherCenter.y) < 25
        isFrontVehicle = otherCenter.x < currentCenter.x
        distance = isFrontVehicle ? currentBox.left - otherBox.right : otherBox.left - currentBox.right
      } else if (this.direction === 'north') {
        inSameLane = Math.abs(currentCenter.x - otherCenter.x) < 25
        isFrontVehicle = otherCenter.y < currentCenter.y
        distance = isFrontVehicle ? currentBox.top - otherBox.bottom : otherBox.top - currentBox.bottom
      } else if (this.direction === 'south') {
        inSameLane = Math.abs(currentCenter.x - otherCenter.x) < 25
        isFrontVehicle = otherCenter.y > currentCenter.y
        distance = isFrontVehicle ? otherBox.top - currentBox.bottom : currentBox.top - otherBox.bottom
      }

      // 🚨 立即檢測重疊：任何負距離都是重疊
      if (inSameLane && distance < 0) {
        // 🚨 特殊情況：如果兩車都在等待紅燈，使用更寬鬆的重疊標準
        const bothWaitingForLight =
          (this.waitingForGreen || this.currentState === 'slowing_for_light') &&
          (vehicle.waitingForGreen || vehicle.currentState === 'slowing_for_light')

        // 如果兩車都在等紅燈，只有重疊超過車輛長度的50%才認為是真正重疊
        if (bothWaitingForLight) {
          const overlapThreshold = -(vehicleLength * 0.5) // 負值表示重疊程度
          if (distance > overlapThreshold) {
            // 輕微重疊，在紅燈等待狀態下可以容忍
            console.log(`⚠️ [${this.id}] 紅燈排隊時輕微重疊，可容忍 距離: ${distance.toFixed(1)}px`)
            return {
              vehicle: vehicle,
              distance: distance,
              shouldStop: false, // 不要停車，允許排隊
              isOverlapping: false, // 不認為是重疊
              emergencyStop: false,
            }
          }
        }

        console.log(`🚨 [${this.id}] 檢測到重疊！與車輛 [${vehicle.id}] 重疊 ${Math.abs(distance).toFixed(1)}px`)
        return {
          vehicle: vehicle,
          distance: distance,
          shouldStop: true,
          isOverlapping: true,
          emergencyStop: true,
        }
      }

      // 🚨 記錄同車道前方最近的車輛
      if (inSameLane && isFrontVehicle && distance < minDistance) {
        minDistance = distance
        closestVehicle = vehicle
      }
    }

    // 如果沒有前方車輛，返回null
    if (!closestVehicle) {
      return null
    }

    // 🚨 基於最近車輛的距離決定行為
    const distance = minDistance

    // 🚨 特殊情況：檢查是否兩車都在等待紅燈
    const bothWaitingForLight =
      (this.waitingForGreen || this.currentState === 'slowing_for_light') &&
      (closestVehicle.waitingForGreen || closestVehicle.currentState === 'slowing_for_light')

    // 🚨 如果兩車都在等紅燈，使用更寬鬆的距離標準
    let finalMinGap = actualMinGap
    let finalSafeDistance = actualSafeDistance
    let finalStopDistance = actualStopDistance

    if (bothWaitingForLight) {
      // 紅燈排隊時允許更近的距離
      finalMinGap = vehicleLength * 0.3 // 從80%減少到30%
      finalSafeDistance = vehicleLength * 0.5 // 從150%減少到50%
      finalStopDistance = vehicleLength * 0.1 // 從30%減少到10%

      console.log(`🚦 [${this.id}] 紅燈排隊模式，使用寬鬆距離標準`)
    }

    // 調試信息
    if (Math.random() < 0.1 || this.id.endsWith('1')) {
      console.log(
        `🔍 [${this.id}] 前方車輛 [${closestVehicle.id}] 距離: ${distance.toFixed(1)}px (最小:${finalMinGap.toFixed(1)}, 安全:${finalSafeDistance.toFixed(1)})${bothWaitingForLight ? ' [紅燈排隊]' : ''}`,
      )
    }

    // 🚨 危險距離：立即緊急停車
    if (distance < finalStopDistance) {
      console.log(`🚨 [${this.id}] 緊急停車！距離過近: ${distance.toFixed(1)}px`)
      return {
        vehicle: closestVehicle,
        distance: distance,
        shouldStop: true,
        isOverlapping: false,
        emergencyStop: true,
      }
    }

    // 🚨 最小間隙：必須停車
    if (distance < finalMinGap) {
      // 如果是紅燈排隊，不需要停車，允許貼近排隊
      if (bothWaitingForLight) {
        console.log(`🚦 [${this.id}] 紅燈排隊中，允許貼近前車`)
        return null // 不採取任何行動
      }

      return {
        vehicle: closestVehicle,
        distance: distance,
        shouldStop: true,
        shouldFollow: false,
        isOverlapping: false,
      }
    }

    // 🚨 安全跟車區域：智能跟車
    if (distance < finalSafeDistance) {
      // 如果是紅燈排隊，不需要跟車邏輯
      if (bothWaitingForLight) {
        return null
      }

      // 根據前車狀態決定跟車速度
      let followingSpeed = this.calculateIntelligentFollowingSpeed(closestVehicle, distance, finalSafeDistance)

      return {
        vehicle: closestVehicle,
        distance: distance,
        shouldStop: false,
        shouldFollow: true,
        followingSpeed: followingSpeed,
        isOverlapping: false,
      }
    }

    // 距離足夠，正常行駛
    return null
  }

  // 🚨 新增：智能跟車速度計算
  calculateIntelligentFollowingSpeed(frontVehicle, distance, safeDistance) {
    // 獲取前車速度
    let frontSpeed = frontVehicle.currentSpeed || frontVehicle.initialSpeed

    // 如果前車停止或等待，本車也停止
    if (
      frontVehicle.currentState === 'waiting' ||
      frontVehicle.currentState === 'waitingForVehicle' ||
      frontVehicle.waitingForGreen ||
      frontSpeed === 0
    ) {
      return 0
    }

    // 距離比例：距離越近，速度越慢
    const distanceRatio = Math.max(0.2, Math.min(1.0, distance / safeDistance))

    // 基礎跟車速度：根據距離調整
    let targetSpeed
    if (distanceRatio < 0.4) {
      // 非常接近：慢速跟車
      targetSpeed = Math.min(frontSpeed * 0.6, this.initialSpeed * 0.4)
    } else if (distanceRatio < 0.7) {
      // 中等距離：正常跟車
      targetSpeed = Math.min(frontSpeed * 0.8, this.initialSpeed * 0.7)
    } else {
      // 較遠距離：接近前車速度
      targetSpeed = Math.min(frontSpeed * 0.95, this.initialSpeed * 0.9)
    }

    // 確保最低速度，保持流動性
    return Math.max(targetSpeed, this.initialSpeed * 0.15)
  }

  // 🚨 新增：十字路口橫向碰撞檢測（防止車輛穿越）
  checkCrossDirectionCollision(allVehicles) {
    // 跳過剛創建的車輛
    if (this.justCreated) {
      return null
    }

    const currentBox = this.getBoundingBox()
    const currentCenter = { x: currentBox.centerX, y: currentBox.centerY }

    // 十字路口區域定義（基於SVG座標）
    const intersectionBounds = {
      left: 300, // 路口左邊界
      right: 500, // 路口右邊界
      top: 200, // 路口上邊界
      bottom: 400, // 路口下邊界
    }

    // 檢查當前車輛是否在十字路口區域內
    const isInIntersection =
      currentCenter.x >= intersectionBounds.left &&
      currentCenter.x <= intersectionBounds.right &&
      currentCenter.y >= intersectionBounds.top &&
      currentCenter.y <= intersectionBounds.bottom

    // 如果當前車輛不在路口區域，不需要檢測橫向碰撞
    if (!isInIntersection) {
      return null
    }

    // 獲取垂直方向的車輛
    const perpendicularDirections = this.getPerpendicularDirections()

    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id) continue

      // 只檢查垂直方向的車輛
      if (!perpendicularDirections.includes(vehicle.direction)) continue

      const otherBox = vehicle.getBoundingBox()
      const otherCenter = { x: otherBox.centerX, y: otherBox.centerY }

      // 檢查對方車輛是否也在十字路口區域內
      const otherInIntersection =
        otherCenter.x >= intersectionBounds.left &&
        otherCenter.x <= intersectionBounds.right &&
        otherCenter.y >= intersectionBounds.top &&
        otherCenter.y <= intersectionBounds.bottom

      if (!otherInIntersection) continue

      // 計算兩車中心點的距離
      const distance = Math.sqrt(
        Math.pow(currentCenter.x - otherCenter.x, 2) + Math.pow(currentCenter.y - otherCenter.y, 2),
      )

      // 獲取車輛配置來計算安全距離
      const currentConfig = this.getVehicleConfig()
      const otherConfig = vehicle.getVehicleConfig()
      const avgVehicleSize =
        (Math.max(currentConfig.width, currentConfig.height) + Math.max(otherConfig.width, otherConfig.height)) / 2

      // 🚨 路口安全距離：比普通跟車距離更大
      const intersectionSafeDistance = avgVehicleSize * 2.0
      const intersectionStopDistance = avgVehicleSize * 1.2

      // 檢測碰撞威脅
      if (distance < intersectionSafeDistance) {
        console.log(`🚨 [${this.id}] 十字路口橫向碰撞風險！與 [${vehicle.id}] 距離: ${distance.toFixed(1)}px`)

        return {
          vehicle: vehicle,
          distance: distance,
          shouldStop: distance < intersectionStopDistance,
          shouldSlowDown: distance < intersectionSafeDistance,
          isIntersectionCollision: true,
          emergencyStop: distance < intersectionStopDistance * 0.7,
        }
      }
    }

    return null
  }

  // 計算跟隨前車的速度 - 🚨 優化反應速度和跟車邏輯
  calculateFollowingSpeed(frontVehicle, distance, idealDistance) {
    // 獲取前車的當前速度 - 🚨 優先使用實際運行速度
    let frontVehicleSpeed = frontVehicle.currentSpeed || frontVehicle.initialSpeed

    // 如果前車停止，本車也應該停止
    if (
      frontVehicle.currentState === 'waiting' ||
      frontVehicle.currentState === 'waitingForVehicle' ||
      frontVehicle.waitingForGreen
    ) {
      return 0
    }

    // 🚨 動態距離係數：根據距離調整跟車緊密度
    const normalizedDistance = Math.min(1, distance / idealDistance)

    // 🚨 使用更平滑的距離因子計算
    let distanceFactor
    if (normalizedDistance < 0.3) {
      // 距離很近時：急劇減速
      distanceFactor = normalizedDistance * 0.5
    } else if (normalizedDistance < 0.7) {
      // 中等距離：線性調整
      distanceFactor = 0.15 + (normalizedDistance - 0.3) * 1.5
    } else {
      // 距離較遠：接近前車速度
      distanceFactor = 0.75 + (normalizedDistance - 0.7) * 0.83
    }

    // 🚨 危險距離檢測：如果距離過近，立即大幅減速
    const criticalDistance = idealDistance * 0.4 // 臨界距離為理想距離的40%
    if (distance < criticalDistance) {
      return this.initialSpeed * 0.15 // 緊急減速到15%速度
    }

    // 🚨 更智能的跟車速度：根據距離動態調整跟車係數
    let followingRatio
    if (distance < idealDistance * 0.5) {
      followingRatio = 0.7 // 近距離：保守跟車
    } else if (distance < idealDistance * 0.8) {
      followingRatio = 0.85 // 中距離：正常跟車
    } else {
      followingRatio = 0.95 // 遠距離：接近前車速度
    }

    // 基本跟隨速度：根據距離動態調整跟車係數
    const baseFollowingSpeed = Math.min(frontVehicleSpeed * followingRatio, this.initialSpeed)

    // 根據距離調整速度
    const adjustedSpeed = baseFollowingSpeed * distanceFactor

    // 🚨 動態最低速度：保持流動性，防止過度緩慢
    const minSpeedRatio = distance < idealDistance * 0.3 ? 0.1 : 0.2
    return Math.max(adjustedSpeed, this.initialSpeed * minSpeedRatio)
  }

  // 進入跟隨模式
  enterFollowingMode(targetSpeed) {
    if (!this.movementTimeline) return

    // 如果已經在跟隨模式且速度相近，不需要重複調整
    if (
      this.currentState === 'following' &&
      Math.abs(this.movementTimeline.timeScale() * this.initialSpeed - targetSpeed) < 2
    ) {
      return
    }

    this.currentState = 'following'

    // 計算目標timeScale（基於目標速度與原始速度的比例）
    const baseTimeScale = this.originalTimeScale || 1
    const targetTimeScale = (targetSpeed / this.initialSpeed) * baseTimeScale

    // 平滑調整到目標速度
    gsap.to(this.movementTimeline, {
      timeScale: Math.max(0.1, targetTimeScale), // 最小timeScale為0.1
      duration: 0.5,
      ease: 'power2.out',
    })
  }

  // 退出跟隨模式，恢復正常速度
  exitFollowingMode() {
    if (!this.movementTimeline || this.currentState !== 'following') return

    this.currentState = 'moving'
    const targetTimeScale = this.originalTimeScale || 1

    gsap.to(this.movementTimeline, {
      timeScale: targetTimeScale,
      duration: 0.8,
      ease: 'power2.inOut',
    })
  }

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

  // State Pattern: 恢復移動狀態控制方法
  resumeMovement(allVehicles = []) {
    // State Pattern: 管理車輛從等待狀態轉換為移動狀態
    if (this.movementTimeline && (this.currentState === 'waiting' || this.currentState === 'waitingForVehicle')) {
      // 🚨 改善：更嚴格的前方檢查，增加檢查範圍
      const frontCollision = this.checkFrontCollision(allVehicles)

      if (!frontCollision) {
        // 沒有前車，直接恢復正常移動
        this.movementTimeline.resume()
        this.currentState = 'moving'
        console.log(`🚗 [${this.id}] 前方無車輛，恢復移動`)
        return
      }

      // 🚨 改善：更寬鬆的恢復條件，但確保安全距離
      if (!frontCollision.isOverlapping) {
        // 根據前車狀態動態調整安全距離
        let requiredDistance = 20 // 基礎安全距離

        if (frontCollision.vehicle.currentState === 'slowing_for_light' || frontCollision.vehicle.waitingForGreen) {
          requiredDistance = 25 // 前車等紅燈時需要更大距離
        } else if (frontCollision.vehicle.currentState === 'following') {
          requiredDistance = 15 // 前車跟隨時可以稍微近些
        }

        if (frontCollision.distance >= requiredDistance) {
          if (frontCollision.shouldFollow && frontCollision.followingSpeed !== null) {
            // 進入跟隨模式
            this.movementTimeline.resume()
            this.enterFollowingMode(frontCollision.followingSpeed)
            console.log(`🚗 [${this.id}] 進入跟隨模式，距離: ${frontCollision.distance.toFixed(1)}px`)
            return
          } else {
            // 距離足夠，可以正常移動
            this.movementTimeline.resume()
            this.currentState = 'moving'
            console.log(`🚗 [${this.id}] 安全距離足夠，恢復移動，距離: ${frontCollision.distance.toFixed(1)}px`)
          }
        } else {
          console.log(
            `🚗 [${this.id}] 安全距離不足，繼續等待，距離: ${frontCollision.distance.toFixed(1)}px，需要: ${requiredDistance}px`,
          )
        }
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
      if (!frontCollision || (!frontCollision.isOverlapping && frontCollision.distance > 15)) {
        // 如果前車正在減速或等待，確保增加足夠的安全距離
        if (
          frontCollision &&
          (frontCollision.vehicle.currentState === 'slowing_for_light' || frontCollision.vehicle.waitingForGreen)
        ) {
          // 如果前車在等待紅燈或減速中，需要更大的安全距離
          if (frontCollision.distance < 25) {
            return
          }
        }
        // 隨機延遲 0.5-2 秒，模擬真實交通反應時間
        const delaySeconds = 0.5 + Math.random() * 1.5
        gsap.delayedCall(delaySeconds, () => {
          // 再次檢查車輛狀態，確保仍然需要啟動
          if (this.waitingForGreen && this.movementTimeline) {
            // 如果 timeScale 為 0，需要恢復 timeScale
            if (this.movementTimeline.timeScale() === 0) {
              const targetTimeScale = this.originalTimeScale || 1
              gsap.to(this.movementTimeline, {
                timeScale: targetTimeScale,
                duration: 0.3,
                ease: 'power2.inOut',
                onComplete: () => {
                  this.movementTimeline.resume()
                  this.currentState = 'moving'
                  this.waitingForGreen = false
                  this.originalTimeScale = null
                },
              })
            } else {
              this.movementTimeline.resume()
              this.currentState = 'moving'
              this.waitingForGreen = false
            }
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
          // 🚨 使用實際路徑長度計算動畫時間
          const pathLength = pathElement.getTotalLength()
          const realDistance = (pathLength / 100) * 15 // 轉換為實際距離（米）
          const speedMs = (this.initialSpeed * 1000) / 3600 // 轉換為 m/s
          let theoreticalTime = realDistance / speedMs
          const timeMultiplier = 2 // 調整時間倍數
          theoreticalTime *= timeMultiplier
          animationDuration = Math.max(7, Math.min(60, theoreticalTime))

          console.log(
            `🚗 [${this.id}] ${this.direction}向路徑長度: ${pathLength.toFixed(1)}px, 動畫時間: ${animationDuration.toFixed(1)}s`,
          )
        } catch (error) {
          console.warn(`⚠️ 無法計算路徑長度，使用預設動畫時間:`, error)
          animationDuration = this.calculateAnimationDuration()
        }
      }

      // Strategy Pattern: 使用延遲策略避免剛生成就被碰撞檢測影響
      setTimeout(() => {
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
                    duration: 0.3,
                    ease: 'power2.inOut',
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

          // 🚨 改善：等待前車檢查邏輯 - 更頻繁和寬鬆的檢查
          if (this.currentState === 'waitingForVehicle') {
            const frontCollision = this.checkFrontCollision(allVehicles)
            // 放寬恢復條件：只要不重疊且有基本安全距離就恢復
            if (!frontCollision || (!frontCollision.isOverlapping && frontCollision.distance > 12)) {
              this.resumeMovement(allVehicles)
            }
          }

          // 跟隨模式檢查邏輯（與原方法相同）
          if (this.currentState === 'following') {
            const frontCollision = this.checkFrontCollision(allVehicles)
            if (frontCollision) {
              if (frontCollision.shouldFollow && frontCollision.followingSpeed !== null) {
                this.enterFollowingMode(frontCollision.followingSpeed)
              } else if (frontCollision.shouldStop || frontCollision.isOverlapping) {
                this.stopMovement()
                this.currentState = 'waitingForVehicle'
              }
            } else {
              this.exitFollowingMode()
            }
          }
        }, 1500) // 🚨 改善：縮短檢查間隔從2000ms到1500ms，讓車輛更快恢復

        // 邊界檢測標記 - 避免重複觸發 (移到正確位置)
        let hasBeenRemovedFromCollision = false

        // Template Method Pattern: 創建 MotionPath 移動時間線
        this.movementTimeline = gsap.timeline({
          onUpdate: () => {
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
              return
            }

            // 🚨 持續碰撞檢測系統 - 所有檢測同時進行，根據威脅等級決定動作
            const frontCollision = this.checkFrontCollision(allVehicles)
            const crossCollision = this.checkCrossDirectionCollision(allVehicles)

            // 🚨 威脅等級評估系統
            let highestThreat = null
            let threatLevel = 0 // 0=無威脅, 1=減速, 2=停車, 3=緊急停車, 4=重疊

            // 評估前方碰撞威脅
            if (frontCollision) {
              if (frontCollision.isOverlapping) {
                highestThreat = { type: 'front_overlap', data: frontCollision }
                threatLevel = 4
              } else if (frontCollision.emergencyStop) {
                highestThreat = { type: 'front_emergency', data: frontCollision }
                threatLevel = Math.max(threatLevel, 3)
              } else if (frontCollision.shouldStop) {
                highestThreat = { type: 'front_stop', data: frontCollision }
                threatLevel = Math.max(threatLevel, 2)
              } else if (frontCollision.shouldFollow) {
                highestThreat = { type: 'front_follow', data: frontCollision }
                threatLevel = Math.max(threatLevel, 1)
              }
            }

            // 評估橫向碰撞威脅
            if (crossCollision) {
              if (crossCollision.emergencyStop) {
                highestThreat = { type: 'cross_emergency', data: crossCollision }
                threatLevel = Math.max(threatLevel, 3)
              } else if (crossCollision.shouldStop) {
                highestThreat = { type: 'cross_stop', data: crossCollision }
                threatLevel = Math.max(threatLevel, 2)
              } else if (crossCollision.shouldSlowDown) {
                if (threatLevel < 2) {
                  // 只有在沒有更高威脅時才選擇減速
                  highestThreat = { type: 'cross_slow', data: crossCollision }
                  threatLevel = Math.max(threatLevel, 1)
                }
              }
            }

            // 🚨 根據最高威脅等級執行動作
            if (highestThreat) {
              const { type, data } = highestThreat

              switch (type) {
                case 'front_overlap':
                  this.movementTimeline.timeScale(0.01) // 幾乎停止，防止重疊
                  this.currentState = 'emergency_stop'
                  console.log(`🚨 [${this.id}] 前方重疊！與 [${data.vehicle.id}] 緊急停止`)
                  return

                case 'front_emergency':
                case 'cross_emergency': {
                  this.movementTimeline.timeScale(0)
                  this.currentState = type.includes('front') ? 'emergency_stop' : 'emergency_intersection_stop'
                  const emergencyTarget = data.vehicle.id
                  const emergencyDistance = data.distance.toFixed(1)
                  console.log(`🚨 [${this.id}] 緊急停車！威脅來自 [${emergencyTarget}] 距離: ${emergencyDistance}px`)
                  return
                }

                case 'front_stop':
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'waitingForVehicle'
                  console.log(`🛑 [${this.id}] 前方車輛太近，停止 - 距離: ${data.distance.toFixed(1)}px`)
                  return

                case 'cross_stop':
                  this.movementTimeline.timeScale(0)
                  this.currentState = 'intersection_waiting'
                  console.log(
                    `� [${this.id}] 十字路口停車等待！與 [${data.vehicle.id}] 距離: ${data.distance.toFixed(1)}px`,
                  )
                  return

                case 'front_follow': {
                  const currentTimeScale = this.movementTimeline.timeScale()
                  const targetTimeScale = Math.max(0.15, data.followingSpeed / this.initialSpeed)

                  // 平滑速度調整
                  const speedDifference = Math.abs(currentTimeScale - targetTimeScale)
                  if (speedDifference > 0.05) {
                    gsap.to(this.movementTimeline, {
                      timeScale: targetTimeScale,
                      duration: 0.3,
                      ease: 'power2.out',
                    })
                    this.currentState = 'following'
                    console.log(
                      `� [${this.id}] 智能跟車: ${currentTimeScale.toFixed(2)} → ${targetTimeScale.toFixed(2)}`,
                    )
                  }
                  return
                }

                case 'cross_slow': {
                  const targetSlowScale = 0.3
                  gsap.to(this.movementTimeline, {
                    timeScale: targetSlowScale,
                    duration: 0.2,
                    ease: 'power2.out',
                  })
                  this.currentState = 'intersection_slowing'
                  console.log(
                    `⚠️ [${this.id}] 十字路口減速！與 [${data.vehicle.id}] 距離: ${data.distance.toFixed(1)}px`,
                  )
                  return
                }
              }
            }

            // 🚨 無碰撞風險：平滑恢復正常速度
            if (!highestThreat) {
              const currentTimeScale = this.movementTimeline.timeScale()
              if (
                currentTimeScale < 1 &&
                (this.currentState === 'following' ||
                  this.currentState === 'emergency_stop' ||
                  this.currentState === 'intersection_slowing' ||
                  this.currentState === 'intersection_waiting')
              ) {
                gsap.to(this.movementTimeline, {
                  timeScale: 1,
                  duration: 0.5,
                  ease: 'power2.inOut',
                })
                this.currentState = 'moving'
                console.log(`🚗 [${this.id}] 恢復正常速度`)
              }
            }

            // 紅燈減速檢查（如果沒有碰撞威脅的情況下）
            if (!highestThreat) {
              const slowDownInfo = this.checkTrafficLightSlowDown(trafficController)
              if (slowDownInfo) {
                if (slowDownInfo.action === 'slow_for_light') {
                  this.currentState = 'slowing_for_light'
                  if (!this.originalTimeScale) {
                    this.originalTimeScale = this.movementTimeline.timeScale()
                  }
                  gsap.to(this.movementTimeline, {
                    timeScale: this.originalTimeScale * slowDownInfo.targetSpeedRatio,
                    duration: 0.5,
                    ease: 'power2.out',
                  })
                } else if (slowDownInfo.action === 'resume_from_slow') {
                  this.currentState = 'moving'
                  if (this.originalTimeScale) {
                    gsap.to(this.movementTimeline, {
                      timeScale: this.originalTimeScale,
                      duration: 0.5,
                      ease: 'power2.inOut',
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

            // 🚨 移除冗餘的邊界檢測 - 統一在 onUpdate 開頭處理

            // 紅燈減速檢查（與原方法相同的邏輯）
            if (!highestThreat) {
              const slowDownInfo = this.checkTrafficLightSlowDown(trafficController)
              if (slowDownInfo) {
                if (slowDownInfo.action === 'slow_for_light') {
                  this.currentState = 'slowing_for_light'
                  if (!this.originalTimeScale) {
                    this.originalTimeScale = this.movementTimeline.timeScale()
                  }
                  gsap.to(this.movementTimeline, {
                    timeScale: this.originalTimeScale * slowDownInfo.targetSpeedRatio,
                    duration: 0.5,
                    ease: 'power2.out',
                  })
                } else if (slowDownInfo.action === 'resume_from_slow') {
                  this.currentState = 'moving'
                  if (this.originalTimeScale) {
                    gsap.to(this.movementTimeline, {
                      timeScale: this.originalTimeScale,
                      duration: 0.5,
                      ease: 'power2.inOut',
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
                    duration: 0.5,
                    ease: 'power2.out',
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
                            duration: 0.3,
                            ease: 'power2.inOut',
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
                }, 1000)
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
        const timeMultiplier = 2 // 調整時間倍數，讓動畫速度差異更明顯
        theoreticalTime *= timeMultiplier
        // 限制合理範圍
        animationDuration = Math.max(7, Math.min(60, theoreticalTime))
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
                    duration: 0.3,
                    ease: 'power2.inOut',
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

          // 如果車輛在等待前車，但前車已經走了，也要檢查
          if (this.currentState === 'waitingForVehicle') {
            const frontCollision = this.checkFrontCollision(allVehicles)
            // 確保沒有重疊且距離足夠才恢復移動
            if (!frontCollision || (!frontCollision.isOverlapping && frontCollision.distance > 15)) {
              this.resumeMovement(allVehicles)
            }
          }

          // 如果車輛在跟隨模式，持續檢查前車狀態並調整速度
          if (this.currentState === 'following') {
            const frontCollision = this.checkFrontCollision(allVehicles)
            if (frontCollision) {
              if (frontCollision.shouldFollow && frontCollision.followingSpeed !== null) {
                // 更新跟隨速度
                this.enterFollowingMode(frontCollision.followingSpeed)
              } else if (frontCollision.shouldStop || frontCollision.isOverlapping) {
                // 前車太近，需要停車
                this.stopMovement()
                this.currentState = 'waitingForVehicle'
              }
            } else {
              // 前方沒有車輛了，退出跟隨模式
              this.exitFollowingMode()
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

            // 🚨 持續碰撞檢測系統 - 所有檢測同時進行，根據威脅等級決定動作
            const frontCollision = this.checkFrontCollision(allVehicles)
            const crossCollision = this.checkCrossDirectionCollision(allVehicles)

            // 🚨 威脅等級評估系統
            let highestThreat = null
            let threatLevel = 0 // 0=無威脅, 1=減速, 2=停車, 3=緊急停車, 4=重疊

            // 評估前方碰撞威脅
            if (frontCollision) {
              if (frontCollision.isOverlapping) {
                highestThreat = { type: 'front_overlap', data: frontCollision }
                threatLevel = 4
              } else if (frontCollision.emergencyStop) {
                highestThreat = { type: 'front_emergency', data: frontCollision }
                threatLevel = Math.max(threatLevel, 3)
              } else if (frontCollision.shouldStop) {
                highestThreat = { type: 'front_stop', data: frontCollision }
                threatLevel = Math.max(threatLevel, 2)
              } else if (frontCollision.shouldFollow) {
                highestThreat = { type: 'front_follow', data: frontCollision }
                threatLevel = Math.max(threatLevel, 1)
              }
            }

            // 評估橫向碰撞威脅
            if (crossCollision) {
              if (crossCollision.emergencyStop) {
                highestThreat = { type: 'cross_emergency', data: crossCollision }
                threatLevel = Math.max(threatLevel, 3)
              } else if (crossCollision.shouldStop) {
                highestThreat = { type: 'cross_stop', data: crossCollision }
                threatLevel = Math.max(threatLevel, 2)
              } else if (crossCollision.shouldSlowDown) {
                if (threatLevel < 2) {
                  // 只有在沒有更高威脅時才選擇減速
                  highestThreat = { type: 'cross_slow', data: crossCollision }
                  threatLevel = Math.max(threatLevel, 1)
                }
              }
            }

            // 🚨 根據最高威脅等級執行動作
            if (highestThreat) {
              const { type, data } = highestThreat

              switch (type) {
                case 'front_overlap':
                  this.stopMovement()
                  this.currentState = 'waitingForVehicle'
                  console.log(`🚨 [${this.id}] 前方重疊！緊急停止`)
                  return

                case 'front_emergency':
                case 'cross_emergency': {
                  this.stopMovement()
                  this.currentState = type.includes('front') ? 'emergency_stop' : 'emergency_intersection_stop'
                  const emergencyTarget = data.vehicle.id
                  const emergencyDistance = data.distance.toFixed(1)
                  console.log(`🚨 [${this.id}] 緊急停車！威脅來自 [${emergencyTarget}] 距離: ${emergencyDistance}px`)
                  return
                }

                case 'front_stop':
                  this.stopMovement()
                  this.currentState = 'waitingForVehicle'
                  console.log(`🛑 [${this.id}] 前方車輛太近，停止 - 距離: ${data.distance.toFixed(1)}px`)
                  return

                case 'cross_stop':
                  this.stopMovement()
                  this.currentState = 'intersection_waiting'
                  console.log(
                    `🛑 [${this.id}] 十字路口停車等待！與 [${data.vehicle.id}] 距離: ${data.distance.toFixed(1)}px`,
                  )
                  return

                case 'front_follow': {
                  this.enterFollowingMode(data.followingSpeed)
                  console.log(`🚗 [${this.id}] 智能跟車模式`)
                  return
                }

                case 'cross_slow': {
                  const targetSlowScale = 0.3
                  gsap.to(this.movementTimeline, {
                    timeScale: targetSlowScale,
                    duration: 0.2,
                    ease: 'power2.out',
                  })
                  this.currentState = 'intersection_slowing'
                  console.log(
                    `⚠️ [${this.id}] 十字路口減速！與 [${data.vehicle.id}] 距離: ${data.distance.toFixed(1)}px`,
                  )
                  return
                }
              }
            }

            // 如果沒有碰撞威脅，則處理紅燈減速
            if (!highestThreat) {
              // 處理紅燈減速
              const slowDownInfo = this.checkTrafficLightSlowDown(trafficController)
              if (slowDownInfo) {
                if (slowDownInfo.action === 'slow_for_light') {
                  this.currentState = 'slowing_for_light'
                  if (!this.originalTimeScale) {
                    this.originalTimeScale = this.movementTimeline.timeScale()
                  }
                  gsap.to(this.movementTimeline, {
                    timeScale: this.originalTimeScale * slowDownInfo.targetSpeedRatio,
                    duration: 0.5,
                    ease: 'power2.out',
                  })
                } else if (slowDownInfo.action === 'resume_from_slow') {
                  this.currentState = 'moving'
                  if (this.originalTimeScale) {
                    gsap.to(this.movementTimeline, {
                      timeScale: this.originalTimeScale,
                      duration: 0.5,
                      ease: 'power2.inOut',
                    })
                    this.originalTimeScale = null
                  }
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

              if (lightState === 'red' || lightState === 'yellow') {
                // 如果正在減速，讓它平滑停止
                if (this.currentState === 'slowing_for_light') {
                  gsap.to(this.movementTimeline, {
                    timeScale: 0,
                    duration: 0.5,
                    ease: 'power2.out',
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
                            duration: 0.3,
                            ease: 'power2.inOut',
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
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
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
        // 路口已清空，添加小隨機延遲後啟動
        const randomDelay = 0.5 + Math.random() * 1.0 // 0.5-1.5秒隨機延遲
        gsap.delayedCall(randomDelay, callback)
        return
      }

      // 還有對向車輛，繼續等待
      gsap.delayedCall(0.5, checkClearance) // 每0.5秒檢查一次
    }

    // 開始檢查
    checkClearance()
  }
}
