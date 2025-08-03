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
import { onMounted, ref } from 'vue'
import Vehicle from '../classes/Vehicle.js'
import TrafficLightController from '../classes/TrafficLightController.js'

const crossroadContainer = ref(null)
const trafficController = new TrafficLightController()
const currentPhase = ref('南北向 綠燈')
const countdown = ref(15)
const activeCars = ref([]) // 維護活躍車輛列表

// AI 預測結果
const aiPrediction = ref({
  eastWest: 15,
  northSouth: 15,
})

onMounted(() => {
  setTimeout(() => {
    if (crossroadContainer.value) {
      // 監聽視窗大小變化和佈局變化
      const handleLayoutChange = () => {
        // 通知所有活躍車輛佈局發生了變化
        activeCars.value.forEach((car) => {
          if (car.checkLayoutChange) {
            car.checkLayoutChange()
          }
        })
      }

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
      }

      // 將清理函數保存到 window 對象，以便在需要時調用
      window.trafficCleanup = cleanup
      // 初始化交通燈控制系統
      const eastLight = crossroadContainer.value.querySelector('.traffic-light.bottom-left')
      const westLight = crossroadContainer.value.querySelector('.traffic-light.top-right')
      const southLight = crossroadContainer.value.querySelector('.traffic-light.top-left')
      const northLight = crossroadContainer.value.querySelector('.traffic-light.bottom-right')

      console.log('🚥 初始化交通燈控制器...')
      console.log('交通燈元素:', { eastLight, westLight, southLight, northLight })

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
      console.log('🚥 啟動交通燈控制器...')
      trafficController.start()

      // 創建車輛生成器函數 - 使用 TrafficLightController 的車道管理
      const createRandomCar = (direction) => {
        console.log(`🚗 創建車輛：方向 ${direction}`)

        // 使用 TrafficLightController 獲取隨機車道位置
        const laneInfo = trafficController.getRandomLanePosition(direction)
        if (!laneInfo) {
          console.error(`❌ 無法獲取方向 ${direction} 的車道位置`)
          return
        }

        const { position: randomLane, laneNumber } = laneInfo
        const endPosition = trafficController.getEndPosition(direction)

        // 隨機選擇車輛類型
        const carTypes = ['large', 'small', 'motor']
        const randomCarType = carTypes[Math.floor(Math.random() * carTypes.length)]

        const vehicle = new Vehicle(randomLane.x, randomLane.y, direction, randomCarType, laneNumber)
        vehicle.addTo(crossroadContainer.value)

        // 添加到活躍車輛列表
        activeCars.value.push(vehicle)
        console.log(`✅ 車輛已添加，目前活躍車輛數：${activeCars.value.length}`)

        // 立即開始動畫
        setTimeout(async () => {
          // 先淡入車子
          await vehicle.fadeIn(1)

          // 計算基於車輛速度的動畫時間
          const animationDuration = vehicle.calculateAnimationDuration()

          // 開始移動動畫 - 使用新的紅綠燈控制移動方法（包含碰撞檢測）
          let movePromise
          if (direction === 'east') {
            movePromise = vehicle.moveToWithTrafficControl(
              endPosition,
              randomLane.y,
              animationDuration,
              trafficController,
              activeCars.value,
            )
          } else if (direction === 'west') {
            movePromise = vehicle.moveToWithTrafficControl(
              endPosition,
              randomLane.y,
              animationDuration,
              trafficController,
              activeCars.value,
            )
          } else if (direction === 'north') {
            movePromise = vehicle.moveToWithTrafficControl(
              randomLane.x,
              endPosition,
              animationDuration,
              trafficController,
              activeCars.value,
            )
          } else if (direction === 'south') {
            movePromise = vehicle.moveToWithTrafficControl(
              randomLane.x,
              endPosition,
              animationDuration,
              trafficController,
              activeCars.value,
            )
          }

          // 等待移動完成
          await movePromise

          // 移動完成後開始淡出（車輛已到達終點）
          await vehicle.fadeOut(3)

          // 移動完成後從列表中移除並銷毀車子
          const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)
          if (vehicleIndex > -1) {
            activeCars.value.splice(vehicleIndex, 1)
          }
          vehicle.remove()
        }, 100) // 很短的延遲讓車子先出現
      }

      // 隨機間隔生成車輛的函數
      const startRandomCarGeneration = () => {
        const generateCar = () => {
          // 隨機選擇一個方向
          const directions = ['east', 'west', 'north', 'south']
          const randomDirection = directions[Math.floor(Math.random() * directions.length)]

          createRandomCar(randomDirection)

          // 隨機間隔時間生成下一台車 (1-3秒)
          const nextCarDelay = Math.random() * 2000 + 1000 // 1000-3000ms
          setTimeout(generateCar, nextCarDelay)
        }

        // 開始生成車輛
        generateCar()
      }

      // 立即生成初始車輛
      const generateInitialCars = () => {
        const directions = ['east', 'west', 'north', 'south']

        // 每個方向生成1台車
        directions.forEach((direction) => {
          createRandomCar(direction)
        })
      }

      // 立即生成初始車輛（縮短延遲）
      setTimeout(() => {
        console.log('🚀 開始生成初始車輛...')
        generateInitialCars()
      }, 100) // 100ms後生成初始車輛

      // 開始隨機生成車輛（縮短延遲）
      setTimeout(() => {
        console.log('🔄 開始持續生成車輛...')
        startRandomCarGeneration()
      }, 500) // 500ms後開始持續生成
    }
  }, 500)
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
  overflow: hidden;
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
  opacity: 0.8;
  left: 50%;
  top: 50%;
  width: 225px; /* 路口寬度 */
  height: 225px; /* 路口高度 */
  transform: translate(-50%, -50%);
  background: transparent; /* 透明，不顯示 */
  border: 2px dashed rgba(255, 255, 255, 0.3); /* 可選：顯示淡淡的虛線邊框用於調試 */
  pointer-events: none; /* 不攔截滑鼠事件 */
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
</style>
