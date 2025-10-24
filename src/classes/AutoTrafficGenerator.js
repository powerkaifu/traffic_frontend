/**
 * AutoTrafficGenerator.js - 自動車流分派系統
 */
import { getScenarioByTime, getScenarioByKey, defaultConfig } from './config/trafficScenarioConfig.js'
import { FOLLOWING_CONFIG } from './config/vehicleConfig.js'

export default class AutoTrafficGenerator {
  constructor(trafficController) {
    this.trafficController = trafficController
    this.isRunning = false
    this.timer = null

    // 🚨 新增：車道級別生成冷卻機制（使用配置參數）
    this.laneGenerationCooldown = {} // 記錄每個車道的最後生成時間
    this.minLaneInterval = 2000 // 同一車道最小生成間隔（2秒）

    // 🚗 從配置中獲取安全距離，並計算合適的生成間隔
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
      this.minLaneInterval = Math.max(1000, Math.round(timeToPassSafeDistance * 1.5))

      console.log(`🔧 根據配置安全距離(${safeDistance}px)計算車道生成間隔: ${this.minLaneInterval}ms`)
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

    // 🚨 新增：動態調整車道冷卻機制以配合拉桿設定
    if (typeof newConfig.interval === 'object') {
      // 當生成間隔很短時，相應縮短車道冷卻時間
      const avgInterval = (newConfig.interval.min + newConfig.interval.max) / 2
      // 車道冷卻時間 = 平均生成間隔 * 1.2，但不少於500ms，不多於2000ms
      this.minLaneInterval = Math.max(
        500, // 最小500ms保證碰撞檢測有效
        Math.min(2000, Math.round(avgInterval * 1.2)), // 最大2000ms避免太長冷卻
      )
    }

    // �🚨 新增：如果配置包含車道間隔設置，更新它（手動設定可覆蓋動態調整）
    if (typeof newConfig.minLaneInterval === 'number') {
      this.minLaneInterval = Math.max(500, newConfig.minLaneInterval) // 安全下限500ms
      console.log(`🔧 車道最小生成間隔手動設置為: ${this.minLaneInterval}ms`)
    }

    // 如果在自動模式下進行了手動設定，則自動關閉自動模式
    if (this.isAutoMode) {
      this.toggleAutoMode(false)
    }
  }

  // 🚨 新增：設置車道最小間隔的專用方法
  setMinLaneInterval(intervalMs) {
    this.minLaneInterval = Math.max(500, intervalMs) // 最小不少於500ms
  }

  // 🚨 新增：清除特定車道的冷卻狀態（緊急情況使用）
  clearLaneCooldown(direction) {
    if (direction) {
      delete this.laneGenerationCooldown[direction]
    } else {
      this.laneGenerationCooldown = {}
    }
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

    this.isAutoMode = true

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
  switchToScenarioMode(scenarioKey) {
    console.log(`🎭 [情景模式] 切換至: ${scenarioKey}`)

    // 驗證情景配置是否存在
    const scenario = getScenarioByKey(scenarioKey)
    if (!scenario) {
      console.error(`❌ [情景模式] 無效的情景鍵: ${scenarioKey}`)
      return false
    }

    // 停止自動模式
    if (this.isAutoMode) {
      this.toggleAutoMode(false)
    }

    // 清除舊的情景定時器
    if (this.scenarioModeTimer) {
      clearInterval(this.scenarioModeTimer)
      this.scenarioModeTimer = null
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
    this.maxLiveVehicles = scenario.config.maxLiveVehicles

    // 🎯 根據情景的 displayMultiplier 調整車道冷卻間隔
    if (scenario.config.displayMultiplier) {
      this.minLaneInterval = Math.max(500, Math.round(2000 / scenario.config.displayMultiplier))
    }

    // 🎯 生成該情景對應的 VD 數據
    const vdData = this._generateScenarioVDData(scenarioKey)

    // 回傳給 UI
    if (this.onTimeUpdate) {
      this.onTimeUpdate({
        time: new Date().toLocaleTimeString('it-IT'),
        description: scenario.config.description,
        scenarioMode: scenarioKey,
        vdData: vdData,
        targetFeatures: scenario.targetFeatures,
      })
    }

    // ✅ 異步傳送 API 數據給後端
    if (vdData && vdData.apiData) {
      this._sendVDDataToBackendAsync(vdData.apiData)
    }
  }

  // 🎯 3. 為情景生成 VD 數據
  _generateScenarioVDData(scenarioKey) {
    const scenario = getScenarioByKey(scenarioKey)

    if (!scenario || !scenario.targetFeatures) {
      console.error(`❌ 無法獲取情景 ${scenarioKey} 的目標特徵`)
      return null
    }

    const features = scenario.targetFeatures
    // 🎯 在自動模式下使用模擬時間的小時，手動模式下使用隨機小時
    const hour = this.isAutoMode ? this.simulationTime.getHours() : this._getScenarioHour(scenarioKey)

    // 🎭 API 層數據：原始數據（不放大，用於後端）
    const volumeByType = features.volumeByType

    // 在目標值範圍內加入隨機波動 ±20%
    const volumeVariance = 0.8 + Math.random() * 0.4
    const occupancyVariance = 0.8 + Math.random() * 0.4
    const speedVariance = 0.85 + Math.random() * 0.3

    // ✅ 正確計算各車型數量
    const volumeM = Math.round(volumeByType.motor * volumeVariance)
    const volumeS = Math.round(volumeByType.small * volumeVariance)
    const volumeL = Math.round(volumeByType.large * volumeVariance)
    const volumeT = volumeM + volumeS + volumeL // ✅ 計算總數

    // ✅ 正確計算各車型速度
    const speedM = Math.round(features.speed * speedVariance * (0.85 + Math.random() * 0.3))
    const speedS = Math.round(features.speed * speedVariance)
    const speedL = Math.round(features.speed * speedVariance * (0.7 + Math.random() * 0.3))

    // ✅ 正確計算加權平均速度
    const speedT = volumeT > 0 ? (speedM * volumeM + speedS * volumeS + speedL * volumeL) / volumeT : 0.0

    const apiVDData = {
      VD_ID: 'VLRJX20',
      DayOfWeek: new Date().getDay(),
      Hour: hour,
      Minute: Math.floor(Math.random() * 60),
      Second: 0,
      IsPeakHour: scenarioKey === 'peak_hours' ? 1 : 0,
      LaneID: 0,
      LaneType: 1,
      // 🎯 API 層：原始車輛數據（不放大）
      Volume_M: volumeM,
      Volume_S: volumeS,
      Volume_L: volumeL,
      Volume_T: volumeT,
      // 🎯 API 層：原始速度數據
      Speed_M: speedM,
      Speed_S: speedS,
      Speed_L: speedL,
      Speed_T: speedT,
      // 🎯 API 層：原始佔有率（不放大）
      Occupancy: Math.round(features.occupancy * occupancyVariance * 10) / 10,
    }

    // 🎭 視覺層數據：應用 displayMultiplier 放大（用於前端動畫）
    const displayMultiplier = scenario.config.displayMultiplier || 1
    const visualVDData = {
      ...apiVDData,
      // 放大後的數據用於視覺顯示
      Volume_M: Math.round(volumeM * displayMultiplier),
      Volume_S: Math.round(volumeS * displayMultiplier),
      Volume_L: Math.round(volumeL * displayMultiplier),
      Volume_T: volumeT * displayMultiplier,
      // 佔有率也放大以匹配視覺流量
      Occupancy: Math.round(features.occupancy * occupancyVariance * displayMultiplier * 10) / 10,
      // 標記這是視覺層數據
      isVisualData: true,
      displayMultiplier: displayMultiplier,
      // 保留原始 API 數據備用
      apiData: apiVDData,
    }

    return visualVDData
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

  // 🎯 輔助：隨機浮點數
  _randomFloat(min, max) {
    return Math.random() * (max - min) + min
  }

  // 根據模擬時間套用交通設定檔，使用於自動模式
  // 🎯 每日自動模式的核心方法：生成 VD 數據 + 傳送 API 預測
  _applyTrafficProfile() {
    // 使用統一配置取得當前時段情境
    const scenario = getScenarioByTime(this.simulationTime)
    const scenarioKey = scenario.key
    const scenarioConfig = getScenarioByKey(scenarioKey)

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
        })
      }

      // 🎯 異步傳送 API 預測（使用原始 API 數據）
      if (visualVDData && visualVDData.apiData) {
        this._sendVDDataToBackendAsync(visualVDData.apiData)
      }
    } else {
      // 備用方案：如果沒有找到配置，使用原始邏輯
      if (this.onTimeUpdate) {
        this.onTimeUpdate({
          time: this.simulationTime.toLocaleTimeString('it-IT'),
          description: scenario.description,
          scenarioMode: 'unknown',
        })
      }
    }
  }

  // 🎯 新增：根據 displayMultiplier 生成視覺層 VD 數據
  // 🎯 新增：異步傳送 VD 數據給後端模型預測
  async _sendVDDataToBackendAsync(vdData) {
    try {
      // ✅ 直接使用 vdData 中的時間信息（已在 _generateScenarioVDData 中設置）
      const hours = vdData.Hour || this.simulationTime.getHours()
      const minutes = vdData.Minute || this.simulationTime.getMinutes()
      const dayOfWeek = vdData.DayOfWeek || this.simulationTime.getDay()

      const payload = {
        VD_ID: vdData.VD_ID || 'VLRJX20',
        DayOfWeek: vdData.DayOfWeek || dayOfWeek,
        Hour: vdData.Hour || hours,
        Minute: vdData.Minute || minutes,
        Second: vdData.Second || 0,
        IsPeakHour: vdData.IsPeakHour || 0,
        LaneID: vdData.LaneID || 0,
        LaneType: vdData.LaneType || 1,
        Speed: vdData.Speed_T || 0,
        Occupancy: vdData.Occupancy || 0,
        Volume_M: vdData.Volume_M || 0,
        Speed_M: vdData.Speed_M || 0,
        Volume_S: vdData.Volume_S || 0,
        Speed_S: vdData.Speed_S || 0,
        Volume_L: vdData.Volume_L || 0,
        Speed_L: vdData.Speed_L || 0,
        Volume_T: vdData.Volume_T || 0,
        Speed_T: vdData.Speed_T || 0,
      }

      console.log('📤 [發送 API]', payload)

      // 🚨 DEBUG: 暫時禁用 API 調用（後端未運行時）
      const ENABLE_API_CALL = false

      if (!ENABLE_API_CALL) {
        console.log(
          `⏭️ [API已禁用] 跳過發送 | 時間: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} | ` +
            `Volume_T=${payload.Volume_T} Speed_T=${payload.Speed_T.toFixed(2)}km/h Occupancy=${payload.Occupancy}%`,
        )
        return
      }

      // 發送 API 請求
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.error(`❌ API 錯誤: ${response.status}`)
        return
      }

      const result = await response.json()
      console.log(
        `✅ [預測結果] 時間: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} | ` +
          `佔有率: ${vdData.Occupancy}% | 車流: ${vdData.Volume_T} 輛 | ` +
          `預測綠燈: ${result.green_seconds} 秒`,
      )
    } catch (error) {
      console.error('🚨 傳送 VD 數據失敗:', error.message)
    }
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

    // 🎯 新增：根據 displayMultiplier 調整車輛生成間隔
    const displayMultiplierAdjustment = this._getDisplayMultiplierAdjustment()

    // 手動模式下，直接使用來自UI的`normal`值，但加入密度調整
    if (!this.isAutoMode) {
      let interval = Math.round(
        (normal * (0.9 + Math.random() * 0.2) * densityMultiplier) / displayMultiplierAdjustment,
      )
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

      if (!scenario || !scenario.config || !scenario.config.displayMultiplier) {
        console.warn(`⚠️ 無法獲取時段 ${hours}:00 的 displayMultiplier，使用預設值 1`)
        return 1 // 若無配置，不調整
      }

      const displayMult = scenario.config.displayMultiplier
      console.log(`🎭 [自動模式] 時段 ${hours}:00 -> displayMultiplier = ${displayMult}`)
      return displayMult
    }

    // 手動情景模式：從當前情景配置中取得 displayMultiplier
    if (this.currentScenarioMode) {
      const scenario = getScenarioByKey(this.currentScenarioMode)
      if (scenario && scenario.config && scenario.config.displayMultiplier) {
        const displayMult = scenario.config.displayMultiplier
        return displayMult
      }
    }

    return 1
  }

  // 排程下一次
  _scheduleNext() {
    if (!this.isRunning) return

    // 🎭 根據 displayMultiplier 動態調整 maxLiveVehicles
    const displayMult = this._getDisplayMultiplierAdjustment()
    const baseMaxLiveVehicles = this.config.maxLiveVehicles || this.maxLiveVehicles
    const adjustedMaxLiveVehicles = Math.ceil(baseMaxLiveVehicles * displayMult)

    // 檢查是否已達到當前時段的上限
    if (window.liveVehicles && window.liveVehicles.length >= adjustedMaxLiveVehicles) {
      console.log(
        `🚦 車輛已達上限 (${window.liveVehicles.length}/${adjustedMaxLiveVehicles}，displayMult=${displayMult})，暫停生成`,
      )
      this.timer = setTimeout(() => {
        this._scheduleNext()
      }, 500)
      return
    }

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
      this._generateVehicle()
      this._scheduleNext()
    }, delay)
  }

  // 隨機生成一輛車
  _generateVehicle() {
    // 🎭 根據 displayMultiplier 動態調整 maxLiveVehicles
    const displayMult = this._getDisplayMultiplierAdjustment()
    const baseMaxLiveVehicles = this.config.maxLiveVehicles || this.maxLiveVehicles
    const adjustedMaxLiveVehicles = Math.ceil(baseMaxLiveVehicles * displayMult)

    if (window.liveVehicles && window.liveVehicles.length >= adjustedMaxLiveVehicles) return

    // 檢查最近生成的車輛，但使用更短的檢查時間
    const now = Date.now()
    const recentVehicles = window.liveVehicles
      ? window.liveVehicles.filter((v) => {
          return now - v.timestamp < 2000 // 檢查時間縮短到2秒
        })
      : []

    // 檢查極短時間內的車輛（500ms內）
    const veryRecentVehicles = recentVehicles.filter((v) => now - v.timestamp < 500)
    if (veryRecentVehicles.length >= 3) {
      console.log('🚨 極短時間內車輛生成過多，短暫延後')
      setTimeout(() => this._scheduleNext(), Math.max(200, this.config.minInterval || 200)) // 使用配置的最小間隔
      return
    }

    // 如果2秒內生成的車輛過多，延後生成
    if (recentVehicles.length >= 8) {
      console.log('🚦 短時間內車輛生成過多，延後生成')
      setTimeout(() => this._scheduleNext(), Math.max(300, this.config.minInterval || 300)) // 使用配置的最小間隔
      return
    }

    const dirs = ['east', 'west', 'north', 'south']

    // 🚨 新增：車道級別冷卻檢查 - 過濾掉冷卻中的方向
    const availableDirs = dirs.filter((dir) => {
      const laneKey = dir // 可以後續擴展為 `${dir}_${laneNumber}`
      const lastGenTime = this.laneGenerationCooldown[laneKey] || 0
      const timeSinceLastGen = now - lastGenTime
      return timeSinceLastGen >= this.minLaneInterval
    })

    // 如果沒有可用方向，延後重試
    if (availableDirs.length === 0) {
      console.log(`🚨 所有車道都在冷卻中，延後 ${this.minLaneInterval / 2}ms 重試`)
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
    if (this.trafficController && this.trafficController.getAverageSpeed) {
      speed = this.trafficController.getAverageSpeed(selectedDir, type)
    }

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
      // 生成直行車輛（車道2-4）
      window.dispatchEvent(
        new CustomEvent('generateVehicle', {
          detail: { direction: selectedDir, vehicleType: type, speed: speed, timestamp: Date.now() },
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
