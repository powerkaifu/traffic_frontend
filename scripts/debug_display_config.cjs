const path = require('path')

// 模擬 ES Module 環境讀取配置
const configPath = path.join(__dirname, '../src/classes/config/vdDisplayConfig.js')
const fs = require('fs')

console.log('\n' + '='.repeat(70))
console.log('VD 顯示映射配置檢查工具')
console.log('='.repeat(70) + '\n')

// 直接讀取並解析配置
try {
  const configContent = fs.readFileSync(configPath, 'utf8')

  // 提取配置對象
  const configMatch = configContent.match(/export const VD_DISPLAY_CONFIG = \{[\s\S]*?\n\}/)

  if (!configMatch) {
    console.log('❌ 無法解析 VD_DISPLAY_CONFIG，請檢查文件格式')
    process.exit(1)
  }

  console.log('✅ 配置文件讀取成功\n')

  // 手動解析關鍵參數
  const parseValue = (key, section) => {
    const regex = new RegExp(`${section}:\\s*\\{[\\s\\S]*?${key}:\\s*(\\d+(?:\\.\\d+)?)`, 'i')
    const match = configContent.match(regex)
    return match ? parseFloat(match[1]) : null
  }

  const sections = ['peak_hours', 'off_peak', 'late_night']
  const timePeriodLabels = {
    peak_hours: '尖峰 (Peak)',
    off_peak: '離峰 (Off-Peak)',
    late_night: '凌晨 (Late Night)',
  }

  sections.forEach((section) => {
    console.log(`\n【${timePeriodLabels[section]}】`)
    console.log('-'.repeat(70))

    // 使用正則表達式提取值
    const trainingMin = parseValue('vd_train_volume_min', section)
    const trainingMax = parseValue('vd_train_volume_max', section)
    const displayMin = parseValue('display_volume_min', section)
    const displayMax = parseValue('display_volume_max', section)
    const scale = parseValue('display_scale', section)
    const interval = parseValue('generation_interval', section)

    console.log(`  訓練數據範圍:        ${trainingMin}-${trainingMax} 輛 (發送給後端)`)
    console.log(`  顯示流量範圍:        ${displayMin}-${displayMax} 輛 (畫面展示)`)
    console.log(`  縮放倍數:            ${scale}x`)
    console.log(`  生成間隔:            ${interval}s/輛`)

    // 計算統計
    const vehiclesPerMin = (60 / interval).toFixed(1)
    const vehiclesPerMin5 = (300 / interval).toFixed(0)
    const vehiclesPerMin10 = (600 / interval).toFixed(0)

    console.log(`\n  📊 流量預測:`)
    console.log(`    - 每分鐘生成:       ${vehiclesPerMin} 輛`)
    console.log(`    - 5分鐘預期:        ${vehiclesPerMin5} 輛`)
    console.log(`    - 10分鐘預期:       ${vehiclesPerMin10} 輛`)

    // 驗證配置合理性
    const errors = []
    if (trainingMin >= trainingMax) errors.push('訓練數據範圍無效 (min ≥ max)')
    if (displayMin >= displayMax) errors.push('顯示流量範圍無效 (min ≥ max)')
    if (interval <= 0) errors.push('生成間隔必須 > 0')
    if (displayMin < trainingMin * scale * 0.8) errors.push('警告：displayMin 可能太小')

    if (errors.length > 0) {
      console.log(`\n  ⚠️  配置警告:`)
      errors.forEach((err) => console.log(`    - ${err}`))
    } else {
      console.log(`\n  ✅ 配置通過驗證`)
    }
  })

  console.log('\n' + '='.repeat(70))
  console.log('💡 微調提示:')
  console.log('  - 若要車輛更密集：減小 generation_interval')
  console.log('  - 若要車輛更稀疏：增大 generation_interval')
  console.log('  - 編輯 src/classes/config/vdDisplayConfig.js')
  console.log('  - 修改後需要刷新瀏覽器 (F5)')
  console.log('='.repeat(70) + '\n')
} catch (error) {
  console.error('❌ 錯誤:', error.message)
  console.error('\n請確保文件存在: ' + configPath)
  process.exit(1)
}
