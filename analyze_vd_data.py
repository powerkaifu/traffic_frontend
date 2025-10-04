"""
分析VD（車輛偵測器）資料範圍
分析 VLRJM60、VLRJX00、VLRJX20 三個VD的資料特徵範圍
"""

import json
import os
from pathlib import Path
from collections import defaultdict
import statistics

def analyze_vd_folder(vd_folder_path, vd_name):
    """分析單個VD資料夾的所有檔案"""
    
    # 用於儲存統計資料
    stats = {
        'Speed': {'values': [], 'by_week': {}},
        'Occupancy': {'values': [], 'by_week': {}},
        'Volume_M': {'values': [], 'by_week': {}},  # 機車
        'Speed_M': {'values': [], 'by_week': {}},
        'Volume_S': {'values': [], 'by_week': {}},  # 小客車
        'Speed_S': {'values': [], 'by_week': {}},
        'Volume_L': {'values': [], 'by_week': {}},  # 大客車
        'Speed_L': {'values': [], 'by_week': {}},
        'Volume_T': {'values': [], 'by_week': {}},  # 聯結車
        'Speed_T': {'values': [], 'by_week': {}},
    }
    
    # 讀取所有JSON檔案
    json_files = sorted(Path(vd_folder_path).glob('*.json'))
    
    print(f"\n{'='*60}")
    print(f"分析 {vd_name} VD資料")
    print(f"{'='*60}")
    print(f"找到 {len(json_files)} 個週資料檔案")
    
    for json_file in json_files:
        week_name = json_file.stem
        print(f"處理: {week_name}")
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 處理每個時間戳的資料
            for timestamp, records in data.items():
                for record in records:
                    # 提取整體資料
                    speed = record.get('Speed', 0)
                    occupancy = record.get('Occupancy', 0)
                    
                    if speed > 0:
                        stats['Speed']['values'].append(speed)
                        stats['Speed']['by_week'].setdefault(week_name, []).append(speed)
                    
                    if occupancy > 0:
                        stats['Occupancy']['values'].append(occupancy)
                        stats['Occupancy']['by_week'].setdefault(week_name, []).append(occupancy)
                    
                    # 提取各車種資料
                    vehicles = record.get('Vehicles', {})
                    
                    for vehicle_type in ['M', 'S', 'L', 'T']:
                        vehicle_data = vehicles.get(vehicle_type, {})
                        volume = vehicle_data.get('Volume', 0)
                        speed = vehicle_data.get('Speed', 0)
                        
                        if volume > 0:
                            stats[f'Volume_{vehicle_type}']['values'].append(volume)
                            stats[f'Volume_{vehicle_type}']['by_week'].setdefault(week_name, []).append(volume)
                        
                        if speed > 0:
                            stats[f'Speed_{vehicle_type}']['values'].append(speed)
                            stats[f'Speed_{vehicle_type}']['by_week'].setdefault(week_name, []).append(speed)
        
        except Exception as e:
            print(f"  ⚠️ 錯誤: {e}")
            continue
    
    return stats

def print_statistics(stats, vd_name):
    """輸出統計結果"""
    
    print(f"\n{vd_name} 資料範圍統計")
    print("="*80)
    
    feature_names = {
        'Speed': '平均速度 (km/h)',
        'Occupancy': '佔有率 (%)',
        'Volume_M': '機車數量',
        'Speed_M': '機車速度 (km/h)',
        'Volume_S': '小客車數量',
        'Speed_S': '小客車速度 (km/h)',
        'Volume_L': '大客車數量',
        'Speed_L': '大客車速度 (km/h)',
        'Volume_T': '聯結車數量',
        'Speed_T': '聯結車速度 (km/h)',
    }
    
    for feature, name in feature_names.items():
        values = stats[feature]['values']
        
        if not values:
            print(f"\n{name}: 無資料")
            continue
        
        print(f"\n{name}:")
        print(f"  資料筆數: {len(values):,}")
        print(f"  最小值: {min(values):.2f}")
        print(f"  最大值: {max(values):.2f}")
        print(f"  平均值: {statistics.mean(values):.2f}")
        print(f"  中位數: {statistics.median(values):.2f}")
        print(f"  標準差: {statistics.stdev(values):.2f}" if len(values) > 1 else "  標準差: N/A")
        
        # 計算四分位數
        sorted_values = sorted(values)
        q1 = sorted_values[len(sorted_values) // 4]
        q3 = sorted_values[3 * len(sorted_values) // 4]
        print(f"  第一四分位數 (Q1): {q1:.2f}")
        print(f"  第三四分位數 (Q3): {q3:.2f}")

def save_summary(all_stats, output_file):
    """儲存摘要到檔案"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# VD（車輛偵測器）資料特徵範圍分析報告\n\n")
        f.write("## 分析期間\n\n")
        f.write("- 2024年12月 ~ 2025年5月（約6個月）\n")
        f.write("- 涵蓋三個VD偵測器：VLRJM60、VLRJX00、VLRJX20\n\n")
        
        for vd_name, stats in all_stats.items():
            f.write(f"\n## {vd_name} VD偵測器\n\n")
            
            feature_names = {
                'Speed': '整體平均速度',
                'Occupancy': '車道佔有率',
                'Volume_M': '機車流量',
                'Speed_M': '機車速度',
                'Volume_S': '小客車流量',
                'Speed_S': '小客車速度',
                'Volume_L': '大客車流量',
                'Speed_L': '大客車速度',
                'Volume_T': '聯結車流量',
                'Speed_T': '聯結車速度',
            }
            
            f.write("### 特徵統計\n\n")
            f.write("| 特徵 | 單位 | 最小值 | 最大值 | 平均值 | 中位數 | 標準差 | Q1 | Q3 |\n")
            f.write("|------|------|--------|--------|--------|--------|--------|----|----|\\n")
            
            for feature, name in feature_names.items():
                values = stats[feature]['values']
                
                if not values:
                    continue
                
                unit = '(km/h)' if 'Speed' in feature else '(%)'  if 'Occupancy' in feature else '(輛)'
                sorted_values = sorted(values)
                q1 = sorted_values[len(sorted_values) // 4]
                q3 = sorted_values[3 * len(sorted_values) // 4]
                std = statistics.stdev(values) if len(values) > 1 else 0
                
                f.write(f"| {name} | {unit} | {min(values):.1f} | {max(values):.1f} | "
                       f"{statistics.mean(values):.1f} | {statistics.median(values):.1f} | "
                       f"{std:.1f} | {q1:.1f} | {q3:.1f} |\n")
            
            f.write("\n")

def main():
    """主程式"""
    
    # VD資料夾路徑
    vd_folders = {
        'VLRJM60': r'.\src\vd_data\VLRJM60',
        'VLRJX00': r'.\src\vd_data\VLRJX00',
        'VLRJX20': r'.\src\vd_data\VLRJX20',
    }
    
    all_stats = {}
    
    # 分析每個VD資料夾
    for vd_name, vd_path in vd_folders.items():
        if not os.path.exists(vd_path):
            print(f"⚠️ 找不到資料夾: {vd_path}")
            continue
        
        stats = analyze_vd_folder(vd_path, vd_name)
        all_stats[vd_name] = stats
        print_statistics(stats, vd_name)
    
    # 儲存摘要報告
    output_file = 'VD_DATA_ANALYSIS_REPORT.md'
    save_summary(all_stats, output_file)
    print(f"\n{'='*80}")
    print(f"✅ 分析完成！報告已儲存至: {output_file}")
    print(f"{'='*80}\n")

if __name__ == '__main__':
    main()
