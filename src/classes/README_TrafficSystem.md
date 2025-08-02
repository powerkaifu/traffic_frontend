# 交通數據管理系統 - 架構設計文檔

## 系統概覽

這個交通數據管理系統採用了多種設計模式來實現可擴展的交通數據生成和動畫控制功能。

## 核心設計模式

### 1. Factory Pattern (工廠模式)

- **VehicleDataGenerator**: 負責創建不同類型的車輛數據
- 統一的車輛創建接口，易於擴展新的車輛類型

### 2. Strategy Pattern (策略模式)

- **IntersectionDataProcessor**: 使用不同的交通場景策略
- `SmoothTrafficStrategy`: 流暢交通策略
- `NormalTrafficStrategy`: 一般交通策略
- `CongestedTrafficStrategy`: 擁擠交通策略

### 3. Observer Pattern (觀察者模式)

- **TrafficDataManager**: 作為主題，管理觀察者
- **AnimationController**: 作為觀察者，響應數據變化
- 實現了數據層和動畫層的解耦

## 系統架構

```
MainLayout.vue (UI層)
    ↓ 用戶操作
TrafficDataManager (數據管理層)
    ↓ 通知觀察者
AnimationController (動畫控制層)
    ↓ 控制車輛
IndexPage.vue (視圖層)
```

## 主要類別說明

### TrafficDataManager

- **職責**: 統籌整個交通數據生成流程
- **功能**:
  - 接收用戶配置
  - 生成VD格式的交通數據
  - 通知動畫系統開始車輛生成
  - 管理觀察者列表

### VehicleDataGenerator

- **職責**: 生成詳細的車輛數據
- **功能**:
  - 為每輛車生成物理屬性
  - 計算速度、跟車距離、反應時間
  - 使用正態分布模擬真實的速度分布

### IntersectionDataProcessor

- **職責**: 處理和計算交通統計數據
- **功能**:
  - 計算平均速度、佔用率、密度
  - 根據場景策略調整數據
  - 生成標準VD格式輸出
  - 評估服務水準(LOS)

### AnimationController

- **職責**: 控制車輛動畫和視覺效果
- **功能**:
  - 接收交通數據管理器的事件
  - 根據數據配置生成對應數量的車輛
  - 管理車輛動畫生命週期
  - 根據場景調整動畫參數

## VD數據格式

系統生成的標準VD(Vehicle Detector)數據包含：

```javascript
{
  // 基本資訊
  VD_ID: 'VLRJX20',           // 感測器ID
  timestamp: '2025-01-01T...',  // 時間戳
  dayOfWeek: '星期一',         // 星期
  hour: 14,                   // 小時
  minute: 30,                 // 分鐘
  second: 45,                 // 秒數

  // 交通流量
  Volume_M: 12,               // 機車流量
  Volume_S: 15,               // 小型車流量
  Volume_L: 3,                // 大型車流量
  Volume_Total: 30,           // 總流量

  // 速度數據 (km/h)
  Speed_Avg: 32.5,            // 平均速度
  Speed_Max: 45,              // 最大速度
  Speed_Min: 20,              // 最小速度
  Speed_Variance: 15.2,       // 速度變異數

  // 佔用率與密度
  Occupancy: 35.8,            // 佔用率 (%)
  Density: 45.6,              // 交通密度 (車輛/公里)

  // 服務水準
  LOS: 'B',                   // 服務水準 (A-F)
  DataQuality: 95             // 數據品質 (0-100)
}
```

## 使用方式

### 1. 前端操作流程

1. 在 MainLayout.vue 中選擇路口和場景
2. 調整各車種數量
3. 點擊「送出」按鈕
4. 系統自動生成VD數據並開始動畫

### 2. 系統內部流程

1. `TrafficDataManager.generateTrafficData()` 被調用
2. `VehicleDataGenerator` 生成車輛詳細數據
3. `IntersectionDataProcessor` 計算統計數據
4. 通知 `AnimationController` 開始動畫
5. 在控制台輸出完整的VD數據

### 3. 擴展方式

#### 添加新的車輛類型:

```javascript
// 在 VehicleDataGenerator.js 中添加
this.vehicleTypes.bus = {
  name: '公車',
  length: 12.0,
  width: 2.5,
  weight: 18000,
  speedRange: { min: 10, max: 25 },
  accelerationTime: 10,
}
```

#### 添加新的交通場景:

```javascript
// 在 IntersectionDataProcessor.js 中添加
class RushHourTrafficStrategy {
  adjustStats(stats) {
    return {
      ...stats,
      avgSpeed: Math.max(stats.avgSpeed * 0.5, 8),
      speedVariance: stats.speedVariance * 2.0,
    }
  }

  adjustOccupancy(baseOccupancy) {
    return Math.min(baseOccupancy * 1.8, 98)
  }
}
```

## 系統優勢

1. **模組化**: 各個功能分離，易於維護
2. **可擴展**: 支援新增車種、場景、路口
3. **標準化**: 產生標準VD格式數據
4. **真實性**: 使用統計分布模擬真實交通
5. **響應式**: 觀察者模式實現即時更新
6. **除錯友善**: 豐富的控制台輸出資訊

## 後續發展

1. **後端整合**: 將VD數據傳送到AI模型進行綠燈秒數預測
2. **歷史數據**: 保存和分析歷史交通數據
3. **即時調整**: 根據AI預測結果動態調整紅綠燈時相
4. **更多感測器**: 支援多個VD_ID的數據收集
5. **性能優化**: 大量車輛時的動畫性能優化
