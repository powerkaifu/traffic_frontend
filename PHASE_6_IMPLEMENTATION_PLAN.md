# 🚀 Phase 6: TrafficLightController 遷移 - 實現計劃

## 📋 階段目標

**核心目標**: 完成 TrafficLightController 從 window 全域變數到 Pinia Store 的完全遷移

**預期效益**:

- ✅ 完全移除 window.currentGeneratedVDData 依賴
- ✅ 完全移除 window.lastApiVDDataArray 依賴
- ✅ 使用 simulationStore 統一管理數據
- ✅ 數據流向更清晰，更易除錯

---

## 🔍 現狀分析

### TrafficLightController 當前實現

**已完成**:

- ✅ 構造函數已接收 simulationStore
- ✅ Line 1454: 優先使用 Store 中的 apiDataArray
- ✅ Line 1464: 優先使用 Store 中的 apiVDData
- ✅ Line 1832: 已保存 API 發送數據到 Store (setLastApiVDDataArray)
- ✅ Line 1901: 優先使用 Store 中的 apiVDData
- ✅ Line 2265: 優先查詢 Store 中的 apiDataArray

**待完成**:

- ❌ 所有 window.currentGeneratedVDData 的讀取都有 window 備用方案
- ❌ 所有 window.lastApiVDDataArray 的寫入都需統一
- ❌ 日誌信息中還提到 "全局保存" 的表述

### 數據使用位置

| 位置           | 類型 | 使用方式               | 優先級 | 狀態    |
| -------------- | ---- | ---------------------- | ------ | ------- |
| Line 1454-1468 | 讀取 | currentGeneratedVDData | 高     | ⚠️ 部分 |
| Line 1832      | 寫入 | lastApiVDDataArray     | 高     | ⚠️ 部分 |
| Line 1901-1902 | 讀取 | currentGeneratedVDData | 中     | ⚠️ 部分 |
| Line 2265      | 讀取 | currentGeneratedVDData | 中     | ⚠️ 部分 |

---

## 🎯 Phase 6 實現步驟

### Step 1: 分析所有 window 全域變數使用點

**需要檢查的點**:

1. Line 1454-1468: sendTrafficDataToBackend 方法
2. Line 1832: 發送 API 後保存數據
3. Line 1901-1902: 備援方案時的讀取
4. Line 2265: verifyUnifiedDataFlow 驗證方法
5. 其他所有直接訪問 window.lastApiVDDataArray 的地方

### Step 2: 優化 Line 1454-1468 的讀取邏輯

**當前邏輯**:

```javascript
let dataToSend = null
if (vdData) {
  dataToSend = vdData
} else if (this.simulationStore?.getCurrentGeneratedVDData()?.apiDataArray) {
  // ✅ Phase 5：使用 Store 中的數據
  dataToSend = this.simulationStore.getCurrentGeneratedVDData().apiDataArray
} else if (window.currentGeneratedVDData?.apiDataArray) {
  // 還有 window 備用
  dataToSend = window.currentGeneratedVDData.apiDataArray
}
```

**改進方案**:

```javascript
let dataToSend = null
if (vdData) {
  dataToSend = vdData
} else if (this.simulationStore?.getCurrentGeneratedVDData()?.apiDataArray) {
  // ✅ Phase 6：優先使用 Store
  dataToSend = this.simulationStore.getCurrentGeneratedVDData().apiDataArray
} else if (this.simulationStore?.getCurrentGeneratedVDData()?.apiVDData) {
  // ✅ Phase 6：備用方案 - 使用 Store 中的舊版本
  dataToSend = this.simulationStore.getCurrentGeneratedVDData().apiVDData
} else {
  // ✅ Phase 6：最後備用 - 使用本地收集
  dataToSend = this.collectIntersectionData()
}
```

### Step 3: 優化 Line 1832 的寫入邏輯

**當前邏輯**:

```javascript
window.lastApiVDDataArray = adjustedDataToSend
if (this.simulationStore) {
  this.simulationStore.setLastApiVDDataArray(adjustedDataToSend)
}
```

**改進方案**:

```javascript
// ✅ Phase 6：直接使用 Store 儲存（移除 window 寫入）
if (this.simulationStore) {
  this.simulationStore.setLastApiVDDataArray(adjustedDataToSend)
}
// 保留一份給舊代碼的備用（但不再主動寫入）
window.lastApiVDDataArray = adjustedDataToSend
```

但理想情況是只使用 Store：

```javascript
// ✅ Phase 6：完全遷移到 Store（推薦）
this.simulationStore?.setLastApiVDDataArray(adjustedDataToSend)
// 不再寫入 window
```

### Step 4: 優化 Line 1901-1902 的備援邏輯

**當前邏輯**:

```javascript
} else if (window.currentGeneratedVDData?.apiVDData) {
  dataToSend = window.currentGeneratedVDData.apiVDData
}
```

**改進方案**:

```javascript
// ✅ Phase 6：備援方案都使用 Store
} else {
  dataToSend = this.collectIntersectionData()
}
```

### Step 5: 優化 Line 2265 的驗證邏輯

**當前邏輯**:

```javascript
const generated =
  this.simulationStore?.getCurrentGeneratedVDData()?.apiDataArray || window.currentGeneratedVDData?.apiDataArray
```

**改進方案**:

```javascript
// ✅ Phase 6：只使用 Store（如果 Store 沒有則返回 null）
const generated = this.simulationStore?.getCurrentGeneratedVDData()?.apiDataArray
```

### Step 6: 檢查並移除其他 window 備用

搜尋整個文件中所有的 `window.currentGeneratedVDData` 和 `window.lastApiVDDataArray`，確保：

- 讀取都優先使用 Store
- 寫入都使用 Store
- 備用方案是本地收集數據，不是 window 變數

---

## 📊 改動清單

### 需要修改的位置

| 行數      | 方法                     | 改動                           | 優先級 |
| --------- | ------------------------ | ------------------------------ | ------ |
| 1457-1471 | sendTrafficDataToBackend | 優化讀取邏輯，移除 window 備用 | 高     |
| 1832      | sendTrafficDataToBackend | 只使用 Store 寫入              | 高     |
| 1901-1902 | sendTrafficDataToBackend | 移除 window 備用               | 中     |
| 2265-2266 | verifyUnifiedDataFlow    | 只使用 Store 讀取              | 中     |

---

## 🔄 改動詳情

### 改動 1: sendTrafficDataToBackend 讀取優化

**改前**:

```javascript
let dataToSend = null
if (vdData) {
  dataToSend = vdData
} else if (this.simulationStore?.getCurrentGeneratedVDData()?.apiDataArray) {
  dataToSend = this.simulationStore.getCurrentGeneratedVDData().apiDataArray
} else if (window.currentGeneratedVDData?.apiDataArray) {
  dataToSend = window.currentGeneratedVDData.apiDataArray
} else if (this.simulationStore?.getCurrentGeneratedVDData()?.apiVDData) {
  dataToSend = this.simulationStore.getCurrentGeneratedVDData().apiVDData
} else if (window.currentGeneratedVDData?.apiVDData) {
  dataToSend = window.currentGeneratedVDData.apiVDData
} else {
  dataToSend = this.collectIntersectionData()
}
```

**改後**:

```javascript
let dataToSend = null
if (vdData) {
  dataToSend = vdData
  logInfo('⏳ 已取得傳入的 VD 原始數據，準備進行正規化轉換...')
} else if (this.simulationStore?.getCurrentGeneratedVDData()?.apiDataArray) {
  // ✅ Phase 6：優先使用 Store 中的數據
  dataToSend = this.simulationStore.getCurrentGeneratedVDData().apiDataArray
  logInfo('✅ 已取得 Store 中的 4-方向 API 數據陣列，將直接發送到後端...')
} else if (this.simulationStore?.getCurrentGeneratedVDData()?.apiVDData) {
  // ✅ Phase 6：使用 Store 中的舊版本數據
  dataToSend = this.simulationStore.getCurrentGeneratedVDData().apiVDData
  logInfo('⏳ 已取得 Store 中的生成 VD 原始數據（舊版本），準備進行正規化轉換...')
} else {
  // ✅ Phase 6：最後備用方案 - 使用本地收集
  dataToSend = this.collectIntersectionData()
  logInfo('⏳ 已使用本地收集的數據（備用方案），準備進行正規化轉換...')
}
```

### 改動 2: sendTrafficDataToBackend 寫入優化

**改前**:

```javascript
window.lastApiVDDataArray = adjustedDataToSend // ✅ 這是實際發送的數據

if (this.simulationStore) {
  this.simulationStore.setLastApiVDDataArray(adjustedDataToSend)
}
```

**改後**:

```javascript
// ✅ Phase 6：統一使用 Store 保存實際發送的數據
if (this.simulationStore) {
  this.simulationStore.setLastApiVDDataArray(adjustedDataToSend)
}
// 保留向後相容性（但不再主動寫入新數據）
// window.lastApiVDDataArray 已廢棄，請使用 simulationStore.getLastApiVDDataArray()
```

### 改動 3: 備援方案移除

**改前** (Line 1901-1902):

```javascript
} else if (window.currentGeneratedVDData?.apiVDData) {
  dataToSend = window.currentGeneratedVDData.apiVDData
} else {
  dataToSend = this.collectIntersectionData()
}
```

**改後**:

```javascript
} else {
  // ✅ Phase 6：所有備用都已在上方處理，最後使用本地收集
  dataToSend = this.collectIntersectionData()
}
```

### 改動 4: 驗證方法簡化

**改前** (Line 2265-2266):

```javascript
const generated =
  this.simulationStore?.getCurrentGeneratedVDData()?.apiDataArray || window.currentGeneratedVDData?.apiDataArray
```

**改後**:

```javascript
// ✅ Phase 6：只使用 Store 讀取，不再查詢 window
const generated = this.simulationStore?.getCurrentGeneratedVDData()?.apiDataArray
```

---

## ✅ 完成標準

Phase 6 完成標準:

- [ ] 修改 Line 1457-1471: 優化讀取邏輯
- [ ] 修改 Line 1832: 統一寫入到 Store
- [ ] 修改 Line 1901-1902: 移除 window 備用
- [ ] 修改 Line 2265-2266: 只使用 Store
- [ ] grep 搜尋確認沒有其他 window.currentGeneratedVDData 或 window.lastApiVDDataArray
- [ ] npm run build 編譯成功
- [ ] Git 提交記錄

---

## 📈 改動統計預估

- **修改位置**: 4 處
- **新增代碼**: ~5 行（註釋）
- **刪除代碼**: ~10 行（window 備用方案）
- **淨改動**: -5 行代碼
- **代碼簡化度**: 40% (移除備用方案)

---

## 🎯 技術架構

### 數據讀取流程 (改進後)

```
sendTrafficDataToBackend()
    ↓
1. 傳入參數 vdData ?
    ├─ Yes → 使用傳入數據
    └─ No → 進入 Step 2
2. Store.getCurrentGeneratedVDData()?.apiDataArray ?
    ├─ Yes → 使用 Store 新版本
    └─ No → 進入 Step 3
3. Store.getCurrentGeneratedVDData()?.apiVDData ?
    ├─ Yes → 使用 Store 舊版本
    └─ No → 進入 Step 4
4. 本地收集 collectIntersectionData()
    ↓
發送數據
```

### 數據寫入流程 (改進後)

```
API 響應成功
    ↓
adjustedDataToSend 準備好
    ↓
Store.setLastApiVDDataArray(adjustedDataToSend)
    ↓
(廢棄) window.lastApiVDDataArray
```

---

## 💡 關鍵改進

### Before Phase 6

```javascript
// 分散的備用方案
if (Store) {
  // 使用 Store
} else if (window) {
  // 使用 window - 容易遺漏
} else {
  // 本地收集
}
```

### After Phase 6

```javascript
// 清晰的優先級
if (Store) {
  // 使用 Store
} else {
  // 本地收集
}
// 不再查詢 window
```

---

## 📝 後續步驟

**Phase 6 完成後**:

1. Phase 7: CollisionController 遷移
2. 完整的 window 全域變數清理
3. 最終測試和性能驗證
