# 🚀 配置參數清理指南

> **目標**: 系統性、小心謹慎地移除項目中未被使用的參數，減少代碼臃腫

---

## 📚 目錄

1. [快速開始](#快速開始)
2. [工具說明](#工具說明)
3. [分析流程](#分析流程)
4. [安全移除清單](#安全移除清單)
5. [驗證清單](#驗證清單)

---

## 快速開始

### 第一步：執行分析工具

```bash
# 在項目根目錄執行
node analyze-config-usage.js
```

**輸出**：

- 控制台實時報告（含統計數據）
- `config-usage-report.json` - 詳細 JSON 報告
- `config-usage-report.csv` - CSV 格式報告（可導入 Excel）

### 第二步：查看報告

```bash
# 用 VS Code 打開 JSON 報告
code config-usage-report.json

# 用 Excel 打開 CSV 報告
start config-usage-report.csv
```

### 第三步：按照安全清單進行移除

見 [安全移除清單](#安全移除清單)

---

## 工具說明

### analyze-config-usage.js

自動化掃描和搜尋工具，執行以下步驟：

```
1️⃣ 掃描 src/classes/config 目錄中的所有 .js 文件
   ↓ 找出所有 export const XXX = { ... }

2️⃣ 對每個導出的配置進行全項目搜尋
   ↓ 檢查在 src/ 中被使用的次數

3️⃣ 生成分類報告
   ✅ 已使用：使用 1 次以上
   ❌ 未使用：0 次使用
   ⚠️  可疑：只在配置文件內部引用

4️⃣ 導出詳細報告
   - JSON 格式（詳細數據）
   - CSV 格式（便於分析）
```

### 輸出格式

**控制台輸出示例**：

```
✅ 已使用的配置 (按使用次數倒序):

┌─────────────────────────┬────────┬─────────────────────────────┐
│ 配置名稱                │ 使用次數 │ 首次出現位置              │
├─────────────────────────┼────────┼─────────────────────────────┤
│ ANIMATION_CONFIG        │     15 │ src/classes/Vehicle.js      │
│ COLLISION_CONFIG        │     12 │ src/classes/Collision...    │
│ GENERATION_CONFIG       │      2 │ src/pages/IndexPage.vue     │
└─────────────────────────┴────────┴─────────────────────────────┘

❌ 未使用的配置 (3 個):

1. EASING
2. PUSH_FORCE
3. STUCK_CHECK_THRESHOLD
```

---

## 分析流程

### 流程圖

```
開始
  ↓
執行分析工具 (analyze-config-usage.js)
  ↓
查看報告 (JSON/CSV)
  ↓
人工審查未使用的參數
  ├─ 確認真的未被使用
  ├─ 檢查是否預留功能
  └─ 查詢代碼歷史
  ↓
創建備份註解
  ↓
逐個移除參數
  ├─ 從配置文件中移除
  ├─ 從默認導出中移除（如有）
  └─ 更新導入語句（如有）
  ↓
測試驗證
  ├─ npm run dev
  ├─ 硬重新載入瀏覽器
  ├─ 檢查控制台
  └─ 功能測試
  ↓
記錄變更
  ↓
完成
```

### 詳細步驟

#### 步驟 1：掃描和分析

```bash
# 1. 執行自動掃描
node analyze-config-usage.js

# 2. 查看結果
cat config-usage-report.json | less  # Unix/Mac
type config-usage-report.json       # Windows PowerShell
```

#### 步驟 2：人工審查

對每個未使用的配置進行審查：

**檢查清單**：

- [ ] 這是否是調試或實驗功能？
- [ ] 搜尋結果是否完全為空？
- [ ] 是否有其他引用方式（如字符串動態訪問）？
- [ ] 是否在備註或文檔中有說明用途？
- [ ] 是否計劃在未來使用？

#### 步驟 3：移除（安全做法）

**不要直接刪除，遵循以下步驟**：

```javascript
// ❌ 錯誤：直接刪除
// export const EASING = {
//   NONE: 'none',
// }

// ✅ 正確：轉換為備份註解
/*
 * 🗑️ 已移除：EASING
 * - 原始定義：ANIMATION_CONFIG 內的子參數
 * - 移除原因：未被任何文件使用
 * - 搜尋結果：0 次使用
 * - 備份日期：2025-11-11
 *
 * export const EASING = {
 *   NONE: 'none',
 * }
 */
```

#### 步驟 4：驗證

```bash
# 1. 重新啟動開發服務器
npm run dev

# 2. 硬重新載入瀏覽器 (Ctrl+Shift+R)

# 3. 檢查控制台 (F12)
#    - 是否有 undefined reference 錯誤？
#    - 是否有編譯警告？

# 4. 功能測試
#    - 運行相關功能（如動畫、碰撞檢測等）
#    - 檢查是否正常運作

# 5. 搜尋是否還有殘餘引用
grep -r "EASING" src  # 應該返回空結果
```

---

## 安全移除清單

### 📋 vehicleConfig.js 候選清單

根據之前的分析，以下參數可能未被使用，需要二次確認：

#### 優先級 1：高度可疑（強烈建議檢查）

| 參數                    | 位置                | 理由               | 檢查命令                              |
| ----------------------- | ------------------- | ------------------ | ------------------------------------- |
| `EASING`                | ANIMATION_CONFIG 內 | 功能代碼已移除     | `grep -r "EASING\|easing\|ease" src`  |
| `PUSH_FORCE`            | FOLLOWING_CONFIG 內 | 未在跟車邏輯中使用 | `grep -r "PUSH_FORCE\|pushForce" src` |
| `STUCK_CHECK_THRESHOLD` | ANIMATION_CONFIG 內 | 未在車輛邏輯中調用 | `grep -r "STUCK_CHECK_THRESHOLD" src` |

#### 優先級 2：中度可疑（謹慎檢查）

| 參數                           | 位置                | 理由                   | 檢查命令                                     |
| ------------------------------ | ------------------- | ---------------------- | -------------------------------------------- |
| `GREEN_LIGHT_FOLLOWING`        | FOLLOWING_CONFIG 內 | 是否真的被綠燈邏輯使用 | `grep -r "GREEN_LIGHT_FOLLOWING" src`        |
| `RESUME_SPEED`                 | FOLLOWING_CONFIG 內 | 是否在恢復速度時使用   | `grep -r "RESUME_SPEED\|resumeMovement" src` |
| `TIME_MULTIPLIER_COMPENSATION` | COLLISION_CONFIG 內 | 補償邏輯是否真的啟用   | `grep -r "TIME_MULTIPLIER_COMPENSATION" src` |

#### 優先級 3：保留（不建議刪除）

| 參數                   | 原因                       |
| ---------------------- | -------------------------- |
| `ANIMATION_CONFIG`     | 核心配置，影響全局動畫速度 |
| `VOLUME_LIMITS_CONFIG` | 前後端分層配置，關鍵參數   |
| `COLLISION_CONFIG`     | 碰撞檢測核心，必須保留     |

---

## 驗證清單

### 移除前檢查

- [ ] 執行了分析工具
- [ ] 查看了搜尋結果（0 次使用）
- [ ] 進行了代碼審查
- [ ] 檢查了 git 歷史（確認何時添加的）
- [ ] 詢問了其他開發者（是否有人知道用途）

### 移除時檢查

- [ ] 創建了備份註解
- [ ] 從配置文件中刪除
- [ ] 從默認導出中刪除（如有）
- [ ] 檢查是否還有直接導入該配置的語句

### 移除後測試

- [ ] 重新啟動 `npm run dev`
- [ ] 硬重新載入瀏覽器
- [ ] 檢查控制台（無錯誤）
- [ ] 執行功能測試
- [ ] 搜尋是否有殘餘引用

---

## 📖 實際示例

### 示例 1：移除 EASING

**檢查階段**：

```bash
$ grep -r "EASING" src --include="*.js" --include="*.vue"
# (無結果)

$ grep -r "easing\|ease" src --include="*.js" --include="*.vue"
# (檢查是否有其他拼寫)
```

**移除階段**：

**原始代碼** (vehicleConfig.js Line 40-45)：

```javascript
// 🎯 動畫緩動設定
EASING: {
  NONE: 'none', // 線性動畫，無緩動效果
  // 其他緩動效果已移除以避免車輛抖動
},
```

**修改後**：

```javascript
/*
 * 🗑️ 已移除：EASING
 * - 原始定義：ANIMATION_CONFIG 內的子參數
 * - 移除原因：所有緩動效果已移除，不再使用
 * - 搜尋結果：0 次使用
 * - 備份日期：2025-11-11
 *
 * EASING: {
 *   NONE: 'none',
 * },
 */
```

**驗證**：

```bash
# 1. 重新啟動
npm run dev

# 2. 檢查無誤
# - 瀏覽器控制台無錯誤
# - 動畫仍正常運作

# 3. 確認移除
grep -r "EASING" src
# (應返回空結果)
```

### 示例 2：移除 PUSH_FORCE

**檢查階段**：

```bash
$ grep -r "PUSH_FORCE" src --include="*.js" --include="*.vue"
# (無結果)

$ grep -r "pushForce\|push_force" src --include="*.js" --include="*.vue"
# (檢查駝峰式或蛇形命名)
```

**移除階段**：

**原始代碼** (vehicleConfig.js Line 205-207)：

```javascript
// 🔄 推力設定
PUSH_FORCE: {
  STOPPED_VEHICLE: 0.05, // 停車車輛的推力係數
},
```

**修改後**：

```javascript
/*
 * 🗑️ 已移除：PUSH_FORCE
 * - 原始定義：FOLLOWING_CONFIG 內的子參數
 * - 移除原因：跟車邏輯中未使用推力機制
 * - 搜尋結果：0 次使用
 * - 備份日期：2025-11-11
 *
 * PUSH_FORCE: {
 *   STOPPED_VEHICLE: 0.05,
 * },
 */
```

---

## 🔗 相關資源

- **分析工具**: `analyze-config-usage.js`
- **使用指南**: `CONFIG_USAGE_ANALYSIS_TOOL.md`（當前文件）
- **報告輸出**: `config-usage-report.json`、`config-usage-report.csv`

---

## ⚠️ 注意事項

1. **備份很重要** - 總是使用註解而非直接刪除，保留原始值
2. **分步進行** - 每次只移除一個或幾個相關參數，然後測試
3. **保留默認** - 對於「看起來沒使用但可能有用」的配置，保留為備份註解
4. **文檔更新** - 如果有相關文檔，也要更新移除記錄
5. **Git 提交** - 每次移除後進行單獨的 commit，便於回溯

---

## 💡 常見問題

### Q: 如何知道搜尋結果是否完整？

**A**: 檢查以下幾種可能的引用方式：

- 直接導入：`import { EASING } from ...`
- 通配符導入：`import * as config from ...` 後使用 `config.EASING`
- 字符串訪問：`config['EASING']` 或 `config[key]` where key='EASING'
- 動態訪問：`Object.values(config)` 時間接使用

### Q: 刪除後發現出現錯誤怎麼辦？

**A**:

1. 立即 git revert 或恢復備份註解
2. 重新執行分析，確認搜尋結果
3. 查詢代碼歷史，了解該參數的用途
4. 向原作者或 AI Agent 詢問

### Q: 能一次性刪除所有未使用的參數嗎？

**A**: **不建議**。最佳實踐是：

1. 逐個刪除相關參數（同一個配置對象內）
2. 每次刪除後都進行測試
3. 記錄變更和測試結果

---

## 📞 獲取幫助

如果遇到問題：

1. 檢查控制台輸出信息
2. 查看詳細報告 `config-usage-report.json`
3. 查詢相關的配置文件註釋
4. 搜尋該參數在整個項目中的所有引用
