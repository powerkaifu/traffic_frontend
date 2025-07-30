import { gsap } from 'gsap'

export default class Car {
  static carCounter = 0 // 靜態計數器，用於車輛編號

  constructor(x, y, direction = 'east', carType = 'large', laneNumber = 1) {
    this.direction = direction
    this.carType = carType // 新增：車輛類型
    this.laneNumber = laneNumber // 新增：車道編號
    this.element = this.createElement()
    this.currentState = 'waiting' // 初始狀態
    this.movementTimeline = null
    this.isAtStopLine = false
    this.waitingForGreen = false
    this.hasPassedStopLine = false // 新增：標記是否已經通過停止線
    this.periodicCheckTimer = null // 新增：定期檢查定時器
    this.containerPosition = null // 新增：記錄容器位置，用於檢測佈局變化

    // 車輛編號系統
    Car.carCounter++
    this.carNumber = Car.carCounter
    this.id = 'car_' + this.carNumber + '_' + Date.now()

    gsap.set(this.element, {
      x: x,
      y: y,
      opacity: 0, // 初始設為透明
      scale: 0.5, // 初始設為縮小
    })

    // 創建車道編號標籤
    this.createLaneNumberLabel()
  }

  // 獲取車輛配置 - 支持不同車輛類型和大小
  getCarConfig() {
    const carConfigs = {
      large: {
        east: { width: 35, height: 20, image: '/images/car/lCar_right.png' },
        west: { width: 35, height: 20, image: '/images/car/lCar_left.png' },
        north: { width: 60, height: 35, image: '/images/car/lCar_top.png' },
        south: { width: 60, height: 35, image: '/images/car/lCar_down.png' },
      },
      medium: {
        east: { width: 30, height: 18, image: '/images/car/mCar_right.png' },
        west: { width: 30, height: 18, image: '/images/car/mCar_left.png' },
        north: { width: 50, height: 30, image: '/images/car/mCar_top.png' },
        south: { width: 50, height: 30, image: '/images/car/mCar_down.png' },
      },
      small: {
        east: { width: 25, height: 15, image: '/images/car/sCar_right.png' },
        west: { width: 25, height: 15, image: '/images/car/sCar_left.png' },
        north: { width: 40, height: 25, image: '/images/car/sCar_top.png' },
        south: { width: 40, height: 25, image: '/images/car/sCar_down.png' },
      },
    }
    return carConfigs[this.carType]?.[this.direction] || carConfigs.large[this.direction]
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
      console.log(`🔄 檢測到佈局變化，車輛 ${this.direction} 更新容器位置`)
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
    const carHead = this.getCarHeadPosition()

    if (this.direction === 'east') {
      // 車頭在右側，檢查車頭X座標是否到達停止線
      return carHead.x >= stopLine.x && !this.isAtStopLine
    } else if (this.direction === 'west') {
      // 車頭在左側，檢查車頭X座標是否到達停止線
      return carHead.x <= stopLine.x && !this.isAtStopLine
    } else if (this.direction === 'north') {
      // 車頭在上方，檢查車頭Y座標是否到達停止線
      // 北向車輛從下往上移動，當車頭Y座標 <= 停止線Y座標時應該停止
      return carHead.y <= stopLine.y && !this.isAtStopLine
    } else if (this.direction === 'south') {
      // 車頭在下方，檢查車頭Y座標是否到達停止線
      return carHead.y >= stopLine.y && !this.isAtStopLine
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
  getCarHeadPosition() {
    const currentPos = this.getCurrentPosition()
    const carConfig = this.getCarConfig()
    const size = { width: carConfig.width, height: carConfig.height }

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
    const carConfig = this.getCarConfig()
    const size = { width: carConfig.width, height: carConfig.height }

    return {
      left: pos.x,
      right: pos.x + size.width,
      top: pos.y,
      bottom: pos.y + size.height,
      centerX: pos.x + size.width / 2,
      centerY: pos.y + size.height / 2,
    }
  }

  // 檢查與其他車輛的碰撞
  checkCollisionWith(otherCar) {
    const thisBox = this.getBoundingBox()
    const otherBox = otherCar.getBoundingBox()

    // 添加安全距離緩衝區 - 調整為更小的值，讓車輛能更緊密排列
    const safetyBuffer = 3 // 從15降低到3

    return !(
      thisBox.right + safetyBuffer < otherBox.left ||
      thisBox.left - safetyBuffer > otherBox.right ||
      thisBox.bottom + safetyBuffer < otherBox.top ||
      thisBox.top - safetyBuffer > otherBox.bottom
    )
  }

  // 檢查前方是否有車輛（同向車道）- 改進版本
  checkFrontCollision(allCars) {
    const currentPos = this.getCurrentPosition()
    const currentBox = this.getBoundingBox()

    // 安全跟車距離 - 調整為很小的距離，讓車輛緊接在前車後方
    const safeDistance = 8 // 從50降低到8，讓車輛更緊密跟隨

    for (let car of allCars) {
      if (car.id === this.id || car.direction !== this.direction) continue

      const otherPos = car.getCurrentPosition()
      const otherBox = car.getBoundingBox()

      // 檢查是否在同一車道（更精確的車道檢測）
      let inSameLane = false
      let isFront = false
      let distanceToFrontCar = 0

      if (this.direction === 'east') {
        // 東向：檢查Y軸位置是否在同一車道，X軸是否在前方
        inSameLane = Math.abs(currentPos.y - otherPos.y) < 25 // 車道寬度容錯
        isFront = otherBox.left > currentBox.right // 前車的左邊 > 本車的右邊
        distanceToFrontCar = otherBox.left - currentBox.right
      } else if (this.direction === 'west') {
        // 西向：檢查Y軸位置是否在同一車道，X軸是否在前方
        inSameLane = Math.abs(currentPos.y - otherPos.y) < 25
        isFront = otherBox.right < currentBox.left // 前車的右邊 < 本車的左邊
        distanceToFrontCar = currentBox.left - otherBox.right
      } else if (this.direction === 'north') {
        // 北向：檢查X軸位置是否在同一車道，Y軸是否在前方
        inSameLane = Math.abs(currentPos.x - otherPos.x) < 25
        isFront = otherBox.bottom < currentBox.top // 前車的底部 < 本車的頂部
        distanceToFrontCar = currentBox.top - otherBox.bottom
      } else if (this.direction === 'south') {
        // 南向：檢查X軸位置是否在同一車道，Y軸是否在前方
        inSameLane = Math.abs(currentPos.x - otherPos.x) < 25
        isFront = otherBox.top > currentBox.bottom // 前車的頂部 > 本車的底部
        distanceToFrontCar = otherBox.top - currentBox.bottom
      }

      // 如果在同一車道且在前方，且距離小於安全距離
      if (inSameLane && isFront && distanceToFrontCar < safeDistance) {
        return {
          car: car,
          distance: distanceToFrontCar,
          shouldStop: distanceToFrontCar < 5, // 從20降低到5，讓車輛能更緊密地跟隨
        }
      }
    }
    return null
  }

  // 停止移動 - 改進版本
  stopMovement() {
    if (this.movementTimeline) {
      this.movementTimeline.pause()
      if (this.currentState !== 'waitingForCar' && this.currentState !== 'waiting') {
        this.currentState = 'waiting'
        console.log(`車輛 ${this.direction} 停止移動`)
      }
    }
  }

  // 恢復移動 - 改進版本
  resumeMovement(allCars = []) {
    if (this.movementTimeline && (this.currentState === 'waiting' || this.currentState === 'waitingForCar')) {
      // 再次檢查前方是否還有車輛
      const frontCollision = this.checkFrontCollision(allCars)

      if (!frontCollision || (!frontCollision.shouldStop && frontCollision.car.currentState === 'moving')) {
        this.movementTimeline.resume()
        this.currentState = 'moving'
        console.log(`車輛 ${this.direction} 恢復移動`)
      }
    }
  }

  // 新增：強制恢復移動方法（用於綠燈時強制啟動）
  forceResumeMovement(allCars = []) {
    if (this.movementTimeline) {
      // 檢查前方車輛，但只在距離非常近時才停止
      const frontCollision = this.checkFrontCollision(allCars)

      if (!frontCollision || frontCollision.distance > 3) {
        this.movementTimeline.resume()
        this.currentState = 'moving'
        this.waitingForGreen = false
        console.log(`車輛 ${this.direction} 綠燈強制恢復移動`)
      } else {
        console.log(`車輛 ${this.direction} 前方車輛太近，等待空間`)
      }
    }
  }

  // 獲取各方向的起始點座標
  static getStartingPoints(direction) {
    const startingPoints = {
      east: [
        { x: 50, y: 200 },
        // 可在此添加更多東向起始點
      ],
      west: [
        { x: 750, y: 270 }, // 往北移動 10%（從 300 改為 270）
        // 可在此添加更多西向起始點
      ],
      north: [
        { x: 400, y: 550 },
        // 可在此添加更多北向起始點
      ],
      south: [
        { x: 300, y: 50 }, // 往南的第一個起始點
        // 可在此添加更多南向起始點
      ],
    }
    return startingPoints[direction] || []
  }

  // 從指定方向的起始點創建車輛
  static createFromStartingPoint(direction, pointIndex = 0) {
    const points = Car.getStartingPoints(direction)
    if (points.length > pointIndex) {
      const point = points[pointIndex]
      return new Car(point.x, point.y, direction)
    }
    throw new Error(`No starting point found for direction: ${direction}, index: ${pointIndex}`)
  }

  createElement() {
    // 獲取車輛配置（尺寸和圖片）
    const carConfig = this.getCarConfig()

    const div = document.createElement('div')
    div.className = 'car' // 添加類名以便查詢
    div.carInstance = this // 保存車輛實例的引用
    div.style.cssText = `
      position: absolute;
      width: ${carConfig.width}px;
      height: ${carConfig.height}px;
      background-image: url('${carConfig.image}');
      background-size: contain;
      background-repeat: no-repeat;
      z-index: 10;
    `
    return div
  }

  // 創建車輛編號標籤
  // 創建車道編號標籤
  createLaneNumberLabel() {
    const label = document.createElement('div')
    label.className = 'car-lane-label'
    label.textContent = this.laneNumber
    label.style.cssText = `
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 123, 255, 0.9);
      color: white;
      font-size: 12px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 10px;
      border: 1px solid #0066cc;
      z-index: 20;
      pointer-events: none;
      min-width: 20px;
      text-align: center;
      font-family: Arial, sans-serif;
    `

    this.element.appendChild(label)
    this.laneLabel = label
  }

  addTo(container) {
    container.appendChild(this.element)
    // 初始化時記錄容器位置
    this.checkLayoutChange()
  }

  moveTo(x, y, duration = 2, ease = 'power2.out') {
    return gsap.to(this.element, {
      x: x,
      y: y,
      duration: duration,
      ease: ease,
    })
  }

  // 帶有紅綠燈控制的移動方法 - 改進版本
  moveToWithTrafficControl(targetX, targetY, duration, trafficController, allCars = []) {
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
            console.log(`定期檢查發現: 車輛 ${this.direction} 應該移動但被卡住，強制啟動`)
            this.forceResumeMovement(allCars)
            this.waitingForGreen = false
            this.isAtStopLine = false
            this.hasPassedStopLine = true
          }
        }

        // 如果車輛在等待前車，但前車已經走了，也要檢查
        if (this.currentState === 'waitingForCar') {
          const frontCollision = this.checkFrontCollision(allCars)
          if (!frontCollision || frontCollision.distance > 10) {
            console.log(`定期檢查發現: 車輛 ${this.direction} 前方已清空，恢復移動`)
            this.resumeMovement(allCars)
          }
        }
      }, 2000) // 每2秒檢查一次

      // 創建移動時間線
      this.movementTimeline = gsap.timeline({
        onUpdate: () => {
          // 檢測佈局變化（抽屜開關等）
          this.checkLayoutChange()

          // 檢查前方車輛碰撞
          const frontCollision = this.checkFrontCollision(allCars)

          if (frontCollision) {
            const { car: frontCar, distance, shouldStop } = frontCollision

            // 如果前方車輛停止或距離太近，則停車
            if (frontCar.currentState === 'waiting' || frontCar.currentState === 'waitingForCar' || shouldStop) {
              if (this.currentState === 'moving') {
                this.stopMovement()
                this.currentState = 'waitingForCar'
                console.log(`車輛 ${this.direction} 因前方車輛停止，距離: ${distance.toFixed(1)}px`)
              }
              return
            }
          } else if (this.currentState === 'waitingForCar') {
            // 如果前方車輛已離開安全距離，恢復移動
            this.resumeMovement(allCars)
            this.currentState = 'moving'
            console.log(`車輛 ${this.direction} 前方車輛離開，恢復移動`)
          }

          // 檢查是否到達停止線（只有未通過停止線的車輛才檢查）
          if (!this.hasPassedStopLine && this.checkStopLine() && !this.waitingForGreen && !this.isAtStopLine) {
            this.isAtStopLine = true

            // 檢查紅綠燈狀態
            const lightState = trafficController.getCurrentLightState(this.direction)
            console.log(`車輛 ${this.direction} 到達停止線，燈號狀態: ${lightState}`)

            if (lightState === 'red' || lightState === 'yellow') {
              this.stopMovement()
              this.waitingForGreen = true
              console.log(`車輛 ${this.direction} 停在停止線等待綠燈`)

              // 監聽紅綠燈變化 - 改進版本
              const onLightChange = (direction, state) => {
                console.log(
                  `觀察者收到燈號變化: ${direction} -> ${state}, 車輛方向: ${this.direction}, 等待綠燈: ${this.waitingForGreen}`,
                )

                if (direction === this.direction && state === 'green' && this.waitingForGreen) {
                  console.log(`車輛 ${this.direction} 準備啟動`)

                  // 使用強制恢復移動方法
                  this.forceResumeMovement(allCars)
                  this.waitingForGreen = false
                  this.isAtStopLine = false
                  this.hasPassedStopLine = true // 標記已通過停止線
                  console.log(`車輛 ${this.direction} 綠燈亮起，繼續前進`)

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
                  console.log(`超時檢查: 車輛 ${this.direction} 當前燈號 ${currentLightState}`)

                  if (currentLightState === 'green') {
                    console.log(`超時恢復: 車輛 ${this.direction} 檢測到綠燈，強制啟動`)
                    this.forceResumeMovement(allCars)
                    this.waitingForGreen = false
                    this.isAtStopLine = false
                    this.hasPassedStopLine = true
                    trafficController.removeObserver(onLightChange)
                  }
                }
              }, 1000) // 1秒後檢查
            } else {
              console.log(`車輛 ${this.direction} 綠燈通過停止線`)
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

      // 添加移動動畫
      this.movementTimeline.to(this.element, {
        x: targetX,
        y: targetY,
        duration: duration,
        ease: 'none',
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
