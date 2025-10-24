/**
 * VD 數據按小時詳細分析工具
 * 分析三個路口 50 週的數據，統計每小時的各項指標範圍值
 */

const fs = require('fs')
const path = require('path')

// VD 資料夾路徑
const vdDataPath = path.join(__dirname, '../vd_data')
const vdIds = ['VLRJM60', 'VLRJX00', 'VLRJX20']

// 按小時統計：{ VLRJM60: { 0: {...}, 1: {...}, ..., 23: {...} }, ... }
const hourlyStats = {}

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
    TotalVolume: { min: Infinity, max: -Infinity, sum: 0, count: 0, values: [] },
  }
}

/**
 * 初始化路口的 24 小時統計
 */
function initHourlyStatsForVD(vdId) {
  hourlyStats[vdId] = {}
  for (let hour = 0; hour < 24; hour++) {
    hourlyStats[vdId][hour] = initStats()
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

        // 更新該路口該小時的統計
        const hourStats = hourlyStats[vdId][hour]
        updateStats(hourStats, 'Speed', speed)
        updateStats(hourStats, 'Occupancy', occupancy)
        updateStats(hourStats, 'Volume_M', volumeM)
        updateStats(hourStats, 'Speed_M', speedM)
        updateStats(hourStats, 'Volume_S', volumeS)
        updateStats(hourStats, 'Speed_S', speedS)
        updateStats(hourStats, 'Volume_L', volumeL)
        updateStats(hourStats, 'Speed_L', speedL)
        updateStats(hourStats, 'Volume_T', volumeT)
        updateStats(hourStats, 'Speed_T', speedT)
        updateStats(hourStats, 'TotalVolume', totalVolume)

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
        count: 0,
      }
      continue
    }

    const avg = data.sum / data.count
    const sorted = [...data.values].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]

    summary[key] = {
      min: Math.round(data.min * 100) / 100,
      max: Math.round(data.max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      median: Math.round(median * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      count: data.count,
    }
  }

  return summary
}

/**
 * 獲取時段名稱
 */
function getTimePeriodName(hour) {
  if (hour >= 7 && hour <= 9) return '早峰 🚀'
  if (hour >= 17 && hour <= 19) return '晚峰 🚀'
  if (hour >= 0 && hour < 7) return '凌晨 🌙'
  if (hour >= 10 && hour <= 16) return '午間離峰 🌞'
  if (hour >= 20 && hour <= 23) return '晚間離峰 🌞'
  return '離峰 🌞'
}

/**
 * 生成 Markdown 報告
 */
function generateMarkdownReport() {
  const report = []

  report.push('# VD 數據按小時詳細分析報告')
  report.push('')
  report.push('> **分析日期**: ' + new Date().toISOString().split('T')[0])
  report.push('> **數據來源**: VLRJM60, VLRJX00, VLRJX20')
  report.push('> **數據期間**: 50 週交通數據')
  report.push('> **統計維度**: 每個路口每小時的各特徵範圍值')
  report.push('')
  report.push('---')
  report.push('')

  report.push('## 📖 目錄')
  report.push('')
  report.push('- [一、VLRJM60 路口按小時統計](#一vlrjm60-路口按小時統計)')
  report.push('- [二、VLRJX00 路口按小時統計](#二vlrjx00-路口按小時統計)')
  report.push('- [三、VLRJX20 路口按小時統計](#三vlrjx20-路口按小時統計)')
  report.push('- [四、三個路口綜合對比](#四三個路口綜合對比)')
  report.push('- [五、正規化參數配置](#五正規化參數配置)')
  report.push('')
  report.push('---')
  report.push('')

  // 為每個路口生成按小時的詳細報告
  vdIds.forEach((vdId, vdIndex) => {
    const vdNumber = vdIndex + 1
    report.push(`## ${['一', '二', '三'][vdIndex]}、${vdId} 路口按小時統計`)
    report.push('')

    // 生成 24 小時的表格
    for (let hour = 0; hour < 24; hour++) {
      const periodName = getTimePeriodName(hour)
      const summary = calculateSummary(hourlyStats[vdId][hour])
      
      report.push(`### ${hour}:00 時段 ${periodName}`)
      report.push('')
      
      // 樣本數檢查
      if (summary.Speed.count === 0) {
        report.push('> ⚠️ 此時段無數據')
        report.push('')
        continue
      }

      report.push('| 指標 | 最小值 | 最大值 | 平均值 | 中位數 | P95 | 樣本數 |')
      report.push('|------|--------|--------|--------|--------|-----|--------|')
      
      const metrics = [
        { key: 'Speed', name: '平均速度 (km/h)', highlight: true },
        { key: 'Occupancy', name: '佔有率 (%)', highlight: true },
        { key: 'TotalVolume', name: '**總流量 (輛/5min)**', highlight: true },
        { key: 'Volume_M', name: '機車流量 (輛/5min)' },
        { key: 'Speed_M', name: '機車速度 (km/h)' },
        { key: 'Volume_S', name: '小型車流量 (輛/5min)' },
        { key: 'Speed_S', name: '小型車速度 (km/h)' },
        { key: 'Volume_L', name: '大型車流量 (輛/5min)' },
        { key: 'Speed_L', name: '大型車速度 (km/h)' },
      ]

      metrics.forEach(({ key, name, highlight }) => {
        const s = summary[key]
        const nameDisplay = highlight ? `**${name}**` : name
        report.push(`| ${nameDisplay} | ${s.min} | ${s.max} | ${s.avg} | ${s.median} | ${s.p95} | ${s.count.toLocaleString()} |`)
      })

      report.push('')
    }

    report.push('---')
    report.push('')
  })

  // 綜合對比表
  report.push('## 四、三個路口綜合對比')
  report.push('')
  report.push('### 尖峰時段 (07:00-09:00, 17:00-19:00)')
  report.push('')
  report.push('| 路口 | 時段 | 總流量 (平均) | 佔有率 (平均) | 速度 (平均) | 機車流量 | 小型車流量 | 大型車流量 |')
  report.push('|------|------|--------------|--------------|------------|---------|----------|----------|')

  const peakHours = [7, 8, 9, 17, 18, 19]
  vdIds.forEach((vdId) => {
    peakHours.forEach((hour) => {
      const summary = calculateSummary(hourlyStats[vdId][hour])
      const periodName = getTimePeriodName(hour)
      report.push(`| ${vdId} | ${hour}:00 ${periodName} | ${summary.TotalVolume.avg} | ${summary.Occupancy.avg}% | ${summary.Speed.avg} km/h | ${summary.Volume_M.avg} | ${summary.Volume_S.avg} | ${summary.Volume_L.avg} |`)
    })
  })

  report.push('')
  report.push('### 離峰時段 (09:00-17:00, 19:00-23:00)')
  report.push('')
  report.push('| 路口 | 時段 | 總流量 (平均) | 佔有率 (平均) | 速度 (平均) | 機車流量 | 小型車流量 | 大型車流量 |')
  report.push('|------|------|--------------|--------------|------------|---------|----------|----------|')

  const offPeakHours = [10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23]
  vdIds.forEach((vdId) => {
    // 只顯示代表性時段
    const representativeHours = [12, 15, 21]
    representativeHours.forEach((hour) => {
      const summary = calculateSummary(hourlyStats[vdId][hour])
      const periodName = getTimePeriodName(hour)
      report.push(`| ${vdId} | ${hour}:00 ${periodName} | ${summary.TotalVolume.avg} | ${summary.Occupancy.avg}% | ${summary.Speed.avg} km/h | ${summary.Volume_M.avg} | ${summary.Volume_S.avg} | ${summary.Volume_L.avg} |`)
    })
  })

  report.push('')
  report.push('### 凌晨時段 (00:00-07:00)')
  report.push('')
  report.push('| 路口 | 時段 | 總流量 (平均) | 佔有率 (平均) | 速度 (平均) | 機車流量 | 小型車流量 | 大型車流量 |')
  report.push('|------|------|--------------|--------------|------------|---------|----------|----------|')

  const lateNightHours = [0, 1, 2, 3, 4, 5, 6]
  vdIds.forEach((vdId) => {
    // 只顯示代表性時段
    const representativeHours = [2, 5]
    representativeHours.forEach((hour) => {
      const summary = calculateSummary(hourlyStats[vdId][hour])
      const periodName = getTimePeriodName(hour)
      report.push(`| ${vdId} | ${hour}:00 ${periodName} | ${summary.TotalVolume.avg} | ${summary.Occupancy.avg}% | ${summary.Speed.avg} km/h | ${summary.Volume_M.avg} | ${summary.Volume_S.avg} | ${summary.Volume_L.avg} |`)
    })
  })

  report.push('')
  report.push('---')
  report.push('')

  // 正規化參數配置
  report.push('## 五、正規化參數配置')
  report.push('')
  report.push('根據 50 週數據統計，建議的正規化參數如下：')
  report.push('')

  vdIds.forEach((vdId) => {
    report.push(`### ${vdId} 正規化參數`)
    report.push('')
    report.push('```javascript')
    report.push(`const ${vdId}_NORMALIZATION = {`)
    report.push('  // 尖峰時段 (07:00-09:00, 17:00-19:00)')
    report.push('  peak_hours: {')
    
    // 計算尖峰時段平均值
    const peakSummaries = peakHours.map(h => calculateSummary(hourlyStats[vdId][h]))
    const peakAvg = {
      TotalVolume: { 
        min: Math.min(...peakSummaries.map(s => s.TotalVolume.min)),
        max: Math.max(...peakSummaries.map(s => s.TotalVolume.max)),
        avg: peakSummaries.reduce((sum, s) => sum + s.TotalVolume.avg, 0) / peakSummaries.length
      },
      Occupancy: {
        min: Math.min(...peakSummaries.map(s => s.Occupancy.min)),
        max: Math.max(...peakSummaries.map(s => s.Occupancy.max)),
        avg: peakSummaries.reduce((sum, s) => sum + s.Occupancy.avg, 0) / peakSummaries.length
      },
      Speed: {
        min: Math.min(...peakSummaries.map(s => s.Speed.min)),
        max: Math.max(...peakSummaries.map(s => s.Speed.max)),
        avg: peakSummaries.reduce((sum, s) => sum + s.Speed.avg, 0) / peakSummaries.length
      }
    }

    report.push(`    volume: { min: ${peakAvg.TotalVolume.min.toFixed(2)}, max: ${peakAvg.TotalVolume.max.toFixed(2)}, avg: ${peakAvg.TotalVolume.avg.toFixed(2)} },`)
    report.push(`    occupancy: { min: ${peakAvg.Occupancy.min.toFixed(2)}, max: ${peakAvg.Occupancy.max.toFixed(2)}, avg: ${peakAvg.Occupancy.avg.toFixed(2)} },`)
    report.push(`    speed: { min: ${peakAvg.Speed.min.toFixed(2)}, max: ${peakAvg.Speed.max.toFixed(2)}, avg: ${peakAvg.Speed.avg.toFixed(2)} },`)
    report.push('  },')

    // 離峰時段
    const offPeakSummaries = offPeakHours.map(h => calculateSummary(hourlyStats[vdId][h]))
    const offPeakAvg = {
      TotalVolume: { 
        min: Math.min(...offPeakSummaries.map(s => s.TotalVolume.min)),
        max: Math.max(...offPeakSummaries.map(s => s.TotalVolume.max)),
        avg: offPeakSummaries.reduce((sum, s) => sum + s.TotalVolume.avg, 0) / offPeakSummaries.length
      },
      Occupancy: {
        min: Math.min(...offPeakSummaries.map(s => s.Occupancy.min)),
        max: Math.max(...offPeakSummaries.map(s => s.Occupancy.max)),
        avg: offPeakSummaries.reduce((sum, s) => sum + s.Occupancy.avg, 0) / offPeakSummaries.length
      },
      Speed: {
        min: Math.min(...offPeakSummaries.map(s => s.Speed.min)),
        max: Math.max(...offPeakSummaries.map(s => s.Speed.max)),
        avg: offPeakSummaries.reduce((sum, s) => sum + s.Speed.avg, 0) / offPeakSummaries.length
      }
    }

    report.push('  // 離峰時段 (09:00-17:00, 19:00-23:00)')
    report.push('  off_peak: {')
    report.push(`    volume: { min: ${offPeakAvg.TotalVolume.min.toFixed(2)}, max: ${offPeakAvg.TotalVolume.max.toFixed(2)}, avg: ${offPeakAvg.TotalVolume.avg.toFixed(2)} },`)
    report.push(`    occupancy: { min: ${offPeakAvg.Occupancy.min.toFixed(2)}, max: ${offPeakAvg.Occupancy.max.toFixed(2)}, avg: ${offPeakAvg.Occupancy.avg.toFixed(2)} },`)
    report.push(`    speed: { min: ${offPeakAvg.Speed.min.toFixed(2)}, max: ${offPeakAvg.Speed.max.toFixed(2)}, avg: ${offPeakAvg.Speed.avg.toFixed(2)} },`)
    report.push('  },')

    // 凌晨時段
    const lateNightSummaries = lateNightHours.map(h => calculateSummary(hourlyStats[vdId][h]))
    const lateNightAvg = {
      TotalVolume: { 
        min: Math.min(...lateNightSummaries.map(s => s.TotalVolume.min)),
        max: Math.max(...lateNightSummaries.map(s => s.TotalVolume.max)),
        avg: lateNightSummaries.reduce((sum, s) => sum + s.TotalVolume.avg, 0) / lateNightSummaries.length
      },
      Occupancy: {
        min: Math.min(...lateNightSummaries.map(s => s.Occupancy.min)),
        max: Math.max(...lateNightSummaries.map(s => s.Occupancy.max)),
        avg: lateNightSummaries.reduce((sum, s) => sum + s.Occupancy.avg, 0) / lateNightSummaries.length
      },
      Speed: {
        min: Math.min(...lateNightSummaries.map(s => s.Speed.min)),
        max: Math.max(...lateNightSummaries.map(s => s.Speed.max)),
        avg: lateNightSummaries.reduce((sum, s) => sum + s.Speed.avg, 0) / lateNightSummaries.length
      }
    }

    report.push('  // 凌晨時段 (00:00-07:00)')
    report.push('  late_night: {')
    report.push(`    volume: { min: ${lateNightAvg.TotalVolume.min.toFixed(2)}, max: ${lateNightAvg.TotalVolume.max.toFixed(2)}, avg: ${lateNightAvg.TotalVolume.avg.toFixed(2)} },`)
    report.push(`    occupancy: { min: ${lateNightAvg.Occupancy.min.toFixed(2)}, max: ${lateNightAvg.Occupancy.max.toFixed(2)}, avg: ${lateNightAvg.Occupancy.avg.toFixed(2)} },`)
    report.push(`    speed: { min: ${lateNightAvg.Speed.min.toFixed(2)}, max: ${lateNightAvg.Speed.max.toFixed(2)}, avg: ${lateNightAvg.Speed.avg.toFixed(2)} },`)
    report.push('  }')
    report.push('};')
    report.push('```')
    report.push('')
  })

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
  console.log('🚀 開始按小時分析 50 週 VD 數據...\n')

  // 初始化每個路口的 24 小時統計
  vdIds.forEach((vdId) => {
    initHourlyStatsForVD(vdId)
  })

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

  const outputPath = path.join(__dirname, '../../doc/VD_HOURLY_ANALYSIS.md')
  fs.writeFileSync(outputPath, markdown, 'utf-8')

  console.log(`✅ 報告已保存: ${outputPath}`)
  console.log('\n🎉 完成！')
}

// 執行
main()
