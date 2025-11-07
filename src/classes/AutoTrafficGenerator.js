/**
 * AutoTrafficGenerator.js - 自動車流分派系統
 */
import {
  getScenarioByTime,
  getScenarioByKey,
  defaultConfig,
  STOP_LINE_VEHICLE_LIMITS,
} from './config/trafficScenarioConfig.js'
import {
  FOLLOWING_CONFIG,
  GENERATION_CONFIG,
  VEHICLE_DIMENSIONS,
  LANE_SPAWN_CONFIG,
  VOLUME_LIMITS_CONFIG,
} from './config/vehicleConfig.js'
import VDNormalizationUtils from './utils/VDNormalizationUtils.js'
import { getCurrentTimePeriod } from './config/vdNormalizationConfig.js'
import { getTimeConfigForScenario, generateVDDataByPattern } from './config/vdPatternConfig.js'
import { VD_DISPLAY_CONFIG } from './config/vdDisplayConfig.js'

export default class AutoTrafficGenerator {
  constructor(trafficController) {
    this.trafficController = trafficController
    this.isRunning = false
    this.timer = null

    // 🚨 新增：車道級別生成冷卻機制（使用配置參數）
    this.laneGenerationCooldown = {} // 記錄每個車道的最後生成時間
    this.minLaneInterval = 2000 // 同一車道最小生成間隔（2秒）

    // �【Phase 5D 新增】快取機制 - 減少重複計算停止線擁塞率
    this._congestionCache = {} // 快取各方向的擁塞率
    this._cacheTimestamp = 0 // 快取時間戳
    this._CACHE_DURATION = 150 // 快取有效期 (ms) - 150ms 內使用快取值

    // �🚗 從配置中獲取安全距離，並計算合適的生成間隔
    this.updateGenerationIntervalsFromConfig()

    // 使用共用配置
    this.defaultConfig = defaultConfig

    // 當前生效配置
    this.config = { ...this.defaultConfig }
    this.statistics = { total: 0 }
    this.maxLiveVehicles = 100 // 最大同時車輛數

    // ==========================================
    // 🚗 自動模式相關屬性
    // ==========================================
    this.isAutoMode = false
    this.simulationTime = new Date() // 使用 Date 物件來輕鬆處理時間
    this.simulationTime.setHours(0, 0, 0, 0) // 從午夜開始
    this.autoModeTimer = null
    this.onTimeUpdate = null // 時間更新回調

    // ==========================================
    // 🎭 手動情景模式相關屬性
    // ==========================================
    this.currentScenarioMode = null // 當前情景模式: 'peak_hours', 'off_peak', 'late_night'
    this.scenarioModeTimer = null // 情景模式定時器

    // 🚗 交通配置現在由 trafficScenarioConfig.js 的 timeScenarios 統一管理
    // 移除了冗餘的硬編碼 trafficProfiles 和 vehicleMixes
  }

  // 🚗 新增：從配置文件更新生成間隔參數
  updateGenerationIntervalsFromConfig() {
    const autoFollowConfig = FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION
    if (autoFollowConfig && autoFollowConfig.LONG_DISTANCE_QUEUE_CATCH_UP) {
      const safeDistance = autoFollowConfig.LONG_DISTANCE_QUEUE_CATCH_UP.SAFE_SPAWN_DISTANCE || 100

      // 根據安全距離計算最小生成間隔
      // 假設車輛平均速度為30km/h ≈ 8.33m/s ≈ 8.33px/10ms
      // 要通過safeDistance需要的時間 = safeDistance / (8.33 * 100) * 1000 ms
      const avgSpeedPxPerMs = 0.833 // 30km/h轉換為像素/毫秒
      const timeToPassSafeDistance = safeDistance / avgSpeedPxPerMs

      // 設置最小間隔為通過安全距離所需時間的1.5倍（安全係數）
      // 降低最小值至 500ms 以支持快速生成模式
      this.minLaneInterval = Math.max(500, Math.round(timeToPassSafeDistance * 1.5))
    }
  }

  // 啟動生成
  start() {
    if (this.isRunning) return
    this.isRunning = true

    // 🎯【修復 1】監聽 API 數據更新，動態調整車流生成速率
    this._syncWithApiData()

    this._scheduleNext()
  }

  /**
   * 🎯【修復 1】根據最新的 API 數據動態調整車流生成
   * 確保前端動畫中的車輛數量與 API 返回的目標流量一致
   */
  _syncWithApiData() {
    // 監聽 API 數據更新事件
    window.addEventListener('trafficApiComplete', () => {
      const apiData = window.lastApiVDDataArray

      if (!apiData || apiData.length === 0) {
        console.warn('⚠️ [API 同步] 無 API 數據可用')
        return
      }

      // 計算目標總車量（平均所有方向）
      let totalVolume = 0
      let totalSpeed = 0
      let occupancySum = 0

      apiData.forEach((data) => {
        const volume = (data.Volume_M || 0) + (data.Volume_S || 0) + (data.Volume_L || 0)
        totalVolume += volume
        totalSpeed += data.Speed || 0
        occupancySum += data.Occupancy || 0
      })

      const avgSpeed = totalSpeed / apiData.length
      const avgOccupancy = occupancySum / apiData.length

      // 🎯 根據目標流量動態調整生成間隔
      // API 期望在 10 秒內生成 totalVolume 輛車
      // 則每輛車之間的平均間隔應該是 (10 * 1000) / totalVolume 毫秒
      if (totalVolume > 0) {
        const targetInterval = (10 * 1000) / totalVolume
        const adjustedMinInterval = Math.max(200, Math.round(targetInterval)) // 最少 200ms

        this.minLaneInterval = adjustedMinInterval

        console.log(
          `🎯 [API 同步] 目標流量=${totalVolume}/10秒 → 調整生成間隔=${adjustedMinInterval}ms` +
            `, 平均速度=${avgSpeed.toFixed(1)}km/h, 佔有率=${avgOccupancy.toFixed(1)}%`,
        )
      }
    })
  }

  // 停止生成
  stop() {
    this.isRunning = false
    clearTimeout(this.timer)
    this._stopAutoModeLoop() // 停止時也要確保自動模式循環停止
  }

  // 🎯【新增】設置 VD 情景
  setVDScenario(scenario) {
    this.currentVDScenario = scenario
    console.log(`🎯 [AutoTrafficGenerator] VD 情景已設置: ${scenario}`)

    // 將情景保存到全局
    window.selectedTrafficScenario = scenario
    window.selectedTrafficTimePeriod = scenario

    // 🚀 【關鍵修復】套用情景的完整配置（包括 interval）
    const scenarioConfig = getScenarioByKey(scenario)
    if (scenarioConfig && scenarioConfig.config) {
      console.log(`🔧 [AutoTrafficGenerator] 套用情景配置:`, {
        interval: scenarioConfig.config.interval,
        vehiclesPerInterval: scenarioConfig.config.vehiclesPerInterval,
        peakMultiplier: scenarioConfig.config.peakMultiplier,
        displayMultiplier: scenarioConfig.config.displayMultiplier,
      })

      // 🔍 【診斷】詳細檢查 displayMultiplier
      console.log(`🎭 [AutoTrafficGenerator] displayMultiplier 詳細信息:
        - 情景 Key: ${scenario}
        - displayMultiplier 值: ${scenarioConfig.config.displayMultiplier}
        - 類型: ${typeof scenarioConfig.config.displayMultiplier}
        - VOLUME_LIMITS_CONFIG['peak_hours'].displayMultiplier: ${VOLUME_LIMITS_CONFIG['peak_hours']?.displayMultiplier}
      `)

      // 更新配置（這會觸發 updateConfig 中的動態調整邏輯）
      this.updateConfig(scenarioConfig.config)
    } else {
      console.warn(`⚠️ [AutoTrafficGenerator] 找不到情景配置: ${scenario}`)
    }
  }

  // 切換場景：完全覆蓋（手動模式）
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }

    // 🔍 【診斷】追蹤 displayMultiplier
    if (newConfig.displayMultiplier !== undefined) {
      console.log(`🎭 [AutoTrafficGenerator] updateConfig 中的 displayMultiplier:
        - 新值: ${newConfig.displayMultiplier}
        - 類型: ${typeof newConfig.displayMultiplier}
        - 現在 this.config.displayMultiplier: ${this.config.displayMultiplier}
      `)
    }

    // 若 newConfig 有 maxLiveVehicles，則同步更新
    if (typeof newConfig.maxLiveVehicles === 'number') {
      this.maxLiveVehicles = newConfig.maxLiveVehicles
    }

    // 🚨 新增：動態調整車道冷卻機制以配合拉桿設定
    if (typeof newConfig.interval === 'object') {
      // 當生成間隔很短時，相應縮短車道冷卻時間
      const avgInterval = (newConfig.interval.min + newConfig.interval.max) / 2
      // 車道冷卻時間 = 平均生成間隔 * 1.5，為了支援快速生成，最小值調整為 300ms
      // 這樣在 0.5s 生成間隔時，車道冷卻也能相應縮短
      this.minLaneInterval = Math.max(
        Math.round(avgInterval * 0.9), // 最小允許接近平均間隔的 90%（支持快速生成）
        Math.min(2000, Math.round(avgInterval * 1.5)), // 最大 2000ms 避免太長冷卻
      )
      console.log(
        `🚨 [AutoTrafficGenerator] 動態調整 minLaneInterval: avgInterval=${Math.round(avgInterval)}ms → minLaneInterval=${this.minLaneInterval}ms`,
      )
    }

    // 🚨 新增：如果配置包含車道間隔設置，更新它（手動設定可覆蓋動態調整）
    // 允許更短的間隔以支持快速生成模式（最小200ms）
    if (typeof newConfig.minLaneInterval === 'number') {
      this.minLaneInterval = Math.max(200, newConfig.minLaneInterval) // 安全下限降至 200ms 以支持快速生成
    }

    // 🔧 CRITICAL FIX：清除情景模式計時器，防止它覆蓋手動設定
    if (this.scenarioModeTimer) {
      clearInterval(this.scenarioModeTimer)
      this.scenarioModeTimer = null
    }

    // 🔧 CRITICAL FIX：清除 currentScenarioMode，防止 _getDisplayMultiplierAdjustment() 讀取舊配置
    if (this.currentScenarioMode) {
      this.currentScenarioMode = null
    }

    // 如果在自動模式下進行了手動設定，則自動關閉自動模式
    if (this.isAutoMode) {
      this.toggleAutoMode(false)
    }
  }

  // 🚨 新增：設置車道最小間隔的專用方法
  setMinLaneInterval(intervalMs) {
    // 降低最小限制以支援快速生成（最小 200ms）
    this.minLaneInterval = Math.max(200, intervalMs)
    console.log(`🚨 [AutoTrafficGenerator] setMinLaneInterval: ${intervalMs}ms → 實際設置: ${this.minLaneInterval}ms`)
  }

  // 🚨 新增：清除特定車道的冷卻狀態（緊急情況使用）
  clearLaneCooldown(direction) {
    if (direction) {
      delete this.laneGenerationCooldown[direction]
    } else {
      this.laneGenerationCooldown = {}
    }
  }

  // 🔧 新增：統一清除情景模式計時器和狀態（避免重複造輪子）
  _stopScenarioModeLoop() {
    if (this.scenarioModeTimer) {
      clearInterval(this.scenarioModeTimer)
      this.scenarioModeTimer = null
    }
    this.currentScenarioMode = null
    console.log(`🛑 [情景模式] 已停止 - 清除計時器和狀態`)
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

  // 啟動自動模式循環(每日自動模式)
  // 🎯 30 分鐘模擬一天: 1800秒實際時間 ÷ 48次更新 = 37.5秒/次
  _startAutoModeLoop() {
    if (this.autoModeTimer) clearInterval(this.autoModeTimer)

    // 🔧 CRITICAL FIX：進入自動模式時，清除所有情景模式狀態（避免互相干擾）
    this._stopScenarioModeLoop()

    this.isAutoMode = true
    console.log(`🚀 [AUTO MODE] STARTED - _startAutoModeLoop() called`)

    // 立即套用一次當前時間的設定
    this._applyTrafficProfile()

    // ✅ 每 37.5 秒更新一次 (共48次, 完整一天)
    // 每次時間跳進 30 分鐘
    // 總耗時: 37.5秒 × 48次 = 1800秒 = 30分鐘
    this.autoModeTimer = setInterval(() => {
      this.simulationTime.setMinutes(this.simulationTime.getMinutes() + 30)

      // 模擬時間顯示
      const hours = String(this.simulationTime.getHours()).padStart(2, '0')
      const minutes = String(this.simulationTime.getMinutes()).padStart(2, '0')
      console.log(`🕐 [自動模式] 模擬時間: ${hours}:${minutes}`)

      this._applyTrafficProfile()
    }, 37500) // ✅ 37500 毫秒 = 37.5 秒
  }

  // 停止自動模式循環
  _stopAutoModeLoop() {
    clearInterval(this.autoModeTimer)
    this.autoModeTimer = null
  }

  // ==========================================
  // 🎭 手動情景模式方法
  // ==========================================

  // 🎯 1. 切換到手動情景模式
  // 🎯 1. 切換到手動情景模式
  switchToScenarioMode(scenarioKey) {
    console.log(`🎭 [情景模式] 切換至: ${scenarioKey}`)

    // 驗證情景配置是否存在
    const scenario = getScenarioByKey(scenarioKey)
    if (!scenario) {
      console.error(`❌ [情景模式] 無效的情景鍵: ${scenarioKey}`)
      return false
    }

    // 🔧 CRITICAL FIX：停止自動模式（避免互相干擾）
    if (this.isAutoMode) {
      this.toggleAutoMode(false)
      console.log(`🛑 [情景模式] 已停止自動模式，進入手動模式`)
    }

    // 🔧 CRITICAL FIX：使用統一方法清除舊的情景模式（避免重複造輪子）
    if (this.scenarioModeTimer || this.currentScenarioMode) {
      this._stopScenarioModeLoop()
    }

    // 設定新的情景模式
    this.currentScenarioMode = scenarioKey

    // 立即套用一次該情景
    this._applyScenarioMode(scenarioKey)

    // 持續應用該情景模式（每 2 秒更新一次配置）
    this.scenarioModeTimer = setInterval(() => {
      this._applyScenarioMode(scenarioKey)
    }, 2000)

    const scenarioName = this._getScenarioModeName(scenarioKey)
    console.log(`✅ [情景模式] 已成功切換至：${scenarioName}`)
    return true
  }

  // 🎯 2. 套用情景模式配置
  _applyScenarioMode(scenarioKey) {
    // 🔧 CRITICAL FIX：多層防護 - 檢查計時器 + 情景模式狀態
    if (!this.scenarioModeTimer || !this.currentScenarioMode) {
      console.log(
        `⏸️ [情景模式] 已停止或未激活 (計時器=${!!this.scenarioModeTimer}, 模式=${this.currentScenarioMode})，跳過本次應用`,
      )
      return
    }

    // 🔧 CRITICAL FIX：確認 currentScenarioMode 與參數一致（防止舊回調）
    if (scenarioKey !== this.currentScenarioMode) {
      console.log(`⏸️ [情景模式] 場景不匹配 (${scenarioKey} ≠ ${this.currentScenarioMode})，跳過本次應用`)
      return
    }

    const scenario = getScenarioByKey(scenarioKey)

    if (!scenario) {
      console.error(`❌ 未知情景模式: ${scenarioKey}`)
      return
    }

    // 套用該情景的配置
    const rand = 0.9 + Math.random() * 0.2
    const normalInterval = Math.round(scenario.config.interval.normal * rand)

    this.config.interval = {
      min: scenario.config.interval.min,
      max: scenario.config.interval.max,
      normal: normalInterval,
    }
    this.config.peakMultiplier = scenario.config.peakMultiplier
    this.config.vehicleTypes = scenario.config.vehicleTypes
    this.config.maxLiveVehicles = scenario.config.maxLiveVehicles
    this.config.vehiclesPerInterval = scenario.config.vehiclesPerInterval // ✅ 套用情景的車量參數
    this.maxLiveVehicles = scenario.config.maxLiveVehicles

    // 🎯 根據情景的 displayMultiplier 調整車道冷卻間隔
    // 允許更短的間隔以支持快速生成（最小 200ms）
    if (scenario.config.displayMultiplier) {
      this.minLaneInterval = Math.max(200, Math.round(2000 / scenario.config.displayMultiplier))
    }

    console.log(
      `✅ [情景模式] 已應用 "${scenario.name}" 配置：interval=${normalInterval}ms, vehiclesPerInterval=${JSON.stringify(scenario.config.vehiclesPerInterval)}, peakMultiplier=${scenario.config.peakMultiplier}`,
    )

    // 🎯 生成該情景對應的 VD 數據
    console.log(`🔍 [_generateScenarioVDData] CALLING for scenario: ${scenarioKey}`)
    const vdData = this._generateScenarioVDData(scenarioKey)
    console.log(`🔍 [_generateScenarioVDData] RETURNED vdData:`, vdData)

    // ✅ 🔧 CRITICAL FIX：在自動模式下使用模擬時間，否則使用系統時間
    const timeToUse = this.isAutoMode ? this.simulationTime : new Date()
    const hour = timeToUse.getHours()
    const minute = timeToUse.getMinutes()
    const second = timeToUse.getSeconds()
    const timePeriod = getCurrentTimePeriod()
    const normParams = VDNormalizationUtils.getTimePeriodAndParamsByHour('VLRJM60', hour)

    // 回傳給 UI
    if (this.onTimeUpdate) {
      this.onTimeUpdate({
        time: timeToUse.toLocaleTimeString('it-IT'),
        description: scenario.config.description,
        scenarioMode: scenarioKey,
        vdData: vdData,
        targetFeatures: scenario.targetFeatures,
        // ✅ 新增：時段和正規化信息
        timePeriod: timePeriod,
        normalizationParams: normParams,
        normalizationInfo: `[正規化] 時段=${timePeriod}, 小時=${hour}:00, displayMultiplier=${normParams.params.displayMultiplier}x`,
        // ✅ 新增：顯示是否為模擬時間
        isSimulatedTime: this.isAutoMode,
        simulatedTimeLabel: this.isAutoMode
          ? `🕐 模擬時間: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
          : '📍 系統時間',
      })
    }

    // 🎯 VD 數據已生成，交由 TrafficLightController.sendDataToBackend() 負責發送 API
    // AutoTrafficGenerator 只負責生成車輛，不負責發送 API
  }

  // 🎯 3. 為情景生成 VD 數據
  _generateScenarioVDData(scenarioKey) {
    const scenario = getScenarioByKey(scenarioKey)

    if (!scenario || !scenario.targetFeatures) {
      console.error(`❌ 無法獲取情景 ${scenarioKey} 的目標特徵`)
      return null
    }

    console.log(`🔍 [_generateScenarioVDData] scenario.targetFeatures:`, JSON.stringify(scenario.targetFeatures))

    // 🎯 🔧 CRITICAL FIX：根據是否在自動模式決定時間生成方式
    let hour, minute, second, isPeakHour
    let patternData = null

    if (this.isAutoMode) {
      // 自動模式：使用模擬時間的實際時間（縮時時間）+ 使用 generateVDDataByPattern 生成統計數據
      const simulatedTime = this.simulationTime
      hour = simulatedTime.getHours()
      minute = simulatedTime.getMinutes()
      second = simulatedTime.getSeconds()
      isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1 : 0

      // 🎯【新增】自動模式：使用 generateVDDataByPattern 生成基於時段的 VD 統計模式
      // 根據小時確定時段（peak_hours, off_peak, late_night）
      let timePeriod = 'off_peak' // 預設離峰
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        timePeriod = 'peak_hours' // 尖峰時段
      } else if (hour >= 0 && hour < 7) {
        timePeriod = 'late_night' // 凌晨時段
      }

      // 使用 pattern 配置中的拉桿間隔進行生成
      const currentInterval = this.config.interval?.normal || 2700
      patternData = generateVDDataByPattern(timePeriod, 'VLRJX20', currentInterval)

      console.log(
        `🕐 [自動模式] 使用模擬時間=${hour}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}, 時段=${timePeriod}, IsPeakHour=${isPeakHour}`,
      )
      console.log(`📊 [自動模式] 使用 VD Pattern: Volume_T=${patternData?.Volume_T}, Speed=${patternData?.Speed}`)
    } else {
      // 手動模式：使用隨機時間配置 + 使用 targetFeatures
      const timeConfig = getTimeConfigForScenario(scenarioKey)
      hour = timeConfig.hour
      minute = timeConfig.minute
      second = timeConfig.second
      isPeakHour = timeConfig.isPeakHour
      console.log(
        `🎭 [手動模式] 生成隨機時間=${hour}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}, IsPeakHour=${isPeakHour}`,
      )
    }

    // � 使用 pattern 數據或 targetFeatures 數據
    let volumeM, volumeS, volumeL, occupancy, speed, volumeT, speedM, speedS, speedL

    if (this.isAutoMode && patternData) {
      // 自動模式：直接使用 pattern 數據
      volumeT = patternData.Volume_T
      volumeM = patternData.Volume_M
      volumeS = patternData.Volume_S
      volumeL = patternData.Volume_L
      occupancy = patternData.Occupancy
      speed = patternData.Speed

      // 🎯 從 pattern 中推算各車型速度（加入隨機波動）
      // 因為 pattern 提供總速度，需要分配給各車型，每個車型都有不同的波動
      const baseSpeedM = Math.round(speed * 1.0 + (Math.random() - 0.5) * 8) // 機車速度接近平均，±4
      const baseSpeedS = Math.round(speed * 1.0 + (Math.random() - 0.5) * 8) // 小客車速度接近平均，±4
      const baseSpeedL = Math.round(speed * 0.8 + (Math.random() - 0.5) * 6) // 大客車速度偏低，±3

      speedM = Math.max(1, Math.min(100, baseSpeedM))
      speedS = Math.max(1, Math.min(100, baseSpeedS))
      speedL = Math.max(1, Math.min(100, baseSpeedL))

      console.log(
        `📊 [Pattern 數據] Volume_T=${volumeT}, 占有率=${occupancy}%, 速度=${speed}km/h, 車型速度: 機=${speedM}, 小=${speedS}, 大=${speedL}`,
      )
    } else {
      // 手動模式或無 pattern：使用 targetFeatures 數據
      const features = scenario.targetFeatures
      const volumeByType = features.volumeByType
      const speedByType = features.speedByType

      // 在目標值範圍內加入隨機波動 ±20%
      const volumeVariance = 0.8 + Math.random() * 0.4

      // ✅ 正確計算各車型數量
      volumeM = Math.round(volumeByType.motor * volumeVariance)
      volumeS = Math.round(volumeByType.small * volumeVariance)
      volumeL = Math.round(volumeByType.large * volumeVariance)
      volumeT = 0 // ✅ 聯結車禁止進入，必定為 0

      // ✅ 正確計算各車型速度：支援速度範圍（物件）或固定值（數字）
      speedM = this._getRandomSpeed(speedByType.motor)
      speedS = this._getRandomSpeed(speedByType.small)
      speedL = this._getRandomSpeed(speedByType.large)

      // 計算加權平均速度
      const totalVolume = volumeM + volumeS + volumeL
      speed = totalVolume > 0 ? Math.round((speedM * volumeM + speedS * volumeS + speedL * volumeL) / totalVolume) : 0

      // ✅ 佔有率
      occupancy = Math.round(
        features.occupancyRange[0] + Math.random() * (features.occupancyRange[1] - features.occupancyRange[0]),
      )
    }

    // ✅ 聯結車禁止進入，不需計算 speedT

    // 🎯【重要】生成4個方向的 API 數據陣列（東、西、南、北）
    // 每個方向都是發送給後端的完整格式
    const directions = [
      { VD_ID: 'VLRJX20', LaneID: 0, name: '往東' }, // 東向
      { VD_ID: 'VLRJM60', LaneID: 1, name: '往西' }, // 西向
      { VD_ID: 'VLRJX00', LaneID: 2, name: '往南' }, // 南向
      { VD_ID: 'VLRJX00', LaneID: 3, name: '往北' }, // 北向
    ]

    // 為每個方向生成**完全不同的數據**（模擬真實交通多樣性）
    // 每個方向都有獨立的車流量、速度波動
    const apiDataArray = []
    directions.forEach((direction, dirIdx) => {
      // 🎯 為每個方向生成獨立的波動倍數
      // 尖峰時段：60-80% 的基礎流量
      // 離峰時段：50-90% 的基礎流量
      // 凌晨時段：40-100% 的基礎流量（有時特別少，有時有零星車流）
      const isRushHour = isPeakHour === 1
      let directionVariance
      if (isRushHour) {
        // 尖峰時段：確保各方向都有車流，但有合理變化（60-90%）
        directionVariance = 0.6 + Math.random() * 0.3
      } else {
        // 非尖峰：更大的變化範圍（40-100%）
        directionVariance = 0.4 + Math.random() * 0.6
      }

      // 🎯 為每個方向生成不同的車型流量
      const dirVolumeM = Math.max(1, Math.round(volumeM * directionVariance * (0.7 + Math.random() * 0.6)))
      const dirVolumeS = Math.max(1, Math.round(volumeS * directionVariance * (0.7 + Math.random() * 0.6)))
      const dirVolumeL = Math.round(volumeL * directionVariance * (0.5 + Math.random() * 1.0))

      // 🎯 為每個方向和車型生成不同的速度
      // 每個方向受到自身流量影響：流量大 → 速度慢，流量小 → 速度快
      const dirTotalVolume = dirVolumeM + dirVolumeS + dirVolumeL
      const flowDensity = dirTotalVolume / (volumeM + volumeS + volumeL || 1) // 相對流量密度

      // 🎯 重點：每個方向都應該獲得**完全不同的速度值**
      // 為該方向重新獲取各車型的基礎速度（而不是共用全局的 speedM/S/L）
      let dirBaseSpeedM, dirBaseSpeedS, dirBaseSpeedL

      // 無論自動模式還是手動模式，都使用 speedByType 配置
      const speedByType = scenario.targetFeatures.speedByType
      dirBaseSpeedM = this._getRandomSpeed(speedByType.motor)
      dirBaseSpeedS = this._getRandomSpeed(speedByType.small)
      dirBaseSpeedL = this._getRandomSpeed(speedByType.large)

      // 速度會因方向流量而調整
      const speedAdjustment = Math.max(0.7, Math.min(1.3, 1 / flowDensity)) // 流量高→速度低倍數
      const dirSpeedM = Math.max(
        1,
        Math.min(100, Math.round(dirBaseSpeedM * speedAdjustment * (0.85 + Math.random() * 0.3))),
      )
      const dirSpeedS = Math.max(
        1,
        Math.min(100, Math.round(dirBaseSpeedS * speedAdjustment * (0.85 + Math.random() * 0.3))),
      )
      const dirSpeedL = Math.max(
        1,
        Math.min(100, Math.round(dirBaseSpeedL * speedAdjustment * (0.85 + Math.random() * 0.3))),
      )

      // 🎯 計算該方向的加權平均速度
      const dirWeightedSpeed =
        dirTotalVolume > 0
          ? Math.round((dirSpeedM * dirVolumeM + dirSpeedS * dirVolumeS + dirSpeedL * dirVolumeL) / dirTotalVolume)
          : 0

      // 🎯 佔有率也隨方向流量調整
      const dirOccupancy = Math.round(occupancy * directionVariance * 10) / 10

      apiDataArray.push({
        VD_ID: direction.VD_ID,
        DayOfWeek: new Date().getDay(),
        Hour: hour,
        Minute: minute,
        Second: second,
        IsPeakHour: isPeakHour,
        LaneID: direction.LaneID,
        LaneType: 1,
        // 🎯 該方向的加權平均速度（基於該方向的車流特性）
        Speed: dirWeightedSpeed,
        // 🎯 該方向的佔有率
        Occupancy: dirOccupancy,
        // 🎯 該方向的各車型流量（完全不同的值）
        Volume_M: dirVolumeM,
        Speed_M: dirSpeedM,
        Volume_S: dirVolumeS,
        Speed_S: dirSpeedS,
        Volume_L: dirVolumeL,
        Speed_L: dirSpeedL,
        // 聯結車禁止進入
        Volume_T: 0,
        Speed_T: 0,
      })
    })

    // 🎯【重要】保存 API 數據陣列到全局，供 MainLayout.vue 顯示特徵模擬數據面板
    window.currentGeneratedVDData = {
      apiDataArray: apiDataArray, // 4筆API數據（東西南北）
      timestamp: new Date().toISOString(),
      scenario: scenarioKey,
    }

    console.log(
      `🔍 [window.currentGeneratedVDData] SET - apiDataArray.length=${window.currentGeneratedVDData.apiDataArray.length}`,
    )
    console.log(`🔍 [window.currentGeneratedVDData] Speeds:`)
    window.currentGeneratedVDData.apiDataArray.forEach((data, idx) => {
      console.log(`   方向 ${idx}: Speed_M=${data.Speed_M}, Speed_S=${data.Speed_S}, Speed_L=${data.Speed_L}`)
    })

    // 🔍 調試：檢查每個方向的 Volume_L
    console.log('🔍 [AutoTrafficGenerator] 4 方向 API 數據 Volume_L 值：')
    apiDataArray.forEach((data, index) => {
      console.log(`  方向 ${index} (${data.VD_ID}): Volume_L = ${data.Volume_L} (小數位: ${typeof data.Volume_L})`)
    })

    // 🔍 調試：檢查每個方向的速度值
    console.log('🔍 [AutoTrafficGenerator] 4 方向 API 數據速度值（Speed_M/S/L）：')
    apiDataArray.forEach((data, index) => {
      console.log(
        `  方向 ${index} (${data.VD_ID}): Speed_M=${data.Speed_M}, Speed_S=${data.Speed_S}, Speed_L=${data.Speed_L}`,
      )
    })

    // 🎯【重要】返回包含 4 個方向 API 數據的結構
    // 新增：apiData 屬性包含原始 API 數據以保持向後兼容性
    const returnData = {
      apiDataArray: apiDataArray, // 4 筆 API 數據（東西南北）
      apiData: apiDataArray[0], // 保留第一個方向作為預設，用於 UI 顯示和向後兼容
      vdData: apiDataArray, // 同時提供 vdData 別名，用於 UI 消費
    }

    console.log(`🔍 [RETURN DATA] apiDataArray.length=${returnData.apiDataArray.length}`)
    console.log(`🔍 [RETURN DATA] Full data:`, JSON.stringify(returnData, null, 2))

    return returnData
  }

  // 🎯 獲取情景對應的小時
  _getScenarioHour(scenarioKey) {
    const scenario = getScenarioByKey(scenarioKey)
    if (!scenario || !scenario.hourRanges || scenario.hourRanges.length === 0) {
      return new Date().getHours()
    }

    // 隨機選擇一個時間範圍
    const range = scenario.hourRanges[Math.floor(Math.random() * scenario.hourRanges.length)]

    // 在該範圍內隨機選擇一個小時
    if (range.start <= range.end) {
      return this._randomInt(range.start, range.end - 1)
    } else {
      // 跨越午夜的情況（例如 23 to 24, 0 to 7）
      if (Math.random() < 0.5) {
        return this._randomInt(range.start, 23)
      } else {
        return this._randomInt(0, range.end - 1)
      }
    }
  }

  // 🎯 獲取情景模式名稱
  _getScenarioModeName(scenarioKey) {
    const scenario = getScenarioByKey(scenarioKey)
    return scenario ? scenario.name : '未知情景'
  }

  // 🎯 輔助：隨機整數
  _randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // 🎯 輔助：根據速度配置獲取隨機速度
  // 支援速度範圍物件 {min, max} 或固定值 (number)
  _getRandomSpeed(speedConfig) {
    if (typeof speedConfig === 'object' && speedConfig.min !== undefined && speedConfig.max !== undefined) {
      // 速度範圍：隨機選擇 min-max 之間的值
      const result = Math.round(speedConfig.min + Math.random() * (speedConfig.max - speedConfig.min))
      return result
    } else if (typeof speedConfig === 'number') {
      // 固定速度：加入 ±3 km/h 的小波動
      const result = Math.round(speedConfig + (Math.random() - 0.5) * 6)
      return result
    } else {
      // 預設速度
      return 30
    }
  }

  // 🎯 輔助：隨機浮點數
  _randomFloat(min, max) {
    return Math.random() * (max - min) + min
  }

  // 根據模擬時間套用交通設定檔，使用於自動模式
  // 🎯 每日自動模式的核心方法：生成 VD 數據 + 傳送 API 預測
  _applyTrafficProfile() {
    console.log(`🔍 [_applyTrafficProfile] CALLED - isAutoMode=${this.isAutoMode}`)
    // 🔧 CRITICAL FIX：如果已離開自動模式，則不執行
    if (!this.isAutoMode) {
      console.log(`⏸️ [自動模式] 已停止，跳過本次應用`)
      return
    }

    // 使用統一配置取得當前時段情境
    const scenario = getScenarioByTime(this.simulationTime)
    const scenarioKey = scenario.key
    const scenarioConfig = getScenarioByKey(scenarioKey)

    // ✅ 新增：自動時段檢測和正規化
    const hour = this.simulationTime.getHours()
    const timePeriod = getCurrentTimePeriod()
    const normParams = VDNormalizationUtils.getTimePeriodAndParamsByHour('VLRJM60', hour)

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

    if (scenarioConfig) {
      // 使用情景配置中的 targetFeatures 生成 VD 數據
      const visualVDData = this._generateScenarioVDData(scenarioKey)

      // 回傳給 UI (使用視覺層數據用於前端顯示)
      if (this.onTimeUpdate && visualVDData) {
        this.onTimeUpdate({
          time: this.simulationTime.toLocaleTimeString('it-IT'),
          description: scenario.description,
          vdData: visualVDData, // 傳送視覺層數據
          apiVDData: visualVDData.apiData, // 傳送原始 API 數據
          scenarioMode: scenarioKey, // 🎭 情景 key
          targetFeatures: scenarioConfig.targetFeatures, // 傳遞目標特徵供 UI 參考
          // ✅ 新增：時段和正規化信息
          timePeriod: timePeriod,
          normalizationParams: normParams,
          normalizationInfo: `[正規化] 時段=${timePeriod}, 小時=${hour}:00, displayMultiplier=${normParams.params.displayMultiplier}x`,
        })
      }

      // 🎯 VD 數據已生成，交由 TrafficLightController.sendDataToBackend() 負責發送 API
      // AutoTrafficGenerator 只負責生成車輛，不負責發送 API
    } else {
      // 備用方案：如果沒有找到配置，使用原始邏輯
      if (this.onTimeUpdate) {
        this.onTimeUpdate({
          time: this.simulationTime.toLocaleTimeString('it-IT'),
          description: scenario.description,
          scenarioMode: 'unknown',
          timePeriod: timePeriod,
          normalizationParams: normParams,
        })
      }
    }
  }

  // 🎯 新增：根據 displayMultiplier 生成視覺層 VD 數據
  // ==========================================
  //  генерирање возила (Vehicle Generation)
  // ==========================================
  //  генерирање возила (Vehicle Generation)
  // ==========================================

  // 計算下次間隔
  _calcInterval() {
    const { min, max, normal } = this.config.interval

    // 🚨 新增：動態密度調整 - 根據當前車輛數量調整間隔
    const currentVehicleCount = this._getCurrentVehicleCount()
    const densityMultiplier = this._getDensityMultiplier(currentVehicleCount)

    // 🎯 新增：根據 displayMultiplier 調整車輛生成間隔
    const displayMultiplierAdjustment = this._getDisplayMultiplierAdjustment()

    // 手動模式下，直接使用來自UI的`normal`值，但加入密度調整
    // 🔧 修正：手動模式不應除以 displayMultiplierAdjustment，確保拉桿值直接生效
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

    // 自動模式下，讓 peakMultiplier 發揮作用，並應用 displayMultiplier 調整
    base /= this.config.peakMultiplier * displayMultiplierAdjustment

    const rand = 0.8 + Math.random() * 0.4
    const val = Math.round(base * rand)
    return Math.max(min, Math.min(max, val))
  }

  // 🎯 新增：獲取基於當前時段的 displayMultiplier 調整因子
  _getDisplayMultiplierAdjustment() {
    // 自動模式：使用情景配置中的 displayMultiplier
    if (this.isAutoMode) {
      const hours = this.simulationTime.getHours()
      const scenario = getScenarioByTime(this.simulationTime)

      if (!scenario || !scenario.displayMultiplier) {
        console.warn(`⚠️ 無法獲取時段 ${hours}:00 的 displayMultiplier，使用預設值 1`)
        return 1 // 若無配置，不調整
      }

      const displayMult = scenario.displayMultiplier
      // 🔴【優化】僅在開發環境或首次時打印，避免過度輸出
      if (window.__DEBUG_DISPLAY_MULTIPLIER__) {
        console.log(`🎭 [自動模式] 時段 ${hours}:00 -> displayMultiplier = ${displayMult}`)
      }
      return displayMult
    }

    // 手動模式：從 this.config 中直接取得 displayMultiplier
    // ✅ 改為從 this.config 讀取，而不是依賴 currentScenarioMode
    if (this.config && this.config.displayMultiplier !== undefined) {
      const displayMult = this.config.displayMultiplier
      // 🔴【優化】僅在開發環境或首次時打印，避免過度輸出
      if (window.__DEBUG_DISPLAY_MULTIPLIER__) {
        console.log(`🎭 [手動模式] displayMultiplier = ${displayMult} (來自 this.config)`)
      }
      return displayMult
    }

    // 向後兼容：如果 this.config 中沒有，嘗試從 currentScenarioMode 讀取
    if (this.currentScenarioMode) {
      const scenario = getScenarioByKey(this.currentScenarioMode)
      if (scenario && scenario.config && scenario.config.displayMultiplier) {
        const displayMult = scenario.config.displayMultiplier
        if (window.__DEBUG_DISPLAY_MULTIPLIER__) {
          console.log(`🎭 [手動模式-兼容] displayMultiplier = ${displayMult} (來自 currentScenarioMode)`)
        }
        return displayMult
      }
    }

    // console.warn(`⚠️ 無法獲取 displayMultiplier，使用預設值 1`)
    return 1
  }

  // 排程下一次
  _scheduleNext() {
    if (!this.isRunning) return

    let delay = this._calcInterval()

    // 動態最小生成間隔，根據滑桿強度調整
    const currentVehicleCount = this._getCurrentVehicleCount()
    let minGenerationGap = 100 // 降低基礎最小間隔至 100ms

    // 根據配置的間隔範圍動態調整最小間隔
    const configMinInterval = this.config.minInterval || 100
    minGenerationGap = Math.max(100, configMinInterval * 0.5)

    if (currentVehicleCount > 40) {
      minGenerationGap = Math.max(200, configMinInterval * 0.8) // 車輛很多時稍微增加間隔
    } else if (currentVehicleCount > 25) {
      minGenerationGap = Math.max(150, configMinInterval * 0.6) // 車輛較多時輕微增加間隔
    }

    // 確保延遲不低於計算出的最小間隔，但要考慮用戶設定
    delay = Math.max(delay, minGenerationGap)

    this.timer = setTimeout(() => {
      // 🚗 新增：根據配置生成多輛車（支持固定值或隨機範圍）
      let vehiclesToGenerate = this.config.vehiclesPerInterval || 1

      // 如果是對象格式 { min, max }，則取隨機值
      if (typeof vehiclesToGenerate === 'object' && vehiclesToGenerate.min !== undefined) {
        const min = vehiclesToGenerate.min || 1
        const max = vehiclesToGenerate.max || 1
        vehiclesToGenerate = Math.floor(Math.random() * (max - min + 1)) + min
      }

      for (let i = 0; i < vehiclesToGenerate; i++) {
        this._generateVehicle()
      }
      this._scheduleNext()
    }, delay)
  }

  // 隨機生成一輛車
  _generateVehicle() {
    // ✅ 【新增】優先級 1：檢查全局車輛限制（硬性限制）
    const maxLiveVehicles = this.config.maxLiveVehicles || 100
    const currentLiveVehicles = window.liveVehicles ? window.liveVehicles.length : 0

    if (currentLiveVehicles >= maxLiveVehicles) {
      console.warn(`❌ [生成限制] 當前活躍車輛 ${currentLiveVehicles} 已達硬性限制 ${maxLiveVehicles}，停止生成新車輛`)
      return
    }

    // 🎭 獲取當前時段和對應的上限配置
    const currentTimePeriod = getCurrentTimePeriod() || 'off_peak' // 預設離峰
    const timeLimits = VOLUME_LIMITS_CONFIG[currentTimePeriod] || VOLUME_LIMITS_CONFIG['off_peak']

    // 🎭 根據 displayMultiplier 動態調整前端動畫上限
    const displayMult = this._getDisplayMultiplierAdjustment()
    const baseMaxLiveVehicles = timeLimits.maxLiveVehicles || this.maxLiveVehicles
    const adjustedMaxLiveVehicles = Math.ceil(baseMaxLiveVehicles * displayMult)

    // 🚨 檢查前端動畫車輛上限
    if (window.liveVehicles && window.liveVehicles.length >= adjustedMaxLiveVehicles) {
      console.log(
        `🎭 前端動畫車輛已達上限 (${window.liveVehicles.length}/${adjustedMaxLiveVehicles}，時段=${currentTimePeriod}，displayMult=${displayMult})，暫停生成`,
      )
      return
    }

    // 檢查最近生成的車輛，但使用更短的檢查時間
    const now = Date.now()
    const recentVehicles = window.liveVehicles
      ? window.liveVehicles.filter((v) => {
          return now - v.timestamp < 2000 // 檢查時間縮短到2秒
        })
      : []

    // 檢查極短時間內的車輛（500ms內）
    // 🚗 動態調整：根據 vehiclesPerInterval 的最大值調整限制
    const maxVehiclesPerInterval = this.config.vehiclesPerInterval?.max || 1
    const veryRecentVehicles = recentVehicles.filter((v) => now - v.timestamp < 500)
    const veryRecentLimit = Math.max(5, maxVehiclesPerInterval * 1.5) // 允許最大值的1.5倍

    if (veryRecentVehicles.length >= veryRecentLimit) {
      console.log(`🚨 極短時間內車輛生成過多 (${veryRecentVehicles.length}/${veryRecentLimit})，短暫延後`)
      setTimeout(() => this._scheduleNext(), Math.max(200, this.config.minInterval || 200)) // 使用配置的最小間隔
      return
    }

    // 如果2秒內生成的車輛過多，延後生成
    // 🚗 動態調整：允許更多車輛
    const recentLimit = Math.max(15, maxVehiclesPerInterval * 2)

    if (recentVehicles.length >= recentLimit) {
      console.log(`🚦 短時間內車輛生成過多 (${recentVehicles.length}/${recentLimit})，延後生成`)
      setTimeout(() => this._scheduleNext(), Math.max(300, this.config.minInterval || 300)) // 使用配置的最小間隔
      return
    }

    const dirs = ['east', 'west', 'north', 'south']

    // � 【新增】停止線車輛限制檢查 - 先過濾掉停止線已滿的方向
    const nonFullDirs = dirs.filter((dir) => {
      const stopLineCount = this.trafficController ? this.trafficController.getVehiclesWaitingAtStopLine(dir) : 0
      const stopLineLimit = this.getAdaptiveStopLineLimit(dir) // 🚦【Phase 5C】使用動態限制而非固定值

      if (stopLineCount >= stopLineLimit) {
        // 🚀【Phase 5D】禁用 console.log 以優化 CPU - 只在開發模式下打印
        if (process.env.DEV) {
          console.log(`🚦 [停止線限制] ${dir}方向停止線已滿 (${stopLineCount}/${stopLineLimit})，暫停生成`)
        }
        return false
      }
      return true
    })

    // �🚨 新增：車道級別冷卻檢查 - 過濾掉冷卻中的方向（在停止線檢查之後）
    const availableDirs = nonFullDirs.filter((dir) => {
      const laneKey = dir // 可以後續擴展為 `${dir}_${laneNumber}`
      const lastGenTime = this.laneGenerationCooldown[laneKey] || 0
      const timeSinceLastGen = now - lastGenTime
      return timeSinceLastGen >= this.minLaneInterval
    })

    // 如果沒有可用方向，延後重試
    if (availableDirs.length === 0) {
      setTimeout(() => this._scheduleNext(), this.minLaneInterval / 2)
      return
    }

    let selectedDir = availableDirs[Math.floor(Math.random() * availableDirs.length)]

    // 檢查每個方向的車輛數量
    const dirCounts = availableDirs.reduce((acc, dir) => {
      acc[dir] = recentVehicles.filter((v) => v.direction === dir).length
      return acc
    }, {})

    // 尋找車輛最少的方向
    const minCount = Math.min(...Object.values(dirCounts))
    const bestDirs = availableDirs.filter((dir) => dirCounts[dir] === minCount)

    // 如果原選方向車輛過多，選擇其他可用方向
    if (dirCounts[selectedDir] > minCount) {
      console.log(`🚦 ${selectedDir}方向車輛過多(${dirCounts[selectedDir]})，選擇較少車輛的方向`)
      selectedDir = bestDirs[Math.floor(Math.random() * bestDirs.length)]
    }

    // 🚨 更嚴格的同方向車輛檢查
    const veryRecentDirVehicles = recentVehicles.filter((v) => v.direction === selectedDir && now - v.timestamp < 1000) // 延長到1秒
    if (veryRecentDirVehicles.length > 0) {
      console.log(`🚨 ${selectedDir}方向1秒內已有車輛(${veryRecentDirVehicles.length}台)，延後生成`)
      setTimeout(() => this._scheduleNext(), Math.max(500, this.minLaneInterval / 3)) // 更長的延遲
      return
    }

    // 🚨 新增：高速生成時的位置碰撞檢測
    // 檢查同方向車輛的實際位置距離，防止重疊生成
    if (this.minLaneInterval < 1000) {
      // 當車道冷卻時間短於1秒時啟用
      const sameDirectionVehicles = window.liveVehicles
        ? window.liveVehicles.filter((v) => v.direction === selectedDir && v.element && v.element.style)
        : []

      let isTooClose = false
      // 🚗 使用配置的安全生成距離
      const minVehicleDistance =
        FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION.LONG_DISTANCE_QUEUE_CATCH_UP.SAFE_SPAWN_DISTANCE || 100

      for (const vehicle of sameDirectionVehicles) {
        // 獲取車輛當前位置
        if (!vehicle.currentPosition || typeof vehicle.currentPosition.x !== 'number') {
          // 嘗試從DOM元素獲取位置
          if (vehicle.element && vehicle.element.style) {
            const transform = vehicle.element.style.transform
            if (transform && transform.includes('translate')) {
              const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/)
              if (match) {
                vehicle.currentPosition = {
                  x: parseFloat(match[1]),
                  y: parseFloat(match[2]),
                }
              }
            }
          }
          if (!vehicle.currentPosition) continue
        }

        // 根據方向檢查起始點距離
        let distanceFromStart = 0
        switch (selectedDir) {
          case 'east':
            distanceFromStart = Math.abs(vehicle.currentPosition.x - 0) // 東向起始點 x=0
            break
          case 'west':
            distanceFromStart = Math.abs(vehicle.currentPosition.x - 800) // 西向起始點 x=800
            break
          case 'north':
            distanceFromStart = Math.abs(vehicle.currentPosition.y - 600) // 北向起始點 y=600
            break
          case 'south':
            distanceFromStart = Math.abs(vehicle.currentPosition.y - 0) // 南向起始點 y=0
            break
        }

        // 如果有車輛距離起始點太近，延後生成
        if (distanceFromStart < minVehicleDistance) {
          console.log(
            `🚨 ${selectedDir}方向有車輛距離起始點太近(${Math.round(distanceFromStart)}px < ${minVehicleDistance}px)，延後生成`,
          )
          isTooClose = true
          break
        }
      }

      if (isTooClose) {
        setTimeout(() => this._scheduleNext(), Math.max(300, this.minLaneInterval / 3)) // 🚨 增加延遲時間
        return
      }

      // 🚨 新增：檢查是否有車輛在同一車道的前方範圍內
      const frontCheckDistance =
        FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION.LONG_DISTANCE_QUEUE_CATCH_UP.SAFE_SPAWN_DISTANCE * 2 || 200 // 檢查前方2倍安全距離

      for (const vehicle of sameDirectionVehicles) {
        if (!vehicle.currentPosition || !vehicle.laneNumber) continue

        // 檢查是否會分配到同一車道
        const wouldBeInSameLane = this._wouldGenerateInSameLane(selectedDir, vehicle)
        if (!wouldBeInSameLane) continue

        let isInFrontRange = false

        switch (selectedDir) {
          case 'east':
            isInFrontRange = vehicle.currentPosition.x >= 0 && vehicle.currentPosition.x <= frontCheckDistance
            break
          case 'west':
            isInFrontRange = vehicle.currentPosition.x <= 800 && vehicle.currentPosition.x >= 800 - frontCheckDistance
            break
          case 'north':
            isInFrontRange = vehicle.currentPosition.y <= 600 && vehicle.currentPosition.y >= 600 - frontCheckDistance
            break
          case 'south':
            isInFrontRange = vehicle.currentPosition.y >= 0 && vehicle.currentPosition.y <= frontCheckDistance
            break
        }

        if (isInFrontRange) {
          console.log(`🚨 ${selectedDir}方向前方${frontCheckDistance}px內有同車道車輛，延後生成`)
          setTimeout(() => this._scheduleNext(), Math.max(400, this.minLaneInterval / 2))
          return
        }
      }
    }

    // 車道層級的密度檢查，但使用更寬鬆的限制
    const recentDirVehicles = recentVehicles.filter((v) => v.direction === selectedDir)
    if (recentDirVehicles.length >= 3) {
      // 降低限制到3台
      console.log(`🚦 ${selectedDir}方向車輛密度過高(${recentDirVehicles.length})，延後生成`)
      setTimeout(() => this._scheduleNext(), Math.max(500, this.minLaneInterval / 2))
      return
    }

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

    // 🎯 【修復 2】從 API 數據讀取車速而不是隨機值
    if (window.lastApiVDDataArray && Array.isArray(window.lastApiVDDataArray)) {
      try {
        // 找到對應方向的 API 數據
        const directionMap = {
          north: 0,
          east: 1,
          south: 2,
          west: 3,
        }
        const dirIndex = directionMap[selectedDir]

        if (dirIndex !== undefined && window.lastApiVDDataArray[dirIndex]) {
          const apiData = window.lastApiVDDataArray[dirIndex]

          // 根據車型選擇對應的速度
          let apiSpeed = 30
          if (type === 'motor' && apiData.Speed_M !== undefined) {
            apiSpeed = apiData.Speed_M
          } else if (type === 'small' && apiData.Speed_S !== undefined) {
            apiSpeed = apiData.Speed_S
          } else if (type === 'large' && apiData.Speed_L !== undefined) {
            apiSpeed = apiData.Speed_L
          } else if (apiData.Speed !== undefined) {
            apiSpeed = apiData.Speed
          }

          speed = Math.round(apiSpeed)
          if (apiSpeed > 0) {
            console.log(`✅ [車速同步] ${selectedDir}方向 ${type}類型: ${speed} km/h (來自 API)`)
          }
        }
      } catch (error) {
        console.warn(`⚠️ [車速同步] 讀取 API 車速失敗:`, error)
      }
    }

    // 如果無法從 API 讀取，回退到控制器方法
    if (speed === 30 && this.trafficController && this.trafficController.getAverageSpeed) {
      speed = this.trafficController.getAverageSpeed(selectedDir, type)
    }

    // 🌤️ 【新增】天氣系統整合 - 應用天氣速度倍數
    let weatherMultiplier = 1.0
    if (this.trafficController && this.trafficController.weatherController) {
      const weatherMult = this.trafficController.weatherController.getSpeedMultiplier()
      if (weatherMult && typeof weatherMult === 'number') {
        weatherMultiplier = weatherMult
        console.log(
          `🌦️ 天氣倍數應用: ${weatherMultiplier.toFixed(2)}x (${this.trafficController.weatherController.getCurrentWeather()})`,
        )
      }
    }
    speed = Math.round(speed * weatherMultiplier) // 應用天氣倍數到車速

    // 🚨 記錄車道生成時間
    const laneKey = selectedDir // 可以後續擴展為 `${selectedDir}_${laneNumber}`
    this.laneGenerationCooldown[laneKey] = now

    // 🎯 新增：左轉車輛生成機率（20%機率生成左轉車輛）
    const isLeftTurn = Math.random() < 0.2

    // 🚗 新增：最終生成前的安全位置檢查
    const spawnPoints = {
      east: { x: 0, y: isLeftTurn ? 300 : 350 }, // 東向起始點
      west: { x: 800, y: isLeftTurn ? 300 : 350 }, // 西向起始點
      north: { x: isLeftTurn ? 400 : 450, y: 600 }, // 北向起始點
      south: { x: isLeftTurn ? 400 : 450, y: 0 }, // 南向起始點
    }

    const proposedSpawnPoint = spawnPoints[selectedDir]
    if (!this._isSpawnPositionSafe(selectedDir, proposedSpawnPoint)) {
      console.log(`🚨 ${selectedDir}方向生成位置不安全，延後生成`)
      setTimeout(() => this._scheduleNext(), Math.max(500, this.minLaneInterval / 2))
      return
    }

    if (isLeftTurn) {
      // 生成左轉車輛（車道1）
      window.dispatchEvent(
        new CustomEvent('generateLeftTurnVehicle', {
          detail: { direction: selectedDir, type: type, speed: speed, timestamp: Date.now() },
        }),
      )
    } else {
      // 🚨 計算動態 initialProgress - 考慮車輛長度和安全距離
      let initialProgress = 0

      if (LANE_SPAWN_CONFIG.ENABLE_DYNAMIC_PROGRESS && window.liveVehicles && window.liveVehicles.length > 0) {
        // 尋找同方向且有效的最後一輛車
        const lastVehicleInDir = window.liveVehicles
          .filter((v) => v.direction === selectedDir && typeof v.progress === 'number')
          .slice(-1)[0]

        if (lastVehicleInDir && lastVehicleInDir.progress >= 0) {
          // 獲取車輛長度
          const vehicleLength = VEHICLE_DIMENSIONS[type]?.length || 60
          const safeDistance = LANE_SPAWN_CONFIG.SAFE_DISTANCE
          const entryBuffer = LANE_SPAWN_CONFIG.ENTRY_BUFFER

          // 取得該方向路徑長度
          const pathId = `${selectedDir}-path`
          const pathElement = document.getElementById(pathId)

          if (pathElement && pathElement.getTotalLength && pathElement.getTotalLength() > 0) {
            const pathLength = pathElement.getTotalLength()

            // 計算新車的 progress：(上一輛車的像素位置 - 車長 - 安全距離 - 緩衝) / 路徑長度
            const lastVehiclePixels = lastVehicleInDir.progress * pathLength
            const newProgressPixels = lastVehiclePixels - vehicleLength - safeDistance - entryBuffer
            initialProgress = newProgressPixels / pathLength

            // 如果啟用負 progress，允許車輛在 Path 外生成
            if (LANE_SPAWN_CONFIG.ENABLE_NEGATIVE_PROGRESS) {
              // 限制負 progress 不超過路徑長度的 20%
              initialProgress = Math.max(-0.2, initialProgress)
            } else {
              // 否則最小值為 0
              initialProgress = Math.max(0, initialProgress)
            }

            console.log(
              `🚗 [${type}] ${selectedDir}方向: 上一車 progress=${lastVehicleInDir.progress.toFixed(3)}, 新車 initialProgress=${initialProgress.toFixed(3)}`,
            )
          }
        }
      }

      // 生成直行車輛（車道2-4），附帶 initialProgress
      window.dispatchEvent(
        new CustomEvent('generateVehicle', {
          detail: {
            direction: selectedDir,
            vehicleType: type,
            speed: speed,
            initialProgress: initialProgress,
            timestamp: Date.now(),
          },
        }),
      )
    }

    window.dispatchEvent(
      new CustomEvent('vehicleAdded', {
        detail: { direction: selectedDir, type: type, speed: speed, timestamp: Date.now() },
      }),
    )
    this.statistics.total++
  }

  /**
   * 🚦【Phase 5C 新增】根據下游擁塞率計算自適應停止線限制
   * 如果下游方向擁塞，則減少當前方向的放行車輛數
   * 🚀【Phase 5D 優化】添加快取機制以避免重複計算
   * @param {string} direction - 方向 ('east', 'west', 'north', 'south')
   * @returns {number} 動態調整後的停止線限制
   */
  getAdaptiveStopLineLimit(direction) {
    try {
      // 🚀【Phase 5D】檢查快取是否有效
      const now = Date.now()
      if (now - this._cacheTimestamp < this._CACHE_DURATION && this._congestionCache[direction] !== undefined) {
        return this._congestionCache[direction]
      }

      // 快取失效或過期，重新計算
      const baseLimit = STOP_LINE_VEHICLE_LIMITS[direction] || 25

      // 如果沒有 trafficController，使用基礎限制
      if (!this.trafficController) {
        return baseLimit
      }

      // 獲取對向方向
      const opposite = this._getOppositeDirection(direction)
      if (!opposite) {
        return baseLimit
      }

      // 獲取對向停止線的車輛數和限制
      const oppositeCount = this.trafficController.getVehiclesWaitingAtStopLine(opposite) || 0
      const oppositeLimit = STOP_LINE_VEHICLE_LIMITS[opposite] || 25

      // 計算對向擁塞率
      const oppositeCongestionRate = Math.min(1.0, oppositeCount / oppositeLimit)

      // 根據擁塞率調整當前方向的限制
      let dynamicLimit = baseLimit

      if (oppositeCongestionRate > 0.85) {
        // 對向高度擁塞（> 85%）→ 限制為基礎的 30%
        dynamicLimit = Math.ceil(baseLimit * 0.3)
        // 🚀【Phase 5D】禁用 console.log 以優化 CPU - 只在開發模式下打印
        if (process.env.DEV) {
          console.log(
            `🚦 [動態限制] ${direction}方向: 對向 ${opposite} 高度擁塞 (${(oppositeCongestionRate * 100).toFixed(1)}%), ` +
              `限制調整 ${baseLimit} → ${dynamicLimit} 台車`,
          )
        }
      } else if (oppositeCongestionRate > 0.7) {
        // 對向中度擁塞（> 70%）→ 限制為基礎的 60%
        dynamicLimit = Math.ceil(baseLimit * 0.6)
        // 🚀【Phase 5D】禁用 console.log 以優化 CPU - 只在開發模式下打印
        if (process.env.DEV) {
          console.log(
            `🚦 [動態限制] ${direction}方向: 對向 ${opposite} 中度擁塞 (${(oppositeCongestionRate * 100).toFixed(1)}%), ` +
              `限制調整 ${baseLimit} → ${dynamicLimit} 台車`,
          )
        }
      } else if (oppositeCongestionRate > 0.5) {
        // 對向低度擁塞（> 50%）→ 限制為基礎的 80%
        dynamicLimit = Math.ceil(baseLimit * 0.8)
        if (process.env.DEV) {
          console.log(
            `🚦 [動態限制] ${direction}方向: 對向 ${opposite} 低度擁塞 (${(oppositeCongestionRate * 100).toFixed(1)}%), ` +
              `限制調整 ${baseLimit} → ${dynamicLimit} 台車`,
          )
        }
      }
      // 否則使用基礎限制，不記錄日誌以減少噪音

      // 🚀【Phase 5D】快取計算結果
      this._congestionCache[direction] = dynamicLimit
      this._cacheTimestamp = now

      return dynamicLimit
    } catch (error) {
      console.warn(`⚠️ [動態限制] 計算失敗: ${error.message}`)
      return STOP_LINE_VEHICLE_LIMITS[direction] || 25
    }
  }

  /**
   * 🚦【Phase 5C 新增】獲取相反方向
   * @param {string} direction - 方向
   * @returns {string|null} 相反方向
   */
  _getOppositeDirection(direction) {
    const opposites = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    }
    return opposites[direction] || null
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

  // 🚨 根據車輛密度和最近生成時間計算間隔調整係數
  _getDensityMultiplier(vehicleCount) {
    const now = Date.now()
    const recentVehicles = window.liveVehicles
      ? window.liveVehicles.filter((v) => {
          return now - v.timestamp < 2000 // 檢查2秒內生成的車輛
        }).length
      : 0

    // 基礎密度係數 - 更溫和的調整，讓滑桿效果更明顯
    let densityMultiplier = 1.0
    if (vehicleCount < 5)
      densityMultiplier = 0.8 // 車輛很少時反而降低間隔
    else if (vehicleCount < 10) densityMultiplier = 1.0
    else if (vehicleCount < 20) densityMultiplier = 1.2
    else if (vehicleCount < 30) densityMultiplier = 1.5
    else if (vehicleCount < 40) densityMultiplier = 2.0
    else densityMultiplier = 2.5

    // 根據最近生成的車輛數增加係數 - 更溫和的調整
    if (recentVehicles >= 5) densityMultiplier *= 1.5
    else if (recentVehicles >= 3) densityMultiplier *= 1.2
    else if (recentVehicles >= 2) densityMultiplier *= 1.4

    // 新增：檢查極短時間內（1秒）的車輛
    const veryRecentVehicles = window.liveVehicles
      ? window.liveVehicles.filter((v) => now - v.timestamp < 1000).length
      : 0
    if (veryRecentVehicles > 0) densityMultiplier *= 2.0 // 如果1秒內有車，大幅增加間隔

    return densityMultiplier
  }

  // 🚨 新增：判斷新車輛是否會生成在與現有車輛同一車道
  _wouldGenerateInSameLane(direction, existingVehicle) {
    if (!existingVehicle.laneNumber) return false

    // 根據車輛生成邏輯判斷可能的車道分配
    // 假設：直行車輛會優先選擇車道2-4，左轉車輛會選擇車道1
    const isLeftTurn = Math.random() < 0.2 // 與生成邏輯中的機率保持一致

    if (isLeftTurn) {
      return existingVehicle.laneNumber === 1 // 左轉車輛只會在車道1
    } else {
      return existingVehicle.laneNumber >= 2 && existingVehicle.laneNumber <= 4 // 直行車輛在車道2-4
    }
  }

  // 🚗 新增：檢查生成位置是否安全（避免與前車重疊碰撞）
  _isSpawnPositionSafe(direction, proposedSpawnPoint) {
    const sameDirectionVehicles = window.liveVehicles
      ? window.liveVehicles.filter((v) => v.direction === direction && v.currentPosition)
      : []

    // 使用配置的安全生成距離
    const safeDistance =
      FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION.LONG_DISTANCE_QUEUE_CATCH_UP.SAFE_SPAWN_DISTANCE || 100

    for (const vehicle of sameDirectionVehicles) {
      if (!vehicle.currentPosition) continue

      let distance = 0
      switch (direction) {
        case 'east':
          distance = Math.abs(vehicle.currentPosition.x - proposedSpawnPoint.x)
          break
        case 'west':
          distance = Math.abs(vehicle.currentPosition.x - proposedSpawnPoint.x)
          break
        case 'north':
          distance = Math.abs(vehicle.currentPosition.y - proposedSpawnPoint.y)
          break
        case 'south':
          distance = Math.abs(vehicle.currentPosition.y - proposedSpawnPoint.y)
          break
      }

      if (distance < safeDistance) {
        console.log(`🚨 生成位置距離現有車輛太近: ${distance.toFixed(1)}px < ${safeDistance}px`)
        return false
      }
    }

    return true
  }
}
