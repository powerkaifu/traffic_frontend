#!/usr/bin/env python3
# -*- coding: utf-8 -*-

file_path = r'd:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\AutoTrafficGenerator.js'

# 讀取文件
with open(file_path, 'r', encoding = 'utf-8') as f:
  lines = f.readlines()

# 找到要移除的兩個方法
# 方法 1: getGenerationIntervalForCurrentTime()
# 方法 2: getMaxVehiclesForCurrentTime()

new_lines = []
skip_mode = False
brace_count = 0
i = 0

while i < len(lines):
  line = lines[i]

  # 檢查是否進入要移除的方法
  if 'getGenerationIntervalForCurrentTime()' in line or 'getMaxVehiclesForCurrentTime()' in line:
    # 記錄開始
    skip_mode = True
    brace_count = 0
    # 往前找到註釋行
    j = i - 1
    while j >= 0 and lines[j].strip().startswith('//'):
      j -= 1
    # 從註釋行開始跳過
    start_skip = j + 1
    i = i  # 先找到方法結束

    # 計算該方法的結束位置
    while i < len(lines):
      l = lines[i]
      brace_count += l.count('{') - l.count('}')
      if brace_count == 0 and '{' in l:
        # 找到了方法的結束
        i += 1
        break
      i += 1

    # 跳過從 start_skip 到 i 的所有行（直到下一個方法開始）
    # 但要保留空行和下一個方法的註釋
    while start_skip < i:
      new_lines.pop() if new_lines and new_lines[-1].strip() == '' else None
      start_skip += 1
    i -= 1

  i += 1

# 簡化方法：直接刪除特定行範圍
new_lines = []
skip = False
for i, line in enumerate(lines):
  # 跳過兩個方法所在的行
  if 'getGenerationIntervalForCurrentTime' in line:
    skip = True
    # 往前查找註釋
    j = i - 1
    while j >= 0 and (lines[j].strip().startswith('//') or lines[j].strip() == ''):
      new_lines.pop()
      j -= 1

  if 'getMaxVehiclesForCurrentTime' in line:
    skip = True

  if skip:
    # 找到方法的結束（閉合括號）
    brace_count = line.count('{') - line.count('}')
    if brace_count < 0:
      skip = False
  else:
    new_lines.append(line)

# 寫回文件
with open(file_path, 'w', encoding = 'utf-8') as f:
  f.writelines(new_lines)

print(f"✅ 已成功移除未使用的方法")
print(f"   - getGenerationIntervalForCurrentTime()")
print(f"   - getMaxVehiclesForCurrentTime()")
print(f"文件行數: {len(lines)} → {len(new_lines)}")
