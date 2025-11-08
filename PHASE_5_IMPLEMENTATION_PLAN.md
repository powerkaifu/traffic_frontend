# 🚀 Phase 5: Vehicle.isCompleted 遷移實現計劃

## 📋 階段目標

**核心目標**: 修改 Vehicle.js 的 `remove()` 方法，使其只標記 `isCompleted`，不直接操作 `window.liveVehicles`。由 IndexPage RAF 迴圈集中處理車輛移除。

**預期效益**:
- ✅ 集中化車輛生命週期管理
- ✅ 避免多處地方直接操作 window.liveVehicles
- ✅ 提高代碼可維護性
- ✅ 減少異步操作導致的時序問題

---

## 🔍 現狀分析

### Vehicle.js 當前實現 (已部分完成)

```javascript
// Line 1687: remove() 方法
remove() {
  if (this.isRemoved) {
    return
  }
  this.isRemoved = true
  this.isCompleted = true  // ✅ 已標記為完成

  // ... 數據收集邏輯 ...

  // 派發 vehicleRemoved 事件
  window.dispatchEvent(new CustomEvent('vehicleRemoved', {...}))
}

// Line 1737: performCleanup() 方法 - 集中清理邏輯
async performCleanup() {
  if (!this.isRemoved) {
    return
  }
  // ... 清理 GSAP 動畫、定時器、控制器等 ...
}
```

**優點**: 
- ✅ remove() 已只做標記和數據收集
- ✅ performCleanup() 已分離為集中清理方法
- ✅ 派發事件通知

**問題**:
- ❌ remove() 仍在多個地方被調用
- ❌ window.liveVehicles 操作散布在 IndexPage 多處
- ❌ 沒有統一的車輛移除控制點

### IndexPage.vue 當前實現 (已部分完成)

```javascript
// Line 2085: 集中清理車輛邏輯
const vehiclesToCleanup = activeCars.value.filter((vehicle) => vehicle.isCompleted)

for (const vehicle of vehiclesToCleanup) {
  // 調用 remove()
  if (!vehicle.isRemoved && vehicle.remove) {
    vehicle.remove()
  }
  
  // 調用 performCleanup()
  if (vehicle.performCleanup) {
    vehicle.performCleanup()
  }
  
  // 移除 window.liveVehicles 和 Store
  window.liveVehicles.splice(...)
  store.removeVehicle(...)
}

// 移除已清理的車輛
activeCars.value = activeCars.value.filter((vehicle) => !vehicle.isCompleted)
```

**優點**:
- ✅ 已有集中的清理邏輯
- ✅ 同時更新 window.liveVehicles 和 Store

**問題**:
- ❌ 仍在其他多處調用 remove() 和 window.liveVehicles.splice()
- ❌ 清理邏輯分散

---

## 🎯 Phase 5 實現步驟

### Step 1: 驗證 Vehicle.js remove() 正確性

**檢查項**:
- ✅ remove() 只做標記和數據收集
- ✅ performCleanup() 做完整清理
- ✅ 派發 vehicleRemoved 事件

**當前狀態**: ✅ 已正確實現

### Step 2: 統一 IndexPage.vue 的車輛移除邏輯

**目標**: 將所有 `window.liveVehicles.splice()` 邏輯統一到一個中心點

**當前散布位置**:
- Line 628: 超出邊界移除
- Line 651: 邊界檢查清理
- Line 1581-1601: 循環加載時清理
- Line 1636: 邊界移除
- Line 2106: Phase 4 集中清理
- Line 2129, 2149, 2181: 孤立車輛清理

**實現方案**: 
- 創建統一的 `removeVehicleFromSimulation(vehicleId)` 方法
- 所有移除操作都調用這個方法
- 該方法統一處理：window.liveVehicles、Store、日誌

### Step 3: 創建 IndexPage.vue 統一移除方法

```javascript
removeVehicleFromSimulation(vehicleId) {
  // 1. 從 activeCars.value 移除
  const idx = activeCars.value.findIndex(v => v.id === vehicleId)
  if (idx !== -1) activeCars.value.splice(idx, 1)
  
  // 2. 從 window.liveVehicles 移除
  if (window.liveVehicles) {
    const liveIdx = window.liveVehicles.findIndex(v => v.id === vehicleId)
    if (liveIdx !== -1) window.liveVehicles.splice(liveIdx, 1)
  }
  
  // 3. 從 Store 移除
  if (store && store.removeVehicle) {
    store.removeVehicle(vehicleId)
  }
}
```

### Step 4: 重構 Phase 4 集中清理邏輯

將 Line 2085 的邏輯精簡為:

```javascript
// 集中清理已完成的車輛
const vehiclesToCleanup = activeCars.value.filter(v => v.isCompleted)
for (const vehicle of vehiclesToCleanup) {
  // 1. 確保標記
  if (!vehicle.isRemoved && vehicle.remove) {
    vehicle.remove()
  }
  
  // 2. 執行清理
  if (vehicle.performCleanup) {
    vehicle.performCleanup().catch(e => {
      console.warn(`⚠️ [${vehicle.id}] 清理異常: ${e.message}`)
    })
  }
  
  // 3. 使用統一方法移除
  this.removeVehicleFromSimulation(vehicle.id)
}
```

### Step 5: 更新其他移除點

將所有 `window.liveVehicles.splice()` 替換為 `removeVehicleFromSimulation()`

例如:
```javascript
// 舊: 超出邊界移除
if (liveIdx !== -1) window.liveVehicles.splice(liveIdx, 1)

// 新: 使用統一方法
this.removeVehicleFromSimulation(vehicle.id)
```

### Step 6: 移除方法重構

```javascript
// 舊的 remove() 調用 (多處)
if (vehicle.remove && typeof vehicle.remove === 'function') {
  vehicle.remove()
}

// 新的統一做法:
// 在 Phase 4 集中清理中，確保只有一個地方調用 remove()
```

---

## 🔄 改動清單

### Vehicle.js (維持不變)

**現狀**: ✅ 已正確實現
- ✅ `remove()` 只做標記 + 數據收集
- ✅ `performCleanup()` 做集中清理
- ✅ 派發事件

**建議**: 確認是否需要調整數據收集邏輯

### IndexPage.vue (需要重構)

**需改動位置**:

1. **Line 2080-2120** (Phase 4 集中清理) - ✅ 保留邏輯，改進一致性
2. **Line 628, 651** (超出邊界) - 改用 `removeVehicleFromSimulation()`
3. **Line 1581-1601** (循環加載清理) - 改用 `removeVehicleFromSimulation()`
4. **Line 1636** (邊界移除) - 改用 `removeVehicleFromSimulation()`
5. **Line 2129, 2149, 2181** (孤立車輛) - 改用 `removeVehicleFromSimulation()`

**新增方法**:
- `removeVehicleFromSimulation(vehicleId)` - 統一移除入口

---

## ✅ 完成標準

Phase 5 完成標準:

- [ ] Vehicle.js remove() 確認只做標記和數據收集
- [ ] IndexPage.vue 新增 `removeVehicleFromSimulation()` 統一方法
- [ ] 所有 `window.liveVehicles.splice()` 改用統一方法
- [ ] 所有 `vehicle.remove()` 調用統一到 Phase 4 清理邏輯
- [ ] npm run build 編譯成功，無誤
- [ ] Git 提交記錄

---

## 📊 改動統計預估

- **新增代碼**: ~30 行 (removeVehicleFromSimulation 方法)
- **修改位置**: 10+ 處
- **刪除代碼**: ~50 行 (重複的 splice 邏輯)
- **淨增**: -20 行代碼

---

## 🎯 技術架構

### 車輛生命週期 (改進後)

```
Vehicle 創建
    ↓
生成 → 移動 → 碰撞/停止線處理
    ↓
完成移動 → vehicle.remove() 標記 isCompleted
    ↓
IndexPage RAF 迴圈檢測
    ↓
Phase 4 集中清理邏輯
    ├─ 調用 performCleanup() 清理資源
    ├─ 從 Store 移除
    ├─ 使用 removeVehicleFromSimulation() 統一移除
    ↓
車輛完全銷毀
```

### 信息流 (改進後)

```
Vehicle.remove() 派發事件
    ↓
window 監聽器接收 (可選)
    ↓
IndexPage mainSimulationLoop
    ↓
isCompleted 檢測 (Phase 4)
    ↓
performCleanup() + removeVehicleFromSimulation()
    ↓
完全移除: activeCars, window.liveVehicles, Store
```

---

## 📝 注意事項

1. **順序很重要**: remove() → performCleanup() → removeVehicleFromSimulation()
2. **不要重複**: 避免多處都調用 remove()
3. **同步狀態**: 確保 activeCars.value 和 window.liveVehicles 保持一致
4. **Store 同步**: 從 Store 移除車輛

---

## 🚀 下一步

**Phase 5 完成後**:
1. Phase 6: TrafficLightController Pinia 遷移
2. Phase 7: CollisionController Pinia 遷移
3. 完整測試和性能驗證

