# Vehicle.js 未使用方法分析報告

## 📊 掃描摘要

已完成 Vehicle.js 全面掃描，找出所有**定義但未被使用的方法**。

### 🚨 發現的未使用方法

| #   | 方法名稱                        | 行號 | 作用                       | 備註          |
| --- | ------------------------------- | ---- | -------------------------- | ------------- |
| 1   | `isVehicleExited()`             | 1699 | 檢查車輛是否離開場景       | ❌ 完全未使用 |
| 2   | `canRecoverBasedOnStopReason()` | 473  | 根據停止原因判斷是否可恢復 | ❌ 完全未使用 |
| 3   | `forceUnstuck()`                | 267  | 強制解除卡頓狀態           | ❌ 完全未使用 |
| 4   | `getVehicleHeadPosition()`      | 1033 | 獲取車輛頭部位置           | ❌ 完全未使用 |

---

## 📍 詳細分析

### 1. ❌ `isVehicleExited()` - 行 1699

**方法簽名**：

```javascript
isVehicleExited() {
  if (!this.element) {
    return false
  }

  const currentPos = this.getCurrentPosition()
  const containerWidth = window.innerWidth || document.body.clientWidth
  const containerHeight = window.innerHeight || document.body.clientHeight
  const margin = VEHICLE_EXIT_CONFIG.BOUNDARY_MARGIN

  // 檢查車輛是否超出邊界
  const exitedLeft = currentPos.x < -margin
  const exitedRight = currentPos.x > containerWidth + margin
  const exitedTop = currentPos.y < -margin
  const exitedBottom = currentPos.y > containerHeight + margin

  return exitedLeft || exitedRight || exitedTop || exitedBottom
}
```

**使用情況**：

- ❌ 定義但未被調用任何地方
- 相同功能由 `checkOutOfBounds()` 提供
- 完全冗餘

**建議**：🗑️ **移除**

---

### 2. ❌ `canRecoverBasedOnStopReason()` - 行 473

**方法簽名**：

```javascript
canRecoverBasedOnStopReason(frontVehicle, collision) {
  if (!collision || !collision.reason) {
    return true // 無碰撞信息時允許恢復
  }

  const reason = collision.reason
  const frontIsMoving = frontVehicle?.movementTimeline?.timeScale() > 0.1

  // 根據停止原因決定是否允許恢復
  // ... (複雜的邏輯判斷)

  return false // 預設不允許恢復
}
```

**使用情況**：

- ❌ 定義但未被調用
- 功能已被其他方法替代

**建議**：🗑️ **移除**

---

### 3. ❌ `forceUnstuck()` - 行 267

**方法簽名**：

```javascript
forceUnstuck() {
  // 強制解除卡頓狀態的邏輯
  if (this.movementTimeline) {
    // ... 複雜的重置邏輯
  }
}
```

**使用情況**：

- ❌ 定義但未被調用
- 功能已被現代化狀態管理替代
- `checkAndProgressGapRecovery()` 提供了更好的替代

**建議**：🗑️ **移除**

---

### 4. ❌ `getVehicleHeadPosition()` - 行 1033

**方法簽名**：

```javascript
getVehicleHeadPosition() {
  // 計算車輛頭部位置
  const vehicleConfig = this.getVehicleConfig()
  const vehicleSize = { width: vehicleConfig.width, height: vehicleConfig.height }

  // ... 根據方向計算頭部位置
  return { x: ..., y: ... }
}
```

**使用情況**：

- ❌ 定義但未被調用
- 功能未被使用

**建議**：🗑️ **移除**

---

## ✅ 已確認正在使用的方法

以下方法已確認在 Vehicle.js 中被實際使用，應保留：

| 方法名稱                                      | 使用次數 | 狀態    |
| --------------------------------------------- | -------- | ------- |
| `setupAntiStuckMechanism()`                   | 1+       | ✅ 保留 |
| `checkAndResolveStuckState()`                 | 1+       | ✅ 保留 |
| `checkAndProgressGapRecovery()`               | 1+       | ✅ 保留 |
| `_transitionFromGapRecoveryToAutoFollowing()` | 4+       | ✅ 保留 |
| `updateStopReason()`                          | 使用     | ✅ 保留 |
| `notifyTrafficController()`                   | 使用     | ✅ 保留 |
| `notifyDataCollector()`                       | 2+       | ✅ 保留 |
| `onWeatherChanged()`                          | 使用     | ✅ 保留 |
| `getCurrentSpeedRatio()`                      | 1+       | ✅ 保留 |
| `getWeatherSpeedMultiplier()`                 | 4+       | ✅ 保留 |
| `getDistanceToStopLine()`                     | 3+       | ✅ 保留 |
| `checkBoundsForDirection()`                   | 1+       | ✅ 保留 |
| `checkTrafficLightSlowDown()`                 | 1+       | ✅ 保留 |
| `directTrafficLightResponse()`                | 使用     | ✅ 保留 |
| `canChangeLane()`                             | 使用     | ✅ 保留 |
| `decideLaneChange()`                          | 使用     | ✅ 保留 |
| `calculateLaneScore()`                        | 使用     | ✅ 保留 |
| `changeLane()`                                | 使用     | ✅ 保留 |

---

## 🗑️ 清理建議

### 第一優先級：立即移除

這些方法是**完全冗餘的**，可以立即安全移除：

1. **`isVehicleExited()` (行 1699-1718)** - ~20 行
   - 功能由 `checkOutOfBounds()` 完全覆蓋
   - 零使用

2. **`getVehicleHeadPosition()` (行 1033-1041)** - ~9 行
   - 功能未被使用
   - 可以移除

3. **`forceUnstuck()` (行 267-312)** - ~46 行
   - 功能由現代狀態管理替代
   - 已被棄用

4. **`canRecoverBasedOnStopReason()` (行 473-503)** - ~31 行
   - 邏輯已被其他方法重現
   - 零使用

**預期節省**：~106 行代碼

---

## 📊 清理前後對比

| 指標         | 清理前  | 清理後   | 改善      |
| ------------ | ------- | -------- | --------- |
| 方法總數     | ~50+    | ~46      | ↓ 4 個    |
| 代碼行數     | 2114 行 | ~2008 行 | ↓ ~106 行 |
| 冗餘方法     | 4 個    | 0 個     | ✅        |
| 編譯錯誤風險 | 低      | 低       | ✅        |

---

## ⚠️ 其他觀察

### 1. 代理方法（包裝方法）

以下方法是**代理/包裝方法**，只是調用 CollisionController 的方法：

- `smartCollisionCheck()` (行 1071-1072)
- `performDetailedCollisionCheck()` (行 1076-1077)
- `checkSimpleCollision()` (行 1081-1082)
- `isClosestToStopLine()` (行 1053-1055)
- `getNearbyVehicles()` (行 1060-1061)
- `isInCriticalZone()` (行 1066-1067)

**說明**：這些方法是為了提供統一的接口，保留它們以方便將來的重構。

### 2. 過時的調用（待修復）

在 `onUpdate` 回調中（行 1445-1446）仍然存在直接調用 CollisionController 的代碼：

```javascript
const shouldStop = this.collisionController.checkSimpleCollision(allVehicles)
const isFirstVehicle = this.collisionController.isClosestToStopLine(allVehicles)
```

**建議**：應該統一改為 `this.handleCollisions(trafficController, allVehicles)`

---

## 🎯 執行清理的步驟

### 步驟 1：安全備份

```bash
git commit -m "backup: before removing unused methods from Vehicle.js"
```

### 步驟 2：移除方法

1. 移除 `isVehicleExited()` (行 1699-1718)
2. 移除 `getVehicleHeadPosition()` (行 1033-1041)
3. 移除 `forceUnstuck()` (行 267-312)
4. 移除 `canRecoverBasedOnStopReason()` (行 473-503)

### 步驟 3：驗證編譯

```bash
npm run build  # 確保無錯誤
```

### 步驟 4：測試

- 在瀏覽器中測試各種場景
- 確保功能無差異

### 步驟 5：提交

```bash
git commit -m "refactor: remove 4 unused methods from Vehicle.js (-106 lines)"
```

---

## 📌 報告生成日期

2025年11月7日
