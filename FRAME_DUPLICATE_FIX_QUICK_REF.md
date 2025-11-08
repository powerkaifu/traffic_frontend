# 🚨 RAF 幀內重複生成修復 - 快速參考

## 🎯 問題

同一個 RAF 幀內，同一方向可能生成多台車 → 堆疊

## ✅ 解決方案

添加 **幀內生成跟踪** - 同步記錄當前幀已生成的車輛

---

## 📝 修改清單

### 1. 構造函數（第 ~60 行）

```javascript
// ⚠️ 【修復】同一RAF幀內生成車輛跟踪 - 防止重複生成
this.currentFrameGeneratedVehicles = []
```

### 2. `update()` 方法（第 ~393 行）

```javascript
// ⚠️ 【修復】在幀開始時清空當前幀的生成記錄
this.currentFrameGeneratedVehicles = []
```

### 3. `_generateVehicle()` 方法（第 ~1138 行）

```javascript
// ⚠️ 【修復】檢查當前RAF幀內是否已經為該方向生成過車輛
const frameGeneratedForDir = this.currentFrameGeneratedVehicles.filter((v) => v.direction === selectedDir)
if (frameGeneratedForDir.length > 0) {
  console.log(`🚨 [幀內重複] ${selectedDir}方向在當前幀內已生成${frameGeneratedForDir.length}台，延後到下一幀`)
  return
}

// ... 選擇新方向後 ...

// ⚠️ 【修復】重新檢查新選方向是否已在當前幀生成過
const frameGeneratedForNewDir = this.currentFrameGeneratedVehicles.filter((v) => v.direction === selectedDir)
if (frameGeneratedForNewDir.length > 0) {
  console.log(`🚨 [幀內重複] 新選方向 ${selectedDir} 在當前幀內已生成${frameGeneratedForNewDir.length}台，延後到下一幀`)
  return
}
```

### 4. `_generateVehicle()` 方法（第 ~1473 行）

```javascript
// ⚠️ 【修復】記錄該車輛已在當前幀生成（防止同幀重複生成）
this.currentFrameGeneratedVehicles.push({
  direction: selectedDir,
  type: type,
  timestamp: Date.now(),
})
```

---

## 🔍 驗證方式

### 檢查控制台日誌

```
🚨 [幀內重複] east方向在當前幀內已生成1台，延後到下一幀
```

**含義**：修復生效，重複生成被阻止 ✅

### 觀察車輛派遣

- 修復前：同一方向可能堆疊 2-3 台車
- 修復後：每幀每方向最多 1 台，均衡分配到 4 個方向

---

## 📊 效果對比

| 指標           | 修復前    | 修復後      |
| -------------- | --------- | ----------- |
| 幀內同方向最多 | 無限制    | 1 台        |
| 同步檢查       | ❌ 不可靠 | ✅ 本地同步 |
| 均衡度         | ❌ 堆疊   | ✅ 均勻     |

---

## 🚀 部署檢查清單

- [ ] 構建成功（npm run build ✅）
- [ ] 無編譯錯誤
- [ ] 控制台無異常 warning
- [ ] 車輛派遣均衡（4 個方向交替生成）
- [ ] 性能無下降（RAF 幀率穩定）
