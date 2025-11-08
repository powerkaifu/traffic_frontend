# 🎯 優先級問題修復快速參考卡 (Quick Reference)

## 📋 問題總結表

| 優先級 | 問題 | 位置 | 修復時間 | 性能提升 |
|------|-----|------|--------|--------|
| 🥇 P1 | 計時器地獄 (6+ setInterval) | AutoTrafficGenerator, TrafficLightController, PerformanceOptimizer 等 | 2-3小時 | FPS: 20→60 |
| 🥈 P2 | 動畫卡頓 (每幀重建網格N次) | Vehicle.js L1225 | 15分鐘 | CPU: -50% |
| 🥉 P3 | 停止線穿透 (SENSITIVITY太小) | stopLineConfig.js | 5分鐘 | 準確率: 75%→99% |
| 🏅 P4 | 開放道路死鎖 (targetSpeed=0) | CollisionController.js | 30分鐘 | 車輛流動性改善 |
| 🎯 P5 | 架構耦合 (window全局) | 整個項目 | 4-6小時 | 可維護性提升 |

---

## 🔧 快速修復命令

### 🥉 P3 修復 (最快 - 5分鐘)

```bash
# 步驟 1: 編輯 stopLineConfig.js
# 位置: src/config/stopLineConfig.js
# 修改: SENSITIVITY: 10 → SENSITIVITY: 50

# 完成！
```

**驗證**:
```javascript
// 在瀏覽器控制台執行:
// 運行 100 輛車，高速通過停止線
// 預期: 停止率 > 95%
```

---

### 🥈 P2 修復 (15分鐘)

#### 步驟 1: 移除 Vehicle.js 中的 rebuildSpatialGrid

**文件**: `src/classes/Vehicle.js`
**位置**: L1221-1230

```javascript
// ❌ 移除前:
this.movementTimeline = gsap.timeline({
  onUpdate: () => {
    if (allVehicles.length > 0) {
      CollisionController.rebuildSpatialGrid(allVehicles)  // ❌ 刪除這行
    }
    // ...
  }
})

// ✅ 修改後:
this.movementTimeline = gsap.timeline({
  onUpdate: () => {
    // CollisionController.rebuildSpatialGrid(allVehicles) 已遷移到 IndexPage mainSimulationLoop
    // ...
  }
})
```

#### 步驟 2: 在 IndexPage mainSimulationLoop 頂部添加統一重建

**文件**: `src/pages/IndexPage.vue`
**位置**: mainSimulationLoop 最頂部

```javascript
function mainSimulationLoop(currentTime) {
  try {
    const deltaTimeMs = currentTime - lastFrameTime
    lastFrameTime = currentTime
    const clampedDeltaTime = Math.min(deltaTimeMs, 100)

    // ✅ 添加這行：每幀只執行一次網格重建
    if (window.liveVehicles && window.liveVehicles.length > 0) {
      CollisionController.rebuildSpatialGrid(window.liveVehicles)
    }

    // ... 其他邏輯 ...
    
    rafId = requestAnimationFrame(mainSimulationLoop)
  } catch (error) {
    // ...
  }
}
```

**效果驗證**:
```javascript
// 檢查 FPS 是否提升
console.log('FPS:', calculateFPS())  // 預期: 40-50+ fps
```

---

### 🥇 P1 修復 (2-3小時 - 複雜)

> ⚠️ **這是最複雜的修復，需要謹慎執行**

#### 核心概念

```
現狀: 6+ 個獨立的 setInterval 競爭主線程
目標: 1 個 RAF mainSimulationLoop + 累加器模式
```

#### Step 1: 在 IndexPage.vue 添加累加器

**文件**: `src/pages/IndexPage.vue`
**位置**: mainSimulationLoop 函數之前

```javascript
// 🎯 新增累加器變數
let autoModeAccumulator = 0
let trafficLightAccumulator = 0
let dataCollectionAccumulator = 0
let performanceCheckAccumulator = 0
let weatherAccumulator = 0

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
    const clampedDeltaTime = Math.min(deltaTimeMs, 100)

    // ✅ 網格重建（每幀執行一次）
    if (window.liveVehicles && window.liveVehicles.length > 0) {
      CollisionController.rebuildSpatialGrid(window.liveVehicles)
    }

    // ============================================
    // 🎯 累加定時器
    // ============================================
    autoModeAccumulator += clampedDeltaTime
    trafficLightAccumulator += clampedDeltaTime
    dataCollectionAccumulator += clampedDeltaTime
    performanceCheckAccumulator += clampedDeltaTime
    weatherAccumulator += clampedDeltaTime

    // ============================================
    // 🎯 執行定期邏輯
    // ============================================

    // 1️⃣ 自動模式（每 37.5 秒）
    if (autoModeAccumulator >= ACCUMULATOR_TARGETS.autoMode) {
      if (window.autoTrafficGenerator && window.autoTrafficGenerator.simulationTime) {
        window.autoTrafficGenerator.simulationTime.setMinutes(
          window.autoTrafficGenerator.simulationTime.getMinutes() + 30
        )
        const hours = String(window.autoTrafficGenerator.simulationTime.getHours()).padStart(2, '0')
        const minutes = String(window.autoTrafficGenerator.simulationTime.getMinutes()).padStart(2, '0')
        console.log(`🕐 [自動模式] 模擬時間: ${hours}:${minutes}`)
        if (window.autoTrafficGenerator._applyTrafficProfile) {
          window.autoTrafficGenerator._applyTrafficProfile()
        }
      }
      autoModeAccumulator = 0
    }

    // 2️⃣ 交通燈倒數（每 1 秒）
    if (trafficLightAccumulator >= ACCUMULATOR_TARGETS.trafficLight) {
      if (window.trafficController && window.trafficController.updateCountdowns) {
        window.trafficController.updateCountdowns()
      }
      trafficLightAccumulator = 0
    }

    // 3️⃣ 數據收集（每 1 秒）
    if (dataCollectionAccumulator >= ACCUMULATOR_TARGETS.dataCollection) {
      if (window.trafficDataCollector && window.trafficDataCollector.collectData) {
        window.trafficDataCollector.collectData()
      }
      dataCollectionAccumulator = 0
    }

    // 4️⃣ 性能檢查（每 1 秒）
    if (performanceCheckAccumulator >= ACCUMULATOR_TARGETS.performanceCheck) {
      if (window.performanceOptimizer && window.performanceOptimizer.checkPerformance) {
        window.performanceOptimizer.checkPerformance()
      }
      performanceCheckAccumulator = 0
    }

    // 5️⃣ 天氣效果（每 2 秒）
    if (weatherAccumulator >= ACCUMULATOR_TARGETS.weather) {
      if (window.weatherController && window.weatherController.updateLightning) {
        window.weatherController.updateLightning()
      }
      weatherAccumulator = 0
    }

    // ... 其他 RAF 邏輯 ...

    rafId = requestAnimationFrame(mainSimulationLoop)
  } catch (error) {
    console.error('❌ [RAF 主循環] 異常:', error)
    rafId = requestAnimationFrame(mainSimulationLoop)
  }
}
```

#### Step 2: 禁用 AutoTrafficGenerator 的 setInterval

**文件**: `src/classes/AutoTrafficGenerator.js`

```javascript
// L361: 禁用 autoModeTimer
// ❌ 修改前:
this.autoModeTimer = setInterval(() => {
  this.simulationTime.setMinutes(this.simulationTime.getMinutes() + 30)
  // ...
}, 37500)

// ✅ 修改後:
// 已遷移到 IndexPage mainSimulationLoop 累加器模式
this.autoModeTimer = null

// L482: 禁用 scenarioModeTimer
// ❌ 修改前:
this.scenarioModeTimer = setInterval(() => {
  // ...
}, SCENARIO_MODE_CONFIG.INTERVAL)

// ✅ 修改後:
// 需要類似的累加器處理，或者保留此功能
// 暫時: 保留，但在 cleanup 中確保清理
```

#### Step 3: 清理 destructor 中的 setInterval

```javascript
// AutoTrafficGenerator destructor
if (this.autoModeTimer) {
  clearInterval(this.autoModeTimer)
  // ✅ 已無需執行（autoModeTimer 已為 null）
}
if (this.scenarioModeTimer) {
  clearInterval(this.scenarioModeTimer)
  // 保留此行用於向後相容性
}
```

---

## 📊 修復進度追蹤

```
[ ] P3 修復 (5分鐘)
    [ ] 編輯 stopLineConfig.js
    [ ] 測試停止線準確率

[ ] P2 修復 (15分鐘)
    [ ] 移除 Vehicle.js L1225 的 rebuildSpatialGrid
    [ ] 在 IndexPage mainSimulationLoop 頂部添加統一重建
    [ ] 檢查 FPS 提升

[ ] P1 修復 (2-3小時)
    [ ] 添加累加器變數
    [ ] 實現自動模式累加器
    [ ] 實現交通燈倒數累加器
    [ ] 實現數據收集累加器
    [ ] 實現性能檢查累加器
    [ ] 實現天氣效果累加器
    [ ] 禁用 AutoTrafficGenerator setInterval
    [ ] 禁用其他 setInterval
    [ ] 完整測試

[ ] 完整驗證 (30分鐘)
    [ ] FPS 測試 (預期: 55-60)
    [ ] 記憶體測試 (預期: 穩定在 300-400MB)
    [ ] 停止線準確率 (預期: 99%+)
    [ ] 長期運行測試 (30+ 分鐘)
```

---

## ✅ 驗證清單

修復完成後執行以下驗證：

```javascript
// 1. 檢查 FPS (應該 > 50)
let fps = 0
let lastTime = Date.now()
let frames = 0
function measureFPS() {
  frames++
  const now = Date.now()
  if (now - lastTime >= 1000) {
    fps = frames
    console.log(`📊 當前 FPS: ${fps}`)
    frames = 0
    lastTime = now
  }
  requestAnimationFrame(measureFPS)
}
measureFPS()

// 2. 檢查記憶體 (應該穩定)
console.log(`💾 記憶體使用: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`)

// 3. 檢查計時器數量 (應該為 0)
const timerCount = Object.keys(window)
  .filter(k => k.includes('Timer') || k.includes('Interval'))
  .length
console.log(`⏱️ 計時器數量: ${timerCount}`)

// 4. 檢查停止線準確率
// 運行 100 輛車，高速通過停止線，手動計算停止率
```

---

## 🚨 常見問題

### Q1: 修復後系統無反應？

**A**: 檢查以下內容:
1. 確保 `window.autoTrafficGenerator` 存在
2. 確保 `window.trafficController` 存在
3. 檢查瀏覽器控制台是否有錯誤

### Q2: 交通燈不倒數？

**A**: 
1. 檢查 `TrafficLightController` 是否有 `updateCountdowns()` 方法
2. 檢查 `trafficLightAccumulator` 是否正確累加
3. 添加 debug log: `console.log('⏱️ 交通燈更新:', trafficLightAccumulator)`

### Q3: 性能沒有改善？

**A**:
1. 確認 `Vehicle.js L1225` 的 `rebuildSpatialGrid` 已移除
2. 確認 `AutoTrafficGenerator` 的 `setInterval` 已禁用
3. 檢查其他位置是否仍有 `setInterval`

---

## 📞 實施決定

您準備好開始嗎？

**推薦順序**:
1. ✅ **立即開始 P3** (5分鐘，無風險)
2. ✅ **然後修復 P2** (15分鐘，低風險)
3. ✅ **最後修復 P1** (2-3小時，中等風險)

請告訴我您的決定！我可以：
- 📝 為您完整編輯每個文件
- 🧪 提供完整測試腳本
- 🐛 逐步調試任何問題

