/**
 * 🎯 模擬狀態管理 Store (Pinia)
 *
 * 用途：統一管理所有交通模擬狀態，完全移除 window 全域變數依賴
 *
 * 狀態分類：
 * 1. 車輛管理：liveVehicles（活躍車輛列表）
 * 2. 核心模塊：trafficController, autoTrafficGenerator, collisionController
 * 3. 數據流：currentGeneratedVDData（VD 數據），lastApiVDDataArray（API 數據）
 * 4. 場景配置：selectedTrafficScenario, selectedTrafficTimePeriod
 * 5. 清理管理：cleanupVehicleInterval
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSimulationStore = defineStore('simulation', () => {
  // ==========================================
  // 📊 車輛管理
  // ==========================================

  /**
   * 活躍車輛列表
   * 替代：window.liveVehicles
   */
  const liveVehicles = ref([])

  /**
   * 添加車輛到列表
   */
  const addVehicle = (vehicle) => {
    if (!liveVehicles.value.find((v) => v.id === vehicle.id)) {
      liveVehicles.value.push(vehicle)
    }
  }

  /**
   * 移除車輛（通過車輛對象或 ID）
   */
  const removeVehicle = (vehicleOrId) => {
    const vehicleId = typeof vehicleOrId === 'string' ? vehicleOrId : vehicleOrId?.id
    liveVehicles.value = liveVehicles.value.filter((v) => v.id !== vehicleId)
  }

  /**
   * 移除多個車輛
   */
  const removeVehicles = (vehicleIds) => {
    liveVehicles.value = liveVehicles.value.filter((v) => !vehicleIds.includes(v.id))
  }

  /**
   * 清空所有車輛
   */
  const clearAllVehicles = () => {
    liveVehicles.value.forEach((vehicle) => {
      if (vehicle && vehicle.remove) {
        vehicle.remove()
      }
    })
    liveVehicles.value = []
  }

  /**
   * 計算當前活躍車輛數
   */
  const vehicleCount = computed(() => liveVehicles.value.length)

  /**
   * 按方向過濾車輛
   */
  const getVehiclesByDirection = (direction) => {
    return liveVehicles.value.filter((v) => v.direction === direction)
  }

  /**
   * 獲取指定方向和車道的車輛
   */
  const getVehiclesByDirectionAndLane = (direction, laneNumber) => {
    return liveVehicles.value.filter((v) => v.direction === direction && v.laneNumber === laneNumber)
  }

  /**
   * 獲取活躍車輛列表（公開方法，便於外部訪問）
   */
  const getLiveVehicles = () => {
    return liveVehicles.value
  }

  // ==========================================
  // 🎛️ 核心模塊實例
  // ==========================================

  /**
   * 交通燈控制器實例
   * 替代：window.trafficController
   */
  const trafficController = ref(null)

  const setTrafficController = (controller) => {
    trafficController.value = controller
  }

  /**
   * 自動車流生成器實例
   * 替代：window.autoTrafficGenerator
   */
  const autoTrafficGenerator = ref(null)

  const setAutoTrafficGenerator = (generator) => {
    autoTrafficGenerator.value = generator
  }

  /**
   * 碰撞檢測控制器實例
   * 替代：window.collisionController
   */
  const collisionController = ref(null)

  const setCollisionController = (controller) => {
    collisionController.value = controller
  }

  /**
   * 自適應流量控制器實例
   * 替代：window.adaptiveFlowController
   */
  const adaptiveFlowController = ref(null)

  const setAdaptiveFlowController = (controller) => {
    adaptiveFlowController.value = controller
  }

  /**
   * 交通數據收集器實例
   * 替代：window.trafficDataCollector
   */
  const trafficDataCollector = ref(null)

  const setTrafficDataCollector = (collector) => {
    trafficDataCollector.value = collector
  }

  /**
   * 天氣控制器實例
   * 替代：window.weatherController
   */
  const weatherController = ref(null)

  const setWeatherController = (controller) => {
    weatherController.value = controller
  }

  /**
   * 便利 getter 方法：獲取交通燈控制器
   */
  const getTrafficController = () => trafficController.value

  /**
   * 便利 getter 方法：獲取自動生成器
   */
  const getAutoTrafficGenerator = () => autoTrafficGenerator.value

  /**
   * 便利 getter 方法：獲取自適應流量控制器
   */
  const getAdaptiveFlowController = () => adaptiveFlowController.value

  /**
   * 便利 getter 方法：獲取交通數據收集器
   */
  const getTrafficDataCollector = () => trafficDataCollector.value

  /**
   * 便利 getter 方法：獲取天氣控制器
   */
  const getWeatherController = () => weatherController.value

  /**
   * 便利 getter 方法：獲取 API VD 數據
   */
  const getLastApiVDDataArray = () => lastApiVDDataArray.value

  /**
   * 當前生成的 VD 數據
   * 替代：window.currentGeneratedVDData
   *
   * 結構：
   * {
   *   apiDataArray: [...],  // 4 方向 API 數據
   *   vdData: [...],         // 展示層數據
   *   timestamp: '',         // 時間戳
   *   scenario: '',          // 情景 key
   * }
   */
  const currentGeneratedVDData = ref({
    apiDataArray: [],
    vdData: [],
    timestamp: null,
    scenario: null,
  })

  const setCurrentGeneratedVDData = (data) => {
    currentGeneratedVDData.value = {
      apiDataArray: data.apiDataArray || [],
      vdData: data.vdData || data.apiDataArray || [],
      timestamp: data.timestamp || new Date().toISOString(),
      scenario: data.scenario || null,
    }
  }

  /**
   * ✅ Phase 5：獲取當前生成的 VD 數據
   */
  const getCurrentGeneratedVDData = () => {
    return currentGeneratedVDData.value
  }

  /**
   * 最後發送的 API 數據陣列（用於車輛生成時讀取速度）
   * 替代：window.lastApiVDDataArray
   */
  const lastApiVDDataArray = ref([])

  const setLastApiVDDataArray = (data) => {
    lastApiVDDataArray.value = Array.isArray(data) ? data : []
  }

  /**
   * 最後的正規化數據陣列
   * 替代：window.lastNormalizedDataArray
   */
  const lastNormalizedDataArray = ref([])

  const setLastNormalizedDataArray = (data) => {
    lastNormalizedDataArray.value = Array.isArray(data) ? data : []
  }

  // ==========================================
  // 🚗 車輛距離配置（代理 Vehicle 靜態方法）
  // ==========================================

  /**
   * 設置全局車輛距離乘數
   * 替代：window.setVehicleDistance
   */
  const setVehicleDistance = (multiplier) => {
    try {
      const Vehicle = require('../classes/Vehicle.js').default
      if (Vehicle && Vehicle.setDistanceMultiplier) {
        Vehicle.setDistanceMultiplier(multiplier)
      }
    } catch (error) {
      console.warn('⚠️ [SimulationStore] 設置車輛距離失敗:', error)
    }
  }

  /**
   * 設置南北向車輛距離乘數
   * 替代：window.setNorthSouthDistance
   */
  const setNorthSouthDistance = (multiplier) => {
    try {
      const Vehicle = require('../classes/Vehicle.js').default
      if (Vehicle && Vehicle.setNorthSouthDistanceMultiplier) {
        Vehicle.setNorthSouthDistanceMultiplier(multiplier)
      }
    } catch (error) {
      console.warn('⚠️ [SimulationStore] 設置南北向距離失敗:', error)
    }
  }

  /**
   * 獲取當前車輛距離配置
   * 替代：window.getVehicleDistanceConfig
   */
  const getVehicleDistanceConfig = () => {
    try {
      const Vehicle = require('../classes/Vehicle.js').default
      if (Vehicle && Vehicle.getDistanceConfig) {
        return Vehicle.getDistanceConfig()
      }
    } catch (error) {
      console.warn('⚠️ [SimulationStore] 獲取車輛距離配置失敗:', error)
    }
    return {}
  }

  // ==========================================
  // 🎭 場景配置
  // ==========================================

  /**
   * 當前選擇的交通流量情景
   * 替代：window.selectedTrafficScenario
   */
  const selectedTrafficScenario = ref(null)

  const setSelectedTrafficScenario = (scenario) => {
    selectedTrafficScenario.value = scenario
  }

  /**
   * 當前選擇的時段
   * 替代：window.selectedTrafficTimePeriod
   */
  const selectedTrafficTimePeriod = ref(null)

  const setSelectedTrafficTimePeriod = (timePeriod) => {
    selectedTrafficTimePeriod.value = timePeriod
  }

  // ==========================================
  // 🧹 清理管理
  // ==========================================

  /**
   * 清理車輛的定時器 ID
   * 替代：window.cleanupVehicleInterval
   */
  const cleanupVehicleInterval = ref(null)

  const setCleanupVehicleInterval = (intervalId) => {
    cleanupVehicleInterval.value = intervalId
  }

  const clearCleanupVehicleInterval = () => {
    if (cleanupVehicleInterval.value) {
      clearInterval(cleanupVehicleInterval.value)
      cleanupVehicleInterval.value = null
    }
  }

  // ==========================================
  // 📈 統計信息
  // ==========================================

  /**
   * 模擬統計數據
   */
  const statistics = ref({
    totalVehiclesCreated: 0,
    totalVehiclesRemoved: 0,
    currentLiveVehicles: 0,
    peakVehicleCount: 0,
    totalCollisions: 0,
    totalApiCalls: 0,
    startTime: null,
    simulationTime: 0, // 毫秒
  })

  const updateStatistics = (key, value) => {
    if (key in statistics.value) {
      statistics.value[key] = value
    }
  }

  const incrementStatistics = (key, amount = 1) => {
    if (key in statistics.value && typeof statistics.value[key] === 'number') {
      statistics.value[key] += amount
    }
  }

  // ==========================================
  // 📡 事件系統（替代 window.dispatchEvent）
  // ==========================================

  /**
   * 訂閱者列表
   * 格式：{ eventType: [callback, ...], ... }
   */
  const subscribers = ref({})

  /**
   * 訂閱事件
   */
  const subscribe = (eventType, callback) => {
    if (!subscribers.value[eventType]) {
      subscribers.value[eventType] = []
    }
    subscribers.value[eventType].push(callback)

    // 返回取消訂閱函數
    return () => {
      subscribers.value[eventType] = subscribers.value[eventType].filter((cb) => cb !== callback)
    }
  }

  /**
   * 發送事件
   */
  const emit = (eventType, detail) => {
    if (subscribers.value[eventType]) {
      subscribers.value[eventType].forEach((callback) => {
        try {
          callback(detail)
        } catch (error) {
          console.error(`❌ [SimulationStore] 事件處理錯誤 (${eventType}):`, error)
        }
      })
    }
  }

  /**
   * 清除特定事件的所有訂閱
   */
  const clearEventSubscribers = (eventType) => {
    if (eventType) {
      subscribers.value[eventType] = []
    } else {
      // 清除所有訂閱
      Object.keys(subscribers.value).forEach((key) => {
        subscribers.value[key] = []
      })
    }
  }

  // ==========================================
  // 🔄 Store 重置
  // ==========================================

  /**
   * 完全重置 Store（用於重啟模擬）
   */
  const reset = () => {
    clearAllVehicles()
    trafficController.value = null
    autoTrafficGenerator.value = null
    collisionController.value = null
    adaptiveFlowController.value = null
    currentGeneratedVDData.value = { apiDataArray: [], vdData: [], timestamp: null, scenario: null }
    lastApiVDDataArray.value = []
    lastNormalizedDataArray.value = []
    selectedTrafficScenario.value = null
    selectedTrafficTimePeriod.value = null
    clearCleanupVehicleInterval()
    clearEventSubscribers()
    statistics.value = {
      totalVehiclesCreated: 0,
      totalVehiclesRemoved: 0,
      currentLiveVehicles: 0,
      peakVehicleCount: 0,
      totalCollisions: 0,
      totalApiCalls: 0,
      startTime: null,
      simulationTime: 0,
    }
  }

  // ==========================================
  // 📤 導出 Store 成員
  // ==========================================

  return {
    // 車輛管理
    liveVehicles,
    addVehicle,
    removeVehicle,
    removeVehicles,
    clearAllVehicles,
    vehicleCount,
    getVehiclesByDirection,
    getVehiclesByDirectionAndLane,
    getLiveVehicles,

    // 核心模塊
    trafficController,
    setTrafficController,
    getTrafficController,
    autoTrafficGenerator,
    setAutoTrafficGenerator,
    getAutoTrafficGenerator,
    collisionController,
    setCollisionController,
    adaptiveFlowController,
    setAdaptiveFlowController,
    getAdaptiveFlowController,
    trafficDataCollector,
    setTrafficDataCollector,
    getTrafficDataCollector,
    weatherController,
    setWeatherController,
    getWeatherController,

    // VD 數據流
    currentGeneratedVDData,
    setCurrentGeneratedVDData,
    getCurrentGeneratedVDData,
    lastApiVDDataArray,
    setLastApiVDDataArray,
    getLastApiVDDataArray,
    lastNormalizedDataArray,
    setLastNormalizedDataArray,

    // 車輛距離配置
    setVehicleDistance,
    setNorthSouthDistance,
    getVehicleDistanceConfig,

    // 場景配置
    selectedTrafficScenario,
    setSelectedTrafficScenario,
    selectedTrafficTimePeriod,
    setSelectedTrafficTimePeriod,

    // 清理管理
    cleanupVehicleInterval,
    setCleanupVehicleInterval,
    clearCleanupVehicleInterval,

    // 統計
    statistics,
    updateStatistics,
    incrementStatistics,

    // 事件系統
    subscribe,
    emit,
    clearEventSubscribers,

    // 重置
    reset,
  }
})
