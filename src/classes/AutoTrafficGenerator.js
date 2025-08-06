/**
 * AutoTrafficGenerator.js - 自動車流分派系統
 *
 * 設計模式:
 * - Factory Pattern (工廠模式): 動態創建不同類型的車輛
 * - Strategy Pattern (策略模式): 可切換的車流生成策略
 * - Observer Pattern (觀察者模式): 監聽交通狀況變化
 * - Singleton Pattern (單例模式): 確保只有一個車流生成器實例
 * - Template Method Pattern (模板方法模式): 定義車輛生成的標準流程
 *
 * 系統功能:
 * - 智能車流分派: 根據各方向車流密度自動平衡
 * - 自適應生成頻率: 根據當前交通狀況調整生成間隔
 * - 多種車輛類型: 按比例生成機車、小型車、大型車
 * - 實時監控: 持續監控交通狀況並調整策略
 * - 事件驅動: 響應交通燈變化和擁堵情況
 */

export default class AutoTrafficGenerator {
  constructor(trafficController) {
    this.trafficController = trafficController
    this.isRunning = false
    this.generationTimer = null
    this.monitoringTimer = null

    // 儲存一份預設設定，用於手動模式的重置
    this.defaultConfig = {
      interval: { min: 1500, max: 4000, normal: 2500 },
      directions: ['east', 'west', 'north', 'south'],
      vehicleTypes: [
        { type: 'motor', weight: 35, priority: 1 },
        { type: 'small', weight: 50, priority: 2 },
        { type: 'large', weight: 15, priority: 3 },
      ],
      densityThresholds: { light: 8, moderate: 16, heavy: 24, congested: 32 },
      timeFactors: { rush: 1.5, normal: 1.0, light: 0.6 },
      isManualMode: false,
    }

    // Strategy Pattern: 可配置的生成策略
    this.generationConfig = { ...this.defaultConfig }
    // 保證 config 屬性存在且與 generationConfig 同步
    this.config = { ...this.generationConfig }

    // 統計數據
    this.statistics = {
      totalGenerated: 0,
      byDirection: { east: 0, west: 0, north: 0, south: 0 },
      byType: { motor: 0, small: 0, large: 0 },
      startTime: null,
      lastGenerationTime: null,
    }

    // 初始化週期管理數據
    this.generationStats = {
      totalGenerated: 0,
      byDirection: {
        east: { motor: 0, small: 0, large: 0, total: 0 },
        west: { motor: 0, small: 0, large: 0, total: 0 },
        south: { motor: 0, small: 0, large: 0, total: 0 },
        north: { motor: 0, small: 0, large: 0, total: 0 },
      },
      byType: {
        motor: 0,
        small: 0,
        large: 0,
      },
      startTime: new Date().toISOString(),
    }
    this.cycleHistory = []

    // Observer Pattern: 事件監聽器
    this.initEventListeners()
  }

  // Observer Pattern: 初始化事件監聽器
  initEventListeners() {
    // 監聽交通燈變化
    window.addEventListener('lightStateChanged', (event) => {
      this.onLightStateChanged(event.detail)
    })

    // 監聽擁堵狀況
    window.addEventListener('trafficCongestion', (event) => {
      this.onTrafficCongestion(event.detail)
    })
  }

  // Template Method Pattern: 啟動車流生成系統的模板方法
  start() {
    if (this.isRunning) {
      console.log('⚠️ 車流生成系統已在運行中')
      return
    }

    this.isRunning = true
    this.statistics.startTime = new Date()

    // 開始生成車輛
    this.scheduleNextGeneration()

    // 開始監控系統
    this.startMonitoring()

    console.log('🚗 自動車流生成系統已啟動')
    console.log('📊 生成配置:', this.generationConfig)

    // 發送啟動事件
    window.dispatchEvent(
      new CustomEvent('trafficGeneratorStarted', {
        detail: { generator: this, config: this.generationConfig },
      }),
    )
  }

  // Template Method Pattern: 停止車流生成系統的模板方法
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ 車流生成系統未在運行')
      return
    }

    this.isRunning = false

    // 清理定時器
    if (this.generationTimer) {
      clearTimeout(this.generationTimer)
      this.generationTimer = null
    }

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
      this.monitoringTimer = null
    }

    console.log('🛑 自動車流生成系統已停止')
    console.log('📈 最終統計:', this.getStatistics())

    // 發送停止事件
    window.dispatchEvent(
      new CustomEvent('trafficGeneratorStopped', {
        detail: { statistics: this.getStatistics() },
      }),
    )
  }

  // Strategy Pattern: 排程下一次車輛生成的策略方法
  scheduleNextGeneration() {
    if (!this.isRunning) return

    const interval = this.calculateAdaptiveInterval()
    console.log(`⏳ 下一次車輛生成排程: ${interval} 毫秒--------------------------------------`)
    this.generationTimer = setTimeout(() => {
      try {
        this.generateVehicle()
        this.scheduleNextGeneration() // 遞迴排程
      } catch (error) {
        console.error('❌ 車輛生成失敗:', error)
        // 發生錯誤時延遲重試
        setTimeout(() => this.scheduleNextGeneration(), 5000)
      }
    }, interval)
  }

  // Strategy Pattern: 計算自適應生成間隔的策略方法
  calculateAdaptiveInterval() {
    const { min, max, normal } = this.generationConfig.interval
    console.log(`計算自適應生成間隔: min=${min}, max=${max}, normal=${normal}`)
    // 如果是手動模式，直接使用 normal 值，並加入微小隨機變化
    if (this.generationConfig.isManualMode) {
      const randomFactor = 0.9 + Math.random() * 0.2 // ±10% 的隨機變化
      const finalInterval = Math.round(normal * randomFactor)
      return finalInterval
    }

    // --- 以下為自動情境模式的智能判斷 ---
    const currentDensity = this.getCurrentTrafficDensity()
    const timeFactor = this.getTimeBasedFactor()
    const { light, moderate, heavy, congested } = this.generationConfig.densityThresholds

    let baseInterval = normal

    // Strategy Pattern: 根據交通密度調整間隔
    if (currentDensity <= light) {
      baseInterval = min * 0.8 // 車少時較快生成
    } else if (currentDensity <= moderate) {
      baseInterval = normal // 正常間隔
    } else if (currentDensity <= heavy) {
      baseInterval = normal * 1.5 // 車多時較慢生成
    } else if (currentDensity <= congested) {
      baseInterval = max // 擁堵時最慢生成
    } else {
      baseInterval = max * 2 // 嚴重擁堵時暫停生成
    }

    // 應用時段因子
    const adjustedInterval = baseInterval / timeFactor

    // 加入隨機變化 (±20%)
    const randomFactor = 0.8 + Math.random() * 0.4
    const finalInterval = Math.round(adjustedInterval * randomFactor)

    return Math.max(min, Math.min(max * 2, finalInterval))
  }

  // Template Method Pattern: 生成單一車輛的模板方法
  generateVehicle() {
    // 1. 選擇生成方向
    const direction = this.selectOptimalDirection()

    // 2. 選擇車輛類型
    const vehicleType = this.selectVehicleType()

    // 3. 檢查是否可以生成
    if (!this.canGenerateVehicle(direction, vehicleType)) {
      console.log(`⏸️ 暫停生成 ${direction} 方向 ${vehicleType} 車輛 (條件不符)`)
      return false
    }

    // 4. 觸發車輛生成事件
    const vehicleData = {
      direction,
      vehicleType,
      timestamp: new Date().toISOString(),
      generatorId: this.id,
    }

    window.dispatchEvent(
      new CustomEvent('generateVehicle', {
        detail: vehicleData,
      }),
    )

    // 5. 更新統計數據
    this.updateStatistics(direction, vehicleType)

    // console.log(`🚗 自動生成: ${direction} 方向 ${vehicleType} 車輛 (密度: ${this.getCurrentTrafficDensity()})`)

    return true
  }

  // Strategy Pattern: 選擇最佳生成方向的策略方法
  selectOptimalDirection() {
    const directions = this.generationConfig.directions
    const directionScores = directions.map((direction) => {
      const density = this.getDirectionDensity(direction)
      const lightState = this.trafficController.getCurrentLightState(direction)
      const queueLength = this.getDirectionQueueLength(direction)

      // 計算方向評分 (分數越低越適合生成)
      let score = density * 10 // 密度權重

      // 紅燈時降低生成傾向
      if (lightState === 'red') score += 50
      if (lightState === 'yellow') score += 20

      // 排隊過長時降低生成傾向
      score += queueLength * 5

      return { direction, score, density, lightState, queueLength }
    })

    // 選擇評分最低的方向
    directionScores.sort((a, b) => a.score - b.score)

    // 加入隨機性：70% 選擇最佳，30% 選擇次佳
    const selectedIndex = Math.random() < 0.7 ? 0 : 1
    const selectedDirection = directionScores[Math.min(selectedIndex, directionScores.length - 1)]

    console.log(`📍 方向選擇: ${selectedDirection.direction} (評分: ${selectedDirection.score.toFixed(1)})`)

    return selectedDirection.direction
  }

  // Strategy Pattern: 選擇車輛類型的策略方法
  selectVehicleType() {
    let vehicleTypes = [...this.generationConfig.vehicleTypes]

    // 正規化權重
    const totalWeight = vehicleTypes.reduce((sum, type) => sum + type.weight, 0)
    if (totalWeight === 0) {
      // 如果總權重為0，返回預設值避免除以0
      return 'small'
    }
    vehicleTypes.forEach((type) => (type.normalizedWeight = (type.weight / totalWeight) * 100))

    // 加權隨機選擇
    const random = Math.random() * 100
    let accumulator = 0

    for (const type of vehicleTypes) {
      accumulator += type.normalizedWeight
      if (random <= accumulator) {
        return type.type
      }
    }

    return 'small' // 預設返回小型車
  }

  // 檢查是否可以生成車輛
  canGenerateVehicle(direction) {
    // 檢查該方向是否已達到最大容量
    const density = this.getDirectionDensity(direction)
    const maxDensity = this.generationConfig.densityThresholds.congested * 1.2

    if (density >= maxDensity) {
      return false
    }

    // 檢查該方向是否有足夠空間
    // 已移除排隊上限，允許無限排隊

    return true
  }

  // 獲取當前總交通密度
  getCurrentTrafficDensity() {
    const directions = this.generationConfig.directions
    let totalVehicles = 0

    directions.forEach((direction) => {
      const data = this.trafficController.getDirectionVehicleData(direction)
      totalVehicles += (data.motor || 0) + (data.small || 0) + (data.large || 0)
    })

    return totalVehicles
  }

  // 獲取特定方向的車輛密度
  getDirectionDensity(direction) {
    const data = this.trafficController.getDirectionVehicleData(direction)
    return (data.motor || 0) + (data.small || 0) + (data.large || 0)
  }

  // 獲取特定方向的排隊長度
  getDirectionQueueLength(direction) {
    // 這裡可以根據實際需求實現更精確的排隊長度計算
    // 目前簡化為車輛密度的估算
    const density = this.getDirectionDensity(direction)
    const lightState = this.trafficController.getCurrentLightState(direction)

    if (lightState === 'red') {
      return Math.min(density * 0.8, 8) // 紅燈時大部分車輛在排隊
    } else {
      return Math.min(density * 0.3, 3) // 綠燈時少部分車輛在排隊
    }
  }

  // Strategy Pattern: 獲取基於時段的生成因子
  getTimeBasedFactor() {
    // 改為從 generationConfig 中讀取 peakMultiplier，如果不存在則預設為 1.0
    if (this.generationConfig.characteristics && this.generationConfig.characteristics.peakMultiplier) {
      return this.generationConfig.characteristics.peakMultiplier
    }
    // Fallback to old timeFactors if characteristics is not present
    const currentHour = new Date().getHours()
    const { rush, normal, light } = this.generationConfig.timeFactors

    // 尖峰時段 (7-9, 17-19)
    if ((currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19)) {
      return rush
    }

    // 離峰時段 (22-6)
    if (currentHour >= 22 || currentHour <= 6) {
      return light
    }

    // 正常時段
    return normal
  }

  // 開始系統監控
  startMonitoring() {
    this.monitoringTimer = setInterval(() => {
      this.performHealthCheck()
      this.logStatistics()
    }, 30000) // 每30秒監控一次
  }

  // 系統健康檢查
  performHealthCheck() {
    const currentDensity = this.getCurrentTrafficDensity()
    const { congested } = this.generationConfig.densityThresholds

    // 檢查是否過度擁堵
    if (currentDensity > congested * 1.5) {
      console.warn(`⚠️ 交通過度擁堵 (密度: ${currentDensity})`)
      // 可以觸發緊急措施，如暫時停止生成
    }

    // 檢查生成頻率是否正常
    const timeSinceLastGeneration = Date.now() - (this.statistics.lastGenerationTime || 0)
    if (timeSinceLastGeneration > 10000) {
      // 超過10秒未生成
      console.warn('⚠️ 車輛生成頻率異常低')
    }
  }

  // 更新統計數據（增強版，同時更新週期統計）
  updateStatistics(direction, vehicleType) {
    // 更新原有統計
    this.statistics.totalGenerated++
    this.statistics.byDirection[direction]++
    this.statistics.byType[vehicleType]++
    this.statistics.lastGenerationTime = Date.now()

    // 更新週期統計
    if (this.generationStats) {
      this.generationStats.totalGenerated++
      this.generationStats.byDirection[direction][vehicleType]++
      this.generationStats.byDirection[direction].total++
      this.generationStats.byType[vehicleType]++
    }
  }

  // 獲取統計數據
  getStatistics() {
    const runtime = this.statistics.startTime ? (Date.now() - this.statistics.startTime.getTime()) / 1000 : 0

    return {
      ...this.statistics,
      runtime: Math.round(runtime),
      generationRate: runtime > 0 ? ((this.statistics.totalGenerated / runtime) * 60).toFixed(2) : 0,
      currentDensity: this.getCurrentTrafficDensity(),
    }
  }

  // 記錄統計資訊
  logStatistics() {
    const stats = this.getStatistics()
    console.log('📊 車流生成統計:', {
      總生成數: stats.totalGenerated,
      運行時間: `${stats.runtime}秒`,
      生成速率: `${stats.generationRate}輛/分鐘`,
      當前密度: stats.currentDensity,
      方向分布: stats.byDirection,
      類型分布: stats.byType,
    })
  }

  // Observer Pattern: 事件處理器
  onLightStateChanged(detail) {
    const { direction, state, remainingTime } = detail

    // 當燈號轉為綠燈且剩餘時間較長時，增加該方向的生成機會
    if (state === 'green' && remainingTime > 10) {
      // 可以調整該方向的生成權重
      console.log(`🟢 ${direction} 方向綠燈，可增加車輛生成`)
    }
  }

  onTrafficCongestion(detail) {
    const { direction, level } = detail

    if (level === 'severe') {
      console.log(`🚨 ${direction} 方向嚴重擁堵，暫時減少生成`)
      // 可以暫時降低該方向的生成頻率
    }
  }

  // 動態調整配置
  updateConfig(newConfig) {
    // 自動判斷：只有 interval 欄位就視為手動模式
    const isManual = Object.keys(newConfig).length === 1 && Object.prototype.hasOwnProperty.call(newConfig, 'interval')
    if (newConfig.isManualMode || isManual) {
      // 進入手動模式：重置為預設設定，然後只套用新的 interval
      this.generationConfig = {
        ...this.defaultConfig,
        interval: {
          ...this.defaultConfig.interval,
          ...newConfig.interval,
        },
        isManualMode: true,
      }
      console.log('⚙️ 已切換到手動模式，並重置設定')
    } else {
      // 進入自動情境模式：完全用新的情境設定覆蓋
      this.generationConfig = {
        ...this.defaultConfig, // 確保有基礎欄位
        ...newConfig,
        isManualMode: false,
      }
      console.log('⚙️ 已切換到自動情境模式')
    }
    // 同步 config 屬性，確保外部可讀
    this.config = { ...this.generationConfig }

    console.log('⚙️ 車流生成配置已更新:', this.generationConfig)
    window.dispatchEvent(
      new CustomEvent('trafficGeneratorConfigUpdated', {
        detail: { config: this.generationConfig },
      }),
    )
  }

  // 獲取當前配置
  getConfig() {
    return { ...this.generationConfig }
  }

  // ==========================================
  // 🔄 AI週期管理系統
  // ==========================================

  // 處理AI週期重置
  onCycleReset() {
    console.log('🔄 AutoTrafficGenerator: 接收到週期重置通知')

    // 1. 記錄當前週期的生成統計
    if (this.generationStats) {
      this.cycleHistory = this.cycleHistory || []
      this.cycleHistory.push({
        timestamp: new Date().toISOString(),
        stats: { ...this.generationStats },
        config: { ...this.generationConfig },
      })

      // 只保留最近10個週期的記錄
      if (this.cycleHistory.length > 10) {
        this.cycleHistory = this.cycleHistory.slice(-10)
      }
    }

    // 2. 重置生成統計
    this.resetGenerationStats()

    // 3. 調整下一週期的生成策略（基於歷史數據）
    this.adaptToNewCycle()

    // 4. 觸發週期重置完成事件
    window.dispatchEvent(
      new CustomEvent('autoGeneratorCycleReset', {
        detail: {
          timestamp: new Date().toISOString(),
          newConfig: this.generationConfig,
        },
      }),
    )

    console.log('✅ AutoTrafficGenerator: 週期重置完成')
  }

  // 重置生成統計
  resetGenerationStats() {
    this.generationStats = {
      totalGenerated: 0,
      byDirection: {
        east: { motor: 0, small: 0, large: 0, total: 0 },
        west: { motor: 0, small: 0, large: 0, total: 0 },
        south: { motor: 0, small: 0, large: 0, total: 0 },
        north: { motor: 0, small: 0, large: 0, total: 0 },
      },
      byType: {
        motor: 0,
        small: 0,
        large: 0,
      },
      startTime: new Date().toISOString(),
    }

    console.log('📊 生成統計已重置')
  }

  // 適應新週期
  adaptToNewCycle() {
    console.log('🧠 AutoTrafficGenerator: 分析歷史數據，調整新週期策略')

    if (!this.cycleHistory || this.cycleHistory.length === 0) {
      console.log('📋 無歷史數據，使用預設配置')
      return
    }

    // 分析最近3個週期的數據
    const recentCycles = this.cycleHistory.slice(-3)
    const avgGenerationRate =
      recentCycles.reduce((sum, cycle) => {
        return sum + (cycle.stats.totalGenerated || 0)
      }, 0) / recentCycles.length

    // 根據歷史生成率調整間隔
    if (avgGenerationRate > 50) {
      // 生成率過高，延長間隔
      this.generationConfig.interval.normal = Math.min(
        this.generationConfig.interval.normal * 1.1,
        this.generationConfig.interval.max,
      )
      console.log('📈 檢測到高生成率，延長生成間隔')
    } else if (avgGenerationRate < 20) {
      // 生成率過低，縮短間隔
      this.generationConfig.interval.normal = Math.max(
        this.generationConfig.interval.normal * 0.9,
        this.generationConfig.interval.min,
      )
      console.log('📉 檢測到低生成率，縮短生成間隔')
    }

    console.log(`⚙️ 新週期配置: 間隔 ${this.generationConfig.interval.normal}ms`)
  }

  // 獲取週期歷史數據
  getCycleHistory(limit = 5) {
    if (!this.cycleHistory) return []
    return this.cycleHistory.slice(-limit)
  }

  // 獲取當前週期統計
  getCurrentCycleStats() {
    return {
      ...this.generationStats,
      uptime: this.generationStats.startTime ? (new Date() - new Date(this.generationStats.startTime)) / 1000 : 0,
    }
  }
}
