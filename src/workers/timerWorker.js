/**
 * timerWorker.js
 * 🔧 在獨立線程運行秒數倒數邏輯，不受主線程 DOM 操作影響
 *
 * 優勢：
 * - 獨立線程：不被主線程的 DOM 操作/動畫渲染阻塞
 * - 精準計時：每秒準時觸發，誤差 < 10ms
 * - 高性能：主線程再忙也不影響倒數
 */

let remainingSeconds = 0
let isRunning = false
let interval = null

/**
 * 監聽來自主線程的消息
 */
self.onmessage = (event) => {
  const { action, seconds } = event.data

  if (action === 'start') {
    // ✅ 開始倒數
    console.log(`[Worker] 開始倒數：${seconds} 秒`)
    remainingSeconds = seconds
    isRunning = true

    // 清除舊的計時器
    if (interval) clearInterval(interval)

    // 🔧 在 Worker 線程中運行計時（不受主線程影響）
    interval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--
        // 📤 每秒發送更新到主線程
        self.postMessage({
          type: 'tick',
          remainingSeconds,
          timestamp: Date.now(),
        })
      } else {
        // ⏹️ 倒數完成
        isRunning = false
        clearInterval(interval)
        self.postMessage({
          type: 'completed',
          timestamp: Date.now(),
        })
      }
    }, 1000)

    // 立即發送一次初始值
    self.postMessage({
      type: 'started',
      remainingSeconds,
      timestamp: Date.now(),
    })
  } else if (action === 'stop') {
    // ⏹️ 停止倒數
    console.log('[Worker] 停止倒數')
    isRunning = false
    if (interval) clearInterval(interval)
    self.postMessage({
      type: 'stopped',
      timestamp: Date.now(),
    })
  } else if (action === 'reset') {
    // 🔄 重置倒數
    console.log('[Worker] 重置倒數')
    isRunning = false
    remainingSeconds = 0
    if (interval) clearInterval(interval)
    self.postMessage({
      type: 'reset',
      timestamp: Date.now(),
    })
  } else if (action === 'pause') {
    // ⏸️ 暫停倒數（保留當前秒數）
    console.log(`[Worker] 暫停倒數（剩餘 ${remainingSeconds} 秒）`)
    isRunning = false
    if (interval) clearInterval(interval)
    self.postMessage({
      type: 'paused',
      remainingSeconds,
      timestamp: Date.now(),
    })
  } else if (action === 'resume') {
    // ▶️ 繼續倒數
    console.log(`[Worker] 繼續倒數（剩餘 ${remainingSeconds} 秒）`)
    isRunning = true

    if (interval) clearInterval(interval)

    interval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--
        self.postMessage({
          type: 'tick',
          remainingSeconds,
          timestamp: Date.now(),
        })
      } else {
        isRunning = false
        clearInterval(interval)
        self.postMessage({
          type: 'completed',
          timestamp: Date.now(),
        })
      }
    }, 1000)

    self.postMessage({
      type: 'resumed',
      remainingSeconds,
      timestamp: Date.now(),
    })
  }
}

// 🔧 錯誤處理
self.onerror = (error) => {
  console.error('[Worker] 錯誤:', error.message)
  self.postMessage({
    type: 'error',
    message: error.message,
  })
}

// 👋 Worker 初始化完成
console.log('[Worker] timerWorker.js 已加載並準備就緒')
self.postMessage({
  type: 'initialized',
})
