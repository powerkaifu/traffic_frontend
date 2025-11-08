# 🚀 DOM 池化問題診斷 - 快速開始

## 目標
診斷 DOM 節點波動 (900 → 3000 → 1000...)，確認物件池是否完全生效。

## 如何執行診斷

### 步驟 1：啟動模擬
```bash
quasar dev
```

### 步驟 2：打開瀏覽器開發者工具
- 按 `F12` 或 `Ctrl+Shift+I`
- 切換到 **Console** 標籤

### 步驟 3：打開 Performance Monitor（可選）
- 按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（Mac）
- 搜尋 "Show console"
- 點擊 Rendering → Frame Rendering Stats
- 查看 `DOM Nodes` 數字的變化

### 步驟 4：觀察診斷日誌
**預期看到的日誌（每秒一次）**：
```
🔍 【DOM 池化診斷報告】
├─ 活動車輛數: 45
├─ activeCars 長度: 45
├─ DOM 節點數: 45
├─ 池統計:
│  ├─ 活躍: 45
│  ├─ 空閒池化: 20
│  └─ 各方向: {"east":5,"west":5,"south":5,"north":5}
└─ 效率指標: 100%
```

---

## 診斷結果解讀

### ✅ 成功案例（修復完成）

```
【第 0 秒】
├─ 活動車輛數: 5
├─ DOM 節點數: 5
├─ 效率指標: 100%

【第 10 秒】
├─ 活動車輛數: 48
├─ DOM 節點數: 48
├─ 效率指標: 100%

【第 20 秒】
├─ 活動車輛數: 50
├─ DOM 節點數: 50
├─ 效率指標: 100%

【第 100 秒（長時間運行）】
├─ 活動車輛數: 50
├─ DOM 節點數: 50
├─ 效率指標: 100%
```

**特徵**：
- ✅ `DOM 節點數 ≈ 活動車輛數` (1:1 匹配)
- ✅ 池中保留 10-20 個空閒車輛
- ✅ 效率指標始終 100%
- ✅ DOM 節點數**穩定不波動**（看不到鋸齒狀）

---

### ❌ 問題案例（修復未完成）

```
【第 0 秒】
├─ 活動車輛數: 5
├─ DOM 節點數: 150
├─ 效率指標: 3000%

【第 5 秒】
├─ 活動車輛數: 45
├─ DOM 節點數: 3200  ← ❌ 遠大於車輛數
├─ 效率指標: 7111%

【第 10 秒（GC 觸發）】
├─ 活動車輛數: 45
├─ DOM 節點數: 400   ← ❌ 突然下降
├─ 效率指標: 889%

【持續波動】
├─ 900 → 3000 → 400 → 2500 → 600 → ...
```

**特徵**：
- ❌ `DOM 節點數 >> 活動車輛數` (僵屍 DOM)
- ❌ 效率指標遠大於 100%（>1000%)
- ❌ DOM 節點數劇烈波動（鋸齒狀，可見 Performance Monitor 中閃爍）
- ❌ 卡頓現象（GC 暫停導致的幀率下降）

---

## 立即檢查清單

| 項目 | 檢查項目 | 預期 |
|------|--------|------|
| 池大小 | `totalPooled` 是否 > 0 | ✅ 應 > 10 |
| 活躍 | `totalActive` 是否 ≈ `activeCars.length` | ✅ 應相等 |
| DOM 節點 | `DOM 節點數` 是否 ≈ `活動車輛數` | ✅ 應相等 |
| 效率 | `效率指標` 是否 ≈ 100% | ✅ 應 90-110% |

---

## 如果診斷顯示問題...

### 問題 #1：`效率指標 > 1000%`

**症狀**：`DOM 節點數 >> 活動車輛數`

**可能原因**：
1. 池中的車輛未正確隱藏（`autoAlpha: 0` 未設置）
2. 僵屍 DOM 節點未清理
3. 緊急備用路徑創建了太多新車

**檢查**：
```javascript
// 在控制台運行
const pool = vehiclePool.poolMap.get('east')
const vehicle = pool[0]
console.log('隱藏狀態:', window.getComputedStyle(vehicle.element).opacity)
console.log('位置:', vehicle.element.style.transform)
```

**修復**：查看 `VehiclePool.release()` → 確認 `gsap.set(autoAlpha: 0)` 已執行

---

### 問題 #2：`DOM 節點數波動（鋸齒狀）`

**症狀**：900 → 3000 → 1000 → 2500 → ...

**可能原因**：
1. 池正常工作，但缺少初始預熱
2. 生成速度與清理速度不匹配
3. 池耗盡，強制創建新車輛

**檢查**：
```javascript
// 查看控制台是否有這個警告
⚠️ 池耗盡！創建了新車 [east]
```

**修復**：
1. 增加池大小（在 `VehiclePool` 的 `constructor` 中）
2. 調整 `AutoTrafficGenerator` 的生成速度

---

### 問題 #3：`totalPooled = 0`

**症狀**：池中沒有空閒車輛

**可能原因**：
1. 池被耗盡，所有車輛都活躍
2. `release()` 未被正確調用

**檢查**：
```javascript
// 搜尋控制台日誌
console.log('搜尋: 從池中取車')
console.log('搜尋: 已回收')
```

**修復**：檢查 `IndexPage.vue` 中的 `removeVehicleFromSimulation()` → 確認調用 `pool.release()`

---

## 長時間監控

對於 5-10 分鐘的長時間運行，可以記錄診斷數據：

```javascript
// 在控制台運行
let diagnosticLogs = []

const startDiagnosticLog = () => {
  // 替換原本的 console.log 診斷輸出
  window._originalLog = console.log
  console.log = function(...args) {
    if (args[0]?.includes?.('🔍 【DOM 池化診斷報告】')) {
      diagnosticLogs.push({
        time: new Date().toISOString(),
        log: args.join(' ')
      })
    }
    window._originalLog.apply(console, args)
  }
}

const stopAndExportLog = () => {
  console.log = window._originalLog
  const csv = diagnosticLogs.map(d => `${d.time}, ${d.log}`).join('\n')
  console.log('【診斷日誌】', csv)
  return csv
}

// 啟動
startDiagnosticLog()

// 等待 5 分鐘...

// 導出結果
stopAndExportLog()
```

---

## 預期時間表

| 時間點 | 預期結果 |
|--------|---------|
| **0 秒** | 初始化完成，DOM 節點 = 0 |
| **30 秒** | 車流穩定，DOM 節點 ≈ 50，不波動 |
| **1 分鐘** | 效率 100%，GC 罕見 |
| **5 分鐘** | 持續穩定，無幀率下降 |
| **10 分鐘** | 內存占用平穩 |

如果在**任何時間點**看到波動，立即查看上面的"如果診斷顯示問題"部分。

---

## 成功指標

診斷通過的標誌：
- ✅ `DOM 節點數` 穩定（波動 < 10%）
- ✅ `效率指標` ≈ 100%（90-110% 範圍內）
- ✅ 無 `⚠️ 池耗盡` 警告
- ✅ 運行 5+ 分鐘無卡頓
- ✅ Performance Monitor 中 DOM Nodes 呈平穩線

---

## 下一步行動

1. **立即**：按照上面的步驟 1-4 啟動診斷
2. **5 分鐘**：收集診斷數據，判斷問題類型
3. **15 分鐘**：根據問題類型應用修復（見上面的修復清單）
4. **10 分鐘**：重新運行診斷，驗證修復

**預期總耗時**：30 分鐘內解決 DOM 節點波動問題。
