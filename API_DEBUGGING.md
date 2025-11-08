# 🔍 API 數據串接功能 - 診斷報告

## 問題描述
**API 數據串接功能失效**

---

## 🎯 系統檢查清單

### 1️⃣ API 觸發機制檢查

#### 問題點 1: Worker 的 api_trigger 消息是否正確發送？
**位置**: `CountdownWorker.js` 第 58-61 行
```javascript
if (apiTriggerSecond !== null && remaining === apiTriggerSecond && !apiTriggered) {
  apiTriggered = true
  self.postMessage({
    type: 'api_trigger',
    remaining,
    elapsed,
  })
}
```

**檢查清單**:
- ✅ apiTriggerSecond 參數是否被正確傳遞到 Worker?
- ✅ remaining === apiTriggerSecond 條件是否為真?
- ✅ apiTriggered 防重複機制是否有效?

**診斷命令** (在 DevTools Console 執行):
```javascript
// 監聽 Worker 消息
if (window.trafficLightController?.countdownWorker) {
  window.trafficLightController.countdownWorker.addEventListener('message', (e) => {
    console.log('🔔 Worker 消息:', e.data.type, e.data)
  })
}
```

---

### 2️⃣ TrafficLightController 接收機制檢查

#### 問題點 2: handleMessage 是否監聽 api_trigger?
**位置**: `TrafficLightController.js` 第 870-883 行
```javascript
const handleMessage = (event) => {
  const { type, remaining } = event.data

  if (type === 'tick') {
    if (this.onTimerUpdate) {
      this.onTimerUpdate(null, remaining)
    }
  } else if (type === 'api_trigger') {
    // ✅ 應該進入這個分支
    logInfo(`⏰ [API觸發] 剩餘 ${remaining} 秒，開始 AI 預測流程...`)
    const currentCycleData = this.collectIntersectionData()
    this.sendDataToBackend(currentCycleData)
    this.updateFeatureSimulationDisplay(currentCycleData)
  }
}
```

**檢查清單**:
- ✅ handleMessage 是否被正確註冊?
- ✅ addEventListener 是否成功附加到 Worker?
- ✅ api_trigger 消息是否被接收?

**診斷命令**:
```javascript
// 檢查 handleMessage 是否存在
console.log('TrafficLightController:', window.trafficLightController)
console.log('CountdownWorker:', window.trafficLightController?.countdownWorker)
```

---

### 3️⃣ API 端點檢查

#### 問題點 3: 後端 API 是否正在運行?
**端點**: `http://localhost:8000/api/traffic/predict/`

**檢查清單**:
- ❓ 後端服務是否已啟動?
- ❓ 端口 8000 是否可訪問?
- ❓ CORS 是否配置正確?

**診斷命令**:
```javascript
// 測試 API 連接
fetch('http://localhost:8000/api/traffic/predict/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
})
.then(r => console.log('✅ API 響應:', r.status))
.catch(e => console.error('❌ API 錯誤:', e.message))
```

---

### 4️⃣ 數據收集機制檢查

#### 問題點 4: collectIntersectionData() 是否正常工作?
**位置**: `TrafficLightController.js` 第 930+ 行

**檢查清單**:
- ✅ vehicleData 是否被正確填充?
- ✅ 車輛計數是否準確?
- ✅ 返回的數據結構是否符合預期?

**診斷命令**:
```javascript
// 測試數據收集
const data = window.trafficLightController?.collectIntersectionData?.()
console.log('📊 收集的數據:', data)
console.table(data)
```

---

### 5️⃣ API 防重複機制檢查

#### 問題點 5: apiAlreadySentInCycle 是否阻止了合法請求?
**位置**: `TrafficLightController.js` 第 1420-1426 行
```javascript
if (this.apiAlreadySentInCycle) {
  logInfo(`⚠️ [API 防重複] 本週期已發送過 API，跳過重複發送 (計次: ${this.apiCallCount})`)
  return null  // ❌ 這可能導致 API 不發送!
}
```

**問題分析**:
- 🔴 **這可能是根本原因**: 防重複機制使用 `apiAlreadySentInCycle` 標記
- 當新的燈號週期開始時，這個標記應該被重置
- 但如果重置不及時，API 將被跳過

**檢查位置**: `TrafficLightController.js` 第 2036 行
```javascript
this.apiAlreadySentInCycle = false  // ✅ 應在燈號變化時重置
```

**診斷命令**:
```javascript
console.log('API 已發送標記:', window.trafficLightController?.apiAlreadySentInCycle)
console.log('API 調用計數:', window.trafficLightController?.apiCallCount)
```

---

## 🚨 最可能的根本原因

### 假設 1: apiTriggerSecond 未被正確傳遞
```javascript
// TrafficLightController.js 第 862 行
this.countdownWorker.postMessage({
  command: 'startCountdown',
  duration: totalMs,
  precision: 100,
  apiTriggerSecond: actualTriggerSeconds  // ❓ 這個值是否正確?
})
```

**可能值**:
- apiTriggerSecond = 10 (倒數 10 秒時觸發)
- 但如果 actualTriggerSeconds 未定義，則此參數為 undefined

### 假設 2: handleMessage 未被正確附加
```javascript
// TrafficLightController.js 第 873 行
const handleMessage = (event) => { ... }
this.countdownWorker.addEventListener('message', handleMessage)
```

**問題**:
- 如果 Worker 尚未創建，addEventListener 將失敗
- 如果 handleMessage 作用域錯誤，消息可能被發送到舊的 listener

### 假設 3: 防重複機制過度阻止
```javascript
// sendDataToBackend 返回 null，不發送 API
if (this.apiAlreadySentInCycle) {
  return null
}
```

**問題**:
- 燈號週期循環時，這個標記未被重置
- 所有後續的 API 請求都被跳過

---

## ✅ 快速修復清單

### Step 1: 驗證 Worker 消息流
```bash
# 在瀏覽器 DevTools Console 中:
# 添加監聽器，檢查 Worker 是否發送 api_trigger
```

### Step 2: 確認 API 觸發秒數
```javascript
// 在 TrafficLightController.js 中添加調試
logInfo(`🔍 [API 觸發秒數] actualTriggerSeconds = ${actualTriggerSeconds}`)
```

### Step 3: 驗證防重複標記重置
```javascript
// 檢查燈號變化時是否重置
// TrafficLightController.js 第 2036 行
// 確保在新的綠燈周期開始時調用此行
```

### Step 4: 檢查後端服務
```bash
# 確認後端是否運行
curl -X POST http://localhost:8000/api/traffic/predict/ \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 📋 完整診斷工具

複製以下代碼到 DevTools Console，一次性檢查所有組件:

```javascript
console.log('='.repeat(60))
console.log('🔍 API 功能完整診斷')
console.log('='.repeat(60))

const tc = window.trafficLightController
const cw = tc?.countdownWorker

// 1. Worker 檢查
console.log('\n1️⃣ Worker 狀態:')
console.log('  - Worker 存在:', !!cw)
console.log('  - Worker 類型:', cw?.constructor.name)

// 2. API 狀態
console.log('\n2️⃣ API 狀態:')
console.log('  - API 端點:', tc?.apiEndpoint)
console.log('  - API 調用計數:', tc?.apiCallCount)
console.log('  - API 已發送標記:', tc?.apiAlreadySentInCycle)

// 3. 車輛數據
console.log('\n3️⃣ 車輛數據:')
console.table(tc?.vehicleData)

// 4. 數據收集測試
console.log('\n4️⃣ 數據收集測試:')
const collectedData = tc?.collectIntersectionData?.()
console.log('  - 收集數據筆數:', collectedData?.length)
console.table(collectedData?.[0])

// 5. 手動發送測試 API
console.log('\n5️⃣ 測試 API 連接:')
fetch('http://localhost:8000/api/traffic/predict/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(collectedData || [])
})
.then(r => console.log('✅ API 響應:', r.status, r.statusText))
.catch(e => console.error('❌ API 錯誤:', e.message))

console.log('='.repeat(60))
```

---

## 🔧 建議的修復步驟

1. **立即檢查**: 在瀏覽器控制台運行診斷工具
2. **查看日誌**: 檢查控制台輸出中的 `[API觸發]` 消息
3. **驗證後端**: 確認 `http://localhost:8000` 是否可訪問
4. **檢查防重複**: 驗證 `apiAlreadySentInCycle` 是否在燈號變化時重置
5. **添加日誌**: 在 CountdownWorker.js 中添加調試消息

---

## 📝 相關文件

- **CountdownWorker.js** - Worker 線程，負責倒數和 API 觸發
- **TrafficLightController.js** - 主控制器，接收 Worker 消息並發送 API
- **API 端點** - `http://localhost:8000/api/traffic/predict/`
- **關鍵方法** - `sendDataToBackend()`, `collectIntersectionData()`, `countdownDelayWithAPI()`

---

## 📞 後續操作

等待檢查結果...診斷完成後，我將根據結果提供具體修復方案！
