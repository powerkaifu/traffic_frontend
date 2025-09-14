<template>
  <q-page class="visualization-page">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h2>交通數據視覺化分析</h2>
      <p>智慧交通控制信號數據可視化儀表板</p>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <q-card class="control-card">
        <q-card-section class="control-section">
          <!-- 日期選擇器 -->
          <div class="date-selector">
            <q-date
              v-model="dateRange"
              range
              :options="dateOptions"
              color="primary"
              class="date-picker"
              @update:model-value="onDateRangeChange"
            />
          </div>

          <!-- 快速選擇按鈕 -->
          <div class="quick-select">
            <q-btn-group spread>
              <q-btn
                @click="setQuickRange('today')"
                :color="quickRange === 'today' ? 'primary' : 'grey-7'"
                label="今天"
                size="sm"
              />
              <q-btn
                @click="setQuickRange('week')"
                :color="quickRange === 'week' ? 'primary' : 'grey-7'"
                label="一週"
                size="sm"
              />
              <q-btn
                @click="setQuickRange('month')"
                :color="quickRange === 'month' ? 'primary' : 'grey-7'"
                label="一個月"
                size="sm"
              />
            </q-btn-group>
          </div>

          <!-- VD 站點選擇 -->
          <div class="vd-selector">
            <q-select
              v-model="selectedVDs"
              :options="vdOptions"
              multiple
              use-chips
              stack-label
              label="選擇 VD 站點"
              color="primary"
              option-value="value"
              option-label="label"
              emit-value
              map-options
              @update:model-value="onVDSelectionChange"
            />
          </div>

          <!-- 載入按鈕 -->
          <div class="load-button">
            <q-btn @click="loadData" :loading="loading" color="primary" icon="refresh" label="載入數據" size="md" />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 子路由導航 -->
    <div class="nav-tabs">
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="timeseries" label="時間序列分析" @click="navigateToTab('timeseries')" />
        <q-tab name="correlation" label="關聯性分析" @click="navigateToTab('correlation')" />
        <q-tab name="summary" label="統計摘要" @click="navigateToTab('summary')" />
      </q-tabs>
    </div>

    <!-- 主要內容區域 -->
    <div class="main-content">
      <!-- 時間序列分析 -->
      <div v-show="activeTab === 'timeseries'" class="chart-container">
        <q-card class="chart-card">
          <q-card-section>
            <div class="chart-header">
              <h3>交通燈秒數時間序列分析</h3>
              <q-space />
              <q-btn-dropdown color="primary" icon="settings" label="圖表設定" size="sm">
                <q-list>
                  <q-item clickable v-close-popup @click="toggleEastWest">
                    <q-item-section>
                      <q-item-label>東西向燈號</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="showEastWest" />
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="toggleSouthNorth">
                    <q-item-section>
                      <q-item-label>南北向燈號</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="showSouthNorth" />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </div>
            <div ref="timeSeriesChart" class="chart-area" style="height: 400px"></div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 關聯性分析 -->
      <div v-show="activeTab === 'correlation'" class="chart-container">
        <q-card class="chart-card">
          <q-card-section>
            <div class="chart-header">
              <h3>交通流量與燈號關聯性分析</h3>
            </div>
            <div class="correlation-charts">
              <div ref="scatterChart" class="chart-area scatter-chart" style="height: 300px"></div>
              <div ref="heatmapChart" class="chart-area heatmap-chart" style="height: 300px"></div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 統計摘要 -->
      <div v-show="activeTab === 'summary'" class="summary-container">
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

        <!-- 詳細統計表格 -->
        <q-card class="detail-table-card">
          <q-card-section>
            <h3>詳細統計資料</h3>
            <q-table
              :rows="detailStats"
              :columns="detailColumns"
              row-key="vd_id"
              :pagination="{ rowsPerPage: 10 }"
              class="detail-table"
            />
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
            <div class="detail-item"><strong>南北向燈號:</strong> {{ selectedPoint.group.south_north_seconds }}秒</div>
            <div class="detail-item"><strong>VD 站點數:</strong> {{ selectedPoint.intersections.length }}</div>

            <q-separator class="q-my-md" />

            <div v-for="intersection in selectedPoint.intersections" :key="intersection.id" class="intersection-detail">
              <h4>{{ intersection.VD_ID }}</h4>
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
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { date } from 'quasar'
import * as d3 from 'd3'
import { mockDataGenerator } from '../api/index.js'

const router = useRouter()
const route = useRoute()

// 響應式數據
const loading = ref(false)
const activeTab = ref('timeseries')
const dateRange = ref({})
const quickRange = ref('week')
const selectedVDs = ref(['VLRJX20', 'VLRJX00', 'VLRJM60'])
const showDetailDialog = ref(false)
const selectedPoint = ref(null)
const showEastWest = ref(true)
const showSouthNorth = ref(true)

// 圖表容器引用
const timeSeriesChart = ref(null)
const scatterChart = ref(null)
const heatmapChart = ref(null)

// 數據
const trafficData = ref([])
const summaryStats = reactive({
  avgEastWest: 0,
  avgSouthNorth: 0,
  totalVolume: 0,
  avgSpeed: 0,
})

const detailStats = ref([])
const detailColumns = [
  { name: 'vd_id', label: 'VD ID', field: 'vd_id', align: 'left' },
  { name: 'avg_volume', label: '平均流量', field: 'avg_volume', format: (val) => `${val}` },
  { name: 'avg_speed', label: '平均速度', field: 'avg_speed', format: (val) => `${val.toFixed(1)} km/h` },
  { name: 'avg_occupancy', label: '平均佔有率', field: 'avg_occupancy', format: (val) => `${val.toFixed(1)}%` },
  { name: 'peak_hours', label: '尖峰時段比例', field: 'peak_hours', format: (val) => `${(val * 100).toFixed(1)}%` },
]

// VD 選項
const vdOptions = [
  { label: 'VLRJX20', value: 'VLRJX20' },
  { label: 'VLRJX00', value: 'VLRJX00' },
  { label: 'VLRJM60', value: 'VLRJM60' },
]

// 計算屬性和方法
const dateOptions = (dateStr) => {
  const currentDate = new Date()
  const inputDate = new Date(dateStr)
  return inputDate <= currentDate
}

const formatDateTime = (timestamp) => {
  return date.formatDate(new Date(timestamp), 'YYYY-MM-DD HH:mm:ss')
}

// 快速日期範圍設定
const setQuickRange = (range) => {
  quickRange.value = range
  const today = new Date()
  let startDate, endDate

  switch (range) {
    case 'today':
      startDate = endDate = date.formatDate(today, 'YYYY/MM/DD')
      break
    case 'week':
      startDate = date.formatDate(date.subtractFromDate(today, { days: 7 }), 'YYYY/MM/DD')
      endDate = date.formatDate(today, 'YYYY/MM/DD')
      break
    case 'month':
      startDate = date.formatDate(date.subtractFromDate(today, { days: 30 }), 'YYYY/MM/DD')
      endDate = date.formatDate(today, 'YYYY/MM/DD')
      break
  }

  dateRange.value = { from: startDate, to: endDate }
  loadData()
}

// 事件處理器
const onDateRangeChange = () => {
  quickRange.value = null
  loadData()
}

const onVDSelectionChange = () => {
  loadData()
}

const navigateToTab = (tabName) => {
  activeTab.value = tabName
  router.push({ name: tabName })

  nextTick(() => {
    if (trafficData.value.length > 0) {
      updateCharts()
    }
  })
}

// 數據載入
const loadData = async () => {
  if (!dateRange.value.from || !dateRange.value.to) return

  loading.value = true
  try {
    const params = {
      startDate: date.formatDate(new Date(dateRange.value.from), 'YYYY-MM-DD'),
      endDate: date.formatDate(new Date(dateRange.value.to), 'YYYY-MM-DD'),
      vdIds: selectedVDs.value,
    }

    // 使用模擬數據（開發階段）
    const response = await mockDataGenerator.generateVisualizationData(params)
    trafficData.value = response.data

    calculateSummaryStats()
    calculateDetailStats()
    updateCharts()
  } catch (error) {
    console.error('載入數據失敗:', error)
    // 這裡可以加入錯誤提示
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

const calculateDetailStats = () => {
  const vdStats = {}

  trafficData.value.forEach((item) => {
    item.intersections.forEach((intersection) => {
      const vdId = intersection.VD_ID
      if (!vdStats[vdId]) {
        vdStats[vdId] = {
          vd_id: vdId,
          volumes: [],
          speeds: [],
          occupancies: [],
          peakHours: 0,
          totalRecords: 0,
        }
      }

      vdStats[vdId].volumes.push(intersection.total_volume)
      vdStats[vdId].speeds.push(intersection.Speed)
      vdStats[vdId].occupancies.push(intersection.Occupancy)
      if (intersection.IsPeakHour) vdStats[vdId].peakHours++
      vdStats[vdId].totalRecords++
    })
  })

  detailStats.value = Object.values(vdStats).map((stat) => ({
    vd_id: stat.vd_id,
    avg_volume: Math.round(stat.volumes.reduce((a, b) => a + b, 0) / stat.volumes.length),
    avg_speed: stat.speeds.reduce((a, b) => a + b, 0) / stat.speeds.length,
    avg_occupancy: stat.occupancies.reduce((a, b) => a + b, 0) / stat.occupancies.length,
    peak_hours: stat.peakHours / stat.totalRecords,
  }))
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

// 時間序列圖表
const drawTimeSeriesChart = () => {
  if (!timeSeriesChart.value || trafficData.value.length === 0) return

  // 清除舊圖表
  d3.select(timeSeriesChart.value).selectAll('*').remove()

  const margin = { top: 20, right: 80, bottom: 40, left: 60 }
  const width = timeSeriesChart.value.clientWidth - margin.left - margin.right
  const height = 400 - margin.top - margin.bottom

  const svg = d3
    .select(timeSeriesChart.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  // 解析時間
  const parseTime = d3.timeParse('%Y-%m-%dT%H:%M:%S.%fZ')
  const data = trafficData.value.map((d) => ({
    timestamp: parseTime(d.group.timestamp),
    eastWest: d.group.east_west_seconds,
    southNorth: d.group.south_north_seconds,
    originalData: d,
  }))

  // 設定比例尺
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.timestamp))
    .range([0, width])

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => Math.max(d.eastWest, d.southNorth))])
    .range([height, 0])

  // 創建線條
  const eastWestLine = d3
    .line()
    .x((d) => xScale(d.timestamp))
    .y((d) => yScale(d.eastWest))
    .curve(d3.curveMonotoneX)

  const southNorthLine = d3
    .line()
    .x((d) => xScale(d.timestamp))
    .y((d) => yScale(d.southNorth))
    .curve(d3.curveMonotoneX)

  // 添加軸
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%m-%d %H:%M')))
    .selectAll('text')
    .style('text-anchor', 'end')
    .attr('dx', '-.8em')
    .attr('dy', '.15em')
    .attr('transform', 'rotate(-45)')

  g.append('g').call(d3.axisLeft(yScale))

  // 添加軸標籤
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left)
    .attr('x', 0 - height / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .text('秒數')

  g.append('text')
    .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .text('時間')

  // 繪製線條
  if (showEastWest.value) {
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#1976d2')
      .attr('stroke-width', 2)
      .attr('d', eastWestLine)

    // 添加數據點
    g.selectAll('.dot-east-west')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot-east-west')
      .attr('cx', (d) => xScale(d.timestamp))
      .attr('cy', (d) => yScale(d.eastWest))
      .attr('r', 3)
      .attr('fill', '#1976d2')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        selectedPoint.value = d.originalData
        showDetailDialog.value = true
      })
      .on('mouseover', function (event, d) {
        d3.select(this).attr('r', 5)

        // 添加 tooltip
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
          .html(`時間: ${d3.timeFormat('%Y-%m-%d %H:%M')(d.timestamp)}<br/>東西向: ${d.eastWest}秒`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px')
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 3)
        d3.selectAll('.tooltip').remove()
      })
  }

  if (showSouthNorth.value) {
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#388e3c')
      .attr('stroke-width', 2)
      .attr('d', southNorthLine)

    // 添加數據點
    g.selectAll('.dot-south-north')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot-south-north')
      .attr('cx', (d) => xScale(d.timestamp))
      .attr('cy', (d) => yScale(d.southNorth))
      .attr('r', 3)
      .attr('fill', '#388e3c')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        selectedPoint.value = d.originalData
        showDetailDialog.value = true
      })
      .on('mouseover', function (event, d) {
        d3.select(this).attr('r', 5)

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
          .html(`時間: ${d3.timeFormat('%Y-%m-%d %H:%M')(d.timestamp)}<br/>南北向: ${d.southNorth}秒`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px')
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 3)
        d3.selectAll('.tooltip').remove()
      })
  }

  // 添加圖例
  const legend = g
    .append('g')
    .attr('font-family', 'sans-serif')
    .attr('font-size', 10)
    .attr('text-anchor', 'end')
    .selectAll('g')
    .data(['東西向燈號', '南北向燈號'])
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(0,${i * 20})`)

  legend
    .append('rect')
    .attr('x', width - 19)
    .attr('width', 19)
    .attr('height', 19)
    .attr('fill', (d, i) => (i === 0 ? '#1976d2' : '#388e3c'))

  legend
    .append('text')
    .attr('x', width - 24)
    .attr('y', 9.5)
    .attr('dy', '0.32em')
    .style('fill', 'white')
    .text((d) => d)
}

// 散點圖
const drawScatterChart = () => {
  if (!scatterChart.value || trafficData.value.length === 0) return

  d3.select(scatterChart.value).selectAll('*').remove()

  const margin = { top: 20, right: 20, bottom: 40, left: 60 }
  const width = scatterChart.value.clientWidth - margin.left - margin.right
  const height = 300 - margin.top - margin.bottom

  const svg = d3
    .select(scatterChart.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  // 準備散點圖數據
  const scatterData = []
  trafficData.value.forEach((item) => {
    item.intersections.forEach((intersection) => {
      scatterData.push({
        volume: intersection.total_volume,
        eastWestSeconds: item.group.east_west_seconds,
        southNorthSeconds: item.group.south_north_seconds,
        speed: intersection.Speed,
        vdId: intersection.VD_ID,
      })
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

  const colorScale = d3.scaleOrdinal().domain(selectedVDs.value).range(d3.schemeCategory10)

  // 添加軸
  g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale))

  g.append('g').call(d3.axisLeft(yScale))

  // 添加軸標籤
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left)
    .attr('x', 0 - height / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .text('東西向燈號秒數')

  g.append('text')
    .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .text('交通流量')

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
}

// 熱力圖
const drawHeatmapChart = () => {
  if (!heatmapChart.value || trafficData.value.length === 0) return

  d3.select(heatmapChart.value).selectAll('*').remove()

  const margin = { top: 20, right: 100, bottom: 40, left: 60 }
  const width = heatmapChart.value.clientWidth - margin.left - margin.right
  const height = 300 - margin.top - margin.bottom

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
  g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale))

  g.append('g').call(d3.axisLeft(yScale))

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
    .attr('stop-color', (d) => d.color)

  legend.append('rect').attr('width', legendWidth).attr('height', legendHeight).style('fill', 'url(#legend-gradient)')

  legend
    .append('g')
    .attr('transform', `translate(${legendWidth}, 0)`)
    .call(legendAxis)
    .selectAll('text')
    .style('fill', 'white')

  // 添加標籤
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left)
    .attr('x', 0 - height / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .text('VD 站點')

  g.append('text')
    .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
    .style('text-anchor', 'middle')
    .style('fill', 'white')
    .text('小時')
}

const toggleEastWest = () => {
  showEastWest.value = !showEastWest.value
  if (activeTab.value === 'timeseries') {
    drawTimeSeriesChart()
  }
}

const toggleSouthNorth = () => {
  showSouthNorth.value = !showSouthNorth.value
  if (activeTab.value === 'timeseries') {
    drawTimeSeriesChart()
  }
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
  // 設定預設日期範圍為最近一週
  setQuickRange('week')

  // 根據當前路由設定活動標籤
  const routeName = route.name
  if (routeName && ['TimeSeries', 'Correlation', 'Summary'].includes(routeName)) {
    activeTab.value = routeName.toLowerCase()
  }
})
</script>

<style scoped>
.visualization-page {
  padding: 20px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  min-height: 100vh;
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

.control-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.control-section {
  display: grid;
  grid-template-columns: 300px 1fr 1fr 200px;
  gap: 20px;
  align-items: center;
  padding: 20px;
}

.date-picker {
  background: white;
  border-radius: 8px;
}

.quick-select {
  display: flex;
  gap: 10px;
}

.vd-selector {
  min-width: 200px;
}

.load-button {
  display: flex;
  justify-content: center;
}

.nav-tabs {
  margin-bottom: 20px;
}

.nav-tabs .q-tabs {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
}

.chart-container,
.summary-container {
  margin-bottom: 20px;
}

.chart-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chart-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  color: white;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 400;
}

.chart-area {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.correlation-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.detail-table-card h3 {
  color: white;
  margin-bottom: 20px;
}

.detail-table {
  background: transparent;
}

.detail-table :deep(.q-table__card) {
  background: transparent;
  color: white;
}

.detail-table :deep(.q-table thead tr th) {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.detail-table :deep(.q-table tbody tr td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
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
  margin-bottom: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.intersection-detail {
  margin: 15px 0;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.intersection-detail h4 {
  color: #42a5f5;
  margin-bottom: 10px;
}

.intersection-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  font-size: 0.9rem;
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .control-section {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 15px;
  }

  .correlation-charts {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .control-section {
    grid-template-columns: 1fr;
    text-align: center;
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
}

/* 深色主題的自定義樣式 */
:deep(.q-field--dark .q-field__control) {
  color: white;
}

:deep(.q-field--dark .q-field__label) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.q-btn-group .q-btn) {
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.q-date) {
  background: white;
}

:deep(.q-tabs__content .q-tab) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.q-tabs__content .q-tab--active) {
  color: white;
}
</style>
