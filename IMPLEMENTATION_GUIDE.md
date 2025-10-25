# 🚗 安全穩健車輛行為系統 - 實施指南

## 概述

本文檔說明如何使用新實施的 6 項核心改進，以建立更安全、更穩健的車輛生命週期行為系統。

---

## ✅ 已實施的 6 項改進

### 1️⃣ **增強碰撞檢測系統**

**文件**: `Vehicle.js`, `CollisionController.js`

#### 功能描述：

- 車輛之間距離 < 5px 時進入碰撞狀態
- 車輛之間距離 < 15px 時進入跟隨狀態
- 使用配置參數 `DISTANCE_CONFIG` 進行檢查

#### 配置位置：

```javascript
// vehicleConfig.js - DISTANCE_CONFIG
MIN_GAP: 25,           // 車輛停車時的間隔距離
SAFE_FOLLOWING: 35,    // 跟車安全距離
EMERGENCY_STOP: 50,    // 緊急停車距離
```

#### 使用方法：

```javascript
// Vehicle.js 中自動調用
const collision = this.smartCollisionCheck(allVehicles)
if (collision && collision.shouldStop) {
  this.stopMovement() // 停止移動
}
```

---

### 2️⃣ **實現安全跟車距離**

**文件**: `CollisionController.js`, `Vehicle.js`

#### 功能描述：

- 自動保持 15 像素的安全距離
- 前車速度同步到後車
- 前車停止時，後車平滑停止

#### 配置位置：

```javascript
// vehicleConfig.js - FOLLOWING_CONFIG
AUTO_FOLLOW_AFTER_COLLISION: {
  MIN_FOLLOW_DISTANCE: 8,      // 最小跟隨距離
  TARGET_FOLLOW_DISTANCE: 25,  // 目標跟隨距離
  MAX_FOLLOW_DISTANCE: 50,     // 最大跟隨距離
}
```

#### 核心邏輯：

```javascript
// CollisionController.js
if (distance < SAFE_FOLLOWING) {
  // 自動調整後車速度以匹配前車
  speedRatio = frontVehicleSpeed * 0.95
}
```

---

### 3️⃣ **車道容量管理**

**文件**: `vehicleConfig.js`, `AutoTrafficGenerator.js`

#### 功能描述：

- 限制每個車道的最大車輛數為 25 輛
- 檢查車道入口最小間距 20 像素
- 防止系統過載

#### 配置位置：

```javascript
// vehicleConfig.js - GENERATION_CONFIG
MAX_VEHICLES_PER_LANE: 25,
LANE_ENTRANCE_MIN_SPACING: 20,
```

#### 使用方法：

```javascript
// AutoTrafficGenerator.js
const maxVehicles = this.getMaxVehiclesForCurrentTime()
if (window.liveVehicles.length >= maxVehicles) {
  return // 暫停生成
}
```

---

### 4️⃣ **動態速度調整**

**文件**: `CollisionController.js`, `Vehicle.js`

#### 功能描述：

- NORMAL 狀態：保持目標速度
- FOLLOWING 狀態：前車速度 × 0.95
- COLLISION 狀態：停止（速度 = 0）
- 速度變化平滑過渡

#### 配置位置：

```javascript
// vehicleConfig.js - ANIMATION_CONFIG
SPEED_CHANGE_DURATION: {
  INSTANT: 0.05,   // 紅燈停車用
  FAST: 0.2,       // 綠燈啟動用
  NORMAL: 0.3,     // 一般速度變化
  SMOOTH: 0.5,     // 平滑過渡
}
```

#### 核心邏輯：

```javascript
// 速度比例計算
const relativeSpeed = mySpeed - frontSpeed
if (relativeSpeed > THRESHOLD) {
  // 需要減速
  speedRatio = Math.max(0.3, distance / stopDistance)
}
```

---

### 5️⃣ **時間段生成間隔**

**文件**: `vehicleConfig.js`, `AutoTrafficGenerator.js`

#### 功能描述：

- 午夜段 (00-06)：3.0 秒生成間隔
- 尖峰時段 (07-09, 17-19)：0.5 秒生成間隔
- 離峰時段 (10-16, 20-23)：1.5 秒生成間隔

#### 配置位置：

```javascript
// vehicleConfig.js - GENERATION_CONFIG
GENERATION_INTERVALS: {
  MIDNIGHT: 3.0,    // 00:00-06:59
  PEAK: 0.5,        // 07:00-09:59, 17:00-19:59
  OFF_PEAK: 1.5,    // 10:00-16:59, 20:00-23:59
}
```

#### 使用方法：

```javascript
// AutoTrafficGenerator.js
const interval = this.getGenerationIntervalForCurrentTime()
// 根據當前時間自動調整生成間隔
```

---

### 6️⃣ **車輛退出檢測**

**文件**: `Vehicle.js`, `vehicleConfig.js`

#### 功能描述：

- 檢測車輛是否超出容器邊界
- 自動移除超出邊界的車輛
- 清理相關資源

#### 配置位置：

```javascript
// vehicleConfig.js - VEHICLE_EXIT_CONFIG
BOUNDARY_MARGIN: 50,      // 邊界檢測範圍（像素）
CHECK_INTERVAL: 100,      // 檢測間隔（毫秒）
```

#### 使用方法：

```javascript
// Vehicle.js - 在動畫循環中調用
if (this.isVehicleExited()) {
  this.remove() // 移除車輛
  onVehicleOutOfBounds(this.id)
}
```

---

## 🔧 配置調整指南

### 調整車流密度

```javascript
// vehicleConfig.js
DISTANCE_CONFIG.MIN_GAP = 20 // 縮小間距以增加密度
```

### 調整尖峰時段生成速度

```javascript
// vehicleConfig.js
GENERATION_INTERVALS.PEAK = 0.3 // 更快生成
```

### 調整安全跟隨距離

```javascript
// vehicleConfig.js
FOLLOWING_CONFIG.AUTO_FOLLOW_AFTER_COLLISION.TARGET_FOLLOW_DISTANCE = 20 // 更近的距離
```

---

## 📊 數據收集流程

所有改進都不會影響現有的數據收集流程：

```
前端模擬 → 正規化 → API 傳送 ✅
   ↓
notifyDataCollector() 仍正常工作
   ↓
後端模型預測
```

---

## 🧪 測試場景

### 場景 1：午夜低流量

- 時間：00:00-06:59
- 生成間隔：3.0 秒
- 預期：車輛稀疏，無碰撞

### 場景 2：尖峰時段高流量

- 時間：07:00-09:59
- 生成間隔：0.5 秒
- 預期：車輛密集，自動保持安全距離

### 場景 3：離峰時段中等流量

- 時間：10:00-16:59
- 生成間隔：1.5 秒
- 預期：車輛適度，正常跟隨行為

---

## ✨ 核心特性摘要

| 特性       | 實現                                  | 狀態 |
| ---------- | ------------------------------------- | ---- |
| 碰撞檢測   | SmartCollisionCheck                   | ✅   |
| 安全距離   | FOLLOWING_CONFIG                      | ✅   |
| 容量管理   | GENERATION_CONFIG                     | ✅   |
| 速度調整   | Predictive Slowdown                   | ✅   |
| 時間段管理 | getGenerationIntervalForCurrentTime() | ✅   |
| 邊界檢測   | isVehicleExited()                     | ✅   |

---

## 📝 下一步

建議的後續改進（可選）：

1. **車道變更** - 允許車輛在不同車道之間移動
2. **加速曲線** - 實現更真實的加速/減速曲線
3. **高級碰撞恢復** - 當碰撞後自動尋找替代路線
4. **天氣影響** - 集成天氣系統以調整行為

---

## 📞 支援

如有問題或需要調整，請檢查：

1. `vehicleConfig.js` - 所有配置參數
2. `CollisionController.js` - 碰撞邏輯
3. `AutoTrafficGenerator.js` - 生成邏輯
4. `Vehicle.js` - 車輛行為
