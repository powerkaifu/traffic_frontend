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
                  <div class="status-dot"></div>
                  <q-btn
                    @click="toggleAutoMode"
                    size="sm"
                    class="mode-toggle-btn"
                    :label="isAutoMode ? '自動模式' : '手動模式'"
                  >
                  </q-btn>
                </div>
              </div>

              <!-- 自動模式狀態顯示 -->
              <div class="simulation-status" v-if="isAutoMode">
                {{ simulationStatus || '正在初始化...' }}
              </div>

              <!-- 時段場景快速切換 -->
              <div class="time-scenarios-compact">
                <button
                  v-for="scenario in timeScenarios"
                  :key="scenario.key"
                  @click="switchToTimeScenario(scenario.key)"
                  :class="['scenario-btn-compact', { active: currentTimeScenario === scenario.key }]"
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
                  <span class="detail-label">頻率 (秒)：</span>
                  <span class="detail-value"
                    >{{ currentScenarioDetails.interval.min / 1000 }} /
                    {{ currentScenarioDetails.interval.max / 1000 }}</span
                  >
                </div>
                <div class="detail-item">
                  <span class="detail-label">機/小/大 (%)：</span>
                  <span class="detail-value">{{ currentScenarioDetails.ratios }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">間隔(s)：</span>
                  <span class="detail-value">{{ (currentInterval / 1000).toFixed(2) }}</span>
                </div>
              </div>

              <!-- 控制與統計 -->
              <div class="control-stats-row">
                <div class="frequency-control">
                  <span class="freq-label">流量強度</span>
                  <input
                    type="range"
                    v-model="manualPeakMultiplier"
                    :min="1.0"
                    :max="2000.0"
                    :step="0.1"
                    @input="updateGenerationConfig"
                    class="freq-slider"
                    :disabled="isAutoMode"
                  />
                  <span class="freq-value">{{ manualPeakMultiplier }}</span>
                </div>
                <div class="frequency-control">
                  <span class="freq-label">生成間隔</span>
                  <input
                    type="range"
                    v-model="manualInterval"
                    :min="0"
                    :max="30000"
                    :step="1"
                    @input="updateGenerationConfig"
                    class="freq-slider"
                    style="flex: 1"
                    :disabled="isAutoMode"
                  />
                  <span class="freq-value">{{ Math.floor(manualInterval / 1000) }}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 數據展示區域 -->
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 新增：自動模式狀態
const isAutoMode = ref(false)
const simulationStatus = ref(null)

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
const manualPeakMultiplier = ref(1.0)
const manualInterval = ref(1000)
const currentInterval = ref(7.0)

const timeScenarios = [
  {
    key: 'peak_hours',
    name: '尖峰時段',
    shortName: '尖峰',
    icon: '🚀',
    timeRange: '07:00-08:00,17:00-18:00',
    config: {
      interval: { min: 100, max: 2000, normal: 1000 },
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 35 },
        { type: 'large', weight: 5 },
      ],
      peakMultiplier: 400,
      maxLiveVehicles: 150,
      densityThresholds: { light: 10, moderate: 20, heavy: 30, congested: 40 },
    },
  },
  {
    key: 'off_peak',
    name: '離峰時段',
    shortName: '離峰',
    icon: '🌞',
    timeRange: '09:00-16:00,19:00-22:00',
    config: {
      interval: { min: 500, max: 6000, normal: 3500 },
      vehicleTypes: [
        { type: 'motor', weight: 30 },
        { type: 'small', weight: 55 },
        { type: 'large', weight: 15 },
      ],
      peakMultiplier: 60,
      maxLiveVehicles: 100,
      densityThresholds: { light: 15, moderate: 30, heavy: 45, congested: 60 },
    },
  },
  {
    key: 'late_night',
    name: '凌晨時段',
    shortName: '凌晨',
    icon: '🌙',
    timeRange: '23:00-06:00',
    config: {
      interval: { min: 10000, max: 20000, normal: 15000 },
      vehicleTypes: [
        { type: 'motor', weight: 80 },
        { type: 'small', weight: 15 },
        { type: 'large', weight: 5 },
      ],
      peakMultiplier: 10,
      maxLiveVehicles: 40,
      densityThresholds: { light: 5, moderate: 10, heavy: 15, congested: 20 },
    },
  },
]

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
  if (window.trafficController) {
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
const eastData = computed(() => getTrafficData('east'))
const westData = computed(() => getTrafficData('west'))
const southData = computed(() => getTrafficData('south'))
const northData = computed(() => getTrafficData('north'))

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
  const s = timeScenarios.find((s) => s.key === currentTimeScenario.value)
  if (!s) return

  const baseInterval = manualInterval.value
  const multiplier = manualPeakMultiplier.value

  let finalInterval = baseInterval
  if (multiplier > 0) {
    finalInterval = Math.round(baseInterval / multiplier)
  }

  finalInterval = Math.max(s.config.interval.min, finalInterval)

  currentInterval.value = finalInterval

  window.autoTrafficGenerator.updateConfig({
    ...s.config,
    interval: { ...s.config.interval, normal: finalInterval },
    peakMultiplier: multiplier,
  })
}

function switchToTimeScenario(key) {
  if (isAutoMode.value) return // 自動模式下禁用
  const s = timeScenarios.find((s) => s.key === key)
  if (!s) return
  currentTimeScenario.value = key

  manualPeakMultiplier.value = s.config.peakMultiplier || 1.0
  manualInterval.value = s.config.interval.normal

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
        } else {
          simulationStatus.value = null
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
</style>
