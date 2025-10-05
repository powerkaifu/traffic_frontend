# Quasar Notify 錯誤修復

## 問題描述

在切換天氣時，控制台出現錯誤：

```
TypeError: Cannot read properties of undefined (reading 'notify')
    at Proxy.changeWeather (IndexPage.vue:625:15)
```

## 根本原因

IndexPage.vue 中使用了 `window.$q.notify()`，但沒有正確導入和初始化 Quasar 的插件系統。

### 錯誤代碼

```javascript
// ❌ 錯誤：window.$q 未定義
window.$q.notify({
  type: 'info',
  message: '天氣已切換至...',
})
```

### 問題所在

1. **未導入 useQuasar**：沒有從 'quasar' 導入 `useQuasar` 函數
2. **未初始化 $q**：沒有調用 `useQuasar()` 創建 Quasar 實例
3. **使用錯誤的訪問方式**：在 Composition API (script setup) 中不應使用 `window.$q`

## 解決方案

### 1. 導入 useQuasar

在 `<script setup>` 頂部添加導入：

```javascript
import { useQuasar } from 'quasar'
```

### 2. 初始化 Quasar 實例

在導入後立即創建實例：

```javascript
// 使用 Quasar
const $q = useQuasar()
```

### 3. 替換所有 window.$q 為 $q

找到所有使用 `window.$q.notify()` 的地方並替換為 `$q.notify()`：

**修復前：**
```javascript
window.$q.notify({
  type: 'info',
  message: '天氣已切換至...',
})
```

**修復後：**
```javascript
$q.notify({
  type: 'info',
  message: '天氣已切換至...',
})
```

## 修改位置

### IndexPage.vue 修改了 5 處

1. **導入部分**（新增 1 行）
   ```javascript
   import { useQuasar } from 'quasar'
   ```

2. **初始化部分**（新增 2 行）
   ```javascript
   // 使用 Quasar
   const $q = useQuasar()
   ```

3. **changeWeather 函數**（2 處替換）
   - 成功通知：`window.$q.notify()` → `$q.notify()`
   - 錯誤通知：`window.$q.notify()` → `$q.notify()`

4. **clearAllVehicles 函數**（3 處替換）
   - 無車輛通知：`window.$q.notify()` → `$q.notify()`
   - 成功清空通知：`window.$q.notify()` → `$q.notify()`
   - 錯誤通知：`window.$q.notify()` → `$q.notify()`

## Composition API 最佳實踐

### 正確使用 Quasar

在 Vue 3 Composition API (`<script setup>`) 中：

```javascript
// ✅ 正確方式
import { useQuasar } from 'quasar'

const $q = useQuasar()

// 使用
$q.notify({ ... })
$q.dialog({ ... })
$q.loading.show()
```

### 為什麼不使用 window.$q

1. **不可靠**：`window.$q` 可能未定義或未初始化
2. **不是最佳實踐**：Composition API 應該使用 composables
3. **類型支持差**：TypeScript 無法提供正確的類型推導
4. **測試困難**：依賴全局變量使單元測試更複雜

### Options API vs Composition API

```javascript
// Options API (舊方式)
export default {
  methods: {
    showNotification() {
      this.$q.notify({ ... })  // ✅ Options API 中正確
    }
  }
}

// Composition API (新方式)
<script setup>
import { useQuasar } from 'quasar'

const $q = useQuasar()

function showNotification() {
  $q.notify({ ... })  // ✅ Composition API 中正確
}
</script>
```

## 其他 Quasar Composables

除了 `useQuasar`，還有其他有用的 composables：

```javascript
import { 
  useQuasar,      // 核心 Quasar 實例
  useDialogPluginComponent,  // 對話框組件
  useMeta,        // Meta 標籤管理
} from 'quasar'

const $q = useQuasar()

// 可用的方法
$q.notify({ ... })      // 通知
$q.dialog({ ... })      // 對話框
$q.loading.show()       // 載入動畫
$q.bottomSheet({ ... }) // 底部彈出
$q.platform.is.mobile   // 平台檢測
$q.dark.isActive        // 深色模式狀態
```

## 測試結果

修復後，所有通知功能正常運作：

✅ **天氣切換通知**
- 切換成功時顯示：「天氣已切換至 [天氣類型]」
- 切換失敗時顯示：「切換天氣失敗」

✅ **清空車輛通知**
- 無車輛時顯示：「目前沒有車輛」
- 清空成功時顯示：「已清空 X 輛車輛」
- 清空失敗時顯示：「清空車輛時發生錯誤」

## 修改的檔案

**src/pages/IndexPage.vue**
- 新增 `useQuasar` 導入
- 初始化 `$q` 實例
- 替換 5 處 `window.$q.notify()` 為 `$q.notify()`

## 預防措施

### 1. ESLint 規則（建議）

可以添加 ESLint 規則來防止使用 `window.$q`：

```javascript
// .eslintrc.js
rules: {
  'no-restricted-globals': [
    'error',
    {
      name: '$q',
      message: '請使用 useQuasar() 而不是 window.$q'
    }
  ]
}
```

### 2. 代碼審查檢查清單

- [ ] 使用 `useQuasar` 而不是 `window.$q`
- [ ] 在 `<script setup>` 頂部導入
- [ ] 確保 `$q` 實例已初始化
- [ ] 不要在全局作用域直接訪問 Quasar 插件

### 3. 統一使用模式

在整個專案中統一使用相同的模式：

```javascript
// 標準模板
<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// 你的邏輯...
</script>
```

## 相關資源

- [Quasar useQuasar 文檔](https://quasar.dev/vue-composables/use-quasar)
- [Quasar Notify 插件](https://quasar.dev/quasar-plugins/notify)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

## 總結

這是一個典型的從 Options API 遷移到 Composition API 時的常見錯誤。修復方法很簡單：

1. ✅ 導入 `useQuasar`
2. ✅ 初始化 `$q` 實例
3. ✅ 使用 `$q` 而不是 `window.$q`

修復完成後，所有 Quasar 插件功能都能正常運作！
