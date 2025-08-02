/**
 * TrafficLightController.js - 交通燈控制系統
 *
 * 設計模式:
 * - Observer Pattern (觀察者模式): 管理車輛對燈號變化的監聽
 * - Singleton Pattern (單例模式): 全域唯一的交通控制器實例
 * - State Pattern (狀態模式): 管理交通燈的狀態轉換 (red/yellow/green)
 * - Template Method Pattern (模板方法模式): 定義燈號循環的標準流程
 * - Strategy Pattern (策略模式): 不同時相的處理策略 (南北向/東西向)
 *
 * 系統角色:
 * - 核心控制器: 統一管理整個路口的交通流量
 * - 數據收集中心: 收集車輛數據並格式化為 API 格式
 * - AI 整合橋樑: 與後端 AI 系統通訊，獲取智能燈號時間
 * - 事件調度器: 協調車輛移動與燈號狀態的同步
 * - 時間管理器: 控制燈號切換的精確時序
 */
// TrafficLightController.js - 交通燈控制系統
import TrafficLight from './TrafficLight.js'

export default class TrafficLightController {
  constructor() {
    this.lights = {
      east: null, // 往東 (RoadA)
      west: null, // 往西 (RoadB)
      south: null, // 往南 (RoadC)
      north: null, // 往北 (RoadD)
    }
    this.isRunning = false
    this.currentPhase = 'northSouth' // eastWest 或 northSouth - 一開始以南北向為主
    this.onTimerUpdate = null // 倒數更新回調函數

    // 觀察者模式相關
    this.observers = [] // 觀察者列表
    this.currentLightStates = {
      east: 'red',
      west: 'red',
      north: 'green',
      south: 'green',
    }

    // API 相關設定
    this.apiEndpoint = 'http://localhost:8000/api/traffic/predict/'
    this.onPredictionUpdate = null // AI 預測更新回調函數

    // 動態綠燈時間（AI 預測結果）
    this.dynamicTiming = {
      eastWest: 15, // 東西向綠燈時間（秒）
      northSouth: 15, // 南北向綠燈時間（秒）- 一開始以南北向為主
    }

    // 下一輪的時間預測（提前獲取）
    this.nextTiming = {
      eastWest: 15,
      northSouth: 15,
    }

    // 車輛數據收集
    this.vehicleData = {
      east: { motor: 3, small: 5, large: 2 },
      west: { motor: 4, small: 6, large: 1 },
      south: { motor: 2, small: 4, large: 3 },
      north: { motor: 5, small: 7, large: 2 },
    }
  }

  // 添加觀察者
  addObserver(callback) {
    this.observers.push(callback)
  }

  // 移除觀察者
  removeObserver(callback) {
    this.observers = this.observers.filter((obs) => obs !== callback)
  }

  // 通知觀察者
  notifyObservers(direction, state) {
    this.observers.forEach((callback) => {
      callback(direction, state)
    })
  }

  // 獲取當前燈號狀態
  getCurrentLightState(direction) {
    return this.currentLightStates[direction]
  }

  // 更新燈號狀態
  updateLightState(direction, state) {
    this.currentLightStates[direction] = state
    if (this.lights[direction]) {
      this.lights[direction].setState(state)
    }
    this.notifyObservers(direction, state)
  }

  // 設置倒數更新回調
  setTimerUpdateCallback(callback) {
    this.onTimerUpdate = callback
  }

  // 設置 AI 預測更新回調
  setPredictionUpdateCallback(callback) {
    this.onPredictionUpdate = callback
  }

  // 更新車輛數據
  updateVehicleData(direction, vehicleType) {
    if (this.vehicleData[direction] && this.vehicleData[direction][vehicleType] !== undefined) {
      this.vehicleData[direction][vehicleType]++
    }
  }

  // 收集路口數據（VD 格式）
  collectIntersectionData() {
    const now = new Date()
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay() // 週日為7，週一為1
    const hour = now.getHours()
    const minute = now.getMinutes()
    const second = now.getSeconds()

    // 判斷是否為尖峰時段 (7-9AM, 5-7PM)
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1 : 0

    const vdData = []

    // VD_ID 映射到路段
    const vdMapping = {
      east: 'VLRJX20', // 東向
      west: 'VLRJM60', // 西向
      south: 'VLRJX00', // 南向
      north: 'VLRJX00', // 北向
    }

    // 為每個方向生成 VD 數據
    Object.keys(this.vehicleData).forEach((direction, index) => {
      const data = this.vehicleData[direction]
      const totalVehicles = data.motor + data.small + data.large

      // 計算平均速度
      const speeds = {
        motor: this.getAverageSpeed(direction, 'motor'),
        small: this.getAverageSpeed(direction, 'small'),
        large: this.getAverageSpeed(direction, 'large'),
      }

      // 計算整體平均速度
      const overallSpeed =
        totalVehicles > 0
          ? Math.round(
              (data.motor * speeds.motor + data.small * speeds.small + data.large * speeds.large) / totalVehicles,
            )
          : 0

      // 計算占有率
      const occupancy = Math.round(parseFloat(this.calculateOccupancy(direction)))

      // 按照 API 格式生成數據
      vdData.push({
        VD_ID: vdMapping[direction] || `VD${direction.toUpperCase()}`,
        DayOfWeek: dayOfWeek,
        Hour: hour,
        Minute: minute,
        Second: second,
        IsPeakHour: isPeakHour,
        LaneID: index, // 使用索引作為車道 ID
        LaneType: 1, // 預設車道類型為 1
        Speed: overallSpeed,
        Occupancy: occupancy,
        Volume_M: data.motor, // 機車數量
        Speed_M: speeds.motor, // 機車平均車速
        Volume_S: data.small, // 小客車數量
        Speed_S: speeds.small, // 小客車平均車速
        Volume_L: data.large, // 大客車數量
        Speed_L: speeds.large, // 大客車平均車速
        Volume_T: 0, // 聯結車數量（目前設為 0）
        Speed_T: 0, // 聯結車平均車速（目前設為 0）
      })
    })

    return vdData
  }

  // 獲取各車型的平均速度
  getAverageSpeed(direction, vehicleType) {
    const speedRanges = {
      motor: { min: 25, max: 45, avg: 35 },
      small: { min: 20, max: 40, avg: 30 },
      large: { min: 15, max: 30, avg: 22 },
    }

    const range = speedRanges[vehicleType]
    if (!range) return 30

    // 根據路段占有率調整速度
    const occupancy = parseFloat(this.calculateOccupancy(direction))
    let speedFactor = 1.0

    if (occupancy > 80) {
      speedFactor = 0.3 // 嚴重擁堵
    } else if (occupancy > 60) {
      speedFactor = 0.6 // 中度擁堵
    } else if (occupancy > 30) {
      speedFactor = 0.8 // 輕度擁堵
    }

    return Math.round(range.avg * speedFactor)
  }

  // 計算路段占有率
  calculateOccupancy(direction) {
    const data = this.vehicleData[direction]
    const totalVehicles = data.motor + data.small + data.large
    // 簡化的占有率計算：基於車輛數量和預估的路段容量
    const maxCapacity = 20 // 每個方向的最大容量
    return Math.min((totalVehicles / maxCapacity) * 100, 100).toFixed(1)
  }

  // 發送數據到後端 API（提前 10 秒請求）
  async sendDataToBackend() {
    try {
      const vdData = this.collectIntersectionData()
      console.log('🚦 發送交通數據到 AI 系統:', vdData)

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vdData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('🤖 AI 預測結果:', result)

      // 更新下一輪的綠燈時間
      if (result.east_west_seconds && result.south_north_seconds) {
        this.nextTiming.eastWest = result.east_west_seconds
        this.nextTiming.northSouth = result.south_north_seconds

        // 通知 UI 更新預測結果
        if (this.onPredictionUpdate) {
          this.onPredictionUpdate({
            eastWest: result.east_west_seconds,
            northSouth: result.south_north_seconds,
            timestamp: new Date().toLocaleTimeString(),
          })
        }

        console.log(
          `✅ 下一輪綠燈時間已更新 - 東西向: ${result.east_west_seconds}秒, 南北向: ${result.south_north_seconds}秒`,
        )
      }

      return result
    } catch (error) {
      console.warn('⚠️ API 呼叫失敗，使用預設時間:', error.message)
      // API 失敗時使用預設時間
      this.nextTiming.eastWest = 15
      this.nextTiming.northSouth = 15
      return null
    }
  }

  // 重置車輛數據
  resetVehicleData() {
    Object.keys(this.vehicleData).forEach((direction) => {
      this.vehicleData[direction] = { motor: 0, small: 0, large: 0 }
    })
  }

  // 初始化所有紅綠燈
  init(eastElement, westElement, southElement, northElement) {
    this.lights.east = new TrafficLight(eastElement)
    this.lights.west = new TrafficLight(westElement)
    this.lights.south = new TrafficLight(southElement)
    this.lights.north = new TrafficLight(northElement)

    // 設置初始狀態：南北向綠燈，東西向紅燈（一開始以南北向為主）
    this.updateLightState('south', 'green')
    this.updateLightState('north', 'green')
    this.updateLightState('east', 'red')
    this.updateLightState('west', 'red')
    this.currentPhase = 'northSouth' // 一開始以南北向為主
  }

  // 開始交通燈控制
  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.runCycle()
  }

  // 停止交通燈控制
  stop() {
    this.isRunning = false
  }

  // 運行一個完整的燈號循環
  async runCycle() {
    while (this.isRunning) {
      if (this.currentPhase === 'northSouth') {
        // 南北向綠燈階段
        console.log(`🚥 南北向綠燈開始 - 時間: ${this.dynamicTiming.northSouth}秒`)
        this.updateTimer('南北向 綠燈', this.dynamicTiming.northSouth)

        // 完整倒數南北向綠燈，在剩餘10秒時發送API
        await this.countdownDelayWithAPI(this.dynamicTiming.northSouth * 1000, 10)

        // 南北向：綠燈 -> 黃燈 -> 紅燈
        this.updateLightState('south', 'yellow')
        this.updateLightState('north', 'yellow')
        this.updateTimer('南北向 黃燈', 2)
        await this.countdownDelay(2000) // 黃燈 2 秒

        this.updateLightState('south', 'red')
        this.updateLightState('north', 'red')
        this.updateLightState('east', 'green')
        this.updateLightState('west', 'green')

        // 更新當前使用的時間為下一輪的時間
        this.dynamicTiming.eastWest = this.nextTiming.eastWest
        this.currentPhase = 'eastWest'
      } else {
        // 東西向綠燈階段
        console.log(`🚥 東西向綠燈開始 - 時間: ${this.dynamicTiming.eastWest}秒`)
        this.updateTimer('東西向 綠燈', this.dynamicTiming.eastWest)

        // 東西向不需要API請求，直接倒數完成
        await this.countdownDelay(this.dynamicTiming.eastWest * 1000)

        // 東西向：綠燈 -> 黃燈 -> 紅燈
        console.log('東西向：綠燈 -> 黃燈')
        this.updateLightState('east', 'yellow')
        this.updateLightState('west', 'yellow')
        this.updateTimer('東西向 黃燈', 2)
        await this.countdownDelay(2000) // 黃燈 2 秒

        console.log('東西向：黃燈 -> 紅燈，南北向：紅燈 -> 綠燈')
        this.updateLightState('east', 'red')
        this.updateLightState('west', 'red')
        this.updateLightState('south', 'green')
        this.updateLightState('north', 'green')

        // 更新當前使用的時間為下一輪的時間
        this.dynamicTiming.northSouth = this.nextTiming.northSouth
        this.currentPhase = 'northSouth'
      }

      // 重置車輛數據以準備下一輪收集
      this.resetVehicleData()
    }
  }

  // 更新計時器顯示
  updateTimer(phase, seconds) {
    if (this.onTimerUpdate) {
      this.onTimerUpdate(phase, seconds)
    }
  }

  // 倒數延遲函數
  async countdownDelay(totalMs) {
    const totalSeconds = Math.floor(totalMs / 1000)

    for (let i = totalSeconds; i > 0; i--) {
      if (this.onTimerUpdate) {
        // 只更新倒數秒數，不改變時相描述
        this.onTimerUpdate(null, i)
      }
      await this.delay(1000)
    }
  }

  // 帶API觸發的倒數延遲函數（專用於南北向綠燈）
  async countdownDelayWithAPI(totalMs, apiTriggerSeconds) {
    const totalSeconds = Math.floor(totalMs / 1000)
    let apiTriggered = false

    for (let i = totalSeconds; i > 0; i--) {
      if (this.onTimerUpdate) {
        // 只更新倒數秒數，不改變時相描述
        this.onTimerUpdate(null, i)
      }

      // 在剩餘指定秒數時觸發API
      if (i === apiTriggerSeconds && !apiTriggered) {
        console.log(`⏰ 剩餘 ${apiTriggerSeconds} 秒，開始請求下一輪 AI 預測...`)
        this.sendDataToBackend() // 異步請求，不等待結果
        apiTriggered = true
      }

      await this.delay(1000)
    }
  }

  // 延遲函數
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // 獲取當前時相
  getCurrentPhase() {
    return this.currentPhase
  }
}
