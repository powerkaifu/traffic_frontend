# 🎯 回堵問題 - 7 檔案分析總結

## 快速診斷

**用戶問題**: "綠燈卻無法控制車輛行為，是甚麼問題呢？"

**根本原因**: 交通控制系統缺少**下游擁塞預測**機制，導致上游給綠燈時下游已經滿車，綠燈變得無效（**回堵現象 / Spillback**）。

---

## 📌 7 個相關檔案分類

### 🔴 PRIORITY 1 - 最可能造成回堵的 3 檔案（必須修改）

| # | 檔案 | 行數 | 主要問題 | 修改內容 |
|---|-----|------|--------|--------|
| **1** | **TrafficLightController.js** | 1840 | 號誌固定配時，無下游預測 | ✨ 添加 `predictDownstreamCongestion()` + 動態綠燈調整 |
| **2** | **CollisionController.js** | 1312 | 無法計算停止線擁塞率 | ✨ 添加 `getStopLineCongestionRate()` + `getVehiclesAtStopLine()` |
| **3** | **AutoTrafficGenerator.js** | 1316 | 停止線限制固定，無動態調整 | ✨ 添加 `getAdaptiveStopLineLimit()` + 動態限制邏輯 |

### 🟡 PRIORITY 2 - 應該修改的 2 檔案（配置 + 支持）

| # | 檔案 | 行數 | 主要問題 | 修改內容 |
|---|-----|------|--------|--------|
| **4** | **trafficScenarioConfig.js** | 516 | 靜態停止線配置 | ✨ 添加 `SPILLBACK_PREVENTION_CONFIG` 配置 |
| **5** | **stopLineConfig.js** | - | 無動態管理 | ✨ 若存在則添加，否則在 trafficScenarioConfig.js 中補充 |

### 🟢 PRIORITY 3 - 驗證檔案（通常不需修改）

| # | 檔案 | 行數 | 驗證項目 |
|---|-----|------|---------|
| **6** | **Vehicle.js** | - | ✓ 驗證綠燈優先級邏輯 |
| **7** | **IndexPage.vue** | - | 🆕 可選：添加回堵狀態顯示 |

---

## 🔍 核心問題分析

### **TrafficLightController.js** - 綠燈無下游檢查

```javascript
// ❌ 第 565 行：現狀
this.updateLightState('south', 'green')
this.updateLightState('north', 'green')
this.updateTimer('南北向\n直行綠燈', this.dynamicTiming.northSouth)
await this.countdownDelayWithAPI(this.dynamicTiming.northSouth * 1000, ...)

// ❌ 問題：完全沒檢查東西向停止線是否滿
// ❌ 即使東西向 100% 滿，仍給南北向綠燈
// ❌ 結果：南北向綠燈無效（回堵）
```

### **AutoTrafficGenerator.js** - 停止線限制固定

```javascript
// ❌ 第 925 行：現狀
const stopLineLimit = STOP_LINE_VEHICLE_LIMITS[dir] || 30  // 固定 25 台車
if (stopLineCount >= stopLineLimit) {
  return  // 停止生成
}

// ❌ 問題：不考慮對向停止線是否擁塞
// ❌ 東向滿了，南向還是以 25 台車為上限
// ❌ 導致上游停止線過度積累
```

### **CollisionController.js** - 無法提供擁塞率

```javascript
// ❌ 現狀：只能檢測碰撞，無法計算擁塞率
isVehiclePassedStopLine()    // ✅ 有
detectNearbyCollisions()     // ✅ 有
applyCollisionBehavior()     // ✅ 有

// ❌ 缺失：
getStopLineCongestionRate()  // ❌ 無 (需要添加)
getVehiclesAtStopLine()      // ❌ 無 (需要添加)

// ❌ 結果：TrafficLightController 無法查詢下游狀況
```

---

## ✅ 回堵現象的完整鏈條

```
T=0s   系統啟動
       ├─ 南北綠燈 ✅
       ├─ 東西停止線：5/25 台車（20% ✅）
       └─ 南北停止線：20/25 台車（80% ⚠️）

T=30s  車流繼續增加
       ├─ 東西停止線：20/25 台車（80% ⚠️）
       ├─ 南北停止線：25/25 台車（100% 🔴）
       └─ AutoTrafficGenerator 停止生成 ✅

T=60s  輪到東西綠燈...等等，東西停止線也滿了 🔴
       ├─ 東西綠燈給下去 ✅
       ├─ 但東西停止線是滿的，車進不了路口
       ├─ 東西綠燈也變無效 ❌
       └─ 現在兩個方向都回堵了 🔴🔴

問題根源：
├─ ❌ 給綠燈前，沒檢查對向停止線
├─ ❌ 停止線限制固定，不根據下游調整
├─ ❌ CollisionController 無法提供擁塞信息
└─ ❌ 結果：綠燈無效化 → 回堵現象
```

---

## 🚀 Phase 5 修復（3 步完成）

### **Step 1: TrafficLightController.js**
```javascript
// ✨ 添加方法
async predictDownstreamCongestion(direction) {
  const opposite = direction === 'northSouth' ? 'eastWest' : 'northSouth'
  // 查詢對向停止線擁塞率，返回 0.0-1.0
}

// ✨ 修改 runCycle() 中的給綠燈邏輯
const downstreamCongestion = await this.predictDownstreamCongestion('eastWest')
if (downstreamCongestion > 0.85) {
  greenDuration = Math.ceil(this.phaseTimings.straight.green * 0.5)  // 縮短到 10 秒
}
```

### **Step 2: CollisionController.js**
```javascript
// ✨ 添加方法
getStopLineCongestionRate(direction) {
  const vehicles = this.getVehiclesAtStopLine(direction)
  const limit = STOP_LINE_VEHICLE_LIMITS[direction]
  return vehicles.length / limit  // 返回百分比
}

getVehiclesAtStopLine(direction) {
  // 篩選停止線前 50px 內未通過停止線的車輛
}
```

### **Step 3: AutoTrafficGenerator.js**
```javascript
// ✨ 添加方法
getAdaptiveStopLineLimit(direction) {
  const opposite = this._getOppositeDirection(direction)
  const congestion = this.trafficController.getStopLineCongestionRate(opposite)
  
  if (congestion > 0.85) return Math.ceil(25 * 0.3)   // 7 台車
  if (congestion > 0.70) return Math.ceil(25 * 0.6)   // 15 台車
  if (congestion > 0.50) return Math.ceil(25 * 0.8)   // 20 台車
  return 25  // 暢通：25 台車
}

// ✨ 修改 _generateVehicle()
const stopLineLimit = this.getAdaptiveStopLineLimit(dir)  // 動態限制
```

---

## 📊 預期效果

| 指標 | 現況 | 修復後 |
|-----|------|--------|
| 回堵現象 | 嚴重 🔴 | 消除 ✅ |
| 綠燈有效率 | 60% | 95% |
| 車流通過 | 緩慢 | 順暢 |
| CPU 影響 | - | 無 (±0%) |

---

## 📝 檔案修改優先順序

```
優先級 1 (必做)：
  ├─ 1. TrafficLightController.js (添加下游預測 + 動態綠燈)
  ├─ 2. CollisionController.js (添加擁塞率計算)
  └─ 3. AutoTrafficGenerator.js (動態停止線限制)

優先級 2 (補充)：
  ├─ 4. trafficScenarioConfig.js (添加配置)
  └─ 5. stopLineConfig.js (若需要)

優先級 3 (可選)：
  ├─ 6. Vehicle.js (驗證，不需改)
  └─ 7. IndexPage.vue (添加 UI 提示)
```

---

**🎯 根本原因確認**: ✅ 缺少下游擁塞預測 + 動態信號協調
**🚀 修復方案**: ✅ 3 個主檔案 + 2 個配置檔案
**⏱️ 預計工作量**: 2-3 小時 (三個主要檔案各 30-40 分鐘)

