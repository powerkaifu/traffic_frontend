<template>
  <q-page class="simulation-page">
    <!-- 十字路口場景模擬頁面內容 -->
    <div ref="crossroadContainer" class="crossroad-area">
      <!-- 道路標籤背景 -->
      <div class="road-label">
        <div class="road-label-bg"></div>
      </div>

      <!-- 四個轉角的紅綠燈 -->
      <!-- RoadA 往東 -->
      <div class="traffic-light bottom-left">
        <img src="/images/light/redLight.png" alt="往東" />
      </div>
      <!-- RoadB 往西 -->
      <div class="traffic-light top-right">
        <img src="/images/light/redLight.png" alt="往西" />
      </div>
      <!-- RoadC 往南 -->
      <div class="traffic-light top-left">
        <img src="/images/light/greenLight.png" alt="往南" />
      </div>
      <!-- RoadB 往北 -->
      <div class="traffic-light bottom-right">
        <img src="/images/light/greenLight.png" alt="往北" />
      </div>

      <!-- 交通燈倒數計時器 -->
      <div class="timer-display">
        <div class="timer-content">
          <div class="timer-phase">{{ currentPhase }}</div>
          <div class="timer-countdown">{{ countdown }}</div>
          <div class="timer-unit">秒</div>
        </div>
      </div>

      <!-- 停止線 -->
      <!-- 中央參考矩形 - 用於統一計算停止線位置 -->
      <div class="stop-line central-reference"></div>
      <!-- 已移除中心紅色圓點 -->

      <!-- AI 交通預測面板 -->
      <div class="ai-prediction-panel">
        <div class="prediction-header">模型預測秒數</div>
        <div class="prediction-content">
          <div class="prediction-item">
            <span class="direction-label">東西向綠燈：</span>
            <span class="timing-value">{{ aiPrediction.eastWest }} 秒</span>
          </div>
          <div class="prediction-item">
            <span class="direction-label">南北向綠燈：</span>
            <span class="timing-value">{{ aiPrediction.northSouth }} 秒</span>
          </div>
        </div>
      </div>
    </div>
    <!-- lumo 小機器人助手 -->
    <div class="robot-assistant">
      <img src="/images/lumo.png" alt="機器人助手" />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import TrafficLightController from '../classes/TrafficLightController.js'
import AutoTrafficGenerator from '../classes/AutoTrafficGenerator.js'
import TrafficDataCollector from '../classes/TrafficDataCollector.js'
import Vehicle from '../classes/Vehicle.js'

// 提升 handleScenarioChange 作用域，讓 onUnmounted 可移除
const handleScenarioChange = (event) => {
  if (window.autoTrafficGenerator && event.detail && event.detail.config) {
    const config = event.detail.config
    // 如果只有 interval 欄位，補上 isManualMode: true
    const isManual = Object.keys(config).length === 1 && Object.prototype.hasOwnProperty.call(config, 'interval')
    if (isManual) {
      window.autoTrafficGenerator.updateConfig({ ...config, isManualMode: true })
    } else {
      window.autoTrafficGenerator.updateConfig(config)
    }
  }
}

// 自動產生車輛的事件處理函數
const handleAutoGenerate = (event) => {
  const { direction, vehicleType } = event.detail
  // 使用現有的車輛創建邏輯
  const laneInfo = trafficController.getRandomLanePosition(direction)
  if (!laneInfo) {
    console.error(`❌ 無法獲取方向 ${direction} 的車道位置`)
    return
  }
  const { position: randomLane, laneNumber } = laneInfo
  // 檢查起始位置是否有其他車輛，避免重疊生成
  const isPositionOccupied = activeCars.value.some((car) => {
    if (car.direction !== direction) return false
    const carPos = car.getCurrentPosition()
    const distance = Math.sqrt(Math.pow(carPos.x - randomLane.x, 2) + Math.pow(carPos.y - randomLane.y, 2))
    return distance < 50
  })
  if (isPositionOccupied) {
    return
  }
  const vehicle = new Vehicle(randomLane.x, randomLane.y, direction, vehicleType, laneNumber)
  vehicle.addTo(crossroadContainer.value)
  activeCars.value.push(vehicle)
  window.dispatchEvent(
    new CustomEvent('vehicleAdded', {
      detail: {
        direction,
        type: vehicleType,
        vehicleId: vehicle.id,
        speed: vehicle.currentSpeed || 0,
        timestamp: new Date().toISOString(),
      },
    }),
  )
  const startVehicleAnimation = async () => {
    try {
      await vehicle.fadeIn(1)
      const animationDuration = vehicle.calculateAnimationDuration()
      const endPosition = trafficController.getEndPosition(direction)
      await vehicle.moveToWithTrafficControl(
        endPosition.x,
        endPosition.y,
        animationDuration,
        trafficController,
        activeCars.value,
      )
      const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)
      if (vehicleIndex > -1) {
        activeCars.value.splice(vehicleIndex, 1)
      }
      await vehicle.fadeOut(1.5)
      vehicle.remove()
      window.dispatchEvent(
        new CustomEvent('vehicleRemoved', {
          detail: {
            direction,
            type: vehicleType,
            vehicleId: vehicle.id,
            finalSpeed: vehicle.currentSpeed || 0,
            travelTime: vehicle.travelTime || 0,
          },
        }),
      )
    } catch (error) {
      console.error('❌ 自動生成車輛動畫錯誤:', error)
      const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)
      if (vehicleIndex > -1) {
        activeCars.value.splice(vehicleIndex, 1)
      }
      vehicle.remove()
    }
  }
  startVehicleAnimation()
}

const crossroadContainer = ref(null)
const trafficController = new TrafficLightController()
const autoTrafficGenerator = new AutoTrafficGenerator(trafficController)
const trafficDataCollector = new TrafficDataCollector()
const currentPhase = ref('南北向 綠燈')
const countdown = ref(15)
const activeCars = ref([]) // 維護活躍車輛列表

// AI 預測結果
const aiPrediction = ref({
  eastWest: 15,
  northSouth: 15,
})

onMounted(() => {
  if (crossroadContainer.value) {
    // 監聽情境切換事件（由 MainLayout 發出）
    window.addEventListener('scenarioChanged', handleScenarioChange)
    window.addEventListener('generateVehicle', handleAutoGenerate)

    // 監聽視窗大小變化和佈局變化
    const handleLayoutChange = () => {
      // 1. 重新計算車道位置
      trafficController.updateLanePositions(crossroadContainer.value)

      // 3. 通知所有活躍車輛佈局發生了變化
      activeCars.value.forEach((car) => {
        if (car.checkLayoutChange) {
          car.checkLayoutChange()
        }
      })
    }

    // 初始呼叫以設定初始位置和繪製點
    handleLayoutChange()

    // 監聽視窗大小變化
    window.addEventListener('resize', handleLayoutChange)

    // 使用 MutationObserver 監聽DOM變化（可能由抽屜引起）
    const observer = new MutationObserver(handleLayoutChange)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true,
    })

    // 在組件卸載時清理監聽器
    const cleanup = () => {
      window.removeEventListener('resize', handleLayoutChange)
      observer.disconnect()
      autoTrafficGenerator.stop()
    }

    // 將清理函數保存到 window 對象，以便在需要時調用
    window.trafficCleanup = cleanup
    // 初始化交通燈控制系統
    const eastLight = crossroadContainer.value.querySelector('.traffic-light.bottom-left')
    const westLight = crossroadContainer.value.querySelector('.traffic-light.top-right')
    const southLight = crossroadContainer.value.querySelector('.traffic-light.top-left')
    const northLight = crossroadContainer.value.querySelector('.traffic-light.bottom-right')

    trafficController.init(eastLight, westLight, southLight, northLight)

    // 設置全域交通控制器供其他組件使用
    window.trafficController = trafficController

    // 輸出車道統計信息（調試用）
    console.log('🛣️ 車道統計信息：', trafficController.getLaneStatistics())

    // 設置倒數更新回調
    trafficController.setTimerUpdateCallback((phase, seconds) => {
      if (phase !== null) {
        currentPhase.value = phase
      }
      countdown.value = seconds
    })

    // 設置AI預測更新回調
    trafficController.setPredictionUpdateCallback((prediction) => {
      aiPrediction.value = prediction
    })

    // 立即開始交通燈時相變化（移除延遲）
    trafficController.start()

    // 初始化自動交通產生器
    console.log('🚦 初始化自動交通產生器...')

    // 啟動自動交通產生器（提前啟動，確保一開始就有車）
    autoTrafficGenerator.start()
    console.log('--------------------- 🤖 自動交通產生器已啟動 ---------------------')

    const directions = ['north', 'south', 'east', 'west']
    const vehicleTypes = ['motor', 'small', 'large']
    for (let i = 0; i < 8; i++) {
      const randomDir = directions[Math.floor(Math.random() * directions.length)]
      const randomType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]
      window.dispatchEvent(
        new CustomEvent('generateVehicle', {
          detail: {
            direction: randomDir,
            vehicleType: randomType,
          },
        }),
      )
    }

    // 定期清理超時車輛機制
    const cleanupInterval = setInterval(() => {
      // 清理可能已經完成但沒有正確清理的車輛
      activeCars.value = activeCars.value.filter((vehicle) => {
        // 檢查車輛是否還在DOM中
        if (!vehicle.element || !vehicle.element.parentNode) {
          console.log(`🗑️ 清理孤立車輛: ${vehicle.id}`)
          return false
        }

        // 檢查車輛存在時間，避免剛創建的車輛被誤清理
        const vehicleAge = Date.now() - new Date(vehicle.createdAt).getTime()
        const isNewVehicle = vehicleAge < 5000 // 5秒內的車輛視為新車輛

        // 保護剛創建的車輛，避免被誤清理
        if (vehicle.justCreated || isNewVehicle) {
          return true // 跳過清理，保留車輛
        }

        // 如果車輛狀態是 completed 或 nearComplete，也要清理
        if (vehicle.currentState === 'completed' || vehicle.currentState === 'nearComplete') {
          vehicle.remove()
          return false
        }

        return true
      })
    }, 2000) // 改為每2秒清理一次，更頻繁地處理終點車輛

    // 在組件卸載時清理定时器
    window.cleanupVehicleInterval = cleanupInterval

    // 初始化並啟動交通數據收集器
    console.log('📊 啟動交通數據收集器...')
    trafficDataCollector.start()

    // 設置全域交通數據收集器
    window.trafficDataCollector = trafficDataCollector

    console.log('✅ 所有系統已初始化完成')
  }
})

// 組件卸載時清理資源
onUnmounted(() => {
  // 停止交通數據收集器
  if (trafficDataCollector) {
    console.log('📊 停止交通數據收集器...')
    trafficDataCollector.stop()
  }

  // 移除情境切換事件監聽
  window.removeEventListener('scenarioChanged', handleScenarioChange)
  window.removeEventListener('generateVehicle', handleAutoGenerate)

  // 清理車輛清理定時器
  if (window.cleanupVehicleInterval) {
    clearInterval(window.cleanupVehicleInterval)
    window.cleanupVehicleInterval = null
  }

  // 清理所有活躍車輛
  activeCars.value.forEach((vehicle) => {
    vehicle.remove()
  })
  activeCars.value = []

  console.log('🧹 IndexPage 資源清理完成')
})
</script>

<style scoped>
.simulation-page {
  /* padding: 20px; */
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 十字路口背景 */
.crossroad-area {
  width: 1000px;
  height: calc(100vh - 100px);
  background-image: url('/images/crossroad.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 8px;
  position: relative;
  /* overflow: hidden; */
  /* border: 3px dashed rgba(255, 255, 255, 0.1); */
}

/* 路標背景 ------------------------------------------------- */
.road-label {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, rgba(35, 80, 150, 1), rgba(35, 30, 100, 1));
  border-radius: 20px;
  border: 1px solid rgb(63, 117, 205);
  position: relative;
  top: 5%;
  left: 5%;
  box-shadow: 0 0 20px rgb(30, 30, 100);
}

.road-label::before {
  content: '模擬路口';
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translate(-50%, 0);
  color: rgb(200, 200, 200);
  border-radius: 20px;
}

.road-label-bg {
  width: 90%;
  height: 90%;
  background-image: url('/images/roadLabel.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 紅綠燈定位 ------------------------------------------------- */
.traffic-light {
  position: absolute;
  width: 85px;
  height: 50px;
}

.traffic-light img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 四個轉角的紅綠燈位置 */
/* RoadA 往東 */
.traffic-light.bottom-left {
  top: 50%;
  /* .center-dot {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 18px;
        height: 18px;
        background: rgba(255, 0, 0, 0.8);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 101;
        pointer-events: none;
      } */
  left: 50%;
  transform: translate(-220%, 290%) rotate(90deg);
}
.traffic-light.bottom-left::before {
  content: 'RoadA 往東 ➡️';
  width: 150px;
  font-size: 1.2rem;
  color: white;
  transform: translateX(-50%) rotate(270deg);
  position: absolute;
  top: 180%;
  left: 15%;
}

/* RoadB 往西 */
.traffic-light.top-right {
  top: 50%;
  right: 50%;
  transform: translate(220%, -390%) rotate(90deg);
}
.traffic-light.top-right::before {
  content: 'RoadB 往西 ⬅️';
  width: 150px;
  font-size: 1.2rem;
  color: white;
  transform: translateX(-50%) rotate(270deg);
  position: absolute;
  top: -180%;
  left: 85%;
}

/* RoadC 往南 */
.traffic-light.top-left {
  top: 50%;
  left: 50%;
  transform: translate(-250%, -340%);
}
.traffic-light.top-left::before {
  content: 'RoadC 往南 ⬇️';
  width: 150px;
  font-size: 1.2rem;
  color: white;
  transform: translateX(-50%);
  position: absolute;
  top: -60%;
  left: 40%;
}

/* RoadD 往北 */
.traffic-light.bottom-right {
  left: 50%;
  top: 50%;
  transform: translate(150%, 240%);
}
.traffic-light.bottom-right::before {
  content: 'RoadD 往北 ⬆️';
  width: 150px;
  font-size: 1.2rem;
  color: white;
  transform: translateX(-50%);
  position: absolute;
  top: 100%;
  left: 90%;
}

/* 小機器人助手 ------------------------------------------------- */
.robot-assistant {
  position: absolute;
  bottom: 0;
  left: 5%;
  width: 200px;
  height: 200px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.robot-assistant img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.robot-assistant:hover {
  transform: scale(1.1);
}

/* 交通燈倒數計時器 ------------------------------------------------- */
.timer-display {
  width: 150px;
  height: 150px;
  border: 2px solid rgb(63, 117, 205);
  border-radius: 15px;
  padding: 15px 20px;
  box-shadow: 0 0 20px rgba(30, 30, 100, 0.8);
  background: linear-gradient(135deg, rgba(35, 80, 150, 0.9), rgba(35, 30, 100, 0.9));
  backdrop-filter: blur(10px);

  position: absolute;
  top: 5%;
  right: 5%;
}

.timer-content {
  text-align: center;
  color: white;
}

.timer-phase {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 5px;
  color: rgb(200, 220, 255);
}

.timer-countdown {
  font-size: 2.5rem;
  font-weight: bold;
  color: #00ff88;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  margin: 5px 0;
}

.timer-unit {
  font-size: 0.9rem;
  color: rgb(180, 200, 255);
}

/* 中央參考矩形 - 十字路口中央的隱藏矩形，用於統一計算停止線位置 */
.central-reference {
  position: absolute;
  z-index: 100;
  opacity: 1;
  left: 50%;
  top: 50%;
  width: 225px; /* 路口寬度 */
  height: 225px; /* 路口高度 */
  transform: translate(-50%, -50%);
  background: none;
  border: 1px dashed #cccccc; /* 虛線淺灰色邊框 */
  pointer-events: none;
}

/* AI 預測面板樣式 ---------------------------------------- */
.ai-prediction-panel {
  width: 160px;
  max-height: 150px;
  border: 2px solid rgb(63, 117, 205);
  border-radius: 15px;
  padding: 16px;
  box-shadow: 0 0 20px rgba(30, 30, 100, 0.8);
  background: linear-gradient(135deg, rgba(35, 80, 150, 0.9), rgba(35, 30, 100, 0.9));
  backdrop-filter: blur(10px);

  position: absolute;
  bottom: 5%;
  right: 5%;
  z-index: 1000;
}

.prediction-header {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 5px;
  color: rgb(200, 220, 255);
  text-align: center;
  margin-bottom: 12px;
}

.prediction-content {
  display: flex;
  flex-direction: column;
}

.prediction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  font-size: 14px;
  padding: 2px 0;
}

.direction-label {
  color: rgb(200, 220, 255);
  font-weight: 500;
}

.timing-value {
  color: #00ff88;
  font-weight: bold;
  font-size: 16px;
  text-shadow: 0 0 5px rgba(0, 255, 136, 0.4);
}

.center-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  background: red;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  box-shadow: 0 0 8px 2px rgba(255, 0, 0, 0.5);
  pointer-events: none;
}
</style>
