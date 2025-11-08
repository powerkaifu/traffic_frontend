# 🚦 API 燈號顯示 - 快速參考

## 🎯 兩大功能

### 1️⃣ Console 中的四個路口 Object (複製用)

**位置**: 打開 DevTools → Console  
**觸發**: 發送 API 請求時

**輸出**:
```
📋 [發送 API - 四個路口數據] 複製以下陣列進行測試:
```

**看到的陣列內容**:
```javascript
[
  { VD_ID: "VLRJX20", Volume_M: 45, Volume_S: 120, Volume_L: 15, ... },
  { VD_ID: "VLRJM60", Volume_M: 38, Volume_S: 105, Volume_L: 12, ... },
  { VD_ID: "VLRJX00_south", Volume_M: 52, Volume_S: 135, Volume_L: 18, ... },
  { VD_ID: "VLRJX00_north", Volume_M: 41, Volume_S: 98, Volume_L: 14, ... }
]
```

💡 **用途**: 複製此陣列進行測試開發

---

### 2️⃣ MainLayout 中的綠色燈號顯示

**位置**: MainLayout 右側邊欄 (特徵模擬數據區域下方)  
**顯示內容**:

```
🚦 API 響應燈號
────────────────
東西向 (秒)    74 s    ← 綠色粗體字
南北向 (秒)    65 s    ← 綠色粗體字
時間戳         16:40   ← 灰色小字
```

💡 **特點**: 
- 🟢 綠色高亮主題
- 📊 實時更新
- 🔢 大字型易讀

---

## 📋 何時出現

| 情況 | 結果 |
|------|------|
| 啟動應用程式 | ❌ 隱藏 (無資料) |
| 發送 API 請求 | ⏳ 等待... |
| 收到 API 響應 | ✅ 顯示燈號時間 |
| 再次發送 API | ✅ 更新燈號和時間戳 |

---

## 🔧 技術詳情

**監聽的事件**: `trafficApiComplete`  
**更新的數據**: 
- `east_west_seconds`
- `south_north_seconds`
- `timestamp`

**相關檔案**:
- `src/classes/TrafficLightController.js` (L1853 - 輸出 Object)
- `src/layouts/MainLayout.vue` (L596, 680, 342 - 接收和顯示)

---

## ✅ 驗證清單

```
□ 打開 DevTools Console
□ 發送 API 請求
□ 看到 "📋 [發送 API - 四個路口數據]" 訊息
□ 看到四個 Object 的陣列
□ 複製陣列進行測試
□ 在 MainLayout 右邊看到 🚦 API 響應燈號
□ 東西向和南北向秒數正確顯示
□ 時間戳顯示當前時間
```

---

## 🚀 立即開始

```bash
# 1. 啟動開發伺服器
quasar dev

# 2. 打開瀏覽器
# http://localhost:5173

# 3. 打開 DevTools (F12)
# 切到 Console 標籤

# 4. 觸發 API 發送
# (在應用中點擊相關按鈕)

# 5. 查看結果
# ✅ Console 中看到四個路口 Object
# ✅ MainLayout 中看到綠色燈號顯示
```

---

## 💬 簡化說明

**Q: 在哪裡看到四個路口的資料?**  
A: 打開 DevTools → Console，發送 API 時會看到一個陣列輸出

**Q: 在哪裡看到燈號時間?**  
A: MainLayout 右側邊欄下方，有一個綠色高亮的 "🚦 API 響應燈號" 區域

**Q: 如何使用 Console 的資料?**  
A: 複製陣列，貼到你的代碼中進行測試

**Q: 顯示的秒數準確嗎?**  
A: 是的，直接來自 API 響應的 east_west_seconds 和 south_north_seconds

