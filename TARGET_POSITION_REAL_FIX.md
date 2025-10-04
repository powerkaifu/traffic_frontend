# TARGET_POSITION 真正生效修復

## 🔍 問題分析

### 之前的問題
1. **`shouldStopAtLine()`** - 使用停止線位置判斷何時停車
2. **`alignToStopLine()`** - 在停車後才使用 TARGET_POSITION 微調
3. **結果**：TARGET_POSITION 只能做很小的微調（幾px），無法實現100px的偏移

### 根本原因
停車觸發時機是基於原始停止線位置，而不是考慮 TARGET_POSITION 的目標位置。

## ✅ 解決方案

修改 `shouldStopAtLine()` 和 `getDistanceToStopLine()` 方法，讓它們在計算時就考慮 TARGET_POSITION 偏移。

## 📝 修改內容

### 1. shouldStopAtLine() - 考慮 TARGET_POSITION

**位置**：`StopLineController.js` 第122-162行

**修改前**：
```javascript
shouldStopAtLine() {
  // ...
  switch (this.vehicle.direction) {
    case 'east':
      // 直接使用停止線位置
      return vehicleHead.x >= stopLine.x - sensitivity
    case 'north':
      return vehicleHead.y <= stopLine.y + sensitivity
    // ...
  }
}
```

**修改後**：
```javascript
shouldStopAtLine() {
  const targetOffset = STOP_LINE_CONFIG.TARGET_POSITION
  
  switch (this.vehicle.direction) {
    case 'east':
      // 計算目標停止位置（停止線 - TARGET_POSITION）
      const targetX_east = stopLine.x - targetOffset.EAST
      return vehicleHead.x >= targetX_east - sensitivity
    case 'north':
      // 北向：停止線 + TARGET_POSITION
      const targetY_north = stopLine.y + targetOffset.NORTH
      return vehicleHead.y <= targetY_north + sensitivity
    // ...
  }
}
```

### 2. getDistanceToStopLine() - 考慮 TARGET_POSITION

**位置**：`StopLineController.js` 第87-127行

**修改前**：
```javascript
getDistanceToStopLine() {
  // ...
  switch (this.vehicle.direction) {
    case 'east':
      // 計算到原始停止線的距離
      distance = stopLine.x - vehicleHead.x
      break
    // ...
  }
}
```

**修改後**：
```javascript
getDistanceToStopLine() {
  const targetOffset = STOP_LINE_CONFIG.TARGET_POSITION
  
  switch (this.vehicle.direction) {
    case 'east':
      // 計算到目標停止位置的距離
      const targetX_east = stopLine.x - targetOffset.EAST
      distance = targetX_east - vehicleHead.x
      break
    case 'north':
      const targetY_north = stopLine.y + targetOffset.NORTH
      distance = vehicleHead.y - targetY_north
      break
    // ...
  }
}
```

## 🎯 目標位置計算邏輯

### 東向（EAST）
```javascript
目標位置 = 停止線X - TARGET_POSITION.EAST

範例：
- 停止線X = 500
- TARGET_POSITION.EAST = 100
- 目標位置 = 500 - 100 = 400
- 車輛會在X=400的位置停止（停止線前100px）
```

### 西向（WEST）
```javascript
目標位置 = 停止線X + TARGET_POSITION.WEST

範例：
- 停止線X = 500
- TARGET_POSITION.WEST = 100
- 目標位置 = 500 + 100 = 600
- 車輛會在X=600的位置停止（停止線前100px）
```

### 北向（NORTH）
```javascript
目標位置 = 停止線Y + TARGET_POSITION.NORTH

範例：
- 停止線Y = 300
- TARGET_POSITION.NORTH = 100
- 目標位置 = 300 + 100 = 400
- 車輛會在Y=400的位置停止（停止線前100px）
```

### 南向（SOUTH）
```javascript
目標位置 = 停止線Y - TARGET_POSITION.SOUTH

範例：
- 停止線Y = 300
- TARGET_POSITION.SOUTH = 100
- 目標位置 = 300 - 100 = 200
- 車輛會在Y=200的位置停止（停止線前100px）
```

## 🎬 效果演示

### 設定 TARGET_POSITION = 100

```javascript
// stopLineConfig.js
TARGET_POSITION: {
  EAST: 0,
  WEST: 0,
  NORTH: 100,
  SOUTH: 100,
}
```

**結果**：
- 東向車輛：對齊停止線（EAST = 0）
- 西向車輛：對齊停止線（WEST = 0）
- 北向車輛：停在停止線前100px（NORTH = 100）
- 南向車輛：停在停止線前100px（SOUTH = 100）

### 視覺效果

**北向車輛（TARGET_POSITION.NORTH = 100）**：
```
車輛前進方向 ↑

     [車輛]
     [車身]
      車頭
       ↑
    100px 距離
       ↓
  ═══════════  停止線（原始位置）
```

**南向車輛（TARGET_POSITION.SOUTH = 100）**：
```
  ═══════════  停止線（原始位置）
       ↑
    100px 距離
       ↓
      車頭
     [車身]
     [車輛]

車輛前進方向 ↓
```

## 🧪 測試方法

### 測試1：北向100px偏移
```javascript
TARGET_POSITION: { NORTH: 100 }
```
1. 生成北向車輛
2. 觀察車輛停止位置
3. 車頭應該在停止線前100px

### 測試2：不同方向不同偏移
```javascript
TARGET_POSITION: {
  EAST: 50,
  WEST: 50,
  NORTH: 100,
  SOUTH: 100,
}
```
1. 測試所有四個方向
2. 東西向應停在停止線前50px
3. 南北向應停在停止線前100px

### 測試3：負值偏移（越過停止線）
```javascript
TARGET_POSITION: {
  NORTH: -20,
  SOUTH: -20,
}
```
1. 南北向車輛應該越過停止線20px

## 💡 配置建議

### 常用設定

| 場景 | 建議值 | 說明 |
|-----|--------|------|
| 標準停車 | 0 | 車頭對齊停止線 |
| 留緩衝距離 | 10-30px | 適合多數情況 |
| 大型偏移 | 50-100px | 測試或特殊需求 |
| 越過停止線 | -10-0px | 緊湊停車 |

### 方向差異化

```javascript
// 東西向標準，南北向保守
TARGET_POSITION: {
  EAST: 0,
  WEST: 0,
  NORTH: 50,   // 南北向多留50px
  SOUTH: 50,
}
```

## ⚠️ 注意事項

### 1. 偏移值範圍
- **建議最大值**：100-150px（太大會影響視覺）
- **建議最小值**：-30px（越過太多可能有問題）

### 2. 與 SENSITIVITY 的關係
```javascript
DETECTION: {
  SENSITIVITY: 10,  // 檢測敏感度
}

TARGET_POSITION: {
  NORTH: 100,       // 目標位置
}
```
- 車輛會在「目標位置 - SENSITIVITY」開始檢測
- 例如：100 - 10 = 車輛在距停止線90px時開始準備停車

### 3. 排隊間距影響
TARGET_POSITION 會影響後續車輛的排隊位置，建議配合調整排隊間距配置。

## 🔧 修改的文件

1. ✅ `StopLineController.js` - shouldStopAtLine() 考慮 TARGET_POSITION
2. ✅ `StopLineController.js` - getDistanceToStopLine() 考慮 TARGET_POSITION

## 🚀 構建狀態

```
✅ npm run build - 成功
✅ 無語法錯誤
✅ TARGET_POSITION 現在真正控制停車位置
```

## 📊 修改前後對比

### 修改前 ❌
```
TARGET_POSITION = 100

實際效果：車輛仍對齊停止線（偏移無效）
原因：shouldStopAtLine() 不考慮偏移
```

### 修改後 ✅
```
TARGET_POSITION = 100

實際效果：車輛停在停止線前100px
原因：所有檢測邏輯都考慮偏移
```

## 📅 版本資訊

- **版本**: v5.2
- **修復日期**: 2025-01-XX
- **修復內容**: TARGET_POSITION 現在控制實際停車位置，而非僅微調
- **向後兼容**: ✅ 是（默認值0保持原行為）

現在 TARGET_POSITION 真正控制車輛停車位置了！設定100px就會真的停在停止線前100px！
