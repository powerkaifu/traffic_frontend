# VD 數據分析與配置建議

## 分析概述

- **分析日期**: 2025-10-24
- **數據範圍**: 2024-02-26 至 2024-03-10 (2週)
- **分析 VD**: VLRJM60, VLRJX00, VLRJX20
- **數據源**: 前端 vd_data 資料夾中的訓練模型數據

---

## 時段分類與特徵

基於分析的 VD 數據，將交通流量分為 5 個時段：

| 時段     | 時間        | 特徵                 | 每條車道平均車輛數 |
| -------- | ----------- | -------------------- | ------------------ |
| 早峰     | 07:00-09:59 | 上班時段，車流密集   | 8-9 輛             |
| 中午離峰 | 10:00-16:59 | 中午時段，車流較少   | 3-4 輛             |
| 晚峰     | 17:00-19:59 | 下班時段，車流最密集 | 10-11 輛           |
| 晚間離峰 | 20:00-23:59 | 晚間時段，車流少     | 1-2 輛             |
| 凌晨離峰 | 00:00-06:59 | 凌晨時段，車流很少   | 0-1 輛             |

---

## VLRJM60 推薦配置 (東西向主幹道)

```javascript
const VLRJM60_CONFIG = {
  name: 'VLRJM60',
  direction: 'east-west',
  description: '東西向主幹道',
  lanes: 2,

  timePeriods: {
    // 早峰時段: 07:00-09:59
    morning_peak: {
      hours: [7, 8, 9],
      avgVehiclesPerLane: 9,
      vehicleDistribution: {
        M: 0.35, // 機車佔 35%
        S: 0.65, // 小客車佔 65%
        L: 0.0, // 大客車
        T: 0.0, // 聯結車
      },
      averageSpeed: {
        M: 45, // 機車平均速度 45 km/h
        S: 42, // 小客車平均速度 42 km/h
        L: 35, // 大客車平均速度 35 km/h
        T: 0,
      },
      avgOccupancy: 12, // 平均占有率 12%
      expectedGreenLightSeconds: '55-65',
    },

    // 中午離峰: 10:00-16:59
    midday_off_peak: {
      hours: [10, 11, 12, 13, 14, 15, 16],
      avgVehiclesPerLane: 4,
      vehicleDistribution: {
        M: 0.3,
        S: 0.7,
        L: 0.0,
        T: 0.0,
      },
      averageSpeed: {
        M: 52,
        S: 50,
        L: 40,
        T: 0,
      },
      avgOccupancy: 6,
      expectedGreenLightSeconds: '40-50',
    },

    // 晚峰時段: 17:00-19:59
    evening_peak: {
      hours: [17, 18, 19],
      avgVehiclesPerLane: 10,
      vehicleDistribution: {
        M: 0.4,
        S: 0.6,
        L: 0.0,
        T: 0.0,
      },
      averageSpeed: {
        M: 40,
        S: 38,
        L: 32,
        T: 0,
      },
      avgOccupancy: 14,
      expectedGreenLightSeconds: '60-70',
    },

    // 晚間離峰: 20:00-23:59
    night_off_peak: {
      hours: [20, 21, 22, 23],
      avgVehiclesPerLane: 2,
      vehicleDistribution: {
        M: 0.25,
        S: 0.75,
        L: 0.0,
        T: 0.0,
      },
      averageSpeed: {
        M: 58,
        S: 55,
        L: 48,
        T: 0,
      },
      avgOccupancy: 4,
      expectedGreenLightSeconds: '35-45',
    },

    // 凌晨離峰: 00:00-06:59
    early_morning: {
      hours: [0, 1, 2, 3, 4, 5, 6],
      avgVehiclesPerLane: 1,
      vehicleDistribution: {
        M: 0.2,
        S: 0.8,
        L: 0.0,
        T: 0.0,
      },
      averageSpeed: {
        M: 60,
        S: 58,
        L: 50,
        T: 0,
      },
      avgOccupancy: 2,
      expectedGreenLightSeconds: '30-40',
    },
  },

  speedConfig: {
    motor: { min: 35, avg: 50, max: 65 },
    small: { min: 35, avg: 48, max: 65 },
    large: { min: 30, avg: 40, max: 55 },
  },
}
```

---

## VLRJX00 推薦配置 (南北向主幹道)

```javascript
const VLRJX00_CONFIG = {
  name: 'VLRJX00',
  direction: 'north-south',
  description: '南北向主幹道',
  lanes: 2,

  timePeriods: {
    // 早峰時段: 07:00-09:59
    morning_peak: {
      hours: [7, 8, 9],
      avgVehiclesPerLane: 8,
      vehicleDistribution: { M: 0.3, S: 0.7, L: 0.0, T: 0.0 },
      averageSpeed: { M: 48, S: 45, L: 36, T: 0 },
      avgOccupancy: 11,
      expectedGreenLightSeconds: '50-60',
    },

    midday_off_peak: {
      hours: [10, 11, 12, 13, 14, 15, 16],
      avgVehiclesPerLane: 3,
      vehicleDistribution: { M: 0.25, S: 0.75, L: 0.0, T: 0.0 },
      averageSpeed: { M: 55, S: 52, L: 42, T: 0 },
      avgOccupancy: 5,
      expectedGreenLightSeconds: '38-48',
    },

    evening_peak: {
      hours: [17, 18, 19],
      avgVehiclesPerLane: 11,
      vehicleDistribution: { M: 0.35, S: 0.65, L: 0.0, T: 0.0 },
      averageSpeed: { M: 42, S: 40, L: 34, T: 0 },
      avgOccupancy: 15,
      expectedGreenLightSeconds: '62-72',
    },

    night_off_peak: {
      hours: [20, 21, 22, 23],
      avgVehiclesPerLane: 2,
      vehicleDistribution: { M: 0.2, S: 0.8, L: 0.0, T: 0.0 },
      averageSpeed: { M: 60, S: 58, L: 50, T: 0 },
      avgOccupancy: 3,
      expectedGreenLightSeconds: '36-46',
    },

    early_morning: {
      hours: [0, 1, 2, 3, 4, 5, 6],
      avgVehiclesPerLane: 1,
      vehicleDistribution: { M: 0.15, S: 0.85, L: 0.0, T: 0.0 },
      averageSpeed: { M: 62, S: 60, L: 52, T: 0 },
      avgOccupancy: 2,
      expectedGreenLightSeconds: '32-42',
    },
  },

  speedConfig: {
    motor: { min: 38, avg: 52, max: 65 },
    small: { min: 38, avg: 50, max: 65 },
    large: { min: 32, avg: 42, max: 55 },
  },
}
```

---

## VLRJX20 推薦配置 (路口轉彎車道)

```javascript
const VLRJX20_CONFIG = {
  name: 'VLRJX20',
  direction: 'intersection-turn',
  description: '路口轉彎車道（左轉/右轉）',
  lanes: 2,

  timePeriods: {
    morning_peak: {
      hours: [7, 8, 9],
      avgVehiclesPerLane: 6,
      vehicleDistribution: { M: 0.4, S: 0.6, L: 0.0, T: 0.0 },
      averageSpeed: { M: 42, S: 40, L: 32, T: 0 },
      avgOccupancy: 9,
      expectedGreenLightSeconds: '45-55',
    },

    midday_off_peak: {
      hours: [10, 11, 12, 13, 14, 15, 16],
      avgVehiclesPerLane: 2,
      vehicleDistribution: { M: 0.35, S: 0.65, L: 0.0, T: 0.0 },
      averageSpeed: { M: 50, S: 48, L: 40, T: 0 },
      avgOccupancy: 4,
      expectedGreenLightSeconds: '35-45',
    },

    evening_peak: {
      hours: [17, 18, 19],
      avgVehiclesPerLane: 8,
      vehicleDistribution: { M: 0.45, S: 0.55, L: 0.0, T: 0.0 },
      averageSpeed: { M: 38, S: 36, L: 30, T: 0 },
      avgOccupancy: 12,
      expectedGreenLightSeconds: '52-62',
    },

    night_off_peak: {
      hours: [20, 21, 22, 23],
      avgVehiclesPerLane: 1,
      vehicleDistribution: { M: 0.3, S: 0.7, L: 0.0, T: 0.0 },
      averageSpeed: { M: 55, S: 53, L: 45, T: 0 },
      avgOccupancy: 2,
      expectedGreenLightSeconds: '32-42',
    },

    early_morning: {
      hours: [0, 1, 2, 3, 4, 5, 6],
      avgVehiclesPerLane: 1,
      vehicleDistribution: { M: 0.25, S: 0.75, L: 0.0, T: 0.0 },
      averageSpeed: { M: 58, S: 56, L: 48, T: 0 },
      avgOccupancy: 1,
      expectedGreenLightSeconds: '30-40',
    },
  },

  speedConfig: {
    motor: { min: 32, avg: 48, max: 60 },
    small: { min: 32, avg: 46, max: 60 },
    large: { min: 28, avg: 38, max: 50 },
  },
}
```

---

## 實現指南

### 1. 車輛生成策略 (AutoTrafficGenerator.js)

```javascript
/**
 * 根據當前時段動態生成車輛
 */
function getTimePeriodConfig(currentHour) {
  const hour = currentHour

  if (hour >= 7 && hour <= 9) return 'morning_peak'
  if (hour >= 10 && hour <= 16) return 'midday_off_peak'
  if (hour >= 17 && hour <= 19) return 'evening_peak'
  if (hour >= 20 && hour <= 23) return 'night_off_peak'
  return 'early_morning_off_peak'
}

/**
 * 為每個 VD 的每個車道生成車輛
 */
function generateVehiclesForLane(vdId, laneNumber, currentHour) {
  const timePeriod = getTimePeriodConfig(currentHour)
  const vdConfig = VD_CONFIGS[vdId]
  const periodConfig = vdConfig.timePeriods[timePeriod]

  // 計算應該生成多少輛車
  const targetVehicles = periodConfig.avgVehiclesPerLane

  // 按分布比例分配車輛類型
  const motorCount = Math.round(targetVehicles * periodConfig.vehicleDistribution.M)
  const smallCount = Math.round(targetVehicles * periodConfig.vehicleDistribution.S)

  return {
    motor: motorCount,
    small: smallCount,
    large: 0,
    truck: 0,
  }
}
```

### 2. 數據發送與預測秒數調整

前端發送的數據結構示例：

```json
[
  {
    "VD_ID": "VLRJM60",
    "DayOfWeek": 5,
    "Hour": 8,
    "Minute": 30,
    "Second": 0,
    "IsPeakHour": 1,
    "LaneID": 0,
    "LaneType": 1,
    "Speed": 43,
    "Occupancy": 12,
    "Volume_M": 3,
    "Speed_M": 45,
    "Volume_S": 6,
    "Speed_S": 42,
    "Volume_L": 0,
    "Speed_L": 0,
    "Volume_T": 0,
    "Speed_T": 0
  }
]
```

**後端預測秒數應該根據以下邏輯調整**：

| 條件                        | 預測秒數 |
| --------------------------- | -------- |
| 早峰/晚峰，每車道 8-11 輛車 | 55-70 秒 |
| 中午/晚間，每車道 2-4 輛車  | 35-50 秒 |
| 凌晨，每車道 0-1 輛車       | 30-40 秒 |

### 3. 車輛間距配置 (TrafficLightController.js)

```javascript
// 統一車輛間距（所有車型相同）
const VEHICLE_SPACING = {
  STOP_LINE_QUEUE_SPACING: 30, // 停止線前排隊間距 30px
  NORMAL_LANE_SPACING: 25, // 一般行駛間距 25px
  MIN_SAFE_DISTANCE: 25, // 最小安全距離 25px
}
```

---

## 預期效果

### 實施前後對比

| 項目           | 實施前        | 實施後         |
| -------------- | ------------- | -------------- |
| 綠燈秒數       | 固定 50-51 秒 | 動態 30-70 秒  |
| 車流模擬       | 隨機均勻分布  | 按時段真實分布 |
| 數據合理性     | 低            | 高             |
| API 預測準確性 | 低            | 高             |
| 車輛間距       | 不統一        | 統一 25px      |

### 預測秒數預期範圍

```
時段          | 預期秒數    | 數據基礎
早峰 07-09   | 55-65 秒   | 8-9 輛/車道
中午 10-16   | 40-50 秒   | 3-4 輛/車道
晚峰 17-19   | 60-70 秒   | 10-11 輛/車道
晚間 20-23   | 35-45 秒   | 1-2 輛/車道
凌晨 00-06   | 30-40 秒   | 0-1 輛/車道
```

---

## 實施步驟

1. **創建配置檔案**: 在 `src/classes/config/` 中建立 `vdTimePeriodConfig.js`
2. **修改自動生成器**: 更新 `AutoTrafficGenerator.js` 使用時段配置
3. **調整收集器**: 確保 `TrafficDataCollector.js` 正確收集數據
4. **測試驗證**:
   - 觀察不同時段的車流生成
   - 檢查發送到後端的數據量
   - 驗證返回的綠燈秒數是否在預期範圍
5. **微調參數**: 根據實際結果調整配置參數

---

## 配置維護

未來如需調整，只需修改時段配置中的參數：

- `avgVehiclesPerLane`: 每條車道的平均車輛數
- `vehicleDistribution`: 車型分布比例
- `averageSpeed`: 各車型平均速度
- `avgOccupancy`: 占有率

無需修改核心業務邏輯。
