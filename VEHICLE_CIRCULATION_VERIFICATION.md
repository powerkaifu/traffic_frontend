# 🚗 車輛循環修復 - 驗證清單

## 修復概要

**問題**: 車輛無法持續循環，最終都停留在隱藏位置 `(-9999px, -9999px)`

**根本原因**: `window.liveVehicles` 計數不同步，導致生成限制被鎖定

**解決方案**: 在 `handleVehicleOutOfBounds()` 中同步移除 `window.liveVehicles` 的車輛引用

---

## 修復驗證步驟

### 1️⃣ 瀏覽器控制台監控

**步驟 A**: 打開應用
```
URL: http://localhost:8080
```

**步驟 B**: 打開瀏覽器開發者工具 (F12)

**步驟 C**: 複製以下代碼到控制台並執行
```javascript
// 快速查看當前狀態
console.log('activeCars:', window.activeCars?.value?.length || 0);
console.log('liveVehicles:', window.liveVehicles?.length || 0);
console.log('Pool available:', window.vehiclePool?.getStats());
```

**預期結果**: 
- ✅ `liveVehicles` 數字應該變化（增加時生成新車，減少時回收車輛）
- ✅ 不應該一直停留在 100

---

### 2️⃣ 運行監控工具

**步驟 A**: 在控制台執行以下代碼加載監控工具
```javascript
// 複製 public/vehicle-circulation-monitor.js 的代碼
// 或直接執行:
fetch('/vehicle-circulation-monitor.js').then(r => r.text()).then(eval)

// 啟動監控
window.vehicleCirculationMonitor.start()
```

**預期結果**:
- ✅ 每 2 秒更新一次監控面板
- ✅ `activeCars` 和 `liveVehicles` 保持同步
- ✅ 不顯示 "已達硬性限制" 警告
- ✅ 池中有回收的車輛可用

**停止監控**:
```javascript
window.vehicleCirculationMonitor.stop()
```

---

### 3️⃣ 觀察屏幕上的車輛行為

**期望行為**:
- ✅ 車輛不斷從各個方向進入
- ✅ 車輛平穩動畫完成
- ✅ 車輛完成後消失（被隱藏）
- ✅ 新的車輛不斷出現
- ✅ 不會出現所有車輛都消失的情況

**不正常行為** (需要檢查):
- ❌ 車輛突然全部消失
- ❌ 新車無法生成
- ❌ 車輛卡住不動
- ❌ 屏幕上顯示 "停止生成"

---

### 4️⃣ 檢查控制台日誌

**正常日誌應包含**:

✅ 生成日誌:
```
🚗 [AutoTrafficGenerator] 已啟動 (RAF 驅動模式)
🎭 [AutoTrafficGenerator] VD 情景已設置: peak_hours
```

✅ 車輛動畫完成日誌:
```
♻️ [vehicle_1762636589545_0sa63] 車輛動畫完成，放回物件池
🔄 [Vehicle.reset] vehicle_1762636589545_0sa63: direction=south, lane=2, type=small
♻️ [VehiclePool.acquire] 從池中取出 vehicle_xxx，重置完成，現在恢復可見性和位置
✅ [VehiclePool.acquire] vehicle_xxx 可見性已恢復，位置設置為 (x, y)，autoAlpha=1
```

❌ **不應該出現的日誌**:
```
❌ [生成限制] 當前活躍車輛 100 已達硬性限制 100，停止生成新車輛
```

---

### 5️⃣ 長時間運行測試 (建議 5-10 分鐘)

**監控項目**:

1. **計數穩定性**
   ```javascript
   // 每 30 秒記錄一次
   setInterval(() => {
     console.log(`[${new Date().toLocaleTimeString()}] liveVehicles: ${window.liveVehicles?.length || 0}`);
   }, 30000)
   ```
   
   ✅ 預期: 計數在 30-100 之間波動，反映持續生成和回收
   ❌ 問題: 計數固定在 100，表示回收失敗

2. **記憶體狀態**
   - 監控瀏覽器記憶體使用 (DevTools → Memory)
   - ✅ 應該保持穩定
   - ❌ 如果持續上升，可能有洩漏

3. **動畫幀率**
   - 使用 Performance 選項卡監控
   - ✅ 應該穩定在 60 FPS 或設置的最高值
   - ❌ 卡頓可能表示計算過多

---

## 詳細檢查清單

### 代碼修改驗證

- [ ] `src/pages/IndexPage.vue` - `handleVehicleOutOfBounds` 函數
  - [ ] 行 ~585: 新增 `window.liveVehicles.splice()` 移除邏輯 ✅ 已驗證
  - [ ] 車輛完成時調用此函數 ✅ 已驗證

- [ ] `removeVehicleFromSimulation` 函數
  - [ ] 已從 `activeCars.value` 移除 ✅ 已驗證
  - [ ] 已從 `window.liveVehicles` 移除 ✅ 已驗證
  - [ ] 已從 Store 移除 ✅ 已驗證

- [ ] `VehiclePool.js` 
  - [ ] `acquire()` - 設置 `autoAlpha: 1` ✅ 已驗證
  - [ ] `release()` - 設置 `autoAlpha: 0` ✅ 已驗證
  - [ ] 從 `activeVehicles` Set 移除 ✅ 已驗證

### 流程驗證

- [ ] 車輛生成流程完整 (新增到 activeCars 和 liveVehicles)
- [ ] 車輛動畫流程完整 (正常動畫播放)
- [ ] 車輛完成流程完整 (從兩個列表同時移除，放回池)
- [ ] 車輛回收流程完整 (隱藏但保留 DOM，可重新激活)
- [ ] 循環流程完整 (重複上述步驟)

---

## 測試場景

### 場景 1: 基本循環測試

1. 應用啟動
2. 等待 30 秒
3. 檢查: 是否有車輛在屏幕上不斷出現
4. 檢查: `liveVehicles` 計數是否波動
5. 預期: ✅ 車輛循環正常

### 場景 2: 計數同步測試

1. 運行監控工具
2. 觀察 2 分鐘
3. 檢查: `activeCars` 和 `liveVehicles` 是否保持同步（差異 < 5）
4. 預期: ✅ 計數始終同步

### 場景 3: 硬限制測試

1. 監控 `liveVehicles`
2. 觀察是否達到 100
3. 如果達到 100:
   - 檢查: 是否仍有新車生成
   - 檢查: 是否收到 "已達硬性限制" 日誌
4. 預期: ✅ 計數在 100 附近波動，但不會鎖定

### 場景 4: 動畫完成測試

1. 監控控制台日誌
2. 尋找 "車輛動畫完成，放回物件池" 日誌
3. 檢查: 每個完成的車輛是否都有對應的 "從池中取出" 日誌
4. 預期: ✅ 完成車輛被立即回收並可重新使用

---

## 失敗排查指南

### 症狀: 計數卡在 100

**檢查清單**:
1. [ ] `handleVehicleOutOfBounds` 中的 `window.liveVehicles.splice()` 是否被執行？
   - 在該行添加 `console.log('Removing from liveVehicles')`
   
2. [ ] 是否所有車輛完成路徑都調用 `handleVehicleOutOfBounds`？
   - 檢查 `Vehicle.js` 中的 `onComplete` 回調

3. [ ] `removeVehicleFromSimulation` 是否被調用？
   - 在清理迴圈中搜索這個函數的調用

### 症狀: 屏幕上沒有車輛

**檢查清單**:
1. [ ] 生成器是否啟動？
   - 檢查日誌中的 "🚗 [AutoTrafficGenerator] 已啟動"

2. [ ] 池是否正常初始化？
   - 檢查日誌中的 "VehiclePool 已初始化"

3. [ ] 車輛是否被正確隱藏而不是刪除？
   - 檢查 DevTools 中元素面板，車輛 div 應該仍在 DOM 中

### 症狀: 計數增長但超過 100

**檢查清單**:
1. [ ] 是否有車輛未被正確回收？
   - 監控 `vehiclePool.activeVehicles` 的大小

2. [ ] `removeVehicleFromSimulation` 中是否有異常？
   - 添加 try-catch 日誌

3. [ ] 是否有其他代碼路徑仍在調用 `vehicle.remove()`？
   - 搜索所有 `vehicle.remove()` 調用

---

## 性能指標

在修復後，預期應該看到：

| 指標 | 預期值 | 檢查方法 |
|------|--------|--------|
| activeCars 穩定值 | 50-100 | 控制台監控 |
| liveVehicles 穩定值 | 50-100 | 控制台監控 |
| 計數差異 | < 5 | 監控工具 |
| 記憶體增長 | < 5MB/min | DevTools Memory |
| 幀率 | 55-60 FPS | DevTools Performance |
| 生成頻率 | 連續 | 日誌頻率 |
| 回收頻率 | 連續 | 日誌頻率 |

---

## 快速驗證代碼

複製以下到控制台，一鍵驗證修復狀態：

```javascript
(function verify() {
  const activeCars = window.activeCars?.value?.length || 0;
  const liveVehicles = window.liveVehicles?.length || 0;
  const poolStats = window.vehiclePool?.getStats() || {};
  
  const isFixed = {
    active_live_sync: Math.abs(activeCars - liveVehicles) < 10,
    not_at_limit: liveVehicles < 100,
    pool_available: (poolStats.totalPooled || 0) > 0,
  };
  
  console.log('🔍 修復驗證結果:');
  console.log(`${isFixed.active_live_sync ? '✅' : '❌'} activeCars 和 liveVehicles 同步`);
  console.log(`${isFixed.not_at_limit ? '✅' : '❌'} 未達生成限制 (${liveVehicles}/100)`);
  console.log(`${isFixed.pool_available ? '✅' : '❌'} 物件池有可用車輛 (${poolStats.totalPooled || 0})`);
  
  const allFixed = Object.values(isFixed).every(v => v);
  console.log(`\n${allFixed ? '🎉 修復成功!' : '⚠️ 仍有問題需要排查'}`);
})();
```

---

## 下一步

修復驗證完成後：

1. [ ] 提交修復代碼到版本控制
2. [ ] 更新項目文檔
3. [ ] 進行集成測試
4. [ ] 監控生產環境表現

---

## 相關資源

- 修復文檔: `VEHICLE_CIRCULATION_FIX.md`
- 監控工具: `public/vehicle-circulation-monitor.js`
- 本檢查清單: `VEHICLE_CIRCULATION_VERIFICATION.md`
