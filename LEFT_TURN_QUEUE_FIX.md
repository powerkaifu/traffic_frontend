# 左轉車道排隊問題修復說明

## 問題描述

1號左轉車道的車輛沒有正確執行在停止線排隊的效果。當另一方向的直行燈或左轉燈亮起時，1號左轉車輛會停在生成位置不動，導致一堆1號左轉車在生成位置停止等待。

**預期行為：**
- 所有車輛（包括1號左轉車道）應該先移動到停止線進行排隊等待
- 當該方向的左轉綠燈亮起時，才允許通過路口

## 問題根源

在 `Vehicle.js` 的 `moveAlongPath()` 方法中，有兩處錯誤的邏輯：

### 錯誤1：初始化時的燈號檢查（第813-828行）

```javascript
// ❌ 錯誤的邏輯
const currentLightState = trafficController.getCurrentLightState(this.direction)

const canStart =
  this.laneNumber !== 1 || // 非1號車道可以移動到停止線排隊
  (this.laneNumber === 1 && currentLightState === 'leftGreen') // 1號車道只能在左轉綠燈時移動

if (canStart) {
  this.currentState = 'moving'
  this.waitingForGreen = false
} else {
  // 1號車道在非左轉綠燈時等待
  this.currentState = 'waitingForLeftTurnGreen'
  this.waitingForGreen = true
}
```

這個邏輯會讓1號車道的車輛在生成時就檢查燈號，如果不是左轉綠燈，車輛就會立即進入等待狀態，根本不會移動到停止線。

### 錯誤2：時間軸初始化時的暫停（第1104-1106行）

```javascript
// ❌ 錯誤的邏輯
if (this.waitingForGreen || this.currentState === 'waitingForLeftTurnGreen') {
  this.movementTimeline.timeScale(0)
}
```

即使修復了錯誤1，這個檢查也會立即暫停處於等待狀態的車輛，導致它們無法移動。

## 修復方案

### 修復1：移除初始化時的燈號限制

```javascript
// ✅ 正確的邏輯
// 所有車輛（包括1號左轉車道）都應該先移動到停止線排隊
// 燈號限制僅在停止線處檢查，而不是在起始位置就限制
this.currentState = 'moving'
this.waitingForGreen = false
this.isAtStopLine = false
this.hasPassedStopLine = false
```

### 修復2：移除時間軸的初始暫停

```javascript
// ✅ 正確的邏輯
// 移除：不再在初始化時暫停車輛
// 所有車輛（包括1號左轉車道）都應該立即開始移動到停止線排隊
// 燈號限制僅在到達停止線時才檢查
```

## 修復後的行為

1. **生成時**：所有車輛（包括1號左轉車道）都會立即開始移動，狀態為 `moving`
2. **移動過程中**：車輛會正常前進到停止線，執行碰撞檢測和跟車邏輯
3. **到達停止線時**：
   - 非1號車道：檢查是否為直行綠燈，紅燈則停車等待
   - 1號車道：檢查是否為左轉綠燈，如果是直行綠燈或紅燈則停車等待
4. **燈號變化時**：
   - `directTrafficLightResponse()` 方法會檢查當前燈號
   - 當左轉綠燈亮起時，等待中的1號車道車輛會被啟動

## 現有的正確邏輯（無需修改）

以下邏輯已經正確實現，無需修改：

### 停止線檢查邏輯（第1026-1080行）

```javascript
if (!this.hasPassedStopLine && this.checkStopLine() && !this.waitingForGreen && !this.isAtStopLine) {
  this.isAtStopLine = true
  const lightState = trafficController.getCurrentLightState(this.direction)

  // 1號車道在直行綠燈時也要停止等待左轉綠燈
  const shouldStop =
    lightState === 'red' ||
    lightState === 'yellow' ||
    lightState === 'allRed' ||
    (this.laneNumber === 1 && lightState === 'green')

  if (shouldStop) {
    this.stopMovement()
    this.waitingForGreen = true
    if (this.laneNumber === 1 && lightState === 'green') {
      this.currentState = 'waitingForLeftTurnGreen'
    }
  }
}
```

### 綠燈恢復邏輯（第1495-1553行）

```javascript
directTrafficLightResponse(trafficController) {
  // 已通過停止線的車輛不受燈號約束
  if (this.hasPassedStopLine) {
    // 確保保持移動狀態
    return
  }

  // 綠燈響應：根據車道類型決定是否可以移動
  if (currentLightState === 'green' || currentLightState === 'leftGreen') {
    const canProceed =
      (currentLightState === 'green' && this.laneNumber !== 1) || // 直行綠燈且非左轉車道
      (currentLightState === 'leftGreen' && this.laneNumber === 1) // 左轉綠燈且為左轉車道

    if (canProceed) {
      // 啟動車輛
      this.movementTimeline.timeScale(1)
      this.movementTimeline.resume()
      this.waitingForGreen = false
      this.isAtStopLine = false
      this.currentState = 'moving'
    }
  }
}
```

## 測試建議

修復後應該測試以下場景：

1. **1號車道生成測試**：
   - 在直行綠燈期間生成1號左轉車輛
   - 確認車輛會移動到停止線並停車等待
   - 當左轉綠燈亮起時，車輛應該繼續通過路口

2. **多車排隊測試**：
   - 連續生成多台1號車道車輛
   - 確認它們會依序排隊到停止線
   - 確認適當的車間距

3. **燈號切換測試**：
   - 測試直行綠燈→黃燈→紅燈→左轉綠燈的完整週期
   - 確認1號車道車輛在正確的時機啟動和停止

4. **混合車道測試**：
   - 同時測試1號車道（左轉）和其他車道（直行）
   - 確認不同車道的車輛互不干擾
   - 確認各自遵守對應的燈號規則

## 修改檔案

- `src/classes/Vehicle.js`
  - 第812-818行：移除初始化時的燈號檢查限制
  - 第1103-1105行：移除時間軸初始暫停邏輯

## 總結

此修復解決了1號左轉車道車輛無法移動到停止線排隊的問題。修復的核心理念是：

**所有車輛都應該先移動到停止線排隊，燈號限制僅在停止線處檢查，而不是在生成位置就限制。**

這樣可以確保：
1. 車輛會正常移動到停止線形成排隊
2. 燈號邏輯在正確的位置（停止線）生效
3. 左轉綠燈亮起時，等待中的車輛會正確啟動
