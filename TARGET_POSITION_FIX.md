# TARGET_POSITION 停車位置配置修復

## 🎯 問題
TARGET_POSITION 配置沒有正確套用到車輛停止邏輯中，車輛停車位置無法通過配置調整。

## ✅ 解決方案
修正 `StopLineController.js` 中的 `alignToStopLine()` 方法，使其正確使用 TARGET_POSITION 配置。

## 📝 修改內容

### 1. StopLineController.js - alignToStopLine() 方法

**位置**：`src/classes/vehicle_utils/StopLineController.js` 第155-199行

**修改前**（未使用 TARGET_POSITION）：
```javascript
alignToStopLine() {
  // ...
  switch (this.vehicle.direction) {
    case 'east':
      targetX = stopLine.x - size.width  // 直接對齊停止線，沒有偏移
      break
    // ...
  }
}
```

**修改後**（使用 TARGET_POSITION 配置）：
```javascript
alignToStopLine() {
  const targetOffset = STOP_LINE_CONFIG.TARGET_POSITION  // 讀取配置
  
  switch (this.vehicle.direction) {
    case 'east':
      // 考慮 TARGET_POSITION 偏移
      targetX = stopLine.x - size.width - targetOffset.EAST
      break
    case 'west':
      targetX = stopLine.x + targetOffset.WEST
      break
    case 'north':
      targetY = stopLine.y + targetOffset.NORTH
      break
    case 'south':
      targetY = stopLine.y - size.height - targetOffset.SOUTH
      break
  }
}
```

### 2. stopLineConfig.js - 更新註釋

**位置**：`src/classes/config/stopLineConfig.js` 第14-22行

```javascript
// 停車目標位置配置（單位：px）
// 正值：車輛停在停止線前（距離停止線 N px）
// 負值：車輛停在停止線後（越過停止線 N px）
// 0：車頭剛好對齊停止線
TARGET_POSITION: {
  EAST: 0,   // 東向
  WEST: 0,   // 西向
  NORTH: 0,  // 北向
  SOUTH: 0,  // 南向
}
```

## 🎬 TARGET_POSITION 使用說明

### 正值：停在停止線前

```javascript
TARGET_POSITION: {
  EAST: 5,   // 東向車輛停在停止線前5px
  WEST: 5,   // 西向車輛停在停止線前5px
  NORTH: 5,  // 北向車輛停在停止線前5px
  SOUTH: 5,  // 南向車輛停在停止線前5px
}
```

**效果**：
```
車頭位置
   ↓
[車輛] ←5px→ |停止線|
           (前方)
```

### 負值：停在停止線後

```javascript
TARGET_POSITION: {
  EAST: -3,  // 東向車輛越過停止線3px
  WEST: -3,
  NORTH: -3,
  SOUTH: -3,
}
```

**效果**：
```
        車頭位置
           ↓
|停止線| ←3px→ [車輛]
      (已越過)
```

### 零值：對齊停止線

```javascript
TARGET_POSITION: {
  EAST: 0,   // 東向車頭剛好對齊停止線
  WEST: 0,
  NORTH: 0,
  SOUTH: 0,
}
```

**效果**：
```
車頭剛好在停止線上
      ↓
[車輛]|停止線|
```

## 📊 不同方向的偏移邏輯

### 東向（EAST）- 車輛由西向東

```
              車輛前進方向 →
[車輛車身]車頭 ←偏移→ |停止線|
              ↑
         TARGET_POSITION.EAST
```

- **正值**：車頭停在停止線左側（前方）
- **負值**：車頭越過停止線（後方）

### 西向（WEST）- 車輛由東向西

```
← 車輛前進方向
|停止線| ←偏移→ 車頭[車輛車身]
              ↑
         TARGET_POSITION.WEST
```

- **正值**：車頭停在停止線右側（前方）
- **負值**：車頭越過停止線（後方）

### 北向（NORTH）- 車輛由南向北

```
       ↑ 車輛前進方向
     車頭
    [車輛]
    [車身]
      ↑ 偏移
  ─────────  停止線
  TARGET_POSITION.NORTH
```

- **正值**：車頭停在停止線下方（前方）
- **負值**：車頭越過停止線（後方）

### 南向（SOUTH）- 車輛由北向南

```
  ─────────  停止線
      ↓ 偏移
  TARGET_POSITION.SOUTH
    [車身]
    [車輛]
     車頭
       ↓ 車輛前進方向
```

- **正值**：車頭停在停止線上方（前方）
- **負值**：車頭越過停止線（後方）

## 🔧 實際調整範例

### 範例1：所有方向都停在停止線前5px

```javascript
// stopLineConfig.js
TARGET_POSITION: {
  EAST: 5,
  WEST: 5,
  NORTH: 5,
  SOUTH: 5,
}
```

**效果**：車輛車頭距離停止線5px，留有安全間距

### 範例2：東西向停前5px，南北向對齊

```javascript
// stopLineConfig.js
TARGET_POSITION: {
  EAST: 5,
  WEST: 5,
  NORTH: 0,
  SOUTH: 0,
}
```

**效果**：東西向車輛留間距，南北向車輛剛好對齊

### 範例3：不同方向不同偏移

```javascript
// stopLineConfig.js
TARGET_POSITION: {
  EAST: 3,    // 東向停前3px
  WEST: 5,    // 西向停前5px
  NORTH: 0,   // 北向對齊
  SOUTH: -2,  // 南向越過2px
}
```

**效果**：每個方向獨立調整停車位置

## 🧪 測試方法

### 1. 測試正值偏移

```javascript
// 設定
TARGET_POSITION: { EAST: 10, WEST: 10, NORTH: 10, SOUTH: 10 }

// 預期結果
- 東向車輛車頭距停止線 10px
- 西向車輛車頭距停止線 10px
- 北向車輛車頭距停止線 10px
- 南向車輛車頭距停止線 10px
```

### 2. 測試負值偏移

```javascript
// 設定
TARGET_POSITION: { EAST: -5, WEST: -5, NORTH: -5, SOUTH: -5 }

// 預期結果
- 所有方向車輛車頭都越過停止線 5px
```

### 3. 測試零值（對齊）

```javascript
// 設定
TARGET_POSITION: { EAST: 0, WEST: 0, NORTH: 0, SOUTH: 0 }

// 預期結果
- 所有方向車輛車頭剛好對齊停止線
```

### 4. 測試混合值

```javascript
// 設定
TARGET_POSITION: { EAST: 5, WEST: 0, NORTH: -3, SOUTH: 8 }

// 預期結果
- 東向：停前 5px
- 西向：對齊
- 北向：越過 3px
- 南向：停前 8px
```

## 📈 偏移值建議

| 場景 | 建議值 | 說明 |
|-----|--------|------|
| 標準停車 | 0 | 車頭對齊停止線 |
| 保守停車 | 3-5px | 留一點安全距離 |
| 緊湊停車 | -2-0px | 最大化空間利用 |
| 寬鬆停車 | 5-10px | 更大安全距離 |

**建議範圍**：-5px 到 10px

- **小於 -5px**：車輛會明顯越過停止線
- **大於 10px**：車輛離停止線太遠，影響排隊

## ⚠️ 注意事項

1. **一致性**：建議所有方向使用相同的偏移值，除非有特殊需求
2. **可見性**：調整後檢查車輛是否還在視線範圍內
3. **排隊影響**：偏移值會影響後方車輛的排隊距離
4. **交通燈檢測**：確保偏移後車輛仍能正確檢測交通燈

## 🔧 修改的文件

1. ✅ `StopLineController.js` - alignToStopLine() 使用 TARGET_POSITION
2. ✅ `StopLineController.js` - getTargetStopPosition() 註釋更新
3. ✅ `stopLineConfig.js` - TARGET_POSITION 註釋更新

## 🚀 構建狀態

```
✅ npm run build - 成功
✅ 無語法錯誤
✅ TARGET_POSITION 已正確套用
```

## 💡 快速調整指南

**位置**：`src/classes/config/stopLineConfig.js`

```javascript
TARGET_POSITION: {
  EAST: 5,   // 👈 改這個值調整東向停車位置
  WEST: 5,   // 👈 改這個值調整西向停車位置
  NORTH: 5,  // 👈 改這個值調整北向停車位置
  SOUTH: 5,  // 👈 改這個值調整南向停車位置
}
```

**提示**：
- 正值 → 停在停止線前
- 負值 → 越過停止線
- 0 → 剛好對齊

修改後重新構建（`npm run build`）即可看到效果！

## 📅 版本資訊

- **版本**: v5.1
- **修復日期**: 2025-01-XX
- **修復內容**: TARGET_POSITION 配置現已正確套用到車輛停車邏輯
- **向後兼容**: ✅ 是（默認值為0，保持原有對齊行為）
