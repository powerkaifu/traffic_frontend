# ✅ Volume_T 和 Speed_T 設定為 0 - 修改完成

## 📋 修改內容

### 問題

路口禁止聯結車進入，所以 `Volume_T`（聯結車流量）和 `Speed_T`（聯結車速度）應該始終為 0。

但在 TrafficLightController.js 中，`Volume_T` 被錯誤地設置為 `mappedVehicleCount`，這會包含所有車輛計數。

### 解決方案

修改 **TrafficLightController.js** 第 913-914 行：

```javascript
// ❌ 舊代碼
Volume_T: mappedVehicleCount, // 【版本 2.5】：使用 VD 映射的車輛數
Speed_T: singleData.Speed_T || 0,

// ✅ 新代碼
Volume_T: 0, // ✅ 聯結車禁止進入，必定為 0（不使用 mappedVehicleCount）
Speed_T: 0, // ✅ 聯結車禁止進入，必定為 0
```

## 📊 影響範圍

### AutoTrafficGenerator.js ✅

- 第 484 行：`volumeT = 0` - 已正確設定
- 第 512 行：`Speed_T: 0` - 已正確設定

### TrafficLightController.js ✅

- 第 653 行：`Volume_T: 0` - 已正確設定
- 第 654 行：`Speed_T: 0` - 已正確設定
- **第 913-914 行**：已修正從 `mappedVehicleCount` 改為 0

## 🎯 驗證清單

- [x] AutoTrafficGenerator 生成時 Volume_T = 0
- [x] AutoTrafficGenerator 生成時 Speed_T = 0
- [x] TrafficLightController 備用數據 Volume_T = 0
- [x] TrafficLightController 備用數據 Speed_T = 0
- [x] TrafficLightController VD 映射時 Volume_T = 0（已修正）
- [x] TrafficLightController VD 映射時 Speed_T = 0（已修正）
- [x] 無編譯錯誤

## 📝 相關說明

### 為什麼 Volume_T 必須為 0？

這個路口的特性決定了不允許聯結車通過：

- **路口類型**：城市十字路口
- **道路等級**：市道（非高速公路）
- **法規限制**：聯結車（大型貨車）禁止進入市區

### 數據流確認

```
前端模擬數據
  ↓
AutoTrafficGenerator._generateScenarioVDData()
  ├─ Volume_T: 0 ✅
  └─ Speed_T: 0 ✅
  ↓
保存到 window.currentGeneratedVDData
  ↓
TrafficLightController.sendDataToBackend()
  ├─ 路徑 1: 直接使用 apiVDData (Volume_T=0, Speed_T=0) ✅
  └─ 路徑 2: VD 映射後 (Volume_T=0, Speed_T=0) ✅
  ↓
發送到後端 API
  ├─ Volume_T: 0
  └─ Speed_T: 0
```

## 🔍 控制台驗證

執行以下代碼查看最終發送給後端的數據：

```javascript
console.log('最後發送的 API 數據:')
console.table(window.lastApiVDDataArray)

// 檢查 Volume_T 和 Speed_T
window.lastApiVDDataArray?.forEach((data, idx) => {
  console.log(`方向 ${idx}: Volume_T=${data.Volume_T}, Speed_T=${data.Speed_T}`)
})
```

預期輸出：

```
方向 0: Volume_T=0, Speed_T=0
方向 1: Volume_T=0, Speed_T=0
方向 2: Volume_T=0, Speed_T=0
方向 3: Volume_T=0, Speed_T=0
```

## ✨ 完成狀態

✅ **所有 Volume_T 和 Speed_T 都正確設定為 0**

修改日期：2025-11-02
修改檔案：TrafficLightController.js
修改行數：913-914
編譯狀態：✅ 無錯誤
