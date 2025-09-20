// OpenAI API 模組
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

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
 * 預定義的分析問題列表
 */
export const ANALYSIS_QUESTIONS = [
  {
    value: 'peak_valley',
    label: '這段期間的交通流量有什麼高峰或低谷？',
    description: '分析流量變化趨勢，找出尖峰和離峰時段',
  },
  {
    value: 'anomaly_detection',
    label: '哪些時段或路口出現異常流量或燈號秒數？',
    description: '檢測異常數據，找出可能的問題點',
  },
  {
    value: 'correlation_analysis',
    label: '流量與燈號秒數之間有明顯的關聯性嗎？',
    description: '分析流量與燈號秒數的相關性',
  },
  {
    value: 'optimization_suggestions',
    label: '哪些路口或時段建議調整燈號設定以改善交通？',
    description: '基於數據提供燈號優化建議',
  },
  {
    value: 'traffic_summary',
    label: '請用簡單文字摘要這段期間的交通流量與燈號特性',
    description: '生成整體交通狀況摘要報告',
  },
  {
    value: 'efficiency_analysis',
    label: '這段期間的交通效率如何？有何改善空間？',
    description: '評估交通效率和改善建議',
  },
  {
    value: 'pattern_recognition',
    label: '交通數據中有哪些明顯的模式或規律？',
    description: '識別交通流量的模式和規律',
  },
]
