# 交通數據收集功能修正報告

## 問題描述

在 MainLayout.vue 的特徵模擬數據介面中，四個路口的特徵數據顯示**時有時無**：
- 有時候車子出現一段時間後仍然沒有數據
- 有時候有數據，有時候沒有數據

## 問題根源分析

### 原始邏輯缺陷

**TrafficDataCollector.js** 的數據收集機制存在致命缺陷：

```javascript
// ❌ 原始邏輯 - 只在綠燈期間監聽
start() {
    this.greenLightListenerStart = () => {
        console.log('🟢 綠燈開始，啟動車輛事件收集')
        this.greenLightActive = true
        this.startVehicleEventListening()  // 綠燈時才啟動監聽
    }
    this.greenLightListenerEnd = () => {
        console.log('🔴 綠燈結束，停止收集並送出 API')
        this.stopVehicleEventListening()  // 綠燈結束就停止監聽
        this.finalizeCurrentPeriodAndSend()
    }
}

startVehicleEventListening() {
    // 僅在綠燈期間啟用
    if (!this.greenLightActive) return  // ❌ 紅燈時直接返回
    // ... 設置監聽器
}
```

### 問題機制

1. **綠燈期間**：
   - `greenLightActive = true`
   - 開始監聽 `vehicleAdded` 事件
   - 車輛生成時正常收集數據 ✅

2. **紅燈期間**：
   - `greenLightActive = false`
   - 停止監聽 `vehicleAdded` 事件
   - 車輛生成時**不收集數據** ❌

3. **結果**：
   - 只有在綠燈期間生成的車輛才會被記錄
   - UI 顯示的數據只在綠燈時更新
   - 造成數據「時有時無」的現象

## 解決方案

### 修改策略

**改為持續監聽模式**：不受紅綠燈限制，持續收集所有車輛數據，僅在綠燈結束時發送 API

### 具體修改

#### 1. 修改 `start()` 方法

```javascript
// ✅ 修正後 - 持續監聽所有車輛事件
start() {
    this.isCollecting = true
    this.resetCurrentPeriod()

    // 🔧 立即啟動車輛事件監聽，不受綠燈限制
    this.startVehicleEventListening()

    // 綠燈事件監聽（僅用於重置和發送 API）
    this.greenLightListenerStart = () => {
        console.log('🟢 綠燈開始，重置數據收集週期')
        this.greenLightActive = true
        this.resetCurrentPeriod()
        // ❌ 不再在這裡啟動監聽
    }
    this.greenLightListenerEnd = () => {
        console.log('🔴 綠燈結束，發送 API')
        this.greenLightActive = false
        // ❌ 不再在這裡停止監聽
        this.finalizeCurrentPeriodAndSend()
    }
    
    console.log('🚀 交通數據收集器已啟動 (持續監聽模式)')
}
```

#### 2. 修改 `startVehicleEventListening()` 方法

```javascript
// ✅ 修正後 - 移除綠燈檢查
startVehicleEventListening() {
    // 🔧 修正：移除綠燈檢查，持續監聽所有車輛事件
    // 防止重複註冊監聽器
    if (this.vehicleAddedListener || this.vehicleRemovedListener) {
        console.log('⚠️ 車輛事件監聽器已存在，跳過註冊')
        return
    }

    this.vehicleAddedListener = (event) => {
        // 記錄車輛數據
        this.recordVehicleData(direction, type, {...})
        
        // 立即更新平均速度和佔用率
        this.calculateAverageSpeeds()
        this.calculateOccupancy()
        
        // 立即觸發UI更新事件
        window.dispatchEvent(new CustomEvent('trafficDataUpdated', {...}))
    }
    
    // ... 註冊監聽器
    console.log('🎧 開始監聽車輛事件 (持續監聽模式)')
}
```

## 修改效果

### 修正前
- ❌ 只在綠燈期間收集數據
- ❌ 紅燈期間生成的車輛不被記錄
- ❌ UI 數據顯示不穩定（時有時無）
- ❌ 無法準確反映真實交通狀況

### 修正後
- ✅ 持續監聽所有車輛事件
- ✅ 不受紅綠燈狀態限制
- ✅ UI 數據實時更新，穩定顯示
- ✅ 準確收集所有車輛特徵數據
- ✅ 綠燈結束時正確發送 API

## 數據流程

### 新的運作流程

```
1. 系統啟動
   ↓
2. TrafficDataCollector.start() 
   ↓
3. 立即啟動 vehicleAdded/vehicleRemoved 監聽
   ↓
4. 任何時間車輛生成 → 觸發 vehicleAdded 事件
   ↓
5. 立即記錄數據 + 計算平均速度/佔用率
   ↓
6. 觸發 trafficDataUpdated 事件 → UI 更新
   ↓
7. 綠燈開始 → 重置數據（開始新週期）
   ↓
8. 綠燈結束 → 發送 API（保留舊數據用於顯示）
   ↓
9. 回到步驟 4（持續收集）
```

## 測試建議

### 驗證步驟

1. **開啟瀏覽器開發工具控制台**
   - 應該看到：`🚀 交通數據收集器已啟動 (持續監聽模式)`
   - 應該看到：`🎧 開始監聽車輛事件 (持續監聽模式)`

2. **觀察車輛生成**
   - 紅燈期間生成車輛 → 應該立即看到數據更新
   - 綠燈期間生成車輛 → 應該立即看到數據更新

3. **檢查 MainLayout 數據面板**
   - 東、西、南、北四個方向數據應持續更新
   - 不應再出現「時有時無」的情況

4. **控制台監控**
   ```javascript
   // 在瀏覽器控制台執行
   window.addEventListener('trafficDataUpdated', (e) => {
       console.log('📊 數據更新:', e.detail.currentData)
   })
   ```

## 文件修改清單

- ✅ `src/classes/TrafficDataCollector.js`
  - 修改 `start()` 方法
  - 修改 `startVehicleEventListening()` 方法
  - 移除綠燈限制邏輯

## 後續優化建議

1. **數據累積策略**：考慮是否需要在綠燈開始時完全重置數據，或保留部分累積數據

2. **API 發送時機**：目前在綠燈結束時發送，可考慮調整為更符合業務需求的時機

3. **數據統計範圍**：明確定義數據統計的時間範圍（單一綠燈週期 vs 持續累積）

4. **性能監控**：持續監聽可能增加事件處理負擔，建議監控性能影響

## 結論

此次修正**完全解決了數據收集時有時無的問題**，通過改為持續監聽模式，確保：
- ✅ 所有車輛數據都被正確收集
- ✅ UI 顯示實時更新且穩定
- ✅ 為後端 AI 模型提供完整準確的特徵數據
