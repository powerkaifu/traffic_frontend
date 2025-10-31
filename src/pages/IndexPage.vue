<template>
  <q-page class="simulation-page">
    <!-- 十字路口場景模擬頁面內容 -->
    <div ref="crossroadContainer" class="crossroad-area">
      <!-- 十字路口車輛遮罩層 - 用於隱藏超出十字路口範圍的車輛 -->
      <div class="crossroad-mask">
        <!-- 車輛容器 - 所有車輛都會添加到這個容器中 -->
        <div ref="vehicleContainer" class="vehicle-container"></div>
      </div>

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
          'z-index': 0,
        }"
      >
        <!-- 往東車道1 直行路徑（車輛從畫面外進入到離開畫面） - 可編輯 -->
        <path
          id="eastLane1Straight"
          :d="getEastLane1Path()"
          :stroke="isPathEditMode ? 'rgba(255, 200, 100, 0.9)' : 'rgba(255, 100, 100, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
          @mouseenter="showPathTooltip($event, '東向車道1 (可編輯)')"
          @mouseleave="hidePathTooltip"
          @mousemove="updateTooltipPosition"
          :style="{ cursor: isPathEditMode ? 'pointer' : 'default' }"
        />
        <!-- 往東車道2 直行路徑（車輛從畫面外進入到離開畫面） -->
        <path
          id="eastLane2Straight"
          :d="getEastLane2Path()"
          stroke="rgba(255, 120, 120, 0.6)"
          stroke-width="2"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
        />
        <!-- 往東車道3 直行路徑（車輛從畫面外進入到離開畫面） -->
        <path
          id="eastLane3Straight"
          :d="getEastLane3Path()"
          stroke="rgba(255, 140, 140, 0.6)"
          stroke-width="2"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
        />
        <!-- 往東車道4 直行路徑（車輛從畫面外進入到離開畫面） - 可編輯 -->
        <path
          id="eastLane4Straight"
          :d="getEastLane4Path()"
          :stroke="isPathEditMode ? 'rgba(255, 200, 100, 0.9)' : 'rgba(255, 160, 160, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
          @mouseenter="showPathTooltip($event, '東向車道4 (可編輯)')"
          @mouseleave="hidePathTooltip"
          @mousemove="updateTooltipPosition"
          :style="{ cursor: isPathEditMode ? 'pointer' : 'default' }"
        />
        <!--往西車道1 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="westLane1Straight"
          :d="getWestLane1Path()"
          :stroke="isPathEditMode ? 'rgba(100, 200, 255, 0.9)' : 'rgba(100, 150, 255, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
          @mouseenter="showPathTooltip($event, '西向車道1 (可編輯)')"
          @mouseleave="hidePathTooltip"
          @mousemove="updateTooltipPosition"
          :style="{ cursor: isPathEditMode ? 'pointer' : 'default' }"
        />
        <!--往西車道2 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="westLane2Straight"
          :d="getWestLane2Path()"
          stroke="rgba(120, 170, 255, 0.6)"
          stroke-width="2"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
        />
        <!--往西車道3 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="westLane3Straight"
          :d="getWestLane3Path()"
          stroke="rgba(140, 190, 255, 0.6)"
          stroke-width="2"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
        />
        <!--往西車道4 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="westLane4Straight"
          :d="getWestLane4Path()"
          :stroke="isPathEditMode ? 'rgba(100, 200, 255, 0.9)' : 'rgba(160, 210, 255, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
          @mouseenter="showPathTooltip($event, '西向車道4 (可編輯)')"
          @mouseleave="hidePathTooltip"
          @mousemove="updateTooltipPosition"
          :style="{ cursor: isPathEditMode ? 'pointer' : 'default' }"
        />
        <!--往南車道1 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="southLane1Straight"
          :d="getSouthLane1Path()"
          :stroke="isPathEditMode ? 'rgba(100, 255, 200, 0.9)' : 'rgba(100, 255, 150, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
          @mouseenter="showPathTooltip($event, '南向車道1 (可編輯)')"
          @mouseleave="hidePathTooltip"
          @mousemove="updateTooltipPosition"
          :style="{ cursor: isPathEditMode ? 'pointer' : 'default' }"
        />
        <!--往南車道2 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="southLane2Straight"
          :d="getSouthLane2Path()"
          stroke="rgba(120, 255, 170, 0.6)"
          stroke-width="2"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
        />
        <!--往南車道3 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="southLane3Straight"
          :d="getSouthLane3Path()"
          stroke="rgba(140, 255, 190, 0.6)"
          stroke-width="2"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
        />
        <!--往南車道4 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="southLane4Straight"
          :d="getSouthLane4Path()"
          :stroke="isPathEditMode ? 'rgba(100, 255, 200, 0.9)' : 'rgba(160, 255, 210, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
          @mouseenter="showPathTooltip($event, '南向車道4 (可編輯)')"
          @mouseleave="hidePathTooltip"
          @mousemove="updateTooltipPosition"
          :style="{ cursor: isPathEditMode ? 'pointer' : 'default' }"
        />
        <!--往北車道1 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="northLane1Straight"
          :d="getNorthLane1Path()"
          :stroke="isPathEditMode ? 'rgba(255, 100, 255, 0.9)' : 'rgba(200, 100, 255, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
          @mouseenter="showPathTooltip($event, '北向車道1 (可編輯)')"
          @mouseleave="hidePathTooltip"
          @mousemove="updateTooltipPosition"
          :style="{ cursor: isPathEditMode ? 'pointer' : 'default' }"
        />
        <!--往北車道2 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="northLane2Straight"
          :d="getNorthLane2Path()"
          stroke="rgba(220, 120, 255, 0.6)"
          stroke-width="2"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
        />
        <!--往北車道3 直行路徑（車輛從畫面外進入到離開畫面）-->
        <path
          id="northLane3Straight"
          :d="getNorthLane3Path()"
          stroke="rgba(240, 140, 255, 0.6)"
          stroke-width="2"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
        />
        <!--往北車道4 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="northLane4Straight"
          :d="getNorthLane4Path()"
          :stroke="isPathEditMode ? 'rgba(255, 100, 255, 0.9)' : 'rgba(255, 160, 255, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
          :opacity="isPathVisible ? 1 : 0"
          fill="none"
          @mouseenter="showPathTooltip($event, '北向車道4 (可編輯)')"
          @mouseleave="hidePathTooltip"
          @mousemove="updateTooltipPosition"
          :style="{ cursor: isPathEditMode ? 'pointer' : 'default' }"
        />
      </svg>

      <!-- 路徑名稱 Tooltip -->
      <div
        v-if="isPathEditMode && pathTooltip.show"
        :style="{
          position: 'absolute',
          left: pathTooltip.x + 'px',
          top: pathTooltip.y + 'px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          transform: 'translate(-50%, -100%)',
          marginTop: '-8px',
        }"
      >
        {{ pathTooltip.text }}
      </div>

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
          <div class="timer-countdown" :style="getCountdownStyle()">
            {{ countdown }}
          </div>
        </div>
      </div>

      <!-- 停止線 -->
      <!-- 中央參考矩形 - 用於統一計算停止線位置 -->
      <div
        class="stop-line central-reference"
        :style="{
          width: stopLineConfig.centralReference.width + 'px',
          height: stopLineConfig.centralReference.height + 'px',
          border: stopLineConfig.centralReference.borderStyle,
          opacity: stopLineConfig.centralReference.opacity,
        }"
      ></div>
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

      <!-- Photoshop 風格左側工具欄 -->
      <div class="photoshop-toolbar">
        <button
          @click="togglePathVisibility"
          :class="['toolbar-btn', { active: isPathVisible }]"
          :title="isPathVisible ? '隱藏路徑' : '顯示路徑'"
        >
          <span class="btn-icon">{{ isPathVisible ? '👁️' : '👁️‍🗨️' }}</span>
        </button>

        <button
          @click="togglePathEditMode"
          :class="['toolbar-btn', { active: isPathEditMode }]"
          :title="isPathEditMode ? '停用編輯' : '編輯路徑'"
        >
          <span class="btn-icon">{{ isPathEditMode ? '🔒' : '✏️' }}</span>
        </button>

        <button @click="exportPathData" class="toolbar-btn" title="導出路徑">
          <span class="btn-icon">📋</span>
        </button>

        <!-- 分隔線 -->
        <div class="toolbar-divider"></div>

        <button @click="toggleWeatherMenu" :class="['toolbar-btn', { active: showWeatherMenu }]" title="天氣效果">
          <span class="btn-icon">{{ getWeatherIcon() }}</span>
        </button>

        <!-- 分隔線 -->
        <div class="toolbar-divider"></div>

        <button @click="clearAllVehicles" class="toolbar-btn clear-btn" title="清空車輛">
          <span class="btn-icon">🧹</span>
        </button>
      </div>

      <!-- 天氣選單 -->
      <transition name="weather-menu">
        <div v-if="showWeatherMenu" class="weather-menu">
          <div class="weather-menu-header">天氣效果</div>
          <div class="weather-options">
            <button
              v-for="weather in weatherOptions"
              :key="weather.type"
              @click="changeWeather(weather.type)"
              :class="['weather-option', { active: currentWeather === weather.type }]"
            >
              <span class="weather-icon">{{ weather.icon }}</span>
              <span class="weather-label">{{ weather.label }}</span>
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- 💡 十字路口下方 - 可愛的互動區域 -->
    <div
      class="crossroad-below-area"
      @mouseenter="showLumoTooltip('crossroadBelow')"
      @mouseleave="hideLumoTooltip"
    ></div>

    <!-- Lumo 小機器人助手 -->
    <div class="robot-assistant">
      <LumoAssistant ref="lumoRef" />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { MotionPathHelper } from 'gsap/MotionPathHelper'
import TrafficLightController from '../classes/TrafficLightController.js'
import AutoTrafficGenerator from '../classes/AutoTrafficGenerator.js'
import TrafficDataCollector from '../classes/TrafficDataCollector.js'
import Vehicle from '../classes/Vehicle.js'
import LumoAssistant from '../components/LumoAssistant.vue'
import { createLanePathCalculator } from '../utils/lanePathCalculator.js'
import { stopLineConfig, lightColorConfig } from '../classes/config/trafficConfig.js'
import WeatherController from '../classes/WeatherController.js'
import { WEATHER_TYPES } from '../classes/config/weatherConfig.js'

// 註冊 GSAP MotionPathPlugin 和 MotionPathHelper
gsap.registerPlugin(MotionPathPlugin, MotionPathHelper)

// 使用 Quasar
const $q = useQuasar()

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

// 智能車道選擇函數：選擇車輛密度最低的車道
const selectOptimalLane = (direction) => {
  // 🎯 修正：自動生成器避免使用車道1（左轉專用車道）
  // 只從車道2,3,4中選擇，車道1保留給專門的左轉車輛生成
  const laneCounts = [2, 3, 4].map((laneNum) => {
    // 計算該車道最近生成的車輛數量
    const recentVehiclesInLane = activeCars.value.filter((car) => {
      if (car.direction !== direction || car.laneNumber !== laneNum) return false

      // 檢查車輛是否在起始區域（剛生成不久）
      const carPos = car.getCurrentPosition()
      const isInStartArea = isCarInStartArea(carPos, direction)

      return isInStartArea
    }).length

    return { laneNumber: laneNum, count: recentVehiclesInLane }
  })

  // 找出車輛數量最少的車道
  const minCount = Math.min(...laneCounts.map((lane) => lane.count))
  const availableLanes = laneCounts.filter((lane) => lane.count === minCount)

  // 如果有多個車道車輛數量相同，隨機選擇一個
  const selectedLane = availableLanes[Math.floor(Math.random() * availableLanes.length)]

  return selectedLane.laneNumber
}

// 檢查車輛是否在起始區域的輔助函數
const isCarInStartArea = (carPos, direction) => {
  const startAreaThreshold = 300 // 起始區域範圍

  switch (direction) {
    case 'east':
      return carPos.x < startAreaThreshold
    case 'west':
      return carPos.x > 1400 - startAreaThreshold // SVG 寬度 1400
    case 'north':
      return carPos.y > 1000 - startAreaThreshold // SVG 高度 1000
    case 'south':
      return carPos.y < startAreaThreshold
    default:
      return false
  }
}

// 自動產生車輛的事件處理函數
const handleAutoGenerate = (event) => {
  const { direction, vehicleType, initialProgress } = event.detail

  const laneNumber = selectOptimalLane(direction)

  // 使用路徑起始位置生成車輛
  const pathStartPosition = Vehicle.getPathStartPosition(direction, laneNumber)

  if (!pathStartPosition) {
    return
  }

  // 創建車輛，傳入 initialProgress
  createVehicleWithPosition(
    pathStartPosition.x,
    pathStartPosition.y,
    direction,
    vehicleType,
    laneNumber,
    initialProgress,
  )
}

// 🎯 處理自動左轉車輛生成事件
const handleAutoGenerateLeftTurn = (event) => {
  const { direction, type } = event.detail

  // 強制使用車道1（左轉專用車道）
  const laneNumber = 1
  const pathStartPosition = Vehicle.getPathStartPosition(direction, laneNumber)

  if (!pathStartPosition) {
    return
  }

  // 創建左轉車輛
  createVehicleWithPosition(pathStartPosition.x, pathStartPosition.y, direction, type, laneNumber)
}

// 通用車輛創建函數
const createVehicleWithPosition = (x, y, direction, vehicleType, laneNumber, initialProgress = 0) => {
  // 使用指定位置創建車輛
  const vehicle = new Vehicle(x, y, direction, vehicleType, laneNumber, trafficController)

  // 🚨 設置初始 progress（如果提供的話）
  if (typeof initialProgress === 'number' && initialProgress !== 0) {
    vehicle.progress = initialProgress
    console.log(`🚗 [${vehicle.id}] 設置初始 progress: ${initialProgress.toFixed(3)}`)
  }

  // 將車輛添加到車輛容器中，而不是直接添加到 crossroadContainer
  vehicle.addTo(vehicleContainer.value || crossroadContainer.value)
  activeCars.value.push(vehicle)

  // 🚨 將車輛添加到 window.liveVehicles（用於自動生成系統計算 progress）
  if (!window.liveVehicles) {
    window.liveVehicles = []
  }
  window.liveVehicles.push(vehicle)

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
      // 確保 SVG 路徑元素已準備好
      const waitForSvgPaths = async () => {
        const maxWait = 3000 // 最多等待3秒
        const startTime = Date.now()
        const pathId = vehicle.getSvgPathId()

        while (Date.now() - startTime < maxWait) {
          const pathElement = document.querySelector(`#${pathId}`)
          if (pathElement && pathElement.getTotalLength && pathElement.getTotalLength() > 0) {
            return true
          }
          await new Promise((resolve) => setTimeout(resolve, 50))
        }

        console.warn(`⚠️ [${vehicle.id}] SVG 路徑元素未準備好，將使用回退方式: ${pathId}`)
        return false
      }

      // 等待 SVG 路徑準備好
      await waitForSvgPaths()

      // 改進 7: 支援循環回收機制 - 當車輛離開邊界時嘗試回收而非移除
      const handleVehicleOutOfBounds = (vehicleId) => {
        const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicleId)
        if (vehicleIndex > -1) {
          const vehicleAtIndex = activeCars.value[vehicleIndex]

          // 嘗試回收車輛
          if (vehicleAtIndex && vehicleAtIndex.recycleVehicle()) {
            // 標記車輛為新回收，需要重新開始動畫（但保留在 activeCars 中）
            vehicleAtIndex.isAnimationStarted = false
          } else {
            // 回收失敗 - 移除車輛
            activeCars.value.splice(vehicleIndex, 1)
            console.log(`🗑️ [${vehicleId}] 回收失敗或已達上限，準備移除`)
          }
        }
      }

      // 使用新的 MotionPath 動畫方法，傳入邊界檢測回調
      await vehicle.moveAlongPath(trafficController, activeCars.value, handleVehicleOutOfBounds)

      // 🚨 動畫完成後立即清理，不等待淡出
      const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)
      if (vehicleIndex > -1) {
        activeCars.value.splice(vehicleIndex, 1)
      }

      // 🚨 同時立即從 window.liveVehicles 中移除（在調用 vehicle.remove() 之前）
      if (window.liveVehicles && window.liveVehicles.length > 0) {
        const liveVehicleIdx = window.liveVehicles.findIndex((v) => v.id === vehicle.id)
        if (liveVehicleIdx !== -1) {
          window.liveVehicles.splice(liveVehicleIdx, 1)
          console.log(`📍 從 liveVehicles 移除: id="${vehicle.id}" (剩餘: ${window.liveVehicles.length})`)
        }
      }

      // 🚨 直接移除車輛，不執行淡出動畫
      // ⚠️ 注意：vehicle.remove() 會自動派發 vehicleRemoved 事件
      setTimeout(() => {
        try {
          // 直接移除 DOM 元素並派發事件
          vehicle.remove()
        } catch (error) {
          console.warn(`⚠️ 車輛直接移除失敗:`, error)
        }
      }, 0)
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
const vehicleContainer = ref(null) // 車輛專用容器
const lumoRef = ref(null) // Lumo 助手組件
const trafficController = new TrafficLightController()
const autoTrafficGenerator = new AutoTrafficGenerator(trafficController)

// 🚨 設置車道級別生成控制，防止碰撞
autoTrafficGenerator.setMinLaneInterval(2000) // 同一車道2秒內不重複生成

const trafficDataCollector = new TrafficDataCollector()
const currentPhase = ref('南北向 綠燈')
const countdown = ref(15)
const activeCars = ref([]) // 維護活躍車輛列表

// 🎨 根據當前燈號狀態計算倒數計時器顏色
const getCountdownStyle = () => {
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
  } else if (phaseText.includes('紅燈') || phaseText.includes('全紅')) {
    return {
      color: lightColorConfig.red,
      textShadow: lightColorConfig.textShadow.red,
    }
  }

  // 預設為綠色（保持原有樣式）
  return {
    color: lightColorConfig.green,
    textShadow: lightColorConfig.textShadow.green,
  }
}

// AI 預測結果
const aiPrediction = ref({
  eastWest: 0,
  northSouth: 0,
})

// MotionPathHelper 控制
const isPathEditMode = ref(false)
const isPathVisible = ref(false) // 路徑預設隱藏，需要按按鈕才顯示
const pathHelpers = ref([])
const pathObservers = ref([]) // 路徑變化觀察器
const tempEditedPaths = ref({}) // 暫存編輯中的路徑數據

// Tooltip 狀態
const pathTooltip = ref({
  show: false,
  text: '',
  x: 0,
  y: 0,
})
// 路徑計算器實例
let lanePathCalculator = null

// ===== 天氣效果相關 =====
let weatherController = null // 天氣控制器實例
const currentWeather = ref(WEATHER_TYPES.CLEAR) // 當前天氣
const showWeatherMenu = ref(false) // 是否顯示天氣選單

// 天氣選項
const weatherOptions = ref([
  { type: WEATHER_TYPES.CLEAR, icon: '☀️', label: '晴天' },
  { type: WEATHER_TYPES.RAIN, icon: '🌧️', label: '雨天' },
  { type: WEATHER_TYPES.HEAVY_RAIN, icon: '⛈️', label: '大雨' },
  { type: WEATHER_TYPES.FOG, icon: '🌫️', label: '起霧' },
  { type: WEATHER_TYPES.SNOW, icon: '❄️', label: '下雪' },
])

// 切換天氣選單
const toggleWeatherMenu = () => {
  showWeatherMenu.value = !showWeatherMenu.value
}

// 獲取當前天氣圖標
const getWeatherIcon = () => {
  const option = weatherOptions.value.find((w) => w.type === currentWeather.value)
  return option ? option.icon : '🌤️'
}

// 切換天氣
const changeWeather = async (weatherType) => {
  if (!weatherController) {
    console.warn('⚠️ 天氣控制器未初始化')
    return
  }

  try {
    await weatherController.changeWeather(weatherType)
    // 從控制器獲取實際的當前天氣（支援切換回晴天的行為）
    currentWeather.value = weatherController.getCurrentWeather()
    showWeatherMenu.value = false

    // 通知用戶
    const option = weatherOptions.value.find((w) => w.type === currentWeather.value)
    $q.notify({
      type: 'info',
      message: `天氣已切換至 ${option ? option.label : currentWeather.value}`,
      icon: option ? option.icon : '🌤️',
      position: 'top',
      timeout: 2000,
    })

    console.log(`🌤️ 天氣已切換至 ${currentWeather.value}`)
  } catch (error) {
    console.error('❌ 切換天氣失敗:', error)
    $q.notify({
      type: 'negative',
      message: '切換天氣失敗',
      position: 'top',
      timeout: 2000,
    })
  }
}

// 啟用/停用路徑編輯模式
const togglePathEditMode = () => {
  isPathEditMode.value = !isPathEditMode.value

  if (isPathEditMode.value) {
    enablePathEditing()
  } else {
    disablePathEditing()
  }
}

// 切換路徑顯示/隱藏
const togglePathVisibility = () => {
  isPathVisible.value = !isPathVisible.value
}

// 清空所有車輛
const clearAllVehicles = () => {
  console.log('🧹 開始清空所有車輛...')

  try {
    // 獲取當前活躍車輛數量
    const vehicleCount = activeCars.value.length
    console.log(`📊 當前活躍車輛數量：${vehicleCount}`)

    if (vehicleCount === 0) {
      console.log('✅ 沒有車輛需要清空')
      $q.notify({
        type: 'info',
        message: '目前沒有車輛',
        position: 'top',
        timeout: 2000,
      })
      return
    }

    // 複製車輛列表，避免在遍歷時修改原數組
    const vehiclesToRemove = [...activeCars.value]

    // 清空車輛列表
    activeCars.value = []

    // 同時清空 window.liveVehicles
    if (window.liveVehicles) {
      console.log(`📍 清空 window.liveVehicles (從 ${window.liveVehicles.length} → 0)`)
      window.liveVehicles = []
    }

    // 逐一移除車輛的 DOM 元素
    vehiclesToRemove.forEach((vehicle) => {
      try {
        if (vehicle && typeof vehicle.remove === 'function') {
          vehicle.remove()
        }
      } catch (error) {
        console.warn(`⚠️ 移除車輛失敗 (${vehicle.id}):`, error)
      }
    })

    console.log('✅ 所有車輛已清空完成')

    // 顯示成功通知
    $q.notify({
      type: 'positive',
      message: `已清空 ${vehicleCount} 輛車輛`,
      position: 'top',
      timeout: 2000,
      icon: '🧹',
    })

    // 發送車輛清空事件
    window.dispatchEvent(
      new CustomEvent('allVehiclesCleared', {
        detail: {
          count: vehicleCount,
          timestamp: new Date().toISOString(),
        },
      }),
    )
  } catch (error) {
    console.error('❌ 清空車輛時發生錯誤:', error)
    $q.notify({
      type: 'negative',
      message: '清空車輛時發生錯誤',
      position: 'top',
      timeout: 3000,
    })
  }
}

// 啟用路徑編輯功能
const enablePathEditing = () => {
  console.log('🎯 啟用路徑編輯模式')
  // 清空暫存的編輯結果
  tempEditedPaths.value = {}

  // 只允許編輯每個方向的車道 1 和車道 4
  const editablePathIds = [
    'eastLane1Straight', // 東向車道1 - 可編輯
    'eastLane4Straight', // 東向車道4 - 可編輯
    'westLane1Straight', // 西向車道1 - 可編輯
    'westLane4Straight', // 西向車道4 - 可編輯
    'southLane1Straight', // 南向車道1 - 可編輯
    'southLane4Straight', // 南向車道4 - 可編輯
    'northLane1Straight', // 北向車道1 - 可編輯
    'northLane4Straight', // 北向車道4 - 可編輯
  ]

  console.log('🔧 開始為可編輯路徑啟用 MotionPathHelper...')

  // 為每個可編輯路徑啟用 MotionPathHelper
  editablePathIds.forEach((pathId) => {
    try {
      const pathElement = document.getElementById(pathId)
      if (!pathElement) {
        console.error(`❌ 找不到路徑元素: ${pathId}`)
        return
      }

      const pathData = pathElement.getAttribute('d')
      console.log(`🔍 路徑 ${pathId} 數據:`, pathData)

      // 檢查路徑格式
      if (!pathData || (!pathData.includes('C') && !pathData.includes('c'))) {
        console.warn(`⚠️ 路徑 ${pathId} 不是貝茲曲線格式，可能影響編輯功能`)
      }

      console.log(`🔧 為路徑 ${pathId} 創建 MotionPathHelper`)

      // 嘗試方法1: 使用 editPath
      try {
        console.log(`🔧 為 ${pathId} 初始化 MotionPathHelper...`)
        const pathEditor = MotionPathHelper.editPath(pathElement, {
          selected: false,
          createPoints: false, // 禁止自動創建錨點
          handleSize: 8,
        })

        if (pathEditor) {
          console.log(`📏 ${pathId} 路徑數據:`, pathElement.getAttribute('d'))
          console.log(`⚙️ ${pathId} MotionPathHelper 配置:`, { selected: false, createPoints: false, handleSize: 8 })

          pathHelpers.value.push(pathEditor)
          console.log(`✅ ${pathId} 路徑編輯器已啟用 (使用 editPath)`)
          return
        }
      } catch (editPathError) {
        console.warn(`⚠️ editPath 方法失敗，嘗試其他方法:`, editPathError.message)
      }

      // 嘗試方法2: 創建一個 tween 然後傳遞給 create
      try {
        // 創建一個隱藏的測試元素
        const testDiv = document.createElement('div')
        testDiv.style.position = 'absolute'
        testDiv.style.left = '-9999px'
        testDiv.style.opacity = '0'
        testDiv.style.pointerEvents = 'none'
        document.body.appendChild(testDiv)

        // 創建 motionPath tween
        const tween = gsap.to(testDiv, {
          duration: 1,
          motionPath: {
            path: pathElement,
            autoRotate: false,
          },
          paused: true,
        })

        // 使用 tween 創建 MotionPathHelper
        const helper = MotionPathHelper.create(tween)

        if (helper) {
          pathHelpers.value.push({ helper, testDiv, tween })
          console.log(`✅ ${pathId} 路徑編輯器已啟用 (使用 create + tween)`)
          return
        }
      } catch (tweenError) {
        console.warn(`⚠️ tween 方法失敗，嘗試最後方法:`, tweenError.message)
      }

      // 嘗試方法3: 直接傳遞元素
      try {
        const helper = MotionPathHelper.create(pathElement)

        if (helper) {
          pathHelpers.value.push(helper)
          console.log(`✅ ${pathId} 路徑編輯器已啟用 (直接傳遞元素)`)
        } else {
          console.error(`❌ ${pathId} 所有方法都失敗了`)
        }
      } catch (elementError) {
        console.error(`❌ 直接傳遞元素方法也失敗:`, elementError.message)
      }
    } catch (error) {
      console.error(`❌ 無法啟用 ${pathId} 路徑編輯器:`, error)
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
    }
  })

  console.log(`🎯 MotionPathHelper 啟用完成，共啟用 ${pathHelpers.value.length} 個路徑編輯器`)

  // 設置路徑變化監聽器
  setupPathChangeListeners(editablePathIds)

  // 添加鍵盤事件監聽器
  // 只在編輯模式下啟用鍵盤事件監聽，但優先級設為低
  if (isPathEditMode.value) {
    // 使用較低的優先級，讓 MotionPathHelper 先處理事件
    document.addEventListener('keydown', handleKeyDown, { capture: false, passive: true })
  }
}

// 設置路徑變化監聽器
const setupPathChangeListeners = (pathIds) => {
  console.log('🔄 設置路徑變化監聽器...')

  pathIds.forEach((pathId) => {
    const pathElement = document.getElementById(pathId)
    if (!pathElement) return

    // 使用 MutationObserver 監聽路徑 'd' 屬性變化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'd') {
          const newPathData = pathElement.getAttribute('d')
          console.log(`🔄 檢測到路徑 ${pathId} 變化:`, newPathData)

          // 暫存編輯結果，不立即保存
          tempEditedPaths.value[pathId] = newPathData
          console.log(`📝 暫存路徑 ${pathId} 編輯結果`)
        }
      })
    })

    observer.observe(pathElement, {
      attributes: true,
      attributeFilter: ['d'],
    })

    // 保存觀察器引用以便後續清理
    pathObservers.value.push(observer)
  })
}

// 鍵盤事件處理
const handleKeyDown = (e) => {
  // 在編輯模式下，完全讓 MotionPathHelper 處理所有鍵盤事件
  if (isPathEditMode.value) {
    // 只記錄日誌，不做任何處理，確保不干擾 MotionPathHelper
    if (e.ctrlKey && e.key === 'z') {
      console.log('↶ Ctrl+Z - 由 MotionPathHelper 處理撤銷')
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      console.log('🗑️ Delete/Backspace - 由 MotionPathHelper 處理刪除')
    }
    // 不阻止事件，不調用 preventDefault 或 stopPropagation
  }
}

// Tooltip 處理函數
const showPathTooltip = (event, text) => {
  if (!isPathEditMode.value) return

  const rect = event.target.closest('svg').getBoundingClientRect()
  pathTooltip.value = {
    show: true,
    text: text,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

const hidePathTooltip = () => {
  pathTooltip.value.show = false
}

const updateTooltipPosition = (event) => {
  if (!pathTooltip.value.show) return

  const rect = event.target.closest('svg').getBoundingClientRect()
  pathTooltip.value.x = event.clientX - rect.left
  pathTooltip.value.y = event.clientY - rect.top
}

// 點擊路徑處理函數
// 停用路徑編輯功能
const disablePathEditing = () => {
  console.log('🔒 停用路徑編輯模式')

  // 清理所有編輯器
  pathHelpers.value.forEach((item) => {
    try {
      if (item && typeof item === 'object') {
        // 處理複合對象 { helper, testDiv, tween }
        if (item.helper && typeof item.helper.kill === 'function') {
          item.helper.kill()
        }
        if (item.tween && typeof item.tween.kill === 'function') {
          item.tween.kill()
        }
        if (item.testDiv && item.testDiv.parentNode) {
          item.testDiv.parentNode.removeChild(item.testDiv)
        }
      } else if (item && typeof item.kill === 'function') {
        // 處理直接的編輯器對象
        item.kill()
      } else if (item && typeof item.destroy === 'function') {
        // 處理可能有 destroy 方法的對象
        item.destroy()
      }
    } catch (cleanupError) {
      console.warn('清理編輯器時出現錯誤:', cleanupError.message)
    }
  })
  pathHelpers.value = []

  // 清理路徑變化觀察器
  pathObservers.value.forEach((observer) => {
    try {
      observer.disconnect()
    } catch (error) {
      console.warn('清理路徑觀察器時出現錯誤:', error.message)
    }
  })
  pathObservers.value = []

  // 移除鍵盤事件監聽器（使用與添加時相同的選項）
  document.removeEventListener('keydown', handleKeyDown, { capture: false })
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

onMounted(async () => {
  // 等待 DOM 完全渲染
  await nextTick()

  // 初始化路徑計算器並設定所有路徑函數
  if (crossroadContainer.value) {
    lanePathCalculator = createLanePathCalculator()

    // 指派所有路徑計算函數
    getEastLane1Path = lanePathCalculator.getEastLane1Path
    getEastLane2Path = lanePathCalculator.getEastLane2Path
    getEastLane3Path = lanePathCalculator.getEastLane3Path
    getEastLane4Path = lanePathCalculator.getEastLane4Path

    getWestLane1Path = lanePathCalculator.getWestLane1Path
    getWestLane2Path = lanePathCalculator.getWestLane2Path
    getWestLane3Path = lanePathCalculator.getWestLane3Path
    getWestLane4Path = lanePathCalculator.getWestLane4Path

    getSouthLane1Path = lanePathCalculator.getSouthLane1Path
    getSouthLane2Path = lanePathCalculator.getSouthLane2Path
    getSouthLane3Path = lanePathCalculator.getSouthLane3Path
    getSouthLane4Path = lanePathCalculator.getSouthLane4Path

    getNorthLane1Path = lanePathCalculator.getNorthLane1Path
    getNorthLane2Path = lanePathCalculator.getNorthLane2Path
    getNorthLane3Path = lanePathCalculator.getNorthLane3Path
    getNorthLane4Path = lanePathCalculator.getNorthLane4Path
  }

  if (crossroadContainer.value) {
    // 確保DOM完全渲染後再開始初始化
    await new Promise((resolve) => {
      // 使用 requestAnimationFrame 確保視覺元素已渲染
      requestAnimationFrame(() => {
        // 再等待一幀確保完全渲染
        requestAnimationFrame(resolve)
      })
    })

    console.log('🎨 等待DOM完全渲染完成')

    // 監聽情境切換事件（由 MainLayout 發出）
    window.addEventListener('scenarioChanged', handleScenarioChange)
    window.addEventListener('generateVehicle', handleAutoGenerate)
    window.addEventListener('generateLeftTurnVehicle', handleAutoGenerateLeftTurn)

    // 監聽視窗大小變化和佈局變化
    const handleLayoutChange = async () => {
      // 等待下一幀以確保DOM更新
      await new Promise((resolve) => requestAnimationFrame(resolve))

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
    await handleLayoutChange()

    console.log('📐 初始佈局計算完成')

    // 監聽視窗大小變化
    window.addEventListener('resize', handleLayoutChange)

    // 使用 MutationObserver 監聽DOM變化（可能由抽屜引起）
    const observer = new MutationObserver(() => {
      // 使用防抖動處理佈局變化
      if (window.layoutChangeTimer) {
        clearTimeout(window.layoutChangeTimer)
      }
      window.layoutChangeTimer = setTimeout(() => {
        handleLayoutChange()
      }, 100)
    })

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
      // 🚨 清除所有車道冷卻狀態
      autoTrafficGenerator.clearLaneCooldown()
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

    // 🎯 設置全域車輛距離配置方法
    window.setVehicleDistance = (multiplier) => {
      Vehicle.setDistanceMultiplier(multiplier)
    }

    // 🎯 新增：南北向專用距離配置
    window.setNorthSouthDistance = (multiplier) => {
      Vehicle.setNorthSouthDistanceMultiplier(multiplier)
    }

    // 🎯 獲取當前車輛距離配置
    window.getVehicleDistanceConfig = () => {
      return Vehicle.getDistanceConfig()
    }

    // 🎯 測試直行優先的左轉燈號流程
    window.testNewTrafficFlow = () => {
      console.log('🔄 測試直行優先的左轉燈號流程...')
      console.log('當前燈號狀態：')
      console.log(`  東燈：${trafficController.lights.east.currentState}`)
      console.log(`  西燈：${trafficController.lights.west.currentState}`)
      console.log(`  南燈：${trafficController.lights.south.currentState}`)
      console.log(`  北燈：${trafficController.lights.north.currentState}`)
      console.log(`  當前相位：${trafficController.currentPhase}`)
    }

    // 🎯 測試左轉車道邏輯
    window.testLeftTurnLanes = () => {
      console.log('🔄 測試左轉車道邏輯...')
      const liveVehicles = window.liveVehicles || []
      const lane1Vehicles = liveVehicles.filter((v) => v.laneNumber === 1)
      const otherLaneVehicles = liveVehicles.filter((v) => v.laneNumber !== 1)

      console.log(`車道1（左轉）車輛數量：${lane1Vehicles.length}`)
      console.log(`其他車道（直行）車輛數量：${otherLaneVehicles.length}`)

      lane1Vehicles.forEach((vehicle) => {
        console.log(
          `  左轉車 ${vehicle.id}: 方向=${vehicle.direction}, 狀態=${vehicle.currentState}, 等待綠燈=${vehicle.waitingForGreen}`,
        )
      })

      otherLaneVehicles.forEach((vehicle) => {
        console.log(
          `  直行車 ${vehicle.id}: 方向=${vehicle.direction}, 車道=${vehicle.laneNumber}, 狀態=${vehicle.currentState}`,
        )
      })
    }

    // 🎯 強制生成左轉車輛測試
    window.generateLeftTurnVehicle = (direction = 'east') => {
      console.log(`🚗 生成 ${direction} 方向左轉車輛 (車道1)`)
      const pathStartPosition = Vehicle.getPathStartPosition(direction, 1)
      if (pathStartPosition) {
        createVehicleWithPosition(pathStartPosition.x, pathStartPosition.y, direction, 'large', 1)
        console.log(`✅ ${direction} 方向左轉車輛已生成`)
      } else {
        console.error(`❌ 無法獲取 ${direction} 方向車道1的路徑起始位置`)
      }
    }

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

    // 等待一個小的延遲，確保 DOM 元素和 SVG 路徑都已經完全初始化
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 啟動自動交通產生器
    autoTrafficGenerator.start()
    console.log('--------------------- 🤖 自動交通產生器已啟動 ---------------------')

    // 再次等待一個小延遲，確保 autoTrafficGenerator 完全初始化
    await new Promise((resolve) => setTimeout(resolve, 500))

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

    // 🌤️ 初始化天氣控制器
    console.log('🌤️ 初始化天氣系統...')
    weatherController = new WeatherController(crossroadContainer.value)
    // 設置全域天氣控制器，讓車輛可以訪問
    window.weatherController = weatherController
    console.log('✅ 天氣系統已初始化')

    console.log('✅ 所有系統已初始化完成')
  }
})

// 💡 獲取 tooltip 訊息的輔助函數 - 支援配置鍵或直接訊息
function getTooltipMessage(messageOrKey) {
  // 如果是字符串且不含空格和特殊字符 (像是一個鍵)，嘗試從配置中獲取
  if (typeof messageOrKey === 'string' && !messageOrKey.includes('：') && window.lumoConfig?.tooltips) {
    const configValue = window.lumoConfig.tooltips[messageOrKey]
    if (configValue) {
      console.log(`💬 [Tooltip] 使用配置: ${messageOrKey} => ${configValue.substring(0, 30)}...`)
      return configValue
    }
  }

  // 否則直接返回訊息
  console.log(`💬 [Tooltip] 使用直接訊息: ${String(messageOrKey).substring(0, 30)}...`)
  return messageOrKey
}

// 💡 顯示 Lumo Tooltip 的函數
function showLumoTooltip(messageOrKey) {
  const message = getTooltipMessage(messageOrKey)

  if (!message) {
    console.warn('⚠️ [Tooltip] 訊息為空，跳過顯示')
    return
  }

  console.log('🎯 showLumoTooltip called with message:', message)
  console.log('🔍 window.lumoTooltipManager:', window.lumoTooltipManager)
  console.log('🔍 isTooltipEnabled:', window.lumoTooltipManager?.isTooltipEnabled)

  if (window.lumoTooltipManager) {
    window.lumoTooltipManager.show(message)
  } else {
    console.warn('⚠️ lumoTooltipManager 未初始化')
  }
}

// 💡 隱藏 Lumo Tooltip 的函數
function hideLumoTooltip() {
  if (window.lumoTooltipManager) {
    window.lumoTooltipManager.hide?.()
  }
}

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
  window.removeEventListener('generateLeftTurnVehicle', handleAutoGenerateLeftTurn)

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

  // 🌤️ 清理天氣控制器
  if (weatherController) {
    console.log('🌤️ 清理天氣系統...')
    weatherController.destroy()
    weatherController = null
    window.weatherController = null
  }

  // 確保鍵盤事件監聽器被移除（使用與添加時相同的選項）
  document.removeEventListener('keydown', handleKeyDown, { capture: false })

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
}

/* 十字路口車輛遮罩層 - 用於隱藏超出十字路口範圍的車輛 */
.crossroad-mask {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  /* 遮罩層必須與 crossroad-area 保持相同尺寸，確保座標系統一致 */
  width: 100%;
  height: 100%;
  z-index: 5; /* 在 SVG 路徑之上，但在其他 UI 元素之下 */
  pointer-events: none; /* 不攔截點擊事件 */
  /* 開發時可以加上邊框來調整大小 */
  /* border: 2px dashed rgba(255, 255, 255, 0.1); */
  /* overflow: hidden; */
}

/* 車輛容器 - 所有車輛都添加到這個容器中 */
.vehicle-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 車輛本身可以有自己的 pointer-events */
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
.traffic-light.bottom-left img {
  transform: scale(1.2) rotate(0deg) translateX(5px);
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
.traffic-light.top-right img {
  transform: scale(1.2) rotate(180deg) translateX(5px);
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

.traffic-light.top-left img {
  transform: scale(1.2) rotate(180deg) translateX(5px);
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
.traffic-light.bottom-right img {
  transform: scale(1.2) translateX(5px);
}

/* 小機器人助手 ------------------------------------------------- */
.robot-assistant {
  position: absolute;
  left: 30px;
  bottom: 25px;
  width: 300px;
  height: 300px;
  cursor: pointer;
  transition: transform 0.3s ease;
  /* background: rgba(255, 255, 255, 0.1); */
  z-index: 10;
}

.robot-assistant img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timer-phase {
  font-size: 1.3rem;
  font-weight: bold;
  color: rgb(200, 220, 255);
  white-space: pre-line; /* 支援換行顯示 */
  line-height: 1.4; /* 調整行高 */
}

.timer-countdown {
  font-size: 2.5rem;
  font-weight: bold;
  /* 顏色現在由 getCountdownStyle() 動態設定，移除硬編碼 */
  /* color: #00ff88; */
  /* text-shadow: 0 0 10px rgba(0, 255, 136, 0.5); */
  transition: all 0.3s ease; /* 添加顏色變化過渡效果 */
}

.timer-unit {
  font-size: 1rem;
  color: rgb(180, 200, 255);
}

/* 中央參考矩形 - 十字路口中央的隱藏矩形，用於統一計算停止線位置 */
.central-reference {
  position: absolute;
  z-index: 100;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: none;
  pointer-events: none;
  /* 寬高現在由 stopLineConfig 動態設定 */
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

/* Photoshop 風格左側工具欄 ---------------------------------------- */
.photoshop-toolbar {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 0;
  /* 與其他介面元素保持一致的漸變背景 */
  background: linear-gradient(135deg, rgba(35, 80, 150, 0.95), rgba(35, 30, 100, 0.95));
  border: 2px solid rgb(63, 117, 205);
  border-left: none;
  border-radius: 0 12px 12px 0;
  box-shadow:
    0 0 20px rgba(30, 30, 100, 0.8),
    4px 0 15px rgba(63, 117, 205, 0.3);
  backdrop-filter: blur(10px);
  padding: 10px 0;
}

.toolbar-btn {
  width: 56px;
  height: 56px;
  border: none;
  background: transparent;
  color: rgba(200, 220, 255, 0.9);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0;
  margin: 2px 0;
}

.toolbar-btn .btn-icon {
  font-size: 26px;
  line-height: 1;
  filter: drop-shadow(0 0 3px rgba(0, 255, 136, 0.3));
  transition: all 0.3s ease;
}

/* Hover 效果 */
.toolbar-btn:hover {
  background: rgba(63, 117, 205, 0.4);
  transform: translateX(2px);
}

.toolbar-btn:hover .btn-icon {
  filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.6));
  transform: scale(1.2);
}

/* Tooltip 效果 */
.toolbar-btn::after {
  content: attr(title);
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 12px;
  padding: 8px 14px;
  /* 與其他介面保持一致的樣式 */
  background: linear-gradient(135deg, rgba(35, 80, 150, 0.95), rgba(35, 30, 100, 0.95));
  border: 2px solid rgb(63, 117, 205);
  border-radius: 8px;
  color: rgb(200, 220, 255);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 10000;
  box-shadow: 0 0 15px rgba(30, 30, 100, 0.8);
  backdrop-filter: blur(10px);
}

.toolbar-btn:hover::after {
  opacity: 1;
}

/* Active 狀態 */
.toolbar-btn.active {
  background: rgba(63, 117, 205, 0.5);
  border-left: 4px solid #00ff88;
  box-shadow: inset 0 0 10px rgba(0, 255, 136, 0.3);
}

.toolbar-btn.active .btn-icon {
  filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.8));
  color: #00ff88;
  transform: scale(1.1);
}

/* 清空車輛按鈕特殊樣式 */
.toolbar-btn.clear-btn:hover {
  background: rgba(220, 53, 69, 0.4);
  border-left: 3px solid rgba(255, 100, 100, 0.8);
}

.toolbar-btn.clear-btn:hover .btn-icon {
  filter: drop-shadow(0 0 8px rgba(255, 100, 100, 0.8));
  color: rgba(255, 150, 150, 1);
}

/* 分隔線 */
.toolbar-divider {
  height: 2px;
  background: linear-gradient(to right, rgba(63, 117, 205, 0), rgba(63, 117, 205, 0.6), rgba(63, 117, 205, 0));
  margin: 8px 10px;
  box-shadow: 0 0 5px rgba(63, 117, 205, 0.4);
}

/* ===== 天氣選單樣式 ===== */
.weather-menu {
  position: fixed;
  left: 70px;
  top: 39%;
  width: 200px;
  background: rgba(20, 30, 48, 0.95);
  border: 1px solid rgba(63, 117, 205, 0.5);
  border-radius: 8px;
  padding: 10px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.5),
    0 0 10px rgba(63, 117, 205, 0.3);
  backdrop-filter: blur(10px);
  z-index: 1001;
}

.weather-menu-header {
  color: #00ff88;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 10px;
  text-align: center;
  text-shadow: 0 0 5px rgba(0, 255, 136, 0.5);
}

.weather-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.weather-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(30, 50, 80, 0.6);
  border: 1px solid rgba(63, 117, 205, 0.3);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
}

.weather-option:hover {
  background: rgba(63, 117, 205, 0.4);
  border-color: rgba(63, 117, 205, 0.6);
  transform: translateX(3px);
  box-shadow: 0 0 8px rgba(63, 117, 205, 0.5);
}

.weather-option.active {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
}

.weather-option .weather-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.weather-option .weather-label {
  flex: 1;
}

/* 天氣選單動畫 */
.weather-menu-enter-active,
.weather-menu-leave-active {
  transition: all 0.3s ease;
}

.weather-menu-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.weather-menu-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* ===== 天氣效果層樣式 ===== */
.weather-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

/* 🤔 十字路口下方互動區域 ===== */
.crossroad-below-area {
  position: absolute;
  /* 位置在十字路口 (450x450) 下方，寬度相同 */
  width: 100%;
  height: 200px;
  bottom: 0%;
  left: 50%;
  transform: translateX(-50%);

  /* 互動效果 */
  cursor: auto;
  transition: all 0.3s ease;
}
</style>
