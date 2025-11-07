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

      // 車型權重（尖峰時段機車較多）
      vehicleTypes: [
        { type: 'motor', weight: 50 }, // 機車 50%
        { type: 'small', weight: 40 }, // 小客車 40%
        { type: 'large', weight: 10 }, // 大客車 10%
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

      // 車型權重（離峰時段小客車較多）
      vehicleTypes: [
        { type: 'motor', weight: 30 }, // 機車 30%
        { type: 'small', weight: 55 }, // 小客車 55%
        { type: 'large', weight: 15 }, // 大客車 15%
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

      // 車型權重（凌晨時段機車占大多數）
      vehicleTypes: [
        { type: 'motor', weight: 70 }, // 機車 70%（凌晨主要是機車）
        { type: 'small', weight: 25 }, // 小客車 25%
        { type: 'large', weight: 5 }, // 大客車 5%（很少）
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
 * 自動模式24小時交通模擬配置
 *
 * 用於30分鐘模擬每日車流的自動模式
 * 每個時段的配置確保傳送給後端的數據在VD訓練範圍內
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
      vehicleTypes: [
        { type: 'motor', weight: 75 },
        { type: 'small', weight: 20 },
        { type: 'large', weight: 5 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 55 },
        { type: 'small', weight: 35 },
        { type: 'large', weight: 10 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 55 },
        { type: 'small', weight: 38 },
        { type: 'large', weight: 7 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 35 },
        { type: 'small', weight: 50 },
        { type: 'large', weight: 15 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 38 },
        { type: 'small', weight: 47 },
        { type: 'large', weight: 15 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 42 },
        { type: 'small', weight: 45 },
        { type: 'large', weight: 13 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 48 },
        { type: 'small', weight: 42 },
        { type: 'large', weight: 10 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 52 },
        { type: 'small', weight: 40 },
        { type: 'large', weight: 8 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 45 },
        { type: 'small', weight: 45 },
        { type: 'large', weight: 10 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 60 },
        { type: 'small', weight: 32 },
        { type: 'large', weight: 8 },
      ],
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
      vehicleTypes: [
        { type: 'motor', weight: 70 },
        { type: 'small', weight: 25 },
        { type: 'large', weight: 5 },
      ],
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
