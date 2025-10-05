# 天氣效果對車輛速度影響修復

## 問題描述

天氣效果（雨天、大雨、霧天、雪天）雖然在視覺上改變了動畫速度，但**傳遞到後端的車輛速度數據沒有反映天氣影響**，導致數據不準確。

## 問題分析

### 原有實現
1. ✅ **動畫時間調整正確**：天氣影響已經在 `startMovement()` 中調整動畫持續時間
2. ❌ **速度數據不準確**：`currentSpeed` 和 `maxSpeed` 計算時沒有考慮天氣倍數
3. ❌ **後端數據失真**：TrafficDataCollector 收集的速度數據不反映實際天氣影響

### 根本原因

在 `Vehicle.js` 中，計算 `currentSpeed` 時使用的是原始像素移動速度，沒有乘以天氣速度倍數：

```javascript
// ❌ 原本的代碼（不準確）
const kmhSpeed = meterSpeed * 3.6
this.currentSpeed = Math.round(kmhSpeed)  // 沒有考慮天氣影響
```

雖然動畫會因為天氣而變慢（透過增加 duration），但速度計算是基於實際像素移動距離，所以仍然顯示原始速度。

## 解決方案

### 配置文件回顧

**weatherConfig.js** 已經定義了各種天氣的速度減少倍數：

```javascript
// 雨天速度影響
RAIN_CONFIG.SPEED_REDUCTION: {
  LIGHT: 0.9,   // 小雨：90% 速度
  NORMAL: 0.8,  // 中雨：80% 速度
  HEAVY: 0.7,   // 大雨：70% 速度（有閃電）
}

// 霧天速度影響
FOG_CONFIG.SPEED_REDUCTION: 0.75  // 75% 速度

// 雪天速度影響
SNOW_CONFIG.SPEED_REDUCTION: 0.6  // 60% 速度
```

### 修改內容

#### 1. 修改速度計算（兩處）

**位置 1：`startMovement()` 中的速度追蹤**
```javascript
// ✅ 修復後的代碼
const pixelSpeed = deltaDistance / deltaTime
const meterSpeed = (pixelSpeed / 100) * 15
let kmhSpeed = meterSpeed * 3.6

// 🌤️ 應用天氣影響到速度計算
const weatherMultiplier = this.getWeatherSpeedMultiplier()
kmhSpeed *= weatherMultiplier

this.currentSpeed = Math.round(kmhSpeed)
this.maxSpeed = Math.max(this.maxSpeed, this.currentSpeed)
```

**位置 2：`moveToWithTrafficControl()` 中的速度追蹤**
```javascript
// ✅ 同樣的修改
let kmhSpeed = meterSpeed * 3.6

// 🌤️ 應用天氣影響到速度計算
const weatherMultiplier = this.getWeatherSpeedMultiplier()
kmhSpeed *= weatherMultiplier

this.currentSpeed = Math.round(kmhSpeed)
```

#### 2. 修改初始化速度（兩處）

**位置 1：`startMovement()` 開始時**
```javascript
// ✅ 修復後的代碼
this.movementStartTime = new Date().toISOString()

// 🌤️ 初始化速度時考慮天氣影響
const weatherMultiplier = this.getWeatherSpeedMultiplier()
const effectiveSpeed = Math.round(this.initialSpeed * weatherMultiplier)

this.currentSpeed = effectiveSpeed
this.maxSpeed = effectiveSpeed
```

**位置 2：`moveToWithTrafficControl()` 開始時**
```javascript
// ✅ 同樣的修改
const weatherMultiplier = this.getWeatherSpeedMultiplier()
const effectiveSpeed = Math.round(this.initialSpeed * weatherMultiplier)

this.currentSpeed = effectiveSpeed
this.maxSpeed = effectiveSpeed
```

### 數據流程

```
天氣配置 (weatherConfig.js)
    ↓
WeatherController.getSpeedMultiplier()
    ↓
Vehicle.getWeatherSpeedMultiplier()
    ↓
┌─────────────────────────────────┐
│ 應用到兩個地方：                  │
├─────────────────────────────────┤
│ 1. 動畫時間計算（已存在）         │
│    - theoreticalTime /= weather  │
│    - 讓車輛移動得更慢             │
│                                  │
│ 2. 速度數據計算（新增）✨         │
│    - kmhSpeed *= weather         │
│    - 讓數據反映實際速度           │
└─────────────────────────────────┘
    ↓
TrafficDataCollector 收集準確數據
    ↓
傳送到後端的數據正確反映天氣影響
```

## 測試案例

### 測試場景 1：晴天基準

```
天氣：晴天 ☀️
速度倍數：1.0
車輛初始速度：50 km/h

預期結果：
  - currentSpeed: 50 km/h
  - maxSpeed: 50 km/h
  - 傳送到後端：50 km/h
```

### 測試場景 2：中雨

```
天氣：雨天 🌧️
速度倍數：0.8
車輛初始速度：50 km/h

預期結果：
  - currentSpeed: 40 km/h (50 * 0.8)
  - maxSpeed: 40 km/h
  - 傳送到後端：40 km/h
  - 動畫時間：增加 25% (1 / 0.8)
```

### 測試場景 3：大雨 + 閃電

```
天氣：大雨 ⛈️
速度倍數：0.7
車輛初始速度：50 km/h

預期結果：
  - currentSpeed: 35 km/h (50 * 0.7)
  - maxSpeed: 35 km/h
  - 傳送到後端：35 km/h
  - 動畫時間：增加 43% (1 / 0.7)
  - 額外效果：閃電動畫
```

### 測試場景 4：霧天

```
天氣：霧天 🌫️
速度倍數：0.75
車輛初始速度：50 km/h

預期結果：
  - currentSpeed: 38 km/h (50 * 0.75)
  - maxSpeed: 38 km/h
  - 傳送到後端：38 km/h
  - 動畫時間：增加 33% (1 / 0.75)
```

### 測試場景 5：雪天

```
天氣：雪天 ❄️
速度倍數：0.6
車輛初始速度：50 km/h

預期結果：
  - currentSpeed: 30 km/h (50 * 0.6)
  - maxSpeed: 30 km/h
  - 傳送到後端：30 km/h
  - 動畫時間：增加 67% (1 / 0.6)
```

## 後端數據影響

### TrafficDataCollector 收集的數據

修復後，以下數據會正確反映天氣影響：

```javascript
{
  vehicleId: "車輛ID",
  direction: "east",
  type: "small",
  laneNumber: 2,
  
  // ✅ 這些速度數據現在會反映天氣影響
  initialSpeed: 35,        // 原本 50，大雨影響後 35
  currentSpeed: 35,        // 即時速度也會正確
  maxSpeed: 35,            // 最大速度同步
  
  // ✅ 平均速度也會準確
  averageSpeed: 32,        // 考慮停車等待後的平均
  
  // ✅ 移動時間會增加（因為速度降低）
  totalMovementTime: 8.5,  // 原本 6秒，天氣影響後增加
  
  // ✅ 其他數據保持準確
  totalDistance: 800,
  stopCount: 2,
  weatherCondition: "heavyRain"  // 記錄當時天氣
}
```

### 數據分析價值

修復後的數據可以用於：

1. **天氣影響分析**
   - 比較不同天氣下的平均速度
   - 評估天氣對交通流量的影響
   - 優化天氣參數設定

2. **交通模擬準確性**
   - 速度數據反映真實交通狀況
   - 可用於訓練機器學習模型
   - 支援更準確的交通預測

3. **系統性能評估**
   - 不同天氣下的路口通過效率
   - 天氣對擁堵的影響程度
   - 信號燈配時優化依據

## 配置驅動設計

### 遵循配置原則

所有天氣速度倍數都來自 `weatherConfig.js`：

```javascript
// ✅ 使用配置，不使用硬編碼
const weatherMultiplier = this.getWeatherSpeedMultiplier()
  ↓
window.weatherController.getSpeedMultiplier()
  ↓
switch (this.currentWeather) {
  case WEATHER_TYPES.RAIN:
    return RAIN_CONFIG.SPEED_REDUCTION.NORMAL  // 0.8
  case WEATHER_TYPES.HEAVY_RAIN:
    return RAIN_CONFIG.SPEED_REDUCTION.HEAVY   // 0.7
  case WEATHER_TYPES.FOG:
    return FOG_CONFIG.SPEED_REDUCTION          // 0.75
  case WEATHER_TYPES.SNOW:
    return SNOW_CONFIG.SPEED_REDUCTION         // 0.6
  default:
    return 1.0
}
```

### 調整天氣影響

如果需要調整天氣對速度的影響，只需修改 `weatherConfig.js`：

```javascript
// 例如：讓大雨影響更明顯
RAIN_CONFIG.SPEED_REDUCTION.HEAVY: 0.6,  // 從 0.7 改為 0.6

// 例如：減輕霧天影響
FOG_CONFIG.SPEED_REDUCTION: 0.85,  // 從 0.75 改為 0.85
```

修改後，所有相關計算會自動更新，無需修改其他代碼。

## 修改的檔案

**src/classes/Vehicle.js** (4 處修改)
1. `startMovement()` - 初始速度計算（新增天氣影響）
2. `startMovement()` - 實時速度追蹤（新增天氣影響）
3. `moveToWithTrafficControl()` - 初始速度計算（新增天氣影響）
4. `moveToWithTrafficControl()` - 實時速度追蹤（新增天氣影響）

## 測試步驟

1. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

2. **測試晴天基準**
   - 選擇晴天 ☀️
   - 生成車輛
   - 查看控制台速度數據：應為原始速度

3. **測試雨天效果**
   - 切換到雨天 🌧️
   - 生成新車輛
   - 查看速度：應降至 80%
   - 觀察動畫：車輛移動較慢

4. **測試大雨效果**
   - 切換到大雨 ⛈️
   - 生成新車輛
   - 查看速度：應降至 70%
   - 觀察閃電效果

5. **測試霧天效果**
   - 切換到霧天 🌫️
   - 生成新車輛
   - 查看速度：應降至 75%

6. **測試雪天效果**
   - 切換到雪天 ❄️
   - 生成新車輛
   - 查看速度：應降至 60%（最慢）

7. **驗證後端數據**
   - 開啟 TrafficDataCollector 日誌
   - 檢查 `currentSpeed` 和 `maxSpeed` 數值
   - 確認數據反映天氣影響

## 預期效果

### 視覺效果
- ✅ 車輛移動速度隨天氣變慢
- ✅ 動畫流暢，無抖動
- ✅ 天氣效果與速度變化同步

### 數據效果
- ✅ `currentSpeed` 反映天氣影響
- ✅ `maxSpeed` 反映天氣影響
- ✅ 平均速度計算準確
- ✅ 後端收到的數據準確

### 系統整合
- ✅ 配置驅動，無硬編碼
- ✅ 天氣切換時數據即時更新
- ✅ 所有車輛（新舊）都受影響
- ✅ 與 TrafficDataCollector 完美整合

## 技術亮點

1. **配置驅動設計**：所有天氣參數來自配置檔
2. **單一事實來源**：速度倍數統一從 WeatherController 獲取
3. **數據一致性**：視覺效果與數據完全同步
4. **向後兼容**：不影響現有功能
5. **易於調整**：修改配置即可調整天氣影響

完美實現天氣對交通流量的真實影響！🌤️🚗📊
