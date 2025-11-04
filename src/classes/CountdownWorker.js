/**
 * 倒數計時 Web Worker
 *
 * 使用獨立 Worker 線程執行倒數計時，完全獨立於主線程
 * 即使主線程被車輛碰撞檢測阻塞，倒數也能精確進行
 *
 * 通信格式：
 * - 發送：{ command: 'startCountdown', duration: 5000, precision: 100 }
 * - 接收：{ type: 'tick', remaining: 4, elapsed: 1000 }
 *        { type: 'complete' }
 */

let countdownInterval = null
let startTime = null
let duration = null
let lastReportedSecond = null

/**
 * 處理主線程消息
 */
self.onmessage = (event) => {
  const { command, duration: messageDuration, precision = 100 } = event.data

  if (command === 'startCountdown') {
    // 停止之前的倒數
    if (countdownInterval) {
      clearInterval(countdownInterval)
    }

    // 初始化
    duration = messageDuration
    startTime = Date.now()
    lastReportedSecond = Math.floor(duration / 1000)

    // 發送初始秒數
    self.postMessage({
      type: 'tick',
      remaining: lastReportedSecond,
      elapsed: 0,
    })

    // 開始倒數迴圈
    countdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000))

      // 只在秒數改變時發送消息
      if (remaining !== lastReportedSecond) {
        lastReportedSecond = remaining
        self.postMessage({
          type: 'tick',
          remaining,
          elapsed,
        })
      }

      // 倒數完成
      if (elapsed >= duration) {
        clearInterval(countdownInterval)
        countdownInterval = null
        self.postMessage({
          type: 'complete',
          totalElapsed: elapsed,
        })
      }
    }, precision)
  } else if (command === 'stopCountdown') {
    // 停止倒數
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    self.postMessage({
      type: 'stopped',
    })
  }
}
