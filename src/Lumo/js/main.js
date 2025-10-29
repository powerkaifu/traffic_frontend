// main.js
// 程式進入點，負責初始化 PIXI 應用、載入 Live2D 模型模組和 UI 模組。

// 從本地檔案引入 Live2D 管理模組 (負責模型本身)
import { setupLive2D } from './live2d-manager.js';
// 從本地檔案引入 UI 管理模組 (負責互動介面)
import { setupUI } from './ui-manager.js';

// 使用立即執行的非同步函式 (async IIFE) 來啟動整個應用
(async function () {
    // 1. 獲取 HTML 中用於繪製 Live2D 模型的 <canvas> 元素
    const canvas = document.getElementById('live2d-canvas');
    
    // 2. 建立 PIXI.js 應用程式實例
    //    - view: 指定在哪個 canvas 上繪圖
    //    - autoStart: 自動開始渲染迴圈
    //    - resizeTo: window 讓 PIXI 自動調整畫布大小以符合瀏覽器視窗
    //    - transparent: true 讓畫布背景透明，以便看到後方的 HTML 內容
    const app = new PIXI.Application({ view: canvas, autoStart: true, resizeTo: window, transparent: true });

    // 3. 呼叫 Live2D 管理模組的 setupLive2D 函式
    //    - 傳入 PIXI app 實例
    //    - 使用 await 等待模型非同步載入完成
    //    - setupLive2D 內部會處理模型載入、大小位置設定、滑鼠追蹤等
    const model = await setupLive2D(app);

    // 4. 呼叫 UI 管理模組的 setupUI 函式
    //    - 傳入已載入的模型物件 (model) 和 PIXI app 實例
    //    - setupUI 內部會處理懸停選單、對話視窗的顯示/隱藏、點擊事件、響應式佈局等
    setupUI(model, app); 

    // 5. 在瀏覽器主控台顯示一條訊息，表示初始化流程已順利完成
    console.log("主程式 (main.js): 所有模組初始化完成。");
})(); // 立即執行此函式