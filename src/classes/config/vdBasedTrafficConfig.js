/**
 * ====================================================================
 * VD 真實數據範圍交通場景配置
 *
 * 【IMPORTANT】數據收集週期說明
 * ================================================================================
 * API 發送週期：南北向 倒數 10 秒 / 東西向 倒數 10 秒
 *
 * 【時間轉換】
 *  - 配置中的 totalVolumePer5Min 是指【5分鐘】的目標車流
 *  - API 實際【每 10 秒】發送一次數據
 *  - 轉換公式：10秒的體積 = 5分鐘的體積 × (10秒/300秒) = 5分鐘的體積 / 30
 *
 * 【轉換範例】
 *  - 5 分鐘目標 12 輛 → 10 秒目標 = 12/30 = 0.4 輛 ≈ 0-1 輛（隨機）
 *  - 5 分鐘目標 6 輛 → 10 秒目標 = 6/30 = 0.2 輛 ≈ 0-1 輛（隨機）
 *  - 5 分鐘目標 2 輛 → 10 秒目標 = 2/30 = 0.067 輛 ≈ 0 輛（偶爾出現）
 *
 * 【數據流程】（以南北向為例）
 *  1. 倒數 25-10 秒：收集車輛到 this.vehicleData
 *  2. 倒數 10 秒 ⏰【觸發】：
 *     ├─ collectIntersectionData() → 讀取累積數據 + 隨機速度 → 生成 vdData
 *     ├─ sendDataToBackend() → VD 特徵映射 + 加權平均 → 發送 18 欄位 API
 *     └─ updateFeatureSimulationDisplay() → 更新前端面板
 *  3. 倒數 9-0 秒：繼續收集新車輛
 *  4. 倒數 0 秒：重置，進入下一週期
 * ================================================================================
 */

/**
 * ====================================================================
 * 【改進】時段系統優先級說明
 * ====================================================================
 *
 * 【雙層時段系統架構】
 *
 * 層級 1 - vdBasedTimeScenarios（3個時段）
 *   用途：用戶手動選擇的時段（UI 的「尖峰」「離峰」「凌晨」按鈕）
 *   適用：手動模式、測試模式
 *   優先級：⭐⭐⭐⭐⭐ 最高（用戶明確指定）
 *
 * 層級 2 - vdBased24HourProfiles（10個時段）
 *   用途：自動模式下的細粒度時段（根據當前實時時間）
 *   適用：自動模式、系統自適應
 *   優先級：⭐⭐⭐ 中（當用戶未手動選擇時）
 *
 * 【優先級邏輯】
 * if (用戶手動選擇了時段) {
 *   使用 vdBasedTimeScenarios 中對應的配置
 * } else if (系統在自動模式) {
 *   使用 vdBased24HourProfiles 根據當前小時選擇配置
 * } else {
 *   使用預設配置（off_peak）
 * }
 *
 * 【重要】兩個系統的數據應該保持【相容性】：
 *   - 尖峰時段配置 ≈ 07:00-09:00 和 17:00-19:00 的 24H 配置
 *   - 離峰時段配置 ≈ 09:00-16:00 和 19:00-22:00 的 24H 配置
 *   - 凌晨時段配置 ≈ 23:00-06:00 的 24H 配置
 * ====================================================================
 */

export const vdBasedTimeScenarios = [
  // ========================================
  // 🚀 尖峰時段（早上7-9點，傍晚17-19點）
  // ========================================
  {
    key: 'peak_hours',
    name: '尖峰時段',
    shortName: '尖峰',
    icon: '🚀',
    timeRange: '07:00-09:00,17:00-19:00',

    // 目標特徵值（傳送給後端）
    targetFeatures: {
      totalVolumePer5Min: 12, // 總車流：12輛/5分鐘（高流量）
      totalVolumePer10Sec: 0.4, // 【改進】10秒內目標 = 12/30 ≈ 0.4輛（實際 0-1輛）
      occupancyRange: [15, 25], // 佔有率：15-25%（尖峰但不過度）
      speedRange: [20, 35], // 速度：20-35 km/h（慢速）

      // 各車種流量（基於VD VLRJX20 尖峰時段數據）
      // 【改進】註明 5 分鐘數值，以及對應的 10 秒數值
      volumeByType: {
        motor: 5, // 機車：5輛/5分鐘 → 10秒約 0.17輛 (0-1輛隨機)
        small: 6, // 小客車：6輛/5分鐘 → 10秒約 0.2輛 (0-1輛隨機)
        large: 1, // 大客車：1輛/5分鐘 → 10秒約 0.033輛 (0輛為主)
      },

      // 各車種速度（基於VD數據平均值）
      speedByType: {
        motor: { min: 32, max: 42 }, // 機車速度：32-42 km/h（尖峰壅塞時速度下降）
        small: { min: 25, max: 35 }, // 小客車速度：25-35 km/h
        large: { min: 18, max: 25 }, // 大客車速度：18-25 km/h（壅塞時較慢）
      },
    },

    config: {
      // 生成間隔：目標12輛/5分鐘 → 300/12 = 25秒/輛
      interval: {
        min: 2000, // 最快2秒一台（極端尖峰）
        max: 5000, // 最慢5秒一台
        normal: 3000, // 基礎3秒一台（10輛/5分鐘）
      },

      // 流量強度：4.0表示非常密集，實際間隔 = 3000/4.0 = 750ms
      // 這樣可達到約13-15輛/5分鐘
      peakMultiplier: 4.0,

      // 【修復】車型權重統一為 volumeByType 的比例
      // volumeByType 計算：motor 5/12=41.7%, small 6/12=50%, large 1/12=8.3%
      vehicleTypes: [
        { type: 'motor', weight: 42 }, // 機車 42% (對應 5/12=41.7%)
        { type: 'small', weight: 50 }, // 小客車 50% (對應 6/12=50%)
        { type: 'large', weight: 8 }, // 大客車 8% (對應 1/12=8.3%)
      ],

      maxLiveVehicles: 60, // 尖峰時段允許較多車輛同時在場

      description: '尖峰時段 - 高流量、高佔有率、低速度',

      // VD數據對應說明
      vdReference: {
        primary: 'VLRJX20', // 主要參考（東向，易壅塞）
        occupancyAvg: 24.1, // VD平均佔有率
        speedAvg: 28.0, // VD平均速度
        volumeAvg: 4.3, // VD平均流量（小客車）
        note: '模擬尖峰時段，流量提升至VD最大值範圍',
      },
    },
  },

  // ========================================
  // 🌞 離峰時段（上午9-16點，晚上19-22點）
  // ========================================
  {
    key: 'off_peak',
    name: '離峰時段',
    shortName: '離峰',
    icon: '🌞',
    timeRange: '09:00-16:00,19:00-22:00',

    // 目標特徵值（傳送給後端）
    targetFeatures: {
      totalVolumePer5Min: 6, // 總車流：6輛/5分鐘（中等流量）
      totalVolumePer10Sec: 0.2, // 【改進】10秒內目標 = 6/30 = 0.2輛（實際 0-1輛）
      occupancyRange: [15, 30], // 佔有率：15-30%（一般）
      speedRange: [30, 45], // 速度：30-45 km/h（正常速度）

      // 各車種流量（基於VD VLRJM60 離峰時段數據）
      // 【改進】註明 5 分鐘數值，以及對應的 10 秒數值
      volumeByType: {
        motor: 2, // 機車：2輛/5分鐘 → 10秒約 0.067輛 (0輛為主)
        small: 3, // 小客車：3輛/5分鐘 → 10秒約 0.1輛 (0-1輛隨機)
        large: 1, // 大客車：1輛/5分鐘 → 10秒約 0.033輛 (0輛為主)
      },

      // 各車種速度（離峰時段速度較快）
      speedByType: {
        motor: { min: 40, max: 48 }, // 機車速度：40-48 km/h（流暢）
        small: { min: 32, max: 40 }, // 小客車速度：32-40 km/h
        large: { min: 30, max: 38 }, // 大客車速度：30-38 km/h
      },
    },

    config: {
      // 生成間隔：目標6輛/5分鐘 → 300/6 = 50秒/輛
      interval: {
        min: 4000, // 最快4秒一台
        max: 10000, // 最慢10秒一台
        normal: 6000, // 基礎6秒一台（5輛/5分鐘）
      },

      // 流量強度：2.5表示中等密集，實際間隔 = 6000/2.5 = 2400ms
      // 這樣可達到約6-8輛/5分鐘
      peakMultiplier: 2.5,

      // 【修復】車型權重統一為 volumeByType 的比例
      // volumeByType 計算：motor 2/6=33.3%, small 3/6=50%, large 1/6=16.7%
      vehicleTypes: [
        { type: 'motor', weight: 33 }, // 機車 33% (對應 2/6=33.3%)
        { type: 'small', weight: 50 }, // 小客車 50% (對應 3/6=50%)
        { type: 'large', weight: 17 }, // 大客車 17% (對應 1/6=16.7%)
      ],

      maxLiveVehicles: 40, // 離峰時段車輛數中等

      description: '離峰時段 - 中等流量、正常佔有率、正常速度',

      // VD數據對應說明
      vdReference: {
        primary: 'VLRJM60', // 主要參考（西向，中等流量）
        occupancyAvg: 15.5,
        speedAvg: 34.8,
        volumeAvg: 4.5,
        note: '模擬一般交通狀況，接近VD平均值',
      },
    },
  },

  // ========================================
  // 🌙 凌晨時段（晚上23點-早上6點）
  // ========================================
  {
    key: 'late_night',
    name: '凌晨時段',
    shortName: '凌晨',
    icon: '🌙',
    timeRange: '23:00-06:00',

    // 目標特徵值（傳送給後端）
    targetFeatures: {
      totalVolumePer5Min: 2, // 總車流：2輛/5分鐘（低流量）
      totalVolumePer10Sec: 0.067, // 【改進】10秒內目標 = 2/30 ≈ 0.067輛（基本 0輛）
      occupancyRange: [5, 15], // 佔有率：5-15%（順暢）
      speedRange: [40, 60], // 速度：40-60 km/h（高速）

      // 各車種流量（基於VD數據凌晨時段推估）
      // 【改進】註明 5 分鐘數值，以及對應的 10 秒數值
      volumeByType: {
        motor: 1, // 機車：1輛/5分鐘 → 10秒約 0.033輛 (0輛為主)
        small: 1, // 小客車：1輛/5分鐘 → 10秒約 0.033輛 (0輛為主)
        large: 0, // 大客車：0輛/5分鐘 → 10秒 0輛（凌晨很少）
      },

      // 各車種速度（凌晨速度較快）
      speedByType: {
        motor: { min: 50, max: 60 }, // 機車速度：50-60 km/h（接近VD最高速）
        small: { min: 45, max: 55 }, // 小客車速度：45-55 km/h
        large: { min: 40, max: 52 }, // 大客車速度：40-52 km/h
      },
    },

    config: {
      // 生成間隔：目標2輛/5分鐘 → 300/2 = 150秒/輛
      interval: {
        min: 15000, // 最快15秒一台
        max: 40000, // 最慢40秒一台
        normal: 25000, // 基礎25秒一台（~2.4輛/5分鐘）
      },

      // 流量強度：1.0表示正常，不加速生成
      // 實際間隔 = 25000/1.0 = 25000ms
      peakMultiplier: 1.0,

      // 【修復】車型權重統一為 volumeByType 的比例
      // volumeByType 計算：motor 1/2=50%, small 1/2=50%, large 0/2=0%
      vehicleTypes: [
        { type: 'motor', weight: 50 }, // 機車 50% (對應 1/2=50%)
        { type: 'small', weight: 50 }, // 小客車 50% (對應 1/2=50%)
        { type: 'large', weight: 0 }, // 大客車 0% (對應 0/2=0% - 凌晨無大客車)
      ],

      maxLiveVehicles: 15, // 凌晨時段車輛數很少

      description: '凌晨時段 - 低流量、低佔有率、高速度',

      // VD數據對應說明
      vdReference: {
        primary: 'VLRJX00', // 主要參考（南北向，順暢）
        occupancyAvg: 15.4,
        speedAvg: 40.3,
        volumeAvg: 4.0,
        note: '模擬凌晨深夜，流量降至VD最小值範圍',
      },
    },
  },
]

/**
 * ====================================================================
 * 【改進】24 小時自動模式配置
 * ====================================================================
 *
 * 【改進說明】優先級 2 - 時段過渡與跨方向相關性
 * 
 * 1️⃣ 【統一車型權重】
 *    - 清晨 (06:00-07:00)：靠近離峰比例 → motor 33%, small 50%, large 17%
 *    - 早尖峰 (07:00-09:00)：完全使用尖峰比例 → motor 42%, small 50%, large 8%
 *    - 下午各時段：根據接近尖峰程度調整 → 33%-50%-17% 到 42%-50%-8%
 *    - 晚尖峰 (17:00-19:00)：完全使用尖峰比例 → motor 42%, small 50%, large 8%
 *    - 晚間 (19:00-23:00)：逐漸靠近離峰比例 → motor 33%, small 50%, large 17%
 *    - 深夜 (00:00-06:00)：完全使用凌晨比例 → motor 50%, small 50%, large 0%
 *
 * 2️⃣ 【跨方向相關性】
 *    南北向與東西向應該【同時執行】API 觸發，提升流量真實性
 *    - 尖峰時段：兩個方向都壅塞 → 同一時間高流量
 *    - 離峰時段：兩個方向都暢通 → 同一時間正常流量
 *    - 修改點：directionalCorrelation.enabled = true
 *
 * 3️⃣ 【異常情況處理】
 *    - 多個時段邊界時，使用線性過渡（20% + 80% 混合）
 *    - volumePerMin 為 0 時，使用 fallback 值
 *    - 同一時段內的配置不一致，使用驗證值進行糾正
 *
 * ====================================================================
 */
export const vdBased24HourProfiles = [
  // 00:00-06:00 深夜（凌晨低峰）
  {
    hourRange: [0, 6],
    description: '深夜時段',
    targetVolumePer5Min: 1.5, // 1-2輛/5分鐘
    occupancyTarget: 8, // 佔有率 8%
    speedTarget: 50, // 平均速度 50 km/h
    config: {
      interval: { min: 20000, max: 45000, normal: 30000 },
      peakMultiplier: 0.8,
      // 【修復】採用凌晨時段的比例：motor 50%, small 50%, large 0%
      vehicleTypes: [
        { type: 'motor', weight: 50 },   // 機車 50% (對應凌晨)
        { type: 'small', weight: 50 },   // 小客車 50% (對應凌晨)
        { type: 'large', weight: 0 },    // 大客車 0% (凌晨無大客車)
      ],
    },
    // 【改進】跨方向相關性
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],  // 南北向和東西向同時觸發
      phaseOffset: 0,  // 無相位偏差
    },
  },

  // 06:00-07:00 清晨（開始增加）
  {
    hourRange: [6, 7],
    description: '清晨時段',
    targetVolumePer5Min: 3, // 3輛/5分鐘
    occupancyTarget: 12, // 佔有率 12%
    speedTarget: 42, // 平均速度 42 km/h
    config: {
      interval: { min: 8000, max: 15000, normal: 10000 },
      peakMultiplier: 1.5,
      // 【修復】採用離峰時段的比例：motor 33%, small 50%, large 17%
      // 清晨是從深夜過渡到早尖峰，車型應該接近離峰
      vehicleTypes: [
        { type: 'motor', weight: 33 },   // 機車 33% (對應離峰)
        { type: 'small', weight: 50 },   // 小客車 50% (對應離峰)
        { type: 'large', weight: 17 },   // 大客車 17% (對應離峰)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
    },
  },

  // 07:00-09:00 早尖峰（最高峰）
  {
    hourRange: [7, 9],
    description: '早尖峰時段',
    targetVolumePer5Min: 14, // 14輛/5分鐘（最高）
    occupancyTarget: 55, // 佔有率 55%（高）
    speedTarget: 25, // 平均速度 25 km/h（慢）
    config: {
      interval: { min: 2000, max: 4500, normal: 2800 },
      peakMultiplier: 4.2,
      // 【修復】採用尖峰時段的比例：motor 42%, small 50%, large 8%
      vehicleTypes: [
        { type: 'motor', weight: 42 },   // 機車 42% (對應尖峰)
        { type: 'small', weight: 50 },   // 小客車 50% (對應尖峰)
        { type: 'large', weight: 8 },    // 大客車 8% (對應尖峰)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
      reason: '早尖峰時期，兩個方向都高流量，應同時觸發 API',
    },
  },

  // 09:00-11:00 上午（略降）
  {
    hourRange: [9, 11],
    description: '上午時段',
    targetVolumePer5Min: 7, // 7輛/5分鐘
    occupancyTarget: 22, // 佔有率 22%
    speedTarget: 38, // 平均速度 38 km/h
    config: {
      interval: { min: 4000, max: 8000, normal: 5500 },
      peakMultiplier: 2.8,
      // 【修復】採用離峰時段的比例：motor 33%, small 50%, large 17%
      vehicleTypes: [
        { type: 'motor', weight: 33 },   // 機車 33% (對應離峰)
        { type: 'small', weight: 50 },   // 小客車 50% (對應離峰)
        { type: 'large', weight: 17 },   // 大客車 17% (對應離峰)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
    },
  },

  // 11:00-14:00 午間（穩定）
  {
    hourRange: [11, 14],
    description: '午間時段',
    targetVolumePer5Min: 8, // 8輛/5分鐘
    occupancyTarget: 25, // 佔有率 25%
    speedTarget: 35, // 平均速度 35 km/h
    config: {
      interval: { min: 3500, max: 7000, normal: 5000 },
      peakMultiplier: 3.0,
      // 【修復】採用離峰時段的比例：motor 33%, small 50%, large 17%
      vehicleTypes: [
        { type: 'motor', weight: 33 },   // 機車 33% (對應離峰)
        { type: 'small', weight: 50 },   // 小客車 50% (對應離峰)
        { type: 'large', weight: 17 },   // 大客車 17% (對應離峰)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
    },
  },

  // 14:00-16:00 下午（略增）
  {
    hourRange: [14, 16],
    description: '下午時段',
    targetVolumePer5Min: 9, // 9輛/5分鐘
    occupancyTarget: 28, // 佔有率 28%
    speedTarget: 33, // 平均速度 33 km/h
    config: {
      interval: { min: 3000, max: 6500, normal: 4500 },
      peakMultiplier: 3.2,
      // 【修復】開始向尖峰過渡：motor 38%, small 50%, large 12%
      // (中間值：33% + 42%) / 2 ≈ 38%, (17% + 8%) / 2 ≈ 12%
      vehicleTypes: [
        { type: 'motor', weight: 38 },   // 機車 38% (過渡值)
        { type: 'small', weight: 50 },   // 小客車 50% (維持)
        { type: 'large', weight: 12 },   // 大客車 12% (過渡值)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
    },
  },

  // 16:00-17:00 傍晚前（開始壅塞）
  {
    hourRange: [16, 17],
    description: '傍晚前時段',
    targetVolumePer5Min: 11, // 11輛/5分鐘
    occupancyTarget: 38, // 佔有率 38%
    speedTarget: 30, // 平均速度 30 km/h
    config: {
      interval: { min: 2500, max: 5000, normal: 3500 },
      peakMultiplier: 3.8,
      // 【修復】更接近尖峰：motor 40%, small 50%, large 10%
      vehicleTypes: [
        { type: 'motor', weight: 40 },   // 機車 40% (接近尖峰)
        { type: 'small', weight: 50 },   // 小客車 50%
        { type: 'large', weight: 10 },   // 大客車 10%
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
    },
  },

  // 17:00-19:00 晚尖峰（第二高峰）
  {
    hourRange: [17, 19],
    description: '晚尖峰時段',
    targetVolumePer5Min: 13, // 13輛/5分鐘（第二高）
    occupancyTarget: 50, // 佔有率 50%
    speedTarget: 27, // 平均速度 27 km/h
    config: {
      interval: { min: 2200, max: 4800, normal: 3000 },
      peakMultiplier: 4.0,
      // 【修復】採用尖峰時段的比例：motor 42%, small 50%, large 8%
      vehicleTypes: [
        { type: 'motor', weight: 42 },   // 機車 42% (對應尖峰)
        { type: 'small', weight: 50 },   // 小客車 50% (對應尖峰)
        { type: 'large', weight: 8 },    // 大客車 8% (對應尖峰)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
      reason: '晚尖峰時期，兩個方向都高流量，應同時觸發 API',
    },
  },

  // 19:00-21:00 晚間（逐漸降低）
  {
    hourRange: [19, 21],
    description: '晚間時段',
    targetVolumePer5Min: 6, // 6輛/5分鐘
    occupancyTarget: 18, // 佔有率 18%
    speedTarget: 40, // 平均速度 40 km/h
    config: {
      interval: { min: 4500, max: 9000, normal: 6500 },
      peakMultiplier: 2.4,
      // 【修復】開始向離峰過渡：motor 37%, small 50%, large 13%
      vehicleTypes: [
        { type: 'motor', weight: 37 },   // 機車 37% (過渡值)
        { type: 'small', weight: 50 },   // 小客車 50% (維持)
        { type: 'large', weight: 13 },   // 大客車 13% (過渡值)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
    },
  },

  // 21:00-23:00 深夜前（持續降低）
  {
    hourRange: [21, 23],
    description: '深夜前時段',
    targetVolumePer5Min: 3.5, // 3-4輛/5分鐘
    occupancyTarget: 12, // 佔有率 12%
    speedTarget: 45, // 平均速度 45 km/h
    config: {
      interval: { min: 8000, max: 16000, normal: 11000 },
      peakMultiplier: 1.8,
      // 【修復】接近凌晨比例：motor 48%, small 50%, large 2%
      vehicleTypes: [
        { type: 'motor', weight: 48 },   // 機車 48% (靠近凌晨)
        { type: 'small', weight: 50 },   // 小客車 50% (靠近凌晨)
        { type: 'large', weight: 2 },    // 大客車 2% (逐漸減少)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
    },
  },

  // 23:00-24:00 深夜（回到低峰）
  {
    hourRange: [23, 24],
    description: '深夜時段',
    targetVolumePer5Min: 2, // 2輛/5分鐘
    occupancyTarget: 9, // 佔有率 9%
    speedTarget: 48, // 平均速度 48 km/h
    config: {
      interval: { min: 15000, max: 35000, normal: 22000 },
      peakMultiplier: 1.2,
      // 【修復】採用凌晨時段的比例：motor 50%, small 50%, large 0%
      vehicleTypes: [
        { type: 'motor', weight: 50 },   // 機車 50% (對應凌晨)
        { type: 'small', weight: 50 },   // 小客車 50% (對應凌晨)
        { type: 'large', weight: 0 },    // 大客車 0% (凌晨無大客車)
      ],
    },
    directionalCorrelation: {
      enabled: true,
      syncWithOpposite: ['VLRJX00', 'VLRJM60'],
      phaseOffset: 0,
    },
  },
]

/**
 * 根據時間獲取對應的24小時配置
 */
export function getVdBased24HourProfile(currentTime) {
  const hour = currentTime.getHours()

  for (const profile of vdBased24HourProfiles) {
    const [start, end] = profile.hourRange
    if (hour >= start && hour < end) {
      return {
        ...profile.config,
        description: profile.description,
        targetVolumePer5Min: profile.targetVolumePer5Min,
        occupancyTarget: profile.occupancyTarget,
        speedTarget: profile.speedTarget,
      }
    }
  }

  // 預設返回深夜配置
  return vdBased24HourProfiles[0]
}

/**
 * 流量強度拉桿映射表
 *
 * 用於將拉桿值(1-10)映射到合理的 peakMultiplier 和目標流量
 * 確保所有組合都在VD訓練數據範圍內
 */
export const intensityMapping = {
  // 拉桿值 1-2：極低流量（凌晨）
  1: { peakMultiplier: 0.5, volumePer5Min: 1, occupancy: 5, description: '極低流量' },
  2: { peakMultiplier: 0.8, volumePer5Min: 2, occupancy: 8, description: '很低流量' },

  // 拉桿值 3-4：低流量（深夜/凌晨）
  3: { peakMultiplier: 1.2, volumePer5Min: 3, occupancy: 12, description: '低流量' },
  4: { peakMultiplier: 1.6, volumePer5Min: 4, occupancy: 15, description: '較低流量' },

  // 拉桿值 5-6：中等流量（離峰）
  5: { peakMultiplier: 2.0, volumePer5Min: 5, occupancy: 18, description: '中等流量' },
  6: { peakMultiplier: 2.5, volumePer5Min: 6, occupancy: 22, description: '中高流量' },

  // 拉桿值 7-8：高流量（接近尖峰）
  7: { peakMultiplier: 3.0, volumePer5Min: 8, occupancy: 30, description: '高流量' },
  8: { peakMultiplier: 3.5, volumePer5Min: 10, occupancy: 40, description: '很高流量' },

  // 拉桿值 9-10：極高流量（尖峰）
  9: { peakMultiplier: 4.0, volumePer5Min: 12, occupancy: 50, description: '極高流量（尖峰）' },
  10: { peakMultiplier: 4.5, volumePer5Min: 15, occupancy: 60, description: '最高流量（擁堵）' },
}

/**
 * 生成間隔拉桿映射表
 *
 * 用於將拉桿值映射到基礎生成間隔
 * 這個間隔會再除以 peakMultiplier 得到實際間隔
 */
export const intervalMapping = {
  1: { normal: 30000, min: 25000, max: 40000, description: '最慢' }, // 30秒
  2: { normal: 20000, min: 15000, max: 30000, description: '很慢' }, // 20秒
  3: { normal: 12000, min: 10000, max: 18000, description: '慢' }, // 12秒
  4: { normal: 8000, min: 6000, max: 12000, description: '較慢' }, // 8秒
  5: { normal: 6000, min: 4000, max: 10000, description: '一般' }, // 6秒（預設）
  6: { normal: 5000, min: 3500, max: 8000, description: '較快' }, // 5秒
  7: { normal: 4000, min: 3000, max: 6000, description: '快' }, // 4秒
  8: { normal: 3000, min: 2000, max: 5000, description: '很快' }, // 3秒
  9: { normal: 2500, min: 1800, max: 4000, description: '極快' }, // 2.5秒
  10: { normal: 2000, min: 1500, max: 3000, description: '最快' }, // 2秒
}

/**
 * ====================================================================
 * 【新增】數據驗證規則框架 - 優先級 1 修復
 * ====================================================================
 *
 * 用於驗證生成的 API 數據是否符合配置和 VD 訓練範圍
 * 在發送 API 前執行驗證，確保數據有效性
 */
export const dataValidationRules = {
  // ========================================
  // 1. 車流量驗證（Volume 檢查）
  // ========================================
  volume: {
    // 每個方向、每次 API 調用的車流量限制
    volumePerDirection: {
      min: 0, // 最少 0 輛（允許無車輛）
      max: 5, // 最多 5 輛/10秒（對應 150 輛/5分鐘，合理上限）
      warn: 3, // 超過 3 輛警告
    },

    // Volume_T（聯結車）必須為 0
    volumeT: {
      required: 0,
      reason: '聯結車禁止進入，配置中所有 volumeT 均為 0',
    },

    // 車型比例檢查（按時段）
    typeDistribution: {
      // 尖峰時段：motor 42%, small 50%, large 8%
      peak_hours: {
        motor: { min: 35, max: 50 },
        small: { min: 42, max: 58 },
        large: { min: 0, max: 15 },
      },
      // 離峰時段：motor 33%, small 50%, large 17%
      off_peak: {
        motor: { min: 25, max: 42 },
        small: { min: 42, max: 58 },
        large: { min: 10, max: 25 },
      },
      // 凌晨時段：motor 50%, small 50%, large 0%
      late_night: {
        motor: { min: 40, max: 65 },
        small: { min: 35, max: 60 },
        large: { min: 0, max: 5 },
      },
    },
  },

  // ========================================
  // 2. 速度驗證（Speed 檢查）
  // ========================================
  speed: {
    // 全局速度限制（所有時段）
    global: {
      min: 10, // 最低速度 10 km/h（嚴重擁堵）
      max: 70, // 最高速度 70 km/h（高速公路極限）
    },

    // 時段特定的速度範圍
    byScenario: {
      peak_hours: {
        min: 15, // 尖峰時段最低 15 km/h
        max: 40, // 尖峰時段最高 40 km/h
      },
      off_peak: {
        min: 25,
        max: 50,
      },
      late_night: {
        min: 40,
        max: 65,
      },
    },

    // 車型速度關係（應該是：motor >= small >= large）
    typeRelationship: {
      rule: 'Speed_M >= Speed_S >= Speed_L',
      reason: '機車最快，小客車次之，大客車最慢',
      tolerance: 3, // 允許 ±3 km/h 的誤差
    },
  },

  // ========================================
  // 3. 佔有率驗證（Occupancy 檢查）
  // ========================================
  occupancy: {
    global: {
      min: 0, // 最低佔有率 0%
      max: 90, // 最高佔有率 90%（不能達到 100%）
    },

    byScenario: {
      peak_hours: {
        min: 10,
        max: 70, // 尖峰時段佔有率 10-70%
      },
      off_peak: {
        min: 5,
        max: 40,
      },
      late_night: {
        min: 0,
        max: 20,
      },
    },
  },

  // ========================================
  // 4. 時間戳記驗證（Time 檢查）
  // ========================================
  timestamp: {
    hour: { min: 0, max: 23 },
    minute: { min: 0, max: 59 },
    second: { min: 0, max: 59 },
    dayOfWeek: { min: 0, max: 6 },
    isPeakHour: { values: [0, 1] },
  },

  // ========================================
  // 5. 時段優先級配置
  // ========================================
  scenarioPriority: {
    1: '用戶手動選擇的時段（vdBasedTimeScenarios）- 最高優先級',
    2: '自動模式的 24 小時精細時段（vdBased24HourProfiles）- 中優先級',
    3: '預設配置（off_peak）- 回退值',
  },
}

/**
 * ====================================================================
 * 【改進】優先級 2.3 - 異常情況處理規則
 * ====================================================================
 * 
 * 處理邊界情況、配置衝突和異常數據
 */
export const edgeCaseHandling = {
  // 【時段邊界過渡】
  // 當 API 觸發時間跨越兩個不同時段配置時，使用線性過渡
  transitionRules: {
    enabled: true,
    description: '在時段邊界時進行平滑過渡（避免尖銳波動）',
    
    // 應用邏輯：
    // currentTime 在邊界時（如 09:00），此時應該取：
    // - 80% from 07:00-09:00 (early peak)
    // - 20% from 09:00-11:00 (morning)
    // 在接下來的 10 分鐘內逐漸變為：
    // - 50% + 50%
    // - 20% + 80%
    // - 最終完全切換到新時段
    
    blendDuration: 10 * 60 * 1000, // 過渡時間：10 分鐘
    blendSteps: 5, // 5 個過渡步驟
    
    example: {
      description: '在 07:00 切換時，使用下列權重混合',
      minute0: { previous: 80, current: 20 },
      minute2: { previous: 60, current: 40 },
      minute4: { previous: 40, current: 60 },
      minute6: { previous: 20, current: 80 },
      minute10: { previous: 0, current: 100 },
    },
  },

  // 【零流量情況】
  // 當計算得到的 volumePerMin = 0 時的處理
  zeroVolumeHandling: {
    enabled: true,
    description: '避免持續 0 流量導致的數據缺失',
    
    // 規則：每 N 次 API 調用後必須產生至少 1 輛車
    minimumVolumeFrequency: {
      peak_hours: 2,     // 尖峰時段：每 2 次調用生成 1 輛車
      off_peak: 3,       // 離峰時段：每 3 次調用生成 1 輛車
      late_night: 5,     // 凌晨時段：每 5 次調用生成 1 輛車
    },
    
    // 示例：
    // 如果計算得到連續 5 次都是 volume=0，在第 5 次時強制生成 1 輛車
    fallbackVolume: 1,    // 不得少於的最小流量
    
    vehicleTypePreference: {
      // 當被迫生成車輛時，優先選擇的車型
      peak_hours: 'small',    // 尖峰時段優先選小客車（流量配適）
      off_peak: 'motor',      // 離峰時段優先選機車（流量調適）
      late_night: 'motor',    // 凌晨優先選機車（最常見）
    },
  },

  // 【配置值衝突】
  // 同一時段內多個配置項不一致時的解決方案
  configurationConflict: {
    enabled: true,
    description: '檢測並修正配置中的內部矛盾',
    
    rules: [
      {
        conflictType: 'vehicleTypes 與 volumeByType 不匹配',
        detection: '檢查 vehicleTypes 的 weight 比例是否與 volumeByType 一致',
        resolution: 'priority: use volumeByType as ground truth，vehicleTypes 作為生成配置',
        priority: 1,
      },
      {
        conflictType: 'speedByType 不符合物理定律',
        detection: '檢查是否滿足：Speed_M >= Speed_S >= Speed_L',
        resolution: '若不符合，自動調整為滿足此不等式',
        priority: 2,
        correction: {
          ifMotorSlow: '提高 motor 速度至 small 以上',
          ifSmallFast: '降低 small 速度至 large 以下',
          ifLargeFast: '降低 large 速度至最低限制',
        },
      },
      {
        conflictType: 'occupancy 超過最大限制',
        detection: 'occupancy > 90%',
        resolution: '自動調整為 90% 以保持合理性',
        priority: 3,
      },
      {
        conflictType: '時段邊界配置跳躍太大',
        detection: '相鄰時段間的 targetVolume 差異 > 50%',
        resolution: '啟用平滑過渡（blendDuration 適用）',
        priority: 4,
      },
    ],
  },

  // 【跨方向相關性】
  // 當南北向和東西向應該協作時
  directionalCorrelationRules: {
    enabled: true,
    description: '確保南北向和東西向在尖峰時段同時高流量',
    
    // 配置了 directionalCorrelation.enabled = true 的時段
    syncedHourRanges: [
      { start: 7, end: 9, reason: '早尖峰 - 雙向都壅塞' },
      { start: 17, end: 19, reason: '晚尖峰 - 雙向都壅塞' },
    ],
    
    // 在同步時段內，兩個方向應該在同一時刻觸發 API
    // 實現方式：在 TrafficLightController 中添加檢查
    implementation: {
      check: '在觸發南北向 API 時，同時觸發東西向 API（如果在同步時段）',
      method: '使用 Promise.all() 或 async/await 確保兩個 API 同時發送',
      tolerance: 50, // 允許 50ms 的時間差異
    },
    
    fallback: {
      description: '若無法同時觸發，使用配置的 phaseOffset',
      phaseOffset: 0, // 默認無偏差
      maxOffset: 2000, // 最大允許偏差 2 秒
    },
  },

  // 【異常恢復機制】
  // 當系統檢測到異常時的恢復策略
  recoveryMechanism: {
    enabled: true,
    description: '當檢測到異常時自動恢復到已知的好狀態',
    
    triggers: [
      {
        condition: '連續 3 次 API 呼叫都違反 dataValidationRules',
        action: '切換到 off_peak 配置（最穩定的預設值）',
        logLevel: 'warn',
      },
      {
        condition: '某一方向連續 5 秒無法生成任何車輛',
        action: '強制應用 minimumVolumeFrequency 規則',
        logLevel: 'warn',
      },
      {
        condition: '時段配置加載失敗',
        action: '使用上一次成功的配置',
        logLevel: 'error',
        timeout: 5000, // 5 秒內嘗試重新加載
      },
    ],
  },

  // 【數據一致性檢查】
  // 確保相鄰 API 調用的數據不會有不合理的跳躍
  consistencyRules: {
    enabled: true,
    description: '檢查當前數據與歷史數據的合理性',
    
    checks: [
      {
        name: '速度變化檢查',
        rule: 'Math.abs(currentSpeed - previousSpeed) <= 15 km/h',
        description: '相鄰兩次 API 調用的速度變化不超過 15 km/h',
        action: '若超過則調整當前速度為前一個速度 ±15 km/h',
      },
      {
        name: '流量變化檢查',
        rule: 'Math.abs(currentVolume - previousVolume) <= 2 輛',
        description: '相鄰兩次 API 調用的流量變化不超過 2 輛',
        action: '若超過則調整當前流量為前一個流量 ±2',
      },
      {
        name: '佔有率變化檢查',
        rule: 'Math.abs(currentOccupancy - previousOccupancy) <= 20%',
        description: '相鄰兩次 API 調用的佔有率變化不超過 20%',
        action: '若超過則調整當前佔有率為前一個佔有率 ±20%',
      },
    ],
    
    // 保存歷史記錄用於比較
    historyWindowSize: 10, // 保留最近 10 次調用的記錄
  },
}


