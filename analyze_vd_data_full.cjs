const fs = require('fs')
const path = require('path')

/**
 * 完整 VD 數據分析 (50 週)
 * 分析時間範圍: 2024-02-26 至 2025-05-25 (15個月)
 */

const VD_DATA_DIR = path.join(__dirname, 'src', 'vd_data')
const VD_NAMES = ['VLRJM60', 'VLRJX00', 'VLRJX20']

// 按時段分類
const TIME_PERIODS = {
  早峰: { hours: [7, 8, 9], label: '07:00-09:59' },
  中午離峰: { hours: [10, 11, 12, 13, 14, 15, 16], label: '10:00-16:59' },
  晚峰: { hours: [17, 18, 19], label: '17:00-19:59' },
  晚間離峰: { hours: [20, 21, 22, 23], label: '20:00-23:59' },
  凌晨離峰: { hours: [0, 1, 2, 3, 4, 5, 6], label: '00:00-06:59' },
}

function getTimePeriod(hour) {
  for (const [period, config] of Object.entries(TIME_PERIODS)) {
    if (config.hours.includes(hour)) {
      return period
    }
  }
  return null
}

function analyzeVDFiles() {
  const allStats = {}
  let totalRecords = 0
  let filesProcessed = 0

  VD_NAMES.forEach((vdName) => {
    allStats[vdName] = {}
    Object.keys(TIME_PERIODS).forEach((period) => {
      allStats[vdName][period] = {
        speedData: [],
        occupancyData: [],
        vehicleData: [],
        laneCount: {},
      }
    })

    const vdPath = path.join(VD_DATA_DIR, vdName)
    const files = fs
      .readdirSync(vdPath)
      .filter((f) => f.endsWith('.json'))
      .sort()

    console.log(`\n📊 分析 ${vdName} (${files.length} 週)...`)

    files.forEach((file, idx) => {
      try {
        const filePath = path.join(vdPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(content)

        for (const [timestamp, records] of Object.entries(data)) {
          const date = new Date(timestamp)
          const hour = date.getHours()
          const period = getTimePeriod(hour)

          if (!period) continue

          records.forEach((record) => {
            const speed = record.Speed
            const occupancy = record.Occupancy
            const laneId = record.LaneID
            const totalVolume =
              (record.Vehicles?.M?.Volume || 0) +
              (record.Vehicles?.S?.Volume || 0) +
              (record.Vehicles?.L?.Volume || 0) +
              (record.Vehicles?.T?.Volume || 0)

            // 過濾無效數據
            if (speed === 0 && occupancy === 0) return

            allStats[vdName][period].speedData.push(speed)
            allStats[vdName][period].occupancyData.push(occupancy)
            allStats[vdName][period].vehicleData.push(totalVolume)

            if (!allStats[vdName][period].laneCount[laneId]) {
              allStats[vdName][period].laneCount[laneId] = []
            }
            allStats[vdName][period].laneCount[laneId].push(totalVolume)

            totalRecords++
          })
        }

        // 進度指示
        if ((idx + 1) % 10 === 0) {
          process.stdout.write(`  ${idx + 1}/${files.length} `)
        }
        filesProcessed++
      } catch (error) {
        console.error(`❌ 解析 ${file} 失敗:`, error.message)
      }
    })
    console.log(`\n  ✅ 完成`)
  })

  return { stats: allStats, totalRecords, filesProcessed }
}

function calculateStats(data) {
  if (data.length === 0) return null

  const sorted = data.sort((a, b) => a - b)
  const sum = data.reduce((a, b) => a + b, 0)
  const avg = sum / data.length
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const median = sorted[Math.floor(sorted.length / 2)]
  const p25 = sorted[Math.floor(sorted.length * 0.25)]
  const p75 = sorted[Math.floor(sorted.length * 0.75)]

  return { min, max, avg: parseFloat(avg.toFixed(2)), median, p25, p75, count: data.length }
}

function printResults(analysisResult) {
  const { stats: allStats, totalRecords, filesProcessed } = analysisResult

  console.log('\n' + '='.repeat(120))
  console.log('📈 VD 完整數據分析報告 (50週: 2024-02-26 至 2025-05-25, 15個月)')
  console.log('='.repeat(120))
  console.log(`\n📊 總體統計`)
  console.log(`  • 處理檔案數: ${filesProcessed}`)
  console.log(`  • 總數據紀錄: ${totalRecords.toLocaleString()} 筆`)
  console.log(`  • 時間跨度: 2024-02-26 ~ 2025-05-25 (15 個月)`)

  VD_NAMES.forEach((vdName) => {
    console.log(`\n\n🚦 ${vdName} 分析結果`)
    console.log('-'.repeat(120))

    const periodStats = allStats[vdName]

    Object.entries(TIME_PERIODS).forEach(([periodName, config]) => {
      const stats = periodStats[periodName]
      const speedStats = calculateStats(stats.speedData)
      const occupancyStats = calculateStats(stats.occupancyData)
      const vehicleStats = calculateStats(stats.vehicleData)

      console.log(`\n⏰ ${periodName} (${config.label})`)

      if (speedStats) {
        console.log(`   數據筆數: ${speedStats.count.toLocaleString()}`)
        console.log(
          `   🚗 速度 (km/h):   平均=${speedStats.avg}, 中位數=${speedStats.median}, 四分位=[${speedStats.p25}, ${speedStats.p75}], 範圍=${speedStats.min.toFixed(0)}-${speedStats.max.toFixed(0)}`,
        )
        console.log(
          `   🛣️  占有率 (%):   平均=${occupancyStats.avg}, 中位數=${occupancyStats.median}, 四分位=[${occupancyStats.p25}, ${occupancyStats.p75}], 範圍=${occupancyStats.min.toFixed(0)}-${occupancyStats.max.toFixed(0)}`,
        )
        console.log(
          `   🚙 車輛數/紀錄: 平均=${vehicleStats.avg.toFixed(1)}, 中位數=${vehicleStats.median}, 四分位=[${vehicleStats.p25}, ${vehicleStats.p75}], 範圍=${vehicleStats.min}-${vehicleStats.max}`,
        )

        // 車道統計
        const laneStats = {}
        for (const [laneId, vehicles] of Object.entries(stats.laneCount)) {
          const avgVehicles = (vehicles.reduce((a, b) => a + b, 0) / vehicles.length).toFixed(1)
          laneStats[`Lane${laneId}`] = avgVehicles
        }
        console.log(`   🛤️  車道平均車輛: ${JSON.stringify(laneStats)}`)
      } else {
        console.log(`   ⚠️  沒有有效數據`)
      }
    })
  })

  // 總結建議
  console.log('\n\n' + '='.repeat(120))
  console.log('📋 時段配置建議 (50週完整分析)')
  console.log('='.repeat(120))

  VD_NAMES.forEach((vdName) => {
    console.log(`\n${vdName}:`)
    console.log('-'.repeat(60))

    const periodStats = allStats[vdName]

    Object.entries(TIME_PERIODS).forEach(([periodName, config]) => {
      const stats = periodStats[periodName]
      const vehicleStats = calculateStats(stats.vehicleData)
      const occupancyStats = calculateStats(stats.occupancyData)

      if (vehicleStats) {
        let expectedSeconds = '50-60'

        if (periodName === '早峰' || periodName === '晚峰') {
          if (occupancyStats.avg > 22) {
            expectedSeconds = '60-70'
          } else if (occupancyStats.avg > 18) {
            expectedSeconds = '55-65'
          } else {
            expectedSeconds = '48-58'
          }
        } else if (periodName === '中午離峰') {
          if (occupancyStats.avg > 22) {
            expectedSeconds = '50-60'
          } else {
            expectedSeconds = '45-55'
          }
        } else if (periodName === '晚間離峰') {
          expectedSeconds = '40-50'
        } else if (periodName === '凌晨離峰') {
          expectedSeconds = '32-42'
        }

        console.log(
          `  ${periodName.padEnd(10)} | 占有率: ${occupancyStats.avg.toFixed(1)}% | 車輛: ${vehicleStats.avg.toFixed(1)} | 推薦秒數: ${expectedSeconds}`,
        )
      }
    })
  })

  console.log('\n' + '='.repeat(120))
  console.log('✅ 分析完成！')
  console.log('='.repeat(120))
}

// 執行分析
console.log('🔍 開始分析 50 週完整 VD 數據...\n')
const startTime = Date.now()

try {
  const result = analyzeVDFiles()
  printResults(result)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n⏱️  分析耗時: ${elapsed} 秒`)
  console.log(`📦 平均每週處理: ${(result.totalRecords / 50 / 1000).toFixed(0)}K 筆紀錄`)
} catch (error) {
  console.error('❌ 分析失敗:', error)
  process.exit(1)
}
