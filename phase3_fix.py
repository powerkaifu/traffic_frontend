#!/usr/bin/env python
# -*- coding: utf-8 -*-
import re

# 讀取檔案
with open('src/classes/Vehicle.js', 'r', encoding = 'utf-8') as f:
  lines = f.readlines()

# 找到要刪除的區間
# 開始：if (this.hasPassedStopLine) {
# 結束：// 停止線檢查和紅綠燈控制流程

start_marker = "if (this.hasPassedStopLine) {"
end_marker = "// 停止線檢查和紅綠燈控制流程"

start_idx = None
end_idx = None

for i, line in enumerate(lines):
  if start_marker in line:
    start_idx = i
  if end_marker in line and start_idx is not None:
    end_idx = i
    break

if start_idx is not None and end_idx is not None:
  print(f"Found deletion range: lines {start_idx+1} to {end_idx}")
  print(f"Deleting {end_idx - start_idx} lines")

  # 保留開始行之前的代碼和結束行及其之後的代碼
  # 在刪除位置插入新的註釋
  new_lines = lines[: start_idx]

  # 添加新的註釋
  new_lines.append("              // ⚠️ 【效能優化 Phase 3】移除所有碰撞檢測邏輯\n")
  new_lines.append("              // 碰撞檢測已移至 IndexPage.vue mainSimulationLoop 的 50ms 定期檢查\n")
  new_lines.append("              // 這樣可以減少 67% 的碰撞檢測調用（從 60Hz → 20Hz）\n")
  new_lines.append("\n")

  # 添加結束行及其後的代碼
  new_lines.extend(lines[end_idx :])

  # 寫入檔案
  with open('src/classes/Vehicle.js', 'w', encoding = 'utf-8') as f:
    f.writelines(new_lines)

  print("✅ Successfully removed collision detection logic from onUpdate")
else:
  print(f"❌ Could not find markers. start_idx={start_idx}, end_idx={end_idx}")
