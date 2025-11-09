<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="text-white bg-transparent">
      <q-toolbar class="header-toolbar">
        <q-toolbar-title>
          <div
            @mouseenter.stop="showLumoTooltip('logo')"
            @mouseleave.stop="hideLumoTooltip"
            style="pointer-events: auto; cursor: auto; display: inline-block"
          >
            <img src="/images/logo.png" width="200" alt="AI 智慧交通控制系統" />
            <span class="ai-gradient animate"> / 智慧綠燈控 &nbsp;AI 算你行 /</span>
          </div>
        </q-toolbar-title>

        <!-- 中間切換按鈕 -->
        <div class="header-nav-buttons">
          <img
            :src="currentRoute === '/' ? '/images/button/simBtnOn.png' : '/images/button/simBtnOff.png'"
            alt="場景模擬"
            class="nav-button"
            @click="navigateToSimulation"
            @mouseenter="showLumoTooltip('simulationBtn')"
            @mouseleave="hideLumoTooltip"
          />
          <img
            :src="
              currentRoute.startsWith('/visualization')
                ? '/images/button/VisualBtnOn.png'
                : '/images/button/VisualBtnOff.png'
            "
            alt="視覺化數據"
            class="nav-button"
            @click="navigateToVisualization"
            @mouseenter="showLumoTooltip('visualizationBtn')"
            @mouseleave="hideLumoTooltip"
          />
        </div>

        <!-- 💡 Tooltip 開關按鈕 (單顆按鈕) -->
        <q-btn
          dense
          flat
          round
          :icon="isTooltipEnabled ? 'lightbulb' : 'lightbulb_outline'"
          @click="toggleTooltip"
          class="tooltip-btn-single"
          :title="isTooltipEnabled ? '關閉 Lumo 提示' : '開啟 Lumo 提示'"
          @mouseenter="showLumoTooltip('tooltipToggle')"
          @mouseleave="hideLumoTooltip"
        />

        <!-- 進入後台管理 Icon -->
        <q-btn
          dense
          flat
          round
          icon="settings"
          @click="navigateToAdmin"
          class="admin-btn"
          title="進入後台管理"
          @mouseenter="showLumoTooltip('adminBtn')"
          @mouseleave="hideLumoTooltip"
        />

        <q-btn
          dense
          flat
          round
          icon="menu"
          @click="toggleRightDrawer"
          @mouseenter="showLumoTooltip('menuBtn')"
          @mouseleave="hideLumoTooltip"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="rightDrawerOpen"
      side="right"
      bordered
      class="bg-transparent"
      :width="drawerWidth"
      :breakpoint="1024"
      elevated
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
                  <div class="status-dot"></div>
                  <q-btn
                    @click="toggleAutoMode"
                    size="sm"
                    class="mode-toggle-btn"
                    :label="isAutoMode ? '每日自動模式' : '情境手動模式'"
                    @mouseenter="showLumoTooltip('modeToggle')"
                    @mouseleave="hideLumoTooltip"
                  >
                  </q-btn>
                </div>
              </div>

              <!-- 自動模式狀態顯示 -->
              <div class="simulation-status" v-if="isAutoMode">
                <span class="time-status">{{ simulationStatus || '⏳ 正在初始化自動模式...' }}</span>
              </div>

              <!-- 🎯【新增】VD 情景選擇 - 3 個時段按鈕 -->
              <!-- peak_hours、off_peak、late_night -->
              <div class="vd-scenario-selector">
                <button
                  @click="selectVDScenario('peak_hours')"
                  :class="['vd-scenario-btn', { active: selectedVDScenario === 'peak_hours' }]"
                  :disabled="isAutoMode"
                  title="尖峰時段 (07-09, 17-19)"
                  @mouseenter="showLumoTooltip('peakHours')"
                  @mouseleave="hideLumoTooltip"
                >
                  <div class="vd-scenario-icon">🚀</div>
                  <div class="vd-scenario-label">尖峰</div>
                </button>
                <button
                  @click="selectVDScenario('off_peak')"
                  :class="['vd-scenario-btn', { active: selectedVDScenario === 'off_peak' }]"
                  :disabled="isAutoMode"
                  title="離峰時段 (10-16, 20-23)"
                  @mouseenter="showLumoTooltip('offPeak')"
                  @mouseleave="hideLumoTooltip"
                >
                  <div class="vd-scenario-icon">🌞</div>
                  <div class="vd-scenario-label">離峰</div>
                </button>
                <button
                  @click="selectVDScenario('late_night')"
                  :class="['vd-scenario-btn', { active: selectedVDScenario === 'late_night' }]"
                  :disabled="isAutoMode"
                  title="凌晨時段 (00-06)"
                  @mouseenter="showLumoTooltip('lateNight')"
                  @mouseleave="hideLumoTooltip"
                >
                  <div class="vd-scenario-icon">🌙</div>
                  <div class="vd-scenario-label">凌晨</div>
                </button>
              </div>

              <!-- 當前情境參數顯示 -->
              <div v-if="currentScenarioDetails && !isAutoMode" class="scenario-details">
                <div class="detail-item">
                  <span class="detail-label">頻率（秒）：</span>
                  <span class="detail-value"
                    >{{ currentScenarioDetails.interval.min / 1000 }} /
                    {{ currentScenarioDetails.interval.max / 1000 }}</span
                  >
                </div>
                <div class="detail-item">
                  <span class="detail-label">機/小/大 出現機率（%）：</span>
                  <span class="detail-value">{{ currentScenarioDetails.ratios }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">實際生成間隔（秒）：</span>
                  <span class="detail-value">{{ (manualInterval / 1000).toFixed(1) }}</span>
                </div>
              </div>

              <!-- 控制與統計 -->
              <div class="control-stats-row">
                <div class="frequency-control">
                  <span class="freq-label">生成間隔</span>
                  <input
                    type="range"
                    v-model="manualInterval"
                    min="1000"
                    max="30000"
                    :step="100"
                    @input="onSliderInput"
                    class="freq-slider"
                    style="flex: 1"
                    :disabled="isAutoMode"
                  />
                  <span class="freq-value">{{ (manualInterval / 1000).toFixed(1) }}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 特徵模擬數據 -->
        <div class="data-section">
          <div class="data-section-buttons">
            <div class="top-buttons">
              <img src="/images/button/setDataBtnOn.png" alt="特徵模擬數據" class="control-button" />
            </div>
          </div>
          <div class="data-section-content" @mouseenter="showLumoTooltip('dataSection')" @mouseleave="hideLumoTooltip">
            <div class="traffic-data-grid">
              <!-- Data cells... -->
              <div class="traffic-zone east-zone">
                <div class="zone-title">往東 (VLRJX20)</div>
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value"> {{ eastData.averageSpeed }} km/h </span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value"> {{ eastData.occupancy.toFixed(1) }}% </span>
                  </div>
                  <!-- 機車流量 -->
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value"> {{ eastData.motorFlow }} 輛 </span>
                  </div>
                  <!-- 小型車流量 -->
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value"> {{ eastData.smallCarFlow }} 輛 </span>
                  </div>
                  <!-- 大型車流量 -->
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value"> {{ eastData.largeCarFlow }} 輛 </span>
                  </div>
                  <!-- 機車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value"> {{ eastData.motorSpeed }} km/h </span>
                  </div>
                  <!-- 小型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value"> {{ eastData.smallCarSpeed }} km/h </span>
                  </div>
                  <!-- 大型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value"> {{ eastData.largeCarSpeed }} km/h </span>
                  </div>
                </div>
              </div>

              <!-- 右上：往西 -->
              <div class="traffic-zone west-zone">
                <div class="zone-title">往西 (VLRJM60)</div>
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value"> {{ westData.averageSpeed }} km/h </span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value"> {{ westData.occupancy.toFixed(1) }}% </span>
                  </div>
                  <!-- 機車流量 -->
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value"> {{ westData.motorFlow }} 輛 </span>
                  </div>
                  <!-- 小型車流量 -->
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value"> {{ westData.smallCarFlow }} 輛 </span>
                  </div>
                  <!-- 大型車流量 -->
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value"> {{ westData.largeCarFlow }} 輛 </span>
                  </div>
                  <!-- 機車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value"> {{ westData.motorSpeed }} km/h </span>
                  </div>
                  <!-- 小型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value"> {{ westData.smallCarSpeed }} km/h </span>
                  </div>
                  <!-- 大型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value"> {{ westData.largeCarSpeed }} km/h </span>
                  </div>
                </div>
              </div>

              <!-- 左下：往南 -->
              <div class="traffic-zone south-zone">
                <div class="zone-title">往南 (VLRJX00)</div>
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value"> {{ southData.averageSpeed }} km/h </span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value"> {{ southData.occupancy.toFixed(1) }}% </span>
                  </div>
                  <!-- 機車流量 -->
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value"> {{ southData.motorFlow }} 輛 </span>
                  </div>
                  <!-- 小型車流量 -->
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value"> {{ southData.smallCarFlow }} 輛 </span>
                  </div>
                  <!-- 大型車流量 -->
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value"> {{ southData.largeCarFlow }} 輛 </span>
                  </div>
                  <!-- 機車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value"> {{ southData.motorSpeed }} km/h </span>
                  </div>
                  <!-- 小型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value"> {{ southData.smallCarSpeed }} km/h </span>
                  </div>
                  <!-- 大型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value"> {{ southData.largeCarSpeed }} km/h </span>
                  </div>
                </div>
              </div>

              <!-- 右下：往北 -->
              <div class="traffic-zone north-zone">
                <div class="zone-title">往北 (VLRJX00)</div>
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value"> {{ northData.averageSpeed }} km/h </span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value"> {{ northData.occupancy.toFixed(1) }}% </span>
                  </div>
                  <!-- 機車流量 -->
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value"> {{ northData.motorFlow }} 輛 </span>
                  </div>
                  <!-- 小型車流量 -->
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value"> {{ northData.smallCarFlow }} 輛 </span>
                  </div>
                  <!-- 大型車流量 -->
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value"> {{ northData.largeCarFlow }} 輛 </span>
                  </div>
                  <!-- 機車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value"> {{ northData.motorSpeed }} km/h </span>
                  </div>
                  <!-- 小型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value"> {{ northData.smallCarSpeed }} km/h </span>
                  </div>
                  <!-- 大型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value"> {{ northData.largeCarSpeed }} km/h </span>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'
import { useSimulationStore } from 'src/stores/simulationStore'
import { timeScenarios } from 'src/classes/config/trafficScenarioConfig.js'
import { VD_DISPLAY_CONFIG } from 'src/classes/config/vdDisplayConfig.js'

// 🎛️ 統一初始化常數 - 只需改這一個地方！
// 選項: 'peak_hours' | 'off_peak' | 'late_night'
const INITIAL_VD_SCENARIO = 'off_peak' // ← 改這裡快速切換預設情景

const router = useRouter()
const route = useRoute()

// 新增：自動模式狀態
const isAutoMode = ref(false)
const simulationStatus = ref(null)
const currentAutoInterval = ref(null)

function navigateToSimulation() {
  router.push('/')
}

function navigateToVisualization() {
  router.push('/visualization')
}

function navigateToAdmin() {
  // 開啟新視窗進入後台
  window.open('http://127.0.0.1:8000/admin', '_blank')
}

/**
 * Lumo 功能介紹系統
 * 在滑鼠移過按鈕/介面時，觸發 Lumo 顯示功能說明對話框
 */

// 💡 獲取 tooltip 訊息的輔助函數 - 支援配置鍵或直接訊息
function getTooltipMessage(messageOrKey) {
  // 如果是字符串且不含空格和特殊字符 (像是一個鍵)，嘗試從配置中獲取
  if (typeof messageOrKey === 'string' && !messageOrKey.includes('：') && window.lumoConfig?.tooltips) {
    const configValue = window.lumoConfig.tooltips[messageOrKey]
    if (configValue) {
      // if (process.env.DEV) console.log(`💬 [Tooltip] 使用配置: ${messageOrKey} => ${configValue.substring(0, 30)}...`)
      return configValue
    }
  }

  // 否則直接返回訊息
  return messageOrKey
}

function showLumoTooltip(messageOrKey) {
  // ✅ 【關鍵修復】檢查 Tooltip 是否啟用
  if (!isTooltipEnabled.value) {
    return // 如果 Tooltip 關閉，直接返回，不顯示任何訊息
  }

  const message = getTooltipMessage(messageOrKey)

  if (!message) {
    if (process.env.DEV) console.warn('⚠️ [Tooltip] 訊息為空，跳過顯示')
    return
  }

  if (window.lumoTooltipManager) {
    window.lumoTooltipManager.show(message)
  } else {
    if (process.env.DEV) console.warn('⚠️ [Tooltip] lumoTooltipManager 未初始化')
  }
}

function hideLumoTooltip() {
  if (window.lumoTooltipManager) {
    window.lumoTooltipManager.hide()
  }
}

// 💡 Tooltip 開關狀態 - 預設關閉，避免滑鼠移過時顯示訊息
const isTooltipEnabled = ref(false)

// 💡 切換 Tooltip 顯示
function toggleTooltip() {
  isTooltipEnabled.value = !isTooltipEnabled.value
  if (window.lumoTooltipManager) {
    window.lumoTooltipManager.isTooltipEnabled = isTooltipEnabled.value
  }
  if (process.env.DEV) console.log(`💡 [MainLayout] Lumo Tooltip ${isTooltipEnabled.value ? '已開啟' : '已關閉'}`)
}

const currentRoute = computed(() => route.path)

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value
}

const rightDrawerOpen = ref(true)
const $q = useQuasar()

// ✅ 從全局恢復側邊欄狀態（支持熱重載）
// 如果全局狀態存在，使用它；否則默認為 true（打開）
if (typeof window !== 'undefined' && window.drawerState !== undefined) {
  rightDrawerOpen.value = window.drawerState
  if (process.env.DEV) console.log(`✅ [MainLayout] 從全局恢復側邊欄狀態: ${window.drawerState}`)
} else if (typeof window !== 'undefined') {
  // 確保全局狀態被初始化為 true
  window.drawerState = true
  if (process.env.DEV) console.log('✅ [MainLayout] 初始化全局側邊欄狀態為 true')
}

// ✅ 監視側邊欄狀態變化，保存到全局
watch(rightDrawerOpen, (newValue) => {
  if (typeof window !== 'undefined') {
    window.drawerState = newValue
  }
  if (process.env.DEV) console.log(`📌 [MainLayout] 側邊欄狀態已保存: ${newValue}`)
})

// 🎯【新增】VD 情景選擇狀態
const selectedVDScenario = ref(INITIAL_VD_SCENARIO)

// 🎯【新增】VD 情景選擇函數
function selectVDScenario(scenario) {
  selectedVDScenario.value = scenario
  currentTimeScenario.value = scenario // 🔧 同時更新當前情景
  if (process.env.DEV) console.log(`🚀 [MainLayout] 選擇 VD 情景: ${scenario}`)

  // 將選擇存儲到全局，供 TrafficLightController 使用
  window.selectedTrafficScenario = scenario
  window.selectedTrafficTimePeriod = scenario

  // 如果有 AutoTrafficGenerator，通知它
  if (window.autoTrafficGenerator) {
    window.autoTrafficGenerator.setVDScenario(scenario)
    if (process.env.DEV) console.log(`✅ [MainLayout] AutoTrafficGenerator 已設置 VD 情景: ${scenario}`)
  }

  // 🎯 新增：按下情景按鈕時，拉桿跳到該情景的標準生成間隔值
  if (!isAutoMode.value) {
    const scenarioConfig = timeScenarios.find((s) => s.key === scenario)
    if (scenarioConfig && scenarioConfig.config.interval) {
      // 將拉桿設置為該情景的 normal 值
      manualInterval.value = scenarioConfig.config.interval.normal
      const normalValue = scenarioConfig.config.interval.normal
      const normalSec = (normalValue / 1000).toFixed(1)
      if (process.env.DEV)
        console.log(`[MainLayout] Scenario button clicked - ${scenario}, Slider moved to ${normalSec}s`)
      // 更新生成配置
      updateGenerationConfig()
    }
  }
}

const currentTimeScenario = ref(INITIAL_VD_SCENARIO)
const manualInterval = ref(2000) // ✅ 改為 2000ms (2秒) - 最低值限制
const currentInterval = ref(2.0) // ✅ 初始化為 2 秒（與 manualInterval 預設值 2000ms 一致）

// timeScenarios 已從 trafficScenarioConfig.js 匯入
// 🔄 v2.6 更新：使用 VD_DISPLAY_CONFIG 中的配置
const currentScenarioDetails = computed(() => {
  // 優先使用新配置 (vdDisplayConfig.js)
  const vdConfig = VD_DISPLAY_CONFIG[currentTimeScenario.value]
  if (vdConfig) {
    // 從 timeScenarios 中找到對應的 ratios
    const timeScenario = timeScenarios.find((s) => s.key === currentTimeScenario.value)
    const ratios = timeScenario ? timeScenario.config.vehicleTypes.map((v) => v.weight).join(' / ') : '(VD 特徵)'

    return {
      interval: {
        min: vdConfig.generation_interval * 1000, // 轉換為 ms
        max: vdConfig.generation_interval * 1000,
      },
      ratios: ratios,
      label: vdConfig.label,
      displayVolume: `${vdConfig.display_volume_min}-${vdConfig.display_volume_max}輛`,
      displayScale: `${vdConfig.display_scale}x`,
    }
  }

  // 降級：如果沒找到，用舊配置 (trafficScenarioConfig.js)
  const s = timeScenarios.find((s) => s.key === currentTimeScenario.value)
  if (!s) return null
  return {
    interval: { min: s.config.interval.min, max: s.config.interval.max },
    ratios: s.config.vehicleTypes.map((v) => v.weight).join(' / '),
  }
})

const drawerWidth = computed(() => {
  if ($q.screen.xs) return 280
  if ($q.screen.sm) return 350
  if ($q.screen.md) return 450
  if ($q.screen.lg) return 550
  return 600
})
const lightPosition = computed(() => (rightDrawerOpen.value && $q.screen.gt.md ? '35% 50%' : '50% 50%'))

// 🎯 響應式追蹤 API 數據更新
const apiDataUpdateTrigger = ref(0)

/**
 * 🎯 獲取發送到後端的 API 數據(原始 VD 數據)
 * 此函數讀取 SimulationStore 保存的 lastApiVDDataArray
 * 返回格式: 簡化的數據結構,直接用於模板顯示
 */
function getApiVDData(dir) {
  // 觸發響應式依賴追蹤
  apiDataUpdateTrigger.value

  // 預設值 (當沒有數據時返回)
  const defaultData = {
    vdId: 'N/A',
    motorFlow: 0,
    smallCarFlow: 0,
    largeCarFlow: 0,
    totalFlow: 0,
    averageSpeed: 0,
    occupancy: 0,
    motorSpeed: 0,
    smallCarSpeed: 0,
    largeCarSpeed: 0,
  }

  // 【修復】使用 SimulationStore 獲取最新的 API VD 數據
  const simulationStore = useSimulationStore()
  const lastApiVDDataArray = simulationStore.getLastApiVDDataArray()

  // 檢查是否有保存的 API 數據
  if (!lastApiVDDataArray || lastApiVDDataArray.length === 0) {
    return defaultData
  }

  // 根據方向確定索引
  let index = 0
  if (dir === 'east')
    index = 0 // VLRJX20
  else if (dir === 'west')
    index = 1 // VLRJM60
  else if (dir === 'south')
    index = 2 // VLRJX00_south
  else if (dir === 'north') index = 3 // VLRJX00_north

  const data = lastApiVDDataArray[index]
  if (!data) return defaultData

  // 🔍 調試：檢查讀取到的 Volume_L
  if (index === 0 && process.env.DEV) {
    console.log('🔍 [MainLayout] lastApiVDDataArray (from Store):', lastApiVDDataArray)
    console.log(`🔍 [MainLayout] 方向 ${dir} (index ${index}): Volume_L = ${data.Volume_L}`)
  }

  // 返回與前端顯示相同的結構(方便模板使用)
  const apiData = {
    vdId: data.VD_ID || 'N/A',
    motorFlow: Math.round(data.Volume_M || 0),
    smallCarFlow: Math.round(data.Volume_S || 0),
    largeCarFlow: Math.round(data.Volume_L || 0),
    totalFlow: Math.round(data.Volume_T || 0),
    averageSpeed: Math.round(data.Speed || 0),
    occupancy: data.Occupancy || 0,
    motorSpeed: Math.round(data.Speed_M || 0),
    smallCarSpeed: Math.round(data.Speed_S || 0),
    largeCarSpeed: Math.round(data.Speed_L || 0),
  }

  // 返回簡化的結構(只有 API 數據,沒有 before/after)
  return apiData
}

/**
 * 🎯 四個方向的 API 數據 Computed
 */
const eastData = computed(() => getApiVDData('east'))
const westData = computed(() => getApiVDData('west'))
const southData = computed(() => getApiVDData('south'))
const northData = computed(() => getApiVDData('north'))

/**
 * 🎯 設置事件監聽器
 */
function setupListeners() {
  // 🔧 【優化】添加節流機制 - 每 2 秒最多更新一次，減輕 CPU 負擔
  let lastApiUpdateTime = 0
  const API_UPDATE_INTERVAL = 2000 // 改為 2 秒，原本是 1 秒

  // 監聽 API 發送事件,觸發數據更新
  const handleApiSending = () => {
    const now = Date.now()
    // 節流檢查：距離上次更新超過 2 秒才更新
    if (now - lastApiUpdateTime >= API_UPDATE_INTERVAL) {
      if (process.env.DEV) console.log('📊 [MainLayout] 偵測到 API 發送,更新特徵模擬數據面板')
      apiDataUpdateTrigger.value++
      lastApiUpdateTime = now
    }
  }

  window.addEventListener('trafficApiSending', handleApiSending)

  return () => {
    window.removeEventListener('trafficApiSending', handleApiSending)
  }
}

// 🎯 拉桿輸入時的處理函數
function onSliderInput() {
  // 手動拖動拉桿時，根據拉桿位置判斷最接近的情景並更新高亮
  updateScenarioHighlightBySlider()
  updateGenerationConfig()
  // isSliderActive 由 @mousedown/@mouseup/@touchstart/@touchend 控制
}

// 🎯 根據拉桿位置自動判斷最接近的情景
function updateScenarioHighlightBySlider() {
  const baseInterval = manualInterval.value

  const closestScenario = timeScenarios.reduce((closest, scenario) => {
    const { min, max } = scenario.config.interval
    const sliderValue = baseInterval

    // 計算拉桿值與該情景中點的距離
    const midpoint = (min + max) / 2
    const distance = Math.abs(sliderValue - midpoint)

    // 選擇距離最近的情景
    if (!closest) return { scenario, distance }
    return distance < closest.distance ? { scenario, distance } : closest
  }, null)

  // 更新按鈕高亮
  if (closestScenario) {
    currentTimeScenario.value = closestScenario.scenario.key
    selectedVDScenario.value = closestScenario.scenario.key
    if (process.env.DEV) console.log(`📍 [拉桿移動] 自動判斷為: ${closestScenario.scenario.name}`)
  }
}

function updateGenerationConfig() {
  if (isAutoMode.value) return // 如果是自動模式，則不執行手動更新
  if (!window.autoTrafficGenerator) return

  const baseInterval = manualInterval.value

  // 🎯 使用已選擇的情景，而不是根據拉桿自動計算
  // 這樣可以確保用戶點擊按鈕時的選擇不會被覆蓋
  let selectedScenario = timeScenarios.find((s) => s.key === currentTimeScenario.value)

  // 如果沒有已選擇的情景，才根據拉桿值自動判斷
  if (!selectedScenario) {
    const closestScenario = timeScenarios.reduce((closest, scenario) => {
      const { min, max } = scenario.config.interval
      const sliderValue = baseInterval

      // 計算拉桿值與該情景中點的距離
      const midpoint = (min + max) / 2
      const distance = Math.abs(sliderValue - midpoint)

      // 選擇距離最近的情景
      if (!closest) return { scenario, distance }
      return distance < closest.distance ? { scenario, distance } : closest
    }, null)

    if (closestScenario) {
      selectedScenario = closestScenario.scenario
      currentTimeScenario.value = selectedScenario.key
      selectedVDScenario.value = selectedScenario.key
    }
  }

  // 使用選擇的情景配置參數
  const s = selectedScenario || timeScenarios.find((s) => s.key === 'off_peak')
  if (!s) return

  // 📊 新的邏輯：直接使用拉桿值作為基準間隔
  // 不再固定在情景的 normal 值，而是允許拉桿在 0.5-30 秒範圍內自由調動
  // 實際生成間隔 = baseInterval / peakMultiplier（由情景決定）
  const actualInterval = Math.round(baseInterval / s.config.peakMultiplier)
  const minInterval = Math.max(500, Math.round(actualInterval * 0.8))
  const maxInterval = Math.round(actualInterval * 1.2)

  currentInterval.value = baseInterval / 1000 // 轉換為秒

  if (process.env.DEV)
    console.log(
      `🎚️ [手動模式] 拉桿: ${(baseInterval / 1000).toFixed(1)}s → 實際間隔: ${actualInterval}ms (基於 ${s.name} 的倍數 ${s.config.peakMultiplier})`,
    )

  // 🔧 CRITICAL FIX：先清除情景模式，確保手動設定不被覆蓋
  if (window.autoTrafficGenerator.currentScenarioMode) {
    if (process.env.DEV)
      console.log(`🛑 [UI] 清除 currentScenarioMode: ${window.autoTrafficGenerator.currentScenarioMode}`)
    window.autoTrafficGenerator.currentScenarioMode = null
  }

  window.autoTrafficGenerator.updateConfig({
    ...s.config,
    interval: { min: minInterval, max: maxInterval, normal: actualInterval },
    peakMultiplier: s.config.peakMultiplier, // 使用情景定義的 peakMultiplier
    maxLiveVehicles: s.config.maxLiveVehicles,
  })
}

// 新增：自動模式切換功能
function toggleAutoMode() {
  isAutoMode.value = !isAutoMode.value

  if (isAutoMode.value) {
    // 切換到自動模式：移除按鈕的 active 狀態
    if (process.env.DEV) console.log('🔄 [MainLayout] 切換到自動模式 - 清除情景選擇')
    selectedVDScenario.value = null

    // ✅ 【新增】立即顯示初始狀態，避免一直卡在「正在初始化」
    const now = new Date()
    const timeStr = now.toLocaleTimeString('it-IT')
    const hour = now.getHours()
    let scenarioDesc = ''

    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
      scenarioDesc = '🚀 尖峰時段'
    } else if (hour >= 9 && hour < 17) {
      scenarioDesc = '🌞 離峰時段'
    } else {
      scenarioDesc = '🌙 凌晨時段'
    }

    // 使用預設的生成間隔 15 秒
    simulationStatus.value = `${timeStr}   /   ${scenarioDesc}  /  生成間隔: 15s`
  } else {
    // 切換回手動模式：重置為 INITIAL_VD_SCENARIO
    if (process.env.DEV) console.log(`🔄 [MainLayout] 切換回手動模式 - 設回 ${INITIAL_VD_SCENARIO}`)
    selectedVDScenario.value = INITIAL_VD_SCENARIO
    currentTimeScenario.value = INITIAL_VD_SCENARIO
    manualInterval.value = 1000 // 重置拉桿到 1s
    updateGenerationConfig()

    // ✅ 清除模擬狀態
    simulationStatus.value = null
  }

  if (window.autoTrafficGenerator) {
    window.autoTrafficGenerator.toggleAutoMode(isAutoMode.value)
  }
}
onMounted(() => {
  const cleanup = setupListeners()

  // 🧪 【測試】初始化：預設設定為 INITIAL_VD_SCENARIO
  window.selectedTrafficTimePeriod = INITIAL_VD_SCENARIO
  if (process.env.DEV) console.log(`🚀 [MainLayout] 初始化時段配置：預設為 ${INITIAL_VD_SCENARIO}`)

  // ✅ 確保側邊欄在 onMounted 時顯示
  rightDrawerOpen.value = true
  if (process.env.DEV) console.log('✅ [MainLayout] 側邊欄已強制開啟')

  let tries = 0
  const tryInit = async () => {
    try {
      // ✅ 等待 IndexPage 創建的 autoTrafficGenerator
      if (window.trafficController && window.autoTrafficGenerator) {
        if (process.env.DEV) console.log('✅ [MainLayout] 找到已初始化的 autoTrafficGenerator')

        // 🚀 【關鍵修復】初始化時套用預設情景的完整配置
        if (process.env.DEV) console.log(`🎯 [MainLayout] 套用預設情景配置: ${INITIAL_VD_SCENARIO}`)
        selectVDScenario(INITIAL_VD_SCENARIO)

        // 初始化完成後，設定自動模式的回調
        window.autoTrafficGenerator.setOnTimeUpdate((status) => {
          if (status) {
            // ✅ 【新增】取得生成間隔
            let intervalMs =
              status.interval?.normal ||
              (window.autoTrafficGenerator.config && window.autoTrafficGenerator.config.interval?.normal) ||
              3000
            const intervalSec = Math.round(intervalMs / 1000)
            currentAutoInterval.value = intervalSec

            // ✅ 【新增】完整顯示：時間 - 情景描述 - 生成間隔
            simulationStatus.value = `${status.time}   /   ${status.description}  /  生成間隔: ${intervalSec}s`

            // 🎭 新增：在自動模式下更新 currentTimeScenario
            if (status.scenarioMode) {
              currentTimeScenario.value = status.scenarioMode
            }

            // 🎯 新增：將 VD 數據保存到全局，供 TrafficLightController.sendDataToBackend() 使用
            if (status.vdData || status.apiVDData) {
              window.currentGeneratedVDData = {
                vdData: status.vdData,
                apiVDData: status.apiVDData,
                targetFeatures: status.targetFeatures,
                timestamp: new Date().toISOString(),
              }
            }
          } else {
            simulationStatus.value = null
            currentAutoInterval.value = null
            // 清空保存的 VD 數據
            window.currentGeneratedVDData = null
          }
        })
      } else if (tries++ < 50) {
        // 等待直到 autoTrafficGenerator 初始化完成（最多 5 秒）
        setTimeout(tryInit, 100)
      } else {
        if (process.env.DEV) console.warn('⚠️ [MainLayout] 超時：未能找到 autoTrafficGenerator')
      }
    } catch (error) {
      // 🛡️ 【錯誤邊界保護】初始化失敗時的降級方案
      console.error('❌ [MainLayout] 初始化失敗:', error)
      if (process.env.DEV) console.warn('⚠️ [MainLayout] 使用預設配置重試...')

      // 降級方案：使用預設配置
      if (tries++ < 50) {
        setTimeout(tryInit, 100)
      } else {
        console.error('❌ [MainLayout] 多次重試失敗，無法初始化交通系統')
        $q.notify({
          type: 'negative',
          message: '交通系統初始化失敗，請刷新頁面',
          position: 'top',
          timeout: 5000,
        })
      }
    }
  }
  tryInit()

  window.mainLayoutCleanup = () => {
    cleanup()
  }

  if (process.env.DEV) console.log('═══════════════════════════════════════════════════════════')
  if (process.env.DEV) console.log('✅ [MainLayout] onMounted 完成')
  if (process.env.DEV) console.log('═══════════════════════════════════════════════════════════')
})

// 🚨 監聽拉桿變化，當手動調整時更新生成配置
watch(manualInterval, (newValue) => {
  if (!isAutoMode.value && window.autoTrafficGenerator) {
    if (process.env.DEV) console.log(`🎚️ [MainLayout] 拉桿改變: ${(newValue / 1000).toFixed(1)}s，更新生成配置...`)
    updateGenerationConfig()
  }
})

onUnmounted(() => {
  window.mainLayoutCleanup?.()
})
</script>

<style>
/* 新增樣式 */
.simulation-status {
  color: #81c784;
  font-size: 12px;
  font-weight: bold;
  margin-top: 4px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.interval-status {
  color: #ffb74d;
  font-size: 12px;
  background: rgba(255, 183, 77, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
}

.q-header {
  border-bottom: 1px solid rgba(0, 81, 220, 0.5) !important;
}
.q-drawer {
  background: transparent !important;
  border-left: 1px solid rgba(0, 81, 220, 0.5) !important;
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

/* 🎯【新增】VD 情景選擇按鈕組 */
.vd-scenario-selector {
  display: flex;
  gap: 6px;
  height: 55px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.vd-scenario-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  font-weight: 600;
  padding: 30px 0;
}

.vd-scenario-btn:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%);
  transform: scale(1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.vd-scenario-btn.active {
  background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%);
  border-color: #00d4ff;
  box-shadow:
    0 0 20px rgba(0, 212, 255, 0.6),
    inset 0 0 10px rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.vd-scenario-btn.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shine 2s infinite;
}

.vd-scenario-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.1) 0%, rgba(100, 100, 100, 0.05) 100%) !important;
  border-color: rgba(100, 100, 100, 0.3) !important;
  transform: none !important;
  box-shadow: none !important;
}

.vd-scenario-btn:disabled:hover {
  transform: none !important;
  box-shadow: none !important;
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.1) 0%, rgba(100, 100, 100, 0.05) 100%) !important;
}

.vd-scenario-btn:disabled.active {
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.1) 0%, rgba(100, 100, 100, 0.05) 100%) !important;
  border-color: rgba(100, 100, 100, 0.3) !important;
  box-shadow: none !important;
  transform: none !important;
}

@keyframes shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.vd-scenario-icon {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 6px; /* 增加 icon 與文字的距離 */
}

.vd-scenario-label {
  font-size: 14px;
  line-height: 1;
  letter-spacing: 0.5px;
}

/* 2560x1440 解析度優化 */
@media (min-width: 2560px) {
  .vd-scenario-selector {
    height: 65px;
    gap: 8px;
    margin-bottom: 10px;
  }

  .vd-scenario-btn {
    border-radius: 10px;
  }

  .vd-scenario-icon {
    font-size: 26px;
    margin-bottom: 8px; /* 大螢幕調整距離 */
  }

  .vd-scenario-label {
    font-size: 16px;
  }
}

/* 2560x1440 解析度的基礎優化 */
@media (min-width: 2560px) and (min-height: 1440px) {
  .set-window-section {
    background-size: 100% 100%; /* 在高解析度下使用 100% 100% 確保完整填滿 */
    height: clamp(220px, 30vh, 300px); /* 增加高度範圍 */
    min-height: 180px; /* 提高最小高度 */
  }
}

.section-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 50px 14px 0;
  display: flex;
  align-items: flex-start;
}

/* 智能時段自動分派系統 - 緊湊版 600px × 180px */
.compact-dispatch-system {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: white;
  gap: 8px;
  padding: 8px 12px;
}

.system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  flex-shrink: 0;
  position: absolute;
  right: 0;
  top: 15px;
  left: 160px;
}

.system-info {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 5px;
}

.system-title {
  font-size: 13px;
  font-weight: bold;
  color: white;
  margin-right: 10px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.8);
  transition: all 0.3s;
}

.mode-toggle-btn {
  padding: 0;
  font-size: 12px !important;
  box-shadow: none !important;
  min-height: auto;
}

/* 控制與統計行 - 緊湊版 */
.control-stats-row {
  font-size: 12px;
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 0;
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
}

.freq-slider:disabled {
  opacity: 0.5;
}

.freq-slider::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  background: #64b5f6;
  border-radius: 50%;
  cursor: pointer;
}

.freq-slider:disabled::-webkit-slider-thumb {
  background: #999;
  cursor: not-allowed;
}

.freq-value {
  color: #81c784;
  font-weight: bold;
  min-width: 20px;
  text-align: right;
  flex-shrink: 0;
}

/* 當前情境參數顯示 */
.scenario-details {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  font-size: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
}

.detail-item + .detail-item {
  margin-left: 24px;
}

.detail-label {
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
}

.detail-value {
  color: #81c784;
  font-weight: bold;
}

/* 響應式調整 */
@media (max-width: 1024px) {
  .compact-dispatch-system {
    font-size: 10px;
    gap: 6px;
    padding: 6px 8px;
  }

  .vd-scenario-selector {
    gap: 3px;
    height: 45px;
    margin-bottom: 6px;
  }

  .vd-scenario-btn {
    border-radius: 6px;
  }

  .vd-scenario-icon {
    font-size: 18px;
    margin-bottom: 3px; /* 小螢幕調整距離 */
  }

  .vd-scenario-label {
    font-size: 12px;
  }

  .control-stats-row {
    gap: 6px;
    height: 28px;
  }

  .frequency-control {
    padding: 3px 6px;
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

  .vd-scenario-selector {
    gap: 2px;
    height: 40px;
    margin-bottom: 4px;
  }

  .vd-scenario-btn {
    border-radius: 5px;
  }

  .vd-scenario-icon {
    font-size: 16px;
    margin-bottom: 2px; /* 超小螢幕調整距離 */
  }

  .vd-scenario-label {
    font-size: 10px;
  }

  .control-stats-row {
    gap: 4px;
    height: 24px;
  }

  .frequency-control {
    padding: 2px 4px;
    gap: 4px;
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

.data-section-buttons {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  flex-shrink: 0;
  z-index: 2;
  position: relative;
}

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
  position: relative;
}

.traffic-data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 5px 10px;
}

.traffic-zone {
  padding: 5px 10px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
}

.zone-title {
  position: absolute;
  top: -18px;
  right: 10px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  opacity: 0.9;
  text-align: right;
}

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

.zone-data {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 5px;
}

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
  padding: 4px 10px;
}
.data-row.speed-stat {
  font-size: 12px;
  font-weight: bold;
  padding: 4px 10px;
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
  transition: opacity 0.3s ease;
  margin-bottom: -1px;
  height: auto;
  max-height: 50px;
}

/* Header 響應式設計 */
.header-toolbar {
  position: relative;
  min-height: 50px;
}

/* 🎯 限制 q-toolbar-title 的寬度，防止延伸到整個 header */
.header-toolbar :deep(.q-toolbar-title) {
  width: auto;
  flex-grow: 0;
  flex-shrink: 0;
  max-width: 400px;
  padding-right: 20px;
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

/* 後台管理按鈕樣式 */
.admin-btn {
  color: rgba(255, 255, 255, 0.7) !important;
  transition: all 0.3s ease !important;
  margin-right: 8px;
}

.admin-btn:hover {
  color: #00d4ff !important;
  transform: scale(1.1);
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.6);
}

.admin-btn:active {
  transform: scale(0.95);
}

/* 💡 Tooltip 單顆按鈕樣式 (切換 icon 和顏色，不會跳動) */
.tooltip-btn-single {
  color: rgba(255, 255, 255, 0.7) !important;
  transition: color 0.2s ease !important;
  margin-right: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 強制 icon 寬度固定，防止不同圖示寬度導致位置移動 */
.tooltip-btn-single .q-icon {
  width: 24px !important;
  min-width: 24px !important;
  max-width: 24px !important;
}

.tooltip-btn-single:hover {
  color: #ffd700 !important;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
}

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
  .traffic-data-grid {
    gap: 10px;
    min-height: 250px;
  }
  .traffic-zone {
    padding: 8px;
  }
  .data-row,
  .data-row.main-stats,
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
  .traffic-data-grid {
    gap: 8px;
    min-height: 200px;
  }
  .traffic-zone {
    padding: 6px;
  }
  .data-row,
  .data-row.main-stats,
  .data-row.speed-stat {
    font-size: 10px;
    padding: 2px 0;
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
  .traffic-data-grid {
    gap: 6px;
    min-height: 180px;
  }
  .traffic-zone {
    padding: 4px;
  }
  .data-row,
  .data-row.main-stats,
  .data-row.speed-stat {
    font-size: 9px;
    padding: 1px 0;
  }
  .data-value {
    min-width: 35px;
  }
  .main-stats .data-value {
    font-size: 9px;
  }
}

/* 2560x1440 高解析度螢幕優化 */
@media (min-width: 2560px) {
  /* 調整側邊欄寬度以適配高解析度 */
  .q-drawer {
    width: 650px !important;
  }

  /* 場景參數設定區域進一步優化 */
  .set-window-section {
    height: clamp(220px, 30vh, 300px); /* 覆蓋基礎樣式，提供更大的高度範圍 */
    background-attachment: local; /* 確保背景圖固定在容器內 */
  }

  .section-content {
    padding: 60px 16px 0;
  }

  .system-header {
    right: 0;
    top: 40px;
    left: 180px;
  }

  /* 優化智能分派系統 */
  .compact-dispatch-system {
    padding: 12px 16px;
    gap: 12px;
  }

  .system-title {
    font-size: 15px;
  }

  .vd-scenario-selector {
    height: 70px;
    gap: 6px;
    margin-bottom: 10px;
  }

  .vd-scenario-btn {
    border-radius: 8px;
  }

  .vd-scenario-icon {
    font-size: 26px;
  }

  .vd-scenario-label {
    font-size: 16px;
  }

  /* 優化數據展示區域 */
  .data-section-content {
    background-size: 100% 100%; /* 確保背景圖完整覆蓋 */
    padding: 30px 25px;
    min-height: 200px;
  }

  /* 調整交通數據網格，使數據更靠上顯示 */
  .traffic-data-grid {
    gap: 8px 15px;
    margin-top: -20px; /* 向上調整數據位置 */
    transform: translateY(-10px); /* 額外向上微調 */
  }

  /* 優化各個方向區域的位置 - 進一步微調 */
  .east-zone {
    top: -40px; /* 從 -10px 進一步上移到 -20px */
    left: -5px;
  }

  .west-zone {
    top: -40px; /* 從 -10px 進一步上移到 -20px */
    left: 18px;
  }

  .south-zone {
    top: 100px; /* 從 25px 進一步下移到 35px */
    left: -6px;
  }

  .north-zone {
    top: 100px; /* 從 25px 進一步下移到 35px */
    left: 19px;
  }

  /* 優化數據行顯示 */
  .data-row {
    font-size: 14px;
    padding: 3px 12px;
    margin-bottom: 3px;
  }

  .data-row.main-stats {
    font-size: 14px;
    padding: 5px 12px;
  }

  .data-row.speed-stat {
    font-size: 14px;
    padding: 5px 12px;
  }

  .data-value {
    font-size: 15px;
    min-width: 60px;
  }

  .main-stats .data-value {
    font-size: 15px;
  }

  /* 正規化標記樣式 */
  .normalized-badge {
    color: #ffd700;
    font-size: 0.85em;
    margin-left: 2px;
    opacity: 0.9;
    font-weight: 500;
  }

  .data-value[title] {
    cursor: help;
  }

  /* 正規化信息區塊 */
  .normalization-info {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 12px;
    color: #aaa;
  }

  .normalization-info .time-period,
  .normalization-info .multiplier {
    display: inline-block;
  }

  .normalization-info .time-period {
    color: #87ceeb;
  }

  .normalization-info .multiplier {
    color: #ffd700;
  }

  .data-row .data-label,
  .data-row .data-value {
    font-size: 1rem;
  }

  .east-zone,
  .west-zone {
    position: relative;
    top: -30px;
  }

  .south-zone,
  .north-zone {
    position: relative;
    top: 90px;
  }

  .east-zone .zone-title,
  .west-zone .zone-title {
    top: -30px;
    font-size: 18px;
  }

  .south-zone .zone-title,
  .north-zone .zone-title {
    top: -35px;
    font-size: 18px;
  }
}

.ai-gradient {
  font-size: 16px;
  vertical-align: -5px;
  display: inline-block;
  margin-left: 5px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 2px 3px;
  margin-left: 10px;

  /* 💡 三色漸層：深藍 → 淺藍 → 綠 */
  background: linear-gradient(90deg, #0066ff, #33ccff, #00ff99, #0066ff);
  background-size: 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ✨ 流動動畫 */
.animate {
  animation: gradientFlow 4s linear infinite;
}

@keyframes gradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* API 數據標記樣式 */
.api-data-badge {
  margin-top: 10px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  text-align: center;
}

.api-data-badge span {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.no-data {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.total-flow {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.total-flow .data-label {
  color: #ffd700;
}

.total-flow .data-value {
  color: #ffd700;
  font-size: 16px;
}
</style>
