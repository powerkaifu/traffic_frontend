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
          width: 225 + 'px',
          height: 225 + 'px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          opacity: 1,
        }"
      ></div>

      <!-- AI 交通預測面板 -->
      <div class="ai-prediction-panel">
        <div class="prediction-header">模型預測秒數</div>
        <div class="prediction-content">
          <div class="prediction-item">
            <span class="direction-label">東西向綠燈：</span>
            <span ref="ewLightRef" class="timing-value">{{ aiPrediction.eastWest }}</span>
            <span class="unit">秒</span>
          </div>
          <div class="prediction-item">
            <span class="direction-label">南北向綠燈：</span>
            <span ref="snLightRef" class="timing-value">{{ aiPrediction.northSouth }}</span>
            <span class="unit">秒</span>
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

        <button @click="clearAllVehicles" class="toolbar-btn clear-btn" title="清空車輛">
          <span class="btn-icon">🧹</span>
        </button>

        <div class="toolbar-divider"></div>

        <button @click="toggleWeatherMenu" :class="['toolbar-btn', { active: showWeatherMenu }]" title="天氣效果">
          <span class="btn-icon">{{ getWeatherIcon() }}</span>
        </button>

        <div class="toolbar-divider"></div>

        <!-- 🚨 緊急車輛按鈕 -->
        <button @click="spawnEmergencyVehicle('ambulance')" class="toolbar-btn emergency-btn" title="呼叫救護車">
          <span class="btn-icon">🚑</span>
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

    <!-- Lumo 小機器人助手 -->
    <div class="robot-assistant">
      <LumoAssistant ref="lumoRef" />
    </div>

    <!-- 🚨 緊急模式覆蓋層 -->
    <EmergencyOverlay ref="emergencyOverlayRef" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useQuasar } from 'quasar'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { MotionPathHelper } from 'gsap/MotionPathHelper'
import Vehicle from '../classes/Vehicle.js'
import { logger } from '../utils/logger.js' // 統一日誌工具
import LumoAssistant from '../components/LumoAssistant.vue'
import EmergencyOverlay from '../components/EmergencyOverlay.vue'
import WeatherController from '../classes/WeatherController.js'
// import { AmbulanceClearanceController } from '../classes/AmbulanceClearanceController.js' // 【已停用】改用被動感應模式
import { WEATHER_TYPES } from '../classes/config/weatherConfig.js'
import { GENERATION_CONFIG } from '../classes/config/vehicleConfig.js'
import { SPAWN_CONTROL } from '../classes/config/ambulanceConfig.js' // 🚑 救護車生成控制
import { useSimulationStore } from '../stores/simulationStore.js'
import { numberAnimator } from '../classes/NumberAnimator.js'
import { useLanePaths } from '../composables/useLanePaths.js'
import { useVehicleManager } from '../composables/useVehicleManager.js'
import { useTrafficLightSystem } from '../composables/useTrafficLightSystem.js'
import { destroyVehicleEventBroadcaster } from '../composables/useVehicleEventBroadcaster.js'

// 註冊 GSAP MotionPathPlugin 和 MotionPathHelper
gsap.registerPlugin(MotionPathPlugin, MotionPathHelper)

// 使用 Quasar
const $q = useQuasar()

// 🎯 初始化 Pinia Store
const store = useSimulationStore()

// 提升 handleScenarioChange 作用域，讓 onUnmounted 可移除
const handleScenarioChange = (event) => {
  const generator = store.getAutoTrafficGenerator()
  if (generator && event.detail && event.detail.config) {
    const config = event.detail.config
    // 如果只有 interval 欄位，補上 isManualMode: true
    const isManual = Object.keys(config).length === 1 && Object.prototype.hasOwnProperty.call(config, 'interval')
    if (isManual) {
      generator.updateConfig({ ...config, isManualMode: true })
    } else {
      generator.updateConfig(config)
    }
  }
}

// 智能車道選擇函數：選擇車輛密度最低的車道
const selectOptimalLane = (direction) => {
  // 🎯 修正：自動生成器避免使用車道1（左轉專用車道）
  // 只從車道2,3,4中選擇，車道1保留給專門的左轉車輛生成

  // ✅ 【新增】硬性限制：每車道最多 MAX_VEHICLES_PER_LANE 輛車
  // 🎯 固定設置為 6 輛/車道
  const MAX_VEHICLES_PER_LANE = GENERATION_CONFIG.MAX_VEHICLES_PER_LANE || 6

  const liveVehicles = store.getLiveVehicles()
  const laneCounts = [2, 3, 4].map((laneNum) => {
    // 🔧 改進：計算該車道的**全部車輛**數量，而不只是起始區域的車輛
    const totalVehiclesInLane = liveVehicles.filter((car) => {
      return car.direction === direction && car.laneNumber === laneNum
    }).length

    return { laneNumber: laneNum, count: totalVehiclesInLane }
  })

  // 找出車輛數量最少且未超過限制的車道
  const availableLanes = laneCounts.filter((lane) => lane.count < MAX_VEHICLES_PER_LANE)

  // 如果沒有可用車道，記錄警告並返回 null
  if (availableLanes.length === 0) {
    const laneStatus = laneCounts.map((lane) => `車道${lane.laneNumber}: ${lane.count}輛`).join(', ')
    console.warn(
      `⚠️ [車道限制] ${direction}方向所有車道已滿 (${laneStatus})，已達到每車道 ${MAX_VEHICLES_PER_LANE} 輛的上限，暫停生成新車輛`,
    )
    return null
  }

  // 在可用車道中找出車輛數量最少的
  const minCount = Math.min(...availableLanes.map((lane) => lane.count))
  const optimalLanes = availableLanes.filter((lane) => lane.count === minCount)

  // 如果有多個車道車輛數量相同，隨機選擇一個
  const selectedLane = optimalLanes[Math.floor(Math.random() * optimalLanes.length)]

  return selectedLane.laneNumber
}

// 檢查車輛是否在起始區域的輔助函數
// 自動產生車輛的事件處理函數（新版本 - 直接接收 detail 物件）
const handleAutoGenerateFromStore = (detail) => {
  const { direction, vehicleType, initialProgress, speed } = detail

  const laneNumber = selectOptimalLane(direction)

  if (laneNumber === null) {
    return
  }

  const pathStartPosition = Vehicle.getPathStartPosition(direction, laneNumber)

  if (!pathStartPosition) {
    return
  }

  createVehicleWithPosition(
    pathStartPosition.x,
    pathStartPosition.y,
    direction,
    vehicleType,
    laneNumber,
    initialProgress,
    speed,
  )
}

// ⚠️ 【已棄用】原始的事件處理函數（用於 window 事件監聽）- 已移除 DOM 事件監聽
// 🎯 處理自動左轉車輛生成事件（新版本 - 直接接收 detail 物件）
const handleAutoGenerateLeftTurnFromStore = (detail) => {
  const { direction, type, speed } = detail

  const MAX_VEHICLES_PER_LANE = GENERATION_CONFIG.MAX_VEHICLES_PER_LANE || 6
  const laneNumber = 1

  const lane1VehicleCount = activeCars.value.filter((car) => {
    return car.direction === direction && car.laneNumber === laneNumber
  }).length

  if (lane1VehicleCount >= MAX_VEHICLES_PER_LANE) {
    return
  }

  const pathStartPosition = Vehicle.getPathStartPosition(direction, laneNumber)

  if (pathStartPosition) {
    createVehicleWithPosition(pathStartPosition.x, pathStartPosition.y, direction, type, laneNumber, 0, speed)
  }
}

// ⚠️ 【已棄用】原始的左轉事件處理函數（用於 window 事件監聽）- 已移除 DOM 事件監聽
// handleAutoGenerateLeftTurn 已不使用，保留此註解用於參考歷史
// 所有左轉派車邏輯現在通過 handleAutoGenerateLeftTurnFromStore 和 Store 訂閱完成

// 通用車輛創建函數 - 現在使用 composable
const createVehicleWithPosition = (x, y, direction, vehicleType, laneNumber, initialProgress = 0, speed = null) => {
  const vehicle = createVehicleWithPositionComposable(
    x,
    y,
    direction,
    vehicleType,
    laneNumber,
    initialProgress,
    speed,
    autoTrafficGenerator,
  )

  if (!vehicle) return null

  // ✅ 派發事件（通過 Store）
  store.emit('vehicleAdded', {
    direction,
    type: vehicleType,
    vehicleId: vehicle.id,
    speed: vehicle.currentSpeed || 0,
    timestamp: new Date().toISOString(),
  })

  return vehicle
}

const crossroadContainer = ref(null)
const vehicleContainer = ref(null) // 車輛專用容器
const lumoRef = ref(null) // Lumo 助手組件
const emergencyOverlayRef = ref(null) // 緊急模式覆蓋層

// ✅ 使用 useTrafficLightSystem composable 管理交通燈邏輯
const {
  currentPhase,
  countdown,
  trafficController,
  autoTrafficGenerator,
  adaptiveFlowController,
  trafficDataCollector,
  getCountdownStyle,
} = useTrafficLightSystem(store)

// ✅ 使用 useVehicleManager composable 管理車輛邏輯
const {
  activeCars,
  initVehiclePool,
  createVehicleWithPosition: createVehicleWithPositionComposable,
  removeVehicleFromSimulation: removeVehicleFromSimulationComposable,
  handleVehicleOutOfBounds: handleVehicleOutOfBoundsComposable,
  disposeVehiclePool,
} = useVehicleManager(store, vehicleContainer, crossroadContainer)
// AI 預測結果
const aiPrediction = ref({
  eastWest: 0,
  northSouth: 0,
})

// ✨ 綠燈秒數動畫用的 ref
const ewLightRef = ref(null)
const snLightRef = ref(null)

// ✅ 使用 useLanePaths composable 管理路徑邏輯
const {
  isPathVisible,
  isPathEditMode,
  pathTooltip,
  pathFunctions,
  initPathCalculator,
  togglePathVisibility: togglePathVisibilityComposable,
  enablePathEditing: enablePathEditingComposable,
  disablePathEditing: disablePathEditingComposable,
  showPathTooltip,
  hidePathTooltip,
  updateTooltipPosition,
} = useLanePaths()

// ===== 天氣效果相關 =====
let weatherController = null // 天氣控制器實例
// 🚑 【已停用】救護車路權清除控制器（改用被動感應模式）
// let ambulanceClearanceController = null
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
    enablePathEditingComposable()
  } else {
    disablePathEditingComposable()
  }
}

// 切換路徑顯示/隱藏
const togglePathVisibility = () => {
  togglePathVisibilityComposable()
}

// 清空所有車輛
const clearAllVehicles = () => {
  console.log('🧹 開始清空所有車輛...')

  try {
    // 獲取當前活躍車輛數量
    const liveVehicles = store.getLiveVehicles()
    const vehicleCount = liveVehicles.length
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
    const vehiclesToRemove = [...liveVehicles]

    // 清空 activeCars.value 列表
    activeCars.value = []

    // 同時清空 Store 中的車輛列表
    store.clearAllVehicles()

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

    // 發送車輛清空事件（通過 Store）
    store.emit('allVehiclesCleared', {
      count: vehicleCount,
      timestamp: new Date().toISOString(),
    })
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

// 🚨 生成緊急車輛
// 🔒 防連點：記錄上次生成時間和當前救護車數量
let lastAmbulanceSpawnTime = 0
let activeAmbulanceCount = 0

const spawnEmergencyVehicle = (type = 'ambulance') => {
  console.log(`🚨 呼叫緊急車輛: ${type}`)

  // 🚫 防連點檢查 1：冷卻時間
  const now = Date.now()
  const { COOLDOWN_SECONDS, MAX_ACTIVE_AMBULANCES, SHOW_COOLDOWN_TOAST } = SPAWN_CONTROL
  const COOLDOWN_TIME = COOLDOWN_SECONDS * 1000 // 轉換為毫秒

  if (now - lastAmbulanceSpawnTime < COOLDOWN_TIME) {
    const remainingTime = Math.ceil((COOLDOWN_TIME - (now - lastAmbulanceSpawnTime)) / 1000)
    if (SHOW_COOLDOWN_TOAST) {
      $q.notify({
        type: 'warning',
        message: `請稍候 ${remainingTime} 秒後再呼叫救護車`,
        position: 'top',
        timeout: 2000,
      })
    }
    console.log(`⏰ 救護車冷卻中，還需等待 ${remainingTime} 秒`)
    return
  }

  // 🚫 防連點檢查 2：數量限制
  // 計算當前活躍的救護車數量
  activeAmbulanceCount = store.getLiveVehicles().filter((v) => v.vehicleType === 'ambulance').length

  if (activeAmbulanceCount >= MAX_ACTIVE_AMBULANCES) {
    if (SHOW_COOLDOWN_TOAST) {
      $q.notify({
        type: 'warning',
        message: `同時救護車數量已達上限 (${MAX_ACTIVE_AMBULANCES} 輛)`,
        position: 'top',
        timeout: 2000,
      })
    }
    console.log(`🚫 救護車數量已達上限：${activeAmbulanceCount}/${MAX_ACTIVE_AMBULANCES}`)
    return
  }

  // ✅ 通過檢查，更新時間戳
  lastAmbulanceSpawnTime = now

  // 0. 優先定義方向變量（避免 Lumo 提示時未定義）
  const directions = ['east', 'west', 'south', 'north']
  const randomDirection = directions[Math.floor(Math.random() * directions.length)]
  const laneNumber = Math.floor(Math.random() * 4) + 1 // 隨機選擇車道 1~4

  // 方向中文映射
  const directionChinese = {
    east: '東向',
    west: '西向',
    south: '南向',
    north: '北向',
  }

  // 1. 啟動視覺特效
  if (emergencyOverlayRef.value) {
    emergencyOverlayRef.value.start()

    // 10秒後自動停止特效 (模擬車輛通過)
    setTimeout(() => {
      if (emergencyOverlayRef.value) emergencyOverlayRef.value.stop()
    }, 10000)
  }

  // 2. Lumo 語音提示（強制顯示在對話框）
  if (lumoRef.value) {
    // 使用 Lumo 的 showEmergency 方法強制顯示緊急訊息
    if (window.lumoTooltipManager && window.lumoTooltipManager.showEmergency) {
      const message = `🚑 緊急通知！往${directionChinese[randomDirection]}即將有救護車通過，請注意避讓！`
      window.lumoTooltipManager.showEmergency(message)
    }
  }

  // 3. Quasar 通知已移除（只保留 Lumo 對話框）

  // 4. 生成車輛
  const pathStartPosition = Vehicle.getPathStartPosition(randomDirection, laneNumber)

  if (pathStartPosition) {
    createVehicleWithPosition(
      pathStartPosition.x,
      pathStartPosition.y,
      randomDirection,
      type,
      laneNumber,
      0,
      null, // 🚨 修復：移除硬編碼速度，使用配置的 15-20 km/h
    )
  }
}

// 🚑 處理自動生成的救護車（帶指定方向和車道）
const spawnEmergencyVehicleWithDirection = (type = 'ambulance', direction = null, lane = null) => {
  console.log(`🚨 自動生成緊急車輛: ${type}, 方向: ${direction}`)

  // 使用傳入的方向和車道，或隨機選擇
  const directions = ['east', 'west', 'south', 'north']
  const randomDirection = direction || directions[Math.floor(Math.random() * directions.length)]
  const laneNumber = lane || Math.floor(Math.random() * 4) + 1

  // 方向中文映射
  const directionChinese = {
    east: '東向',
    west: '西向',
    south: '南向',
    north: '北向',
  }

  // 1. 啟動視覺特效
  if (emergencyOverlayRef.value) {
    emergencyOverlayRef.value.start()
    setTimeout(() => {
      if (emergencyOverlayRef.value) emergencyOverlayRef.value.stop()
    }, 10000)
  }

  // 2. Lumo 語音提示（強制顯示在對話框）
  if (lumoRef.value) {
    if (window.lumoTooltipManager && window.lumoTooltipManager.showEmergency) {
      const message = `🚑 緊急通知！往${directionChinese[randomDirection]}即將有救護車通過，請注意避讓！`
      window.lumoTooltipManager.showEmergency(message)
    }
  }

  // 3. Quasar 通知已移除（只保留 Lumo 對話框）

  // 4. 生成車輛
  const pathStartPosition = Vehicle.getPathStartPosition(randomDirection, laneNumber)
  if (pathStartPosition) {
    // 🚨 修復：移除硬編碼的 80 速度，改為 null，讓 Vehicle 類別使用配置的隨機速度 (15-20 km/h)
    createVehicleWithPosition(pathStartPosition.x, pathStartPosition.y, randomDirection, type, laneNumber, 0, null)
  }
}

// 路徑計算函數現在由 useLanePaths composable 提供
// 為了向後兼容，創建引用
const getEastLane1Path = () => pathFunctions.value.getEastLane1Path()
const getEastLane2Path = () => pathFunctions.value.getEastLane2Path()
const getEastLane3Path = () => pathFunctions.value.getEastLane3Path()
const getEastLane4Path = () => pathFunctions.value.getEastLane4Path()

const getWestLane1Path = () => pathFunctions.value.getWestLane1Path()
const getWestLane2Path = () => pathFunctions.value.getWestLane2Path()
const getWestLane3Path = () => pathFunctions.value.getWestLane3Path()
const getWestLane4Path = () => pathFunctions.value.getWestLane4Path()

const getSouthLane1Path = () => pathFunctions.value.getSouthLane1Path()
const getSouthLane2Path = () => pathFunctions.value.getSouthLane2Path()
const getSouthLane3Path = () => pathFunctions.value.getSouthLane3Path()
const getSouthLane4Path = () => pathFunctions.value.getSouthLane4Path()

const getNorthLane1Path = () => pathFunctions.value.getNorthLane1Path()
const getNorthLane2Path = () => pathFunctions.value.getNorthLane2Path()
const getNorthLane3Path = () => pathFunctions.value.getNorthLane3Path()
const getNorthLane4Path = () => pathFunctions.value.getNorthLane4Path()

// ═══════════════════════════════════════════════════════════════════════
// ✅ 【修復】事件處理器定義 - 移到頂層以便 onUnmounted 時清理
// ═══════════════════════════════════════════════════════════════════════

// 🎯 佈局變化處理器
const handleLayoutChange = async () => {
  // 等待下一幀以確保DOM更新
  await new Promise((resolve) => requestAnimationFrame(resolve))

  if (!crossroadContainer.value || !trafficController) return

  // 1. 重新計算車道位置
  trafficController.updateLanePositions(crossroadContainer.value)

  // 3. 通知所有活躍車輛佈局發生了變化
  activeCars.value.forEach((car) => {
    if (car.checkLayoutChange) {
      car.checkLayoutChange()
    }
  })
}

// 🎯 AI 預測更新處理器
const handleUnifiedPrediction = (event) => {
  const prediction = event.detail.prediction
  console.log(`  預測物件:`, prediction)
  console.log(`  東西向: ${prediction.east_west_seconds}秒`)
  console.log(`  南北向: ${prediction.south_north_seconds}秒`)

  aiPrediction.value = {
    eastWest: prediction.east_west_seconds || 0,
    northSouth: prediction.south_north_seconds || 0,
    timestamp: new Date().toLocaleTimeString(),
  }

  console.log(`✅ [IndexPage 已更新] aiPrediction.value:`, aiPrediction.value)
}

// 🎯 診斷快捷鍵處理器 (Ctrl+Shift+M)
const diagnosticKeydownHandler = (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyM') {
    e.preventDefault()
    window.diagnostics?.showMemoryDiagnostics()
  }
}

// 🎯 性能監控快捷鍵處理器 (Ctrl+Shift+P)
const handlePerformanceKeydown = (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
    e.preventDefault()
    if (window.performanceMonitor?.isMonitoring) {
      window.performanceMonitor.stop()
    } else {
      window.performanceMonitor?.start()
    }
  }
}

// 🎯 統計摘要快捷鍵處理器 (Ctrl+Shift+S)
const handleStatsKeydown = (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
    e.preventDefault()
    const stats = window.performanceMonitor?.getStats()
    logger.log('📊 性能統計摘要:', stats)
  }
}

// ═══════════════════════════════════════════════════════════════════════

onMounted(async () => {
  logger.log('═══════════════════════════════════════════════════════════')
  logger.log('🚀 [IndexPage] onMounted 開始')
  logger.log('═══════════════════════════════════════════════════════════')

  // ✅ HMR 檢測：確定是否在 HMR 恢復中
  const isHMRRecovery =
    typeof window !== 'undefined' && (window.lastCountdown !== undefined || window.lastPhase !== undefined)
  if (isHMRRecovery) {
    logger.log('🔄 [IndexPage] 偵測到 HMR 恢復，將強制重新初始化...')
  }

  // ✅ 確保全局車輛列表初始化（供 AutoTrafficGenerator 使用）
  if (!window.liveVehicles) {
    window.liveVehicles = []
    logger.log('✅ [IndexPage] 全局車輛列表已初始化')
  }

  // ✅ 確保側邊欄在任何情況下都顯示
  if (typeof window !== 'undefined') {
    window.drawerState = true
    logger.log('✅ [IndexPage] 強制設置 window.drawerState = true')
  }

  // 等待 DOM 完全渲染
  await nextTick()
  console.log('✅ [IndexPage] DOM 已準備好')

  // 初始化路徑計算器（現在使用 composable）
  if (crossroadContainer.value) {
    initPathCalculator()

    // 🚀 初始化物件池（使用 composable）
    initVehiclePool()
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

    // 📡 訂閱 Store 事件（替代 window.addEventListener）
    const unsubscribeScenarioChanged = store.subscribe('scenarioChanged', handleScenarioChange)
    const unsubscribeGenerateVehicle = store.subscribe('generateVehicle', handleAutoGenerateFromStore)
    const unsubscribeGenerateLeftTurnVehicle = store.subscribe(
      'generateLeftTurnVehicle',
      handleAutoGenerateLeftTurnFromStore,
    )

    // 保存取消訂閱函數，用於 onUnmounted 時清理
    window.storeUnsubscribers = {
      scenarioChanged: unsubscribeScenarioChanged,
      generateVehicle: unsubscribeGenerateVehicle,
      generateLeftTurnVehicle: unsubscribeGenerateLeftTurnVehicle,
    }

    // ⚠️ 【修復】移除 DOM 事件監聽器（已遷移到 Store 訂閱）
    // handleLayoutChange 現在定義在頂層

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

    // 保存 observer 引用以便在 onUnmounted 清理
    window.bodyMutationObserver = observer
    // 初始化交通燈控制系統
    const eastLight = crossroadContainer.value.querySelector('.traffic-light.bottom-left')
    const westLight = crossroadContainer.value.querySelector('.traffic-light.top-right')
    const southLight = crossroadContainer.value.querySelector('.traffic-light.top-left')
    const northLight = crossroadContainer.value.querySelector('.traffic-light.bottom-right')

    trafficController.init(eastLight, westLight, southLight, northLight)

    // ✅ 設置交通控制器到 Store
    store.setTrafficController(trafficController)

    // ✅ 向後相容：暴露到 window
    window.trafficController = trafficController

    // 🎯 設置全域車輛距離配置方法
    window.setVehicleDistance = (multiplier) => {
      store.setVehicleDistance(multiplier)
    }

    // 🎯 新增：南北向專用距離配置
    window.setNorthSouthDistance = (multiplier) => {
      store.setNorthSouthDistance(multiplier)
    }

    // 🎯 獲取當前車輛距離配置
    window.getVehicleDistanceConfig = () => {
      return store.getVehicleDistanceConfig()
    }

    // 🎯 測試左轉車道邏輯
    window.testLeftTurnLanes = () => {
      console.log('🔄 測試左轉車道邏輯...')
      const liveVehicles = store.getLiveVehicles()
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
        // 燈色改變時，同時設置 phase 和初始 countdown 值
        currentPhase.value = phase
        countdown.value = seconds // ✅ 設置初始值
      } else {
        // Worker 的 tick 消息（phase === null）
        // 只在秒數真正變化時更新 countdown
        countdown.value = seconds
      }
    })

    // ✅ 【統一數據線】監聽統一的預測事件（新方式 - 優先使用）
    // handleUnifiedPrediction 現在定義在頂層
    window.addEventListener('trafficPredictionReady', handleUnifiedPrediction)

    // 【舊方式 - 向後兼容】設置AI預測更新回調
    trafficController.setPredictionUpdateCallback((prediction) => {
      // 仍然更新，但會被統一事件覆蓋
      aiPrediction.value = prediction
    })

    // ✅ 強制啟動交通燈（如果已運行會自動忽略，但如果停止了會重新啟動）
    if (!trafficController.isRunning) {
      console.log('🚀 啟動交通燈控制系統')
      trafficController.start()
    } else {
      console.log('✅ 交通燈已在運行，重新設置回調')
    }

    // ✅ 【調試】暴露 IndexPage 狀態到 window
    console.log('💡 在控制台執行: window.debugIndexPageState() 查看當前顯示的秒數')

    // 初始化自動交通產生器
    console.log('🚦 初始化自動交通產生器...')

    // 等待一個小的延遲，確保 DOM 元素和 SVG 路徑都已經完全初始化
    await new Promise((resolve) => setTimeout(resolve, 500))

    // ✅ 設置自動交通生成器到 Store
    store.setAutoTrafficGenerator(autoTrafficGenerator)

    // ✅ 向後相容：暴露到 window（供舊代碼使用）
    window.autoTrafficGenerator = autoTrafficGenerator

    // ✅ 強制啟動車流生成器（如果已停止會重新啟動）
    if (!autoTrafficGenerator.isRunning) {
      console.log('🚀 啟動自動交通產生器')
      autoTrafficGenerator.start()
      console.log('--------------------- 🤖 自動交通產生器已啟動 ---------------------')
    } else {
      console.log('✅ 自動交通產生器已在運行')
    }

    // 再次等待一個小延遲，確保 autoTrafficGenerator 完全初始化
    await new Promise((resolve) => setTimeout(resolve, 500))

    // ✅ 設置自適應流量控制器到 Store
    store.setAdaptiveFlowController(adaptiveFlowController)

    // ✅ 啟動自適應流量控制器
    console.log('🚀 啟動自適應流量控制器')
    adaptiveFlowController.start()
    console.log('--------------------- 📊 自適應流量控制器已啟動 ---------------------')

    // 初始啟動動態清理循環
    // ✨ 改進：現在由 RAF 主循環統一驅動清理邏輯，無需獨立 setInterval

    // 在組件卸載時清理定時器 - 保存到 window 供卸載時使用（保留以防舊代碼引用）
    window.cleanupVehicleInterval = null
    window.getCleanupInterval = () => null

    // 初始化並啟動交通數據收集器
    console.log('📊 啟動交通數據收集器...')
    trafficDataCollector.start()

    // ✅ 設置交通數據收集器到 Store
    store.setTrafficDataCollector(trafficDataCollector)

    // 🌤️ 初始化天氣控制器
    console.log('🌤️ 初始化天氣系統...')
    weatherController = new WeatherController(crossroadContainer.value)
    // ✅ 設置天氣控制器到 Store
    store.setWeatherController(weatherController)
    console.log('✅ 天氣系統已初始化')

    // 🚑 【已停用】救護車路權清除系統（改用被動感應模式）
    // 新架構：每輛車自己偵測救護車距離並調整速度（Vehicle.updateEmergencyProximity）
    // ambulanceClearanceController = new AmbulanceClearanceController(trafficController, store)
    console.log('✅ 救護車被動感應系統已啟用（由 Vehicle.updateEmergencyProximity 處理）')

    // 🚑 監聽救護車隨機生成事件
    if (store) {
      store.subscribe('spawnEmergencyVehicle', (detail) => {
        const { type, direction, laneNumber } = detail
        console.log(`🚑 [IndexPage] 收到救護車生成事件: ${direction} 方向`)
        spawnEmergencyVehicleWithDirection(type, direction, laneNumber)
      })
    }

    console.log('✅ 所有系統已初始化完成')

    // ✨ 為綠燈秒數添加動畫監聽
    watch(
      () => aiPrediction.value.eastWest,
      (newVal) => {
        if (ewLightRef.value) {
          numberAnimator.animateCounter(ewLightRef.value, newVal, {
            decimals: 0,
            suffix: '',
          })
        }
      },
    )

    watch(
      () => aiPrediction.value.northSouth,
      (newVal) => {
        if (snLightRef.value) {
          numberAnimator.animateCounter(snLightRef.value, newVal, {
            decimals: 0,
            suffix: '',
          })
        }
      },
    )
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ [IndexPage] onMounted 完成')
  console.log('═══════════════════════════════════════════════════════════')

  // 🚨 【新增】內存診斷工具 - 按 Ctrl+Shift+M 查看
  window.diagnostics = {
    showMemoryDiagnostics() {
      try {
        const liveVehicles = store.getLiveVehicles()
        // 🚀 優化：使用 globalTimeline 獲取動畫數量，避免 getTweensOf() 的潛在問題
        // getTweensOf() 如果沒有參數會報錯或行為不一致
        const gsapTweensCount = gsap.globalTimeline ? gsap.globalTimeline.getChildren(true, true, true).length : 0

        const diagnostics = {
          '📊 活躍車輛數': liveVehicles.length,
          '🎬 GSAP 動畫堆': gsapTweensCount,
          '🚨 洩漏指標':
            gsapTweensCount > liveVehicles.length * 3 // 每個車輛可能有 2-3 個動畫 (move, fade, scale)
              ? `⚠️ 異常高 (${gsapTweensCount - liveVehicles.length * 3} 多餘)`
              : '✅ 正常',
          '💾 預估內存': `~${Math.round(liveVehicles.length * 0.4)} MB`,
          '⏰ 時間戳': new Date().toLocaleTimeString(),
        }

        console.group('🔧 內存診斷面板')
        Object.entries(diagnostics).forEach(([key, value]) => {
          console.log(`${key}: ${value}`)
        })
        console.groupEnd()

        return diagnostics
      } catch (e) {
        console.error('❌ 診斷異常:', e.message)
        return null
      }
    },
  }

  // 🚨 【新增】快捷鍵：Ctrl+Shift+M 查看內存診斷
  // diagnosticKeydownHandler 現在定義在頂層
  window.addEventListener('keydown', diagnosticKeydownHandler)

  // 🚨 【新增】實時性能監測工具 - 按 Ctrl+Shift+P 查看
  window.performanceMonitor = {
    isMonitoring: false,
    monitorInterval: null,

    // 🚀 新增：FPS 追蹤
    frameCount: 0,
    lastFpsUpdate: 0,
    currentFps: 0,
    fpsHistory: [], // 最近 60 個 FPS 樣本

    // 🚀 新增：記憶體追蹤
    memoryHistory: [], // 最近 60 個記憶體樣本

    // 🚀 新增：FPS 更新方法（在 RAF 循環中調用）
    updateFPS(currentTime) {
      this.frameCount++
      if (currentTime - this.lastFpsUpdate >= 1000) {
        this.currentFps = this.frameCount
        this.fpsHistory.push(this.currentFps)
        if (this.fpsHistory.length > 60) this.fpsHistory.shift()

        this.frameCount = 0
        this.lastFpsUpdate = currentTime
      }
    },

    // 🚀 新增：記憶體快照
    getMemorySnapshot() {
      if (!performance.memory) return null

      return {
        used: performance.memory.usedJSHeapSize / 1048576, // MB
        total: performance.memory.totalJSHeapSize / 1048576,
        limit: performance.memory.jsHeapSizeLimit / 1048576,
        timestamp: Date.now(),
      }
    },

    // 🚀 新增：統計彙總
    getStats() {
      const avgFps =
        this.fpsHistory.length > 0 ? Math.round(this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length) : 0

      const minFps = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0

      return {
        fps: {
          current: this.currentFps,
          average: avgFps,
          min: minFps,
        },
        memory: this.getMemorySnapshot(),
        vehicles: window.liveVehicles?.length || 0,
      }
    },

    start() {
      if (this.isMonitoring) return

      this.isMonitoring = true
      this.frameCount = 0
      this.lastFpsUpdate = performance.now()
      this.fpsHistory = []
      this.memoryHistory = []

      logger.log('📊 性能監控已啟動')

      this.monitorInterval = setInterval(() => {
        const vehicleCount = window.liveVehicles?.length || 0
        const memory = this.getMemorySnapshot()

        if (memory) {
          this.memoryHistory.push(memory)
          if (this.memoryHistory.length > 60) this.memoryHistory.shift()

          logger.perf(
            'Monitor',
            `FPS: ${this.currentFps} | 車輛: ${vehicleCount} | 記憶體: ${memory.used.toFixed(1)}MB / ${memory.total.toFixed(1)}MB`,
          )
        } else {
          logger.perf('Monitor', `FPS: ${this.currentFps} | 車輛: ${vehicleCount} | 記憶體: 不可用`)
        }
      }, 1000)
    },

    stop() {
      if (!this.isMonitoring) return

      this.isMonitoring = false

      if (this.monitorInterval) {
        clearInterval(this.monitorInterval)
        this.monitorInterval = null
      }

      logger.log('📊 性能監控已停止')
    },
  }

  // 🚨 【新增】快捷鍵：Ctrl+Shift+P 開始/停止性能監測
  // handlePerformanceKeydown 現在定義在頂層
  window.addEventListener('keydown', handlePerformanceKeydown)

  // 🚀 【新增】快捷鍵：Ctrl+Shift+S 顯示統計摘要
  // handleStatsKeydown 現在定義在頂層
  window.addEventListener('keydown', handleStatsKeydown)

  // ═══════════════════════════════════════════════════════════════════════
  // 【Step 3】✨ 統一的 RAF 主循環 - 驅動所有模擬邏輯 ✨
  // ═══════════════════════════════════════════════════════════════════════

  let lastFrameTime = 0
  let rafId = null

  // 🎯 新增：用於合併 setInterval 的累積計時器 (單位: ms)
  let periodicCheckAccumulator = 0 // 用於 Vehicle.js 的 50ms 檢查 (directTrafficLightResponse 等)
  let stuckCheckAccumulator = 0 // 用於 Vehicle.js 的 5000ms 卡車檢查
  let cleanupAccumulator = 0 // 用於 IndexPage.vue 的動態清理 (1000-3000ms)
  let autoModeUpdateAccumulator = 0 // ✅ 【新增】用於自動模式的時間更新
  let vehicleLogicUpdateAccumulator = 0 // 🚨 【P2 修復】用於 Vehicle.updateLogic 的 100ms 檢查（10fps 決策邏輯）

  // 🔍 診斷用：追蹤 DOM 節點和池的狀態
  let diagnosticAccumulator = 0
  const DIAGNOSTIC_INTERVAL = 1000 // 每秒報告一次
  const AUTO_MODE_UPDATE_INTERVAL = 500 // ✅ 【新增】每 500ms 檢查一次自動模式
  const VEHICLE_LOGIC_UPDATE_INTERVAL = 100 // 🚨 【P2 修復】每 100ms 執行一次決策邏輯（10fps）

  function mainSimulationLoop(currentTime) {
    try {
      // 🚀 【新增】更新 FPS 計數器（如果性能監控啟用）
      if (window.performanceMonitor?.isMonitoring) {
        window.performanceMonitor.updateFPS(currentTime)
      }

      // 計算 Delta Time（毫秒）
      const deltaTimeMs = currentTime - lastFrameTime
      lastFrameTime = currentTime

      // ✅ 限制 deltaTime（防止瀏覽器標籤頁切換導致的巨大時間跳躍）
      const clampedDeltaTime = Math.min(deltaTimeMs, 100)

      // 🌤️ 【新增】檢查天氣過度狀態
      const isWeatherTransitioning = window.isWeatherTransitioning || false

      // ═══════════════════════════════════════════════════════════════════════
      // 1. 🎯 驅動車輛生成引擎 (AutoTrafficGenerator)
      // ═══════════════════════════════════════════════════════════════════════
      if (window.autoTrafficGenerator && typeof window.autoTrafficGenerator.update === 'function') {
        window.autoTrafficGenerator.update(clampedDeltaTime)
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 1.5. ✅ 【新增】更新自動模式狀態（每 500ms 檢查一次時間變化）
      // ═══════════════════════════════════════════════════════════════════════
      autoModeUpdateAccumulator += clampedDeltaTime
      if (autoModeUpdateAccumulator >= AUTO_MODE_UPDATE_INTERVAL) {
        autoModeUpdateAccumulator = 0
        if (window.autoTrafficGenerator && typeof window.autoTrafficGenerator.updateAutoMode === 'function') {
          window.autoTrafficGenerator.updateAutoMode()
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 2. 🎯 累加所有定期檢查的計時器
      // ═══════════════════════════════════════════════════════════════════════
      periodicCheckAccumulator += clampedDeltaTime
      stuckCheckAccumulator += clampedDeltaTime
      cleanupAccumulator += clampedDeltaTime
      diagnosticAccumulator += clampedDeltaTime
      vehicleLogicUpdateAccumulator += clampedDeltaTime // 🚨 【P2 修復】累加決策邏輯計時器

      // 🔍 每秒進行一次診斷
      if (diagnosticAccumulator >= DIAGNOSTIC_INTERVAL) {
        diagnosticAccumulator = 0
        // ...existing code...
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 3. 🎯 執行所有 Vehicle 的定期邏輯 (原來由 Vehicle.js 的 setInterval 驅動)
      // ═══════════════════════════════════════════════════════════════════════
      // 🌤️ 【優化】天氣過度時，跳過計算密集的操作，只做基本位置更新
      const runPeriodicCheck = !isWeatherTransitioning && periodicCheckAccumulator >= 50 // 每 50ms 執行一次
      const runStuckCheck = !isWeatherTransitioning && stuckCheckAccumulator >= 5000 // 每 5 秒執行一次

      // 🚀 【優化】快取車輛陣列並提前返回空陣列
      const vehicles = window.liveVehicles
      if (!vehicles || vehicles.length === 0) {
        // 沒有車輛，跳過所有車輛相關邏輯
        rafId = requestAnimationFrame(mainSimulationLoop)
        return
      }

      if (runPeriodicCheck || runStuckCheck) {
        const vehicleCount = vehicles.length
        for (let i = 0; i < vehicleCount; i++) {
          const vehicle = vehicles[i]
          if (!vehicle) continue
          // 碰撞檢測邏輯已完全遷移至 Vehicle.updateLogic
          // 由 CollisionFollowingController.execute() 在 updateLogic 中執行

          // 執行 50ms 的流量燈響應檢查 (directTrafficLightResponse, resumeMovement)
          if (runPeriodicCheck && vehicle.directTrafficLightResponse) {
            try {
              vehicle.directTrafficLightResponse(window.trafficController)
            } catch (e) {
              console.error('❌ [RAF] Vehicle periodic check error:', e)
            }
          }

          if (vehicle.resumeMovement && typeof vehicle.resumeMovement === 'function') {
            try {
              vehicle.resumeMovement(window.liveVehicles)
            } catch (e) {
              console.error('⚠️ [RAF] Resume movement error:', e)
            }
          }

          // 執行 5 秒的檢查 (checkAndResolveStuckState)
          if (runStuckCheck && vehicle.checkAndResolveStuckState) {
            try {
              vehicle.checkAndResolveStuckState()
            } catch (e) {
              console.error('❌ [RAF] Vehicle stuck check error:', e)
            }
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 4. 🎯 執行 IndexPage 的動態車輛清理 (原來由 startDynamicCleanupCycle 中的 setInterval 驅動)
      // ═══════════════════════════════════════════════════════════════════════
      // 根據車輛數量動態調整清理頻率
      let cleanupFrequency = 3000 // 預設 3 秒
      if (activeCars.value) {
        const maxLiveVehicles = autoTrafficGenerator.config.maxLiveVehicles || 100
        const currentVehicleCount = activeCars.value.length

        if (currentVehicleCount > maxLiveVehicles * 0.8) {
          cleanupFrequency = 1000 // 高負載（>80 輛）：1 秒
        } else if (currentVehicleCount > maxLiveVehicles * 0.5) {
          cleanupFrequency = 2000 // 中等負載（50-80 輛）：2 秒
        }
      }

      // 檢查是否達到清理時間
      if (cleanupAccumulator >= cleanupFrequency) {
        try {
          const initialCount = activeCars.value?.length || 0
          const maxLiveVehicles = autoTrafficGenerator.config.maxLiveVehicles || 100

          // ✅ Phase 5：【優化】集中清理已完成的車輛（isCompleted = true）
          // 🚨【POOL LEAK FIX】確保所有異常移除的車輛都放回物件池
          if (activeCars.value) {
            const vehiclesToCleanup = activeCars.value.filter((vehicle) => vehicle.isCompleted)

            for (const vehicle of vehiclesToCleanup) {
              try {
                // 確保先調用 remove() 標記完成（如果還沒標記）
                if (!vehicle.isRemoved && vehicle.remove && typeof vehicle.remove === 'function') {
                  vehicle.remove()
                }

                // 🚨【CRITICAL】將異常移除的車輛放回物件池，防止洩漏
                if (handleVehicleOutOfBoundsComposable) {
                  handleVehicleOutOfBoundsComposable(vehicle)
                }

                // ✅ 同步從其他追蹤列表中移除
                if (removeVehicleFromSimulationComposable) {
                  removeVehicleFromSimulationComposable(vehicle.id)
                }

                logger.debug('Cleanup', `[${vehicle.id}] 已清理並放回物件池`)
              } catch (e) {
                logger.warn(`⚠️ [${vehicle.id}] 清理提交異常: ${e.message}`)
              }
            }

            // 移除已清理的車輛
            activeCars.value = activeCars.value.filter((vehicle) => !vehicle.isCompleted)
          }

          // 清理孤立車輛和已完成的車輛
          if (activeCars.value) {
            activeCars.value = activeCars.value.filter((vehicle) => {
              // 檢查車輛是否還在DOM中
              if (!vehicle.element || !vehicle.element.parentNode) {
                logger.debug('Cleanup', `清理孤立車輛: ${vehicle.id}`)

                // 🚨【POOL LEAK FIX】孤立車輛也要放回物件池
                if (handleVehicleOutOfBoundsComposable) {
                  handleVehicleOutOfBoundsComposable(vehicle)
                } else {
                  // 備用清理
                  if (vehicle.performCleanup && typeof vehicle.performCleanup === 'function') {
                    vehicle.performCleanup().catch((e) => {
                      logger.warn(`⚠️ [${vehicle.id}] 孤立車輛清理異常: ${e.message}`)
                    })
                  }
                }

                // ✅ 同步移除追蹤
                if (removeVehicleFromSimulationComposable) {
                  removeVehicleFromSimulationComposable(vehicle.id)
                }
                return false
              }

              // 檢查車輛存在時間，避免剛創建的車輛被誤清理
              const vehicleAge = Date.now() - new Date(vehicle.createdAt).getTime()
              const isNewVehicle = vehicleAge < 5000

              if (vehicle.justCreated || isNewVehicle) {
                return true
              }

              // 如果車輛狀態是 completed 或 nearComplete，清理
              if (vehicle.currentState === 'completed' || vehicle.currentState === 'nearComplete') {
                // 🚨【POOL LEAK FIX】確保通過物件池回收
                if (handleVehicleOutOfBoundsComposable) {
                  handleVehicleOutOfBoundsComposable(vehicle)
                }
                // ✅ 同步移除追蹤
                if (removeVehicleFromSimulationComposable) {
                  removeVehicleFromSimulationComposable(vehicle.id)
                }
                return false
              }

              return true
            })
          } // 超限清理：只清理已完成的車輛
          if (activeCars.value && activeCars.value.length > maxLiveVehicles) {
            const excessCount = activeCars.value.length - maxLiveVehicles
            console.warn(`🚨 [車輛超限] 超過限制 ${excessCount} 輛，準備清理已完成的車輛...`)

            let removedCount = 0
            const vehiclesToRemove = []

            for (let i = activeCars.value.length - 1; i >= 0 && removedCount < excessCount; i--) {
              const vehicle = activeCars.value[i]
              if (vehicle.currentState === 'completed' || vehicle.currentState === 'nearComplete') {
                vehiclesToRemove.push(i)
                removedCount++
              }
            }

            vehiclesToRemove.sort((a, b) => b - a)
            vehiclesToRemove.forEach((idx) => {
              const vehicleToRemove = activeCars.value[idx]
              if (vehicleToRemove) {
                // ✅【改進】使用物件池回收，而不是直接移除
                // 🚨【關鍵】不呼叫 vehicle.remove()，因為我們要保留 DOM 元素並重複使用
                if (handleVehicleOutOfBoundsComposable) {
                  handleVehicleOutOfBoundsComposable(vehicleToRemove)
                } else if (vehicleToRemove.remove && typeof vehicleToRemove.remove === 'function') {
                  vehicleToRemove.remove()
                }
                // ✅ 同步清理其他列表
                if (removeVehicleFromSimulationComposable) {
                  removeVehicleFromSimulationComposable(vehicleToRemove.id)
                }
                console.log(`🗑️ 清理已完成車輛: ${vehicleToRemove.id}`)
              }
              activeCars.value.splice(idx, 1)
            })

            if (removedCount < excessCount) {
              console.warn(`⚠️ [車輛超限] 只清理了 ${removedCount} 輛，仍超限 ${excessCount - removedCount} 輛`)
            }
          }

          // 定期日誌
          if (activeCars.value && (initialCount !== activeCars.value.length || initialCount > 80)) {
            const maxLiveVehicles = autoTrafficGenerator.config.maxLiveVehicles || 100
            console.log(
              `📊 [清理統計] 當前: ${activeCars.value.length} 輛 (限制: ${maxLiveVehicles}), ` +
                `liveVehicles: ${window.liveVehicles?.length || 0}, ` +
                `清理頻率: ${cleanupFrequency}ms`,
            )
          }

          cleanupAccumulator = 0
        } catch (e) {
          console.error('❌ [RAF] Cleanup error:', e)
          cleanupAccumulator = 0
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 4.5 🚨 【P2 修復】執行低頻決策邏輯 (每 100ms 執行一次 = 10fps)
      // ═══════════════════════════════════════════════════════════════════════
      // 原因：checkStopLineAndRespond 不需要每幀執行，降頻到 100ms 即可
      // 效果：減少 85% 的決策調用（從 6000/秒 → 1000/秒）
      // 🌤️ 【優化】天氣過度時，暫停決策邏輯以降低 CPU 負載
      // ═══════════════════════════════════════════════════════════════════════
      const runVehicleLogicUpdate =
        !isWeatherTransitioning && vehicleLogicUpdateAccumulator >= VEHICLE_LOGIC_UPDATE_INTERVAL

      if (window.liveVehicles && runVehicleLogicUpdate && window.trafficController) {
        const trafficController = window.trafficController
        const allVehicles = window.liveVehicles

        // 🚨 【新增】預先篩選救護車，避免在每個車輛中重複篩選 (O(N) vs O(N^2))
        const ambulances = allVehicles.filter((v) => v.vehicleType === 'ambulance')

        // 遍歷所有活動車輛，執行低頻決策邏輯
        for (const vehicle of allVehicles) {
          try {
            // 調用 Vehicle.updateLogic()：包含停止線檢查和紅綠燈控制
            if (vehicle && typeof vehicle.updateLogic === 'function') {
              vehicle.updateLogic(trafficController, allVehicles)

              // 🚨 【新增】檢查與救護車的距離並調整速度（摩西分海效應 - 局部版）
              vehicle.updateEmergencyProximity(ambulances)
            }
          } catch (e) {
            console.warn(`⚠️ Vehicle logic update error for ${vehicle.id}:`, e)
          }
        }

        vehicleLogicUpdateAccumulator = 0
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 5. 🎯 重置檢查計時器
      // ═══════════════════════════════════════════════════════════════════════
      if (runPeriodicCheck) periodicCheckAccumulator = 0
      if (runStuckCheck) stuckCheckAccumulator = 0

      // ℹ️ 性能監測：可選的 FPS 顯示
      if (window.performanceMonitor?.isMonitoring) {
        window.performanceMonitor.deltaTime = clampedDeltaTime
        window.performanceMonitor.fps = Math.round(1000 / clampedDeltaTime)
      }

      // ℹ️ 性能監測：可選的 FPS 顯示
      if (window.performanceMonitor?.isMonitoring) {
        window.performanceMonitor.deltaTime = clampedDeltaTime
        window.performanceMonitor.fps = Math.round(1000 / clampedDeltaTime)
      }

      // 🚑 【已停用】救護車路權清除系統執行
      // 新架構：由 Vehicle.updateEmergencyProximity() 處理（已在上方步驟4執行）
      // if (ambulanceClearanceController) {
      //   ambulanceClearanceController.execute(window.liveVehicles || [])
      // }

      // 請求下一幀
      rafId = requestAnimationFrame(mainSimulationLoop)
    } catch (error) {
      console.error('❌ [RAF 主循環] 出現異常:', error)
      // 即使出現異常也繼續運行
      rafId = requestAnimationFrame(mainSimulationLoop)
    }
  }

  // 🚀 啟動統一的 RAF 主循環
  console.log('🚀 [RAF 主循環] 已啟動 - 驅動所有模擬邏輯 (生成 + Vehicle 檢查 + 清理)')
  rafId = requestAnimationFrame(mainSimulationLoop)

  // 記錄 RAF ID 以便後續清理
  window.mainSimulationRAFId = rafId
})

// 💡 獲取 tooltip 訊息的輔助函數 - 支援配置鍵或直接訊息
// 組件卸載時清理資源
onUnmounted(() => {
  // 🧪 HMR 保護：保存關鍵狀態到全局
  console.log('💾 [IndexPage] 保存狀態以便 HMR 恢復...')
  if (typeof window !== 'undefined') {
    window.lastCountdown = countdown.value
    window.lastPhase = currentPhase.value
    window.lastActiveCarCount = activeCars.value.length
  }

  // 清理 MotionPathHelper
  disablePathEditingComposable()

  // ✅ 取消訂閱 Store 事件
  if (window.storeUnsubscribers) {
    if (window.storeUnsubscribers.scenarioChanged) window.storeUnsubscribers.scenarioChanged()
    if (window.storeUnsubscribers.generateVehicle) window.storeUnsubscribers.generateVehicle()
    if (window.storeUnsubscribers.generateLeftTurnVehicle) window.storeUnsubscribers.generateLeftTurnVehicle()
    delete window.storeUnsubscribers
  }

  // 停止並完全清理交通數據收集器
  if (trafficDataCollector) {
    console.log('📊 停止交通數據收集器...')
    trafficDataCollector.stop()
  }

  // ✅ 停止所有生成器和控制器，清理回調
  if (autoTrafficGenerator && autoTrafficGenerator.isRunning) {
    console.log('🛑 停止 autoTrafficGenerator')
    autoTrafficGenerator.stop()
  }

  if (adaptiveFlowController && adaptiveFlowController.isRunning) {
    console.log('🛑 停止 adaptiveFlowController')
    adaptiveFlowController.stop()
  }

  if (trafficController && trafficController.isRunning) {
    console.log('🛑 停止 trafficController')
    trafficController.stop()
  }

  // ⚠️ 【修復】移除所有 DOM 事件監聽器（防止記憶體洩漏）
  console.log('🛑 開始清理事件監聽器...')

  // 移除 resize 監聽器
  window.removeEventListener('resize', handleLayoutChange)

  // 移除 trafficPredictionReady 監聽器
  window.removeEventListener('trafficPredictionReady', handleUnifiedPrediction)

  // 移除所有 keydown 監聽器
  window.removeEventListener('keydown', diagnosticKeydownHandler)
  window.removeEventListener('keydown', handlePerformanceKeydown)
  window.removeEventListener('keydown', handleStatsKeydown)

  // 停止 MutationObserver
  if (window.bodyMutationObserver) {
    window.bodyMutationObserver.disconnect()
    delete window.bodyMutationObserver
    console.log('🛑 [MutationObserver] 已停止')
  }

  console.log('✅ 所有事件監聽器已清理')

  // 清理車輛清理定時器
  // 清理動態清理間隔
  if (window.cleanupVehicleInterval) {
    clearInterval(window.cleanupVehicleInterval)
    window.cleanupVehicleInterval = null
  }
  if (window.getCleanupInterval) {
    delete window.getCleanupInterval
  }
  if (window.setCleanupInterval) {
    delete window.setCleanupInterval
  }

  // 清理所有活躍車輛
  activeCars.value.forEach((vehicle) => {
    if (vehicle && vehicle.remove) {
      vehicle.remove()
    }
  })
  activeCars.value = []

  // 🚀 清理物件池（使用 composable）
  disposeVehiclePool()

  // 🌤️ 完全清理天氣控制器
  if (weatherController.value) {
    console.log('🌤️ 清理天氣系統...')
    weatherController.value.destroy()
  }

  // 🚑 清理救護車路權清除系統
  // 🚑 【已停用】救護車路權清除系統清理
  // if (ambulanceClearanceController) {
  //   logger.log('🛑 停止救護車路權清除系統')
  //   ambulanceClearanceController.destroy()
  //   ambulanceClearanceController = null
  // }

  // ═══════════════════════════════════════════════════════════════════════
  // 【Step 3 清理】✨ 停止 RAF 主循環 ✨
  // ═══════════════════════════════════════════════════════════════════════
  if (typeof window !== 'undefined' && window.mainSimulationRAFId !== undefined) {
    cancelAnimationFrame(window.mainSimulationRAFId)
    window.mainSimulationRAFId = null
    console.log('🛑 [RAF 主循環] 已停止')
  }

  // ✅ 完全重置 Store 狀態
  console.log('🔄 重置 Pinia Store...')
  store.reset()

  // �� 【新增】清理全域事件管理器
  console.log('📡 清理 VehicleEventBroadcaster...')
  destroyVehicleEventBroadcaster()

  // ✨ 停止所有數字動畫
  numberAnimator.stopAll()

  console.log('🧹 IndexPage 資源完全清理完成')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('⏹️  [IndexPage] onUnmounted 完成')
  console.log('═══════════════════════════════════════════════════════════')
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

.road-label,
.timer-display,
.ai-prediction-panel {
  filter: saturate(1.1) contrast(1.1);
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
  padding: 10px 0;
  filter: saturate(1.1) contrast(1.1);
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
  background: linear-gradient(135deg, rgba(60, 120, 200, 0.95), rgba(50, 70, 150, 0.95));
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
</style>
