#!/usr/bin/env python3
import sys

# 讀取文件
with open(r'd:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\AutoTrafficGenerator.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到並移除方法
new_lines = []
skip = False
i = 0

while i < len(lines):
    line = lines[i]
    
    # 如果是getGenerationIntervalForCurrentTime或getMaxVehiclesForCurrentTime，跳過直到找到}
    if 'getGenerationIntervalForCurrentTime' in line or 'getMaxVehiclesForCurrentTime' in line:
        # 往前查找並移除註釋行
        while new_lines and new_lines[-1].strip() == '':
            new_lines.pop()
        if new_lines and '//' in new_lines[-1]:
            new_lines.pop()
        
        # 跳過直到找到方法的結束括號
        while i < len(lines) and not (lines[i].strip() == '}'):
            i += 1
        i += 1  # 跳過結束括號
        continue
    
    new_lines.append(line)
    i += 1

# 寫回
with open(r'd:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\AutoTrafficGenerator.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ 已移除未使用方法")
