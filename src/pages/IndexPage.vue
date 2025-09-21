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
        <!-- 往東車道1 直行路徑（車輛從畫面外進入到離開畫面） - 可編輯 -->
        <path
          id="eastLane1Straight"
          :d="getEastLane1Path()"
          :stroke="isPathEditMode ? 'rgba(255, 200, 100, 0.9)' : 'rgba(255, 100, 100, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
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
        <!-- 往東車道4 直行路徑（車輛從畫面外進入到離開畫面） - 可編輯 -->
        <path
          id="eastLane4Straight"
          :d="getEastLane4Path()"
          :stroke="isPathEditMode ? 'rgba(255, 200, 100, 0.9)' : 'rgba(255, 160, 160, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
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
        <!--往西車道4 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="westLane4Straight"
          :d="getWestLane4Path()"
          :stroke="isPathEditMode ? 'rgba(100, 200, 255, 0.9)' : 'rgba(160, 210, 255, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
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
        <!--往南車道4 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="southLane4Straight"
          :d="getSouthLane4Path()"
          :stroke="isPathEditMode ? 'rgba(100, 255, 200, 0.9)' : 'rgba(160, 255, 210, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
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
        <!--往北車道4 直行路徑（車輛從畫面外進入到離開畫面）- 可編輯 -->
        <path
          id="northLane4Straight"
          :d="getNorthLane4Path()"
          :stroke="isPathEditMode ? 'rgba(255, 100, 255, 0.9)' : 'rgba(255, 160, 255, 0.6)'"
          :stroke-width="isPathEditMode ? '3' : '2'"
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
        <div v-if="isPathEditMode" class="edit-instructions">
          <div class="instructions-title">🎯 路徑編輯指南</div>
          <div class="instructions-list">
            <div>• <strong>ALT+Click</strong> 路徑：新增控制點</div>
            <div>• <strong>ALT+Click</strong> 錨點：切換平滑/尖角</div>
            <div>• <strong>ALT+拖拽</strong> 錨點：獲取手柄</div>
            <div>• <strong>SHIFT+Click</strong>：多選錨點</div>
            <div>• <strong>DELETE</strong>：刪除選中錨點</div>
            <div>• <strong>CTRL+Z</strong>：撤銷操作</div>
            <div class="highlight-note">只能編輯高亮的車道1和車道4</div>
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
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { MotionPathHelper } from 'gsap/MotionPathHelper'
import TrafficLightController from '../classes/TrafficLightController.js'
import AutoTrafficGenerator from '../classes/AutoTrafficGenerator.js'
import TrafficDataCollector from '../classes/TrafficDataCollector.js'
import Vehicle from '../classes/Vehicle.js'
import { createLanePathCalculator } from '../utils/lanePathCalculator.js'

// 註冊 GSAP MotionPathPlugin 和 MotionPathHelper
gsap.registerPlugin(MotionPathPlugin, MotionPathHelper)

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

  // 🚗 改進：使用路徑起始位置生成車輛
  // 獲取車道資訊（保留車道選擇邏輯）
  const laneInfo = trafficController.getRandomLanePosition(direction)
  if (!laneInfo) {
    console.error(`❌ 無法獲取方向 ${direction} 的車道位置`)
    return
  }
  const { laneNumber } = laneInfo

  // 使用路徑起始位置替代隨機車道位置
  const pathStartPosition = Vehicle.getPathStartPosition(direction, laneNumber)
  if (!pathStartPosition) {
    console.warn(`⚠️ 無法獲取路徑起始位置，使用傳統方法`)
    // 如果無法獲取路徑位置，回退到原始方法
    const { position: randomLane } = laneInfo
    createVehicleWithPosition(randomLane.x, randomLane.y, direction, vehicleType, laneNumber)
    return
  }

  console.log(
    `🚗 車輛將從路徑起始位置生成: ${direction}Lane${laneNumber} (${pathStartPosition.x}, ${pathStartPosition.y})`,
  )

  // 🚨 強化空間檢查：檢查更大範圍內是否有其他車輛，避免重疊生成
  const isPositionOccupied = activeCars.value.some((car) => {
    if (car.direction !== direction) return false
    const carPos = car.getCurrentPosition()
    const distance = Math.sqrt(
      Math.pow(carPos.x - pathStartPosition.x, 2) + Math.pow(carPos.y - pathStartPosition.y, 2),
    )
    // 🚨 大幅增加檢查範圍：從100px增加到150px，高車流量時加倍
    const checkRange = activeCars.value.length > 20 ? 200 : 150
    return distance < checkRange
  })

  // 🚨 額外檢查：確保同方向同車道沒有太近的車輛
  const isLaneOccupied = activeCars.value.some((car) => {
    if (car.direction !== direction || car.laneNumber !== laneNumber) return false
    const carPos = car.getCurrentPosition()

    // 根據方向檢查車道內的距離
    let isInSafePath = false
    // 🚨 高車流量時增加安全距離
    const safePathDistance = activeCars.value.length > 20 ? 200 : 150
    const laneWidth = 20 // 車道寬度檢查範圍

    if (direction === 'east') {
      // 東向：檢查X軸距離，確保前方至少150px空間
      isInSafePath =
        Math.abs(carPos.y - pathStartPosition.y) < laneWidth &&
        carPos.x - pathStartPosition.x < safePathDistance &&
        carPos.x - pathStartPosition.x > -50
    } else if (direction === 'west') {
      // 西向：檢查X軸距離
      isInSafePath =
        Math.abs(carPos.y - pathStartPosition.y) < laneWidth &&
        pathStartPosition.x - carPos.x < safePathDistance &&
        pathStartPosition.x - carPos.x > -50
    } else if (direction === 'north') {
      // 北向：檢查Y軸距離
      isInSafePath =
        Math.abs(carPos.x - pathStartPosition.x) < laneWidth &&
        pathStartPosition.y - carPos.y < safePathDistance &&
        pathStartPosition.y - carPos.y > -50
    } else if (direction === 'south') {
      // 南向：檢查Y軸距離
      isInSafePath =
        Math.abs(carPos.x - pathStartPosition.x) < laneWidth &&
        carPos.y - pathStartPosition.y < safePathDistance &&
        carPos.y - pathStartPosition.y > -50
    }

    return isInSafePath
  })

  if (isPositionOccupied || isLaneOccupied) {
    console.log(`🚗 車道空間不足，暫停生成 ${direction}Lane${laneNumber}`)
    return
  }

  // 創建車輛
  createVehicleWithPosition(pathStartPosition.x, pathStartPosition.y, direction, vehicleType, laneNumber)
}

// 通用車輛創建函數
const createVehicleWithPosition = (x, y, direction, vehicleType, laneNumber) => {
  // 使用指定位置創建車輛
  const vehicle = new Vehicle(x, y, direction, vehicleType, laneNumber)
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

      // 🚨 改進：提前移除機制 - 當車輛離開邊界時立即從碰撞檢測中移除
      const handleVehicleOutOfBounds = (vehicleId) => {
        const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicleId)
        if (vehicleIndex > -1) {
          activeCars.value.splice(vehicleIndex, 1)
          console.log(`🚗 [${vehicleId}] 已從 activeCars 中立即移除，避免塞車`)
        }
      }

      // 使用新的 MotionPath 動畫方法，傳入邊界檢測回調
      await vehicle.moveAlongPath(trafficController, activeCars.value, handleVehicleOutOfBounds)

      // 🚨 動畫完成後立即清理，不等待淡出
      const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)
      if (vehicleIndex > -1) {
        activeCars.value.splice(vehicleIndex, 1)
        console.log(`🚗 [${vehicle.id}] 動畫完成，最終清理`)
      }

      // 🚨 直接移除車輛，不執行淡出動畫
      setTimeout(() => {
        try {
          // 直接移除 DOM 元素，不執行淡出
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
          console.log(`🚗 [${vehicle.id}] DOM 元素已直接移除`)
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
    document.addEventListener('keyup', handleKeyUp, { capture: false, passive: true })
  }

  console.log('⌨️ 鍵盤事件監聽器已啟用')
  console.log('💡 使用提示:')
  console.log('   • ALT+Click: 在路徑上新增控制點')
  console.log('   • ALT+Click 錨點: 切換平滑/尖角')
  console.log('   • ALT+拖拽錨點: 從尖角獲得手柄')
  console.log('   • SHIFT+Click: 選擇多個錨點')
  console.log('   • DELETE: 刪除選中的錨點')
  console.log('   • CTRL+Z: 撤銷')
  console.log('   • 按下停止編輯時會保存所有編輯結果！')
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

const handleKeyUp = () => {
  // 處理鍵盤釋放事件
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
  document.removeEventListener('keyup', handleKeyUp, { capture: false })

  console.log('🧹 路徑編輯器、觀察器和事件監聽器已清理完成')
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

  // 確保鍵盤事件監聽器被移除（使用與添加時相同的選項）
  document.removeEventListener('keydown', handleKeyDown, { capture: false })
  document.removeEventListener('keyup', handleKeyUp, { capture: false })

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
  bottom: 0%;
  right: -21%;
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
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.8);
  color: #ffff99;
  font-size: 12px;
  border-radius: 8px;
  text-align: left;
  max-width: 280px;
  border: 1px solid rgba(255, 255, 153, 0.3);
}

.instructions-title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #ffffff;
  font-size: 13px;
  text-align: center;
}

.instructions-list {
  line-height: 1.4;
}

.instructions-list > div {
  margin-bottom: 3px;
}

.instructions-list strong {
  color: #ffcc00;
  font-weight: bold;
}

.highlight-note {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 153, 0.2);
  color: #00ff88;
  font-style: italic;
  text-align: center;
}

.current-editing {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 150, 255, 0.2);
  border: 1px solid rgba(0, 150, 255, 0.5);
  border-radius: 4px;
  color: #00bfff;
  font-weight: bold;
  text-align: center;
  animation: pulse 2s infinite;
}

.current-editing strong {
  color: #ffffff;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}
</style>
