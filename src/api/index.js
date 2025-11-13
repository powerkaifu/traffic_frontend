import axios from 'axios'

// ============================================
// Axios 配置 (交通後端 API)
// ============================================

// 建立 axios 實例
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  timeout: 30000, // ⏱️ 增加超時時間從 10s 到 30s，應對大數據量查詢
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================
// OpenAI API 配置
// ============================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 可以在這裡添加認證 token
    // const token = localStorage.getItem('auth_token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  },
)

// ============================================
// OpenAI 相關函數
// ============================================

/**
 * 準備交通數據摘要，避免傳送過大的資料量
 * @param {Array} trafficData - 原始交通數據
 * @param {Object} summaryStats - 統計摘要
 * @param {Array} detailStats - 詳細統計
 * @param {string} dateRange - 日期範圍
 * @returns {string} 格式化的數據摘要
 */
export function prepareTrafficDataSummary(trafficData, summaryStats, detailStats, dateRange) {
  // 計算時間跨度
  const timeSpan =
    trafficData.length > 0
      ? {
          startTime: new Date(Math.min(...trafficData.map((d) => new Date(d.group.timestamp)))),
          endTime: new Date(Math.max(...trafficData.map((d) => new Date(d.group.timestamp)))),
          totalRecords: trafficData.length,
        }
      : null

  // 找出流量最高和最低的時段
  const volumeStats = trafficData.map((item) => ({
    timestamp: item.group.timestamp,
    totalVolume: item.intersections.reduce((sum, intersection) => sum + intersection.total_volume, 0),
    eastWest: item.group.east_west_seconds,
    southNorth: item.group.south_north_seconds,
  }))

  const highestVolume = volumeStats.reduce(
    (max, curr) => (curr.totalVolume > max.totalVolume ? curr : max),
    volumeStats[0] || {},
  )
  const lowestVolume = volumeStats.reduce(
    (min, curr) => (curr.totalVolume < min.totalVolume ? curr : min),
    volumeStats[0] || {},
  )

  // 按小時分組統計
  const hourlyStats = {}
  trafficData.forEach((item) => {
    const hour = new Date(item.group.timestamp).getHours()
    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { volumes: [], eastWest: [], southNorth: [] }
    }
    const totalVolume = item.intersections.reduce((sum, intersection) => sum + intersection.total_volume, 0)
    hourlyStats[hour].volumes.push(totalVolume)
    hourlyStats[hour].eastWest.push(item.group.east_west_seconds)
    hourlyStats[hour].southNorth.push(item.group.south_north_seconds)
  })

  // 計算每小時平均值
  const hourlyAverages = Object.entries(hourlyStats)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      avgVolume: Math.round(data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length),
      avgEastWest: Math.round(data.eastWest.reduce((a, b) => a + b, 0) / data.eastWest.length),
      avgSouthNorth: Math.round(data.southNorth.reduce((a, b) => a + b, 0) / data.southNorth.length),
    }))
    .sort((a, b) => a.hour - b.hour)

  // 找出尖峰時段（流量最高的前3個小時）
  const peakHours = hourlyAverages
    .sort((a, b) => b.avgVolume - a.avgVolume)
    .slice(0, 3)
    .map((h) => `${h.hour}:00 (平均流量: ${h.avgVolume})`)

  return `
## 交通數據分析摘要
**查詢期間**: ${dateRange}
**數據時間跨度**: ${timeSpan ? `${timeSpan.startTime.toLocaleString()} ~ ${timeSpan.endTime.toLocaleString()}` : '無數據'}
**總記錄數**: ${timeSpan ? timeSpan.totalRecords : 0} 筆

### 基本統計
- 平均東西向燈號秒數: ${summaryStats.avgEastWest}秒
- 平均南北向燈號秒數: ${summaryStats.avgSouthNorth}秒
- 總交通流量: ${summaryStats.totalVolume}
- 平均車速: ${summaryStats.avgSpeed} km/h

### 流量分析
- 最高流量時段: ${highestVolume?.timestamp ? new Date(highestVolume.timestamp).toLocaleString() : '無'} (流量: ${highestVolume?.totalVolume || 0})
  - 當時燈號: 東西向${highestVolume?.eastWest || 0}秒, 南北向${highestVolume?.southNorth || 0}秒
- 最低流量時段: ${lowestVolume?.timestamp ? new Date(lowestVolume.timestamp).toLocaleString() : '無'} (流量: ${lowestVolume?.totalVolume || 0})
  - 當時燈號: 東西向${lowestVolume?.eastWest || 0}秒, 南北向${lowestVolume?.southNorth || 0}秒

### 尖峰時段 (前3名)
${peakHours.map((peak, i) => `${i + 1}. ${peak}`).join('\n')}

### VD站點統計
${detailStats
  .slice(0, 5)
  .map(
    (stat) =>
      `- ${stat.vd_id}: 平均流量 ${stat.avg_volume}, 平均速度 ${stat.avg_speed.toFixed(1)} km/h, 尖峰時段比例 ${(stat.peak_hours * 100).toFixed(1)}%`,
  )
  .join('\n')}

### 每小時平均數據
${hourlyAverages
  .map(
    (h) =>
      `${h.hour.toString().padStart(2, '0')}:00 - 流量: ${h.avgVolume}, 東西向: ${h.avgEastWest}秒, 南北向: ${h.avgSouthNorth}秒`,
  )
  .join('\n')}
  `.trim()
}

/**
 * 呼叫 OpenAI API 進行智能分析
 * @param {string} question - 使用者選擇的問題
 * @param {string} dataSummary - 格式化的數據摘要
 * @returns {Promise<string>} AI 分析結果
 */
export async function analyzeTrafficDataWithAI(question, dataSummary) {
  if (!API_KEY) {
    throw new Error('OpenAI API Key 未設定，請檢查 .env 檔案')
  }

  const prompt = `你是一位專業的交通工程師和數據分析師。請根據以下交通數據，回答使用者的問題。

${dataSummary}

**使用者問題**: ${question}

請以專業但易懂的方式回答，並提供具體的見解和建議。回答請用中文，並使用以下格式：

## 🚦 分析結果

### 📊 主要發現
[條列重點發現]

### ⚠️ 異常或注意事項
[如有異常情況，請指出]

### 💡 優化建議
[提供具體的改善建議]

### 📈 總結
[簡潔的總結]
`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一位專業的交通工程師和數據分析師，擅長分析交通流量與燈號數據，提供專業見解和優化建議。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`OpenAI API 錯誤: ${response.status} - ${errorData.error?.message || '未知錯誤'}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || '抱歉，無法生成分析結果'
}

/**
 * 預定義的分析問題列表 (操作者感興趣的問題)
 */
export const ANALYSIS_QUESTIONS = [
  {
    value: 'traffic_overview',
    label: '這段期間內各路口的整體車流量分佈如何？哪個時段最繁忙？',
  },
  {
    value: 'peak_hours_analysis',
    label: '識別這段期間的交通尖峰時段，並分析每個尖峰的持續時間',
  },
  {
    value: 'congestion_diagnosis',
    label: '根據速度與占有率數據，找出交通擁堵最嚴重的時段與路口',
  },
  {
    value: 'signal_timing_evaluation',
    label: '評估當前號誌配時對這段期間交通流暢度的影響',
  },
  {
    value: 'optimization_recommendations',
    label: '基於這段期間的數據表現，建議如何調整號誌時間以改善效率？',
  },
]

// ============================================
// 交通資料相關 API
// ============================================

/**
 * 交通資料相關 API
 */
export const trafficAPI = {
  /**
   * 取得交通視覺化資料
   * @param {Object} params - 查詢參數
   * @param {string} params.startDate - 開始日期 (YYYY-MM-DD)
   * @param {string} params.endDate - 結束日期 (YYYY-MM-DD)
   * @returns {Promise} API 響應
   */
  getVisualizationData: async (params) => {
    try {
      console.log('API 呼叫參數:', params)
      const requestParams = {
        start_date: params.startDate,
        end_date: params.endDate,
      }
      console.log('實際請求參數:', requestParams)

      // 由於響應攔截器會自動返回 response.data，這裡直接獲取數據
      const data = await api.get('/traffic/query/', {
        params: requestParams,
      })

      console.log('API 響應數據:', data)

      return data
    } catch (error) {
      console.error('API 呼叫錯誤:', error)
      if (error.response) {
        console.error('錯誤狀態:', error.response.status)
        console.error('錯誤數據:', error.response.data)
      } else if (error.request) {
        console.error('網路錯誤，無響應:', error.request)
      } else {
        console.error('請求配置錯誤:', error.message)
      }
      throw error
    }
  },

  /**
   * 轉換後端數據格式為前端需要的格式
   * @param {Object} backendResponse - 後端返回的原始響應
   * @returns {Object} 轉換後的數據格式
   */
  transformBackendData: (backendResponse) => {
    console.log('transformBackendData 收到的數據:', backendResponse)

    // 檢查後端響應是否已經是正確的格式
    if (backendResponse && backendResponse.data && Array.isArray(backendResponse.data)) {
      console.log('後端數據已經是正確格式，直接返回')
      return backendResponse
    }

    // 如果是舊格式的數組數據，進行轉換
    const dataArray = Array.isArray(backendResponse) ? backendResponse : backendResponse?.data || []

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      console.log('沒有找到有效的數據數組')
      return {
        query_info: {
          period: '',
          data_points: 0,
        },
        data: [],
      }
    }

    console.log('開始轉換數據，數據量:', dataArray.length)
    return backendResponse
  },

  /**
   * 取得最近一週的交通資料
   * @param {Object} options - 查詢選項
   * @param {string[]} options.vdIds - VD ID 列表 (可選)
   * @returns {Promise} API 響應
   */
  getRecentWeekData: (options = {}) => {
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 7)

    const params = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit: 1000, // 一週的資料可能比較多
      ...options,
    }

    return api.get('/traffic/visualization', { params })
  },

  /**
   * 取得特定時間點的詳細資料
   * @param {string} groupId - 群組 ID
   * @param {string} timestamp - 時間戳記
   * @returns {Promise} API 響應
   */
  getDetailData: (groupId, timestamp) => {
    return api.get(`/traffic/detail/${groupId}`, {
      params: { timestamp },
    })
  },

  /**
   * 取得可用的 VD 站點列表
   * @returns {Promise} API 響應
   */
  getVDStations: () => {
    return api.get('/traffic/vd-stations')
  },

  /**
   * 取得交通統計摘要
   * @param {Object} params - 查詢參數
   * @param {string} params.startDate - 開始日期
   * @param {string} params.endDate - 結束日期
   * @param {string} params.groupBy - 分組方式 (hour, day, week)
   * @returns {Promise} API 響應
   */
  getTrafficSummary: (params) => {
    return api.get('/traffic/summary', { params })
  },
}

/**
 * 模擬資料產生器 (開發階段使用)
 */
export const mockDataGenerator = {
  /**
   * 產生模擬的視覺化資料
   * @param {Object} params - 參數
   * @param {string} params.startDate - 開始日期
   * @param {string} params.endDate - 結束日期
   * @returns {Promise} 模擬資料
   */
  generateVisualizationData: async (params) => {
    // 模擬 API 延遲
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const startDate = new Date(params.startDate)
    const endDate = new Date(params.endDate)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    const dataPoints = daysDiff * 24 // 每小時一個資料點

    const data = []
    const vdIds = ['VLRJX20', 'VLRJX00', 'VLRJM60']

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = new Date(startDate)
      timestamp.setHours(timestamp.getHours() + i)

      const groupData = {
        group: {
          group_id: `group-${i}`,
          timestamp: timestamp.toISOString(),
          east_west_seconds: Math.floor(Math.random() * 40) + 40, // 40-80秒
          south_north_seconds: Math.floor(Math.random() * 40) + 40,
        },
        intersections: vdIds.map((vdId, index) => ({
          id: i * 3 + index + 1,
          VD_ID: vdId,
          DayOfWeek: timestamp.getDay(),
          Hour: timestamp.getHours(),
          Minute: timestamp.getMinutes(),
          Second: 0,
          IsPeakHour:
            (timestamp.getHours() >= 7 && timestamp.getHours() <= 9) ||
            (timestamp.getHours() >= 17 && timestamp.getHours() <= 19),
          LaneID: 0,
          LaneType: 1,
          Speed: Math.random() * 30 + 30, // 30-60 km/h
          Occupancy: Math.random() * 30 + 5, // 5-35%
          Volume_M: Math.floor(Math.random() * 150) + 50,
          Speed_M: Math.random() * 20 + 40,
          Volume_S: Math.floor(Math.random() * 100) + 30,
          Speed_S: Math.random() * 20 + 45,
          Volume_L: Math.floor(Math.random() * 50) + 10,
          Speed_L: Math.random() * 15 + 30,
          Volume_T: 0, // ✅ 聯結車禁止進入，必定為 0
          Speed_T: 0, // ✅ 聯結車禁止進入，必定為 0
          total_volume: 0, // 將在下面計算
          created_at: timestamp.toISOString(),
        })),
      }

      // 計算總流量
      groupData.intersections.forEach((intersection) => {
        intersection.total_volume =
          intersection.Volume_M + intersection.Volume_S + intersection.Volume_L + intersection.Volume_T
      })

      data.push(groupData)
    }

    return {
      query_info: {
        period: `${params.startDate} ~ ${params.endDate}`,
        data_points: dataPoints,
      },
      data,
    }
  },
}

export default api
