/**
 * API 測試腳本
 * 用於演示交通數據的傳送格式
 */

// 模擬 API 端點
const mockApiServer = {
  // 模擬接收交通數據的端點
  async receiveTrafficData(data) {
    console.log('🌐 API Server 收到數據:')
    console.log('=====================================')
    console.log('📅 時間戳:', data.timestamp)
    console.log('⏱️ 收集期間:', data.collection_period)
    console.log('🚗 交通流量數據:')

    Object.entries(data.traffic_flow).forEach(([direction, flowData]) => {
      console.log(`  ${direction.toUpperCase()} 方向:`)
      console.log(`    機車: ${flowData.motor_count} 輛 (平均速度: ${flowData.motor_speed} km/h)`)
      console.log(`    小型車: ${flowData.small_car_count} 輛 (平均速度: ${flowData.small_car_speed} km/h)`)
      console.log(`    大型車: ${flowData.large_car_count} 輛 (平均速度: ${flowData.large_car_speed} km/h)`)
      console.log(`    總數: ${flowData.total_count} 輛`)
      console.log(`    整體平均速度: ${flowData.average_speed} km/h`)
      console.log(`    佔用率: ${flowData.occupancy}%`)
      console.log('')
    })

    console.log('📋 元數據:')
    console.log(`  總處理車輛數: ${data.metadata.total_vehicles_processed}`)
    console.log(`  收集方法: ${data.metadata.collection_method}`)
    console.log(`  收集器版本: ${data.metadata.collector_version}`)
    console.log('=====================================')

    // 模擬 API 回應
    return {
      status: 'success',
      message: '交通數據已成功接收',
      received_at: new Date().toISOString(),
      data_id: `traffic_${Date.now()}`,
    }
  },
}

// 監聽數據收集器的 API 傳送事件
window.addEventListener('trafficDataSent', (event) => {
  console.log('✅ 數據傳送成功:', event.detail)
})

window.addEventListener('trafficDataSendFailed', (event) => {
  console.error('❌ 數據傳送失敗:', event.detail)
})

// 為了測試目的，覆蓋 fetch 函數來模擬 API 回應
const originalFetch = window.fetch
window.fetch = async function (url, options) {
  // 如果是交通數據 API 端點，使用模擬服務器
  if (url.includes('/api/traffic/data/')) {
    console.log('🔄 攔截 API 呼叫，使用模擬服務器...')

    const data = JSON.parse(options.body)
    const response = await mockApiServer.receiveTrafficData(data)

    // 模擬網路延遲
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      ok: true,
      status: 200,
      json: async () => response,
    }
  }

  // 其他 API 呼叫使用原始 fetch
  return originalFetch.apply(this, arguments)
}

console.log('🧪 API 測試環境已設置完成')
console.log('📝 數據收集器將會自動傳送數據到模擬 API 服務器')
console.log('💡 查看控制台輸出以查看傳送的數據格式')
