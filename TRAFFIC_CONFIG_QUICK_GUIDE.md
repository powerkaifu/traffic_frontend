# 🚗 交通流量參數快速調整指南

## 📋 文件位置

- **配置文件**：`src/classes/config/trafficScenarioConfig.js`

---

## 🎯 三大常調整參數（優先級從高到低）

### 1️⃣ **vehiclesPerInterval** - 👑 最常調整

```javascript
vehiclesPerInterval: { min: 5, max: 10 }  // 尖峰時段
vehiclesPerInterval: { min: 1, max: 2 }   // 離峰時段
vehiclesPerInterval: { min: 1, max: 1 }   // 凌晨時段
```

**效果**：每個生成間隔生成幾台車（**直接改變密度**）

- ⬆️ 增加數字 = 車流變多
- ⬇️ 減少數字 = 車流變少

**快速調整建議**：

- 想要 2 倍密度？改 {5,10} → {10,20}
- 想要 0.5 倍密度？改 {5,10} → {2.5,5}

---

### 2️⃣ **peakMultiplier** - 次常調整

```javascript
peakMultiplier: 3.2 // 尖峰時段
peakMultiplier: 2.0 // 離峰時段
peakMultiplier: 0.95 // 凌晨時段
```

**效果**：強度倍數（**控制生成頻率**）

**計算公式**：實際間隔 = `interval.normal / peakMultiplier`

| peakMultiplier | 實際間隔          | 說明         |
| -------------- | ----------------- | ------------ |
| 2.0            | 5800/2.0 = 2900ms | 生成速度較慢 |
| 3.0            | 5800/3.0 = 1933ms | 生成速度中等 |
| 4.0            | 5800/4.0 = 1450ms | 生成速度很快 |

**快速調整建議**：

- 想要密度增加 20%？改 3.2 → 3.8
- 想要密度減少 20%？改 3.2 → 2.6

---

### 3️⃣ **interval.normal** - 補充調整

```javascript
interval: { min: 500, max: 5000, normal: 1000 }   // 尖峰時段
interval: { min: 4500, max: 17000, normal: 5800 } // 離峰時段
```

**效果**：生成間隔基準值（通常不改）

---

## 🔧 次級調整參數

### 4️⃣ **displayMultiplier** - 視覺倍數

```javascript
displayMultiplier: 7 // 尖峰時段
displayMultiplier: 3 // 離峰時段
displayMultiplier: 1.5 // 凌晨時段
```

**效果**：前端動畫放大倍數（**視覺感受**，不影響實際流量）

---

### 5️⃣ **vehicleTypes** - 車型比例

```javascript
vehicleTypes: [
  { type: 'motor', weight: 38 }, // 機車比例
  { type: 'small', weight: 58 }, // 小客車比例
  { type: 'large', weight: 4 }, // 大客車比例
]
```

**效果**：改變車型組成（**可見性調整**）

---

## 🔐 系統參數（很少調整）

### maxLiveVehicles - 最大同時車輛數

```javascript
maxLiveVehicles: 55 // 尖峰時段
maxLiveVehicles: 35 // 離峰時段
maxLiveVehicles: 12 // 凌晨時段
```

**效果**：屏幕上最多同時顯示的車輛數

---

## 💡 常見場景調整方案

### 📊 場景 1：想要 2 倍的尖峰車流密度

```javascript
// 方案 A：改 vehiclesPerInterval
vehiclesPerInterval: { min: 5, max: 10 } → { min: 10, max: 20 }

// 方案 B：改 peakMultiplier
peakMultiplier: 3.2 → 6.4

// 推薦：方案 A（更直接）
```

---

### 📊 場景 2：想要減少一半的尖峰車流

```javascript
// 方案 A：改 vehiclesPerInterval
vehiclesPerInterval: { min: 5, max: 10 } → { min: 2.5, max: 5 }

// 方案 B：改 peakMultiplier
peakMultiplier: 3.2 → 1.6

// 推薦：方案 A（更直接）
```

---

### 📊 場景 3：微調離峰時段密度

```javascript
// 輕微增加（約 10%）
peakMultiplier: 2.0 → 2.1

// 輕微減少（約 10%）
peakMultiplier: 2.0 → 1.9

// 推薦：用 peakMultiplier 做微調
```

---

## 🎮 實時調整測試步驟

1. 打開 Chrome DevTools（F12）
2. 進入 Console 頁籤
3. 找到對應時段的配置並修改
4. 刷新頁面觀看效果
5. 滿意後將參數寫回 `trafficScenarioConfig.js`

---

## ⚡ 我之前做的改動

### AutoTrafficGenerator.js 中的動態限制調整

**原本限制**（硬編碼）：

- 500ms 內最多 3 輛車
- 2秒內最多 8 輛車

**改為動態**：

- 500ms 內最多：`max(5, vehiclesPerInterval.max × 1.5)` 輛
- 2秒內最多：`max(15, vehiclesPerInterval.max × 2)` 輛

**好處**：系統自動適應 `vehiclesPerInterval` 的設定，不需手動調整限制值

---

## 📞 快速參考

| 要做什麼        | 改哪個參數                                | 改多少   |
| --------------- | ----------------------------------------- | -------- |
| 🔼 增加車流密度 | `vehiclesPerInterval` 或 `peakMultiplier` | ⬆️ 增大  |
| 🔽 減少車流密度 | `vehiclesPerInterval` 或 `peakMultiplier` | ⬇️ 減小  |
| 🎨 改變車型比例 | `vehicleTypes[].weight`                   | 調整權重 |
| 📐 改變視覺效果 | `displayMultiplier`                       | 調整倍數 |
| 🔒 限制最大車數 | `maxLiveVehicles`                         | 很少改   |

---

**祝您調試愉快！** 🚗✨
