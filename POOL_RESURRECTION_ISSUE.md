# 🚨 車輛池恢復問題診斷

## 症狀

- 所有車輛都被移到 `translate(-9999px, -9999px)` 且 `opacity: 0; visibility: hidden`
- 新車輛不再生成
- 模擬器停止運行

## 根本原因分析

您遇到的是**池恢復失敗 (Pool Resurrection Failure)**。當車輛被放回池中後，後續無法正確被喚醒。

### 可能的原因

#### 1️⃣ 最有可能：`autoAlpha` 設置未生效

**症狀表現**: 車輛雖然被 acquire() 但 autoAlpha 仍然是 0

```javascript
// VehiclePool.js acquire()
gsap.set(vehicle.element, {
  autoAlpha: 1, // ← 這行可能未執行或未生效
  x: x,
  y: y,
})
```

**可能原因**:

- element 引用失效（被 reset() 重新建立？）
- gsap 動畫衝突（舊動畫未完全清理）
- 時序問題：autoAlpha 設置前元素已被隱藏

**診斷方法**:

```javascript
// 在 VehiclePool.acquire() 中添加檢查
const computed = window.getComputedStyle(vehicle.element)
console.log(`After autoAlpha=1, computed opacity=${computed.opacity}`)
```

#### 2️⃣ 其次可能：`moveAlongPath()` 未被調用

**症狀表現**: 車輛可見但未開始移動

**可能原因**:

- `startVehicleAnimation()` 未被調用
- Promise 被拒絕但未被捕獲
- `waitForSvgPaths()` 超時

**診斷方法**:

```javascript
// 在 startVehicleAnimation 開始添加
console.log(`🔍 [${vehicle.id}] Starting animation...`)
```

#### 3️⃣ RAF 清理邏輯干擾

**症狀表現**: 車輛剛被 acquire 就被 RAF 清理邏輯刪除

**可能原因**:

- 車輛被 acquire() 後立即被 RAF 檢測到 isCompleted=true
- RAF 清理邏輯呼叫 vehiclePool.release() 或 vehicle.remove()

**診斷方法**:

```javascript
// 檢查 RAF 中關於 isCompleted 的邏輯
if (vehicle.isCompleted) {
  console.log(`🚨 Vehicle ${vehicle.id} isCompleted=true, 即將被清理`)
  // 這會導致車輛被移回池中而不是執行動畫
}
```

## 修復策略

### 短期修復：確保 autoAlpha 正確恢復

在 `VehiclePool.acquire()` 中添加多層驗證：

```javascript
acquire(direction, laneNumber, vehicleType, x, y) {
  // ... 重置邏輯 ...

  // 立即恢復可見性
  gsap.set(vehicle.element, {
    autoAlpha: 1,
    x: x,
    y: y,
  })

  // 驗證設置生效
  if (window.getComputedStyle(vehicle.element).opacity < 0.5) {
    console.warn(`[WARNING] autoAlpha setting may have failed for ${vehicle.id}`)
    // 強制設置
    vehicle.element.style.opacity = '1'
    vehicle.element.style.visibility = 'visible'
  }

  return vehicle
}
```

### 中期修復：隔離 RAF 清理邏輯

確保新 acquire 的車輛不被 RAF 立即清理：

```javascript
// 在 createVehicleWithPosition 中
// 標記為剛才建立，防止 RAF 立即清理
vehicle.justCreated = true
vehicle.creationTime = Date.now()

// 在 RAF 中檢查
const vehicleAge = Date.now() - vehicle.creationTime
if (vehicleAge < 1000 && vehicle.justCreated) {
  // 新車輛，跳過清理
  continue
}
```

### 長期修復：統一車輛生命週期管理

建立明確的狀態機：

- `pooled`: 在池中
- `acquiring`: 剛被 acquire，等待動畫開始
- `animating`: 正在執行動畫
- `completed`: 動畫完成，準備回收

```javascript
// 防止 RAF 清理最近被 acquire 的車輛
if (vehicle.state === 'acquiring') {
  // 不清理
  continue
}
```

## 監控指標

要驗證修復是否成功，監控：

1. **Pool 統計**:

   ```
   Active vehicles in pool by direction:
   - East: 0 (should remain 0 while animating)
   - West: 0
   - North: 0
   - South: 0

   Active vehicles animating:
   - Total: X (should be > 0)
   ```

2. **autoAlpha 檢查**:

   ```
   Vehicle autoAlpha values:
   - Animating: 1 (visible)
   - Pooled: 0 (hidden)
   ```

3. **生成事件**:
   ```
   Generate Vehicle events per second: X
   (should be > 0)
   ```

## 重現步驟

1. 啟動模擬器
2. 觀察第一批車輛正常移動
3. 等待車輛完成動畫並被放回池中
4. 觀察是否有新車輛出現
5. 檢查控制台日誌

如果所有新生成的事件都出現但車輛不可見，則是 autoAlpha 恢復問題。
如果沒有新生成事件，則是 AutoTrafficGenerator 停止的問題。

## 臨時解決方案

如果以上修復不起作用，可以禁用物件池並使用直接創建：

```javascript
// 在 createVehicleWithPosition 中
// vehiclePool = null  // 禁用物件池
// 改為直接創建新車輛
vehicle = new Vehicle(x, y, direction, vehicleType, laneNumber, store)
```

這將允許模擬器運行，但 DOM 會逐漸堆積。
