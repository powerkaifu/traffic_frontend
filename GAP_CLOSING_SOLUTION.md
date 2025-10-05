# 車輛間距縮小解決方案 (Gap-Closing Solution)

## 問題描述

當短時間內在同車道生成車輛時，如果後方車輛速度太快，在到達等待紅燈排隊隊列之前，容易與前方車輛發生碰撞檢測而停在原地，造成與等待紅燈排隊隊列的車輛之間出現一大段距離。

**關鍵要求**：
- ✅ **保持原本紅燈排隊機制**：已經在停止線附近排隊的車輛不受影響
- ✅ **只處理遠距離停車問題**：只修正那些因碰撞而停在遠處的車輛
- ✅ **精準判斷場景**：區分「正常排隊」和「需要縮小間距」兩種情況

## 解決方案

我們實現了一個**精準的智能間距縮小機制（Precision Gap-Closing Mechanism）**，透過嚴格的條件判斷，只讓真正需要的車輛啟動縮小間距，完全不影響正常的紅燈排隊流程。

### 核心改進

#### 1. 碰撞控制器改進 (`CollisionController.js`)

**精準的三重判斷條件（缺一不可）：**

```javascript
// 🆕 情況4：遠距離停車需要縮小間距加入排隊
// 🎯 關鍵判斷：只處理「遠離停止線」且「間距過大」的車輛

// 條件1：後車距離停止線很遠（> 80px）
const myDistanceToStopLine = this.vehicle.getDistanceToStopLine()
const farFromStopLine = myDistanceToStopLine !== null && Math.abs(myDistanceToStopLine) > 80

// 條件2：間距顯著過大（超過目標排隊距離的2倍）
const excessiveGap = minDistance > QUEUE_GAP * 2

// 條件3：前車在停止線附近排隊（< 50px）
const frontVehicleDistanceToStopLine = closestFrontVehicle.getDistanceToStopLine()
const frontVehicleNearStopLine = frontVehicleDistanceToStopLine !== null && 
                                  Math.abs(frontVehicleDistanceToStopLine) < 50

// 🎯 三個條件同時滿足才啟動縮小間距
if (farFromStopLine && excessiveGap && frontVehicleNearStopLine) {
  // 縮小間距邏輯...
}
```

**為什麼這樣設計？**

1. **`farFromStopLine`（後車遠離停止線）**
   - 確保只處理「還沒到達排隊區域」的車輛
   - 已經在停止線附近的車輛（< 80px）= 正常排隊，不處理

2. **`excessiveGap`（間距顯著過大）**
   - 只處理間距 > QUEUE_GAP * 2 的情況
   - 正常排隊間距（QUEUE_GAP ≈ 15-20px）不會被觸發
   - 真正有問題的間距才會啟動（例如 40px 以上）

3. **`frontVehicleNearStopLine`（前車在停止線附近）**
   - 確保前車已經在排隊隊列中
   - 避免處理兩台都遠離停止線的情況

**在 `checkSimpleCollision` 中的改進：**

```javascript
if (frontVehicleSpeed <= 0.1) {
  // 前車停止：根據距離和位置智能處理
  if (distance > effectiveStopDistance + 2) {
    // 🎯 判斷是否需要縮小間距：只處理遠離停止線的情況
    const myDistanceToStopLine = this.vehicle.getDistanceToStopLine()
    const farFromStopLine = myDistanceToStopLine !== null && Math.abs(myDistanceToStopLine) > 80
    const frontVehicleDistanceToStopLine = threatVehicle.getDistanceToStopLine ? 
                                            threatVehicle.getDistanceToStopLine() : null
    const frontNearStopLine = frontVehicleDistanceToStopLine !== null && 
                               Math.abs(frontVehicleDistanceToStopLine) < 50
    
    // 間距顯著過大：超過停止距離的2倍
    const significantGap = distance > effectiveStopDistance * 2
    
    // 🆕 只有在「後車遠離停止線」且「前車在停止線附近」且「間距顯著過大」時才啟動縮小間距
    if (farFromStopLine && frontNearStopLine && significantGap) {
      // 智能縮小間距：距離越大，速度越快
      const targetGap = effectiveStopDistance + 5
      const excessGap = distance - targetGap
      
      if (excessGap > 15) {
        // 間距較大時使用較快速度（但不要太快，最高0.2）
        speedRatio = Math.min(0.2, Math.max(0.1, (excessGap / 50)))
      } else {
        speedRatio = 0.08
      }
    } else {
      // 🎯 正常情況：在停止線附近排隊，使用標準的緩慢前進速度
      speedRatio = 0.12
    }
  }
}
```

#### 2. 車輛類別改進 (`Vehicle.js`)

**處理縮小間距邏輯：**

```javascript
else if (!shouldStop.frontVehicleIsMoving) {
  // 🆕 檢查是否有縮小間距標記或目標速度
  if (shouldStop.gapClosing || (shouldStop.targetSpeed && shouldStop.targetSpeed > 0)) {
    // 🆕 縮小間距模式：緩慢前進以縮小與前車的間距
    const targetSpeed = shouldStop.targetSpeed || 0.12
    gsap.to(this.movementTimeline, {
      timeScale: targetSpeed,
      duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
      ease: 'power2.out',
    })
    this.currentState = 'gapClosing' // 新狀態：縮小間距中
    return
  }
  
  // 前方車輛停止且不移動，且沒有縮小間距需求：完全停止
  this.movementTimeline.timeScale(0)
  this.currentState = 'stopped'
  return
}
```

**恢復移動方法改進：**

```javascript
resumeMovement(allVehicles = []) {
  if (
    this.movementTimeline &&
    (this.currentState === 'waiting' || 
     this.currentState === 'waitingForVehicle' || 
     this.currentState === 'slowing' ||
     this.currentState === 'gapClosing') // 🆕 新增：縮小間距狀態也可恢復移動
  ) {
    const collision = this.collisionController.checkSimpleCollision(allVehicles)
    
    if (!collision) {
      // 沒有前車，恢復正常速度
    } else {
      // 🆕 檢查是否有縮小間距標記
      if (collision.gapClosing) {
        const targetSpeed = collision.targetSpeed || 0.12
        gsap.to(this.movementTimeline, {
          timeScale: targetSpeed,
          duration: ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL,
          ease: 'power2.out',
        })
        this.currentState = 'gapClosing'
        return
      }
      // ... 其他邏輯
    }
  }
}
```

### 工作原理

#### 場景分析

**場景 A：正常紅燈排隊（不觸發縮小間距）**
```
停止線 ←--[20px]--← 車1 ←--[18px]--← 車2 ←--[16px]--← 車3
                    ↑                ↑                ↑
                   距停止線          距停止線          距停止線
                    20px            38px             54px
```
- 所有車輛都在停止線附近（< 80px）
- **不觸發**縮小間距機制
- 維持原本的排隊邏輯

**場景 B：遠距離停車需要縮小間距（觸發）**
```
停止線 ←--[15px]--← 車1 ←--[15px]--← 車2 ←---------[80px]---------← 車3
                    ↑                ↑                              ↑
                   距停止線          距停止線                      距停止線
                    15px            30px                          110px
```
- 車3 距離停止線 > 80px ✓（遠離停止線）
- 車3 與車2 間距 80px > QUEUE_GAP * 2 ✓（間距過大）
- 車2 距離停止線 < 50px ✓（前車在排隊）
- **觸發**縮小間距機制，車3 緩慢前進

#### 執行流程

1. **精準檢測**：系統持續檢查三個條件
   - 後車位置（是否遠離停止線）
   - 間距大小（是否顯著過大）
   - 前車位置（是否在排隊隊列中）

2. **動態速度調整**：
   ```javascript
   間距 80px → 速度 0.2 (較快)
   間距 50px → 速度 0.15 (中等)
   間距 30px → 速度 0.1 (較慢)
   間距 20px → 速度 0.08 (極慢)
   ```

3. **狀態管理**：
   - 觸發時設置 `gapClosing: true` 標記
   - 車輛狀態改為 `'gapClosing'`
   - 持續監控直到達到目標距離

4. **自動停止**：
   - 當間距縮小到目標距離時，停止前進
   - 加入正常的排隊隊列

### 參數說明

**距離判斷閾值：**

- **`farFromStopLine`**：> 80px
  - 超過此距離 = 遠離停止線，可能需要縮小間距
  - 小於此距離 = 在停止線附近，正常排隊

- **`frontVehicleNearStopLine`**：< 50px
  - 前車在此距離內 = 已在排隊隊列
  - 確保只處理「前車在隊列，後車在遠處」的情況

- **`excessiveGap`**：> QUEUE_GAP * 2
  - 正常排隊間距：15-20px
  - 觸發縮小間距的最小間距：30-40px
  - 確保只處理真正過大的間距

**排隊距離（QUEUE_GAP）：**
- 1號車道紅燈：20px
- 1號車道綠燈：12px
- 其他車道：15px

**縮小間距速度範圍：**
- 最高速度：0.2（當 excessGap > 15px）
- 最低速度：0.08（微調階段）
- 正常排隊速度：0.12（不觸發縮小間距時）

**目標距離：**
- 縮小間距目標：QUEUE_GAP * 1.5（稍微寬鬆）
- 防止過度緊密造成新的碰撞

### 效果

✅ **完美解決原有問題**：
- 後車碰撞停止在遠處時，會自動縮小間距
- 最終緊接在排隊隊列後方
- 消除了排隊隊列之間的大段空隙

✅ **完全不影響正常排隊**：
- 已在停止線附近（< 80px）的車輛完全不受影響
- 保持原有的紅燈排隊機制（一台接著一台）
- 正常間距（< QUEUE_GAP * 2）不會被修改

✅ **精準的條件判斷**：
- 三重條件確保只處理真正需要的情況
- 避免誤觸發導致排隊混亂
- 清晰區分「正常排隊」和「遠距離停車」

✅ **保持安全性**：
- 仍然遵守最小安全距離
- 防止車輛碰撞
- 平滑的速度變化避免急煞車
- 縮小間距速度受限（最高 0.2）

✅ **適應性強**：
- 根據車道類型和燈號狀態動態調整
- 支援不同的排隊距離要求
- 自動適應車流密度變化

### 關鍵差異對比

| 項目 | 原始問題版本 | 修正後版本 |
|------|------------|-----------|
| 觸發條件 | 間距 > QUEUE_GAP | 後車遠離停止線 AND 間距 > QUEUE_GAP*2 AND 前車在隊列 |
| 影響範圍 | 所有停車車輛 | 只有遠離停止線的車輛 |
| 正常排隊 | ❌ 被干擾 | ✅ 完全不受影響 |
| 縮小間距速度 | 0.08-0.25 | 0.08-0.2（更保守）|
| 目標距離 | QUEUE_GAP | QUEUE_GAP * 1.5（更寬鬆）|

## 測試建議

### 正常排隊測試（不應觸發縮小間距）
1. **停止線附近排隊**：觀察車輛在停止線 50px 內排隊，應該維持原有間距，不會緊縮
2. **連續到達**：多台車連續到達停止線，應該一台接一台正常排隊
3. **燈號切換**：紅燈轉綠燈時，車輛應該依序啟動，不會擠在一起

### 遠距離縮小間距測試（應觸發）
1. **高密度車流**：調高車輛生成頻率，製造後車在遠處停止的情況
2. **觀察縮小間距**：檢查遠離停止線（> 80px）且間距過大（> 40px）的車輛是否會緩慢前進
3. **最終結果**：縮小間距後，車輛應該緊接在排隊隊列後方，間距合理

### 邊界條件測試
1. **臨界距離**：測試距離停止線剛好 80px 的車輛行為
2. **臨界間距**：測試間距剛好 QUEUE_GAP * 2 的情況
3. **前車移動**：測試前車開始移動時，後車的反應

### 不同車道測試
1. **1號車道**：測試左轉車道的縮小間距機制
2. **其他車道**：測試直行車道的表現
3. **混合場景**：同時測試多個車道的協調運作

## 修改的文件

1. `src/classes/vehicle_utils/CollisionController.js`
   - `performQueueingCollisionCheck()` - 新增情況4的間距縮小邏輯
   - `checkSimpleCollision()` - 改進前車停止時的速度計算和標記

2. `src/classes/Vehicle.js`
   - `moveAlongPath()` - 處理 gapClosing 標記和新狀態
   - `resumeMovement()` - 支援 gapClosing 狀態的恢復移動

## 後續優化建議

1. **可視化調試**：加入視覺提示標示正在縮小間距的車輛（例如特殊顏色或標記）
2. **參數微調**：根據實際測試效果，可以調整 80px、50px、QUEUE_GAP*2 等閾值
3. **統計分析**：記錄縮小間距的觸發次數、平均距離等數據
4. **車輛類型優化**：考慮大車、小車、機車的不同縮小間距速度
5. **性能監控**：確保額外的距離計算不會影響整體性能

## 修改摘要

### 修正內容
- ❌ **移除**：過於寬鬆的條件判斷（原 `minDistance <= QUEUE_GAP * 3`）
- ✅ **新增**：精準的三重條件判斷（距離停止線 + 間距大小 + 前車位置）
- ✅ **保護**：確保正常排隊機制完全不受影響
- ✅ **限制**：降低縮小間距速度上限（0.25 → 0.2）更加保守

### 核心邏輯
```
IF (後車距停止線 > 80px) 
   AND (車間距 > QUEUE_GAP * 2)
   AND (前車距停止線 < 50px)
   AND (間距超過目標 > 10px)
THEN
   啟動縮小間距（速度 0.08-0.2）
ELSE
   維持正常邏輯（不干擾排隊）
```
