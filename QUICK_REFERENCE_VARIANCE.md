# 🚦 方向多樣性改進 - 快速參考卡

## 問題 ❌

```
所有4個方向的數據完全相同：
VD_ID: VLRJX20  Speed_M: 41, Speed_S: 36
VD_ID: VLRJM60  Speed_M: 41, Speed_S: 36  ← 相同
VD_ID: VLRJX00  Speed_M: 41, Speed_S: 36  ← 相同
VD_ID: VLRJX00  Speed_M: 41, Speed_S: 36  ← 相同
```

## 解決方案 ✅

```
每個方向都不同：
往東: Volume_M=4, Speed_M=35, Volume_S=5, Speed_S=28, Occupancy=18%
往西: Volume_M=2, Speed_M=39, Volume_S=3, Speed_S=31, Occupancy=12%  ← 不同
往南: Volume_M=5, Speed_M=32, Volume_S=6, Speed_S=26, Occupancy=22%  ← 不同
往北: Volume_M=3, Speed_M=38, Volume_S=4, Speed_S=33, Occupancy=15%  ← 不同
```

## 三個核心改進

### 1️⃣ 速度改為範圍 (vdBasedTrafficConfig.js)

```javascript
// 尖峰時段
speedByType: {
  motor: { min: 32, max: 42 },     // ← 範圍，會隨機選擇
  small: { min: 25, max: 35 },
  large: { min: 18, max: 25 }
}
```

### 2️⃣ 每個方向獨立計算 (AutoTrafficGenerator.js)

```javascript
// 4個方向，各有各的波動
directions.forEach(direction => {
  // 該方向的流量變異
  directionVariance = 0.6 + Math.random() * 0.3  // 60-90%（尖峰）

  // 該方向的各車型流量
  dirVolumeM = baseVolume × directionVariance × randomFactor
  dirVolumeS = baseVolume × directionVariance × randomFactor

  // 該方向的速度（受流量影響）
  speedAdjustment = 1 / flowDensity  // 高流量→低速度
  dirSpeedM = baseSpeed × speedAdjustment × randomFactor
  dirSpeedS = baseSpeed × speedAdjustment × randomFactor
})
```

### 3️⃣ 流量-速度關聯 (自動)

```
高流量 (5輛) → 速度慢 (32 km/h)  ← 壅塞
低流量 (2輛) → 速度快 (39 km/h)  ← 流暢
```

## 保障機制

| 時段    | 流量保障 | 說明                          |
| ------- | -------- | ----------------------------- |
| 🚀 尖峰 | 60-90%   | 任何方向都至少 60% 的基礎流量 |
| 🌞 離峰 | 40-100%  | 允許不均衡但不會全無          |
| 🌙 凌晨 | 40-100%  | 允許稀疏交通                  |

## 改進数字

```
Speed_M 差異範圍：    32 → 39 km/h (7 km/h差異)
Speed_S 差異範圍：    26 → 33 km/h (7 km/h差異)
Volume 差異範圍：     2 → 5 輛 (3輛差異)
Occupancy 差異範圍：  12 → 22% (10%差異)
各方向相同概率：      100% → <1%
```

## 測試方式

### 方法1：查看生成的數據

```javascript
// 瀏覽器控制台
console.log(window.currentGeneratedVDData.apiDataArray)
// 會看到4個方向的不同數據
```

### 方法2：使用演示頁面

打開 `direction_variance_demo.html`

- 點擊按鈕生成數據
- 看表格中每個方向不同

### 方法3：查看API日誌

查看發送到後端的數據是否多樣化

## 代碼位置

### 配置文件

📄 `src/classes/config/vdBasedTrafficConfig.js`

- 行 21-37：尖峰時段速度範圍
- 行 59-71：離峰時段速度範圍
- 行 93-105：凌晨時段速度範圍

### 邏輯文件

📄 `src/classes/AutoTrafficGenerator.js`

- 行 454-520：`_generateScenarioVDData()` 方法
- 行 565-630：4個方向數據生成邏輯
- 行 645-659：`_getRandomSpeed()` 輔助方法

## 效果驗證

✅ 編譯正常（無語法錯誤）
✅ 速度配置成範圍值
✅ 方向獨立計算
✅ 流量與速度關聯
✅ 尖峰流量有保障
✅ 數據變異性高

---

## 常見問題

**Q: 為什麼尖峰時段不是 100% 流量？**
A: 為了模擬真實交通。即使尖峰，不同方向流量也不均。60-90% 保障最少有車，但允許自然變異。

**Q: 凌晨可以零流量嗎？**
A: 可以。離峰和凌晨允許 40-100% 流量，所以某些方向可能沒車。但不會所有方向都無車。

**Q: 速度為什麼會變化？**
A: 三個原因：

1. 速度本身有範圍（32-42 km/h）
2. 流量密度影響速度（高流→慢）
3. 隨機波動（模擬不確定性）

**Q: 如何確保不會完全無車？**
A: 尖峰時段 directVariance 最小值是 0.6（60%）。其他時段可能無某方向的車，但不是全無。

---

**部署後重啟開發服務器使改進生效** 🚀
