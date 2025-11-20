/**
 * useTrafficLightSystem.js - 交通燈系統 Composable
 * 負責管理交通燈控制器與相關狀態
 */

import { ref } from 'vue'
import TrafficLightController from '../classes/TrafficLightController.js'
import AutoTrafficGenerator from '../classes/AutoTrafficGenerator.js'
import AdaptiveFlowController from '../classes/AdaptiveFlowController.js'
import TrafficDataCollector from '../classes/TrafficDataCollector.js'
import { lightColorConfig } from '../classes/config/trafficConfig.js'

export function useTrafficLightSystem(store) {
  // ========== 狀態管理 ==========
  const currentPhase = ref('南北向 綠燈')
  const countdown = ref(15)

  // ========== 控制器實例 ==========
  const trafficController = new TrafficLightController(store)
  const autoTrafficGenerator = new AutoTrafficGenerator(trafficController, store)
  const adaptiveFlowController = new AdaptiveFlowController(trafficController)
  const trafficDataCollector = new TrafficDataCollector()

  // 🚨 設置車道級別生成控制，防止碰撞
  autoTrafficGenerator.setMinLaneInterval(2000) // 同一車道2秒內不重複生成

  // ========== 倒數計時樣式 ==========
  /**
   * 根據當前燈號返回倒數計時的樣式
   */
  function getCountdownStyle() {
    const phaseText = currentPhase.value

    // 根據燈號文字判斷顏色
    if (phaseText.includes('綠燈') || phaseText.includes('左轉綠')) {
      return {
        color: lightColorConfig.green,
        textShadow: lightColorConfig.textShadow.green,
      }
    } else if (phaseText.includes('黃燈')) {
      return {
        color: lightColorConfig.yellow,
        textShadow: lightColorConfig.textShadow.yellow,
      }
    } else if (phaseText.includes('全紅')) {
      return {
        color: lightColorConfig.red,
        textShadow: lightColorConfig.textShadow.red,
      }
    } else {
      return {
        color: lightColorConfig.red,
        textShadow: lightColorConfig.textShadow.red,
      }
    }
  }

  // ========== 事件監聽設置 ==========
  /**
   * 設置交通燈事件監聽器
   */
  function setupTrafficLightListeners() {
    // 監聽燈號變化
    trafficController.addEventListener('phaseChange', (event) => {
      currentPhase.value = event.detail.phase
      console.log(`🚦 燈號變化: ${event.detail.phase}`)
    })

    // 監聽倒數計時
    trafficController.addEventListener('countdown', (event) => {
      countdown.value = event.detail.remaining
    })

    console.log('✅ [useTrafficLightSystem] 交通燈事件監聽器已設置')
  }

  // ========== 控制器生命週期 ==========
  /**
   * 啟動交通燈系統
   */
  function startTrafficSystem() {
    if (!trafficController.isRunning) {
      trafficController.start()
      console.log('🚦 [useTrafficLightSystem] 交通燈控制器已啟動')
    }
  }

  /**
   * 停止交通燈系統
   */
  function stopTrafficSystem() {
    if (trafficController && trafficController.isRunning) {
      console.log('🛑 停止 trafficController')
      trafficController.stop()
    }

    if (autoTrafficGenerator && autoTrafficGenerator.isRunning) {
      console.log('🛑 停止 autoTrafficGenerator')
      autoTrafficGenerator.stop()
    }

    if (adaptiveFlowController && adaptiveFlowController.isRunning) {
      console.log('🛑 停止 adaptiveFlowController')
      adaptiveFlowController.stop()
    }

    if (trafficDataCollector) {
      console.log('📊 停止交通數據收集器...')
      trafficDataCollector.stop()
    }
  }

  // ========== 返回值 ==========
  return {
    // 狀態
    currentPhase,
    countdown,

    // 控制器實例
    trafficController,
    autoTrafficGenerator,
    adaptiveFlowController,
    trafficDataCollector,

    // 樣式函數
    getCountdownStyle,

    // 事件監聽
    setupTrafficLightListeners,

    // 生命週期
    startTrafficSystem,
    stopTrafficSystem,
  }
}
