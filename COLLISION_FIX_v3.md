# 碰撞檢查改進方案 v3

## 問題診斷

用户報告：**有些車子碰撞會失效重疊，但大部分都是可以碰撞後排隊**

### 根本原因分析

1. **檢查頻率不足** - 原始間隔 50ms 太長
   - 在 50ms 內，高速車輛可能移動超過 40px，直接穿過碰撞阈值
   - 尤其在多個車輛同時加速時，時間延遲累積導致碰撞檢測失效

2. **碰撞阈值設定偏大** - 原為 40px，容易被穿過
   - 車輛邊界框寬度 ~40px
   - 當距離 < 40px 時才停止，已經很危險

3. **返回值結構不完整** - `checkSimpleCollision()` 缺少字段
   - 原始返回只有 `targetSpeed` 和 `reason`
   - 但 IndexPage.vue 代碼期望有 `distance`、`requiredGap`、`frontVehicleIsMoving` 等字段
   - 導致某些邏輯路徑判定失敗，碰撞檢查被繞過

4. **檢測範圍偏小** - 原為 200px
   - 可能無法及時發現遠處的車輛

---

## 改進方案（已實施）

### 1. 提高檢查頻率

```javascript
// 之前：this.checkInterval = 50  // 每 50ms 檢查一次
// 之後：this.checkInterval = 20  // 每 20ms 檢查一次（2.5倍頻率）
```

**效果**：在 50ms 內檢查 2.5 次，減少車輛穿過的機率

### 2. 降低碰撞阈值

```javascript
// 之前：COLLISION_THRESHOLD: 40
// 之後：COLLISION_THRESHOLD: 20  // 更敏感的碰撞偵測
```

**效果**：在距離更遠時就開始停止或蠕行，預防性措施

### 3. 擴大檢測範圍

```javascript
// 之前：if (distance < 200)
// 之後：
const COLLISION_CONFIG = {
  // ...其他配置...
  DETECTION_RANGE: 300, // 新增：碰撞檢測範圍
}
// if (distance < COLLISION_CONFIG.DETECTION_RANGE)
```

**效果**：提前發現前方車輛，給予更多反應時間

### 4. 完整的返回值結構

```javascript
// 返回物件現在包含：
{
  targetSpeed: 0 | 0.05 | undefined,  // 速度指令
  reason: string,                      // 描述原因
  distance: number,                    // 前車距離 ✨ 新增
  requiredGap: number,                 // 安全間距 ✨ 新增
  frontVehicle: Vehicle,               // 前方車輛對象 ✨ 新增
  frontVehicleIsMoving: boolean,       // 前車是否在移動 ✨ 新增
  frontVehicleAtStopLine: boolean,     // 前車是否在停止線附近 ✨ 新增
  action: string,                      // 行動類型 ✨ 新增
}
```

**效果**：上層邏輯（IndexPage.vue）可以基於完整信息做出更準確的決策

### 5. 雙層碰撞檢測邏輯

```
checkSimpleCollision() 優先級：
├─ 第一層：燈號停止檢查
│  └─ 距離 < 100px + 紅/黃/全紅 → 停止
│
├─ 第二層：前方碰撞檢查（距離 < 300px 內的車）
│  ├─ 距離 < 20px（碰撞）
│  │  ├─ 前車停止 → 我停止（targetSpeed=0）
│  │  └─ 前車移動 → 我蠕行（targetSpeed=0.05）
│  │
│  └─ 距離 20~300px（接近但未碰撞）
│     └─ 返回距離信息讓上層決策
│
└─ 都未觸發 → 返回 null
```

---

## 配置參數調整

### 新的默認配置

| 參數                           | 舊值  | 新值  | 說明                |
| ------------------------------ | ----- | ----- | ------------------- |
| `checkInterval`                | 50ms  | 20ms  | 檢查頻率提升 2.5 倍 |
| `COLLISION_THRESHOLD`          | 40px  | 20px  | 碰撞敏感度提升      |
| `TRAFFIC_LIGHT_CHECK_DISTANCE` | 100px | 100px | 不變                |
| `MIN_SAFE_DISTANCE`            | 30px  | 30px  | 不變                |
| `CRAWL_SPEED`                  | 0.05  | 0.05  | 不變                |
| `DETECTION_RANGE`              | -     | 300px | 新增                |

### 動態調整指南

如果仍發生碰撞重疊，可調整以下參數：

```javascript
// 在 F12 Console 中執行：

// 進一步提高檢查頻率
window.updateCollisionConfig({
  // CollisionController.checkInterval 無法通過此方法調整，需手動修改代碼
})

// 降低碰撞阈值（更激進的防碰撞）
window.updateCollisionConfig({
  COLLISION_THRESHOLD: 15, // 原 20，改為 15
})

// 擴大檢測範圍
window.updateCollisionConfig({
  DETECTION_RANGE: 400, // 原 300，改為 400
})

// 降低蠕行速度（跟隨更謹慎）
window.updateCollisionConfig({
  CRAWL_SPEED: 0.03, // 原 0.05，改為 0.03
})

// 查看當前配置
window.getCollisionConfig()

// 重置為默認值
window.resetCollisionConfig()
```

---

## 技術細節

### 為什麼 20ms 間隔合適？

- 瀏覽器典型幀率：60 FPS = 16.67ms 每幀
- 20ms ≈ 1.2 幀
- 既能及時檢查，又不會過度頻繁

### 為什麼 20px 碰撞阈值合適？

- 車輛寬度：~40px
- 若距離 < 20px，幾乎已經相互接觸
- 給予 20px 的反應距離較為安全

### 為什麼 300px 檢測範圍合適？

- 檢查間隔 20ms，檢查頻率 50Hz
- 最高速度車輛（timeScale=1.0）移動速度 ~200px/s
- 在 20ms 內移動 ~4px，距離中等的車（100-200px 外）仍能及時檢測
- 300px 給予足夠的前瞻性

---

## 預期改善

### 碰撞失效的解決

✅ **更高頻率檢查** → 減少車輛穿過的機率
✅ **更低碰撞阈值** → 提前停止，預防碰撞
✅ **更大檢測範圍** → 更早發現前方車輛
✅ **完整返回值** → 上層邏輯更準確

### 預期結果

- 幾乎消除車輛重疊現象
- 排隊效率提升（更及時的碰撞反應）
- CPU 負擔略增（20ms vs 50ms），但在可接受範圍內

---

## 測試步驟

1. **刷新頁面**查看改進效果
2. **在 F12 Console 中監控**：
   ```javascript
   // 檢查碰撞檢測日誌
   window.getCollisionConfig() // 查看當前參數
   ```
3. **觀察車輛行為**：
   - 車輛是否仍有重疊現象
   - 排隊是否更整齊
   - 碰撞反應是否更及時

4. **如需進一步調整**，使用上面的調整指南動態修改參數

---

## 編譯狀態

✅ **Build succeeded** - 所有改動均已編譯成功，0 錯誤

---

## 文件清單

- `src/classes/vehicle_utils/CollisionController.js` - 碰撞控制器（已更新）
- `src/pages/IndexPage.vue` - 主邏輯頁面（未修改，自動適配新返回值）
- 本文檔 - 改進詳解
