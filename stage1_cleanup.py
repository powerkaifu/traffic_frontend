#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to remove dead code from Vehicle.js - Stage 1
"""


def remove_dead_code():
  file_path = r"d:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\Vehicle.js"

  with open(file_path, 'r', encoding = 'utf-8') as f:
    lines = f.readlines()

  print(f"Total lines: {len(lines)}")

  # Find and mark lines to remove
  lines_to_remove = set()

  # Find getDirectionEndPosition method (should be around line 785-803)
  for i, line in enumerate(lines):
    if "getDirectionEndPosition()" in line:
      print(f"Found getDirectionEndPosition at line {i+1}")
      # Remove from the comment line up to the closing brace
      j = i
      while j < len(lines) and "}" not in lines[j]:
        j += 1
      # Also remove the next line if it's empty
      if j + 1 < len(lines) and lines[j + 1].strip() == "":
        j += 1
      for k in range(i - 1, j + 1):  # Include comment line
        if k < len(lines):
          lines_to_remove.add(k)
      print(f"  Marked lines {i} to {j} for removal")
      break

  # Find moveToWithTrafficControl method (should be around line 1384)
  for i, line in enumerate(lines):
    if "moveToWithTrafficControl(targetX" in line:
      print(f"Found moveToWithTrafficControl at line {i+1}")
      # Find the start (comment line before)
      start = i
      while start > 0 and lines[start - 1].strip().startswith("//"):
        start -= 1

      # Find the closing brace
      j = i
      brace_count = 0
      found_brace = False
      while j < len(lines):
        for char in lines[j]:
          if char == '{':
            brace_count += 1
            found_brace = True
          elif char == '}':
            brace_count -= 1
            if found_brace and brace_count == 0:
              break
        if found_brace and brace_count == 0:
          break
        j += 1

      # Mark lines for removal
      for k in range(start, j + 1):
        lines_to_remove.add(k)

      # Also remove empty line after if present
      if j + 1 < len(lines) and lines[j + 1].strip() == "":
        lines_to_remove.add(j + 1)

      print(f"  Marked lines {start} to {j+1} for removal (comment + method + blank)")
      break

  # Create new content without marked lines
  new_lines = [ line for i, line in enumerate(lines) if i not in lines_to_remove ]

  # Write back
  with open(file_path, 'w', encoding = 'utf-8') as f:
    f.writelines(new_lines)

  removed_count = len(lines_to_remove)
  print(f"\n✅ Removed {removed_count} lines")
  print(f"   Original: {len(lines)} lines")
  print(f"   New: {len(new_lines)} lines")
  return True


if __name__ == "__main__":
  try:
    remove_dead_code()
    print("\n✅ Stage 1 complete!")
  except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
