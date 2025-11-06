#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
from pathlib import Path
from collections import defaultdict


def extract_methods(file_content):
  """提取文件中的所有方法定義"""
  # 匹配方法定義: methodName() { 或 async methodName() {
  pattern = r'^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{|\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{'
  methods = set()

  for line in file_content.split('\n'):
    match = re.search(pattern, line)
    if match:
      method_name = match.group(1) or match.group(2)
      if method_name and method_name not in [ 'if', 'for', 'while', 'switch', 'catch']:
        methods.add(method_name)

  return methods


def check_method_usage(file_content, method_name, file_path):
  """檢查方法在文件中是否被使用"""
  # 排除方法定義本身
  lines = file_content.split('\n')
  usage_count = 0
  usage_lines = []

  for i, line in enumerate(lines, 1):
    # 跳過定義行
    if re.search(rf'^\s*(?:async\s+)?{re.escape(method_name)}\s*\([^)]*\)\s*\{{', line):
      continue

    # 找方法調用
    if re.search(rf'\.{re.escape(method_name)}\s*\(|this\.{re.escape(method_name)}\s*\(', line):
      usage_count += 1
      usage_lines.append(( i, line.strip() ))

  return usage_count, usage_lines


def scan_directory_for_methods(directory):
  """掃描目錄中的所有JS文件"""
  results = {}

  for js_file in Path(directory).glob('*.js'):
    if js_file.name.endswith('.backup') or js_file.name == 'debug_console.js':
      continue

    with open(js_file, 'r', encoding = 'utf-8') as f:
      content = f.read()

    methods = extract_methods(content)
    unused_methods = []

    for method in methods:
      usage_count, usage_lines = check_method_usage(content, method, str(js_file))
      if usage_count == 0:
        # 過濾掉構造函數和某些特殊方法
        if method not in [ 'constructor', 'static']:
          unused_methods.append({ 'name': method, 'file': js_file.name})

    if unused_methods:
      results[js_file.name] = unused_methods

  return results


# 掃描主要類文件
classes_dir = r'd:\01.Project\traffic\traffic_project\frontend\traffic\src\classes'
results = scan_directory_for_methods(classes_dir)

# 生成報告
report = "# 專案未使用方法掃描報告\n\n"
report += f"## 掃描時間\n掃描目錄: {classes_dir}\n\n"

total_unused = 0
for file_name, unused_methods in sorted(results.items()):
  if unused_methods:
    report += f"\n### {file_name}\n"
    report += f"發現 {len(unused_methods)} 個未使用方法:\n\n"

    for method in sorted(unused_methods, key = lambda x: x['name']):
      report += f"- `{method['name']}`\n"
      total_unused += 1

report += f"\n\n## 摘要\n總計發現 **{total_unused}** 個未使用方法\n"

print(report)

# 保存報告
report_file = r'd:\01.Project\traffic\traffic_project\frontend\traffic\PROJECT_UNUSED_METHODS_SCAN.md'
with open(report_file, 'w', encoding = 'utf-8') as f:
  f.write(report)

print(f"\n報告已保存到: {report_file}")
