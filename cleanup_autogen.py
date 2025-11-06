#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理 AutoTrafficGenerator.js 中的未使用方法和有問題的字符
"""

import os
import re

file_path = r'd:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\AutoTrafficGenerator.js'

# 讀取文件
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

output_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # 跳過有問題的注釋行（包含未知字符前綴）
    if re.match(r'\s*//\s*[^\w\s]', line) or '🚗' in line and '新增' in line and i in [204, 228]:
        print(f"Skipping corrupted comment at line {i+1}: {repr(line[:50])}")
        i += 1
        continue
    
    # 跳過 getGenerationIntervalForCurrentTime 方法（及其注釋）
    if 'getGenerationIntervalForCurrentTime' in line:
        # 往回跳到方法的開始（注釋行）
        start_idx = i
        while start_idx > 0 and lines[start_idx - 1].strip().startswith('//'):
            start_idx -= 1
        # 往前跳過所有行直到方法結束
        while i < len(lines) and not (lines[i].strip() == '}' and (i + 1 >= len(lines) or not lines[i+1].strip().startswith('getMax'))):
            i += 1
        if i < len(lines) and lines[i].strip() == '}':
            i += 1  # 跳過末尾的 }
        print(f"Removed getGenerationIntervalForCurrentTime (lines {start_idx+1}-{i})")
        continue
    
    # 跳過 getMaxVehiclesForCurrentTime 方法（及其注釋）
    if 'getMaxVehiclesForCurrentTime' in line:
        # 往回跳到方法的開始（注釋行）
        start_idx = i
        while start_idx > 0 and lines[start_idx - 1].strip().startswith('//'):
            start_idx -= 1
        # 往前跳過所有行直到方法結束
        while i < len(lines) and not (lines[i].strip() == '}' and (i + 1 >= len(lines) or not lines[i+1].strip().startswith('_stop'))):
            i += 1
        if i < len(lines) and lines[i].strip() == '}':
            i += 1  # 跳過末尾的 }
        print(f"Removed getMaxVehiclesForCurrentTime (lines {start_idx+1}-{i})")
        continue
    
    output_lines.append(line)
    i += 1

# 寫入修改後的內容
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print(f"\n✅ 清理完成！")
print(f"原始行數: {len(lines)}")
print(f"新行數: {len(output_lines)}")
print(f"移除行數: {len(lines) - len(output_lines)}")
