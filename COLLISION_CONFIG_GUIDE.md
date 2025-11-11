# 🎯 碰撞與燈號控制器配置指南

## 📋 可配置參數

### 1. **TRAFFIC_LIGHT_CHECK_DISTANCE** (燈號停止距離)

- **默認值**: `100 px`
- **含義**: 當車距離停止線 **小於此值** 時，才檢查燈號是否需要停止
- **說明**: 距離大於此值時，車輛會忽略紅燈，繼續前進到接近停止線再停止
- **調整場景**:
  - 增大 → 車輛更早停止（更保守）
  - 減小 → 車輛更晚停止（更激進）

### 2. **COLLISION_THRESHOLD** (前方碰撞距離)

- **默認值**: `30 px`
- **含義**: 當前車與前車距離 **小於此值** 時，認定為碰撞
- **說明**: 觸發碰撞後，根據前車速度決定停止或蠕行
- **調整場景**:
  - 增大 → 更早檢測到碰撞（更安全）
  - 減小 → 晚一點檢測碰撞（更靠近）

### 3. **MIN_SAFE_DISTANCE** (車輛間安全間距)

- **默認值**: `30 px`
- **含義**: 當檢測到前車時，應該保持的車輛間最小距離
- **說明**: 目前此參數已在配置中，但在蠕行邏輯中未被直接使用（保留用於未來擴展）
- **調整場景**:
  - 增大 → 排隊時車間距更寬
  - 減小 → 排隊時車間距更緊

### 4. **CRAWL_SPEED** (蠕行速度)

- **默認值**: `0.05`
- **含義**: 當前車在移動時，後車的蠕行跟隨速度
- **說明**: 相對於正常速度 (1.0) 的比例，0.05 表示 5% 的速度
- **調整場景**:
  - 增大 → 跟隨更快（但可能導致碰撞）
  - 減小 → 跟隨更慢（更安全但排隊效率低）

---

## 🎮 在瀏覽器控制台中使用

### 查看當前配置

```javascript
window.getCollisionConfig()
```

**輸出範例**:

```javascript
{
  TRAFFIC_LIGHT_CHECK_DISTANCE: 100,
  COLLISION_THRESHOLD: 30,
  MIN_SAFE_DISTANCE: 30,
  CRAWL_SPEED: 0.05
}
```

### 修改單個參數

```javascript
// 修改燈號停止距離為 150px
window.updateCollisionConfig({ TRAFFIC_LIGHT_CHECK_DISTANCE: 150 })

// 修改碰撞檢測距離為 50px
window.updateCollisionConfig({ COLLISION_THRESHOLD: 50 })

// 同時修改多個參數
window.updateCollisionConfig({
  TRAFFIC_LIGHT_CHECK_DISTANCE: 120,
  COLLISION_THRESHOLD: 40,
  CRAWL_SPEED: 0.08,
})
```

### 重置到默認值

```javascript
window.resetCollisionConfig()
```

---

## 🧪 調試示例

### 場景 1：車輛停止得太早

**問題**: 車在距離停止線 200px 時已經停止
**解決**: 減少 `TRAFFIC_LIGHT_CHECK_DISTANCE`

```javascript
window.updateCollisionConfig({ TRAFFIC_LIGHT_CHECK_DISTANCE: 80 })
```

### 場景 2：車輛排隊時相互碰撞

**問題**: 前車停止時後車撞上了
**解決**: 增加 `COLLISION_THRESHOLD`

```javascript
window.updateCollisionConfig({ COLLISION_THRESHOLD: 50 })
```

### 場景 3：排隊效率太低（蠕行太慢）

**問題**: 前車移動時，後車跟隨太慢
**解決**: 增加 `CRAWL_SPEED`

```javascript
window.updateCollisionConfig({ CRAWL_SPEED: 0.1 })
```

### 場景 4：車間距離太近

**問題**: 停止線前的排隊車輛靠得太近
**解決**: 修改 `COLLISION_THRESHOLD`（與間距直接相關）

```javascript
window.updateCollisionConfig({ COLLISION_THRESHOLD: 40 })
```

---

## 📊 參數組合建議

### 🟢 保守模式（優先安全）

```javascript
window.updateCollisionConfig({
  TRAFFIC_LIGHT_CHECK_DISTANCE: 120, // 更早停止
  COLLISION_THRESHOLD: 50, // 更早檢測碰撞
  CRAWL_SPEED: 0.03, // 蠕行更慢
})
```

### 🟡 平衡模式（默認）

```javascript
window.updateCollisionConfig({
  TRAFFIC_LIGHT_CHECK_DISTANCE: 100,
  COLLISION_THRESHOLD: 30,
  CRAWL_SPEED: 0.05,
})
```

### 🔴 激進模式（優先效率）

```javascript
window.updateCollisionConfig({
  TRAFFIC_LIGHT_CHECK_DISTANCE: 80, // 更晚停止
  COLLISION_THRESHOLD: 20, // 更晚檢測碰撞
  CRAWL_SPEED: 0.1, // 蠕行更快
})
```

---

## 🔄 實時測試流程

1. 打開瀏覽器開發者工具（F12）
2. 在 **Console** 標籤中輸入命令
3. 修改參數後立即觀察十字路口的車輛行為
4. 根據結果微調參數
5. 找到最適合的組合後記錄下來

---

## 💡 備註

- ✅ 所有參數修改都是 **即時生效**，無需重新加載頁面
- ✅ 參數修改只影響 **新生成的車輛**（已存在的車輛不受影響）
- ✅ 頁面刷新後參數重置為默認值
- ⚠️ 修改過激進的參數（如 COLLISION_THRESHOLD = 5）可能導致碰撞問題
