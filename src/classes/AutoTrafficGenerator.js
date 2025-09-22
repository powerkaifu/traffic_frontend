/**
 * AutoTrafficGenerator.js - 自動車流分派系統
 */
export default class AutoTrafficGenerator {
  constructor(trafficController) {
    this.trafficController = trafficController
    this.isRunning = false
    this.timer = null

    // 預設完整配置
    this.defaultConfig = {
      interval: { min: 10000, max: 60000, normal: 30000 }, // 調整為較長的生成間隔
      densityThresholds: { light: 10, moderate: 20, heavy: 30, congested: 40 }, // 調整密度閾值，使其更難達到高密度
      vehicleTypes: [
        { type: 'motor', weight: 35 },
        { type: 'small', weight: 50 },
        { type: 'large', weight: 15 },
      ],
      peakMultiplier: 1.0,
    }

    // 當前生效配置
    this.config = { ...this.defaultConfig }
    this.statistics = { total: 0 }
    this.maxLiveVehicles = 100 // 最大同時車輛數 - 調整為 100

    // ==========================================
    // 🚗 自動模式相關屬性
    // ==========================================
    this.isAutoMode = false
    this.simulationTime = new Date() // 使用 Date 物件來輕鬆處理時間
    this.simulationTime.setHours(0, 0, 0, 0) // 從午夜開始
    this.autoModeTimer = null
    this.onTimeUpdate = null // 時間更新回調

    // 模擬24小時交通設定檔
    this.trafficProfiles = [
      { from: 0, to: 6, description: '深夜', peakMultiplier: 0.1, vehicleMix: 'light' }, // 更低
      { from: 6, to: 9, description: '上午尖峰', peakMultiplier: 0.8, vehicleMix: 'heavy' }, // 降低
      { from: 9, to: 16, description: '日間離峰', peakMultiplier: 0.4, vehicleMix: 'normal' }, // 降低
      { from: 16, to: 19, description: '傍晚尖峰', peakMultiplier: 0.7, vehicleMix: 'heavy' }, // 降低
      { from: 19, to: 24, description: '夜晚', peakMultiplier: 0.2, vehicleMix: 'normal' }, // 更低
    ]

    this.vehicleMixes = {
      light: [
        { type: 'small', weight: 70 },
        { type: 'motor', weight: 20 },
        { type: 'large', weight: 10 },
      ],
      normal: [
        { type: 'small', weight: 50 },
        { type: 'motor', weight: 35 },
        { type: 'large', weight: 15 },
      ],
      heavy: [
        { type: 'small', weight: 40 },
        { type: 'motor', weight: 40 },
        { type: 'large', weight: 20 },
      ],
    }
  }

  // 啟動生成
  start() {
    if (this.isRunning) return
    this.isRunning = true
    this._scheduleNext()
  }

  // 停止生成
  stop() {
    this.isRunning = false
    clearTimeout(this.timer)
    this._stopAutoModeLoop() // 停止時也要確保自動模式循環停止
  }

  // 切換場景：完全覆蓋（手動模式）
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    // 若 newConfig 有 maxLiveVehicles，則同步更新
    if (typeof newConfig.maxLiveVehicles === 'number') {
      this.maxLiveVehicles = newConfig.maxLiveVehicles
    }
    // 如果在自動模式下進行了手動設定，則自動關閉自動模式
    if (this.isAutoMode) {
      this.toggleAutoMode(false)
    }
    console.log('🔧 已切換手動設定：', this.config, 'maxLiveVehicles:', this.maxLiveVehicles)
  }

  // ==========================================
  // 🚗 自動模式方法
  // ==========================================

  // 設定時間更新的回調函數
  setOnTimeUpdate(callback) {
    this.onTimeUpdate = callback
  }

  // 切換自動模式
  toggleAutoMode(enabled) {
    this.isAutoMode = enabled

    if (this.isAutoMode) {
      this._startAutoModeLoop()
      console.log('🚗 自動車流調節已啟動')
    } else {
      this._stopAutoModeLoop()
      // 退出自動模式時，恢復到預設設定
      this.config.peakMultiplier = this.defaultConfig.peakMultiplier
      this.config.vehicleTypes = this.defaultConfig.vehicleTypes
      if (this.onTimeUpdate) {
        this.onTimeUpdate(null) // 清除UI顯示
      }
      console.log('🚗 自動車流調節已停止')
    }
  }

  // 啟動自動模式循環
  _startAutoModeLoop() {
    if (this.autoModeTimer) clearInterval(this.autoModeTimer)

    // 立即套用一次當前時間的設定
    this._applyTrafficProfile()

    // 每37.5秒鐘更新一次模擬時間和交通設定
    this.autoModeTimer = setInterval(() => {
      // 模擬時間每次推進30分鐘
      this.simulationTime.setMinutes(this.simulationTime.getMinutes() + 30)

      this._applyTrafficProfile()
    }, 6250) // 真實世界的30分鐘(1800秒) = 模擬世界的24小時 (1800 / 48 = 37.5秒/次)
  }

  // 停止自動模式循環
  _stopAutoModeLoop() {
    clearInterval(this.autoModeTimer)
    this.autoModeTimer = null
  }

  // 根據模擬時間套用交通設定檔
  _applyTrafficProfile() {
    const currentHour = this.simulationTime.getHours()
    // 尖峰、離峰、凌晨三大時段
    let scenario = null
    if ((currentHour >= 7 && currentHour < 8) || (currentHour >= 17 && currentHour < 18)) {
      scenario = {
        name: '尖峰',
        interval: { min: 3000, max: 5000, normal: 4000 }, // 🚨 修正：增加間隔避免過快生成
        peakMultiplier: 5.0,
        vehicleTypes: [
          { type: 'motor', weight: 60 },
          { type: 'small', weight: 35 },
          { type: 'large', weight: 5 },
        ],
        description: '尖峰時段',
      }
    } else if ((currentHour >= 9 && currentHour < 16) || (currentHour >= 19 && currentHour < 22)) {
      scenario = {
        name: '離峰',
        interval: { min: 4000, max: 6000, normal: 5000 },
        peakMultiplier: 2.5,
        vehicleTypes: [
          { type: 'motor', weight: 30 },
          { type: 'small', weight: 55 },
          { type: 'large', weight: 15 },
        ],
        description: '離峰時段',
      }
    } else {
      scenario = {
        name: '凌晨',
        interval: { min: 20000, max: 40000, normal: 30000 },
        peakMultiplier: 1,
        vehicleTypes: [
          { type: 'motor', weight: 80 },
          { type: 'small', weight: 15 },
          { type: 'large', weight: 5 },
        ],
        description: '凌晨時段',
      }
    }

    // interval.normal 加入隨機波動 ±10%
    const rand = 0.9 + Math.random() * 0.2
    const normalInterval = Math.round(scenario.interval.normal * rand)
    this.config.interval = {
      min: scenario.interval.min,
      max: scenario.interval.max,
      normal: normalInterval,
    }
    this.config.peakMultiplier = scenario.peakMultiplier
    this.config.vehicleTypes = scenario.vehicleTypes

    // 回傳給 UI
    if (this.onTimeUpdate) {
      this.onTimeUpdate({
        time: this.simulationTime.toLocaleTimeString('it-IT'),
        description: scenario.description,
      })
    }
    // console.log('[AutoMode] Scenario:', scenario.name, 'Interval:', this.config.interval);
  }
  // ==========================================
  //  генерирање возила (Vehicle Generation)
  // ==========================================

  // 計算下次間隔
  _calcInterval() {
    const { min, max, normal } = this.config.interval

    // 🚨 新增：動態密度調整 - 根據當前車輛數量調整間隔
    const currentVehicleCount = this._getCurrentVehicleCount()
    const densityMultiplier = this._getDensityMultiplier(currentVehicleCount)

    // 手動模式下，直接使用來自UI的`normal`值，但加入密度調整
    if (!this.isAutoMode) {
      let interval = Math.round(normal * (0.9 + Math.random() * 0.2) * densityMultiplier)
      return Math.max(min, Math.min(max * 2, interval)) // 允許最大間隔延長2倍
    }

    // 自動模式下，使用 peakMultiplier 和密度共同決定
    const density = this._getTotalDensity()
    let base = normal
    const { light, moderate, heavy, congested } = this.config.densityThresholds

    if (density <= light) base = max
    else if (density <= moderate) base = normal
    else if (density <= heavy) base = normal * 0.7
    else if (density <= congested) base = min * 1.2
    else base = min

    // 自動模式下，讓 peakMultiplier 發揮作用
    base /= this.config.peakMultiplier

    const rand = 0.8 + Math.random() * 0.4
    const val = Math.round(base * rand)
    return Math.max(min, Math.min(max, val))
  }

  // 排程下一次
  _scheduleNext() {
    if (!this.isRunning) return
    if (window.liveVehicles && window.liveVehicles.length >= this.maxLiveVehicles) {
      this.timer = setTimeout(() => {
        this._scheduleNext()
      }, 500)
      return
    }
    const delay = this._calcInterval()
    this.timer = setTimeout(() => {
      this._generateVehicle()
      this._scheduleNext()
    }, delay)
  }

  // 隨機生成一輛車
  _generateVehicle() {
    if (window.liveVehicles && window.liveVehicles.length >= this.maxLiveVehicles) return
    const dirs = ['east', 'west', 'north', 'south']
    const dir = dirs[Math.floor(Math.random() * dirs.length)]

    const vehicleTypes = this.config.vehicleTypes
    const totalWeight = vehicleTypes.reduce((sum, v) => sum + v.weight, 0)
    let random = Math.random() * totalWeight
    let type = ''
    for (const vehicle of vehicleTypes) {
      if (random < vehicle.weight) {
        type = vehicle.type
        break
      }
      random -= vehicle.weight
    }
    if (!type) type = vehicleTypes[0].type

    let speed = 30
    if (this.trafficController && this.trafficController.getAverageSpeed) {
      speed = this.trafficController.getAverageSpeed(dir, type)
    }
    window.dispatchEvent(
      new CustomEvent('vehicleAdded', {
        detail: { direction: dir, type: type, speed: speed, timestamp: Date.now() },
      }),
    )
    window.dispatchEvent(
      new CustomEvent('generateVehicle', {
        detail: { direction: dir, vehicleType: type, speed: speed, timestamp: Date.now() },
      }),
    )
    this.statistics.total++
  }

  _getDensity(dir) {
    const data = this.trafficController.getDirectionVehicleData(dir) || {}
    return (data.motor || 0) + (data.small || 0) + (data.large || 0)
  }

  _getTotalDensity() {
    return ['east', 'west', 'north', 'south'].map((d) => this._getDensity(d)).reduce((a, b) => a + b, 0)
  }

  // 🚨 新增：獲取當前車輛總數
  _getCurrentVehicleCount() {
    try {
      // 嘗試從DOM獲取當前車輛數量
      const vehicles = document.querySelectorAll('.vehicle')
      return vehicles.length
    } catch {
      // 回退到使用密度數據
      return this._getTotalDensity()
    }
  }

  // 🚨 新增：根據車輛密度計算間隔調整係數
  _getDensityMultiplier(vehicleCount) {
    // 根據車輛數量動態調整生成間隔
    if (vehicleCount < 5) return 1.0 // 車輛很少，正常間隔
    if (vehicleCount < 10) return 1.2 // 開始增加間隔
    if (vehicleCount < 20) return 1.5 // 中等密度，增加50%間隔
    if (vehicleCount < 30) return 2.0 // 高密度，雙倍間隔
    if (vehicleCount < 40) return 2.5 // 很高密度，2.5倍間隔
    return 3.0 // 極高密度，3倍間隔
  }

  // 查詢統計
  getStatistics() {
    return { ...this.statistics, config: this.config, isAutoMode: this.isAutoMode }
  }
}
