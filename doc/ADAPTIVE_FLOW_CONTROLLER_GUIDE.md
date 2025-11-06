# AdaptiveFlowController 實現指南

## 概述

`AdaptiveFlowController` 是一個基於交通工程標準的時間佔有率（Time Occupancy）計算和動態調整系統。它監控路口各方向的交通流狀態，並根據佔有率自動調整車流生成速率。

## 核心原理

### 時間佔有率公式

```
O = Σ(檢測區被佔用時間) / 總檢測時間 × 100%
```

其中：

- **檢測區長度 (DETECTION_ZONE_LENGTH)**: 50m = 500像素（停止線前方）
- **檢查週期 (CHECK_INTERVAL)**: 100ms
- **計算週期 (CALCULATION_PERIOD)**: 60秒
- **佔有率範圍**: 0% ~ 100%

### 檢測邏輯

1. **每 100ms 更新一次**：
   - 遍歷所有方向的車輛
   - 判斷每個車輛是否在檢測區內
   - 累計被佔用時間

2. **每 60秒計算一次**：
   - 計算時間佔有率百分比
   - 根據臨界值決定調整係數
   - 應用調整到生成器

## 配置參數

### 佔有率臨界值（已確認）

```javascript
{
  underflow: 30,  // 低於 30% - 增加生成速率
  normal: 70      // 高於 70% - 減少生成速率
}
```

### 生成速率調整係數

```javascript
{
  increase: 1.2,  // 增加 20%（underflow 時）
  decrease: 0.8,  // 減少 20%（normal 時）
  maintain: 1.0   // 保持不變（30%-70% 之間）
}
```

### 停止線位置（需根據實際配置調整）

```javascript
{
  east: 650,     // X 座標
  west: 180,     // X 座標
  south: 480,    // Y 座標
  north: 320     // Y 座標
}
```

## 使用方法

### 在 IndexPage.vue 中的集成

1. **導入**：

```javascript
import AdaptiveFlowController from '../classes/AdaptiveFlowController.js'
```

2. **創建實例**：

```javascript
const adaptiveFlowController = new AdaptiveFlowController(trafficController)
```

3. **啟動**：

```javascript
adaptiveFlowController.start()
```

4. **全局訪問**：

```javascript
window.adaptiveFlowController = adaptiveFlowController
```

### 運行時 API

#### 獲取佔有率數據

```javascript
// 獲取特定方向的佔有率
const eastData = window.adaptiveFlowController.getOccupancyData('east')
console.log(`東向佔有率: ${eastData.occupancyPercentage.toFixed(2)}%`)

// 獲取所有方向的佔有率
const allData = window.adaptiveFlowController.getAllOccupancyData()
```

#### 獲取歷史數據

```javascript
// 獲取最近 10 條記錄
const history = window.adaptiveFlowController.getOccupancyHistory('east', 10)
history.forEach((record) => {
  console.log(`時間戳: ${record.timestamp}, 佔有率: ${record.occupancyPercentage.toFixed(2)}%`)
})
```

#### 系統狀態摘要

```javascript
const status = window.adaptiveFlowController.getStatusSummary()
console.log(status)
// 輸出:
// {
//   isRunning: true,
//   timestamp: 1234567890,
//   occupancy: {
//     east: "45.50",
//     west: "52.30",
//     south: "48.20",
//     north: "51.40"
//   },
//   averageOccupancy: "49.35"
// }
```

#### 動態調整參數

```javascript
// 調整檢測區長度（單位：像素）
window.adaptiveFlowController.setDetectionZoneLength(600) // 60m

// 調整佔有率臨界值
window.adaptiveFlowController.setOccupancyThresholds({
  underflow: 25, // 低於 25% 增加生成
  normal: 75, // 高於 75% 減少生成
})

// 調整生成速率係數
window.adaptiveFlowController.setGenerationRateAdjustment({
  increase: 1.5, // 增加 50%
  decrease: 0.7, // 減少 30%
})
```

#### 重置數據

```javascript
window.adaptiveFlowController.reset()
```

#### 停止服務

```javascript
window.adaptiveFlowController.stop()
```

## 主要方法詳解

### 核心方法

| 方法                                    | 說明                       |
| --------------------------------------- | -------------------------- |
| `start()`                               | 啟動控制器，開始監控佔有率 |
| `stop()`                                | 停止控制器                 |
| `reset()`                               | 重置所有計數器和數據       |
| `getOccupancyData(direction)`           | 獲取指定方向的佔有率       |
| `getAllOccupancyData()`                 | 獲取所有方向的佔有率       |
| `getOccupancyHistory(direction, limit)` | 獲取歷史數據               |
| `getStatusSummary()`                    | 獲取系統狀態摘要           |

### 配置方法

| 方法                                       | 說明             |
| ------------------------------------------ | ---------------- |
| `setDetectionZoneLength(length)`           | 設置檢測區長度   |
| `setOccupancyThresholds(thresholds)`       | 設置佔有率臨界值 |
| `setGenerationRateAdjustment(adjustments)` | 設置生成速率係數 |

## 控制流程圖

```
┌─────────────────────────────────────────────┐
│   AdaptiveFlowController 啟動               │
│   (start())                                 │
└────────┬────────────────────────────────────┘
         │
         ├─→ 啟動 CHECK_TIMER (100ms 週期)
         │   ├─→ _updateOccupiedTime()
         │   │   └─→ _getVehiclesInDetectionZone()
         │   │       └─→ _isVehicleInZone()
         │   │           └─→ 累計 occupiedTimeMs
         │   └─→ 累計 totalTimeMs
         │
         └─→ 啟動 CALCULATION_TIMER (60s 週期)
             └─→ _calculateAndAdjust()
                 ├─→ 計算 occupancyPercentage
                 ├─→ 決定 adjustmentFactor
                 │   ├─→ occupancy < 30% → 1.2x
                 │   ├─→ occupancy > 70% → 0.8x
                 │   └─→ 其他情況 → 1.0x
                 ├─→ 記錄歷史數據
                 ├─→ _applyAdjustmentToGenerator()
                 │   └─→ 修改 config.interval
                 └─→ 重置計數器
```

## 控制臺日誌示例

```
📊 [east] 佔有率: 35.50% | 車輛: 3 | 調整係數: 1.20x
📊 [west] 佔有率: 72.30% | 車輛: 8 | 調整係數: 0.80x
📊 [south] 佔有率: 45.20% | 車輛: 4 | 調整係數: 1.00x
📊 [north] 佔有率: 58.40% | 車輛: 5 | 調整係數: 1.00x
```

## 需要調整的參數

### 停止線位置

請根據實際的十字路口車道配置調整 `_getStopLinePosition()` 方法中的座標：

```javascript
const stopLinePositions = {
  east: 650, // ← 需要根據實際調整
  west: 180, // ← 需要根據實際調整
  south: 480, // ← 需要根據實際調整
  north: 320, // ← 需要根據實際調整
}
```

### 檢測區長度

如果需要調整檢測區範圍（預設 50m = 500px）：

```javascript
this.DETECTION_ZONE_LENGTH = 500 // 50m
```

## 預期行為

### 低佔有率 (< 30%)

- 車流稀疏，道路未充分利用
- 調整係數: 1.2x
- 生成間隔縮短 → 車流增加
- 目標: 提高道路利用率到 30-70% 範圍

### 正常佔有率 (30-70%)

- 車流適度，道路利用良好
- 調整係數: 1.0x
- 保持當前生成速率
- 目標: 維持穩定狀態

### 高佔有率 (> 70%)

- 車流擁擠，道路接近飽和
- 調整係數: 0.8x
- 生成間隔延長 → 車流減少
- 目標: 降低佔有率到 30-70% 範圍

## 注意事項

1. **車輛檢測精度**: 依賴於車輛位置 (headPos) 的準確性
2. **停止線座標**: 必須與實際車道配置匹配，否則檢測區會不準確
3. **時間同步**: 確保系統時間準確，影響佔有率計算週期
4. **性能影響**: 每 100ms 遍歷一次所有車輛，在高車輛數量時可能有性能影響
5. **非即時控制**: 調整效果在下一個 60s 週期後才能看到

## 檢驗清單

- ✅ AdaptiveFlowController 已創建
- ✅ 集成到 IndexPage.vue
- ✅ 啟動和停止邏輯已實現
- ✅ 全局訪問 (window.adaptiveFlowController) 已設置
- ✅ 編譯驗證通過
- ⏳ **需要根據實際路口調整停止線座標**
- ⏳ **需要測試和驗證時間佔有率計算是否合理**
- ⏳ **可選: 創建監控面板顯示實時佔有率數據**

## 後續改進方向

1. 添加實時監控面板 (WebGL/Canvas 可視化)
2. 支持多個路口的協調控制
3. 實現基於 ML 的預測性調整
4. 集成與信號優化算法
5. 支持特殊時段的配置 (高峰/低峰)
