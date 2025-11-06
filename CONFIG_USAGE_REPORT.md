# Vehicle.js 配置使用情況分析報告

## 📊 執行摘要

在 `Vehicle.js` 中進行了配置使用情況的完整掃描。以下是結論：

| 配置名稱                 | 導入狀態  | 實際使用      | 狀態                    | 備註                                                            |
| ------------------------ | --------- | ------------- | ----------------------- | --------------------------------------------------------------- |
| **stopLineConfig**       | ✅ 已導入 | ❌ 未直接使用 | 可能冗餘                | 只在導入語句中                                                  |
| **VehicleConfig**        | ✅ 已導入 | ⚠️ 部分使用   | 通過 getVehicleConfig() | 用於車輛尺寸和圖片                                              |
| **TRAFFIC_LIGHT_CONFIG** | ✅ 已導入 | ❌ 未使用     | 冗餘                    | 只在導入語句中                                                  |
| **COLLISION_CONFIG**     | ✅ 已導入 | ❌ 未使用     | 冗餘                    | 只在導入語句中，實際由 CollisionController 使用                 |
| **GENERATION_CONFIG**    | ✅ 已導入 | ❌ 未使用     | 冗餘                    | 只在導入語句中                                                  |
| **STOP_LINE_CONFIG**     | ✅ 已導入 | ✅ 使用       | 正在使用                | 第 1179 行使用 STOP_LINE_CONFIG.VEHICLE_CONFIG.STOP_LINE_BUFFER |
| **其他配置**             | ✅ 已導入 | ✅ 使用       | 正在使用                | ANIMATION_CONFIG, DISTANCE_CONFIG, FOLLOWING_CONFIG 等已被使用  |

---

## 📍 詳細使用位置

### 1. ✅ **STOP_LINE_CONFIG** - 正在使用

**導入位置**：第 23 行

```javascript
import { STOP_LINE_CONFIG } from './config/stopLineConfig.js'
```

**使用位置**：第 1179 行 (`resumeMovement` 方法)

```javascript
stopLineBuffer: STOP_LINE_CONFIG.VEHICLE_CONFIG.STOP_LINE_BUFFER, // 使用配置的停止線緩衝距離
```

**結論**：✅ 實際被使用

---

### 2. ✅ **VehicleConfig** - 正在使用

**導入位置**：第 10-21 行

```javascript
import VehicleConfig, {
  ANIMATION_CONFIG,
  TRAFFIC_LIGHT_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  COLLISION_CONFIG,
  GENERATION_CONFIG,
  VEHICLE_EXIT_CONFIG,
  VEHICLE_RECYCLING_CONFIG,
  LANE_CHANGING_CONFIG,
  YELLOW_LIGHT_DECISION_CONFIG,
  TURN_SPEED_CONFIG,
} from './config/vehicleConfig.js'
```

**使用位置**：

- 第 593 行：`const vehicleConfig = this.getVehicleConfig()`
- 第 596-605 行：用於創建車輛 DOM 元素
- 第 1039-1049 行：用於獲取車輛尺寸

**方法定義**：第 643-667 行

```javascript
getVehicleConfig() {
  // Factory Pattern: 基於車輛類型和方向創建配置
  const vehicleConfigs = {
    large: { east: {...}, west: {...}, north: {...}, south: {...} },
    small: { east: {...}, west: {...}, north: {...}, south: {...} },
    motor: { east: {...}, west: {...}, north: {...}, south: {...} },
  }
  return vehicleConfigs[this.vehicleType]?.[this.direction] || vehicleConfigs.large.east
}
```

**結論**：✅ 實際被使用

---

### 3. ❌ **stopLineConfig** (來自 trafficConfig) - 未使用

**導入位置**：第 7 行

```javascript
import { speedConfig, stopLineConfig } from './config/trafficConfig.js'
```

**使用情況**：❌ 在 Vehicle.js 中沒有找到使用

**結論**：可能冗餘，應考慮移除

---

### 4. ❌ **TRAFFIC_LIGHT_CONFIG** - 未直接使用

**導入位置**：第 12 行（作為命名導入）

**使用情況**：❌ 在 Vehicle.js 中沒有找到使用 `TRAFFIC_LIGHT_CONFIG.xxx`

**結論**：❌ 冗餘導入

---

### 5. ❌ **COLLISION_CONFIG** - 未在 Vehicle.js 中使用

**導入位置**：第 15 行（作為命名導入）

**使用情況**：❌ 在 Vehicle.js 中沒有找到使用 `COLLISION_CONFIG.xxx`

**重要說明**：

- `COLLISION_CONFIG` 實際由 `CollisionController.js` 使用
- Vehicle.js 通過調用 `this.collisionController.checkSimpleCollision()` 等方法間接使用
- 不是直接在 Vehicle.js 中使用

**結論**：❌ 直接冗餘（但在 CollisionController 中使用）

---

### 6. ❌ **GENERATION_CONFIG** - 未使用

**導入位置**：第 16 行（作為命名導入）

**使用情況**：❌ 在 Vehicle.js 中沒有找到使用

**結論**：❌ 冗餘導入

---

### 7. ✅ **其他配置** - 正在使用

以下配置在 Vehicle.js 中實際被使用：

| 配置                         | 使用次數 | 範例使用位置         |
| ---------------------------- | -------- | -------------------- |
| ANIMATION_CONFIG             | 多次     | 速度變化、轉向動畫等 |
| DISTANCE_CONFIG              | 多次     | 停止線距離計算       |
| FOLLOWING_CONFIG             | 多次     | 跟車邏輯             |
| VEHICLE_EXIT_CONFIG          | 多次     | 邊界檢測             |
| VEHICLE_RECYCLING_CONFIG     | 多次     | 車輛回收             |
| LANE_CHANGING_CONFIG         | 多次     | 車道變更             |
| YELLOW_LIGHT_DECISION_CONFIG | 多次     | 黃燈決策             |
| TURN_SPEED_CONFIG            | 多次     | 轉向速度控制         |

**結論**：✅ 正在使用

---

## 🗑️ 建議清理

### 可以移除的冗餘導入

根據分析，以下導入可以安全地從 Vehicle.js 中移除：

1. **❌ stopLineConfig** - 第 7 行

   ```javascript
   // ❌ 未使用，可移除
   import { speedConfig, stopLineConfig } from './config/trafficConfig.js'
   ```

2. **❌ TRAFFIC_LIGHT_CONFIG** - 第 12 行

   ```javascript
   // ❌ 未使用，可移除
   TRAFFIC_LIGHT_CONFIG,
   ```

3. **❌ COLLISION_CONFIG** - 第 15 行

   ```javascript
   // ❌ 直接冗餘（由 CollisionController 使用），可移除
   COLLISION_CONFIG,
   ```

4. **❌ GENERATION_CONFIG** - 第 16 行
   ```javascript
   // ❌ 未使用，可移除
   GENERATION_CONFIG,
   ```

### 應保留的導入

所有其他配置都應保留，因為它們在 Vehicle.js 中被實際使用。

---

## 📝 代碼清理建議

**當前狀態**：

```javascript
// ❌ 第 7 行 - 移除 stopLineConfig
import { speedConfig, stopLineConfig } from './config/trafficConfig.js'

// ✅ 第 10-21 行 - 保留，但移除冗餘配置
import VehicleConfig, {
  ANIMATION_CONFIG,
  TRAFFIC_LIGHT_CONFIG,  // ❌ 移除
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  COLLISION_CONFIG,      // ❌ 移除
  GENERATION_CONFIG,     // ❌ 移除
  VEHICLE_EXIT_CONFIG,
  // ... 其他配置保留
}
```

**優化後**：

```javascript
import { speedConfig } from './config/trafficConfig.js' // ✅ 只保留實際使用的

import VehicleConfig, {
  ANIMATION_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  VEHICLE_EXIT_CONFIG,
  VEHICLE_RECYCLING_CONFIG,
  LANE_CHANGING_CONFIG,
  YELLOW_LIGHT_DECISION_CONFIG,
  TURN_SPEED_CONFIG,
} from './config/vehicleConfig.js'

import { STOP_LINE_CONFIG } from './config/stopLineConfig.js'
```

---

## 💡 總結

### 冗餘配置清單

| 配置                 | 來源             | 現狀        | 建議    |
| -------------------- | ---------------- | ----------- | ------- |
| stopLineConfig       | trafficConfig.js | ❌ 未使用   | 🗑️ 移除 |
| TRAFFIC_LIGHT_CONFIG | vehicleConfig.js | ❌ 未使用   | 🗑️ 移除 |
| COLLISION_CONFIG     | vehicleConfig.js | ❌ 直接冗餘 | 🗑️ 移除 |
| GENERATION_CONFIG    | vehicleConfig.js | ❌ 未使用   | 🗑️ 移除 |

### 正在使用的配置

- ✅ VehicleConfig（通過 getVehicleConfig）
- ✅ STOP_LINE_CONFIG
- ✅ ANIMATION_CONFIG, DISTANCE_CONFIG, FOLLOWING_CONFIG 等其他配置

---

## 🎯 下一步行動

### 可選項目 1：進行代碼清理

如果想要清理冗餘導入，請執行：

- 移除第 7 行的 `stopLineConfig`
- 從第 12-16 行移除 `TRAFFIC_LIGHT_CONFIG`, `COLLISION_CONFIG`, `GENERATION_CONFIG`
- 可預期減少 ~20 行冗餘代碼

### 可選項目 2：保持現狀

保留冗餘導入以便未來使用，但建議添加注釋說明為何保留。

---

## 📌 報告生成日期

2025年11月7日
