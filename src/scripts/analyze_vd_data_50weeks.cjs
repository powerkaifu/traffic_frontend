/**
 * VD 數據完整分析工具 - 50 週數據統計
 * 分析三個路口 50 週的數據，統計各項指標的範圍值
 */

const fs = require('fs')
const path = require('path')

// VD 資料夾路徑
const vdDataPath = path.join(__dirname, '../vd_data')
const vdIds = ['VLRJM60', 'VLRJX00', 'VLRJX20']

// 統計結果存儲
const globalStats = {
  VLRJM60: initStats(),
  VLRJX00: initStats(),
  VLRJX20: initStats(),
  combined: initStats(),
}

// 時段統計
const timePeriodStats = {
  peak_hours: { VLRJM60: initStats(), VLRJX00: initStats(), VLRJX20: initStats() },
  off_peak: { VLRJM60: initStats(), VLRJX00: initStats(), VLRJX20: initStats() },
  late_night: { VLRJM60: initStats(), VLRJX00: initStats(), VLRJX20: initStats() },
}

/**
 * 初始化統計結構
 */
function initStats() {
  return {
    Speed: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Occupancy: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Volume_M: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Speed_M: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Volume_S: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Speed_S: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Volume_L: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Speed_L: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Volume_T: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    Speed_T: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
    TotalVolume: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] }, // M+S+L+T 總流量
  }
}

/**
 * 更新統計數據
 */
function updateStats(stats, key, value) {
  if (value === null || value === undefined || isNaN(value)) return
  
  stats[key].min = Math.min(stats[key].min, value)
  stats[key].max = Math.max(stats[key].max, value)
  stats[key].sum += value
  stats[key].count++
  stats[key].values.push(value)
}

/**
 * 獲取時段類型
 */
function getTimePeriod(hour) {
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    return 'peak_hours' // 尖峰
  } else if (hour >= 0 && hour < 7) {
    return 'late_night' // 凌晨
  } else {
    return 'off_peak' // 離峰
  }
}

/**
 * 分析單個 JSON 檔案
 */
function analyzeJsonFile(vdId, filePath) {
  try {
    console.log(`  📄 分析 ${path.basename(filePath)}...`)
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    let processedCount = 0

    // 遍歷所有時間點
    for (const [timeStr, laneDataArray] of Object.entries(data)) {
      const date = new Date(timeStr)
      const hour = date.getHours()
      const period = getTimePeriod(hour)

      // 遍歷每個車道數據
      laneDataArray.forEach((lane) => {
        const speed = lane.Speed || 0
        const occupancy = lane.Occupancy || 0
        const volumeM = lane.Vehicles?.M?.Volume || 0
        const speedM = lane.Vehicles?.M?.Speed || 0
        const volumeS = lane.Vehicles?.S?.Volume || 0
        const speedS = lane.Vehicles?.S?.Speed || 0
        const volumeL = lane.Vehicles?.L?.Volume || 0
        const speedL = lane.Vehicles?.L?.Speed || 0
        const volumeT = lane.Vehicles?.T?.Volume || 0
        const speedT = lane.Vehicles?.T?.Speed || 0
        const totalVolume = volumeM + volumeS + volumeL + volumeT

        // 更新全局統計（該 VD）
        updateStats(globalStats[vdId], 'Speed', speed)
        updateStats(globalStats[vdId], 'Occupancy', occupancy)
        updateStats(globalStats[vdId], 'Volume_M', volumeM)
        updateStats(globalStats[vdId], 'Speed_M', speedM)
        updateStats(globalStats[vdId], 'Volume_S', volumeS)
        updateStats(globalStats[vdId], 'Speed_S', speedS)
        updateStats(globalStats[vdId], 'Volume_L', volumeL)
        updateStats(globalStats[vdId], 'Speed_L', speedL)
        updateStats(globalStats[vdId], 'Volume_T', volumeT)
        updateStats(globalStats[vdId], 'Speed_T', speedT)
        updateStats(globalStats[vdId], 'TotalVolume', totalVolume)

        // 更新合併統計
        updateStats(globalStats.combined, 'Speed', speed)
        updateStats(globalStats.combined, 'Occupancy', occupancy)
        updateStats(globalStats.combined, 'Volume_M', volumeM)
        updateStats(globalStats.combined, 'Speed_M', speedM)
        updateStats(globalStats.combined, 'Volume_S', volumeS)
        updateStats(globalStats.combined, 'Speed_S', speedS)
        updateStats(globalStats.combined, 'Volume_L', volumeL)
        updateStats(globalStats.combined, 'Speed_L', speedL)
        updateStats(globalStats.combined, 'Volume_T', volumeT)
        updateStats(globalStats.combined, 'Speed_T', speedT)
        updateStats(globalStats.combined, 'TotalVolume', totalVolume)

        // 更新時段統計
        updateStats(timePeriodStats[period][vdId], 'Speed', speed)
        updateStats(timePeriodStats[period][vdId], 'Occupancy', occupancy)
        updateStats(timePeriodStats[period][vdId], 'Volume_M', volumeM)
        updateStats(timePeriodStats[period][vdId], 'Speed_M', speedM)
        updateStats(timePeriodStats[period][vdId], 'Volume_S', volumeS)
        updateStats(timePeriodStats[period][vdId], 'Speed_S', speedS)
        updateStats(timePeriodStats[period][vdId], 'Volume_L', volumeL)
        updateStats(timePeriodStats[period][vdId], 'Speed_L', speedL)
        updateStats(timePeriodStats[period][vdId], 'Volume_T', volumeT)
        updateStats(timePeriodStats[period][vdId], 'Speed_T', speedT)
        updateStats(timePeriodStats[period][vdId], 'TotalVolume', totalVolume)

        processedCount++
      })
    }

    return processedCount
  } catch (error) {
    console.error(`  ❌ 錯誤: ${error.message}`)
    return 0
  }
}

/**
 * 計算統計摘要
 */
function calculateSummary(stats) {
  const summary = {}
  
  for (const [key, data] of Object.entries(stats)) {
    if (data.count === 0) {
      summary[key] = {
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        p95: 0,
        p99: 0,
        count: 0,
      }
      continue
    }

    const avg = data.sum / data.count
    const sorted = [...data.values].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    summary[key] = {
      min: Math.round(data.min * 100) / 100,
      max: Math.round(data.max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      median: Math.round(median * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      count: data.count,
    }
  }

  return summary
}

/**
 * 生成 Markdown 報告
 */
function generateMarkdownReport() {
  const report = []

  report.push('# VD 數據分析報告 - 50 週完整統計')
  report.push('')
  report.push('> **分析日期**: ' + new Date().toISOString().split('T')[0])
  report.push('> **數據來源**: VLRJM60, VLRJX00, VLRJX20')
  report.push('> **數據期間**: 50 週交通數據')
  report.push('')
  report.push('---')
  report.push('')

  // 1. 整體統計摘要
  report.push('## 📊 一、整體數據範圍統計（三個路口合併）')
  report.push('')
  const combinedSummary = calculateSummary(globalStats.combined)
  report.push('| 指標 | 最小值 | 最大值 | 平均值 | 中位數 | P95 | P99 | 樣本數 |')
  report.push('|------|--------|--------|--------|--------|-----|-----|--------|')
  
  const metrics = [
    { key: 'Speed', name: '平均速度 (km/h)' },
    { key: 'Occupancy', name: '佔有率 (%)' },
    { key: 'Volume_M', name: '機車流量 (輛/5min)' },
    { key: 'Speed_M', name: '機車速度 (km/h)' },
    { key: 'Volume_S', name: '小型車流量 (輛/5min)' },
    { key: 'Speed_S', name: '小型車速度 (km/h)' },
    { key: 'Volume_L', name: '大型車流量 (輛/5min)' },
    { key: 'Speed_L', name: '大型車速度 (km/h)' },
    { key: 'Volume_T', name: '聯結車流量 (輛/5min)' },
    { key: 'Speed_T', name: '聯結車速度 (km/h)' },
    { key: 'TotalVolume', name: '總流量 (輛/5min)' },
  ]

  metrics.forEach(({ key, name }) => {
    const s = combinedSummary[key]
    report.push(`| ${name} | ${s.min} | ${s.max} | ${s.avg} | ${s.median} | ${s.p95} | ${s.p99} | ${s.count.toLocaleString()} |`)
  })

  report.push('')
  report.push('---')
  report.push('')

  // 2. 各路口分別統計
  report.push('## 📍 二、各路口數據統計')
  report.push('')

  vdIds.forEach((vdId) => {
    report.push(`### ${vdId}`)
    report.push('')
    const summary = calculateSummary(globalStats[vdId])
    report.push('| 指標 | 最小值 | 最大值 | 平均值 | 中位數 | P95 | 樣本數 |')
    report.push('|------|--------|--------|--------|--------|-----|--------|')
    
    metrics.forEach(({ key, name }) => {
      const s = summary[key]
      report.push(`| ${name} | ${s.min} | ${s.max} | ${s.avg} | ${s.median} | ${s.p95} | ${s.count.toLocaleString()} |`)
    })
    
    report.push('')
  })

  report.push('---')
  report.push('')

  // 3. 時段分析
  report.push('## ⏰ 三、時段別數據統計')
  report.push('')

  const periodNames = {
    peak_hours: '🚀 尖峰時段 (07:00-09:00, 17:00-19:00)',
    off_peak: '🌞 離峰時段 (09:00-17:00, 19:00-23:00)',
    late_night: '🌙 凌晨時段 (00:00-07:00)',
  }

  Object.entries(timePeriodStats).forEach(([period, vdData]) => {
    report.push(`### ${periodNames[period]}`)
    report.push('')

    vdIds.forEach((vdId) => {
      report.push(`#### ${vdId}`)
      report.push('')
      const summary = calculateSummary(vdData[vdId])
      report.push('| 指標 | 最小值 | 最大值 | 平均值 | 中位數 | P95 |')
      report.push('|------|--------|--------|--------|--------|-----|')
      
      const highlightMetrics = [
        { key: 'Speed', name: '平均速度' },
        { key: 'Occupancy', name: '佔有率' },
        { key: 'Volume_M', name: '機車流量' },
        { key: 'Volume_S', name: '小型車流量' },
        { key: 'Volume_L', name: '大型車流量' },
        { key: 'TotalVolume', name: '總流量' },
      ]
      
      highlightMetrics.forEach(({ key, name }) => {
        const s = summary[key]
        report.push(`| ${name} | ${s.min} | ${s.max} | ${s.avg} | ${s.median} | ${s.p95} |`)
      })
      
      report.push('')
    })
  })

  report.push('---')
  report.push('')

  // 4. 關鍵發現
  report.push('## 🔍 四、關鍵發現')
  report.push('')
  report.push('### 車流量特徵')
  report.push('')
  
  const peakAvg = calculateSummary(timePeriodStats.peak_hours.VLRJM60)
  const offPeakAvg = calculateSummary(timePeriodStats.off_peak.VLRJM60)
  const lateNightAvg = calculateSummary(timePeriodStats.late_night.VLRJM60)
  
  report.push(`- **尖峰時段**: 平均總流量 ${peakAvg.TotalVolume.avg} 輛/5分鐘/車道`)
  report.push(`- **離峰時段**: 平均總流量 ${offPeakAvg.TotalVolume.avg} 輛/5分鐘/車道`)
  report.push(`- **凌晨時段**: 平均總流量 ${lateNightAvg.TotalVolume.avg} 輛/5分鐘/車道`)
  report.push('')
  report.push('### 車種分布')
  report.push('')
  report.push(`- **機車佔比**: ${Math.round((peakAvg.Volume_M.avg / peakAvg.TotalVolume.avg) * 100)}% (尖峰)`)
  report.push(`- **小型車佔比**: ${Math.round((peakAvg.Volume_S.avg / peakAvg.TotalVolume.avg) * 100)}% (尖峰)`)
  report.push(`- **大型車佔比**: ${Math.round((peakAvg.Volume_L.avg / peakAvg.TotalVolume.avg) * 100)}% (尖峰)`)
  report.push('')
  
  report.push('---')
  report.push('')

  // 5. 前後端數據對應問題分析
  report.push('## ⚠️ 五、前後端數據對應問題分析')
  report.push('')
  report.push('### 問題描述')
  report.push('')
  report.push('1. **VD 真實數據範圍較小**')
  report.push(`   - 尖峰時段每車道平均 ${peakAvg.TotalVolume.avg} 輛/5分鐘`)
  report.push(`   - 離峰時段每車道平均 ${offPeakAvg.TotalVolume.avg} 輛/5分鐘`)
  report.push(`   - 凌晨時段每車道平均 ${lateNightAvg.TotalVolume.avg} 輛/5分鐘`)
  report.push('')
  report.push('2. **前端模擬需要大量車輛**')
  report.push('   - 評審需要看到明顯的尖峰車流效果')
  report.push('   - 視覺效果需要較多車輛同時在畫面上')
  report.push('   - 模擬器生成的車輛數遠超 VD 真實數據')
  report.push('')
  report.push('3. **數據不一致的後果**')
  report.push('   - 前端顯示 100 輛車，但傳給後端的 API 數據只有 10 輛')
  report.push('   - 模型訓練數據與實際輸入數據範圍不匹配')
  report.push('   - 預測結果可能不準確')
  report.push('')
  
  report.push('---')
  report.push('')

  // 6. 解決方案
  report.push('## 💡 六、解決方案：雙層數據架構')
  report.push('')
  report.push('### 方案概述')
  report.push('')
  report.push('建立**視覺層（前端展示）**與 **API 層（後端模型）**兩層數據架構：')
  report.push('')
  report.push('```')
  report.push('┌─────────────────────────────────────────────────────────┐')
  report.push('│  前端模擬器                                               │')
  report.push('│  ├─ 視覺層：生成大量車輛供展示 (displayMultiplier)        │')
  report.push('│  │   └─ 尖峰：100+ 輛車在畫面上                            │')
  report.push('│  │                                                         │')
  report.push('│  └─ API 層：統計後縮放回 VD 真實範圍                       │')
  report.push('│      └─ 尖峰：傳送 9-11 輛/車道/5分鐘給後端               │')
  report.push('└─────────────────────────────────────────────────────────┘')
  report.push('```')
  report.push('')
  
  report.push('### 實現步驟')
  report.push('')
  report.push('#### 1. 前端：使用 displayMultiplier 放大視覺效果')
  report.push('')
  report.push('```javascript')
  report.push('// trafficScenarioConfig.js')
  report.push('export const timeScenarios = [')
  report.push('  {')
  report.push('    key: "peak_hours",')
  report.push('    config: {')
  report.push('      interval: { min: 500, max: 5000, normal: 2700 },')
  report.push('      displayMultiplier: 7,  // 🎭 視覺層：放大 7 倍')
  report.push('      // ...')
  report.push('    }')
  report.push('  }')
  report.push(']')
  report.push('```')
  report.push('')
  
  report.push('#### 2. 前端：TrafficDataCollector 分層統計')
  report.push('')
  report.push('```javascript')
  report.push('class TrafficDataCollector {')
  report.push('  collectData() {')
  report.push('    // 視覺層：實際生成的車輛數')
  report.push('    const visualCount = this.vehicles.length; // 例如：100 輛')
  report.push('    ')
  report.push('    // API 層：縮放回 VD 真實範圍')
  report.push('    const displayMultiplier = this.currentScenario.displayMultiplier; // 7')
  report.push('    const apiCount = Math.round(visualCount / displayMultiplier); // 100 / 7 ≈ 14 輛')
  report.push('    ')
  report.push('    return {')
  report.push('      visualData: { totalVehicles: visualCount },  // 前端顯示用')
  report.push('      apiData: { totalVehicles: apiCount }         // 傳給後端用')
  report.push('    };')
  report.push('  }')
  report.push('}')
  report.push('```')
  report.push('')
  
  report.push('#### 3. 發送 API：只傳送縮放後的數據')
  report.push('')
  report.push('```javascript')
  report.push('async function sendDataToBackend() {')
  report.push('  const collectedData = trafficDataCollector.collectData();')
  report.push('  ')
  report.push('  // ✅ 只傳送 apiData，符合模型訓練數據範圍')
  report.push('  const payload = {')
  report.push('    timestamp: new Date().toISOString(),')
  report.push('    data: collectedData.apiData,  // 使用縮放後的數據')
  report.push('    scenario: currentScenario.key')
  report.push('  };')
  report.push('  ')
  report.push('  await axios.post("/api/predict", payload);')
  report.push('}')
  report.push('```')
  report.push('')
  
  report.push('### displayMultiplier 建議值')
  report.push('')
  report.push('根據 VD 數據分析，建議的 displayMultiplier：')
  report.push('')
  report.push('| 時段 | VD 真實流量 | 視覺需求 | displayMultiplier |')
  report.push('|------|-------------|----------|-------------------|')
  report.push(`| 尖峰 | ${peakAvg.TotalVolume.avg} 輛/車道 | 60-80 輛 | 7x |`)
  report.push(`| 離峰 | ${offPeakAvg.TotalVolume.avg} 輛/車道 | 20-30 輛 | 3x |`)
  report.push(`| 凌晨 | ${lateNightAvg.TotalVolume.avg} 輛/車道 | 5-10 輛 | 1.5x |`)
  report.push('')
  
  report.push('---')
  report.push('')

  // 7. 配置範例
  report.push('## 🔧 七、完整配置範例')
  report.push('')
  report.push('### trafficScenarioConfig.js 更新')
  report.push('')
  report.push('```javascript')
  report.push('export const timeScenarios = [')
  report.push('  {')
  report.push('    key: "peak_hours",')
  report.push('    name: "尖峰時段",')
  report.push('    ')
  report.push('    // 🎯 目標特徵（基於 VD 統計數據）')
  report.push('    targetFeatures: {')
  report.push(`      totalVolumePer5Min: ${Math.round(peakAvg.TotalVolume.avg)},  // VD 真實數據`)
  report.push(`      occupancy: ${Math.round(peakAvg.Occupancy.avg)},`)
  report.push(`      speed: ${Math.round(peakAvg.Speed.avg)},`)
  report.push('      volumeByType: {')
  report.push(`        motor: ${Math.round(peakAvg.Volume_M.avg)},`)
  report.push(`        small: ${Math.round(peakAvg.Volume_S.avg)},`)
  report.push(`        large: ${Math.round(peakAvg.Volume_L.avg)},`)
  report.push('      }')
  report.push('    },')
  report.push('    ')
  report.push('    config: {')
  report.push('      interval: { min: 500, max: 5000, normal: 2700 },')
  report.push('      peakMultiplier: 3.2,')
  report.push('      displayMultiplier: 7,  // 🎭 視覺層倍數')
  report.push('      maxLiveVehicles: 55,')
  report.push('      // ...')
  report.push('    }')
  report.push('  }')
  report.push(']')
  report.push('```')
  report.push('')
  
  report.push('### TrafficDataCollector.js 實現')
  report.push('')
  report.push('```javascript')
  report.push('getRealTimeData() {')
  report.push('  const scenario = this.getCurrentScenario();')
  report.push('  const displayMultiplier = scenario?.config?.displayMultiplier || 1;')
  report.push('  ')
  report.push('  // 視覺層數據（實際車輛數）')
  report.push('  const visualData = {')
  report.push('    totalCount: this.totalVehicleCount,')
  report.push('    averageSpeed: this.calculateAverageSpeed(),')
  report.push('    occupancy: this.calculateOccupancy()')
  report.push('  };')
  report.push('  ')
  report.push('  // API 層數據（縮放到 VD 範圍）')
  report.push('  const apiData = {')
  report.push('    totalCount: Math.round(visualData.totalCount / displayMultiplier),')
  report.push('    averageSpeed: visualData.averageSpeed,  // 速度不縮放')
  report.push('    occupancy: Math.round(visualData.occupancy / displayMultiplier * 10) / 10')
  report.push('  };')
  report.push('  ')
  report.push('  return { visualData, apiData };')
  report.push('}')
  report.push('```')
  report.push('')
  
  report.push('---')
  report.push('')

  // 8. 驗證方法
  report.push('## ✅ 八、驗證方法')
  report.push('')
  report.push('### 1. 前端驗證')
  report.push('')
  report.push('```javascript')
  report.push('// 在瀏覽器 Console 執行')
  report.push('const data = window.trafficDataCollector.getRealTimeData();')
  report.push('console.log("視覺層車輛數:", data.visualData.totalCount);')
  report.push('console.log("API 層車輛數:", data.apiData.totalCount);')
  report.push('console.log("縮放倍數:", data.visualData.totalCount / data.apiData.totalCount);')
  report.push('```')
  report.push('')
  report.push('**預期結果**：')
  report.push('- 尖峰時段：視覺層 60-80 輛，API 層 9-11 輛')
  report.push('- 離峰時段：視覺層 20-30 輛，API 層 3-5 輛')
  report.push('- 凌晨時段：視覺層 5-10 輛，API 層 1-2 輛')
  report.push('')
  
  report.push('### 2. 後端驗證')
  report.push('')
  report.push('檢查後端收到的數據是否在 VD 訓練範圍內：')
  report.push('')
  report.push('```python')
  report.push('# 後端 API endpoint')
  report.push('@app.post("/api/predict")')
  report.push('def predict(data: TrafficData):')
  report.push('    total_volume = data.totalCount')
  report.push('    ')
  report.push('    # 驗證數據範圍')
  report.push(`    if data.scenario == "peak_hours":`)
  report.push(`        assert 9 <= total_volume <= 15, f"尖峰流量異常: {total_volume}"`)
  report.push(`    elif data.scenario == "off_peak":`)
  report.push(`        assert 3 <= total_volume <= 7, f"離峰流量異常: {total_volume}"`)
  report.push('    ')
  report.push('    # 繼續預測...')
  report.push('```')
  report.push('')
  
  report.push('---')
  report.push('')

  // 9. 總結
  report.push('## 📝 九、總結')
  report.push('')
  report.push('### 優勢')
  report.push('')
  report.push('✅ **視覺效果好**: 前端展示大量車輛，評審可以明顯看到尖峰車流')
  report.push('✅ **數據準確**: API 傳送的數據符合 VD 真實範圍，模型預測準確')
  report.push('✅ **架構清晰**: 視覺層與 API 層分離，職責明確')
  report.push('✅ **易於調整**: 透過 displayMultiplier 輕鬆調整視覺效果')
  report.push('✅ **可維護性高**: 配置集中管理，DRY 原則')
  report.push('')
  
  report.push('### 實施檢查清單')
  report.push('')
  report.push('- [ ] 更新 `trafficScenarioConfig.js` 添加 `targetFeatures` 和 `displayMultiplier`')
  report.push('- [ ] 修改 `TrafficDataCollector.js` 實現雙層數據收集')
  report.push('- [ ] 更新 API 發送邏輯，只傳送 `apiData`')
  report.push('- [ ] 前端驗證：視覺層車輛數正常')
  report.push('- [ ] 前端驗證：API 層數據在 VD 範圍內')
  report.push('- [ ] 後端驗證：接收數據範圍正確')
  report.push('- [ ] 測試各時段切換，確保數據一致')
  report.push('')
  
  report.push('---')
  report.push('')
  report.push('**報告生成時間**: ' + new Date().toISOString())
  report.push('')

  return report.join('\n')
}

/**
 * 主函數
 */
function main() {
  console.log('🚀 開始分析 50 週 VD 數據...\n')

  let totalFiles = 0
  let totalRecords = 0

  vdIds.forEach((vdId) => {
    console.log(`\n📍 分析 ${vdId}...`)
    const vdPath = path.join(vdDataPath, vdId)

    if (!fs.existsSync(vdPath)) {
      console.log(`  ⚠️  資料夾不存在: ${vdPath}`)
      return
    }

    const files = fs.readdirSync(vdPath).filter((f) => f.endsWith('.json'))
    console.log(`  📂 找到 ${files.length} 個檔案`)

    files.forEach((file) => {
      const filePath = path.join(vdPath, file)
      const count = analyzeJsonFile(vdId, filePath)
      totalRecords += count
      totalFiles++
    })
  })

  console.log(`\n\n✅ 分析完成！`)
  console.log(`📊 總共分析 ${totalFiles} 個檔案`)
  console.log(`📈 處理 ${totalRecords.toLocaleString()} 筆記錄\n`)

  // 生成 Markdown 報告
  console.log('📝 生成 Markdown 報告...')
  const markdown = generateMarkdownReport()

  const outputPath = path.join(__dirname, '../../doc/VD_ANALYSIS_SUMMARY_50WEEKS.md')
  fs.writeFileSync(outputPath, markdown, 'utf-8')

  console.log(`✅ 報告已保存: ${outputPath}`)
  console.log('\n🎉 完成！')
}

// 執行
main()
