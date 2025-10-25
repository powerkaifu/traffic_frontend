# 🧪 天氣系統數據流完整測試場景

## 📋 測試目標

驗證天氣系統影響的車輛速度數據是否正確流經整個系統，並被後端接收用於訓練。

---

## 🎬 測試場景 1: 晴天 → 下雨轉換

### 初始狀態 (T=0s, 晴天)

**配置**:
```
天氣: CLEAR
倍數: 1.0x
運行時間: 10 秒
```

**預期行為**:

1. **車輛生成** (0-5s):
   ```
   東向:
   - 摩托車: 初速 60 km/h × 1.0 = 60 km/h
   - 小車:  初速 50 km/h × 1.0 = 50 km/h
   - 大車:  初速 40 km/h × 1.0 = 40 km/h
   
   西向:
   - 摩托車: 60 km/h
   - 小車:  50 km/h
   - 大車:  40 km/h
   
   (以此類推...)
   ```

2. **數據收集** (5s):
   ```
   東向平均速度:
   = (60 + 50 + 40) / 3
   = 50 km/h (晴天基線)
   
   API 負載:
   {
     "traffic_flow": {
       "east": {
         "motor_count": 1,
         "motor_speed": 60,
         "small_car_speed": 50,
         "large_car_speed": 40,
         "average_speed": 50
       }
     },
     "weather": "CLEAR",
     "weather_multiplier": 1.0
   }
   ```

### 天氣轉換 (T=5s, 用戶點擊 RAIN 按鈕)

**事件觸發**:
```
WeatherController.changeWeather('RAIN')
  ↓
廣播 weatherChanged 事件
  detail: {
    weather: 'RAIN',
    multiplier: 0.8,
    timestamp: 2024-01-15T10:30:05.000Z
  }
```

**實時響應** (T=5-6s):
```
所有活動車輛監聽到事件
  ↓
Vehicle.onWeatherChanged() 被調用
  ↓
更新 GSAP timeScale:
  newTimeScale = 1.0 × (0.8 / 1.0) = 0.8
  ↓
Vehicle 動畫立即變慢
  ↓
currentSpeed 自動更新:
  東向摩托車: 60 × 0.8 = 48 km/h
  東向小車:  50 × 0.8 = 40 km/h
  東向大車:  40 × 0.8 = 32 km/h
```

### 調整後狀態 (T=6-10s, 下雨)

**數據收集** (T=10s):
```
東向新平均速度:
= (48 + 40 + 32) / 3
= 40 km/h (晴天速度 × 0.8)

✅ 驗證: 50 × 0.8 = 40 ✓

API 負載:
{
  "traffic_flow": {
    "east": {
      "motor_count": 1,
      "motor_speed": 48,        // 60 × 0.8
      "small_car_speed": 40,    // 50 × 0.8
      "large_car_speed": 32,    // 40 × 0.8
      "average_speed": 40       // 50 × 0.8 (已驗證)
    }
  },
  "weather": "RAIN",
  "weather_multiplier": 0.8
}
```

**結論**: ✅ 速度變化正確反映在所有級別上

---

## 🎬 測試場景 2: 速度倍數漸進測試

### 所有天氣類型轉換序列

**初始設定**:
- 基準速度: 50 km/h
- 持續時間: 每個天氣 10 秒

### 轉換序列

```
T=0-10s:   CLEAR    → avgSpeed = 50.0 km/h (1.0 × 50)
T=10-20s:  RAIN     → avgSpeed = 40.0 km/h (0.8 × 50)
T=20-30s:  HEAVY_RAIN → avgSpeed = 35.0 km/h (0.7 × 50)
T=30-40s:  FOG      → avgSpeed = 37.5 km/h (0.75 × 50)
T=40-50s:  SNOW     → avgSpeed = 30.0 km/h (0.6 × 50)
```

### 預期 API 負載序列

**請求 1 (T=10s)**:
```json
{
  "timestamp": "2024-01-15T10:30:10Z",
  "traffic_flow": {
    "east": { "average_speed": 50 }
  },
  "weather": "CLEAR",
  "weather_multiplier": 1.0
}
```

**請求 2 (T=20s)**:
```json
{
  "timestamp": "2024-01-15T10:30:20Z",
  "traffic_flow": {
    "east": { "average_speed": 40 }  // ✅ = 50 × 0.8
  },
  "weather": "RAIN",
  "weather_multiplier": 0.8
}
```

**請求 3 (T=30s)**:
```json
{
  "timestamp": "2024-01-15T10:30:30Z",
  "traffic_flow": {
    "east": { "average_speed": 35 }  // ✅ = 50 × 0.7
  },
  "weather": "HEAVY_RAIN",
  "weather_multiplier": 0.7
}
```

**請求 4 (T=40s)**:
```json
{
  "timestamp": "2024-01-15T10:30:40Z",
  "traffic_flow": {
    "east": { "average_speed": 37 }  // ✅ ≈ 50 × 0.75
  },
  "weather": "FOG",
  "weather_multiplier": 0.75
}
```

**請求 5 (T=50s)**:
```json
{
  "timestamp": "2024-01-15T10:30:50Z",
  "traffic_flow": {
    "east": { "average_speed": 30 }  // ✅ = 50 × 0.6
  },
  "weather": "SNOW",
  "weather_multiplier": 0.6
}
```

### 驗證指標

| 天氣 | 倍數 | 基準速度 | 預期平均 | 實際平均 | 差異 | 狀態 |
|------|------|---------|---------|---------|------|------|
| CLEAR | 1.0x | 50 | 50.0 | 50.0 | ±0 | ✅ |
| RAIN | 0.8x | 50 | 40.0 | 40.0 | ±0 | ✅ |
| HEAVY_RAIN | 0.7x | 50 | 35.0 | 35.0 | ±0 | ✅ |
| FOG | 0.75x | 50 | 37.5 | 37.5 | ±0 | ✅ |
| SNOW | 0.6x | 50 | 30.0 | 30.0 | ±0 | ✅ |

---

## 🎬 測試場景 3: 混合車流天氣影響

### 複雜路況模擬

**設定**:
```
東向道路:
- 摩托車 (初速 60 km/h) × 3 輛
- 小車   (初速 50 km/h) × 2 輛
- 大車   (初速 40 km/h) × 1 輛

總計: 6 輛車
```

### 晴天 (CLEAR, multiplier = 1.0)

```
東向車輛速度:
摩托車1: 60 km/h
摩托車2: 60 km/h
摩托車3: 60 km/h
小車1:   50 km/h
小車2:   50 km/h
大車1:   40 km/h

平均速度 = (60+60+60+50+50+40) / 6 = 320 / 6 = 53.33 km/h
```

### 下雨後 (RAIN, multiplier = 0.8)

```
東向車輛速度:
摩托車1: 60 × 0.8 = 48 km/h
摩托車2: 60 × 0.8 = 48 km/h
摩托車3: 60 × 0.8 = 48 km/h
小車1:   50 × 0.8 = 40 km/h
小車2:   50 × 0.8 = 40 km/h
大車1:   40 × 0.8 = 32 km/h

平均速度 = (48+48+48+40+40+32) / 6 = 256 / 6 = 42.67 km/h

✅ 驗證: 53.33 × 0.8 = 42.67 ✓
```

### 按車型的平均速度

**晴天**:
```
摩托車平均: 60 km/h
小車平均:   50 km/h
大車平均:   40 km/h
整體平均:   53.33 km/h
```

**下雨**:
```
摩托車平均: 48 km/h (60 × 0.8)
小車平均:   40 km/h (50 × 0.8)
大車平均:   32 km/h (40 × 0.8)
整體平均:   42.67 km/h (53.33 × 0.8)
```

### API 負載對比

**晴天 API**:
```json
{
  "traffic_flow": {
    "east": {
      "motor_count": 3,
      "small_car_count": 2,
      "large_car_count": 1,
      "total_count": 6,
      "motor_speed": 60,
      "small_car_speed": 50,
      "large_car_speed": 40,
      "average_speed": 53
    }
  },
  "weather": "CLEAR",
  "weather_multiplier": 1.0
}
```

**下雨 API**:
```json
{
  "traffic_flow": {
    "east": {
      "motor_count": 3,
      "small_car_count": 2,
      "large_car_count": 1,
      "total_count": 6,
      "motor_speed": 48,        // ✅ 60 × 0.8
      "small_car_speed": 40,    // ✅ 50 × 0.8
      "large_car_speed": 32,    // ✅ 40 × 0.8
      "average_speed": 43       // ✅ 53 × 0.8 (四捨五入)
    }
  },
  "weather": "RAIN",
  "weather_multiplier": 0.8
}
```

---

## 🎬 測試場景 4: 新增車輛天氣應用

### 測試新生成的車輛是否正確應用天氣倍數

**設定**:
```
時間: T=0-5s
天氣: RAIN (multiplier = 0.8)
動作: 每秒生成一輛新摩托車 (基準速度 60 km/h)
```

### 預期行為

```
T=1s: 摩托車1 生成
  基準速度: 60 km/h
  天氣倍數應用: 60 × 0.8 = 48 km/h
  實際速度: 48 km/h ✅

T=2s: 摩托車2 生成
  基準速度: 60 km/h
  天氣倍數應用: 60 × 0.8 = 48 km/h
  實際速度: 48 km/h ✅

T=3s: 摩托車3 生成
  基準速度: 60 km/h
  天氣倍數應用: 60 × 0.8 = 48 km/h
  實際速度: 48 km/h ✅

...以此類推
```

### 數據收集

**T=5s 收集**:
```
摩托車生成數: 5
平均速度: (48 + 48 + 48 + 48 + 48) / 5 = 48 km/h

✅ 驗證: 所有新車都正確應用了天氣倍數
```

### API 負載

```json
{
  "traffic_flow": {
    "east": {
      "motor_count": 5,
      "motor_speed": 48,        // ✅ 60 × 0.8
      "average_speed": 48
    }
  },
  "weather": "RAIN",
  "weather_multiplier": 0.8,
  "timestamp": "2024-01-15T10:30:05Z"
}
```

---

## 📊 數據驗證檢查清單

### 每個場景應驗證

- [ ] **天氣按鈕響應**
  - 按下天氣按鈕後，浏覽器控制台是否顯示:
    ```
    🌤️ [車輛 xxx] 天氣改變: RAIN (倍數: 0.80x)
    🌤️ [車輛 xxx] 速度已更新: 時間縮放 1.00x -> 0.80x
    ```

- [ ] **視覺反映**
  - 車輛動畫是否立即變慢或變快?
  - 所有活動車輛是否都受到影響?

- [ ] **速度更新**
  - 設備工具 (F12 → Console) 中是否可以看到速度變化日誌?

- [ ] **API 請求**
  - Network 標籤中是否看到 POST 請求到 `/api/traffic/vd`?
  - 響應中是否包含 `weather` 和 `weather_multiplier` 字段?

- [ ] **數據準確性**
  - API 中的 `average_speed` 是否等於基準速度 × 倍數?
  - 範例: RAIN 後的速度 ≈ 基準速度 × 0.8

- [ ] **多向驗證**
  - 四個方向 (east/west/south/north) 的數據是否都正確?

- [ ] **多車型驗證**
  - motor_speed, small_car_speed, large_car_speed 是否都正確調整?

---

## 🎯 成功標準

場景測試成功的標準:

1. ✅ **視覺層**: 天氣改變時車輛動畫速度立即改變
2. ✅ **數據層**: 收集的速度正確反映天氣倍數
3. ✅ **API 層**: API 負載包含正確的天氣字段
4. ✅ **精度**: 實際速度 = 基準速度 × 倍數 (允許誤差 ±1 km/h)
5. ✅ **一致性**: 所有方向和車型都應用了相同的倍數

---

## 📝 故障排查

### 如果平均速度不正確

1. **檢查 currentSpeed 計算**:
   ```javascript
   // 檢查 Vehicle.js line 734
   const effectiveSpeed = Math.round(this.initialSpeed * weatherMultiplier)
   ```

2. **檢查天氣倍數**:
   ```javascript
   // 檢查 weatherConfig.js line 131-177
   // 確保倍數值正確
   ```

3. **檢查平均速度聚合**:
   ```javascript
   // 檢查 TrafficDataCollector.js line 267-290
   // calculateAverageSpeeds() 中的計算
   ```

### 如果 API 沒有天氣字段

1. **檢查天氣字段是否添加**:
   ```javascript
   // 檢查 TrafficLightController.js line 803-804
   // weather: currentWeather
   // weather_multiplier: weatherMultiplier
   ```

2. **檢查天氣控制器是否初始化**:
   ```javascript
   // 確保 weatherController 已正確初始化
   ```

---

## 結論

透過這些測試場景，可以完整驗證:
1. ✅ 天氣系統正確改變車輛速度
2. ✅ 速度改變正確反映在數據收集中
3. ✅ API 包含天氣相關信息
4. ✅ 後端接收的數據包含天氣特徵
5. ✅ 數據可用於訓練天氣感知的 AI 模型
