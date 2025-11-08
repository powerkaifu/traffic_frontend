# 🚀 Priority 3 實施快速開始

## 現狀總結

✅ **已完成**:
- Pinia Store 已創建 (`src/stores/simulationStore.js`)
- 完整的遷移指南已提供 (`ARCHITECTURE_MIGRATION_GUIDE.md`)
- 所有狀態容器已定義

⏳ **待遷移**:
- IndexPage.vue (需要集成 Store)
- AutoTrafficGenerator.js (需要接收 Store)
- Vehicle.js (需要移除直接操作 window)
- TrafficLightController.js (需要使用 Store)
- CollisionController.js (需要使用 Store)

---

## 第一步：IndexPage.vue 的快速遷移

### 步驟 1.1: 在 setup() 中添加 Store

**文件**: `src/pages/IndexPage.vue`

**找到位置**: 第 1 行附近的 `<script setup>` 段

**添加以下導入**:

```javascript
// 在現有的 import 語句後添加
import { useSimulationStore } from 'src/stores/simulationStore'
```

**在 setup() 函數中添加**:

```javascript
// 在 onMounted 之前添加
const simulationStore = useSimulationStore()
```

### 步驟 1.2: 替換初始化代碼

**找到現有代碼** (大約在 IndexPage.vue 第 1800-1900 行):

```javascript
// ❌ 舊代碼
onMounted(() => {
  // ...
  window.liveVehicles = activeCars.value
  window.trafficController = trafficController
  window.autoTrafficGenerator = autoTrafficGenerator
  window.collisionController = collisionController
  // ...
})
```

**替換為**:

```javascript
// ✅ 新代碼
onMounted(() => {
  // ...其他初始化代碼保持不變...
  
  // 將核心模塊保存到 Store
  simulationStore.setTrafficController(trafficController)
  simulationStore.setAutoTrafficGenerator(autoTrafficGenerator)
  simulationStore.setCollisionController(collisionController)
  
  // ⚠️ 暫時保留 window 賦值以相容舊代碼
  // (這些會在後續階段逐步移除)
  window.liveVehicles = activeCars.value
  window.trafficController = trafficController
  window.autoTrafficGenerator = autoTrafficGenerator
  window.collisionController = collisionController
})
```

### 步驟 1.3: 在 onUnmounted 中重置 Store

**找到**:

```javascript
onUnmounted(() => {
  // ...清理代碼...
})
```

**在末尾添加**:

```javascript
onUnmounted(() => {
  // ...現有清理代碼...
  
  // ✅ 新增：重置 Pinia Store
  simulationStore.reset()
})
```

---

## 第二步：測試更改

### 2.1 構建驗證

```bash
npm run build
```

**預期結果**: `Build succeeded` ✅

### 2.2 運行開發服務器

```bash
quasar dev
```

**預期結果**:
- ✅ 應用正常啟動
- ✅ 交通模擬正常進行
- ✅ 車輛正常生成和移除
- ✅ 控制台無 TypeScript 錯誤

### 2.3 使用 DevTools 驗證 Store

1. 在瀏覽器中打開應用
2. 打開 Chrome DevTools (F12)
3. 在 Console 中運行:

```javascript
// 檢查 Store 是否可用
const { useSimulationStore } = await import('src/stores/simulationStore.js')
const store = useSimulationStore()
console.log('🎯 simulationStore:', store)
console.log('🎯 liveVehicles count:', store.liveVehicles.length)
console.log('🎯 trafficController:', store.trafficController)
console.log('🎯 autoTrafficGenerator:', store.autoTrafficGenerator)
```

---

## 第三步：AutoTrafficGenerator 快速遷移

### 3.1 準備 AutoTrafficGenerator

**文件**: `src/classes/AutoTrafficGenerator.js`

**找到 constructor** (第 24 行左右):

```javascript
// ❌ 舊代碼
constructor(trafficController) {
  this.trafficController = trafficController
  // ...
}
```

**修改為**:

```javascript
// ✅ 新代碼
constructor(trafficController, simulationStore = null) {
  this.trafficController = trafficController
  this.simulationStore = simulationStore  // ✅ 新增
  // ...
}
```

### 3.2 在 IndexPage.vue 中傳入 Store

**回到 IndexPage.vue，找到 AutoTrafficGenerator 初始化**:

```javascript
// ❌ 舊代碼
autoTrafficGenerator = new AutoTrafficGenerator(trafficController)

// ✅ 新代碼
autoTrafficGenerator = new AutoTrafficGenerator(trafficController, simulationStore)
```

### 3.3 替換 window 賦值

**在 AutoTrafficGenerator.js 中找到所有 `window.` 賦值**:

```javascript
// ❌ 舊代碼
window.currentGeneratedVDData = { ... }
window.lastApiVDDataArray = [ ... ]

// ✅ 新代碼
if (this.simulationStore) {
  this.simulationStore.setCurrentGeneratedVDData({ ... })
  this.simulationStore.setLastApiVDDataArray([ ... ])
}
```

---

## 診斷清單

### ✅ 完成此清單才能繼續

- [ ] IndexPage.vue 導入了 simulationStore
- [ ] IndexPage.vue setup() 中初始化了 Store
- [ ] onMounted 中調用了 simulationStore.setTrafficController() 等
- [ ] onUnmounted 中調用了 simulationStore.reset()
- [ ] npm run build 成功
- [ ] 應用運行無錯誤
- [ ] 車輛正常生成
- [ ] 交通燈正常變化
- [ ] 控制台中查看到 Store 狀態

---

## 常見問題

### Q: 為什麼要保留 window 賦值？

**A**: 在完整遷移完成之前，保留 window 賦值可以確保向後相容性。在所有模塊都遷移後才完全移除。

### Q: 如何驗證 Store 是否正確工作？

**A**: 在 DevTools Console 中運行:

```javascript
// 查看 Store 當前狀態
import { useSimulationStore } from 'src/stores/simulationStore'
const store = useSimulationStore()
console.log(store.$state)
```

### Q: 構建失敗怎麼辦？

**A**: 
1. 檢查導入語句是否正確
2. 確認文件路徑沒有拼寫錯誤
3. 運行 `npm run build` 查看詳細錯誤信息

### Q: 如何調試 Store 中的狀態變化？

**A**: 使用 Pinia 官方 DevTools 或在 action 中添加 console.log:

```javascript
const setTrafficController = (controller) => {
  console.log('🔍 [Store] Setting trafficController:', controller)
  trafficController.value = controller
}
```

---

## 下一步（完成此階段後）

1. ✅ Phase 2 完成後，進行 Phase 3: AutoTrafficGenerator 深度遷移
2. ⏳ Phase 4: Vehicle.js 遷移
3. ⏳ Phase 5: TrafficLightController 遷移
4. ⏳ Phase 6: CollisionController 遷移

---

## 相關文檔

- 📄 完整遷移指南: `ARCHITECTURE_MIGRATION_GUIDE.md`
- 📦 Store 源碼: `src/stores/simulationStore.js`
- 🎯 Priority 3 提案: Untitled-1 (用戶提供的文檔)

---

## 進度追蹤

### 時間線

| 階段 | 目標 | 狀態 | ETA |
|------|------|------|-----|
| Phase 1 | Store 創建 | ✅ 完成 | - |
| Phase 2 | IndexPage 遷移 | ⏳ 開始 | 1-2 小時 |
| Phase 3 | AutoTrafficGenerator | ⏳ 待開始 | 2-3 小時 |
| Phase 4 | Vehicle.js | ⏳ 待開始 | 1-2 小時 |
| Phase 5 | TrafficLightController | ⏳ 待開始 | 2-3 小時 |
| Phase 6 | CollisionController | ⏳ 待開始 | 1-2 小時 |
| 完成 | 全面去除 window | ⏳ 待開始 | 1 小時 |

**預計總耗時**: 8-13 小時 (可分多次進行)

---

## 立即開始

**建議行動**:

1. 打開 `src/pages/IndexPage.vue`
2. 按照「第一步」進行修改
3. 運行 `npm run build` 驗證
4. 啟動開發服務器並測試
5. 提交修改並進行下一階段

**提交時應包含**:

```
git add -A
git commit -m "Migrate IndexPage.vue to use Pinia simulationStore - Phase 2 Step 1"
```

---

**祝您遷移順利！** 🚀

有任何問題，請參考 `ARCHITECTURE_MIGRATION_GUIDE.md` 的詳細說明。

