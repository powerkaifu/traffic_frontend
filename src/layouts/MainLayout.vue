<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="text-white bg-transparent">
      <q-toolbar class="header-toolbar">
        <q-toolbar-title>
          <img src="/images/logo.png" width="200" />
        </q-toolbar-title>

        <!-- 中間切換按鈕 -->
        <div class="header-nav-buttons">
          <img
            :src="currentRoute === '/' ? '/images/button/simBtnOn.png' : '/images/button/simBtnOff.png'"
            alt="場景模擬"
            class="nav-button"
            @click="navigateToSimulation"
          />
          <img
            :src="
              currentRoute === '/visualization' ? '/images/button/VisualBtnOn.png' : '/images/button/VisualBtnOff.png'
            "
            alt="視覺化數據"
            class="nav-button"
            @click="navigateToVisualization"
          />
        </div>

        <q-btn dense flat round icon="menu" @click="toggleRightDrawer" />
      </q-toolbar>
    </q-header>

    <q-drawer
      show-if-above
      v-model="rightDrawerOpen"
      side="right"
      bordered
      class="bg-transparent"
      :width="drawerWidth"
      :breakpoint="1024"
    >
      <div class="drawer-content">
        <!-- 場景參數設定區域 - setWindow.png 背景 -->
        <div class="set-window-section">
          <div class="section-content">
            <!-- 智能車流情境分派系統 -->
            <div class="compact-dispatch-system">
              <!-- 系統標題與狀態 -->
              <div class="system-header">
                <div class="system-info">
                  <span class="system-title">智能車流情境分派系統</span>
                  <div class="system-status" :class="{ active: isSystemRunning }">
                    <div class="status-dot"></div>
                    <span class="status-text">{{ systemStatusText }}</span>
                  </div>
                </div>
                <div class="current-time">{{ currentTimeDisplay }}</div>
              </div>

              <!-- 時段場景快速切換 -->
              <div class="time-scenarios-compact">
                <button
                  v-for="scenario in timeScenarios"
                  :key="scenario.key"
                  @click="switchToTimeScenario(scenario.key)"
                  :class="[
                    'scenario-btn-compact',
                    {
                      active: currentTimeScenario === scenario.key,
                      // 移除自動時間模式的顯示邏輯
                    },
                  ]"
                  :title="`${scenario.name} (${scenario.timeRange})`"
                >
                  <div class="scenario-icon">{{ scenario.icon }}</div>
                  <div class="scenario-name">{{ scenario.shortName }}</div>
                </button>
              </div>

              <!-- 控制與統計 -->
              <div class="control-stats-row">
                <!-- 自動模式切換 (已隱藏 - 改為純手動模式) -->
                <!--
                <button
                  @click="toggleAutoTimeMode"
                  :class="['auto-toggle-compact', { active: isAutoTimeMode }]"
                  title="切換自動/手動模式"
                >
                  <span class="toggle-icon">{{ isAutoTimeMode ? '🤖' : '✋' }}</span>
                  <span class="toggle-label">{{ isAutoTimeMode ? '自動' : '手動' }}</span>
                </button>
                -->

                <!-- 頻率調整 (僅手動模式顯示) -->
                <div class="frequency-control" v-show="!isAutoTimeMode">
                  <span class="freq-label">頻率</span>
                  <input
                    type="range"
                    v-model="manualFrequency"
                    :min="0.5"
                    :max="15"
                    :step="0.5"
                    @input="updateManualFrequency"
                    class="freq-slider"
                  />
                  <span class="freq-value">{{ manualFrequency }}s</span>
                </div>

                <!-- 統計資訊 -->
                <div class="stats-compact">
                  <div class="stat-item">
                    <span class="stat-label">生成</span>
                    <span class="stat-value">{{ totalGenerated }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">間隔</span>
                    <span class="stat-value">{{ currentInterval }}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 數據展示區域 - dataBg.png 背景 -->
        <div class="data-section">
          <!-- 頂部按鈕區域 -->
          <div class="data-section-buttons">
            <div class="top-buttons">
              <img src="/images/button/setDataBtnOn.png" alt="特徵模擬數據" class="control-button" />
            </div>
          </div>

          <!-- 特徵模擬數據區域 -->
          <div class="data-section-content">
            <div class="traffic-data-grid">
              <!-- 左上：往東 -->
              <div class="traffic-zone east-zone">
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value">{{ eastData.averageSpeed }} km/h</span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value">{{ eastData.occupancy }} %</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value">{{ eastData.motorFlow }} 輛</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value">{{ eastData.smallCarFlow }} 輛</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value">{{ eastData.largeCarFlow }} 輛</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value">{{ eastData.motorSpeed }} km/h</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value">{{ eastData.smallCarSpeed }} km/h</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value">{{ eastData.largeCarSpeed }} km/h</span>
                  </div>
                </div>
              </div>

              <!-- 右上：往西 -->
              <div class="traffic-zone west-zone">
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value">{{ westData.averageSpeed }} km/h</span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value">{{ westData.occupancy }} %</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value">{{ westData.motorFlow }} 輛</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value">{{ westData.smallCarFlow }} 輛</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value">{{ westData.largeCarFlow }} 輛</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value">{{ westData.motorSpeed }} km/h</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value">{{ westData.smallCarSpeed }} km/h</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value">{{ westData.largeCarSpeed }} km/h</span>
                  </div>
                </div>
              </div>

              <!-- 左下：往南 -->
              <div class="traffic-zone south-zone">
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value">{{ southData.averageSpeed }} km/h</span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value">{{ southData.occupancy }} %</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value">{{ southData.motorFlow }} 輛</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value">{{ southData.smallCarFlow }} 輛</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value">{{ southData.largeCarFlow }} 輛</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value">{{ southData.motorSpeed }} km/h</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value">{{ southData.smallCarSpeed }} km/h</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value">{{ southData.largeCarSpeed }} km/h</span>
                  </div>
                </div>
              </div>

              <!-- 右下：往北 -->
              <div class="traffic-zone north-zone">
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value">{{ northData.averageSpeed }} km/h</span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value">{{ northData.occupancy }} %</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value">{{ northData.motorFlow }} 輛</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value">{{ northData.smallCarFlow }} 輛</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value">{{ northData.largeCarFlow }} 輛</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value">{{ northData.motorSpeed }} km/h</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value">{{ northData.smallCarSpeed }} km/h</span>
                  </div>
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value">{{ northData.largeCarSpeed }} km/h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container :style="{ '--light-position': lightPosition }">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

const rightDrawerOpen = ref(false)
const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// 場景參數設定的資料定義 - 暫時保留基本變數供後續自動分派系統使用
const selectedScenario = ref('一般') // 對應 '一般'
const motorcycleCount = ref(5) // Volume_M
const smallCarCount = ref(8) // Volume_S
const largeCarCount = ref(3) // Volume_L

// 智能時段自動分派系統狀態
const isSystemRunning = ref(true)
const isAutoTimeMode = ref(false) // 預設關閉自動時段模式，改為手動選擇
const currentTimeScenario = ref('normal') // 預設為一般情境
const manualFrequency = ref(2.5)
const totalGenerated = ref(0)
const currentInterval = ref(2.5)

// 智能車流情境分派系統 - 三大時段配置
const timeScenarios = ref([
  // 尖峰時段 (早晚通勤高峰)
  {
    key: 'peak_hours',
    name: '尖峰時段',
    shortName: '尖峰',
    icon: '🚀',
    timeRange: '07:00-09:00, 17:00-19:00',
    hours: [7, 8, 17, 18],
    scenarioType: 'peak',
    config: {
      // 高頻率生成 - 通勤車流密集
      interval: { min: 800, max: 1800, normal: 1200 },

      // 車輛類型比例 - 通勤為主
      vehicleTypes: [
        { type: 'motor', weight: 45, priority: 1 }, // 45% 機車 (通勤首選)
        { type: 'small', weight: 50, priority: 2 }, // 50% 小型車 (上班族)
        { type: 'large', weight: 5, priority: 3 }, // 5% 大型車 (避開尖峰)
      ],

      // 密度管理 - 高容忍度
      densityThresholds: {
        light: 15, // 輕度交通
        moderate: 30, // 中度交通
        heavy: 45, // 重度交通
        congested: 60, // 擁堵閾值
      },

      // 方向性流量偏好
      directionBias: {
        morning: { east: 1.4, west: 0.7, north: 1.1, south: 0.9 },
        evening: { east: 0.7, west: 1.4, north: 0.9, south: 1.1 },
      },

      // 時段特性
      characteristics: {
        description: '通勤高峰期，車流密集，以機車和小型車為主',
        avgSpeed: 25,
        peakMultiplier: 2.2,
        congestionTolerance: 'high',
      },
    },
  },

  // 🌞 離峰時段 (日間正常流量)
  {
    key: 'off_peak',
    name: '離峰時段',
    shortName: '離峰',
    icon: '🌞',
    timeRange: '09:00-17:00, 19:00-23:00',
    hours: [9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22],
    scenarioType: 'offpeak',
    config: {
      // 中等頻率生成 - 正常日間活動
      interval: { min: 2500, max: 4500, normal: 3200 },

      // 車輛類型比例 - 多元化用途
      vehicleTypes: [
        { type: 'motor', weight: 30, priority: 1 }, // 30% 機車 (短程代步)
        { type: 'small', weight: 55, priority: 2 }, // 55% 小型車 (購物、洽公)
        { type: 'large', weight: 15, priority: 3 }, // 15% 大型車 (貨運配送)
      ],

      // 密度管理 - 標準容忍度
      densityThresholds: {
        light: 8, // 輕度交通
        moderate: 18, // 中度交通
        heavy: 28, // 重度交通
        congested: 38, // 擁堵閾值
      },

      // 方向性流量偏好 - 較為均衡
      directionBias: {
        all: { east: 1.0, west: 1.0, north: 1.0, south: 1.0 },
      },

      // 時段特性
      characteristics: {
        description: '日間正常流量，用途多元化，各車型比例較平均',
        avgSpeed: 35,
        peakMultiplier: 1.0,
        congestionTolerance: 'normal',
      },
    },
  },

  // 🌙 凌晨時段 (深夜低流量)
  {
    key: 'late_night',
    name: '凌晨時段',
    shortName: '凌晨',
    icon: '🌙',
    timeRange: '23:00-07:00',
    hours: [23, 0, 1, 2, 3, 4, 5, 6],
    scenarioType: 'latenight',
    config: {
      // 低頻率生成 - 夜間稀少車流
      interval: { min: 8000, max: 18000, normal: 12000 },

      // 車輛類型比例 - 機車主導
      vehicleTypes: [
        { type: 'motor', weight: 70, priority: 1 }, // 70% 機車 (夜班、外送)
        { type: 'small', weight: 25, priority: 2 }, // 25% 小型車 (夜歸、值班)
        { type: 'large', weight: 5, priority: 3 }, // 5% 大型車 (夜間運輸)
      ],

      // 密度管理 - 低容忍度
      densityThresholds: {
        light: 3, // 輕度交通
        moderate: 6, // 中度交通
        heavy: 10, // 重度交通
        congested: 15, // 擁堵閾值
      },

      // 方向性流量偏好 - 特定路線
      directionBias: {
        all: { east: 0.8, west: 1.2, north: 0.9, south: 1.1 },
      },

      // 時段特性
      characteristics: {
        description: '深夜凌晨時段，車流稀少，以機車為主要交通工具',
        avgSpeed: 45,
        peakMultiplier: 0.3,
        congestionTolerance: 'low',
      },
    },
  },
])

// 當前時間顯示
const currentTimeDisplay = computed(() => {
  const now = new Date()
  return now.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
})

// 系統狀態文字
const systemStatusText = computed(() => {
  if (!isSystemRunning.value) return '已停止'
  return isAutoTimeMode.value ? '自動模式' : '手動模式'
})

// 根據當前時間自動判斷場景
// 移除自動時間場景判斷函數，改為純手動模式
// 用戶可以直接點選任何情境按鈕來切換流量場景

// 切換到指定時段場景
const switchToTimeScenario = (scenarioKey) => {
  const scenario = timeScenarios.value.find((s) => s.key === scenarioKey)
  if (!scenario) return

  currentTimeScenario.value = scenarioKey

  // 移除自動時間檢測邏輯，純手動選擇模式
  // 點選任何情境按鈕都會直接切換到該情境

  // 應用場景配置到自動交通產生器
  if (window.autoTrafficGenerator) {
    window.autoTrafficGenerator.updateConfig(scenario.config)
    currentInterval.value = scenario.config.interval.normal / 1000

    // 重置統計計數器（切換場景時重新開始計算）
    // totalGenerated.value = 0
  }

  $q.notify({
    type: 'positive',
    message: `已切換到 ${scenario.name} 場景`,
    position: 'top',
    timeout: 1500,
  })

  console.log(`🕐 時段場景切換: ${scenario.name}`, scenario.config)
}

// 切換自動時段模式 (已移除，改為純手動模式)
// 所有場景切換都通過手動點選按鈕進行
/*
const toggleAutoTimeMode = () => {
  // 移除自動時間邏輯，保持手動模式
  isAutoTimeMode.value = false

  $q.notify({
    type: 'info',
    message: '使用手動控制模式 - 請點選情境按鈕切換',
    position: 'top',
    timeout: 1500,
  })
}
*/

// 手動頻率調整
const updateManualFrequency = () => {
  if (isAutoTimeMode.value) return

  const interval = {
    min: manualFrequency.value * 600,
    max: manualFrequency.value * 1200,
    normal: manualFrequency.value * 1000,
  }

  if (window.autoTrafficGenerator) {
    window.autoTrafficGenerator.updateConfig({ interval })
    currentInterval.value = manualFrequency.value
  }
}

// 自動時段檢查定時器
const autoTimeCheckInterval = ref(null)

// 移除自動時段檢查 (改為純手動模式)
const startAutoTimeCheck = () => {
  // 不再需要自動時段檢查，所有切換都通過手動操作
  console.log('使用手動模式，無需自動時段檢查')
}

// 停止自動時段檢查
const stopAutoTimeCheck = () => {
  if (autoTimeCheckInterval.value) {
    clearInterval(autoTimeCheckInterval.value)
    autoTimeCheckInterval.value = null
  }
}

// 從 TrafficLightController 獲取配置數據
const getTrafficControllerConfig = () => {
  if (window.trafficController) {
    return {
      scenarioPresets: window.trafficController.getScenarioPresets(),
      intersectionOptions: window.trafficController.getIntersectionOptions(),
      scenarioOptions: window.trafficController.getScenarioOptions(),
    }
  }

  // 後備配置（如果 TrafficLightController 尚未初始化）
  return {
    scenarioPresets: {
      smooth: { motorcycle: 2, small: 4, large: 1 },
      一般: { motorcycle: 5, small: 8, large: 3 },
      congested: { motorcycle: 10, small: 15, large: 6 },
    },
    intersectionOptions: [
      { label: '東向路口', value: 'east' },
      { label: '西向路口', value: 'west' },
      { label: '南向路口', value: 'south' },
      { label: '北向路口', value: 'north' },
    ],
    scenarioOptions: [
      { label: '流暢', value: 'smooth' },
      { label: '一般', value: '一般' },
      { label: '擁擠', value: 'congested' },
    ],
  }
}

// 響應式配置數據 - 暫時保留供後續使用
const config = computed(() => getTrafficControllerConfig())
const scenarioPresets = computed(() => config.value.scenarioPresets)

// 從 TrafficDataCollector 獲取即時交通數據
const getTrafficData = (direction) => {
  // 觸發響應式更新（使用 forceUpdateTrigger）
  forceUpdateTrigger.value

  // 優先使用數據收集器的即時數據
  if (window.trafficDataCollector) {
    const realTimeData = window.trafficDataCollector.getRealTimeData()

    if (realTimeData && realTimeData.totalCount && realTimeData.totalCount[direction]) {
      const directionData = realTimeData.totalCount[direction]
      const speedData = realTimeData.averageSpeed[direction]
      const occupancy = realTimeData.occupancy[direction]

      return {
        averageSpeed: speedData.overall || 0,
        occupancy: occupancy || 0,
        motorFlow: directionData.motor || 0,
        smallCarFlow: directionData.small || 0,
        largeCarFlow: directionData.large || 0,
        motorSpeed: speedData.motor || 0,
        smallCarSpeed: speedData.small || 0,
        largeCarSpeed: speedData.large || 0,
      }
    }
  }

  // 後備：使用 TrafficLightController 的數據（僅累加數據）
  if (window.trafficController) {
    const vehicleData = window.trafficController.getDirectionVehicleData(direction)
    if (vehicleData) {
      // 使用 TrafficLightController 的方法計算各項數據
      const averageSpeed = window.trafficController.getAverageSpeed
        ? window.trafficController.getAverageSpeed(direction, 'small')
        : 30
      const occupancy = window.trafficController.calculateOccupancy
        ? parseFloat(window.trafficController.calculateOccupancy(direction))
        : 22

      return {
        averageSpeed: Math.round(averageSpeed),
        occupancy: Math.round(occupancy * 10) / 10,
        motorFlow: vehicleData.motor || 0,
        smallCarFlow: vehicleData.small || 0,
        largeCarFlow: vehicleData.large || 0,
        motorSpeed: window.trafficController.getAverageSpeed
          ? Math.round(window.trafficController.getAverageSpeed(direction, 'motor'))
          : 35,
        smallCarSpeed: window.trafficController.getAverageSpeed
          ? Math.round(window.trafficController.getAverageSpeed(direction, 'small'))
          : 30,
        largeCarSpeed: window.trafficController.getAverageSpeed
          ? Math.round(window.trafficController.getAverageSpeed(direction, 'large'))
          : 22,
      }
    }
  }

  // 預設數據（如果兩個系統都尚未初始化）
  return {
    averageSpeed: 0,
    occupancy: 0,
    motorFlow: 0,
    smallCarFlow: 0,
    largeCarFlow: 0,
    motorSpeed: 0,
    smallCarSpeed: 0,
    largeCarSpeed: 0,
  }
}

// 各方向的交通數據
const eastData = computed(() => getTrafficData('east'))
const westData = computed(() => getTrafficData('west'))
const southData = computed(() => getTrafficData('south'))
const northData = computed(() => getTrafficData('north'))

// 數據更新定時器
const dataUpdateInterval = ref(null)
const forceUpdateTrigger = ref(0) // 強制更新觸發器

// 開始數據更新定時器
const startDataUpdate = () => {
  if (dataUpdateInterval.value) {
    clearInterval(dataUpdateInterval.value)
  }

  dataUpdateInterval.value = setInterval(() => {
    // 觸發響應式數據更新
    if (window.trafficController) {
      console.log('🔄 更新交通數據顯示')
      // 強制觸發響應式更新
      forceUpdateTrigger.value++
    }
  }, 3000) // 每3秒更新一次
}

// 停止數據更新定時器
const stopDataUpdate = () => {
  if (dataUpdateInterval.value) {
    clearInterval(dataUpdateInterval.value)
    dataUpdateInterval.value = null
  }
}

// 場景預設監聽器
watch(selectedScenario, (newScenario) => {
  const currentPresets = scenarioPresets.value
  if (currentPresets[newScenario]) {
    const preset = currentPresets[newScenario]
    motorcycleCount.value = preset.motorcycle
    smallCarCount.value = preset.small
    largeCarCount.value = preset.large
    console.log(`🎯 場景已切換至: ${newScenario}`, preset)
  }
})

// 監聽車輛變化事件
const listenForVehicleChanges = () => {
  // 監聽車輛添加事件
  const handleVehicleChange = () => {
    console.log('🚗 車輛狀態變化，觸發數據更新')
    forceUpdateTrigger.value++
  }

  // 監聽數據收集器的數據更新事件
  const handleTrafficDataUpdate = () => {
    console.log('📊 交通數據已更新，觸發UI更新')
    forceUpdateTrigger.value++
  }

  // 監聽AI週期相關事件
  const handleTrafficCycleReset = (event) => {
    console.log('🔄 AI週期重置，重新整理數據顯示', event.detail)
    forceUpdateTrigger.value++
    // 可以在這裡重置總生成計數器
    totalGenerated.value = 0
  }

  const handleTrafficApiSending = (event) => {
    console.log('🚀 API發送中...', event.detail)
    // 可以顯示載入狀態
  }

  const handleTrafficApiComplete = (event) => {
    console.log('✅ API響應完成', event.detail)
    forceUpdateTrigger.value++
  }

  const handleTrafficApiError = (event) => {
    console.log('❌ API發送失敗', event.detail)
  }

  // 添加事件監聽器
  window.addEventListener('vehicleAdded', handleVehicleChange)
  window.addEventListener('vehicleRemoved', handleVehicleChange)
  window.addEventListener('trafficDataChanged', handleVehicleChange)
  window.addEventListener('trafficDataUpdated', handleTrafficDataUpdate)
  window.addEventListener('trafficCycleReset', handleTrafficCycleReset)
  window.addEventListener('trafficApiSending', handleTrafficApiSending)
  window.addEventListener('trafficApiComplete', handleTrafficApiComplete)
  window.addEventListener('trafficApiError', handleTrafficApiError)

  return () => {
    window.removeEventListener('vehicleAdded', handleVehicleChange)
    window.removeEventListener('vehicleRemoved', handleVehicleChange)
    window.removeEventListener('trafficDataChanged', handleVehicleChange)
    window.removeEventListener('trafficDataUpdated', handleTrafficDataUpdate)
    window.removeEventListener('trafficCycleReset', handleTrafficCycleReset)
    window.removeEventListener('trafficApiSending', handleTrafficApiSending)
    window.removeEventListener('trafficApiComplete', handleTrafficApiComplete)
    window.removeEventListener('trafficApiError', handleTrafficApiError)
  }
}

// 全域交通控制器設定
onMounted(() => {
  // 設置全域 trafficController 以供其他組件使用 - 預測回調由IndexPage處理

  // 當 TrafficController 初始化後，打印系統狀態
  setTimeout(() => {
    if (window.trafficController) {
      console.log('🎛️ MainLayout: TrafficController 已連接')
      window.trafficController.printSystemStatus()
    }
  }, 1000)

  // 啟動數據更新定時器
  startDataUpdate()

  // 監聽車輛變化事件
  const removeVehicleListeners = listenForVehicleChanges()

  // 初始化時段場景系統 (改為手動模式)
  setTimeout(() => {
    // 移除自動時間邏輯，直接設置為正常情境
    switchToTimeScenario('normal')

    // 啟動手動模式 (不需要自動時段檢查)
    startAutoTimeCheck()

    // 監聽車輛生成統計
    const handleVehicleGenerated = () => {
      totalGenerated.value++
      console.log(`🚗 車輛統計更新: ${totalGenerated.value}`)
    }
    window.addEventListener('vehicleAdded', handleVehicleGenerated)

    console.log('🕐 時段場景系統已初始化')

    // 保存統計監聽器清理函數
    window.vehicleStatsCleanup = () => {
      window.removeEventListener('vehicleAdded', handleVehicleGenerated)
    }
  }, 1500)

  // 保存清理函數
  window.mainLayoutCleanup = removeVehicleListeners
})

// 組件卸載時清理資源
onUnmounted(() => {
  stopDataUpdate()

  // 清理時段場景系統
  stopAutoTimeCheck()

  // 清理車輛統計監聽器
  if (window.vehicleStatsCleanup) {
    window.vehicleStatsCleanup()
  }

  // 清理車輛事件監聽器
  if (window.mainLayoutCleanup) {
    window.mainLayoutCleanup()
  }
})

// 計算當前路由
const currentRoute = computed(() => route.path)

// 響應式側邊欄寬度
const drawerWidth = computed(() => {
  if ($q.screen.xs) return 280 // 手機
  if ($q.screen.sm) return 350 // 平板
  if ($q.screen.md) return 450 // 小型筆電
  if ($q.screen.lg) return 550 // 桌機
  return 600 // 大螢幕
})

// 計算光環位置
const lightPosition = computed(() => {
  if (rightDrawerOpen.value && $q.screen.gt.md) {
    // 側邊欄展開時，光環位置需要偏左
    return '35% 50%'
  }
  // 側邊欄收合時，光環在正中央
  return '50% 50%'
})

const toggleRightDrawer = () => {
  rightDrawerOpen.value = !rightDrawerOpen.value
}

const navigateToSimulation = () => {
  router.push('/')
}

const navigateToVisualization = () => {
  router.push('/visualization')
}
</script>

<style>
.q-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}
.q-drawer {
  background: transparent !important;
  border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.q-page-container {
  box-shadow: inset 0 0 50px 25px rgba(0, 0, 0, 0.5) !important;
  background-image:
    linear-gradient(45deg, rgba(0, 0, 30, 0.3) 0%, rgb(0, 0, 70) 100%),
    radial-gradient(
      circle at var(--light-position, 50% 50%),
      rgba(0, 30, 120, 1) 0%,
      rgba(0, 15, 100, 1) 8%,
      rgba(0, 15, 100, 0.5) 15%,
      rgb(0, 0, 30) 30%
    );
  transition: background-image 0.3s ease;
}

.drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 0 10px 0;
}

/* 場景參數設定 - 響應式 */
.set-window-section {
  background-image: url('/images/setWindow.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  height: clamp(180px, 25vh, 250px);
  position: relative;
  border-radius: 8px;
  min-height: 150px;
}

.section-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0px 10px;
  display: flex;
  align-items: flex-start;
  padding-top: 45px;
}

/* 智能時段自動分派系統 - 緊湊版 600px × 180px */
.compact-dispatch-system {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: white;
  font-size: 11px;
  gap: 8px;
  padding: 8px 12px;
}

.system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  flex-shrink: 0;
}

.system-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.system-title {
  font-size: 13px;
  font-weight: bold;
  color: white;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #666;
  transition: all 0.3s;
}

.system-status.active .status-dot {
  background: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.8);
}

.status-text {
  color: rgba(255, 255, 255, 0.9);
}

.current-time {
  font-size: 12px;
  color: #81c784;
  font-weight: bold;
  padding: 3px 8px;
  background: rgba(129, 199, 132, 0.2);
  border-radius: 4px;
}

/* 時段場景快速切換 - 緊湊版 */
.time-scenarios-compact {
  display: flex;
  gap: 4px;
  height: 50px;
  flex-shrink: 0;
}

.scenario-btn-compact {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 2px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 9px;
  position: relative;
}

.scenario-btn-compact:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.scenario-btn-compact.active {
  background: rgba(100, 181, 246, 0.25);
  border-color: #64b5f6;
  box-shadow: 0 0 8px rgba(100, 181, 246, 0.4);
}

.scenario-btn-compact.auto {
  background: rgba(129, 199, 132, 0.25);
  border-color: #81c784;
  box-shadow: 0 0 8px rgba(129, 199, 132, 0.4);
}

.scenario-btn-compact.auto::after {
  content: '🤖';
  position: absolute;
  top: -2px;
  right: -2px;
  font-size: 8px;
  background: rgba(129, 199, 132, 0.8);
  border-radius: 50%;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scenario-icon {
  font-size: 14px;
  line-height: 1;
}

.scenario-name {
  font-weight: bold;
  font-size: 9px;
  line-height: 1;
  text-align: center;
}

/* 控制與統計行 - 緊湊版 */
.control-stats-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  flex-shrink: 0;
}

.auto-toggle-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 9px;
  flex-shrink: 0;
}

.auto-toggle-compact:hover {
  background: rgba(255, 255, 255, 0.2);
}

.auto-toggle-compact.active {
  background: rgba(129, 199, 132, 0.3);
  border-color: #81c784;
  box-shadow: 0 0 6px rgba(129, 199, 132, 0.4);
}

.toggle-icon {
  font-size: 10px;
}

.toggle-label {
  font-weight: bold;
  font-size: 9px;
}

/* 頻率控制 - 緊湊版 */
.frequency-control {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 4px 8px;
  flex: 1;
  min-width: 0;
}

.freq-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.freq-slider {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  appearance: none;
  min-width: 60px;
}

.freq-slider::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  background: #64b5f6;
  border-radius: 50%;
  cursor: pointer;
}

.freq-value {
  font-size: 9px;
  color: #81c784;
  font-weight: bold;
  min-width: 20px;
  text-align: right;
  flex-shrink: 0;
}

/* 統計資訊 - 緊湊版 */
.stats-compact {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 35px;
}

.stat-label {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1;
}

.stat-value {
  font-size: 10px;
  color: #64b5f6;
  font-weight: bold;
  line-height: 1;
}

/* 響應式調整 - 確保在小螢幕上仍然可用 */
@media (max-width: 1024px) {
  .compact-dispatch-system {
    font-size: 10px;
    gap: 6px;
    padding: 6px 8px;
  }

  .time-scenarios-compact {
    gap: 3px;
    height: 45px;
  }

  .scenario-btn-compact {
    font-size: 8px;
    padding: 3px 1px;
  }

  .scenario-icon {
    font-size: 12px;
  }

  .scenario-name {
    font-size: 8px;
  }

  .control-stats-row {
    gap: 6px;
    height: 28px;
  }

  .frequency-control {
    padding: 3px 6px;
  }

  .stat-item {
    min-width: 30px;
  }
}

@media (max-width: 768px) {
  .compact-dispatch-system {
    font-size: 9px;
    gap: 4px;
    padding: 4px 6px;
  }

  .system-header {
    height: 20px;
  }

  .system-title {
    font-size: 11px;
  }

  .current-time {
    font-size: 10px;
    padding: 2px 6px;
  }

  .time-scenarios-compact {
    gap: 2px;
    height: 40px;
  }

  .scenario-btn-compact {
    font-size: 7px;
    padding: 2px 1px;
  }

  .scenario-icon {
    font-size: 10px;
  }

  .control-stats-row {
    gap: 4px;
    height: 24px;
  }

  .auto-toggle-compact {
    padding: 3px 6px;
  }

  .toggle-icon {
    font-size: 8px;
  }

  .toggle-label {
    font-size: 8px;
  }

  .frequency-control {
    padding: 2px 4px;
    gap: 4px;
  }

  .stat-item {
    min-width: 25px;
  }

  .stat-label {
    font-size: 7px;
  }

  .stat-value {
    font-size: 9px;
  }
}

/* 展示數據區域 - 響應式 */
.data-section {
  position: relative;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 200px;
  overflow: hidden;
}

/* 按鈕區域 - 響應式 */
.data-section-buttons {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  flex-shrink: 0;
  z-index: 2;
  position: relative;
}

/* 數據顯示區域 - 響應式 */
.data-section-content {
  flex: 1;
  background-image: url('/images/dataBg.png');
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 150px;
  border-radius: 0 0 8px 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative; /* 為絕對定位的子元素提供參考點 */
}

/* 交通數據網格佈局 */
.traffic-data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 5px 10px;
}

/* 交通區域樣式 */
.traffic-zone {
  padding: 5px 10px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* 各區域微調位置 */
.east-zone {
  position: relative;
  top: 0px;
  left: -3px;
}

.west-zone {
  position: relative;
  top: 0px;
  left: 13px;
}

.south-zone {
  position: relative;
  top: 42px;
  left: -4px;
}

.north-zone {
  position: relative;
  top: 42px;
  left: 14px;
}

/* 區域數據 */
.zone-data {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* padding-top: 5px; */
}

/* 數據行 */
.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 10px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.data-row.main-stats {
  font-weight: bold;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.data-row.speed-stat {
  font-size: 12px;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 2px;
  opacity: 1;
}

.data-label {
  color: white;
  flex: 1;
}

.data-value {
  color: white;
  font-weight: 600;
  text-align: right;
  min-width: 50px;
  font-size: 13px;
}

.main-stats .data-value {
  color: white;
  font-size: 13px;
}

.control-button {
  width: clamp(150px, 45%, 150px);
  cursor: pointer;
  transition: opacity 0.3s ease;
  margin-bottom: -1px;
  height: auto;
  max-height: 50px;
}

.control-button:hover {
  opacity: 0.8;
}

/* 側邊欄響應式 */
@media (max-width: 1024px) {
  .set-window-section {
    height: clamp(150px, 20vh, 200px);
  }

  .control-button {
    width: clamp(100px, 40%, 120px);
  }
}

@media (max-width: 768px) {
  .drawer-content {
    padding: 8px;
  }

  .data-section-buttons {
    justify-content: center;
  }

  .control-button {
    width: clamp(80px, 35%, 100px);
    max-height: 40px;
  }
}

@media (max-width: 480px) {
  .set-window-section {
    height: clamp(120px, 15vh, 150px);
  }

  .control-button {
    width: clamp(60px, 30%, 80px);
    max-height: 30px;
  }
}

/* Header 響應式設計 */
.header-toolbar {
  position: relative;
  min-height: 50px;
}

.q-toolbar-title img {
  max-width: 100%;
  height: auto;
}

.header-nav-buttons {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.nav-button {
  height: 40px;
  width: auto;
  cursor: pointer;
  transition: opacity 0.3s ease;
  max-width: 120px;
}

.nav-button:hover {
  opacity: 0.8;
}

/* 響應式斷點 */
@media (max-width: 1024px) {
  .header-nav-buttons {
    gap: 5px;
  }

  .nav-button {
    height: 35px;
    max-width: 100px;
  }

  .q-toolbar-title img {
    width: 150px;
  }

  /* 數據區域響應式調整 */
  .traffic-data-grid {
    gap: 10px;
    min-height: 250px;
  }

  .traffic-zone {
    padding: 8px;
  }

  .data-row {
    font-size: 11px;
  }

  .data-row.main-stats {
    font-size: 11px;
  }

  .data-row.speed-stat {
    font-size: 11px;
  }
}

@media (max-width: 768px) {
  .header-nav-buttons {
    position: static;
    transform: none;
    margin: 0 auto;
  }

  .nav-button {
    height: 30px;
    max-width: 80px;
  }

  .q-toolbar-title img {
    width: 120px;
  }

  .header-toolbar {
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 10px;
  }

  /* 數據區域響應式調整 */
  .traffic-data-grid {
    gap: 8px;
    min-height: 200px;
  }

  .traffic-zone {
    padding: 6px;
  }

  .data-row {
    font-size: 10px;
    padding: 2px 0;
  }

  .data-row.main-stats {
    font-size: 10px;
    padding: 3px 4px;
  }

  .data-row.speed-stat {
    font-size: 10px;
  }

  .data-value {
    min-width: 40px;
  }
}

@media (max-width: 480px) {
  .q-toolbar-title img {
    width: 100px;
  }

  .nav-button {
    height: 25px;
    max-width: 60px;
  }

  /* 小螢幕數據區域調整 */
  .traffic-data-grid {
    gap: 6px;
    min-height: 180px;
  }

  .traffic-zone {
    padding: 4px;
  }

  .data-row {
    font-size: 9px;
    padding: 1px 0;
  }

  .data-row.main-stats {
    font-size: 9px;
    padding: 2px 3px;
  }

  .data-row.speed-stat {
    font-size: 9px;
  }

  .data-value {
    min-width: 35px;
  }

  .main-stats .data-value {
    font-size: 9px;
  }
}
</style>
