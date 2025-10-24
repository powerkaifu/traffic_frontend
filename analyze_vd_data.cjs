const fs = require('fs');
const path = require('path');

/**
 * 分析 VD 數據統計
 * 分析時間範圍: 2024-02-26 至 2024-05-19 (3個多月)
 */

const VD_DATA_DIR = path.join(__dirname, 'src', 'vd_data');
const VD_NAMES = ['VLRJM60', 'VLRJX00', 'VLRJX20'];

// 按時段分類
const TIME_PERIODS = {
  '早峰': { hours: [7, 8, 9], label: '07:00-09:59' },
  '中午離峰': { hours: [10, 11, 12, 13, 14, 15, 16], label: '10:00-16:59' },
  '晚峰': { hours: [17, 18, 19], label: '17:00-19:59' },
  '晚間離峰': { hours: [20, 21, 22, 23], label: '20:00-23:59' },
  '凌晨離峰': { hours: [0, 1, 2, 3, 4, 5, 6], label: '00:00-06:59' },
};

function getTimePeriod(hour) {
  for (const [period, config] of Object.entries(TIME_PERIODS)) {
    if (config.hours.includes(hour)) {
      return period;
    }
  }
  return null;
}

function analyzeVDFiles() {
  const allStats = {};

  VD_NAMES.forEach(vdName => {
    allStats[vdName] = {};
    Object.keys(TIME_PERIODS).forEach(period => {
      allStats[vdName][period] = {
        speedData: [],
        occupancyData: [],
        vehicleData: [],
        laneCount: {},
      };
    });

    const vdPath = path.join(VD_DATA_DIR, vdName);
    const files = fs.readdirSync(vdPath).filter(f => f.endsWith('.json'));

    console.log(`\n📊 分析 ${vdName}...`);

    files.forEach(file => {
      try {
        const filePath = path.join(vdPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        for (const [timestamp, records] of Object.entries(data)) {
          const date = new Date(timestamp);
          const hour = date.getHours();
          const period = getTimePeriod(hour);

          if (!period) continue;

          records.forEach(record => {
            const speed = record.Speed;
            const occupancy = record.Occupancy;
            const laneId = record.LaneID;
            const totalVolume =
              (record.Vehicles?.M?.Volume || 0) +
              (record.Vehicles?.S?.Volume || 0) +
              (record.Vehicles?.L?.Volume || 0) +
              (record.Vehicles?.T?.Volume || 0);

            // 過濾無效數據（Speed = 0 且 Occupancy = 0）
            if (speed === 0 && occupancy === 0) return;

            allStats[vdName][period].speedData.push(speed);
            allStats[vdName][period].occupancyData.push(occupancy);
            allStats[vdName][period].vehicleData.push(totalVolume);

            if (!allStats[vdName][period].laneCount[laneId]) {
              allStats[vdName][period].laneCount[laneId] = [];
            }
            allStats[vdName][period].laneCount[laneId].push(totalVolume);
          });
        }
      } catch (error) {
        console.error(`❌ 解析 ${file} 失敗:`, error.message);
      }
    });
  });

  return allStats;
}

function calculateStats(data) {
  if (data.length === 0) return null;

  const sorted = data.sort((a, b) => a - b);
  const sum = data.reduce((a, b) => a + b, 0);
  const avg = sum / data.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];

  return { min, max, avg: parseFloat(avg.toFixed(2)), median, p25, p75, count: data.length };
}

function printResults(allStats) {
  console.log('\n' + '='.repeat(100));
  console.log('📈 VD 數據分析報告 (2024-02-26 至 2024-05-19, 3個多月)');
  console.log('='.repeat(100));

  VD_NAMES.forEach(vdName => {
    console.log(`\n\n🚦 ${vdName} 分析結果`);
    console.log('-'.repeat(100));

    const periodStats = allStats[vdName];

    Object.entries(TIME_PERIODS).forEach(([periodName, config]) => {
      const stats = periodStats[periodName];
      const speedStats = calculateStats(stats.speedData);
      const occupancyStats = calculateStats(stats.occupancyData);
      const vehicleStats = calculateStats(stats.vehicleData);

      console.log(`\n⏰ ${periodName} (${config.label})`);
      console.log(`   數據筆數: ${speedStats?.count || 0}`);

      if (speedStats) {
        console.log(`   
   🚗 速度 (km/h): 平均=${speedStats.avg}, 中位數=${speedStats.median.toFixed(0)}, 範圍=${speedStats.min.toFixed(0)}-${speedStats.max.toFixed(0)}`);
        console.log(`   🛣️  占有率 (%):  平均=${occupancyStats.avg}, 中位數=${occupancyStats.median.toFixed(0)}, 範圍=${occupancyStats.min.toFixed(0)}-${occupancyStats.max.toFixed(0)}`);
        console.log(
          `   🚙 車輛數/紀錄: 平均=${vehicleStats.avg.toFixed(1)}, 中位數=${vehicleStats.median.toFixed(0)}, 範圍=${vehicleStats.min}-${vehicleStats.max}`
        );

        // 計算每條車道平均車輛數
        const laneAvgVehicles = {};
        for (const [laneId, vehicles] of Object.entries(stats.laneCount)) {
          const avgVehicles = vehicles.reduce((a, b) => a + b, 0) / vehicles.length;
          laneAvgVehicles[laneId] = avgVehicles.toFixed(1);
        }
        console.log(`   🛤️  車道平均車輛數: ${JSON.stringify(laneAvgVehicles)}`);
      } else {
        console.log(`   ⚠️  沒有有效數據`);
      }
    });
  });

  // 生成配置建議
  console.log('\n\n' + '='.repeat(100));
  console.log('💡 時段配置建議');
  console.log('='.repeat(100));

  VD_NAMES.forEach(vdName => {
    console.log(`\n\n${vdName} 推薦配置:`);
    console.log('-'.repeat(50));

    const periodStats = allStats[vdName];

    Object.entries(TIME_PERIODS).forEach(([periodName, config]) => {
      const stats = periodStats[periodName];
      const vehicleStats = calculateStats(stats.vehicleData);

      if (vehicleStats) {
        const avgPerLane = vehicleStats.avg / 2; // 假設 2 條車道
        let expectedSeconds = 50;

        if (periodName === '早峰' || periodName === '晚峰') {
          expectedSeconds = '55-70';
        } else if (periodName === '中午離峰' || periodName === '晚間離峰') {
          expectedSeconds = '40-50';
        } else if (periodName === '凌晨離峰') {
          expectedSeconds = '30-40';
        }

        console.log(`  ${periodName.padEnd(10)} | 車輛/車道: ${(avgPerLane / 2).toFixed(1)} | 預期秒數: ${expectedSeconds}`);
      }
    });
  });
}

// 執行分析
try {
  const stats = analyzeVDFiles();
  printResults(stats);
  console.log('\n✅ 分析完成！');
} catch (error) {
  console.error('❌ 分析失敗:', error);
  process.exit(1);
}
