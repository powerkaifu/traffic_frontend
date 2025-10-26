/**
 * 🔍 正規化管道診斷工具
 *
 * 使用方式: 在瀏覽器開發工具 (DevTools) 的控制台中複製並貼上下面的代碼
 * 然後按 Enter 鍵執行
 *
 * 功能: 自動檢查整個正規化流程的每個環節
 */

// ============================================================
// 🔧 診斷工具
// ============================================================

const NormalizationDiagnostics = {
  /**
   * 1️⃣ 檢查時段判定是否正確
   */
  checkTimePeriod: () => {
    console.log('=' * 50)
    console.log('1️⃣ 【檢查時段判定】')
    console.log('=' * 50)

    try {
      // 需要動態導入
      import('src/classes/config/vdNormalizationConfig.js').then((module) => {
        const { getCurrentTimePeriod, getTimePeriodByHour } = module
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const period = getCurrentTimePeriod()

        console.log(`⏰ 當前時間: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`)
        console.log(`📍 判定時段: ${period}`)
        console.log(`✅ 時段判定成功`)

        // 檢查 24 小時的時段分配
        console.log('\n📊 24 小時時段分配:')
        const hours = {}
        for (let h = 0; h < 24; h++) {
          const p = getTimePeriodByHour(h)
          if (!hours[p]) hours[p] = []
          hours[p].push(h)
        }
        Object.entries(hours).forEach(([period, hoursList]) => {
          console.log(`  ${period}: ${hoursList.join(', ')}`)
        })
      })
    } catch (error) {
      console.error('❌ 時段判定檢查失敗:', error.message)
    }
  },

  /**
   * 2️⃣ 檢查正規化配置是否完整
   */
  checkNormalizationConfig: () => {
    console.log('\n' + '=' * 50)
    console.log('2️⃣ 【檢查正規化配置】')
    console.log('=' * 50)

    try {
      import('src/classes/config/vdNormalizationConfig.js').then((module) => {
        const { getNormalizationConfig } = module
        const intersections = ['VLRJM60', 'VLRJX00', 'VLRJX20']
        const periods = ['peak_hours', 'off_peak', 'late_night']

        intersections.forEach((id) => {
          console.log(`\n🏢 ${id}:`)
          const config = getNormalizationConfig(id)
          periods.forEach((period) => {
            const params = config[period]
            if (params) {
              console.log(`  ${period}:`)
              console.log(`    - displayMultiplier: ${params.displayMultiplier}x`)
              console.log(`    - volume.avg: ${params.volume.avg}`)
              console.log(`    - occupancy.avg: ${params.occupancy.avg}`)
              console.log(`    - speed.avg: ${params.speed.avg}`)
            }
          })
        })
        console.log(`✅ 正規化配置檢查完成`)
      })
    } catch (error) {
      console.error('❌ 正規化配置檢查失敗:', error.message)
    }
  },

  /**
   * 3️⃣ 檢查正規化轉換邏輯
   */
  checkNormalizationLogic: () => {
    console.log('\n' + '=' * 50)
    console.log('3️⃣ 【檢查正規化轉換邏輯】')
    console.log('=' * 50)

    try {
      import('src/classes/utils/VDNormalizationUtils.js').then((VDNormUtils) => {
        const VDNormalizationUtils = VDNormUtils.default

        // 測試數據: 前端 60 輛車
        const testData = {
          volume: 60,
          speed: 30,
          occupancy: 50,
          volume_m: 15,
          volume_s: 35,
          volume_l: 10,
        }

        console.log('📥 測試輸入 (前端數據):')
        console.log(`  - Volume: ${testData.volume} 輛`)
        console.log(`  - Speed: ${testData.speed} km/h`)
        console.log(`  - Occupancy: ${testData.occupancy}%`)

        const result = VDNormalizationUtils.denormalizeToVDRange(testData, 'VLRJM60', 'peak_hours')

        console.log('\n📤 測試輸出 (正規化數據):')
        console.log(`  - Volume: ${result.volume} 輛`)
        console.log(`  - Speed: ${result.speed} km/h`)
        console.log(`  - Occupancy: ${result.occupancy}`)

        console.log('\n✅ 正規化轉換檢查完成')
      })
    } catch (error) {
      console.error('❌ 正規化轉換檢查失敗:', error.message)
    }
  },

  /**
   * 4️⃣ 檢查後端縮放層
   */
  checkBackendScaling: () => {
    console.log('\n' + '=' * 50)
    console.log('4️⃣ 【檢查後端縮放層】')
    console.log('=' * 50)

    try {
      import('src/classes/config/vehicleConfig.js').then((module) => {
        const { VOLUME_LIMITS_CONFIG } = module

        console.log('📊 後端縮放限制配置:')
        Object.entries(VOLUME_LIMITS_CONFIG).forEach(([period, config]) => {
          console.log(`\n  ${period}:`)
          console.log(`    - maxLiveVehicles: ${config.maxLiveVehicles}`)
          console.log(`    - displayMultiplier: ${config.displayMultiplier}`)
          console.log(`    - maxLiveVehiclesForBackend: ${config.maxLiveVehiclesForBackend}`)

          // 計算縮放比例
          const scaleFactor = Math.min(1, config.maxLiveVehiclesForBackend / config.maxLiveVehicles)
          console.log(`    - 縮放因子: ${(scaleFactor * 100).toFixed(1)}%`)
        })

        console.log(`\n✅ 後端縮放層檢查完成`)
      })
    } catch (error) {
      console.error('❌ 後端縮放層檢查失敗:', error.message)
    }
  },

  /**
   * 5️⃣ 檢查發送的數據格式
   */
  checkDataFormat: () => {
    console.log('\n' + '=' * 50)
    console.log('5️⃣ 【檢查發送的數據格式】')
    console.log('=' * 50)

    try {
      // 獲取最後發送的數據 (需要全局變量)
      if (window.lastNormalizedDataArray && window.lastNormalizedDataArray.length > 0) {
        const data = window.lastNormalizedDataArray[0]

        console.log('📦 發送的數據樣本 (第一筆):')
        console.log(`  - VD_ID: ${data.VD_ID}`)
        console.log(`  - Hour: ${data.Hour}`)
        console.log(`  - Volume_T: ${data.Volume_T}`)
        console.log(`  - Volume_M: ${data.Volume_M}`)
        console.log(`  - Volume_S: ${data.Volume_S}`)
        console.log(`  - Volume_L: ${data.Volume_L}`)
        console.log(`  - Speed: ${data.Speed}`)
        console.log(`  - Occupancy: ${data.Occupancy}`)

        // 檢查欄位數量
        const fieldsCount = Object.keys(data).length
        console.log(`\n  欄位總數: ${fieldsCount}`)
        if (fieldsCount === 18) {
          console.log(`  ✅ 欄位數量正確 (18 個)`)
        } else {
          console.log(`  ❌ 欄位數量不正確 (應該是 18，現在是 ${fieldsCount})`)
        }

        // 檢查是否有非 enumerable 屬性
        console.log(`\n  非 Enumerable 屬性:`)
        console.log(`    - normalization_period: ${data.normalization_period}`)
        console.log(`    - normalization_displayMultiplier: ${data.normalization_displayMultiplier}`)
        console.log(`    - weather: ${data.weather}`)
        console.log(`    - validation_passed: ${data.validation_passed}`)

        // 檢查 JSON 序列化
        const jsonStr = JSON.stringify(data)
        console.log(`\n  JSON 序列化:`)
        console.log(`    - 字符串長度: ${jsonStr.length}`)
        console.log(`    - 包含 'normalization_period': ${jsonStr.includes('normalization_period')}`)
        console.log(`    - 包含 'validation_passed': ${jsonStr.includes('validation_passed')}`)

        console.log(`\n✅ 數據格式檢查完成`)
      } else {
        console.log('⚠️ 還沒有發送過數據，請等待交通燈倒數到 0')
      }
    } catch (error) {
      console.error('❌ 數據格式檢查失敗:', error.message)
    }
  },

  /**
   * 🚀 執行所有檢查
   */
  runAll: async () => {
    console.clear()
    console.log('🔍 開始執行正規化管道診斷...\n')

    NormalizationDiagnostics.checkTimePeriod()
    setTimeout(() => NormalizationDiagnostics.checkNormalizationConfig(), 500)
    setTimeout(() => NormalizationDiagnostics.checkNormalizationLogic(), 1000)
    setTimeout(() => NormalizationDiagnostics.checkBackendScaling(), 1500)
    setTimeout(() => NormalizationDiagnostics.checkDataFormat(), 2000)

    console.log('\n' + '=' * 50)
    console.log('✅ 診斷完成！')
    console.log('=' * 50)
  },
}

// ============================================================
// 🚀 執行診斷
// ============================================================

console.log('🔍 正規化管道診斷工具已載入')
console.log('執行以下命令開始診斷:')
console.log('  NormalizationDiagnostics.runAll()')
console.log('\n或者執行單個檢查:')
console.log('  NormalizationDiagnostics.checkTimePeriod()')
console.log('  NormalizationDiagnostics.checkNormalizationConfig()')
console.log('  NormalizationDiagnostics.checkNormalizationLogic()')
console.log('  NormalizationDiagnostics.checkBackendScaling()')
console.log('  NormalizationDiagnostics.checkDataFormat()')

// 自動執行所有檢查
NormalizationDiagnostics.runAll()
