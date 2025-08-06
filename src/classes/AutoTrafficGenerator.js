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
      interval: { min: 4000, max: 10000, normal: 7000 },
      densityThresholds: { light: 8, moderate: 16, heavy: 24, congested: 32 },
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
    if (density <= light) base = min * 0.8
    else if (density <= moderate) base = normal
    else if (density <= heavy) base = normal * 1.5
    else if (density <= congested) base = max
    else base = max * 2
    base /= this.config.peakMultiplier
    const rand = 0.8 + Math.random() * 0.4
    const val = Math.round(base * rand)
    return Math.max(min, Math.min(max * 2, val))
  }

  // 排程下一次
  _scheduleNext() {
    if (!this.isRunning) return
    const delay = this._calcInterval()
    console.log(`⏳ 下一次生成排程：${delay}ms`)
    this.timer = setTimeout(() => {
      this._generateVehicle()
      this._scheduleNext()
    }, delay)
  }

  // 隨機生成一輛車
  _generateVehicle() {
    const dirs = this.config.directions || ['east', 'west', 'north', 'south']
    // 簡易選方向：密度最低
    const dir = dirs.sort((a, b) => this._getDensity(a) - this._getDensity(b))[0]
    // 權重選車型
    const totalW = this.config.vehicleTypes.reduce((s, v) => s + v.weight, 0)
    let pick = Math.random() * totalW,
      acc = 0,
      type = 'small'
    for (const v of this.config.vehicleTypes) {
      acc += v.weight
      if (pick <= acc) {
        type = v.type
        break
      }
    }
    // 觸發事件
    window.dispatchEvent(
      new CustomEvent('generateVehicle', {
        detail: { direction: dir, vehicleType: type, timestamp: Date.now() },
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
