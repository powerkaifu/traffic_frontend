# 🎯 架構解耦遷移指南 - Priority 3

## 概述

本指南用於將項目從依賴 `window` 全域變數的架構遷移到 **Pinia 狀態管理**架構。

### 🔴 為什麼要做這個？

| 問題 | 影響 |
|------|------|
| 高耦合度 | 很難追蹤狀態變化，除錯困難 |
| 全域污染 | `window` 對象包含了大量內部狀態，易出錯 |
| 無類型檢查 | TypeScript 無法提供智能提示 |
| 難以測試 | 無法隔離不同模塊進行單元測試 |
| 內存泄漏 | 沒有清晰的生命週期管理 |

### ✅ 移至 Pinia 的好處

- **單向數據流**：狀態變化可預測且易於追蹤
- **TypeScript 支持**：完整的類型安全和智能提示
- **響應式追蹤**：狀態變化自動更新 UI
- **DevTools 集成**：可視化調試 Pinia 狀態
- **模塊化**：清晰的職責分離
- **可測試性**：易於進行單元測試

---

## 📋 遷移計劃

### Phase 1: Store 基礎（已完成）

✅ 創建 `src/stores/simulationStore.js`
- 包含所有全域狀態的 actions 和 getters
- 提供事件系統替代 `window.dispatchEvent`
- 包含統計信息和清理管理

### Phase 2: IndexPage.vue 遷移（優先）

目標：將 `src/pages/IndexPage.vue` 從 `window` 遷移到 Store

#### 2.1 初始化遷移

**修改位置**：`src/pages/IndexPage.vue` 頂部 imports

```javascript
// 新增
import { useSimulationStore } from 'src/stores/simulationStore'

export default {
  setup() {
    const simulationStore = useSimulationStore()
    
    // 移除以下全域變數賦值：
    // window.liveVehicles = activeCars.value
    // window.trafficController = trafficController
    // 等等...
    
    // 改用 Store：
    // simulationStore.setTrafficController(trafficController)
    // simulationStore.liveVehicles 直接讀取
  }
}
```

#### 2.2 變數遷移對照表

| 舊（window）| 新（Store）| 位置 |
|-----------|----------|------|
| `window.liveVehicles` | `simulationStore.liveVehicles` | IndexPage.vue setup |
| `window.trafficController` | `simulationStore.trafficController` | IndexPage.vue setup |
| `window.autoTrafficGenerator` | `simulationStore.autoTrafficGenerator` | IndexPage.vue setup |
| `window.collisionController` | `simulationStore.collisionController` | IndexPage.vue setup |
| `window.adaptiveFlowController` | `simulationStore.adaptiveFlowController` | IndexPage.vue setup |
| `window.currentGeneratedVDData` | `simulationStore.currentGeneratedVDData` | IndexPage.vue setup |
| `window.lastApiVDDataArray` | `simulationStore.lastApiVDDataArray` | IndexPage.vue setup |
| `window.cleanupVehicleInterval` | `simulationStore.cleanupVehicleInterval` | IndexPage.vue setup |

### Phase 3: AutoTrafficGenerator 遷移

目標：在 AutoTrafficGenerator 中移除 `window.*` 賦值

#### 3.1 當前問題代碼

```javascript
// AutoTrafficGenerator.js - 需要移除的代碼
window.liveVehicles = ...
window.currentGeneratedVDData = ...
window.lastApiVDDataArray = ...
window.selectedTrafficScenario = ...
window.selectedTrafficTimePeriod = ...
```

#### 3.2 遷移方案

**方案 A：傳入 Store（推薦）**

```javascript
// AutoTrafficGenerator.js - 修改 constructor
constructor(trafficController, simulationStore = null) {
  this.trafficController = trafficController
  this.simulationStore = simulationStore // ✅ 新增
  this.isRunning = false
  // ...
}

// 在生成數據時使用 Store
_generateScenarioVDData(scenarioKey) {
  // ...生成數據...
  
  // ✅ 使用 Store 而非 window
  if (this.simulationStore) {
    this.simulationStore.setCurrentGeneratedVDData({
      apiDataArray: apiDataArray,
      vdData: visualVDData,
      timestamp: new Date().toISOString(),
      scenario: scenarioKey,
    })
  } else {
    // 備用：用於相容舊代碼
    window.currentGeneratedVDData = { ...}
  }
}
```

### Phase 4: Vehicle.js 遷移

目標：在 Vehicle 中移除對 `window.liveVehicles` 的直接操作

#### 4.1 當前問題代碼

```javascript
// Vehicle.js - 需要修改的代碼
const index = window.liveVehicles.indexOf(this)
if (index > -1) window.liveVehicles.splice(index, 1)

window.dispatchEvent(new CustomEvent('vehicleRemoved', ...))
```

#### 4.2 遷移方案

**替代方案**：由 IndexPage.vue RAF 迴圈負責車輛移除

```javascript
// Vehicle.js - 標記車輛為"完成"而非直接移除
remove() {
  this.isCompleted = true // ✅ 只是標記，不移除
  // 不再調用 window.dispatchEvent
  // 不再直接操作 window.liveVehicles
}

// IndexPage.vue - mainSimulationLoop 中
function mainSimulationLoop() {
  // ...其他邏輯...
  
  // ✅ 集中處理車輛移除
  const completedVehicles = simulationStore.liveVehicles.filter(v => v.isCompleted)
  if (completedVehicles.length > 0) {
    simulationStore.removeVehicles(completedVehicles.map(v => v.id))
    simulationStore.emit('vehicleRemoved', { vehicles: completedVehicles })
  }
}
```

### Phase 5: TrafficLightController 遷移

目標：在 TrafficLightController 中使用 Store 讀取/寫入數據

#### 5.1 當前問題代碼

```javascript
// TrafficLightController.js
if (window.currentGeneratedVDData?.apiDataArray) {
  dataToSend = window.currentGeneratedVDData.apiDataArray
}
```

#### 5.2 遷移方案

```javascript
// TrafficLightController.js - constructor 中注入 Store
constructor(simulationStore = null) {
  this.simulationStore = simulationStore
  // ... 其他初始化...
}

// 在 sendDataToBackend 中
async sendDataToBackend(vdData = null) {
  // ✅ 使用 Store 讀取數據
  let dataToSend = vdData
  if (!dataToSend && this.simulationStore?.currentGeneratedVDData?.apiDataArray) {
    dataToSend = this.simulationStore.currentGeneratedVDData.apiDataArray
  }
  // ...繼續邏輯...
}
```

### Phase 6: CollisionController 遷移

目標：在碰撞檢測中使用 Store 管理狀態

#### 6.1 遷移方案

```javascript
// CollisionController.js - constructor 中注入 Store
constructor(simulationStore = null) {
  this.simulationStore = simulationStore
  // ...
}

// 在檢測碰撞時
checkSimpleCollision(vehicle1, vehicle2) {
  // ...碰撞檢測邏輯...
  
  if (isColliding) {
    // ✅ 通過 Store 發送事件
    this.simulationStore?.emit('vehicleCollision', {
      vehicle1: vehicle1.id,
      vehicle2: vehicle2.id,
    })
  }
}
```

---

## 🛠️ 逐步遷移步驟

### Step 1: IndexPage.vue 中設置 Store

```vue
<script setup>
import { useSimulationStore } from 'src/stores/simulationStore'

// 在 setup 中初始化 Store
const simulationStore = useSimulationStore()

// 在初始化時設置核心模塊
onMounted(() => {
  const trafficController = new TrafficLightController()
  const autoTrafficGenerator = new AutoTrafficGenerator(trafficController, simulationStore) // ✅ 傳入 Store
  
  simulationStore.setTrafficController(trafficController)
  simulationStore.setAutoTrafficGenerator(autoTrafficGenerator)
  
  // 不再使用 window 賦值
  // window.trafficController = trafficController
  // window.autoTrafficGenerator = autoTrafficGenerator
})

// 在 RAF 迴圈中使用 Store
function mainSimulationLoop() {
  const autoGen = simulationStore.autoTrafficGenerator
  const vehicles = simulationStore.liveVehicles
  
  // 使用 Store 中的數據
  // ...
}

// 在卸載時重置 Store
onUnmounted(() => {
  simulationStore.reset()
})
</script>
```

### Step 2: AutoTrafficGenerator 中設置 Store

```javascript
// AutoTrafficGenerator.js
constructor(trafficController, simulationStore = null) {
  this.trafficController = trafficController
  this.simulationStore = simulationStore
  // ...
}

// 在生成數據時
_generateScenarioVDData(scenarioKey) {
  // ...生成邏輯...
  
  // ✅ 使用 Store 設置數據
  if (this.simulationStore) {
    this.simulationStore.setCurrentGeneratedVDData({
      apiDataArray,
      vdData: displayData,
      timestamp: new Date().toISOString(),
      scenario: scenarioKey,
    })
    
    this.simulationStore.setLastApiVDDataArray(apiDataArray)
  }
  
  // ✅ 發送事件（使用 Store 而非 window.dispatchEvent）
  this.simulationStore?.emit('trafficDataGenerated', {
    data: { apiDataArray, vdData: displayData },
  })
}

// 在生成車輛時
_generateVehicle() {
  // ...生成邏輯...
  
  // ✅ 使用 Store 添加車輛
  if (this.simulationStore) {
    this.simulationStore.addVehicle(newVehicle)
  }
  
  // ✅ 發送事件
  this.simulationStore?.emit('vehicleAdded', {
    direction: selectedDir,
    type: type,
    speed: speed,
  })
}
```

### Step 3: Vehicle.js 中標記完成

```javascript
// Vehicle.js
remove() {
  this.isCompleted = true // ✅ 只標記，不移除
  
  // ✅ 不再使用以下代碼：
  // const index = window.liveVehicles.indexOf(this)
  // if (index > -1) window.liveVehicles.splice(index, 1)
  // window.dispatchEvent(...)
}
```

### Step 4: IndexPage.vue 中集中管理車輛移除

```javascript
// IndexPage.vue - mainSimulationLoop 中
function mainSimulationLoop() {
  // ...其他邏輯...
  
  // ✅ 檢查並移除完成的車輛
  const completedVehicles = simulationStore.liveVehicles.filter(v => v.isCompleted)
  if (completedVehicles.length > 0) {
    const vehicleIds = completedVehicles.map(v => v.id)
    
    // 執行清理邏輯
    completedVehicles.forEach(v => {
      if (v.remove) v.remove()
    })
    
    // 從 Store 移除
    simulationStore.removeVehicles(vehicleIds)
    
    // 發送事件
    simulationStore.emit('vehiclesRemoved', { count: vehicleIds.length })
  }
}
```

### Step 5: TrafficLightController 中使用 Store

```javascript
// TrafficLightController.js
constructor(simulationStore = null) {
  this.simulationStore = simulationStore
  // ...
}

async sendDataToBackend(vdData = null) {
  // ✅ 優先使用傳入的數據，否則從 Store 讀取
  let dataToSend = vdData
  
  if (!dataToSend && this.simulationStore?.currentGeneratedVDData?.apiDataArray) {
    dataToSend = this.simulationStore.currentGeneratedVDData.apiDataArray
  }
  
  if (!dataToSend && this.simulationStore?.liveVehicles) {
    // 備用方案：從 Store 的車輛列表收集數據
    dataToSend = this.collectIntersectionData()
  }
  
  // ...繼續邏輯...
}
```

---

## 📝 事件系統遷移

### 舊方式（window.dispatchEvent）

```javascript
window.dispatchEvent(new CustomEvent('vehicleAdded', {
  detail: { vehicle: newVehicle }
}))

window.addEventListener('vehicleAdded', (event) => {
  console.log('車輛已添加:', event.detail.vehicle)
})
```

### 新方式（Store events）

```javascript
// 發送事件
simulationStore.emit('vehicleAdded', { vehicle: newVehicle })

// 訂閱事件
const unsubscribe = simulationStore.subscribe('vehicleAdded', (detail) => {
  console.log('車輛已添加:', detail.vehicle)
})

// 取消訂閱（調用返回的函數）
unsubscribe()
```

### 事件列表

| 事件名 | 舊（window） | 新（Store） | 用途 |
|-------|-----------|----------|------|
| vehicleAdded | ✅ | ✅ | 車輛生成 |
| vehicleRemoved | ✅ | ✅ | 車輛移除 |
| trafficDataGenerated | ✅ | ✅ | VD 數據生成 |
| vehicleCollision | ❌ | ✅ | 車輛碰撞 |
| apiDataSending | ❌ | ✅ | API 發送開始 |
| apiDataSent | ❌ | ✅ | API 發送完成 |
| scenarioChanged | ✅ | ✅ | 情景變更 |

---

## 🔍 檢查清單

### Phase 1: Store 創建 ✅

- [x] 創建 `src/stores/simulationStore.js`
- [x] 定義所有狀態變數
- [x] 創建 actions (addVehicle, removeVehicle 等)
- [x] 創建事件系統 (subscribe, emit)
- [x] 創建 getters (vehicleCount 等)

### Phase 2: IndexPage.vue 遷移 ⏳

- [ ] 導入 simulationStore
- [ ] 在 setup() 中初始化 Store
- [ ] 替換所有 `window.*` 賦值
- [ ] 更新 RAF 迴圈使用 Store 數據
- [ ] 添加卸載時的 Store reset
- [ ] 驗證功能完整性

### Phase 3: AutoTrafficGenerator 遷移 ⏳

- [ ] 在 constructor 中接收 simulationStore 參數
- [ ] 替換 `window.liveVehicles` → `simulationStore.addVehicle()`
- [ ] 替換 `window.currentGeneratedVDData = ...` → `simulationStore.setCurrentGeneratedVDData()`
- [ ] 替換 `window.dispatchEvent()` → `simulationStore.emit()`
- [ ] 驗證車輛生成功能

### Phase 4: Vehicle.js 遷移 ⏳

- [ ] 移除 `window.liveVehicles.splice()` 邏輯
- [ ] 改為設置 `this.isCompleted = true`
- [ ] 移除 `window.dispatchEvent('vehicleRemoved')`
- [ ] 驗證車輛完成邏輯

### Phase 5: TrafficLightController 遷移 ⏳

- [ ] 在 constructor 中接收 simulationStore 參數
- [ ] 在 sendDataToBackend() 中使用 Store
- [ ] 替換所有 `window.currentGeneratedVDData` 讀取
- [ ] 替換所有 `window.lastApiVDDataArray` 讀取

### Phase 6: CollisionController 遷移 ⏳

- [ ] 在 constructor 中接收 simulationStore 參數
- [ ] 用 `simulationStore.emit()` 替換 `window.dispatchEvent()`
- [ ] 驗證碰撞檢測功能

### 驗證與測試

- [ ] 構建通過 (`npm run build`)
- [ ] 開發服務器啟動（`quasar dev`）
- [ ] 車輛正常生成和移除
- [ ] 交通燈正常變化
- [ ] API 數據正常發送
- [ ] 控制台無 `window.*` 相關警告
- [ ] DevTools 中可以看到 Pinia Store 狀態

---

## 📚 相關文件

- **Store**: `src/stores/simulationStore.js` (新建)
- **Main Consumer**: `src/pages/IndexPage.vue` (待改)
- **Data Generator**: `src/classes/AutoTrafficGenerator.js` (待改)
- **Vehicle Model**: `src/classes/Vehicle.js` (待改)
- **Traffic Light**: `src/classes/TrafficLightController.js` (待改)
- **Collision**: `src/classes/vehicle_utils/CollisionController.js` (待改)

---

## 🚀 後續步驟

1. ✅ 完成 Phase 1（Store 創建）
2. ⏳ 開始 Phase 2（IndexPage.vue 遷移）- **立即開始**
3. ⏳ Phase 3-6：按順序逐步遷移
4. 📊 使用 Pinia DevTools 驗證狀態
5. 🧪 運行完整測試套件

---

## 💡 最佳實踐

### 1. 漸進式遷移
不要一次性修改整個項目。逐個模塊進行，每次修改後都驗證功能。

### 2. 向後相容
在過渡期間，保留 `window.*` 作為備用，但逐漸淘汰。

### 3. 類型安全
使用 TypeScript 接口定義 Store 的數據結構。

### 4. 事件命名
使用清晰、一致的事件名，例如 `vehicleAdded`, `vehicleRemoved` 等。

### 5. 錯誤處理
在 Store 中添加 try-catch 以捕獲潛在錯誤。

---

## 📞 故障排除

### 問題：Store 未被正確注入

```javascript
// ❌ 錯誤
const autoTrafficGenerator = new AutoTrafficGenerator(trafficController)

// ✅ 正確
const autoTrafficGenerator = new AutoTrafficGenerator(trafficController, simulationStore)
```

### 問題：事件訂閱未取消

```javascript
// ❌ 錯誤：內存洩漏
simulationStore.subscribe('vehicleAdded', callback)

// ✅ 正確：記得取消訂閱
const unsubscribe = simulationStore.subscribe('vehicleAdded', callback)
onUnmounted(() => unsubscribe())
```

### 問題：車輛未被正確添加到 Store

```javascript
// ❌ 錯誤
window.liveVehicles.push(vehicle)

// ✅ 正確
simulationStore.addVehicle(vehicle)
```

---

**遷移指南完成！** 按照上述步驟逐步進行，可以完全移除 `window` 全域變數的依賴。
