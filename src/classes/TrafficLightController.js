/**
 * TrafficLightController.js - 交通燈控制系統
 */
import TrafficLight from './TrafficLight.js'
import { speedConfig } from './config/trafficConfig.js' // 引入統一的速度設定
import VDNormalizationUtils from './utils/VDNormalizationUtils.js'
import { getCurrentTimePeriod } from './config/vdNormalizationConfig.js'
import { VOLUME_LIMITS_CONFIG } from './config/vehicleConfig.js'
import { getTimeConfigForScenario } from './config/vdPatternConfig.js' // 新增：情景時間配置

export default class TrafficLightController {
  constructor() {
    // Strategy Pattern: 不同方向的燈號管理策略
    this.lights = {
      east: null, // 往東 (RoadA)
      west: null, // 往西 (RoadB)
      south: null, // 往南 (RoadC)
      north: null, // 往北 (RoadD)
    }

    this.isRunning = false
    // State Pattern: 當前時相狀態管理
    this.currentPhase = 'northSouth' // eastWest 或 northSouth - 一開始以南北向為主
    this.onTimerUpdate = null // 倒數更新回調函數

    // Observer Pattern: 觀察者模式相關
    this.observers = [] // 觀察者列表
    // State Pattern: 管理所有方向的燈號狀態
    this.currentLightStates = {
      east: 'red',
      west: 'red',
      north: 'red',
      south: 'red',
    }

    // 🎯【新增】時段轉換追蹤 (用於偵測時段邊界)
    this.lastTimePeriod = getCurrentTimePeriod()
    this.timePeriodChangeCount = 0

    // 🎯【新增】左轉綠燈時間配置
    this.leftTurnTiming = {
      duration: 8, // 左轉綠燈持續時間（秒）
      enabled: true, // 是否啟用左轉燈號
    }

    // 🎯【新增】完整的時相時間配置
    this.phaseTimings = {
      // 直行綠燈時間（由 AI 動態決定，預設值）
      straightGreen: {
        northSouth: 12, // 南北向直行綠燈時間（秒）
        eastWest: 12, // 東西向直行綠燈時間（秒）
      },
      // 左轉綠燈時間
      leftTurnGreen: {
        duration: 10, // 左轉綠燈持續時間（秒）- 從8秒增加到12秒
      },
      // 黃燈時間
      yellow: {
        straight: 2, // 直行黃燈時間（秒）
        leftTurn: 2, // 左轉黃燈時間（秒）
      },
      // 全紅時間
      allRed: {
        duration: 3, // 全紅階段時間（秒）
      },
      // API 相關時間
      api: {
        callInterval: 10, // API 調用間隔（秒）- 在綠燈倒數到 1 秒時調用一次
      },
    }

    // API 相關設定
    this.apiEndpoint = 'http://localhost:8000/api/traffic/predict/'
    this.onPredictionUpdate = null // AI 預測更新回調函數
    this.dataScalingFactor = 1.5 // 調整縮放因子，增加車流量數據以獲得約60秒的綠燈時間

    // Strategy Pattern: 動態綠燈時間策略（AI 預測結果）
    this.dynamicTiming = {
      eastWest: this.phaseTimings.straightGreen.eastWest, // 東西向綠燈時間（秒）
      northSouth: this.phaseTimings.straightGreen.northSouth, // 南北向綠燈時間（秒）- 一開始以南北向為主
    }

    // Strategy Pattern: 下一輪的時間預測策略（提前獲取）
    this.nextTiming = {
      eastWest: this.phaseTimings.straightGreen.eastWest,
      northSouth: this.phaseTimings.straightGreen.northSouth,
    }

    // 車輛數據收集
    this.vehicleData = {
      east: { motor: 0, small: 0, large: 0 },
      west: { motor: 0, small: 0, large: 0 },
      south: { motor: 0, small: 0, large: 0 },
      north: { motor: 0, small: 0, large: 0 },
    }

    // ==========================================
    // 🛣️ 車道位置管理 (Lane Management)
    // ==========================================

    // 車道位置將在初始化時根據路口容器動態計算
    this.lanePositions = {
      east: [],
      west: [],
      north: [],
      south: [],
    }

    // 車輛終點位置也將動態計算
    this.endPositions = {
      east: 1200,
      west: -200,
      north: -200,
      south: 800,
    }

    // 全域車輛陣列（動畫/資料同步）
    if (!window.liveVehicles) {
      window.liveVehicles = []
    }

    // 註冊 vehicleRemoved 事件監聽
    window.addEventListener('vehicleRemoved', (e) => {
      this.handleVehicleRemoved(e.detail)
    })
  }

  // ==========================================
  // 🔍 Observer Pattern (觀察者模式) 方法群組
  // ==========================================

  // Observer Pattern: 添加觀察者
  addObserver(callback) {
    this.observers.push(callback)
  }

  // Observer Pattern: 移除觀察者
  removeObserver(callback) {
    this.observers = this.observers.filter((obs) => obs !== callback)
  }

  // Observer Pattern: 通知所有觀察者
  notifyObservers(direction, state) {
    this.observers.forEach((callback) => {
      callback(direction, state)
    })
  }

  // ==========================================
  // 🛣️ 車道管理系統 (Lane Management System)
  // ==========================================

  // 新增：根據容器中心點更新車道位置
  updateLanePositions(containerElement) {
    if (!containerElement) {
      return
    }

    const containerWidth = containerElement.offsetWidth
    const containerHeight = containerElement.offsetHeight
    const centerX = containerWidth / 2
    const centerY = containerHeight / 2
    // 根據觀察到的固定值，定義各車道相對於中心點的偏移量
    // 這些值是根據您舊的固定座標推算出來的，可能需要微調以完全符合您的視覺設計
    const southLaneXOffsets = [-23, -51, -78, -107] // 往南車道 X 軸偏移
    const northLaneXOffsets = [5, 34, 62, 91] // 往北車道 X 軸偏移
    const eastLaneYOffsets = [92, 63, 35, 6] // 往東車道 Y 軸偏移
    const westLaneYOffsets = [-23, -52, -79, -109] // 往西車道 Y 軸偏移
    // 定義車輛的起始位置（在畫面外部）
    const startXEast = -150 // 畫面左側外部
    const startXWest = containerWidth + 150 // 畫面右側外部
    const startYSouth = -150 // 畫面上方外部
    const startYNorth = containerHeight + 150 // 畫面下方外部

    // 計算並更新每個車道的絕對位置
    this.lanePositions.south = southLaneXOffsets.map((offsetX) => ({ x: centerX + offsetX, y: startYSouth }))
    this.lanePositions.north = northLaneXOffsets.map((offsetX) => ({ x: centerX + offsetX, y: startYNorth }))
    this.lanePositions.east = eastLaneYOffsets.map((offsetY) => ({ x: startXEast, y: centerY + offsetY }))
    this.lanePositions.west = westLaneYOffsets.map((offsetY) => ({ x: startXWest, y: centerY + offsetY }))

    // 同樣地，更新終點位置，使其也具有響應性
    this.endPositions = {
      east: containerWidth + 200,
      west: -200,
      north: -200,
      south: containerHeight + 200,
    }
  }

  // 獲取指定方向的所有車道位置
  getLanePositions(direction) {
    return this.lanePositions[direction]
  }

  // 獲取指定方向的隨機車道位置
  getRandomLanePosition(direction) {
    const lanes = this.getLanePositions(direction)
    if (lanes.length === 0) return null

    const randomIndex = Math.floor(Math.random() * lanes.length)

    // 🔧 統一車道編號：所有方向都使用一致的編號規則（索引0=車道1）
    const laneNumber = randomIndex + 1

    return {
      position: lanes[randomIndex],
      laneNumber: laneNumber, // 統一的車道編號
    }
  }

  // 獲取指定方向的終點位置
  getEndPosition(direction) {
    const endValue = this.endPositions[direction] || 0

    // 根據方向返回對應的座標對象
    switch (direction) {
      case 'east':
        return { x: endValue, y: this.lanePositions.east[0].y } // 使用第一車道的Y座標
      case 'west':
        return { x: endValue, y: this.lanePositions.west[0].y }
      case 'north':
        return { x: this.lanePositions.north[0].x, y: endValue } // 使用第一車道的X座標
      case 'south':
        return { x: this.lanePositions.south[0].x, y: endValue }
      default:
        return { x: 0, y: 0 }
    }
  }

  // 獲取車道統計信息
  getLaneStatistics() {
    const stats = {}
    Object.keys(this.lanePositions).forEach((direction) => {
      stats[direction] = {
        totalLanes: this.lanePositions[direction].length,
        startPositions: this.lanePositions[direction],
        endPosition: this.endPositions[direction],
      }
    })
    return stats
  }

  // ==========================================
  //  Factory Pattern (工廠模式) 方法群組
  // ==========================================

  // Factory Pattern: 初始化所有紅綠燈（包含左轉燈號）
  init(eastElement, westElement, southElement, northElement) {
    // Factory Pattern: 創建 TrafficLight 實例
    this.lights.east = new TrafficLight(eastElement)
    this.lights.west = new TrafficLight(westElement)
    this.lights.south = new TrafficLight(southElement)
    this.lights.north = new TrafficLight(northElement)

    // State Pattern: 設置初始狀態：全部紅燈，等待開始
    this.updateLightState('south', 'red')
    this.updateLightState('north', 'red')
    this.updateLightState('east', 'red')
    this.updateLightState('west', 'red')

    this.currentPhase = 'northSouth' // 一開始以南北向為主

    // 除錯：檢查初始狀態
    this.debugLightStates()

    // 監聽車輛事件以更新 vehicleData
    this.vehicleAddedHandler = (event) => {
      const { direction, type } = event.detail
      this.incrementVehicleData(direction, type)
    }
    this.vehicleRemovedHandler = (event) => {
      const { direction, type } = event.detail
      this.decrementVehicleData(direction, type)
    }

    window.addEventListener('vehicleAdded', this.vehicleAddedHandler)
    window.addEventListener('vehicleRemoved', this.vehicleRemovedHandler)
  }

  // ==========================================
  // 🔄 State Pattern (狀態模式) 方法群組
  // ==========================================

  // State Pattern: 獲取當前燈號狀態
  getCurrentLightState(direction) {
    return this.currentLightStates[direction]
  }

  // 🎯【新增】獲取左轉燈狀態
  // 除錯方法：檢查所有燈號狀態
  debugLightStates() {
    console.log('🚦 [DEBUG] 當前所有燈號狀態：')
    console.log(`  北燈：${this.currentLightStates.north} (DOM: ${this.lights.north?.currentState})`)
    console.log(`  南燈：${this.currentLightStates.south} (DOM: ${this.lights.south?.currentState})`)
    console.log(`  東燈：${this.currentLightStates.east} (DOM: ${this.lights.east?.currentState})`)
    console.log(`  西燈：${this.currentLightStates.west} (DOM: ${this.lights.west?.currentState})`)
    console.log(`  當前相位：${this.currentPhase}`)

    // 檢查是否有不一致的狀態
    const inconsistencies = []
    for (const direction of ['north', 'south', 'east', 'west']) {
      const controllerState = this.currentLightStates[direction]
      const domState = this.lights[direction]?.currentState
      if (controllerState !== domState) {
        inconsistencies.push(`${direction}: Controller(${controllerState}) != DOM(${domState})`)
      }
    }
  }

  // State Pattern: 更新燈號狀態並通知觀察者
  updateLightState(direction, state) {
    this.currentLightStates[direction] = state
    if (this.lights[direction]) {
      this.lights[direction].setState(state)
    }
    this.notifyObservers(direction, state) // Observer Pattern
  }

  // 🎯【新增】左轉燈號狀態更新方法
  // State Pattern: 獲取當前時相
  getCurrentPhase() {
    return this.currentPhase
  }

  // ==========================================
  // 📋 Template Method Pattern (模板方法模式) 方法群組
  // ==========================================

  // Template Method Pattern: 運行一個完整的燈號循環（包含左轉階段）
  async runCycle() {
    console.log('🔄 開始交通燈循環（直行優先的左轉燈號流程）...')
    this.debugLightStates()

    while (this.isRunning) {
      try {
        // State Pattern: 根據當前時相選擇處理策略
        if (this.currentPhase === 'northSouth') {
          // 🎯【階段1】南北向直行綠燈（先直行）
          this.updateLightState('east', 'red') // 東西向保持紅燈
          this.updateLightState('west', 'red')
          window.dispatchEvent(new CustomEvent('greenLightStarted'))
          this.updateLightState('south', 'green') // 南向直行綠燈(greenLight.png)
          this.updateLightState('north', 'green') // 北向直行綠燈(greenLight.png)

          this.updateTimer('南北向\n直行綠燈', this.dynamicTiming.northSouth)

          // 完整倒數南北向綠燈，在剩餘10秒時發送API
          await this.countdownDelayWithAPI(this.dynamicTiming.northSouth * 1000, this.phaseTimings.api.callInterval)

          // 南北向綠燈結束
          window.dispatchEvent(new CustomEvent('greenLightEnded'))

          // 🎯【階段2】南北向直行黃燈
          this.updateLightState('south', 'yellow')
          this.updateLightState('north', 'yellow')
          this.updateTimer('南北向\n直行黃燈', this.phaseTimings.yellow.straight)
          await this.countdownDelay(this.phaseTimings.yellow.straight * 1000)

          // 🎯【階段3】全紅階段 - 安全緩衝
          this.updateLightState('south', 'red')
          this.updateLightState('north', 'red')
          this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
          await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

          // 🎯【階段4】南北向左轉綠燈（後左轉）
          this.updateLightState('south', 'leftGreen') // 南向左轉綠燈(redLeftLight.png)
          this.updateLightState('north', 'leftGreen') // 北向左轉綠燈(redLeftLight.png)

          this.updateTimer('南北向\n左轉綠燈', this.phaseTimings.leftTurnGreen.duration)
          await this.countdownDelay(this.phaseTimings.leftTurnGreen.duration * 1000)

          // 🎯【階段5】左轉黃燈
          this.updateLightState('south', 'leftYellow') // 南向左轉黃燈(yellowLight.png)
          this.updateLightState('north', 'leftYellow') // 北向左轉黃燈(yellowLight.png)

          this.updateTimer('南北向\n左轉黃燈', this.phaseTimings.yellow.leftTurn)
          await this.countdownDelay(this.phaseTimings.yellow.leftTurn * 1000)

          // 🎯【階段6】左轉紅燈
          this.updateLightState('south', 'red') // 南向左轉紅燈(redLight.png)
          this.updateLightState('north', 'red') // 北向左轉紅燈(redLight.png)

          // 🎯【階段7】全紅階段 - 切換前緩衝
          this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
          await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

          // 🔧 修正：在南北向時相結束前，重置數據以準備東西向時相
          console.log('🔄 [相位切換] 南北向時相結束，重置數據以準備東西向')
          this.resetTrafficDataForNextCycle()

          // 切換至東西向
          this.currentPhase = 'eastWest'
          this.dynamicTiming.eastWest = this.nextTiming.eastWest
          console.log('🔄 [TrafficController] 相位切換至 eastWest')
          this.debugLightStates()
        } else {
          // 🎯【階段1】東西向直行綠燈（先直行）
          this.updateLightState('south', 'red') // 南北向保持紅燈
          this.updateLightState('north', 'red')
          window.dispatchEvent(new CustomEvent('greenLightStarted'))
          this.updateLightState('east', 'green') // 東向直行綠燈(greenLight.png)
          this.updateLightState('west', 'green') // 西向直行綠燈(greenLight.png)

          this.updateTimer('東西向\n直行綠燈', this.dynamicTiming.eastWest)

          // 東西向綠燈倒數
          await this.countdownDelay(this.dynamicTiming.eastWest * 1000)

          // 東西向綠燈結束
          window.dispatchEvent(new CustomEvent('greenLightEnded'))

          // 🎯【階段2】東西向直行黃燈
          this.updateLightState('east', 'yellow')
          this.updateLightState('west', 'yellow')
          this.updateTimer('東西向\n直行黃燈', this.phaseTimings.yellow.straight)
          await this.countdownDelay(this.phaseTimings.yellow.straight * 1000)

          // 🎯【階段3】全紅階段 - 安全緩衝
          this.updateLightState('east', 'red')
          this.updateLightState('west', 'red')
          this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
          await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

          // 🎯【階段4】東西向左轉綠燈（後左轉）
          this.updateLightState('east', 'leftGreen') // 東向左轉綠燈(redLeftLight.png)
          this.updateLightState('west', 'leftGreen') // 西向左轉綠燈(redLeftLight.png)

          this.updateTimer('東西向\n左轉綠燈', this.phaseTimings.leftTurnGreen.duration)
          await this.countdownDelay(this.phaseTimings.leftTurnGreen.duration * 1000)

          // 🎯【階段5】左轉黃燈
          this.updateLightState('east', 'leftYellow') // 東向左轉黃燈(yellowLight.png)
          this.updateLightState('west', 'leftYellow') // 西向左轉黃燈(yellowLight.png)

          this.updateTimer('東西向\n左轉黃燈', this.phaseTimings.yellow.leftTurn)
          await this.countdownDelay(this.phaseTimings.yellow.leftTurn * 1000)

          // 🎯【階段6】左轉紅燈
          this.updateLightState('east', 'red') // 東向左轉紅燈(redLight.png)
          this.updateLightState('west', 'red') // 西向左轉紅燈(redLight.png)

          // 🎯【階段7】全紅階段 - 切換前緩衝
          this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
          await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

          // 🔧 修正：在東西向時相結束前，重置數據以準備南北向時相
          console.log('🔄 [相位切換] 東西向時相結束，重置數據以準備南北向')
          this.resetTrafficDataForNextCycle()

          // 切換至南北向
          this.currentPhase = 'northSouth'
          this.dynamicTiming.northSouth = this.nextTiming.northSouth
          console.log('🔄 [TrafficController] 相位切換至 northSouth')
          this.debugLightStates()
        }

        // 🔧 移除：不再在這裡重置，改為在相位切換時重置
        // this.resetVehicleData()
      } catch (error) {
        console.error('🚨 交通燈循環出現錯誤:', error)
        await this.delay(1000)
      }
    }
  }

  // Template Method Pattern: 倒數延遲函數
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

  // Template Method Pattern: 帶API觸發的倒數延遲函數（專用於南北向綠燈）
  async countdownDelayWithAPI(totalMs, apiTriggerSeconds) {
    const totalSeconds = Math.floor(totalMs / 1000)
    let apiTriggered = false

    // 🔧 修正：計算實際觸發時機，確保不會錯過
    // 如果總秒數 < apiTriggerSeconds，則在開始時立即觸發
    const actualTriggerSeconds = Math.min(apiTriggerSeconds, totalSeconds)

    console.log(
      `🕐 [API觸發檢查] 總綠燈時間: ${totalSeconds}秒, 設定觸發時間: ${apiTriggerSeconds}秒, 實際觸發時間: ${actualTriggerSeconds}秒`,
    )

    for (let i = totalSeconds; i > 0; i--) {
      if (this.onTimerUpdate) {
        // 只更新倒數秒數，不改變時相描述
        this.onTimerUpdate(null, i)
      }

      // Strategy Pattern: 在剩餘指定秒數時觸發API
      if (i === actualTriggerSeconds && !apiTriggered) {
        console.log(`⏰ [API觸發] 剩餘 ${i} 秒，開始 AI 預測流程...`)
        console.log(`📊 [API觸發] 當前相位: ${this.currentPhase}, 綠燈總時間: ${totalSeconds}秒`)

        // 1. 收集當前週期的完整數據
        const currentCycleData = this.collectIntersectionData()

        // 2. 發送到 AI 後端（異步）
        this.sendDataToBackend(currentCycleData)

        // 3. 立即更新特徵模擬數據顯示
        this.updateFeatureSimulationDisplay(currentCycleData)

        // 🔧 修正：不再立即重置數據，改為在相位切換時重置
        // 這樣可以累積完整週期的車輛數據
        console.log('ℹ️ [API觸發] 數據已發送，將在相位切換時重置數據')

        apiTriggered = true
      }

      await this.delay(1000)
    }

    // 🔧 安全檢查：如果整個循環結束都沒觸發，記錄警告
    if (!apiTriggered) {
      console.warn(
        `⚠️ [API觸發失敗] 南北向綠燈 ${totalSeconds} 秒已結束，但未觸發API（設定值: ${apiTriggerSeconds}秒）`,
      )
    }
  }

  // ==========================================
  // 🎯 Strategy Pattern (策略模式) 方法群組
  // ==========================================

  // Strategy Pattern: 收集路口數據（VD 格式）- 數據收集策略
  collectIntersectionData() {
    // 🎯【新增】增加 API 呼叫計數，用於第一/二次呼叫時的隨機化
    this.apiCallCount = (this.apiCallCount || 0) + 1
    console.log(`📞 [API 計數] 第 ${this.apiCallCount} 次呼叫`)

    // 🎯【改進】使用情景時間配置而不是系統時間
    // 根據當前選擇的時段來定義時間，不依賴電腦系統時間
    const selectedTimePeriod = window.selectedTrafficTimePeriod || 'off_peak'
    const timeConfig = getTimeConfigForScenario(selectedTimePeriod)

    const dayOfWeek = timeConfig.dayOfWeek // 使用配置中的工作日 (2 = 週二)
    const hour = timeConfig.hour // 使用配置中的小時
    const minute = timeConfig.minute // 使用配置中的分鐘
    const second = timeConfig.second // 使用配置中的秒
    const isPeakHour = timeConfig.isPeakHour // 使用配置中的尖峰標記

    console.log(
      `📅 [時間配置] 情景: ${selectedTimePeriod} → 時間: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} (尖峰=${isPeakHour})`,
    )

    const vdData = []

    // 🔧 添加日誌：顯示當前 vehicleData 狀態
    console.log('📊 [數據收集] 當前 vehicleData 原始狀態:', JSON.stringify(this.vehicleData, null, 2))

    // Strategy Pattern: VD_ID 映射策略
    const vdMapping = {
      east: 'VLRJX20', // 東向
      west: 'VLRJM60', // 西向
      south: 'VLRJX00', // 南向
      north: 'VLRJX00', // 北向
    }

    // 為每個方向生成 VD 數據
    Object.keys(this.vehicleData).forEach((direction, index) => {
      const data = this.vehicleData[direction]

      // 🔧 修正：只在總數為 0 時使用最小值，否則使用真實數據
      const totalRaw = data.motor + data.small + data.large

      let scaledMotor, scaledSmall, scaledLarge

      if (totalRaw === 0) {
        // 沒有車輛時使用最小值
        const minMotor = 1 // 降低最少機車數量
        const minSmall = 1 // 降低最少小客車數量
        const minLarge = 0 // 降低最少大客車數量

        scaledMotor = minMotor
        scaledSmall = minSmall
        scaledLarge = minLarge

        console.log(
          `⚠️ [數據收集] ${direction} 方向無車輛，使用最小值: motor=${minMotor}, small=${minSmall}, large=${minLarge}`,
        )
      } else {
        // 有車輛時使用真實數據（應用縮放因子）
        scaledMotor = Math.round(data.motor * this.dataScalingFactor)
        scaledSmall = Math.round(data.small * this.dataScalingFactor)
        scaledLarge = Math.round(data.large * this.dataScalingFactor)

        console.log(
          `✅ [數據收集] ${direction} 方向 - 原始: motor=${data.motor}, small=${data.small}, large=${data.large} | 縮放後: motor=${scaledMotor}, small=${scaledSmall}, large=${scaledLarge}`,
        )
      }
      const totalVehicles = scaledMotor + scaledSmall + scaledLarge

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
              (scaledMotor * speeds.motor + scaledSmall * speeds.small + scaledLarge * speeds.large) / totalVehicles,
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
        Volume_M: scaledMotor, // 機車數量
        Speed_M: speeds.motor, // 機車平均車速
        Volume_S: scaledSmall, // 小客車數量
        Speed_S: speeds.small, // 小客車平均車速
        Volume_L: scaledLarge, // 大客車數量
        Speed_L: speeds.large, // 大客車平均車速
        Volume_T: 0, // ✅ 聯結車數量（該縣市禁止聯結車進入）
        Speed_T: 0, // ✅ 聯結車平均車速（該縣市禁止聯結車進入）
      })
    })

    // 🔧 添加日誌：顯示處理後的數據
    console.log('📤 [數據發送] 處理後的 vdData:', JSON.stringify(vdData, null, 2))

    return vdData
  }

  // Strategy Pattern: 獲取各車型的平均速度策略
  getAverageSpeed(direction, vehicleType) {
    // 從統一的設定檔讀取速度範圍
    const range = speedConfig[vehicleType]
    if (!range) return 30
    // Strategy Pattern: 根據路段占有率調整速度的策略
    const occupancy = parseFloat(this.calculateOccupancy(direction))
    let speedFactor = 1.0 // 基礎速度因子，不再強制降低到路口速度

    if (occupancy > 80) {
      speedFactor *= 0.4 // 嚴重擁堵時大幅降速
    } else if (occupancy > 60) {
      speedFactor *= 0.6 // 中度擁堵
    } else if (occupancy > 30) {
      speedFactor *= 0.8 // 輕度擁堵
    } else {
      speedFactor *= 0.9 // 正常情況下稍微降速（模擬路口減速）
    }

    // 🎯【新增】第一次 API 呼叫時加入隨機波動，使速度不固定
    // 這樣即使邏輯相同，每次呼叫也會產生不同的速度值
    if (this.apiCallCount === 1 || this.apiCallCount === 2) {
      const speedVariation = (Math.random() - 0.5) * 10 // -5 ~ +5 的隨機波動
      const baseSpeed = Math.round(range.avg * speedFactor)
      const variatedSpeed = Math.round(Math.max(20, Math.min(60, baseSpeed + speedVariation))) // 確保是整數
      return variatedSpeed + 0.0 // 返回整數 + .0 的格式
    }

    return Math.round(range.avg * speedFactor) + 0.0
  }

  // Strategy Pattern: 計算路段占有率策略
  calculateOccupancy(direction) {
    const data = this.vehicleData[direction]
    const totalVehicles = data.motor + data.small + data.large
    // 調整占有率計算：增加基礎占有率以模擬中等流量情況
    const maxCapacity = 60 // 降低最大容量以提高占有率敏感度，模擬較繁忙路段
    let baseOccupancy = 15 // 基礎占有率，確保即使車輛較少時也有一定的占有率

    // 🎯【新增】第一次 API 呼叫時加入隨機波動，使占有率不固定
    if (this.apiCallCount === 1 || this.apiCallCount === 2) {
      baseOccupancy = Math.floor(Math.random() * 15) + 10 // 10-24 的隨機基礎占有率
    }

    const calculatedOccupancy = (totalVehicles / maxCapacity) * 100
    const finalOccupancy = Math.min(baseOccupancy + calculatedOccupancy, 100)
    return finalOccupancy.toFixed(1)
  }

  // ===== 🔌 後端上限限制相關方法 =====

  /**
   * 根據時段獲取後端數據上限
   * @param {string} timePeriod - 時段 ('peak_hours', 'off_peak', 'late_night')
   * @returns {number} 後端允許的最大體積
   */
  _getMaxBackendVolumeForPeriod(timePeriod) {
    const limits = VOLUME_LIMITS_CONFIG[timePeriod] || VOLUME_LIMITS_CONFIG['off_peak']
    return limits.maxLiveVehiclesForBackend || 20
  }

  /**
   * 對前端數據進行後端上限縮放
   * 確保發送給後端的數據不超過 maxLiveVehiclesForBackend
   * @param {object} frontendData - 前端生成的數據（包含 Volume_T, Volume_M, Volume_S, Volume_L）
   * @param {string} timePeriod - 時段
   * @returns {object} 後端適配的數據
   */
  _scaleDataToBackendLimit(frontendData, timePeriod) {
    const maxBackendVolume = this._getMaxBackendVolumeForPeriod(timePeriod)
    const currentVolume = frontendData?.Volume_T || 0

    if (currentVolume <= 0) {
      // 如果沒有體積數據，直接返回
      return frontendData
    }

    // 計算縮放因子
    const scaleFactor = Math.min(1, maxBackendVolume / currentVolume)

    if (scaleFactor < 1) {
      console.log(
        `🔌 [後端上限] 將體積從 ${currentVolume} 縮小到 ${Math.round(currentVolume * scaleFactor)} (時段=${timePeriod}, 上限=${maxBackendVolume})`,
      )

      // 返回縮放後的數據
      return {
        ...frontendData,
        Volume_T: Math.round((frontendData.Volume_T || 0) * scaleFactor),
        Volume_M: Math.round((frontendData.Volume_M || 0) * scaleFactor),
        Volume_S: Math.round((frontendData.Volume_S || 0) * scaleFactor),
        Volume_L: Math.round((frontendData.Volume_L || 0) * scaleFactor),
        // 佔有率也要縮小
        Occupancy: (frontendData.Occupancy || 0) * scaleFactor,
        // 記錄縮放信息
        _backendScaleFactor: scaleFactor,
        _backendMaxVolume: maxBackendVolume,
      }
    }

    return frontendData
  }

  // Strategy Pattern: 發送數據到後端 API（提前 10 秒請求）
  async sendDataToBackend(vdData = null) {
    try {
      // 🎯 優先使用生成的 VD 數據（來自 AutoTrafficGenerator）
      let dataToSend = null
      if (vdData) {
        dataToSend = vdData
        console.log('⏳ 已取得傳入的 VD 原始數據，準備進行正規化轉換...')
      } else if (window.currentGeneratedVDData?.apiVDData) {
        // 使用全局保存的生成 VD 數據
        dataToSend = window.currentGeneratedVDData.apiVDData
        console.log('⏳ 已取得全局保存的生成 VD 原始數據，準備進行正規化轉換...')
      } else {
        // 備用方案：使用本地收集的數據
        dataToSend = this.collectIntersectionData()
        console.log('⏳ 已使用本地收集的數據（備用方案），準備進行正規化轉換...')
      }

      // 🎯【關鍵步驟 1】確保 dataToSend 是陣列格式（後端期望 4 筆路口特徵資料）
      let allIntersectionData = []
      if (Array.isArray(dataToSend)) {
        // 已經是陣列格式（來自 collectIntersectionData()）
        allIntersectionData = dataToSend
        console.log('✅ 數據已是陣列格式，包含 ' + allIntersectionData.length + ' 筆交叉路口數據')
      } else if (dataToSend && typeof dataToSend === 'object') {
        // 單個物件（來自 AutoTrafficGenerator），需要複製為 4 筆（東、西、南、北）
        console.log('📋 檢測到單筆 AutoTrafficGenerator 數據，準備擴展為 4 筆交叉路口...')

        // 東、西、南、北的 VD_ID 和方向信息
        const directions = [
          { id: 'VLRJX20', name: '東向' },
          { id: 'VLRJM60', name: '西向' },
          { id: 'VLRJX00', name: '南向' },
          { id: 'VLRJX00', name: '北向' },
        ]

        // 將單筆數據複製為 4 筆（每個方向一筆），保持相同的流量/速度數據
        allIntersectionData = directions.map((direction, index) => ({
          ...dataToSend,
          VD_ID: direction.id,
          LaneID: index,
          Direction: direction.name,
          // ✅ 保持原始的 Volume_M, Volume_S, Volume_L, Speed 等數據
        }))

        console.log('✅ 已將單筆數據擴展為 4 筆交叉路口數據（東、西、南、北）')
      } else {
        console.error('❌ 數據格式錯誤，無法發送到後端')
        throw new Error('Invalid data format: expected array or object with intersection data')
      }

      // ✅ 進行正規化轉換：前端顯示數據 → API 發送數據
      const normalizedDataArray = allIntersectionData.map((singleData) => {
        // 提取路口 ID 和時段
        let intersectionId = singleData?.VD_ID || 'VLRJM60'
        const timePeriod = getCurrentTimePeriod()

        // 容錯：檢查時段轉換
        if (timePeriod !== this.lastTimePeriod) {
          console.warn(`⚠️ [時段轉換] ${this.lastTimePeriod} → ${timePeriod} 於 ${new Date().toLocaleTimeString()}`)
          this.timePeriodChangeCount++
          this.lastTimePeriod = timePeriod
        }

        // 容錯：驗證路口 ID
        const validIds = ['VLRJM60', 'VLRJX00', 'VLRJX20']
        if (!validIds.includes(intersectionId)) {
          console.warn(`⚠️ [路口容錯] 無效的路口 ID: ${intersectionId}，使用 VLRJM60`)
          intersectionId = 'VLRJM60'
        }

        // 準備前端生成的數據（視覺層 × displayMultiplier）
        const frontendData = {
          volume: singleData?.Volume_T ?? 0,
          speed: singleData?.Speed_T ?? 0,
          occupancy: singleData?.Occupancy ?? 0,
          volume_m: singleData?.Volume_M ?? 0,
          volume_s: singleData?.Volume_S ?? 0,
          volume_l: singleData?.Volume_L ?? 0,
        }

        // 🔌 【新增】應用後端上限縮放：確保數據符合後端訓練範圍
        const scaledData = this._scaleDataToBackendLimit(frontendData, timePeriod)

        // 【核心】執行正規化轉換：將前端顯示數據轉換為 API 層數據
        const normalizedData = VDNormalizationUtils.denormalizeToVDRange(scaledData, intersectionId, timePeriod)

        // 驗證正規化結果
        const validation = VDNormalizationUtils.validateNormalizedData(normalizedData, intersectionId, timePeriod)

        // 容錯：檢查驗證是否失敗
        if (!validation.isValid && validation.errors?.length > 0) {
          console.warn(`⚠️ [驗證警告] ${intersectionId} ${timePeriod}: ${validation.errors.join(', ')}`)
        }

        // ✅ 返回正規化後的交叉路口數據（18個欄位給後端 + 元數據用於日誌）
        const apiData = {
          VD_ID: singleData.VD_ID,
          DayOfWeek: singleData.DayOfWeek,
          Hour: singleData.Hour,
          Minute: singleData.Minute,
          Second: singleData.Second,
          IsPeakHour: singleData.IsPeakHour,
          LaneID: singleData.LaneID,
          LaneType: singleData.LaneType,
          Speed: Math.round(normalizedData.speed || singleData.Speed || 0),
          Occupancy: Math.round((normalizedData.occupancy || singleData.Occupancy || 0) * 10) / 10,
          Volume_M: Math.round(normalizedData.volume_m || singleData.Volume_M || 0),
          Speed_M: singleData.Speed_M,
          Volume_S: Math.round(normalizedData.volume_s || singleData.Volume_S || 0),
          Speed_S: singleData.Speed_S,
          Volume_L: Math.round(normalizedData.volume_l || singleData.Volume_L || 0),
          Speed_L: singleData.Speed_L,
          Volume_T: Math.round(normalizedData.volume || singleData.Volume_T || 0),
          Speed_T: normalizedData.speed || singleData.Speed_T || 0,
        }

        // 🔧 為了方便日誌打印，暫時添加元數據到物件中（不會發送給後端）
        // 注意：finalDataToSend 發送給後端前會移除這些字段
        Object.defineProperty(apiData, 'normalization_period', {
          value: timePeriod,
          enumerable: false,
        })
        Object.defineProperty(apiData, 'normalization_displayMultiplier', {
          value: VDNormalizationUtils.getDisplayMultiplier
            ? VDNormalizationUtils.getDisplayMultiplier(intersectionId)
            : 1,
          enumerable: false,
        })
        Object.defineProperty(apiData, 'weather', {
          value: 'CLEAR',
          enumerable: false,
        })
        Object.defineProperty(apiData, 'weather_multiplier', {
          value: 1.0,
          enumerable: false,
        })
        Object.defineProperty(apiData, 'validation_passed', {
          value: validation.isValid,
          enumerable: false,
        })
        Object.defineProperty(apiData, 'validation_errors', {
          value: validation.errors || [],
          enumerable: false,
        })
        Object.defineProperty(apiData, 'validation_warnings', {
          value: validation.warnings || [],
          enumerable: false,
        })

        return apiData
      })

      // 🎯【重要】最終要發送給後端的格式：直接發送陣列（後端期望的格式）
      const finalDataToSend = normalizedDataArray

      // ✅ 先處理第一筆數據用於日誌（如果有多筆）
      const firstData = normalizedDataArray[0] || {}

      // ✅ 【新增】打印正規化轉換完成
      console.log('✅ 【正規化轉換完成】傳入的 VD 數據已成功正規化:')
      console.log(`  - 交叉路口數量: ${normalizedDataArray.length}`)
      console.log(`  - 正規化倍數: ${firstData.normalization_displayMultiplier}x`)
      console.log(`  - 時段: ${firstData.normalization_period}`)

      // 【新增】打印完整的正規化後陣列（物件形式，可用 Copy object 複製）
      console.log('📦 【完整的正規化後陣列 - 右鍵 Copy object 複製】:')
      console.log(normalizedDataArray)

      // 【新增】打印格式化的 JSON 字符串（便於閱讀和檢查）
      console.log('📋 【格式化的 JSON 字符串 - 便於閱讀】:')
      console.log(JSON.stringify(normalizedDataArray, null, 2))

      console.log('🚦 發送正規化後的交通數據到後端 AI 系統:')
      console.log(`  - 交叉路口數量: ${normalizedDataArray.length}`)
      console.log(`  - 第一筆流量: Volume_T=${firstData.Volume_T}`)
      console.log(`  - 第一筆車型: M=${firstData.Volume_M}, S=${firstData.Volume_S}, L=${firstData.Volume_L}`)
      console.log(`  - 時段信息: ${firstData.normalization_period}`)

      // ✅ 【新增】打印完整的正規化數據
      console.log('📊 【正規化數據詳情】以下是要發送給後端的 4 筆交叉路口正規化數據:')
      normalizedDataArray.forEach((data, index) => {
        console.log(`  [交叉路口 ${index + 1}] ${data.VD_ID} (${data.normalization_period}):`)
        console.log(
          `    - 流量: Volume_T=${data.Volume_T}, Volume_M=${data.Volume_M}, Volume_S=${data.Volume_S}, Volume_L=${data.Volume_L}`,
        )
        console.log(
          `    - 速度: Speed_T=${data.Speed_T}, Speed_M=${data.Speed_M}, Speed_S=${data.Speed_S}, Speed_L=${data.Speed_L}`,
        )
        console.log(`    - 佔有率: ${data.Occupancy}%`)
        console.log(`    - 正規化倍數: ${data.normalization_displayMultiplier}x`)
        // 🌤️ 【新增】顯示天氣信息
        console.log(`    - 天氣: ${data.weather} (倍數: ${data.weather_multiplier?.toFixed(2)}x)`)
        console.log(`    - 驗證: ${data.validation_passed ? '✅ 通過' : '❌ 失敗'}`)
        if (data.validation_errors?.length > 0) {
          console.log(`    - 錯誤: ${data.validation_errors.join(', ')}`)
        }
        if (data.validation_warnings?.length > 0) {
          console.log(`    - 警告: ${data.validation_warnings.join(', ')}`)
        }
      })
      console.log('✅ 正規化數據已準備完畢，即將發送到後端...')

      // 發送 API 開始事件
      window.dispatchEvent(new CustomEvent('trafficApiSending', { detail: { timestamp: new Date().toISOString() } }))

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalDataToSend),
      })

      // ✅ 【新增】發送成功確認訊息
      console.log('✅ 【正規化數據已成功發送到後端】')
      console.log(`✅ 已發送 ${normalizedDataArray.length} 筆交叉路口正規化數據`)
      console.log(`✅ 正規化倍數: ${firstData.normalization_displayMultiplier}x`)
      console.log(`✅ 時段: ${firstData.normalization_period}`)

      // 🎯【新增】保存快照供 MainLayout.vue 使用
      window.lastNormalizedDataArray = normalizedDataArray
      console.log('💾 [TrafficLightController] 已保存正規化數據快照到 window.lastNormalizedDataArray')

      if (!response.ok) {
        // 嘗試獲取錯誤信息
        let errorBody = '無法解析錯誤信息'
        try {
          const errorData = await response.clone().json()
          errorBody = JSON.stringify(errorData)
        } catch {
          try {
            errorBody = await response.clone().text()
          } catch {
            errorBody = '無法讀取響應體'
          }
        }
        console.error(`❌ [API 錯誤詳情]`)
        console.error(`  - 狀態碼: ${response.status}`)
        console.error(`  - 錯誤信息: ${errorBody}`)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`)
      }

      const result = await response.json()
      console.log('🤖 收到真實 AI 預測結果:', result)

      // 清空特徵模擬數據
      if (window.trafficDataCollector && typeof window.trafficDataCollector.reset === 'function') {
        window.trafficDataCollector.reset()
      }

      // 發送 API 完成事件
      window.dispatchEvent(
        new CustomEvent('trafficApiComplete', { detail: { timestamp: new Date().toISOString(), response: result } }),
      )

      // 更新下一輪的綠燈時間
      if (result.east_west_seconds && result.south_north_seconds) {
        this.nextTiming.eastWest = result.east_west_seconds
        this.nextTiming.northSouth = result.south_north_seconds

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
      console.warn('⚠️ 真實 API 呼叫失敗:', error.message)
      console.log('🔄 啟用本地模擬 AI 作為備援方案...')

      // *** 備援方案：呼叫本地模擬 AI ***
      // 🎯 優先使用生成的 VD 數據，備用方案才用本地收集數據
      let dataToSend = null
      if (vdData) {
        dataToSend = vdData
      } else if (window.currentGeneratedVDData?.apiVDData) {
        dataToSend = window.currentGeneratedVDData.apiVDData
      } else {
        dataToSend = this.collectIntersectionData()
      }
      const result = this.getAISuggestion(dataToSend)

      // 發送 API 錯誤事件
      window.dispatchEvent(
        new CustomEvent('trafficApiError', { detail: { timestamp: new Date().toISOString(), error: error.message } }),
      )

      // 更新下一輪的綠燈時間
      if (result.east_west_seconds && result.south_north_seconds) {
        this.nextTiming.eastWest = result.east_west_seconds
        this.nextTiming.northSouth = result.south_north_seconds

        if (this.onPredictionUpdate) {
          this.onPredictionUpdate({
            eastWest: result.east_west_seconds,
            northSouth: result.south_north_seconds,
            timestamp: new Date().toLocaleTimeString(),
          })
        }
        console.log(
          `✅ (備援) 下一輪綠燈時間已更新 - 東西向: ${result.east_west_seconds}秒, 南北向: ${result.south_north_seconds}秒`,
        )
      }
      return null
    }
  }

  // ==========================================
  // 🤖 AI 決策模擬系統 (AI Decision Simulation)
  // ==========================================

  // 模擬 AI 獲取建議
  getAISuggestion(currentData) {
    console.log('🧠 模擬 AI 正在分析數據:', currentData)

    let northSouthTotal = 0
    let eastWestTotal = 0

    // 計算南北向和東西向的總車流量
    currentData.forEach((data) => {
      const totalVehicles = data.Volume_M + data.Volume_S + data.Volume_L
      if (data.VD_ID.includes('VLRJX00')) {
        // 南北向
        northSouthTotal += totalVehicles
      } else if (data.VD_ID.includes('VLRJX20') || data.VD_ID.includes('VLRJM60')) {
        // 東西向
        eastWestTotal += totalVehicles
      }
    })

    console.log(`📈 AI 分析結果 - 南北向車流: ${northSouthTotal}, 東西向車流: ${eastWestTotal}`)

    // 基礎秒數
    const baseTime = 10 // 基礎綠燈時間
    const extraTimePerCar = 0.5 // 每多一輛車增加的秒數

    // 計算建議秒數
    let northSouthSeconds = baseTime + northSouthTotal * extraTimePerCar
    let eastWestSeconds = baseTime + eastWestTotal * extraTimePerCar

    // 設定秒數上下限
    const minTime = 8 // 最短綠燈時間
    const maxTime = 45 // 最長綠燈時間
    northSouthSeconds = Math.max(minTime, Math.min(northSouthSeconds, maxTime))
    eastWestSeconds = Math.max(minTime, Math.min(eastWestSeconds, maxTime))

    const suggestion = {
      east_west_seconds: Math.round(eastWestSeconds),
      south_north_seconds: Math.round(northSouthSeconds),
      reasoning: `南北向 ${northSouthTotal} 輛 vs 東西向 ${eastWestTotal} 輛`,
    }

    console.log('💡 AI 產生建議:', suggestion)
    return suggestion
  }

  // 開始交通燈控制
  start() {
    if (this.isRunning) {
      console.log('⚠️ 交通燈控制器已在運行中')
      return
    }

    console.log('🚥 開始交通燈控制器...')
    this.isRunning = true
    this.runCycle()
  }

  // 停止交通燈控制
  stop() {
    this.isRunning = false
    window.removeEventListener('vehicleAdded', this.vehicleAddedHandler)
    window.removeEventListener('vehicleRemoved', this.vehicleRemovedHandler)
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
  incrementVehicleData(direction, vehicleType) {
    if (this.vehicleData[direction] && this.vehicleData[direction][vehicleType] !== undefined) {
      this.vehicleData[direction][vehicleType]++
    }
  }

  decrementVehicleData(direction, vehicleType) {
    if (this.vehicleData[direction] && this.vehicleData[direction][vehicleType] !== undefined) {
      this.vehicleData[direction][vehicleType]--
      if (this.vehicleData[direction][vehicleType] < 0) {
        this.vehicleData[direction][vehicleType] = 0 // Prevent negative counts
      }
    }
  }

  // 獲取方向車輛數據
  getDirectionVehicleData(direction) {
    return this.vehicleData[direction] || { motor: 0, small: 0, large: 0 }
  }

  // 重置車輛數據
  resetVehicleData() {
    // 🔧 添加日誌：顯示重置前的數據
    console.log('🔄 [數據重置] 重置前 vehicleData:', JSON.stringify(this.vehicleData, null, 2))

    Object.keys(this.vehicleData).forEach((direction) => {
      this.vehicleData[direction] = { motor: 0, small: 0, large: 0 }
    })

    console.log('✅ [數據重置] 車輛數據已重置為 0')
  }

  // ==========================================
  // 🔄 AI週期數據管理系統
  // ==========================================

  // 更新特徵模擬數據顯示
  updateFeatureSimulationDisplay(currentCycleData) {
    console.log('📊 更新特徵模擬數據顯示')

    // 立即觸發UI更新事件
    window.dispatchEvent(
      new CustomEvent('trafficDataUpdated', {
        detail: {
          data: currentCycleData,
          source: 'ai_cycle',
          timestamp: new Date().toISOString(),
        },
      }),
    )

    // 通知MainLayout強制更新顯示
    window.dispatchEvent(
      new CustomEvent('trafficDataChanged', {
        detail: {
          reason: 'api_triggered_update',
          timestamp: new Date().toISOString(),
        },
      }),
    )
  }

  // 為下一輪重置交通數據
  resetTrafficDataForNextCycle() {
    console.log('🔄 開始新週期，重置交通數據...')

    // 1. 保存當前週期數據到歷史記錄
    this.saveCurrentCycleToHistory()

    // 2. 重置TrafficLightController的車輛計數器
    this.resetVehicleData()

    // 3. 重置TrafficDataCollector
    if (window.trafficDataCollector) {
      console.log('🔄 重置TrafficDataCollector數據')
      window.trafficDataCollector.resetCurrentPeriod()
    }

    // 4. 通知自動車流生成器週期重置
    if (window.autoTrafficGenerator) {
      console.log('🔄 通知AutoTrafficGenerator週期重置')
    }

    // 5. 觸發週期重置事件
    window.dispatchEvent(
      new CustomEvent('trafficCycleReset', {
        detail: {
          timestamp: new Date().toISOString(),
          reason: 'ai_prediction_cycle',
        },
      }),
    )

    console.log('✅ 交通數據重置完成，開始新週期收集')
  }

  // 保存當前週期數據到歷史記錄
  saveCurrentCycleToHistory() {
    const currentData = {
      timestamp: new Date().toISOString(),
      vehicleData: JSON.parse(JSON.stringify(this.vehicleData)),
      totalVehicles: this.calculateTotalVehicles(),
      averageSpeeds: this.calculateAverageSpeeds(),
    }

    // 初始化歷史記錄陣列
    if (!this.historyData) {
      this.historyData = []
    }

    this.historyData.push(currentData)

    // 只保留最近20筆記錄
    if (this.historyData.length > 20) {
      this.historyData = this.historyData.slice(-20)
    }

    console.log('📚 已保存當前週期數據到歷史記錄')
  }

  // 計算總車輛數
  calculateTotalVehicles() {
    let total = 0
    Object.keys(this.vehicleData).forEach((direction) => {
      const data = this.vehicleData[direction]
      total += data.motor + data.small + data.large
    })
    return total
  }

  // 計算各方向平均速度
  calculateAverageSpeeds() {
    const speeds = {}
    Object.keys(this.vehicleData).forEach((direction) => {
      speeds[direction] = {
        motor: this.getAverageSpeed(direction, 'motor'),
        small: this.getAverageSpeed(direction, 'small'),
        large: this.getAverageSpeed(direction, 'large'),
        overall: this.getAverageSpeed(direction, 'small'), // 使用小型車作為整體代表
      }
    })
    return speeds
  }

  // 獲取歷史數據
  getHistoryData(limit = 10) {
    if (!this.historyData) return []
    return this.historyData.slice(-limit)
  }

  // 更新計時器顯示
  updateTimer(phase, seconds) {
    if (this.onTimerUpdate) {
      this.onTimerUpdate(phase, seconds)
    }
  }

  // 延遲函數
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // 處理車輛移除事件
  handleVehicleRemoved(detail) {
    // detail 應包含 { vehicleId, direction, type }
    if (!detail || !detail.vehicleId) {
      return
    }

    // IndexPage.vue 已經在派發事件前從 liveVehicles 移除了車輛
    // 這個方法主要用於數據同步和統計，不再嘗試移除
    const idx = window.liveVehicles ? window.liveVehicles.findIndex((v) => v.id === detail.vehicleId) : -1

    if (idx !== -1) {
      // 如果還在陣列中，說明有其他地方派發了事件，幫忙移除
      window.liveVehicles.splice(idx, 1)
    } else {
      // 正常情況 - 車輛已被 IndexPage 移除
      // console.log(`✅ 車輛事件處理: ${detail.vehicleId}`)
    }
  }
}
