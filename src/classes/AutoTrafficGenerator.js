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
      interval: { min: 6000, max: 15000, normal: 10000 },
      densityThresholds: { light: 5, moderate: 10, heavy: 15, congested: 20 },
      vehicleTypes: [
        { type: 'motor', weight: 35 },
        { type: 'small', weight: 50 },
        { type: 'large', weight: 15 },
      ],
      isManualMode: false,
      peakMultiplier: 1.0,
    }

    // 當前生效配置
    this.config = { ...this.defaultConfig }
    this.statistics = { total: 0 }
    this.maxLiveVehicles = 200 // 最大同時車輛數

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
      { from: 0, to: 6, description: '深夜', peakMultiplier: 0.2, vehicleMix: 'light' },
      { from: 6, to: 9, description: '上午尖峰', peakMultiplier: 1.5, vehicleMix: 'heavy' },
      { from: 9, to: 16, description: '日間離峰', peakMultiplier: 0.8, vehicleMix: 'normal' },
      { from: 16, to: 19, description: '傍晚尖峰', peakMultiplier: 1.4, vehicleMix: 'heavy' },
      { from: 19, to: 24, description: '夜晚', peakMultiplier: 0.5, vehicleMix: 'normal' },
    ]

    this.vehicleMixes = {
      light: [{ type: 'small', weight: 70 }, { type: 'motor', weight: 20 }, { type: 'large', weight: 10 }],
      normal: [{ type: 'small', weight: 50 }, { type: 'motor', weight: 35 }, { type: 'large', weight: 15 }],
      heavy: [{ type: 'small', weight: 40 }, { type: 'motor', weight: 40 }, { type: 'large', weight: 20 }],
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
    this.config = { ...newConfig, isManualMode: true }
    // 如果在自動模式下進行了手動設定，則自動關閉自動模式
    if (this.isAutoMode) {
      this.toggleAutoMode(false)
    }
    console.log('🔧 已切換手動設定：', this.config)
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
    this.config.isManualMode = !enabled // 自動模式下，禁用手動模式的間隔計算

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

    // 每2秒鐘更新一次模擬時間和交通設定
    this.autoModeTimer = setInterval(() => {
      // 模擬時間每次推進30分鐘
      this.simulationTime.setMinutes(this.simulationTime.getMinutes() + 30)

      this._applyTrafficProfile()
    }, 2000) // 真實世界的2秒 = 模擬世界的30分鐘
  }

  // 停止自動模式循環
  _stopAutoModeLoop() {
    clearInterval(this.autoModeTimer)
    this.autoModeTimer = null
  }

  // 根據模擬時間套用交通設定檔
  _applyTrafficProfile() {
    const currentHour = this.simulationTime.getHours()
    const profile = this.trafficProfiles.find((p) => currentHour >= p.from && currentHour < p.to)

    if (profile) {
      this.config.peakMultiplier = profile.peakMultiplier
      this.config.vehicleTypes = this.vehicleMixes[profile.vehicleMix]

      // 透過回調函數將當前模擬時間和狀態傳遞給UI
      if (this.onTimeUpdate) {
        this.onTimeUpdate({
          time: this.simulationTime.toLocaleTimeString('it-IT'), // HH:mm:ss 格式
          description: profile.description,
        })
      }
    }
  }

  // ==========================================
  //  генерирање возила (Vehicle Generation)
  // ==========================================

  // 計算下次間隔
  _calcInterval() {
    const { min, max, normal } = this.config.interval
    // 在手動模式下，使用滑桿設定的值
    if (this.config.isManualMode) {
      return Math.round(normal * (0.9 + Math.random() * 0.2))
    }

    // 在自動模式下，使用 peakMultiplier 和密度共同決定
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

  // 查詢統計
  getStatistics() {
    return { ...this.statistics, config: this.config, isAutoMode: this.isAutoMode }
  }
}