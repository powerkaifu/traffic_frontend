/**
 * TrafficLightService.js - 交通燈 API 通訊服務
 * 負責處理所有與後端 API 的通訊、資料格式化與驗證
 */

import { getCurrentTimePeriod } from './config/vdNormalizationConfig.js'
import { getRandomHourForTimeSlot, getRandomVehicleCountForTimeSlot } from './config/vdMapping.js'
import { validateAndRectifyDataArray } from './utils/DataQualityValidator.js'
import { GREEN_LIGHT_PREDICTION_CONFIG, getAdjustmentCoefficient } from './config/greenLightPredictionConfig.js'

// 🎯 全局日誌系統 (與 Controller 保持一致)
const isDev = process.env.DEV || process.env.NODE_ENV !== 'production'
const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 }
const MIN_LOG_LEVEL = isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR

const createLogger = (level) => {
  return (...args) => {
    if (level <= MIN_LOG_LEVEL) {
      if (level === LOG_LEVELS.ERROR) console.error(...args)
      else if (level === LOG_LEVELS.WARN) console.warn(...args)
      else console.log(...args)
    }
  }
}

const logError = createLogger(LOG_LEVELS.ERROR)
const logWarn = createLogger(LOG_LEVELS.WARN)
const logInfo = createLogger(LOG_LEVELS.INFO)

// 🎯 API 重試配置
const API_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,
  TIMEOUT: 5000,
}

/**
 * 帶重試機制的 fetch 函數
 */
const fetchWithRetry = async (url, options = {}) => {
  let lastError = null
  for (let attempt = 1; attempt <= API_RETRY_CONFIG.MAX_RETRIES; attempt++) {
    let timeoutId = null
    try {
      const controller = new AbortController()
      timeoutId = setTimeout(() => controller.abort(), API_RETRY_CONFIG.TIMEOUT)
      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId)
      lastError = error
      if (attempt === API_RETRY_CONFIG.MAX_RETRIES) {
        logError(`❌ [API 重試] 第 ${attempt} 次嘗試失敗，已達最大重試次數`)
        throw lastError
      }
      const delay = API_RETRY_CONFIG.BASE_DELAY * Math.pow(2, attempt - 1)
      logWarn(`⚠️ [API 重試] 第 ${attempt} 次嘗試失敗: ${error.message}，${delay}ms 後重試...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export default class TrafficLightService {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint
    this.lastTimePeriod = null
    this.timePeriodChangeCount = 0
  }

  /**
   * 發送數據到後端 API
   * @param {Array|Object} dataToSend - 要發送的數據 (來自 Store 或本地收集)
   * @param {Object} simulationStore - Pinia Store 實例 (用於保存最後發送的數據)
   * @returns {Promise<Object>} API 響應結果
   */
  async sendData(dataToSend, simulationStore = null) {
    try {
      // 1. 確保數據是陣列格式
      let allIntersectionData = this._ensureArrayFormat(dataToSend)

      // 2. 正規化數據 (應用 VD 映射與時段特徵)
      let normalizedDataArray = allIntersectionData.map((data) => this._normalizeData(data))

      // 3. 數據品質驗證與修正
      const firstData = normalizedDataArray[0] || {}
      const timePeriod = firstData.scenario || getCurrentTimePeriod()
      validateAndRectifyDataArray(normalizedDataArray, timePeriod)

      // 4. 應用流量調整 (基於配置文件)
      let finalDataToSend = normalizedDataArray
      if (GREEN_LIGHT_PREDICTION_CONFIG.ENABLE_VOLUME_ADJUSTMENT) {
        finalDataToSend = this._applyVolumeAdjustment(normalizedDataArray)
      }

      // 5. 保存數據快照 (Store)
      if (simulationStore) {
        simulationStore.setLastApiVDDataArray(finalDataToSend)
      }

      // 為了相容性，也更新全局變數 (雖然已廢棄)
      if (typeof window !== 'undefined') {
        window.lastNormalizedDataArray = normalizedDataArray
      }

      // 6. 發送 API
      logInfo('🚦 [Service] 發送 VD 數據到後端 AI 系統...')

      // 🎯 【調試】輸出四個方向的 Object 陣列到 Console，方便複製測試
      console.log('📋 [發送 API - 四個路口數據] 複製以下陣列進行測試:')
      console.log(finalDataToSend)

      // 發送事件通知前端
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trafficApiSending', { detail: { timestamp: new Date().toISOString() } }))
      }

      const response = await fetchWithRetry(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalDataToSend),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      logInfo('✅ [Service] API 發送成功，收到預測結果')

      // 發送完成事件
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('trafficApiComplete', { detail: { timestamp: new Date().toISOString(), response: result } }),
        )
      }

      return result
    } catch (error) {
      logError(`❌ [Service] API 發送失敗: ${error.message}`)
      throw error
    }
  }

  /**
   * 確保數據為陣列格式 (內部輔助方法)
   */
  _ensureArrayFormat(dataToSend) {
    if (Array.isArray(dataToSend)) {
      return dataToSend
    } else if (dataToSend && typeof dataToSend === 'object') {
      // 單個物件，擴展為 4 筆
      const directions = [
        { id: 'VLRJX20', name: '東向' },
        { id: 'VLRJM60', name: '西向' },
        { id: 'VLRJX00', name: '南向' },
        { id: 'VLRJX00', name: '北向' },
      ]
      return directions.map((direction, index) => ({
        ...dataToSend,
        VD_ID: direction.id,
        LaneID: index,
        Direction: direction.name,
      }))
    } else {
      throw new Error('Invalid data format')
    }
  }

  /**
   * 正規化單筆數據 (內部輔助方法)
   */
  _normalizeData(singleData) {
    // 如果已經是完整的 API 格式，直接返回
    if (singleData.Volume_M !== undefined && singleData.Volume_T === 0) {
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

    // 否則進行時段特徵對齊
    const timePeriod = getCurrentTimePeriod()

    // 容錯：檢查時段轉換
    if (timePeriod !== this.lastTimePeriod) {
      this.timePeriodChangeCount++
      this.lastTimePeriod = timePeriod
    }

    let intersectionId = singleData?.VD_ID || 'VLRJM60'
    const validIds = ['VLRJM60', 'VLRJX00', 'VLRJX20']
    if (!validIds.includes(intersectionId)) intersectionId = 'VLRJM60'

    // 獲取 VD 映射
    const mappedHour = getRandomHourForTimeSlot(timePeriod)
    const mappedVehicleCount = getRandomVehicleCountForTimeSlot(timePeriod)

    // 計算車型分佈
    const vehicleTypeRatios = {
      peak_hours: { M: 0.35, S: 0.45, L: 0.2 },
      off_peak: { M: 0.3, S: 0.5, L: 0.2 },
      late_night: { M: 0.25, S: 0.55, L: 0.2 },
    }
    const ratios = vehicleTypeRatios[timePeriod] || vehicleTypeRatios.off_peak

    const mappedVolumeM = Math.round(mappedVehicleCount * ratios.M)
    const mappedVolumeS = Math.round(mappedVehicleCount * ratios.S)
    const mappedVolumeL = Math.round(mappedVehicleCount * ratios.L)

    // 計算加權平均速度
    const totalVolume = mappedVolumeM + mappedVolumeS + mappedVolumeL
    const weightedSpeed =
      totalVolume > 0
        ? Math.round(
            ((singleData.Speed_M || 0) * mappedVolumeM +
              (singleData.Speed_S || 0) * mappedVolumeS +
              (singleData.Speed_L || 0) * mappedVolumeL) /
              totalVolume,
          )
        : singleData.Speed || 30

    const apiData = {
      VD_ID: singleData.VD_ID,
      DayOfWeek: singleData.DayOfWeek,
      Hour: mappedHour,
      Minute: singleData.Minute,
      Second: singleData.Second,
      IsPeakHour: singleData.IsPeakHour,
      LaneID: singleData.LaneID,
      LaneType: singleData.LaneType,
      Speed: weightedSpeed,
      Occupancy: singleData.Occupancy || 0,
      Volume_M: Math.round(mappedVolumeM),
      Speed_M: singleData.Speed_M || 0,
      Volume_S: Math.round(mappedVolumeS),
      Speed_S: singleData.Speed_S,
      Volume_L: Math.round(mappedVolumeL),
      Speed_L: singleData.Speed_L,
      Volume_T: 0,
      Speed_T: 0,
    }

    // 添加元數據 (不可枚舉)
    Object.defineProperty(apiData, 'scenario', { value: timePeriod, enumerable: false })
    Object.defineProperty(apiData, 'weather', { value: 'CLEAR', enumerable: false })
    Object.defineProperty(apiData, 'weather_multiplier', { value: 1.0, enumerable: false })

    return apiData
  }

  /**
   * 應用流量調整 (內部輔助方法)
   */
  _applyVolumeAdjustment(dataArray) {
    const currentHour = new Date().getHours()
    const volumeAdjustment = getAdjustmentCoefficient('volume', currentHour)

    return dataArray.map((data) => ({
      ...data,
      Volume_M: Math.max(1, Math.round((data.Volume_M || 0) * volumeAdjustment)),
      Volume_S: Math.max(1, Math.round((data.Volume_S || 0) * volumeAdjustment)),
      Volume_L: Math.max(1, Math.round((data.Volume_L || 0) * volumeAdjustment)),
    }))
  }
}
