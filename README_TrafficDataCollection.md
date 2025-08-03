# 交通數據收集系統說明

## 概述

新的交通數據收集系統已經實現，取代了之前累加式的數據收集方式，現在提供即時的交通流量統計和 API 數據傳送功能。

## 系統架構

### 1. TrafficDataCollector (交通數據收集器)

- **位置**: `src/classes/TrafficDataCollector.js`
- **功能**:
  - 收集即時交通流量數據（非累加）
  - 定期重置數據窗口
  - 自動傳送數據到後端 API
  - 提供歷史數據查詢

### 2. Vehicle (車輛類別) - 數據記錄增強

- **位置**: `src/classes/Vehicle.js`
- **新增功能**:
  - 記錄車輛創建時間、移動速度、行駛距離
  - 發送詳細的車輛事件數據
  - 追蹤車輛生命週期數據

### 3. API 測試模擬器

- **位置**: `src/utils/apiTest.js`
- **功能**: 模擬後端 API 接收數據並顯示格式

## 數據收集機制

### 即時數據收集

- **收集間隔**: 30秒
- **API傳送間隔**: 60秒
- **數據窗口**: 5分鐘
- **歷史記錄**: 最多100筆

### 數據類型

每個方向（東、西、南、北）收集以下數據：

- 車輛數量（機車、小型車、大型車）
- 平均速度（整體及各車型）
- 佔用率
- 車輛詳細記錄（ID、時間戳、速度等）

## API 數據格式

```json
{
  "timestamp": "2023-XX-XXTXX:XX:XX.XXXZ",
  "collection_period": {
    "start_time": "2023-XX-XXTXX:XX:XX.XXXZ",
    "end_time": "2023-XX-XXTXX:XX:XX.XXXZ",
    "duration_seconds": 60
  },
  "traffic_flow": {
    "east": {
      "motor_count": 5,
      "small_car_count": 8,
      "large_car_count": 2,
      "total_count": 15,
      "average_speed": 32,
      "motor_speed": 35,
      "small_car_speed": 30,
      "large_car_speed": 25,
      "occupancy": 15.2
    }
    // west, south, north 同樣格式
  },
  "metadata": {
    "collector_version": "1.0.0",
    "total_vehicles_processed": 45,
    "collection_method": "real_time_event_based"
  }
}
```

## 主要改進

### 1. 非累加數據收集

- **舊方式**: 數據持續累加，無法重置
- **新方式**: 定期重置數據窗口，提供即時流量統計

### 2. 詳細的車輛追蹤

- 記錄每輛車的完整生命週期
- 追蹤實際行駛速度和距離
- 提供精確的時間戳記錄

### 3. 自動 API 傳送

- 定期自動傳送數據到後端
- 錯誤處理和重試機制
- 事件驅動的狀態通知

### 4. UI 數據來源優化

- MainLayout 現在優先使用 TrafficDataCollector 的即時數據
- 後備使用 TrafficLightController 的累加數據
- 響應式數據更新

## 使用方式

### 啟動數據收集

數據收集器會在 IndexPage 組件掛載時自動啟動：

```javascript
// 在 IndexPage.vue 的 onMounted 中
trafficDataCollector.start()
```

### 手動觸發數據傳送

```javascript
// 強制傳送當前數據
window.trafficDataCollector.forceSendData()
```

### 查看即時數據

```javascript
// 獲取當前期間的統計
const realTimeData = window.trafficDataCollector.getRealTimeData()
console.log(realTimeData)
```

### 查看歷史數據

```javascript
// 獲取最近 10 筆歷史記錄
const history = window.trafficDataCollector.getHistoryData(10)
console.log(history)
```

## 配置選項

可以調整數據收集器的配置：

```javascript
window.trafficDataCollector.updateConfig({
  collectionInterval: 30000, // 30秒收集間隔
  apiSendInterval: 60000, // 60秒傳送間隔
  dataWindowSize: 300000, // 5分鐘數據窗口
  maxHistorySize: 100, // 最多100筆歷史記錄
})
```

## 事件監聽

系統發送以下自定義事件：

- `trafficDataUpdated`: 數據收集完成
- `trafficDataSent`: API 傳送成功
- `trafficDataSendFailed`: API 傳送失敗

```javascript
window.addEventListener('trafficDataSent', (event) => {
  console.log('數據傳送成功:', event.detail)
})
```

## 除錯和監控

### 控制台輸出

- 數據收集器提供詳細的控制台日誌
- 車輛事件包含完整的追蹤信息
- API 傳送狀態即時顯示

### 模擬 API 測試

- `apiTest.js` 提供完整的 API 模擬
- 在控制台查看傳送的數據格式
- 測試數據收集和傳送流程

## 後端 API 端點

系統預設的 API 端點：

- **URL**: `http://localhost:8000/api/traffic/data/`
- **方法**: POST
- **內容類型**: application/json

可以在創建 TrafficDataCollector 時自定義端點：

```javascript
const collector = new TrafficDataCollector('https://your-api.com/traffic/data/')
```

## 故障排除

### 1. 數據不更新

- 檢查數據收集器是否已啟動
- 確認車輛事件正常發送
- 查看控制台錯誤信息

### 2. API 傳送失敗

- 檢查網路連接
- 確認 API 端點正確
- 查看控制台的錯誤詳情

### 3. 性能問題

- 調整收集間隔（增加 collectionInterval）
- 減少歷史記錄大小（降低 maxHistorySize）
- 檢查車輛清理機制是否正常運作
