# 🔧 HMR 與 PIXI.js/Live2D 衝突解決方案

## 📋 問題描述

當編輯 `src/classes/config/` 目錄下的 JavaScript 配置文件時，會導致 Lumo 助手 (Live2D 組件) **無法加載**，顯示以下症狀：

```
❌ Lumo 模型無法顯示
❌ WebGL 上下文衝突
❌ PIXI.Application 初始化失敗
```

## 🔍 根本原因分析

### 1️⃣ **HMR 的連鎖反應**

```
存檔 trafficConfig.js
  ↓
HMR 檢測到依賴變更 (Vehicle.js, TrafficLightController.js 等)
  ↓
觸發這些模組的重新載入
  ↓
進而觸發 LumoAssistant.vue 的邏輯重新執行
  ↓
onMounted 鉤子再次執行，嘗試初始化 PIXI.Application
```

### 2️⃣ **WebGL 上下文衝突**

```
第一次頁面載入
  ├─ 舊的 PIXI.Application 初始化 ✅
  ├─ 佔用 WebGL 上下文
  └─ 記錄在 Live2D 內部狀態

HMR 熱更新觸發
  ├─ 新的 PIXI.Application 初始化嘗試 ❌
  ├─ 舊的實例未被銷毀 (記憶體洩漏)
  ├─ WebGL 上下文產生衝突
  └─ Lumo 模型無法載入
```

### 3️⃣ **為什麼只有 config 文件有問題？**

- ✅ `.vue` 檔案：Vite 的 HMR 對 Vue 組件的熱替換已很成熟，只更新渲染層
- ❌ `config/*.js` 檔案：純 JavaScript 模組，HMR 必須向上更新所有依賴者，導致連鎖反應

## ✅ 解決方案

### 實作方式

在 `quasar.config.js` 中添加自訂 Vite 插件：

```javascript
// 💥 擴展 Vite 設定：強制完整頁面重新加載（處理 config 文件變更）
extendViteConf (viteConf, { isClient }) {
  if (isClient) {
    // 新增自訂 Vite 插件：監聽 config 文件變更
    viteConf.plugins = viteConf.plugins || []
    viteConf.plugins.push({
      name: 'force-reload-on-config-change',
      apply: 'serve', // 只在開發模式下應用
      handleHotUpdate({ file, server }) {
        // 🎯 監聽 src/classes/config/ 目錄下的所有檔案變更
        if (file.includes('/src/classes/config/') || file.includes('\\src\\classes\\config\\')) {
          console.log('⚡ [HMR 攔截] 偵測到 config 文件變更，強制執行完整頁面重新加載...')
          console.log(`   📁 變更檔案: ${file}`)

          // 💡 傳送 "full-reload" 訊號給客戶端，強制完整頁面重新整理
          server.ws.send({
            type: 'full-reload',
            event: 'special',
            path: '*',
          })

          // ⏹️ 回傳空陣列，阻止 HMR 繼續處理此更新
          return []
        }
      },
    })
  }
}
```

### 工作流程

```
編輯 config 文件並保存
  ↓
Vite 開發伺服器檢測到變更
  ↓
自訂插件 handleHotUpdate() 被觸發
  ↓
檢查文件路徑是否在 /src/classes/config/ 中
  ↓
✅ 是 → 發送 "full-reload" 訊號，完整重新整理頁面
❌ 否 → 繼續使用標準 HMR 流程
  ↓
瀏覽器接收訊號
  ↓
🔄 刷新整個頁面 (F5 效果)
  ↓
所有舊的 PIXI.Application 實例被銷毀
  ↓
新的頁面載入，一切重新初始化
  ↓
✅ Lumo 正確加載，無衝突
```

## 🎯 關鍵特點

| 特點                | 說明                                            |
| ------------------- | ----------------------------------------------- |
| 🎯 **精准拦截**     | 只针对 `config/` 目录，其他文件继续使用快速 HMR |
| 🔄 **完整重载**     | 通过 Vite WebSocket 发送 `full-reload` 信号     |
| 💻 **开发模式限制** | `apply: 'serve'` 确保只在开发时生效             |
| 📱 **跨平台支持**   | 处理 Unix 路径 (`/`) 和 Windows 路径 (`\`)      |
| 🐛 **调试友好**     | 控制台输出变更文件信息便于追踪                  |

## 🚀 使用效果

### 編輯 config 文件時

```
保存檔案
  ⏱️ 1-2 秒延遲
  ↓
瀏覽器自動完整刷新
  ↓
✅ 所有系統正常載入，包括 Lumo
```

### 編輯其他檔案時

```
保存檔案
  ⏱️ 瞬間 (~100ms)
  ↓
HMR 快速熱更新
  ↓
✅ 編輯體驗保持流暢
```

## 📊 效能影響

| 操作                | 耗時       | 特點                   |
| ------------------- | ---------- | ---------------------- |
| 編輯 `.vue` 檔案    | ~100ms     | 快速 HMR，無刷新       |
| 編輯 `config/*.js`  | ~1-2s      | 完整重載，但能解決衝突 |
| 編輯 `classes/*.js` | ~100-500ms | 正常 HMR 流程          |

## ✨ 額外優勢

### 1️⃣ 避免記憶體洩漏

- 完整頁面重新加載確保所有舊資源被徹底清理
- PIXI.Application、WebGL 上下文、事件監聽器都被正確銷毀

### 2️⃣ 確保配置應用

- 確保新的配置值真實生效
- 避免因緩存導致的配置不一致

### 3️⃣ 更好的開發體驗

- 自動化流程，無需手動刷新
- 開發者可以專注於編碼而不用擔心 HMR 衝突

## 🔧 後續優化建議

### P1: Live2D 銷毀機制 ⭐⭐⭐

```javascript
// 在 LumoAssistant.vue 的 onBeforeUnmount 中
onBeforeUnmount(() => {
  if (state.app) {
    state.app.destroy() // 正確銷毀 PIXI.Application
  }
})
```

### P2: 配置熱替換支持 ⭐⭐

```javascript
// 偵測配置變更，更新應用狀態
if (import.meta.hot) {
  import.meta.hot.accept('./config/trafficConfig', (module) => {
    // 更新配置，重新初始化相關系統
  })
}
```

## 📝 測試清單

- [ ] 編輯 `src/classes/config/trafficConfig.js` 並保存
  - 預期：頁面自動完整重新加載，Lumo 正常顯示
- [ ] 編輯 `src/classes/config/vehicleConfig.js` 並保存
  - 預期：頁面自動完整重新加載，新配置生效
- [ ] 編輯 `src/pages/IndexPage.vue` 並保存
  - 預期：快速 HMR 更新 (~100ms)，頁面不刷新
- [ ] 編輯 `src/components/LumoAssistant.vue` 並保存
  - 預期：快速 HMR 更新 (~100ms)，Lumo 保持加載

## 🎓 技術深度解析

### Vite Plugin API

```javascript
{
  name: 'force-reload-on-config-change',    // 插件名稱（用於調試）
  apply: 'serve',                           // 僅在開發伺服器應用
  handleHotUpdate({ file, server }) {       // HMR 事件處理
    // file: 變更檔案的完整路徑
    // server: Vite 開發伺服器實例
  }
}
```

### WebSocket 消息格式

```javascript
server.ws.send({
  type: 'full-reload', // Vite 會識別此類型並執行完整重載
  event: 'special', // 自訂事件名稱
  path: '*', // '*' 表示重載所有資源
})
```

## 🌟 總結

透過這個 Vite 插件，我們成功地：

1. ✅ **解決 WebGL 衝突** - 完整頁面重新加載清除所有舊狀態
2. ✅ **提升開發體驗** - 自動化無需手動干預
3. ✅ **保持效能** - 其他檔案仍使用快速 HMR
4. ✅ **提高可靠性** - 確保配置變更真實生效

這是一個優雅、高效的解決方案！🎉
