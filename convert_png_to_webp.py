#!/usr/bin/env python3
"""
批量轉換 PNG 為 WebP 的工具
使用 Pillow 庫進行轉換
"""

import os
import sys
from pathlib import Path

try:
  from PIL import Image
except ImportError:
  print("❌ 未安裝 Pillow 庫")
  print("安裝命令: pip install Pillow")
  sys.exit(1)


def convert_png_to_webp(png_path, webp_path, quality = 80):
  """
    轉換單個 PNG 為 WebP

    Args:
        png_path: PNG 檔案路徑
        webp_path: 輸出 WebP 路徑
        quality: WebP 品質 (1-100，預設 80)
    """
  try:
    # 打開 PNG 圖片
    img = Image.open(png_path)

    # 如果有透明度，保留
    if img.mode in ( 'RGBA', 'LA', 'P'):
      # 保留透明度
      img.save(webp_path, 'WEBP', quality = quality, method = 6)
    else:
      img.save(webp_path, 'WEBP', quality = quality, method = 6)

    # 獲取檔案大小
    png_size = os.path.getsize(png_path) / 1024  # KB
    webp_size = os.path.getsize(webp_path) / 1024  # KB
    reduction = (1 - webp_size / png_size) * 100

    print(f"✅ {os.path.basename(png_path)}")
    print(f"   PNG: {png_size:.1f} KB → WebP: {webp_size:.1f} KB")
    print(f"   縮減: {reduction:.1f}%")

    return True
  except Exception as e:
    print(f"❌ 轉換失敗: {png_path}")
    print(f"   錯誤: {e}")
    return False


def main():
  # 定義路徑
  car_dir = r"F:\01.Project\traffic\traffic_project\frontend\traffic\public\images\car"

  # 檢查目錄是否存在
  if not os.path.isdir(car_dir):
    print(f"❌ 目錄不存在: {car_dir}")
    sys.exit(1)

  # 找出所有 PNG 檔案
  png_files = list(Path(car_dir).glob("*.png"))

  if not png_files:
    print("❌ 沒有找到 PNG 檔案")
    sys.exit(1)

  print(f"🚗 找到 {len(png_files)} 個 PNG 檔案")
  print("=" * 60)

  success_count = 0
  total_png_size = 0
  total_webp_size = 0

  # 轉換每個 PNG
  for png_path in sorted(png_files):
    webp_path = png_path.with_suffix('.webp')

    total_png_size += os.path.getsize(png_path)

    if convert_png_to_webp(str(png_path), str(webp_path), quality = 85):
      success_count += 1
      total_webp_size += os.path.getsize(webp_path)
    print()

  print("=" * 60)
  print(f"\n📊 轉換完成")
  print(f"✅ 成功: {success_count}/{len(png_files)}")

  if success_count > 0:
    total_png_kb = total_png_size / 1024
    total_webp_kb = total_webp_size / 1024
    total_reduction = (1 - total_webp_kb / total_png_kb) * 100

    print(f"📦 檔案大小")
    print(f"   PNG 總計: {total_png_kb:.1f} KB")
    print(f"   WebP 總計: {total_webp_kb:.1f} KB")
    print(f"   總縮減: {total_reduction:.1f}%")
    print(f"\n✨ WebP 檔案已生成在同一目錄中")


if __name__ == '__main__':
  main()
