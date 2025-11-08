# 物件池實現驗證清單

## ✅ 代碼審查

### VehiclePool.js
- [x] acquire() 正確返回池中車輛或新建車輛
- [x] release() 隱藏元素（autoAlpha: 0）而不移除 DOM
- [x] release() 正確調用 reset()
- [x] dispose() 清理所有車輛和池數據結構
- [x] getStats() 提供池統計信息
- [x] ESLint 無警告

### Vehicle.js - reset() 方法
- [x] 隱藏元素（x: -9999, y: -9999）
- [x] 重置所有狀態（速度、位置、燈號標記）
- [x] 重置 waitingForGreen（關鍵！）
- [x] 重置 isAtStopLine 和 hasPassedStopLine
- [x] 重置 isRemoved 和 isCompleted
- [x] 殺死 GSAP 動畫
- [x] 清理定時器
- [x] 清理時間線
- [x] generateRandomSpeed() 存在且可用
- [x] getVehicleConfig() 存在且可用

### Vehicle.js - moveAlongPath onComplete
- [x] 改為傳遞 vehicle 實例（this）
- [x] 移除 this.remove() 調用
- [x] 正確傳遞給 onVehicleOutOfBounds 回調

### IndexPage.vue - 初始化
- [x] 導入 VehiclePool
- [x] onMounted 中初始化 vehiclePool
- [x] 傳入 vehicleContainer 和 store

### IndexPage.vue - 車輛創建
- [x] 改為使用 vehiclePool.acquire()
- [x] 備用邏輯：池未初始化時直接創建
- [x] 保留 progress 設置邏輯

### IndexPage.vue - handleVehicleOutOfBounds
- [x] 接收 vehicle 實例（而不是 vehicleId）
- [x] 從 activeCars 中移除車輛
- [x] 呼叫 vehiclePool.release()
- [x] 備用邏輯：池未初始化時直接 reset

### IndexPage.vue - 清理
- [x] onUnmounted 中呼叫 vehiclePool.dispose()
- [x] 正確清理池參考

### 燈號邏輯保護
- [x] checkStopLineAndRespond() 完全未修改
- [x] shouldStop 邏輯完全保留
  - [x] 紅燈：停止
  - [x] 全紅：停止  
  - [x] 1 號車道 + 直行綠燈：停止
- [x] _performStopAtLine() 邏輯完全保留
- [x] _canProceedThroughStopLine() 邏輯完全保留
- [x] TrafficLightController 未修改

## 🧪 功能測試場景

### 場景 1：長時間運行 (15+ 分鐘)
```
步驟：
1. 打開開發者工具 → Elements 面板
2. 搜尋 "vehicle" class
3. 觀察 div.vehicle 數量變化（每 30 秒記錄一次）
4. 觀察記憶體使用量（DevTools → Memory）

預期結果：
- div.vehicle 數量恆定（不應無限增長）
- 記憶體使用量為鋸齒波（小幅上升 → 穩定）
- 無法檢測到明顯的內存洩漏

狀態：待測試 ⏳
```

### 場景 2：燈號互斥性
```
步驟：
1. 切換燈號到「東西向綠燈」
2. 觀察南北向車輛行為
3. 切換燈號到「南北向綠燈」
4. 觀察東西向車輛行為

預期結果：
- 東西向綠燈時 → 南北向所有車停止 ✓
- 南北向綠燈時 → 東西向所有車停止 ✓
- 轉換期間（黃燈/全紅）正常運作 ✓

狀態：待測試 ⏳
```

### 場景 3：左轉綠燈
```
步驟：
1. 確保有 1 號車道（左轉）的車輛
2. 觸發左轉綠燈
3. 觀察 1 號車道行為
4. 觀察其他車道行為

預期結果：
- 1 號車道車輛通行 ✓
- 其他車道車輛停止 ✓

狀態：待測試 ⏳
```

### 場景 4：碰撞檢測
```
步驟：
1. 正常運行 5-10 分鐘
2. 監控控制台日誌（碰撞/跟隨/停止）

預期結果：
- 無異常日誌
- 車輛碰撞檢測正常運作
- 跟隨行為正常

狀態：待測試 ⏳
```

### 場景 5：邊界偵測
```
步驟：
1. 觀察車輛離開畫面時的行為
2. 監控控制台日誌（♻️ 車輛放回池）

預期結果：
- 車輛離開畫面時被回收到池中
- 控制台輸出「♻️ [id] 車輛動畫完成，放回物件池」
- 之後該 div.vehicle 被重用於新車輛

狀態：待測試 ⏳
```

### 場景 6：性能基準
```
步驟：
1. Chrome DevTools → Performance → Record
2. 正常模擬 30 秒
3. 停止錄製分析

預期結果：
- 平均幀率 ≥ 50 FPS（或接近最大值）
- 無明顯的幀率下降（不應見到突然掉到 30 FPS）
- Main 線程工作時間 < 15ms (for 60fps)

狀態：待測試 ⏳
```

## 🔍 日誌驗證

### 關鍵日誌點
- [ ] onMounted: "🚀 VehiclePool 已初始化" - 池初始化
- [ ] 首次車輛創建: "acquire() 創建新車輛" - 新車輛分配
- [ ] 後續車輛: "acquire() 從池中取車" - 車輛重用
- [ ] 車輛回收: "♻️ [id] 車輛動畫完成，放回物件池" - 成功回收
- [ ] 應用卸載: "🚀 清理 VehiclePool..." - 池清理

### 異常日誌（應該看不到）
- [ ] ⚠️ 大量的「新建 Vehicle」日誌
- [ ] 🗑️ 「車輛移除」日誌
- [ ] ❌ 「回收失敗」日誌

## 📊 統計數據

### 預期統計值
- 最大並發車輛：100（由 GENERATION_CONFIG 定義）
- DOM 元素 (div.vehicle)：~100
- 池中空閒車輛：0-50（取決於運行時)
- 池中活躍車輛：~50-100

### 檢查方法
```javascript
// 在瀏覽器控制台執行
console.log(window.vehiclePool?.getStats())
// 預期輸出：
// {
//   totalPooled: 20,        // 空閒車輛
//   totalActive: 80,        // 活躍車輛
//   byDirection: {
//     east: 5,
//     west: 5,
//     north: 5,
//     south: 5
//   }
// }
```

## ✨ 最終檢查清單

### 部署前
- [ ] 無 ESLint 錯誤或警告
- [ ] 無控制台錯誤
- [ ] 記憶體使用穩定
- [ ] 幀率穩定
- [ ] 燈號邏輯完全正常
- [ ] 所有 6 個測試場景通過

### 部署後
- [ ] 用戶報告無新 Bug
- [ ] 記憶體使用量明顯改善
- [ ] 幀率穩定性改善
- [ ] 長時間運行無卡頓

## 回滾計畫

如遇重大問題：
```bash
# 方式 1：撤銷最後兩個提交
git revert 1518847  # 撤銷文檔
git revert 8f763a0  # 撤銷物件池實現

# 方式 2：切回舊分支
git checkout HEAD~2  # 回到物件池之前

# 方式 3：硬重置
git reset --hard 5b24872  # 回到最後已知穩定點
```

## 參考文檔

- OBJECT_POOLING_IMPLEMENTATION.md - 完整實現細節
- Vehicle.js - 車輛類實現
- VehiclePool.js - 物件池實現
- IndexPage.vue - 集成點
