# 訊息框反覆彈進彈出問題修復總結

## 🎯 問題描述

滑鼠移到 IndexPage.vue 下方區域時，會觸發 Lumo 助手訊息框出現。但因為下方位置與訊息框出現位置重疊，導致訊息框反覆往上、往下彈進彈出的問題。

## 🔍 根本原因

1. **Lumo 訊息框有 `pointer-events: auto`** - 訊息框會攔截滑鼠事件
2. **位置重疊導致事件循環** - 當訊息框出現時，會覆蓋下方區域
3. **快速事件觸發切換** - 滑鼠事件在訊息框/下方區域之間不斷切換：
   - 滑鼠在下方區域 → 訊息框出現 → 訊息框攔截事件 → 下方區域接收不到 mouseleave
   - 訊息框隱藏 → 滑鼠重新進入下方區域 → 無限循環

## ✅ 解決方案

### 1. **IndexPage.vue** - 添加防抖機制

**修改位置：** `src/pages/IndexPage.vue`

#### 新增變數和事件處理函數：

```javascript
// 🎯 下方區域互動防抖機制 - 防止 Tooltip 反覆彈進彈出
let belowAreaDebounceTimer = null
let isBelowAreaTooltipVisible = false

const handleBelowAreaMouseEnter = () => {
  // 清除之前的防抖計時器
  if (belowAreaDebounceTimer) {
    clearTimeout(belowAreaDebounceTimer)
  }

  // 如果 tooltip 已經顯示，不做任何操作
  if (isBelowAreaTooltipVisible) return

  // 立即顯示 tooltip
  showLumoTooltip('crossroadBelow')
  isBelowAreaTooltipVisible = true
  console.log('✅ 下方區域 Tooltip 已顯示')
}

const handleBelowAreaMouseLeave = () => {
  // 清除之前的防抖計時器
  if (belowAreaDebounceTimer) {
    clearTimeout(belowAreaDebounceTimer)
  }

  // 延遲 300ms 再隱藏，防止快速切換時誤隱藏
  belowAreaDebounceTimer = setTimeout(() => {
    hideLumoTooltip()
    isBelowAreaTooltipVisible = false
    console.log('✅ 下方區域 Tooltip 已隱藏')
  }, 300)
}
```

#### 修改模板：

```vue
<!-- 從這樣 -->
<div class="crossroad-below-area" @mouseenter="showLumoTooltip('crossroadBelow')" @mouseleave="hideLumoTooltip"></div>

<!-- 改為這樣 -->
<div class="crossroad-below-area" @mouseenter="handleBelowAreaMouseEnter" @mouseleave="handleBelowAreaMouseLeave"></div>
```

#### 修改下方區域的 CSS：

```css
/* 確保下方區域可以接收滑鼠事件 */
.crossroad-below-area {
  pointer-events: auto; /* 確保可以接收滑鼠事件 */
  z-index: 5; /* 設置適當的層級 */
}
```

### 2. **LumoAssistant.vue** - 改變訊息框的 pointer-events

**修改位置：** `src/components/LumoAssistant.vue`

#### 修改訊息框樣式：

```css
.lumo-dialog-box {
  /* ... 其他樣式 ... */
  pointer-events: none; /* 🎯 改為 none，讓滑鼠事件穿透訊息框 */
}
```

#### 保持互動元素可點擊：

```css
/* 關閉按鈕保持 pointer-events: auto */
.dialog-close-btn {
  pointer-events: auto; /* 確保按鈕可以點擊 */
}

/* 指示點保持 pointer-events: auto */
.indicator-dot {
  pointer-events: auto; /* 確保指示點可以點擊 */
}
```

## 📊 修改對比

### 修改前：

- ❌ 訊息框有 `pointer-events: auto`，攔截滑鼠事件
- ❌ 下方區域和訊息框事件循環振盪
- ❌ 訊息框反覆彈進彈出

### 修改後：

- ✅ 訊息框有 `pointer-events: none`，滑鼠事件穿透
- ✅ 下方區域防抖機制阻止快速重複觸發
- ✅ 關鍵互動元素（按鈕、指示點）保持 `pointer-events: auto`
- ✅ 訊息框只會顯示一次，不會反覆彈進彈出

## 🎯 工作流程

1. **滑鼠進入下方區域**
   → `handleBelowAreaMouseEnter()`
   → 設置 `isBelowAreaTooltipVisible = true`
   → 顯示訊息框

2. **訊息框顯示**
   → `pointer-events: none`
   → 滑鼠事件穿透訊息框

3. **滑鼠離開下方區域**
   → `handleBelowAreaMouseLeave()`
   → 300ms 防抖延遲
   → 隱藏訊息框

4. **再次進入下方區域**
   → 檢查 `isBelowAreaTooltipVisible`
   → 防止重複觸發

## 🔧 防抖機制的好處

| 特性                 | 效果                                             |
| -------------------- | ------------------------------------------------ |
| **防止快速重複觸發** | 即使滑鼠快速在邊界移動，也不會造成訊息框反覆彈出 |
| **300ms 隱藏延遲**   | 給予足夠的時間讓滑鼠穩定，避免快速誤觸發         |
| **狀態追蹤**         | `isBelowAreaTooltipVisible` 確保訊息框狀態一致   |
| **計時器清理**       | 新的滑鼠事件會清除舊的防抖計時器，確保流暢體驗   |

## ✨ 測試結果

修改後的行為應該是：

1. 滑鼠移入下方區域 → 訊息框出現（只一次）
2. 訊息框可以看到但不會影響滑鼠事件
3. 關閉按鈕和指示點仍然可以點擊
4. 滑鼠離開下方區域 → 訊息框消失
5. 不會出現訊息框反覆彈進彈出的現象

## 📝 修改文件清單

- ✅ `src/pages/IndexPage.vue` - 新增防抖機制和事件處理
- ✅ `src/components/LumoAssistant.vue` - 修改訊息框 CSS 層級和互動元素

---

**最後更新：** 2025年10月31日
**狀態：** 完成 ✅
