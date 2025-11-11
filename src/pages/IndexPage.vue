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
      @mouseenter="handleBelowAreaMouseEnter"
      @mouseleave="handleBelowAreaMouseLeave"
    ></div>

    <!-- Lumo 小機器人助手 -->
    <div class="robot-assistant">
      <LumoAssistant ref="lumoRef" />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useQuasar } from 'quasar'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { MotionPathHelper } from 'gsap/MotionPathHelper'
import TrafficLightController from '../classes/TrafficLightController.js'
import AutoTrafficGenerator from '../classes/AutoTrafficGenerator.js'
import AdaptiveFlowController from '../classes/AdaptiveFlowController.js'
import TrafficDataCollector from '../classes/TrafficDataCollector.js'
import Vehicle from '../classes/Vehicle.js'
import VehiclePool from '../classes/VehiclePool.js'
import LumoAssistant from '../components/LumoAssistant.vue'
import { createLanePathCalculator } from '../classes/draw_utils/lanePathCalculator.js'
import { stopLineConfig, lightColorConfig } from '../classes/config/trafficConfig.js'
import WeatherController from '../classes/WeatherController.js'
import { WEATHER_TYPES } from '../classes/config/weatherConfig.js'
import { CollisionController } from '../classes/vehicle_utils/CollisionController.js'
import { GENERATION_CONFIG } from '../classes/config/vehicleConfig.js'
import { useSimulationStore } from '../stores/simulationStore.js'
import { numberAnimator } from '../classes/NumberAnimator.js'

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
  const { direction, vehicleType, initialProgress } = detail

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
  )
}

// ⚠️ 【已棄用】原始的事件處理函數（用於 window 事件監聽）- 已移除 DOM 事件監聽
// handleAutoGenerate 已不使用，保留此註解用於參考歷史
// 所有派車邏輯現在通過 handleAutoGenerateFromStore 和 Store 訂閱完成

// 🎯 處理自動左轉車輛生成事件（新版本 - 直接接收 detail 物件）
const handleAutoGenerateLeftTurnFromStore = (detail) => {
  const { direction, type } = detail

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
    createVehicleWithPosition(pathStartPosition.x, pathStartPosition.y, direction, type, laneNumber)
  }
}

// ⚠️ 【已棄用】原始的左轉事件處理函數（用於 window 事件監聽）- 已移除 DOM 事件監聽
// handleAutoGenerateLeftTurn 已不使用，保留此註解用於參考歷史
// 所有左轉派車邏輯現在通過 handleAutoGenerateLeftTurnFromStore 和 Store 訂閱完成

// 通用車輛創建函數
const createVehicleWithPosition = (x, y, direction, vehicleType, laneNumber, initialProgress = 0) => {
  // ✅ 【新增】檢查是否超過車輛限制
  const maxLiveVehicles = autoTrafficGenerator.config.maxLiveVehicles || 100
  const currentVehicleCount = activeCars.value.length

  if (currentVehicleCount >= maxLiveVehicles) {
    console.warn(`⚠️ [車輛限制] 當前車輛數 (${currentVehicleCount}) 已達上限 (${maxLiveVehicles})，暫停生成新車輛`)
    return null // 返回 null，不生成新車輛
  }

  // 使用指定位置創建車輛
  // 🚀 改進：優先從物件池中獲取，只在池空時才創建新車輛
  let vehicle
  let isFromPool = false
  if (vehiclePool && vehiclePool.poolMap && vehiclePool.poolMap.has(direction)) {
    // ✅ 從池中取車
    vehicle = vehiclePool.acquire(direction, laneNumber, vehicleType, x, y)
    isFromPool = true
  } else if (vehiclePool) {
    // ✅ 池空，創建新車輛並添加到池的管理中
    vehicle = vehiclePool.acquire(direction, laneNumber, vehicleType, x, y)
    isFromPool = true
  } else {
    // 備用：池未初始化時，直接創建新車輛
    vehicle = new Vehicle(x, y, direction, vehicleType, laneNumber, store) // ✅ Phase 6：傳入 store
    isFromPool = false
  }

  // 🚨 設置初始 progress（如果提供的話）
  if (typeof initialProgress === 'number' && initialProgress !== 0) {
    vehicle.progress = initialProgress
    console.log(`🚗 [${vehicle.id}] 設置初始 progress: ${initialProgress.toFixed(3)}`)
  }

  // ✅ 【關鍵】只有新建的車輛才需要 addTo（池中的車輛已在 DOM 中）
  if (!isFromPool) {
    vehicle.addTo(vehicleContainer.value || crossroadContainer.value)
  }
  activeCars.value.push(vehicle)

  // ✅ 將車輛添加到 Store（用於自動生成系統計算 progress）
  store.addVehicle(vehicle)

  // ✅ 同步到 window.liveVehicles（供 AutoTrafficGenerator 使用）
  if (!window.liveVehicles) window.liveVehicles = []
  window.liveVehicles.push(vehicle)

  // ✅ 派發事件（通過 Store）
  store.emit('vehicleAdded', {
    direction,
    type: vehicleType,
    vehicleId: vehicle.id,
    speed: vehicle.currentSpeed || 0,
    timestamp: new Date().toISOString(),
  })
  const startVehicleAnimation = async () => {
    try {
      // 🚨【關鍵】確保從池中 acquire 的車輛可見性已生效
      // 延遲 50ms 讓 GSAP 設置完成
      await new Promise((resolve) => setTimeout(resolve, 50))

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

      // 🚀 改進：改用物件池回收機制 - 接收 vehicle 實例而不是 vehicleId
      const handleVehicleOutOfBounds = (vehicle) => {
        if (!vehicle) return

        const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)
        if (vehicleIndex > -1) {
          // ✅ 從活躍車輛列表中移除
          activeCars.value.splice(vehicleIndex, 1)

          // ✅ 從 window.liveVehicles 移除（使循環計數正確）
          if (window.liveVehicles) {
            const liveIdx = window.liveVehicles.findIndex((v) => v.id === vehicle.id)
            if (liveIdx > -1) {
              window.liveVehicles.splice(liveIdx, 1)
            }
          }

          // console.log(`♻️ [${vehicle.id}] 車輛動畫完成，放回物件池`)

          // 🚨【確保隱藏】無論如何都要隱藏車輛元素
          if (vehicle.element) {
            gsap.set(vehicle.element, {
              autoAlpha: 0,
              pointerEvents: 'none',
            })
          }

          // ✅ 放回物件池（隱藏元素但保留在 DOM 中）
          if (vehiclePool) {
            vehiclePool.release(vehicle)
          } else {
            // 備用：如果池未初始化，直接調用 reset
            vehicle.reset(vehicle.direction, vehicle.laneNumber, vehicle.vehicleType, store)
          }
        } else {
          // ⚠️ 車輛已被移除，但仍收到回調，確保隱藏
          console.warn(`⚠️ [${vehicle?.id}] 收到 handleVehicleOutOfBounds 但車輛已不在 activeCars 中`)
          if (vehicle?.element) {
            gsap.set(vehicle.element, {
              autoAlpha: 0,
              pointerEvents: 'none',
            })
          }
        }
      }

      // 使用新的 MotionPath 動畫方法，傳入邊界檢測回調
      await vehicle.moveAlongPath(trafficController, activeCars.value, handleVehicleOutOfBounds)

      // ✅ 動畫完成後的清理（此時車輛已由 handleVehicleOutOfBounds 放回池中）
      // 無需額外清理
    } catch (error) {
      console.error('❌ 自動生成車輛動畫錯誤:', error)
      const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)
      if (vehicleIndex > -1) {
        activeCars.value.splice(vehicleIndex, 1)
      }
      // 發生錯誤時也放回池中
      if (vehiclePool) {
        vehiclePool.release(vehicle)
      }
    }
  }
  startVehicleAnimation()
}

const crossroadContainer = ref(null)
const vehicleContainer = ref(null) // 車輛專用容器
const lumoRef = ref(null) // Lumo 助手組件
const trafficController = new TrafficLightController(store) // ✅ Phase 5：傳入 Store
const autoTrafficGenerator = new AutoTrafficGenerator(trafficController, store) // ✅ 傳入 Store
const adaptiveFlowController = new AdaptiveFlowController(trafficController)

// 🚨 設置車道級別生成控制，防止碰撞
autoTrafficGenerator.setMinLaneInterval(2000) // 同一車道2秒內不重複生成

const trafficDataCollector = new TrafficDataCollector()
const currentPhase = ref('南北向 綠燈')
const countdown = ref(15)
const activeCars = ref([]) // 維護活躍車輛列表

// 🚀 物件池：用於回收車輛，避免 DOM 堆積
let vehiclePool = null // 會在 onMounted 時初始化
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

// ✨ 綠燈秒數動畫用的 ref
const ewLightRef = ref(null)
const snLightRef = ref(null)

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

// 🎯 下方區域互動防抖機制 - 防止 Tooltip 反覆彈進彈出
let belowAreaDebounceTimer = null
let isBelowAreaTooltipVisible = false

const handleBelowAreaMouseEnter = () => {
  // 清除之前的防抖計時器
  if (belowAreaDebounceTimer) {
    clearTimeout(belowAreaDebounceTimer)
  }

  // 如果 tooltip 已經顯示，不做任何操作
  if (isBelowAreaTooltipVisible) return

  // 立即顯示 tooltip
  showLumoTooltip('crossroadBelow')
  isBelowAreaTooltipVisible = true
  console.log('✅ 下方區域 Tooltip 已顯示')
}

const handleBelowAreaMouseLeave = () => {
  // 清除之前的防抖計時器
  if (belowAreaDebounceTimer) {
    clearTimeout(belowAreaDebounceTimer)
  }

  // 延遲 300ms 再隱藏，防止快速切換時誤隱藏
  belowAreaDebounceTimer = setTimeout(() => {
    hideLumoTooltip()
    isBelowAreaTooltipVisible = false
    console.log('✅ 下方區域 Tooltip 已隱藏')
  }, 300)
}

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

  // 🎯 只在 tooltip 還未顯示時才顯示，避免重複觸發
  if (!pathTooltip.value.show) {
    pathTooltip.value = {
      show: true,
      text: text,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    console.log(`✅ Tooltip 已顯示: ${text}`)
  }
}

const hidePathTooltip = () => {
  if (pathTooltip.value.show) {
    pathTooltip.value.show = false
    console.log('✅ Tooltip 已隱藏')
  }
}

const updateTooltipPosition = (event) => {
  // 🎯 只在 tooltip 已顯示時才更新位置
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

let getWestLane1Path = () => 'M-200,400 L1400,400'
let getWestLane2Path = () => 'M-200,430 L1400,430'
let getWestLane3Path = () => 'M-200,460 L1400,460'
let getWestLane4Path = () => 'M-200,490 L1400,490'

let getSouthLane1Path = () => 'M500,-600 L500,1400'
let getSouthLane2Path = () => 'M470,-600 L470,1400'
let getSouthLane3Path = () => 'M440,-600 L440,1400'
let getSouthLane4Path = () => 'M410,-600 L410,1400'

let getNorthLane1Path = () => 'M530,-600 L530,1400'
let getNorthLane2Path = () => 'M560,-600 L560,1400'
let getNorthLane3Path = () => 'M590,-600 L590,1400'
let getNorthLane4Path = () => 'M620,-600 L620,1400'

// ✅ Phase 5：【新增】統一的車輛移除方法 - 集中化車輛生命週期管理
// 這個方法是唯一的車輛移除入口，確保所有移除邏輯一致
function removeVehicleFromSimulation(vehicleId) {
  try {
    // 1. 從 activeCars.value 移除
    const idx = activeCars.value.findIndex((v) => v.id === vehicleId)
    if (idx !== -1) {
      activeCars.value.splice(idx, 1)
    }

    // 2. 從 window.liveVehicles 移除
    if (window.liveVehicles) {
      const liveIdx = window.liveVehicles.findIndex((v) => v.id === vehicleId)
      if (liveIdx !== -1) {
        window.liveVehicles.splice(liveIdx, 1)
      }
    }

    // 3. 從 Store 移除
    if (store && store.removeVehicle && typeof store.removeVehicle === 'function') {
      store.removeVehicle(vehicleId)
    }

    // console.log(`✅ [${vehicleId}] 已從模擬中完全移除`)
  } catch (error) {
    console.warn(`⚠️ [${vehicleId}] 移除失敗: ${error.message}`)
  }
}

onMounted(async () => {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🚀 [IndexPage] onMounted 開始')
  console.log('═══════════════════════════════════════════════════════════')

  // ✅ HMR 檢測：確定是否在 HMR 恢復中
  const isHMRRecovery =
    typeof window !== 'undefined' && (window.lastCountdown !== undefined || window.lastPhase !== undefined)
  if (isHMRRecovery) {
    console.log('🔄 [IndexPage] 偵測到 HMR 恢復，將強制重新初始化...')
  }

  // ✅ 確保側邊欄在任何情況下都顯示
  if (typeof window !== 'undefined') {
    window.drawerState = true
    console.log('✅ [IndexPage] 強制設置 window.drawerState = true')
  }

  // 等待 DOM 完全渲染
  await nextTick()
  console.log('✅ [IndexPage] DOM 已準備好')

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

    // 🚀 初始化物件池
    vehiclePool = new VehiclePool(vehicleContainer.value, store)
    console.log('🚀 VehiclePool 已初始化')
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
      // 🚨 停止自適應流量控制器
      if (adaptiveFlowController && adaptiveFlowController.isRunning) {
        adaptiveFlowController.stop()
      }
    }

    // 將清理函數保存到 window 對象，以便在需要時調用
    window.trafficCleanup = cleanup
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

    // 🚀 第1階段優化：初始化空間分割網格用於碰撞檢測
    // 網格單元大小設置為 150px（建議值，基於車輛大小和碰撞檢測半徑）
    const containerRect = crossroadContainer.value.getBoundingClientRect()
    CollisionController.initializeSpatialGrid(containerRect.width, containerRect.height, 150)
    console.log(`🚀 [SpatialHashGrid] 初始化完成 (${containerRect.width}x${containerRect.height}, cellSize=150px)`)

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

    // 定期清理超時車輛機制
    // 🚨 動態清理間隔管理 - 根據車輛負載調整
    // ✨ 【改進】以下的 startDynamicCleanupCycle 和 cleanupInterval 已被 RAF 主循環取代
    // ✨ 保留註釋的代碼以供參考，但所有清理邏輯現在由 RAF 主循環統一驅動

    /*
    let cleanupInterval = null
    const maxLiveVehicles = autoTrafficGenerator.config.maxLiveVehicles || 100

    const startDynamicCleanupCycle = () => {
      if (cleanupInterval) clearInterval(cleanupInterval)

      // 根據車輛數量動態調整清理頻率
      const currentVehicleCount = activeCars.value.length
      let cleanupFrequency

      if (currentVehicleCount > maxLiveVehicles * 0.8) {
        // 🔴 高負載（>80 輛）：加快清理到 1 秒
        cleanupFrequency = 1000
      } else if (currentVehicleCount > maxLiveVehicles * 0.5) {
        // 🟡 中等負載（50-80 輛）：保持 2 秒
        cleanupFrequency = 2000
      } else {
        // 🟢 低負載（<50 輛）：延緩清理到 3 秒，節省 CPU
        cleanupFrequency = 3000
      }

      cleanupInterval = setInterval(() => {
        const initialCount = activeCars.value.length

        // 清理可能已經完成但沒有正確清理的車輛
        activeCars.value = activeCars.value.filter((vehicle) => {
          // 檢查車輛是否還在DOM中
          if (!vehicle.element || !vehicle.element.parentNode) {
            console.log(`🗑️ 清理孤立車輛: ${vehicle.id}`)
            // 同時清理 window.liveVehicles
            if (window.liveVehicles) {
              const idx = window.liveVehicles.findIndex((v) => v.id === vehicle.id)
              if (idx !== -1) window.liveVehicles.splice(idx, 1)
            }
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
            // ✅【改進】使用物件池回收，而不是直接移除
            // 🚨【關鍵】不呼叫 vehicle.remove()，因為我們要保留 DOM 元素並重複使用
            if (vehiclePool) {
              vehiclePool.release(vehicle)
            }
            // 同時清理 window.liveVehicles
            if (window.liveVehicles) {
              const idx = window.liveVehicles.findIndex((v) => v.id === vehicle.id)
              if (idx !== -1) window.liveVehicles.splice(idx, 1)
            }
            return false
          }

          return true
        })

        // ✅ 【修改】如果當前車輛數超過限制，只清理已完成的車輛
        if (activeCars.value.length > maxLiveVehicles) {
          const excessCount = activeCars.value.length - maxLiveVehicles
          console.warn(`🚨 [車輛超限清理] 超過限制 ${excessCount} 輛，準備清理已完成的車輛...`)

          // ✅ 只清理已完成動畫的車輛，不觸碰正在通行的車輛
          let removedCount = 0
          const vehiclesToRemove = []

          // 找出所有已完成的車輛
          for (let i = activeCars.value.length - 1; i >= 0 && removedCount < excessCount; i--) {
            const vehicle = activeCars.value[i]
            // 只移除已完成或接近完成的車輛
            if (vehicle.currentState === 'completed' || vehicle.currentState === 'nearComplete') {
              vehiclesToRemove.push(i)
              removedCount++
            }
          }

          // 逆序移除，避免索引混亂
          vehiclesToRemove.sort((a, b) => b - a)
          vehiclesToRemove.forEach((idx) => {
            const vehicleToRemove = activeCars.value[idx]
            if (vehicleToRemove) {
              // ✅【改進】使用物件池回收，而不是直接移除
              // 🚨【關鍵】不呼叫 vehicle.remove()，因為我們要保留 DOM 元素並重複使用
              if (vehiclePool) {
                vehiclePool.release(vehicleToRemove)
              }
              if (window.liveVehicles) {
                const liveIdx = window.liveVehicles.findIndex((v) => v.id === vehicleToRemove.id)
                if (liveIdx !== -1) window.liveVehicles.splice(liveIdx, 1)
              }
              console.log(`🗑️ 清理已完成車輛: ${vehicleToRemove.id} (狀態: ${vehicleToRemove.currentState})`)
            }
            activeCars.value.splice(idx, 1)
          })

          // 如果清理已完成的車輛還不夠，才記錄警告
          if (removedCount < excessCount) {
            console.warn(
              `⚠️ [車輛超限] 只找到 ${removedCount} 輛已完成車輛可清理，需要 ${excessCount} 輛。` +
                `剩餘 ${excessCount - removedCount} 輛超限車輛仍在通行，無法強制移除`,
            )
          } else {
            console.log(`✅ [車輛超限] 已清理 ${removedCount} 輛完成車輛，恢復正常`)
          }
        }

        // ✅ 【新增】定期日誌，監控車輛數量
        if (initialCount !== activeCars.value.length || initialCount > maxLiveVehicles * 0.8) {
          console.log(
            `📊 [車輛狀態] 當前: ${activeCars.value.length} 輛 (限制: ${maxLiveVehicles}), ` +
              `liveVehicles: ${window.liveVehicles?.length || 0}`,
          )
        }

        // 每個循環後檢查並調整清理頻率
        startDynamicCleanupCycle()
      }, cleanupFrequency)
    }
    */

    // 初始啟動動態清理循環
    // ✨ 改進：現在由 RAF 主循環統一驅動清理邏輯，無需獨立 setInterval
    // startDynamicCleanupCycle()  // ❌ 已移除

    // 在組件卸載時清理定時器 - 保存到 window 供卸載時使用（保留以防舊代碼引用）
    window.cleanupVehicleInterval = null
    window.getCleanupInterval = () => null
    window.setCleanupInterval = () => {
      // 無效果（不再使用 setInterval）
    }

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
        const gsapTweens = gsap.getTweensOf() // ← 可能出現異常，需要保護

        const diagnostics = {
          '📊 活躍車輛數': liveVehicles.length,
          '🎬 GSAP 動畫堆': gsapTweens?.length || 0,
          '🚨 洩漏指標':
            gsapTweens?.length > liveVehicles.length
              ? `⚠️ 異常高 (${gsapTweens.length - liveVehicles.length} 多餘)`
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
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyM') {
      e.preventDefault()
      window.diagnostics?.showMemoryDiagnostics()
    }
  })

  console.log('✅ [診斷工具已啟用] 按 Ctrl+Shift+M 查看內存診斷')

  // 🚨 【新增】實時性能監測工具 - 按 Ctrl+Shift+P 查看
  window.performanceMonitor = {
    isMonitoring: false,
    monitorInterval: null,

    start() {
      if (this.isMonitoring) return
      this.isMonitoring = true

      console.log('🔴 性能監測已啟動...')

      this.monitorInterval = setInterval(() => {
        const liveVehicles = window.liveVehicles || []
        const trafficGen = this.trafficGenerator

        // 獲取 GSAP 動畫數量（安全）
        let gsapCount = 0
        try {
          // 不使用 getTweensOf()，改為查看 globalTimeline
          gsapCount = gsap._ticker.fps || 0
        } catch {
          gsapCount = '計算中'
        }

        // 獲取當前配置
        const currentTimePeriod = trafficGen?.trafficController?.getCurrentTimePeriod?.() || 'unknown'
        const displayMult = trafficGen?._getDisplayMultiplierAdjustment?.() || 0
        const maxLiveVehicles = trafficGen?.config?.maxLiveVehicles || 0

        console.group('📊 【實時性能監測】')
        console.log(`⏰ 時間: ${new Date().toLocaleTimeString()}`)
        console.log(`🚗 活躍車輛: ${liveVehicles.length}/${maxLiveVehicles}`)
        console.log(`🎭 時段: ${currentTimePeriod} | displayMult: ${displayMult}`)
        console.log(`🎬 GSAP 狀態: ${gsapCount === 'N/A' ? '⚠️ 無法計算' : '✅ 運行中'}`)
        console.log(`📦 Vue 數據大小: ${JSON.stringify(this.$data).length} bytes`)

        // 檢查是否達到上限
        if (liveVehicles.length >= maxLiveVehicles * 0.9) {
          console.warn(`⚠️ 接近車輛上限！(${liveVehicles.length}/${maxLiveVehicles})`)
        }
        console.groupEnd()
      }, 10000) // 每 10 秒輸出一次
    },

    stop() {
      if (this.monitorInterval) {
        clearInterval(this.monitorInterval)
        this.monitorInterval = null
        this.isMonitoring = false
        console.log('⚫ 性能監測已停止')
      }
    },
  }

  // 🚨 【新增】快捷鍵：Ctrl+Shift+P 開始/停止性能監測
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
      e.preventDefault()
      if (window.performanceMonitor.isMonitoring) {
        window.performanceMonitor.stop()
      } else {
        window.performanceMonitor.start()
      }
    }
  })

  console.log('✅ [性能監測工具已啟用] 按 Ctrl+Shift+P 開始/停止監測')

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
      // 計算 Delta Time（毫秒）
      const deltaTimeMs = currentTime - lastFrameTime
      lastFrameTime = currentTime

      // ✅ 限制 deltaTime（防止瀏覽器標籤頁切換導致的巨大時間跳躍）
      const clampedDeltaTime = Math.min(deltaTimeMs, 100)

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
      const runPeriodicCheck = periodicCheckAccumulator >= 50 // 每 50ms 執行一次
      const runStuckCheck = stuckCheckAccumulator >= 5000 // 每 5 秒執行一次

      if (window.liveVehicles && (runPeriodicCheck || runStuckCheck)) {
        // ✅ P2 修復：每幀重建 SpatialHashGrid（用於碰撞檢測優化）
        // 原因：需要在碰撞檢測前重建空間索引以確保準確性
        if (runPeriodicCheck && CollisionController.spatialGrid) {
          CollisionController.spatialGrid.clear()
          for (const v of window.liveVehicles) {
            if (v.element) {
              const pos = v.getCurrentPosition()
              CollisionController.spatialGrid.insert(v, pos.x, pos.y)
            }
          }
        }

        for (const vehicle of window.liveVehicles) {
          // ═══════════════════════════════════════════════════════════════════════
          // 【Phase 4】✅ 執行 50ms 的碰撞檢測邏輯 (從 Vehicle.js onUpdate 遷移)
          // ═══════════════════════════════════════════════════════════════════════
          if (runPeriodicCheck) {
            try {
              // 跳過已通過停止線的車輛
              if (!vehicle.hasPassedStopLine && vehicle.collisionController && window.trafficController) {
                const trafficController = window.trafficController
                const allVehicles = window.liveVehicles

                // 檢測綠燈優先加速
                const currentLightStateForGreen = trafficController.getCurrentLightState(vehicle.direction)
                const isGreenLightReady =
                  (vehicle.laneNumber === 1 &&
                    (currentLightStateForGreen === 'leftGreen' || currentLightStateForGreen === 'green')) ||
                  (vehicle.laneNumber !== 1 && currentLightStateForGreen === 'green')

                if (isGreenLightReady && vehicle.position && vehicle.position.distance < 50) {
                  // 綠燈 + 接近停止線距離 < 50px = 無條件加速
                  if (vehicle.movementTimeline && vehicle.movementTimeline.timeScale() < 1) {
                    vehicle.movementTimeline.timeScale(1)
                  }
                  vehicle.currentState = 'acceleratingAtGreen'
                } else {
                  // 執行碰撞檢測
                  const shouldStop = vehicle.collisionController.checkSimpleCollision(allVehicles)
                  const isFirstVehicle = vehicle.collisionController.isClosestToStopLine(allVehicles)

                  // 碰撞處理邏輯
                  if (shouldStop && shouldStop.shouldStop && !shouldStop.frontVehicleIsMoving) {
                    // 前方車輛停止了，就停止自己（只有當 shouldStop.shouldStop === true 時）
                    vehicle.movementTimeline.timeScale(0)
                    vehicle.currentState = 'stopped'
                  } else if (shouldStop && shouldStop.action === 'rejoin_queue') {
                    // 重新加入隊列
                    if (vehicle.movementTimeline) {
                      vehicle.movementTimeline.timeScale(shouldStop.targetSpeed)
                    }
                    vehicle.currentState = 'rejoiningQueue'
                  } else if (
                    shouldStop &&
                    (shouldStop.action === 'gap_recovery' || shouldStop.action === 'emergency_gap_recovery')
                  ) {
                    // 緊急間距恢復
                    if (vehicle.movementTimeline) {
                      vehicle.movementTimeline.pause()
                      vehicle.movementTimeline.timeScale(shouldStop.targetSpeed)
                      if (shouldStop.targetSpeed > 0) {
                        vehicle.movementTimeline.play()
                      }
                    }
                    vehicle.currentState = 'gapRecovery'
                  } else if (shouldStop && shouldStop.action === 'follow' && shouldStop.targetSpeed === 0) {
                    // 停止指令
                    if (vehicle.movementTimeline) {
                      vehicle.movementTimeline.pause()
                      vehicle.movementTimeline.timeScale(0)
                    }
                    vehicle.currentState = 'gapRecovery'
                  } else if (shouldStop && shouldStop.autoFollowing && shouldStop.targetSpeed > 0) {
                    // 自動跟隨模式
                    if (vehicle.movementTimeline) {
                      vehicle.movementTimeline.timeScale(shouldStop.targetSpeed)
                    }
                    vehicle.currentState = 'autoFollowing'
                  } else if (shouldStop) {
                    const distance = shouldStop.distance
                    const requiredGap = shouldStop.requiredGap || 12
                    const currentLightState = trafficController.getCurrentLightState(vehicle.direction)

                    // 1號車道在直行綠燈時應該排隊等待左轉綠燈
                    if (vehicle.laneNumber === 1 && currentLightState === 'green') {
                      vehicle.movementTimeline.timeScale(0)
                      vehicle.currentState = 'waitingForLeftTurnGreen'
                      vehicle.waitingForGreen = true
                    } else {
                      // 判斷是否可以跟車
                      const isValidLightForFollowing =
                        (vehicle.laneNumber === 1 && currentLightState === 'leftGreen') ||
                        (vehicle.laneNumber !== 1 && currentLightState === 'green')

                      if (
                        isValidLightForFollowing &&
                        !vehicle.waitingForGreen &&
                        shouldStop.frontVehicleIsMoving &&
                        vehicle.movementTimeline
                      ) {
                        // 綠燈跟車：根據距離調整速度
                        const FOLLOWING_CONFIG = vehicle.constructor.prototype.constructor.FOLLOWING_CONFIG || {
                          GREEN_LIGHT_FOLLOWING: {
                            DISTANCE_THRESHOLDS: { VERY_CLOSE: 0.5, CLOSE: 1.0, NORMAL: 1.5 },
                            LANE1: { VERY_CLOSE: 0.3, CLOSE: 0.6, NORMAL: 0.8, FAR: 1.0 },
                            OTHER_LANES: { VERY_CLOSE: 0.2, CLOSE: 0.5, NORMAL: 0.7, FAR: 1.0 },
                          },
                        }

                        const isLane1 = vehicle.laneNumber === 1
                        const thresholds = FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.DISTANCE_THRESHOLDS
                        const speeds = isLane1
                          ? FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.LANE1
                          : FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.OTHER_LANES

                        let targetSpeed
                        if (distance <= requiredGap * thresholds.VERY_CLOSE) {
                          targetSpeed = speeds.VERY_CLOSE
                        } else if (distance <= requiredGap * thresholds.CLOSE) {
                          targetSpeed = speeds.CLOSE
                        } else if (distance <= requiredGap * thresholds.NORMAL) {
                          targetSpeed = speeds.NORMAL
                        } else {
                          targetSpeed = speeds.FAR
                        }

                        vehicle.movementTimeline.timeScale(targetSpeed)
                        vehicle.currentState = 'following'
                      } else if (
                        isFirstVehicle &&
                        shouldStop.frontVehicleAtStopLine &&
                        !shouldStop.frontVehicleIsMoving &&
                        !vehicle.waitingForGreen &&
                        vehicle.movementTimeline
                      ) {
                        // 第一台車：前方在停止線等待且不移動，繼續前進
                        const recheckLightState = trafficController.getCurrentLightState(vehicle.direction)
                        if (recheckLightState === 'green' && !vehicle.waitingForGreen) {
                          const currentTimeScale = vehicle.movementTimeline.timeScale()
                          if (currentTimeScale < 1) {
                            vehicle.movementTimeline.timeScale(1)
                            vehicle.currentState = 'moving'
                          }
                        }
                      } else if (!shouldStop.frontVehicleIsMoving) {
                        vehicle.movementTimeline.timeScale(0)
                        vehicle.currentState = 'stopped'
                      }
                    }
                  } else if (vehicle.movementTimeline) {
                    // 無碰撞風險時，平滑恢復到正常速度
                    const currentTimeScale = vehicle.movementTimeline.timeScale()
                    if (currentTimeScale < 1) {
                      const currentLightState = trafficController.getCurrentLightState(vehicle.direction)

                      const canProceed =
                        vehicle.laneNumber === 1 ? currentLightState === 'leftGreen' : currentLightState === 'green'

                      if (canProceed) {
                        vehicle.movementTimeline.timeScale(1)
                        vehicle.currentState = 'moving'
                      }
                    }
                  }

                  // 簡化紅綠燈檢查
                  if (!shouldStop && vehicle.checkTrafficLightSlowDown) {
                    const slowDownInfo = vehicle.checkTrafficLightSlowDown(trafficController)
                    if (slowDownInfo && slowDownInfo.action === 'resume_from_slow') {
                      vehicle.currentState = 'moving'
                      if (vehicle.originalTimeScale && vehicle.movementTimeline) {
                        vehicle.movementTimeline.timeScale(vehicle.originalTimeScale)
                        vehicle.originalTimeScale = null
                      }
                    } else if (slowDownInfo && slowDownInfo.action === 'stop_for_left_turn_wait') {
                      vehicle.movementTimeline.timeScale(0)
                      vehicle.currentState = 'waitingForLeftTurnGreen'
                      vehicle.waitingForGreen = true
                    } else if (slowDownInfo && slowDownInfo.action === 'stop_for_straight_wait') {
                      vehicle.movementTimeline.timeScale(0)
                      vehicle.currentState = 'waitingForStraightGreen'
                      vehicle.waitingForGreen = true
                    }
                  }
                }
              }
            } catch (e) {
              console.error('❌ [RAF Phase 4] Collision detection error:', e)
            }
          }

          // 執行 50ms 的流量燈響應檢查 (directTrafficLightResponse, resumeMovement)
          if (runPeriodicCheck && vehicle.directTrafficLightResponse) {
            try {
              vehicle.directTrafficLightResponse(window.trafficController)

              // 自動恢復移動邏輯
              if (
                vehicle.currentState === 'waitingForVehicle' ||
                vehicle.currentState === 'autoFollowing' ||
                vehicle.currentState === 'rejoiningQueue' ||
                vehicle.currentState === 'gapRecovery'
              ) {
                if (vehicle.resumeMovement && typeof vehicle.resumeMovement === 'function') {
                  vehicle.resumeMovement(window.liveVehicles)
                }
              }
            } catch (e) {
              console.error('❌ [RAF] Vehicle periodic check error:', e)
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
                if (vehiclePool) {
                  vehiclePool.release(vehicle)
                  console.log(`♻️ [${vehicle.id}] 異常移除的車輛已放回物件池`)
                }

                // ✅ 同步從其他追蹤列表中移除
                removeVehicleFromSimulation(vehicle.id)

                console.log(`✅ [${vehicle.id}] 已清理並放回物件池`)
              } catch (e) {
                console.warn(`⚠️ [${vehicle.id}] 清理提交異常: ${e.message}`)
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
                console.log(`🗑️ 清理孤立車輛: ${vehicle.id}`)

                // 🚨【POOL LEAK FIX】孤立車輛也要放回物件池
                if (vehiclePool) {
                  vehiclePool.release(vehicle)
                  console.log(`♻️ [${vehicle.id}] 孤立車輛已放回物件池`)
                } else {
                  // 備用清理
                  if (vehicle.performCleanup && typeof vehicle.performCleanup === 'function') {
                    vehicle.performCleanup().catch((e) => {
                      console.warn(`⚠️ [${vehicle.id}] 孤立車輛清理異常: ${e.message}`)
                    })
                  }
                }

                // ✅ 同步移除追蹤
                removeVehicleFromSimulation(vehicle.id)
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
                if (vehiclePool) {
                  vehiclePool.release(vehicle)
                  console.log(`♻️ [${vehicle.id}] 狀態 completed 的車輛已放回物件池`)
                }
                // ✅ 同步移除追蹤
                removeVehicleFromSimulation(vehicle.id)
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
                if (vehiclePool) {
                  vehiclePool.release(vehicleToRemove)
                } else if (vehicleToRemove.remove && typeof vehicleToRemove.remove === 'function') {
                  vehicleToRemove.remove()
                }
                // ✅ 同步清理其他列表
                removeVehicleFromSimulation(vehicleToRemove.id)
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
      // ═══════════════════════════════════════════════════════════════════════
      const runVehicleLogicUpdate = vehicleLogicUpdateAccumulator >= VEHICLE_LOGIC_UPDATE_INTERVAL

      if (window.liveVehicles && runVehicleLogicUpdate && window.trafficController) {
        const trafficController = window.trafficController
        const allVehicles = window.liveVehicles

        // 遍歷所有活動車輛，執行低頻決策邏輯
        for (const vehicle of allVehicles) {
          try {
            // 調用 Vehicle.updateLogic()：包含停止線檢查和紅綠燈控制
            if (vehicle && typeof vehicle.updateLogic === 'function') {
              vehicle.updateLogic(trafficController, allVehicles)
            }
          } catch (e) {
            console.error(`❌ [Vehicle.updateLogic] 車輛 ${vehicle?.id} 出現異常:`, e)
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
function getTooltipMessage(messageOrKey) {
  // 如果是字符串且不含空格和特殊字符 (像是一個鍵)，嘗試從配置中獲取
  if (typeof messageOrKey === 'string' && !messageOrKey.includes('：') && window.lumoConfig?.tooltips) {
    const configValue = window.lumoConfig.tooltips[messageOrKey]
    if (configValue) {
      // console.log(`💬 [Tooltip] 使用配置: ${messageOrKey} => ${configValue.substring(0, 30)}...`)
      return configValue
    }
  }

  // 否則直接返回訊息
  console.log(`💬 [Tooltip] 使用直接訊息: ${String(messageOrKey).substring(0, 30)}...`)
  return messageOrKey
}

// 💡 顯示 Lumo Tooltip 的函數
function showLumoTooltip(messageOrKey) {
  // ✅ 【關鍵修復】檢查 Tooltip 是否啟用（從 window.lumoTooltipManager 取得狀態）
  if (window.lumoTooltipManager && !window.lumoTooltipManager.isTooltipEnabled) {
    return // 如果 Tooltip 關閉，直接返回，不顯示任何訊息
  }

  const message = getTooltipMessage(messageOrKey)

  if (!message) {
    console.warn('⚠️ [Tooltip] 訊息為空，跳過顯示')
    return
  }

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
  // 🧪 HMR 保護：保存關鍵狀態到全局
  console.log('💾 [IndexPage] 保存狀態以便 HMR 恢復...')
  if (typeof window !== 'undefined') {
    window.lastCountdown = countdown.value
    window.lastPhase = currentPhase.value
    window.lastActiveCarCount = activeCars.value.length
  }

  // 清理 MotionPathHelper
  disablePathEditing()

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

  // ⚠️ 【修復】已移除 DOM 事件監聽器（已遷移到 Store 訂閱）
  // 不再需要 window.removeEventListener() - Store 訂閱在上面已清理

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

  // 🚀 清理物件池
  if (vehiclePool) {
    console.log('🚀 清理 VehiclePool...')
    vehiclePool.dispose()
    vehiclePool = null
  }

  // 🌤️ 完全清理天氣控制器
  if (weatherController) {
    console.log('🌤️ 清理天氣系統...')
    if (weatherController.destroy) {
      weatherController.destroy()
    }
    weatherController = null
  }

  // 移除鍵盤事件監聽
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeyDown, { capture: false })
  }

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
  height: 50px;
  bottom: 0%;
  left: 50%;
  transform: translateX(-50%);
  /* background-color: rgba(0, 0, 0, 0.5); */
  /* 🎯 互動效果 - 確保滑鼠事件正確傳遞 */
  cursor: auto;
  transition: all 0.3s ease;
  pointer-events: auto; /* 確保可以接收滑鼠事件 */
  z-index: 5; /* 設置適當的層級 */
}
</style>
