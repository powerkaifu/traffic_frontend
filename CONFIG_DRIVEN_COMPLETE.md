# 將所有硬編碼值改為使用 vehicleConfig.js 配置

## 🎯 目標
將 Vehicle.js 中所有硬編碼的數值改為使用 vehicleConfig.js 的設定值，方便統一調整車輛行為參數。

## ✅ 完成項目

### 1. 新增配置項目

#### vehicleConfig.js - FOLLOWING_CONFIG 擴展

**新增綠燈跟車速度配置**：
```javascript
GREEN_LIGHT_FOLLOWING: {
  LANE1: {
    VERY_CLOSE: 0.15,  // 1號車道（左轉）- 更謹慎
    CLOSE: 0.4,
    NORMAL: 0.7,
    FAR: 1.0,
  },
  OTHER_LANES: {
    VERY_CLOSE: 0.2,   // 其他車道（直行）- 較快
    CLOSE: 0.5,
    NORMAL: 0.8,
    FAR: 1.0,
  },
  DISTANCE_THRESHOLDS: {
    VERY_CLOSE: 0.4,
    CLOSE: 0.7,
    NORMAL: 1.0,
  },
}
```

**新增恢復移動速度配置**：
```javascript
RESUME_SPEED: {
  QUEUE_ZONE: {
    VERY_CLOSE: 0,     // 排隊區域速度
    CLOSE: 0.15,
    NORMAL: 0.3,
    FAR: 0.5,
  },
  NON_QUEUE_ZONE: {
    VERY_CLOSE: 0,     // 非排隊區域速度
    CLOSE: 0.2,
    NORMAL: 0.5,
    FAR: 0.8,
  },
  DISTANCE_THRESHOLDS: {
    VERY_CLOSE: 0.3,
    CLOSE: 0.6,
    NORMAL: 0.8,
    FAR: 1.0,
  },
}
```

#### vehicleConfig.js - TRAFFIC_LIGHT_CONFIG 擴展

**新增等待燈號變化配置**：
```javascript
WAITING_FOR_LIGHT: {
  SLOW_SPEED: 0.6,                  // 等待燈號時的減速速度
  STOP_DISTANCE_THRESHOLD: 5,       // 接近停止線的距離閾值
}
```

### 2. Vehicle.js 替換硬編碼值

#### resumeMovement 方法（第785-807行）

**修改前**：
```javascript
if (distance <= requiredGap * 0.3) {
  targetSpeed = 0
} else if (distance <= requiredGap * 0.6) {
  targetSpeed = 0.2
} else if (distance <= requiredGap * 0.8) {
  targetSpeed = 0.5
} else {
  targetSpeed = 0.8
}
```

**修改後**：
```javascript
const thresholds = FOLLOWING_CONFIG.RESUME_SPEED.DISTANCE_THRESHOLDS
const speeds = isInQueueZone 
  ? FOLLOWING_CONFIG.RESUME_SPEED.QUEUE_ZONE
  : FOLLOWING_CONFIG.RESUME_SPEED.NON_QUEUE_ZONE

if (distance <= requiredGap * thresholds.VERY_CLOSE) {
  targetSpeed = speeds.VERY_CLOSE
} else if (distance <= requiredGap * thresholds.CLOSE) {
  targetSpeed = speeds.CLOSE
} else if (distance <= requiredGap * thresholds.NORMAL) {
  targetSpeed = speeds.NORMAL
} else {
  targetSpeed = speeds.FAR
}
```

#### moveAlongPath - 綠燈跟車邏輯（第1049-1075行）

**修改前**：
```javascript
const isLane1 = this.laneNumber === 1

if (distance <= requiredGap * 0.4) {
  targetSpeed = isLane1 ? 0.15 : 0.2
} else if (distance <= requiredGap * 0.7) {
  targetSpeed = isLane1 ? 0.4 : 0.5
} else if (distance <= requiredGap * 1.0) {
  targetSpeed = isLane1 ? 0.7 : 0.8
} else {
  targetSpeed = 1.0
}
```

**修改後**：
```javascript
const isLane1 = this.laneNumber === 1
const thresholds = FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.DISTANCE_THRESHOLDS
const speeds = isLane1 
  ? FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.LANE1 
  : FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING.OTHER_LANES

if (distance <= requiredGap * thresholds.VERY_CLOSE) {
  targetSpeed = speeds.VERY_CLOSE
} else if (distance <= requiredGap * thresholds.CLOSE) {
  targetSpeed = speeds.CLOSE
} else if (distance <= requiredGap * thresholds.NORMAL) {
  targetSpeed = speeds.NORMAL
} else {
  targetSpeed = speeds.FAR
}
```

#### moveToWithTrafficControl - 碰撞減速（第1380-1403行）

**修改前**：
```javascript
if (distance <= requiredGap * 0.3) {
  targetSpeed = 0
} else if (distance <= requiredGap * 0.6) {
  targetSpeed = 0.2
} else if (distance <= requiredGap * 0.8) {
  targetSpeed = 0.5
} else {
  targetSpeed = 0.8
}
```

**修改後**：
```javascript
const thresholds = FOLLOWING_CONFIG.RESUME_SPEED.DISTANCE_THRESHOLDS
const speeds = FOLLOWING_CONFIG.RESUME_SPEED.NON_QUEUE_ZONE

if (distance <= requiredGap * thresholds.VERY_CLOSE) {
  targetSpeed = speeds.VERY_CLOSE
} else if (distance <= requiredGap * thresholds.CLOSE) {
  targetSpeed = speeds.CLOSE
} else if (distance <= requiredGap * thresholds.NORMAL) {
  targetSpeed = speeds.NORMAL
} else {
  targetSpeed = speeds.FAR
}
```

#### moveToWithTrafficControl - 等待燈號（第1428-1455行）

**修改前**：
```javascript
// 減速到60%
timeScale: 0.6

// 接近停止線判斷
if (distanceToStopLine <= 5) { ... }
```

**修改後**：
```javascript
// 使用配置
timeScale: TRAFFIC_LIGHT_CONFIG.WAITING_FOR_LIGHT.SLOW_SPEED

// 接近停止線判斷（使用配置）
if (distanceToStopLine <= TRAFFIC_LIGHT_CONFIG.WAITING_FOR_LIGHT.STOP_DISTANCE_THRESHOLD) { ... }
```

## 📊 配置參數總覽

### 基礎間距（DISTANCE_CONFIG）
| 參數 | 值 | 說明 |
|-----|-----|------|
| MIN_GAP | 40px | 最小排隊間距 |
| SAFE_FOLLOWING | 50px | 安全跟車距離 |
| REQUIRED_SAFETY | 35px | 基礎安全距離 |

### 綠燈跟車速度（FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING）
| 距離條件 | 1號車道 | 其他車道 |
|---------|---------|----------|
| ≤ 0.4 × gap | 0.15 | 0.2 |
| ≤ 0.7 × gap | 0.4 | 0.5 |
| ≤ 1.0 × gap | 0.7 | 0.8 |
| > 1.0 × gap | 1.0 | 1.0 |

### 恢復移動速度（FOLLOWING_CONFIG.RESUME_SPEED）

**排隊區域**：
| 距離條件 | 速度 |
|---------|------|
| ≤ 0.3 × gap | 0 |
| ≤ 0.6 × gap | 0.15 |
| ≤ 0.8 × gap | 0.3 |
| > 0.8 × gap | 0.5 |

**非排隊區域**：
| 距離條件 | 速度 |
|---------|------|
| ≤ 0.3 × gap | 0 |
| ≤ 0.6 × gap | 0.2 |
| ≤ 1.0 × gap | 0.5 |
| > 1.0 × gap | 0.8 |

### 交通燈等待（TRAFFIC_LIGHT_CONFIG.WAITING_FOR_LIGHT）
| 參數 | 值 | 說明 |
|-----|-----|------|
| SLOW_SPEED | 0.6 | 等待燈號時減速到60% |
| STOP_DISTANCE_THRESHOLD | 5px | 5px內停止 |

## 🎛️ 如何調整參數

### 方法1：調整排隊間距
**位置**：`vehicleConfig.js` → `DISTANCE_CONFIG.BASE_DISTANCES`
```javascript
MIN_GAP: 40,  // 改這個值調整排隊間距
```

### 方法2：調整綠燈跟車速度
**位置**：`vehicleConfig.js` → `FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING`
```javascript
LANE1: {
  VERY_CLOSE: 0.15,  // 改這些值調整1號車道跟車速度
  CLOSE: 0.4,
  NORMAL: 0.7,
  FAR: 1.0,
}
```

### 方法3：調整排隊區域速度
**位置**：`vehicleConfig.js` → `FOLLOWING_CONFIG.RESUME_SPEED`
```javascript
QUEUE_ZONE: {
  VERY_CLOSE: 0,    // 改這些值調整排隊速度
  CLOSE: 0.15,
  NORMAL: 0.3,
  FAR: 0.5,
}
```

### 方法4：調整距離閾值
**位置**：`vehicleConfig.js` → `FOLLOWING_CONFIG.RESUME_SPEED.DISTANCE_THRESHOLDS`
```javascript
DISTANCE_THRESHOLDS: {
  VERY_CLOSE: 0.3,  // 改這些比例調整距離判斷
  CLOSE: 0.6,
  NORMAL: 0.8,
  FAR: 1.0,
}
```

## 📈 優點總結

### ✅ 集中管理
- 所有參數都在 `vehicleConfig.js`
- 不用在代碼中到處找數值

### ✅ 易於調整
- 修改一個配置文件即可
- 立即影響所有使用該參數的地方

### ✅ 參數清晰
- 每個參數都有清楚的命名和註釋
- 知道每個數值的用途

### ✅ 維護性高
- 新增參數統一在配置文件
- 避免硬編碼散落各處

## 🔧 修改的文件

1. ✅ `src/classes/config/vehicleConfig.js`
   - FOLLOWING_CONFIG 新增跟車速度配置
   - TRAFFIC_LIGHT_CONFIG 新增等待燈號配置

2. ✅ `src/classes/Vehicle.js`
   - resumeMovement - 使用配置
   - moveAlongPath 綠燈跟車 - 使用配置
   - moveToWithTrafficControl 碰撞 - 使用配置
   - moveToWithTrafficControl 燈號 - 使用配置

## 🚀 構建狀態

```
✅ npm run build - 成功
✅ 無語法錯誤
✅ 所有硬編碼值已替換為配置
```

## 💡 快速調整指南

### 想要車輛間距更大？
```javascript
// vehicleConfig.js
MIN_GAP: 50,  // 從40改為50
```

### 想要跟車更快？
```javascript
// vehicleConfig.js
GREEN_LIGHT_FOLLOWING.OTHER_LANES: {
  VERY_CLOSE: 0.3,  // 從0.2改為0.3
  CLOSE: 0.6,       // 從0.5改為0.6
  ...
}
```

### 想要排隊更緩慢？
```javascript
// vehicleConfig.js
RESUME_SPEED.QUEUE_ZONE: {
  CLOSE: 0.1,   // 從0.15改為0.1
  NORMAL: 0.2,  // 從0.3改為0.2
  ...
}
```

## 📅 版本資訊

- **版本**: v4.0
- **修改日期**: 2025-01-XX
- **重大改進**: 所有硬編碼值改為配置驅動
- **向後兼容**: ✅ 是

現在所有參數都統一在 `vehicleConfig.js` 管理，調整車輛行為變得非常簡單！
