#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart script to remove moveToWithTrafficControl method
"""


def find_method_end(lines, start_idx):
  """Find the end of a method starting from start_idx"""
  brace_count = 0
  found_opening = False

  for i in range(start_idx, len(lines)):
    line = lines[i]
    for char in line:
      if char == '{':
        brace_count += 1
        found_opening = True
      elif char == '}':
        brace_count -= 1
        if found_opening and brace_count == 0:
          return i
  return -1


def remove_method():
  file_path = r"d:\01.Project\traffic\traffic_project\frontend\traffic\src\classes\Vehicle.js"

  with open(file_path, 'r', encoding = 'utf-8') as f:
    lines = f.readlines()

  print(f"Total lines: {len(lines)}")

  # Find moveToWithTrafficControl method
  method_start = -1
  for i, line in enumerate(lines):
    if "moveToWithTrafficControl(targetX, targetY, duration" in line:
      method_start = i
      # Back up to find comment line
      while method_start > 0 and not lines[method_start - 1].strip().startswith("//"):
        method_start -= 1
      method_start -= 1  # Include the comment line
      print(f"Found method at line {i+1}, comment starts at {method_start+1}")
      break

  if method_start == -1:
    print("Method not found!")
    return False

  # Find method end
  method_end = find_method_end(lines, method_start)
  if method_end == -1:
    print("Could not find method end!")
    return False

  print(f"Method spans lines {method_start+1} to {method_end+1}")

  # Remove empty line after method if present
  if method_end + 1 < len(lines) and lines[method_end + 1].strip() == "":
    method_end += 1

  # Create new content
  new_lines = lines[: method_start] + lines[method_end + 1 :]

  # Write back
  with open(file_path, 'w', encoding = 'utf-8') as f:
    f.writelines(new_lines)

  removed_lines = method_end - method_start + 1
  print(f"\n✅ Removed {removed_lines} lines")
  print(f"   Original: {len(lines)} lines")
  print(f"   New: {len(new_lines)} lines")

  return True


if __name__ == "__main__":
  try:
    if remove_method():
      print("\n✅ Successfully removed moveToWithTrafficControl!")
    else:
      print("\n❌ Failed!")
  except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
