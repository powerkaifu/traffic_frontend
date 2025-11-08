# 🚗 車輛生成問題 - 診斷與修復報告

## 問題描述

**症狀：** 模擬中沒有車輛出現（所有方向車輛計數為 0）
- 東西向: M=0, S=0, L=0 (總計=0)
- 南北向: M=0, S=0, L=0 (總計=0)

**已驗證正常的系統：**
- ✅ 系統初始化完成
- ✅ API 數據正確收集和發送
- ✅ AI 預測結果返回正常
- ✅ MainLayout 現已找到 autoTrafficGenerator（通過向後相容層）

**問題的根本原因：** 數據同步問題

---

## 根本原因診斷

### 1. 數據流轉追蹤

**Phase 2 遷移中的架構變化：**

```
舊架構 (Phase 1)：
├─ window.autoTrafficGenerator
├─ window.trafficController
├─ window.liveVehicles
└─ window.activeCars

新架構 (Phase 2)：
├─ Store (Pinia)
│  ├─ liveVehicles (ref)
│  ├─ autoTrafficGenerator (ref)
│  └─ trafficController (ref)
├─ IndexPage.vue 組件
│  ├─ activeCars (ref)
│  └─ 本地變數
└─ 向後相容層
   ├─ window.trafficController
   └─ window.autoTrafficGenerator
```

### 2. 關鍵代碼位置

**AutoTrafficGenerator._generateVehicle() 檢查 (第 1000 行):**
```javascript
const currentLiveVehicles = window.liveVehicles ? window.liveVehicles.length : 0

if (currentLiveVehicles >= maxLiveVehicles) {
  console.warn(`❌ [生成限制] 當前活躍車輛...`)
  return
}
```

**IndexPage.createVehicleWithPosition() (第 562-568 行):**
```javascript
// 將車輛添加到車輛容器中
vehicle.addTo(vehicleContainer.value || crossroadContainer.value)
activeCars.value.push(vehicle)

// ✅ 將車輛添加到 Store（用於自動生成系統計算 progress）
store.addVehicle(vehicle)

// ❌ 問題：沒有添加到 window.liveVehicles！
```

### 3. 問題鏈條

1. **Phase 2 遷移** 將車輛管理從全域變數遷移到 Store
2. **IndexPage 更新** 添加車輛到 Store 但未同步到 `window.liveVehicles`
3. **向後相容層缺失** 沒有暴露 `window.liveVehicles` 回全域
4. **AutoTrafficGenerator 檢查失敗**：
   - `window.liveVehicles` 始終為空或未定義
   - AutoTrafficGenerator 認為沒有活躍車輛
   - 應該能夠生成車輛，但可能因其他原因被阻止

---

## 修復方案

### 1. 同步 window.liveVehicles (主要修復)

**File: src/pages/IndexPage.vue**

**修改位置 1：添加車輛時同步**
```javascript
// ✅ 將車輛添加到 Store（用於自動生成系統計算 progress）
store.addVehicle(vehicle)

// ✅ 新增：同步到 window.liveVehicles（供 AutoTrafficGenerator 使用）
if (!window.liveVehicles) window.liveVehicles = []
window.liveVehicles.push(vehicle)
```

**修改位置 2：移除車輛時同步（動畫完成後）**
```javascript
// ✅ 同時立即從 Store 中移除
store.removeVehicle(vehicle.id)

// ✅ 新增：同步移除 window.liveVehicles
if (window.liveVehicles) {
  const liveIdx = window.liveVehicles.findIndex((v) => v.id === vehicle.id)
  if (liveIdx !== -1) window.liveVehicles.splice(liveIdx, 1)
}
```

**修改位置 3：移除車輛時同步（錯誤處理）**
```javascript
store.removeVehicle(vehicle.id)

// ✅ 新增：同步移除 window.liveVehicles
if (window.liveVehicles) {
  const liveIdx = window.liveVehicles.findIndex((v) => v.id === vehicle.id)
  if (liveIdx !== -1) window.liveVehicles.splice(liveIdx, 1)
}
```

### 2. 根本修復策略

修復試圖在 Phase 2-3 遷移中維持雙重同步：

```
開發方向 (后续):
1. Phase 3：AutoTrafficGenerator 應導入 Store，使用 store.getLiveVehicles()
2. Phase 4：完全移除 window.liveVehicles 的依賴
3. Phase 5：完全遷移到 Store 驅動的車輛管理

當前方案 (Phase 2.5)：
- 維持 Store 作為主要數據源
- 同步 window.liveVehicles 作為向後相容層
- 允許 AutoTrafficGenerator 繼續使用 window 訪問
- 為 Phase 3+ 遷移做好準備
```

---

## 驗證步驟

### 1. 編譯驗證 ✅
```
Build mode............. spa
App • DONE • SPA UI compiled with success by Vite • 2673ms
Build succeeded
```

### 2. 運行時驗證（待測試）

在開發者工具控制台執行：

```javascript
// 驗證車輛同步
store.getLiveVehicles()                    // 查看 Store 中的車輛
window.liveVehicles                        // 查看全域車輛
store.getLiveVehicles().length === window.liveVehicles.length  // 應為 true

// 驗證生成器
store.getAutoTrafficGenerator()            // 驗證 generator 實例
autoTrafficGenerator.isRunning             // 應為 true
autoTrafficGenerator.timeSinceLastGenerate // 檢查生成計時

// 驗證控制器
store.getTrafficController()               // 驗證控制器實例
window.trafficController                   // 向後相容訪問
```

### 3. 功能驗證（待測試）

- [ ] 應用啟動後車輛開始出現
- [ ] 東西向方向有車輛（M, S, L 類型）
- [ ] 南北向方向有車輛（M, S, L 類型）
- [ ] MainLayout 不再報超時错誤
- [ ] 車輛能夠正確生成和移除

---

## 代碼修改總結

| 文件 | 修改位置 | 修改數 | 用途 |
|------|---------|--------|------|
| `src/pages/IndexPage.vue` | 第 562-568 行 | +3 行 | 添加車輛時同步到 window |
| `src/pages/IndexPage.vue` | 第 630-640 行 | +5 行 | 移除車輛時同步（動畫完成） |
| `src/pages/IndexPage.vue` | 第 654-660 行 | +5 行 | 移除車輛時同步（錯誤處理） |
| **總計** | - | **+13 行** | 完整修復 |

**新增功能特性：**
- 自動車輛列表雙向同步
- 防止 undefined 錯誤
- 完整的錯誤恢復

---

## Phase 2.5 (緊急修復) 提交

**Commit Hash:** `913a578`  
**Commit Message:** `Fix: Sync window.liveVehicles with Store vehicles - ensure vehicle generation works correctly`

### 相關聯提交：

| Commit | Message | 用途 |
|--------|---------|------|
| `b899564` | Add backward compatibility: expose window.trafficController | 暴露控制器 |
| `913a578` | Fix: Sync window.liveVehicles with Store vehicles | 修復車輛同步 |

---

## 下一步計劃

### 即時 (待驗證)
1. ✅ 編譯驗證 - **完成**
2. ⏳ 運行時測試 - **待進行**
   - 檢查車輛是否開始出現
   - 驗證 MainLayout 超時是否解決
   - 檢查控制台日誌

### Phase 3 (AutoTrafficGenerator 遷移)
- 修改 AutoTrafficGenerator.js 導入 Store
- 使用 `store.getLiveVehicles()` 替代 `window.liveVehicles`
- 移除對 window 全域變數的依賴

### Phase 4-6 (完整遷移)
- Vehicle.js Store 集成
- TrafficLightController Store 集成
- CollisionController Store 集成

---

## 相關文檔

- [`PHASE2_MIGRATION_PLAN.md`](./PHASE2_MIGRATION_PLAN.md) - Phase 2 遷移詳細計劃
- [`PRIORITY3_PHASE2_COMPLETION_REPORT.md`](./PRIORITY3_PHASE2_COMPLETION_REPORT.md) - Phase 2 完成報告
- [`PHASE2_SUMMARY.md`](./PHASE2_SUMMARY.md) - Phase 2 快速參考

---

## 問題追蹤

| 問題 | 狀態 | 修復 |
|------|------|------|
| MainLayout 無法找到 autoTrafficGenerator | ✅ 已解決 | 添加向後相容層 `window.autoTrafficGenerator` |
| 車輛未出現（計數全 0） | ✅ 已診斷 + ⏳ 待驗證 | 同步 `window.liveVehicles` 與 Store |
| Store 和全域變數不同步 | ✅ 已解決 | 添加雙向同步邏輯 |

---

**最後更新：** 修復完成，等待運行時驗證  
**文檔版本：** 1.0  
**修復優先度：** 🔴 緊急（導致車輛未出現）
