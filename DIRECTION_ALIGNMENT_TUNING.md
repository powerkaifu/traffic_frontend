# 🎯 方向特定停止線對齁調整指南

## 問題描述

每個方向（東、西、南、北）的車都有不同的對齁誤差，需要單獨調整。

## 調整原理

### 配置位置

`src/classes/vehicle_utils/CollisionController.js` - 第 16-23 行

```javascript
STOP_LINE_OFFSET_BY_DIRECTION: {
  east: 0,   // 東向精確調整（px）
  west: 0,   // 西向精確調整（px）
  north: 0,  // 北向精確調整（px）
  south: 0,  // 南向精確調整（px）
},
```

### 調整方向

- **正值** `+N` → 停止線提前 N px（停在停止線前）
- **負值** `-N` → 停止線延遲 N px（停在停止線後）

## 診斷步驟

### 步驟 1: 觀察每個方向的誤差

在瀏覽器中開啟開發者工具控制台，運行：

```javascript
// 監控當前停止的車輛距停止線的距離
setInterval(() => {
  const vehicles = window.liveVehicles || []
  vehicles.forEach((vehicle) => {
    if (vehicle.movementTimeline?.timeScale() === 0) {
      // 已停止
      const controller = vehicle.collisionController
      if (controller) {
        const distance = controller._calculateDistanceToStopLine()
        console.log(`[${vehicle.direction.toUpperCase()}] 距停止線: ${distance?.toFixed(2)}px`)
      }
    }
  })
}, 1000)
```

### 步驟 2: 記錄每個方向的實際誤差

觀察控制台輸出：

- 如果顯示 **正值** → 車停在停止線前（需要 **負值** 調整）
- 如果顯示 **負值** → 車停在停止線後（需要 **正值** 調整）

### 步驟 3: 調整配置

根據觀察到的誤差，修改 `STOP_LINE_OFFSET_BY_DIRECTION`：

```javascript
STOP_LINE_OFFSET_BY_DIRECTION: {
  east: 0,    // 示例：如果東向停在前面 +2px，改為 -2
  west: 0,    // 示例：如果西向停在後面 -1px，改為 +1
  north: 0,   // 示例：如果北向完美對齁，保持 0
  south: 0,   // 示例：如果南向停在前面 +3px，改為 -3
},
```

## 常見誤差模式

### 東西向車 vs 南北向車

- **東西向車**：width ≈ 30-35px（長軸）
- **南北向車**：height ≈ 15-20px（短軸）

因此南北向車通常有不同的誤差。

### 可能的原因

1. **車輛尺寸差異** - 同向不同類型的車尺寸不同
2. **DOM 計算誤差** - getBoundingClientRect() 精度問題
3. **停止線位置計算** - 四個方向的停止線邊界定義不同

## 快速測試流程

### 1️⃣ 記錄初始誤差

```javascript
// 在控制台記錄每個方向的誤差
const errorLog = {}
;['east', 'west', 'north', 'south'].forEach((dir) => {
  window[`${dir}_errors`] = []
})

// 每當車停止時記錄距離
setInterval(() => {
  const vehicles = window.liveVehicles || []
  vehicles.forEach((vehicle) => {
    if (vehicle.movementTimeline?.timeScale() === 0) {
      const controller = vehicle.collisionController
      const distance = controller._calculateDistanceToStopLine()
      if (distance !== null && distance !== undefined) {
        window[`${vehicle.direction}_errors`].push(distance)
      }
    }
  })
}, 500)

// 3-5 秒後查看平均誤差
setTimeout(() => {
  ;['east', 'west', 'north', 'south'].forEach((dir) => {
    const errors = window[`${dir}_errors`]
    const avg = errors.length > 0 ? (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(2) : 'N/A'
    console.log(`${dir.toUpperCase()} 平均距離: ${avg}px (樣本數: ${errors.length})`)
  })
}, 5000)
```

### 2️⃣ 調整配置

```javascript
// 根據平均距離調整
STOP_LINE_OFFSET_BY_DIRECTION: {
  east: -平均距離值,   // 反向調整
  west: -平均距離值,
  north: -平均距離值,
  south: -平均距離值,
},
```

### 3️⃣ 重新編譯並測試

```bash
npm run build
# 然後刷新瀏覽器並重新測試
```

## 精密調整模式

如果需要精密對齁（誤差 < 0.5px），可以考慮：

1. **使用 Math.round() 確保整數**
   - 已在 `_calculateDistanceToStopLine()` 實施

2. **調整停止激進度**

   ```javascript
   // 在 checkSimpleCollision() 中
   if (distanceToStopLine <= effectiveOffset + 0.5) { // 改為 0.5 px 容差
     return { targetSpeed: 0, ... }
   }
   ```

3. **分別調整每個車型**
   - 可在 `COLLISION_CONFIG` 中按車型添加配置

## 調整記錄表

| 方向  | 初始誤差 | 調整值 | 最終結果 | 狀態 |
| ----- | -------- | ------ | -------- | ---- |
| EAST  | ? px     | 0      | 待測試   | ⏳   |
| WEST  | ? px     | 0      | 待測試   | ⏳   |
| NORTH | ? px     | 0      | 待測試   | ⏳   |
| SOUTH | ? px     | 0      | 待測試   | ⏳   |

請填入實測誤差，然後更新 `STOP_LINE_OFFSET_BY_DIRECTION` 的值。

## 調試模式

### 啟用調試日誌

在 `CollisionController.js` 的 `_calculateDistanceToStopLine()` 中添加：

```javascript
_calculateDistanceToStopLine() {
  const stopLine = this._getStopLinePosition()
  const vehicleHead = this._getVehicleHeadPosition()
  // ... 計算代碼 ...

  // 調試日誌
  if (this.vehicle.direction === 'east') { // 只監控東向
    console.debug(`[EAST] 停止線: ${stopLine?.value}, 車頭: ${vehicleHead?.value}, 距離: ${distance?.toFixed(2)}px`);
  }

  return distance
}
```

### 實時監控

在 IndexPage.vue 添加一個調試面板：

```vue
<div style="position: fixed; bottom: 20px; right: 20px; background: #000; color: #0f0; padding: 10px; font-size: 12px; max-width: 300px;">
  <div v-for="dir in ['east', 'west', 'north', 'south']" :key="dir">
    {{ dir }}: {{ getDirectionDistance(dir) }}px
  </div>
</div>

<script>
methods: {
  getDirectionDistance(direction) {
    const vehicles = window.liveVehicles || [];
    const vehicle = vehicles.find(v => v.direction === direction && v.movementTimeline?.timeScale() === 0);
    if (vehicle?.collisionController) {
      return vehicle.collisionController._calculateDistanceToStopLine()?.toFixed(2) ?? 'N/A';
    }
    return 'N/A';
  }
}
</script>
```

## 完成確認

✅ 當所有方向的車輛都能精準停在停止線（距離 ≈ 0px ± 0.5px）時，調整完成。

---

**最後更新**: 2025-11-11
**狀態**: 🟡 等待方向特定調整
