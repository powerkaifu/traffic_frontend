/**
 * VehicleDataGenerator.js - 車輛數據生成器
 *
 * 設計模式:
 * - Factory Pattern (工廠模式): 批量創建不同類型車輛的數據
 * - Builder Pattern (建造者模式): 逐步構建複雜的車輛物件
 * - Strategy Pattern (策略模式): 不同車輛類型的生成策略
 * - Template Method Pattern (模板方法模式): 標準化車輛創建流程
 * - Singleton Pattern (單例模式): 全域共享的數據生成器
 *
 * 系統角色:
 * - 數據工廠: 批量生成符合規格的車輛數據
 * - 參數計算器: 計算車輛的物理和行為參數
 * - 隨機化引擎: 提供符合現實分布的隨機數據
 * - 配置管理器: 管理不同車輛類型的配置參數
 * - 性能優化器: 計算適合動畫系統的時間參數
 */
/**
 * 車輛數據生成器 - 使用 Factory Pattern
 * 負責生成個別車輛的詳細數據
 */

class VehicleDataGenerator {
  constructor() {
    // 車輛類型配置
    this.vehicleTypes = {
      large: {
        name: '大型車',
        length: 12.0,
        width: 2.5,
        weight: 15000,
        speedRange: { min: 10, max: 20 }, // 降低速度
        accelerationTime: 8,
      },
      small: {
        name: '小型車',
        length: 4.5,
        width: 1.8,
        weight: 1200,
        speedRange: { min: 15, max: 30 }, // 降低速度
        accelerationTime: 5,
      },
      motor: {
        name: '機車',
        length: 2.0, // 米
        width: 0.8,
        weight: 250, // kg
        speedRange: { min: 18, max: 30 }, // 降低最高速度 km/h
        accelerationTime: 3, // 秒
      },
    }
  }

  /**
   * 生成指定類型和數量的車輛群組
   * @param {string} vehicleType - 車輛類型
   * @param {number} count - 車輛數量
   */
  generateVehicleGroup(vehicleType, count) {
    const vehicles = []
    const typeConfig = this.vehicleTypes[vehicleType]

    if (!typeConfig) {
      console.warn(`⚠️ 未知的車輛類型: ${vehicleType}`)
      return vehicles
    }

    for (let i = 0; i < count; i++) {
      vehicles.push(this.createVehicle(vehicleType, typeConfig, i + 1))
    }

    console.log(`🏭 生成 ${count} 輛 ${typeConfig.name}`)
    return vehicles
  }

  /**
   * 創建單一車輛數據 (Factory Method)
   */
  createVehicle(type, config, index) {
    const baseSpeed = this.generateRealisticSpeed(config.speedRange)

    return {
      id: `${type}_${Date.now()}_${index}`,
      type: type,
      typeName: config.name,
      index: index,

      // 物理屬性
      dimensions: {
        length: config.length,
        width: config.width,
        weight: config.weight,
      },

      // 速度數據 (km/h)
      speed: {
        current: baseSpeed,
        average: baseSpeed,
        max: config.speedRange.max,
        min: config.speedRange.min,
      },

      // 時間數據
      timing: {
        createdAt: new Date().toISOString(),
        accelerationTime: config.accelerationTime,
        estimatedTravelTime: this.calculateTravelTime(baseSpeed),
      },

      // 路口行為數據
      behavior: {
        aggressiveness: this.generateAggressiveness(),
        followDistance: this.calculateFollowDistance(type, baseSpeed),
        reactionTime: this.generateReactionTime(type),
      },
    }
  }

  /**
   * 生成符合現實的車輛速度
   * 使用正態分布來模擬真實的速度分布
   */
  generateRealisticSpeed(speedRange) {
    const { min, max } = speedRange
    const mean = (min + max) / 2
    const stdDev = (max - min) / 6 // 3-sigma 規則

    // 簡單的 Box-Muller 轉換來生成正態分布
    const normalRandom = this.generateNormalRandom(mean, stdDev)

    // 確保速度在合理範圍內
    return Math.max(min, Math.min(max, Math.round(normalRandom)))
  }

  /**
   * 生成正態分布隨機數
   */
  generateNormalRandom(mean, stdDev) {
    let u = 0,
      v = 0
    while (u === 0) u = Math.random() // 避免 log(0)
    while (v === 0) v = Math.random()

    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    return z * stdDev + mean
  }

  /**
   * 計算車輛的跟車距離
   */
  calculateFollowDistance(vehicleType, speed) {
    const baseDistance = {
      large: 3.0,
      small: 2.0,
      motor: 1.5,
    }

    // 距離隨速度增加 (速度越快，安全距離越長)
    const speedFactor = speed / 30 // 基準速度 30 km/h
    return Math.round((baseDistance[vehicleType] || 2.0) * speedFactor * 10) / 10
  }

  /**
   * 生成駕駛積極性 (0-1)
   */
  generateAggressiveness() {
    // 大部分駕駛為中等積極性，少數極端
    const random = Math.random()
    if (random < 0.1) return Math.random() * 0.3 // 10% 保守駕駛
    if (random < 0.8) return 0.3 + Math.random() * 0.4 // 70% 一般駕駛
    return 0.7 + Math.random() * 0.3 // 20% 積極駕駛
  }

  /**
   * 生成反應時間 (秒)
   */
  generateReactionTime(vehicleType) {
    const baseReactionTime = {
      large: 1.8, // 大車反應較慢
      small: 1.2,
      motor: 0.8, // 機車反應較快
    }

    const base = baseReactionTime[vehicleType] || 1.2
    // 加入 ±30% 的變異性
    return Math.round((base + (Math.random() - 0.5) * base * 0.6) * 10) / 10
  }

  /**
   * 計算預估通過時間
   */
  calculateTravelTime(speed) {
    // 假設路口通過距離為 100 米
    const distanceMeters = 100
    const speedMs = (speed * 1000) / 3600 // 轉換為 m/s
    return Math.round((distanceMeters / speedMs) * 10) / 10 // 秒
  }

  /**
   * 獲取車輛類型統計
   */
  getVehicleTypeStats() {
    return Object.keys(this.vehicleTypes).map((type) => ({
      type,
      name: this.vehicleTypes[type].name,
      avgSpeed: (this.vehicleTypes[type].speedRange.min + this.vehicleTypes[type].speedRange.max) / 2,
      dimensions: this.vehicleTypes[type].length + 'm × ' + this.vehicleTypes[type].width + 'm',
    }))
  }

  /**
   * 根據車輛類型生成隨機速度
   * @param {string} vehicleType - 車輛類型
   * @returns {number} 隨機速度 (km/h)
   */
  generateRandomSpeedForType(vehicleType) {
    const typeConfig = this.vehicleTypes[vehicleType]
    if (!typeConfig) {
      console.warn(`⚠️ 未知的車輛類型: ${vehicleType}`)
      return 30 // 預設速度
    }

    return this.generateRealisticSpeed(typeConfig.speedRange)
  }

  /**
   * 計算動畫時間（供前端動畫系統使用）
   * @param {string} vehicleType - 車輛類型
   * @param {number} distance - 距離（像素）
   * @returns {number} 動畫時間（秒）
   */
  calculateAnimationDuration(vehicleType, distance = 800) {
    const speed = this.generateRandomSpeedForType(vehicleType)
    const speedMs = (speed * 1000) / 3600 // 轉換為 m/s

    // 假設 100 像素 = 10 米（比例尺）
    const realDistance = (distance / 100) * 10

    // 計算理論時間
    const theoreticalTime = realDistance / speedMs

    // 控制在合理範圍內（5-18秒，增加時間範圍）
    const minTime = 5
    const maxTime = 18
    return Math.max(minTime, Math.min(maxTime, theoreticalTime))
  }
}

export default VehicleDataGenerator
