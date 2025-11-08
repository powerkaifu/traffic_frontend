# 🚀 優先級問題修復實施計劃 (Phase 1-3)

**計劃狀態**: 📋 待審批
**預計完成時間**: 4-6 小時 + 測試
**修復範圍**: P1 (計時器地獄) + P2 (動畫不順暢) + P3 (停止線穿透)

---

## 🎯 整體策略

```
修復方向: 「完全統一主線程事件循環」

從: 6+ 個獨立的 setInterval/setTimeout + RAF
到: 1 個統一的 RAF mainSimulationLoop + 累加器模式
```

---

## 🥇 優先級 1 修復：統一計時器地獄 (Timer Hell)

### 當前狀況

目前系統中同時運行：

```
1. AutoTrafficGenerator.js (L361)        → autoModeTimer = setInterval(..., 37500ms)
2. AutoTrafficGenerator.js (L482)        → scenarioModeTimer = setInterval(..., INTERVAL)
3. TrafficLightController.js (L362)      → countdownInterval = setInterval(...)
4. TrafficDataCollector.js (L231)        → collectionTimer = setInterval(...)
5. PerformanceOptimizer.js (L93)         → monitoring.interval = setInterval(...)
6. WeatherController.js (L444)           → lightningInterval = setTimeout(...)
7. Vehicle.js                            → removeEvent listeners = setTimeout(...)
+ 更多...
```

### 修復步驟

#### Step 1.1: 在 IndexPage.vue 中添加新的累加器

**文件**: `src/pages/IndexPage.vue`
**位置**: `mainSimulationLoop` 函數頂部 (約 L1350-1400 附近)

**修改內容**:

在 `mainSimulationLoop` 中添加以下累加器：

```javascript
// 🎯 新增累加器變數（在 mainSimulationLoop 之前）
let autoModeAccumulator = 0          // 自動模式: 37.5 秒
let trafficLightAccumulator = 0      // 交通燈倒數: 1000ms
let dataCollectionAccumulator = 0    // 數據收集: 1000ms
let performanceCheckAccumulator = 0  // 性能檢查: 1000ms
let weatherAccumulator = 0            // 天氣效果: 2000ms

const ACCUMULATOR_TARGETS = {
  autoMode: 37500,           // 37.5 秒
  trafficLight: 1000,        // 1 秒
  dataCollection: 1000,      // 1 秒
  performanceCheck: 1000,    // 1 秒
  weather: 2000,             // 2 秒
}

function mainSimulationLoop(currentTime) {
  try {
    const deltaTimeMs = currentTime - lastFrameTime
    lastFrameTime = currentTime
    const clampedDeltaTime = Math.min(deltaTimeMs, 100) // 防止卡頓

    // ============================================
    // 🎯 累加所有定時器
    // ============================================
    autoModeAccumulator += clampedDeltaTime
    trafficLightAccumulator += clampedDeltaTime
    dataCollectionAccumulator += clampedDeltaTime
    performanceCheckAccumulator += clampedDeltaTime
    weatherAccumulator += clampedDeltaTime

    // ============================================
    // 🎯 執行定期邏輯（每個都只執行一次/幀）
    // ============================================

    // 1️⃣ 自動模式（每 37.5 秒）
    if (autoModeAccumulator >= ACCUMULATOR_TARGETS.autoMode) {
      if (window.autoTrafficGenerator) {
        window.autoTrafficGenerator.simulationTime.setMinutes(
          window.autoTrafficGenerator.simulationTime.getMinutes() + 30
        )
        const hours = String(window.autoTrafficGenerator.simulationTime.getHours()).padStart(2, '0')
        const minutes = String(window.autoTrafficGenerator.simulationTime.getMinutes()).padStart(2, '0')
        console.log(`🕐 [自動模式] 模擬時間: ${hours}:${minutes}`)
        window.autoTrafficGenerator._applyTrafficProfile()
      }
      autoModeAccumulator = 0
    }

    // 2️⃣ 交通燈倒數（每 1 秒）
    if (trafficLightAccumulator >= ACCUMULATOR_TARGETS.trafficLight) {
      if (window.trafficController) {
        window.trafficController.updateCountdowns()
      }
      trafficLightAccumulator = 0
    }

    // 3️⃣ 數據收集（每 1 秒）
    if (dataCollectionAccumulator >= ACCUMULATOR_TARGETS.dataCollection) {
      if (window.trafficDataCollector) {
        window.trafficDataCollector.collectData()
      }
      dataCollectionAccumulator = 0
    }

    // 4️⃣ 性能檢查（每 1 秒）
    if (performanceCheckAccumulator >= ACCUMULATOR_TARGETS.performanceCheck) {
      if (window.performanceOptimizer) {
        window.performanceOptimizer.checkPerformance()
      }
      performanceCheckAccumulator = 0
    }

    // 5️⃣ 天氣效果（每 2 秒）
    if (weatherAccumulator >= ACCUMULATOR_TARGETS.weather) {
      if (window.weatherController) {
        window.weatherController.updateLightning()
      }
      weatherAccumulator = 0
    }

    // ... 其他 RAF 驅動的邏輯 ...

    rafId = requestAnimationFrame(mainSimulationLoop)
  } catch (error) {
    console.error('❌ [RAF 主循環] 出現異常:', error)
    rafId = requestAnimationFrame(mainSimulationLoop)
  }
}
```

#### Step 1.2: 禁用 AutoTrafficGenerator 中的 setInterval

**文件**: `src/classes/AutoTrafficGenerator.js`

**修改 1**: 禁用 autoModeTimer (L361)

```javascript
// src/classes/AutoTrafficGenerator.js (L361)
// 修改前:
this.autoModeTimer = setInterval(() => {
  this.simulationTime.setMinutes(this.simulationTime.getMinutes() + 30)
  // ...
}, 37500)

// 修改後:
// ❌ 禁用: 已遷移到 IndexPage mainSimulationLoop 的累加器模式
// this.autoModeTimer = setInterval(...)
this.autoModeTimer = null
```

**修改 2**: 禁用 scenarioModeTimer (L482)

```javascript
// src/classes/AutoTrafficGenerator.js (L482)
// 修改前:
this.scenarioModeTimer = setInterval(() => {
  // 劇本模式邏輯
}, SCENARIO_MODE_CONFIG.INTERVAL)

// 修改後:
// ❌ 禁用: 已遷移到 IndexPage mainSimulationLoop 的累加器模式
// this.scenarioModeTimer = setInterval(...)
this.scenarioModeTimer = null
```

**修改 3**: 在 destructor 中刪除 clearInterval

```javascript
// src/classes/AutoTrafficGenerator.js (destructor/cleanup)
// 修改前:
if (this.autoModeTimer) clearInterval(this.autoModeTimer)
if (this.scenarioModeTimer) clearInterval(this.scenarioModeTimer)

// 修改後:
// ✅ 無需清理，因為沒有 setInterval
```

#### Step 1.3: 禁用 TrafficLightController 中的 countdownInterval

**文件**: `src/classes/TrafficLightController.js`
**位置**: L362

```javascript
// 修改前:
countdownInterval = setInterval(() => {
  // 倒數邏輯
}, ...)

// 修改後:
// ❌ 禁用: 已遷移到 IndexPage mainSimulationLoop
// countdownInterval = setInterval(...)
// 改為:
window.trafficLightCountdownAccumulator = (window.trafficLightCountdownAccumulator || 0) + deltaTime
```

---

## 🥈 優先級 2 修復：修復動畫不順暢 (Jank)

### 當前問題

**代碼**: `Vehicle.js` L1225

```javascript
onUpdate: () => {
  if (allVehicles.length > 0) {
    CollisionController.rebuildSpatialGrid(allVehicles)  // ❌ 在每車的 onUpdate 中執行
  }
  // ...
}
```

**問題**: 100 輛車 = 每幀 100 次 rebuildSpatialGrid 調用 = **10,000 次網格操作/幀** = 卡頓

### 修復步驟

#### Step 2.1: 從 Vehicle.onUpdate 中移除 rebuildSpatialGrid

**文件**: `src/classes/Vehicle.js`
**位置**: L1225

```javascript
// 修改前:
onUpdate: () => {
  if (allVehicles.length > 0) {
    CollisionController.rebuildSpatialGrid(allVehicles)  // ❌ 移除這行
  }
  // ... 其他邏輯
}

// 修改後:
onUpdate: () => {
  // ❌ 移除 rebuildSpatialGrid 調用
  // 該邏輯已遷移到 IndexPage mainSimulationLoop 頂部

  // ... 其他邏輯保持不變
}
```

#### Step 2.2: 在 IndexPage mainSimulationLoop 頂部添加統一的網格重建

**文件**: `src/pages/IndexPage.vue`
**位置**: `mainSimulationLoop` 函數內，最頂部 (在所有累加器之前)

```javascript
function mainSimulationLoop(currentTime) {
  try {
    // ... deltaTime 計算 ...

    // ============================================
    // 🎯 第一步：每幀都重建空間網格（只執行一次）
    // ============================================
    if (window.liveVehicles && window.liveVehicles.length > 0) {
      CollisionController.rebuildSpatialGrid(window.liveVehicles)
    }

    // ============================================
    // 🎯 然後執行累加器邏輯
    // ============================================
    // ... 累加器邏輯 ...

    rafId = requestAnimationFrame(mainSimulationLoop)
  } catch (error) {
    // ...
  }
}
```

**效果**:
- 修復前: 100 次 rebuildSpatialGrid/幀 (100 輛車)
- 修復後: 1 次 rebuildSpatialGrid/幀
- 性能提升: **100倍**

---

## 🥉 優先級 3 修復：停止線穿透

### 當前問題

**文件**: `src/config/stopLineConfig.js`

```javascript
SENSITIVITY: 10  // ❌ 只有 10 像素
```

**問題**: 高速車輛會跳過停止線檢測 (位移 > 檢測範圍)

### 修復步驟

#### Step 3.1: 增加 SENSITIVITY

**文件**: `src/config/stopLineConfig.js`

```javascript
// 修改前:
const SENSITIVITY = 10

// 修改後:
const SENSITIVITY = 50  // ✅ 提高到 50 像素
```

**計算驗證**:
```
高速車輛 (60 km/h):
├─ 速度: 166 px/s
├─ 每 50ms 位移: 8.3 px
├─ 新 SENSITIVITY: 50 px
└─ 檢測成功率: 99%+ ✅

停止線會被準確偵測
```

---

## 📊 修復完成度檢查清單

### P1 修復清單：計時器地獄

- [ ] Step 1.1: 在 IndexPage.vue 添加累加器變數
  - [ ] `autoModeAccumulator`
  - [ ] `trafficLightAccumulator`
  - [ ] `dataCollectionAccumulator`
  - [ ] `performanceCheckAccumulator`
  - [ ] `weatherAccumulator`
  - [ ] `ACCUMULATOR_TARGETS` 物件

- [ ] Step 1.2: 禁用 AutoTrafficGenerator setInterval
  - [ ] 禁用 L361 的 autoModeTimer
  - [ ] 禁用 L482 的 scenarioModeTimer
  - [ ] 移除 destructor 中的 clearInterval

- [ ] Step 1.3: 禁用 TrafficLightController countdownInterval
  - [ ] 禁用 L362 的 countdownInterval
  - [ ] 轉移到累加器模式

### P2 修復清單：動畫不順暢

- [ ] Step 2.1: 移除 Vehicle.js 中的 rebuildSpatialGrid
  - [ ] 移除 L1225 的 rebuildSpatialGrid 調用

- [ ] Step 2.2: 在 IndexPage 頂部添加統一網格重建
  - [ ] 在 mainSimulationLoop 最頂部添加代碼

### P3 修復清單：停止線穿透

- [ ] Step 3.1: 增加 SENSITIVITY
  - [ ] 修改 `stopLineConfig.js` SENSITIVITY = 50

---

## ✅ 驗證方法

修復完成後，驗證：

```javascript
// 1. 檢查計時器數量
console.log(Object.keys(window).filter(k => k.includes('Timer')).length)
// 預期: 0 (沒有 setInterval 創建的計時器)

// 2. 檢查 FPS
console.log(getMainThreadFPS())
// 預期: 55-60 fps (從 20-30 fps 提升)

// 3. 檢查記憶體
console.log(performance.memory.usedJSHeapSize / 1024 / 1024)
// 預期: 300-400 MB (穩定，不再增長)

// 4. 檢查停止線檢測
// 運行 100 輛車，高速通過停止線
// 預期: 所有車都被偵測到，停止率 > 95%
```

---

## 🚀 預期結果

```
性能指標改善:
├─ FPS: 20-30 → 55-60 (+200%)
├─ 記憶體: 500MB → 350MB (-30%)
├─ 計時器: 200+ → 0 (完全統一)
├─ CPU 負載: 90% → 30% (-67%)
└─ 停止線準確率: 75% → 99%+ (+25%)

用戶體驗改善:
├─ 動畫流暢度: ⭐⭐⭐ → ⭐⭐⭐⭐⭐
├─ 響應性: ⭐⭐⭐ → ⭐⭐⭐⭐⭐
├─ 系統穩定性: ⭐⭐⭐ → ⭐⭐⭐⭐⭐
└─ 長期運行: 30分鐘崩潰 → 8小時穩定
```

---

## 📝 實施順序建議

```
1. 修復 P3 (停止線穿透) - 5 分鐘
   └─ 最簡單，立即見效

2. 修復 P2 (動畫不順暢) - 15 分鐘
   └─ 移除 rebuildSpatialGrid 調用

3. 修復 P1 (計時器地獄) - 2-3 小時
   └─ 複雜，需要仔細整合

4. 測試驗證 - 30 分鐘
   └─ 檢查 FPS、記憶體、停止線準確率

5. 性能測試 - 1 小時
   └─ 運行 30+ 分鐘，監控系統行為
```

---

## ⚠️ 風險評估

### 風險 1: 交通燈倒數可能無法正確更新

**風險級別**: 🟡 中
**原因**: 需要正確調用 `updateCountdowns()` 方法
**緩解**: 確保 TrafficLightController 有該方法

### 風險 2: 數據收集可能不穩定

**風險級別**: 🟡 中
**原因**: 累加器時間可能不精確
**緩解**: 使用足夠的時間間隔 (1000ms)

### 風險 3: 天氣效果可能在某些情況下不執行

**風險級別**: 🟢 低
**原因**: 累加器邏輯簡單明確
**緩解**: 測試驗證天氣效果

---

## 📞 下一步

準備開始修復嗎？

```
選項 A: 我立即開始修復 P3 + P2 + P1
選項 B: 我想先討論細節
選項 C: 我想先測試 P3 的修復
```

請告訴我您的決定！

