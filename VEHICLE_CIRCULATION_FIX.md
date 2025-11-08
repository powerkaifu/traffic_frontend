# 🚗 車輛循環修復文檔

## 問題描述

系統中車輛無法持續循環，最終都停留在 `(-9999px, -9999px)` 位置。雖然物件池機制已實現並正常回收車輛，但新車無法持續生成，因為系統達到了硬性限制 `❌ [生成限制] 當前活躍車輛 100 已達硬性限制 100`。

## 根本原因

**`window.liveVehicles` 計數不同步**

- 當車輛完成動畫並被回收到物件池時，系統調用 `vehiclePool.release(vehicle)`
- 但 `window.liveVehicles` 陣列中仍保留了該車輛的引用
- `AutoTrafficGenerator._generateVehicle()` 檢查 `window.liveVehicles.length` 來判斷是否達到限制
- 結果：達到 100 輛車後，即使車輛被回收，計數仍為 100，新車無法生成
- 車輛無法循環，最終都被隱藏在 `(-9999px, -9999px)` 位置

## 解決方案

在 `handleVehicleOutOfBounds()` 中同步從 `window.liveVehicles` 移除車輛

### 變更位置

**File:** `src/pages/IndexPage.vue`
**Function:** `handleVehicleOutOfBounds` (Line ~585)

### 具體修改

```javascript
// 新增：當車輛完成動畫時，從 window.liveVehicles 移除
if (window.liveVehicles) {
  const liveIdx = window.liveVehicles.findIndex((v) => v.id === vehicle.id)
  if (liveIdx > -1) {
    window.liveVehicles.splice(liveIdx, 1)
  }
}
```

## 完整流程

現在車輛循環流程正確運作：

1. **生成階段** ✅

   ```
   activeCars.push(vehicle)
   window.liveVehicles.push(vehicle)  // 計數 +1
   ```

2. **動畫階段** ✅

   ```
   vehicle.moveAlongPath()
   vehicle.animate()
   ```

3. **完成階段** ✅ (新增修復)

   ```
   handleVehicleOutOfBounds()
   {
     activeCars.remove(vehicle)
     window.liveVehicles.remove(vehicle)  // 計數 -1  ← 修復
     vehiclePool.release(vehicle)  // 放回池
   }
   ```

4. **回收階段** ✅

   ```
   vehiclePool.acquire()
   {
     vehicle = pool.pop()
     reset(vehicle)
     autoAlpha: 1  // 可見
     return vehicle
   }
   ```

5. **循環** ✅
   計數已減少，新車可生成，循環繼續

## 相關同步移除點

系統中其他清理位置已經通過 `removeVehicleFromSimulation()` 正確同步：

1. **RAF 清理迴圈 - 完成車輛清理** (Line ~2160)

   ```javascript
   removeVehicleFromSimulation(vehicle.id)
   ```

2. **RAF 清理迴圈 - 孤立車輛清理** (Line ~2193)

   ```javascript
   removeVehicleFromSimulation(vehicle.id)
   ```

3. **RAF 清理迴圈 - 狀態檢查清理** (Line ~2213)

   ```javascript
   removeVehicleFromSimulation(vehicle.id)
   ```

4. **超限清理** (Line ~2247)
   ```javascript
   removeVehicleFromSimulation(vehicleToRemove.id)
   ```

`removeVehicleFromSimulation()` 函數已正確實現，包含：

- 從 `activeCars.value` 移除 ✅
- 從 `window.liveVehicles` 移除 ✅
- 從 Store 移除 ✅

## 驗證檢查清單

在瀏覽器控制台檢查：

```javascript
// 1. 監控計數
console.log(`activeCars: ${window.activeCars?.length || 0}`)
console.log(`liveVehicles: ${window.liveVehicles?.length || 0}`)

// 2. 監控池大小
console.log(`pool stats:`, window.vehiclePool?.getStats())

// 3. 監控生成限制日誌
// 應該看到 "❌ [生成限制]" 消息消失，改為持續生成

// 4. 監控回收日誌
// 應該頻繁看到 "♻️ [VehiclePool.acquire]" 和 "♻️ [vehicle_xxx] 放回物件池"
```

## 預期結果

✅ 車輛計數隨著循環逐漸穩定在某個水位
✅ 不再出現 "已達硬性限制 100" 的警告
✅ 車輛不斷從池中取出、完成動畫、放回池
✅ 車輛在屏幕上持續出現，不會全部消失
✅ `-9999px` 位置的隱藏車輛在下一個循環周期被重新激活

## 技術細節

### 物件池架構

```
VehiclePool {
  poolMap: {
    east: [hidden_vehicle1, hidden_vehicle2, ...],
    west: [...],
    north: [...],
    south: [...]
  },
  activeVehicles: Set(all currently visible vehicles)
}
```

### 關鍵方法

- `acquire()`: 從池中取車或新建，設置 `autoAlpha: 1`
- `release()`: 隱藏車輛 `autoAlpha: 0`，放回池

### 計數追蹤

- `activeCars`: 當前屏幕上的車輛
- `window.liveVehicles`: 全局活躍車輛計數（用於生成限制判斷）
- `vehiclePool.activeVehicles`: 池內追蹤集合

## 提交資訊

```
Commit: Fix: Synchronize window.liveVehicles removal when vehicles are recycled to pool
- When vehicle completes animation and returns to pool via handleVehicleOutOfBounds, now properly removes from window.liveVehicles
- This allows vehicle count to decrease, enabling continuous generation loop
- Fixes hardMaxVehicles limit being hit at 100 vehicles with no recycling
```

## 下一步（如有需要）

1. **性能監測**: 確保 GC 壓力穩定
2. **計數驗證**: 長時間運行檢查是否有洩漏
3. **邊界情況**: 測試快速暫停/恢復、方向改變等
