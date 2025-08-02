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
                      option-value="value"
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
            <!-- 這裡可以放展示數據的內容 -->
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
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

const rightDrawerOpen = ref(false)
const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// 場景參數設定的資料定義
const selectedIntersection = ref('東向路口') // 對應 '東向路口'
const selectedScenario = ref('一般') // 對應 '一般'
const motorcycleCount = ref(0) // Volume_M
const smallCarCount = ref(0) // Volume_S
const largeCarCount = ref(0) // Volume_L

// 選項資料
const intersectionOptions = [
  { label: '東向路口', value: '東' },
  { label: '西向路口', value: '西' },
  { label: '南向路口', value: '南' },
  { label: '北向路口', value: '北' },
]

const scenarioOptions = [
  { label: '流暢', value: 'smooth' },
  { label: '一般', value: 'normal' },
  { label: '擁擠', value: 'congested' },
]

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
  console.log('送出交通設定:', trafficData)
  // 這裡可以添加發送到後端的邏輯
}

// 重置車輛數量
const resetVehicleCounts = () => {
  motorcycleCount.value = 0
  smallCarCount.value = 0
  largeCarCount.value = 0
  console.log('已重置所有車輛數量')
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
  padding: 20px 0;
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
  margin-top: -1px;
  border-radius: 0 0 8px 8px;
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
}

@media (max-width: 480px) {
  .q-toolbar-title img {
    width: 100px;
  }

  .nav-button {
    height: 25px;
    max-width: 60px;
  }
}
</style>
