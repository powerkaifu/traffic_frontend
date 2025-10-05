# 天氣切換問題修復

## 問題描述

### 問題 1：無法切換回晴天
無法直接切換成下一個天氣效果。當使用者點擊已啟用的天氣選項時，無法關閉該效果。

### 問題 2：切換天氣後無動畫效果
第一次點擊雨天有動畫效果，但再點其它的（例如雪天），就沒有動畫效果。

## 根本原因

### 問題 1 的原因
在 `WeatherController.js` 的 `changeWeather()` 方法中，當點擊的天氣類型與當前天氣相同時，會直接返回不做任何處理：

```javascript
// 原本的邏輯
if (this.currentWeather === weatherType) {
  console.log(`🌤️ 天氣已經是 ${weatherType}，無需切換`)
  return  // 直接返回，不處理
}
```

這導致使用者無法透過再次點擊相同的天氣選項來關閉天氣效果。

### 問題 2 的原因
在 `clearWeather()` 方法中，清除天氣效果時會將 `weatherLayer` 的 opacity 動畫到 0：

```javascript
gsap.to(this.weatherLayer, {
  opacity: 0,
  duration: TRANSITION_CONFIG.FADE_DURATION,
  onComplete: () => {
    this.weatherLayer.innerHTML = ''
    // ❌ 問題：沒有重置 opacity
  }
})
```

清除完成後沒有將 opacity 重置回 1。當下一次創建新天氣效果時，雖然子元素（如 rainContainer、snowContainer）有淡入動畫，但父容器 `weatherLayer` 的 opacity 仍然是 0，導致看不到任何效果。

## 解決方案

### 1. 修改 WeatherController.js - changeWeather() 方法

新增切換邏輯，當點擊已啟用的天氣效果時，自動切換回晴天（CLEAR）：

```javascript
// 如果點擊當前已啟用的天氣，則切換回晴天（關閉效果）
if (this.currentWeather === weatherType && weatherType !== WEATHER_TYPES.CLEAR) {
  console.log(`🌤️ 關閉天氣效果：${weatherType} -> ${WEATHER_TYPES.CLEAR}`)
  weatherType = WEATHER_TYPES.CLEAR
}

// 如果已經是目標天氣，無需切換
if (this.currentWeather === weatherType) {
  console.log(`🌤️ 天氣已經是 ${weatherType}，無需切換`)
  return
}
```

### 2. 修改 WeatherController.js - clearWeather() 方法

在清除完成後重置 `weatherLayer` 的 opacity：

```javascript
gsap.to(this.weatherLayer, {
  opacity: 0,
  duration: TRANSITION_CONFIG.FADE_DURATION,
  onComplete: () => {
    if (this.weatherLayer) {
      this.weatherLayer.innerHTML = ''
      // ✅ 重置 opacity 為 1，以便下次天氣效果可以正常顯示
      gsap.set(this.weatherLayer, { opacity: 1 })
    }
    this.particles = []
    this.isActive = false
    resolve()
  }
})
```

### 3. 修改 IndexPage.vue

更新 `changeWeather()` 函數，從控制器獲取實際的當前天氣狀態：

```javascript
// 修改前
currentWeather.value = weatherType

// 修改後
currentWeather.value = weatherController.getCurrentWeather()
```

這樣可以正確反映控制器內部的天氣切換邏輯（包括切換回晴天的行為）。

同時更新通知訊息和日誌，使用實際的天氣狀態而非傳入的參數：

```javascript
const option = weatherOptions.value.find((w) => w.type === currentWeather.value)
window.$q.notify({
  message: `天氣已切換至 ${option ? option.label : currentWeather.value}`,
  icon: option ? option.icon : '🌤️',
})
console.log(`🌤️ 天氣已切換至 ${currentWeather.value}`)
```

## 新的使用者體驗

### 切換天氣效果：
1. 點擊「雨天」→ 啟用雨天效果 ☔（有淡入動畫）
2. 點擊「霧天」→ 切換到霧天效果 🌫️（有淡入動畫）
3. 點擊「雪天」→ 切換到雪天效果 ❄️（有淡入動畫）
4. 點擊「雪天」（再次點擊）→ 關閉雪天，回到晴天 ☀️（有淡出動畫）
5. 點擊「晴天」→ 保持晴天（無變化）

### 測試案例：

| 當前天氣 | 點擊天氣 | 結果 | 動畫效果 |
|---------|---------|------|----------|
| 晴天 | 雨天 | 雨天 | ✓ 淡入動畫 |
| 雨天 | 雪天 | 雪天 | ✓ 淡出+淡入動畫 |
| 雪天 | 霧天 | 霧天 | ✓ 淡出+淡入動畫 |
| 霧天 | 霧天 | 晴天 | ✓ 淡出動畫 |
| 雨天 | 雨天 | 晴天 | ✓ 淡出動畫 |
| 晴天 | 晴天 | 晴天 | - 無變化 |

## 修改的檔案

1. **src/classes/WeatherController.js**
   - `changeWeather()` 方法：新增切換邏輯（+7 行）
   - `clearWeather()` 方法：新增 opacity 重置（+2 行）
   
2. **src/pages/IndexPage.vue**
   - `changeWeather()` 函數：更新狀態同步邏輯（修改 4 處）

## 技術細節

### opacity 重置的重要性

GSAP 動畫會修改元素的內聯樣式。當 `gsap.to()` 將 opacity 設置為 0 後，這個值會保留在元素上：

```html
<!-- 清除後的狀態 -->
<div class="weather-layer" style="opacity: 0;">
  <!-- 內容已清空 -->
</div>
```

即使清空了內容並添加新的子元素，父容器的 opacity 仍然是 0，導致子元素不可見。

使用 `gsap.set()` 重置 opacity 確保下一次天氣效果可以正常顯示：

```html
<!-- 重置後的狀態 -->
<div class="weather-layer" style="opacity: 1;">
  <!-- 準備接收新的天氣效果 -->
</div>
```

## 測試建議

1. 啟動開發伺服器：`npm run dev`
2. 開啟瀏覽器，進入交通模擬頁面
3. 測試各種天氣切換場景：
   - ✅ 從晴天切換到各種天氣效果（驗證淡入動畫）
   - ✅ 在不同天氣效果之間切換（驗證淡出+淡入動畫）
   - ✅ 再次點擊相同的天氣效果（驗證關閉動畫）
   - ✅ 連續快速切換多個天氣效果（驗證動畫流暢性）
