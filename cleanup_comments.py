#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

file_path = r"src\classes\Vehicle.js"

try:
  with open(file_path, 'r', encoding = 'utf-8') as f:
    content = f.read()

  # 移除舊的冗余註釋
  old_comment = """// 【優化】已通過停止線的車輛無需碰撞檢測和跟隨
              // 在綠燈通行時，車子只需保持勻速前進，跳過所有碰撞邏輯"""

  # 嘗試用更簡單的方式查找和替換
  if "【優化】已通過停止線" in content:
    print("✅ 找到舊註釋")
    lines = content.split('\n')
    new_lines = []
    skip_next = False
    for i, line in enumerate(lines):
      if '【優化】已通過停止線' in line or '在綠燈通行時，車子只需保持勻速前進' in line:
        if skip_next:
          skip_next = False
          continue
        else:
          skip_next = True
          continue
      new_lines.append(line)

    new_content = '\n'.join(new_lines)

    with open(file_path, 'w', encoding = 'utf-8') as f:
      f.write(new_content)

    print("✅ 清理完成！")
  else:
    print("✅ 不需要清理（舊註釋已不存在）")

except Exception as e:
  print(f"❌ 錯誤: {e}")
