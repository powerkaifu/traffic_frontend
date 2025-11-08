# 🚀 HMR Config Fix 快速實施指南

## 📝 已完成的修改

✅ **文件**: `quasar.config.js`
✅ **位置**: `build.extendViteConf()` 函數
✅ **目的**: 攔截 `src/classes/config/` 文件變更，強制完整頁面重新加載

## 🎯 立即測試

### 步驟 1️⃣: 確保開發伺服器正在運行

```bash
# 如果還未啟動
quasar dev

# 或使用 VS Code 任務
# 按 Ctrl+Shift+B 選擇 "Start Quasar Dev Server"
```

### 步驟 2️⃣: 開啟瀏覽器開發者工具

```
F12 或 Ctrl+Shift+I
  ↓
切換到 Console 標籤
  ↓
觀察日誌輸出
```

### 步驟 3️⃣: 編輯一個 config 文件

```bash
# 編輯任何 config 文件，例如：
src/classes/config/trafficConfig.js

# 修改一個數值，保存
# 例如：修改 minLaneInterval: 2000 → 2100
```

### 步驟 4️⃣: 觀察結果

**在瀏覽器控制台中，應該看到：**

```
⚡ [HMR 攔截] 偵測到 config 文件變更，強制執行完整頁面重新加載...
   📁 變更檔案: d:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\config\trafficConfig.js
```

**然後：**

- ⏱️ 頁面自動刷新 (1-2 秒)
- ✅ Lumo 正常顯示
- ✅ 新配置已生效

## ✨ 與之前的行為對比

### 之前 ❌

```
編輯 config/trafficConfig.js → 保存
  ↓
HMR 熱更新觸發
  ↓
LumoAssistant.vue 重新初始化
  ↓
WebGL 上下文衝突
  ↓
❌ Lumo 無法加載
  ↓
📌 必須手動刷新頁面才能恢復
```

### 之後 ✅

```
編輯 config/trafficConfig.js → 保存
  ↓
HMR 攔截插件檢測到 config 文件變更
  ↓
發送 "full-reload" 訊號
  ↓
🔄 頁面自動完整重新加載
  ↓
✅ Lumo 正常加載
  ✅ 無需手動操作
```

## 📋 測試用例

### 測試 1: 編輯 trafficConfig.js

```javascript
// src/classes/config/trafficConfig.js
// 將以下行改為不同的值
minLaneInterval: 2000 // 改為 2500

// 保存
// 預期: 頁面自動刷新，Lumo 正常顯示
```

### 測試 2: 編輯 vehicleConfig.js

```javascript
// src/classes/config/vehicleConfig.js
// 將以下行改為不同的值
export const VEHICLE_PHYSICS = {
  acceleration: 0.3  // 改為 0.35

// 保存
// 預期: 頁面自動刷新，新物理參數生效
```

### 測試 3: 驗證其他文件仍使用快速 HMR

```vue
<!-- src/components/LumoAssistant.vue -->
<!-- 修改一個 HTML 元素或 CSS 樣式 -->
<!-- 保存 -->
<!-- 預期: 快速 HMR 更新 (~100ms)，無完整刷新 -->
```

## 🔍 調試技巧

### 在控制台檢查 HMR 狀態

```javascript
// 開發者工具 → Console
// 輸入以下命令查看 HMR 活動日誌

// 1. 查看最後一次 HMR 事件
// 觀察控制台輸出中的 ⚡ 日誌

// 2. 手動觸發完整重新加載
window.location.reload()

// 3. 查看配置是否生效
window.trafficConfig?.minLaneInterval
```

### 在伺服器端檢查日誌

```bash
# 檢查 Quasar 開發伺服器輸出
# 應該看到類似的日誌：

# ⚡ [HMR 攔截] 偵測到 config 文件變更，強制執行完整頁面重新加載...
#    📁 變更檔案: src/classes/config/trafficConfig.js
```

## 🎓 技術細節

### 為什麼這個解決方案有效？

1. **完整頁面重新加載**
   - 清除所有舊的 JavaScript 模組狀態
   - PIXI.Application 實例被完全銷毀
   - WebGL 上下文被重新初始化
   - Live2D 模型可以正確加載

2. **精准的文件攔截**
   - 只針對 `config/` 目錄
   - 其他文件繼續使用快速 HMR
   - 開發體驗不受影響

3. **無縫的用戶體驗**
   - 自動化流程，無需手動干預
   - 頁面刷新後立即恢復正常
   - 開發者可以專注編碼

## ⚠️ 注意事項

### 1. 只在開發模式生效

```javascript
apply: 'serve' // ← 這確保只在開發時應用
```

**生產環境 (build) 不受影響**

### 2. 跨平台路徑支持

```javascript
if (file.includes('/src/classes/config/') || file.includes('\\src\\classes\\config\\'))
```

**同時支持 Unix 和 Windows 路徑格式**

### 3. 其他 HMR 配置

```javascript
// 如果你有其他自訂的 HMR 配置，確保與此插件相容
// 該插件不會干擾其他 Vite 插件
```

## 🐛 常見問題

### Q1: 編輯 config 文件後頁面沒有自動刷新？

**A:** 檢查以下幾點：

1. ✅ 開發伺服器是否在運行 (`quasar dev`)
2. ✅ 控制台是否顯示 ⚡ [HMR 攔截] 日誌
3. ✅ 文件是否在 `src/classes/config/` 目錄中
4. ✅ 是否真的保存了文件 (Ctrl+S)

**解決方案：**

```bash
# 1. 檢查 Quasar 伺服器狀態
# 2. 查看瀏覽器控制台
# 3. 檢查網絡標籤查看是否有 full-reload 訊號
# 4. 如果都沒問題，手動刷新頁面 (Ctrl+Shift+R)
```

### Q2: 為什麼完整重新加載需要 1-2 秒？

**A:** 這是正常的：

- 頁面重新加載 (100-200ms)
- JavaScript 包重新下載和解析 (300-500ms)
- Live2D 模型重新初始化 (300-500ms)
- 總計: ~1-2 秒

**優化方案：** 如果覺得太慢，可以改為編輯 `trafficConfig.js` 較少的字段，或使用動態配置系統。

### Q3: 其他文件的 HMR 還能快速工作嗎？

**A:** 是的！✅

- `.vue` 檔案: ~100ms (快速 HMR)
- 其他 `.js` 檔案: ~100-500ms (標準 HMR)
- **只有** `config/` 目錄使用完整重新加載

## 📞 支持

如果遇到問題，檢查：

1. `quasar.config.js` 中 `extendViteConf` 的實現
2. 瀏覽器開發者工具的 Console 標籤
3. 瀏覽器開發者工具的 Network 標籤 (查看 WebSocket)
4. Quasar 開發伺服器的終端輸出

---

**🎉 現在你可以安心編輯 config 文件，無需擔心 Lumo 崩潰！**
