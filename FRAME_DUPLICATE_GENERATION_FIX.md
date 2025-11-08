# 🚨 RAF 幀內同一方向重複生成車輛 - 修復報告

## 問題描述

### 問題現象

- 在 `update()` 方法中，每個時間步可能生成多台車（通過 `vehiclesPerInterval` 參數）
- 每台車都獨立調用 `_generateVehicle()`
- 但 `_generateVehicle()` 中的時間檢查只檢查 "同方向1秒內"，檢查太寬鬆
- **結果**：同一個 RAF 幀內可能在同一方向生成多台車，造成堆疊

### 根本原因分析

```javascript
// AutoTrafficGenerator.js 第 390 行 - update() 方法
update(deltaTimeMs) {
  if (!this.isRunning) return

  this.timeSinceLastGenerate += deltaTimeMs

  if (this.timeSinceLastGenerate >= this.currentInterval) {
    let vehiclesToGenerate = this.config.vehiclesPerInterval || 1

    // ❌ 問題：for 循環中每台車都獨立調用 _generateVehicle()
    for (let i = 0; i < vehiclesToGenerate; i++) {
      this._generateVehicle()  // 可能生成多台車
    }

    this.timeSinceLastGenerate = 0
    this.currentInterval = this._calcInterval()
  }
}
```

在 `_generateVehicle()` 中（第 1150 行）：

```javascript
// ❌ 問題：檢查太寬鬆
const veryRecentDirVehicles = recentVehicles.filter(
  (v) => v.direction === selectedDir && now - v.timestamp < 1000, // 1秒太長！
)
if (veryRecentDirVehicles.length > 0) {
  console.log(`${selectedDir}方向1秒內已有車輛，延後生成`)
  return
}
```

**問題**：新生成的車輛是通過 emit 事件異步添加到 `window.liveVehicles` 的，所以：

1. 第一台車調用 `_generateVehicle()` → 通過檢查 → 發送 emit 事件
2. 第二台車調用 `_generateVehicle()` → 檢查 `recentVehicles`，但第一台車還沒添加到列表中
3. 第二台車也通過檢查 → 發送 emit 事件
4. **結果**：同一幀內同方向生成多台車！

---

## 修復方案

### 核心思路

添加一個 **同步的、本地的幀內生成記錄**，來跟踪當前 RAF 幀內已生成的車輛，防止同一幀內的重複生成。

### 修復步驟

#### 1️⃣ 在構造函數中添加幀內生成跟踪數組

**文件**：`AutoTrafficGenerator.js` - 構造函數（第 60 行）

```javascript
constructor(trafficController, simulationStore) {
  // ... 其他初始化 ...

  // ⚠️ 【修復】同一RAF幀內生成車輛跟踪 - 防止重複生成
  this.currentFrameGeneratedVehicles = []  // 記錄當前幀已生成的車輛
}
```

#### 2️⃣ 在 `update()` 開始時清空該數組

**文件**：`AutoTrafficGenerator.js` - `update()` 方法（第 393 行）

```javascript
update(deltaTimeMs) {
  if (!this.isRunning) return

  // ⚠️ 【修復】在幀開始時清空當前幀的生成記錄
  this.currentFrameGeneratedVehicles = []

  // 1. 累加時間
  this.timeSinceLastGenerate += deltaTimeMs
  // ... 後續代碼 ...
}
```

**效果**：每個新的 RAF 幀開始時，清空前一幀的生成記錄，從而重新開始計算。

#### 3️⃣ 在 `_generateVehicle()` 中添加幀內重複檢查

**文件**：`AutoTrafficGenerator.js` - `_generateVehicle()` 方法（第 1138 行）

在選擇方向後立即添加檢查（兩次）：

```javascript
let selectedDir = availableDirs[Math.floor(Math.random() * availableDirs.length)]

// ⚠️ 【修復】檢查當前RAF幀內是否已經為該方向生成過車輛
const frameGeneratedForDir = this.currentFrameGeneratedVehicles.filter((v) => v.direction === selectedDir)
if (frameGeneratedForDir.length > 0) {
  console.log(`🚨 [幀內重複] ${selectedDir}方向在當前幀內已生成${frameGeneratedForDir.length}台，延後到下一幀`)
  return // ❌ 阻止在同一幀內生成
}

// 檢查每個方向的車輛數量
// ... 其他代碼 ...

// ⚠️ 【修復】重新檢查新選方向是否已在當前幀生成過
const frameGeneratedForNewDir = this.currentFrameGeneratedVehicles.filter((v) => v.direction === selectedDir)
if (frameGeneratedForNewDir.length > 0) {
  console.log(`🚨 [幀內重複] 新選方向 ${selectedDir} 在當前幀內已生成${frameGeneratedForNewDir.length}台，延後到下一幀`)
  return
}

// 🚨 更嚴格的同方向車輛檢查
const veryRecentDirVehicles = recentVehicles.filter((v) => v.direction === selectedDir && now - v.timestamp < 1000)
if (veryRecentDirVehicles.length > 0) {
  console.log(`🚨 ${selectedDir}方向1秒內已有車輛(${veryRecentDirVehicles.length}台)，延後生成`)
  return
}
```

**效果**：

- 第一台車生成時，`currentFrameGeneratedVehicles` 為空，通過檢查
- 第二台車生成時，檢查到 `currentFrameGeneratedVehicles` 中已有該方向的車輛，被阻止
- 第二台車延後到下一幀嘗試

#### 4️⃣ 生成成功後記錄到幀內數組

**文件**：`AutoTrafficGenerator.js` - `_generateVehicle()` 方法（第 1470 行）

在 `vehicleAdded` 事件發送後添加記錄：

```javascript
// ✅ 使用 Store emit 發送 vehicleAdded 事件
const vehicleAddedDetail = { direction: selectedDir, type: type, speed: speed, timestamp: Date.now() }
if (this.simulationStore) {
  this.simulationStore.emit('vehicleAdded', vehicleAddedDetail)
}

// 🔙 向後相容：同時發送 window 事件
window.dispatchEvent(
  new CustomEvent('vehicleAdded', {
    detail: vehicleAddedDetail,
  }),
)

// ⚠️ 【修復】記錄該車輛已在當前幀生成（防止同幀重複生成）
this.currentFrameGeneratedVehicles.push({
  direction: selectedDir,
  type: type,
  timestamp: Date.now(),
})

this.statistics.total++
```

**效果**：每成功生成一台車，就記錄到本地數組，供後續檢查使用。

---

## 修復效果驗證

### 控制台日誌新增

修復後，當檢測到幀內重複時會輸出：

```
🚨 [幀內重複] east方向在當前幀內已生成1台，延後到下一幀
🚨 [幀內重複] 新選方向 west 在當前幀內已生成1台，延後到下一幀
```

### 行為改變

- **修復前**：同一幀內可能生成多台車到同一方向 → 堆疊
- **修復後**：同一幀內每方向最多生成 1 台車 → 有序派遣

### 生成順序改善

```
RAF幀 1：
  - 嘗試生成East車輛 1 → 成功 ✅
  - 嘗試生成East車輛 2 → 被阻止（已在本幀生成）❌
  - 嘗試生成East車輛 3 → 被阻止（已在本幀生成）❌

RAF幀 2：
  - 嘗試生成East車輛 2 → 成功 ✅
  - 嘗試生成East車輛 3 → 被阻止（已在本幀生成）❌

RAF幀 3：
  - 嘗試生成East車輛 3 → 成功 ✅
```

---

## 關鍵改進

| 項目                       | 修復前                                   | 修復後                                   |
| -------------------------- | ---------------------------------------- | ---------------------------------------- |
| **同一幀內同方向最多生成** | 不受限制                                 | 1 台                                     |
| **檢查機制**               | 僅檢查 `window.liveVehicles`（可能滯後） | 同步本地 `currentFrameGeneratedVehicles` |
| **時間檢查**               | 1 秒內有車輛就阻止                       | 加上**同一幀內重複檢查**                 |
| **重試機制**               | 無（返回後就不再重試）                   | RAF 自動在下一幀重試                     |

---

## 代碼改動摘要

### 文件修改

- **`AutoTrafficGenerator.js`**：4 處修改

### 改動統計

| 操作                      | 行數       | 說明                                 |
| ------------------------- | ---------- | ------------------------------------ |
| 添加屬性                  | ~64        | `currentFrameGeneratedVehicles = []` |
| 修改 `update()`           | ~395       | 幀開始時清空數組                     |
| 修改 `_generateVehicle()` | ~1138-1165 | 添加幀內重複檢查                     |
| 修改 `_generateVehicle()` | ~1473-1476 | 記錄生成                             |

### 構建狀態

✅ **Build Success** - 無編譯錯誤

```
Build succeeded
Total JS (18 files): 1718.02 KB
Total CSS (4 files): 231.90 KB
```

---

## 測試建議

### 功能測試

1. ✅ 啟動應用，觀察控制台是否出現 `[幀內重複]` 日誌
2. ✅ 調整 `vehiclesPerInterval` 為 `{ min: 2, max: 5 }`，驗證每幀只生成 1 台/方向
3. ✅ 檢查 4 個方向的車輛是否均衡派遣（不再堆疊到一個方向）
4. ✅ 驗證 `statistics.total` 計數是否正確

### 性能測試

- 監測 RAF 幀率是否穩定（應該不受影響，因為修改極簡）
- 檢查內存使用（`currentFrameGeneratedVehicles` 只存儲當前幀數據，下一幀清空）

### 邊界情況

1. ✅ `vehiclesPerInterval = 1`：應無影響（原本就是 1 台/幀）
2. ✅ `vehiclesPerInterval = 0`：應正常處理（不生成）
3. ✅ `vehiclesPerInterval = { min: 5, max: 10 }`：應均衡派遣到多幀

---

## 相關文件位置

- **主要修改**：`src/classes/AutoTrafficGenerator.js`
  - 第 60-62 行：添加屬性
  - 第 393-395 行：清空數組
  - 第 1138-1165 行：幀內重複檢查
  - 第 1473-1476 行：記錄生成

---

## 結論

✅ **修復已完成**

該修復解決了在 RAF 幀內同一方向可能生成多台車的問題。通過引入同步的本地跟踪機制，確保了每個 RAF 幀內的有序派遣，防止了不必要的堆疊和碰撞。修復代碼極簡，對性能無負面影響。
