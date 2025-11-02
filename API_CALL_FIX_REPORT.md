# 🔧 API 多次呼叫問題 - 修復報告

## 📋 問題分析

### 症狀

- ✗ 後端收到多筆 API 呼叫（尤其是在離峰時段）
- ✗ apiCallCount 異常遞增
- ✗ 一個綠燈周期內發送多次相同數據

### 根本原因

在 TrafficLightController.js 中，`collectIntersectionData()` 方法被調用多次：

```
調用點 1: countdownDelayWithAPI() → collectIntersectionData() → apiCallCount++
          ↓
          sendDataToBackend(currentCycleData)
                ↓
調用點 2: sendDataToBackend 內部備用方案 → collectIntersectionData() → apiCallCount++
          ↓
調用點 3: API 失敗時 → collectIntersectionData() → apiCallCount++
```

**結果：** 一個綠燈周期內 apiCallCount 被遞增 2-3 次，但實際只應該發送 1 次 API！

---

## ✅ 修復方案

### 修改 1：移除 collectIntersectionData 中的計數

**檔案：** `TrafficLightController.js` 行 736-742

```javascript
// ❌ 移除 (舊)
collectIntersectionData() {
  this.apiCallCount = (this.apiCallCount || 0) + 1
  logInfo(`📞 [API 計數] 第 ${this.apiCallCount} 次呼叫`)
  // ...
}

// ✅ 改為 (新)
collectIntersectionData() {
  // API 計數移到 sendDataToBackend()
  // ...
}
```

### 修改 2：在 sendDataToBackend 開始位置遞增計數

**檔案：** `TrafficLightController.js` 行 975-982

```javascript
async sendDataToBackend(vdData = null) {
  try {
    // ✅ 新增：只在實際發送時遞增（不在收集時）
    this.apiCallCount = (this.apiCallCount || 0) + 1
    logInfo(`📞 [API 計數] 第 ${this.apiCallCount} 次呼叫`)
    // ...
  }
}
```

### 修改 3：添加週期內防重複標記

**檔案：** `TrafficLightController.js` 行 137

```javascript
// ✅ 新增初始化
this.apiAlreadySentInCycle = false // 防止同一周期內多次發送
```

### 修改 4：在 sendDataToBackend 開始檢查

**檔案：** `TrafficLightController.js` 行 974-979

```javascript
async sendDataToBackend(vdData = null) {
  try {
    // ✅ 防止同一綠燈周期內多次發送 API
    if (this.apiAlreadySentInCycle) {
      logInfo(`⚠️ [API 防重複] 本週期已發送過 API，跳過重複發送`)
      return null
    }
    this.apiAlreadySentInCycle = true
    // ...
  }
}
```

### 修改 5：在週期重置時清除標記

**檔案：** `TrafficLightController.js` 行 1495-1498

```javascript
resetTrafficDataForNextCycle() {
  console.log('🔄 開始新週期，重置交通數據...')

  // ✅ 新增：重置 API 防重複標記
  this.apiAlreadySentInCycle = false
  // ...
}
```

---

## 📊 修復效果

### 之前（問題）

```
綠燈周期 1：
  ├─ collectIntersectionData() 呼叫 1 → apiCallCount = 1
  ├─ collectIntersectionData() 呼叫 2（備用方案）→ apiCallCount = 2
  └─ API 發送 2 次 ❌

綠燈周期 2：
  ├─ collectIntersectionData() 呼叫 3 → apiCallCount = 3
  ├─ collectIntersectionData() 呼叫 4（備用方案）→ apiCallCount = 4
  └─ API 發送 2 次 ❌
```

### 之後（修復）

```
綠燈周期 1：
  ├─ collectIntersectionData() 呼叫（無計數）
  ├─ sendDataToBackend() 檢查 → apiAlreadySentInCycle = false
  ├─ sendDataToBackend() 執行 → apiCallCount = 1，apiAlreadySentInCycle = true
  ├─ 任何後續呼叫被攔截 ✅
  └─ API 發送 1 次 ✅

重置為下一周期 → apiAlreadySentInCycle = false

綠燈周期 2：
  ├─ collectIntersectionData() 呼叫（無計數）
  ├─ sendDataToBackend() 執行 → apiCallCount = 2，apiAlreadySentInCycle = true
  └─ API 發送 1 次 ✅
```

---

## 🎯 關鍵改進

| 項目                      | 改進前         | 改進後          |
| ------------------------- | -------------- | --------------- |
| **每週期 API 呼叫次數**   | 2-3 次         | **1 次** ✅     |
| **apiCallCount 遞增時機** | 收集階段       | **發送階段** ✅ |
| **防重複機制**            | ✗ 無           | **有** ✅       |
| **離峰時段穩定性**        | ✗ 不穩定       | **穩定** ✅     |
| **後端數據重複**          | ✗ 多筆相同數據 | **單筆** ✅     |

---

## 🔍 驗證方法

### 1. 檢查日誌

```javascript
// 應該看到：
📞 [API 計數] 第 1 次呼叫      // 周期 1
⚠️ [API 防重複] 本週期已發送過 API，跳過重複發送
📞 [API 計數] 第 2 次呼叫      // 周期 2
```

### 2. 監控後端接收

```
後端日誌應顯示：
- 第 1 個 request（綠燈周期 1）
- 第 2 個 request（綠燈周期 2）
- 第 3 個 request（綠燈周期 3）
...（每周期恰好 1 次）
```

### 3. 檢查 API 計數

```javascript
// 在瀏覽器控制台：
window.trafficLightController.apiCallCount
// 應該每個綠燈周期只遞增 1
```

---

## 📝 建議

1. **監測後端日誌** - 確認每個綠燈周期只收到 1 筆 API 呼叫
2. **測試離峰情景** - 特別驗證離峰時段（綠燈時間較短）的穩定性
3. **性能測試** - 運行 1 小時觀察是否有再次出現重複呼叫

---

## ✨ 修復狀態

✅ **完成** - 代碼已修改、編譯無誤、準備測試
