<template>
  <q-page class="visualization-page">
    <div class="visualization-container">
      <!-- 子路由導航 -->
      <div class="nav-tabs">
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey"
          active-color="info"
          indicator-color="info"
          align="justify"
          narrow-indicator
        >
          <q-tab name="timeseries" label="綠燈秒數時間序列分析" @click="navigateToTab('timeseries')" />
          <q-tab name="correlation" label="流量與燈號關聯性分析" @click="navigateToTab('correlation')" />
          <q-tab name="summary" label="智能分析與數據統計" @click="navigateToTab('summary')" />
        </q-tabs>
      </div>

      <!-- 主要內容區域 -->
      <div class="main-content">
        <!-- 時間序列分析 -->
        <div v-show="activeTab === 'timeseries'" class="chart-container">
          <q-card class="chart-card">
            <q-card-section>
              <div class="chart-header">
                <h3>綠燈秒數時間序列分析</h3>
              </div>
              <!-- 控制面板 -->
              <div class="control-panel">
                <q-card class="control-card">
                  <q-card-section class="control-section">
                    <!-- 開始日期選擇器 -->
                    <div class="date-group">
                      <label class="date-label">開始日期</label>
                      <div class="date-controls">
                        <q-select
                          v-model="startYear"
                          :options="yearOptions"
                          label="年"
                          color="primary"
                          dark
                          outlined
                          dense
                          class="date-select"
                          @update:model-value="onDateChange"
                        />
                        <q-select
                          v-model="startMonth"
                          :options="monthOptions"
                          label="月"
                          color="primary"
                          dark
                          outlined
                          dense
                          class="date-select"
                          @update:model-value="onDateChange"
                        />
                        <q-select
                          v-model="startDay"
                          :options="getDayOptions(startYear, startMonth)"
                          label="日"
                          color="primary"
                          dark
                          outlined
                          dense
                          class="date-select"
                          @update:model-value="onDateChange"
                        />
                      </div>
                    </div>

                    <!-- 結束日期選擇器 -->
                    <div class="date-group">
                      <label class="date-label">結束日期</label>
                      <div class="date-controls">
                        <q-select
                          v-model="endYear"
                          :options="yearOptions"
                          label="年"
                          color="primary"
                          dark
                          outlined
                          dense
                          class="date-select"
                          @update:model-value="onDateChange"
                        />
                        <q-select
                          v-model="endMonth"
                          :options="monthOptions"
                          label="月"
                          color="primary"
                          dark
                          outlined
                          dense
                          class="date-select"
                          @update:model-value="onDateChange"
                        />
                        <q-select
                          v-model="endDay"
                          :options="getDayOptions(endYear, endMonth)"
                          label="日"
                          color="primary"
                          dark
                          outlined
                          dense
                          class="date-select"
                          @update:model-value="onDateChange"
                        />
                      </div>
                    </div>

                    <!-- 載入按鈕 -->
                    <div class="load-button">
                      <q-btn
                        @click="loadData"
                        :loading="loading"
                        color="primary"
                        icon="refresh"
                        label="載入數據"
                        size="md"
                        style="font-size: 16px"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div ref="timeSeriesChart" class="chart-area timeseries-chart"></div>
            </q-card-section>
          </q-card>
        </div>

        <!-- 關聯性分析 -->
        <div v-show="activeTab === 'correlation'" class="chart-container">
          <q-card class="chart-card">
            <q-card-section>
              <div class="chart-header">
                <h3>流量與燈號關聯性分析</h3>
                <!-- 添加日期範圍顯示 -->
                <div class="date-range-display" v-if="trafficData.length > 0">
                  <q-chip color="transparent" text-color="white" icon="date_range" class="date-chip">
                    搜尋日期範圍：{{ getFormattedDateRange() }}
                  </q-chip>
                </div>
              </div>
              <div class="correlation-charts">
                <div ref="scatterChart" class="chart-area scatter-chart"></div>
                <div ref="heatmapChart" class="chart-area heatmap-chart"></div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- 智能分析與數據統計 -->
        <div v-show="activeTab === 'summary'" class="chart-container">
          <q-card class="chart-card">
            <q-card-section>
              <div class="chart-header">
                <h3>智能分析與數據統計</h3>
                <div class="date-range-display" v-if="trafficData.length > 0">
                  <q-chip color="transparent" text-color="white" icon="date_range" class="date-chip">
                    搜尋日期範圍：{{ getFormattedDateRange() }}
                  </q-chip>
                </div>
              </div>

              <div class="summary-grid">
                <q-card class="summary-card">
                  <q-card-section>
                    <div class="summary-item">
                      <q-icon name="timeline" size="2rem" color="primary" />
                      <div class="summary-content">
                        <div class="summary-label">平均東西向秒數</div>
                        <div class="summary-value">{{ summaryStats.avgEastWest }}s</div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>

                <q-card class="summary-card">
                  <q-card-section>
                    <div class="summary-item">
                      <q-icon name="timeline" size="2rem" color="secondary" />
                      <div class="summary-content">
                        <div class="summary-label">平均南北向秒數</div>
                        <div class="summary-value">{{ summaryStats.avgSouthNorth }}s</div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>

                <q-card class="summary-card">
                  <q-card-section>
                    <div class="summary-item">
                      <q-icon name="traffic" size="2rem" color="positive" />
                      <div class="summary-content">
                        <div class="summary-label">總交通流量</div>
                        <div class="summary-value">{{ summaryStats.totalVolume }}</div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>

                <q-card class="summary-card">
                  <q-card-section>
                    <div class="summary-item">
                      <q-icon name="speed" size="2rem" color="info" />
                      <div class="summary-content">
                        <div class="summary-label">平均車速</div>
                        <div class="summary-value">{{ summaryStats.avgSpeed }} km/h</div>
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <!-- OpenAI 智能分析區塊 -->
              <div class="ai-analysis-section">
                <div class="ai-controls">
                  <q-select
                    v-model="selectedQuestion"
                    :options="analysisQuestions"
                    option-value="value"
                    option-label="label"
                    label="選擇分析問題"
                    color="primary"
                    dark
                    outlined
                    dense
                    class="ai-question-select"
                    hide-hint
                  />
                  <q-btn
                    @click="analyzeWithAI"
                    :loading="aiAnalyzing"
                    :disable="!selectedQuestion || trafficData.length === 0"
                    color="primary"
                    icon="psychology"
                    label="數據分析"
                    size="md"
                    class="ai-analyze-btn"
                  />
                </div>

                <!-- AI 分析載入中 -->
                <div v-if="aiAnalyzing" class="ai-loading-card">
                  <div class="ai-loading-content">
                    <q-spinner-ios size="40px" color="primary" />
                    <div class="ai-loading-text">
                      <div class="ai-loading-title">AI 正在分析中...</div>
                      <div class="ai-loading-subtitle">請稍候，正在處理您的數據</div>
                    </div>
                  </div>
                </div>

                <!-- AI 分析結果顯示 -->
                <div v-else-if="aiAnalysisResult" class="ai-result-card">
                  <div class="ai-result-header">
                    <q-icon name="psychology" size="1.5rem" color="primary" />
                    <span class="ai-result-title">AI 智能分析結果</span>
                    <q-space />
                    <q-btn @click="copyAnalysisResult" icon="content_copy" flat round dense color="white" size="sm">
                      <q-tooltip>複製分析結果</q-tooltip>
                    </q-btn>
                    <q-btn @click="downloadAnalysisReport" icon="download" flat round dense color="white" size="sm">
                      <q-tooltip>下載分析報告</q-tooltip>
                    </q-btn>
                  </div>
                  <div class="ai-result-content" v-html="formatAnalysisResult(aiAnalysisResult)"></div>
                </div>

                <!-- 空白狀態提示 -->
                <div v-else class="ai-empty-state">
                  <div class="ai-empty-content">
                    <q-icon name="psychology" size="3rem" color="primary" class="ai-empty-icon" />
                    <div class="ai-empty-text">
                      <div class="ai-empty-title">AI 智能分析</div>
                      <div class="ai-empty-subtitle">選擇問題並點擊「AI 分析」開始數據解讀</div>
                    </div>
                  </div>
                </div>

                <!-- 錯誤提示 -->
                <div v-if="aiAnalysisError" class="ai-error-card">
                  <q-icon name="error" size="1.5rem" color="negative" />
                  <span class="ai-error-message">{{ aiAnalysisError }}</span>
                  <q-btn
                    @click="retryAnalysis"
                    icon="refresh"
                    flat
                    dense
                    color="negative"
                    label="重試"
                    size="sm"
                    class="ai-retry-btn"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- 詳細資訊彈出視窗 -->
      <q-dialog v-model="showDetailDialog" position="right" full-height>
        <q-card class="detail-dialog" style="width: 400px">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">詳細資訊</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section v-if="selectedPoint">
            <div class="detail-content">
              <div class="detail-item"><strong>時間:</strong> {{ formatDateTime(selectedPoint.group.timestamp) }}</div>
              <div class="detail-item"><strong>東西向燈號:</strong> {{ selectedPoint.group.east_west_seconds }}秒</div>
              <div class="detail-item">
                <strong>南北向燈號:</strong> {{ selectedPoint.group.south_north_seconds }}秒
              </div>
              <div class="detail-item"><strong>VD 站點數:</strong> {{ selectedPoint.intersections.length }}</div>

              <div v-for="intersection in sortedIntersections" :key="intersection.id" class="intersection-detail">
                <h4>{{ intersection.VD_ID }}{{ getDirectionLabel(intersection) }}</h4>
                <div class="intersection-stats">
                  <div>總流量: {{ intersection.total_volume }}</div>
                  <div>平均速度: {{ intersection.Speed.toFixed(1) }} km/h</div>
                  <div>佔有率: {{ intersection.Occupancy.toFixed(1) }}%</div>
                  <div>尖峰時段: {{ intersection.IsPeakHour ? '是' : '否' }}</div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- 載入中覆蓋層 -->
      <q-inner-loading :showing="loading">
        <q-spinner-gears size="50px" color="primary" />
      </q-inner-loading>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { date, copyToClipboard, useQuasar } from 'quasar'
import * as d3 from 'd3'
import { trafficAPI, analyzeTrafficDataWithAI, prepareTrafficDataSummary, ANALYSIS_QUESTIONS } from '../api/index.js'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

// 響應式數據
const loading = ref(false)
const activeTab = ref('timeseries')

// 設定預設日期為最近一週
const today = new Date()
const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

const startYear = ref(oneWeekAgo.getFullYear())
const startMonth = ref(oneWeekAgo.getMonth() + 1)
const startDay = ref(oneWeekAgo.getDate())
const endYear = ref(today.getFullYear())
const endMonth = ref(today.getMonth() + 1)
const endDay = ref(today.getDate())
const showDetailDialog = ref(false)
const selectedPoint = ref(null)

// 流量與燈號關聯性分析 - VD 站點選擇
const selectedVD = ref('VLRJX20') // 預設選擇第一個 VD

// 圖表容器引用
const timeSeriesChart = ref(null)
const scatterChart = ref(null)
const heatmapChart = ref(null)

// OpenAI 智能分析相關變數
const selectedQuestion = ref('')
const aiAnalyzing = ref(false)
const aiAnalysisResult = ref('')
const aiAnalysisError = ref('')
const analysisQuestions = ref(ANALYSIS_QUESTIONS)

// 數據
const trafficData = ref([])
const summaryStats = reactive({
  avgEastWest: 0,
  avgSouthNorth: 0,
  totalVolume: 0,
  avgSpeed: 0,
})

// 生成年份選項
const generateYearOptions = () => {
  const options = []
  const currentYear = new Date().getFullYear()
  // 確保包含未來一年，以防資料可能在未來日期
  for (let year = 2020; year <= currentYear + 1; year++) {
    options.push({ label: year.toString(), value: year })
  }
  return options
}

// 生成月份選項
const generateMonthOptions = () => {
  const options = []
  for (let month = 1; month <= 12; month++) {
    options.push({
      label: month.toString().padStart(2, '0'),
      value: month,
    })
  }
  return options
}

// 生成日期選項
const getDayOptions = (year, month) => {
  if (!year || !month) return []

  const daysInMonth = new Date(year, month, 0).getDate()
  const options = []
  for (let day = 1; day <= daysInMonth; day++) {
    options.push({
      label: day.toString().padStart(2, '0'),
      value: day,
    })
  }
  return options
}

const yearOptions = generateYearOptions()
const monthOptions = generateMonthOptions()

// 排序路口資訊的 computed property
const sortedIntersections = computed(() => {
  if (!selectedPoint.value || !selectedPoint.value.intersections) {
    return []
  }

  // 定義排序順序：VLRJX20（往東）、VLRJM60（往西）、VLRJX00（往南）、VLRJX00（往北）
  const getOrderPriority = (intersection) => {
    const vdId = intersection.VD_ID
    const laneId = intersection.LaneID

    if (vdId.includes('VLRJX20')) {
      return 1 // 往東
    } else if (vdId.includes('VLRJM60')) {
      return 2 // 往西
    } else if (vdId.includes('VLRJX00')) {
      // 使用 LaneID 來區分南北方向
      // 假設 LaneID 2 是往南，LaneID 3 是往北
      if (laneId === 2) {
        return 3 // 往南
      } else if (laneId === 3) {
        return 4 // 往北
      } else {
        return 3.5 // 其他 VLRJX00 的情況，放在南北之間
      }
    }
    return 999 // 其他未知 VD_ID 排在最後
  }

  // 按照指定順序排序
  const sorted = [...selectedPoint.value.intersections].sort((a, b) => {
    const aPriority = getOrderPriority(a)
    const bPriority = getOrderPriority(b)

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    // 相同優先級，按 VD_ID 字母順序排序
    return a.VD_ID.localeCompare(b.VD_ID)
  })

  return sorted
})

// 獲取 VD_ID 的方向說明
const getDirectionLabel = (intersection) => {
  const vdId = intersection.VD_ID
  const laneId = intersection.LaneID

  if (vdId.includes('VLRJX20')) {
    return '（往東）'
  } else if (vdId.includes('VLRJM60')) {
    return '（往西）'
  } else if (vdId.includes('VLRJX00')) {
    // 使用 LaneID 來區分南北方向
    if (laneId === 2) {
      return '（往南）'
    } else if (laneId === 3) {
      return '（往北）'
    } else {
      return '（往南/北）' // 備用標籤
    }
  }
  return ''
}

const formatDateTime = (timestamp) => {
  return date.formatDate(new Date(timestamp), 'YYYY-MM-DD HH:mm:ss')
}

// 格式化日期範圍顯示
const getFormattedDateRange = () => {
  const startYearVal = typeof startYear.value === 'object' ? startYear.value.value : startYear.value
  const startMonthVal = typeof startMonth.value === 'object' ? startMonth.value.value : startMonth.value
  const startDayVal = typeof startDay.value === 'object' ? startDay.value.value : startDay.value
  const endYearVal = typeof endYear.value === 'object' ? endYear.value.value : endYear.value
  const endMonthVal = typeof endMonth.value === 'object' ? endMonth.value.value : endMonth.value
  const endDayVal = typeof endDay.value === 'object' ? endDay.value.value : endDay.value

  const startDate = `${startYearVal}-${startMonthVal.toString().padStart(2, '0')}-${startDayVal.toString().padStart(2, '0')}`
  const endDate = `${endYearVal}-${endMonthVal.toString().padStart(2, '0')}-${endDayVal.toString().padStart(2, '0')}`

  return `${startDate} ~ ${endDate}`
}

// 事件處理器
const onDateChange = () => {
  // 日期改變時不自動載入數據，讓用戶主動點擊「載入數據」按鈕
  console.log('日期已更新，請點擊載入數據按鈕以獲取新數據')
}

const navigateToTab = (tabName) => {
  activeTab.value = tabName

  // 將小寫的 tab 名稱轉換為對應的路由名稱
  const routeNameMap = {
    timeseries: 'TimeSeries',
    correlation: 'Correlation',
    summary: 'Summary',
  }

  const routeName = routeNameMap[tabName]
  if (routeName) {
    router.push({ name: routeName })
  }

  nextTick(() => {
    if (trafficData.value.length > 0) {
      updateCharts()
    }
  })
}

// 數據載入
const loadData = async () => {
  // 檢查必要的日期欄位
  if (!startYear.value || !startMonth.value || !startDay.value || !endYear.value || !endMonth.value || !endDay.value) {
    alert('請選擇完整的開始和結束日期')
    return
  }

  loading.value = true
  try {
    // 添加調試信息
    console.log('=== 日期驗證調試 ===')
    console.log('startYear:', startYear.value, typeof startYear.value)
    console.log('startMonth:', startMonth.value, typeof startMonth.value)
    console.log('startDay:', startDay.value, typeof startDay.value)
    console.log('endYear:', endYear.value, typeof endYear.value)
    console.log('endMonth:', endMonth.value, typeof endMonth.value)
    console.log('endDay:', endDay.value, typeof endDay.value)

    // 提取實際的值（處理可能的物件格式）
    const startYearVal = typeof startYear.value === 'object' ? startYear.value.value : startYear.value
    const startMonthVal = typeof startMonth.value === 'object' ? startMonth.value.value : startMonth.value
    const startDayVal = typeof startDay.value === 'object' ? startDay.value.value : startDay.value
    const endYearVal = typeof endYear.value === 'object' ? endYear.value.value : endYear.value
    const endMonthVal = typeof endMonth.value === 'object' ? endMonth.value.value : endMonth.value
    const endDayVal = typeof endDay.value === 'object' ? endDay.value.value : endDay.value

    console.log('提取後的值:')
    console.log('startYearVal:', startYearVal, typeof startYearVal)
    console.log('startMonthVal:', startMonthVal, typeof startMonthVal)
    console.log('startDayVal:', startDayVal, typeof startDayVal)
    console.log('endYearVal:', endYearVal, typeof endYearVal)
    console.log('endMonthVal:', endMonthVal, typeof endMonthVal)
    console.log('endDayVal:', endDayVal, typeof endDayVal)

    const startDate = `${startYearVal}-${startMonthVal.toString().padStart(2, '0')}-${startDayVal.toString().padStart(2, '0')}`
    const endDate = `${endYearVal}-${endMonthVal.toString().padStart(2, '0')}-${endDayVal.toString().padStart(2, '0')}`

    console.log('生成的日期字串:')
    console.log('startDate:', startDate)
    console.log('endDate:', endDate)

    // 驗證日期格式
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)

    console.log('解析後的日期物件:')
    console.log('startDateObj:', startDateObj, '有效:', !isNaN(startDateObj.getTime()))
    console.log('endDateObj:', endDateObj, '有效:', !isNaN(endDateObj.getTime()))

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      alert('日期格式無效，請檢查選擇的日期')
      return
    }

    if (startDateObj > endDateObj) {
      alert('開始日期不能晚於結束日期')
      return
    }

    console.log('=== API 呼叫開始 ===')
    console.log('載入數據範圍:', startDate, '到', endDate)
    console.log('API URL: http://127.0.0.1:8000/api/traffic/query/')
    console.log('參數:', { start_date: startDate, end_date: endDate })

    const params = {
      startDate: startDate,
      endDate: endDate,
    }

    // 使用真實的後端 API
    const backendResponse = await trafficAPI.getVisualizationData(params)
    console.log('後端原始響應:', backendResponse)

    // 轉換後端數據格式
    const response = trafficAPI.transformBackendData(backendResponse)
    console.log('轉換後的數據:', response)

    trafficData.value = response.data || []

    calculateSummaryStats()
    updateCharts()
  } catch (error) {
    console.error('=== API 呼叫失敗 ===')
    console.error('錯誤詳情:', error)
    console.error('錯誤消息:', error.message)

    if (error.response) {
      console.error('HTTP 狀態碼:', error.response.status)
      console.error('響應數據:', error.response.data)
      console.error('響應標頭:', error.response.headers)
    } else if (error.request) {
      console.error('網路錯誤，無響應:', error.request)
    }

    // 清空數據
    trafficData.value = []

    // 根據錯誤類型顯示不同的錯誤訊息
    let errorMessage = '載入數據失敗'
    if (error.response?.status === 400) {
      errorMessage = '請求參數錯誤，請檢查選擇的日期範圍是否正確'
    } else if (error.response?.status === 404) {
      errorMessage = 'API 端點不存在，請檢查後端服務'
    } else if (error.response?.status === 500) {
      errorMessage = '後端服務錯誤，請稍後再試'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '無法連接到後端服務，請確認後端是否正在運行'
    }

    alert(errorMessage + '。錯誤: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 統計計算
const calculateSummaryStats = () => {
  if (trafficData.value.length === 0) return

  const eastWestSum = trafficData.value.reduce((sum, item) => sum + item.group.east_west_seconds, 0)
  const southNorthSum = trafficData.value.reduce((sum, item) => sum + item.group.south_north_seconds, 0)

  let totalVolumeSum = 0
  let speedSum = 0
  let intersectionCount = 0

  trafficData.value.forEach((item) => {
    item.intersections.forEach((intersection) => {
      totalVolumeSum += intersection.total_volume
      speedSum += intersection.Speed
      intersectionCount++
    })
  })

  summaryStats.avgEastWest = Math.round(eastWestSum / trafficData.value.length)
  summaryStats.avgSouthNorth = Math.round(southNorthSum / trafficData.value.length)
  summaryStats.totalVolume = totalVolumeSum.toLocaleString()
  summaryStats.avgSpeed = (speedSum / intersectionCount).toFixed(1)
}

// 圖表更新
const updateCharts = () => {
  if (activeTab.value === 'timeseries') {
    drawTimeSeriesChart()
  } else if (activeTab.value === 'correlation') {
    drawScatterChart()
    drawHeatmapChart()
  }
}

// OpenAI 智能分析方法
const analyzeWithAI = async () => {
  if (!selectedQuestion.value) {
    aiAnalysisError.value = '請選擇一個分析問題'
    return
  }

  if (!trafficData.value || trafficData.value.length === 0) {
    aiAnalysisError.value = '目前沒有交通數據可供分析'
    return
  }

  try {
    aiAnalyzing.value = true
    aiAnalysisError.value = ''
    aiAnalysisResult.value = ''

    // 準備數據摘要
    const { startDate, endDate } = getFormattedDateRange()
    const dateRange = `${startDate} 至 ${endDate}`
    const dataSummary = prepareTrafficDataSummary(trafficData.value, summaryStats, [], dateRange)

    // 調用 OpenAI API 分析
    const questionText = selectedQuestion.value.label || selectedQuestion.value
    const result = await analyzeTrafficDataWithAI(questionText, dataSummary)
    aiAnalysisResult.value = result

    $q.notify({
      type: 'positive',
      message: 'AI 分析完成',
      position: 'top',
    })
  } catch (error) {
    console.error('AI分析錯誤:', error)
    aiAnalysisError.value = error.message || '分析過程中發生錯誤，請稍後再試'

    $q.notify({
      type: 'negative',
      message: 'AI 分析失敗',
      position: 'top',
    })
  } finally {
    aiAnalyzing.value = false
  }
}

const copyAnalysisResult = async () => {
  if (!aiAnalysisResult.value) return

  try {
    await copyToClipboard(aiAnalysisResult.value)
    $q.notify({
      type: 'positive',
      message: '分析結果已複製到剪貼簿',
      position: 'top',
    })
  } catch (error) {
    console.error('複製失敗:', error)
    $q.notify({
      type: 'negative',
      message: '複製失敗',
      position: 'top',
    })
  }
}

const downloadAnalysisReport = () => {
  if (!aiAnalysisResult.value) return

  const { startDate, endDate } = getFormattedDateRange()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `AI交通分析報告_${startDate}_${endDate}_${timestamp}.txt`

  const content = `交通流量AI分析報告
生成時間: ${new Date().toLocaleString('zh-TW')}
數據期間: ${startDate} 至 ${endDate}
分析問題: ${selectedQuestion.value.label || selectedQuestion.value}

分析結果:
${aiAnalysisResult.value}
`

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  $q.notify({
    type: 'positive',
    message: '分析報告已下載',
    position: 'top',
  })
}

const retryAnalysis = () => {
  aiAnalysisError.value = ''
  analyzeWithAI()
}

const formatAnalysisResult = (result) => {
  if (!result) return ''

  // 格式化結果，添加適當的換行和縮排
  return result
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

// 時間序列圖表
const drawTimeSeriesChart = () => {
  if (!timeSeriesChart.value) return

  // 清除舊圖表
  d3.select(timeSeriesChart.value).selectAll('*').remove()

  // 確保容器有正確的尺寸
  if (timeSeriesChart.value.clientWidth === 0) {
    // 如果容器寬度為 0，延遲重繪
    setTimeout(() => drawTimeSeriesChart(), 100)
    return
  }

  // 如果沒有資料，顯示提示訊息
  if (trafficData.value.length === 0) {
    const containerWidth = timeSeriesChart.value.clientWidth
    const containerHeight = Math.max(500, window.innerHeight - 350)

    const svg = d3
      .select(timeSeriesChart.value)
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .style('background', 'rgba(25, 118, 210, 0.02)')
      .style('border-radius', '8px')
      .style('border', '2px dashed rgba(25, 118, 210, 0.2)')

    // 添加無資料提示
    const noDataGroup = svg.append('g').attr('transform', `translate(${containerWidth / 2}, ${containerHeight / 2})`)

    // 添加圖示
    noDataGroup
      .append('circle')
      .attr('r', 50)
      .attr('fill', 'none')
      .attr('stroke', '#1976d2')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '10,5')
      .style('opacity', 0.6)

    // 查無資料
    noDataGroup
      .append('text')
      .attr('font-size', '50')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .style('fill', '#1976d2')
      .text('📊')

    noDataGroup
      .append('text')
      .attr('font-size', '30')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('y', 60)
      .style('fill', '#1976d2')
      .text('查無資料')

    // 添加說明文字
    noDataGroup
      .append('text')
      .attr('font-size', '22')
      .attr('text-anchor', 'middle')
      .attr('y', 100)
      .style('fill', '#ccc')
      .text('所選日期範圍沒有資料')

    // 添加建議文字
    noDataGroup
      .append('text')
      .attr('font-size', '20')
      .attr('text-anchor', 'middle')
      .attr('y', 130)
      .style('fill', '#ccc')
      .text('請選擇其他日期或檢查資料來源')

    return
  }

  const margin = { top: 30, right: 100, bottom: 80, left: 80 }
  const containerWidth = timeSeriesChart.value.clientWidth
  const width = Math.max(830, containerWidth - margin.left - margin.right + 30) // 寬度增加 30px
  // 計算動態高度，使圖表佔用更多視窗空間
  const availableHeight = window.innerHeight - 350 // 減去控制面板和標題的高度
  const height = Math.max(530, availableHeight + 30) - margin.top - margin.bottom // 高度增加 30px

  console.log(`重繪時間序列圖表 - 容器寬度: ${containerWidth}px, 圖表寬度: ${width}px`)

  const svg = d3
    .select(timeSeriesChart.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .style('opacity', 1)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  // 解析時間
  console.log('開始解析時間數據...')
  console.log('第一筆數據的時間戳記:', trafficData.value[0]?.group?.timestamp)

  // 使用 JavaScript 的 Date 構造函數來解析時間，因為它能更好地處理各種格式
  const data = trafficData.value.map((d, index) => {
    const timestamp = new Date(d.group.timestamp)
    if (index < 3) {
      console.log(`數據 ${index}: 原始時間=${d.group.timestamp}, 解析後=${timestamp}, 有效=${!isNaN(timestamp)}`)
    }
    return {
      timestamp: timestamp,
      eastWest: d.group.east_west_seconds,
      southNorth: d.group.south_north_seconds,
      originalData: d,
    }
  })

  // 過濾掉無效的時間戳記
  const validData = data.filter((d) => !isNaN(d.timestamp))
  console.log(`總數據: ${data.length}, 有效時間數據: ${validData.length}`)
  console.log(
    '時間範圍:',
    d3.extent(validData, (d) => d.timestamp),
  )

  // 使用有效數據
  const finalData = validData

  // 設定比例尺
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(finalData, (d) => d.timestamp))
    .range([0, width])

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(finalData, (d) => Math.max(d.eastWest, d.southNorth))])
    .range([height, 0])

  // 添加軸 - 直接顯示
  const xAxis = g
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .style('opacity', 1)
    .call(
      d3.axisBottom(xScale).tickFormat(d3.timeFormat('%m/%d %H:%M')).ticks(Math.min(finalData.length, 10)), // 限制刻度數量
    )

  xAxis
    .selectAll('text')
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .style('font-size', '12px')
    .attr('dx', '0')
    .attr('dy', '1em')

  const yAxis = g.append('g').style('opacity', 1).call(d3.axisLeft(yScale))

  yAxis.selectAll('text').style('fill', 'white')

  // 設定軸線和刻度線為白色
  g.selectAll('.domain').style('stroke', 'white')
  g.selectAll('.tick line').style('stroke', 'white')

  // 添加軸標籤 - 直接顯示
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left + 20)
    .attr('x', 0 - height / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .style('font-size', '16px')
    .style('opacity', 1)
    .text('秒數')

  g.append('text')
    .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 20})`)
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .style('font-size', '16px')
    .style('opacity', 1)
    .text('時間')

  // 繪製散點圖 - 只顯示一個合併的點（顯示東西向，但懸停時顯示兩個方向的資訊）
  // 添加合併散點 - 直接顯示
  g.selectAll('.dot-signal')
    .data(finalData)
    .enter()
    .append('circle')
    .attr('class', 'dot-signal')
    .attr('cx', (d) => xScale(d.timestamp))
    .attr('cy', (d) => yScale(d.eastWest)) // 使用東西向作為展示點的位置
    .attr('r', 4)
    .attr('fill', '#4CAF50') // 綠色，代表兩個方向的合併
    .style('cursor', 'pointer')
    .style('opacity', 0.8)
    .on('click', (event, d) => {
      selectedPoint.value = d.originalData
      showDetailDialog.value = true
    })
    .on('mouseover', function (event, d) {
      d3.select(this).attr('r', 6).style('fill', '#45a049')

      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.9)')
        .style('color', 'white')
        .style('padding', '12px')
        .style('border-radius', '8px')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 4px 20px rgba(0,0,0,0.3)')

      tooltip.transition().duration(200).style('opacity', 1)

      tooltip
        .html(
          `🕒 時間: ${d3.timeFormat('%Y-%m-%d %H:%M')(d.timestamp)}<br/>🔄 東西向燈號: <strong>${d.eastWest}秒</strong><br/>🔄 南北向燈號: <strong>${d.southNorth}秒</strong>`,
        )
        .style('left', event.pageX + 15 + 'px')
        .style('top', event.pageY - 40 + 'px')
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', 4).style('fill', '#4CAF50')

      d3.selectAll('.tooltip').remove()
    })

  // 添加圖例 - 直接顯示
  // 右下角 legend
  const legend = g
    .append('g')
    .attr('font-family', 'sans-serif')
    .attr('font-size', 12)
    .attr('text-anchor', 'start')
    .attr('transform', `translate(${width - 120},${height - 40})`)
    .style('opacity', 1)

  const legendItems = legend
    .selectAll('g')
    .data(['信號燈號 (東西/南北)'])
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(0,${i * 25})`)

  legendItems.append('circle').attr('cx', 8).attr('cy', 8).attr('r', 4).attr('fill', '#4CAF50')

  legendItems
    .append('text')
    .attr('x', 25)
    .attr('y', 9.5)
    .attr('dy', '0.32em')
    .style('fill', 'white')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('opacity', 1)
    .text((d) => d)

  // 啟用滾輪縮放功能
  const zoom = d3
    .zoom()
    .scaleExtent([0.5, 6]) // 進一步限制縮放範圍，避免過度縮放
    .on('zoom', function (event) {
      const { transform } = event

      // 更新比例尺
      const newXScale = transform.rescaleX(xScale)
      const newYScale = transform.rescaleY(yScale)

      // 更新軸，確保對齊
      g.select('.x-axis').call(
        d3
          .axisBottom(newXScale)
          .tickFormat(d3.timeFormat('%m/%d %H:%M'))
          .ticks(Math.max(5, Math.min(15, Math.floor((width * transform.k) / 100)))),
      )

      g.select('.y-axis').call(
        d3.axisLeft(newYScale).ticks(Math.max(5, Math.min(10, Math.floor((height * transform.k) / 80)))),
      )

      // 設定軸線和刻度線樣式
      g.selectAll('.domain').style('stroke', 'white')
      g.selectAll('.tick line').style('stroke', 'white')
      g.selectAll('.tick text').style('fill', 'white')

      // 根據縮放級別智能調整散點大小，確保始終可見
      const zoomLevel = transform.k
      let dotRadius = 4 // 基礎半徑
      let dotOpacity = 0.8 // 基礎透明度

      // 優化的縮放算法 - 圓點大小不會過度縮小
      if (zoomLevel > 8) {
        // 超高縮放級別：保持較大的最小半徑
        dotRadius = Math.max(3, 4 / Math.log10(zoomLevel + 1))
        dotOpacity = Math.max(0.5, 0.8 / Math.log10(zoomLevel / 2 + 1))
      } else if (zoomLevel > 4) {
        // 高縮放級別：使用對數函數而不是平方根，變化更緩慢
        dotRadius = Math.max(3, 4 / Math.log(zoomLevel + 1))
        dotOpacity = Math.max(0.6, 0.8 / Math.sqrt(zoomLevel / 3))
      } else if (zoomLevel > 2) {
        // 中等縮放級別：緩慢縮小
        dotRadius = Math.max(3.5, 4 - (zoomLevel - 2) * 0.25)
        dotOpacity = Math.max(0.7, 0.8 - (zoomLevel - 2) * 0.05)
      } else if (zoomLevel > 1) {
        // 輕微縮放：幾乎不變
        dotRadius = 4 - (zoomLevel - 1) * 0.2
        dotOpacity = 0.8
      } else {
        // 縮小時：適當增大圓點
        dotRadius = Math.min(6, 4 + (1 - zoomLevel) * 2)
        dotOpacity = Math.min(0.9, 0.8 + (1 - zoomLevel) * 0.1)
      }

      // 更新合併散點
      g.selectAll('.dot-signal')
        .attr('cx', (d) => newXScale(d.timestamp))
        .attr('cy', (d) => newYScale(d.eastWest))
        .attr('r', dotRadius)
        .style('opacity', dotOpacity)
    })

  // 應用縮放到 SVG 容器
  svg.call(zoom)
}

// 散點圖
const drawScatterChart = () => {
  if (!scatterChart.value) return

  d3.select(scatterChart.value).selectAll('*').remove()

  // 確保容器有正確的尺寸
  if (scatterChart.value.clientWidth === 0) {
    setTimeout(() => drawScatterChart(), 100)
    return
  }

  // 如果沒有資料，顯示提示訊息
  if (trafficData.value.length === 0) {
    const containerWidth = scatterChart.value.clientWidth
    const containerHeight = 400

    const svg = d3
      .select(scatterChart.value)
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .style('background', 'rgba(56, 142, 60, 0.02)')
      .style('border-radius', '8px')
      .style('border', '2px dashed rgba(56, 142, 60, 0.2)')

    // 添加無資料提示
    const noDataGroup = svg.append('g').attr('transform', `translate(${containerWidth / 2}, ${containerHeight / 2})`)

    // 添加圖示
    noDataGroup
      .append('circle')
      .attr('r', 40)
      .attr('fill', 'none')
      .attr('stroke', '#388e3c')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8,4')
      .style('opacity', 0.6)

    noDataGroup
      .append('text')
      .attr('font-size', '24')
      .attr('text-anchor', 'middle')
      .attr('y', -8)
      .style('fill', '#388e3c')
      .text('📈')

    // 添加主要訊息
    noDataGroup
      .append('text')
      .attr('font-size', '16')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('y', 30)
      .style('fill', '#388e3c')
      .text('查無資料')

    // 添加說明文字
    noDataGroup
      .append('text')
      .attr('font-size', '12')
      .attr('text-anchor', 'middle')
      .attr('y', 50)
      .style('fill', '#666')
      .text('所選日期範圍內沒有散佈圖資料')
    return
  }

  const margin = { top: 30, right: 100, bottom: 60, left: 140 }
  const containerWidth = scatterChart.value.clientWidth
  const width = Math.max(300, containerWidth - margin.left - margin.right + 50)
  // 動態計算散點圖高度，避免固定高度造成推擠
  const containerHeight = scatterChart.value.clientHeight || 280
  const height = Math.max(200, containerHeight - margin.top - margin.bottom)

  const svg = d3
    .select(scatterChart.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  // 準備散點圖數據 - 根據選擇的 VD 過濾
  const scatterData = []
  trafficData.value.forEach((item) => {
    item.intersections.forEach((intersection) => {
      // 只顯示選擇的 VD 站點的數據
      if (intersection.VD_ID === selectedVD.value) {
        scatterData.push({
          volume: intersection.total_volume,
          eastWestSeconds: item.group.east_west_seconds,
          southNorthSeconds: item.group.south_north_seconds,
          speed: intersection.Speed,
          vdId: intersection.VD_ID,
        })
      }
    })
  })

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(scatterData, (d) => d.volume))
    .range([0, width])

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(scatterData, (d) => d.eastWestSeconds))
    .range([height, 0])

  const colorScale = d3.scaleOrdinal().domain(['VLRJX20', 'VLRJX00', 'VLRJM60']).range(d3.schemeCategory10)

  // 添加軸
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
    .style('fill', 'white')
    .style('font-size', '12px')

  g.append('g')
    .call(d3.axisLeft(yScale))
    .selectAll('text')
    .style('fill', 'white')
    .style('font-size', '12px')
    .attr('dx', '-0.5em')

  // 設定軸線和刻度線為白色
  g.selectAll('.domain').style('stroke', 'white')

  g.selectAll('.tick line').style('stroke', 'white')

  // 添加軸標籤
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left + 15)
    .attr('x', 0 - height / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .style('font-size', '16px')
    .text('東西向燈號秒數')

  g.append('text')
    .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .style('font-size', '16px')
    .text('交通車流量')

  // 添加散點
  g.selectAll('.dot')
    .data(scatterData)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', (d) => xScale(d.volume))
    .attr('cy', (d) => yScale(d.eastWestSeconds))
    .attr('r', 4)
    .style('fill', (d) => colorScale(d.vdId))
    .style('opacity', 0.7)
    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      d3.select(this).attr('r', 6)

      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('pointer-events', 'none')

      tooltip.transition().duration(200).style('opacity', 0.9)

      tooltip
        .html(
          `VD: ${d.vdId}<br/>流量: ${d.volume}<br/>東西向: ${d.eastWestSeconds}秒<br/>速度: ${d.speed.toFixed(1)} km/h`,
        )
        .style('left', event.pageX + 10 + 'px')
        .style('top', event.pageY - 28 + 'px')
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', 4)
      d3.selectAll('.tooltip').remove()
    })

  // 右下角 VD 色彩說明 - 只顯示選擇的 VD，點擊可切換
  // 使用與散點相同的顏色（d3.schemeCategory10）
  const vdColorMap = [
    { vdId: 'VLRJX20', color: '#1f77b4' },  // 藍色
    { vdId: 'VLRJX00', color: '#ff7f0e' },  // 橘色
    { vdId: 'VLRJM60', color: '#2ca02c' },  // 綠色
  ]

  // 橫向排列，置於最下方中央 - 顯示所有 VD，點擊可切換
  const legendGroup = svg
    .append('g')
    .attr('class', 'vd-legend')
    .attr('transform', `translate(${margin.left + width / 2 + 200}, ${height + margin.top + margin.bottom - 25})`)

  vdColorMap.forEach((item, i) => {
    const xOffset = i * 110
    const legendItem = legendGroup
      .append('g')
      .style('cursor', 'pointer')
      .on('click', function () {
        selectedVD.value = item.vdId
        drawScatterChart()
      })

    legendItem
      .append('circle')
      .attr('cx', xOffset)
      .attr('cy', 8)
      .attr('r', 8)
      .style('fill', item.color)
      .style('opacity', selectedVD.value === item.vdId ? 1 : 0.5)

    legendItem
      .append('text')
      .attr('x', xOffset + 16)
      .attr('y', 14)
      .text(`${item.vdId}`)
      .style('fill', 'white')
      .style('font-size', '14px')
      .style('opacity', selectedVD.value === item.vdId ? 1 : 0.6)
  })
}

// 熱力圖
const drawHeatmapChart = () => {
  if (!heatmapChart.value) return

  d3.select(heatmapChart.value).selectAll('*').remove()

  // 確保容器有正確的尺寸
  if (heatmapChart.value.clientWidth === 0) {
    setTimeout(() => drawHeatmapChart(), 100)
    return
  }

  // 如果沒有資料，顯示提示訊息
  if (trafficData.value.length === 0) {
    const containerWidth = heatmapChart.value.clientWidth
    const containerHeight = 300

    const svg = d3
      .select(heatmapChart.value)
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .style('background', 'rgba(233, 30, 99, 0.02)')
      .style('border-radius', '8px')
      .style('border', '2px dashed rgba(233, 30, 99, 0.2)')

    // 添加無資料提示
    const noDataGroup = svg.append('g').attr('transform', `translate(${containerWidth / 2}, ${containerHeight / 2})`)

    // 添加圖示
    noDataGroup
      .append('rect')
      .attr('x', -30)
      .attr('y', -25)
      .attr('width', 60)
      .attr('height', 35)
      .attr('fill', 'none')
      .attr('stroke', '#e91e63')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '6,3')
      .attr('rx', 5)
      .style('opacity', 0.6)

    noDataGroup
      .append('text')
      .attr('font-size', '20')
      .attr('text-anchor', 'middle')
      .attr('y', -5)
      .style('fill', '#e91e63')
      .text('🔥')

    // 添加主要訊息
    noDataGroup
      .append('text')
      .attr('font-size', '16')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('y', 25)
      .style('fill', '#e91e63')
      .text('查無資料')

    // 添加說明文字
    noDataGroup
      .append('text')
      .attr('font-size', '12')
      .attr('text-anchor', 'middle')
      .attr('y', 45)
      .style('fill', '#666')
      .text('所選日期範圍內沒有熱力圖資料')

    return
  }

  const margin = { top: 30, right: 100, bottom: 60, left: 140 }
  const containerWidth = heatmapChart.value.clientWidth
  const width = Math.max(300, containerWidth - margin.left - margin.right)
  // 動態計算熱力圖高度，避免固定高度造成推擠
  const containerHeight = heatmapChart.value.clientHeight || 280
  const height = Math.max(200, containerHeight - margin.top - margin.bottom)

  console.log(`重繪熱力圖 - 容器寬度: ${containerWidth}px, 容器高度: ${containerHeight}px, 圖表高度: ${height}px`)

  const svg = d3
    .select(heatmapChart.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  // 準備熱力圖數據 - 按小時和 VD 站點聚合
  const heatmapData = {}

  trafficData.value.forEach((item) => {
    const hour = new Date(item.group.timestamp).getHours()
    item.intersections.forEach((intersection) => {
      const key = `${intersection.VD_ID}-${hour}`
      if (!heatmapData[key]) {
        heatmapData[key] = {
          vdId: intersection.VD_ID,
          hour: hour,
          volumes: [],
          avgVolume: 0,
        }
      }
      heatmapData[key].volumes.push(intersection.total_volume)
    })
  })

  // 計算平均值
  const processedData = Object.values(heatmapData).map((d) => {
    d.avgVolume = d.volumes.reduce((a, b) => a + b, 0) / d.volumes.length
    return d
  })

  const vdIds = [...new Set(processedData.map((d) => d.vdId))]
  const hours = d3.range(0, 24)

  const xScale = d3.scaleBand().range([0, width]).domain(hours).padding(0.1)

  const yScale = d3.scaleBand().range([height, 0]).domain(vdIds).padding(0.1)

  const colorScale = d3
    .scaleSequential()
    .interpolator(d3.interpolateBlues)
    .domain([0, d3.max(processedData, (d) => d.avgVolume)])

  // 添加軸
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
    .style('fill', 'white')
    .style('font-size', '12px')

  g.append('g')
    .call(d3.axisLeft(yScale))
    .selectAll('text')
    .style('fill', 'white')
    .style('font-size', '12px')
    .attr('dx', '-0.5em')

  // 設定軸線和刻度線為白色
  g.selectAll('.domain').style('stroke', 'white')

  g.selectAll('.tick line').style('stroke', 'white')

  // 添加熱力圖格子
  g.selectAll('.heatmap-rect')
    .data(processedData)
    .enter()
    .append('rect')
    .attr('class', 'heatmap-rect')
    .attr('x', (d) => xScale(d.hour))
    .attr('y', (d) => yScale(d.vdId))
    .attr('width', xScale.bandwidth())
    .attr('height', yScale.bandwidth())
    .style('fill', (d) => colorScale(d.avgVolume))
    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('pointer-events', 'none')

      tooltip.transition().duration(200).style('opacity', 0.9)

      tooltip
        .html(`VD: ${d.vdId}<br/>時間: ${d.hour}:00<br/>平均流量: ${Math.round(d.avgVolume)}`)
        .style('left', event.pageX + 10 + 'px')
        .style('top', event.pageY - 28 + 'px')
    })
    .on('mouseout', function () {
      d3.selectAll('.tooltip').remove()
    })

  // 添加色彩圖例
  const legendWidth = 20
  const legendHeight = height

  const legendScale = d3.scaleLinear().range([legendHeight, 0]).domain(colorScale.domain())

  const legendAxis = d3.axisRight(legendScale).tickSize(6).ticks(5)

  const legend = svg.append('g').attr('transform', `translate(${width + margin.left + 10}, ${margin.top})`)

  const legendGradient = svg
    .append('defs')
    .append('linearGradient')
    .attr('id', 'legend-gradient')
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', 0)
    .attr('y1', legendHeight)
    .attr('x2', 0)
    .attr('y2', 0)

  legendGradient
    .selectAll('stop')
    .data(colorScale.ticks().map((t, i, n) => ({ offset: `${(100 * i) / n.length}%`, color: colorScale(t) })))
    .enter()
    .append('stop')
    .attr('offset', (d) => d.offset)
    .style('font-size', '12px')
    .attr('stop-color', (d) => d.color)

  legend
    .append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('font-size', '12px')
    .style('fill', 'url(#legend-gradient)')

  legend
    .append('g')
    .attr('transform', `translate(${legendWidth}, 0)`)
    .call(legendAxis)
    .selectAll('text')
    .style('font-size', '12px')
    .style('fill', 'white')

  // 設定圖例軸線和刻度線為白色
  legend.selectAll('.domain').style('stroke', 'white')

  legend.selectAll('.tick line').style('stroke', 'white')

  // 添加標籤
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left + 15)
    .attr('x', 0 - height / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .style('font-size', '16px')
    .text('VD 車輛偵測器')

  g.append('text')
    .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .style('font-size', '16px')
    .text('小時')
}

// 監聽路由變化
watch(
  () => route.name,
  (newName) => {
    if (newName && ['TimeSeries', 'Correlation', 'Summary'].includes(newName)) {
      activeTab.value = newName.toLowerCase()
      nextTick(() => {
        if (trafficData.value.length > 0) {
          updateCharts()
        }
      })
    }
  },
  { immediate: true },
)

// 組件掛載
onMounted(() => {
  // 根據當前路由設定活動標籤
  const routeName = route.name
  if (routeName && ['TimeSeries', 'Correlation', 'Summary'].includes(routeName)) {
    activeTab.value = routeName.toLowerCase()
  }

  // 監聽視窗大小變化，重新繪製圖表
  const handleResize = () => {
    if (trafficData.value.length > 0) {
      nextTick(() => {
        updateCharts()
      })
    }
  }

  // 使用 ResizeObserver 監聽圖表容器大小變化
  let resizeObserver = null
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      // 延遲執行，避免頻繁重繪
      clearTimeout(window.chartResizeTimeout)
      window.chartResizeTimeout = setTimeout(() => {
        if (trafficData.value.length > 0) {
          updateCharts()
        }
      }, 100)
    })

    // 監聽圖表容器
    nextTick(() => {
      if (timeSeriesChart.value) {
        resizeObserver.observe(timeSeriesChart.value)
      }
      if (scatterChart.value) {
        resizeObserver.observe(scatterChart.value)
      }
      if (heatmapChart.value) {
        resizeObserver.observe(heatmapChart.value)
      }
    })
  }

  window.addEventListener('resize', handleResize)

  // 載入初始數據
  loadData()

  // 清理事件監聽器
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    if (window.chartResizeTimeout) {
      clearTimeout(window.chartResizeTimeout)
    }
  })
})
</script>

<style scoped>
.visualization-page {
  padding: 20px;
  min-height: 100vh;
}

.visualization-container {
  margin: 0 auto;
  width: 100%;
  max-width: none;
  padding: 0 20px;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h2 {
  color: white;
  font-size: 2.5rem;
  margin-bottom: 10px;
  font-weight: 300;
}

.page-header p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
}

.control-panel {
  margin-bottom: 20px;
}

.control-panel .q-card {
  display: flex;
  justify-content: center;
}

.control-card {
  background: transparent;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.control-section {
  display: flex;
  gap: 30px;
  align-items: start;
  padding: 15px;
}

.date-group {
  display: flex;
  align-items: center;
  gap: 15px;
}

.date-label {
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
}

.date-controls {
  display: flex;
  gap: 10px;
  width: 18vw;
  align-items: center;
}

.date-select {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(5px);
  flex: 1;
  min-width: 80px;
}

.load-button {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 42px;
}

.nav-tabs {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.nav-tabs .q-tabs {
  backdrop-filter: blur(10px);
  width: 600px;
}

.main-content {
  width: 100%;
}

.chart-card {
  background: transparent;
  box-shadow: none;
}

.chart-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  justify-content: center;
  flex-direction: row;
  gap: 20px;
  position: relative;
}

.chart-header h3 {
  color: white;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 400;
}

.chart-header .date-range-display {
  position: absolute;
  right: 0;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 20px;
  margin-bottom: 10px;
  position: relative;
  padding-top: 15px;
}

.summary-header .date-range-display {
  position: absolute;
  right: 0;
}

.summary-header h3 {
  color: white;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 400;
}

.date-range-display {
  display: flex;
  justify-content: center;
}

.date-chip {
  font-size: 0.9rem;
  font-weight: 500;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chart-area {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 時間序列圖表響應式高度調整 */
.timeseries-chart {
  min-height: 400px;
  max-height: calc(100vh - 300px);
  width: 100%;
}

/* 關聯性分析圖表保持上下排列，參考時間序列分析的底部空間進行調整 */
.correlation-charts {
  display: grid;
  grid-template-columns: 1fr;
  width: 100%;
  gap: 25px;
  height: calc(100vh - 220px); /* 增加底部預留空間，避免被瀏覽器邊界遮住 */
  grid-template-rows: 1fr 1fr; /* 兩個圖表平分剩餘空間 */
}

.scatter-chart,
.heatmap-chart {
  width: 100%;
  height: 100%; /* 填滿Grid容器分配的空間 */
  min-height: 200px;
  max-height: 300px; /* 下修最大高度，避免超出瀏覽器 */
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.summary-card .q-card__section {
  padding: 10px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.summary-content {
  flex: 1;
}

.summary-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin-bottom: 5px;
}

.summary-value {
  color: white;
  font-size: 1.8rem;
  font-weight: 600;
}

.detail-table-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.detail-table-card h3 {
  color: white;
  margin-bottom: 20px;
}

.detail-dialog {
  background: rgba(30, 60, 114, 0.95);
  backdrop-filter: blur(10px);
  color: white;
}

.detail-content {
  line-height: 1.6;
}

.detail-item {
  margin-bottom: 5px;
  margin-left: 15px;
  padding: 8px 0;
  font-size: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-item:nth-child(4) {
  margin-bottom: 20px !important;
}

.intersection-detail {
  margin: 10px 0 15px;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.intersection-detail h4 {
  color: #42a5f5;
  margin: 5px 0;
  font-size: 1.3rem;
}

.intersection-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  font-size: 1rem;
}

/* =============== 響應式媒體查詢 (依據斷點排序) =============== */

/* 手機和小螢幕設備 (768px 以下) */
@media (max-width: 768px) {
  .control-section {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .date-controls {
    flex-direction: column;
    gap: 5px;
  }

  .date-select {
    min-width: 120px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .page-header h2 {
    font-size: 2rem;
  }

  .chart-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .chart-header .date-range-display {
    position: static;
    align-self: center;
  }

  .summary-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .summary-header .date-range-display {
    position: static;
    align-self: center;
  }

  .timeseries-chart {
    min-height: 300px;
    max-height: 400px;
  }

  .correlation-charts {
    gap: 10px;
    height: calc(100vh - 260px);
    margin-bottom: 10px;
  }

  .scatter-chart,
  .heatmap-chart {
    min-height: 280px;
  }

  .visualization-container {
    padding: 0 10px;
  }

  /* AI 分析區域響應式 */
  .ai-controls {
    flex-direction: column;
  }

  .ai-question-select {
    min-width: auto;
  }

  .ai-analyze-btn {
    min-width: auto;
    width: 100%;
  }

  .ai-question-row {
    flex-direction: column;
    align-items: stretch;
  }

  .ai-question-row .q-select {
    min-width: auto;
  }

  .ai-result-actions {
    flex-direction: column;
  }

  .ai-result-actions .q-btn {
    width: 100%;
  }
}

/* 小螢幕到中等螢幕 (769px - 1023px) */
@media (min-width: 769px) and (max-width: 1023px) {
  .timeseries-chart {
    min-height: calc(100vh - 400px);
  }

  .correlation-charts {
    height: calc(100vh - 240px);
    margin-bottom: 10px;
  }

  .scatter-chart,
  .heatmap-chart {
    height: 280px;
    min-height: 250px;
  }
}

/* 筆電螢幕尺寸 (1024px - 1199px) */
@media (min-width: 1024px) and (max-width: 1199px) {
  .timeseries-chart {
    min-height: 350px;
    max-height: 450px;
  }

  .correlation-charts {
    gap: 12px;
    height: calc(100vh - 260px);
    max-height: 700px;
  }

  .scatter-chart,
  .heatmap-chart {
    min-height: 140px;
    max-height: 220px;
  }
}

/* 中等桌機 (1200px - 1599px) */
@media (min-width: 1200px) and (max-width: 1599px) {
  .control-section {
    grid-template-columns: 1fr;
    gap: 20px;
    text-align: center;
  }

  .date-controls {
    justify-content: center;
  }

  .correlation-charts {
    grid-template-columns: 1fr;
    gap: 15px;
    height: calc(100vh - 220px);
    max-height: 800px;
  }

  .timeseries-chart {
    min-height: 400px;
    max-height: calc(100vh - 280px);
  }

  .scatter-chart,
  .heatmap-chart {
    min-height: 180px;
    max-height: 260px;
    height: 320px;
    min-height: 300px;
  }

  .visualization-container {
    padding: 0 10px;
  }
}

/* 大螢幕桌機 (1600px - 2559px) */
@media (min-width: 1600px) and (max-width: 2559px) {
  .timeseries-chart {
    max-height: calc(100vh - 320px);
  }

  .correlation-charts {
    max-height: calc(100vh - 220px);
  }

  .scatter-chart,
  .heatmap-chart {
    max-height: 320px;
  }
}

/* 特定筆電螢幕尺寸 (1024px - 1600px 且高度 ≤ 1024px) */
@media screen and (min-width: 1024px) and (max-width: 1600px) and (max-height: 1024px) {
  .timeseries-chart {
    min-height: 350px;
    max-height: 480px;
  }

  .correlation-charts {
    gap: 12px;
    height: calc(100vh - 240px);
    max-height: 700px;
  }

  .scatter-chart,
  .heatmap-chart {
    min-height: 180px;
    max-height: 260px;
  }
}

/* 2K 螢幕專屬優化 (2560x1440) */
@media screen and (min-width: 2560px) and (min-height: 1440px) {
  .visualization-container {
    padding: 0 40px;
    margin-left: 20px;
  }

  .chart-container {
    padding: 0 30px;
  }

  .chart-card {
    padding: 20px;
  }

  .chart-card .q-card__section {
    padding: 30px;
  }

  .control-panel {
    padding: 0 20px;
    margin-bottom: 30px;
  }

  .nav-tabs {
    padding: 0 20px;
    margin-bottom: 30px;
  }

  .ai-analysis-section {
    padding: 0 20px;
    margin-top: 40px;
  }

  .summary-grid {
    padding: 0 20px;
    margin-bottom: 40px;
  }
}

/* =============== AI 分析結果響應式高度設定 =============== */

/* AI 分析基礎樣式 */
.ai-result-content {
  border-radius: 4px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 1rem;
  line-height: 2;
  color: white;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 30vh; /* 基礎高度 */
  min-height: 200px;
  overflow-y: auto;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  scrollbar-width: thin;
  scrollbar-color: #0096ff rgba(0, 0, 0, 0.3);
}

/* AI 分析結果高度響應式調整 */
@media (min-width: 768px) {
  .ai-result-content {
    max-height: 35vh;
  }
}

@media (min-width: 1024px) {
  .ai-result-content {
    max-height: 40vh;
  }
}

@media (min-width: 1366px) {
  .ai-result-content {
    max-height: 45vh;
  }
}

@media (min-width: 1920px) {
  .ai-result-content {
    max-height: 50vh;
  }
}

@media (min-width: 2560px) {
  .ai-result-content {
    max-height: 60vh;
  }
}

/* =============== 深色主題樣式 =============== */

:deep(.q-field--dark .q-field__control) {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(.q-field--dark .q-field__label) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.q-field--outlined .q-field__control) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(.q-field--outlined.q-field--focused .q-field__control) {
  border-color: #1976d2;
}

:deep(.q-select .q-field__native) {
  color: white;
}

:deep(.q-item) {
  color: white;
}

:deep(.q-item__label) {
  color: white;
}

:deep(.q-tabs__content .q-tab) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.q-tabs__content .q-tab--active) {
  color: white;
}

/* =============== OpenAI 智能分析樣式 =============== */

.ai-analysis-section {
  border: 1px solid rgba(255, 255, 255, 0);
}

.ai-controls {
  display: flex;
  flex-direction: row;
  gap: 15px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.ai-question-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.ai-question-row .q-select {
  flex: 1;
  min-width: 300px;
}

.ai-question-select {
  flex: 1;
  min-width: 300px;
}

.ai-analyze-btn {
  flex-shrink: 0;
  min-width: 120px;
}

.ai-result-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.ai-result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.ai-result-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.87);
}

.ai-result-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.ai-error-card {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
}

.ai-error-content {
  color: #ffcdd2;
  margin-bottom: 10px;
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.ai-loading-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  margin-top: 15px;
}

.ai-loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.ai-loading-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ai-loading-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.87);
}

.ai-loading-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
}

.ai-empty-state {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  margin-top: 15px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 針對不同解析度調整 AI 分析區域高度 */
@media (min-width: 1920px) {
  .ai-empty-state {
    min-height: 500px;
  }

  .ai-loading-card {
    min-height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ai-result-card {
    min-height: 300px;
  }
}

@media (min-width: 2560px) {
  .ai-empty-state {
    min-height: 860px;
  }

  .ai-loading-card {
    min-height: 860px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ai-result-card {
    min-height: 300px;
  }
}

.ai-empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.ai-empty-icon {
  opacity: 0.6;
}

.ai-empty-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ai-empty-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.ai-empty-subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
}

/* =============== 自訂滾動條樣式 =============== */

.ai-result-content::-webkit-scrollbar {
  width: 8px;
}

.ai-result-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border: 1px solid rgba(0, 150, 255, 0.1);
}

.ai-result-content::-webkit-scrollbar-thumb {
  background: linear-gradient(45deg, #0096ff, #00d4ff);
  border-radius: 4px;
  border: 1px solid rgba(0, 150, 255, 0.3);
  box-shadow:
    0 0 3px rgba(0, 150, 255, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
}

.ai-result-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(45deg, #00b4ff, #00f0ff);
  box-shadow:
    0 0 5px rgba(0, 180, 255, 0.7),
    inset 0 1px 1px rgba(255, 255, 255, 0.3);
}

.ai-result-content::-webkit-scrollbar-thumb:active {
  background: linear-gradient(45deg, #007acc, #00c8ff);
}
</style>
