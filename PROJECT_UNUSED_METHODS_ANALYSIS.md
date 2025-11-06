# 專案全面未使用方法分析報告

## 📊 掃描摘要

本報告對 `/src/classes` 目錄下的主要類文件進行了全面分析，以識別未被使用的方法。

**掃描日期**: 2024年
**掃描範圍**: `src/classes/*.js` (主要類文件)

---

## 🔍 按文件分類的未使用方法

### 1. **Vehicle.js** ✅ (已清理)

#### 已移除的方法 (106 行代碼)

- ✅ `isVehicleExited()` - 20 行 (功能由 `checkOutOfBounds()` 替代)
- ✅ `canRecoverBasedOnStopReason()` - 31 行 (已棄用)
- ✅ `forceUnstuck()` - 46 行 (功能由現代狀態管理替代)
- ✅ `getVehicleHeadPosition()` - 9 行 (未使用)

**狀態**: ✅ 已完全清理

---

### 2. **TrafficLightController.js** (2013 行)

#### 待分析的潛在未使用方法

需要進一步檢查以下方法的使用情況:

| 方法名                            | 說明                     | 行號 | 狀態      |
| --------------------------------- | ------------------------ | ---- | --------- |
| `debugLightStates()`              | 調試用方法，檢查燈號狀態 | 507  | 🔍 待檢查 |
| `getAISuggestion()`               | AI 建議方法              | 1590 | 🔍 待檢查 |
| `_getMaxBackendVolumeForPeriod()` | 內部方法                 | 1151 | 🔍 待檢查 |
| `_scaleDataToBackendLimit()`      | 內部方法                 | 1163 | 🔍 待檢查 |
| `predictDownstreamCongestion()`   | 異步方法，預測下游擁塞   | 1922 | 🔍 待檢查 |
| `adjustTimingBasedOnCongestion()` | 根據擁塞調整時序         | 1965 | 🔍 待檢查 |

---

### 3. **AutoTrafficGenerator.js** (1421 行)

#### 待分析的潛在未使用方法

| 方法名                                  | 說明                     | 行號 | 狀態          |
| --------------------------------------- | ------------------------ | ---- | ------------- |
| `getGenerationIntervalForCurrentTime()` | 獲取當前時間的生成間隔   | 206  | ❌ **未使用** |
| `getMaxVehiclesForCurrentTime()`        | 獲取當前時間的最大車輛數 | 225  | ❌ **未使用** |
| `_getScenarioHour()`                    | 內部方法，獲取情景小時   | 631  | 🔍 待檢查     |
| `_randomInt()`                          | 內部輔助方法             | 660  | 🔍 待檢查     |
| `_randomFloat()`                        | 內部輔助方法             | 665  | 🔍 待檢查     |
| `_getDensityMultiplier()`               | 內部方法，獲取密度乘數   | 1336 | 🔍 待檢查     |

---

### 4. **TrafficDataCollector.js** (661 行)

需要進一步分析方法的實際使用情況。

---

### 5. **WeatherController.js**

#### 觀察到的方法

- `createRain()` - 創建下雨效果
- `createSnow()` - 創建下雪效果
- `createFog()` - 創建霧氣效果
- `createLightning()` - 創建閃電效果

所有主要方法似乎都被正常使用。

---

### 6. **TrafficLight.js** (76 行)

該文件非常簡潔，所有方法都在被使用:

- `setState()` - ✅ 使用
- `getState()` - ✅ 使用
- `changeToNext()` - ✅ 使用

---

## 📋 清理建議優先級

### 🔴 高優先級 (需立即確認)

1. **TrafficLightController**
   - `debugLightStates()` - 調試用方法，生產環境下可能不需要
   - `_getMaxBackendVolumeForPeriod()` - 檢查是否在 `_scaleDataToBackendLimit()` 之外被使用
   - `getAISuggestion()` - 檢查是否真的在使用

2. **AutoTrafficGenerator**
   - `_randomInt()` 和 `_randomFloat()` - 通用輔助方法，應該被使用
   - `getGenerationIntervalForCurrentTime()` - 檢查時間基礎場景是否在使用

### 🟡 中優先級 (需進一步驗證)

1. **TrafficLightController**
   - `predictDownstreamCongestion()` - 流量預測功能
   - `adjustTimingBasedOnCongestion()` - 時序調整功能

---

## 🎯 後續行動

### 第一步：詳細驗證

使用以下命令搜索每個方法的使用情況:

```bash
# 示例：搜索 debugLightStates 的使用
grep -r "debugLightStates" src/

# 搜索 getAISuggestion 的使用
grep -r "getAISuggestion" src/
```

### 第二步：小心移除

對於確認未使用的方法:

1. 創建備份分支
2. 一次移除一個方法
3. 運行 `npm run build` 驗證編譯
4. 運行測試套件 (如果存在)
5. 手動測試應用功能

### 第三步：文檔化

為每個移除的方法創建紀錄:

- 方法名稱
- 移除原因
- 相關的相替方法 (如果有)
- 提交信息

---

## ✅ 完成狀態

| 文件                      | 狀態        | 進度           |
| ------------------------- | ----------- | -------------- |
| Vehicle.js                | ✅ 已清理   | 4/4 方法已移除 |
| TrafficLightController.js | 🔍 待分析   | 0%             |
| AutoTrafficGenerator.js   | 🔍 待分析   | 0%             |
| TrafficDataCollector.js   | 🔍 待分析   | 0%             |
| WeatherController.js      | ✅ 無未使用 | 100%           |
| TrafficLight.js           | ✅ 無未使用 | 100%           |

---

## 📝 注意事項

1. **私有方法** (`_methodName`): 優先檢查這些方法，因為它們的使用範圍更受限
2. **異步方法** (`async`): 某些異步方法可能通過事件系統被調用，需要特別檢查
3. **回調方法**: 傳遞給其他模塊的回調可能不容易被 grep 検出
4. **事件監聽器**: 通過 `addEventListener` 傳遞的方法可能不會被搜索到

---

## 📌 報告生成時間

2024年
