# 左側工具欄視覺風格統一更新

## 📅 更新時間
2025/10/05 上午 6:35

## 🎯 更新目標
將左側 Photoshop 風格工具欄的視覺效果與應用程式其他介面元素保持一致。

## 🔧 更新內容

### 1. 背景樣式
**原樣式：**
```css
background: linear-gradient(135deg, rgba(40, 40, 40, 0.98), rgba(30, 30, 30, 0.98));
```

**新樣式：**
```css
background: linear-gradient(135deg, rgba(35, 80, 150, 0.95), rgba(35, 30, 100, 0.95));
backdrop-filter: blur(10px);
```

### 2. 邊框與陰影
**原樣式：**
```css
border-right: 1px solid rgba(100, 100, 100, 0.5);
box-shadow: 2px 0 10px rgba(0, 0, 0, 0.5);
```

**新樣式：**
```css
border: 2px solid rgb(63, 117, 205);
border-left: none;
border-radius: 0 12px 12px 0;
box-shadow: 0 0 20px rgba(30, 30, 100, 0.8), 4px 0 15px rgba(63, 117, 205, 0.3);
```

### 3. 按鈕樣式
**按鈕尺寸：** 52px × 52px → 56px × 56px
**圖標尺寸：** 24px → 26px
**顏色：** rgba(255, 255, 255, 0.8) → rgba(200, 220, 255, 0.9)
**效果：** 灰階濾鏡 → 綠色發光陰影

**新的圖標效果：**
```css
filter: drop-shadow(0 0 3px rgba(0, 255, 136, 0.3));
```

### 4. Hover 效果
**原樣式：**
```css
background: rgba(80, 80, 80, 0.8);
```

**新樣式：**
```css
background: rgba(63, 117, 205, 0.4);
transform: translateX(2px);
```

**圖標 Hover：**
```css
filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.6));
transform: scale(1.2);
```

### 5. Active 狀態
**原樣式：**
```css
background: rgba(100, 150, 255, 0.3);
border-left: 3px solid rgba(100, 150, 255, 1);
```

**新樣式：**
```css
background: rgba(63, 117, 205, 0.5);
border-left: 4px solid #00ff88;
box-shadow: inset 0 0 10px rgba(0, 255, 136, 0.3);
```

**圖標 Active：**
```css
filter: drop-shadow(0 0 10px rgba(0, 255, 136, 0.8));
color: #00ff88;
transform: scale(1.1);
```

### 6. Tooltip 樣式
**原樣式：**
```css
background: rgba(40, 40, 40, 0.95);
border: 1px solid rgba(100, 100, 100, 0.5);
```

**新樣式：**
```css
background: linear-gradient(135deg, rgba(35, 80, 150, 0.95), rgba(35, 30, 100, 0.95));
border: 2px solid rgb(63, 117, 205);
border-radius: 8px;
color: rgb(200, 220, 255);
backdrop-filter: blur(10px);
box-shadow: 0 0 15px rgba(30, 30, 100, 0.8);
```

### 7. 分隔線
**原樣式：**
```css
background: linear-gradient(to right, rgba(100, 100, 100, 0), rgba(100, 100, 100, 0.5), rgba(100, 100, 100, 0));
margin: 4px 8px;
```

**新樣式：**
```css
height: 2px;
background: linear-gradient(to right, rgba(63, 117, 205, 0), rgba(63, 117, 205, 0.6), rgba(63, 117, 205, 0));
margin: 8px 10px;
box-shadow: 0 0 5px rgba(63, 117, 205, 0.4);
```

### 8. 清空車輛按鈕特殊效果
**新增紅色警告效果：**
```css
.toolbar-btn.clear-btn:hover {
  background: rgba(220, 53, 69, 0.4);
  border-left: 3px solid rgba(255, 100, 100, 0.8);
}

.toolbar-btn.clear-btn:hover .btn-icon {
  filter: drop-shadow(0 0 8px rgba(255, 100, 100, 0.8));
  color: rgba(255, 150, 150, 1);
}
```

## 🎨 設計一致性參考

### 應用程式整體配色方案
- **主色調：** 藍紫色系
- **強調色：** 綠色 (#00ff88)
- **警告色：** 紅色 (rgba(220, 53, 69))

### 共用樣式元素
1. **背景漸變：** `linear-gradient(135deg, rgba(35, 80, 150, 0.9), rgba(35, 30, 100, 0.9))`
2. **邊框：** `2px solid rgb(63, 117, 205)`
3. **陰影：** `0 0 20px rgba(30, 30, 100, 0.8)`
4. **模糊：** `backdrop-filter: blur(10px)`

### 參考的介面元素
- **AI 預測面板** (.ai-prediction-panel)
- **交通燈倒數計時器** (.timer-display)
- **路標背景** (.road-label)

## 📋 功能說明

### 工具欄包含的功能（由上至下）
1. **顯示路徑 / 隱藏路徑** 👁️
   - 切換車道路徑的可見性
   - Active 狀態：路徑顯示中

2. **編輯路徑 / 停用編輯** ✏️ / 🔒
   - 啟用/停用路徑編輯模式
   - Active 狀態：編輯模式啟用中

3. **導出路徑** 📋
   - 導出當前路徑數據

4. **分隔線** ─────

5. **清空車輛** 🧹
   - 清除場景中所有車輛
   - Hover 時顯示紅色警告效果

## ✅ 測試要點

### 視覺測試
- [ ] 工具欄背景與其他介面元素色調一致
- [ ] 邊框發光效果與其他元素協調
- [ ] Hover 效果平滑且明顯
- [ ] Active 狀態綠色發光清晰可見
- [ ] Tooltip 樣式與主題一致
- [ ] 清空車輛按鈕的紅色警告效果明顯

### 功能測試
- [ ] 所有按鈕點擊響應正常
- [ ] 路徑顯示/隱藏功能正常
- [ ] 路徑編輯模式切換正常
- [ ] 路徑導出功能正常
- [ ] 清空車輛功能正常

### 響應測試
- [ ] Hover 效果即時響應
- [ ] Tooltip 在適當時機顯示/隱藏
- [ ] 過渡動畫流暢

## 📁 修改的檔案
- `src/pages/IndexPage.vue` (樣式部分，行數：1557-1654)

## 🔄 版本信息
- **版本：** v2.1.0
- **更新類型：** UI/UX 改進
- **影響範圍：** 視覺樣式（不影響功能邏輯）

## 📝 備註
- 所有顏色值參考自 `.ai-prediction-panel` 和 `.timer-display` 的樣式
- 保持了原有的 Photoshop 風格佈局（垂直圖標欄）
- 增強了視覺反饋（發光效果、動畫過渡）
- 提升了整體 UI 的一致性和專業感

## 🚀 後續優化建議
1. 考慮添加快捷鍵提示（如 Ctrl+P 顯示路徑）
2. 可以加入更多工具按鈕（如重置場景、設置等）
3. 考慮添加工具欄位置切換（左側/右側）
4. 添加工具欄摺疊/展開功能
