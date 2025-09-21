<template>
  <q-page class="simulation-page">
    <!-- 十字路口場景模擬頁面內容 -->
    <div ref="crossroadContainer" class="crossroad-area">
      <!-- 車道路徑 SVG (for GSAP MotionPath) -->
      <svg
        viewBox="0 0 1400 1000"
        preserveAspectRatio="xMidYMid meet"
        :style="{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '100%',
          'pointer-events': isPathEditMode ? 'auto' : 'none',
          'z-index': 10,
          'background-color': 'rgba(0, 100, 200, 0.1)',
          border: '2px dashed rgba(255, 255, 0, 0.3)',
        }"
      >
        <!-- 往東車道1 直行路徑（車輛從畫面外進入到離開畫面） -->
        <path
          id="eastLane1Straight"
          :d="getEastLane1Path()"
          stroke="rgba(255, 100, 100, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!-- 往東車道2 直行路徑（車輛從畫面外進入到離開畫面） -->
        <path
          id="eastLane2Straight"
          :d="getEastLane2Path()"
          stroke="rgba(255, 120, 120, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!-- 往東車道3 直行路徑（車輛從畫面外進入到離開畫面） -->
        <path
          id="eastLane3Straight"
          :d="getEastLane3Path()"
          stroke="rgba(255, 140, 140, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!-- 往東車道4 直行路徑（車輛從畫面外進入到離開畫面） -->
        <path
          id="eastLane4Straight"
          :d="getEastLane4Path()"
          stroke="rgba(255, 160, 160, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往西車道1 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="westLane1Straight"
          :d="getWestLane1Path()"
          stroke="rgba(100, 150, 255, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往西車道2 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="westLane2Straight"
          :d="getWestLane2Path()"
          stroke="rgba(120, 170, 255, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往西車道3 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="westLane3Straight"
          :d="getWestLane3Path()"
          stroke="rgba(140, 190, 255, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往西車道4 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="westLane4Straight"
          :d="getWestLane4Path()"
          stroke="rgba(160, 210, 255, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往南車道1 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="southLane1Straight"
          :d="getSouthLane1Path()"
          stroke="rgba(100, 255, 150, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往南車道2 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="southLane2Straight"
          :d="getSouthLane2Path()"
          stroke="rgba(120, 255, 170, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往南車道3 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="southLane3Straight"
          :d="getSouthLane3Path()"
          stroke="rgba(140, 255, 190, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往南車道4 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="southLane4Straight"
          :d="getSouthLane4Path()"
          stroke="rgba(160, 255, 210, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往北車道1 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="northLane1Straight"
          :d="getNorthLane1Path()"
          stroke="rgba(200, 100, 255, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往北車道2 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="northLane2Straight"
          :d="getNorthLane2Path()"
          stroke="rgba(220, 120, 255, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往北車道3 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="northLane3Straight"
          :d="getNorthLane3Path()"
          stroke="rgba(240, 140, 255, 0.6)"
          stroke-width="2"
          fill="none"
        />
        <!--往北車道4 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="northLane4Straight"
          :d="getNorthLane4Path()"
          stroke="rgba(255, 160, 255, 0.6)"
          stroke-width="2"
          fill="none"
        />
      </svg>

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

      <!-- 路徑編輯控制按鈕 -->
      <div class="path-edit-control">
        <button @click="togglePathEditMode" :class="['edit-btn', { active: isPathEditMode }]" title="切換路徑編輯模式">
          {{ isPathEditMode ? '🔒 停用編輯' : '✏️ 編輯路徑' }}
        </button>
        <button v-if="isPathEditMode" @click="exportPathData" class="export-btn" title="導出編輯後的路徑資料">
          📋 導出路徑
        </button>
        <div v-if="isPathEditMode" class="edit-instructions">拖曳路徑上的控制點來編輯車道路徑</div>
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
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import TrafficLightController from '../classes/TrafficLightController.js'
import AutoTrafficGenerator from '../classes/AutoTrafficGenerator.js'
import TrafficDataCollector from '../classes/TrafficDataCollector.js'
import Vehicle from '../classes/Vehicle.js'
import { createLanePathCalculator } from '../utils/lanePathCalculator.js'

// 註冊 GSAP MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin)

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
  eastWest: 0,
  northSouth: 0,
})

// MotionPathHelper 控制
const isPathEditMode = ref(false)
const pathHelpers = ref([])

// 啟用/停用路徑編輯模式
const togglePathEditMode = () => {
  isPathEditMode.value = !isPathEditMode.value

  if (isPathEditMode.value) {
    enablePathEditing()
  } else {
    disablePathEditing()
  }
}

// 啟用路徑編輯功能
const enablePathEditing = () => {
  console.log('🎯 啟用路徑編輯模式')

  // 所有車道路徑的 ID
  const pathIds = [
    'eastLane1Straight',
    'eastLane2Straight',
    'eastLane3Straight',
    'eastLane4Straight',
    'westLane1Straight',
    'westLane2Straight',
    'westLane3Straight',
    'westLane4Straight',
    'southLane1Straight',
    'southLane2Straight',
    'southLane3Straight',
    'southLane4Straight',
    'northLane1Straight',
    'northLane2Straight',
    'northLane3Straight',
    'northLane4Straight',
  ]

  // 為每個路徑啟用 MotionPathHelper
  pathIds.forEach((pathId) => {
    try {
      const helper = MotionPathPlugin.motionPathHelper(`#${pathId}`, {
        stroke: 'yellow',
        strokeWidth: 3,
        opacity: 0.8,
      })
      pathHelpers.value.push(helper)
      console.log(`✅ ${pathId} 路徑編輯器已啟用`)
    } catch (error) {
      console.error(`❌ 無法啟用 ${pathId} 路徑編輯器:`, error)
    }
  })
}

// 停用路徑編輯功能
const disablePathEditing = () => {
  console.log('🔒 停用路徑編輯模式')

  // 清理所有 MotionPathHelper
  pathHelpers.value.forEach((helper) => {
    if (helper && helper.kill) {
      helper.kill()
    }
  })
  pathHelpers.value = []
}

// 導出所有路徑資料（編輯後）
const exportPathData = () => {
  console.log('📋 導出路徑資料:')

  const pathIds = [
    'eastLane1Straight',
    'eastLane2Straight',
    'eastLane3Straight',
    'eastLane4Straight',
    'westLane1Straight',
    'westLane2Straight',
    'westLane3Straight',
    'westLane4Straight',
    'southLane1Straight',
    'southLane2Straight',
    'southLane3Straight',
    'southLane4Straight',
    'northLane1Straight',
    'northLane2Straight',
    'northLane3Straight',
    'northLane4Straight',
  ]

  const pathData = {}

  pathIds.forEach((pathId) => {
    const pathElement = document.getElementById(pathId)
    if (pathElement) {
      const pathValue = pathElement.getAttribute('d')
      pathData[pathId] = pathValue
      console.log(`${pathId}: ${pathValue}`)
    }
  })

  // 將資料複製到剪貼板
  const jsonData = JSON.stringify(pathData, null, 2)
  navigator.clipboard
    .writeText(jsonData)
    .then(() => {
      console.log('✅ 路徑資料已複製到剪貼板')
      alert('路徑資料已複製到剪貼板！')
    })
    .catch((err) => {
      console.error('❌ 複製失敗:', err)
    })

  return pathData
}

// 路徑計算函數（會在 onMounted 後被初始化）
// 提供預設值以防在初始化前被呼叫
let getEastLane1Path = () => 'M-200,600 L1400,600'
let getEastLane2Path = () => 'M-200,570 L1400,570'
let getEastLane3Path = () => 'M-200,540 L1400,540'
let getEastLane4Path = () => 'M-200,510 L1400,510'

let getWestLane1Path = () => 'M1400,400 L-200,400'
let getWestLane2Path = () => 'M1400,430 L-200,430'
let getWestLane3Path = () => 'M1400,460 L-200,460'
let getWestLane4Path = () => 'M1400,490 L-200,490'

let getSouthLane1Path = () => 'M500,-600 L500,1400'
let getSouthLane2Path = () => 'M470,-600 L470,1400'
let getSouthLane3Path = () => 'M440,-600 L440,1400'
let getSouthLane4Path = () => 'M410,-600 L410,1400'

let getNorthLane1Path = () => 'M530,-600 L530,1400'
let getNorthLane2Path = () => 'M560,-600 L560,1400'
let getNorthLane3Path = () => 'M590,-600 L590,1400'
let getNorthLane4Path = () => 'M620,-600 L620,1400'

onMounted(() => {
  // 初始化路徑計算器並設定所有路徑函數
  if (crossroadContainer.value) {
    const pathCalculator = createLanePathCalculator(crossroadContainer.value)

    // 指派所有路徑計算函數
    getEastLane1Path = pathCalculator.getEastLane1Path
    getEastLane2Path = pathCalculator.getEastLane2Path
    getEastLane3Path = pathCalculator.getEastLane3Path
    getEastLane4Path = pathCalculator.getEastLane4Path

    getWestLane1Path = pathCalculator.getWestLane1Path
    getWestLane2Path = pathCalculator.getWestLane2Path
    getWestLane3Path = pathCalculator.getWestLane3Path
    getWestLane4Path = pathCalculator.getWestLane4Path

    getSouthLane1Path = pathCalculator.getSouthLane1Path
    getSouthLane2Path = pathCalculator.getSouthLane2Path
    getSouthLane3Path = pathCalculator.getSouthLane3Path
    getSouthLane4Path = pathCalculator.getSouthLane4Path

    getNorthLane1Path = pathCalculator.getNorthLane1Path
    getNorthLane2Path = pathCalculator.getNorthLane2Path
    getNorthLane3Path = pathCalculator.getNorthLane3Path
    getNorthLane4Path = pathCalculator.getNorthLane4Path
  }

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
  // 清理 MotionPathHelper
  disablePathEditing()

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
  position: absolute;
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

/* 路徑編輯控制按鈕樣式 ---------------------------------------- */
.path-edit-control {
  position: absolute;
  bottom: 5%;
  left: 5%;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-btn,
.export-btn {
  padding: 12px 20px;
  border: 2px solid rgb(63, 117, 205);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(35, 80, 150, 0.9), rgba(35, 30, 100, 0.9));
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 15px rgba(30, 30, 100, 0.6);
}

.export-btn {
  background: linear-gradient(135deg, rgba(34, 139, 34, 0.9), rgba(0, 100, 0, 0.9));
  border-color: rgb(34, 139, 34);
}

.edit-btn:hover,
.export-btn:hover {
  background: linear-gradient(135deg, rgba(45, 90, 160, 0.9), rgba(45, 40, 110, 0.9));
  transform: translateY(-2px);
  box-shadow: 0 0 20px rgba(30, 30, 100, 0.8);
}

.export-btn:hover {
  background: linear-gradient(135deg, rgba(44, 149, 44, 0.9), rgba(10, 110, 10, 0.9));
}

.edit-btn.active {
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.9), rgba(255, 140, 0, 0.9));
  border-color: rgb(255, 165, 0);
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 15px rgba(255, 165, 0, 0.6);
  }
  50% {
    box-shadow: 0 0 25px rgba(255, 165, 0, 0.8);
  }
  100% {
    box-shadow: 0 0 15px rgba(255, 165, 0, 0.6);
  }
}

.edit-instructions {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffff99;
  font-size: 12px;
  border-radius: 6px;
  text-align: center;
  max-width: 200px;
}
</style>
