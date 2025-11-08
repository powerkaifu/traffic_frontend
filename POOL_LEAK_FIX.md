# 🚨 車輛物件池洩漏修復完成

## 問題診斷

用戶發現：車輛在運行中逐漸減少（"車子越用越少"），最終停止生成（"沒車子了"）。根本原因是**物件池洩漏** - 車輛移除後未被歸還到池中。

### 洩漏根本原因

車輛移除有兩條路徑：

```
✅ 路徑 A（正常 - 有恢復）:
  動畫完成 → onComplete 回調 → handleVehicleOutOfBounds() → vehiclePool.release()

❌ 路徑 B（異常 - 洩漏）:
  vehicle.remove() 呼叫 → isCompleted=true → RAF 偵測到 →
  removeVehicleFromSimulation() → 沒有回調觸發！沒有 pool.release()！
  → 車輛永久丟失
```

### 洩漏症狀

- 車輛數量逐漸減少
- 無車輛可生成（AutoTrafficGenerator 無對象可取）
- DOM 中充滿離屏車輛（x: -9999）
- 物件池漸漸空轉

## 修復方案 ✅

### 1️⃣ 修復點 1：isCompleted 車輛清理

**位置**: IndexPage.vue 第 ~2148-2178 行

```javascript
// BEFORE: 無池恢復
for (const vehicle of vehiclesToCleanup) {
  vehicle.remove()
  removeVehicleFromSimulation(vehicle.id)
}

// AFTER: ✅ 池恢復已加入
for (const vehicle of vehiclesToCleanup) {
  if (vehiclePool) {
    vehiclePool.release(vehicle) // ✅ 關鍵修復
    console.log(`♻️ [${vehicle.id}] 異常移除的車輛已放回物件池`)
  }
  removeVehicleFromSimulation(vehicle.id)
}
```

### 2️⃣ 修復點 2：孤立車輛清理

**位置**: IndexPage.vue 第 ~2190-2210 行

```javascript
// BEFORE: DOM 丟失時無池恢復
if (!vehicle.element || !vehicle.element.parentNode) {
  removeVehicleFromSimulation(vehicle.id)
}

// AFTER: ✅ 池恢復已加入
if (!vehicle.element || !vehicle.element.parentNode) {
  if (vehiclePool) {
    vehiclePool.release(vehicle) // ✅ 確保恢復
  }
  removeVehicleFromSimulation(vehicle.id)
}
```

### 3️⃣ 修復點 3：狀態完成車輛清理

**位置**: IndexPage.vue 第 ~2220-2230 行

```javascript
// BEFORE: 狀態檢查時無池恢復
if (vehicle.currentState === 'completed' || vehicle.currentState === 'nearComplete') {
  vehicle.remove()
  removeVehicleFromSimulation(vehicle.id)
}

// AFTER: ✅ 池恢復已加入
if (vehicle.currentState === 'completed' || vehicle.currentState === 'nearComplete') {
  if (vehiclePool) {
    vehiclePool.release(vehicle) // ✅ 確保恢復
  }
  removeVehicleFromSimulation(vehicle.id)
}
```

### 4️⃣ 深層架構修復：Vehicle.remove() 回調存儲

**位置**: Vehicle.js 第 1128 行（moveAlongPath）和第 1703 行（remove）

```javascript
// moveAlongPath 開始處
moveAlongPath(trafficController, allVehicles = [], onVehicleOutOfBounds = null) {
  // 🚨【POOL LEAK FIX】存儲回調以便 remove() 也能使用
  this.onVehicleOutOfBoundsCallback = onVehicleOutOfBounds
  // ...
}

// remove() 方法內
remove() {
  // 🚨【POOL LEAK FIX】如果有儲存的回調，立即觸發以確保回收
  if (this.onVehicleOutOfBoundsCallback && typeof this.onVehicleOutOfBoundsCallback === 'function') {
    console.log(`🔄 [${this.id}] remove() 正在觸發回收回調`)
    this.onVehicleOutOfBoundsCallback(this)
    this.onVehicleOutOfBoundsCallback = null
  }
  // ...
}
```

## 修復完成清單

- ✅ **3 個主要洩漏點** 在 IndexPage.vue RAF 迴圈中已修復
- ✅ **深層架構修復** 已實施 - Vehicle.remove() 現在自動觸發回收回調
- ✅ **代碼編譯** 無錯誤
- ⏳ **驗證需要** - 運行模擬器確認池恢復正常

## 驗證步驟

```bash
# 1. 啟動開發伺服器
quasar dev

# 2. 監控以下指標:
#    ✓ 控制台中應出現 ♻️ 日誌
#    ✓ 車輛數量應保持穩定（不應減少）
#    ✓ 運行 10+ 分鐘後仍應有車輛生成
#    ✓ 物件池統計應顯示健康的循環

# 3. 檢查是否消除:
#    ✓ "車子越用越少" 症狀
#    ✓ "沒車子了" 症狀
#    ✓ 離屏 div 累積
```

## 預期結果

如果修復成功，您應該看到：

```
✅ 車輛數量保持穩定（不再逐漸減少）
✅ 模擬器可無限期運行（不會因缺乏車輛而停止）
✅ 控制台顯示定期的 ♻️ 回收日誌
✅ DOM 物件與活躍車輛 1:1 對應
✅ 物件池統計顯示健康的循環（動態獲取/歸還）
```

## 技術細節

### 池洩漏經典症狀

這是物件池實現中的**經典 Bug** - 多個移除路徑中只有一個觸發恢復。修復包括：

1. **同步式修復**: IndexPage.vue 中的所有移除呼叫都檢查 vehiclePool 並調用 release()
2. **深層修復**: Vehicle.remove() 方法現在存儲回調引用並自動觸發恢復

### 為什麼之前有效但現在洩漏？

- 早期使用了正常動畫完成路徑（路徑 A）
- 隨著碰撞檢測和其他異常移除的加入，使用了 remove() 方法（路徑 B）
- 路徑 B 沒有恢復機制，導致洩漏

### 核心改進

- 所有 3 個 IndexPage.vue 洩漏點現在都檢查 vehiclePool
- Vehicle.remove() 可自動觸發恢復（透過儲存的回調）
- 防止了新的代碼路徑引入新洩漏

## 提交訊息

```
🔄 Fix critical pool leak: ensure ALL vehicle removal paths trigger recovery

- Add vehiclePool.release() to isCompleted vehicle cleanup (Leak Point 1)
- Add vehiclePool.release() to orphaned vehicle cleanup (Leak Point 2)
- Add vehiclePool.release() to state-completed cleanup (Leak Point 3)
- Store onVehicleOutOfBounds callback on Vehicle instance
- Vehicle.remove() now triggers recovery callback if available

Fixes vehicle accumulation issue where cars would disappear during
simulation ("車子越用越少") due to pool leak on alternative removal paths.
```

---

**狀態**: ✅ 實施完成 | ⏳ 驗證待進行
