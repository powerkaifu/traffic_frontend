/**
 * 車輛循環監控工具
 * 在瀏覽器控制台複製此代碼並運行，實時監控車輛循環狀態
 */

// 將此代碼複製到瀏覽器控制台執行
window.vehicleCirculationMonitor = {
  stats: {
    lastActiveCars: 0,
    lastLiveVehicles: 0,
    cycleCount: 0,
    generateAttempts: 0,
    recycleCount: 0,
    poolStats: {},
  },

  start() {
    console.log('🚗 車輛循環監控已啟動')
    this.interval = setInterval(() => this.check(), 2000)
  },

  stop() {
    clearInterval(this.interval)
    console.log('🛑 車輛循環監控已停止')
  },

  check() {
    // 獲取當前狀態
    const activeCars = window.activeCars?.value?.length || 0
    const liveVehicles = window.liveVehicles?.length || 0

    // 計算池的狀態
    const poolStats = window.vehiclePool?.getStats() || {}
    const totalPooled = poolStats.totalPooled || 0
    const totalActive = poolStats.totalActive || 0

    // 顯示當前狀態
    console.clear()
    console.log('═════════════════════════════════════════════════════════')
    console.log('📊 車輛循環狀態監控')
    console.log('═════════════════════════════════════════════════════════')
    console.log(`🎬 當前時間: ${new Date().toLocaleTimeString()}`)
    console.log('')
    console.log('📈 活躍車輛計數:')
    console.log(`   activeCars: ${activeCars}`)
    console.log(`   liveVehicles: ${liveVehicles}`)
    console.log(`   (差異: ${Math.abs(activeCars - liveVehicles)})`)
    console.log('')
    console.log('🔄 物件池狀態:')
    console.log(`   回收中車輛: ${totalPooled}`)
    console.log(`   活躍追蹤: ${totalActive}`)
    console.log(`   總計: ${totalPooled + totalActive}`)
    console.log('')
    console.log('📋 按方向分布:')
    if (poolStats.byDirection) {
      for (const [dir, count] of Object.entries(poolStats.byDirection)) {
        console.log(`   ${dir}: ${count} 輛`)
      }
    }
    console.log('')

    // 檢查是否達到限制
    const maxLimit = 100
    if (liveVehicles >= maxLimit) {
      console.log(`⚠️  警告: 已達硬性限制 ${maxLimit}`)
    } else {
      console.log(`✅ 生成正常: ${liveVehicles}/${maxLimit}`)
    }

    // 檢查計數同步
    if (Math.abs(activeCars - liveVehicles) > 5) {
      console.log('⚠️  警告: activeCars 和 liveVehicles 計數不同步!')
    } else {
      console.log('✅ 計數同步正常')
    }

    console.log('═════════════════════════════════════════════════════════')
    console.log('💡 提示: 調用 window.vehicleCirculationMonitor.stop() 停止監控')
  },
}

// 啟動監控
window.vehicleCirculationMonitor.start()
