# 🚗 車道車輛限制動態調整機制 - 詳解

**日期**: 2025年11月9日
**相關檔案**: `src/pages/IndexPage.vue` Lines 405-465
**功能**: 根據 API 佔有率動態調整每車道的最大車輛數

---

## 🤔 問題陳述

用戶報告看到這樣的消息：

```
所有車道已滿 (車道2: 3輛, 車道3: 3輛, 車道4: 3輛)，已達到每車道 3 輛的上限，暫停生成新車輛
```

用戶疑惑：「為什麼是 3 輛，而不是配置中設定的 6 輛？」

---

## ✅ 根本原因

**這不是 bug，而是設計特性！** 🎯

每車道的最大車輛數是根據 **當前 API 佔有率 (Occupancy)** 動態調整的，目的是：

- 模擬真實交通狀況
- 確保前端動畫和後端 API 數據的一致性
- 在低流量時期避免過度生成車輛

---

## 📊 動態調整邏輯

### 佔有率級別與車道限制對應表

| 佔有率範圍 | 每車道最大車輛數 | 描述          | 總方向最大 (×4) |
| ---------- | ---------------- | ------------- | --------------- |
| 0-20%      | 3 輛             | 🟢 低流量期間 | 12 輛           |
| 20-50%     | 4 輛             | 🟡 中等流量   | 16 輛           |
| 50-80%     | 5 輛             | 🟠 高流量     | 20 輛           |
| 80-100%    | 6 輛             | 🔴 極高流量   | 24 輛           |

### 代碼實現

**IndexPage.vue Lines 410-426**:

```javascript
// 根據佔有率動態計算最大車道車輛數
// 0-20%: 3輛, 20-50%: 4輛, 50-80%: 5輛, 80-100%: 6輛
if (occupancy < 20) {
  MAX_VEHICLES_PER_LANE = 3 // 🟢 低流量
} else if (occupancy < 50) {
  MAX_VEHICLES_PER_LANE = 4 // 🟡 中等
} else if (occupancy < 80) {
  MAX_VEHICLES_PER_LANE = 5 // 🟠 高流量
} else {
  MAX_VEHICLES_PER_LANE = 6 // 🔴 極高流量
}
```

### 數據流向

```
1️⃣ TrafficLightController 發送 API 請求
   ↓
2️⃣ 後端返回 API 數據，包含 Occupancy (佔有率)
   ↓
3️⃣ SimulationStore.setLastApiVDDataArray(data)
   保存數據：包含各方向的 occupancy
   ↓
4️⃣ IndexPage.setupStraightLane(direction)
   讀取 lastApiData：const apiData = lastApiData[dirIndex]
   提取 occupancy：const occupancy = apiData.Occupancy || 0
   ↓
5️⃣ 動態計算 MAX_VEHICLES_PER_LANE
   ↓
6️⃣ 檢查各車道是否有空位
   const availableLanes = laneCounts.filter((lane) => lane.count < MAX_VEHICLES_PER_LANE)
   ↓
7️⃣ 如果沒有可用車道，暫停生成
   console.warn(`已達到每車道 ${MAX_VEHICLES_PER_LANE} 輛的上限`)
```

---

## 📈 為什麼要這樣設計？

### 1. **保持數據一致性**

- 前端動畫的車輛數應該反映後端 API 數據的密度
- API 佔有率 10% = 車輛稀疏，不應該有太多車
- API 佔有率 90% = 車輛擁擠，可以有更多車

### 2. **模擬真實交通**

```
低流量時期（佔有率 < 20%）
├─ 道路暢通，車輛稀少
├─ 每車道 3 輛 × 4 車道 = 12 輛/方向
└─ 總共 48 輛車在整個交叉路口

高流量時期（佔有率 > 80%）
├─ 道路擁擠，車輛密集
├─ 每車道 6 輛 × 4 車道 = 24 輛/方向
└─ 總共 96 輛車在整個交叉路口
```

### 3. **防止過度生成**

- 避免在低流量時期無故堆積車輛
- 在正確的時間暫停生成，讓現有車輛通行
- 確保 CPU 和內存效率

---

## 🔍 具體案例分析

### 案例：為什麼現在是 3 輛/車道？

根據代碼邏輯：

```javascript
if (occupancy < 20) {
  MAX_VEHICLES_PER_LANE = 3 // ← 你看到的限制
}
```

**這意味著當前的 API 佔有率是：0-20% 範圍內**

可能的原因：

1. ✅ 模擬時間是凌晨或午夜（流量低）
2. ✅ 選擇了「晚間」或「凌晨」場景
3. ✅ 交通流量檢測值較低
4. ✅ 系統剛啟動，還沒有積累足夠的車輛

### 如果想要每車道 6 輛

需要提高 API 佔有率到 **80% 以上**：

```javascript
// 當 occupancy >= 80 時：
if (occupancy < 20) {
  MAX_VEHICLES_PER_LANE = 3
} else if (occupancy < 50) {
  MAX_VEHICLES_PER_LANE = 4
} else if (occupancy < 80) {
  MAX_VEHICLES_PER_LANE = 5
} else {
  // ← 這裡
  MAX_VEHICLES_PER_LANE = 6
}
```

---

## 🛠️ 相關配置位置

### 1. 基礎配置（vehicleConfig.js）

```javascript
// 預設值（未動態調整時使用）
export const GENERATION_CONFIG = {
  MAX_VEHICLES_PER_LANE: 6, // 預設 6 輛/車道
}
```

### 2. 動態調整代碼（IndexPage.vue）

```vue
<script setup>
// 第一步：初始化為預設值
let MAX_VEHICLES_PER_LANE = GENERATION_CONFIG.MAX_VEHICLES_PER_LANE || 6

// 第二步：根據 API 數據調整
try {
  const lastApiData = store.getLastApiVDDataArray()
  if (lastApiData && Array.isArray(lastApiData)) {
    // ... 提取 occupancy
    // ... 根據 occupancy 範圍調整 MAX_VEHICLES_PER_LANE
  }
} catch (error) {
  // 出錯時保持預設值 6
}
</script>
```

### 3. 車道選擇邏輯（IndexPage.vue Lines 445-465）

```javascript
// 檢查車輛是否已滿
const availableLanes = laneCounts.filter((lane) => lane.count < MAX_VEHICLES_PER_LANE)

if (availableLanes.length === 0) {
  // 所有車道都滿了，暫停生成
  console.warn(`⚠️ [車道限制] 已達到每車道 ${MAX_VEHICLES_PER_LANE} 輛的上限`)
  return null
}
```

---

## 🎯 驗證方法

### 方法 1：檢查控制台輸出

打開瀏覽器開發者工具 (F12)，查看 Console 中的消息：

```
✅ 正常生成: "🚗 [直行車輛] 選擇車道 3"

⚠️ 達到限制: "⚠️ [車道限制] 東方所有車道已滿 (車道2: 3輛, 車道3: 3輛, 車道4: 3輛)，已達到每車道 3 輛的上限"
```

### 方法 2：檢查 API 佔有率

在 Console 執行：

```javascript
// 查看當前 API 數據
const store =
  window.__SIMULATOR_STORE__ ||
  (() => {
    // 嘗試獲取 Pinia store
    const app = document.getElementById('app')?.__vue_app__
    return app?.config.globalProperties?.$pinia?.state.value?.simulationStore
  })()

const apiData = store?.getLastApiVDDataArray?.()
console.log('API 數據:', apiData)
apiData?.forEach((data, index) => {
  console.log(`方向 ${index}: 佔有率=${data.Occupancy}%`)
})
```

**輸出例:**

```
方向 0: 佔有率=8%    ← 低於 20% → MAX = 3 輛
方向 1: 佔有率=15%   ← 低於 20% → MAX = 3 輛
方向 2: 佔有率=12%   ← 低於 20% → MAX = 3 輛
方向 3: 佔有率=9%    ← 低於 20% → MAX = 3 輛
```

### 方法 3：主動增加流量

1. 選擇「尖峰時段」場景
2. 或手動調整車生成頻率到最高
3. 觀察 API 佔有率是否上升
4. 確認 MAX_VEHICLES_PER_LANE 是否相應提高

---

## 💡 常見問題

### Q1: 為什麼總是 3 輛？

**A**: 檢查當前的 API 佔有率。如果一直是 0-20% 之間，就會一直是 3 輛。

**解決方案**:

- 切換到「尖峰時段」場景
- 增加車輛生成頻率
- 等待系統運行更久，讓佔有率上升

### Q2: 能否禁用這個動態調整？

**A**: 可以。修改 IndexPage.vue Line 410-426，移除這段代碼：

```javascript
// 改為直接使用預設值，不動態調整
// let MAX_VEHICLES_PER_LANE = GENERATION_CONFIG.MAX_VEHICLES_PER_LANE || 6
// 註釋掉下面的 try-catch 塊

// 或者固定值：
const MAX_VEHICLES_PER_LANE = 6 // 永遠是 6
```

### Q3: 如何提高到 6 輛/車道？

**A**: 需要達到 **80% 以上的佔有率**。方法：

1. ✅ 選擇「尖峰時段」
2. ✅ 將生成間隔設置到最短（接近 0.5 秒）
3. ✅ 等待系統運行，佔有率會逐漸上升

---

## 📝 相關代碼文件

| 檔案位置                              | 功能         | 關鍵行                          |
| ------------------------------------- | ------------ | ------------------------------- |
| `src/classes/config/vehicleConfig.js` | 定義基礎配置 | L335 `MAX_VEHICLES_PER_LANE: 6` |
| `src/pages/IndexPage.vue`             | 實現動態調整 | L410-426                        |
| `src/pages/IndexPage.vue`             | 檢查車道容量 | L455, L461                      |
| `src/layouts/MainLayout.vue`          | 選擇場景     | L125-149 (VD 場景按鈕)          |

---

## 🎉 總結

✅ **這是正常行為，不是 bug**

- ✅ 每車道的最大車輛數會根據 API 佔有率動態調整
- ✅ 低流量 (0-20%) → 3 輛/車道
- ✅ 高流量 (80-100%) → 6 輛/車道
- ✅ 這是為了確保前端動畫與後端數據一致

**當前顯示 3 輛/車道是因為佔有率較低 (< 20%)**

要提高到 6 輛/車道，需要：

1. 提高生成頻率
2. 選擇尖峰時段
3. 等待佔有率上升到 80% 以上
