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
            <!-- 場景參數設定面板 -->
            <q-card flat class="traffic-config-panel">
              <q-card-section class="config-container">
                <!-- 左側控制區域 -->
                <div class="left-controls">
                  <!-- 路口選擇下拉選單 -->
                  <div class="control-group">
                    <label class="control-label">選擇路口：</label>
                    <q-select
                      v-model="selectedIntersection"
                      :options="intersectionOptions"
                      outlined
                      dense
                      dark
                      class="intersection-select"
                      option-value="label"
                      option-label="label"
                      emit-value
                      map-options
                    />
                  </div>

                  <!-- 預設場景參數下拉選單 -->
                  <div class="control-group">
                    <label class="control-label">預設場景：</label>
                    <q-select
                      v-model="selectedScenario"
                      :options="scenarioOptions"
                      outlined
                      dense
                      dark
                      class="scenario-select"
                      option-value="value"
                      option-label="label"
                    />
                  </div>
                </div>

                <!-- 右側拉桿區域 -->
                <div class="right-sliders">
                  <!-- 機車數量拉桿 -->
                  <div class="slider-group">
                    <div class="slider-row">
                      <div class="vehicle-info">
                        <q-icon name="motorcycle" color="orange" size="sm" />
                        <span class="vehicle-label">機車</span>
                      </div>
                      <div class="slider-container">
                        <q-slider
                          v-model="motorcycleCount"
                          :min="0"
                          :max="30"
                          :step="1"
                          color="orange"
                          track-color="grey-8"
                          thumb-color="orange"
                          class="vehicle-slider"
                        />
                        <span class="vehicle-count">{{ motorcycleCount }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 小型車數量拉桿 -->
                  <div class="slider-group">
                    <div class="slider-row">
                      <div class="vehicle-info">
                        <q-icon name="directions_car" color="blue" size="sm" />
                        <span class="vehicle-label">小型車</span>
                      </div>
                      <div class="slider-container">
                        <q-slider
                          v-model="smallCarCount"
                          :min="0"
                          :max="30"
                          :step="1"
                          color="blue"
                          track-color="grey-8"
                          thumb-color="blue"
                          class="vehicle-slider"
                        />
                        <span class="vehicle-count">{{ smallCarCount }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 大型車數量拉桿 -->
                  <div class="slider-group">
                    <div class="slider-row">
                      <div class="vehicle-info">
                        <q-icon name="local_shipping" color="green" size="sm" />
                        <span class="vehicle-label">大型車</span>
                      </div>
                      <div class="slider-container">
                        <q-slider
                          v-model="largeCarCount"
                          :min="0"
                          :max="30"
                          :step="1"
                          color="green"
                          track-color="grey-8"
                          thumb-color="green"
                          class="vehicle-slider"
                        />
                        <span class="vehicle-count">{{ largeCarCount }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 操作按鈕區域 -->
                  <div class="action-buttons">
                    <img
                      src="/images/button/startBtn.png"
                      alt="送出"
                      class="action-btn start-btn"
                      @click="submitTrafficData"
                    />
                    <img
                      src="/images/button/resetBtn.png"
                      alt="重置"
                      class="action-btn reset-btn"
                      @click="resetVehicleCounts"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- 展示數據區域 - dataBg.png 背景 -->
        <div class="data-section">
          <!-- 頂部按鈕區域 -->
          <div class="data-section-buttons">
            <div class="top-buttons">
              <img src="/images/button/setDataBtnOn.png" alt="特徵模擬數據" class="control-button" />
              <img src="/images/button/stateDataBtnOff.png" alt="路口動態數據" class="control-button" />
            </div>
          </div>

          <!-- 數據顯示區域 -->
          <div class="data-section-content">
            <!-- 四個區域的數據顯示 -->
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

// 場景參數設定的資料定義
const selectedIntersection = ref('東向路口') // 對應 '東向路口'
const selectedScenario = ref('一般') // 對應 '一般'
const motorcycleCount = ref(5) // Volume_M
const smallCarCount = ref(8) // Volume_S
const largeCarCount = ref(3) // Volume_L

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

// 響應式配置數據
const config = computed(() => getTrafficControllerConfig())
const scenarioPresets = computed(() => config.value.scenarioPresets)
const intersectionOptions = computed(() => config.value.intersectionOptions)
const scenarioOptions = computed(() => config.value.scenarioOptions)

// 從 TrafficLightController 獲取交通數據
const getTrafficData = (direction) => {
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

  // 預設數據（如果 TrafficController 尚未初始化）
  return {
    averageSpeed: 30,
    occupancy: 22.0,
    motorFlow: 5,
    smallCarFlow: 8,
    largeCarFlow: 3,
    motorSpeed: 35,
    smallCarSpeed: 30,
    largeCarSpeed: 22,
  }
}

// 各方向的交通數據
const eastData = computed(() => getTrafficData('east'))
const westData = computed(() => getTrafficData('west'))
const southData = computed(() => getTrafficData('south'))
const northData = computed(() => getTrafficData('north'))

// 數據更新定時器
const dataUpdateInterval = ref(null)

// 開始數據更新定時器
const startDataUpdate = () => {
  if (dataUpdateInterval.value) {
    clearInterval(dataUpdateInterval.value)
  }

  dataUpdateInterval.value = setInterval(() => {
    // 觸發響應式數據更新
    if (window.trafficController) {
      console.log('🔄 更新交通數據顯示')
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
})

// 組件卸載時清理資源
onUnmounted(() => {
  stopDataUpdate()
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

// 送出交通數據
const submitTrafficData = () => {
  const trafficData = {
    intersection: selectedIntersection.value,
    scenario: selectedScenario.value,
    motorcycleCount: motorcycleCount.value,
    smallCarCount: smallCarCount.value,
    largeCarCount: largeCarCount.value,
  }
  console.log('🚦 送出交通設定:', trafficData)

  // 通知全域交通控制器更新車輛數據
  if (window.trafficController) {
    // 使用 TrafficLightController 的新方法來處理方向轉換
    const direction = window.trafficController.normalizeDirection(selectedIntersection.value.replace('向路口', ''))

    if (direction) {
      // 使用 TrafficLightController 的車輛數據更新方法
      const vehicleData = {
        motorcycle: motorcycleCount.value,
        small: smallCarCount.value,
        large: largeCarCount.value,
      }

      const success = window.trafficController.updateDirectionVehicleData(direction, vehicleData)

      if (success) {
        console.log(`✅ 已更新 ${direction} 方向車輛數據`)
        // 顯示成功提示
        $q.notify({
          type: 'positive',
          message: `已更新 ${selectedIntersection.value} 車輛數據`,
          position: 'top',
        })
      } else {
        console.error(`❌ 更新 ${direction} 方向車輛數據失敗`)
        $q.notify({
          type: 'negative',
          message: '更新車輛數據失敗',
          position: 'top',
        })
      }
    } else {
      console.error(`❌ 無效的路口選擇: ${selectedIntersection.value}`)
    }
  } else {
    console.warn('⚠️ TrafficController 尚未初始化')
    $q.notify({
      type: 'warning',
      message: 'TrafficController 尚未初始化',
      position: 'top',
    })
  }
}

// 重置車輛數量
const resetVehicleCounts = () => {
  motorcycleCount.value = 0
  smallCarCount.value = 0
  largeCarCount.value = 0

  // 同時重置 TrafficController 中對應方向的數據
  if (window.trafficController) {
    const direction = window.trafficController.normalizeDirection(selectedIntersection.value.replace('向路口', ''))

    if (direction) {
      window.trafficController.resetDirectionVehicleData(direction)
      console.log(`🔄 已重置 ${direction} 方向的車輛數量`)

      $q.notify({
        type: 'info',
        message: `已重置 ${selectedIntersection.value} 車輛數量`,
        position: 'top',
      })
    }
  } else {
    console.log('🔄 已重置本地車輛數量')
  }
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

/* 場景參數設定面板樣式 */
.traffic-config-panel {
  background: transparent;
  width: 100%;
  position: relative;
  top: -5px;
}

.config-container {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

/* 左側控制區域 */
.left-controls {
  flex: 0 0 120px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 12px;
  height: 100%;
  padding-right: 20px;
  position: relative;
  top: -10px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  justify-content: center;
}

.control-label {
  color: white;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
}

.intersection-select,
.scenario-select {
  background: rgba(255, 255, 255, 0.2);
  font-size: 12px;
  min-height: 20px;
}

/* 分隔線 */
.section-divider {
  border-color: rgba(255, 255, 255, 0.2);
}

/* 右側拉桿區域 */
.right-sliders {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  height: 100%;
  width: 100%;
  min-width: 0;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  justify-content: center;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vehicle-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 80px;
}

.vehicle-label {
  color: white;
  font-size: 12px;
  white-space: nowrap;
}

.slider-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.vehicle-slider {
  flex: 1;
}

.vehicle-count {
  color: white;
  font-size: 12px;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 3px;
  min-width: 24px;
  text-align: center;
  flex: 0 0 auto;
}

/* 操作按鈕樣式 */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}

.action-btn {
  height: clamp(25px, 4vh, 35px);
  width: auto;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.action-btn:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

.start-btn {
  max-width: clamp(60px, 15%, 80px);
}

.reset-btn {
  max-width: clamp(60px, 15%, 80px);
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
