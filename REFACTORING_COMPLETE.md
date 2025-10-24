# 🎯 AutoTrafficGenerator 重構完成

## ✅ 刪除內容

### 1. 完全移除方法

- **文件**: `src/classes/AutoTrafficGenerator.js`
- **方法**: `_sendVDDataToBackendAsync(vdData)` ❌
- **行數**: 80+ 行代碼被刪除
- **原因**: 職責不清楚 - AutoTrafficGenerator 不應該直接發送 API

### 2. 移除所有調用

```javascript
// ❌ 在 _applyScenarioMode() 中被移除
// if (vdData && vdData.apiData) {
//   this._sendVDDataToBackendAsync(vdData.apiData)
// }

// ❌ 在 _applyTrafficProfile() 中被移除
// if (visualVDData && visualVDData.apiData) {
//   this._sendVDDataToBackendAsync(visualVDData.apiData)
// }
```

---

## ✅ 新架構設計

### AutoTrafficGenerator 的職責 (現在)

```
1. 生成車輛物件 (Vehicle)
   └─ _generateVehicle()
      ├─ 隨機選擇路線
      ├─ 設置初始位置、速度
      └─ 返回 Vehicle 對象

2. 生成 VD 數據 (Virtual Detector Data)
   └─ _generateScenarioVDData(scenarioKey)
      ├─ 根據情景配置計算 Volume_M, Volume_S, Volume_L
      ├─ 計算 Volume_T (加總)
      ├─ 計算 Speed_M, Speed_S, Speed_L
      ├─ 計算 Speed_T (加權平均)
      ├─ 計算 Occupancy (佔有率)
      ├─ 返回 apiData (原始數據，給後端)
      └─ 返回 visualData (放大後的數據，給前端動畫)

3. 透過回調傳遞數據
   └─ this.onTimeUpdate(data)
      └─ 包含 vdData 和其他信息
```

### AutoTrafficGenerator 不再做什麼

```
❌ 不發送 API
❌ 不知道後端 URL
❌ 不處理 HTTP 請求
❌ 不解析後端響應
```

### TrafficLightController 的職責 (現在)

```
1. 管理交通燈倒數
   └─ countdownDelayWithAPI()
      └─ 綠燈倒數 12 秒中
         └─ 在第 10 秒時觸發 API 調用

2. 發送 VD 數據到後端
   └─ sendDataToBackend(vdData = null)
      ├─ 接收 VD 數據 (來自 AutoTrafficGenerator)
      ├─ 或者收集交叉口實時數據
      ├─ 發送 HTTP POST 到後端
      └─ 處理預測結果

3. 應用預測結果
   └─ 更新 nextTiming
      └─ 下一個週期使用預測的綠燈秒數
```

---

## 📊 完整數據流

### 初始化

```
┌─────────────────────────────┐
│  IndexPage.vue / UI         │
│  初始化交通模擬系統         │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│  AutoTrafficGenerator       │
│  new AutoTrafficGenerator() │
└──────────────┬──────────────┘
               │
               ↓ (設置回調)
┌─────────────────────────────┐
│  TrafficLightController     │
│  new TrafficLightController│
└──────────────┬──────────────┘
               │
               ↓ (啟動倒數)
┌─────────────────────────────┐
│  計時循環開始                 │
│  (每秒觸發 update)           │
└─────────────────────────────┘
```

### 運行時數據流 (每個週期)

````
┌─────────────────────────────────────────────────────────┐
│ 時刻 T: 綠燈倒數開始 (倒數 12 秒)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 時刻 T+2秒: AutoTrafficGenerator 生成車輛              │
│ ┌──────────────────────────────────────────────────────┤
│ │ _generateVehicle()                                   │
│ │  ├─ 根據情景隨機選擇路線                              │
│ │  └─ 返回 Vehicle 對象 (位置、速度等)                │
│ │                                                      │
│ │ onTimeUpdate({                                       │
│ │   vehicles: [车1, 车2, ...],                         │
│ │   vdData: { ... },  ← VD 數據會保留                 │
│ │   description: '...'                                 │
│ │ })                                                    │
│ └──────────────────────────────────────────────────────┤
└────────────────────┬────────────────────────────────────┘\n                     │\n                     ↓\n┌─────────────────────────────────────────────────────────┐\n│ 時刻 T+10秒: 倒數到第 10 秒                             │\n│ ┌──────────────────────────────────────────────────────┤\n│ │ TrafficLightController.countdownDelayWithAPI()       │\n│ │  ├─ 檢測 i === 10                                    │\n│ │  ├─ 設置 apiTriggered = true                         │\n│ │  └─ 呼叫 this.sendDataToBackend(currentCycleData)   │\n│ │                                                      │\n│ │ sendDataToBackend(vdData) ✅                         │\n│ │  ├─ 接收 VD 數據                                     │\n│ │  ├─ 發送 HTTP POST 到後端                            │\n│ │  └─ 解析預測結果                                     │\n│ └──────────────────────────────────────────────────────┤\n└────────────────────┬────────────────────────────────────┘\n                     │\n                     ↓\n┌─────────────────────────────────────────────────────────┐\n│ HTTP POST 請求                                          │\n│ URL: http://localhost:8000/api/traffic/predict/        │\n│ Body: {                                                 │\n│   \"DayOfWeek\": 1,                                      │\n│   \"Hour\": 9,                                           │\n│   \"Minute\": 15,                                        │\n│   \"Volume_M\": 4,      ← 中型車數量 (原始)             │\n│   \"Volume_S\": 6,      ← 小型車數量 (原始)             │\n│   \"Volume_L\": 1,      ← 大型車數量 (原始)             │\n│   \"Volume_T\": 11,     ← 總車數 = 4+6+1 ✅            │\n│   \"Speed_M\": 40.5,    ← 中型車平均速度                │\n│   \"Speed_S\": 38.2,    ← 小型車平均速度                │\n│   \"Speed_L\": 35.0,    ← 大型車平均速度                │\n│   \"Speed_T\": 39.09,   ← 加權平均速度 ✅              │\n│   \"Occupancy\": 14,    ← 佔有率 (%)                   │\n│   \"IsPeakHour\": 1,    ← 是否尖峰                      │\n│   ...                                                   │\n│ }                                                       │\n└────────────────────┬────────────────────────────────────┘\n                     │\n                     ↓\n┌─────────────────────────────────────────────────────────┐\n│ 後端 ML 模型預測                                         │\n│ ┌──────────────────────────────────────────────────────┤\n│ │ 基於輸入特徵預測：                                    │\n│ │ 綠燈秒數 = f(Volume_T, Speed_T, Occupancy, ...)    │\n│ │                                                      │\n│ │ 預測結果:                                            │\n│ │ {                                                    │\n│ │   \"east_west_seconds\": 65,   ← 東西向綠燈          │\n│ │   \"south_north_seconds\": 70  ← 南北向綠燈          │\n│ │ }                                                    │\n│ └──────────────────────────────────────────────────────┤\n└────────────────────┬────────────────────────────────────┘\n                     │\n                     ↓\n┌─────────────────────────────────────────────────────────┐\n│ TrafficLightController 收到預測結果                     │\n│ ┌──────────────────────────────────────────────────────┤\n│ │ result = {                                           │\n│ │   \"east_west_seconds\": 65,                         │\n│ │   \"south_north_seconds\": 70                        │\n│ │ }                                                    │\n│ │                                                      │\n│ │ this.nextTiming.eastWest = 65                       │\n│ │ this.nextTiming.northSouth = 70                     │\n│ │                                                      │\n│ │ 發送事件給 UI：                                      │\n│ │ window.dispatchEvent(new CustomEvent(                │\n│ │   'trafficApiComplete',                             │\n│ │   { detail: { response: result } }                  │\n│ │ ))                                                   │\n│ └──────────────────────────────────────────────────────┤\n└────────────────────┬────────────────────────────────────┘\n                     │\n                     ↓\n┌─────────────────────────────────────────────────────────┐\n│ 時刻 T+12秒: 綠燈倒數結束                               │\n│ ┌──────────────────────────────────────────────────────┤\n│ │ 開始新的倒數週期                                     │\n│ │ 使用預測的綠燈秒數：                                 │\n│ │  ├─ 東西向: 65 秒                                    │\n│ │  └─ 南北向: 70 秒                                    │\n│ └──────────────────────────────────────────────────────┤\n└─────────────────────────────────────────────────────────┘\n```\n\n---\n\n## 🔍 驗證清單\n\n### ✅ 已完成\n- ✅ 刪除 `_sendVDDataToBackendAsync()` 方法\n- ✅ 移除所有對該方法的調用\n- ✅ 確認 `TrafficLightController.sendDataToBackend()` 完整\n- ✅ 職責清晰分離\n- ✅ 數據流向明確\n\n### ⏳ 下一步\n1. 測試 AutoTrafficGenerator 是否正確生成 VD 數據\n2. 測試 TrafficLightController 是否能正確接收 VD 數據\n3. 確認 API 發送端點正確 (http://localhost:8000/api/traffic/predict/)\n4. 驗證後端是否正確預測綠燈秒數\n5. 根據預測結果調整 trafficScenarioConfig.js 參數\n\n---\n\n## 📝 代碼質量改進\n\n### 之前 (耦合)\n```javascript\n// ❌ AutoTrafficGenerator 做太多事\nclass AutoTrafficGenerator {\n  _generateVehicle() { /* ... */ }\n  _generateScenarioVDData() { /* ... */ }\n  _sendVDDataToBackendAsync() {  // ← 不相關的職責\n    fetch('http://localhost:5000/predict', ...)\n  }\n}\n```\n\n### 現在 (解耦)\n```javascript\n// ✅ AutoTrafficGenerator 只做生成\nclass AutoTrafficGenerator {\n  _generateVehicle() { /* ... */ }\n  _generateScenarioVDData() { /* ... */ }\n  // ← 沒有 API 相關代碼\n}\n\n// ✅ TrafficLightController 只做發送\nclass TrafficLightController {\n  countdownDelayWithAPI() { /* ... */ }\n  async sendDataToBackend(vdData) {\n    fetch('http://localhost:8000/api/traffic/predict/', ...)\n  }\n}\n```\n\n### 優點\n- 🎯 單一職責原則 (SRP)\n- 📦 代碼可重用性提高\n- 🧪 更容易測試\n- 🔧 更容易維護和修改\n- 🚀 性能更好 (避免重複 API 調用)\n\n---\n\n## 📋 文件摘要\n\n| 文件 | 改變 | 說明 |\n|------|------|------|\n| `AutoTrafficGenerator.js` | 🔴 移除 80+ 行 | 刪除 `_sendVDDataToBackendAsync()` + 調用 |\n| `TrafficLightController.js` | 🟢 保持不變 | `sendDataToBackend()` 已存在 |\n| 其他文件 | 🟡 無改變 | 都不受影響 |\n\n---\n\n## 🎓 學習要點\n\n1. **職責分離**: 每個類應該有單一、明確的職責\n2. **數據流**: 清楚的數據流向使系統更容易理解\n3. **API 管理**: API 調用應該集中在專門的控制器中\n4. **回調模式**: 使用回調傳遞數據，避免類之間的直接耦合\n\n---\n\n## 🚀 最終狀態\n\n```\n✅ 系統架構清晰\n✅ 職責分離完成\n✅ API 管理集中化\n✅ 代碼質量提升\n✅ 易於測試和維護\n```\n
````
