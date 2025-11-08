#!/usr/bin/env python3
import re

file_path = "src/classes/Vehicle.js"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找並修改
found = False
for i, line in enumerate(lines):
    if 'CollisionController.rebuildSpatialGrid(allVehicles)' in line:
        print(f"找到在第 {i+1} 行")
        # 找到前面的註釋行並修改
        if i >= 4:
            # 修改前面的註釋
            lines[i-3] = lines[i-3].replace(
                "// 第1階段優化",
                "// ✅ P2 修復"
            )
            lines[i-2] = "              // 原因：100輛車 × 每輛車onUpdate = 每幀100次rebuildSpatialGrid → 卡頓\n"
            lines[i-1] = "              // 解決方案：改為在 IndexPage mainSimulationLoop 頂部每幀執行 1 次\n"
        
        # 註解掉 rebuildSpatialGrid 調用及其周圍的 if 塊
        lines[i-1] = "              // if (allVehicles.length > 0) {\n"
        lines[i] = "              //   CollisionController.rebuildSpatialGrid(allVehicles)\n"
        lines[i+1] = "              // }\n"
        found = True
        print(f"✅ 已修改")
        break

if found:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("✅ P2 修復完成")
else:
    print("❌ 未找到 rebuildSpatialGrid 調用")
