import re

# 讀取文件
with open('src/classes/Vehicle.js', 'r', encoding = 'utf-8') as f:
  content = f.read()

# 計數
initial_count = len(content)

# 移除 getDirectionEndPosition 方法
pattern1 = r'\n  // Helper Method: 根據方向獲取結束位置的輔助方法\n  getDirectionEndPosition\(\) \{\n    const currentPos = this\.getCurrentPosition\(\)\n\n    switch \(this\.direction\) \{\n      case \'east\':\n        return \{ x: 1400, y: currentPos\.y \}\n      case \'west\':\n        return \{ x: 0, y: currentPos\.y \}\n      case \'north\':\n        return \{ x: currentPos\.x, y: 0 \}\n      case \'south\':\n        return \{ x: currentPos\.x, y: 1000 \}\n      default:\n        return \{ x: 1400, y: currentPos\.y \}\n    \}\n  \}'
content = re.sub(pattern1, '', content)

print(f'After removing getDirectionEndPosition: {len(content)} characters (removed {initial_count - len(content)})')

# 移除 moveToWithTrafficControl 整個方法
# 從方法註解開始，到方法結尾 }
pattern2 = r'\n  // Command Pattern \+ Observer Pattern: 帶有交通燈控制的移動命令\n  moveToWithTrafficControl\([^)]+\) \{[\s\S]*?\n  \}'
content = re.sub(pattern2, '', content)

print(f'After removing moveToWithTrafficControl: {len(content)} characters (removed {initial_count - len(content)})')

# 寫回文件
with open('src/classes/Vehicle.js', 'w', encoding = 'utf-8') as f:
  f.write(content)

print(f'✅ Total removed: {initial_count - len(content)} characters')
print('✅ 成功移除兩個死代碼方法')
