# 🔧 數據一致性問題修正實作

## 修正日期

2025-10-19

## 問題摘要

用戶反映：一開始傳送到後端的資料都相同，每次預測回來都是相同的時間。

經過分析發現問題根源：

1. **最小值保護機制** - 當 vehicleData 為 0 時，強制使用固定值（motor=3, small=2, large=1）
2. **觸發時機太早** - 綠燈剛開始 2 秒就觸發 API，車輛數據累積不足
3. **重置時機不當** - API 發送後 3 秒就重置，但綠燈還在繼續

## 實作的修正

### 1️⃣ 調整最小值保護邏輯

**文件**: `src/classes/TrafficLightController.js`
**方法**: `collectIntersectionData()`
**位置**: 約 520-570 行

#### 修改前

```javascript
// 應用縮放因子並確保最小車流量（模擬中等交通流量）
const minMotor = 3 // 最少機車數量
const minSmall = 2 // 最少小客車數量
const minLarge = 1 // 最少大客車數量

const scaledMotor = Math.max(Math.round(data.motor * this.dataScalingFactor), minMotor)
const scaledSmall = Math.max(Math.round(data.small * this.dataScalingFactor), minSmall)
const scaledLarge = Math.max(Math.round(data.large * this.dataScalingFactor), minLarge)
```

#### 修改後

```javascript
// 🔧 修正：只在總數為 0 時使用最小值，否則使用真實數據
const totalRaw = data.motor + data.small + data.large

let scaledMotor, scaledSmall, scaledLarge

if (totalRaw === 0) {
  // 沒有車輛時使用最小值
  const minMotor = 1 // 降低最少機車數量
  const minSmall = 1 // 降低最少小客車數量
  const minLarge = 0 // 降低最少大客車數量

  scaledMotor = minMotor
  scaledSmall = minSmall
  scaledLarge = minLarge

  console.log(`⚠️ [數據收集] ${direction} 方向無車輛，使用最小值`)
} else {
  // 有車輛時使用真實數據（應用縮放因子）
  scaledMotor = Math.round(data.motor * this.dataScalingFactor)
  scaledSmall = Math.round(data.small * this.dataScalingFactor)
  scaledLarge = Math.round(data.large * this.dataScalingFactor)

  console.log(
    `✅ [數據收集] ${direction} 方向 - 原始: motor=${data.motor}, small=${data.small}, large=${data.large} | 縮放後: motor=${scaledMotor}, small=${scaledSmall}, large=${scaledLarge}`,
  )
}
```

**改進效果**：

- ✅ 只在真正沒有車輛（總數為 0）時使用最小值
- ✅ 有車輛時使用真實數據，反映實際車流
- ✅ 降低最小值（1, 1, 0），更接近真實情況
- ✅ 每個方向的數據會根據實際車流而不同

---

### 2️⃣ 添加詳細日誌追蹤

**文件**: `src/classes/TrafficLightController.js`

#### A. 數據收集時的日誌

**位置**: `collectIntersectionData()` 方法開頭和結尾

```javascript
// 開頭添加
console.log('📊 [數據收集] 當前 vehicleData 原始狀態:', JSON.stringify(this.vehicleData, null, 2))

// 結尾添加
console.log('📤 [數據發送] 處理後的 vdData:', JSON.stringify(vdData, null, 2))
```

#### B. 數據重置時的日誌

**位置**: `resetVehicleData()` 方法

```javascript
resetVehicleData() {
  // 重置前記錄
  console.log('🔄 [數據重置] 重置前 vehicleData:', JSON.stringify(this.vehicleData, null, 2))

  Object.keys(this.vehicleData).forEach((direction) => {
    this.vehicleData[direction] = { motor: 0, small: 0, large: 0 }
  })

  console.log('✅ [數據重置] 車輛數據已重置為 0')
}
```

**改進效果**：

- ✅ 可以追蹤每次收集的原始數據
- ✅ 可以看到縮放和最小值保護後的數據
- ✅ 可以確認重置時機和數據狀態

---

### 3️⃣ 調整數據重置時機

**文件**: `src/classes/TrafficLightController.js`

#### A. 移除 API 觸發後的立即重置

**方法**: `countdownDelayWithAPI()`
**位置**: 約 495 行

##### 修改前

```javascript
// 3. 立即更新特徵模擬數據顯示
this.updateFeatureSimulationDisplay(currentCycleData)

// 4. 標記準備重置數據（3秒後執行，避免突然清空）
setTimeout(() => {
  this.resetTrafficDataForNextCycle()
}, 3000)

apiTriggered = true
```

##### 修改後

```javascript
// 3. 立即更新特徵模擬數據顯示
this.updateFeatureSimulationDisplay(currentCycleData)

// 🔧 修正：不再立即重置數據，改為在相位切換時重置
// 這樣可以累積完整週期的車輛數據
console.log('ℹ️ [API觸發] 數據已發送，將在相位切換時重置數據')

apiTriggered = true
```

#### B. 在相位切換時重置數據

**方法**: `runCycle()`
**位置**: 約 370 行（南北向切換到東西向）和 約 438 行（東西向切換到南北向）

##### 南北向時相結束時（修改前）

```javascript
// 🎯【階段7】全紅階段 - 切換前緩衝
this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

// 切換至東西向
this.currentPhase = 'eastWest'
```

##### 南北向時相結束時（修改後）

```javascript
// 🎯【階段7】全紅階段 - 切換前緩衝
this.updateTimer('全紅階段\n安全緩衝', this.phaseTimings.allRed.duration)
await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

// 🔧 修正：在南北向時相結束前，重置數據以準備東西向時相
console.log('🔄 [相位切換] 南北向時相結束，重置數據以準備東西向')
this.resetTrafficDataForNextCycle()

// 切換至東西向
this.currentPhase = 'eastWest'
```

##### 東西向時相結束時（修改後）

```javascript
// 🎯【階段7】全紅階段 - 切換前緩衝
this.updateTimer('全紅階段', this.phaseTimings.allRed.duration)
await this.countdownDelay(this.phaseTimings.allRed.duration * 1000)

// 🔧 修正：在東西向時相結束前，重置數據以準備南北向時相
console.log('🔄 [相位切換] 東西向時相結束，重置數據以準備南北向')
this.resetTrafficDataForNextCycle()

// 切換至南北向
this.currentPhase = 'northSouth'
```

#### C. 移除循環末尾的重置

**位置**: runCycle() 方法末尾（約 448 行）

##### 修改前

```javascript
}

// 重置車輛數據以準備下一輪收集
this.resetVehicleData()
```

##### 修改後

```javascript
}

// 🔧 移除：不再在這裡重置，改為在相位切換時重置
// this.resetVehicleData()
```

**改進效果**：

- ✅ 數據累積完整的時相（綠燈 + 黃燈 + 全紅 + 左轉綠燈 + 左轉黃燈 + 全紅）
- ✅ 在相位切換前才重置，確保數據充分累積
- ✅ 避免過早重置導致數據不足

---

## 數據流程對比

### 修改前的流程

```
T=0s    : 南北向綠燈開始
          vehicleData = {east: 0, west: 0, south: 0, north: 0}
          車輛開始生成...
          ↓
T=2s    : API 觸發（綠燈剩餘 10 秒）
          收集數據: vehicleData 可能只有少量車輛
          應用最小值保護 → 每個方向都是 (3, 2, 1)
          發送 API
          ↓
T=5s    : resetTrafficDataForNextCycle() 執行
          vehicleData 全部歸零！❌
          ↓
T=12s   : 南北向綠燈結束
T=15s   : 黃燈結束
T=18s   : 全紅結束
T=30s   : 左轉綠燈結束
T=33s   : 左轉黃燈結束
T=36s   : 全紅結束，切換到東西向
          ↓
重複相同問題...
```

**問題**：

- ❌ 只累積了 2 秒的數據就發送 API
- ❌ 發送後 3 秒就重置，丟失綠燈後半段的數據
- ❌ 每次數據都類似，預測結果相同

### 修改後的流程

```
T=0s    : 南北向綠燈開始
          vehicleData = {east: 0, west: 0, south: 0, north: 0}
          車輛開始生成...
          ↓
T=2s    : API 觸發（綠燈剩餘 10 秒）
          收集數據: vehicleData 有部分車輛
          ✅ 只在總數為 0 時使用最小值
          ✅ 有車輛時使用真實縮放數據
          發送 API
          ⚠️ 不重置！繼續累積
          ↓
T=12s   : 南北向綠燈結束（繼續累積）
T=15s   : 黃燈結束（繼續累積）
T=18s   : 全紅結束（繼續累積）
T=30s   : 左轉綠燈結束（繼續累積）
T=33s   : 左轉黃燈結束（繼續累積）
T=36s   : 全紅結束
          ✅ 此時才重置數據（累積了完整 36 秒）
          切換到東西向
          ↓
東西向時相開始（重新累積）...
```

**改進**：

- ✅ 數據持續累積完整時相（36 秒）
- ✅ 下次 API 觸發時有更多真實數據
- ✅ 每次數據反映實際車流變化
- ✅ 預測結果會根據車流調整

---

## 預期效果

### 1. 數據多樣性

- 每次 API 發送的數據會反映真實車流量
- 不同時間點的數據會有明顯差異
- 後端收到的數據更準確

### 2. 預測準確性

- 後端模型可以根據實際車流調整預測
- 預測的綠燈時間會有變化（不再總是相同）
- 更接近真實的自適應號誌系統

### 3. 日誌可追蹤性

- 可以在控制台看到每次收集的原始數據
- 可以追蹤數據處理過程（縮放、最小值保護）
- 可以確認重置時機和數據狀態

---

## 測試建議

### 1. 開啟開發者工具

打開瀏覽器控制台，觀察日誌輸出

### 2. 觀察關鍵日誌

搜尋以下關鍵字：

- `📊 [數據收集]` - 查看原始 vehicleData
- `✅ [數據收集]` - 查看各方向的真實數據和縮放結果
- `⚠️ [數據收集]` - 查看哪些方向使用了最小值
- `📤 [數據發送]` - 查看最終發送的數據
- `🔄 [數據重置]` - 查看重置時機和重置前的數據
- `🔄 [相位切換]` - 確認在相位切換時才重置

### 3. 驗證數據變化

- 第一次 API 觸發：數據可能較少
- 第二次 API 觸發：應該看到數據量增加
- 連續幾次：每次數據都應該不同

### 4. 檢查預測結果

- 觀察後端返回的預測綠燈秒數
- 確認預測時間會根據車流變化（不再總是相同）

---

## 相關文件

- [API觸發時機修正](./API_TRIGGER_FIX.md)
- [數據收集問題分析](./TRAFFIC_DATA_COLLECTION_FIX.md)

## 修改文件清單

- ✅ `src/classes/TrafficLightController.js`
  - 修改 `collectIntersectionData()` 方法
  - 修改 `resetVehicleData()` 方法
  - 修改 `countdownDelayWithAPI()` 方法
  - 修改 `runCycle()` 方法

## 測試狀態

- ✅ 靜態檢查通過（無編譯錯誤）
- 🔄 待進行：運行時測試和日誌驗證

---

**修正完成日期**：2025-10-19
**修正版本**：v2.0
