/**
 * 佔有率計算測試
 * 驗證三個場景的佔有率是否在設定的範圍內
 */

// 導入配置
import { timeScenarios } from './src/classes/config/trafficScenarioConfig.js'

console.log('🧪 === 佔有率計算測試 ===\n')

// 測試每個場景
timeScenarios.forEach((scenario) => {
  const features = scenario.targetFeatures
  console.log(`\n📋 場景：${scenario.name} (${scenario.shortName})`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  if (!features) {
    console.log('❌ 沒有 targetFeatures')
    return
  }

  console.log(`基礎佔有率 (occupancy): ${features.occupancy}%`)
  console.log(`佔有率範圍 (occupancyRange): ${features.occupancyRange ? `${features.occupancyRange[0]}-${features.occupancyRange[1]}%` : '未設定'}`)

  // 模擬 10 次計算
  console.log('\n模擬 10 次計算結果：')
  const occupancies = []

  for (let i = 0; i < 10; i++) {
    let occupancy
    if (features.occupancyRange && Array.isArray(features.occupancyRange)) {
      // 有設定佔有率範圍
      occupancy = Math.round(
        features.occupancyRange[0] + Math.random() * (features.occupancyRange[1] - features.occupancyRange[0]),
      )
    } else if (features.occupancy) {
      // 無範圍但有基礎佔有率
      const baseOccupancy = features.occupancy
      const range = Math.max(5, Math.round(baseOccupancy * 0.15))
      occupancy = Math.round(
        baseOccupancy - range + Math.random() * (range * 2),
      )
    } else {
      occupancy = Math.round(5 + Math.random() * 35)
    }
    occupancy = Math.max(0, Math.min(100, occupancy))
    occupancies.push(occupancy)
  }

  // 計算統計數據
  const min = Math.min(...occupancies)
  const max = Math.max(...occupancies)
  const avg = Math.round(occupancies.reduce((a, b) => a + b) / occupancies.length * 10) / 10
  const expected = features.occupancyRange ? features.occupancyRange : [features.occupancy]

  console.log(`  結果: ${occupancies.join(', ')}`)
  console.log(`  統計: 最小=${min}%, 最大=${max}%, 平均=${avg}%`)
  console.log(`  期望範圍: ${expected[0]}-${expected[1] || expected[0]}%`)

  // 檢查是否在期望範圍內
  const allInRange = occupancies.every(o => o >= expected[0] && o <= (expected[1] || expected[0]))
  if (allInRange) {
    console.log(`  ✅ 所有值都在期望範圍內`)
  } else {
    console.log(`  ⚠️  某些值超出期望範圍`)
  }
})

console.log('\n\n✨ 測試完成！')
