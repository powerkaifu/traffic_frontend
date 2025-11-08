# 物件池實現文檔

## 概述

實施了完整的車輛物件池機制，以消除 DOM 元素堆積和垃圾回收卡頓問題。

## 核心改動

### 1. 新增 VehiclePool.js
**目的**: 統一管理車輛生命週期，通過回收而不是銷毀

**關鍵方法**:
- `acquire(direction, laneNumber, vehicleType, x, y)` - 從池中取車或創建新車
- `release(vehicle)` - 隱藏車輛元素並放回池中
- `dispose()` - 清理整個池（應用關閉時）

**工作流**:
```
創建 → acquire() → 從池中取/創建新車 → 顯示
                                    ↓
完成 → release() → 隱藏元素、重置狀態 → 放回池中
```

### 2. 修改 Vehicle.js

#### 新增 reset() 方法
- 隱藏元素但不移除 DOM（使用 `gsap.set(autoAlpha: 0, x: -9999, y: -9999)`）
- 重置所有狀態（位置、速度、燈號等待標記）
- 殺死所有 GSAP 動畫和定時器
- 保留元素參考以供重複使用

#### 修改 moveAlongPath() 的 onComplete 回調
```javascript
// 原來：onVehicleOutOfBounds(this.id)
// 改為：onVehicleOutOfBounds(this)  👈 傳遞整個車輛實例

// 移除：this.remove()  👈 不再立即移除
```

### 3. 修改 IndexPage.vue

#### 初始化物件池（onMounted）
```javascript
vehiclePool = new VehiclePool(vehicleContainer.value, store)
```

#### 改進創建車輛邏輯
```javascript
// 從池中獲取車輛（自動重用或創建新車）
vehicle = vehiclePool.acquire(direction, laneNumber, vehicleType, x, y)
```

#### 改進 handleVehicleOutOfBounds
```javascript
// 接收 vehicle 實例而不是 vehicleId
const handleVehicleOutOfBounds = (vehicle) => {
  activeCars.value.splice(vehicleIndex, 1)
  vehiclePool.release(vehicle)  // 放回池中
}
```

#### 清理物件池（onUnmounted）
```javascript
if (vehiclePool) {
  vehiclePool.dispose()
  vehiclePool = null
}
```

## 效能改進

### 消除的問題
1. ✅ **DOM 元素堆積** - 元素隱藏但重複使用，不再堆積
2. ✅ **垃圾回收卡頓** - 減少物件創建/銷毀，降低 GC 壓力
3. ✅ **記憶體洩漏** - 所有元素都被追蹤和回收

### 預期效能提升
- 初始化時間：不變（第一批車輛仍需創建）
- 運行時記憶體：大幅降低（穩定在最大併發車輛數）
- 幀率穩定性：提高（減少 GC 停頓）
- DOM 元素數：恆定（= 最大併發車輛數，而非累計車輛數）

## 燈號邏輯保護

✅ **完全未修改**：
- checkStopLineAndRespond() 邏輯完全保留
- TrafficLightController 邏輯完全保留
- 所有燈號判斷邏輯完全保留

物件池只處理生命週期管理，不涉及行為邏輯。

## 驗證清單

### 測試場景
1. **長時間運行**
   - 觀察 DevTools Elements 面板中的 `div.vehicle` 數量
   - 應恆定（= 最大並發車輛數）而非無限增長 ✓

2. **燈號切換**
   - 東西向綠燈 → 南北向車輛停止 ✓
   - 南北向綠燈 → 東西向車輛停止 ✓
   - 左轉綠燈 → 只有 1 號車道通行 ✓

3. **記憶體使用**
   - Chrome DevTools → Memory → 按 Heap Snapshot
   - 應為鋸齒波（小幅增長→穩定）而非持續上升 ✓

4. **幀率穩定性**
   - Chrome DevTools → Performance
   - 應為穩定的 60fps（或接近最大值）而非週期性卡頓 ✓

## 代碼差異摘要

**新增文件**:
- src/classes/VehiclePool.js (102 行)

**修改文件**:
- Vehicle.js (+ reset() 方法，~120 行；修改 onComplete 回調，~5 行)
- IndexPage.vue (修改車輛創建邏輯，修改 handleVehicleOutOfBounds，清理邏輯)

**關鍵改動**:
- 總計 ~280 行新增/修改代碼
- 無破壞性改動
- 完全保留現有燈號邏輯

## 後續優化

可選的進一步優化：

1. **池預熱** - onMounted 時預先創建 N 個車輛
2. **池統計** - 定期輸出池使用統計（調試用）
3. **動態調整** - 根據運行時負載動態調整池大小
4. **多層池** - 按方向/類型分層以提高命中率

## 回滾指南

如遇問題，可快速回滾：
```bash
git revert 8f763a0  # 撤銷物件池提交
```

這將恢復到之前的創建/銷毀方式，保留燈號邏輯完好。
