# DOM 節點池化診斷和優化方案

## 📊 當前狀況診斷

### 觀察現象
```
DOM 節點數量: 900 → 1500 → 2300 → 3000 → 1000 (鋸齒狀)
```

### 根本原因分析

#### 1. 上升階段 (900 → 3000)
```javascript
// 【持續執行】AutoTrafficGenerator.js 不斷創建新車
const vehicle = new Vehicle(x, y, direction, type, lane)
vehicle.addTo(container) // ← 【問題】appendChild
```

**DOM 操作**:
- ✅ 使用池時: `pool.acquire()` → 不調用 `addTo()` (已實現) 
- ❌ 緊急備用: 仍會 `new Vehicle()` 且直接 `addTo()` (池耗盡時)

#### 2. 下降階段 (3000 → 1000)
```javascript
// 【延遲發生】垃圾回收觸發
// 車輛完成 → performCleanup() → pool.release(vehicle)
// → 銷毀 DOM (removeChild)
```

**DOM 操作**:
- ✅ 應該不移除，應該隱藏 (gsap.set + autoAlpha: 0)
- ❌ 但池中的車輛可能被多次創建/銷毀

---

## 🔍 診斷流程

### 第一步：確認池的實際使用率

在 `VehiclePool.js` 中添加診斷方法：

```javascript
/**
 * 獲取池的統計信息（診斷用）
 */
getPoolStats() {
  const stats = {
    totalAcquired: 0,
    totalReleased: 0,
    poolSizes: {},
    utilizationRate: 0,
  }

  for (const [direction, directionPool] of this.poolMap) {
    stats.poolSizes[direction] = directionPool.length
    stats.totalAcquired += this.acquireCount?.[direction] || 0
    stats.totalReleased += this.releaseCount?.[direction] || 0
  }

  return stats
}

// 在 constructor 中添加計數器
this.acquireCount = {}
this.releaseCount = {}

// 在 acquire() 中記錄
this.acquireCount[direction] = (this.acquireCount[direction] || 0) + 1

// 在 release() 中記錄
this.releaseCount[direction] = (this.releaseCount[direction] || 0) + 1
```

### 第二步：追蹤 DOM 節點變化

在 `IndexPage.vue` 的主循環中添加診斷代碼：

```javascript
// 在主 RAF 迴圈中，每秒記錄一次
let lastLogTime = 0
const diagnosticInterval = 1000 // 1 秒

frameCount.value++
const currentTime = Date.now()

if (currentTime - lastLogTime > diagnosticInterval) {
  lastLogTime = currentTime
  
  const stats = vehiclePool.getPoolStats()
  const vehicleCount = vehicles.value.length
  const domNodeCount = vehicleContainer.value?.querySelectorAll('.vehicle').length || 0
  
  console.log(`
  🔍 【診斷報告】
  ├─ 活動車輛數: ${vehicleCount}
  ├─ DOM 節點數: ${domNodeCount}
  ├─ 池統計:
  │  ├─ 總獲取: ${stats.totalAcquired}
  │  ├─ 總釋放: ${stats.totalReleased}
  │  └─ 各方向池大小: ${JSON.stringify(stats.poolSizes)}
  └─ 效率: ${vehicleCount > 0 ? ((domNodeCount / vehicleCount * 100).toFixed(1)) + '%' : 'N/A'}
  `)
}
```

---

## ✅ 驗證物件池是否完全生效

### 成功的症狀（修復完成）
```
🔍 【診斷報告】
├─ 活動車輛數: 45
├─ DOM 節點數: 45  ← 1:1 匹配
├─ 池統計:
│  ├─ 總獲取: 320
│  ├─ 總釋放: 275
│  └─ 各方向池大小: {east: 15, west: 12, south: 10, north: 8}
└─ 效率: 100%  ← 完美！

[持續 5-10 分鐘，DOM 節點數穩定在 45-50 之間]
```

**特徵**:
- ✅ DOM 節點數 ≈ 活動車輛數 (1:1)
- ✅ 池中保留了已用過的車輛
- ✅ 獲取次數 > 釋放次數 (正常，初始化時創建)
- ✅ DOM 節點數**不再波動** (穩定線)

### 問題的症狀（修復未完成）
```
🔍 【診斷報告】 (第 1 分鐘)
├─ 活動車輛數: 45
├─ DOM 節點數: 2380  ← ❌ 巨大差距
├─ 池統計:
│  ├─ 總獲取: 320
│  ├─ 總釋放: 275
│  └─ 各方向池大小: {east: 0, west: 0, south: 0, north: 0}
└─ 效率: 5292%  ← ❌ 嚴重不匹配

[5 秒後，DOM 節點數從 2380 → 800，伴隨 GC 卡頓]
```

**特徵**:
- ❌ DOM 節點數 >> 活動車輛數 (僵屍 DOM)
- ❌ 池大小為 0 (池被耗盡)
- ❌ DOM 節點數劇烈波動 (鋸齒狀)
- ❌ 可以看到 GC 暫停導致的幀率下降

---

## 🐛 可能的問題清單

### 問題 A：池中的車輛未正確隱藏
```javascript
// ❌ 錯誤的做法
vehicle.remove() // ← 直接移除 DOM

// ✅ 正確的做法
gsap.set(vehicle.element, {
  autoAlpha: 0,
  x: -9999,
  y: -9999,
})
```

**檢查**:
```javascript
// 在 VehiclePool.release() 中
const vehiclesToCheck = vehiclePool.poolMap.get('east')
vehiclesToCheck.forEach(v => {
  const style = window.getComputedStyle(v.element)
  console.log('隱藏狀態:', style.opacity, style.display, v.element.style.x)
})
```

### 問題 B：緊急備用路徑創建了太多新車
```javascript
// 在 createVehicleWithPosition 中
if (vehiclePool && vehiclePool.hasAvailableVehicles(direction)) {
  vehicle = vehiclePool.acquire(direction, laneNumber, vehicleType, x, y)
} else {
  // ❌ 這裡仍然創建新車並 addTo
  vehicle = new Vehicle(...)
  vehicle.addTo(container)
  console.warn(`⚠️ 池耗盡！創建了新車 [${direction}]`)
}
```

**檢查**: 查看控制台是否有 `⚠️ 池耗盡` 警告

### 問題 C：performCleanup() 中仍有 removeChild
```javascript
// ❌ 可能的隱藏 removeChild
if (this.laneLabel) {
  this.laneLabel.parentNode?.removeChild(this.laneLabel) // ← 但這是 laneLabel，不是車輛
}
```

### 問題 D：AutoTrafficGenerator 不知道池的存在
```javascript
// ❌ AutoTrafficGenerator.js 可能直接創建車輛
const vehicle = new Vehicle(...) // ← 不使用池
```

**檢查**: AutoTrafficGenerator 是否需要改寫

---

## 🛠️ 修復清單

### [ ] 步驟 1：添加診斷代碼
- [ ] 在 `VehiclePool.js` 中添加 `getPoolStats()`
- [ ] 在 `IndexPage.vue` 的 RAF 迴圈中添加診斷日誌

### [ ] 步驟 2：驗證池的實際使用率
- [ ] 運行模擬 1 分鐘
- [ ] 檢查控制台日誌
- [ ] 記錄 DOM 節點數變化

### [ ] 步驟 3：識別問題
根據診斷結果，確定是哪個問題：
- [ ] 問題 A：池中車輛未隱藏 → 檢查 `reset()` 中的 gsap.set
- [ ] 問題 B：池耗盡 → 增加初始池大小
- [ ] 問題 C：其他元素被移除 → 檢查事件監聽清理
- [ ] 問題 D：AutoTrafficGenerator 不使用池 → 改寫生成邏輯

### [ ] 步驟 4：修復並驗證
- [ ] 應用修復
- [ ] 重新運行診斷
- [ ] 驗證 DOM 節點數穩定

---

## 📈 成功標準

| 指標 | 修復前 | 修復後 |
|------|-------|-------|
| DOM 節點波動 | 900 → 3000 → 1000 | 900 → 950 (穩定) |
| GC 暫停 | 頻繁（每 10 秒） | 罕見（每 2+ 分鐘） |
| 幀率 | 45-60 fps（卡頓） | 58-60 fps（穩定） |
| 平均 GC 時間 | 200+ ms | 10 ms 以下 |
| 內存占用 | 持續上升 | 平穩 |

---

## 🚀 下一步行動

1. **立即**: 添加診斷代碼，收集數據
2. **5 分鐘**: 分析診斷結果，識別具體問題
3. **15 分鐘**: 實施針對性修復
4. **10 分鐘**: 運行驗證，確認 DOM 節點穩定

**預期結果**: DOM 節點數穩定，GC 壓力消失，動畫流暢！
