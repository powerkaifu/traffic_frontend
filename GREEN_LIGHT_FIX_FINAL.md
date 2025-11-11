# ✅ 綠燈全體通行修復 - 最終方案

## 問題陳述
當直行綠燈亮時，2、3、4 車道不是所有車都通行，有些車停留在原地。
當左轉綠燈亮時，1 車道也會有相同問題。

## 根本原因分析

### 原問題流程
```
第一輛車到達停止線
├─ checkStopLineAndRespond() → 決定是否停止
├─ 如果綠燈且該車道可通行 → hasPassedStopLine = true（立即通過）
│
第二輛車到達停止線
├─ checkStopLineAndRespond() → waitingForGreen = true（停止並等待）
├─ timeScale = 0（完全停止）
│
後續 updateLogic() 調用：
├─ collisionFollowingController.execute()
│  ├─ _canSkipCollision() 返回 true（綠燈期間可跳過碰撞檢測）
│  └─ ❌ 問題1：只返回 'green_light_bypass' 但不恢復 timeScale
│
├─ checkStopLineAndRespond()
│  ├─ waitingForGreen = true → 立即返回
│  └─ ❌ 問題2：無法執行 hasPassedStopLine 的邏輯
```

### 兩個關鍵問題

#### 問題 1：CollisionFollowingController 的 `_canSkipCollision()` 邏輯
**位置**：`src/classes/vehicle_utils/CollisionFollowingController.js` 第 74-75 行

```javascript
// ❌ 舊邏輯：只返回動作，不恢復運動
if (trafficController && this._canSkipCollision(trafficController)) {
  return { isFollowing: false, distance: Infinity, action: 'green_light_bypass' }
}
```

**問題**：即使返回了 `green_light_bypass`，車輛的 `timeScale` 仍然是 0，車輛不會動。

#### 問題 2：Vehicle.js 的 `checkStopLineAndRespond()` 提前返回
**位置**：`src/classes/Vehicle.js` 第 489-497 行

```javascript
// 🆕 如果正在等待綠燈，檢查是否可以恢復移動
if (this.waitingForGreen) {
  // ... 恢復邏輯 ...
  return  // ❌ 提前返回，無法執行後續邏輯
}
```

**問題**：當 `waitingForGreen = true` 時會提前返回，無法執行任何其他檢查。

## ✅ 修復方案

### 修復 1：CollisionFollowingController - 在綠燈時恢復運動

**位置**：`src/classes/vehicle_utils/CollisionFollowingController.js` 第 74-82 行

```javascript
// ✅ 新邏輯：綠燈期間需要恢復車輛運動
if (trafficController && this._canSkipCollision(trafficController)) {
  // 🔑 關鍵修復：綠燈期間需要恢復車輛運動
  if (this.vehicle.movementTimeline && this.vehicle.movementTimeline.timeScale() === 0) {
    this.vehicle.movementTimeline.timeScale(1)  // ✅ 恢復運動
    this.vehicle.isInCollisionStop = false
  }
  return { isFollowing: false, distance: Infinity, action: 'green_light_bypass' }
}
```

**效果**：當綠燈且該車道可以通行時，即使車輛被停止，也會被立即恢復。

### 修復 2：Vehicle.js - 清晰的綠燈恢復邏輯

**位置**：`src/classes/Vehicle.js` 第 487-506 行

```javascript
// ✅ 新邏輯：清晰的綠燈恢復判斷
const canProceedGreen = this._canProceedThroughStopLine(lightState)

if (this.waitingForGreen) {
  if (canProceedGreen) {
    // 綠燈期間：檢查前車是否已通過
    const frontVehicle = this._findNearestFrontVehicle(allVehicles)
    if (!frontVehicle || frontVehicle.hasPassedStopLine) {
      // 前車已通過或沒有前車，這輛車應該通過
      this.waitingForGreen = false
      this.isAtStopLine = false
      this.hasPassedStopLine = true
      if (this.movementTimeline && this.movementTimeline.timeScale() === 0) {
        this.movementTimeline.timeScale(1)
      }
    }
  }
  return
}
```

**效果**：當車輛在等待綠燈時，如果綠燈且前車已通過，會立即設置 `hasPassedStopLine = true`。

## 完整修復流程

### 修復後的流程圖
```
綠燈亮起 (green 或 leftGreen)
│
├─ updateLogic() 每 100ms 執行一次
│  │
│  ├─ collisionFollowingController.execute()
│  │  └─ _canSkipCollision() = true
│  │     └─ ✅ timeScale(1) - 恢復運動
│  │
│  └─ checkStopLineAndRespond()
│     ├─ 如果 waitingForGreen 且 canProceedGreen
│     │  └─ ✅ hasPassedStopLine = true
│     │     └─ ✅ timeScale(1) - 確保運動
│     │
│     └─ 如果不是 waitingForGreen
│        └─ ✅ 直接設置 hasPassedStopLine = true
│
所有符合條件的車輛都會通行 ✅
```

### 詳細時間軸

**時間 0ms**：綠燈亮起
```
Lane 2: Car 1 arrives at stop line
   → waitingForGreen = false
   → hasPassedStopLine = true
   → timeScale = 1 ✅
Lane 2: Car 2 arrives at stop line
   → waitingForGreen = true
   → timeScale = 0 ⏸️
Lane 2: Car 3 arrives at stop line
   → waitingForGreen = true
   → timeScale = 0 ⏸️
```

**時間 100ms**：updateLogic 執行
```
Lane 2: Car 2
   → collisionFollowingController.execute()
      → _canSkipCollision() = true (green light)
      → ✅ timeScale = 1 (恢復運動)
   → checkStopLineAndRespond()
      → canProceedGreen = true
      → ✅ hasPassedStopLine = true

Lane 2: Car 3
   → collisionFollowingController.execute()
      → _canSkipCollision() = true (green light)
      → ✅ timeScale = 1 (恢復運動)
   → checkStopLineAndRespond()
      → canProceedGreen = true
      → Car 2 已通過
      → ✅ hasPassedStopLine = true
```

## 預期結果

### 綠燈期間（green）
- ✅ Lane 1：所有車停止（等左轉綠燈）
- ✅ Lane 2：所有車通行
- ✅ Lane 3：所有車通行
- ✅ Lane 4：所有車通行

### 左轉綠燈期間（leftGreen）
- ✅ Lane 1：所有車通行
- ✅ Lane 2：所有車停止（等下一個綠燈）
- ✅ Lane 3：所有車停止（等下一個綠燈）
- ✅ Lane 4：所有車停止（等下一個綠燈）

## 提交信息
```
Commit: 4f7dcaa
Message: Fix: Restore vehicle movement during green light bypass - 
          ALL vehicles in green-eligible lanes must proceed
Files Modified:
  - src/classes/vehicle_utils/CollisionFollowingController.js
  - src/classes/Vehicle.js
```

## 驗證步驟
1. ✅ 重新整理瀏覽器頁面
2. ✅ 觀察綠燈期間的車道 2-4：所有車都應該通行
3. ✅ 觀察綠燈期間的車道 1：所有車都應該停止
4. ✅ 觀察左轉綠燈期間的車道 1：所有車都應該通行
5. ✅ 觀察左轉綠燈期間的車道 2-4：所有車都應該停止

---
**更新時間**: 2025-11-12
**狀態**: ✅ 已修復並提交
