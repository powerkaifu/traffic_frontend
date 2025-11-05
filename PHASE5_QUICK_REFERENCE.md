# 🚀 Phase 5 - 快速參考指南 (Quick Reference)

## 📌 核心改動一覽表

### **3 個主要檔案 + 6 個新方法**

| 檔案                          | 方法                                 | 作用                 | 在哪調用                   |
| ----------------------------- | ------------------------------------ | -------------------- | -------------------------- |
| **CollisionController.js**    | `getStopLineCongestionRate(dir)`     | 計算擁塞率 (0.0-1.0) | TrafficLightController     |
|                               | `getVehiclesAtStopLine(dir)`         | 取得停止線前的車輛   | TrafficLightController     |
|                               | `getStopLineVehicleCount(dir)`       | 取得車輛數量         | 未使用 (輔助方法)          |
|                               | `_getStopLineLimit(dir)`             | 取得停止線限制值     | 內部使用                   |
| **TrafficLightController.js** | `predictDownstreamCongestion(phase)` | 預測下游擁塞率       | runCycle() 中              |
|                               | `adjustTimingBasedOnCongestion(...)` | 調整綠燈時間         | runCycle() 中              |
| **AutoTrafficGenerator.js**   | `getAdaptiveStopLineLimit(dir)`      | 動態計算停止線限制   | \_generateVehicle()        |
|                               | `_getOppositeDirection(dir)`         | 取得對向方向         | getAdaptiveStopLineLimit() |

---

## 🔧 使用例子

### **1️⃣ 查詢停止線擁塞率**

```javascript
// 在 CollisionController 中
const congestionRate = controller.getStopLineCongestionRate('east')
// 返回: 0.75 表示 75% 滿
```

### **2️⃣ 預測下游擁塞**

```javascript
// 在 TrafficLightController 中
const downstreamCongestion = await this.predictDownstreamCongestion('northSouth')
// 南北綠燈時，查詢東西向擁塞
// 返回: 0.85 表示東西向 85% 擁塞
```

### **3️⃣ 調整綠燈時間**

```javascript
// 在 TrafficLightController 中
const adjustedTiming = this.adjustTimingBasedOnCongestion(
  'northSouth',
  20, // 基礎綠燈 20 秒
  0.85, // 下游 85% 擁塞
)
// 返回: 10 表示縮短至 10 秒
```

### **4️⃣ 動態停止線限制**

```javascript
// 在 AutoTrafficGenerator 中
const adaptiveLimit = this.getAdaptiveStopLineLimit('south')
// 如果北向 80% 滿，返回: 15
// 如果北向 30% 滿，返回: 25
```

---

## 📊 關鍵數值

### **擁塞率判定標準**

```javascript
// TrafficLightController.adjustTimingBasedOnCongestion() 中
const CONGESTION_THRESHOLDS = {
  high: 0.85,      // > 85% = 高度擁塞
  moderate: 0.70,  // > 70% = 中度擁塞
  low: 0.50,       // > 50% = 低度擁塞
}

// 綠燈調整係數
> 85% 擁塞: 50% (20s → 10s)
> 70% 擁塞: 75% (20s → 15s)
> 50% 擁塞: 90% (20s → 18s)
≤ 50% 擁塞: 100% (20s → 20s) 完整綠燈
```

### **停止線限制調整係數**

```javascript
// AutoTrafficGenerator.getAdaptiveStopLineLimit() 中
> 85% 對向擁塞: 30% (25 → 7 台車)
> 70% 對向擁塞: 60% (25 → 15 台車)
> 50% 對向擁塞: 80% (25 → 20 台車)
≤ 50% 對向擁塞: 100% (25 → 25 台車) 完整限制
```

---

## 🎯 整合點（Integration Points）

### **已完成** ✅

- [x] CollisionController: 4 個方法已實現並可調用
- [x] TrafficLightController: 2 個方法已實現並可調用
- [x] AutoTrafficGenerator: \_generateVehicle() 已修改為使用動態限制

### **待完成** ⏳

- [ ] **runCycle() 中集成預測邏輯** (最重要!)

  ```javascript
  // 應在 TrafficLightController.js 第 565 行附近添加：
  if (this.currentPhase === 'northSouth') {
    // ✨ 新增：預測下游
    const downstreamCongestion = await this.predictDownstreamCongestion('northSouth')

    // ✨ 新增：調整綠燈時間
    const adjustedTiming = this.adjustTimingBasedOnCongestion(
      'northSouth',
      this.dynamicTiming.northSouth,
      downstreamCongestion
    )

    this.updateLightState('south', 'green')
    this.updateLightState('north', 'green')
    this.updateTimer('南北向\n直行綠燈', adjustedTiming)  // 使用調整後的時間
    await this.countdownDelayWithAPI(adjustedTiming * 1000, ...)  // 調整延遲時間
  }
  ```

- [ ] **東西向時相也需要類似修改** (複製上面的邏輯到東西向部分)
  ```javascript
  else {  // 東西向
    const downstreamCongestion = await this.predictDownstreamCongestion('eastWest')
    const adjustedTiming = this.adjustTimingBasedOnCongestion(
      'eastWest',
      this.dynamicTiming.eastWest,
      downstreamCongestion
    )
    // ... 同上邏輯
  }
  ```

---

## 🔍 監控日誌

### **應該看到的日誌**

```
🚦 [下游預測] northSouth → eastWest: east=20/25, west=18/25 = 平均擁塞率 78.0%
⚡ [綠燈調整] northSouth: 中度擁塞 (78.0%) → 綠燈縮短至 75% (20s → 15s)
🚦 [動態限制] south方向: 對向 north 中度擁塞 (78.0%), 限制調整 25 → 15 台車
🚦 [動態停止線限制] south方向停止線已滿 (15/15)，暫停生成
```

### **日誌位置**

- CollisionController: `getStopLineCongestionRate()` - 無日誌 (靜默)
- TrafficLightController: `predictDownstreamCongestion()` - DEV 模式打印
- TrafficLightController: `adjustTimingBasedOnCongestion()` - 總是打印
- AutoTrafficGenerator: `getAdaptiveStopLineLimit()` - 必要時打印

---

## ⚙️ 配置參數

### **可調整的常數**

```javascript
// TrafficLightController.js - adjustTimingBasedOnCongestion() 中
CONGESTION_THRESHOLDS = {
  high: 0.85, // 可改為 0.80 或 0.90
  moderate: 0.7, // 可改為 0.65 或 0.75
  low: 0.5, // 可改為 0.45 或 0.55
}

// 綠燈調整係數
;((((((50 % 高) / 75) % 中) / 90) % 低) / 100) % 暢通
// 可改為: 40% / 70% / 85% / 100% 等

// AutoTrafficGenerator.js - getAdaptiveStopLineLimit() 中
;((((((30 % 高) / 60) % 中) / 80) % 低) / 100) % 暢通
// 可改為: 25% / 50% / 75% / 100% 等

// CollisionController.js - getVehiclesAtStopLine() 中
BUFFER = 50 // 停止線前 50px 視為「在停止線前」
// 可改為 30, 75, 100 等
```

---

## 🧪 測試步驟

### **1️⃣ 啟動伺服器**

```bash
npm run dev
```

### **2️⃣ 觀察控制台日誌**

```
應看到類似日誌：
🚦 [下游預測] ...
⚡ [綠燈調整] ...
🚦 [動態限制] ...
```

### **3️⃣ 檢查現象**

| 現象           | 預期           | 說明               |
| -------------- | -------------- | ------------------ |
| 綠燈時間不固定 | 10-20 秒可變   | 證明動態調整在工作 |
| 停止線不會過滿 | 通常 < 20 台車 | 證明動態限制在工作 |
| 回堵現象消失   | 基本不發生     | 最終目標           |
| 車流更順暢     | 視覺明顯       | 整體改善指標       |

### **4️⃣ 調整參數**

如果現象未如預期，調整上述「配置參數」中的數值，如：

- 擁塞閾值改高 (0.85 → 0.90) 讓綠燈縮短更少
- 調整係數改大 (50% → 60%) 讓綠燈時間變更長

---

## 📋 檔案位置速查表

| 方法                              | 檔案路徑                                         | 行號  |
| --------------------------------- | ------------------------------------------------ | ----- |
| `getStopLineCongestionRate()`     | src/classes/vehicle_utils/CollisionController.js | L1295 |
| `getVehiclesAtStopLine()`         | src/classes/vehicle_utils/CollisionController.js | L1309 |
| `predictDownstreamCongestion()`   | src/classes/TrafficLightController.js            | L1842 |
| `adjustTimingBasedOnCongestion()` | src/classes/TrafficLightController.js            | L1885 |
| `getAdaptiveStopLineLimit()`      | src/classes/AutoTrafficGenerator.js              | L1208 |
| `_generateVehicle()` 修改         | src/classes/AutoTrafficGenerator.js              | L925  |

---

## 🎓 工作原理簡圖

```
北向綠燈時:
┌─────────────────────────────────┐
│ runCycle() 決定給北向綠燈       │
│     ↓                           │
│ 🔍 predictDownstreamCongestion()│  (查詢南向擁塞)
│     ↓                           │
│ 南向 80% 擁塞 → 決定調整         │
│     ↓                           │
│ 🎛️ adjustTimingBasedOnCongestion()
│     ↓                           │
│ 綠燈時間: 20s → 15s (75%)       │
│     ↓                           │
│ 給北向綠燈 15 秒                 │
└─────────────────────────────────┘

同時，車流生成時:
┌─────────────────────────────────┐
│ _generateVehicle() 決定放行新車 │
│     ↓                           │
│ getAdaptiveStopLineLimit('south')
│     ↓                           │
│ 查詢北向擁塞: 80%               │
│     ↓                           │
│ 南向限制: 25 → 15 台車          │
│     ↓                           │
│ 南向停止線已有 15 台 → 停止放行  │
│ 改為放行西向車輛 (平衡流量)     │
└─────────────────────────────────┘
```

---

## ✅ 檢查清單

- [x] 所有 6 個方法已實現
- [x] AutoTrafficGenerator.\_generateVehicle() 已使用動態限制
- [x] 所有方法都有完整的 JSDoc 註解
- [x] ESLint 檢查通過
- [x] git 提交成功
- [ ] ⏳ runCycle() 中集成預測 (需要手動添加)
- [ ] ⏳ 實際運行測試

---

## 🚀 下一步

1. **立即**: 啟動伺服器，觀察日誌
2. **今天**: 在 runCycle() 中集成預測邏輯 (Phase 5D)
3. **明天**: 測試並微調所有參數

---

**git hash**: e61a145 (Phase 5A-5C 實施) + 4c54097 (文檔)
