# 停止線配置統一管理文檔

## 📁 專案結構概覽

```
src/classes/
├── config/
│   ├── stopLineConfig.js          # 停止線配置文件 ⭐
│   ├── trafficConfig.js           # 交通配置（包含停止線偏移）
│   ├── vehicleConfig.js           # 車輛行為配置
│   ├── trafficScenarioConfig.js   # 交通場景配置
│   └── vdBasedTrafficConfig.js    # VD數據配置
├── vehicle_utils/
│   ├── StopLineController.js      # 停止線控制器 ⭐
│   └── CollisionController.js     # 碰撞控制器
├── Vehicle.js                      # 車輛主類別 ⭐
├── TrafficLightController.js      # 交通燈控制器
├── TrafficDataCollector.js        # 數據收集器
├── TrafficLight.js                # 交通燈
└── AutoTrafficGenerator.js        # 自動生成器
```

## 🎯 停止線配置架構

### 1. stopLineConfig.js - 主配置文件

**位置**: `src/classes/config/stopLineConfig.js`

```javascript
export const STOP_LINE_CONFIG = {
  // 檢測敏感度配置
  DETECTION: {
    SENSITIVITY: 10,         // 停止線檢測靈敏度（提前10px觸發）
    ADJUSTMENT_THRESHOLD: 0.5, // 位置微調閾值
    PROXIMITY_RANGE: 50,     // 停止線附近區域範圍（50px）
  },

  // 停車目標位置配置
  TARGET_POSITION: {
    EAST: 0,    // 東向停車位置偏移
    WEST: 0,    // 西向停車位置偏移
    NORTH: 0,   // 北向停車位置偏移
    SOUTH: 0,   // 南向停車位置偏移
  },

  // 交通燈邏輯相關距離
  TRAFFIC_LIGHT: {
    QUEUE_DISTANCE: 10,      // 排隊判斷距離
    APPROACH_DISTANCE: 5,    // 接近停車判斷距離
  },

  // 車輛配置相關
  VEHICLE_CONFIG: {
    STOP_LINE_BUFFER: 5,     // 停止線緩衝距離
  },

  // 停止線狀態定義
  STATES: {
    APPROACHING: 'approaching',
    AT_STOP_LINE: 'at_stop_line',
    PASSED: 'passed',
    WAITING: 'waiting',
  },
}
```

### 2. StopLineController.js - 停止線控制器

**功能**：封裝所有停止線相關邏輯
**位置**: `src/classes/vehicle_utils/StopLineController.js`

**主要方法**：
- `getStopLinePosition()` - 獲取停止線位置
- `getDistanceToStopLine()` - 計算到停止線的距離
- `shouldStopAtLine()` - 判斷是否應該停車
- `alignToStopLine()` - 對齊到停止線
- `checkTrafficLightLogic()` - 檢查交通燈邏輯

### 3. Vehicle.js - 車輛類別

**使用方式**：通過 StopLineController 訪問停止線功能

## 📊 配置參數說明

### DETECTION - 檢測敏感度

| 參數 | 默認值 | 用途 | 建議範圍 |
|-----|--------|------|---------|
| SENSITIVITY | 10px | 提前檢測距離 | 5-20px |
| ADJUSTMENT_THRESHOLD | 0.5 | 微調閾值 | 0.3-1.0 |
| PROXIMITY_RANGE | 50px | 附近區域範圍 | 30-80px |

**用途說明**：
- `SENSITIVITY`：車輛在停止線前多遠開始檢測（越大越早檢測）
- `ADJUSTMENT_THRESHOLD`：位置微調的最小偏差值
- `PROXIMITY_RANGE`：判斷車輛是否在停止線附近（用於區域性邏輯）

### TARGET_POSITION - 停車位置

| 參數 | 默認值 | 說明 |
|-----|--------|------|
| EAST | 0 | 東向車頭對齊停止線的偏移 |
| WEST | 0 | 西向車頭對齊停止線的偏移 |
| NORTH | 0 | 北向車頭對齊停止線的偏移 |
| SOUTH | 0 | 南向車頭對齊停止線的偏移 |

**調整說明**：
- 正值：車輛停在停止線前
- 負值：車輛停在停止線後
- 0：車頭剛好對齊停止線

### TRAFFIC_LIGHT - 交通燈距離

| 參數 | 默認值 | 用途 |
|-----|--------|------|
| QUEUE_DISTANCE | 10px | 排隊判斷距離 |
| APPROACH_DISTANCE | 5px | 接近停車判斷距離 |

**用途說明**：
- `QUEUE_DISTANCE`：在停止線多少px內開始排隊邏輯
- `APPROACH_DISTANCE`：在停止線多少px內準備停車

### VEHICLE_CONFIG - 車輛配置

| 參數 | 默認值 | 用途 |
|-----|--------|------|
| STOP_LINE_BUFFER | 5px | 停止線緩衝距離 |

**用途**：在 `getVehicleConfig()` 方法中使用，作為停止線緩衝

## 🔧 Vehicle.js 中的使用

### 已統一為配置的位置

#### 1. isNearStopLine() - 第816-823行

**修改前**：
```javascript
const stopLineProximity = 50  // 硬編碼
```

**修改後**：
```javascript
const stopLineProximity = STOP_LINE_CONFIG.DETECTION.PROXIMITY_RANGE  // 使用配置
```

#### 2. getVehicleConfig() - 第881行

**修改前**：
```javascript
stopLineBuffer: 5,  // 硬編碼
```

**修改後**：
```javascript
stopLineBuffer: STOP_LINE_CONFIG.VEHICLE_CONFIG.STOP_LINE_BUFFER,  // 使用配置
```

#### 3. stop_for_left_turn_wait - 第1426行

**修改前**：
```javascript
if (distanceToStopLine <= 5) {  // 硬編碼
```

**修改後**：
```javascript
if (distanceToStopLine <= STOP_LINE_CONFIG.TRAFFIC_LIGHT.APPROACH_DISTANCE) {  // 使用配置
```

#### 4. stop_for_straight_wait - 第1444行

**修改前**：
```javascript
if (distanceToStopLine <= TRAFFIC_LIGHT_CONFIG.WAITING_FOR_LIGHT.STOP_DISTANCE_THRESHOLD) {  // 已使用配置
```

**修改後**：
保持不變，已經在使用 vehicleConfig.js 的配置

## ⚙️ 如何調整停止線設定

### 方法1：調整檢測靈敏度

**位置**：`stopLineConfig.js` → `DETECTION`

```javascript
DETECTION: {
  SENSITIVITY: 10,        // 改這個值調整提前檢測距離
  PROXIMITY_RANGE: 50,    // 改這個值調整附近區域範圍
}
```

**效果**：
- `SENSITIVITY` 增加 → 車輛更早檢測到停止線
- `PROXIMITY_RANGE` 增加 → 停止線影響區域更大

### 方法2：調整停車位置

**位置**：`stopLineConfig.js` → `TARGET_POSITION`

```javascript
TARGET_POSITION: {
  EAST: 0,   // 改成正值讓車輛停在停止線前
  WEST: 0,
  NORTH: 0,
  SOUTH: 0,
}
```

**範例**：
```javascript
TARGET_POSITION: {
  EAST: 5,   // 東向車輛停在停止線前5px
  WEST: 5,   // 西向車輛停在停止線前5px
  ...
}
```

### 方法3：調整交通燈判斷距離

**位置**：`stopLineConfig.js` → `TRAFFIC_LIGHT`

```javascript
TRAFFIC_LIGHT: {
  QUEUE_DISTANCE: 10,      // 改這個值調整排隊區域
  APPROACH_DISTANCE: 5,    // 改這個值調整停車判斷
}
```

**效果**：
- `QUEUE_DISTANCE` 增加 → 提前進入排隊狀態
- `APPROACH_DISTANCE` 增加 → 提前準備停車

### 方法4：調整停止線緩衝

**位置**：`stopLineConfig.js` → `VEHICLE_CONFIG`

```javascript
VEHICLE_CONFIG: {
  STOP_LINE_BUFFER: 5,    // 改這個值調整緩衝距離
}
```

## 📈 配置層級關係

```
stopLineConfig.js (主配置)
    ↓
StopLineController.js (控制器)
    ↓
Vehicle.js (使用)
```

**優點**：
- ✅ 集中管理：所有停止線參數在一個文件
- ✅ 易於維護：修改配置即時生效
- ✅ 邏輯清晰：配置 → 控制器 → 使用
- ✅ 避免重複：不用在多處修改

## 🧪 測試建議

### 1. 檢測靈敏度測試
- 調整 `SENSITIVITY` 從 5 到 20
- 觀察車輛何時開始檢測停止線
- 確認不會太早或太晚

### 2. 停車位置測試
- 調整 `TARGET_POSITION` 從 -5 到 5
- 觀察車輛停車位置
- 確認車頭對齊停止線

### 3. 附近區域測試
- 調整 `PROXIMITY_RANGE` 從 30 到 80
- 觀察 `isNearStopLine()` 的觸發範圍
- 確認區域性邏輯正確

### 4. 交通燈邏輯測試
- 調整 `QUEUE_DISTANCE` 和 `APPROACH_DISTANCE`
- 測試紅燈、綠燈、左轉燈切換
- 確認車輛在正確距離停車

## 💡 常見調整場景

### 場景1：車輛停得太前/太後

**調整**：
```javascript
TARGET_POSITION: {
  EAST: 3,   // 停在停止線前3px
  WEST: 3,
  NORTH: 3,
  SOUTH: 3,
}
```

### 場景2：車輛檢測停止線太晚

**調整**：
```javascript
DETECTION: {
  SENSITIVITY: 15,  // 從10增加到15，提前檢測
}
```

### 場景3：排隊區域太小

**調整**：
```javascript
DETECTION: {
  PROXIMITY_RANGE: 80,  // 從50增加到80，擴大區域
}
```

### 場景4：紅燈停車太早

**調整**：
```javascript
TRAFFIC_LIGHT: {
  APPROACH_DISTANCE: 3,  // 從5減少到3，靠近才停
}
```

## 🔧 修改的文件

1. ✅ `stopLineConfig.js` - 新增配置項目
2. ✅ `Vehicle.js` - 導入並使用配置
3. ✅ `StopLineController.js` - 已經在使用配置

## 🚀 構建狀態

```
✅ npm run build - 成功
✅ 無語法錯誤
✅ 停止線配置已統一管理
```

## 📅 版本資訊

- **版本**: v5.0
- **修改日期**: 2025-01-XX
- **改進項目**: 停止線配置統一管理
- **向後兼容**: ✅ 是

## 📚 相關文檔

- **stopLineConfig.js** - 停止線配置定義
- **StopLineController.js** - 停止線控制器實現
- **Vehicle.js** - 車輛類別使用方式

現在所有停止線相關的參數都統一在 `stopLineConfig.js` 管理，您可以輕鬆地調整停止線行為！
