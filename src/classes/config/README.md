# 🚗 Vehicle.js 配置系統使用指南

## 📖 總覽

我已經為你創建了一套完整的配置管理系統，將 Vehicle.js 中重複使用的屬性整理成可配置的參數，並加上詳細的中文註解。

## 📁 檔案結構

```
src/classes/config/
├── vehicleConfig.js              # 車輛行為配置（動畫、碰撞檢測等）
├── trafficConfig.js              # 交通系統配置（速度、交通燈等）
├── index.js                      # 統一匯入點
├── vehicle_config_integration_example.js  # 整合範例
└── README.md                     # 本說明檔案
```

## 🎛️ 主要配置分類

### 1. 🎬 動畫配置 (`ANIMATION_CONFIG`)

- **TIME_MULTIPLIER**: 控制整體動畫速度
- **SPEED_CHANGE_DURATION**: 各種速度變化的動畫時間
- **COOLDOWN_TIMES**: 防抖和冷卻時間設定
- **EASING**: 動畫緩動效果（已設為 `none` 避免抖動）

### 2. 🚦 交通燈配置 (`TRAFFIC_LIGHT_CONFIG`)

- **YELLOW_LIGHT**: 黃燈響應行為設定
- **RED_LIGHT**: 紅燈減速和停車設定

### 3. 📏 距離配置 (`DISTANCE_CONFIG`)

- **BASE_DISTANCES**: 基礎安全距離設定
- **DISTANCE_MULTIPLIERS**: 不同情況下的距離調整倍數
- **SPECIAL_DISTANCES**: 特殊場景的距離設定

### 4. 🚗 跟車配置 (`FOLLOWING_CONFIG`)

- **SPEED_RATIOS**: 跟車時的速度計算比例
- **CHECK_INTERVAL**: 跟車狀態檢查間隔
- **PUSH_FORCE**: 推力設定

### 5. 💥 碰撞配置 (`COLLISION_CONFIG`)

- **DETECTION_DISTANCES**: 碰撞檢測距離設定
- **THREAT_LEVELS**: 威脅等級定義

### 6. 🚗 車輛速度配置 (`speedConfig`)

- **large/small/motor**: 各類車輛的速度範圍設定

## 🔧 快速調整指南

### 讓車輛反應更快

```javascript
// 在 vehicleConfig.js 中調整
ANIMATION_CONFIG: {
  TIME_MULTIPLIER: 0.8,  // 從 1 改成 0.8
  SPEED_CHANGE_DURATION: {
    INSTANT: 0.02,       // 從 0.05 改成 0.02
    FAST: 0.1,          // 從 0.2 改成 0.1
  },
  COOLDOWN_TIMES: {
    GLOBAL_ANTI_SHAKE: 50,    // 從 100 改成 50
    POSITION_ADJUST: 250,     // 從 500 改成 250
  }
}
```

### 增加行車安全性

```javascript
// 在 vehicleConfig.js 中調整
DISTANCE_CONFIG: {
  BASE_DISTANCES: {
    MIN_GAP: 35,              // 從 25 改成 35
    SAFE_FOLLOWING: 50,       // 從 35 改成 50
    EMERGENCY_STOP: 70,       // 從 50 改成 70
  },
  DISTANCE_MULTIPLIERS: {
    NORMAL_MIN_GAP: 1.2,      // 從 0.9 改成 1.2
    NORMAL_SAFE: 1.3,         // 從 0.95 改成 1.3
  }
}
```

### 調整紅綠燈響應

```javascript
// 在 vehicleConfig.js 中調整
TRAFFIC_LIGHT_CONFIG: {
  YELLOW_LIGHT: {
    ACCELERATE_DISTANCE: 120, // 從 100 改成 120
    STOP_DISTANCE: 50,        // 從 40 改成 50
  },
  RED_LIGHT: {
    SLOW_DOWN_DISTANCE: 80,   // 從 60 改成 80
  }
}
```

### 修改車輛速度

```javascript
// 在 trafficConfig.js 中調整
export const speedConfig = {
  large: { min: 20, max: 30 }, // 降低大型車速度
  small: { min: 35, max: 55 }, // 提高小型車速度
  motor: { min: 30, max: 65 }, // 增加機車速度範圍
}
```

## 💻 在程式碼中使用

### 基本匯入方式

```javascript
// 匯入特定配置
import { ANIMATION_CONFIG, speedConfig } from './config'

// 匯入多個配置
import { DISTANCE_CONFIG, FOLLOWING_CONFIG, TRAFFIC_LIGHT_CONFIG } from './config'

// 匯入所有配置
import allConfig from './config'
```

### 在 Vehicle.js 中使用

```javascript
// 1. 替換靜態屬性
static timeMultiplier = ANIMATION_CONFIG.TIME_MULTIPLIER

// 2. 替換建構子中的值
this.positionAdjustCooldown = ANIMATION_CONFIG.COOLDOWN_TIMES.POSITION_ADJUST

// 3. 在方法中使用配置
adjustSpeedForTrafficLight() {
  const stopDistance = TRAFFIC_LIGHT_CONFIG.RED_LIGHT.SLOW_DOWN_DISTANCE
  const duration = ANIMATION_CONFIG.SPEED_CHANGE_DURATION.INSTANT

  if (this.getDistanceToStopLine() < stopDistance) {
    gsap.to(this, {
      currentSpeed: 0,
      duration: duration,
      ease: ANIMATION_CONFIG.EASING.NONE
    })
  }
}
```

## 🚦 實際整合步驟

1. **備份原始檔案**

   ```bash
   cp src/classes/Vehicle.js src/classes/Vehicle.js.backup
   ```

2. **在 Vehicle.js 開頭加入匯入**

   ```javascript
   import { ANIMATION_CONFIG, DISTANCE_CONFIG, FOLLOWING_CONFIG, TRAFFIC_LIGHT_CONFIG, speedConfig } from './config'
   ```

3. **逐步替換硬編碼值**
   - 先從靜態屬性開始
   - 再處理建構子中的值
   - 最後處理方法中的硬編碼數字

4. **測試確認**
   - 每替換一個區域就測試一次
   - 確保車輛行為正常

## 🎯 常見調整場景

### 場景 1：車輛跟得太緊

**問題**：車輛之間距離太小，容易發生碰撞
**解決方案**：

```javascript
DISTANCE_CONFIG: {
  BASE_DISTANCES: {
    MIN_GAP: 30,         // 增加最小間隙
    SAFE_FOLLOWING: 45,  // 增加安全跟車距離
  }
}
```

### 場景 2：紅燈停車太突然

**問題**：車輛在紅燈前停車太急促
**解決方案**：

```javascript
TRAFFIC_LIGHT_CONFIG: {
  RED_LIGHT: {
    SLOW_DOWN_DISTANCE: 80,  // 增加減速開始距離
  }
}
ANIMATION_CONFIG: {
  SPEED_CHANGE_DURATION: {
    NORMAL: 0.8,  // 增加減速動畫時間
  }
}
```

### 場景 3：車輛反應太慢

**問題**：車輛對交通狀況反應不夠即時
**解決方案**：

```javascript
ANIMATION_CONFIG: {
  TIME_MULTIPLIER: 0.6,  // 提升整體動畫速度
  COOLDOWN_TIMES: {
    GLOBAL_ANTI_SHAKE: 50,    // 縮短冷卻時間
    TIMESCALE_DEBOUNCE: 100,  // 縮短防抖延遲
  }
}
FOLLOWING_CONFIG: {
  CHECK_INTERVAL: 1000,  // 縮短檢查間隔
}
```

## 🔄 配置更新流程

1. **修改配置檔案**（vehicleConfig.js 或 trafficConfig.js）
2. **重新載入頁面**（Ctrl+F5 強制重新整理）
3. **觀察車輛行為變化**
4. **根據效果微調參數**
5. **重複步驟 1-4 直到滿意**

## 🐛 除錯技巧

### 開啟除錯模式

```javascript
// 在 vehicleConfig.js 中調整
DEBUG_CONFIG: {
  LOG_PROBABILITY: 1.0,  // 100% 輸出日誌（除錯時用）
}
```

### 檢視當前配置值

```javascript
// 在瀏覽器控制台中執行
console.log('當前動畫配置:', ANIMATION_CONFIG)
console.log('當前距離配置:', DISTANCE_CONFIG)
```

## 📝 注意事項

1. **參數範圍**：
   - 時間參數建議在 0.05-2.0 秒之間
   - 距離參數建議在 20-200 像素之間
   - 速度倍數建議在 0.1-2.0 之間

2. **相依性**：
   - 某些參數會互相影響，調整時需要全面考慮
   - 建議一次只調整一個類別的參數

3. **效能考量**：
   - 過短的動畫時間可能影響效能
   - 過小的檢查間隔可能造成卡頓

4. **備份重要**：
   - 大幅修改前請備份原始配置
   - 記錄好的配置組合供日後使用

## 🎉 完成！

現在你已經有了一套完整、可配置、有詳細註解的車輛配置系統！你可以：

- ✅ 輕鬆調整車輛行為而不需要深入程式碼
- ✅ 通過配置檔案快速測試不同的參數組合
- ✅ 根據中文註解理解每個參數的作用
- ✅ 享受統一管理帶來的便利性

有任何問題或需要進一步調整，隨時告訴我！🚗💨
