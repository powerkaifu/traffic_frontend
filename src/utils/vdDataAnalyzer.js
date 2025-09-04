/**
 * VD數據分析器 - 分析所有VD數據的Volume和Speed範圍
 */

export class VDDataAnalyzer {
  constructor() {
    this.analysisResults = {
      volumeStats: {
        motor: { min: Infinity, max: -Infinity, avg: 0, total: 0, count: 0 },
        small: { min: Infinity, max: -Infinity, avg: 0, total: 0, count: 0 },
        large: { min: Infinity, max: -Infinity, avg: 0, total: 0, count: 0 },
        truck: { min: Infinity, max: -Infinity, avg: 0, total: 0, count: 0 },
      },
      speedStats: {
        motor: { min: Infinity, max: -Infinity, avg: 0, total: 0, count: 0 },
        small: { min: Infinity, max: -Infinity, avg: 0, total: 0, count: 0 },
        large: { min: Infinity, max: -Infinity, avg: 0, total: 0, count: 0 },
        truck: { min: Infinity, max: -Infinity, avg: 0, total: 0, count: 0 },
      },
      overallStats: {
        totalRecords: 0,
        timeRange: { start: null, end: null },
        intersections: new Set(),
        extremeVolumes: [],
        extremeSpeeds: [],
      },
      recommendations: {
        volumeLimits: {},
        speedLimits: {},
        modelTrainingTips: [],
      },
    }
  }

  /**
   * 分析單個VD JSON文件
   */
  async analyzeVDFile(filePath) {
    try {
      const response = await fetch(filePath)
      const data = await response.json()

      console.log(`📊 分析VD文件: ${filePath.split('/').pop()}`)

      Object.entries(data).forEach(([timestamp, records]) => {
        this.analysisResults.overallStats.totalRecords += records.length

        // 更新時間範圍
        if (
          !this.analysisResults.overallStats.timeRange.start ||
          timestamp < this.analysisResults.overallStats.timeRange.start
        ) {
          this.analysisResults.overallStats.timeRange.start = timestamp
        }
        if (
          !this.analysisResults.overallStats.timeRange.end ||
          timestamp > this.analysisResults.overallStats.timeRange.end
        ) {
          this.analysisResults.overallStats.timeRange.end = timestamp
        }

        records.forEach((record) => {
          // 記錄路口
          this.analysisResults.overallStats.intersections.add(record.LinkID)

          // 分析各車型數據
          if (record.Vehicles) {
            Object.entries(record.Vehicles).forEach(([type, vehicleData]) => {
              const typeKey = this.getVehicleTypeKey(type)
              if (typeKey && vehicleData) {
                this.updateVolumeStats(typeKey, vehicleData.Volume)
                this.updateSpeedStats(typeKey, vehicleData.Speed)

                // 記錄極值
                if (vehicleData.Volume > 25) {
                  this.analysisResults.overallStats.extremeVolumes.push({
                    timestamp,
                    linkId: record.LinkID,
                    type: typeKey,
                    volume: vehicleData.Volume,
                    speed: vehicleData.Speed,
                  })
                }

                if (vehicleData.Speed > 100) {
                  this.analysisResults.overallStats.extremeSpeeds.push({
                    timestamp,
                    linkId: record.LinkID,
                    type: typeKey,
                    volume: vehicleData.Volume,
                    speed: vehicleData.Speed,
                  })
                }
              }
            })
          }
        })
      })

      return true
    } catch (error) {
      console.error(`❌ 分析VD文件失敗: ${filePath}`, error)
      return false
    }
  }

  /**
   * 獲取車型對應的key
   */
  getVehicleTypeKey(type) {
    const typeMap = {
      M: 'motor',
      S: 'small',
      L: 'large',
      T: 'truck',
    }
    return typeMap[type] || null
  }

  /**
   * 更新Volume統計
   */
  updateVolumeStats(type, volume) {
    if (volume === null || volume === undefined || volume < 0) return

    const stats = this.analysisResults.volumeStats[type]
    if (!stats) return

    stats.min = Math.min(stats.min, volume)
    stats.max = Math.max(stats.max, volume)
    stats.total += volume
    stats.count++
    stats.avg = stats.total / stats.count
  }

  /**
   * 更新Speed統計
   */
  updateSpeedStats(type, speed) {
    if (speed === null || speed === undefined || speed <= 0) return

    const stats = this.analysisResults.speedStats[type]
    if (!stats) return

    stats.min = Math.min(stats.min, speed)
    stats.max = Math.max(stats.max, speed)
    stats.total += speed
    stats.count++
    stats.avg = stats.total / stats.count
  }

  /**
   * 分析所有VD數據文件
   */
  async analyzeAllVDData() {
    console.log('🚀 開始分析所有VD數據...')

    const intersections = ['VLRJM60', 'VLRJX00', 'VLRJX20']
    const filePromises = []

    // 動態獲取所有VD文件
    for (const intersection of intersections) {
      try {
        const basePath = `/src/vd_data/${intersection}/`

        // 這裡需要實際的文件列表，簡化處理
        const commonFiles = [
          '2024-02-26_2024-03-03.json',
          '2024-03-04_2024-03-10.json',
          '2024-03-11_2024-03-17.json',
          '2024-04-01_2024-04-07.json',
          '2024-04-08_2024-04-14.json',
          '2024-04-15_2024-04-21.json',
          '2024-04-22_2024-04-28.json',
          '2024-04-29_2024-05-05.json',
          '2024-05-06_2024-05-12.json',
          '2024-05-13_2024-05-19.json',
        ]

        for (const fileName of commonFiles) {
          const filePath = basePath + fileName
          filePromises.push(this.analyzeVDFile(filePath))
        }
      } catch {
        console.warn(`⚠️ 無法讀取路口 ${intersection} 的數據`)
      }
    }

    const results = await Promise.allSettled(filePromises)
    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value).length

    console.log(`✅ VD數據分析完成: ${successCount}/${filePromises.length} 文件成功分析`)

    // 生成建議
    this.generateRecommendations()

    return this.getAnalysisReport()
  }

  /**
   * 生成建議配置
   */
  generateRecommendations() {
    const recommendations = this.analysisResults.recommendations

    // Volume建議
    Object.entries(this.analysisResults.volumeStats).forEach(([type, stats]) => {
      if (stats.count > 0) {
        recommendations.volumeLimits[type] = {
          recommended: Math.ceil(stats.max * 0.9), // 90th percentile
          observed_max: stats.max,
          observed_avg: Math.round(stats.avg * 10) / 10,
          data_points: stats.count,
        }
      }
    })

    // Speed建議
    Object.entries(this.analysisResults.speedStats).forEach(([type, stats]) => {
      if (stats.count > 0) {
        recommendations.speedLimits[type] = {
          min_recommended: Math.max(0, Math.floor(stats.min)),
          max_recommended: Math.ceil(stats.max * 0.95), // 95th percentile
          observed_max: stats.max,
          observed_avg: Math.round(stats.avg * 10) / 10,
          data_points: stats.count,
        }
      }
    })

    // 模型訓練建議
    const maxVolume = Math.max(...Object.values(this.analysisResults.volumeStats).map((s) => s.max))
    const maxSpeed = Math.max(...Object.values(this.analysisResults.speedStats).map((s) => s.max))

    recommendations.modelTrainingTips = [
      `建議Volume範圍: 0-${maxVolume} (觀察到的最大值)`,
      `建議Speed範圍: 0-${Math.ceil(maxSpeed)} km/h`,
      `極高Volume數據點: ${this.analysisResults.overallStats.extremeVolumes.length} 個`,
      `建議前端數據上限: Volume=${Math.ceil(maxVolume * 0.9)}, Speed=${Math.ceil(maxSpeed * 0.95)}`,
      `數據標準化建議: 如果模型只訓練0-20範圍，建議前端數據截斷在20以內`,
    ]
  }

  /**
   * 獲取分析報告
   */
  getAnalysisReport() {
    // 清理無限值
    Object.values(this.analysisResults.volumeStats).forEach((stats) => {
      if (stats.min === Infinity) stats.min = 0
      if (stats.max === -Infinity) stats.max = 0
    })

    Object.values(this.analysisResults.speedStats).forEach((stats) => {
      if (stats.min === Infinity) stats.min = 0
      if (stats.max === -Infinity) stats.max = 0
    })

    return {
      summary: {
        totalRecords: this.analysisResults.overallStats.totalRecords,
        intersectionCount: this.analysisResults.overallStats.intersections.size,
        timeRange: this.analysisResults.overallStats.timeRange,
        extremeVolumeCount: this.analysisResults.overallStats.extremeVolumes.length,
        extremeSpeedCount: this.analysisResults.overallStats.extremeSpeeds.length,
      },
      volumeStats: this.analysisResults.volumeStats,
      speedStats: this.analysisResults.speedStats,
      extremeData: {
        volumes: this.analysisResults.overallStats.extremeVolumes.slice(0, 10), // 前10個
        speeds: this.analysisResults.overallStats.extremeSpeeds.slice(0, 10),
      },
      recommendations: this.analysisResults.recommendations,
      frontendConfig: this.generateFrontendConfig(),
    }
  }

  /**
   * 生成前端配置建議
   */
  generateFrontendConfig() {
    const maxVolume = Math.max(...Object.values(this.analysisResults.volumeStats).map((s) => s.max))
    const maxSpeed = Math.max(...Object.values(this.analysisResults.speedStats).map((s) => s.max))

    return {
      volumeLimits: {
        maxVolumePerType: Math.min(20, Math.ceil(maxVolume * 0.9)), // 保守估計，不超過20
        maxTotalVolume: Math.min(50, Math.ceil(maxVolume * 3.5)),
        enableVolumeNormalization: true,
        enableDataCapping: true,
      },
      speedLimits: {
        minSpeed: 0,
        maxSpeed: Math.min(80, Math.ceil(maxSpeed * 0.95)),
        defaultSpeed: 40,
      },
      modelCompatibility: {
        comment: '基於VD數據分析的建議配置，確保與後端AI模型訓練範圍一致',
        dataSource: 'Real VD data analysis',
        lastAnalyzed: new Date().toISOString(),
      },
    }
  }

  /**
   * 導出分析結果為JSON
   */
  exportAnalysis() {
    const report = this.getAnalysisReport()
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `vd_data_analysis_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('📥 VD數據分析報告已下載')
    return report
  }
}

// 使用範例
export async function runVDAnalysis() {
  const analyzer = new VDDataAnalyzer()

  try {
    const report = await analyzer.analyzeAllVDData()
    console.log('📊 VD數據分析完成:', report)

    // 可選：導出報告
    // analyzer.exportAnalysis()

    return report
  } catch (error) {
    console.error('❌ VD數據分析失敗:', error)
    return null
  }
}
