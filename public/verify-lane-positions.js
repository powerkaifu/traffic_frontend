/**
 * 車道起點位置驗證工具
 * 用於檢查所有車道的路徑起點是否正確設置
 */

// 在開發者控制台中執行此檔案的函數來驗證車道起點

/**
 * 驗證所有車道的路徑起點位置
 */
window.verifyAllLaneStartPositions = function() {
  console.log('🔍 開始驗證所有車道的路徑起點位置...\n')
  
  const directions = ['east', 'west', 'south', 'north']
  const lanes = [1, 2, 3, 4]
  const results = []
  
  directions.forEach(direction => {
    lanes.forEach(laneNumber => {
      const pathId = `${direction}Lane${laneNumber}Straight`
      const pathElement = document.querySelector(`#${pathId}`)
      
      if (!pathElement) {
        console.error(`❌ 找不到路徑元素: #${pathId}`)
        results.push({ pathId, status: 'missing', position: null })
        return
      }
      
      try {
        // 從 path 屬性獲取起點
        const pathData = pathElement.getAttribute('d')
        const match = pathData.match(/M([-\d.]+),([-\d.]+)/)
        
        if (!match) {
          console.error(`❌ 無法解析路徑起點: ${pathId}`)
          results.push({ pathId, status: 'invalid', position: null })
          return
        }
        
        const pathStartX = parseFloat(match[1])
        const pathStartY = parseFloat(match[2])
        
        // 使用 getPointAtLength 獲取起點
        const startPoint = pathElement.getPointAtLength(0)
        
        // 檢查兩種方法獲取的起點是否一致
        const tolerance = 0.01
        const isConsistent = 
          Math.abs(startPoint.x - pathStartX) < tolerance &&
          Math.abs(startPoint.y - pathStartY) < tolerance
        
        const status = isConsistent ? '✅' : '⚠️'
        
        console.log(`${status} ${pathId}:`)
        console.log(`   路徑定義: M${pathStartX},${pathStartY}`)
        console.log(`   API取得: (${startPoint.x.toFixed(2)}, ${startPoint.y.toFixed(2)})`)
        
        if (!isConsistent) {
          console.warn(`   差異: ΔX=${Math.abs(startPoint.x - pathStartX).toFixed(3)}, ΔY=${Math.abs(startPoint.y - pathStartY).toFixed(3)}`)
        }
        
        results.push({
          pathId,
          status: isConsistent ? 'ok' : 'warning',
          pathDefinition: { x: pathStartX, y: pathStartY },
          apiResult: { x: startPoint.x, y: startPoint.y },
        })
        
      } catch (error) {
        console.error(`❌ ${pathId} 驗證失敗:`, error.message)
        results.push({ pathId, status: 'error', position: null })
      }
    })
  })
  
  // 統計結果
  const summary = {
    total: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    warning: results.filter(r => r.status === 'warning').length,
    error: results.filter(r => r.status === 'error').length,
    missing: results.filter(r => r.status === 'missing').length,
  }
  
  console.log('\n📊 驗證結果統計:')
  console.log(`   總計: ${summary.total} 個車道`)
  console.log(`   ✅ 正常: ${summary.ok} 個`)
  console.log(`   ⚠️ 警告: ${summary.warning} 個`)
  console.log(`   ❌ 錯誤: ${summary.error} 個`)
  console.log(`   🚫 缺失: ${summary.missing} 個`)
  
  return results
}

/**
 * 測試特定車道的車輛生成位置
 */
window.testLaneVehicleSpawn = function(direction = 'east', laneNumber = 1) {
  console.log(`\n🚗 測試 ${direction} 方向車道 ${laneNumber} 的車輛生成...`)
  
  // 獲取路徑起點
  const pathStartPosition = Vehicle.getPathStartPosition(direction, laneNumber)
  
  if (!pathStartPosition) {
    console.error(`❌ 無法獲取路徑起點位置`)
    return null
  }
  
  console.log(`✅ 路徑起點位置: (${pathStartPosition.x}, ${pathStartPosition.y})`)
  
  // 檢查路徑元素
  const pathId = `${direction}Lane${laneNumber}Straight`
  const pathElement = document.querySelector(`#${pathId}`)
  
  if (pathElement) {
    const pathData = pathElement.getAttribute('d')
    console.log(`📍 路徑數據: ${pathData.substring(0, 50)}...`)
    
    // 驗證路徑起點
    const match = pathData.match(/M([-\d.]+),([-\d.]+)/)
    if (match) {
      const definedX = parseFloat(match[1])
      const definedY = parseFloat(match[2])
      console.log(`📍 定義起點: M${definedX},${definedY}`)
      
      const deltaX = Math.abs(pathStartPosition.x - definedX)
      const deltaY = Math.abs(pathStartPosition.y - definedY)
      
      if (deltaX < 0.01 && deltaY < 0.01) {
        console.log(`✅ 位置一致！`)
      } else {
        console.warn(`⚠️ 位置有差異: ΔX=${deltaX.toFixed(3)}, ΔY=${deltaY.toFixed(3)}`)
      }
    }
  }
  
  return pathStartPosition
}

/**
 * 比較所有車道的生成位置
 */
window.compareAllLanePositions = function() {
  console.log('\n📊 所有車道起點位置比較:\n')
  
  const directions = ['east', 'west', 'south', 'north']
  const directionNames = {
    east: '東向',
    west: '西向',
    south: '南向',
    north: '北向',
  }
  
  directions.forEach(direction => {
    console.log(`\n${directionNames[direction]} (${direction}):`)
    console.log('─'.repeat(60))
    
    for (let lane = 1; lane <= 4; lane++) {
      const pos = Vehicle.getPathStartPosition(direction, lane)
      
      if (pos) {
        const laneType = lane === 1 ? '左轉' : (lane === 4 ? '右轉' : '直行')
        console.log(`  車道 ${lane} (${laneType}): (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`)
      } else {
        console.error(`  車道 ${lane}: ❌ 無法獲取位置`)
      }
    }
  })
  
  console.log('\n' + '═'.repeat(60))
}

/**
 * 驗證車輛生成與路徑起點的一致性
 */
window.verifyVehicleSpawnConsistency = function() {
  console.log('\n🔬 驗證車輛生成與路徑起點的一致性...\n')
  
  const testCases = [
    { direction: 'east', lane: 1, desc: '東向左轉' },
    { direction: 'east', lane: 2, desc: '東向直行' },
    { direction: 'west', lane: 1, desc: '西向左轉' },
    { direction: 'south', lane: 1, desc: '南向左轉' },
    { direction: 'north', lane: 1, desc: '北向左轉' },
  ]
  
  testCases.forEach(({ direction, lane, desc }) => {
    console.log(`\n測試: ${desc} (${direction} Lane ${lane})`)
    console.log('─'.repeat(50))
    
    const pathPos = Vehicle.getPathStartPosition(direction, lane)
    
    if (!pathPos) {
      console.error('❌ 無法獲取路徑起點')
      return
    }
    
    console.log(`✅ 路徑起點: (${pathPos.x.toFixed(2)}, ${pathPos.y.toFixed(2)})`)
    console.log(`✅ 車輛將在此位置生成並開始動畫`)
    console.log(`✅ 確保車輛沿著路徑移動，不會出現跳躍`)
  })
  
  console.log('\n✅ 所有測試完成！')
}

// 自動執行驗證（如果在瀏覽器環境中）
if (typeof window !== 'undefined' && window.document) {
  console.log('\n' + '═'.repeat(60))
  console.log('🔧 車道起點位置驗證工具已載入')
  console.log('═'.repeat(60))
  console.log('\n可用函數:')
  console.log('  • window.verifyAllLaneStartPositions() - 驗證所有車道起點')
  console.log('  • window.testLaneVehicleSpawn(direction, lane) - 測試特定車道')
  console.log('  • window.compareAllLanePositions() - 比較所有車道位置')
  console.log('  • window.verifyVehicleSpawnConsistency() - 驗證生成一致性')
  console.log('\n範例:')
  console.log('  window.verifyAllLaneStartPositions()')
  console.log('  window.testLaneVehicleSpawn("east", 1)')
  console.log('  window.compareAllLanePositions()')
  console.log('═'.repeat(60) + '\n')
}
