# P2 修復：移除 Vehicle.js 中的 rebuildSpatialGrid 調用
$filePath = "src/classes/Vehicle.js"
$content = Get-Content -Path $filePath -Raw

# 查找並替換
$oldPattern = @"
            onUpdate: () => {
              // 第1階段優化：每幀重建 SpatialHashGrid（用於優化碰撞檢測）
              // 只在有活躍車輛時執行
              if (allVehicles.length > 0) {
                CollisionController.rebuildSpatialGrid(allVehicles)
              }

              // 🚨 防守：車輛已銷毀時，不執行更新邏輯（車輛可能已被移除，但GSAP動畫仍繼續執行）
              if (!this.element) {
                return
              }

              // 🚨 移動中持續更新時間
              this.lastMovementTime = Date.now()
"@

$newPattern = @"
            onUpdate: () => {
              // ✅ P2 修復：移除每幀重建 SpatialHashGrid 調用
              // 原因：100輛車 × 每輛車onUpdate = 每幀100次rebuildSpatialGrid → 卡頓
              // 解決方案：改為在 IndexPage mainSimulationLoop 頂部每幀執行 1 次

              // 🚨 防守：車輛已銷毀時，不執行更新邏輯（車輛可能已被移除，但GSAP動畫仍繼續執行）
              if (!this.element) {
                return
              }

              // 🚨 移動中持續更新時間
              this.lastMovementTime = Date.now()
"@

$content = $content.Replace($oldPattern, $newPattern)
Set-Content -Path $filePath -Value $content -Encoding UTF8

Write-Host "✅ P2 修復完成！已移除 rebuildSpatialGrid 調用"
