// live2d-manager.js
// 負責載入 Live2D 模型、處理模型的響應式佈局以及滑鼠視線追蹤。

/**
 * 初始化 Live2D 模型並設定相關互動。
 * @param {PIXI.Application} app - PIXI 應用程式實例。
 * @returns {Promise<PIXI.live2d.Live2DModel>} - 載入完成的模型物件。
 */
export async function setupLive2D(app) {
    // **可調整**: 模型檔案的路徑。請確保相對於 index.html 的路徑正確。
    const modelPath = './Resources/robot/robot.model3.json'; 
    
    // 非同步載入模型資源
    const model = await PIXI.live2d.Live2DModel.from(modelPath);
    // 將模型添加到 PIXI 的舞台上
    app.stage.addChild(model);

    /**
     * 更新模型的佈局 (大小和位置)。
     * 此函式會在初始化時執行一次，並在視窗大小改變時 (經過 Debounce 處理後) 執行。
     */
    function updateLayout() {
        const screenWidth = app.screen.width;    // PIXI 渲染器的實際寬度
        const screenHeight = app.screen.height;   // PIXI 渲染器的實際高度

        // --- 安全檢查 ---
        // 確保螢幕尺寸有效，且模型內部數據已載入，避免計算錯誤
        if (!screenWidth || !screenHeight || !model.internalModel || !model.internalModel.width || !model.internalModel.height || model.internalModel.height === 0 || model.internalModel.width === 0) {
            // console.warn("updateLayout called before dimensions or model are fully ready. Retrying soon...");
            requestAnimationFrame(updateLayout); // 如果尚未準備好，下一幀再試一次
            return;
        }

        // --- 計算模型的縮放比例 ---
        const margin = 20; // **可調整**: 模型與視窗邊緣的最小間距 (像素)
        const usableWidth = screenWidth - (2 * margin);  // 考慮左右邊距後的可使用寬度
        const usableHeight = screenHeight - (2 * margin); // 考慮上下邊距後的可使用高度

        // 1. 計算能讓模型完整放入可用寬度的縮放比例
        const scaleToFitWidth = usableWidth / model.internalModel.width;
        // 2. 計算能讓模型完整放入可用高度的縮放比例
        const scaleToFitHeight = usableHeight / model.internalModel.height;
        // 3. 取兩者中較小的值，確保模型不超出任何邊界
        let dynamicScale = Math.min(scaleToFitWidth, scaleToFitHeight);

        // 4. 設定一個最大尺寸限制 (基於螢幕高度的百分比)
        // **可調整**: 0.2 代表模型最大高度約為螢幕高度的 20%，可調整此比例
        const maxScaleLimitBasedOnHeight = (screenHeight / model.internalModel.height) * 0.2; 
        
        // 5. 最終縮放比例取「適應比例」和「最大限制」中的較小值
        let finalScale = Math.min(dynamicScale, maxScaleLimitBasedOnHeight);

        // 6. 再次檢查計算結果是否有效，防止 NaN 或 Infinity
        if (isNaN(finalScale) || !isFinite(finalScale) || finalScale <= 0) {
            finalScale = 0.1; // 如果計算出錯，給一個極小的安全預設值
            console.warn("Calculated finalScale was invalid, falling back to 0.1.");
        }

        // 應用計算出的縮放比例
        model.scale.set(finalScale); // 同時設定 X 和 Y 軸縮放

        // --- 設定模型的位置 ---
        model.anchor.set(0, 1); // 將模型的錨點（定位基準點）設定在左下角
        const finalX = margin; // X 座標 = 左邊距
        const finalY = screenHeight - margin; // Y 座標 = 螢幕高度 - 下邊距 (因為錨點在底部)
        model.position.set(finalX, finalY); // 應用計算出的位置
    }

    // --- 響應式佈局的觸發機制 ---
    updateLayout(); // 立即執行一次，設定初始佈局

    let resizeTimer; // 用於 Debounce 的計時器變數
    /**
     * Debounce 處理函式：延遲執行 updateLayout，避免 resize 事件觸發過於頻繁。
     */
    function debounceResize() {
        clearTimeout(resizeTimer); // 清除上一次的計時
        // **可調整**: 100 代表停止縮放 100 毫秒後才執行更新，可調整延遲時間
        resizeTimer = setTimeout(updateLayout, 100); 
    }
    // 監聽視窗的 resize 事件，透過 debounce 處理
    window.addEventListener('resize', debounceResize);
    
    // --- 平滑視線追蹤邏輯 ---
    let targetParamX = 0; // 滑鼠指向的目標 X 參數值 (-30 到 30)
    let targetParamY = 0; // 滑鼠指向的目標 Y 參數值 (-30 到 30)
    let currentParamX = 0; // 模型當前實際的 X 參數值
    let currentParamY = 0; // 模型當前實際的 Y 參數值
    // **可調整**: 緩動係數，數值越小，視線移動越平滑但越慢 (建議 0.02 ~ 0.1 之間)
    const easingFactor = 0.05; 

    // 監聽全域滑鼠移動事件，更新目標參數值
    window.addEventListener('pointermove', (e) => {
        // 將滑鼠的螢幕座標 (e.clientX, e.clientY) 轉換為模型的參數範圍 (-30 到 30)
        // **可調整**: 60 這個值決定了滑鼠移動對模型視線角度的影響幅度
        targetParamX = (e.clientX / window.innerWidth - 0.5) * 60;
        targetParamY = (e.clientY / window.innerHeight - 0.5) * -60; // Y 軸通常需要反轉
    });

    // 監聽滑鼠移出視窗事件，讓模型視線回到正前方
    document.addEventListener('mouseleave', () => {
        targetParamX = 0; // 目標設回 0
        targetParamY = 0; // 目標設回 0
    });
    
    // 使用 PIXI 的 ticker (動畫迴圈)，在每一幀更新模型的實際參數值
    app.ticker.add(() => {
        // 使用緩動公式，讓當前值逐漸靠近目標值
        currentParamX += (targetParamX - currentParamX) * easingFactor;
        currentParamY += (targetParamY - currentParamY) * easingFactor;
        
        // 將計算後的平滑值應用到模型的內部參數
        // **注意**: 'BODY_ANGLE_X' 和 'BODY_ANGLE_Y' 是模型參數的 ID，需與模型檔 (.model3.json) 中的設定一致
        if (model?.internalModel?.coreModel) { // 安全檢查，確保模型核心已載入
             model.internalModel.coreModel.setParameterValueById('BODY_ANGLE_X', currentParamX);
             model.internalModel.coreModel.setParameterValueById('BODY_ANGLE_Y', currentParamY);
        }
    });

    console.log("Live2D Manager: 模型載入成功！平滑追蹤已啟用。");
    // 回傳載入完成的模型物件，給 main.js 使用
    return model; 
}

// --- 檔案末尾保持乾淨 ---