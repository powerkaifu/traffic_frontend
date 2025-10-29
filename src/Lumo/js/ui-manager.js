// ui-manager.js
// 負責管理所有使用者介面 (UI) 元素的互動，包括懸停選單和對話視窗。

/**
 * 初始化 UI 元素的事件監聽與互動邏輯。
 * @param {PIXI.live2d.Live2DModel} model - Live2D 模型物件，用於獲取邊界。
 * @param {PIXI.Application} app - PIXI 應用程式實例，用於獲取舞台事件。
 */
export function setupUI(model, app) {
    // --- 獲取 HTML 元素的引用 ---
    const actionMenu = document.getElementById('action-menu');       // 懸停時出現的功能選單
    const dialogueBox = document.getElementById('dialogue-box');      // 對話視窗容器
    const dialogueIcon = document.getElementById('icon-dialogue');    // 功能選單中的對話視窗圖示
    const closeButton = document.getElementById('close-button');      // 對話視窗右上角的關閉按鈕
    const dialogueTextElement = document.getElementById('dialogue-text'); // 對話視窗中顯示文字的 <p> 元素
    
    // --- 懸停選單顯示/隱藏邏輯 ---
    let menuHideTimer = null; // 用於延遲隱藏選單的計時器
    let isHovering = false;   // 標記滑鼠目前是否懸停在模型或選單上

    /** 顯示功能選單 */
    const showMenu = () => { 
        clearTimeout(menuHideTimer); // 清除可能存在的隱藏計時器
        actionMenu.classList.add('visible'); // 為選單添加 'visible' class (CSS 控制顯示動畫)
    };

    /** 延遲隱藏功能選單 */
    const hideMenu = () => { 
        // **可調整**: 300 代表滑鼠移開 300 毫秒後才隱藏，提供緩衝時間
        menuHideTimer = setTimeout(() => { 
            actionMenu.classList.remove('visible'); // 移除 'visible' class (CSS 控制隱藏動畫)
        }, 300); 
    };
    
    // --- 滑鼠懸停偵測 ---
    app.stage.interactive = true; // 確保 PIXI 舞台可以接收滑鼠事件
    // 監聽 PIXI 舞台上的滑鼠移動事件
    app.stage.on('pointermove', (event) => {
        const pos = event.data.global; // 獲取滑鼠在 Canvas 上的座標
        // 檢查模型是否存在及其邊界，然後判斷滑鼠是否在其範圍內
        const modelBounds = model?.getBounds(false); // 使用 false 獲取矩形邊界，較穩定
        if (modelBounds && modelBounds.contains(pos.x, pos.y)) { 
            // 如果滑鼠進入模型範圍
            if (!isHovering) { // 且之前不在範圍內
                isHovering = true; // 更新狀態
                showMenu();       // 顯示選單
            }
        } else {
            // 如果滑鼠離開模型範圍
            if (isHovering) { // 且之前在範圍內
                isHovering = false; // 更新狀態
                hideMenu();       // 延遲隱藏選單
            }
        }
    });
    // 監聽滑鼠移出整個網頁視窗的事件
    document.addEventListener('mouseleave', () => {
        if (isHovering) { // 如果移出視窗時，滑鼠剛好在模型上
            isHovering = false; // 更新狀態
            hideMenu();       // 延遲隱藏選單
        }
    });

    // 為了讓使用者能順利將滑鼠從模型移到選單上，選單本身也要能觸發 showMenu (取消隱藏)
    actionMenu.addEventListener('mouseover', showMenu);
    actionMenu.addEventListener('mouseout', hideMenu); // 移出選單時，同樣延遲隱藏

    // --- 對話視窗邏輯 ---
    // **可調整**: 對話視窗中輪播的文字內容
    const dialogueLines = [ 
        "歡迎來到我們的網站。", 
        "這是一個展示 Live2D 技術的互動專案。", 
        "你可以用滑鼠與我互動，我的視線會跟隨你。", 
        "接下來，我們將會增加更多有趣的功能。", 
        "請期待我們的下一次更新！" 
    ]; 
    let currentLineIndex = 0; // 目前顯示到第幾句話
    let dialogueInterval = null; // 用於自動輪播文字的計時器
    // **可調整**: 當視窗寬度小於此值 (像素) 時，自動隱藏對話框
    const MIN_WINDOW_WIDTH_FOR_DIALOGUE = 600; 

    /** 打開對話視窗的函式 */
    function openDialogue() {
        clearTimeout(menuHideTimer); // 確保點擊時選單不會消失
        dialogueBox.classList.add('visible');   // 顯示對話框 (CSS 控制動畫)
        dialogueIcon.classList.add('active'); // 將 Icon 設為啟用狀態 (變色)
        dialogueTextElement.innerText = dialogueLines[currentLineIndex]; // 立即顯示當前句子
        
        // 重新計算並設定對話框位置，確保位置正確
        updateDialogueLayout(); 
        
        // 清除可能存在的舊計時器，並啟動新的文字輪播計時器
        if (dialogueInterval) clearInterval(dialogueInterval); 
        // **可調整**: 5000 代表每 5 秒切換一次文字
        dialogueInterval = setInterval(() => {
            currentLineIndex = (currentLineIndex + 1) % dialogueLines.length; // 循環索引
            dialogueTextElement.innerText = dialogueLines[currentLineIndex]; // 更新文字
        }, 5000);
    }

    /** 關閉對話視窗的函式 */
    function closeDialogue() {
        dialogueBox.classList.remove('visible'); // 隱藏對話框 (CSS 控制動畫)
        dialogueIcon.classList.remove('active'); // 將 Icon 恢復預設狀態 (變回藍色)
        clearInterval(dialogueInterval); // 清除文字輪播計時器
        dialogueInterval = null;          // 重置計時器變數
    }

    // --- 事件綁定：點擊 Icon 打開/關閉對話視窗 ---
    dialogueIcon.addEventListener('click', () => {
        // 檢查對話框目前是否可見
        if (dialogueBox.classList.contains('visible')) {
            closeDialogue(); // 如果可見，則關閉
        } else {
            openDialogue(); // 如果不可見，則開啟
        }
    });
    
    // --- 事件綁定：點擊 X 按鈕關閉對話視窗 ---
    closeButton.addEventListener('click', closeDialogue); 

    // --- 對話框的響應式佈局 (位置計算 與 寬度過窄時隱藏) ---
    /**
     * 更新對話框的位置和可見性。
     * 會在初始化、視窗大小改變、打開對話框時被呼叫。
     */
    function updateDialogueLayout() {
        // console.log("Updating dialogue layout..."); // (除錯用 Log 已註解)
        const modelBounds = model.getBounds(false); // 獲取模型當前的邊界框

        // 檢查視窗寬度是否小於閾值
        if (window.innerWidth < MIN_WINDOW_WIDTH_FOR_DIALOGUE) {
            // 如果太窄，強制隱藏對話框
            dialogueBox.style.display = 'none'; 
             // 如果對話框剛好是打開狀態，也要執行關閉邏輯以清理狀態
             if (dialogueBox.classList.contains('visible')) {
                 closeDialogue(); 
                 // 確保 visible 和 active class 也被移除 (雖然 closeDialogue 內部已處理)
                 dialogueBox.classList.remove('visible'); 
                 dialogueIcon.classList.remove('active'); 
             }
        } else {
            // 如果視窗寬度足夠，確保對話框是可顯示的 (設回 block)
            dialogueBox.style.display = 'block'; 
            const margin = 20; // 與 live2d-manager.js 中模型邊距一致
            // 檢查模型邊界是否已正確計算
            if (modelBounds && modelBounds.width > 0 && modelBounds.height > 0) { 
                // **可調整**: 對話框相對於模型的位置計算方式
                // 目前是放在模型右側 (X = 模型右邊界 + 20px)，底部與模型底部對齊 (Bottom = 固定邊距)
                dialogueBox.style.left = (modelBounds.x + modelBounds.width + 20) + 'px'; 
                dialogueBox.style.bottom = margin + 'px'; 
                 // console.log(`Dialogue position calculated: left=${dialogueBox.style.left}, bottom=${dialogueBox.style.bottom}`); // (除錯用 Log 已註解)
            } else {
                 // 如果模型邊界尚未就緒 (例如初始化早期)，暫時隱藏對話框以避免定位錯誤
                 // console.warn("Model bounds not ready for dialogue layout yet."); // (除錯用 Log 已註解)
                 dialogueBox.style.display = 'none'; 
            }
        }
    }
    
    // --- 觸發初始佈局計算與事件監聽 ---
    // 稍微延遲執行第一次佈局計算，確保模型已完成初始定位 (由 live2d-manager.js 處理)
    setTimeout(updateDialogueLayout, 150); 
    // 監聽視窗大小改變事件，以便即時更新對話框的顯隱和位置
    window.addEventListener('resize', updateDialogueLayout); 

    console.log("UI Manager: 互動功能已啟用。");

} // setupUI 函式結束