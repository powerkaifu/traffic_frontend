#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

file_path = r"src\classes\Vehicle.js"

try:
  # 讀取文件
  with open(file_path, 'r', encoding = 'utf-8') as f:
    content = f.read()

  # 查找起始位置
  start_marker = "// 【優化】已通過停止線的車輛無需碰撞檢測和跟隨"
  end_marker = "// 停止線檢查和紅綠燈控制流程"

  start_idx = content.find(start_marker)

  if start_idx == -1:
    print("❌ 未找到起始標記")
    print("嘗試尋找替代標記...")
    # 嘗試簡短版本
    start_marker_alt = "已通過停止線的車輛無需碰撞檢測"
    start_idx = content.find(start_marker_alt)
    if start_idx == -1:
      print("❌ 仍未找到標記")
      exit(1)
    # 向回找註釋的開始
    start_idx = content.rfind("//", 0, start_idx)
    print(f"✅ 找到替代標記，位置: {start_idx}")

  # 查找結束位置
  end_idx = content.find(end_marker, start_idx)

  if end_idx == -1:
    print("❌ 未找到結束標記")
    exit(1)

  print(f"✅ 找到代碼段: 起始 {start_idx}, 結束 {end_idx}")
  print(f"   要刪除的代碼量: {(end_idx - start_idx) / 1024:.1f} KB")

  # 構造替換部分
  before_part = content[: start_idx]
  after_part = content[end_idx :]

  replacement = """// ⚠️ 【效能優化 Phase 3】移除所有碰撞檢測邏輯
              // 原本的碰撞檢測邏輯已移至 IndexPage.vue mainSimulationLoop
              // 統一由 50ms 定期檢查執行，減少重複調用 (60Hz → 20Hz)

              """

  new_content = before_part + replacement + after_part

  # 寫入文件
  with open(file_path, 'w', encoding = 'utf-8') as f:
    f.write(new_content)

  print("✅ Phase 3 刪除完成！")

except Exception as e:
  print(f"❌ 錯誤: {e}")
  import traceback
  traceback.print_exc()
