# ⚡ 天氣系統數據流快速參考

## 核心概念

天氣系統**不只是改變視覺**，而是**完整改變實際速度數據**在整個管道中的流動。

---

## 🎯 快速答案

### Q: 天氣是否會影響被收集的車輛數據?

**A: 是的，完全影響。✅**

### Q: 速度是如何受到影響的?

**A: 通過 GSAP timeScale 改變運動速度，從而改變 currentSpeed 值**

### Q: 後端是否會接收到天氣信息?

**A: 是的，包括 weather 和 weather_multiplier 字段**

### Q: 50週訓練數據是否能利用天氣特性?

**A: 是的，所有數據都包含天氣倍數信息可用於特徵工程**

---

## 📍 關鍵代碼位置

| 功能     | 文件                      | 行號    | 說明                                     |
| -------- | ------------------------- | ------- | ---------------------------------------- |
| 天氣切換 | WeatherController.js      | 62      | changeWeather() 方法                     |
| 事件廣播 | WeatherController.js      | 110-120 | broadcastWeatherChange()                 |
| 監聽註冊 | Vehicle.js                | 165-168 | 構造時註冊監聽器                         |
| 速度更新 | Vehicle.js                | 283-313 | onWeatherChanged() 更新 timeScale        |
| 速度計算 | Vehicle.js                | 731-734 | currentSpeed = initialSpeed × multiplier |
| 數據通知 | Vehicle.js                | 266     | 發送 currentSpeed 在事件中               |
| 數據接收 | TrafficDataCollector.js   | 149-156 | vehicleAddedListener 提取速度            |
| 速度聚合 | TrafficDataCollector.js   | 267-290 | calculateAverageSpeeds()                 |
| 數據收集 | TrafficLightController.js | 533     | collectIntersectionData()                |
| API 字段 | TrafficLightController.js | 803-804 | 添加 weather 和 weather_multiplier       |
| 配置     | weatherConfig.js          | 131-177 | WEATHER_SPEED_MULTIPLIERS                |

---

## 🔄 數據流簡圖

```
用戶點擊天氣按鈕
       ↓
WeatherController.changeWeather()
       ↓
廣播 'weatherChanged' 事件 (multiplier = 0.8)
       ↓
所有 Vehicle 監聽並更新 GSAP timeScale
       ↓
Vehicle.currentSpeed 自動改變 (50 → 40 km/h)
       ↓
Vehicle.notifyDataCollector() 發送新速度
       ↓
TrafficDataCollector 接收並存儲速度
       ↓
calculateAverageSpeeds() 計算平均速度 (已含天氣)
       ↓
TrafficLightController 收集數據
       ↓
API payload 包含 speed (已調整) + weather 字段
       ↓
後端接收完整天氣相關數據用於訓練
```

---

## 🎬 天氣倍數表

| 天氣類型   | 倍數  | 舊速度  | 新速度    |
| ---------- | ----- | ------- | --------- |
| CLEAR      | 1.0x  | 50 km/h | 50 km/h   |
| RAIN       | 0.8x  | 50 km/h | 40 km/h   |
| HEAVY_RAIN | 0.7x  | 50 km/h | 35 km/h   |
| FOG        | 0.75x | 50 km/h | 37.5 km/h |
| SNOW       | 0.6x  | 50 km/h | 30 km/h   |

---

## 📊 數據驗證檢查清單

- ✅ WeatherController 廣播 weatherChanged 事件
- ✅ Vehicle 監聽並更新 GSAP timeScale
- ✅ currentSpeed 反映新的 timeScale (initialSpeed × multiplier)
- ✅ notifyDataCollector() 包含調整後的 currentSpeed
- ✅ TrafficDataCollector 接收並存儲速度
- ✅ calculateAverageSpeeds() 使用所有速度計算平均值
- ✅ TrafficLightController 包含 weather 和 weather_multiplier 字段
- ✅ API 發送完整數據至後端

---

## 🧪 驗證方法

### 方法 1: 檢查控制台日誌

1. 點擊天氣按鈕 (例如 RAIN)
2. 打開瀏覽器控制台 (F12 → Console)
3. 查看日誌:
   ```
   🌤️ [車輛 xxx] 天氣改變: RAIN (倍數: 0.80x)
   🌤️ [車輛 xxx] 速度已更新: 時間縮放 1.00x -> 0.80x
   ```

### 方法 2: 檢查 API 請求

1. 打開開發者工具 (F12 → Network)
2. 點擊天氣按鈕
3. 查看 POST 請求至 `/api/traffic/vd`
4. 查看 Response 中是否包含:
   ```json
   {
     "weather": "RAIN",
     "weather_multiplier": 0.8,
     "traffic_flow": {
       "east": {
         "average_speed": 40 // 已調整的速度
       }
     }
   }
   ```

### 方法 3: 比較速度變化

1. 記錄晴天時的平均速度 (例如 50 km/h)
2. 切換到下雨 (multiplier = 0.8)
3. 新平均速度應約為 40 km/h (50 × 0.8)
4. 新平均速度應約為 35 km/h (50 × 0.7)

---

## 🎓 後端 AI 訓練建議

### 利用天氣數據的方式

```python
# 特徵工程示例
features = {
    'motor_count': 8,
    'small_car_count': 5,
    'average_speed': 40,      # 已包含天氣調整
    'weather': 'RAIN',        # 新特徵: 天氣類型
    'weather_multiplier': 0.8 # 新特徵: 天氣倍數
}

# 模型可以學習:
# - 雨天流量模式 (weather = 'RAIN')
# - 速度與天氣的關係 (天氣倍數影響實際行駛速度)
# - 天氣對不同車型的影響
```

### 數據集覆蓋

50 週的數據現在已包含:

- 晴天數據 (CLEAR, multiplier = 1.0x)
- 下雨數據 (RAIN, multiplier = 0.8x)
- 大雨數據 (HEAVY_RAIN, multiplier = 0.7x)
- 霧天數據 (FOG, multiplier = 0.75x)
- 下雪數據 (SNOW, multiplier = 0.6x)

這使 AI 模型可以學習**真實世界的天氣影響模式**。

---

## 🚀 結論

天氣系統是**端到端集成的**:

1. **視覺層** ✅ - 車輛動畫變快或變慢
2. **速度層** ✅ - currentSpeed 反映調整
3. **數據層** ✅ - 收集天氣調整的速度
4. **API 層** ✅ - 發送天氣相關字段
5. **訓練層** ✅ - 後端可用天氣特徵改進模型

**驗證完成**: ✅ 天氣影響的數據正確流向後端
