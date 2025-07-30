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
    this.currentPhase = 'eastWest' // eastWest 或 northSouth
    this.onTimerUpdate = null // 倒數更新回調函數

    // 觀察者模式相關
    this.observers = [] // 觀察者列表
    this.currentLightStates = {
      east: 'green',
      west: 'green',
      north: 'red',
      south: 'red',
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

  // 初始化所有紅綠燈
  init(eastElement, westElement, southElement, northElement) {
    this.lights.east = new TrafficLight(eastElement)
    this.lights.west = new TrafficLight(westElement)
    this.lights.south = new TrafficLight(southElement)
    this.lights.north = new TrafficLight(northElement)

    // 設置初始狀態：東西向綠燈，南北向紅燈
    this.updateLightState('east', 'green')
    this.updateLightState('west', 'green')
    this.updateLightState('south', 'red')
    this.updateLightState('north', 'red')
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
      if (this.currentPhase === 'eastWest') {
        // 東西向綠燈階段（15秒）
        this.updateTimer('東西向 綠燈', 15)
        await this.countdownDelay(15000)

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

        this.currentPhase = 'northSouth'
      } else {
        // 南北向綠燈階段（15秒）
        this.updateTimer('南北向 綠燈', 15)
        await this.countdownDelay(15000)

        // 南北向：綠燈 -> 黃燈 -> 紅燈
        console.log('南北向：綠燈 -> 黃燈')
        this.updateLightState('south', 'yellow')
        this.updateLightState('north', 'yellow')
        this.updateTimer('南北向 黃燈', 2)
        await this.countdownDelay(2000) // 黃燈 2 秒

        console.log('南北向：黃燈 -> 紅燈，東西向：紅燈 -> 綠燈')
        this.updateLightState('south', 'red')
        this.updateLightState('north', 'red')
        this.updateLightState('east', 'green')
        this.updateLightState('west', 'green')

        this.currentPhase = 'eastWest'
      }
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

  // 延遲函數
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // 獲取當前時相
  getCurrentPhase() {
    return this.currentPhase
  }
}
