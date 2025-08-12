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
  }

  // 切換場景：完全覆蓋
  updateConfig(newConfig) {
    this.config = { ...newConfig, isManualMode: true }
    console.log('🔧 已切換設定：', this.config)
  }

  // 計算下次間隔
  _calcInterval() {
    const { min, max, normal } = this.config.interval
    if (this.config.isManualMode) {
      return Math.round(normal * (0.9 + Math.random() * 0.2))
    }
    // 自動模式：依密度與尖峰倍率動態調整
    const density = this._getTotalDensity()
    let base = normal
    const { light, moderate, heavy, congested } = this.config.densityThresholds
    // **修正：密度越高，出車間隔越短**
    if (density <= light) base = max // 輕度流量，出車慢
    else if (density <= moderate) base = normal // 一般流量
    else if (density <= heavy) base = normal * 0.7 // 重度流量
    else if (density <= congested) base = min * 1.2 // 擁擠
    else base = min // 非常擁擠，出車快

    base /= this.config.peakMultiplier
    const rand = 0.8 + Math.random() * 0.4
    const val = Math.round(base * rand)
    return Math.max(min, Math.min(max, val)) // 確保最終值在 min/max 範圍內
  }

  // 排程下一次
  _scheduleNext() {
    if (!this.isRunning) return
    // 若超過最大同時車輛數，暫停生成，500ms 後重試
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
    // 若超過最大同時車輛數，直接 return
    if (window.liveVehicles && window.liveVehicles.length >= this.maxLiveVehicles) return
    // 隨機方向
    const dirs = ['east', 'west', 'north', 'south']
    const dir = dirs[Math.floor(Math.random() * dirs.length)]

    // **修正：根據權重隨機選擇車型**
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
    if (!type) type = vehicleTypes[0].type // Fallback

    // 取得平均速度（供動畫用）
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
    return { ...this.statistics, config: this.config }
  }
}
