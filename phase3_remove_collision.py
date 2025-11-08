#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 3: 從 Vehicle.js 移除碰撞檢測邏輯
將所有碰撞檢測從每幀 60Hz 遷移至 IndexPage.vue 每 50ms 執行一次
"""

import re
import os

filepath = 'src/classes/Vehicle.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
    original_len = len(content)

# 替換策略：找到 'const currentLightStateForGreen' 到 'this.checkStopLineAndRespond' 之間的所有代碼
# 保留框架註釋，刪除內部的碰撞檢測邏輯

pattern = r'const currentLightStateForGreen = trafficController\.getCurrentLightState\(this\.direction\).*?(?=\s+// 停止線檢查和紅綠燈控制流程\s+this\.checkStopLineAndRespond)'

replacement = '''// ═══════════════════════════════════════════════════════════════════════
              // 【Phase 3 - 碰撞檢測遷移】✅ 碰撞邏輯已移至 IndexPage.vue mainSimulationLoop
              // 此處移除所有碰撞檢測邏輯（每幀執行 60Hz），改由 IndexPage.vue 50ms 執行一次
              // 預期效果：減少 67% 的碰撞檢測調用（從 6000/秒 → 2000/秒）
              // ═══════════════════════════════════════════════════════════════════════

              '''

try:
    content_new = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if len(content_new) < len(content):
        deleted_bytes = len(content) - len(content_new)
        print(f'✅ Phase 3 碰撞邏輯已移除！')
        print(f'   刪除字節數: {deleted_bytes} ({deleted_bytes/1024:.1f} KB)')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content_new)
        print(f'✅ 檔案已保存')
    else:
        print('❌ 未找到要替換的模式，檔案未改變')
        print('嘗試備用模式...')
        
        # 備用模式：逐行分析
        lines = content.split('\n')
        start_idx = None
        end_idx = None
        
        for i, line in enumerate(lines):
            if 'const currentLightStateForGreen' in line:
                start_idx = i
            if 'this.checkStopLineAndRespond(trafficController, allVehicles)' in line and start_idx is not None:
                end_idx = i
                break
        
        if start_idx and end_idx:
            print(f'找到碰撞邏輯: 行 {start_idx+1} 到 {end_idx}')
            print(f'將刪除 {end_idx - start_idx} 行')
        
except Exception as e:
    print(f'❌ 錯誤: {e}')
