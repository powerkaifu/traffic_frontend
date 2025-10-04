# 路口設置面板重構 - 可收合 + 清空車輛功能 ✅

## 📋 修改概述

重構了 IndexPage.vue 的路口設置控制面板，添加了可收合功能並新增清空所有車輛的按鈕。面板現在固定在瀏覽器最左側。

## 🎯 修改目標

1. ✅ 將路口設置面板移至瀏覽器最左側
2. ✅ 添加面板收合/展開功能
3. ✅ 新增清空所有車輛按鈕
4. ✅ 保持所有原有功能正常運作
5. ✅ 改善 UI/UX 設計

---

## 📝 詳細修改內容

### 1. HTML 結構重構

#### 修改前

```html
<!-- 路徑功能控制欄 -->
<div class="path-control-panel">
  <div class="panel-header">路口設置</div>
  <div class="panel-buttons">
    <button @click="togglePathVisibility" ...>顯示/隱藏路徑</button>
    <button @click="togglePathEditMode" ...>編輯路徑</button>
    <button v-if="isPathEditMode" @click="exportPathData" ...>導出路徑</button>
  </div>
</div>
```

**問題**：
- ❌ 固定在右側，無法收合
- ❌ 缺少清空車輛功能
- ❌ 位置不適合作為主要控制面板

#### 修改後

```html
<!-- 路口設置控制欄（可收合） -->
<div :class="['intersection-control-panel', { collapsed: isPanelCollapsed }]">
  <!-- 收合/展開按鈕 -->
  <button class="panel-toggle-btn" @click="togglePanel" :title="isPanelCollapsed ? '展開面板' : '收合面板'">
    <span class="toggle-icon">{{ isPanelCollapsed ? '►' : '◄' }}</span>
  </button>

  <!-- 面板內容 -->
  <div class="panel-content">
    <div class="panel-header">路口設置</div>
    <div class="panel-buttons">
      <button @click="togglePathVisibility" ...>顯示/隱藏路徑</button>
      <button @click="togglePathEditMode" ...>編輯路徑</button>
      <button v-if="isPathEditMode" @click="exportPathData" ...>導出路徑</button>
      <button @click="clearAllVehicles" ...>清空車輛</button>
    </div>
  </div>
</div>
```

**改進**：
- ✅ 添加收合/展開按鈕
- ✅ 新增清空車輛按鈕（紅色主題）
- ✅ 動態 class 綁定控制收合狀態
- ✅ 分離按鈕和內容區域

---

### 2. JavaScript 功能新增

#### 新增狀態變數

```javascript
const isPanelCollapsed = ref(false) // 路口設置面板收合狀態
```

#### 新增功能函數

##### 1. 切換面板收合狀態

```javascript
const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value
}
```

##### 2. 清空所有車輛

```javascript
const clearAllVehicles = () => {
  console.log('🧹 開始清空所有車輛...')

  try {
    // 獲取當前活躍車輛數量
    const vehicleCount = activeCars.value.length
    console.log(`📊 當前活躍車輛數量：${vehicleCount}`)

    if (vehicleCount === 0) {
      // 沒有車輛時顯示提示
      window.$q.notify({
        type: 'info',
        message: '目前沒有車輛',
        position: 'top',
        timeout: 2000,
      })
      return
    }

    // 複製車輛列表，避免在遍歷時修改原數組
    const vehiclesToRemove = [...activeCars.value]

    // 清空車輛列表
    activeCars.value = []

    // 逐一移除車輛的 DOM 元素
    vehiclesToRemove.forEach((vehicle, index) => {
      try {
        if (vehicle && typeof vehicle.remove === 'function') {
          vehicle.remove()
          console.log(`🚗 已移除車輛 ${index + 1}/${vehicleCount}: ${vehicle.id}`)
        }
      } catch (error) {
        console.warn(`⚠️ 移除車輛失敗 (${vehicle.id}):`, error)
      }
    })

    console.log('✅ 所有車輛已清空完成')

    // 顯示成功通知
    window.$q.notify({
      type: 'positive',
      message: `已清空 ${vehicleCount} 輛車輛`,
      position: 'top',
      timeout: 2000,
      icon: '🧹',
    })

    // 發送車輛清空事件
    window.dispatchEvent(
      new CustomEvent('allVehiclesCleared', {
        detail: {
          count: vehicleCount,
          timestamp: new Date().toISOString(),
        },
      }),
    )
  } catch (error) {
    console.error('❌ 清空車輛時發生錯誤:', error)
    window.$q.notify({
      type: 'negative',
      message: '清空車輛時發生錯誤',
      position: 'top',
      timeout: 3000,
    })
  }
}
```

**功能特點**：
- ✅ 安全檢查車輛數量
- ✅ 複製數組避免遍歷衝突
- ✅ 逐一移除 DOM 元素
- ✅ 詳細的控制台日誌
- ✅ Quasar 通知提示
- ✅ 發送自定義事件
- ✅ 錯誤處理機制

---

### 3. CSS 樣式重構

#### 位置變更

**修改前**：
```css
.path-control-panel {
  position: absolute;
  top: 50%;
  right: 5%;  /* 右側 */
  transform: translateY(-50%);
}
```

**修改後**：
```css
.intersection-control-panel {
  position: fixed;  /* 改為 fixed */
  top: 50%;
  left: 0;  /* 改為左側 */
  transform: translateY(-50%);
}
```

**改進**：
- ✅ `fixed` 定位，不受頁面滾動影響
- ✅ 移至瀏覽器左側 (`left: 0`)
- ✅ 垂直居中保持不變

---

#### 收合功能樣式

```css
/* 收合狀態 */
.intersection-control-panel.collapsed .panel-content {
  transform: translateX(-100%);  /* 向左滑出 */
  opacity: 0;
  pointer-events: none;  /* 禁用互動 */
}

.intersection-control-panel.collapsed .panel-toggle-btn {
  left: 0;  /* 按鈕貼齊左側 */
}

/* 面板內容 */
.panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: linear-gradient(135deg, rgba(35, 80, 150, 0.95), rgba(35, 30, 100, 0.95));
  border: 2px solid rgb(63, 117, 205);
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
  border-left: none;  /* 左側無邊框，貼齊螢幕 */
  padding: 16px 12px;
  box-shadow: 4px 0 20px rgba(30, 30, 100, 0.8);
  backdrop-filter: blur(10px);
  min-width: 140px;
  transition: all 0.3s ease;  /* 平滑過渡 */
}
```

**特點**：
- ✅ CSS transition 實現平滑動畫
- ✅ 收合時完全隱藏（opacity + pointer-events）
- ✅ 只有右側圓角，左側貼齊螢幕
- ✅ 毛玻璃效果 (backdrop-filter)

---

#### 收合/展開按鈕

```css
.panel-toggle-btn {
  position: absolute;
  left: 152px;  /* panel-content width + padding */
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 80px;
  background: linear-gradient(135deg, rgba(35, 80, 150, 0.95), rgba(35, 30, 100, 0.95));
  border: 2px solid rgb(63, 117, 205);
  border-left: none;
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 4px 0 15px rgba(30, 30, 100, 0.6);
  z-index: 1;
}

.panel-toggle-btn:hover {
  background: linear-gradient(135deg, rgba(55, 100, 170, 0.95), rgba(45, 40, 120, 0.95));
  box-shadow: 4px 0 20px rgba(30, 30, 100, 0.9);
}

.toggle-icon {
  font-size: 18px;
  font-weight: bold;
  transition: transform 0.3s ease;
}

.panel-toggle-btn:hover .toggle-icon {
  transform: scale(1.2);  /* 懸停時放大 */
}
```

**特點**：
- ✅ 固定在面板右側邊緣
- ✅ 箭頭圖標指示方向（► / ◄）
- ✅ 懸停時圖標放大
- ✅ 與面板相同的視覺風格

---

#### 清空車輛按鈕樣式

```css
/* 清空車輛按鈕 */
.panel-btn.clear-btn {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.9), rgba(176, 27, 27, 0.9));
  border-color: rgb(220, 53, 69);
}

.panel-btn.clear-btn:hover {
  background: linear-gradient(135deg, rgba(230, 63, 79, 0.9), rgba(186, 37, 37, 0.9));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.5);
}
```

**特點**：
- ✅ 紅色主題，警示性操作
- ✅ 懸停時亮度增加
- ✅ 與其他按鈕一致的懸停效果

---

## 🎨 UI/UX 改進

### 佈局對比

| 項目 | 修改前 | 修改後 |
|-----|--------|--------|
| 位置 | 右側 (right: 5%) | 左側 (left: 0) |
| 定位 | absolute | fixed |
| 收合功能 | ❌ 無 | ✅ 有 |
| 清空車輛 | ❌ 無 | ✅ 有 |
| 邊框樣式 | 四周圓角 | 右側圓角（貼齊左側） |

### 按鈕配色方案

| 按鈕類型 | 顏色 | 用途 |
|---------|------|------|
| 顯示路徑 | 紫色 | 顯示狀態 |
| 隱藏路徑 | 灰色 | 隱藏狀態 |
| 編輯路徑（停用） | 藍色 | 停用狀態 |
| 編輯路徑（啟用） | 橙色脈衝 | 啟用狀態 |
| 導出路徑 | 綠色 | 成功動作 |
| **清空車輛** | **紅色** | **警示動作** |

### 互動體驗

#### 收合動畫
```
展開狀態：
┌─────────────────┐►
│   路口設置      │
├─────────────────┤
│      👁️        │
│   顯示路徑      │
│      ✏️        │
│   編輯路徑      │
│      📋        │
│   導出路徑      │
│      🧹        │
│   清空車輛      │
└─────────────────┘

收合狀態：
          ►
（面板滑出螢幕）
```

---

## 📊 代碼改進統計

| 項目 | 修改前 | 修改後 | 改進 |
|-----|--------|--------|------|
| HTML 行數 | 24 行 | 47 行 | +23 行（功能增強） |
| JS 功能函數 | 2 個 | 4 個 | +2 個 |
| CSS 行數 | ~100 行 | ~200 行 | +100 行（收合功能） |
| 按鈕數量 | 3 個 | 4 個 | +1 個（清空車輛） |
| 收合功能 | ❌ | ✅ | 新增 |
| 清空車輛 | ❌ | ✅ | 新增 |

---

## ✅ 功能清單

### 原有功能（保持）

- ✅ **顯示/隱藏路徑**
  - 切換路徑可見性
  - 圖標動態變化
  - 狀態反映在按鈕樣式

- ✅ **編輯路徑**
  - 啟用/停用 MotionPathHelper
  - 橙色脈衝動畫提示編輯模式
  - 只能編輯指定車道

- ✅ **導出路徑**
  - 只在編輯模式顯示
  - 導出所有路徑資料到剪貼板
  - 成功提示

### 新增功能

- ✅ **面板收合/展開**
  - 點擊按鈕切換狀態
  - 平滑動畫過渡
  - 箭頭圖標指示方向
  - 收合時完全隱藏內容

- ✅ **清空所有車輛**
  - 安全檢查車輛數量
  - 逐一移除 DOM 元素
  - 清空 activeCars 數組
  - Quasar 通知反饋
  - 詳細控制台日誌
  - 發送自定義事件
  - 錯誤處理機制

---

## 🔧 技術實現細節

### 1. 面板收合機制

```javascript
// 狀態控制
const isPanelCollapsed = ref(false)

// 切換函數
const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value
}
```

```html
<!-- 動態 class 綁定 -->
<div :class="['intersection-control-panel', { collapsed: isPanelCollapsed }]">
```

```css
/* CSS 過渡 */
.panel-content {
  transition: all 0.3s ease;
}

.intersection-control-panel.collapsed .panel-content {
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
}
```

### 2. 清空車輛流程

```
開始
  ↓
檢查車輛數量
  ↓
數量 = 0? ──是→ 顯示提示 → 結束
  ↓ 否
複製車輛列表
  ↓
清空 activeCars
  ↓
遍歷移除 DOM
  ↓
顯示成功通知
  ↓
發送事件
  ↓
結束
```

### 3. 事件系統

清空車輛會發送自定義事件：

```javascript
window.dispatchEvent(
  new CustomEvent('allVehiclesCleared', {
    detail: {
      count: vehicleCount,
      timestamp: new Date().toISOString(),
    },
  }),
)
```

其他組件可以監聽此事件：

```javascript
window.addEventListener('allVehiclesCleared', (event) => {
  console.log(`清空了 ${event.detail.count} 輛車輛`)
})
```

---

## 🎯 視覺效果

### 按鈕佈局（展開狀態）

```
┌───────────────────┐
│   路口設置        │ ← 標題
├───────────────────┤
│       👁️         │
│   顯示路徑        │ ← 紫色/灰色
├───────────────────┤
│       ✏️         │
│   編輯路徑        │ ← 藍色/橙色
├───────────────────┤
│       📋         │
│   導出路徑        │ ← 綠色（編輯模式）
├───────────────────┤
│       🧹         │
│   清空車輛        │ ← 紅色（新增）
└───────────────────┘
        ◄  ← 收合按鈕
```

### 動畫效果

1. **展開 → 收合**
   - 面板向左滑出（translateX(-100%)）
   - 不透明度降為 0
   - 收合按鈕移至左側邊緣
   - 箭頭由 ◄ 變為 ►

2. **收合 → 展開**
   - 面板從左側滑入（translateX(0)）
   - 不透明度恢復 1
   - 收合按鈕移回面板右側
   - 箭頭由 ► 變為 ◄

3. **按鈕懸停**
   - 向上浮動 2px
   - 陰影增強
   - 圖標放大 1.2 倍（收合按鈕）

---

## 🚀 構建狀態

```
✅ Build succeeded
✅ Total JS: 673.67 KB (+1.38 KB)
✅ Total CSS: 226.49 KB (+1.36 KB)
✅ No errors
✅ No warnings
```

---

## 📚 修改的文件

1. **IndexPage.vue** (HTML 部分)
   - 重命名 `path-control-panel` → `intersection-control-panel`
   - 添加收合/展開按鈕
   - 新增清空車輛按鈕
   - 調整面板結構

2. **IndexPage.vue** (JavaScript 部分)
   - 新增 `isPanelCollapsed` 狀態
   - 新增 `togglePanel()` 函數
   - 新增 `clearAllVehicles()` 函數

3. **IndexPage.vue** (CSS 部分)
   - 完全重寫面板樣式
   - 添加收合動畫
   - 新增收合按鈕樣式
   - 新增清空按鈕樣式
   - 位置從右側改為左側

---

## 🎊 總結

### 主要成就

1. **✅ 可收合面板**：添加收合/展開功能，節省螢幕空間
2. **✅ 清空車輛**：一鍵清空所有車輛，方便重新開始模擬
3. **✅ 位置調整**：移至左側，更符合主控制面板的定位
4. **✅ 視覺改進**：統一的設計語言，紅色警示清空按鈕
5. **✅ 功能完整**：保持所有原有功能，無破壞性變更

### 用戶體驗提升

- 🎯 **更靈活**：可收合設計，不佔用寶貴的螢幕空間
- 🎯 **更直觀**：左側主控制面板，右側資訊面板，佈局合理
- 🎯 **更強大**：清空車輛功能，輕鬆重置模擬狀態
- 🎯 **更美觀**：平滑動畫，統一配色，專業外觀

### 技術亮點

- 🔧 **Vue 3 響應式**：ref + 動態 class 綁定
- 🔧 **CSS 動畫**：transition 實現平滑過渡
- 🔧 **錯誤處理**：try-catch + 詳細日誌
- 🔧 **用戶反饋**：Quasar Notify + 自定義事件
- 🔧 **安全設計**：複製數組避免遍歷衝突

---

## 📖 使用說明

### 展開/收合面板

1. 點擊右側的 **►** 或 **◄** 按鈕
2. 面板會平滑滑入/滑出
3. 收合後只顯示按鈕，節省空間

### 清空車輛

1. 點擊 **🧹 清空車輛** 按鈕
2. 系統會移除所有活躍車輛
3. 顯示成功通知（包含清空數量）
4. 如果沒有車輛，會提示「目前沒有車輛」

### 快捷鍵（未來可擴展）

- 可考慮添加 `Ctrl+H` 切換面板
- 可考慮添加 `Ctrl+Shift+C` 清空車輛

---

**路口設置面板重構完成！可收合 + 清空車輛功能已完美實現！** 🎉
