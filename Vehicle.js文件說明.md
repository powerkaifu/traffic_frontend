# Vehicle.js 文件說明

## 概述

`Vehicle.js` 是交通模擬系統的核心類別，負責處理車輛的生命週期、移動邏輯、碰撞檢測、交通號誌響應等功能。

## 設計模式分析

### 使用的設計模式

- **Factory Pattern**: 創建車輛DOM元素和配置
- **Strategy Pattern**: 不同方向和車輛類型的處理策略
- **State Pattern**: 車輛狀態管理
- **Observer Pattern**: 交通控制器和數據收集器通知
- **Template Method Pattern**: 標準化的處理流程
- **Command Pattern**: 移動和動畫命令
- **Composite Pattern**: 車輛及其子組件結構
- **Adapter Pattern**: 座標系統適配

## 靜態屬性

| 屬性名稱                  | 類型   | 預設值                                              | 使用狀態  | 說明                 |
| ------------------------- | ------ | --------------------------------------------------- | --------- | -------------------- |
| `timeMultiplier`          | number | `ANIMATION_CONFIG.TIME_MULTIPLIER`                  | ✅ 使用中 | 統一控制動畫速度倍數 |
| `antiShakeGlobalCooldown` | number | `ANIMATION_CONFIG.COOLDOWN_TIMES.GLOBAL_ANTI_SHAKE` | ✅ 使用中 | 全局抖動抑制冷卻時間 |
| `lastGlobalAdjustTime`    | number | 0                                                   | ✅ 使用中 | 上次全局調整時間戳   |

## 實例屬性

### 基礎屬性

| 屬性名稱      | 類型        | 使用狀態  | 說明                                 |
| ------------- | ----------- | --------- | ------------------------------------ |
| `id`          | string      | ✅ 使用中 | 車輛唯一識別碼                       |
| `direction`   | string      | ✅ 使用中 | 車輛行駛方向 (east/west/north/south) |
| `vehicleType` | string      | ✅ 使用中 | 車輛類型 (motor/small/large)         |
| `laneNumber`  | number      | ✅ 使用中 | 車道編號 (1-4)                       |
| `element`     | HTMLElement | ✅ 使用中 | 車輛DOM元素                          |
| `laneLabel`   | HTMLElement | ✅ 使用中 | 車道編號標籤元素                     |

### 狀態管理屬性

| 屬性名稱            | 類型    | 使用狀態  | 說明                                        |
| ------------------- | ------- | --------- | ------------------------------------------- |
| `currentState`      | string  | ✅ 使用中 | 當前狀態 (waiting/moving/slowing/stopped等) |
| `isAtStopLine`      | boolean | ✅ 使用中 | 是否在停止線位置                            |
| `waitingForGreen`   | boolean | ✅ 使用中 | 是否等待綠燈                                |
| `hasPassedStopLine` | boolean | ✅ 使用中 | 是否已通過停止線                            |
| `justCreated`       | boolean | ✅ 使用中 | 是否剛創建 (用於避免立即碰撞檢測)           |

### 動畫與移動屬性

| 屬性名稱            | 類型          | 使用狀態  | 說明              |
| ------------------- | ------------- | --------- | ----------------- |
| `movementTimeline`  | gsap.Timeline | ✅ 使用中 | GSAP動畫時間軸    |
| `originalTimeScale` | number        | ✅ 使用中 | 原始時間縮放值    |
| `initialSpeed`      | number        | ✅ 使用中 | 初始速度 (km/h)   |
| `currentSpeed`      | number        | ✅ 使用中 | 當前速度 (km/h)   |
| `maxSpeed`          | number        | ✅ 使用中 | 最大速度 (km/h)   |
| `totalDistance`     | number        | ✅ 使用中 | 總行駛距離 (像素) |

### 防抖動機制屬性

| 屬性名稱                 | 類型    | 使用狀態  | 說明                 |
| ------------------------ | ------- | --------- | -------------------- |
| `lastPositionAdjustTime` | number  | ✅ 使用中 | 上次位置調整時間     |
| `positionAdjustCooldown` | number  | ✅ 使用中 | 位置調整冷卻時間     |
| `isAdjustingPosition`    | boolean | ✅ 使用中 | 是否正在調整位置     |
| `lastTimeScaleChange`    | number  | ✅ 使用中 | 上次時間縮放變更時間 |
| `timeScaleDebounceDelay` | number  | ✅ 使用中 | 時間縮放防抖延遲     |

### 停止線相關屬性

| 屬性名稱                | 類型    | 使用狀態  | 說明                   |
| ----------------------- | ------- | --------- | ---------------------- |
| `stopLineStabilized`    | boolean | ✅ 使用中 | 是否在停止線區域已穩定 |
| `stopLineStabilizeTime` | number  | ✅ 使用中 | 停止線穩定時間         |
| `stopLineNoAdjustZone`  | boolean | ✅ 使用中 | 停止線禁止調整區域標記 |

### 數據收集屬性

| 屬性名稱            | 類型   | 使用狀態  | 說明                 |
| ------------------- | ------ | --------- | -------------------- |
| `createdAt`         | string | ✅ 使用中 | 創建時間戳 (ISO格式) |
| `startPosition`     | object | ✅ 使用中 | 起始位置 {x, y}      |
| `movementStartTime` | string | ✅ 使用中 | 移動開始時間         |
| `movementEndTime`   | string | ✅ 使用中 | 移動結束時間         |
| `travelTime`        | number | ✅ 使用中 | 行駛時間 (秒)        |

### 定時器屬性

| 屬性名稱             | 類型   | 使用狀態  | 說明               |
| -------------------- | ------ | --------- | ------------------ |
| `periodicCheckTimer` | number | ✅ 使用中 | 定期檢查定時器     |
| `stuckCheckTimer`    | number | ✅ 使用中 | 防停滯檢查定時器   |
| `timeScaleTimeout`   | number | ✅ 使用中 | 時間縮放更新定時器 |

### 碰撞檢測屬性

| 屬性名稱                 | 類型                    | 使用狀態  | 說明             |
| ------------------------ | ----------------------- | --------- | ---------------- |
| `lastCollisionCheck`     | number                  | ✅ 使用中 | 上次碰撞檢查時間 |
| `collisionCheckInterval` | number                  | ✅ 使用中 | 碰撞檢查間隔     |
| `criticalZoneThreshold`  | number                  | ✅ 使用中 | 危險區域閾值     |
| `nearbyVehicleRange`     | number                  | ✅ 使用中 | 附近車輛檢查範圍 |
| `collisionDetector`      | SimpleCollisionDetector | ✅ 使用中 | 簡化碰撞檢測器   |

### 其他屬性

| 屬性名稱            | 類型   | 使用狀態  | 說明                            |
| ------------------- | ------ | --------- | ------------------------------- |
| `containerPosition` | object | ✅ 使用中 | 記錄容器位置 (用於檢測佈局變化) |
| `lastMovementTime`  | number | ✅ 使用中 | 上次移動時間 (用於防停滯)       |
| `targetX`           | number | ✅ 使用中 | 目標X座標                       |
| `targetY`           | number | ✅ 使用中 | 目標Y座標                       |
| `pendingTimeScale`  | number | ✅ 使用中 | 待應用的時間縮放值              |

## 主要方法

### 建構方法

| 方法名稱      | 參數                                     | 返回值 | 使用狀態  | 說明                         |
| ------------- | ---------------------------------------- | ------ | --------- | ---------------------------- |
| `constructor` | x, y, direction, vehicleType, laneNumber | -      | ✅ 使用中 | 創建車輛實例，初始化所有屬性 |

### 工廠與配置方法

| 方法名稱              | 參數 | 返回值      | 使用狀態  | 說明                        |
| --------------------- | ---- | ----------- | --------- | --------------------------- |
| `createElement`       | -    | HTMLElement | ✅ 使用中 | 創建車輛DOM元素             |
| `createLaneLabel`     | -    | void        | ✅ 使用中 | 創建車道編號標籤            |
| `getVehicleConfig`    | -    | object      | ✅ 使用中 | 獲取車輛配置 (圖片、尺寸等) |
| `generateRandomSpeed` | -    | number      | ✅ 使用中 | 基於車輛類型生成隨機速度    |

### 移動與動畫方法

| 方法名稱                     | 參數                                                       | 返回值  | 使用狀態  | 說明                        |
| ---------------------------- | ---------------------------------------------------------- | ------- | --------- | --------------------------- |
| `moveAlongPath`              | trafficController, allVehicles, onVehicleOutOfBounds       | Promise | ✅ 使用中 | 使用MotionPath沿SVG路徑移動 |
| `moveToWithTrafficControl`   | targetX, targetY, duration, trafficController, allVehicles | Promise | ✅ 使用中 | 帶交通燈控制的直線移動      |
| `calculateAnimationDuration` | distance                                                   | number  | ✅ 使用中 | 計算動畫持續時間            |
| `stopMovement`               | -                                                          | void    | ✅ 使用中 | 停止移動並調整到停止線位置  |
| `resumeMovement`             | allVehicles                                                | void    | ✅ 使用中 | 基於距離的平滑恢復移動      |

### 位置與幾何方法

| 方法名稱                  | 參數 | 返回值 | 使用狀態  | 說明                   |
| ------------------------- | ---- | ------ | --------- | ---------------------- |
| `getCurrentPosition`      | -    | {x, y} | ✅ 使用中 | 獲取當前位置           |
| `getVehicleHeadPosition`  | -    | {x, y} | ✅ 使用中 | 根據方向計算車頭位置   |
| `getBoundingBox`          | -    | object | ✅ 使用中 | 獲取車輛邊界框         |
| `getStopLinePosition`     | -    | {x, y} | ✅ 使用中 | 根據方向計算停止線位置 |
| `getDistanceToStopLine`   | -    | number | ✅ 使用中 | 計算車輛到停止線距離   |
| `getDirectionEndPosition` | -    | {x, y} | ✅ 使用中 | 根據方向獲取結束位置   |

### 碰撞檢測方法

| 方法名稱                        | 參數        | 返回值      | 使用狀態  | 說明                        |
| ------------------------------- | ----------- | ----------- | --------- | --------------------------- |
| `checkSimpleCollision`          | allVehicles | object/null | ✅ 使用中 | 使用簡化碰撞檢測器檢查碰撞  |
| `smartCollisionCheck`           | allVehicles | object/null | ✅ 使用中 | 智能碰撞檢查 (性能優化版)   |
| `performDetailedCollisionCheck` | vehicles    | object/null | ✅ 使用中 | 詳細碰撞檢查                |
| `getNearbyVehicles`             | allVehicles | array       | ✅ 使用中 | 獲取附近車輛 (優化檢查範圍) |
| `isInCriticalZone`              | -           | boolean     | ✅ 使用中 | 判斷是否在危險區域          |

### 交通號誌方法

| 方法名稱                     | 參數              | 返回值      | 使用狀態  | 說明                         |
| ---------------------------- | ----------------- | ----------- | --------- | ---------------------------- |
| `checkTrafficLightSlowDown`  | trafficController | object/null | ✅ 使用中 | 檢查交通燈並處理車道專用邏輯 |
| `directTrafficLightResponse` | trafficController | void        | ✅ 使用中 | 統一的燈號響應處理           |
| `checkStopLine`              | -                 | boolean     | ✅ 使用中 | 檢查是否到達停止線           |
| `isNearStopLine`             | -                 | boolean     | ✅ 使用中 | 檢查是否靠近停止線           |

### 邊界與狀態檢查方法

| 方法名稱                  | 參數             | 返回值  | 使用狀態  | 說明                               |
| ------------------------- | ---------------- | ------- | --------- | ---------------------------------- |
| `checkOutOfBounds`        | position         | boolean | ✅ 使用中 | 檢查車輛是否已離開畫面邊界         |
| `checkBoundsForDirection` | position, bounds | boolean | ✅ 使用中 | 根據方向檢查邊界                   |
| `checkLayoutChange`       | -                | boolean | ✅ 使用中 | 檢測容器位置變化                   |
| `isClosestToStopLine`     | allVehicles      | boolean | ✅ 使用中 | 檢查是否是同車道最接近停止線的車輛 |

### 防停滯機制方法

| 方法名稱                    | 參數 | 返回值 | 使用狀態  | 說明               |
| --------------------------- | ---- | ------ | --------- | ------------------ |
| `setupAntiStuckMechanism`   | -    | void   | ✅ 使用中 | 設置防停滯機制     |
| `checkAndResolveStuckState` | -    | void   | ✅ 使用中 | 檢查並解決停滯狀態 |
| `forceUnstuck`              | -    | void   | ✅ 使用中 | 強制解除停滯       |

### 速度控制方法

| 方法名稱               | 參數 | 返回值 | 使用狀態  | 說明             |
| ---------------------- | ---- | ------ | --------- | ---------------- |
| `getCurrentSpeedRatio` | -    | number | ✅ 使用中 | 獲取當前速度比例 |

### 觀察者模式方法

| 方法名稱                  | 參數                   | 返回值 | 使用狀態  | 說明                       |
| ------------------------- | ---------------------- | ------ | --------- | -------------------------- |
| `notifyTrafficController` | -                      | void   | ✅ 使用中 | 通知交通控制器車輛生成事件 |
| `notifyDataCollector`     | action, additionalData | void   | ✅ 使用中 | 通知數據收集器             |

### 工具方法

| 方法名稱  | 參數      | 返回值     | 使用狀態  | 說明                      |
| --------- | --------- | ---------- | --------- | ------------------------- |
| `addTo`   | container | void       | ✅ 使用中 | 將車輛添加到容器          |
| `fadeIn`  | duration  | Promise    | ✅ 使用中 | 立即顯示車輛 (不使用動畫) |
| `fadeOut` | duration  | gsap.Tween | ✅ 使用中 | 淡出動畫                  |
| `remove`  | -         | void       | ✅ 使用中 | 移除車輛並清理資源        |

### 路徑相關方法

| 方法名稱       | 參數 | 返回值 | 使用狀態  | 說明                        |
| -------------- | ---- | ------ | --------- | --------------------------- |
| `getPathId`    | -    | string | ✅ 使用中 | 獲取車輛對應的路徑ID        |
| `getSvgPathId` | -    | string | ✅ 使用中 | 獲取車輛對應的SVG路徑元素ID |

## 靜態方法

| 方法名稱               | 參數                  | 返回值 | 使用狀態  | 說明                             |
| ---------------------- | --------------------- | ------ | --------- | -------------------------------- |
| `getDistanceConfig`    | -                     | object | ✅ 使用中 | 獲取距離配置                     |
| `getPathStartPosition` | direction, laneNumber | {x, y} | ✅ 使用中 | 獲取指定方向和車道的路徑起始位置 |

## 車輛狀態列表

### 主要狀態

- `waiting`: 等待狀態 (初始狀態)
- `moving`: 正常移動中
- `slowing`: 減速中
- `stopped`: 已停止
- `completed`: 動畫已完成
- `following`: 跟車狀態
- `nearComplete`: 接近完成

### 交通號誌相關狀態

- `waitingForGreen`: 等待綠燈
- `waitingForLeftTurnGreen`: 等待左轉綠燈
- `waitingForStraightGreen`: 等待直行綠燈
- `slowing_for_light`: 為交通燈減速
- `slowing_for_red`: 為紅燈減速
- `slowing_for_left_turn_queue`: 減速前往左轉排隊
- `slowing_for_straight_queue`: 減速前往直行排隊

### 碰撞相關狀態

- `waitingForVehicle`: 等待前方車輛

## 配置文件整合

### 使用的配置項目

- `ANIMATION_CONFIG`: 動畫相關配置
- `TRAFFIC_LIGHT_CONFIG`: 交通燈配置
- `DISTANCE_CONFIG`: 距離相關配置
- `FOLLOWING_CONFIG`: 跟車行為配置
- `COLLISION_CONFIG`: 碰撞檢測配置
- `PATH_CONFIG`: 路徑相關配置
- `DEBUG_CONFIG`: 調試配置

## 主要行為流程

### 車輛創建流程

1. 構造函數初始化所有屬性
2. 創建DOM元素和車道標籤
3. 設置防抖動和防停滯機制
4. 通知交通控制器和數據收集器
5. 初始化碰撞檢測器

### 移動控制流程

1. 選擇移動方式 (MotionPath 或 直線移動)
2. 計算動畫持續時間
3. 設置定期檢查定時器
4. 開始GSAP動畫
5. 在動畫更新中執行各種檢查
6. 動畫完成後清理資源

### 交通燈響應流程

1. `directTrafficLightResponse` 統一處理燈號變化
2. 根據車道類型判斷是否可通行
3. 強制啟動或保持等待狀態
4. `checkTrafficLightSlowDown` 處理車道專用邏輯

### 碰撞檢測流程

1. 智能檢查策略減少不必要的計算
2. 只檢查附近車輛而非所有車輛
3. 基於距離的漸進式速度控制
4. 統一12px安全間距

## 性能優化特色

1. **智能碰撞檢查**: 只在必要時檢查附近車輛
2. **防抖動機制**: 避免頻繁的位置和速度調整
3. **統一配置管理**: 所有參數從 `vehicleConfig.js` 讀取
4. **資源清理**: 完整的定時器和DOM元素清理
5. **狀態管理**: 明確的狀態轉換邏輯

## 依賴項目

### 外部依賴

- `gsap`: 動畫引擎
- `MotionPathPlugin`: 路徑動畫插件

### 內部依賴

- `config/trafficConfig.js`: 速度和停止線配置
- `config/vehicleConfig.js`: 車輛行為配置
- `vehicle_utils/SimpleCollisionDetector.js`: 碰撞檢測器

### 全局依賴

- `window.trafficController`: 交通控制器實例
- `window.liveVehicles`: 實時車輛數據
- DOM元素: `.crossroad-area`, `.central-reference`
- SVG路徑元素: 各車道的路徑定義
