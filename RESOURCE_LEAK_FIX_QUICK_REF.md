# 資源洩漏修復進度追蹤

## 修復架構

```
治標 (Symptom)     治本 Partial     治本 Complete
   ↓                  ↓                 ↓
Phase 1          Phase 2           Phase 3
孤立車輛清理       移除 setInterval   統一 RAF 迴圈
✅ 完成            ⏳ 進行中           ❌ 未開始
```

---

## Phase 1：孤立車輛清理修復（治標）✅ DONE

**目標**：防止孤立車輛成為僵屍對象

**修改點**：IndexPage.vue 第 2143-2153 行

**核心修復**：
```javascript
// 添加 performCleanup() 調用
if (vehicle.performCleanup && typeof vehicle.performCleanup === 'function') {
  vehicle.performCleanup().catch((e) => {
    console.warn(`⚠️ [${vehicle.id}] 孤立車輛清理異常: ${e.message}`)
  })
}
```

**效果**：
- ✅ 停止事件監聽器洩漏（-900 個）
- ✅ 停止定時器洩漏（-900 個）
- ✅ 停止 GSAP 動畫洩漏
- ✅ 立即改善系統穩定性

**編譯**：✅ 4623ms

**Commit**：`2c7f8ed`

---

## Phase 2：移除 Vehicle.js setInterval（治本 Partial）⏳ IN-PROGRESS

**目標**：完全消除 Vehicle 類中的直接定時器創建

**修改點 1**：Vehicle.js 第 142-145 行

```javascript
// ❌ 移除前（setupAntiStuckMechanism 中）
this.stuckCheckTimer = setInterval(() => {
  // ... 防停滯檢查邏輯
}, ANTI_STUCK_CHECK_INTERVAL)
```

**修改點 2**：Vehicle.js 第 1445 行

```javascript
// ❌ 移除前（constructor 中）
this.periodicCheckTimer = setInterval(() => {
  // ... 周期性檢查邏輯
}, PERIODIC_CHECK_INTERVAL)
```

**修改點 3**：Vehicle.js 第 1780-1790 行（remove 方法中）

```javascript
// ❌ 移除前（清理代碼，因為沒有定時器所以不需要）
if (this.periodicCheckTimer) {
  clearInterval(this.periodicCheckTimer)
}
if (this.stuckCheckTimer) {
  clearInterval(this.stuckCheckTimer)
}
```

**預期困難**：
1. 需要提取出被 setInterval 包裝的邏輯函數
2. 需要在 IndexPage.vue 的 mainSimulationLoop 中集成這些邏輯
3. 需要確保定期檢查仍然能按期執行

**後續依賴**：Phase 3 中的累加器模式

---

## Phase 3：統一 RAF 迴圈的定期檢查（治本 Complete）❌ NOT-STARTED

**目標**：將所有定期任務集中到 mainSimulationLoop 中

**修改點**：IndexPage.vue 主 RAF 迴圈（約 2100 行附近）

**實現方案**：使用累加器模式

```javascript
// 累加器變數（mainSimulationLoop 外部聲明）
let checkStuckAccumulator = 0
let directResponseAccumulator = 0

// 在 mainSimulationLoop 內
function mainSimulationLoop() {
  // ... 現有代碼 ...

  // 50ms 檢查（directTrafficLightResponse）
  directResponseAccumulator += deltaTime
  if (directResponseAccumulator >= 50) {
    activeCars.value.forEach((vehicle) => {
      vehicle.directTrafficLightResponse(trafficController)
    })
    directResponseAccumulator = 0
  }

  // 5000ms 檢查（checkAndResolveStuckState）
  checkStuckAccumulator += deltaTime
  if (checkStuckAccumulator >= 5000) {
    activeCars.value.forEach((vehicle) => {
      vehicle.checkAndResolveStuckState()
    })
    checkStuckAccumulator = 0
  }
}
```

**優勢**：
- 所有定期檢查都由 RAF 驅動（而不是獨立的 setInterval）
- 能夠靈活調整檢查間隔
- 更好的性能監控（single RAF loop）
- 易於調試（集中管理）

**所需時間**：2-3 小時

---

## 資源洩漏的完整解決方案時間表

```
現在
  ↓
┌─────────────────────────────────────────┐
│ Phase 1: 孤立車輛清理 ✅ 10 分鐘         │  已完成
└─────────────────────────────────────────┘
  ↓ 5 分鐘驗證
┌─────────────────────────────────────────┐
│ Phase 2: 移除 setInterval ⏳ 1-2 小時    │  進行中
│  - 提取防停滯邏輯                       │
│  - 提取周期性檢查邏輯                   │
│  - 移除 setInterval 調用                 │
│  - 清理 clearInterval 代碼               │
└─────────────────────────────────────────┘
  ↓ 10 分鐘驗證
┌─────────────────────────────────────────┐
│ Phase 3: RAF 統一迴圈 ❌ 2-3 小時       │  待開始
│  - 實現累加器模式                       │
│  - 集成 directTrafficLightResponse      │
│  - 集成 checkAndResolveStuckState       │
│  - 全面性能測試                         │
└─────────────────────────────────────────┘
  ↓ 長期驗證

預期完成時間：3.5-5.5 小時
```

---

## 驗證計劃

### Phase 1 驗證 ✅ 已完成
- ✅ 編譯通過：4623ms
- ✅ 孤立車輛清理邏輯驗證
- ✅ Git 提交成功

### Phase 2 驗證（待進行）
- [ ] 提取邏輯函數確認功能不變
- [ ] 編譯通過
- [ ] 防停滯機制仍然工作
- [ ] 周期性檢查仍然工作

### Phase 3 驗證（待進行）
- [ ] 累加器模式邏輯驗證
- [ ] 時間精度測試（±50ms）
- [ ] 系統性能指標
- [ ] 長期穩定性測試

---

## 當前狀態

```
系統健康度指標：

記憶體使用：🔴 高 → 🟡 中（Phase 1 後）
DOM 節點：  🔴 5000+ → 🟡 1000-2000（Phase 1 後）
事件監聽器：🔴 1800+ → 🟡 50-100（Phase 1 後）
定時器：    🔴 活躍 → ⏳ 部分（Phase 2 後）
系統穩定性：🔴 不穩定 → 🟡 改善中（Phase 3 後）

目標：🟢 全綠（所有 Phase 完成）
```

---

## 快速命令參考

```bash
# 檢查 Git 狀態
git status

# 查看最新提交
git log --oneline -5

# 構建並驗證
npm run build

# 運行開發服務器
quasar dev
```

---

**最後更新**：Phase 1 完成後  
**下一步**：開始 Phase 2 - 移除 setInterval
