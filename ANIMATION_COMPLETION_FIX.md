# 🚗 動畫完成與車輛隱藏修復

## 問題描述

**症狀**：某些車輛在動畫走到最後時不會消失，會停留在路徑終點位置。

**根本原因**：

1. 邊界檢測回調和 onComplete 回調之間的邏輯不一致
2. `hasBeenRemovedFromCollision` flag 在邊界檢測時被設置，導致 onComplete 中的回調不執行
3. RAF 主循環中的清理邏輯直接調用 `vehicle.remove()`，與對象池機制衝突
4. VehiclePool.release() 沒有明確設置 autoAlpha: 0，某些情況下元素仍然可見

---

## 修復方案

### 1️⃣ **Vehicle.js - 增強 onComplete 回調**

**位置**: moveAlongPath() 方法的 onComplete 回調

```javascript
// 【修復前】
if (!hasBeenRemovedFromCollision && onVehicleOutOfBounds) {
  hasBeenRemovedFromCollision = true
  onVehicleOutOfBounds(this)
}

// 【修復後】- 無論 flag 狀態如何都執行
if (onVehicleOutOfBounds) {
  hasBeenRemovedFromCollision = true
  onVehicleOutOfBounds(this)
}
```

**影響**: 確保動畫完成時 onVehicleOutOfBounds 回調一定被觸發

---

### 2️⃣ **Vehicle.js - 邊界檢測傳遞完整實例**

**位置**: moveAlongPath() 方法的 onUpdate 中邊界檢測

```javascript
// 【修復前】
if (isOutOfBounds && !hasBeenRemovedFromCollision && onVehicleOutOfBounds) {
  hasBeenRemovedFromCollision = true
  onVehicleOutOfBounds(this.id) // ❌ 只傳遞 ID
}

// 【修復後】
if (isOutOfBounds && !hasBeenRemovedFromCollision && onVehicleOutOfBounds) {
  hasBeenRemovedFromCollision = true
  onVehicleOutOfBounds(this) // ✅ 傳遞完整實例
}
```

**影響**: handleVehicleOutOfBounds 能正確識別並隱藏車輛

---

### 3️⃣ **IndexPage.vue - handleVehicleOutOfBounds 增強**

```javascript
const handleVehicleOutOfBounds = (vehicle) => {
  if (!vehicle) return

  const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)
  if (vehicleIndex > -1) {
    activeCars.value.splice(vehicleIndex, 1)
    console.log(`♻️ [${vehicle.id}] 車輛動畫完成，放回物件池`)

    // 🚨【新增】確保隱藏車輛元素
    if (vehicle.element) {
      gsap.set(vehicle.element, {
        autoAlpha: 0,
        pointerEvents: 'none',
      })
    }

    // 放回物件池
    if (vehiclePool) {
      vehiclePool.release(vehicle)
    } else {
      vehicle.reset(vehicle.direction, vehicle.laneNumber, vehicle.vehicleType, store)
    }
  } else {
    // ⚠️ 新增安全檢查：車輛已被移除但仍收到回調
    if (vehicle?.element) {
      gsap.set(vehicle.element, {
        autoAlpha: 0,
        pointerEvents: 'none',
      })
    }
  }
}
```

**影響**: 雙重確保車輛被隱藏，即使在異常情況下

---

### 4️⃣ **VehiclePool.js - 顯式隱藏元素**

```javascript
release(vehicle) {
  if (!vehicle) return

  // ✅【新增】確保元素被隱藏
  if (vehicle.element) {
    gsap.set(vehicle.element, {
      autoAlpha: 0,
      pointerEvents: 'none',
    })
  }

  // 隱藏元素但不移除 DOM
  vehicle.reset(...)
  // ... 後續邏輯
}
```

**影響**: 無論何時放回池中，車輛都被徹底隱藏

---

### 5️⃣ **IndexPage.vue - RAF 清理邏輯改用對象池**

**位置**: mainSimulationLoop 的清理邏輯

```javascript
// 【修復前】
if (vehicle.currentState === 'completed' || vehicle.currentState === 'nearComplete') {
  vehicle.remove() // ❌ 直接移除，與池衝突
  return false
}

// 【修復後】
if (vehicle.currentState === 'completed' || vehicle.currentState === 'nearComplete') {
  if (vehiclePool) {
    vehiclePool.release(vehicle) // ✅ 放回池中
  } else {
    vehicle.remove()
  }
  return false
}
```

**影響**: 確保所有清理路徑都使用統一的對象池機制

---

## 驗證清單

- ✅ 邊界檢測在車輛離開邊界時觸發回收
- ✅ 動畫 onComplete 在所有情況下都觸發回收
- ✅ RAF 清理邏輯使用對象池而不是 remove()
- ✅ VehiclePool.release() 明確設置 autoAlpha: 0
- ✅ handleVehicleOutOfBounds 雙重確保隱藏
- ✅ 沒有編譯錯誤或警告

---

## 預期效果

1. **車輛消失準時性**: 動畫完成時立即隱藏，不會在路徑終點停留
2. **對象池有效性**: 所有車輛回收都通過 pool.release()，確保池統計準確
3. **DOM 穩定性**: 車輛數 = DOM 節點數（對象池數量）的比例保持穩定
4. **可靠性**: 即使發生異常，也有多層防護確保車輛被隱藏

---

## 測試步驟

1. **啟動模擬**: `quasar dev`
2. **觀察車輛**: 監控控制台的診斷報告
3. **檢查消失**: 確認車輛動畫完成後立即消失
4. **監控 DOM**: 檢查 DOM 節點數是否穩定在活動車輛數附近
5. **長期運行**: 運行 5+ 分鐘確認沒有車輛殘留

---

## 相關文件

- `Vehicle.js`: moveAlongPath() 方法的邊界檢測和 onComplete 邏輯
- `VehiclePool.js`: release() 方法的隱藏邏輯
- `IndexPage.vue`: handleVehicleOutOfBounds 回調和 RAF 清理邏輯

**提交**: ca46711
**日期**: 2025-11-09
