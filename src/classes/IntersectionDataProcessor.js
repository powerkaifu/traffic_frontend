/**
 * 路口數據處理器 - 使用 Strategy Pattern
 * 負責處理和計算交通數據，包含速度、佔用率等統計值
 */

class IntersectionDataProcessor {
  constructor() {
    // 不同場景的處理策略
    this.scenarioStrategies = {
      smooth: new SmoothTrafficStrategy(),
      一般: new NormalTrafficStrategy(),
      congested: new CongestedTrafficStrategy(),
    }

    // 路口物理參數
    this.intersectionConfig = {
      laneWidth: 3.5, // 米
      detectionLength: 50, // VD感測器覆蓋長度(米)
      stopLineDistance: 5, // 停止線距離(米)
    }
  }

  /**
   * 處理車輛數據並計算統計值
   * @param {Object} vehicleData - 原始車輛數據
   * @param {string} scenario - 交通場景
   * @param {Object} speedConfig - 速度配置
   */
  processVehicleData(vehicleData, scenario, speedConfig) {
    console.log('📊 開始處理交通數據...', scenario)

    const strategy = this.scenarioStrategies[scenario] || this.scenarioStrategies.一般

    // 1. 合併所有車輛數據
    const allVehicles = [...vehicleData.motorcycles, ...vehicleData.smallCars, ...vehicleData.largeCars]

    // 2. 計算基礎統計
    const basicStats = this.calculateBasicStats(allVehicles)

    // 3. 應用場景策略調整
    const adjustedStats = strategy.adjustStats(basicStats, speedConfig)

    // 4. 計算佔用率
    const occupancy = this.calculateOccupancy(allVehicles, strategy)

    // 5. 計算流量密度
    const density = this.calculateDensity(allVehicles, adjustedStats.avgSpeed)

    // 6. 生成最終VD格式數據
    const vdFormatData = this.generateVDFormat(adjustedStats, occupancy, density, allVehicles.length)

    console.log('✅ 數據處理完成:', vdFormatData)
    return vdFormatData
  }

  /**
   * 計算基礎統計數據
   */
  calculateBasicStats(vehicles) {
    if (vehicles.length === 0) {
      return {
        totalCount: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        minSpeed: 0,
        speedVariance: 0,
      }
    }

    const speeds = vehicles.map((v) => v.speed.current)
    const totalSpeed = speeds.reduce((sum, speed) => sum + speed, 0)

    return {
      totalCount: vehicles.length,
      avgSpeed: Math.round((totalSpeed / vehicles.length) * 10) / 10,
      maxSpeed: Math.max(...speeds),
      minSpeed: Math.min(...speeds),
      speedVariance: this.calculateVariance(speeds),
    }
  }

  /**
   * 計算變異數
   */
  calculateVariance(numbers) {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length
    const squaredDiffs = numbers.map((num) => Math.pow(num - mean, 2))
    return Math.round((squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length) * 100) / 100
  }

  /**
   * 計算道路佔用率
   * 基於車輛長度和檢測區域長度
   */
  calculateOccupancy(vehicles, strategy) {
    if (vehicles.length === 0) return 0

    // 計算總車輛長度
    const totalVehicleLength = vehicles.reduce((sum, vehicle) => {
      return sum + vehicle.dimensions.length + vehicle.behavior.followDistance
    }, 0)

    // 基礎佔用率
    const baseOccupancy = (totalVehicleLength / this.intersectionConfig.detectionLength) * 100

    // 應用場景調整
    const adjustedOccupancy = strategy.adjustOccupancy(baseOccupancy, vehicles.length)

    return Math.min(100, Math.max(0, Math.round(adjustedOccupancy * 10) / 10))
  }

  /**
   * 計算交通密度 (車輛/公里)
   */
  calculateDensity(vehicles, avgSpeed) {
    if (vehicles.length === 0 || avgSpeed === 0) return 0

    // 簡化的密度計算 (基於速度-密度關係)
    const detectionLengthKm = this.intersectionConfig.detectionLength / 1000
    const vehiclesPerKm = vehicles.length / detectionLengthKm

    return Math.round(vehiclesPerKm * 10) / 10
  }

  /**
   * 生成標準VD格式數據
   */
  generateVDFormat(stats, occupancy, density, totalVehicles) {
    return {
      // 交通量數據
      Volume_M: this.countVehiclesByType('motorcycle', totalVehicles), // 機車流量
      Volume_S: this.countVehiclesByType('small', totalVehicles), // 小型車流量
      Volume_L: this.countVehiclesByType('large', totalVehicles), // 大型車流量
      Volume_Total: totalVehicles, // 總流量

      // 速度數據 (km/h)
      Speed_Avg: stats.avgSpeed, // 平均速度
      Speed_Max: stats.maxSpeed, // 最大速度
      Speed_Min: stats.minSpeed, // 最小速度
      Speed_Variance: stats.speedVariance, // 速度變異數

      // 佔用率數據 (%)
      Occupancy: occupancy, // 佔用率

      // 密度數據 (車輛/公里)
      Density: density, // 交通密度

      // 服務水準 (A-F)
      LOS: this.calculateLOS(stats.avgSpeed, density, occupancy),

      // 數據品質指標
      DataQuality: this.assessDataQuality(stats, totalVehicles),
    }
  }

  /**
   * 計算特定車型數量 (模擬分配)
   */
  countVehiclesByType(type, totalVehicles) {
    // 簡化版本：基於總數量按比例分配
    const typeRatios = {
      motorcycle: 0.4, // 40% 機車
      small: 0.5, // 50% 小型車
      large: 0.1, // 10% 大型車
    }

    return Math.round(totalVehicles * (typeRatios[type] || 0))
  }

  /**
   * 計算服務水準 (Level of Service)
   */
  calculateLOS(avgSpeed, density, occupancy) {
    // 簡化的LOS計算
    if (occupancy >= 80 || avgSpeed <= 15) return 'F' // 擁塞
    if (occupancy >= 65 || avgSpeed <= 20) return 'E' // 接近擁塞
    if (occupancy >= 50 || avgSpeed <= 25) return 'D' // 高密度
    if (occupancy >= 35 || avgSpeed <= 30) return 'C' // 穩定流
    if (occupancy >= 20 || avgSpeed <= 35) return 'B' // 合理流
    return 'A' // 自由流
  }

  /**
   * 評估數據品質
   */
  assessDataQuality(stats, vehicleCount) {
    let quality = 100

    // 車輛數量太少會影響數據可信度
    if (vehicleCount < 5) quality -= 30
    else if (vehicleCount < 10) quality -= 15

    // 速度變異過大表示數據不穩定
    if (stats.speedVariance > 50) quality -= 20
    else if (stats.speedVariance > 25) quality -= 10

    return Math.max(0, quality)
  }
}

/**
 * 流暢交通策略
 */
class SmoothTrafficStrategy {
  adjustStats(stats) {
    // 流暢狀況下速度較高且穩定
    return {
      ...stats,
      avgSpeed: Math.min(stats.avgSpeed * 1.1, 40), // 提升10%但不超過40
      speedVariance: stats.speedVariance * 0.8, // 降低變異性
    }
  }

  adjustOccupancy(baseOccupancy) {
    return baseOccupancy * 0.8 // 流暢狀況佔用率較低
  }
}

/**
 * 一般交通策略
 */
class NormalTrafficStrategy {
  adjustStats(stats) {
    return stats // 保持原始數據
  }

  adjustOccupancy(baseOccupancy) {
    return baseOccupancy // 保持原始佔用率
  }
}

/**
 * 擁擠交通策略
 */
class CongestedTrafficStrategy {
  adjustStats(stats) {
    return {
      ...stats,
      avgSpeed: Math.max(stats.avgSpeed * 0.7, 10), // 降低30%但不低於10
      speedVariance: stats.speedVariance * 1.5, // 增加變異性
    }
  }

  adjustOccupancy(baseOccupancy) {
    return Math.min(baseOccupancy * 1.4, 95) // 擁擠狀況佔用率較高，但不超過95%
  }
}

export default IntersectionDataProcessor
