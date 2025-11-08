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

  // ==========================================
  // 📊 VD 數據流
  // ==========================================

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

    // 核心模塊
    trafficController,
    setTrafficController,
    autoTrafficGenerator,
    setAutoTrafficGenerator,
    collisionController,
    setCollisionController,
    adaptiveFlowController,
    setAdaptiveFlowController,

    // VD 數據流
    currentGeneratedVDData,
    setCurrentGeneratedVDData,
    lastApiVDDataArray,
    setLastApiVDDataArray,
    lastNormalizedDataArray,
    setLastNormalizedDataArray,

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
