# Lumo - Live2D 互動助理專案 v1.0

## 專案簡介

這是一個使用 Live2D Cubism SDK for Web 和 PIXI.js 實現的互動式網頁助理 Lumo。它具備以下功能：

* 在網頁左下角顯示 Live2D 模型 Lumo。
* Lumo 的大小會根據視窗高度進行調整，但在寬度不足時會縮小以確保完整顯示，且有一個最大尺寸限制。
* Lumo 的視線會平滑地跟隨使用者的滑鼠指標移動。
* 當滑鼠懸停在 Lumo 模型上時，旁邊會彈出一個互動功能選單。
* 點擊選單中的圖示可以開啟/關閉一個對話視窗。
* 對話視窗會自動輪播預設的文字內容。
* 對話視窗的位置會根據 Lumo 的位置動態調整。
* 當瀏覽器視窗寬度過小時，對話視窗會自動隱藏。
* 專案檔案結構清晰，易於整合與維護。
* 所有依賴的函式庫已本地化，無需外部網路連線即可運行。

## 檔案結構說明

``` 
Lumo/
├── index.html              # 主 HTML 檔案，網頁骨架
├── css/
│   └── style.css           # 控制所有視覺樣式 (顏色、大小、位置、動畫)
├── js/
│   ├── main.js             # 程式主入口，負責初始化和載入其他模組
│   ├── live2d-manager.js   # 負責 Live2D 模型載入、佈局、視線追蹤
│   └── ui-manager.js       # 負責 UI 元素 (選單、對話框) 的互動邏輯
├── libs/                   # 存放本地化的第三方函式庫
│   ├── cubism4.js          # Live2D PIXI 插件
│   ├── live2dcubismcore.min.js # Live2D 核心庫
│   └── pixi.min.js         # PIXI.js 渲染引擎
└── Resources/
    └── robot/              # 存放 Lumo 模型的所有資源檔案
        ├── robot.model3.json # 模型設定檔 (包含 HitAreas, LookAt 等)
        ├── robot.moc3        # 模型核心檔案
        ├── motions/          # 模型動畫檔案
        └── robot.1024/       # 模型貼圖檔案 (資料夾名稱可能不同)
``` 


## 如何在本機運行

**重要：** 由於瀏覽器的安全限制 (CORS policy)，**不能**直接雙擊 `index.html` 檔案來運行。

請使用支援本地伺服器功能的工具來預覽：

1.  **推薦方式：VS Code Live Server 擴充功能**
    * 在 VS Code 中打開 `Lumo` 資料夾。
    * 在 `index.html` 檔案上按右鍵。
    * 選擇 "Open with Live Server"。
    * 它會在瀏覽器中打開一個 `http://127.0.0.1:xxxx/` 的網址。

2.  **其他方式**：
    * 使用 Python 的 `http.server` 模組。
    * 使用 Node.js 的 `http-server` 套件。
    * 或其他任何能夠建立本地 HTTP 伺服器的工具。

## 可調整參數說明

專案中的一些常用參數已在程式碼註解中標示 `**可調整**`，方便快速修改：

* **`css/style.css`**:
    * `#action-menu`: 選單的位置 (`bottom`, `left`)。
    * `.menu-icon`: Icon 的大小 (`width`, `height`)、預設顏色 (`background-color`, `border-color`, `box-shadow`)。
    * `.menu-icon.active`, `.menu-icon:hover`, `.menu-icon.active:hover`: Icon 在不同狀態下的顏色。
    * `#dialogue-box`: 對話視窗的固定寬高 (`width`, `height`)、背景顏色、邊框、發光效果、文字顏色、字體大小等。
    * `#close-button`: 關閉按鈕的大小、顏色。
* **`js/live2d-manager.js`**:
    * `modelPath`: 模型檔案的路徑。
    * `margin`: 模型與視窗邊緣的最小間距。
    * `maxScaleLimitBasedOnHeight`: 模型最大尺寸限制的計算因子 (目前是基於螢幕高度的 20%)。
    * `easingFactor`: 視線追蹤的平滑度 (建議 0.02 ~ 0.1)。
    * 滑鼠追蹤敏感度: `pointermove` 事件中計算 `targetParamX/Y` 的乘數 `60`。
* **`js/ui-manager.js`**:
    * `hideMenu` 函式中的 `300`: 滑鼠移開後選單延遲消失的時間 (毫秒)。
    * `dialogueLines`: 對話視窗中輪播的文字內容陣列。
    * `MIN_WINDOW_WIDTH_FOR_DIALOGUE`: 自動隱藏對話框的視窗寬度閾值 (像素)。
    * `openDialogue` 函式中 `setInterval` 的 `5000`: 文字輪播的間隔時間 (毫秒)。
    * `updateDialogueLayout` 函式中計算 `left` 的 `+ 20`: 對話框與模型右邊界的水平間距。

## 如何整合到現有網站

請參考我們之前討論過的「給組員的整合說明」，主要步驟包含：

1.  **複製資料夾**：將 `css/`, `js/`, `libs/`, `Resources/` 複製到目標專案。
2.  **複製 HTML 元素**：將 `index.html` 中的 `<canvas>`, `#action-menu`, `#dialogue-box` 元素複製到目標 HTML 的 `<body>` 中。
3.  **複製並修改 `<link>`**：將 `<link rel="stylesheet" href="./css/style.css">` 複製到目標 HTML 的 `<head>` 中，並**務必修正 `href` 路徑**。
4.  **複製並修改 `<script>`**：將 `index.html` 中引入 `libs/` 和 `js/main.js` 的 `<script>` 標籤複製到目標 HTML 的 `</body>` 之前，並**務必修正 `src` 路徑**。
5.  **處理樣式/圖層衝突**：如有必要，可透過添加父層容器並修改 CSS 選擇器，或調整 `z-index` 來解決。