# 幽靈車修復 (Ghost Vehicle Fix)

## 問題描述

**症狀**：畫面上有 `div.vehicle` 元素在移動，但是**沒有顯示圖片**（幽靈車）

**根本原因**：物件池從 DOM 中重用車輛元素時，存在**多層級**的問題：

1. **可見性未恢復** - 車輛從池中取出時，`autoAlpha: 0`（隱藏）未被恢復到 `autoAlpha: 1`
2. **圖片未始終設置** - reset() 中只有車型改變時才設置背景圖片，車型相同時圖片丟失
3. **背景樣式不完整** - 缺少 `backgroundSize`, `backgroundPosition`, `backgroundRepeat` 樣式
4. **重複 addTo()** - 從池中取出的車輛被二次添加到 DOM，導致位置混亂
5. **位置被覆蓋** - ⚠️ **【最關鍵】** 在 moveAlongPath 中，路徑起始點邏輯會覆蓋 pool.acquire() 設置的位置

## 修復內容

### 1. Vehicle.js - reset() 方法

**改動**：確保**無論車型是否改變**，都要完整設置圖片和樣式

```javascript
// ✅ 總是設置圖片和樣式（即使車型未變）
this.vehicleType = vehicleType
const vehicleConfig = this.getVehicleConfig()

// 無條件設置
this.element.style.backgroundImage = `url('${vehicleConfig.image}')`
this.element.style.width = vehicleConfig.width + 'px'
this.element.style.height = vehicleConfig.height + 'px'
this.element.style.backgroundSize = 'contain'
this.element.style.backgroundPosition = 'center'
this.element.style.backgroundRepeat = 'no-repeat'

// 🚨 標記為剛重置
this.isJustReset = true
```

### 2. VehiclePool.js - acquire() 方法

**改動**：從池中取出車輛時，立即恢復可見性和精確位置

```javascript
if (directionPool.length > 0) {
  vehicle = directionPool.pop()
  vehicle.reset(direction, laneNumber, vehicleType, this.simulationStore)
  
  // ✅ 立即恢復可見性和位置
  gsap.set(vehicle.element, {
    autoAlpha: 1,  // 👈 【關鍵】恢復可見性
    x: x,
    y: y,
    rotation: 0,
  })
  vehicle.currentX = x
  vehicle.currentY = y
  // 🚨 標記位置已設置，防止 moveAlongPath 中的路徑起始點邏輯覆蓋
  vehicle.isJustReset = true
}
```

**新增**：導入 gsap

```javascript
import { gsap } from 'gsap'
```

### 3. Vehicle.js - moveAlongPath() 方法
**改動**：⚠️ **【關鍵】** 檢查 `isJustReset` 標記，跳過路徑起始點位置設置邏輯

```javascript
// 【修復】如果是剛從池中取出（isJustReset=true），跳過路徑起始點設置
if (!this.isJustReset && (this.progress && this.progress !== 0)) {
  // 設置到指定的 progress 位置
} else if (!this.isJustReset) {
  // 設置到路徑起始點
}

// 🚨 清除剛重置標記（在位置設置後）
this.isJustReset = false
```

**原理**：
- 新建車輛：`isJustReset = false` → 使用路徑起始點邏輯（正常行為）
- 從池取出：`isJustReset = true` → 跳過路徑起始點邏輯（保留 pool.acquire() 設置的位置）

### 4. IndexPage.vue - createVehicleWithPosition()

**改動**：區分「從池中取出」和「新建」的車輛，只對新建車輛調用 `addTo()`

```javascript
let isFromPool = false
if (vehiclePool && ...) {
  vehicle = vehiclePool.acquire(...)
  isFromPool = true
} else {
  vehicle = new Vehicle(...)
  isFromPool = false
}

// ✅ 只有新建的車輛才需要 addTo
if (!isFromPool) {
  vehicle.addTo(vehicleContainer.value || crossroadContainer.value)
}
```

## 修復原理

### 原來的問題流程
```
1. 車輛完成 → pool.release(vehicle)
   ↓
2. reset() 執行
   - 設置 autoAlpha: 0 ✓
   - 隱藏位置 (-9999, -9999) ✓
   - 但圖片未設置或被清空 ❌
   ↓
3. 下次使用 → pool.acquire()
   - 從池取出 ✓
   - reset() 再次執行
   - 但仍是 autoAlpha: 0 ❌
   - 圖片仍未設置 ❌
   ↓
4. moveAlongPath 開始
   - 設置 isJustReset = true ✓
   - 設置位置 (x, y) ✓
   - 但立即被 moveAlongPath 覆蓋為路徑起始點 ❌ ⚠️
   ↓
5. 結果：DOM 存在、有位置、但無圖片（幽靈車）👻
```

### 修復後的流程
```
1. 車輛完成 → pool.release(vehicle)
   ↓
2. reset() 執行
   - 設置 autoAlpha: 0 ✓
   - 隱藏位置 (-9999, -9999) ✓
   - 設置完整圖片和樣式 ✓ 👈 【新】
   - 設置 isJustReset = true ✓ 👈 【新】
   ↓
3. 下次使用 → pool.acquire()
   - 從池取出 ✓
   - reset() 再次執行
   - 設置完整圖片和樣式 ✓
   - 立即恢復可見性 (autoAlpha: 1) ✓
   - 設置精確位置 (x, y) ✓
   - 保持 isJustReset = true ✓ 👈 【關鍵】
   ↓
4. moveAlongPath 開始
   - 檢查 isJustReset，跳過路徑起始點邏輯 ✓ 👈 【關鍵】
   - 使用 pool.acquire() 設置的位置 ✓
   - 清除 isJustReset 標記 ✓
   ↓
5. 結果：DOM 存在、有圖片、位置正確、完全可見 ✨
```

## 提交記錄

```
d404736 - Fix: Prevent position reset in moveAlongPath when vehicle is reused from pool
85dd1c1 - Fix ghost vehicles: ensure images and visibility restored when reusing from pool
```

## 驗證步驟

1. **立即檢查**
   - 觀察畫面上所有車輛是否都有圖片
   - 應該看不到任何「無圖片的移動矩形」
   - 所有車輛應在正確位置開始移動

2. **長時間運行**
   - 運行 5+ 分鐘
   - 監控開發者工具 Elements 面板
   - 所有 `div.vehicle` 應該都有 `backgroundImage` 樣式
   - `autoAlpha` 應該在 0（隱藏）和 1（顯示）之間切換
   - 位置應該是合理的 SVG 路徑位置，不是 `-9999`

3. **控制台日誌**
   - 應看到：`♻️ [VehiclePool] 從池中取車 [id]，設置位置 (x, y)`
   - 應看到：`🆕 [VehiclePool] 創建新車 [id]`（僅初始化時）
   - 不應頻繁看到：`❌ 無法計算路徑長度`

## 相關代碼改動統計

| 文件 | 改動 | 行數 |
|------|------|------|
| Vehicle.js | reset() + moveAlongPath() + constructor | ~50 行 |
| VehiclePool.js | 導入 gsap + acquire() 改進 | ~15 行 |
| IndexPage.vue | 區分池取出和新建邏輯 | ~10 行 |
| **總計** | **4 個文件改動** | **~75 行** |

## 關鍵教訓

✅ **從物件池重用元素時的注意事項**：
1. **始終恢復視覺屬性** - 不只是邏輯狀態，CSS 也要重置
2. **背景資源要完整** - 背景圖片需要配合 `backgroundSize` 等樣式
3. **區分新建和重用路徑** - 它們的初始化邏輯不同
4. **立即驗證可見性** - 從池中取出後要立即檢查 DOM 是否正確
5. **【最關鍵】防止位置覆蓋** - 如果有多個地方會設置位置，使用標記防止衝突

## 回滾指南

如需回滾此修復：
```bash
# 回滾到最後一個修復
git revert d404736

# 如果還要回滾第一個修復
git revert 85dd1c1
```

但不建議回滾，因為這些修復完全向後兼容，只是改進了視覺效果。
