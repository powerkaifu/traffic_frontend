# 🔍 交通數據收集問題分析與修正

## 問題描述

**用戶反饋**：一開始傳送到後端的資料都相同,每次預測回來都是相同的時間。

## 根本原因分析

### 1. 數據收集流程

```javascript
// TrafficLightController.js - 第 520 行開始
collectIntersectionData() {
  // ...
  Object.keys(this.vehicleData).forEach((direction, index) => {
    const data = this.vehicleData[direction]  // ← 問題所在！

    // 應用最小值保護機制
    const minMotor = 3  // 最少機車數量
    const minSmall = 2  // 最少小客車數量
    const minLarge = 1  // 最少大客車數量

    const scaledMotor = Math.max(Math.round(data.motor * 1.5), minMotor)
    const scaledSmall = Math.max(Math.round(data.small * 1.5), minSmall)
    const scaledLarge = Math.max(Math.round(data.large * 1.5), minLarge)
    // ...
  })
}
```

### 2. 問題場景

#### 場景 A：系統剛啟動時

```javascript
// 初始狀態（第 82-86 行）
this.vehicleData = {
  east: { motor: 0, small: 0, large: 0 }, // 全部為 0
  west: { motor: 0, small: 0, large: 0 }, // 全部為 0
  south: { motor: 0, small: 0, large: 0 }, // 全部為 0
  north: { motor: 0, small: 0, large: 0 }, // 全部為 0
}

// 第一次 API 觸發時（假設綠燈 12 秒，在剩餘 10 秒時）
// 此時車輛可能才剛開始生成，vehicleData 仍然全是 0
```

**收集到的數據**：

```javascript
{
  Volume_M: Math.max(0 * 1.5, 3) = 3,  // 強制最小值
  Volume_S: Math.max(0 * 1.5, 2) = 2,  // 強制最小值
  Volume_L: Math.max(0 * 1.5, 1) = 1,  // 強制最小值
}
// 每個方向都是相同的 (3, 2, 1)
```

#### 場景 B：數據重置時機問題

```javascript
// countdownDelayWithAPI() - 第 500 行
setTimeout(() => {
  this.resetTrafficDataForNextCycle() // 3 秒後重置
}, 3000)

// resetTrafficDataForNextCycle() - 第 859 行
this.resetVehicleData() // 將所有計數器歸零
```

**時間軸問題**：

```
T=0s    : 南北向綠燈開始，車輛開始生成
T=2s    : API 觸發（實際觸發時間）
          ↓ 收集數據：vehicleData 可能只有少量車輛
          ↓ 發送 API
T=5s    : resetTrafficDataForNextCycle() 執行
          ↓ vehicleData 全部歸零！
T=12s   : 綠燈結束
T=15s   : 黃燈結束
T=18s   : 全紅結束
T=18s+  : 左轉綠燈開始...
```

**問題**：

1. **觸發太早**：綠燈剛開始 2 秒就觸發 API，車輛還沒累積
2. **過早重置**：API 發送後 3 秒就重置數據，但綠燈還在繼續
3. **最小值保護**：當真實數據為 0 時，強制使用最小值（3, 2, 1）

### 3. 數據流向圖

```
車輛生成 → incrementVehicleData() → this.vehicleData[direction][type]++
                                              ↓
                                    collectIntersectionData()
                                              ↓
                                         應用縮放因子 × 1.5
                                              ↓
                                         Math.max(scaled, min)
                                              ↓
                                         發送到後端 API
                                              ↓
                                    (3秒後) resetVehicleData()
                                              ↓
                                    所有數據歸零，重新開始
```

## 實際測試驗證

### 測試案例 1：系統啟動第一個週期

**預期行為**：

- 綠燈 12 秒
- 在剩餘 10 秒時（即第 2 秒）觸發 API
- 此時只累積了 2 秒的車流數據

**實際數據**（假設每秒生成 1 輛車）：

```javascript
// 真實累積（2秒）
vehicleData = {
  east: { motor: 1, small: 1, large: 0 },
  west: { motor: 1, small: 1, large: 0 },
  south: { motor: 1, small: 1, large: 0 },
  north: { motor: 1, small: 1, large: 0 }
}

// 應用縮放和最小值後
發送數據 = {
  Volume_M: Math.max(1 * 1.5, 3) = 3,
  Volume_S: Math.max(1 * 1.5, 2) = 2,
  Volume_L: Math.max(0 * 1.5, 1) = 1
}
```

**結果**：每個方向都是 (3, 2, 1)，後端收到相同的數據！

### 測試案例 2：後續週期

即使後續週期累積了更多車輛，由於：

1. 重置時機不當（綠燈期間就重置）
2. 觸發時機太早（綠燈開始 2 秒就觸發）

導致每次發送的數據仍然相似。

## 修正方案

### 方案 A：調整觸發和重置時機（推薦）

```javascript
// 1. 修改觸發時機：改為綠燈結束前觸發
async countdownDelayWithAPI(totalMs, apiTriggerSeconds) {
  const totalSeconds = Math.floor(totalMs / 1000)

  // 🔧 建議：在綠燈結束前 2-3 秒觸發，而非開始時
  const actualTriggerSeconds = Math.max(2, Math.min(apiTriggerSeconds, totalSeconds))

  // ... 現有邏輯
}

// 2. 修改重置時機：改為下一個綠燈開始時重置
// 不要在 API 發送後 3 秒就重置，而是等到相位切換時
```

### 方案 B：移除最小值保護（較激進）

```javascript
// 允許真實的 0 值傳送到後端
const scaledMotor = Math.round(data.motor * this.dataScalingFactor)
const scaledSmall = Math.round(data.small * this.dataScalingFactor)
const scaledLarge = Math.round(data.large * this.dataScalingFactor)

// 不使用 Math.max(scaled, min)
```

### 方案 C：累積整個週期數據（最佳）

```javascript
// 1. 不在 API 觸發時重置數據
// 2. 改為累積整個南北向時相（綠燈+黃燈+全紅+左轉）的數據
// 3. 在相位切換時（切換到東西向前）才發送 API 和重置

// 修改流程：
南北向綠燈開始 → 開始累積數據
    ↓
南北向綠燈 (12s)
    ↓
南北向黃燈 (3s)
    ↓
全紅 (3s)
    ↓
南北向左轉綠燈 (12s)
    ↓
南北向左轉黃燈 (3s)
    ↓
全紅 (3s) → 此時觸發 API（累積了完整 36 秒的數據）
    ↓       + 發送數據
    ↓       + 重置數據
東西向綠燈開始 → 重新累積
```

## 建議修正步驟

### 步驟 1：調整 API 觸發時機

```javascript
// TrafficLightController.js (第 464 行附近)
async countdownDelayWithAPI(totalMs, apiTriggerSeconds) {
  const totalSeconds = Math.floor(totalMs / 1000)
  let apiTriggered = false

  // 🔧 修正：在綠燈剩餘 30% 時觸發，確保有足夠數據累積
  const actualTriggerSeconds = Math.max(
    3, // 至少剩餘 3 秒
    Math.min(
      Math.ceil(totalSeconds * 0.3), // 剩餘 30% 時觸發
      apiTriggerSeconds
    )
  )

  console.log(`🕐 [API觸發] 綠燈總時間: ${totalSeconds}秒, 將在剩餘 ${actualTriggerSeconds}秒 時觸發API`)

  // ... 其餘邏輯
}
```

### 步驟 2：延遲數據重置時機

```javascript
// 修改：不要立即重置，改為相位結束時重置
// countdownDelayWithAPI() 中移除：
// setTimeout(() => {
//   this.resetTrafficDataForNextCycle()
// }, 3000)

// 改為在 runCycle() 的相位切換前重置：
if (this.currentPhase === 'northSouth') {
  // ... 所有南北向時相

  // 🔧 在切換到東西向前，發送 API 和重置數據
  console.log('🔄 南北向時相結束，收集完整數據並發送 API')
  const cycleData = this.collectIntersectionData()
  this.sendDataToBackend(cycleData)

  // 等待 2 秒讓 API 完成
  await this.delay(2000)

  // 重置數據
  this.resetTrafficDataForNextCycle()

  // 切換至東西向
  this.currentPhase = 'eastWest'
}
```

### 步驟 3：調整或移除最小值保護

```javascript
// collectIntersectionData() 中
// 選項 A：降低最小值
const minMotor = 1 // 從 3 降到 1
const minSmall = 1 // 從 2 降到 1
const minLarge = 0 // 從 1 降到 0

// 選項 B：只在總數為 0 時使用最小值
const totalRaw = data.motor + data.small + data.large
if (totalRaw === 0) {
  // 使用最小值
  scaledMotor = minMotor
  scaledSmall = minSmall
  scaledLarge = minLarge
} else {
  // 使用真實數據
  scaledMotor = Math.round(data.motor * this.dataScalingFactor)
  scaledSmall = Math.round(data.small * this.dataScalingFactor)
  scaledLarge = Math.round(data.large * this.dataScalingFactor)
}
```

## 監控與驗證

### 1. 添加詳細日誌

```javascript
collectIntersectionData() {
  console.log('📊 [數據收集] 當前 vehicleData 狀態:', JSON.stringify(this.vehicleData, null, 2))

  // ... 數據處理

  console.log('📤 [數據發送] 處理後的 vdData:', JSON.stringify(vdData, null, 2))
  return vdData
}
```

### 2. 檢查點

每次 API 發送時，檢查：

- ✅ `this.vehicleData` 是否有真實累積的數據（不是全 0）
- ✅ 縮放後的數據是否有變化（不是每次都相同）
- ✅ 後端收到的數據是否有差異
- ✅ 預測結果是否有變化

### 3. 測試場景

```javascript
// 測試 1：系統啟動後第一次預測
// 預期：數據較少，但應該反映真實累積

// 測試 2：第二次預測
// 預期：數據應該與第一次不同

// 測試 3：高峰時段
// 預期：數據量明顯增加，預測時間變長

// 測試 4：低峰時段
// 預期：數據量較少，預測時間較短
```

## 總結

### 問題根源

1. ❌ **觸發太早**：綠燈開始 2 秒就觸發 API（剩餘 10 秒 = 總時長 12 秒時）
2. ❌ **重置太快**：API 發送後 3 秒就重置，但綠燈還在繼續
3. ❌ **最小值保護**：當數據為 0 時強制使用固定值（3, 2, 1）
4. ❌ **數據不足**：只累積很短時間的車流數據

### 建議修正

1. ✅ 調整觸發時機：綠燈剩餘 30% 或至少 3 秒時觸發
2. ✅ 延遲重置時機：改為相位切換時重置（累積完整時相數據）
3. ✅ 調整最小值保護：降低最小值或僅在全 0 時使用
4. ✅ 添加監控日誌：追蹤數據收集和發送過程

### 預期改善

- 🎯 每次發送的數據都不同，反映真實車流變化
- 🎯 後端預測結果會根據實際車流調整
- 🎯 系統更準確地模擬真實交通情況

---

**修正版本**：v1.2
**修正日期**：2025-01-19
**相關文件**：`API_TRIGGER_FIX.md`
