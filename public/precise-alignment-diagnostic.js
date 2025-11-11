/**
 * 🎯 精準對齁診斷工具 v2
 * 用於精確測量每個方向的首車停止位置誤差
 */

window.preciseAlignmentDiagnostic = {
  // 記錄每個方向的首車最小距離
  minDistances: {
    east: Infinity,
    west: Infinity,
    north: Infinity,
    south: Infinity,
  },

  // 記錄每個方向的首車停止次數
  stopCounts: {
    east: 0,
    west: 0,
    north: 0,
    south: 0,
  },

  // 記錄所有停止的車的距離（用於平均值計算）
  allDistances: {
    east: [],
    west: [],
    north: [],
    south: [],
  },

  /**
   * 開始監控
   */
  start() {
    console.clear()
    console.log('🎯 精準對齁診斷工具已啟動')
    console.log('⏱️  將持續監控 30 秒...')
    console.log('')

    this.minDistances = { east: Infinity, west: Infinity, north: Infinity, south: Infinity }
    this.stopCounts = { east: 0, west: 0, north: 0, south: 0 }
    this.allDistances = { east: [], west: [], north: [], south: [] }

    this.monitorInterval = setInterval(() => {
      this._collectData()
    }, 100) // 100ms 採集一次

    // 30 秒後停止並輸出報告
    setTimeout(() => {
      this._stop()
    }, 30000)
  },

  /**
   * 採集一次數據
   */
  _collectData() {
    const vehicles = window.liveVehicles || []

    vehicles.forEach((v) => {
      const isStoppedOrStopping = (v.movementTimeline?.timeScale?.() || 0) < 0.1 // 速度接近 0

      if (isStoppedOrStopping && v.collisionController) {
        const distance = v.collisionController._calculateDistanceToStopLine()

        if (distance !== null && distance !== undefined && distance > -10) {
          // 只記錄距離停止線 -10px 以上的車（防止記錄已經通過的車）
          const dir = v.direction

          // 記錄最小距離
          if (distance < this.minDistances[dir]) {
            this.minDistances[dir] = distance
            this.stopCounts[dir]++
          }

          // 記錄所有距離
          this.allDistances[dir].push(distance)
        }
      }
    })
  },

  /**
   * 停止監控並輸出報告
   */
  _stop() {
    clearInterval(this.monitorInterval)
    this._printReport()
  },

  /**
   * 輸出診斷報告
   */
  _printReport() {
    console.clear()
    console.log('═══════════════════════════════════════════════════════')
    console.log('🎯 精準對齁診斷報告 (30秒監控結果)')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')

    const directions = ['east', 'west', 'north', 'south']
    const directionNames = { east: '🔴 東向', west: '🔵 西向', north: '🟡 北向', south: '🟢 南向' }

    let adjustments = {
      east: 0,
      west: 0,
      north: 0,
      south: 0,
    }

    directions.forEach((dir) => {
      const minDist = this.minDistances[dir]
      const allDists = this.allDistances[dir]
      const count = this.stopCounts[dir]

      let avgDist = 'N/A'
      if (allDists.length > 0) {
        avgDist = (allDists.reduce((a, b) => a + b, 0) / allDists.length).toFixed(2)
      }

      console.log(`${directionNames[dir]}`)
      console.log(`  ├─ 首車最小距離: ${minDist === Infinity ? 'N/A' : minDist.toFixed(2)}px`)
      console.log(`  ├─ 停止次數: ${count}`)
      console.log(`  ├─ 所有停止車平均距離: ${avgDist}px (樣本: ${allDists.length})`)

      // 計算建議調整值
      if (minDist !== Infinity && minDist > 0.5) {
        // 首車停在停止線前面，需要向後調整（正值）
        adjustments[dir] = -Math.round(minDist)
        console.log(
          `  └─ 💡 建議調整: ${directionNames[dir]} → ${adjustments[dir]}px (停在停止線前 ${minDist.toFixed(2)}px)`,
        )
      } else if (minDist !== Infinity && minDist < -0.5) {
        // 首車停在停止線後面，需要向前調整（負值）
        adjustments[dir] = Math.round(Math.abs(minDist))
        console.log(
          `  └─ 💡 建議調整: ${directionNames[dir]} → ${adjustments[dir]}px (停在停止線後 ${Math.abs(minDist).toFixed(2)}px)`,
        )
      } else {
        adjustments[dir] = 0
        console.log(`  └─ ✅ 無需調整 (已精準對齁)`)
      }

      console.log('')
    })

    console.log('═══════════════════════════════════════════════════════')
    console.log('📝 建議的配置更新:')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    console.log('將以下值複製到 CollisionController.js:')
    console.log('')
    console.log('STOP_LINE_OFFSET_BY_DIRECTION: {')
    directions.forEach((dir) => {
      console.log(`  ${dir}: ${adjustments[dir]},`)
    })
    console.log('},')
    console.log('')

    console.log('═══════════════════════════════════════════════════════')
    console.log('🔧 調整步驟:')
    console.log('═══════════════════════════════════════════════════════')
    console.log('1. 複製上面的 STOP_LINE_OFFSET_BY_DIRECTION 配置')
    console.log('2. 粘貼到 src/classes/vehicle_utils/CollisionController.js 第 16-23 行')
    console.log('3. 執行 npm run build 編譯')
    console.log('4. 刷新瀏覽器並重新測試')
    console.log('')
  },

  /**
   * 手動停止診斷
   */
  stop() {
    clearInterval(this.monitorInterval)
    this._stop()
  },
}

console.log('✅ 精準對齁診斷工具已載入')
console.log('執行: window.preciseAlignmentDiagnostic.start()')
console.log('或刷新頁面後自動啟動（如果頁面已載入完成）')

// 等待頁面完全載入後自動啟動
if (document.readyState === 'complete') {
  console.log('ℹ️  頁面已完全載入，自動啟動診斷...')
  setTimeout(() => {
    window.preciseAlignmentDiagnostic.start()
  }, 2000)
} else {
  window.addEventListener('load', () => {
    console.log('ℹ️  頁面已完全載入，自動啟動診斷...')
    setTimeout(() => {
      window.preciseAlignmentDiagnostic.start()
    }, 2000)
  })
}
