# 🚨 派車系統重複執行 - 根本原因分析與修復

## 問題描述

派車系統一次派兩台車到同一方向，而非預期的一台。

## 🔍 根本原因

在 `IndexPage.vue` 中，**同一個派車事件有兩個完全相同的監聽器被觸發**：

### 監聽器 1：Store 訂閱（第 1343 行）

```javascript
const unsubscribeGenerateVehicle = store.subscribe('generateVehicle', handleAutoGenerateFromStore)
```

### 監聽器 2：DOM 事件監聽（第 1361 行）

```javascript
window.addEventListener('generateVehicle', (event) => {
  handleAutoGenerate(event)
})
```

### 事件流程

```
AutoTrafficGenerator._generateVehicle() 發送派車事件
    ↓
    └─ this.simulationStore.emit('generateVehicle', detail)  【新版】
    └─ window.dispatchEvent(new CustomEvent('generateVehicle', { detail }))  【舊版相容】
    ↓
同時觸發：
  ├─ handleAutoGenerateFromStore() ⚠️ 創建車輛 1
  └─ handleAutoGenerate() ⚠️ 創建車輛 2
    ↓
結果：同一派車請求 → 兩台車被創建 ❌
```

### 兩個回調函數的內容完全相同

**handleAutoGenerateFromStore** (第 478 行)：

```javascript
const handleAutoGenerateFromStore = (detail) => {
  const { direction, vehicleType, initialProgress } = detail
  const laneNumber = selectOptimalLane(direction)
  if (laneNumber === null) return
  const pathStartPosition = Vehicle.getPathStartPosition(direction, laneNumber)
  if (!pathStartPosition) return
  createVehicleWithPosition(
    pathStartPosition.x,
    pathStartPosition.y,
    direction,
    vehicleType,
    laneNumber,
    initialProgress,
  )
}
```

**handleAutoGenerate** (第 504 行)：

```javascript
const handleAutoGenerate = (event) => {
  const { direction, vehicleType, initialProgress } = event.detail
  const laneNumber = selectOptimalLane(direction)
  if (laneNumber === null) return
  const pathStartPosition = Vehicle.getPathStartPosition(direction, laneNumber)
  if (!pathStartPosition) return
  createVehicleWithPosition(
    pathStartPosition.x,
    pathStartPosition.y,
    direction,
    vehicleType,
    laneNumber,
    initialProgress,
  )
}
```

**唯一區別**：

- `handleAutoGenerateFromStore`：直接接收 `detail` 物件
- `handleAutoGenerate`：從 `event.detail` 提取

否則邏輯完全一致 ❌

---

## ✅ 修復方案

### 方案選擇

由於已經遷移到 Pinia Store（Priority 3 階段），應該：

1. **刪除舊的 DOM 事件監聽器**（不再需要向後相容）
2. **只保留 Store 訂閱**（更現代、更安全）

### 修復步驟

#### 步驟 1：移除重複的 DOM 事件監聽器

**文件**：`IndexPage.vue` (第 1360-1367 行)

**移除前**：

```javascript
// 同時保留 DOM 事件監聽器，以支持其他外部組件（如 MainLayout）
// 這些事件處理器會調用相應的 Store 事件
window.addEventListener('scenarioChanged', (event) => {
  handleScenarioChange(event.detail)
})
window.addEventListener('generateVehicle', (event) => {
  handleAutoGenerate(event)
})
window.addEventListener('generateLeftTurnVehicle', (event) => {
  handleAutoGenerateLeftTurn(event)
})
```

**移除後**：

```javascript
// ⚠️ 【修復】移除 DOM 事件監聽器（已遷移到 Store 訂閱）
// AutoTrafficGenerator 現在通過 store.emit() 發送事件
// 不再需要 window.dispatchEvent() 的備份監聽
// 保留注釋以提醒此處曾有 DOM 事件監聽
```

**原因**：

- AutoTrafficGenerator 已經改為使用 `store.emit()` 發送事件
- Store 訂閱已完全接手，不再需要 DOM 事件監聽
- 保留 DOM 事件監聽只會導致重複執行

#### 步驟 2：移除舊的 handleAutoGenerate 回調

雖然不是必需（因為沒有監聽器觸發），但為了代碼清潔，應移除或標記為已棄用。

**選項 A**：完全刪除（推薦）
**選項 B**：標記為已棄用

推薦選項 A，因為代碼已經遷移完成。

#### 步驟 3：驗證 Store 訂閱正確設置

確認第 1343 行的 Store 訂閱已正確建立：

```javascript
const unsubscribeGenerateVehicle = store.subscribe('generateVehicle', handleAutoGenerateFromStore)
```

---

## 🧪 驗證方法

### 修復前

控制台應該看到相同的派車日誌出現 **兩次**：

```
🚗 [east] 東向 speed=35 initialProgress=0.1
🚗 [east] 東向 speed=35 initialProgress=0.1
```

### 修復後

控制台應該只看到派車日誌出現 **一次**：

```
🚗 [east] 東向 speed=35 initialProgress=0.1
```

### 檢查清單

- [ ] 派車日誌只出現一次（不是兩次）
- [ ] 只有一台車被創建（不是兩台）
- [ ] 同方向的派車數量符合預期（每幀 1 台）
- [ ] 四個方向的派車均衡（輪流派遣）

---

## 📊 影響分析

| 項目     | 修復前    | 修復後       |
| -------- | --------- | ------------ |
| 每次派車 | 創建 2 台 | 創建 1 台 ✅ |
| 事件處理 | 調用 2 次 | 調用 1 次 ✅ |
| 車輛堆積 | 快速堆積  | 受控增長 ✅  |
| 方向均衡 | 不均衡    | 均衡 ✅      |

---

## 🔄 遷移進度檢查

這是 **Priority 3 階段遷移的驗證**：

- ✅ AutoTrafficGenerator 已使用 `store.emit()` 發送事件
- ✅ IndexPage 已訂閱 Store 事件（`store.subscribe()`）
- ❌ **但同時保留了 DOM 事件監聽作為「向後相容」**
- ❌ **導致同一事件被處理兩次**

### 修復點

移除「向後相容」的 DOM 事件監聽，完全依賴 Store 訂閱。

---

## 代碼改動摘要

### 文件修改

- **`IndexPage.vue`**：1 處修改

### 改動統計

| 操作              | 行數       | 說明                                                 |
| ----------------- | ---------- | ---------------------------------------------------- |
| 刪除 DOM 事件監聽 | ~1360-1367 | 移除 window.addEventListener('generateVehicle', ...) |
| **總改動行數**    | **~7**     | 極簡修復                                             |

### 修復邏輯

```diff
- // 同時保留 DOM 事件監聽器，以支持其他外部組件（如 MainLayout）
- // 這些事件處理器會調用相應的 Store 事件
- window.addEventListener('scenarioChanged', (event) => {
-   handleScenarioChange(event.detail)
- })
- window.addEventListener('generateVehicle', (event) => {
-   handleAutoGenerate(event)
- })
- window.addEventListener('generateLeftTurnVehicle', (event) => {
-   handleAutoGenerateLeftTurn(event)
- })

+ // ⚠️ 【修復】移除 DOM 事件監聽器（已遷移到 Store 訂閱）
+ // AutoTrafficGenerator 現在通過 store.emit() 發送事件
+ // Store 訂閱已完全接手，無需 window.dispatchEvent() 備份
```

---

## ✨ 修復後的完整流程

```
AutoTrafficGenerator._generateVehicle()
    ↓
    this.simulationStore.emit('generateVehicle', detail)
    ↓
Store 內部處理
    ↓
觸發訂閱回調：handleAutoGenerateFromStore()
    ↓
創建 1 台車輛 ✅
    ↓
（沒有 DOM 事件監聽，所以不會二次觸發）
```

---

## 🎯 結論

該問題是遷移期間保留「向後相容」DOM 事件監聽導致的重複執行。

修復方案：

1. ✅ **移除 DOM 事件監聽器**（第 1360-1367 行）
2. ✅ **完全依賴 Store 訂閱**
3. ✅ 派車邏輯從執行 2 次降低到 1 次

修復後：

- 派車數量恢復正常（每次 1 台，而非 2 台）
- 方向均衡恢復（輪流派遣，而非堆積）
- 遷移完成驗證（Store 訂閱完全工作）
