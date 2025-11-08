# 🚀 Priority 3 Phase 2 - IndexPage.vue 遷移計劃

## 📋 概述

**目標:** 將 `IndexPage.vue` 完全遷移到 Pinia 狀態管理，移除所有 `window` 全域變數依賴

**預計耗時:** 2-3 小時

**複雜度:** ⭐⭐⭐⭐⭐ (最複雜的一步，涉及 2700+ 行代碼)

---

## 🔍 當前 `window` 依賴分析

### IndexPage.vue 中的 `window` 引用

1. **系統初始化:**
   - `window.drawerState = true` → 側邊欄狀態
   - `window.layoutChangeTimer` → 佈局變化計時器
   - `window.trafficCleanup` → 清理函數

2. **交通控制:**
   - `window.trafficController` → 交通燈控制器
   - `window.autotrafficGenerator` → 自動交通生成器
   - `window.adaptiveFlowController` → 自適應流量控制

3. **交通數據:**
   - `window.trafficDataCollector` → 交通數據收集器
   - `window.weatherController` → 天氣控制器
   - `window.lastApiVDDataArray` → API 生成的 VD 數據

4. **車輛管理:**
   - `window.liveVehicles` → 活躍車輛列表（最關鍵）
   - `window.getVehicleCount` → 獲取車輛計數
   - `window.setVehicleDistance` → 設置車輛距離
   - `window.setNorthSouthDistance` → 設置南北向距離
   - `window.getVehicleDistanceConfig` → 獲取距離配置

5. **測試工具:**
   - `window.testNewTrafficFlow` → 測試流程
   - `window.testLeftTurnLanes` → 測試左轉車道
   - `window.diagnostics` → 診斷工具

6. **事件系統:**
   - `window.addEventListener('scenarioChanged', ...)` → 情境切換
   - `window.addEventListener('generateVehicle', ...)` → 生成車輛
   - `window.addEventListener('generateLeftTurnVehicle', ...)` → 生成左轉車輛
   - `window.dispatchEvent(new CustomEvent(...))` → 派發事件

### Store 應提供的接口

```javascript
// 初始化和配置
;-setTrafficController(controller) -
  setAutoTrafficGenerator(generator) -
  setAdaptiveFlowController(controller) -
  setTrafficDataCollector(collector) -
  setWeatherController(controller) -
  // 車輛管理
  addVehicle(vehicle) -
  removeVehicle(vehicleId) -
  getVehicleCount() -
  getLiveVehicles() -
  clearAllVehicles() -
  // 交通數據
  setLastApiVDDataArray(data) -
  getLastApiVDDataArray() -
  // 狀態查詢
  getTrafficController() -
  getAutoTrafficGenerator() -
  // 事件系統
  on(eventName, callback) -
  off(eventName, callback) -
  emit(eventName, data) -
  // 工具函數
  setVehicleDistance(multiplier) -
  setNorthSouthDistance(multiplier) -
  getVehicleDistanceConfig()
```

---

## 📝 遷移步驟

### ✅ 第 1 步：導入 Store (5 分鐘)

**修改位置:** `IndexPage.vue` 第 350 行左右

```javascript
// 新增導入
import { useSimulationStore } from '../stores/simulationStore.js'

// 在 setup 中創建 store 實例
const store = useSimulationStore()
```

**預期結果:**

- Store 可在組件中訪問
- 無編譯錯誤

---

### ✅ 第 2 步：遷移系統初始化 (15 分鐘)

**修改位置:** `onMounted()` 第 1250-1350 行

**修改內容:**

```javascript
// 修改前
window.trafficController = trafficController
window.autotrafficGenerator = autoTrafficGenerator
window.adaptiveFlowController = adaptiveFlowController
window.trafficDataCollector = trafficDataCollector
window.weatherController = weatherController

// 修改後
store.setTrafficController(trafficController)
store.setAutoTrafficGenerator(autoTrafficGenerator)
store.setAdaptiveFlowController(adaptiveFlowController)
store.setTrafficDataCollector(trafficDataCollector)
store.setWeatherController(weatherController)
```

**預期結果:**

- 所有系統控制器通過 Store 管理
- 其他組件可通過 `store.getTrafficController()` 等訪問

---

### ✅ 第 3 步：遷移車輛管理 (20 分鐘)

**修改位置:** 整個車輛生成和銷毀流程

**修改內容:**

```javascript
// 修改前 (多處)
window.liveVehicles = []
window.liveVehicles.push(vehicle)
const idx = window.liveVehicles.indexOf(this)
window.liveVehicles.splice(idx, 1)
if (window.liveVehicles)
  const liveIdx = window.liveVehicles.findIndex(...)

// 修改後
store.addVehicle(vehicle)
store.removeVehicle(vehicleId)
store.getLiveVehicles()
store.clearAllVehicles()
```

**關鍵位置:**

1. 第 380-440 行：`selectOptimalLane()` 函數中的車輛計數
2. 第 500-550 行：`handleAutoGenerate()` 中的新增車輛
3. 第 600-650 行：`animateVehicle()` 中的車輛移除
4. 第 850-900 行：`clearAllVehicles()` 方法

**預期結果:**

- 所有車輛操作通過 Store 中介
- 無直接 `window.liveVehicles` 訪問

---

### ✅ 第 4 步：遷移 API 數據管理 (10 分鐘)

**修改位置:** 多個 API 數據讀取位置

**修改內容:**

```javascript
// 修改前
if (window.lastApiVDDataArray && Array.isArray(window.lastApiVDDataArray))
  const apiData = window.lastApiVDDataArray[dirIndex]

// 修改後
const lastApiData = store.getLastApiVDDataArray()
if (lastApiData && Array.isArray(lastApiData))
  const apiData = lastApiData[dirIndex]
```

**關鍵位置:**

1. 第 410-430 行：`selectOptimalLane()` 中讀取 API 佔有率

**預期結果:**

- API 數據通過 Store 讀取
- 無直接 `window.lastApiVDDataArray` 訪問

---

### ✅ 第 5 步：遷移事件系統 (25 分鐘)

**修改位置:** 所有 `addEventListener` 和 `dispatchEvent` 調用

**修改內容:**

```javascript
// 修改前
window.addEventListener('scenarioChanged', handleScenarioChange)
window.dispatchEvent(new CustomEvent('allVehiclesCleared', ...))

// 修改後
store.on('scenarioChanged', handleScenarioChange)
store.emit('allVehiclesCleared', { ... })
```

**關鍵位置:**

1. 第 1270 行：監聽 scenarioChanged
2. 第 1280 行：監聽 generateVehicle
3. 第 1290 行：監聽 generateLeftTurnVehicle
4. 第 870 行：派發 allVehiclesCleared 事件

**預期結果:**

- 事件通過 Store 系統管理
- 支持多組件事件通信

---

### ✅ 第 6 步：遷移測試工具 (10 分鐘)

**修改位置:** 第 1310-1350 行左右

**修改內容:**

```javascript
// 修改前
window.setVehicleDistance = (multiplier) => { ... }
window.testNewTrafficFlow = () => { ... }
window.diagnostics = { ... }

// 修改後
store.setVehicleDistance = (multiplier) => { ... }
store.testNewTrafficFlow = () => { ... }
store.diagnostics = { ... }
```

**預期結果:**

- 測試工具可通過 `store` 訪問
- 不再污染全局 `window` 對象

---

### ✅ 第 7 步：卸載清理 (10 分鐘)

**修改位置:** `onUnmounted()`

**修改內容:**

```javascript
// 修改前
window.removeEventListener('scenarioChanged', handleScenarioChange)
window.trafficCleanup()
window.trafficController = null
window.liveVehicles = []

// 修改後
store.off('scenarioChanged', handleScenarioChange)
store.reset() // 統一清理所有狀態
```

**預期結果:**

- Store 狀態完全重置
- 無內存洩漏風險

---

### ✅ 第 8 步：編譯和測試 (15 分鐘)

**步驟:**

```bash
# 1. 編譯驗證
npm run build

# 2. 啟動開發服務器（如果不在運行）
quasar dev

# 3. 手動測試
# - 生成車輛
# - 切換場景
# - 清空車輛
# - 查看控制台無錯誤
```

**預期結果:**

- ✅ Build 成功
- ✅ 無 TypeScript 錯誤
- ✅ 功能正常運作
- ✅ 控制台無警告

---

## 🎯 優先級衝突處理

### 與 handleScenarioChange 的衝突

**問題:** `handleScenarioChange` 訪問 `window.autoTrafficGenerator`

```javascript
// 修改前
if (window.autoTrafficGenerator && event.detail && event.detail.config) window.autoTrafficGenerator.updateConfig(config)

// 修改後
const generator = store.getAutoTrafficGenerator()
if (generator && event.detail && event.detail.config) generator.updateConfig(config)
```

### 與 selectOptimalLane 的衝突

**問題:** 該函數同時訪問 `activeCars.value` 和 `window.lastApiVDDataArray`

```javascript
// 修改前：混合使用
const laneCounts = activeCars.value.filter(...)
const apiData = window.lastApiVDDataArray[dirIndex]

// 修改後：統一使用 Store
const liveVehicles = store.getLiveVehicles()
const laneCounts = liveVehicles.filter(...)
const lastApiData = store.getLastApiVDDataArray()
```

---

## ⚠️ 風險點和緩解措施

### 風險 1：車輛無法正確同步

**原因:** 車輛 remove() 仍可能訪問 window.liveVehicles
**緩解:** Phase 4 同時處理 Vehicle.js 遷移

### 風險 2：事件系統延遲

**原因:** Store.emit() 使用異步回調
**緩解:** 在 emit 前同步更新 Store 狀態

### 風險 3：HMR 恢復失敗

**原因:** Store 狀態丟失，全局引用無效
**緩解:** 在 setup 中完全重新初始化

---

## 📊 驗收標準

| 項目     | 標準                     | 狀態 |
| -------- | ------------------------ | ---- |
| 編譯     | npm run build 成功       | ⏳   |
| 無錯誤   | 控制台無 TypeScript 錯誤 | ⏳   |
| 功能完整 | 所有交通模擬功能正常     | ⏳   |
| 無洩漏   | 無 `window` 全域污染     | ⏳   |
| 車輛管理 | 車輛生成/銷毀正常        | ⏳   |
| 場景切換 | 場景切換無誤             | ⏳   |

---

## 🚀 預期成果

✅ IndexPage.vue 完全遷移到 Pinia
✅ 移除所有 `window.trafficController` 等全域引用
✅ 實現統一的狀態管理
✅ 為 Phase 3 的其他類別遷移奠定基礎

---

## 📝 提交計劃

建議分成 3-4 個 commit：

1. **Commit 1:** 添加 Store 導入和基本初始化
2. **Commit 2:** 遷移車輛管理邏輯
3. **Commit 3:** 遷移事件和數據系統
4. **Commit 4:** 移除 onUnmounted 中的舊 window 引用

---

**開始時間:** NOW
**預計完成:** 2-3 小時後

讓我們開始吧！ 🎉
