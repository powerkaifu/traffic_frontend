/**
 * TrafficLightController.js - 交通燈控制系統
 */
import TrafficLight from './TrafficLight.js'

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
      north: 'green',
      south: 'green',
    }

    // API 相關設定
    this.apiEndpoint = 'http://localhost:8000/api/traffic/predict/'
    this.onPredictionUpdate = null // AI 預測更新回調函數

    // Strategy Pattern: 動態綠燈時間策略（AI 預測結果）
    this.dynamicTiming = {
      eastWest: 15, // 東西向綠燈時間（秒）
      northSouth: 15, // 南北向綠燈時間（秒）- 一開始以南北向為主
    }

    // Strategy Pattern: 下一輪的時間預測策略（提前獲取）
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

    // ==========================================
    // 🛣️ 車道位置管理 (Lane Management)
    // ==========================================

    // 車道位置配置 - 集中管理所有方向的車道起始位置
    this.lanePositions = {
      // 往東四個車道的位置
      east: [
        { x: -100, y: 263 }, // 第一車道
        { x: -100, y: 290 }, // 第二車道
        { x: -100, y: 320 }, // 第三車道
        { x: -100, y: 348 }, // 第四車道
      ],

      // 往西車道的位置 (基於東邊起始點的最下方點)
      west: [
        { x: 1125, y: 234 }, // 第一車道
        { x: 1125, y: 206 }, // 第二車道
        { x: 1125, y: 179 }, // 第三車道
        { x: 1125, y: 153 }, // 第四車道
      ],

      // 往南車道的位置
      south: [
        { x: 477, y: -185 }, // 第一車道
        { x: 449, y: -185 }, // 第二車道
        { x: 422, y: -185 }, // 第三車道
        { x: 393, y: -185 }, // 第四車道
      ],

      // 往北四個車道的位置 (使用簡單絕對數值)
      north: [
        { x: 505, y: 700 }, // 第一車道
        { x: 534, y: 700 }, // 第二車道
        { x: 562, y: 700 }, // 第三車道
        { x: 591, y: 700 }, // 第四車道
      ],
    }

    // 車輛終點位置配置 - 車輛完全離開畫面的位置
    this.endPositions = {
      east: 1200, // 往東車輛的X終點：完全離開右邊界
      west: -200, // 往西車輛的X終點：完全離開左邊界
      north: -200, // 往北車輛的Y終點：完全離開上邊界
      south: 800, // 往南車輛的Y終點：完全離開下邊界
    }
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

  // 獲取指定方向的所有車道位置
  getLanePositions(direction) {
    if (!this.lanePositions[direction]) {
      console.warn(`⚠️ 未找到方向 ${direction} 的車道配置`)
      return []
    }
    return this.lanePositions[direction]
  }

  // 獲取指定方向的隨機車道位置
  getRandomLanePosition(direction) {
    const lanes = this.getLanePositions(direction)
    if (lanes.length === 0) return null

    const randomIndex = Math.floor(Math.random() * lanes.length)
    return {
      position: lanes[randomIndex],
      laneNumber: randomIndex + 1, // 車道編號從1開始
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

  // 獲取所有方向的車道配置（用於調試或管理）
  getAllLanePositions() {
    return this.lanePositions
  }

  // 更新車道位置配置（動態調整）
  updateLanePosition(direction, laneIndex, newPosition) {
    if (this.lanePositions[direction] && this.lanePositions[direction][laneIndex]) {
      this.lanePositions[direction][laneIndex] = newPosition
      console.log(`🛣️ 更新車道位置：${direction} 車道 ${laneIndex + 1} -> (${newPosition.x}, ${newPosition.y})`)
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
  // 🎛️ 場景管理系統 (Scenario Management System)
  // ==========================================

  // 場景預設數據配置
  getScenarioPresets() {
    return {
      smooth: { motorcycle: 2, small: 4, large: 1 }, // 流暢
      一般: { motorcycle: 5, small: 8, large: 3 }, // 一般
      congested: { motorcycle: 10, small: 15, large: 6 }, // 擁擠
    }
  }

  // 路口選項配置
  getIntersectionOptions() {
    return [
      { label: '東向路口', value: 'east' },
      { label: '西向路口', value: 'west' },
      { label: '南向路口', value: 'south' },
      { label: '北向路口', value: 'north' },
    ]
  }

  // 場景選項配置
  getScenarioOptions() {
    return [
      { label: '流暢', value: 'smooth' },
      { label: '一般', value: '一般' },
      { label: '擁擠', value: 'congested' },
    ]
  }

  // 應用場景預設到指定方向
  applyScenarioPreset(direction, scenarioType) {
    const presets = this.getScenarioPresets()

    if (!presets[scenarioType]) {
      console.warn(`⚠️ 未找到場景類型: ${scenarioType}`)
      return false
    }

    if (!this.vehicleData[direction]) {
      console.warn(`⚠️ 未找到方向: ${direction}`)
      return false
    }

    const preset = presets[scenarioType]
    this.vehicleData[direction] = {
      motor: preset.motorcycle,
      small: preset.small,
      medium: 0, // 中型車暫時設為0
      large: preset.large,
    }

    console.log(`✅ 已應用 ${scenarioType} 場景到 ${direction} 方向:`, this.vehicleData[direction])
    return true
  }

  // 更新指定方向的車輛數據
  updateDirectionVehicleData(direction, vehicleData) {
    if (!this.vehicleData[direction]) {
      console.warn(`⚠️ 未找到方向: ${direction}`)
      return false
    }

    this.vehicleData[direction] = {
      motor: vehicleData.motorcycle || vehicleData.motor || 0,
      small: vehicleData.small || 0,
      medium: vehicleData.medium || 0,
      large: vehicleData.large || 0,
    }

    console.log(`🔄 已更新 ${direction} 方向車輛數據:`, this.vehicleData[direction])
    return true
  }

  // 獲取指定方向的車輛數據
  getDirectionVehicleData(direction) {
    return this.vehicleData[direction] || null
  }

  // 獲取所有方向的車輛數據
  getAllVehicleData() {
    return this.vehicleData
  }

  // 重置指定方向的車輛數據
  resetDirectionVehicleData(direction) {
    if (this.vehicleData[direction]) {
      this.vehicleData[direction] = {
        motor: 0,
        small: 0,
        medium: 0,
        large: 0,
      }
      console.log(`🔄 已重置 ${direction} 方向車輛數據`)
      return true
    }
    return false
  }

  // 重置所有方向的車輛數據
  resetAllVehicleData() {
    Object.keys(this.vehicleData).forEach((direction) => {
      this.resetDirectionVehicleData(direction)
    })
    console.log('🔄 已重置所有方向車輛數據')
  }

  // 驗證路口值並轉換為內部格式
  normalizeDirection(intersectionValue) {
    const directionMap = {
      東: 'east',
      西: 'west',
      南: 'south',
      北: 'north',
      east: 'east',
      west: 'west',
      south: 'south',
      north: 'north',
    }

    return directionMap[intersectionValue] || null
  }

  // ==========================================
  // 🔧 調試和管理工具 (Debug & Management Tools)
  // ==========================================

  // 獲取交通控制器完整狀態（調試用）
  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      currentPhase: this.currentPhase,
      currentLightStates: this.currentLightStates,
      dynamicTiming: this.dynamicTiming,
      vehicleData: this.vehicleData,
      laneStatistics: this.getLaneStatistics(),
      scenarioPresets: this.getScenarioPresets(),
      intersectionOptions: this.getIntersectionOptions(),
      scenarioOptions: this.getScenarioOptions(),
    }
  }

  // ==========================================
  // 🏭 Factory Pattern (工廠模式) 方法群組
  // ==========================================

  // Factory Pattern: 初始化所有紅綠燈
  init(eastElement, westElement, southElement, northElement) {
    // Factory Pattern: 創建 TrafficLight 實例
    this.lights.east = new TrafficLight(eastElement)
    this.lights.west = new TrafficLight(westElement)
    this.lights.south = new TrafficLight(southElement)
    this.lights.north = new TrafficLight(northElement)

    // State Pattern: 設置初始狀態：南北向綠燈，東西向紅燈（一開始以南北向為主）
    this.updateLightState('south', 'green')
    this.updateLightState('north', 'green')
    this.updateLightState('east', 'red')
    this.updateLightState('west', 'red')
    this.currentPhase = 'northSouth' // 一開始以南北向為主
  }

  // ==========================================
  // 🔄 State Pattern (狀態模式) 方法群組
  // ==========================================

  // State Pattern: 獲取當前燈號狀態
  getCurrentLightState(direction) {
    return this.currentLightStates[direction]
  }

  // State Pattern: 更新燈號狀態並通知觀察者
  updateLightState(direction, state) {
    this.currentLightStates[direction] = state
    if (this.lights[direction]) {
      this.lights[direction].setState(state)
    }
    this.notifyObservers(direction, state) // Observer Pattern
  }

  // State Pattern: 獲取當前時相
  getCurrentPhase() {
    return this.currentPhase
  }

  // ==========================================
  // 📋 Template Method Pattern (模板方法模式) 方法群組
  // ==========================================

  // Template Method Pattern: 運行一個完整的燈號循環
  async runCycle() {
    console.log('🔄 開始交通燈循環...')

    while (this.isRunning) {
      try {
        // State Pattern: 根據當前時相選擇處理策略
        if (this.currentPhase === 'northSouth') {
          // Strategy Pattern: 南北向綠燈階段處理策略
          this.updateTimer('南北向 綠燈', this.dynamicTiming.northSouth)

          // Template Method: 完整倒數南北向綠燈，在剩餘10秒時發送API
          await this.countdownDelayWithAPI(this.dynamicTiming.northSouth * 1000, 10)

          // Template Method: 南北向：綠燈 -> 黃燈 -> 紅燈
          this.updateLightState('south', 'yellow')
          this.updateLightState('north', 'yellow')
          this.updateTimer('南北向 黃燈', 2)
          await this.countdownDelay(2000) // 黃燈 2 秒

          this.updateLightState('south', 'red')
          this.updateLightState('north', 'red')
          this.updateLightState('east', 'green')
          this.updateLightState('west', 'green') // Strategy Pattern: 更新當前使用的時間為下一輪的時間
          this.dynamicTiming.eastWest = this.nextTiming.eastWest
          this.currentPhase = 'eastWest'
        } else {
          // Strategy Pattern: 東西向綠燈階段處理策略
          this.updateTimer('東西向 綠燈', this.dynamicTiming.eastWest)

          // Template Method: 東西向不需要API請求，直接倒數完成
          await this.countdownDelay(this.dynamicTiming.eastWest * 1000)

          // Template Method: 東西向：綠燈 -> 黃燈 -> 紅燈
          this.updateLightState('east', 'yellow')
          this.updateLightState('west', 'yellow')
          this.updateTimer('東西向 黃燈', 2)
          await this.countdownDelay(2000) // 黃燈 2 秒

          this.updateLightState('east', 'red')
          this.updateLightState('west', 'red')
          this.updateLightState('south', 'green')
          this.updateLightState('north', 'green') // Strategy Pattern: 更新當前使用的時間為下一輪的時間
          this.dynamicTiming.northSouth = this.nextTiming.northSouth
          this.currentPhase = 'northSouth'
        }

        // 重置車輛數據以準備下一輪收集
        this.resetVehicleData()
      } catch (error) {
        console.error('🚨 交通燈循環出現錯誤:', error)
        // 等待1秒後繼續，避免系統完全停止
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

    for (let i = totalSeconds; i > 0; i--) {
      if (this.onTimerUpdate) {
        // 只更新倒數秒數，不改變時相描述
        this.onTimerUpdate(null, i)
      }

      // Strategy Pattern: 在剩餘指定秒數時觸發API
      if (i === apiTriggerSeconds && !apiTriggered) {
        console.log(`⏰ 剩餘 ${apiTriggerSeconds} 秒，開始 AI 預測流程...`)

        // 1. 收集當前週期的完整數據
        const currentCycleData = this.collectIntersectionData()

        // 2. 發送到 AI 後端（異步）
        this.sendDataToBackend(currentCycleData)

        // 3. 立即更新特徵模擬數據顯示
        this.updateFeatureSimulationDisplay(currentCycleData)

        // 4. 標記準備重置數據（3秒後執行，避免突然清空）
        setTimeout(() => {
          this.resetTrafficDataForNextCycle()
        }, 3000)

        apiTriggered = true
      }

      await this.delay(1000)
    }
  }

  // ==========================================
  // 🎯 Strategy Pattern (策略模式) 方法群組
  // ==========================================

  // Strategy Pattern: 收集路口數據（VD 格式）- 數據收集策略
  collectIntersectionData() {
    const now = new Date()
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay() // 週日為7，週一為1
    const hour = now.getHours()
    const minute = now.getMinutes()
    const second = now.getSeconds()

    // 判斷是否為尖峰時段 (7-9AM, 5-7PM)
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1 : 0

    const vdData = []

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

  // Strategy Pattern: 獲取各車型的平均速度策略
  getAverageSpeed(direction, vehicleType) {
    // Strategy Pattern: 不同車型的速度範圍策略 - 與 Vehicle.js 保持一致
    const speedRanges = {
      motor: { min: 35, max: 60, avg: 47 }, // 平均 (35+60)/2 ≈ 47
      small: { min: 30, max: 45, avg: 37 }, // 平均 (30+45)/2 ≈ 37
      large: { min: 25, max: 35, avg: 30 }, // 平均 (25+35)/2 = 30
    }

    const range = speedRanges[vehicleType]
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

    return Math.round(range.avg * speedFactor)
  }

  // Strategy Pattern: 計算路段占有率策略
  calculateOccupancy(direction) {
    const data = this.vehicleData[direction]
    const totalVehicles = data.motor + data.small + data.large
    // 簡化的占有率計算：基於車輛數量和預估的路段容量
    const maxCapacity = 20 // 每個方向的最大容量
    return Math.min((totalVehicles / maxCapacity) * 100, 100).toFixed(1)
  }

  // Strategy Pattern: 發送數據到後端 API（提前 10 秒請求）
  async sendDataToBackend(vdData = null) {
    try {
      const dataToSend = vdData || this.collectIntersectionData()
      console.log('🚦 發送真實交通數據到後端 AI 系統:', dataToSend)

      // 發送 API 開始事件
      window.dispatchEvent(new CustomEvent('trafficApiSending', { detail: { timestamp: new Date().toISOString() } }))

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('🤖 收到真實 AI 預測結果:', result)

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
      const dataToSend = vdData || this.collectIntersectionData()
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
    const extraTimePerCar = 1 // 每多一輛車增加的秒數

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

  // ==========================================
  // �️ 路口清空檢測機制 (Intersection Clearance Detection)
  // ==========================================

  // ==========================================
  // �🔧 系統控制和工具方法群組
  // ==========================================

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

  // 重置車輛數據
  resetVehicleData() {
    Object.keys(this.vehicleData).forEach((direction) => {
      this.vehicleData[direction] = { motor: 0, small: 0, large: 0 }
    })
    console.log('🔄 車輛數據已重置')
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
      window.autoTrafficGenerator.onCycleReset()
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
}
