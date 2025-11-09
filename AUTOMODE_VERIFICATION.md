# ✅ 每日自動模式 - 驗證清單

## 🎯 快速驗證步驟

### Step 1: 啟動開發環境

```bash
cd traffic  # 進入前端目錄
quasar dev  # 啟動開發伺服器
```

### Step 2: 進入頁面

1. 打開 http://localhost:8080/
2. 等待系統完全加載（約 3-5 秒）
3. 看到紅綠燈和路口交通場景

### Step 3: 啟用每日自動模式

1. 在右上角找到模式切換按鈕
2. 點擊切換為「每日自動模式」
3. 應看到右側面板顯示：
   ```
   00:00:00 - 🌙 凌晨時段 - 極低流量 (0-6 點)
   生成間隔: 15s
   ```

### Step 4: 監控時間變化

1. **觀察時間更新**
   - 等待約 37.5 秒
   - 時間應更新至 `00:30:00`
   - 再等 37.5 秒應變為 `01:00:00`
   - 以此類推...

2. **驗證情景變化**
   - 達到 07:00 時：
     ```
     07:00:00 - 🚀 早尖峰時段 - 極高流量 (7-9 點)
     生成間隔: 2s
     ```
   - 達到 11:00 時：
     ```
     11:00:00 - ☀️ 午間時段 - 中等流量 (11-14 點)
     生成間隔: 3s
     ```

3. **驗證車流變化**
   - 早尖峰時段（7-9 點）：車流密集，能清楚看到多輛車同時行駛
   - 午間時段（11-14 點）：車流稍疏，車輛間隔較大
   - 凌晨時段（0-6 點）：車流極稀疏，長時間可能看不到車

## 📊 時間轉換參考

| 實際時間 | 模擬時間 | 備註            |
| -------- | -------- | --------------- |
| 0s       | 00:00    | 啟動            |
| 37.5s    | 00:30    | ✅ 第 1 次更新  |
| 75s      | 01:00    | ✅ 第 2 次更新  |
| 300s     | 06:00    | 清晨開始        |
| 337.5s   | 06:30    |                 |
| 375s     | 07:00    | 🚀 早尖峰開始   |
| 450s     | 08:00    |                 |
| 525s     | 09:00    | 早尖峰結束      |
| 1350s    | 18:00    | 晚間            |
| 1425s    | 19:00    |                 |
| 1800s    | 24:00    | 🔄 循環回 00:00 |

## 🛠️ 浏览器控制台驗證

打開浏览器開發者工具（F12）→ Console 標籤，運行以下命令：

```javascript
// 查看當前模擬時間
window.autoTrafficGenerator.simulationTime.toLocaleTimeString('it-IT')

// 查看自動模式是否啟用
window.autoTrafficGenerator.isAutoMode

// 查看當前配置的生成間隔
window.autoTrafficGenerator.config.interval.normal

// 查看時間累積器進度
window.autoTrafficGenerator.autoModeTimeAccumulator

// 查看下一次更新还需要的時間（毫秒）
37500 - window.autoTrafficGenerator.autoModeTimeAccumulator

// 檢查是否有錯誤日誌
// 查看控制台輸出中是否有以下日誌：
// 🕐 [自動模式] 模擬時間推進 30 分鐘 → HH:MM:SS
// 🔍 [_applyTrafficProfile] CALLED - isAutoMode=true
```

## ❌ 故障排除

### 問題 1：時間不更新

**症狀**：時間始終顯示 `00:00:00`

**檢查**：

```javascript
// 檢查自動模式是否真的啟用
console.log(window.autoTrafficGenerator.isAutoMode) // 應返回 true

// 檢查累積器是否在增長
let acc1 = window.autoTrafficGenerator.autoModeTimeAccumulator
setTimeout(() => {
  let acc2 = window.autoTrafficGenerator.autoModeTimeAccumulator
  console.log(acc2 > acc1 ? '✅ 累積器在增長' : '❌ 累積器未增長')
}, 1000)
```

**解決方案**：

1. 檢查 `update()` 方法是否在 RAF 主循環中被調用
2. 驗證 `autoModeTimeAccumulator` 是否在 constructor 中正確初始化
3. 查看控制台是否有 JavaScript 錯誤

### 問題 2：情景不變化

**症狀**：時間在變，但情景始終是凌晨

**檢查**：

```javascript
// 手動調用 _applyTrafficProfile
window.autoTrafficGenerator._applyTrafficProfile()

// 查看返回的情景
let hour = window.autoTrafficGenerator.simulationTime.getHours()
console.log(`當前小時: ${hour}`)

// 檢查時段判定邏輯
if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
  console.log('應該是 peak_hours')
} else if (hour >= 9 && hour < 17) {
  console.log('應該是 off_peak')
} else if (hour >= 19 && hour < 24) {
  console.log('應該是 off_peak')
} else {
  console.log('應該是 late_night')
}
```

**解決方案**：

1. 驗證 `getScenarioByTime()` 函數是否正確實現
2. 檢查 scenario key 判定邏輯
3. 確認 `_applyTrafficProfile()` 中的 scenario key 計算是否正確

### 問題 3：車流不變化

**症狀**：時間和情景都在變，但車流密度不變

**檢查**：

```javascript
// 查看當前配置
console.log(window.autoTrafficGenerator.config)

// 查看是否每次都更新配置
// 應該看到 interval.normal 根據時段變化
```

**解決方案**：

1. 驗證 scenario 配置中的 `interval` 是否正確
2. 檢查 `vehicleTypes` 是否被正確應用
3. 確認 `config.peakMultiplier` 是否變化

## 📈 性能監測

在控制台運行性能監測：

```javascript
// 每 10 秒顯示一次統計
window.performanceMonitor.start()

// 停止監測
window.performanceMonitor.stop()
```

## ✅ 完成檢查清單

- [ ] 時間每 37.5 秒更新一次
- [ ] 時間推進 30 分鐘（不是秒或其他單位）
- [ ] 07:00 時情景變為早尖峰（🚀）
- [ ] 早尖峰時段生成間隔為 2s
- [ ] 凌晨時段生成間隔為 15s
- [ ] 車流密度根據時段明顯變化
- [ ] 控制台沒有 JavaScript 錯誤
- [ ] UI 響應流暢，無卡頓

## 📞 報告問題

如果修復不工作，請提供以下信息：

1. **瀏覽器版本**：Chrome/Firefox/Safari/Edge
2. **系統時間**：多少秒後還沒有更新？
3. **控制台錯誤**：是否有紅色錯誤信息？
4. **預期 vs 實際**：
   ```javascript
   // 在控制台運行這些命令，報告結果
   window.autoTrafficGenerator.isAutoMode
   window.autoTrafficGenerator.simulationTime.toLocaleTimeString('it-IT')
   window.autoTrafficGenerator.config.interval.normal
   ```

---

**最後更新**：2025-11-09
**驗證版本**：完整時間推進邏輯（v2）
