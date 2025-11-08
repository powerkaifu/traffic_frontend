# Phase 3 碰撞檢測刪除腳本
$filePath = "src\classes\Vehicle.js"
$content = Get-Content $filePath -Raw

# 找到第一個碰撞檢測區塊的起點和終點
$startIdx = $content.IndexOf("// 【優化】已通過停止線的車輛無需碰撞檢測和跟隨")

if ($startIdx -eq -1) {
    Write-Host "❌ 未找到起始標記，嘗試替代搜尋..."
    # 可能有編碼問題，試試不同的方式
    $startIdx = $content.IndexOf("已通過停止線的車輛無需碰撞檢測")
}

if ($startIdx -ne -1) {
    # 找到終點
    $endIdx = $content.IndexOf("// 停止線檢查和紅綠燈控制流程", $startIdx)

    if ($endIdx -ne -1) {
        # 構造新內容
        $beforePart = $content.Substring(0, $startIdx)
        $afterPart = $content.Substring($endIdx)

        $replacement = "// ⚠️ 【效能優化 Phase 3】移除所有碰撞檢測邏輯" + [Environment]::NewLine +
                      "              // 原本的碰撞檢測邏輯已移至 IndexPage.vue mainSimulationLoop" + [Environment]::NewLine +
                      "              // 統一由 50ms 定期檢查執行，減少重複調用 (60Hz → 20Hz)" + [Environment]::NewLine +
                      "              " + [Environment]::NewLine +
                      "              "

        $newContent = $beforePart + $replacement + $afterPart
        $newContent | Set-Content $filePath -Encoding UTF8

        Write-Host "✅ Phase 3 刪除完成！"
        Write-Host "已移除 $(($endIdx - $startIdx) / 1024)KB 的碰撞檢測邏輯"
    } else {
        Write-Host "❌ 未找到結束標記"
    }
} else {
    Write-Host "❌ 未找到起始標記"
}
