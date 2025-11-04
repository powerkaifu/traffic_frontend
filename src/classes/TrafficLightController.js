/**
 * TrafficLightController.js - 交通燈控制系統
 */
import TrafficLight from './TrafficLight.js'
import { speedConfig } from './config/trafficConfig.js' // 引入統一的速度設定
import { getCurrentTimePeriod } from './config/vdNormalizationConfig.js'
import { VOLUME_LIMITS_CONFIG } from './config/vehicleConfig.js'
import { getTimeConfigForScenario } from './config/vdPatternConfig.js' // 新增：情景時間配置
import { STOP_LINE_VEHICLE_LIMITS } from './config/trafficScenarioConfig.js' // 🚦 引入停止線車輛限制配置
import {
  getVDMappingForTimeSlot,
  getRandomHourForTimeSlot,
  getRandomVehicleCountForTimeSlot,
} from './config/vdMapping.js' // 版本 2.5：VD 時段特徵映射
import {
  validateAndRectifyDataArray,
  // generateValidationSummary,
  // generateValidationReport,
} from './utils/DataQualityValidator.js' // 【版本 2.5 新增】數據品質驗證與修正系統

// 🎯 【優化】全局日誌系統 - 區分開發和生產環境
const isDev = process.env.DEV || process.env.NODE_ENV !== 'production'

const LOG_LEVELS = {
  ERROR: 0, // 總是輸出
  WARN: 1, // 總是輸出
  INFO: 2, // DEV 模式輸出
  DEBUG: 3, // DEV 模式輸出
}

const MIN_LOG_LEVEL = isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR

/**
 * 創建日誌函數 - 根據環境自動過濾
 * @param {number} level - 日誌級別
 * @returns {Function} 日誌函數
 */
const createLogger = (level) => {
  return (...args) => {
    if (level <= MIN_LOG_LEVEL) {
      if (level === LOG_LEVELS.ERROR) {
        console.error(...args)
      } else if (level === LOG_LEVELS.WARN) {
        console.warn(...args)
      } else {
        console.log(...args)
      }
    }
  }
}

// 日誌實例
const logError = createLogger(LOG_LEVELS.ERROR)
const logWarn = createLogger(LOG_LEVELS.WARN)
const logInfo = createLogger(LOG_LEVELS.INFO)
// const logDebug = createLogger(LOG_LEVELS.DEBUG)

// 🎯 【API 重試機制】指數退避配置
const API_RETRY_CONFIG = {
  MAX_RETRIES: 3, // 最多重試 3 次
  BASE_DELAY: 1000, // 基礎延遲 1000ms
  TIMEOUT: 5000, // 單次請求超時 5000ms
}

/**
 * 帶重試機制的 fetch 函數 - 指數退避
 * @param {string} url - API 端點
 * @param {object} options - fetch 選項
 * @returns {Promise} 響應物件
 */
const fetchWithRetry = async (url, options = {}) => {
  let lastError = null

  for (let attempt = 1; attempt <= API_RETRY_CONFIG.MAX_RETRIES; attempt++) {
    let timeoutId = null
    try {
      // 為每次請求添加超時控制
      const controller = new AbortController()
      timeoutId = setTimeout(() => controller.abort(), API_RETRY_CONFIG.TIMEOUT)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId)
      lastError = error

      // 如果是最後一次嘗試，直接拋出錯誤
      if (attempt === API_RETRY_CONFIG.MAX_RETRIES) {
        logError(`❌ [API 重試] 第 ${attempt} 次嘗試失敗，已達最大重試次數`)
        throw lastError
      }

      // 計算延遲時間：1000ms * 2^(attempt-1) = 1s, 2s, 4s
      const delayMs = API_RETRY_CONFIG.BASE_DELAY * Math.pow(2, attempt - 1)

      logWarn(`⚠️ [API 重試] 第 ${attempt} 次嘗試失敗: ${error.message}，${delayMs}ms 後重試...`)

      // 等待指定時間後重試
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}

export default class TrafficLightController {
  constructor() {
    // Strategy Pattern: 不同方向的燈號管理策略
    this.lights = {
      east: null, // 往東 (RoadA)
      west: null, // 往西 (RoadB)
      south: null, // 往南 (RoadC)
      north: null, // 往北 (RoadD)
    }

    this.isRunning = false
    // State Pattern: 當前時相狀態管理
    this.currentPhase = 'northSouth' // eastWest 或 northSouth - 一開始以南北向為主
    this.onTimerUpdate = null // 倒數更新回調函數

    // 🎯 【Web Worker 倒數計時】獨立線程，不受主線程阻塞影響
    this.countdownWorker = null
    this.initCountdownWorker()

    // Observer Pattern: 觀察者模式相關
    this.observers = [] // 觀察者列表
    // State Pattern: 管理所有方向的燈號狀態
    this.currentLightStates = {
      east: 'red',
      west: 'red',
      north: 'red',
      south: 'red',
    }

    // 🎯【新增】時段轉換追蹤 (用於偵測時段邊界)
    this.lastTimePeriod = getCurrentTimePeriod()
    this.timePeriodChangeCount = 0

    // 🎯【新增】API 呼叫防重複標記 - 確保每個綠燈周期只呼叫一次
    this.apiAlreadySentInCycle = false

    // 🎯【新增】左轉綠燈時間配置
    this.leftTurnTiming = {
      duration: 8, // 左轉綠燈持續時間（秒）
      enabled: true, // 是否啟用左轉燈號
    }

    // 🎯【新增】完整的時相時間配置
    this.phaseTimings = {
      // 直行綠燈時間（由 AI 動態決定，預設值）
      straightGreen: {
        northSouth: 12, // 南北向直行綠燈時間（秒）
        eastWest: 12, // 東西向直行綠燈時間（秒）
      },
      // 左轉綠燈時間
      leftTurnGreen: {
        duration: 10, // 左轉綠燈持續時間（秒）- 從8秒增加到12秒
      },
      // 黃燈時間
      yellow: {
        straight: 2, // 直行黃燈時間（秒）
        leftTurn: 2, // 左轉黃燈時間（秒）
      },
      // 全紅時間
      allRed: {
        duration: 3, // 全紅階段時間（秒）
      },
      // API 相關時間
      api: {
        callInterval: 10, // API 調用間隔（秒）- 在綠燈倒數到 1 秒時調用一次
      },
    }

    // API 相關設定
    this.apiEndpoint = 'http://localhost:8000/api/traffic/predict/'
    this.onPredictionUpdate = null // AI 預測更新回調函數
    this.dataScalingFactor = 1.5 // 調整縮放因子，增加車流量數據以獲得約60秒的綠燈時間

    // Strategy Pattern: 動態綠燈時間策略（AI 預測結果）
    this.dynamicTiming = {
      eastWest: this.phaseTimings.straightGreen.eastWest, // 東西向綠燈時間（秒）
      northSouth: this.phaseTimings.straightGreen.northSouth, // 南北向綠燈時間（秒）- 一開始以南北向為主
    }

    // Strategy Pattern: 下一輪的時間預測策略（提前獲取）
    this.nextTiming = {
      eastWest: this.phaseTimings.straightGreen.eastWest,
      northSouth: this.phaseTimings.straightGreen.northSouth,
    }

    // 車輛數據收集
    this.vehicleData = {
      east: { motor: 0, small: 0, large: 0 },
      west: { motor: 0, small: 0, large: 0 },
      south: { motor: 0, small: 0, large: 0 },
      north: { motor: 0, small: 0, large: 0 },
    }

    // ==========================================
    // 🛣️ 車道位置管理 (Lane Management)
    // ==========================================

    // 車道位置將在初始化時根據路口容器動態計算
    this.lanePositions = {
      east: [],
      west: [],
      north: [],
      south: [],
    }

    // 車輛終點位置也將動態計算
    this.endPositions = {
      east: 1200,
      west: -200,
      north: -200,
      south: 800,
    }

    // 全域車輛陣列（動畫/資料同步）
    if (!window.liveVehicles) {
      window.liveVehicles = []
    }

    // 註冊 vehicleRemoved 事件監聽
    window.addEventListener('vehicleRemoved', (e) => {
      this.handleVehicleRemoved(e.detail)
    })
  }

  // ==========================================
  // 🔍 Observer Pattern (觀察者模式) 方法群組
  // ==========================================

  // Observer Pattern: 添加觀察者
  addObserver(callback) {
    this.observers.push(callback)
  }

  // Observer Pattern: 移除觀察者
  removeObserver(callback) {
    this.observers = this.observers.filter((obs) => obs !== callback)
  }

  // Observer Pattern: 通知所有觀察者
  notifyObservers(direction, state) {
    this.observers.forEach((callback) => {
      callback(direction, state)
    })
  }

  // ==========================================
  // 🎯 Web Worker 倒數計時系統
  // ==========================================

  /**
   * 初始化 Web Worker 用於獨立倒數計時
   * 完全獨立於主線程，即使主線程被車輛碰撞檢測阻塞也能精確計時
   */
  initCountdownWorker() {
    try {
      // 檢查是否在瀏覽器環境且支持 Worker
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        try {
          // 在 Vite 環境中使用動態 import
          // 注意：Worker 文件需要放在 src/classes/ 目錄中
          const workerCode = `
            let countdownInterval = null
            let startTime = null
            let duration = null
            let lastReportedSecond = null

            self.onmessage = (event) => {
              const { command, duration: messageDuration, precision = 50 } = event.data

              if (command === 'startCountdown') {
                if (countdownInterval) {
                  clearInterval(countdownInterval)
                }

                duration = messageDuration
                startTime = Date.now()
                lastReportedSecond = Math.floor(duration / 1000)

                self.postMessage({
                  type: 'tick',
                  remaining: lastReportedSecond,
                  elapsed: 0,
                })

                countdownInterval = setInterval(() => {
                  const elapsed = Date.now() - startTime
                  const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000))

                  // ✅ 改進：確保秒數改變時一定發送，提高精度
                  if (remaining !== lastReportedSecond) {
                    lastReportedSecond = remaining
                    self.postMessage({
                      type: 'tick',
                      remaining,
                      elapsed,
                    })
                  }

                  // ✅ 精確檢查完成條件：允許 ±50ms 的偏差
                  if (elapsed >= duration - 50) {
                    clearInterval(countdownInterval)
                    countdownInterval = null
                    
                    // ✅ 確保最後發送完成時的秒數為 0
                    if (remaining !== 0) {
                      self.postMessage({
                        type: 'tick',
                        remaining: 0,
                        elapsed: duration,
                      })
                    }
                    
                    self.postMessage({
                      type: 'complete',
                      totalElapsed: elapsed,
                    })
                  }
                }, precision)
              } else if (command === 'stopCountdown') {
                if (countdownInterval) {
                  clearInterval(countdownInterval)
                  countdownInterval = null
                }
                self.postMessage({
                  type: 'stopped',
                })
              }
            }
          `

          // 使用 Blob + URL.createObjectURL 創建 Worker（更可靠）
          const blob = new Blob([workerCode], { type: 'application/javascript' })
          const workerUrl = URL.createObjectURL(blob)
          this.countdownWorker = new Worker(workerUrl)

          // 監聽 Worker 消息
          if (this.countdownWorker) {
            this.countdownWorker.onmessage = (event) => {
              const { type, remaining } = event.data

              if (type === 'tick') {
                // 更新 UI 倒數顯示
                if (this.onTimerUpdate) {
                  this.onTimerUpdate(null, remaining)
                }
              } else if (type === 'complete') {
                logInfo('✅ Countdown Worker 倒數完成')
              }
            }

            this.countdownWorker.onerror = (error) => {
              logError('❌ Countdown Worker 錯誤:', error)
              this.countdownWorker = null
            }

            logInfo('✅ Countdown Web Worker 已初始化（Blob 方式）')
          }
        } catch (error) {
          logWarn('⚠️ 無法初始化 Countdown Worker:', error)
          this.countdownWorker = null
        }
      }
    } catch (error) {
      logWarn('⚠️ 無法初始化 Countdown Worker（可能在 Node.js 環境或不支援 Worker）:', error)
      this.countdownWorker = null
    }
  }

  // ==========================================
  // 🛣️ 車道管理系統 (Lane Management System)
  // ==========================================

  // 新增：根據容器中心點更新車道位置
  updateLanePositions(containerElement) {
    if (!containerElement) {
      return
    }

    const containerWidth = containerElement.offsetWidth
    const containerHeight = containerElement.offsetHeight
    const centerX = containerWidth / 2
    const centerY = containerHeight / 2
    // 根據觀察到的固定值，定義各車道相對於中心點的偏移量
    // 這些值是根據您舊的固定座標推算出來的，可能需要微調以完全符合您的視覺設計
    const southLaneXOffsets = [-23, -51, -78, -107] // 往南車道 X 軸偏移
    const northLaneXOffsets = [5, 34, 62, 91] // 往北車道 X 軸偏移
    const eastLaneYOffsets = [92, 63, 35, 6] // 往東車道 Y 軸偏移
    const westLaneYOffsets = [-23, -52, -79, -109] // 往西車道 Y 軸偏移
    // 定義車輛的起始位置（在畫面外部）
    const startXEast = -150 // 畫面左側外部
    const startXWest = containerWidth + 150 // 畫面右側外部
    const startYSouth = -150 // 畫面上方外部
    const startYNorth = containerHeight + 150 // 畫面下方外部

    // 計算並更新每個車道的絕對位置
    this.lanePositions.south = southLaneXOffsets.map((offsetX) => ({ x: centerX + offsetX, y: startYSouth }))
    this.lanePositions.north = northLaneXOffsets.map((offsetX) => ({ x: centerX + offsetX, y: startYNorth }))
    this.lanePositions.east = eastLaneYOffsets.map((offsetY) => ({ x: startXEast, y: centerY + offsetY }))
    this.lanePositions.west = westLaneYOffsets.map((offsetY) => ({ x: startXWest, y: centerY + offsetY }))

    // 同樣地，更新終點位置，使其也具有響應性
    this.endPositions = {
      east: containerWidth + 200,
      west: -200,
      north: -200,
      south: containerHeight + 200,
    }
  }

  // 獲取指定方向的所有車道位置
  getLanePositions(direction) {
    return this.lanePositions[direction]
  }

  // 獲取指定方向的隨機車道位置
  getRandomLanePosition(direction) {
    const lanes = this.getLanePositions(direction)
    if (lanes.length === 0) return null

    const randomIndex = Math.floor(Math.random() * lanes.length)

    // 🔧 統一車道編號：所有方向都使用一致的編號規則（索引0=車道1）
    const laneNumber = randomIndex + 1

    return {
      position: lanes[randomIndex],
      laneNumber: laneNumber, // 統一的車道編號
    }
  }

  // 獲取指定方向的終點位置
  getEndPosition(direction) {
    const endValue = this.endPositions[direction] || 0

    // 根據方向返回對應的座標對象
    switch (direction) {
      case 'east':
        return { x: endValue, y: this.lanePositions.east[0].y } // 使用第一車道的Y座標
      case 'west':
        return { x: endValue, y: this.lanePositions.west[0].y }
      case 'north':
        return { x: this.lanePositions.north[0].x, y: endValue } // 使用第一車道的X座標
      case 'south':
        return { x: this.lanePositions.south[0].x, y: endValue }
      default:
        return { x: 0, y: 0 }
    }
  }

  // 獲取車道統計信息
  getLaneStatistics() {
    const stats = {}
    Object.keys(this.lanePositions).forEach((direction) => {
      stats[direction] = {
        totalLanes: this.lanePositions[direction].length,
        startPositions: this.lanePositions[direction],
        endPosition: this.endPositions[direction],
      }
    })
    return stats
  }

  // ==========================================
  //  Factory Pattern (工廠模式) 方法群組
  // ==========================================

  // Factory Pattern: 初始化所有紅綠燈（包含左轉燈號）
  init(eastElement, westElement, southElement, northElement) {
    // Factory Pattern: 創建 TrafficLight 實例
    this.lights.east = new TrafficLight(eastElement)
    this.lights.west = new TrafficLight(westElement)
    this.lights.south = new TrafficLight(southElement)
    this.lights.north = new TrafficLight(northElement)

    // State Pattern: 設置初始狀態：全部紅燈，等待開始
    this.updateLightState('south', 'red')
    this.updateLightState('north', 'red')
    this.updateLightState('east', 'red')
    this.updateLightState('west', 'red')

    this.currentPhase = 'northSouth' // 一開始以南北向為主

    // 除錯：檢查初始狀態
    this.debugLightStates()

    // 監聽車輛事件以更新 vehicleData
    this.vehicleAddedHandler = (event) => {
      const { direction, type } = event.detail
      this.incrementVehicleData(direction, type)
    }
    this.vehicleRemovedHandler = (event) => {
      const { direction, type } = event.detail
      this.decrementVehicleData(direction, type)
    }

    window.addEventListener('vehicleAdded', this.vehicleAddedHandler)
    window.addEventListener('vehicleRemoved', this.vehicleRemovedHandler)
  }

  // ==========================================
  // 🔄 State Pattern (狀態模式) 方法群組
  // ==========================================

  // State Pattern: 獲取當前燈號狀態
  getCurrentLightState(direction) {
    return this.currentLightStates[direction]
  }

  // 🎯【新增】獲取左轉燈狀態
  // 除錯方法：檢查所有燈號狀態
  debugLightStates() {
    // 檢查是否有不一致的狀態
    const inconsistencies = []
    for (const direction of ['north', 'south', 'east', 'west']) {
      const controllerState = this.currentLightStates[direction]
      const domState = this.lights[direction]?.currentState
      if (controllerState !== domState) {
        inconsistencies.push(`${direction}: Controller(${controllerState}) != DOM(${domState})`)
      }
    }
  }

  // State Pattern: 更新燈號狀態並通知觀察者
  updateLightState(direction, state) {
    this.currentLightStates[direction] = state
    if (this.lights[direction]) {
      this.lights[direction].setState(state)
    }
    this.notifyObservers(direction, state) // Observer Pattern

    // 🎯 【新增】發送燈號變化事件，讓等待的車輛立即響應
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lightStateChanged', {
          detail: { direction, state },
        }),
      )
    }
  }

  // 🎯【新增】左轉燈號狀態更新方法
  // State Pattern: 獲取當前時相
  getCurrentPhase() {
    return this.currentPhase
  }

  // ==========================================
  // 📋 Template Method Pattern (模板方法模式) 方法群組
  // ==========================================

  // Template Method Pattern: 運行一個完整的燈號循環（包含左轉階段）
  async runCycle() {
    logInfo('🔄 開始交通燈循環（直行優先的左轉燈號流程）...')
    this.debugLightStates()

    while (this.isRunning) {
      try {
        // State Pattern: 根據當前時相選擇處理策略
        if (this.currentPhase === 'northSouth') {
          // 🎯【階段1】南北向直行綠燈（先直行）
          this.updateLightState('east', 'red') // 東西向保持紅燈
          this.updateLightState('west', 'red')
          window.dispatchEvent(new CustomEvent('greenLightStarted'))
          this.updateLightState('south', 'green') // 南向直行綠燈(greenLight.png)
          this.updateLightState('north', 'green') // 北向直行綠燈(greenLight.png)

          this.updateTimer('南北向\n直行綠燈', this.dynamicTiming.northSouth)

          // 完整倒數南北向綠燈，在剩餘10秒時發送API
          await this.countdownDelayWithAPI(this.dynamicTiming.northSouth * 1000, this.phaseTimings.api.callInterval)

          // 南北向綠燈結束
          window.dispatchEvent(new CustomEvent('greenLightEnded'))

          // 🎯【階段2】南北向直行黃燈 - 立即更新燈色
          logInfo('🟡 [燈號轉換] 南北向 綠燈 → 黃燈（立即更新，無延遲）')
          this.updateLightState('south', 'yellow')
          this.updateLightState('north', 'yellow')
          this.updateTimer('南北向\n直行黃燈', this.phaseTimings.yellow.straight)
          await this.countdownDelay(this.phaseTimings.yellow.straight * 1000)

          // 🎯【階段3】全紅階段 - 安全緩衝 - 立即更新燈色
          logInfo('🔴 [燈號轉換] 南北向 黃燈 → 全紅（立即更新，無延遲）')
          this.updateLightState('south', 'red')
          this.updateLightState('north', 'red')
          this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
          await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

          // 🎯【階段4】南北向左轉綠燈（後左轉）- 立即更新燈色
          logInfo('🟢 [燈號轉換] 南北向 全紅 → 左轉綠燈（立即更新，無延遲）')
          this.updateLightState('south', 'leftGreen') // 南向左轉綠燈(redLeftLight.png)
          this.updateLightState('north', 'leftGreen') // 北向左轉綠燈(redLeftLight.png)

          this.updateTimer('南北向\n左轉綠燈', this.phaseTimings.leftTurnGreen.duration)
          await this.countdownDelay(this.phaseTimings.leftTurnGreen.duration * 1000)

          // 🎯【階段5】左轉黃燈 - 立即更新燈色
          logInfo('🟡 [燈號轉換] 南北向 左轉綠燈 → 左轉黃燈（立即更新，無延遲）')
          this.updateLightState('south', 'leftYellow') // 南向左轉黃燈(yellowLight.png)
          this.updateLightState('north', 'leftYellow') // 北向左轉黃燈(yellowLight.png)

          this.updateTimer('南北向\n左轉黃燈', this.phaseTimings.yellow.leftTurn)
          await this.countdownDelay(this.phaseTimings.yellow.leftTurn * 1000)

          // 🎯【階段6】左轉紅燈 - 立即更新燈色
          logInfo('🔴 [燈號轉換] 南北向 左轉黃燈 → 全紅（立即更新，無延遲）')
          this.updateLightState('south', 'red') // 南向左轉紅燈(redLight.png)
          this.updateLightState('north', 'red') // 北向左轉紅燈(redLight.png)

          // 🎯【階段7】全紅階段 - 切換前緩衝
          this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
          await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

          // 🔧 修正：在南北向時相結束前，重置數據以準備東西向時相
          logInfo('🔄 [相位切換] 南北向時相結束，重置數據以準備東西向')
          this.resetTrafficDataForNextCycle()

          // 切換至東西向
          this.currentPhase = 'eastWest'
          this.dynamicTiming.eastWest = this.nextTiming.eastWest
          logInfo('🔄 [TrafficController] 相位切換至 eastWest')
          this.debugLightStates()
        } else {
          // 🎯【階段1】東西向直行綠燈（先直行）
          this.updateLightState('south', 'red') // 南北向保持紅燈
          this.updateLightState('north', 'red')
          window.dispatchEvent(new CustomEvent('greenLightStarted'))
          this.updateLightState('east', 'green') // 東向直行綠燈(greenLight.png)
          this.updateLightState('west', 'green') // 西向直行綠燈(greenLight.png)

          this.updateTimer('東西向\n直行綠燈', this.dynamicTiming.eastWest)

          // 東西向綠燈倒數
          await this.countdownDelay(this.dynamicTiming.eastWest * 1000)

          // 東西向綠燈結束
          window.dispatchEvent(new CustomEvent('greenLightEnded'))

          // 🎯【階段2】東西向直行黃燈 - 立即更新燈色
          logInfo('🟡 [燈號轉換] 東西向 綠燈 → 黃燈（立即更新，無延遲）')
          this.updateLightState('east', 'yellow')
          this.updateLightState('west', 'yellow')
          this.updateTimer('東西向\n直行黃燈', this.phaseTimings.yellow.straight)
          await this.countdownDelay(this.phaseTimings.yellow.straight * 1000)

          // 🎯【階段3】全紅階段 - 安全緩衝 - 立即更新燈色
          logInfo('🔴 [燈號轉換] 東西向 黃燈 → 全紅（立即更新，無延遲）')
          this.updateLightState('east', 'red')
          this.updateLightState('west', 'red')
          this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
          await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

          // 🎯【階段4】東西向左轉綠燈（後左轉）- 立即更新燈色
          logInfo('🟢 [燈號轉換] 東西向 全紅 → 左轉綠燈（立即更新，無延遲）')
          this.updateLightState('east', 'leftGreen') // 東向左轉綠燈(redLeftLight.png)
          this.updateLightState('west', 'leftGreen') // 西向左轉綠燈(redLeftLight.png)

          this.updateTimer('東西向\n左轉綠燈', this.phaseTimings.leftTurnGreen.duration)
          await this.countdownDelay(this.phaseTimings.leftTurnGreen.duration * 1000)

          // 🎯【階段5】左轉黃燈 - 立即更新燈色
          logInfo('🟡 [燈號轉換] 東西向 左轉綠燈 → 左轉黃燈（立即更新，無延遲）')
          this.updateLightState('east', 'leftYellow') // 東向左轉黃燈(yellowLight.png)
          this.updateLightState('west', 'leftYellow') // 西向左轉黃燈(yellowLight.png)

          this.updateTimer('東西向\n左轉黃燈', this.phaseTimings.yellow.leftTurn)
          await this.countdownDelay(this.phaseTimings.yellow.leftTurn * 1000)

          // 🎯【階段6】左轉紅燈 - 立即更新燈色
          logInfo('🔴 [燈號轉換] 東西向 左轉黃燈 → 全紅（立即更新，無延遲）')
          this.updateLightState('east', 'red') // 東向左轉紅燈(redLight.png)
          this.updateLightState('west', 'red') // 西向左轉紅燈(redLight.png)

          // 🎯【階段7】全紅階段 - 切換前緩衝
          this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
          await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

          // 🔧 修正：在東西向時相結束前，重置數據以準備南北向時相
          logInfo('🔄 [相位切換] 東西向時相結束，重置數據以準備南北向')
          this.resetTrafficDataForNextCycle()

          // 切換至南北向
          this.currentPhase = 'northSouth'
          this.dynamicTiming.northSouth = this.nextTiming.northSouth
          logInfo('🔄 [TrafficController] 相位切換至 northSouth')
          this.debugLightStates()
        }

        // 🔧 移除：不再在這裡重置，改為在相位切換時重置
        // this.resetVehicleData()
      } catch (error) {
        logError('🚨 交通燈循環出現錯誤:', error)
        await this.delay(1000)
      }
    }
  }

  // Template Method Pattern: 倒數延遲函數 - 使用 Web Worker 或實時時間
  async countdownDelay(totalMs) {
    // ✅ 如果 Worker 可用，使用 Worker 倒數（完全獨立於主線程）
    if (this.countdownWorker) {
      return new Promise((resolve) => {
        // 發送倒數命令到 Worker
        this.countdownWorker.postMessage({
          command: 'startCountdown',
          duration: totalMs,
          precision: 100,
        })

        // 監聽 Worker 消息（包括 tick 和 complete）
        const handleMessage = (event) => {
          const { type, remaining } = event.data

          if (type === 'tick') {
            // 💡 關鍵修復：在每個 tick 消息時更新 UI
            if (this.onTimerUpdate) {
              this.onTimerUpdate(null, remaining)
            }
          } else if (type === 'complete') {
            // 倒數完成
            this.countdownWorker.removeEventListener('message', handleMessage)
            resolve()
          }
        }

        this.countdownWorker.addEventListener('message', handleMessage)
      })
    }

    // ❌ Worker 不可用，回到實時時間計時（主線程備用方案）
    const totalSeconds = Math.floor(totalMs / 1000)
    const startTime = Date.now()
    let lastReportedSecond = totalSeconds

    return new Promise((resolve) => {
      const checkCountdown = () => {
        const elapsedMs = Date.now() - startTime
        const remainingMs = totalMs - elapsedMs
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000))

        // ✅ 只在秒數真正改變時更新（基於系統時間）
        if (remainingSeconds !== lastReportedSecond) {
          lastReportedSecond = remainingSeconds
          if (this.onTimerUpdate) {
            this.onTimerUpdate(null, remainingSeconds)
          }
        }

        if (remainingMs <= 0) {
          // 倒數完成
          resolve()
        } else {
          // 繼續檢查（每 100ms 檢查一次，精度高但不占用太多資源）
          setTimeout(checkCountdown, 100)
        }
      }

      checkCountdown()
    })
  }

  // Template Method Pattern: 帶API觸發的倒數延遲函數（專用於南北向綠燈）
  async countdownDelayWithAPI(totalMs, apiTriggerSeconds) {
    const totalSeconds = Math.floor(totalMs / 1000)
    const actualTriggerSeconds = Math.min(apiTriggerSeconds, totalSeconds)
    let apiTriggered = false

    logInfo(
      `🕐 [API觸發檢查] 總綠燈時間: ${totalSeconds}秒, 設定觸發時間: ${apiTriggerSeconds}秒, 實際觸發時間: ${actualTriggerSeconds}秒`,
    )

    // ✅ 如果 Worker 可用，使用 Worker（獨立線程計時 + 主線程 API 觸發）
    if (this.countdownWorker) {
      return new Promise((resolve) => {
        const startTime = Date.now()

        // 發送倒數命令到 Worker
        this.countdownWorker.postMessage({
          command: 'startCountdown',
          duration: totalMs,
          precision: 100,
        })

        // 監聽 Worker 消息
        const handleMessage = (event) => {
          const { type, remaining } = event.data

          if (type === 'tick') {
            // 💡 關鍵修復：在每個 tick 消息時更新 UI
            if (this.onTimerUpdate) {
              this.onTimerUpdate(null, remaining)
            }
          } else if (type === 'complete') {
            this.countdownWorker.removeEventListener('message', handleMessage)
            if (!apiTriggered) {
              logWarn(`⚠️ [API觸發失敗] 南北向綠燈 ${totalSeconds} 秒已結束，但未觸發API`)
            }
            resolve()
          }
        }

        this.countdownWorker.addEventListener('message', handleMessage)

        // 在主線程監控 API 觸發時機（確保能捕捉到觸發點）
        const apiCheckInterval = setInterval(() => {
          const elapsed = Date.now() - startTime
          const remaining = Math.max(0, Math.floor((totalMs - elapsed) / 1000))

          if (remaining === actualTriggerSeconds && !apiTriggered) {
            clearInterval(apiCheckInterval)
            logInfo(`⏰ [API觸發] 剩餘 ${remaining} 秒，開始 AI 預測流程...`)

            // 收集數據並發送 API
            const currentCycleData = this.collectIntersectionData()
            this.sendDataToBackend(currentCycleData)
            this.updateFeatureSimulationDisplay(currentCycleData)

            apiTriggered = true
          } else if (elapsed >= totalMs) {
            clearInterval(apiCheckInterval)
          }
        }, 100)

        // 倒數結束時清理 interval
        setTimeout(() => {
          clearInterval(apiCheckInterval)
        }, totalMs + 100)
      })
    }

    // ❌ Worker 不可用，回到實時時間計時（主線程備用方案）
    const startTime = Date.now()
    let lastReportedSecond = totalSeconds

    return new Promise((resolve) => {
      const checkCountdown = () => {
        const elapsedMs = Date.now() - startTime
        const remainingMs = totalMs - elapsedMs
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000))

        // ✅ 只在秒數真正改變時更新（基於系統時間）
        if (remainingSeconds !== lastReportedSecond) {
          lastReportedSecond = remainingSeconds
          if (this.onTimerUpdate) {
            this.onTimerUpdate(null, remainingSeconds)
          }

          // Strategy Pattern: 在剩餘指定秒數時觸發API
          if (remainingSeconds === actualTriggerSeconds && !apiTriggered) {
            logInfo(`⏰ [API觸發] 剩餘 ${remainingSeconds} 秒，開始 AI 預測流程...`)

            // 收集數據並發送 API
            const currentCycleData = this.collectIntersectionData()
            this.sendDataToBackend(currentCycleData)
            this.updateFeatureSimulationDisplay(currentCycleData)

            apiTriggered = true
          }
        }

        if (remainingMs <= 0) {
          // 倒數完成
          if (!apiTriggered) {
            logWarn(`⚠️ [API觸發失敗] 南北向綠燈 ${totalSeconds} 秒已結束，但未觸發API`)
          }
          resolve()
        } else {
          // 繼續檢查（每 100ms 檢查一次）
          setTimeout(checkCountdown, 100)
        }
      }

      checkCountdown()
    })
  }

  // ==========================================
  // 🎯 Strategy Pattern (策略模式) 方法群組
  // ==========================================

  // Strategy Pattern: 收集路口數據（VD 格式）- 數據收集策略
  collectIntersectionData() {
    // 🎯【CRITICAL FIX】在自動模式下使用模擬時間，否則使用系統時間或配置時間
    let dayOfWeek, hour, minute, second, isPeakHour

    if (window.autoTrafficGenerator && window.autoTrafficGenerator.isAutoMode) {
      // 自動模式：使用模擬時間
      const simulatedTime = window.autoTrafficGenerator.simulationTime
      dayOfWeek = simulatedTime.getDay()
      hour = simulatedTime.getHours()
      minute = simulatedTime.getMinutes()
      second = simulatedTime.getSeconds()
      isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1 : 0
      logInfo(
        `🕐 [自動模式] 使用模擬時間: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} (曜日=${dayOfWeek}, 尖峰=${isPeakHour})`,
      )
    } else {
      // 手動模式或無模式：使用情景時間配置
      const selectedTimePeriod = window.selectedTrafficTimePeriod || 'off_peak'
      const timeConfig = getTimeConfigForScenario(selectedTimePeriod)
      dayOfWeek = timeConfig.dayOfWeek // 使用配置中的工作日 (2 = 週二)
      hour = timeConfig.hour // 使用配置中的小時
      minute = timeConfig.minute // 使用配置中的分鐘
      second = timeConfig.second // 使用配置中的秒
      isPeakHour = timeConfig.isPeakHour // 使用配置中的尖峰標記
      logInfo(
        `📅 [手動模式] 情景: ${selectedTimePeriod} → 時間: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} (尖峰=${isPeakHour})`,
      )
    }

    const vdData = []

    // 🔧 添加日誌：顯示當前 vehicleData 狀態
    // logInfo('📊 [數據收集] 當前 vehicleData 原始狀態:', JSON.stringify(this.vehicleData, null, 2))

    // Strategy Pattern: VD_ID 映射策略
    const vdMapping = {
      east: 'VLRJX20', // 東向
      west: 'VLRJM60', // 西向
      south: 'VLRJX00', // 南向
      north: 'VLRJX00', // 北向
    }

    // 為每個方向生成 VD 數據
    Object.keys(this.vehicleData).forEach((direction, index) => {
      const data = this.vehicleData[direction]

      // 🔧 修正：只在總數為 0 時使用最小值，否則使用真實數據
      const totalRaw = data.motor + data.small + data.large

      let scaledMotor, scaledSmall, scaledLarge

      if (totalRaw === 0) {
        // 沒有車輛時使用更大的基礎值 + 隨機波動，增加 API 預測的變動性
        // 🔧【改進 v2】進一步擴大基礎車流量範圍到 40-65 秒
        // 使用更大的隨機基礎值（每筆都不同），增加 API 預測的多樣性
        const baseMotor = 2 + Math.floor(Math.random() * 10) // 2-11 輛機車（範圍更大）
        const baseSmall = 3 + Math.floor(Math.random() * 12) // 3-14 輛小客車（範圍更大）
        const baseLarge = 1 + Math.floor(Math.random() * 5) // 1-5 輛大客車（範圍更大）

        // 再加上額外的 ±25% 波動（比之前增加）
        const variation = 0.75 + Math.random() * 0.5

        scaledMotor = Math.max(1, Math.round(baseMotor * variation))
        scaledSmall = Math.max(1, Math.round(baseSmall * variation))
        scaledLarge = Math.max(1, Math.round(baseLarge * variation))

        logInfo(
          `⚠️ [數據收集] ${direction} 方向無車輛，使用大範圍隨機值+波動 (×${variation.toFixed(2)}): motor=${scaledMotor}, small=${scaledSmall}, large=${scaledLarge}`,
        )
      } else {
        // 有車輛時使用真實數據（應用縮放因子）
        scaledMotor = Math.round(data.motor * this.dataScalingFactor)
        scaledSmall = Math.round(data.small * this.dataScalingFactor)
        scaledLarge = Math.round(data.large * this.dataScalingFactor)

        logInfo(
          `✅ [數據收集] ${direction} 方向 - 原始: motor=${data.motor}, small=${data.small}, large=${data.large} | 縮放後: motor=${scaledMotor}, small=${scaledSmall}, large=${scaledLarge}`,
        )
      }
      const totalVehicles = scaledMotor + scaledSmall + scaledLarge

      // 計算平均速度
      const speeds = {
        motor: this.getAverageSpeed(direction, 'motor'),
        small: this.getAverageSpeed(direction, 'small'),
        large: this.getAverageSpeed(direction, 'large'),
      }

      // 計算整體平均速度
      const overallSpeed =
        totalVehicles > 0
          ? Math.round(
              (scaledMotor * speeds.motor + scaledSmall * speeds.small + scaledLarge * speeds.large) / totalVehicles,
            )
          : 0

      // 計算占有率
      const occupancy = Math.round(parseFloat(this.calculateOccupancy(direction)))

      // 按照 API 格式生成數據
      vdData.push({
        VD_ID: vdMapping[direction] || `VD${direction.toUpperCase()}`,
        DayOfWeek: dayOfWeek,
        Hour: hour,
        Minute: minute,
        Second: second,
        IsPeakHour: isPeakHour,
        LaneID: index, // 使用索引作為車道 ID
        LaneType: 1, // 預設車道類型為 1
        Speed: overallSpeed,
        Occupancy: occupancy,
        Volume_M: scaledMotor, // 機車數量
        Speed_M: speeds.motor, // 機車平均車速
        Volume_S: scaledSmall, // 小客車數量
        Speed_S: speeds.small, // 小客車平均車速
        Volume_L: scaledLarge, // 大客車數量
        Speed_L: speeds.large, // 大客車平均車速
        Volume_T: 0, // ✅ 聯結車數量（該縣市禁止聯結車進入）
        Speed_T: 0, // ✅ 聯結車平均車速（該縣市禁止聯結車進入）
      })
    })

    // 🔧 添加日誌：顯示處理後的數據
    logInfo('📤 [數據發送] 處理後的 vdData:', JSON.stringify(vdData, null, 2))

    return vdData
  }

  // Strategy Pattern: 獲取各車型的平均速度策略
  getAverageSpeed(direction, vehicleType) {
    // 從統一的設定檔讀取速度範圍
    const range = speedConfig[vehicleType]
    if (!range) return 30
    // Strategy Pattern: 根據路段占有率調整速度的策略
    const occupancy = parseFloat(this.calculateOccupancy(direction))
    let speedFactor = 1.0 // 基礎速度因子，不再強制降低到路口速度

    if (occupancy > 80) {
      speedFactor *= 0.4 // 嚴重擁堵時大幅降速
    } else if (occupancy > 60) {
      speedFactor *= 0.6 // 中度擁堵
    } else if (occupancy > 30) {
      speedFactor *= 0.8 // 輕度擁堵
    } else {
      speedFactor *= 0.9 // 正常情況下稍微降速（模擬路口減速）
    }

    // 🎯【新增】第一次 API 呼叫時加入隨機波動，使速度不固定
    // 這樣即使邏輯相同，每次呼叫也會產生不同的速度值
    if (this.apiCallCount === 1 || this.apiCallCount === 2) {
      const speedVariation = (Math.random() - 0.5) * 10 // -5 ~ +5 的隨機波動
      const baseSpeed = Math.round(range.avg * speedFactor)
      const variatedSpeed = Math.round(Math.max(20, Math.min(60, baseSpeed + speedVariation))) // 確保是整數
      return variatedSpeed + 0.0 // 返回整數 + .0 的格式
    }

    return Math.round(range.avg * speedFactor) + 0.0
  }

  // Strategy Pattern: 計算路段占有率策略
  calculateOccupancy(direction) {
    const data = this.vehicleData[direction]
    const totalVehicles = data.motor + data.small + data.large
    // 調整占有率計算：增加基礎占有率以模擬中等流量情況
    const maxCapacity = 60 // 降低最大容量以提高占有率敏感度，模擬較繁忙路段
    let baseOccupancy = 15 // 基礎占有率，確保即使車輛較少時也有一定的占有率

    // 🎯【新增】第一次 API 呼叫時加入隨機波動，使占有率不固定
    if (this.apiCallCount === 1 || this.apiCallCount === 2) {
      baseOccupancy = Math.floor(Math.random() * 15) + 10 // 10-24 的隨機基礎占有率
    }

    const calculatedOccupancy = (totalVehicles / maxCapacity) * 100
    const finalOccupancy = Math.min(baseOccupancy + calculatedOccupancy, 100)
    return finalOccupancy.toFixed(1)
  }

  // ===== 🔌 後端上限限制相關方法 =====

  /**
   * 根據時段獲取後端數據上限
   * @param {string} timePeriod - 時段 ('peak_hours', 'off_peak', 'late_night')
   * @returns {number} 後端允許的最大體積
   */
  _getMaxBackendVolumeForPeriod(timePeriod) {
    const limits = VOLUME_LIMITS_CONFIG[timePeriod] || VOLUME_LIMITS_CONFIG['off_peak']
    return limits.maxLiveVehiclesForBackend || 20
  }

  /**
   * 對前端數據進行後端上限縮放
   * 確保發送給後端的數據不超過 maxLiveVehiclesForBackend
   * @param {object} frontendData - 前端生成的數據（包含 Volume_T, Volume_M, Volume_S, Volume_L）
   * @param {string} timePeriod - 時段
   * @returns {object} 後端適配的數據
   */
  _scaleDataToBackendLimit(frontendData, timePeriod) {
    const maxBackendVolume = this._getMaxBackendVolumeForPeriod(timePeriod)
    const currentVolume = frontendData?.Volume_T || 0

    if (currentVolume <= 0) {
      // 如果沒有體積數據，直接返回
      return frontendData
    }

    // 計算縮放因子
    const scaleFactor = Math.min(1, maxBackendVolume / currentVolume)

    if (scaleFactor < 1) {
      logInfo(
        `🔌 [後端上限] 將體積從 ${currentVolume} 縮小到 ${Math.round(currentVolume * scaleFactor)} (時段=${timePeriod}, 上限=${maxBackendVolume})`,
      )

      // 返回縮放後的數據
      return {
        ...frontendData,
        Volume_T: Math.round((frontendData.Volume_T || 0) * scaleFactor),
        Volume_M: Math.round((frontendData.Volume_M || 0) * scaleFactor),
        Volume_S: Math.round((frontendData.Volume_S || 0) * scaleFactor),
        Volume_L: Math.round((frontendData.Volume_L || 0) * scaleFactor),
        // 佔有率也要縮小
        Occupancy: (frontendData.Occupancy || 0) * scaleFactor,
        // 記錄縮放信息
        _backendScaleFactor: scaleFactor,
        _backendMaxVolume: maxBackendVolume,
      }
    }

    return frontendData
  }

  // Strategy Pattern: 發送數據到後端 API（提前 10 秒請求）
  async sendDataToBackend(vdData = null) {
    try {
      // 🎯【新增】防止同一個綠燈周期內多次發送 API
      if (this.apiAlreadySentInCycle) {
        logInfo(`⚠️ [API 防重複] 本週期已發送過 API，跳過重複發送 (計次: ${this.apiCallCount})`)
        return null
      }

      // 🎯【新增】增加 API 呼叫計數，只在實際發送時遞增（不在收集時）
      this.apiCallCount = (this.apiCallCount || 0) + 1
      this.apiAlreadySentInCycle = true
      logInfo(`📞 [API 計數] 第 ${this.apiCallCount} 次呼叫`)

      // 🎯【重要】優先使用 AutoTrafficGenerator 生成的 4-方向 API 數據陣列
      let dataToSend = null
      if (vdData) {
        dataToSend = vdData
        logInfo('⏳ 已取得傳入的 VD 原始數據，準備進行正規化轉換...')
      } else if (window.currentGeneratedVDData?.apiDataArray) {
        // 🎯【新】使用 AutoTrafficGenerator 生成的 4-方向 API 數據陣列
        dataToSend = window.currentGeneratedVDData.apiDataArray
        logInfo('✅ 已取得 AutoTrafficGenerator 生成的 4-方向 API 數據陣列，將直接發送到後端...')
      } else if (window.currentGeneratedVDData?.apiVDData) {
        // 備用方案：相容舊版本
        dataToSend = window.currentGeneratedVDData.apiVDData
        logInfo('⏳ 已取得全局保存的生成 VD 原始數據（舊版本），準備進行正規化轉換...')
      } else {
        // 備用方案：使用本地收集的數據
        dataToSend = this.collectIntersectionData()
        logInfo('⏳ 已使用本地收集的數據（備用方案），準備進行正規化轉換...')
      }

      // 🎯【關鍵步驟 1】確保 dataToSend 是陣列格式（後端期望 4 筆路口特徵資料）
      let allIntersectionData = []
      if (Array.isArray(dataToSend)) {
        // 已經是陣列格式（來自 collectIntersectionData()）
        allIntersectionData = dataToSend
        logInfo('✅ 數據已是陣列格式，包含 ' + allIntersectionData.length + ' 筆交叉路口數據')
      } else if (dataToSend && typeof dataToSend === 'object') {
        // 單個物件（來自 AutoTrafficGenerator），需要複製為 4 筆（東、西、南、北）
        logInfo('📋 檢測到單筆 AutoTrafficGenerator 數據，準備擴展為 4 筆交叉路口...')

        // 東、西、南、北的 VD_ID 和方向信息
        const directions = [
          { id: 'VLRJX20', name: '東向' },
          { id: 'VLRJM60', name: '西向' },
          { id: 'VLRJX00', name: '南向' },
          { id: 'VLRJX00', name: '北向' },
        ]

        // 將單筆數據複製為 4 筆（每個方向一筆），保持相同的流量/速度數據
        allIntersectionData = directions.map((direction, index) => ({
          ...dataToSend,
          VD_ID: direction.id,
          LaneID: index,
          Direction: direction.name,
          // ✅ 保持原始的 Volume_M, Volume_S, Volume_L, Speed 等數據
        }))

        logInfo('✅ 已將單筆數據擴展為 4 筆交叉路口數據（東、西、南、北）')
      } else {
        logError('❌ 數據格式錯誤，無法發送到後端')
        throw new Error('Invalid data format: expected array or object with intersection data')
      }

      // ✅ 進行正規化轉換：前端顯示數據 → API 發送數據
      let normalizedDataArray = allIntersectionData.map((singleData) => {
        // 🎯【新】檢查數據是否已經是完整的 API 格式（來自 AutoTrafficGenerator）
        // AutoTrafficGenerator 的 API 數據包含所有必需的欄位（VD_ID, Volume_M, Volume_S, Volume_L, Speed, Speed_M, Speed_S, Speed_L, Volume_T=0, Speed_T=0）
        if (
          singleData.Volume_M !== undefined &&
          singleData.Volume_S !== undefined &&
          singleData.Volume_L !== undefined &&
          singleData.Speed_M !== undefined &&
          singleData.Speed_S !== undefined &&
          singleData.Speed_L !== undefined &&
          singleData.Volume_T === 0 &&
          singleData.Speed_T === 0
        ) {
          // ✅【新】數據已經是完整的 API 格式，直接返回
          logInfo(
            `✅ 偵測到完整的 AutoTrafficGenerator API 數據，直接使用（VD_ID: ${singleData.VD_ID}, LaneID: ${singleData.LaneID}）`,
          )
          return {
            VD_ID: singleData.VD_ID,
            DayOfWeek: singleData.DayOfWeek,
            Hour: singleData.Hour,
            Minute: singleData.Minute,
            Second: singleData.Second,
            IsPeakHour: singleData.IsPeakHour,
            LaneID: singleData.LaneID,
            LaneType: singleData.LaneType,
            Speed: singleData.Speed,
            Occupancy: singleData.Occupancy,
            Volume_M: singleData.Volume_M,
            Speed_M: singleData.Speed_M,
            Volume_S: singleData.Volume_S,
            Speed_S: singleData.Speed_S,
            Volume_L: singleData.Volume_L,
            Speed_L: singleData.Speed_L,
            Volume_T: 0,
            Speed_T: 0,
          }
        }

        // 【舊邏輯】如果不是完整的 API 數據，進行時段特徵對齐
        // 提取路口 ID 和時段
        let intersectionId = singleData?.VD_ID || 'VLRJM60'
        const timePeriod = getCurrentTimePeriod()

        // 容錯：檢查時段轉換
        if (timePeriod !== this.lastTimePeriod) {
          logWarn(`⚠️ [時段轉換] ${this.lastTimePeriod} → ${timePeriod} 於 ${new Date().toLocaleTimeString()}`)
          this.timePeriodChangeCount++
          this.lastTimePeriod = timePeriod
        }

        // 容錯：驗證路口 ID
        const validIds = ['VLRJM60', 'VLRJX00', 'VLRJX20']
        if (!validIds.includes(intersectionId)) {
          logWarn(`⚠️ [路口容錯] 無效的路口 ID: ${intersectionId}，使用 VLRJM60`)
          intersectionId = 'VLRJM60'
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 【版本 2.5 - 核心改進】VD 時段特徵對齐
        // ═══════════════════════════════════════════════════════════════════════
        // 根據時段從 VD 映射表獲取真實特徵，而非只依賴 vdPatternConfig 生成的數據
        // 這確保：
        //  ✅ 時段標籤與真實 VD 特徵對齐
        //  ✅ 前端顯示（車輛數多少）與模型輸入特徵一致
        //  ✅ 模型接收到與訓練時相符的特徵範圍

        // 獲取時段的 VD 特徵映射
        const vdMapping = getVDMappingForTimeSlot(timePeriod)

        // 從映射中獲取真實的小時和車輛數
        const mappedHour = getRandomHourForTimeSlot(timePeriod)
        const mappedVehicleCount = getRandomVehicleCountForTimeSlot(timePeriod)

        // 🆕 【關鍵改進】根據時段的 Volume_T 總數，按比例生成各車型的數量
        // 這確保三個時段的車流特徵明顯不同
        const vehicleTypeRatios = {
          peak_hours: { M: 0.35, S: 0.45, L: 0.2 }, // 尖峰：混合車型
          off_peak: { M: 0.3, S: 0.5, L: 0.2 }, // 離峰：較多小型車
          late_night: { M: 0.25, S: 0.55, L: 0.2 }, // 凌晨：最多小型車
        }

        const ratios = vehicleTypeRatios[timePeriod] || vehicleTypeRatios.off_peak

        // 根據 mappedVehicleCount 和比例計算各車型數量
        const mappedVolumeM = Math.round(mappedVehicleCount * ratios.M)
        const mappedVolumeS = Math.round(mappedVehicleCount * ratios.S)
        const mappedVolumeL = Math.round(mappedVehicleCount * ratios.L)

        logInfo(`📊 【版本 2.5】VD 特徵對齊 - 時段: ${timePeriod}`)
        logInfo(
          `   - 映射時段: ${timePeriod} (${vdMapping.vehicleCountRange[0]}-${vdMapping.vehicleCountRange[1]} 輛範圍)`,
        )
        logInfo(`   - 小時映射: ${singleData.Hour || 'N/A'} → ${mappedHour}`)
        logInfo(`   - 流量映射: ${singleData.Volume_T || 0} → ${mappedVehicleCount} 輛總計`)
        logInfo(
          `   - 車型分布: M=${mappedVolumeM} + S=${mappedVolumeS} + L=${mappedVolumeL} = ${mappedVolumeM + mappedVolumeS + mappedVolumeL}`,
        )

        // ✅ 【移除正規化】直接使用生成的 VD Pattern 數據，無需轉換
        // 理由：vdPatternConfig 已經基於真實 VD 數據統計，符合 API 期望的範圍

        // 🎯 計算加權平均速度（基於各車型的數量和速度）
        const totalVolume = mappedVolumeM + mappedVolumeS + mappedVolumeL
        const weightedSpeed =
          totalVolume > 0
            ? Math.round(
                ((singleData.Speed_M || 0) * mappedVolumeM +
                  (singleData.Speed_S || 0) * mappedVolumeS +
                  (singleData.Speed_L || 0) * mappedVolumeL) /
                  totalVolume,
              )
            : 0

        // ✅ 返回交叉路口數據（18個欄位給後端）
        // 【版本 2.5】：使用 VD 映射的 hour 和 vehicle_count，而非原始值
        const apiData = {
          VD_ID: singleData.VD_ID,
          DayOfWeek: singleData.DayOfWeek,
          Hour: mappedHour, // 【版本 2.5】：使用 VD 映射的小時
          Minute: singleData.Minute,
          Second: singleData.Second,
          IsPeakHour: singleData.IsPeakHour,
          LaneID: singleData.LaneID,
          LaneType: singleData.LaneType,
          Speed: weightedSpeed, // 🎯 使用加權平均速度
          Occupancy: Math.round((singleData.Occupancy || 0) * 10) / 10,
          Volume_M: mappedVolumeM, // 【版本 2.5】：使用時段對應的機車數
          Speed_M: singleData.Speed_M || 0,
          Volume_S: mappedVolumeS, // 【版本 2.5】：使用時段對應的小型車數
          Speed_S: singleData.Speed_S || 0,
          Volume_L: mappedVolumeL, // 【版本 2.5】：使用時段對應的大型車數
          Speed_L: singleData.Speed_L || 0,
          Volume_T: 0, // ✅ 聯結車禁止進入，必定為 0（不使用 mappedVehicleCount）
          Speed_T: 0, // ✅ 聯結車禁止進入，必定為 0
        }

        // 🔧 為了方便日誌打印，暫時添加元數據到物件中（不會發送給後端）
        Object.defineProperty(apiData, 'data_source', {
          value: 'vdPatternConfig (direct)',
          enumerable: false,
        })
        Object.defineProperty(apiData, 'scenario', {
          value: timePeriod,
          enumerable: false,
        })
        Object.defineProperty(apiData, 'weather', {
          value: 'CLEAR',
          enumerable: false,
        })
        Object.defineProperty(apiData, 'weather_multiplier', {
          value: 1.0,
          enumerable: false,
        })

        return apiData
      })

      // 🎯【重要】最終要發送給後端的格式：直接發送陣列（後端期望的格式）
      const finalDataToSend = normalizedDataArray

      // ✅ 先處理第一筆數據用於日誌（如果有多筆）
      const firstData = normalizedDataArray[0] || {}

      // 🔍 調試：檢查 finalDataToSend 的 Volume_L
      // logInfo('🔍 [TrafficLightController] finalDataToSend 中各方向的 Volume_L：')
      // finalDataToSend.forEach((data, index) => {
      //   logInfo(`  方向 ${index} (${data.VD_ID}, LaneID: ${data.LaneID}): Volume_L = ${data.Volume_L}`)
      // })

      // ✅ 【版本 2.5】VD 數據已生成並應用時段特徵對齐
      // console.log('✅ 【版本 2.5 - VD 時段特徵對齊已應用】')
      // console.log(`  - 交叉路口數量: ${normalizedDataArray.length}`)
      // console.log(`  - 數據源: vdPatternConfig (direct) + VD 時段映射對齊`)
      // console.log(`  - 時段: ${firstData.scenario}`)
      // console.log(`  - 映射到真實小時: Hour = ${firstData.Hour}`)
      // console.log(`  - 映射到 VD 特徵: Volume_T = ${firstData.Volume_T} 輛`)

      // 【新增】打印完整的數據陣列（物件形式，可用 Copy object 複製）
      // logInfo('📦 【完整的數據陣列 - 右鍵 Copy object 複製】:')
      // logInfo(normalizedDataArray)

      // 【新增】打印格式化的 JSON 字符串（便於閱讀和檢查）
      // logInfo('📋 【格式化的 JSON 字符串 - 便於閱讀】:')
      // logInfo(JSON.stringify(normalizedDataArray, null, 2))

      // logInfo('🚦 發送 VD 數據到後端 AI 系統:')
      // logInfo(`  - 交叉路口數量: ${normalizedDataArray.length}`)
      // logInfo(`  - 第一筆流量 (版本 2.5): Volume_T=${firstData.Volume_T} (VD 映射值)`)
      // logInfo(`  - 第一筆車型: M=${firstData.Volume_M}, S=${firstData.Volume_S}, L=${firstData.Volume_L}`)
      // logInfo(`  - 時段信息: ${firstData.scenario}`)

      // ✅ 【新增】打印完整的數據
      // logInfo('📊 【VD 數據詳情】以下是要發送給後端的 4 筆交叉路口數據 (版本 2.5):')
      // normalizedDataArray.forEach((data, index) => {
      //   logInfo(`  [交叉路口 ${index + 1}] ${data.VD_ID} (${data.scenario}):`)
      //   logInfo(
      //     `    - 流量 (VD映射): Volume_T=${data.Volume_T}, Volume_M=${data.Volume_M}, Volume_S=${data.Volume_S}, Volume_L=${data.Volume_L}`,
      //   )
      //   logInfo(
      //     `    - 速度: Speed_T=${data.Speed_T}, Speed_M=${data.Speed_M}, Speed_S=${data.Speed_S}, Speed_L=${data.Speed_L}`,
      //   )
      //   logInfo(`    - 佔有率: ${data.Occupancy}%`)
      //   console.log(`    - 時段: ${data.scenario}`)
      //   console.log(`    - 小時 (VD映射): ${data.Hour}`)
      //   // 🌤️ 【新增】顯示天氣信息
      //   console.log(`    - 天氣: ${data.weather} (倍數: ${data.weather_multiplier?.toFixed(2)}x)`)
      // })
      // console.log('✅ VD 數據已準備完畢，即將發送到後端...')

      // ═══════════════════════════════════════════════════════════════════════
      // 🔍【版本 2.5 新增】數據品質驗證與修正 - 三層防線
      // ═══════════════════════════════════════════════════════════════════════
      const timePeriod = firstData.scenario || getCurrentTimePeriod()

      // logInfo(`\n🔍 【步驟 1】驗證數據品質 - 檢查是否符合 "${timePeriod}" 時段的特徵範圍...`)

      // 執行驗證與自動修正
      const validationResult = validateAndRectifyDataArray(finalDataToSend, timePeriod)

      // 生成簡潔的驗證報告
      // const summaryReport = generateValidationSummary(validationResult)
      // logInfo(summaryReport)

      // 如果有修正，生成詳細報告
      if (validationResult.rectifiedRecords > 0) {
        // logInfo(`\n⚠️ 發現 ${validationResult.rectifiedRecords} 筆數據超出範圍，已自動修正：`)
        // const detailedReport = generateValidationReport(validationResult)
        // logInfo(detailedReport)
      } else {
        // logInfo(`\n✅ 全部 ${validationResult.totalRecords} 筆數據都符合時段特徵範圍，無需修正。`)
      }

      // 修正後的數據已直接寫入 finalDataToSend，可以安全地發送
      // logInfo(`\n✅ 【步驟 2】數據品質確認 - 準備發送修正後的數據到後端...`)

      // 🎯 【修正】先保存數據快照,再發送事件和 API
      window.lastNormalizedDataArray = normalizedDataArray // 正規化後的數據（品質檢查後）
      window.lastApiVDDataArray = finalDataToSend // 原始 API 數據（實際發送）
      // logInfo('💾 [TrafficLightController] 已保存數據快照:')
      // logInfo('  - window.lastNormalizedDataArray: 正規化數據（品質檢查後）')
      // logInfo('  - window.lastApiVDDataArray: 原始 API 數據（實際發送）')

      // 發送 API 開始事件 (數據已保存,前端可以讀取)
      window.dispatchEvent(new CustomEvent('trafficApiSending', { detail: { timestamp: new Date().toISOString() } }))

      // 🎯【重試機制】使用帶重試的 fetch 函數
      const response = await fetchWithRetry(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalDataToSend),
      })

      // ✅ 【新增】發送成功確認訊息
      logInfo('✅ 【VD 數據已成功發送到後端】')
      logInfo(`✅ 已發送 ${normalizedDataArray.length} 筆交叉路口數據`)
      // logInfo(`✅ 時段: ${firstData.scenario}`) // scenario 是非可列舉屬性，logInfo 無法讀取

      if (!response.ok) {
        // 嘗試獲取錯誤信息
        let errorBody = '無法解析錯誤信息'
        try {
          const errorData = await response.clone().json()
          errorBody = JSON.stringify(errorData)
        } catch {
          try {
            errorBody = await response.clone().text()
          } catch {
            errorBody = '無法讀取響應體'
          }
        }
        logError(`❌ [API 錯誤詳情]`)
        logError(`  - 狀態碼: ${response.status}`)
        logError(`  - 錯誤信息: ${errorBody}`)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`)
      }

      const result = await response.json()
      logInfo('🤖 收到真實 AI 預測結果:', result)

      // 清空特徵模擬數據
      if (window.trafficDataCollector && typeof window.trafficDataCollector.reset === 'function') {
        window.trafficDataCollector.reset()
      }

      // 發送 API 完成事件
      window.dispatchEvent(
        new CustomEvent('trafficApiComplete', { detail: { timestamp: new Date().toISOString(), response: result } }),
      )

      // ✅ 更新下一輪的綠燈時間（使用提取的公共方法）
      this.updatePredictionResult(result, '正式')
      return result
    } catch (error) {
      logWarn('⚠️ 真實 API 呼叫失敗:', error.message)
      logInfo('🔄 啟用本地模擬 AI 作為備援方案...')

      // *** 備援方案：呼叫本地模擬 AI ***
      // 🎯 優先使用生成的 VD 數據，備用方案才用本地收集數據
      let dataToSend = null
      if (vdData) {
        dataToSend = vdData
      } else if (window.currentGeneratedVDData?.apiVDData) {
        dataToSend = window.currentGeneratedVDData.apiVDData
      } else {
        dataToSend = this.collectIntersectionData()
      }
      const result = this.getAISuggestion(dataToSend)

      // 發送 API 錯誤事件
      window.dispatchEvent(
        new CustomEvent('trafficApiError', { detail: { timestamp: new Date().toISOString(), error: error.message } }),
      )

      // ✅ 更新下一輪的綠燈時間（使用提取的公共方法）
      this.updatePredictionResult(result, '備援')
      return null
    }
  }

  // ==========================================
  // 🤖 AI 決策模擬系統 (AI Decision Simulation)
  // ==========================================

  // 模擬 AI 獲取建議
  getAISuggestion(currentData) {
    console.log('🧠 模擬 AI 正在分析數據:', currentData)

    let northSouthTotal = 0
    let eastWestTotal = 0

    // 計算南北向和東西向的總車流量
    currentData.forEach((data) => {
      const totalVehicles = data.Volume_M + data.Volume_S + data.Volume_L
      if (data.VD_ID.includes('VLRJX00')) {
        // 南北向
        northSouthTotal += totalVehicles
      } else if (data.VD_ID.includes('VLRJX20') || data.VD_ID.includes('VLRJM60')) {
        // 東西向
        eastWestTotal += totalVehicles
      }
    })

    console.log(`📈 AI 分析結果 - 南北向車流: ${northSouthTotal}, 東西向車流: ${eastWestTotal}`)

    // 基礎秒數
    const baseTime = 10 // 基礎綠燈時間
    const extraTimePerCar = 0.5 // 每多一輛車增加的秒數

    // 計算建議秒數
    let northSouthSeconds = baseTime + northSouthTotal * extraTimePerCar
    let eastWestSeconds = baseTime + eastWestTotal * extraTimePerCar

    // 設定秒數上下限
    const minTime = 8 // 最短綠燈時間
    const maxTime = 45 // 最長綠燈時間
    northSouthSeconds = Math.max(minTime, Math.min(northSouthSeconds, maxTime))
    eastWestSeconds = Math.max(minTime, Math.min(eastWestSeconds, maxTime))

    const suggestion = {
      east_west_seconds: Math.round(eastWestSeconds),
      south_north_seconds: Math.round(northSouthSeconds),
      reasoning: `南北向 ${northSouthTotal} 輛 vs 東西向 ${eastWestTotal} 輛`,
    }

    console.log('💡 AI 產生建議:', suggestion)
    return suggestion
  }

  // 開始交通燈控制
  start() {
    if (this.isRunning) {
      console.log('⚠️ 交通燈控制器已在運行中')
      return
    }

    console.log('🚥 開始交通燈控制器...')
    this.isRunning = true
    this.runCycle()
  }

  // 停止交通燈控制
  stop() {
    this.isRunning = false
    window.removeEventListener('vehicleAdded', this.vehicleAddedHandler)
    window.removeEventListener('vehicleRemoved', this.vehicleRemovedHandler)
  }

  // 設置倒數更新回調
  setTimerUpdateCallback(callback) {
    this.onTimerUpdate = callback
  }

  // 設置 AI 預測更新回調
  setPredictionUpdateCallback(callback) {
    this.onPredictionUpdate = callback
  }

  // 更新車輛數據
  incrementVehicleData(direction, vehicleType) {
    if (this.vehicleData[direction] && this.vehicleData[direction][vehicleType] !== undefined) {
      this.vehicleData[direction][vehicleType]++
    }
  }

  decrementVehicleData(direction, vehicleType) {
    if (this.vehicleData[direction] && this.vehicleData[direction][vehicleType] !== undefined) {
      this.vehicleData[direction][vehicleType]--
      if (this.vehicleData[direction][vehicleType] < 0) {
        this.vehicleData[direction][vehicleType] = 0 // Prevent negative counts
      }
    }
  }

  // 獲取方向車輛數據
  getDirectionVehicleData(direction) {
    return this.vehicleData[direction] || { motor: 0, small: 0, large: 0 }
  }

  // 重置車輛數據
  resetVehicleData() {
    Object.keys(this.vehicleData).forEach((direction) => {
      this.vehicleData[direction] = { motor: 0, small: 0, large: 0 }
    })
  }

  // ==========================================
  // 🔄 AI週期數據管理系統
  // ==========================================

  // 更新特徵模擬數據顯示
  updateFeatureSimulationDisplay(currentCycleData) {
    console.log('📊 更新特徵模擬數據顯示')

    // 立即觸發UI更新事件
    window.dispatchEvent(
      new CustomEvent('trafficDataUpdated', {
        detail: {
          data: currentCycleData,
          source: 'ai_cycle',
          timestamp: new Date().toISOString(),
        },
      }),
    )

    // 通知MainLayout強制更新顯示
    window.dispatchEvent(
      new CustomEvent('trafficDataChanged', {
        detail: {
          reason: 'api_triggered_update',
          timestamp: new Date().toISOString(),
        },
      }),
    )
  }

  // 為下一輪重置交通數據
  resetTrafficDataForNextCycle() {
    console.log('🔄 開始新週期，重置交通數據...')

    // 🎯【新增】重置 API 防重複標記
    this.apiAlreadySentInCycle = false

    // 1. 保存當前週期數據到歷史記錄
    this.saveCurrentCycleToHistory()

    // 2. 重置TrafficLightController的車輛計數器
    this.resetVehicleData()

    // 3. 重置TrafficDataCollector
    if (window.trafficDataCollector) {
      console.log('🔄 重置TrafficDataCollector數據')
      window.trafficDataCollector.resetCurrentPeriod()
    }

    // 4. 通知自動車流生成器週期重置
    if (window.autoTrafficGenerator) {
      console.log('🔄 通知AutoTrafficGenerator週期重置')
    }

    // 5. 觸發週期重置事件
    window.dispatchEvent(
      new CustomEvent('trafficCycleReset', {
        detail: {
          timestamp: new Date().toISOString(),
          reason: 'ai_prediction_cycle',
        },
      }),
    )

    console.log('✅ 交通數據重置完成，開始新週期收集')
  }

  // 保存當前週期數據到歷史記錄
  saveCurrentCycleToHistory() {
    const currentData = {
      timestamp: new Date().toISOString(),
      vehicleData: JSON.parse(JSON.stringify(this.vehicleData)),
      totalVehicles: this.calculateTotalVehicles(),
      averageSpeeds: this.calculateAverageSpeeds(),
    }

    // 初始化歷史記錄陣列
    if (!this.historyData) {
      this.historyData = []
    }

    this.historyData.push(currentData)

    // 只保留最近20筆記錄
    if (this.historyData.length > 20) {
      this.historyData = this.historyData.slice(-20)
    }

    console.log('📚 已保存當前週期數據到歷史記錄')
  }

  // 計算總車輛數
  calculateTotalVehicles() {
    let total = 0
    Object.keys(this.vehicleData).forEach((direction) => {
      const data = this.vehicleData[direction]
      total += data.motor + data.small + data.large
    })
    return total
  }

  // 計算各方向平均速度
  calculateAverageSpeeds() {
    const speeds = {}
    Object.keys(this.vehicleData).forEach((direction) => {
      speeds[direction] = {
        motor: this.getAverageSpeed(direction, 'motor'),
        small: this.getAverageSpeed(direction, 'small'),
        large: this.getAverageSpeed(direction, 'large'),
        overall: this.getAverageSpeed(direction, 'small'), // 使用小型車作為整體代表
      }
    })
    return speeds
  }

  // 獲取歷史數據
  getHistoryData(limit = 10) {
    if (!this.historyData) return []
    return this.historyData.slice(-limit)
  }

  // 更新計時器顯示
  updateTimer(phase, seconds) {
    if (this.onTimerUpdate) {
      this.onTimerUpdate(phase, seconds)
    }
  }

  // 延遲函數
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // ==========================================
  // 🔧 公共優化方法 (Optimization Methods)
  // ==========================================

  /**
   * 統一處理預測結果並更新綠燈時間
   * 用於消除 API 成功和備援路徑之間的代碼重複
   * @param {Object} result - 預測結果 {east_west_seconds, south_north_seconds}
   * @param {String} source - 來源標記 ('正式' 或 '備援')
   */
  updatePredictionResult(result, source = '正式') {
    if (result && result.east_west_seconds && result.south_north_seconds) {
      this.nextTiming.eastWest = result.east_west_seconds
      this.nextTiming.northSouth = result.south_north_seconds

      if (this.onPredictionUpdate) {
        this.onPredictionUpdate({
          eastWest: result.east_west_seconds,
          northSouth: result.south_north_seconds,
          timestamp: new Date().toLocaleTimeString(),
        })
      }
      console.log(
        `✅ (${source}) 下一輪綠燈時間已更新 - 東西向: ${result.east_west_seconds}秒, 南北向: ${result.south_north_seconds}秒`,
      )
    }
  }

  // 處理車輛移除事件
  handleVehicleRemoved(detail) {
    // detail 應包含 { vehicleId, direction, type }
    if (!detail || !detail.vehicleId) {
      return
    }

    // IndexPage.vue 已經在派發事件前從 liveVehicles 移除了車輛
    // 這個方法主要用於數據同步和統計，不再嘗試移除
    const idx = window.liveVehicles ? window.liveVehicles.findIndex((v) => v.id === detail.vehicleId) : -1

    if (idx !== -1) {
      // 如果還在陣列中，說明有其他地方派發了事件，幫忙移除
      window.liveVehicles.splice(idx, 1)
    } else {
      // 正常情況 - 車輛已被 IndexPage 移除
      // console.log(`✅ 車輛事件處理: ${detail.vehicleId}`)
    }
  }

  // ==========================================
  // 🚦 停止線車輛管理方法
  // ==========================================

  /**
   * 統計指定方向停止線前的車輛數量
   * @param {string} direction - 方向 ('east', 'west', 'north', 'south')
   * @returns {number} 該方向停止線前的車輛數量
   */
  getVehiclesWaitingAtStopLine(direction) {
    if (!window.liveVehicles || !Array.isArray(window.liveVehicles)) {
      return 0
    }

    // 過濾出指定方向的車輛
    const directionVehicles = window.liveVehicles.filter((v) => v.direction === direction)

    if (directionVehicles.length === 0) {
      return 0
    }

    // 統計在停止線附近（waitingForGreen 或 isAtStopLine）的車輛
    const waitingVehicles = directionVehicles.filter((v) => {
      return (
        v.waitingForGreen === true || v.isAtStopLine === true || (v.currentState && v.currentState.includes('stopped'))
      )
    })

    return waitingVehicles.length
  }

  /**
   * 獲取所有方向停止線前的車輛統計
   * @returns {Object} 各方向的車輛數量 {east, west, north, south}
   */
  getAllDirectionsStopLineVehicles() {
    return {
      east: this.getVehiclesWaitingAtStopLine('east'),
      west: this.getVehiclesWaitingAtStopLine('west'),
      north: this.getVehiclesWaitingAtStopLine('north'),
      south: this.getVehiclesWaitingAtStopLine('south'),
    }
  }

  /**
   * 檢查指定方向是否已達停止線車輛上限
   * @param {string} direction - 方向
   * @param {number} limit - 上限（預設從配置讀取）
   * @returns {boolean} 是否已達上限
   */
  isStopLineAtCapacity(direction, limit = null) {
    // 使用配置或傳入參數
    const actualLimit = limit !== null ? limit : STOP_LINE_VEHICLE_LIMITS[direction] || 30

    const count = this.getVehiclesWaitingAtStopLine(direction)
    return count >= actualLimit
  }
}
