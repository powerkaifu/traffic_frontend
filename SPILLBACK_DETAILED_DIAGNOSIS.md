# 🚦 回堵問題 - 根本原因診斷報告

## 📌 診斷結論

```
用戶報告：「綠燈卻無法控制車輛行為」
        ↓
系統表現：綠燈亮起但車輛無法通行
        ↓
現象名稱：Spillback（回堵現象）
        ↓
根本原因：❌ 缺少「下游擁塞預測」機制
        ↓
影響位置：3 個檔案 (TrafficLightController、CollisionController、AutoTrafficGenerator)
```

---

## 🔴 核心問題 - 可視化分析

### **情景模擬：回堵現象如何產生**

```
時間軸    南北向           東西向              系統狀態
─────────────────────────────────────────────────────────────

T=00秒    ✅ 綠燈           🚗 5/25 車輛         ✅ 正常
         ═════════        ─────────
         20秒倒數         20% 使用

T=30秒    ✅ 綠燈           🚗 20/25 車輛        ⚠️  東西接近飽和
         ═════════        ─────────
         剩5秒            80% 使用

T=60秒    ⏰ 綠燈結束        🚗 25/25 車輛 (飽)   🔴 都已滿！
         開始轉黃          ─────────
         ⚠️  但東西還是滿   100% 使用

         問題出現！
         └─ 南北向綠燈 ✅
         └─ 但東西向停止線已滿 🔴
         └─ 南北向車輛進不了路口 ❌
         └─ 綠燈變無效！❌❌❌

T=90秒    ⏰ 黃燈           🚗 23/25 (東西開始疏散)  🔴 南北開始回堵
         開始疏散
         └─ 但南北停止線已堆滿！

         回堵現象確認！🔴
         ├─ 南北向停止線開始積累車輛
         ├─ 雖然有綠燈，但進不了路口
         ├─ 綠燈被「下游堵塞」所否定
         └─ 用戶看到：「綠燈卻無法通行」
```

---

## 🔧 根本原因分析

### **Problem #1: TrafficLightController.js**

**症狀**

```javascript
// 第 565 行：給南北綠燈
this.updateLightState('south', 'green')
this.updateLightState('north', 'green')

// ❌ 問題：沒有檢查東西向停止線
//   即使東西向停止線 100% 滿，仍給南北綠燈
```

**可視化**

```
給綠燈時的決策樹：

TrafficLightController.runCycle() {
  if (currentPhase === 'northSouth') {
    ✅ 檢查：「是否應該給南北綠燈？」
    ├─ ✅ 已檢查：南北燈是否為紅？ → 是
    ├─ ✅ 已檢查：是否在安全緩衝時間？ → 是
    ├─ ❌ 未檢查：東西向停止線是否滿？ ← 問題在這！
    ├─ ❌ 未檢查：下游通行能力？ ← 缺失邏輯
    └─ ❌ 未檢查：是否會造成回堵？ ← 無預測機制

    結果：給綠燈 ✅ (無考量下游)

    所以當東西向停止線是滿的時...
    → 南北向綠燈 ✅ 但車進不去 ❌
    → 綠燈無效 ❌
}
```

**修復邏輯**

```javascript
// ✨ 應該改為：
TrafficLightController.runCycle() {
  if (currentPhase === 'northSouth') {
    // ✨ 新增：預測下游 (東西向) 擁塞率
    const eastWestCongestion = await this.predictDownstreamCongestion('eastWest')

    // ✨ 新增：根據下游狀況決策
    let greenDuration = 20  // 預設 20 秒
    if (eastWestCongestion > 0.85) {
      greenDuration = 10  // 如果東西向 > 85% 滿，縮短到 10 秒
      logWarn(`⚠️ 下游擁塞 ${(eastWestCongestion * 100).toFixed(0)}%，綠燈縮短`)
    }

    // 給綠燈 ✅ (已考量下游)
    this.updateLightState('south', 'green')
    this.updateLightState('north', 'green')
    this.updateTimer('南北向\n直行綠燈', greenDuration)
    await this.countdownDelay(greenDuration * 1000)
  }
}
```

---

### **Problem #2: AutoTrafficGenerator.js**

**症狀**

```javascript
// 第 925 行：固定停止線限制
const stopLineLimit = STOP_LINE_VEHICLE_LIMITS[dir] || 30 // 永遠是 25

if (stopLineCount >= stopLineLimit) {
  console.log(`🚦 停止線已滿`)
  return // 停止生成
}

// ❌ 問題：不考慮「對向停止線擁塞」
//   東向滿了，南向仍以 25 台車為上限
//   導致南向停止線過度積累
```

**可視化**

```
現狀（固定限制）：

東向停止線狀態    南向停止線狀態    系統決策
─────────────────────────────────────────────

0/25 台車        0/25 台車        ✅ 放行（兩個都空）
(0% 滿)          (0% 滿)

5/25 台車        0/25 台車        ✅ 放行（只有東滿)
(20% 滿)         (0% 滿)          └─ 南仍以 25 為限

10/25 台車       0/25 台車        ✅ 放行
(40% 滿)         (0% 滿)          └─ 南仍以 25 為限

20/25 台車       0/25 台車        ✅ 放行
(80% 滿)         (0% 滿)          └─ 南仍以 25 為限 ⚠️

25/25 台車       23/25 台車       ❌ 停止放行
(100% 滿)        (92% 滿)         └─ 因為南已接近滿
                                   └─ 但東方是真正的瓶頸！

問題：東向已經飽和，南向為什麼還要填滿到 25？
      這會導致南向停止線過度積累，形成回堵！


修復（動態限制）：

東向停止線狀態    南向停止線狀態    系統決策
─────────────────────────────────────────────

20/25 台車       0/25 台車        ⚠️  東向 80% 滿
(80% 滿)         (0% 滿)          ├─ 正常限制 → 60% = 15 台車
                                  └─ 南向只能放到 15 台

24/25 台車       8/15 台車        🔴 東向 96% 滿
(96% 滿)         (53% 使用)       ├─ 高擁塞限制 → 30% = 7 台車
                                  └─ 南向立即限制到 7 台

結果：
└─ 南向停止線不會過度積累 ✅
└─ 形成平衡流量 ✅
└─ 緩解回堵現象 ✅
```

**修復邏輯**

```javascript
// ✨ 應該改為：
getAdaptiveStopLineLimit(direction) {
  // 獲取對向擁塞率
  const opposite = this._getOppositeDirection(direction)
  const congestionRate = this.trafficController.getStopLineCongestionRate(opposite)

  const baseLimit = STOP_LINE_VEHICLE_LIMITS[direction]  // 基礎值：25 台車

  // 根據對向擁塞率動態調整
  if (congestionRate > 0.85) {
    return Math.ceil(baseLimit * 0.30)  // 高度擁塞 → 30% = 7 台車
  } else if (congestionRate > 0.70) {
    return Math.ceil(baseLimit * 0.60)  // 中度擁塞 → 60% = 15 台車
  } else if (congestionRate > 0.50) {
    return Math.ceil(baseLimit * 0.80)  // 輕度擁塞 → 80% = 20 台車
  } else {
    return baseLimit  // 暢通 → 100% = 25 台車
  }
}

// 在 _generateVehicle() 中使用
_generateVehicle() {
  // ...
  const stopLineLimit = this.getAdaptiveStopLineLimit(dir)  // ✨ 動態限制
  if (stopLineCount >= stopLineLimit) {
    return
  }
  // ...
}
```

---

### **Problem #3: CollisionController.js**

**症狀**

```javascript
// ❌ 現有方法：
isVehiclePassedStopLine() // ✅ 有
detectNearbyCollisions() // ✅ 有

// ❌ 缺失方法：
getStopLineCongestionRate() // ❌ 無
getVehiclesAtStopLine() // ❌ 無

// ❌ 結果：
// TrafficLightController 無法查詢「東西向停止線現在幾%滿？」
// AutoTrafficGenerator 無法查詢「對向停止線擁塞率是多少？」
```

**可視化**

```
信息流斷裂：

TrafficLightController.predictDownstreamCongestion('eastWest')
  └─ 需要查詢：「東西向停止線現在幾%滿？」
     └─ 嘗試調用：CollisionController.getStopLineCongestionRate('east')
        └─ 🔴 方法不存在！❌ 信息流中斷

AutoTrafficGenerator._generateVehicle()
  └─ 需要查詢：「南向對向(北向)停止線擁塞率？」
     └─ 嘗試調用：CollisionController.getStopLineCongestionRate('north')
        └─ 🔴 方法不存在！❌ 信息流中斷


修復後：

✅ CollisionController.getStopLineCongestionRate('eastWest')
   └─ 計算：25 台車 / 25 台車上限 = 1.0 (100%)
      └─ 返回：1.0
         └─ 結果：TrafficLightController 可以做出智能決策 ✅

✅ AutoTrafficGenerator.getAdaptiveStopLineLimit('south')
   └─ 查詢：CollisionController.getStopLineCongestionRate('north')
      └─ 返回：0.85 (85%)
         └─ 決策：減少南向停止線限制到 60% = 15 台車 ✅
```

**修復邏輯**

```javascript
// ✨ 在 CollisionController 中添加：

/**
 * 獲取某方向停止線的擁塞率
 * @param {string} direction - 方向 ('north', 'south', 'east', 'west')
 * @returns {number} 擁塞率 (0.0 = 空, 1.0 = 滿)
 */
getStopLineCongestionRate(direction) {
  const vehicles = this.getVehiclesAtStopLine(direction)
  const limit = STOP_LINE_VEHICLE_LIMITS[direction] || 25
  return Math.min(1.0, vehicles.length / limit)
}

/**
 * 獲取停止線前等待的車輛
 * @param {string} direction - 方向
 * @returns {Array<Vehicle>} 停止線前的車輛陣列
 */
getVehiclesAtStopLine(direction) {
  if (!window.liveVehicles) return []

  const stopLine = this.vehicle.getStopLinePosition()
  if (!stopLine) return []

  // 篩選停止線前 50px 內、未通過停止線的車輛
  return window.liveVehicles.filter(v => {
    if (v.direction !== direction) return false
    if (v.hasPassedStopLine) return false

    const pos = v.getCurrentPosition()
    const BUFFER = 50  // 停止線前 50px

    switch (direction) {
      case 'east':   return pos.x < stopLine.x + BUFFER
      case 'west':   return pos.x > stopLine.x - BUFFER
      case 'north':  return pos.y > stopLine.y - BUFFER
      case 'south':  return pos.y < stopLine.y + BUFFER
      default:       return false
    }
  })
}
```

---

## 📊 三個問題的相關性

```
┌─────────────────────────────────────────────────────────────┐
│         Phase 5 修復 - 信息流完整化                          │
└─────────────────────────────────────────────────────────────┘

CollisionController (【新增】擁塞率計算)
  ↑
  │ 提供：getStopLineCongestionRate()
  │
  ├─────────────────────────────────────────┐
  │                                         │
  ↓                                         ↓
TrafficLightController          AutoTrafficGenerator
(【新增】下游預測)               (【新增】動態限制)
  │                                         │
  └─→ 調整綠燈時間 ✅              └─→ 動態停止線限制 ✅
      └─→ 防止下游溢出                    └─→ 防止上游積累
          (Spillback)                       (Queue Backup)


結果：三檔案協調工作，形成完整的回堵防止系統 ✅
```

---

## 🎯 修復優先順序

```
1️⃣  CollisionController.js
    └─ 優先添加基礎方法 (getStopLineCongestionRate, getVehiclesAtStopLine)
       理由：其他兩個檔案都要依賴這個方法

2️⃣  TrafficLightController.js
    └─ 添加下游預測邏輯 (predictDownstreamCongestion)
       理由：實現號誌的智能調整

3️⃣  AutoTrafficGenerator.js
    └─ 添加動態限制邏輯 (getAdaptiveStopLineLimit)
       理由：實現停止線的動態管理

4️⃣  trafficScenarioConfig.js
    └─ 添加配置常數 (SPILLBACK_PREVENTION_CONFIG)
       理由：參數化所有調整係數
```

---

## ✅ 診斷總結

| 項目             | 現狀        | 根本原因              |
| ---------------- | ----------- | --------------------- |
| **綠燈無效**     | ✅ 確認     | ❌ 缺少下游擁塞預測   |
| **回堵現象**     | ✅ 確認     | ❌ 停止線限制固定     |
| **無法平衡流量** | ✅ 確認     | ❌ 無擁塞率信息       |
| **影響檔案數**   | ✅ 確認     | 3 個主檔案 + 2 個配置 |
| **解決方案**     | ✅ 完整設計 | Phase 5 實施          |

---

## 🚀 Next Steps

1. ✅ **診斷完成** (已完成本報告)
2. ⏳ **Phase 5A**: 修改 CollisionController.js
3. ⏳ **Phase 5B**: 修改 TrafficLightController.js
4. ⏳ **Phase 5C**: 修改 AutoTrafficGenerator.js
5. ⏳ **Phase 5D**: 修改 trafficScenarioConfig.js
6. ⏳ **測試 & 驗證**

---

**git commit hash**: db69bd1
**日期**: 2024
**狀態**: 🟢 診斷完成，準備修復
