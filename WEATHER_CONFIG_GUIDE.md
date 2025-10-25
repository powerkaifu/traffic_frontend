# 🌤️ 天氣系統參數配置指南

**文檔日期**: 2025年10月26日
**版本**: 1.0
**狀態**: ✅ 完成 (Build: 0 errors)

---

## 📋 概述

天氣系統所有參數都集中在 **`src/classes/config/weatherConfig.js`** 檔案中，方便統一管理和調整。你可以輕鬆修改天氣倍數、視覺效果、動畫參數等。

---

## 🎯 快速開始 - 最常調整的參數

### 調整天氣對車速的影響

**檔案位置**: `src/classes/config/weatherConfig.js` (第 126-177 行)

**關鍵參數**: `WEATHER_SPEED_MULTIPLIERS`

```javascript
export const WEATHER_SPEED_MULTIPLIERS = {
  // 晴天 - 100% 速度
  [WEATHER_TYPES.CLEAR]: {
    multiplier: 1.0, // ← 修改這裡
  },

  // 雨天 - 80% 速度（可選調整為 70% 或 90%）
  [WEATHER_TYPES.RAIN]: {
    multiplier: 0.8, // ← 修改這裡
  },

  // 大雨 - 70% 速度
  [WEATHER_TYPES.HEAVY_RAIN]: {
    multiplier: 0.7, // ← 修改這裡
  },

  // 霧天 - 75% 速度
  [WEATHER_TYPES.FOG]: {
    multiplier: 0.75, // ← 修改這裡
  },

  // 雪天 - 60% 速度
  [WEATHER_TYPES.SNOW]: {
    multiplier: 0.6, // ← 修改這裡
  },
}
```

### 🔧 調整方式

1. **打開檔案**: `src/classes/config/weatherConfig.js`
2. **找到 `WEATHER_SPEED_MULTIPLIERS` 常數** (第 126 行)
3. **修改 `multiplier` 值**:
   - `1.0` = 100% 速度 (正常)
   - `0.9` = 90% 速度 (減速 10%)
   - `0.8` = 80% 速度 (減速 20%)
   - `0.7` = 70% 速度 (減速 30%)
   - 等等...

4. **儲存檔案**
5. **編譯**: `npm run build`
6. **重新啟動模擬**

---

## 📊 完整參數文檔

### 1️⃣ 天氣類型定義

**位置**: 第 7-13 行

```javascript
export const WEATHER_TYPES = {
  CLEAR: 'clear', // 晴天
  RAIN: 'rain', // 雨天
  HEAVY_RAIN: 'heavyRain', // 大雨
  FOG: 'fog', // 霧天
  SNOW: 'snow', // 雪天
}
```

**說明**:

- 這些是系統識別的天氣類型
- 在 IndexPage 中的天氣按鈕對應這些類型
- 不建議修改這些值，除非需要添加新天氣類型

---

### 2️⃣ 雨天效果設定

**位置**: 第 15-57 行

#### 雨滴數量

```javascript
PARTICLE_COUNT: {
  LIGHT: 100,   // 輕雨 - 100 個雨滴
  NORMAL: 200,  // 中雨 - 200 個雨滴
  HEAVY: 300,   // 大雨 - 300 個雨滴
},
```

**調整建議**:

- 增加數字 → 更多雨滴 (視覺更逼真但性能消耗更大)
- 減少數字 → 更少雨滴 (性能更好)

#### 雨滴外觀

```javascript
APPEARANCE: {
  WIDTH: 2,             // 寬度 (像素)
  MIN_HEIGHT: 10,       // 最小高度
  MAX_HEIGHT: 20,       // 最大高度
  COLOR: 'rgba(...)',   // 顏色和透明度
  OPACITY_RANGE: [0.2, 0.6], // 透明度範圍
},
```

#### 雨滴動畫

```javascript
ANIMATION: {
  MIN_DURATION: 0.5,   // 最快下落時間
  MAX_DURATION: 1.5,   // 最慢下落時間
  WIND_OFFSET: 30,     // 風向偏移
  ROTATION: 10,        // 傾斜角度
},
```

**調整建議**:

- `MIN_DURATION`: 越小 → 下雨越快
- `WIND_OFFSET`: 越大 → 風效果越明顯

#### 速度影響

```javascript
SPEED_REDUCTION: {
  LIGHT: 0.9,    // 輕雨: 90% 速度
  NORMAL: 0.8,   // 中雨: 80% 速度
  HEAVY: 0.7,    // 大雨: 70% 速度
},
```

**說明**: 這些是**按鈕級別**的設定，用於區分不同雨勢。

#### 閃電效果 (僅大雨)

```javascript
LIGHTNING: {
  ENABLED: true,              // 是否啟用
  MIN_INTERVAL: 3,            // 最短間隔 (秒)
  MAX_INTERVAL: 8,            // 最長間隔 (秒)
  FLASH_DURATION: 0.2,        // 閃光時間
  FLASH_COLOR: 'rgba(...)',   // 閃光顏色
  DOUBLE_FLASH_CHANCE: 0.3,   // 雙閃機率 (30%)
  DOUBLE_FLASH_DELAY: 0.15,   // 雙閃延遲
},
```

**調整建議**:

- `ENABLED: false` → 關閉閃電效果
- `MIN_INTERVAL` 越小 → 閃電越頻繁

---

### 3️⃣ 霧天效果設定

**位置**: 第 59-87 行

```javascript
export const FOG_CONFIG = {
  APPEARANCE: {
    COLOR: 'rgba(200, 200, 200, 0.3)', // 霧氣顏色
    BLUR_AMOUNT: '10px', // 模糊程度
    LAYERS: 3, // 霧氣層數
  },

  ANIMATION: {
    DRIFT_SPEED: 30, // 飄移速度 (秒)
    OPACITY_RANGE: [0.2, 0.5], // 透明度範圍
  },

  VISIBILITY: {
    FILTER: 'brightness(0.8) contrast(0.9)', // 亮度和對比
    OPACITY: 0.85, // 整體透明度
  },

  SPEED_REDUCTION: 0.75, // 75% 速度
}
```

**調整建議**:

- `BLUR_AMOUNT: '15px'` → 更模糊
- `OPACITY: 0.9` → 更透明

---

### 4️⃣ 雪天效果設定

**位置**: 第 89-115 行

```javascript
export const SNOW_CONFIG = {
  PARTICLE_COUNT: 150, // 雪花數量

  APPEARANCE: {
    SIZE_RANGE: [2, 6], // 雪花大小
    COLOR: 'rgba(255, 255, 255, 0.8)', // 白色
    BLUR: '1px', // 模糊效果
  },

  ANIMATION: {
    MIN_DURATION: 3, // 最快下落時間
    MAX_DURATION: 8, // 最慢下落時間
    SWING_AMOUNT: 50, // 擺動幅度
  },

  SPEED_REDUCTION: 0.6, // 60% 速度
}
```

**調整建議**:

- `SWING_AMOUNT: 100` → 雪花擺動更大
- `PARTICLE_COUNT: 200` → 更多雪花

---

### 5️⃣ 轉換動畫設定

**位置**: 第 117-122 行

```javascript
export const TRANSITION_CONFIG = {
  FADE_DURATION: 1.0, // 淡入淡出時間 (秒)
  PARTICLE_SPAWN_DELAY: 0.05, // 粒子生成延遲
}
```

**調整建議**:

- `FADE_DURATION: 0.5` → 天氣轉換更快
- `FADE_DURATION: 2.0` → 天氣轉換更平滑

---

### 6️⃣ 性能優化設定

**位置**: 第 124-129 行

```javascript
export const PERFORMANCE_CONFIG = {
  ENABLE_PERFORMANCE_MODE: false, // 效能模式開關
  PERFORMANCE_PARTICLE_RATIO: 0.5, // 粒子比例 (50%)
  UPDATE_INTERVAL: 16, // 更新間隔 (毫秒)
}
```

**調整建議**:

- 如果手機性能不足: `ENABLE_PERFORMANCE_MODE: true`
- `PERFORMANCE_PARTICLE_RATIO: 0.3` → 只使用 30% 粒子
- `UPDATE_INTERVAL: 32` → 降低更新頻率

---

### 7️⃣ 🌤️ 天氣速度倍數設定 (核心配置)

**位置**: 第 131-177 行

這是**最常調整**的部分！

```javascript
export const WEATHER_SPEED_MULTIPLIERS = {
  // 晴天 - 正常速度
  [WEATHER_TYPES.CLEAR]: {
    name: '晴天',
    multiplier: 1.0, // ← 調整這裡
    description: '晴朗無雲，交通流暢',
  },

  // 雨天 - 中等速度降低
  [WEATHER_TYPES.RAIN]: {
    name: '雨天',
    multiplier: 0.8, // ← 調整這裡
    description: '中等雨量，降速 20%',
    detailed: {
      LIGHT: 0.9, // 輕雨
      NORMAL: 0.8, // 中雨
      HEAVY: 0.7, // 大雨
    },
  },

  // 大雨 - 明顯降速
  [WEATHER_TYPES.HEAVY_RAIN]: {
    name: '大雨',
    multiplier: 0.7, // ← 調整這裡
    description: '大雨伴隨閃電，降速 30%',
  },

  // 霧天 - 中等降速
  [WEATHER_TYPES.FOG]: {
    name: '霧天',
    multiplier: 0.75, // ← 調整這裡
    description: '濃霧，能見度低，降速 25%',
  },

  // 雪天 - 最大降速
  [WEATHER_TYPES.SNOW]: {
    name: '雪天',
    multiplier: 0.6, // ← 調整這裡
    description: '下雪，路面濕滑，降速 40%',
  },
}
```

### 調整倍數的效果對比

| 倍數     | 效果      | 適用場景       |
| -------- | --------- | -------------- |
| **1.0**  | 100% 速度 | 晴天，路況良好 |
| **0.95** | 95% 速度  | 輕微降速       |
| **0.90** | 90% 速度  | 輕雨           |
| **0.85** | 85% 速度  | 中等降速       |
| **0.80** | 80% 速度  | 中雨，建議值   |
| **0.75** | 75% 速度  | 霧天           |
| **0.70** | 70% 速度  | 大雨           |
| **0.65** | 65% 速度  | 嚴重降速       |
| **0.60** | 60% 速度  | 雪天，最大降速 |

---

### 8️⃣ 全局天氣系統設定

**位置**: 第 179-221 行

```javascript
export const WEATHER_SYSTEM_CONFIG = {
  BEHAVIOR: {
    ENABLED: true, // 天氣系統開關
    SMOOTH_TRANSITION: false, // 平滑過渡 (暫未實現)
    CHANGE_DELAY: 0, // 改變延遲 (毫秒)
    DEBUG_LOG: true, // 控制台調試日誌
  },

  IMPACT: {
    AFFECTS_VEHICLE_SPEED: true, // 影響車速
    AFFECTS_TRAFFIC_VOLUME: false, // 影響車流量 (未實現)
    AFFECTS_DRIVING_BEHAVIOR: false, // 影響行為 (未實現)
  },

  DEFAULT_WEATHER: WEATHER_TYPES.CLEAR, // 預設天氣

  WEATHER_ORDER: [
    WEATHER_TYPES.CLEAR,
    WEATHER_TYPES.RAIN,
    WEATHER_TYPES.HEAVY_RAIN,
    WEATHER_TYPES.FOG,
    WEATHER_TYPES.SNOW,
  ],
}
```

**調整建議**:

- `DEBUG_LOG: false` → 關閉控制台日誌 (減少噪音)
- `AFFECTS_TRAFFIC_VOLUME: true` → (未來功能) 天氣影響車流量

---

## 🔧 使用示例

### 示例 1: 讓雨天降速更多

**需求**: 雨天時車輛降速 30% (而不是 20%)

**修改**:

```javascript
// 修改前
[WEATHER_TYPES.RAIN]: {
  multiplier: 0.8,  // 80% 速度
}

// 修改後
[WEATHER_TYPES.RAIN]: {
  multiplier: 0.7,  // 70% 速度 (降速 30%)
}
```

### 示例 2: 關閉閃電效果

**需求**: 大雨時不要有閃電

**修改**:

```javascript
// 修改前
LIGHTNING: {
  ENABLED: true,
}

// 修改後
LIGHTNING: {
  ENABLED: false,
}
```

### 示例 3: 性能優化

**需求**: 在低端設備上運行

**修改**:

```javascript
export const PERFORMANCE_CONFIG = {
  ENABLE_PERFORMANCE_MODE: true, // 啟用
  PERFORMANCE_PARTICLE_RATIO: 0.3, // 只用 30% 粒子
  UPDATE_INTERVAL: 32, // 降低更新頻率
}
```

### 示例 4: 霧天效果更濃

**需求**: 霧天視覺效果更明顯

**修改**:

```javascript
// 修改前
VISIBILITY: {
  FILTER: 'brightness(0.8) contrast(0.9)',
  OPACITY: 0.85,
}

// 修改後
VISIBILITY: {
  FILTER: 'brightness(0.6) contrast(0.7)',  // 更暗
  OPACITY: 0.95,                             // 更濃
}
```

---

## 📱 實時修改 vs 重新編譯

### 需要重新編譯的修改 ✅

這些修改**必須**重新編譯才能生效：

- 修改 `WEATHER_SPEED_MULTIPLIERS`
- 修改 `PERFORMANCE_CONFIG`
- 修改 `WEATHER_SYSTEM_CONFIG`

**編譯命令**:

```bash
npm run build
```

### 不需要重新編譯的修改 (理論上)

這些修改可以通過開發者工具直接修改 (如果需要快速測試)：

- 視覺效果參數 (顏色、大小等)
- 動畫持續時間

**但建議**: 總是編譯後測試，確保設定正確

---

## 🎯 常見調整需求

### 需求 1: 天氣對交通影響太大

**症狀**: 天氣改變時，車速變化太明顯

**解決**:

```javascript
// 將倍數增加 (接近 1.0)
[WEATHER_TYPES.RAIN]: {
  multiplier: 0.9,  // 從 0.8 改為 0.9
}
```

### 需求 2: 天氣對交通影響太小

**症狀**: 天氣改變時，看不出車速變化

**解決**:

```javascript
// 將倍數減少 (遠離 1.0)
[WEATHER_TYPES.RAIN]: {
  multiplier: 0.7,  // 從 0.8 改為 0.7
}
```

### 需求 3: 雨天視覺效果不明顯

**症狀**: 下雨時看不清楚

**解決**:

```javascript
PARTICLE_COUNT: {
  NORMAL: 300,  // 從 200 增加到 300
}
```

### 需求 4: 性能問題

**症狀**: 天氣特效導致 FPS 下降

**解決**:

```javascript
export const PERFORMANCE_CONFIG = {
  ENABLE_PERFORMANCE_MODE: true,
  PERFORMANCE_PARTICLE_RATIO: 0.3,
}
```

---

## 📊 參數關係圖

```
weatherConfig.js
├─ WEATHER_TYPES (天氣類型定義)
├─ RAIN_CONFIG (雨天視覺效果)
│  ├─ PARTICLE_COUNT (雨滴數量)
│  ├─ APPEARANCE (外觀)
│  ├─ ANIMATION (動畫)
│  ├─ SPEED_REDUCTION (速度影響)
│  └─ LIGHTNING (閃電效果)
├─ FOG_CONFIG (霧天視覺效果)
├─ SNOW_CONFIG (雪天視覺效果)
├─ WEATHER_SPEED_MULTIPLIERS ⭐ (核心)
│  ├─ CLEAR: 1.0
│  ├─ RAIN: 0.8
│  ├─ HEAVY_RAIN: 0.7
│  ├─ FOG: 0.75
│  └─ SNOW: 0.6
└─ WEATHER_SYSTEM_CONFIG (全局設定)
   ├─ BEHAVIOR
   ├─ IMPACT
   ├─ DEFAULT_WEATHER
   └─ WEATHER_ORDER
```

---

## 🔍 調試技巧

### 1. 查看當前天氣倍數

在瀏覽器 Console 輸入:

```javascript
// 查看當前天氣
console.log(window.weatherController.currentWeather)

// 查看當前倍數
console.log(window.weatherController.getSpeedMultiplier())
```

### 2. 查看配置是否加載

在 Console 輸入:

```javascript
// 查看配置
console.log(WEATHER_SPEED_MULTIPLIERS)
```

### 3. 手動改變天氣 (測試用)

在 Console 輸入:

```javascript
// 改變為下雨
window.weatherController.changeWeather('rain')

// 改變為大雨
window.weatherController.changeWeather('heavyRain')

// 改變為晴天
window.weatherController.changeWeather('clear')
```

---

## ✅ 檢查清單

修改配置後，使用此清單驗證：

- [ ] 修改了 `weatherConfig.js` 中的參數
- [ ] 儲存了檔案
- [ ] 執行了 `npm run build`
- [ ] 重新啟動了開發伺服器
- [ ] 刷新了瀏覽器
- [ ] 按下天氣按鈕測試
- [ ] 觀察到了預期的變化
- [ ] 檢查瀏覽器 Console 沒有錯誤

---

## 🚀 下一步

### 想要實現的功能

1. **自動天氣變化**: 根據時段自動改變天氣
2. **天氣影響車流量**: 天氣不僅影響速度，也影響車輛生成
3. **天氣平滑過渡**: 從晴天逐漸轉為下雨
4. **添加更多天氣類型**: 冰雹、沙塵暴等
5. **天氣預測**: 顯示未來的天氣變化

---

## 📞 支援

如有問題:

1. **檢查控制台日誌**: 打開 F12 Developer Tools
2. **確認編譯**: 檢查是否有編譯錯誤
3. **重置為預設**: 恢復原始配置值

---

**文檔完成！** 現在你可以輕鬆調整所有天氣參數了！🎉
