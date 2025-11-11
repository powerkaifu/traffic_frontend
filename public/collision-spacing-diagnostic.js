/**
 * 碰撞間距診斷工具
 * 用於檢查東西向和南北向車輛的實際間距差異
 *
 * 使用方法：在 F12 Console 執行
 * window.runSpacingDiagnostic()
 */

window.runSpacingDiagnostic = function () {
  console.log('🔍 開始碰撞間距診斷...\n')

  if (!window.trafficLightController) {
    console.error('❌ trafficLightController 未初始化')
    return
  }

  const tl = window.trafficLightController
  const lanes = tl.getLanes()

  // 統計各方向的間距
  const stats = {
    east: { spacings: [], avgSpacing: 0, minSpacing: Infinity, maxSpacing: 0 },
    west: { spacings: [], avgSpacing: 0, minSpacing: Infinity, maxSpacing: 0 },
    south: { spacings: [], avgSpacing: 0, minSpacing: Infinity, maxSpacing: 0 },
    north: { spacings: [], avgSpacing: 0, minSpacing: Infinity, maxSpacing: 0 },
  }

  // 遍歷所有車道並計算同方向車輛之間的間距
  Object.values(lanes).forEach((lane) => {
    const vehicles = lane.vehicles || []

    if (vehicles.length < 2) return

    // 排序車輛位置
    let sortedVehicles = [...vehicles]

    // 根據方向排序
    if (lane.direction === 'east') {
      sortedVehicles.sort((a, b) => {
        const posA = a.getCurrentPosition()
        const posB = b.getCurrentPosition()
        return (posA?.x || 0) - (posB?.x || 0)
      })
    } else if (lane.direction === 'west') {
      sortedVehicles.sort((a, b) => {
        const posA = a.getCurrentPosition()
        const posB = b.getCurrentPosition()
        return (posB?.x || 0) - (posA?.x || 0)
      })
    } else if (lane.direction === 'south') {
      sortedVehicles.sort((a, b) => {
        const posA = a.getCurrentPosition()
        const posB = b.getCurrentPosition()
        return (posA?.y || 0) - (posB?.y || 0)
      })
    } else if (lane.direction === 'north') {
      sortedVehicles.sort((a, b) => {
        const posA = a.getCurrentPosition()
        const posB = b.getCurrentPosition()
        return (posB?.y || 0) - (posA?.y || 0)
      })
    }

    // 計算相鄰車輛之間的間距
    for (let i = 0; i < sortedVehicles.length - 1; i++) {
      const v1 = sortedVehicles[i]
      const v2 = sortedVehicles[i + 1]

      const pos1 = v1.getCurrentPosition()
      const pos2 = v2.getCurrentPosition()

      if (!pos1 || !pos2) continue

      // 計算中心距離
      let centerDistance = 0
      if (lane.direction === 'east') {
        centerDistance = pos2.x - pos1.x
      } else if (lane.direction === 'west') {
        centerDistance = pos1.x - pos2.x
      } else if (lane.direction === 'south') {
        centerDistance = pos2.y - pos1.y
      } else if (lane.direction === 'north') {
        centerDistance = pos1.y - pos2.y
      }

      // 計算實際間距（考慮車寬）
      const config1 = v1.getVehicleConfig()
      const config2 = v2.getVehicleConfig()

      let v1Length = 0,
        v2Length = 0

      if (lane.direction === 'east' || lane.direction === 'west') {
        v1Length = config1.width
        v2Length = config2.width
      } else {
        v1Length = config1.height
        v2Length = config2.height
      }

      const actualSpacing = centerDistance - v1Length / 2 - v2Length / 2

      // 記錄統計
      const direction = lane.direction
      stats[direction].spacings.push({
        vehicle1: v1.id,
        vehicle2: v2.id,
        centerDistance: centerDistance.toFixed(2),
        v1Length: v1Length,
        v2Length: v2Length,
        actualSpacing: actualSpacing.toFixed(2),
      })

      stats[direction].minSpacing = Math.min(stats[direction].minSpacing, actualSpacing)
      stats[direction].maxSpacing = Math.max(stats[direction].maxSpacing, actualSpacing)
    }
  })

  // 計算平均值
  Object.keys(stats).forEach((dir) => {
    const data = stats[dir]
    if (data.spacings.length > 0) {
      data.avgSpacing = (
        data.spacings.reduce((sum, s) => sum + parseFloat(s.actualSpacing), 0) / data.spacings.length
      ).toFixed(2)
    }
  })

  // 打印結果
  console.log('📊 各方向的間距統計：\n')

  Object.keys(stats).forEach((dir) => {
    const data = stats[dir]
    console.log(`${dir.toUpperCase()} 方向：`)
    console.log(`  車對數: ${data.spacings.length}`)
    console.log(`  平均間距: ${data.avgSpacing}px`)
    console.log(`  最小間距: ${data.minSpacing === Infinity ? 'N/A' : data.minSpacing.toFixed(2) + 'px'}`)
    console.log(`  最大間距: ${data.maxSpacing === 0 ? 'N/A' : data.maxSpacing.toFixed(2) + 'px'}`)

    if (data.spacings.length > 0) {
      console.log(`  詳細: `)
      data.spacings.slice(0, 3).forEach((s) => {
        console.log(
          `    v${s.vehicle1} → v${s.vehicle2}: ${s.actualSpacing}px (center=${s.centerDistance}px, len1=${s.v1Length}, len2=${s.v2Length})`,
        )
      })
      if (data.spacings.length > 3) {
        console.log(`    ... 還有 ${data.spacings.length - 3} 對車`)
      }
    }
    console.log('')
  })

  // 對比結果
  console.log('🔍 關鍵發現：')
  const eastAvg = parseFloat(stats.east.avgSpacing) || 0
  const westAvg = parseFloat(stats.west.avgSpacing) || 0
  const southAvg = parseFloat(stats.south.avgSpacing) || 0
  const northAvg = parseFloat(stats.north.avgSpacing) || 0

  console.log(`東西向平均: ${((eastAvg + westAvg) / 2).toFixed(2)}px`)
  console.log(`南北向平均: ${((southAvg + northAvg) / 2).toFixed(2)}px`)

  const horizontalAvg = (eastAvg + westAvg) / 2
  const verticalAvg = (southAvg + northAvg) / 2

  if (Math.abs(horizontalAvg - verticalAvg) > 5) {
    console.warn(`⚠️  方向間距差異: ${Math.abs(horizontalAvg - verticalAvg).toFixed(2)}px`)
    if (verticalAvg > horizontalAvg) {
      console.warn(`   南北向間距明顯較大（${(verticalAvg - horizontalAvg).toFixed(2)}px）`)
      console.warn(`   原因：南北向車更短（height 15-20px vs width 25-35px）`)
    }
  } else {
    console.log('✅ 間距分佈相對均勻')
  }

  return stats
}

// 額外工具：顯示當前的碰撞配置
window.showCollisionConfig = function () {
  if (window.getCollisionConfig) {
    console.log('🔧 當前碰撞配置：')
    console.log(window.getCollisionConfig())
  } else {
    console.error('❌ getCollisionConfig 未可用')
  }
}

console.log('✅ 碰撞間距診斷工具已加載')
console.log('執行: window.runSpacingDiagnostic()')
console.log('     window.showCollisionConfig()')
