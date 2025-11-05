#!/usr/bin/env python3
# -*- coding: utf-8 -*-

file_path = r'd:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\Vehicle.js'

with open(file_path, 'r', encoding = 'utf-8') as f:
  lines = f.readlines()

# 找到 'const shouldStop = this.collisionController.checkSimpleCollision(allVehicles)' 這一行
target_line_index = None
for i, line in enumerate(lines):
  if 'const shouldStop = this.collisionController.checkSimpleCollision(allVehicles)' in line:
    target_line_index = i
    print(f'✅ 找到目標行: {i+1}')
    break

if target_line_index is not None:
  # 在該行前插入綠燈優先邏輯
  new_code = '''              // ✅ Phase 5E: 綠燈優先邏輯 - 移除「綠燈後立即加速時的碰撞」
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

'''
  lines.insert(target_line_index, new_code)

  with open(file_path, 'w', encoding = 'utf-8') as f:
    f.writelines(lines)

  print(f'✅ 成功在第 {target_line_index+1} 行前插入綠燈優先邏輯')
else:
  print('❌ 未找到目標行')
