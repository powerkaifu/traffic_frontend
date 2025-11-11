# ✅ 方向特定停止線對齁調整 - 已應用

## 📊 診斷結果已應用

### 首車精準度診斷結果

| 方向     | 首車距離 | 調整值   | 狀態      |
| -------- | -------- | -------- | --------- |
| 🔴 EAST  | 2.43px   | **-2px** | ✅ 已應用 |
| 🔵 WEST  | -1.59px  | **+2px** | ✅ 已應用 |
| 🟡 NORTH | 4.39px   | **-4px** | ✅ 已應用 |
| 🟢 SOUTH | 6.47px   | **-6px** | ✅ 已應用 |

### 配置更新

已在 `src/classes/vehicle_utils/CollisionController.js` (第 16-24 行) 更新：

```javascript
STOP_LINE_OFFSET_BY_DIRECTION: {
  east: -2,   // 🔴 東向
  west: 2,    // 🔵 西向（唯一正值 - 停在後面）
  north: -4,  // 🟡 北向
  south: -6,  // 🟢 南向
},
```

## 🔍 調整分析

### 為什麼各方向誤差不同？

1. **🔴 東向 (EAST) - 誤差最小 ±2.43px**
   - 最精準的方向
   - 可能是水平方向對齊度最好

2. **🔵 西向 (WEST) - 唯一停在後面 -1.59px**
   - 唯一停在停止線後的方向
   - 需要向前調整 (+2px)
   - 可能與西向車寬度有關

3. **🟡 北向 (NORTH) - 誤差 4.39px**
   - 停在停止線前
   - 南北向誤差較東西向大

4. **🟢 南向 (SOUTH) - 誤差最大 6.47px**
   - 停在停止線前
   - 可能是因為南向車高度不同

### 東西向 vs 南北向的精度差異

**原因推測**：

- 🔴🔵 東西向車: width ≈ 35px（較長）
- 🟡🟢 南北向車: height ≈ 18px（較短）

南北向車尺寸較短，可能導致位置計算時的百分比誤差放大。

## 🚀 驗證步驟

### 方式 1: 自動診斷（推薦）

1. **刷新瀏覽器** （Ctrl+F5 硬刷新）
2. **等待 30 秒**（診斷工具自動運行）
3. **查看控制台報告**
4. **檢查新的首車距離**

預期結果：首車距離應該非常接近 0 ± 0.5px

### 方式 2: 手動監控

在瀏覽器控制台執行：

```javascript
// 監控首車距停止線的距離
setInterval(() => {
  const vehicles = window.liveVehicles || []
  const directions = ['east', 'west', 'north', 'south']

  directions.forEach((dir) => {
    const firstVehicle = vehicles.find((v) => v.direction === dir && (v.movementTimeline?.timeScale?.() || 0) < 0.1)

    if (firstVehicle?.collisionController) {
      const dist = firstVehicle.collisionController._calculateDistanceToStopLine()
      console.log(`[${dir.toUpperCase().padEnd(6)}] ${dist?.toFixed(2)}px`)
    }
  })
}, 1000)
```

## 📈 預期改進

### 調整前

```
🔴 EAST: 6.72px  ❌
🔵 WEST: 7.82px  ❌
🟡 NORTH: 4.71px  ❌
🟢 SOUTH: 9.06px  ❌
```

### 調整後（預期）

```
🔴 EAST: ~0.43px ✅ (2.43 - 2)
🔵 WEST: ~0.41px ✅ (-1.59 + 2)
🟡 NORTH: ~0.39px ✅ (4.39 - 4)
🟢 SOUTH: ~0.47px ✅ (6.47 - 6)
```

所有方向都應該在 ±0.5px 以內（非常精準）

## 🔧 持續調整

如果驗證後發現仍有偏差，可以進行微調：

1. **重新執行診斷工具**

   ```javascript
   window.preciseAlignmentDiagnostic.start()
   ```

2. **根據新報告進行微調**
   - 如果首車距離 > 0.5px，減小該方向的調整值
   - 如果首車距離 < -0.5px，增大該方向的調整值

3. **迭代調整**
   - 單次調整 ±1px
   - 編譯後驗證
   - 重複直到 ±0.5px 以內

## 📝 重要提示

### ⚠️ 何時需要重新調整？

- 車輛尺寸改變
- 停止線位置改變
- 中央參考矩形尺寸改變
- DOM 計算方式改變

### ✅ 調整已完成的信號

- ✓ 所有方向首車距停止線 < 1px
- ✓ 首車停止穩定，不抖動
- ✓ 後續車輛按 TARGET_SPACING 間距排隊
- ✓ 無碰撞、無穿透

## 📊 配置版本歷史

| 版本 | 日期       | EAST | WEST | NORTH | SOUTH | 狀態    |
| ---- | ---------- | ---- | ---- | ----- | ----- | ------- |
| v0   | 2025-11-11 | 0    | 0    | 0     | 0     | 基準    |
| v1   | 2025-11-11 | -2   | +2   | -4    | -6    | ✅ 當前 |

---

**狀態**: 🟢 已應用 - 等待驗證
**下一步**: 刷新瀏覽器並執行驗證
