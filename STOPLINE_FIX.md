# StopLineController.js 錯誤修正

## 🐛 問題

在 switch 語句中使用 `const` 宣告變數導致重複宣告問題。

## ❌ 錯誤的代碼

```javascript
switch (this.vehicle.direction) {
  case 'east':
    const targetX_east = stopLine.x - targetOffset.EAST  // ❌ const in switch
    return vehicleHead.x >= targetX_east - sensitivity
  case 'west':
    const targetX_west = stopLine.x + targetOffset.WEST  // ❌ const in switch
    return vehicleHead.x <= targetX_west + sensitivity
  // ...
}
```

### 問題原因

在 JavaScript 的 switch 語句中：
- 整個 switch 語句共用一個作用域
- 在不同 case 中使用 `const` 宣告同名變數會造成衝突
- 雖然構建可能成功，但在嚴格模式下可能出錯

## ✅ 修正的代碼

### 1. shouldStopAtLine() 方法

```javascript
shouldStopAtLine() {
  // ...
  let targetPosition  // ✅ 在 switch 外宣告共用變數

  switch (this.vehicle.direction) {
    case 'east':
      targetPosition = stopLine.x - targetOffset.EAST  // ✅ 賦值而非宣告
      return vehicleHead.x >= targetPosition - sensitivity
    case 'west':
      targetPosition = stopLine.x + targetOffset.WEST  // ✅ 賦值而非宣告
      return vehicleHead.x <= targetPosition + sensitivity
    case 'north':
      targetPosition = stopLine.y + targetOffset.NORTH
      return vehicleHead.y <= targetPosition + sensitivity
    case 'south':
      targetPosition = stopLine.y - targetOffset.SOUTH
      return vehicleHead.y >= targetPosition - sensitivity
    default:
      return false
  }
}
```

### 2. getDistanceToStopLine() 方法

```javascript
getDistanceToStopLine() {
  // ...
  let distance = null
  let targetPosition  // ✅ 在 switch 外宣告共用變數

  switch (this.vehicle.direction) {
    case 'east':
      targetPosition = stopLine.x - targetOffset.EAST  // ✅ 賦值
      distance = targetPosition - vehicleHead.x
      break
    case 'west':
      targetPosition = stopLine.x + targetOffset.WEST  // ✅ 賦值
      distance = vehicleHead.x - targetPosition
      break
    case 'north':
      targetPosition = stopLine.y + targetOffset.NORTH
      distance = vehicleHead.y - targetPosition
      break
    case 'south':
      targetPosition = stopLine.y - targetOffset.SOUTH
      distance = targetPosition - vehicleHead.y
      break
    default:
      return null
  }

  return distance
}
```

## 📊 修正前後對比

### 修正前
```javascript
// ❌ 問題：每個 case 都宣告 const
case 'east':
  const targetX_east = ...
case 'west':
  const targetX_west = ...
case 'north':
  const targetY_north = ...
case 'south':
  const targetY_south = ...
```

### 修正後
```javascript
// ✅ 解決：使用共用變數
let targetPosition

case 'east':
  targetPosition = ...
case 'west':
  targetPosition = ...
case 'north':
  targetPosition = ...
case 'south':
  targetPosition = ...
```

## 💡 最佳實踐

### Switch 語句中的變數宣告

#### ❌ 不建議
```javascript
switch (value) {
  case 'a':
    const x = 1  // 不好：在 case 中宣告
    break
  case 'b':
    const x = 2  // 錯誤：重複宣告
    break
}
```

#### ✅ 建議方式1：外部宣告
```javascript
let x  // 在 switch 外宣告

switch (value) {
  case 'a':
    x = 1  // 賦值
    break
  case 'b':
    x = 2  // 賦值
    break
}
```

#### ✅ 建議方式2：使用區塊
```javascript
switch (value) {
  case 'a': {
    const x = 1  // 用大括號創建新作用域
    break
  }
  case 'b': {
    const x = 2  // 不同作用域，不衝突
    break
  }
}
```

## 🔧 修改的文件

1. ✅ `StopLineController.js` - shouldStopAtLine() 方法
2. ✅ `StopLineController.js` - getDistanceToStopLine() 方法

## 🚀 構建狀態

```
✅ npm run build - 成功
✅ 無語法錯誤
✅ 無重複宣告警告
✅ 代碼更清晰易讀
```

## 📅 版本資訊

- **版本**: v5.3
- **修復日期**: 2025-01-XX
- **修復內容**: 移除 switch 語句中的重複變數宣告
- **向後兼容**: ✅ 是（邏輯完全相同）

## 🎯 總結

**問題**：switch 中使用 const 宣告導致重複宣告

**解決**：改用 let 在外部宣告，switch 內僅賦值

**效果**：
- ✅ 避免作用域衝突
- ✅ 代碼更清晰
- ✅ 符合最佳實踐
- ✅ 邏輯完全不變
