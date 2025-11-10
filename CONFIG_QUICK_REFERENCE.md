# 🎫 配置清理 - 快速參考卡

## 🚀 三步啟動

```bash
# 1. 運行分析
node analyze-config-usage.js

# 2. 查看報告
code config-usage-report.json

# 3. 按照指南進行清理
cat CONFIG_CLEANUP_GUIDE.md
```

---

## 📊 關鍵數據

### 當前配置統計（vehicleConfig.js）

**已導出配置**：12 個

```
✅ ANIMATION_CONFIG            - 動畫與時間設定
✅ YELLOW_LIGHT_DECISION_CONFIG - 黃燈決策配置
✅ TURN_SPEED_CONFIG            - 轉向速度控制
✅ VEHICLE_DIMENSIONS           - 車輛尺寸設定
✅ LANE_SPAWN_CONFIG            - 車道生成設定
✅ DISTANCE_CONFIG              - 距離設定
✅ FOLLOWING_CONFIG             - 跟車行為設定
✅ COLLISION_CONFIG             - 碰撞檢測設定
✅ GENERATION_CONFIG            - 生成間隔設定
✅ VEHICLE_RECYCLING_CONFIG     - 循環流量機制
✅ LANE_CHANGING_CONFIG         - 車道變換設定
✅ VOLUME_LIMITS_CONFIG         - 前後端分層設定
```

**已移除配置**：2 個

```
❌ TRAFFIC_LIGHT_CONFIG - 交通燈響應設定（未被使用）
❌ VEHICLE_EXIT_CONFIG  - 車輛退出檢測設定（未被使用）
```

---

## 🔍 診斷命令速查

### 搜尋特定參數

```bash
# 搜尋 EASING 是否被使用
grep -r "EASING" src --include="*.js" --include="*.vue"

# 搜尋 PUSH_FORCE 是否被使用
grep -r "PUSH_FORCE" src --include="*.js" --include="*.vue"

# 搜尋 STUCK_CHECK_THRESHOLD 是否被使用
grep -r "STUCK_CHECK_THRESHOLD" src --include="*.js" --include="*.vue"

# 一次搜尋多個參數
grep -r "EASING\|PUSH_FORCE\|STUCK_CHECK_THRESHOLD" src --include="*.js" --include="*.vue"
```

### 檢查導出列表

```bash
# 查看 vehicleConfig.js 中的所有頂級導出
grep "^export const" src/classes/config/vehicleConfig.js

# 查看所有配置文件的導出
grep -r "^export const" src/classes/config --include="*.js"

# 查看 default export
grep -A 20 "^export default" src/classes/config/vehicleConfig.js
```

### 檢查導入使用

```bash
# 查看誰導入了 ANIMATION_CONFIG
grep -r "ANIMATION_CONFIG" src --include="*.js" --include="*.vue" | grep "import"

# 查看誰導入了 vehicleConfig
grep -r "from.*vehicleConfig" src --include="*.js" --include="*.vue"

# 查看是否有通配符導入
grep -r "import \* as" src/classes/config --include="*.js"
```

---

## ✅ 驗證清單

### 移除前（每個參數）

```
□ 執行 grep 搜尋
  grep -r "PARAMETER_NAME" src

□ 確認搜尋結果為空或只有定義行

□ 查詢備註說明
  - 是否有 TODO 註釋？
  - 是否標記為實驗性功能？

□ 查詢 git 歷史
  git log -p --all -S "PARAMETER_NAME" | head -50

□ 向團隊成員確認
  "我要移除 XXX，這是從未使用的參數"
```

### 移除中

```
□ 創建備份註解
  /* 🗑️ 已移除：PARAMETER_NAME
     - 原因：未被使用
     - 備份：[粘貼原始代碼]
  */

□ 從配置對象中刪除（vehicleConfig.js）

□ 從 default export 中移除（如有）

□ 檢查是否有直接導入
  grep -r "import.*PARAMETER_NAME" src
```

### 移除後

```
□ 重新啟動開發服務器
  npm run dev

□ 硬重新載入瀏覽器
  Ctrl+Shift+R (Windows/Linux)
  Cmd+Shift+R (Mac)

□ 檢查控制台
  F12 → Console
  - 無 undefined 錯誤
  - 無 import 錯誤

□ 功能測試
  - 動畫正常
  - 碰撞檢測正常
  - 車道生成正常

□ 二次驗證
  grep -r "PARAMETER_NAME" src
  → 應返回空結果
```

---

## 🚨 常見陷阱

### ⚠️ 陷阱 1：對象內嵌套參數

```javascript
// ❌ 搜尋 EASING 時可能遺漏：只搜尋了頂級物件
// ✅ 應該搜尋：ANIMATION_CONFIG 和它的所有子參數

ANIMATION_CONFIG: {
  TIME_MULTIPLIER: 0.6,       // ← 這是頂級
  SPEED_CHANGE_DURATION: {},   // ← 檢查完整對象
  EASING: { ... },            // ← 嵌套子參數
}
```

**解決方案**：使用 `-A 5 -B 5` 查看上下文

```bash
grep -r "EASING" src -A 5 -B 5
```

### ⚠️ 陷阱 2：通配符導入

```javascript
// ❌ grep 搜尋 EASING 時可能找不到
import * as config from '...vehicleConfig'
const { EASING } = config  // 動態訪問

// ✅ 應該搜尋：
grep -r "config\[.*EASING\|config\.EASING\|EASING" src
```

### ⚠️ 陷阱 3：字符串引用

```javascript
// ❌ grep 搜尋 EASING 可能找不到
const paramName = 'EASING'
const value = config[paramName]

// ✅ 應該手動檢查：動態參數名無法自動檢測
```

### ⚠️ 陷阱 4：未更新 default export

```javascript
// ❌ 刪除了參數但忘記更新導出
export const EASING = { ... }  // ← 已刪除
export default {
  EASING,  // ← 遺留的引用 → 編譯錯誤！
}

// ✅ 正確做法：同時更新導出對象
export default {
  // EASING,  ← 也要刪除
}
```

---

## 📈 進度追蹤

### 已完成

```
✅ 2025-11-11 - 移除 TRAFFIC_LIGHT_CONFIG
✅ 2025-11-11 - 移除 VEHICLE_EXIT_CONFIG
✅ 2025-11-11 - 恢復 VEHICLE_DIMENSIONS（誤刪）
```

### 待完成

```
⏳ 檢查 EASING 是否真的未使用
⏳ 檢查 PUSH_FORCE 是否真的未使用
⏳ 檢查 STUCK_CHECK_THRESHOLD 是否真的未使用
⏳ 檢查 GREEN_LIGHT_FOLLOWING 是否真的未使用
⏳ 檢查 RESUME_SPEED 是否真的未使用
⏳ 檢查 TIME_MULTIPLIER_COMPENSATION 是否真的未使用
```

### 保留

```
✅ ANIMATION_CONFIG - 核心配置
✅ VOLUME_LIMITS_CONFIG - 前後端分層配置
✅ COLLISION_CONFIG - 碰撞檢測配置
✅ 所有其他被驗證使用的配置
```

---

## 🔗 相關文件

| 文件                            | 用途             |
| ------------------------------- | ---------------- |
| `analyze-config-usage.js`       | 自動化分析工具   |
| `CONFIG_USAGE_ANALYSIS_TOOL.md` | 詳細分析工具文檔 |
| `CONFIG_CLEANUP_GUIDE.md`       | 詳細清理指南     |
| `config-usage-report.json`      | 分析結果（JSON） |
| `config-usage-report.csv`       | 分析結果（CSV）  |

---

## 📞 快速幫助

**我的參數被誤刪怎麼辦？**

```bash
# 查看 git 歷史
git log -p src/classes/config/vehicleConfig.js | grep -A 10 "PARAMETER_NAME"

# 恢復該文件到之前的版本
git checkout HEAD~1 src/classes/config/vehicleConfig.js
```

**搜尋結果說 0 次但我確定被使用了？**

```bash
# 1. 檢查備選名稱（駝峰式、蛇形式等）
grep -r "easing\|EASING\|Easing" src

# 2. 檢查是否在註釋中
grep -r "EASING" src --include="*.js"  # 不排除註釋

# 3. 檢查是否在字符串中
grep -r '"EASING"\|'"'"'EASING'"'"'' src

# 4. 手動查看調用棧
grep -r "from.*vehicleConfig" src  # 找出誰導入了
```
