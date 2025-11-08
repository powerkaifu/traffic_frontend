# 🔍 派車系統診斷報告 - 快速參考

## 問題症狀

❌ 派車系統一次派兩台車到同一方向

## 根本原因

派車事件被 **同時監聽兩次**：

1. Store 訂閱（新）- `store.subscribe('generateVehicle', ...)`
2. DOM 事件監聽（舊）- `window.addEventListener('generateVehicle', ...)`

結果：同一派車邏輯執行 **2 次** → 派出 **2 台車**

## 修復方案

### 修改檔案：`IndexPage.vue`

#### 1. 移除 DOM 事件監聽器（第 1360-1367 行）

```diff
- // 同時保留 DOM 事件監聽器，以支持其他外部組件
- window.addEventListener('scenarioChanged', (event) => {...})
- window.addEventListener('generateVehicle', (event) => {
-   handleAutoGenerate(event)  // ❌ 重複執行
- })
- window.addEventListener('generateLeftTurnVehicle', (event) => {...})

+ // ⚠️ 【修復】移除 DOM 事件監聽器（已遷移到 Store 訂閱）
+ // AutoTrafficGenerator 現在通過 store.emit() 發送事件
+ // Store 訂閱已完全接手，無需 window.dispatchEvent() 備份
```

#### 2. 移除 cleanup 中的冗餘 removeEventListener（第 2206-2211 行）

```diff
- // 移除所有事件監聽
- if (typeof window !== 'undefined') {
-   window.removeEventListener('scenarioChanged', handleScenarioChange)
-   window.removeEventListener('generateVehicle', handleAutoGenerate)
-   window.removeEventListener('generateLeftTurnVehicle', handleAutoGenerateLeftTurn)
- }

+ // ⚠️ 【修復】已移除 DOM 事件監聽器（已遷移到 Store 訂閱）
+ // 不再需要 window.removeEventListener() - Store 訂閱在上面已清理
```

#### 3. 移除冗餘回調函數（第 504-558 行）

```diff
- // 原始的事件處理函數（用於 window 事件監聽）
- const handleAutoGenerate = (event) => { ... }
- const handleAutoGenerateLeftTurn = (event) => { ... }

+ // ⚠️ 【已棄用】原始的事件處理函數（用於 window 事件監聽）- 已移除 DOM 事件監聽
+ // handleAutoGenerate 已不使用，保留此註解用於參考歷史
```

## 修復效果對比

| 指標             | 修復前  | 修復後  |
| ---------------- | ------- | ------- |
| 派車邏輯執行次數 | 2 次 ❌ | 1 次 ✅ |
| 每次派車建立車數 | 2 台 ❌ | 1 台 ✅ |
| 派車方向均衡     | 堆積 ❌ | 均勻 ✅ |

## 驗證方式

1. **構建**：`npm run build` ✅
2. **檢查派車日誌**：應只出現 1 次（而非 2 次）
3. **觀察派車**：每次派車只建立 1 台車（而非 2 台）
4. **檢查均衡**：四個方向輪流派遣（而非堆積）

## 遷移進度

這是 **Priority 3 階段（Store 遷移）** 的驗證修復：

```
✅ AutoTrafficGenerator 已遷移到 Store emit
✅ IndexPage 已訂閱 Store 事件
❌ 但保留了舊的 DOM 事件監聽做「向後相容」 ← 問題所在
✅ 現已移除冗餘的 DOM 事件監聽 ← 修復完成
```

## 代碼改動

- **檔案**：1 個（IndexPage.vue）
- **行數**：~61 行
- **改動類型**：刪除冗餘邏輯，優化代碼
- **構建狀態**：✅ Build Success

---

## 相關文件

- `DUPLICATE_DISPATCH_ROOT_CAUSE.md` - 詳細根本原因分析
- `DUPLICATE_DISPATCH_FIX_COMPLETION.md` - 完整修復報告
- `FRAME_DUPLICATE_FIX_QUICK_REF.md` - RAF 幀內重複修復參考
