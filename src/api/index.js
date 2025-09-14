import axios from 'axios'

// 建立 axios 實例
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? 'https://your-production-api.com/api' : 'http://localhost:8000/api', // 假設後端使用 8000 port
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

/**
 * 交通資料相關 API
 */
export const trafficAPI = {
  /**
   * 取得交通視覺化資料
   * @param {Object} params - 查詢參數
   * @param {string} params.startDate - 開始日期 (YYYY-MM-DD)
   * @param {string} params.endDate - 結束日期 (YYYY-MM-DD)
   * @param {string[]} params.vdIds - VD ID 列表 (可選)
   * @param {number} params.page - 頁碼 (可選，預設為 1)
   * @param {number} params.limit - 每頁筆數 (可選，預設為 100)
   * @returns {Promise} API 響應
   */
  getVisualizationData: (params) => {
    return api.get('/traffic/visualization', { params })
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
          Volume_T: Math.floor(Math.random() * 20) + 2,
          Speed_T: Math.random() * 10 + 25,
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
