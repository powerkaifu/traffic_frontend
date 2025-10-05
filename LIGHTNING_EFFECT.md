# 大雨閃電效果實現

## 功能說明

為大雨天氣效果添加了閃電動畫，模擬雷雨交加的真實感受。當使用者選擇「大雨」天氣時，畫面會隨機出現閃電閃爍效果。

## 效果特點

### 🌩️ 閃電動畫
- **隨機觸發**：閃電在 3-8 秒之間隨機間隔出現
- **快速閃爍**：閃光持續時間僅 0.2 秒，模擬真實閃電
- **雙重閃電**：30% 機率觸發雙重閃光（連續閃兩次）
- **自然過渡**：使用 GSAP 動畫實現流暢的淡入淡出效果

### 視覺設計
- **顏色**：半透明白色 `rgba(255, 255, 255, 0.4)`
- **覆蓋全屏**：閃電圖層覆蓋整個畫面，營造真實感
- **不影響互動**：使用 `pointer-events: none` 確保不阻擋用戶操作
- **層級管理**：z-index 設為 1001，位於天氣效果之上

## 技術實現

### 1. 配置文件更新（weatherConfig.js）

在 `RAIN_CONFIG` 中新增閃電效果配置：

```javascript
LIGHTNING: {
  ENABLED: true,              // 是否啟用閃電效果
  MIN_INTERVAL: 3,            // 最短間隔 3 秒
  MAX_INTERVAL: 8,            // 最長間隔 8 秒
  FLASH_DURATION: 0.2,        // 閃光持續 0.2 秒
  FLASH_COLOR: 'rgba(255, 255, 255, 0.4)', // 半透明白色
  DOUBLE_FLASH_CHANCE: 0.3,   // 30% 雙重閃電機率
  DOUBLE_FLASH_DELAY: 0.15,   // 雙重閃電間隔 0.15 秒
}
```

### 2. WeatherController 類擴展

#### 新增屬性
```javascript
this.lightningInterval = null  // 閃電定時器
this.lightningLayer = null     // 閃電圖層元素
```

#### 新增方法

**createLightning()**
- 創建閃電圖層並添加到天氣容器
- 啟動閃電循環調度

**scheduleLightning()**
- 計算隨機間隔時間
- 使用 setTimeout 安排下一次閃電
- 自動循環觸發

**triggerLightning()**
- 執行單次閃電動畫（淡入淡出）
- 30% 機率觸發雙重閃電效果
- 完成後自動安排下一次閃電

### 3. 動畫流程

```
大雨天氣啟動
    ↓
創建雨滴效果
    ↓
創建閃電圖層 (opacity: 0)
    ↓
安排首次閃電 (3-8秒後)
    ↓
╔═══════════════╗
║ 閃電循環開始   ║
╚═══════════════╝
    ↓
等待隨機間隔時間
    ↓
觸發閃電動畫:
  - opacity: 0 → 1 (0.06秒)
  - opacity: 1 → 0 (0.14秒)
    ↓
判斷是否雙重閃電 (30%機率)
    ├─ 是 → 0.15秒後再閃一次
    └─ 否 → 直接進入下一步
    ↓
安排下一次閃電 (3-8秒後)
    ↓
回到「等待隨機間隔時間」
```

### 4. 清理機制

- **切換天氣時**：`clearWeather()` 清除定時器和圖層引用
- **銷毀系統時**：`destroy()` 確保所有資源被釋放
- **防止記憶體洩漏**：切換天氣前必定清除舊的定時器

## 代碼示例

### 觸發閃電動畫
```javascript
triggerLightning() {
  if (!this.lightningLayer) return

  const config = RAIN_CONFIG.LIGHTNING

  // 單次閃電
  gsap.to(this.lightningLayer, {
    opacity: 1,
    duration: config.FLASH_DURATION * 0.3,  // 快速淡入
    ease: 'power2.in',
    onComplete: () => {
      gsap.to(this.lightningLayer, {
        opacity: 0,
        duration: config.FLASH_DURATION * 0.7,  // 較慢淡出
        ease: 'power2.out',
      })
    },
  })

  // 30% 機率雙重閃電
  if (Math.random() < config.DOUBLE_FLASH_CHANCE) {
    setTimeout(() => {
      // 第二次閃電...
    }, config.DOUBLE_FLASH_DELAY * 1000)
  }

  // 安排下一次
  this.scheduleLightning()
}
```

## 使用方式

1. 點擊天氣按鈕
2. 選擇「大雨」⛈️
3. 畫面會同時出現：
   - 密集的雨滴動畫
   - 隨機的閃電效果

## 自定義配置

可以在 `weatherConfig.js` 中調整閃電效果：

```javascript
// 更頻繁的閃電
MIN_INTERVAL: 2,
MAX_INTERVAL: 5,

// 更強烈的閃光
FLASH_COLOR: 'rgba(255, 255, 255, 0.6)',

// 更高的雙重閃電機率
DOUBLE_FLASH_CHANCE: 0.5,

// 關閉閃電效果
ENABLED: false,
```

## 性能考量

- 使用單一 DOM 元素（閃電圖層）而非多個元素
- GSAP 硬件加速的 opacity 動畫，性能優異
- 定時器在切換天氣時立即清除，不會累積
- 不影響雨滴粒子的性能

## 修改的檔案

1. **src/classes/config/weatherConfig.js** (+11 行)
   - 新增 `RAIN_CONFIG.LIGHTNING` 配置

2. **src/classes/WeatherController.js** (+122 行)
   - 新增閃電相關屬性和方法
   - 更新清理邏輯

## 測試建議

1. 啟動開發伺服器：`npm run dev`
2. 選擇「大雨」天氣
3. 觀察閃電效果：
   - ✓ 是否在 3-8 秒間隔內隨機出現
   - ✓ 閃光是否快速且自然
   - ✓ 偶爾出現雙重閃電
4. 切換到其他天氣，確認閃電停止
5. 再次切換回大雨，確認閃電重新開始

## 視覺效果預期

```
場景：城市十字路口 + 大雨天氣

┌─────────────────────────────┐
│  ⚡ 閃!（0.2秒白光）        │
│  🌧️🌧️🌧️🌧️🌧️🌧️🌧️      │
│  🌧️🌧️🌧️🌧️🌧️🌧️🌧️      │
│    🚗  ═══╦═══  🚙          │
│  🌧️  ║   ║   ║  🌧️        │
│  🌧️  ║   ║   ║  🌧️        │
│      ═══╩═══              │
│  🌧️🌧️🌧️🌧️🌧️🌧️🌧️      │
└─────────────────────────────┘
    ↓ (3-8秒後)
┌─────────────────────────────┐
│  ⚡⚡ 閃閃!（雙重閃電）      │
│  🌧️🌧️🌧️🌧️🌧️🌧️🌧️      │
│  ...                        │
└─────────────────────────────┘
```

雷雨交加的真實感！🌩️⛈️
