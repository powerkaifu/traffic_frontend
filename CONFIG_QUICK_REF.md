# 🎮 碰撞與燈號配置 - 快速參考

## 📍 當前默認配置

```
TRAFFIC_LIGHT_CHECK_DISTANCE: 100 px  ← 燈號停止距離
COLLISION_THRESHOLD: 30 px             ← 前方碰撞距離
MIN_SAFE_DISTANCE: 30 px               ← 車輛安全間距
CRAWL_SPEED: 0.05                      ← 蠕行速度
```

## 💬 控制台命令 (F12 → Console)

### 查看配置

```javascript
getCollisionConfig()
```

### 調整燈號停止距離

```javascript
// 車在距離停止線 80px 時開始檢查燈號
updateCollisionConfig({ TRAFFIC_LIGHT_CHECK_DISTANCE: 80 })
```

### 調整車輛間距

```javascript
// 前車與後車距離小於 50px 時認定為碰撞
updateCollisionConfig({ COLLISION_THRESHOLD: 50 })
```

### 調整蠕行速度

```javascript
// 跟隨速度改為 8%
updateCollisionConfig({ CRAWL_SPEED: 0.08 })
```

### 一次修改多個參數

```javascript
updateCollisionConfig({
  TRAFFIC_LIGHT_CHECK_DISTANCE: 120,
  COLLISION_THRESHOLD: 40,
  CRAWL_SPEED: 0.08,
})
```

### 重置為默認值

```javascript
resetCollisionConfig()
```

## 🎯 常見調整

### ❌ 車停得太早 (距離遠時已停止)

```javascript
updateCollisionConfig({ TRAFFIC_LIGHT_CHECK_DISTANCE: 80 })
```

### ❌ 車停得太晚 (幾乎要越過停止線)

```javascript
updateCollisionConfig({ TRAFFIC_LIGHT_CHECK_DISTANCE: 120 })
```

### ❌ 車輛相互碰撞

```javascript
updateCollisionConfig({ COLLISION_THRESHOLD: 50 })
```

### ❌ 排隊效率太低 (蠕行太慢)

```javascript
updateCollisionConfig({ CRAWL_SPEED: 0.1 })
```

## 📊 參數含義速記

| 參數                         | 增大     | 減小     |
| ---------------------------- | -------- | -------- |
| TRAFFIC_LIGHT_CHECK_DISTANCE | 更早停止 | 更晚停止 |
| COLLISION_THRESHOLD          | 更安全   | 更靠近   |
| CRAWL_SPEED                  | 跟隨更快 | 跟隨更慢 |

## 🔄 測試流程

1. 打開控制台 (F12)
2. 粘貼命令並回車執行
3. 觀察十字路口行為
4. 微調參數，重複測試
