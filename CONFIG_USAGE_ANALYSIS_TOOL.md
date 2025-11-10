# 🔍 配置參數使用情況分析工具

## 📋 使用指南

這個工具幫助您系統性地識別和移除未使用的配置參數，避免程式碼臃腫。

### 工作流程

```
1️⃣ 掃描配置文件 → 收集所有 export const
2️⃣ 搜尋每個參數的使用情況 → 記錄位置和次數
3️⃣ 生成詳細報告 → 分類：已使用/未使用/可疑
4️⃣ 人工審查 → 確認是否真的可以刪除
5️⃣ 安全刪除 → 逐步移除，每次都測試
```

---

## 🎯 配置文件清單

您的項目中的主要配置文件：

### 核心配置（必須檢查）

- `src/classes/config/vehicleConfig.js` - 車輛行為配置
- `src/classes/config/trafficScenarioConfig.js` - 交通情景配置
- `src/classes/config/weatherConfig.js` - 天氣效果配置
- `src/classes/config/vdDisplayConfig.js` - 顯示映射配置
- `src/classes/config/vdBasedTrafficConfig.js` - VD 基礎交通配置
- `src/classes/config/greenLightPredictionConfig.js` - 綠燈預測配置
- `src/classes/config/AnimationDefaults.js` - 動畫預設配置
- `src/classes/config/LaneConfig.js` - 車道配置

### 次要配置（輔助類）

- `src/classes/config/trafficConfig.js`
- `src/classes/config/vdNormalizationConfig.js`
- `src/classes/config/vdPatternConfig.js`

---

## 📊 分析方法

### 第一步：列舉所有導出的配置

使用以下命令掃描所有導出的常數：

```bash
# 查看 vehicleConfig.js 中的所有導出
grep -n "^export const" src/classes/config/vehicleConfig.js

# 查看所有配置文件的導出
find src/classes/config -name "*.js" -exec grep -l "^export const" {} \;
```

### 第二步：對每個參數進行搜尋

```bash
# 搜尋特定參數的使用
grep -r "ANIMATION_CONFIG\|TIME_MULTIPLIER\|SPEED_CHANGE_DURATION" src --include="*.js" --include="*.vue"
```

### 第三步：分類結果

參數分為三類：

1. ✅ **已確認使用** - 至少在一個文件中被導入或使用
2. ❌ **未被使用** - 定義但從未被導入或使用
3. ⚠️ **可疑** - 只在配置文件本身被引用，可能是預留功能

---

## 🔍 詳細檢查清單

### vehicleConfig.js 頂級導出

| 配置名稱                       | 導出位置 | 搜尋結果                          | 使用狀態  | 備註         |
| ------------------------------ | -------- | --------------------------------- | --------- | ------------ |
| `ANIMATION_CONFIG`             | L10      | 在 Vehicle.js 中使用              | ✅ 已使用 | 控制動畫速度 |
| `YELLOW_LIGHT_DECISION_CONFIG` | L60      | 在 Vehicle.js 中使用              | ✅ 已使用 | 黃燈決策     |
| `TURN_SPEED_CONFIG`            | L100     | 在 Vehicle.js 中使用              | ✅ 已使用 | 轉向速度     |
| `VEHICLE_DIMENSIONS`           | L119     | 在 AutoTrafficGenerator.js 中使用 | ✅ 已使用 | 車輛尺寸     |
| `LANE_SPAWN_CONFIG`            | L133     | 在 CollisionController.js 中使用  | ✅ 已使用 | 車道生成     |
| `DISTANCE_CONFIG`              | L147     | 在多個文件中使用                  | ✅ 已使用 | 距離配置     |
| `FOLLOWING_CONFIG`             | L159     | 在多個文件中使用                  | ✅ 已使用 | 跟車配置     |
| `COLLISION_CONFIG`             | L258     | 在 CollisionController.js 中使用  | ✅ 已使用 | 碰撞檢測     |
| `GENERATION_CONFIG`            | L311     | 在 IndexPage.vue 中使用           | ✅ 已使用 | 生成配置     |
| `VEHICLE_RECYCLING_CONFIG`     | L350     | 在 Vehicle.js 中使用              | ✅ 已使用 | 車輛回收     |
| `LANE_CHANGING_CONFIG`         | L384     | 在 Vehicle.js 中使用              | ✅ 已使用 | 變道配置     |
| `VOLUME_LIMITS_CONFIG`         | L436     | 在多個文件中使用                  | ✅ 已使用 | 流量限制     |

### vehicleConfig.js 內部參數檢查

需要檢查的子參數（可能未被使用）：

```javascript
// ANIMATION_CONFIG 內的參數
- TIME_MULTIPLIER ✅ 使用
- SPEED_CHANGE_DURATION ✅ 使用
- COOLDOWN_TIMES ✅ 使用
- EASING ❌ 未使用？
- INITIALIZATION_DELAY ✅ 使用
- MIN_ANIMATION_TIME ✅ 使用
- MAX_ANIMATION_TIME ✅ 使用
- STUCK_CHECK_THRESHOLD ❌ 未使用？

// FOLLOWING_CONFIG 內的參數
- SPEED_RATIOS ✅ 使用
- GREEN_LIGHT_FOLLOWING ❓ 需確認
- RESUME_SPEED ❓ 需確認
- CHECK_INTERVAL ✅ 使用
- PUSH_FORCE ❌ 未使用？
- PREDICTIVE_SLOWDOWN ❓ 需確認
- AUTO_FOLLOW_AFTER_COLLISION ✅ 使用
```

---

## 🛠️ 檢查工具命令

### 1. 查找所有導出的常數

```bash
# Windows PowerShell
Get-ChildItem src/classes/config -Filter "*.js" | ForEach-Object {
    Write-Host "=== $($_.Name) ===" -ForegroundColor Green
    Select-String "^export const" $_.FullName | Select-Object -ExpandProperty Line
}
```

### 2. 檢查特定參數的使用

```bash
# 使用 grep 搜尋
grep -r "EASING\|STUCK_CHECK_THRESHOLD\|PUSH_FORCE" src --include="*.js" --include="*.vue"

# 如果搜尋結果為空，表示未被使用
```

### 3. 檢查默認導出

```bash
# 檢查 default export 是否包含該配置
grep -A 20 "export default" src/classes/config/vehicleConfig.js
```

---

## 📋 檢查清單：vehicleConfig.js

### 第 1 輪：頂級導出（已完成）

- [x] ANIMATION_CONFIG - ✅ 已使用
- [x] YELLOW_LIGHT_DECISION_CONFIG - ✅ 已使用
- [x] TURN_SPEED_CONFIG - ✅ 已使用
- [x] VEHICLE_DIMENSIONS - ✅ 已使用
- [x] LANE_SPAWN_CONFIG - ✅ 已使用
- [x] DISTANCE_CONFIG - ✅ 已使用
- [x] FOLLOWING_CONFIG - ✅ 已使用
- [x] COLLISION_CONFIG - ✅ 已使用
- [x] GENERATION_CONFIG - ✅ 已使用
- [x] VEHICLE_RECYCLING_CONFIG - ✅ 已使用
- [x] LANE_CHANGING_CONFIG - ✅ 已使用
- [x] VOLUME_LIMITS_CONFIG - ✅ 已使用
- [x] TRAFFIC_LIGHT_CONFIG - ❌ 已移除
- [x] VEHICLE_EXIT_CONFIG - ❌ 已移除

### 第 2 輪：內部參數（待檢查）

- [ ] ANIMATION_CONFIG.EASING - 需檢查
- [ ] ANIMATION_CONFIG.STUCK_CHECK_THRESHOLD - 需檢查
- [ ] FOLLOWING_CONFIG.PUSH_FORCE - 需檢查
- [ ] FOLLOWING_CONFIG.GREEN_LIGHT_FOLLOWING - 需檢查
- [ ] FOLLOWING_CONFIG.RESUME_SPEED - 需檢查
- [ ] COLLISION_CONFIG.TIME_MULTIPLIER_COMPENSATION - 需檢查

---

## 🚀 下一步行動

### 快速檢查未使用的內部參數

```bash
# 檢查 EASING 是否被使用
grep -r "EASING" src --include="*.js" --include="*.vue"

# 檢查 STUCK_CHECK_THRESHOLD 是否被使用
grep -r "STUCK_CHECK_THRESHOLD" src --include="*.js" --include="*.vue"

# 檢查 PUSH_FORCE 是否被使用
grep -r "PUSH_FORCE" src --include="*.js" --include="*.vue"
```

### 安全移除步驟

```
1. 執行搜尋命令，確認參數完全未被使用
2. 記錄原始值（備份註解）
3. 刪除該參數
4. 從 default export 中移除（如有）
5. 重新啟動 npm run dev
6. 硬重新載入瀏覽器 (Ctrl+Shift+R)
7. 檢查控制台是否有錯誤
8. 測試相關功能
```

---

## 📝 記錄模板

使用此模板記錄每個被移除的參數：

````markdown
### 已移除：EASING

- **文件**: vehicleConfig.js
- **原位置**: ANIMATION_CONFIG 內 (Line XXX)
- **原始值**: { NONE: 'none' }
- **移除原因**: 在整個項目中未被使用，已棄用的功能
- **搜尋結果**: 0 次使用
- **備份**:
  ```javascript
  // EASING: {
  //   NONE: 'none',
  // },
  ```
````

- **測試結果**: ✅ 應用正常運行

```

---

## ⚠️ 注意事項

1. **分層配置**: 某些參數可能在配置文件內部被引用，需要檢查是否真的被使用
2. **後期綁定**: 某些參數可能通過字符串動態訪問 (如 `config[key]`)，搜尋時可能漏掉
3. **導入模式**: 檢查是否使用了 `import * as config` 這樣的通配符導入
4. **配置序列化**: 某些配置可能被序列化發送到後端，需要驗證後端是否真的使用

---

## 💡 建議優先順序

### 高優先級（安全移除）
1. 完全未被導入的配置對象
2. 控制台顯示的調試消息配置
3. 被註解掉的配置

### 中優先級（謹慎檢查）
1. 內部子參數（如 EASING、PUSH_FORCE）
2. 布爾開關設定（可能在調試時被禁用）

### 低優先級（保留）
1. 標記為「預留功能」的配置
2. 被多個地方引用的配置
3. 影響視覺效果的配置（即使未明確使用）

```
