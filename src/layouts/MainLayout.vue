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
              currentRoute.startsWith('/visualization')
                ? '/images/button/VisualBtnOn.png'
                : '/images/button/VisualBtnOff.png'
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
                  <div class="status-dot"></div>
                  <q-btn
                    @click="toggleAutoMode"
                    size="sm"
                    class="mode-toggle-btn"
                    :label="isAutoMode ? '每日自動模式' : '情境手動模式'"
                  >
                  </q-btn>
                </div>
              </div>

              <!-- 自動模式狀態顯示 -->
              <div class="simulation-status" v-if="isAutoMode">
                <span class="time-status">{{ simulationStatus || '正在初始化...' }}</span>
                <span v-if="currentAutoInterval" class="interval-status">生成間隔: {{ currentAutoInterval }}s</span>
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
                      active: isScenarioActive(scenario.key),
                      'auto-matched': isAutoMode && currentTimeScenario === scenario.key,
                    },
                  ]"
                  :title="`${scenario.name} (${scenario.timeRange})`"
                  :disabled="isAutoMode"
                >
                  <div class="scenario-icon">{{ scenario.icon }}</div>
                  <div class="scenario-name">{{ scenario.shortName }}</div>
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
                  <span class="detail-value">{{ (currentInterval / 1000).toFixed(1) }}</span>
                </div>
              </div>

              <!-- 控制與統計 -->
              <div class="control-stats-row">
                <div class="frequency-control">
                  <span class="freq-label">生成間隔</span>
                  <input
                    type="range"
                    v-model="manualInterval"
                    min="500"
                    max="30000"
                    :step="100"
                    @input="updateGenerationConfig"
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
          <div class="data-section-content">
            <div class="traffic-data-grid">
              <!-- Data cells... -->
              <div class="traffic-zone east-zone">
                <div class="zone-title">往東 (VLRJX20)</div>
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value" :title="`正規化前: ${eastData.before.averageSpeed} km/h`">
                      {{ eastData.after.averageSpeed }} km/h
                      <span v-if="eastData.isNormalized" class="normalized-badge"
                        >({{ eastData.before.averageSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value" :title="`正規化前: ${eastData.before.occupancy}%`">
                      {{ eastData.after.occupancy.toFixed(1) }}%
                      <span v-if="eastData.isNormalized" class="normalized-badge"
                        >({{ eastData.before.occupancy.toFixed(1) }}%)</span
                      >
                    </span>
                  </div>
                  <!-- 機車流量 -->
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value" :title="`正規化前: ${eastData.before.motorFlow} 輛`">
                      {{ eastData.after.motorFlow }} 輛
                      <span v-if="eastData.isNormalized" class="normalized-badge"
                        >({{ eastData.before.motorFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 小型車流量 -->
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value" :title="`正規化前: ${eastData.before.smallCarFlow} 輛`">
                      {{ eastData.after.smallCarFlow }} 輛
                      <span v-if="eastData.isNormalized" class="normalized-badge"
                        >({{ eastData.before.smallCarFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 大型車流量 -->
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value" :title="`正規化前: ${eastData.before.largeCarFlow} 輛`">
                      {{ eastData.after.largeCarFlow }} 輛
                      <span v-if="eastData.isNormalized" class="normalized-badge"
                        >({{ eastData.before.largeCarFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 機車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${eastData.before.motorSpeed} km/h`">
                      {{ eastData.after.motorSpeed }} km/h
                      <span v-if="eastData.isNormalized" class="normalized-badge"
                        >({{ eastData.before.motorSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 小型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${eastData.before.smallCarSpeed} km/h`">
                      {{ eastData.after.smallCarSpeed }} km/h
                      <span v-if="eastData.isNormalized" class="normalized-badge"
                        >({{ eastData.before.smallCarSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 大型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${eastData.before.largeCarSpeed} km/h`">
                      {{ eastData.after.largeCarSpeed }} km/h
                      <span v-if="eastData.isNormalized" class="normalized-badge"
                        >({{ eastData.before.largeCarSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 正規化信息 -->
                  <div v-if="eastData.isNormalized" class="normalization-info">
                    <span class="time-period">📍 {{ eastData.period }}</span>
                    <span class="multiplier">倍數 {{ eastData.multiplier }}x</span>
                  </div>
                </div>
              </div>

              <!-- 右上：往西 -->
              <div class="traffic-zone west-zone">
                <div class="zone-title">往西 (VLRJM60)</div>
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value" :title="`正規化前: ${westData.before.averageSpeed} km/h`">
                      {{ westData.after.averageSpeed }} km/h
                      <span v-if="westData.isNormalized" class="normalized-badge"
                        >({{ westData.before.averageSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value" :title="`正規化前: ${westData.before.occupancy}%`">
                      {{ westData.after.occupancy.toFixed(1) }}%
                      <span v-if="westData.isNormalized" class="normalized-badge"
                        >({{ westData.before.occupancy.toFixed(1) }}%)</span
                      >
                    </span>
                  </div>
                  <!-- 機車流量 -->
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value" :title="`正規化前: ${westData.before.motorFlow} 輛`">
                      {{ westData.after.motorFlow }} 輛
                      <span v-if="westData.isNormalized" class="normalized-badge"
                        >({{ westData.before.motorFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 小型車流量 -->
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value" :title="`正規化前: ${westData.before.smallCarFlow} 輛`">
                      {{ westData.after.smallCarFlow }} 輛
                      <span v-if="westData.isNormalized" class="normalized-badge"
                        >({{ westData.before.smallCarFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 大型車流量 -->
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value" :title="`正規化前: ${westData.before.largeCarFlow} 輛`">
                      {{ westData.after.largeCarFlow }} 輛
                      <span v-if="westData.isNormalized" class="normalized-badge"
                        >({{ westData.before.largeCarFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 機車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${westData.before.motorSpeed} km/h`">
                      {{ westData.after.motorSpeed }} km/h
                      <span v-if="westData.isNormalized" class="normalized-badge"
                        >({{ westData.before.motorSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 小型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${westData.before.smallCarSpeed} km/h`">
                      {{ westData.after.smallCarSpeed }} km/h
                      <span v-if="westData.isNormalized" class="normalized-badge"
                        >({{ westData.before.smallCarSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 大型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${westData.before.largeCarSpeed} km/h`">
                      {{ westData.after.largeCarSpeed }} km/h
                      <span v-if="westData.isNormalized" class="normalized-badge"
                        >({{ westData.before.largeCarSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 正規化信息 -->
                  <div v-if="westData.isNormalized" class="normalization-info">
                    <span class="time-period">📍 {{ westData.period }}</span>
                    <span class="multiplier">倍數 {{ westData.multiplier }}x</span>
                  </div>
                </div>
              </div>

              <!-- 左下：往南 -->
              <div class="traffic-zone south-zone">
                <div class="zone-title">往南 (VLRJX00)</div>
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value" :title="`正規化前: ${southData.before.averageSpeed} km/h`">
                      {{ southData.after.averageSpeed }} km/h
                      <span v-if="southData.isNormalized" class="normalized-badge"
                        >({{ southData.before.averageSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value" :title="`正規化前: ${southData.before.occupancy}%`">
                      {{ southData.after.occupancy.toFixed(1) }}%
                      <span v-if="southData.isNormalized" class="normalized-badge"
                        >({{ southData.before.occupancy.toFixed(1) }}%)</span
                      >
                    </span>
                  </div>
                  <!-- 機車流量 -->
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value" :title="`正規化前: ${southData.before.motorFlow} 輛`">
                      {{ southData.after.motorFlow }} 輛
                      <span v-if="southData.isNormalized" class="normalized-badge"
                        >({{ southData.before.motorFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 小型車流量 -->
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value" :title="`正規化前: ${southData.before.smallCarFlow} 輛`">
                      {{ southData.after.smallCarFlow }} 輛
                      <span v-if="southData.isNormalized" class="normalized-badge"
                        >({{ southData.before.smallCarFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 大型車流量 -->
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value" :title="`正規化前: ${southData.before.largeCarFlow} 輛`">
                      {{ southData.after.largeCarFlow }} 輛
                      <span v-if="southData.isNormalized" class="normalized-badge"
                        >({{ southData.before.largeCarFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 機車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${southData.before.motorSpeed} km/h`">
                      {{ southData.after.motorSpeed }} km/h
                      <span v-if="southData.isNormalized" class="normalized-badge"
                        >({{ southData.before.motorSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 小型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${southData.before.smallCarSpeed} km/h`">
                      {{ southData.after.smallCarSpeed }} km/h
                      <span v-if="southData.isNormalized" class="normalized-badge"
                        >({{ southData.before.smallCarSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 大型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${southData.before.largeCarSpeed} km/h`">
                      {{ southData.after.largeCarSpeed }} km/h
                      <span v-if="southData.isNormalized" class="normalized-badge"
                        >({{ southData.before.largeCarSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 正規化信息 -->
                  <div v-if="southData.isNormalized" class="normalization-info">
                    <span class="time-period">📍 {{ southData.period }}</span>
                    <span class="multiplier">倍數 {{ southData.multiplier }}x</span>
                  </div>
                </div>
              </div>

              <!-- 右下：往北 -->
              <div class="traffic-zone north-zone">
                <div class="zone-title">往北 (VLRJX00)</div>
                <div class="zone-data">
                  <div class="data-row main-stats">
                    <span class="data-label">平均車速</span>
                    <span class="data-value" :title="`正規化前: ${northData.before.averageSpeed} km/h`">
                      {{ northData.after.averageSpeed }} km/h
                      <span v-if="northData.isNormalized" class="normalized-badge"
                        >({{ northData.before.averageSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <div class="data-row main-stats">
                    <span class="data-label">占用率</span>
                    <span class="data-value" :title="`正規化前: ${northData.before.occupancy}%`">
                      {{ northData.after.occupancy.toFixed(1) }}%
                      <span v-if="northData.isNormalized" class="normalized-badge"
                        >({{ northData.before.occupancy.toFixed(1) }}%)</span
                      >
                    </span>
                  </div>
                  <!-- 機車流量 -->
                  <div class="data-row">
                    <span class="data-label">機車流量</span>
                    <span class="data-value" :title="`正規化前: ${northData.before.motorFlow} 輛`">
                      {{ northData.after.motorFlow }} 輛
                      <span v-if="northData.isNormalized" class="normalized-badge"
                        >({{ northData.before.motorFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 小型車流量 -->
                  <div class="data-row">
                    <span class="data-label">小型車流量</span>
                    <span class="data-value" :title="`正規化前: ${northData.before.smallCarFlow} 輛`">
                      {{ northData.after.smallCarFlow }} 輛
                      <span v-if="northData.isNormalized" class="normalized-badge"
                        >({{ northData.before.smallCarFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 大型車流量 -->
                  <div class="data-row">
                    <span class="data-label">大型車流量</span>
                    <span class="data-value" :title="`正規化前: ${northData.before.largeCarFlow} 輛`">
                      {{ northData.after.largeCarFlow }} 輛
                      <span v-if="northData.isNormalized" class="normalized-badge"
                        >({{ northData.before.largeCarFlow }} 輛)</span
                      >
                    </span>
                  </div>
                  <!-- 機車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">機車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${northData.before.motorSpeed} km/h`">
                      {{ northData.after.motorSpeed }} km/h
                      <span v-if="northData.isNormalized" class="normalized-badge"
                        >({{ northData.before.motorSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 小型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">小型車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${northData.before.smallCarSpeed} km/h`">
                      {{ northData.after.smallCarSpeed }} km/h
                      <span v-if="northData.isNormalized" class="normalized-badge"
                        >({{ northData.before.smallCarSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 大型車平均速率 -->
                  <div class="data-row speed-stat">
                    <span class="data-label">大型車平均速率</span>
                    <span class="data-value" :title="`正規化前: ${northData.before.largeCarSpeed} km/h`">
                      {{ northData.after.largeCarSpeed }} km/h
                      <span v-if="northData.isNormalized" class="normalized-badge"
                        >({{ northData.before.largeCarSpeed }} km/h)</span
                      >
                    </span>
                  </div>
                  <!-- 正規化信息 -->
                  <div v-if="northData.isNormalized" class="normalization-info">
                    <span class="time-period">📍 {{ northData.period }}</span>
                    <span class="multiplier">倍數 {{ northData.multiplier }}x</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'
import { timeScenarios } from 'src/classes/config/trafficScenarioConfig.js'

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

const currentRoute = computed(() => route.path)

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value
}

const rightDrawerOpen = ref(false)
const $q = useQuasar()

const currentTimeScenario = ref('peak_hours')
const manualInterval = ref(1000)
const currentInterval = ref(7.0)

// timeScenarios 已從 trafficScenarioConfig.js 匯入
const currentScenarioDetails = computed(() => {
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

// 🎯 判斷情境按鈕是否應該高亮 - 基於拉桿範圍映射
// 功能：當拉桿值落在某個情景的間隔範圍內時，該按鈕發亮
// 自動模式：按當前時段情境高亮
// 手動模式：按拉桿範圍映射高亮
function isScenarioActive(scenarioKey) {
  if (isAutoMode.value) {
    // 自動模式：按當前時段對應的情景高亮
    return currentTimeScenario.value === scenarioKey
  } else {
    // 手動模式：檢查拉桿值是否落在該情景的間隔範圍內
    const scenario = timeScenarios.find((s) => s.key === scenarioKey)
    if (!scenario) return false

    const sliderValue = manualInterval.value
    const { min, max } = scenario.config.interval

    // 💡 拉桿在 [min, max] 範圍內 → 該按鈕發亮
    const isInRange = sliderValue >= min && sliderValue <= max
    return isInRange
  }
}

const forceUpdateTrigger = ref(0)
const startDataUpdate = () => {
  const id = setInterval(() => forceUpdateTrigger.value++, 3000)
  return () => clearInterval(id)
}

function getTrafficData(dir) {
  forceUpdateTrigger.value
  if (window.trafficDataCollector) {
    const rt = window.trafficDataCollector.getRealTimeData()
    const d = rt.totalCount[dir] || {}
    const sp = rt.averageSpeed[dir] || {}
    return {
      averageSpeed: sp.overall || 0,
      occupancy: rt.occupancy[dir] || 0,
      motorFlow: d.motor || 0,
      smallCarFlow: d.small || 0,
      largeCarFlow: d.large || 0,
      motorSpeed: sp.motor || 0,
      smallCarSpeed: sp.small || 0,
      largeCarSpeed: sp.large || 0,
    }
  }
  if (window.trafficController && typeof window.trafficController.getDirectionVehicleData === 'function') {
    const vd = window.trafficController.getDirectionVehicleData(dir) || {}
    const avg = window.trafficController.getAverageSpeed?.(dir, 'small') || 0
    const occ = parseFloat(window.trafficController.calculateOccupancy?.(dir) || '0')
    return {
      averageSpeed: Math.round(avg),
      occupancy: Math.round(occ * 10) / 10,
      motorFlow: vd.motor || 0,
      smallCarFlow: vd.small || 0,
      largeCarFlow: vd.large || 0,
      motorSpeed: window.trafficController.getAverageSpeed?.(dir, 'motor') || 0,
      smallCarSpeed: window.trafficController.getAverageSpeed?.(dir, 'small') || 0,
      largeCarSpeed: window.trafficController.getAverageSpeed?.(dir, 'large') || 0,
    }
  }
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

/**
 * 🎯【新增】獲取正規化對比數據
 * 返回格式: { before: 前端數據, after: 正規化後數據, period: 時段, multiplier: 倍數 }
 */
function getNormalizedTrafficData(dir) {
  // 獲取前端原始數據 (正規化前)
  const frontendData = getTrafficData(dir)

  // 如果沒有正規化函數，直接返回
  if (!window.VDNormalizationUtils) {
    return {
      before: frontendData,
      after: frontendData,
      period: 'unknown',
      multiplier: 1,
      isNormalized: false,
    }
  }

  try {
    // 取得當前時段
    const { getCurrentTimePeriod } = window
    const period = getCurrentTimePeriod?.() || 'unknown'

    // 準備前端數據結構
    const frontendDataForNormalization = {
      volume: frontendData.motorFlow + frontendData.smallCarFlow + frontendData.largeCarFlow,
      speed: frontendData.averageSpeed,
      occupancy: frontendData.occupancy,
      volume_m: frontendData.motorFlow,
      volume_s: frontendData.smallCarFlow,
      volume_l: frontendData.largeCarFlow,
    }

    // 根據方向確定路口 ID
    let intersectionId = 'VLRJM60'
    if (dir === 'east') intersectionId = 'VLRJX20'
    else if (dir === 'west') intersectionId = 'VLRJM60'
    else if (dir === 'south' || dir === 'north') intersectionId = 'VLRJX00'

    // 獲取倍數
    const multiplier = window.VDNormalizationUtils?.getDisplayMultiplier?.(intersectionId) || 1

    // 執行正規化轉換
    const normalizedData =
      window.VDNormalizationUtils.denormalizeToVDRange?.(frontendDataForNormalization, intersectionId, period) ||
      frontendDataForNormalization

    // 返回正規化前後的對比數據
    return {
      before: {
        ...frontendData,
        totalFlow: frontendDataForNormalization.volume,
      },
      after: {
        averageSpeed: normalizedData.speed || 0,
        occupancy: normalizedData.occupancy * 100 || 0,
        motorFlow: Math.round(normalizedData.volume_m || 0),
        smallCarFlow: Math.round(normalizedData.volume_s || 0),
        largeCarFlow: Math.round(normalizedData.volume_l || 0),
        motorSpeed: frontendData.motorSpeed,
        smallCarSpeed: frontendData.smallCarSpeed,
        largeCarSpeed: frontendData.largeCarSpeed,
        totalFlow: Math.round(normalizedData.volume || 0),
      },
      period,
      multiplier,
      isNormalized: true,
    }
  } catch (error) {
    console.warn(`⚠️ [正規化數據] 無法取得正規化數據: ${error.message}`)
    return {
      before: frontendData,
      after: frontendData,
      period: 'error',
      multiplier: 1,
      isNormalized: false,
    }
  }
}
const eastData = computed(() => getNormalizedTrafficData('east'))
const westData = computed(() => getNormalizedTrafficData('west'))
const southData = computed(() => getNormalizedTrafficData('south'))
const northData = computed(() => getNormalizedTrafficData('north'))

function setupListeners() {
  const upd = () => forceUpdateTrigger.value++
  window.addEventListener('trafficDataUpdated', upd)
  return () => {
    window.removeEventListener('trafficDataUpdated', upd)
  }
}

function updateGenerationConfig() {
  if (isAutoMode.value) return // 如果是自動模式，則不執行手動更新
  if (!window.autoTrafficGenerator) return

  const baseInterval = manualInterval.value

  // 🎯 根據拉桿值自動判斷最接近的情景，用於更新按鈕顯示
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

  // 💡 更新 currentTimeScenario 標籤（用於顯示下方詳細資訊）
  if (closestScenario) {
    currentTimeScenario.value = closestScenario.scenario.key
  }

  // 使用該最接近情景的配置參數
  const s = closestScenario?.scenario || timeScenarios.find((s) => s.key === 'off_peak')
  if (!s) return

  // 📊 新的邏輯：直接使用拉桿值作為基準間隔
  // 不再固定在情景的 normal 值，而是允許拉桿在 0.5-30 秒範圍內自由調動
  // 實際生成間隔 = baseInterval / peakMultiplier（由情景決定）
  const actualInterval = Math.round(baseInterval / s.config.peakMultiplier)
  const minInterval = Math.max(500, Math.round(actualInterval * 0.8))
  const maxInterval = Math.round(actualInterval * 1.2)

  currentInterval.value = baseInterval

  console.log(
    `🎚️ [手動模式] 拉桿: ${(baseInterval / 1000).toFixed(1)}s → 實際間隔: ${actualInterval}ms (基於 ${s.name} 的倍數 ${s.config.peakMultiplier})`,
  )

  // 🔧 CRITICAL FIX：先清除情景模式，確保手動設定不被覆蓋
  if (window.autoTrafficGenerator.currentScenarioMode) {
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

function switchToTimeScenario(key) {
  if (isAutoMode.value) return // 自動模式下禁用
  const s = timeScenarios.find((s) => s.key === key)
  if (!s) return

  // 💡 更新當前情景 key
  currentTimeScenario.value = key

  // 💡 同步拉桿到該情景的標準生成間隔
  manualInterval.value = s.config.interval.normal

  console.log(`🎭 [UI] 切換到情景: ${s.name}，拉桿設定為 ${s.config.interval.normal}ms`)

  // 🔧 清除情景模式計時器，進入純手動模式
  if (window.autoTrafficGenerator) {
    if (window.autoTrafficGenerator.currentScenarioMode) {
      console.log(`🛑 [UI] 清除 currentScenarioMode: ${window.autoTrafficGenerator.currentScenarioMode}`)
      window.autoTrafficGenerator.currentScenarioMode = null
    }
    if (window.autoTrafficGenerator.scenarioModeTimer) {
      clearInterval(window.autoTrafficGenerator.scenarioModeTimer)
      window.autoTrafficGenerator.scenarioModeTimer = null
      console.log(`🛑 [UI] 清除 scenarioModeTimer`)
    }
  }

  // 🎯 立即應用該情景配置
  updateGenerationConfig()
}

// 新增：自動模式切換功能
function toggleAutoMode() {
  isAutoMode.value = !isAutoMode.value
  if (window.autoTrafficGenerator) {
    window.autoTrafficGenerator.toggleAutoMode(isAutoMode.value)
  }
}

onMounted(() => {
  const stopUpdate = startDataUpdate()
  const cleanup = setupListeners()

  let tries = 0
  const tryInit = async () => {
    if (window.trafficController && !window.autoTrafficGenerator) {
      const AutoGen = (await import('../classes/AutoTrafficGenerator.js')).default
      window.autoTrafficGenerator = new AutoGen(window.trafficController)
      window.autoTrafficGenerator.start()

      // 初始化完成後，設定自動模式的回調
      window.autoTrafficGenerator.setOnTimeUpdate((status) => {
        if (status) {
          simulationStatus.value = `${status.time} - ${status.description}`

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
            console.log('💾 [MainLayout] 已保存生成的 VD 數據:', window.currentGeneratedVDData)
          }

          // 獲取當前間隔時間（毫秒轉秒）
          if (window.autoTrafficGenerator.config && window.autoTrafficGenerator.config.interval) {
            const intervalMs =
              window.autoTrafficGenerator.config.interval.normal || window.autoTrafficGenerator.config.interval.min
            currentAutoInterval.value = Math.round(intervalMs / 1000)
          }
        } else {
          simulationStatus.value = null
          currentAutoInterval.value = null
          // 清空保存的 VD 數據
          window.currentGeneratedVDData = null
        }
      })
    } else if (tries++ < 30) {
      setTimeout(tryInit, 100)
    }
  }
  tryInit()

  setTimeout(() => switchToTimeScenario('peak_hours'), 500)

  window.mainLayoutCleanup = () => {
    stopUpdate()
    cleanup()
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

/* 時段場景快速切換 - 緊湊版 */
.time-scenarios-compact {
  display: flex;
  gap: 4px;
  height: 60px;
  flex-shrink: 0;
}

.scenario-btn-compact {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.scenario-btn-compact:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.scenario-btn-compact.active:not(:disabled) {
  background: #007bff;
  border-color: #80bdff;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(0, 123, 255, 0.8);
  transform: translateY(-2px) scale(1.05);
}

/* 🎯 新增：自動匹配時的脈動動畫效果 */
.scenario-btn-compact.auto-matched:not(:disabled) {
  animation: pulse-glow 2s ease-in-out infinite;
  position: relative;
}

/* 🎯 新增：自動匹配指示點 */
.scenario-btn-compact.auto-matched:not(:disabled)::after {
  content: '●';
  position: absolute;
  top: 3px;
  right: 3px;
  color: #00ff00;
  font-size: 8px;
  animation: blink 1.5s ease-in-out infinite;
}

/* 脈動動畫 */
@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.8);
  }
  50% {
    box-shadow:
      0 0 10px rgba(0, 123, 255, 1),
      0 0 15px rgba(0, 255, 255, 0.6);
  }
}

/* 閃爍動畫 */
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.scenario-btn-compact:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scenario-icon {
  font-size: 18px;
  line-height: 1;
}

.scenario-name {
  font-weight: bold;
  font-size: 16px;
  line-height: 1;
  text-align: center;
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

  .time-scenarios-compact {
    gap: 3px;
    height: 45px;
  }

  .scenario-btn-compact {
    font-size: 8px;
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

  .time-scenarios-compact {
    height: 70px;
    gap: 6px;
  }

  .scenario-btn-compact {
    border-radius: 8px;
  }

  .scenario-icon {
    font-size: 22px;
  }

  .scenario-name {
    font-size: 18px;
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
    border-bottom: 1px dotted rgba(255, 255, 255, 0.3);
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
}
</style>
