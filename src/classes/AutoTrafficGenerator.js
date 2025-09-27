/**
 * AutoTrafficGenerator.js - 自動車流分派系統
 */
import { getScenarioByTime, vehicleMixes, defaultConfig } from './config/trafficScenarioConfig.js'

export default class AutoTrafficGenerator {
  constructor(trafficController) {
    this.trafficController = trafficController
    this.isRunning = false
    this.timer = null

    // 🚨 新增：車道級別生成冷卻機制
    this.laneGenerationCooldown = {} // 記錄每個車道的最後生成時間
    this.minLaneInterval = 2000 // 同一車道最小生成間隔（2秒）

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

    // 模擬24小時交通設定檔
    this.trafficProfiles = [
      { from: 0, to: 6, description: '深夜', peakMultiplier: 0.1, vehicleMix: 'light' }, // 更低
      { from: 6, to: 9, description: '上午尖峰', peakMultiplier: 0.8, vehicleMix: 'heavy' }, // 降低
      { from: 9, to: 16, description: '日間離峰', peakMultiplier: 0.4, vehicleMix: 'normal' }, // 降低
      { from: 16, to: 19, description: '傍晚尖峰', peakMultiplier: 0.7, vehicleMix: 'heavy' }, // 降低
      { from: 19, to: 24, description: '夜晚', peakMultiplier: 0.2, vehicleMix: 'normal' }, // 更低
    ]

    this.vehicleMixes = vehicleMixes
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
      console.log(
        `� 車道最小生成間隔動態調整為: ${this.minLaneInterval}ms (基於平均生成間隔 ${Math.round(avgInterval)}ms)`,
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
    console.log('🔧 已切換手動設定：', this.config, 'maxLiveVehicles:', this.maxLiveVehicles)
  }

  // 🚨 新增：設置車道最小間隔的專用方法
  setMinLaneInterval(intervalMs) {
    this.minLaneInterval = Math.max(500, intervalMs) // 最小不少於500ms
    console.log(`🔧 車道最小生成間隔設置為: ${this.minLaneInterval}ms`)
  }

  // 🚨 新增：清除特定車道的冷卻狀態（緊急情況使用）
  clearLaneCooldown(direction) {
    if (direction) {
      delete this.laneGenerationCooldown[direction]
      console.log(`🔧 已清除 ${direction} 方向的車道冷卻`)
    } else {
      this.laneGenerationCooldown = {}
      console.log(`🔧 已清除所有車道冷卻`)
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

  // 根據模擬時間套用交通設定檔，使用於自動模式
  _applyTrafficProfile() {
    // 使用統一配置取得當前時段情境
    const scenario = getScenarioByTime(this.simulationTime)

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
    if (window.liveVehicles && window.liveVehicles.length >= this.maxLiveVehicles) return

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
      const minVehicleDistance = 150 // 🚨 增加最小車輛距離到150px（約2個車身長度）

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

      // 🚨 新增：檢查是否有車輛在同一車道的前200px範圍內
      for (const vehicle of sameDirectionVehicles) {
        if (!vehicle.currentPosition || !vehicle.laneNumber) continue

        // 檢查是否會分配到同一車道
        const wouldBeInSameLane = this._wouldGenerateInSameLane(selectedDir, vehicle)
        if (!wouldBeInSameLane) continue

        let isInFrontRange = false
        const frontCheckDistance = 200 // 檢查前方200px範圍

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
          console.log(`🚨 ${selectedDir}方向前方200px內有同車道車輛，延後生成`)
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

    if (isLeftTurn) {
      // 生成左轉車輛（車道1）
      window.dispatchEvent(
        new CustomEvent('generateLeftTurnVehicle', {
          detail: { direction: selectedDir, type: type, speed: speed, timestamp: Date.now() },
        }),
      )
      console.log(`✅ 生成左轉車輛：${selectedDir}方向車道1 ${type}型`)
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

    console.log(
      `✅ 成功生成車輛：${selectedDir}方向 ${type}型，下次該方向可生成時間：${new Date(now + this.minLaneInterval).toLocaleTimeString()}`,
    )
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
}
