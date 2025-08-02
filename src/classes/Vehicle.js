/**
 * Vehicle.js - 車輛實體類別
 *
 * 設計模式:
 * - Factory Pattern (工廠模式): 透過參數動態創建不同類型車輛 (motor/small/large)
 * - State Pattern (狀態模式): 管理車輛狀態 (waiting/moving/waitingForGreen/waitingForVehicle)
 * - Observer Pattern (觀察者模式): 監聽交通燈變化並相應調整行為
 * - Command Pattern (命令模式): 將車輛移動封裝為可執行的命令
 * - Composite Pattern (組合模式): 車輛由多個元件組成 (主體/標籤/動畫)
 *
 * 系統角色:
 * - 交通參與者: 模擬真實道路上的各種車輛行為
 * - 動畫實體: 負責視覺呈現和動畫效果
 * - 數據提供者: 向交通控制器回報車輛統計數據
 * - 碰撞檢測器: 實現車輛間的安全距離控制
 * - 智能代理: 根據交通狀況做出移動決策
 */
import { gsap } from 'gsap'

export default class Vehicle {
  constructor(x, y, direction = 'east', vehicleType = 'large', laneNumber = 1) {
    this.direction = direction
    this.vehicleType = vehicleType // 車輛類型（motor, small, large）
    this.laneNumber = laneNumber // 車道編號
    this.currentState = 'waiting' // 初始狀態
    this.movementTimeline = null
    this.isAtStopLine = false
    this.waitingForGreen = false
    this.hasPassedStopLine = false // 標記是否已經通過停止線
    this.periodicCheckTimer = null // 定期檢查定時器
    this.containerPosition = null // 記錄容器位置，用於檢測佈局變化
    this.element = this.createElement()

    // 生成唯一識別ID（用於碰撞檢測）
    this.id = 'vehicle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)

    gsap.set(this.element, {
      x: x,
      y: y,
      opacity: 0, // 初始設為透明
      scale: 0.5, // 初始設為縮小
    })

    // 創建車道編號標籤
    this.createLaneNumberLabel()

    // 車輛數據收集 - 通知交通控制器
    this.notifyTrafficController()
  }

  // 通知交通控制器車輛生成
  notifyTrafficController() {
    if (window.trafficController) {
      // 將車輛類型映射到正確的格式
      const vehicleTypeMapping = {
        large: 'large',
        small: 'small',
        motor: 'motor',
      }

      const mappedType = vehicleTypeMapping[this.vehicleType] || 'small'
      window.trafficController.updateVehicleData(this.direction, mappedType)
    }
  }

  // 生成車輛的隨機速度（基於車輛類型）
  generateRandomSpeed() {
    const speedRanges = {
      large: { min: 10, max: 20 }, // km/h (降低速度)
      small: { min: 15, max: 30 }, // km/h (降低速度)
      motor: { min: 18, max: 30 }, // km/h (降低最高速度)
    }

    const range = speedRanges[this.vehicleType] || speedRanges.small
    const randomSpeed = range.min + Math.random() * (range.max - range.min)
    return Math.round(randomSpeed)
  }

  // 計算基於速度的動畫時間
  calculateAnimationDuration(distance = 800) {
    // 假設路口通過距離約 800 像素
    const speed = this.generateRandomSpeed() // km/h
    const speedMs = (speed * 1000) / 3600 // 轉換為 m/s

    // 假設 100 像素 = 10 米（比例尺）
    const realDistance = (distance / 100) * 10 // 轉換為實際距離（米）

    // 計算理論時間（秒）
    const theoreticalTime = realDistance / speedMs

    // 為了視覺效果，將時間控制在合理範圍內（5-18秒，增加時間範圍）
    const minTime = 5
    const maxTime = 18
    const adjustedTime = Math.max(minTime, Math.min(maxTime, theoreticalTime))

    return adjustedTime
  }

  createElement() {
    // 獲取車輛配置（尺寸和圖片）
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
    `
    return div
  }

  // 創建車道編號標籤
  createLaneNumberLabel() {
    const label = document.createElement('div')
    label.className = 'vehicle-lane-label' // 改為 vehicle 類名
    label.textContent = this.laneNumber

    // 根據車輛方向調整標籤位置
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

  // 獲取車輛配置 - 支持不同車輛類型和大小
  getVehicleConfig() {
    const vehicleConfigs = {
      large: {
        east: { width: 35, height: 20, image: '/images/car/lCar_right.png' },
        west: { width: 35, height: 20, image: '/images/car/lCar_left.png' },
        north: { width: 60, height: 35, image: '/images/car/lCar_top.png' },
        south: { width: 60, height: 35, image: '/images/car/lCar_down.png' },
      },
      small: {
        east: { width: 30, height: 18, image: '/images/car/sCar_right.png' },
        west: { width: 30, height: 18, image: '/images/car/sCar_left.png' },
        north: { width: 50, height: 30, image: '/images/car/sCar_top.png' },
        south: { width: 50, height: 30, image: '/images/car/sCar_down.png' },
      },
      motor: {
        east: { width: 25, height: 15, image: '/images/car/mCar_right.png' },
        west: { width: 25, height: 15, image: '/images/car/mCar_left.png' },
        north: { width: 35, height: 25, image: '/images/car/mCar_top.png' },
        south: { width: 35, height: 25, image: '/images/car/mCar_down.png' },
      },
    }
    return vehicleConfigs[this.vehicleType]?.[this.direction] || vehicleConfigs.large[this.direction]
  }

  getStopLinePosition() {
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

  // 檢測容器位置是否發生變化（抽屜開關等）
  checkLayoutChange() {
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

  // 檢查是否到達停止線 - 使用實際停止線位置
  checkStopLine() {
    const stopLine = this.getStopLinePosition() // 這裡會獲取實際的停止線位置

    if (!stopLine.x && !stopLine.y) return false

    // 使用車頭位置進行停止線檢測
    const vehicleHead = this.getVehicleHeadPosition()

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

  // 獲取當前位置
  getCurrentPosition() {
    return {
      x: gsap.getProperty(this.element, 'x'),
      y: gsap.getProperty(this.element, 'y'),
    }
  }

  // 獲取車頭位置 - 根據方向和車輛大小計算
  getVehicleHeadPosition() {
    const currentPos = this.getCurrentPosition()
    const vehicleConfig = this.getVehicleConfig()
    const size = { width: vehicleConfig.width, height: vehicleConfig.height }

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

  // 獲取車輛邊界框
  getBoundingBox() {
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

  // 檢查前方是否有車輛（同向車道）- 改進版本
  checkFrontCollision(allVehicles) {
    const currentPos = this.getCurrentPosition()
    const currentBox = this.getBoundingBox()

    // 安全跟車距離 - 調整為很小的距離，讓車輛緊接在前車後方
    const safeDistance = 8 // 從50降低到8，讓車輛更緊密跟隨

    for (let vehicle of allVehicles) {
      if (vehicle.id === this.id || vehicle.direction !== this.direction) continue

      const otherPos = vehicle.getCurrentPosition()
      const otherBox = vehicle.getBoundingBox()

      // 檢查是否在同一車道（更精確的車道檢測）
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

      // 如果在同一車道且在前方，且距離小於安全距離
      if (inSameLane && isFront && distanceToFrontVehicle < safeDistance) {
        return {
          vehicle: vehicle,
          distance: distanceToFrontVehicle,
          shouldStop: distanceToFrontVehicle < 5, // 從20降低到5，讓車輛能更緊密地跟隨
        }
      }
    }
    return null
  }

  // 停止移動 - 改進版本
  stopMovement() {
    if (this.movementTimeline) {
      this.movementTimeline.pause()
      if (this.currentState !== 'waitingForVehicle' && this.currentState !== 'waiting') {
        this.currentState = 'waiting'
      }
    }
  }

  // 恢復移動 - 改進版本
  resumeMovement(allVehicles = []) {
    if (this.movementTimeline && (this.currentState === 'waiting' || this.currentState === 'waitingForVehicle')) {
      // 再次檢查前方是否還有車輛
      const frontCollision = this.checkFrontCollision(allVehicles)

      if (!frontCollision || (!frontCollision.shouldStop && frontCollision.vehicle.currentState === 'moving')) {
        this.movementTimeline.resume()
        this.currentState = 'moving'
      }
    }
  }

  // 新增：強制恢復移動方法（用於綠燈時強制啟動）
  forceResumeMovement(allVehicles = []) {
    if (this.movementTimeline) {
      // 檢查前方車輛，但只在距離非常近時才停止
      const frontCollision = this.checkFrontCollision(allVehicles)

      if (!frontCollision || frontCollision.distance > 3) {
        // 生成隨機延遲時間，讓車輛啟動更生動 (0-2秒)
        const randomDelay = Math.random() * 2

        // 使用 GSAP 的 delayedCall 實現隨機延遲啟動
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

  addTo(container) {
    container.appendChild(this.element)
    // 初始化時記錄容器位置
    this.checkLayoutChange()
  }

  // 帶有紅綠燈控制的移動方法 - 改進版本
  moveToWithTrafficControl(targetX, targetY, duration, trafficController, allVehicles = []) {
    return new Promise((resolve) => {
      this.currentState = 'moving'
      this.targetX = targetX
      this.targetY = targetY

      // 定期檢查機制，防止車輛卡住
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
          if (!frontCollision || frontCollision.distance > 10) {
            this.resumeMovement(allVehicles)
          }
        }
      }, 2000) // 每2秒檢查一次

      // 創建移動時間線
      this.movementTimeline = gsap.timeline({
        onUpdate: () => {
          // 檢測佈局變化（抽屜開關等）
          this.checkLayoutChange()

          // 檢查前方車輛碰撞
          const frontCollision = this.checkFrontCollision(allVehicles)

          if (frontCollision) {
            const { vehicle: frontVehicle, shouldStop } = frontCollision

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
          } else if (this.currentState === 'waitingForVehicle') {
            // 如果前方車輛已離開安全距離，恢復移動
            this.resumeMovement(allVehicles)
            this.currentState = 'moving'
          }

          // 檢查是否到達停止線（只有未通過停止線的車輛才檢查）
          if (!this.hasPassedStopLine && this.checkStopLine() && !this.waitingForGreen && !this.isAtStopLine) {
            this.isAtStopLine = true

            // 檢查紅綠燈狀態
            const lightState = trafficController.getCurrentLightState(this.direction)

            if (lightState === 'red' || lightState === 'yellow') {
              this.stopMovement()
              this.waitingForGreen = true

              // 監聽紅綠燈變化 - 改進版本
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

              // 添加觀察者
              trafficController.addObserver(onLightChange)

              // 設置超時機制，防止觀察者失效
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
          // 清理定期檢查定時器
          if (this.periodicCheckTimer) {
            clearInterval(this.periodicCheckTimer)
            this.periodicCheckTimer = null
          }

          // 只有當真正到達目標位置時才完成
          const currentPos = this.getCurrentPosition()
          const tolerance = 5 // 允許5px的誤差

          if (
            Math.abs(currentPos.x - this.targetX) <= tolerance &&
            Math.abs(currentPos.y - this.targetY) <= tolerance
          ) {
            resolve()
          }
        },
      })

      // 添加移動動畫 - 使用線性動畫
      this.movementTimeline.to(this.element, {
        x: targetX,
        y: targetY,
        duration: duration,
        ease: 'none', // 線性動畫，恆定速度
      })
    })
  }

  fadeOut(duration = 1) {
    return gsap.to(this.element, {
      opacity: 0,
      scale: 0.8,
      duration: duration,
      ease: 'power2.out',
    })
  }

  fadeIn(duration = 1) {
    return gsap.to(this.element, {
      opacity: 1,
      scale: 1,
      duration: duration,
      ease: 'back.out(1.7)',
    })
  }

  remove() {
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
