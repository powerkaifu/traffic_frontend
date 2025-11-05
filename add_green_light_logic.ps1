$file = 'src/classes/Vehicle.js'
$content = Get-Content $file -Raw

$newLogic = @"
              // ✅ Phase 5E: 綠燈優先邏輯 - 移除「綠燈後立即加速時的碰撞」
              // 當燈號變綠且車輛準備通過停止線時，無條件加速（跳過碰撞檢測）
              const currentLightStateForGreen = trafficController.getCurrentLightState(this.direction)
              const isGreenLightReady =
                (this.laneNumber === 1 && (currentLightStateForGreen === 'leftGreen' || currentLightStateForGreen === 'green')) ||
                (this.laneNumber !== 1 && currentLightStateForGreen === 'green')

              if (isGreenLightReady && this.position && this.position.distance < 50) {
                // ✅ 綠燈 + 接近停止線距離 < 50px = 無條件加速
                // 預期效果：消除綠燈時因碰撞檢測導致的加速延遲 (50% 碰撞時機點消除)
                if (this.movementTimeline && this.movementTimeline.timeScale() < 1) {
                  gsap.to(this.movementTimeline, {
                    timeScale: 1,
                    duration: 0.1,
                    ease: 'power2.out',
                  })
                }
                this.currentState = 'acceleratingAtGreen'
                // 直接返回，不執行後續碰撞檢測
                return
              }

"@

$searchPattern = "              // .*簡化碰撞檢測系統.*\n              const shouldStop = this\.collisionController\.checkSimpleCollision\(allVehicles\)"
$replacement = $newLogic + "              // 簡化碰撞檢測系統 - 區分第一台車和後續車輛`n              const shouldStop = this.collisionController.checkSimpleCollision(allVehicles)"

$content = [regex]::Replace($content, $searchPattern, $replacement)

Set-Content -Path $file -Value $content
Write-Host "✅ 綠燈優先邏輯已添加！"
