#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
移除 AutoTrafficGenerator.js 中的未使用方法
"""

import re
from pathlib import Path

file_path = Path(r'd:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\AutoTrafficGenerator.js')

# 讀取文件
with open(file_path, 'r', encoding = 'utf-8') as f:
  content = f.read()

# 模式：匹配兩個未使用方法的完整代碼塊
# 包括註釋、方法定義和結束括號
pattern = r'''  //.*?新增：根據當前時間段獲取生成間隔.*?\n  getGenerationIntervalForCurrentTime\(\) \{[\s\S]*?\n  \}[\s\S]*?getMaxVehiclesForCurrentTime\(\) \{[\s\S]*?\n  \}'''

# 進行替換
original_length = len(content)
content = re.sub(pattern, '', content)
new_length = len(content)

# 寫回文件
with open(file_path, 'w', encoding = 'utf-8') as f:
  f.write(content)

removed_lines = original_length - new_length
print(f"✅ 已成功移除未使用的方法")
print(f"   - getGenerationIntervalForCurrentTime() (~20 行)")
print(f"   - getMaxVehiclesForCurrentTime() (~3 行)")
print(f"   共移除約 {removed_lines} 個字符")
print(f"文件大小: {original_length} → {new_length} 字符")
