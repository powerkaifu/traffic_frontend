import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTrafficStore = defineStore('traffic', () => {
  // 交通模擬狀態
  const isSimulationActive = ref(false)
  const activeCars = ref([])
  const trafficController = ref(null)
  const simulationTimers = ref([])

  // 保存車輛狀態
  const saveCarState = (car) => {
    return {
      id: car.id,
      carNumber: car.carNumber,
      direction: car.direction,
      carType: car.carType,
      laneNumber: car.laneNumber,
      currentState: car.currentState,
      isAtStopLine: car.isAtStopLine,
      waitingForGreen: car.waitingForGreen,
      hasPassedStopLine: car.hasPassedStopLine,
      position: car.getCurrentPosition(),
      targetX: car.targetX,
      targetY: car.targetY,
      // 保存 GSAP 動畫狀態
      animationProgress: car.movementTimeline ? car.movementTimeline.progress() : 0,
      animationDuration: car.movementTimeline ? car.movementTimeline.duration() : 0,
    }
  }

  // 保存所有車輛狀態
  const saveSimulationState = (cars, controller) => {
    const carStates = cars.map((car) => saveCarState(car))

    // 保存到 localStorage 以持久化
    localStorage.setItem(
      'trafficSimulationState',
      JSON.stringify({
        carStates,
        isActive: true,
        timestamp: Date.now(),
      }),
    )

    activeCars.value = carStates
    trafficController.value = controller
    isSimulationActive.value = true

    console.log('🔄 交通模擬狀態已保存', carStates.length, '輛車')
  }

  // 恢復模擬狀態
  const restoreSimulationState = () => {
    try {
      const saved = localStorage.getItem('trafficSimulationState')
      if (saved) {
        const state = JSON.parse(saved)

        // 檢查狀態是否太舊（超過 10 分鐘則重新開始）
        const now = Date.now()
        if (now - state.timestamp > 10 * 60 * 1000) {
          console.log('🔄 保存的狀態太舊，重新開始模擬')
          clearSimulationState()
          return null
        }

        activeCars.value = state.carStates || []
        isSimulationActive.value = state.isActive || false

        console.log('🔄 恢復交通模擬狀態', activeCars.value.length, '輛車')
        return state
      }
    } catch (error) {
      console.error('恢復模擬狀態失敗:', error)
      clearSimulationState()
    }
    return null
  }

  // 清除模擬狀態
  const clearSimulationState = () => {
    localStorage.removeItem('trafficSimulationState')
    activeCars.value = []
    trafficController.value = null
    isSimulationActive.value = false

    // 清理所有計時器
    simulationTimers.value.forEach((timer) => clearTimeout(timer))
    simulationTimers.value = []

    console.log('🔄 交通模擬狀態已清除')
  }

  // 添加計時器到管理列表
  const addTimer = (timerId) => {
    simulationTimers.value.push(timerId)
  }

  // 移除車輛
  const removeCar = (carId) => {
    const index = activeCars.value.findIndex((car) => car.id === carId)
    if (index > -1) {
      activeCars.value.splice(index, 1)

      // 更新 localStorage
      if (activeCars.value.length > 0) {
        const currentState = JSON.parse(localStorage.getItem('trafficSimulationState') || '{}')
        currentState.carStates = activeCars.value
        localStorage.setItem('trafficSimulationState', JSON.stringify(currentState))
      } else {
        clearSimulationState()
      }
    }
  }

  return {
    // 狀態
    isSimulationActive,
    activeCars,
    trafficController,
    simulationTimers,

    // 方法
    saveSimulationState,
    restoreSimulationState,
    clearSimulationState,
    addTimer,
    removeCar,
    saveCarState,
  }
})
