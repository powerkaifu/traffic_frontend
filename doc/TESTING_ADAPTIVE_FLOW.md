# AdaptiveFlowController 測試和驗證指南

## 環境檢查

### 1. 編譯驗證

```bash
npm run build
# 預期: ✅ Build succeeded (0 errors, 0 warnings)
```

### 2. 開發服務器啟動

```bash
npm run dev
# 或使用現有任務: quasar dev
```

## 功能測試

### 第一步: 驗證初始化

打開瀏覽器控制臺（F12），檢查以下日誌：

```
✅ AdaptiveFlowController started
--------------------- 📊 自適應流量控制器已啟動 ---------------------
```

### 第二步: 驗證全局訪問

在控制臺執行：

```javascript
// 確認實例存在
console.log(window.adaptiveFlowController)
// 預期: AdaptiveFlowController { ... }

// 確認正在運行
console.log(window.adaptiveFlowController.isRunning)
// 預期: true
```

### 第三步: 監控佔有率

#### 方法 1: 實時監控單個方向

```javascript
setInterval(() => {
  const data = window.adaptiveFlowController.getOccupancyData('east')
  console.log(
    `東向: ${data.occupancyPercentage.toFixed(2)}% (${data.vehiclesInZone} 輛) × ${data.adjustmentFactor.toFixed(2)}`,
  )
}, 5000)
```

#### 方法 2: 監控所有方向

```javascript
setInterval(() => {
  const status = window.adaptiveFlowController.getStatusSummary()
  console.table(status.occupancy)
}, 5000)
```

#### 方法 3: 監控完整狀態

```javascript
setInterval(() => {
  const allData = window.adaptiveFlowController.getAllOccupancyData()
  Object.entries(allData).forEach(([dir, data]) => {
    console.log(`${dir.padEnd(6)} | 佔有率: ${data.occupancyPercentage.toFixed(2).padStart(6)}% | 車輛: ${String(data.vehiclesInZone).padStart(2)} | 係數: ${data.adjustmentFactor.toFixed(2)}x`)
  })
}, 5000)
}, 5000)
```

### 第四步: 驗證檢測區邏輯

1. **打開網頁開始模擬**
2. **觀察車輛運動**：
   - 車輛應該自動生成
   - 車輛應該正常行駛通過路口
3. **檢查控制臺日誌**：
   ```
   📊 [east] 佔有率: X.XX% | 車輛: Y | 調整係數: Z.ZZx
   ```

### 第五步: 驗證動態調整

執行以下測試序列：

#### 測試 A: 低佔有率調整

```javascript
// 1. 查看當前佔有率
window.adaptiveFlowController.getOccupancyData('east').occupancyPercentage

// 2. 如果低於 30%，應該看到 adjustmentFactor = 1.2x
// 3. 檢查 AutoTrafficGenerator 的配置是否被修改
console.log(window.autoTrafficGenerator.config.interval)
```

#### 測試 B: 高佔有率調整

```javascript
// 1. 快速生成大量車輛 (如果有此功能)
// 2. 查看佔有率是否上升
// 3. 當超過 70% 時，應該看到 adjustmentFactor = 0.8x
// 4. 確認生成間隔被延長
```

#### 測試 C: 正常範圍

```javascript
// 佔有率在 30-70% 之間時
// adjustmentFactor 應該為 1.0x
// 生成速率應該保持不變
```

## 數據驗證

### 檢查歷史記錄

```javascript
// 獲取最近 5 條歷史記錄
const history = window.adaptiveFlowController.getOccupancyHistory('east', 5)
console.table(history)

// 預期輸出:
// ┌─────────┬──────────────────────┬──────────────────┬──────────────────┐
// │ (index) │      timestamp       │ occupancyPercentage │ adjustmentFactor │
// ├─────────┼──────────────────────┼──────────────────┼──────────────────┤
// │    0    │ 1704067200000        │     45.50        │       1.00       │
// │    1    │ 1704067260000        │     52.30        │       1.00       │
// │    2    │ 1704067320000        │     38.20        │       1.20       │
// │    3    │ 1704067380000        │     72.40        │       0.80       │
// │    4    │ 1704067440000        │     51.30        │       1.00       │
// └─────────┴──────────────────────┴──────────────────┴──────────────────┘
```

### 檢查停止線檢測

```javascript
// 驗證停止線位置是否正確
const detector = window.adaptiveFlowController
console.log('東方停止線:', detector._getStopLinePosition('east'))
console.log('西方停止線:', detector._getStopLinePosition('west'))
console.log('南方停止線:', detector._getStopLinePosition('south'))
console.log('北方停止線:', detector._getStopLinePosition('north'))

// 預期:
// 東方停止線: 650
// 西方停止線: 180
// 南方停止線: 480
// 北方停止線: 320
```

### 檢查檢測區大小

```javascript
console.log('檢測區長度:', window.adaptiveFlowController.DETECTION_ZONE_LENGTH, 'px')
console.log('檢測區長度:', window.adaptiveFlowController.DETECTION_ZONE_LENGTH / 10, 'm')

// 預期: 500px = 50m
```

## 性能測試

### CPU 使用率監控

```javascript
// 在控制臺執行，觀察系統性能
console.time('occupancy-calculation')
for (let i = 0; i < 100; i++) {
  window.adaptiveFlowController._updateOccupiedTime()
}
console.timeEnd('occupancy-calculation')
// 預期: < 10ms per 100 calls
```

### 內存使用測試

```javascript
// 檢查歷史記錄大小
const totalHistory = Object.values(window.adaptiveFlowController.occupancyHistory).reduce(
  (sum, arr) => sum + arr.length,
  0,
)
console.log('歷史記錄總數:', totalHistory)
// 預期: 最多 100 × 4 = 400 條記錄
```

## 故障排查

### 問題 1: 佔有率始終為 0%

**可能原因**: 檢測區內未檢測到車輛

**排查步驟**:

```javascript
// 1. 檢查是否有車輛在運動
console.log('活躍車輛:', window.liveVehicles?.length || 0)

// 2. 檢查檢測區邊界
const stopLine = window.adaptiveFlowController._getStopLinePosition('east')
const zone = {
  start: stopLine - window.adaptiveFlowController.DETECTION_ZONE_LENGTH,
  end: stopLine,
}
console.log('東向檢測區:', zone)

// 3. 手動檢查車輛位置
window.liveVehicles?.forEach((v, i) => {
  if (v.direction === 'east' && i < 3) {
    console.log(`車輛 ${i}: headPos=${v.headPos}, 在檢測區內=${v.headPos > zone.start && v.headPos < zone.end}`)
  }
})
```

**解決方案**: 驗證並調整 `_getStopLinePosition()` 中的停止線座標

### 問題 2: 控制臺報錯

**常見錯誤**:

```javascript
// 錯誤: Cannot read property 'vehicles' of undefined
// 原因: trafficController 未正確傳入
// 解決: 確保 AdaptiveFlowController 初始化時接收有效的 trafficController
```

### 問題 3: 生成速率無法調整

**排查步驟**:

```javascript
// 1. 確認 AutoTrafficGenerator 實例存在
console.log(window.autoTrafficGenerator)

// 2. 檢查配置變化
const before = JSON.stringify(window.autoTrafficGenerator.config)
// 等待 60 秒，然後：
const after = JSON.stringify(window.autoTrafficGenerator.config)
console.log('配置已改變:', before !== after)

// 3. 檢查調整係數
const data = window.adaptiveFlowController.getOccupancyData('east')
console.log('調整係數:', data.adjustmentFactor)
```

## 功能完整性檢查清單

### 核心功能

- [ ] 控制器成功初始化
- [ ] 控制器成功啟動
- [ ] 每 100ms 更新一次被佔用時間
- [ ] 每 60s 計算一次佔有率
- [ ] 佔有率計算結果在 0-100% 之間
- [ ] 調整係數根據佔有率正確變化

### 數據收集

- [ ] 歷史記錄正確保存
- [ ] 歷史記錄限制在 100 條
- [ ] 時間戳準確
- [ ] 車輛計數正確

### 控制行為

- [ ] 低佔有率 (< 30%) 時，係數 = 1.2x
- [ ] 高佔有率 (> 70%) 時，係數 = 0.8x
- [ ] 正常佔有率 (30-70%) 時，係數 = 1.0x
- [ ] 生成間隔根據係數被修改

### 全局集成

- [ ] window.adaptiveFlowController 可訪問
- [ ] 所有公共 API 可用
- [ ] 停止時正確清理資源
- [ ] 頁面卸載時正確停止

### 性能

- [ ] 不卡頓（FPS > 30）
- [ ] CPU 使用率 < 5%
- [ ] 內存使用穩定

## 生成測試方案

### 方案 A: 自動低佔有率測試（無需手動操作）

```javascript
// 凌晨時段，車流稀疏
// 預期: 佔有率 < 30%，系統自動增加生成速率
// 驗證: 車流逐漸增加，生成間隔縮短
```

### 方案 B: 手動高佔有率測試

```javascript
// 快速生成大量車輛
// 可以添加臨時函數到 IndexPage.vue
const rapidGenerate = async () => {
  for (let i = 0; i < 50; i++) {
    // 觸發生成邏輯
    window.autoTrafficGenerator._generateVehicle('east', 2)
    await new Promise((r) => setTimeout(r, 100))
  }
}

// 執行: rapidGenerate()
// 預期: 佔有率上升 > 70%，系統自動降低生成速率
```

### 方案 C: 持續監控測試

```javascript
// 在控制臺執行此代碼監控整個過程
const monitor = setInterval(() => {
  const status = window.adaptiveFlowController.getStatusSummary()
  const timestamp = new Date().toLocaleTimeString()
  console.log(`[${timestamp}] 平均佔有率: ${status.averageOccupancy}%`)
}, 10000) // 每 10 秒打印一次

// 停止監控: clearInterval(monitor)
```

## 數據分析

### 收集數據進行分析

```javascript
// 收集 5 分鐘的數據
const analysisData = {
  startTime: Date.now(),
  records: [],
}

const collector = setInterval(() => {
  if (Date.now() - analysisData.startTime > 300000) {
    // 5 分鐘
    clearInterval(collector)
    analyzeData(analysisData.records)
    return
  }

  const status = window.adaptiveFlowController.getStatusSummary()
  analysisData.records.push({
    timestamp: Date.now(),
    occupancy: Object.values(status.occupancy).map(Number),
  })
}, 5000)

function analyzeData(records) {
  const avg = records.reduce((sum, r) => sum + r.occupancy.reduce((a, b) => a + b) / 4, 0) / records.length
  const max = Math.max(...records.map((r) => Math.max(...r.occupancy)))
  const min = Math.min(...records.map((r) => Math.min(...r.occupancy)))

  console.log('5 分鐘分析結果:')
  console.log('平均佔有率:', avg.toFixed(2), '%')
  console.log('最高佔有率:', max.toFixed(2), '%')
  console.log('最低佔有率:', min.toFixed(2), '%')
  console.log('波動範圍:', (max - min).toFixed(2), '%')
}
```

## 下一步行動

1. **調整停止線座標**: 根據實際十字路口調整停止線位置
2. **長期觀察**: 在開發服務器上運行 1-2 小時，觀察系統行為
3. **微調參數**: 根據實際需求調整佔有率臨界值和調整係數
4. **添加監控面板**: 考慮創建視覺化監控界面
5. **性能優化**: 如果需要，優化檢測邏輯或參數

---

**最後更新**: 2024-12-19
**版本**: AdaptiveFlowController v1.0
