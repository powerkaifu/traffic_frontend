<template>
  <q-page class="simulation-page">
    <!-- 十字路口場景模擬頁面內容 -->
    <div ref="crossroadContainer" class="crossroad-area">
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
      <!-- 西邊起始位置標記點 -->
      <div class="start-position west-start"></div>
      <div class="start-position west-start-2"></div>
      <div class="start-position west-start-3"></div>
      <div class="start-position west-start-4"></div>

      <!-- 北邊起始位置標記點 -->
      <div class="start-position north-start"></div>
      <div class="start-position north-start-2"></div>
      <div class="start-position north-start-3"></div>
      <div class="start-position north-start-4"></div>

      <!-- 東邊起始位置標記點 -->
      <div class="start-position east-start"></div>
      <div class="start-position east-start-2"></div>
      <div class="start-position east-start-3"></div>
      <div class="start-position east-start-4"></div>

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
    </div>
    <!-- lumo 小機器人助手 -->
    <div class="robot-assistant">
      <img src="/images/lumo.png" alt="機器人助手" />
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Car from '../classes/Car.js'
import TrafficLightController from '../classes/TrafficLightController.js'

const crossroadContainer = ref(null)
const trafficController = new TrafficLightController()
const currentPhase = ref('南北向 綠燈')
const countdown = ref(15)
const activeCars = ref([]) // 維護活躍車輛列表

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

      trafficController.init(eastLight, westLight, southLight, northLight)

      // 設置全域交通控制器供其他組件使用
      window.trafficController = trafficController

      // 設置倒數更新回調
      trafficController.setTimerUpdateCallback((phase, seconds) => {
        if (phase !== null) {
          currentPhase.value = phase
        }
        countdown.value = seconds
      })

      // 5秒後開始交通燈時相變化
      setTimeout(() => {
        trafficController.start()
      }, 100)

      // 車輛終點位置 (車輛完全離開畫面) - 讓動畫更自然
      const endY = -200 // 往北車輛的Y終點：完全離開上邊界
      const endX = 1200 // 往東車輛的X終點：完全離開右邊界 (1000px + 200px緩衝)
      const westEndX = -200 // 往西車輛的X終點：完全離開左邊界
      const southEndY = 800 // 往南車輛的Y終點：完全離開下邊界 (估計容器高度600-700px + 100-200px緩衝)

      // 往東四個車道的位置
      const eastLanes = [
        { x: -100, y: 259 }, // 第一車道
        { x: -100, y: 286 }, // 第二車道
        { x: -100, y: 317 }, // 第三車道
        { x: -100, y: 342 }, // 第四車道
      ]

      // 往西車道的位置 (基於東邊起始點的最下方點)
      const westLanes = [
        { x: 1125, y: 229 }, // 第一車道
        { x: 1125, y: 202 }, // 第二車道
        { x: 1125, y: 174 }, // 第三車道
        { x: 1125, y: 150 }, // 第四車道
      ]

      // 往南車道的位置
      const southLanes = [
        { x: 477, y: -185 }, // 第一車道
        { x: 449, y: -185 }, // 第二車道
        { x: 422, y: -185 }, // 第三車道
        { x: 393, y: -185 }, // 第四車道
      ]

      // 往北四個車道的位置 (使用簡單絕對數值)
      const northLanes = [
        { x: 504, y: 700 }, // 第一車道
        { x: 533, y: 700 }, // 第二車道
        { x: 562, y: 700 }, // 第三車道
        { x: 590, y: 700 }, // 第四車道
      ]

      // 創建車輛生成器函數
      const createRandomCar = (direction, lanes, endPosition) => {
        // 隨機選擇一個車道
        const randomLaneIndex = Math.floor(Math.random() * lanes.length)
        const randomLane = lanes[randomLaneIndex]
        const laneNumber = randomLaneIndex + 1 // 車道編號從1開始

        const car = new Car(randomLane.x, randomLane.y, direction, 'large', laneNumber)
        car.addTo(crossroadContainer.value)

        // 添加到活躍車輛列表
        activeCars.value.push(car)

        // 立即開始動畫
        setTimeout(async () => {
          // 先淡入車子
          await car.fadeIn(1)

          // 開始移動動畫 - 使用新的紅綠燈控制移動方法（包含碰撞檢測）
          let movePromise
          if (direction === 'east') {
            movePromise = car.moveToWithTrafficControl(
              endPosition,
              randomLane.y,
              8,
              trafficController,
              activeCars.value,
            )
          } else if (direction === 'west') {
            movePromise = car.moveToWithTrafficControl(
              endPosition,
              randomLane.y,
              8,
              trafficController,
              activeCars.value,
            )
          } else if (direction === 'north') {
            movePromise = car.moveToWithTrafficControl(
              randomLane.x,
              endPosition,
              8, // 北向車輛速度與其他方向一致
              trafficController,
              activeCars.value,
            )
          } else if (direction === 'south') {
            movePromise = car.moveToWithTrafficControl(
              randomLane.x,
              endPosition,
              8,
              trafficController,
              activeCars.value,
            )
          }

          // 等待移動完成
          await movePromise

          // 移動完成後開始淡出（車輛已到達終點）
          await car.fadeOut(3)

          // 移動完成後從列表中移除並銷毀車子
          const carIndex = activeCars.value.findIndex((c) => c.id === car.id)
          if (carIndex > -1) {
            activeCars.value.splice(carIndex, 1)
          }
          car.remove()
        }, 100) // 很短的延遲讓車子先出現
      }

      // 隨機間隔生成車輛的函數
      const startRandomCarGeneration = () => {
        const generateCar = () => {
          // 隨機選擇一個方向
          const directions = [
            { name: 'east', lanes: eastLanes, endPos: endX },
            { name: 'west', lanes: westLanes, endPos: westEndX },
            { name: 'north', lanes: northLanes, endPos: endY },
            { name: 'south', lanes: southLanes, endPos: southEndY },
          ]

          const randomDirection = directions[Math.floor(Math.random() * directions.length)]
          createRandomCar(randomDirection.name, randomDirection.lanes, randomDirection.endPos)

          // 隨機間隔時間生成下一台車 (1-3秒)
          const nextCarDelay = Math.random() * 2000 + 1000 // 1000-3000ms
          setTimeout(generateCar, nextCarDelay)
        }

        // 開始生成車輛
        generateCar()
      }

      // 立即生成初始車輛
      const generateInitialCars = () => {
        const directions = [
          { name: 'east', lanes: eastLanes, endPos: endX },
          { name: 'west', lanes: westLanes, endPos: westEndX },
          { name: 'north', lanes: northLanes, endPos: endY },
          { name: 'south', lanes: southLanes, endPos: southEndY },
        ]

        // 每個方向生成1台車
        directions.forEach((direction) => {
          createRandomCar(direction.name, direction.lanes, direction.endPos)
        })
      }

      // 立即生成初始車輛
      setTimeout(() => {
        generateInitialCars()
      }, 200) // 200ms後生成初始車輛

      // 開始隨機生成車輛
      setTimeout(() => {
        startRandomCarGeneration()
      }, 1000) // 1秒後開始持續生成
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
  position: absolute;
  top: 5%;
  right: 5%;
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, rgba(35, 80, 150, 0.9), rgba(35, 30, 100, 0.9));
  border-radius: 15px;
  border: 2px solid rgb(63, 117, 205);
  padding: 15px 20px;
  box-shadow: 0 0 20px rgba(30, 30, 100, 0.8);
  backdrop-filter: blur(10px);
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

/* 車道編號標籤樣式 */
:deep(.car-lane-label) {
  font-family: 'Arial', sans-serif;
  font-size: 12px;
  font-weight: bold;
  background: rgba(0, 123, 255, 0.95);
  color: white;
  border: 1px solid #0066cc;
  border-radius: 10px;
  padding: 2px 6px;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  user-select: none;
  transition: background-color 0.3s ease;
}

:deep(.car-lane-label:hover) {
  background: rgba(0, 123, 255, 1);
}
</style>
