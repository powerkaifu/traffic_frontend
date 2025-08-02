/**
 * TrafficDataManager.js - 交通數據管理器
 *
 * 設計模式:
 * - Factory Pattern (工廠模式): 統一創建和管理交通數據
 * - Strategy Pattern (策略模式): 不同場景下的數據生成策略
 * - Facade Pattern (外觀模式): 為複雜的數據處理提供簡化接口
 * - Observer Pattern (觀察者模式): 監聽和通知數據變化事件
 * - Template Method Pattern (模板方法模式): 標準化數據處理流程
 * - Adapter Pattern (適配器模式): 適配不同數據格式和接口
 *
 * 系統角色:
 * - 數據協調器: 統籌管理整個系統的交通數據流
 * - 場景管理器: 根據不同交通場景調整數據生成策略
 * - 格式轉換器: 將內部數據格式轉換為 API 需要的格式
 * - 事件中心: 管理數據更新的事件通知機制
 * - 性能監控器: 監控和優化數據處理性能
 * - 配置中心: 管理系統的各種配置參數
 */
/**
 * 交通數據管理器 - 使用 Factory Pattern + Strategy Pattern
 * 負責生成、管理和分配交通數據到各個路口
 */

import VehicleDataGenerator from './_VehicleDataGenerator.js'
import IntersectionDataProcessor from './_IntersectionDataProcessor.js'

class TrafficDataManager {
  constructor() {
    this.dataGenerator = new VehicleDataGenerator()
    this.dataProcessor = new IntersectionDataProcessor()
    this.observers = [] // Observer Pattern for event handling

    // VD_ID 映射 - 對應四個路口的感測器ID
    this.vdIdMapping = {
      east: 'VLRJX20',
      west: 'VLRJM60',
      south: 'VLRJX00',
      north: 'VLRJX00',
    }

    // 車種速度配置 (km/h)
    this.vehicleSpeedConfig = {
      motorcycle: { min: 25, max: 45, avgCity: 35 },
      small: { min: 20, max: 40, avgCity: 30 },
      large: { min: 15, max: 30, avgCity: 22 },
    }
  }

  /**
   * 添加觀察者 (Observer Pattern)
   */
  addObserver(observer) {
    this.observers.push(observer)
  }

  /**
   * 通知所有觀察者
   */
  notifyObservers(event, data) {
    this.observers.forEach((observer) => {
      if (observer[event]) {
        observer[event](data)
      }
    })
  }

  /**
   * 主要方法：根據使用者選擇生成完整的交通數據
   * @param {Object} userConfig - 使用者配置
   * @param {string} userConfig.selectedIntersection - 選擇的路口 ('東', '西', '南', '北')
   * @param {string} userConfig.selectedScenario - 選擇的場景 ('smooth', '一般', 'congested')
   * @param {number} userConfig.motorcycleCount - 機車數量
   * @param {number} userConfig.smallCarCount - 小型車數量
   * @param {number} userConfig.largeCarCount - 大型車數量
   */
  generateTrafficData(userConfig) {
    console.log('🚦 開始生成交通數據...', userConfig)

    // 1. 生成時間戳數據
    const timeData = this.generateTimeData()

    // 2. 根據選擇的路口生成對應的VD數據
    const targetIntersection = this.getIntersectionKey(userConfig.selectedIntersection)
    const vdId = this.vdIdMapping[targetIntersection]

    // 3. 生成車輛數據
    const vehicleData = this.generateVehicleData(userConfig)

    // 4. 計算速度和佔用率
    const processedData = this.dataProcessor.processVehicleData(
      vehicleData,
      userConfig.selectedScenario,
      this.vehicleSpeedConfig,
    )

    // 5. 組合完整的VD數據格式
    const vdData = {
      VD_ID: vdId,
      ...timeData,
      ...processedData,
      intersection: targetIntersection,
      scenario: userConfig.selectedScenario,
      rawCounts: {
        motorcycles: userConfig.motorcycleCount,
        smallCars: userConfig.smallCarCount,
        largeCars: userConfig.largeCarCount,
      },
    }

    console.log('✅ 交通數據生成完成:', vdData)

    // 6. 通知觀察者數據已生成
    this.notifyObservers('onTrafficDataGenerated', vdData)

    // 7. 分配車輛到動畫系統
    this.distributeVehiclesToAnimation(userConfig, targetIntersection)

    return vdData
  }

  /**
   * 生成時間數據
   */
  generateTimeData() {
    const now = new Date()
    const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

    return {
      timestamp: now.toISOString(),
      dayOfWeek: dayNames[now.getDay()],
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      date: now.toLocaleDateString('zh-TW'),
    }
  }

  /**
   * 轉換路口選擇到英文key
   */
  getIntersectionKey(chineseDirection) {
    const mapping = {
      東: 'east',
      西: 'west',
      南: 'south',
      北: 'north',
    }
    return mapping[chineseDirection] || 'east'
  }

  /**
   * 生成基礎車輛數據
   */
  generateVehicleData(config) {
    return {
      motorcycles: this.dataGenerator.generateVehicleGroup('motorcycle', config.motorcycleCount),
      smallCars: this.dataGenerator.generateVehicleGroup('small', config.smallCarCount),
      largeCars: this.dataGenerator.generateVehicleGroup('large', config.largeCarCount),
    }
  }

  /**
   * 分配車輛到動畫系統
   * 這個方法會將車輛數據轉換為動畫參數
   */
  distributeVehiclesToAnimation(config, targetIntersection) {
    const animationConfig = {
      intersection: targetIntersection,
      scenario: config.selectedScenario,
      vehicles: {
        motorcycle: config.motorcycleCount,
        small: config.smallCarCount,
        large: config.largeCarCount,
      },
      timing: this.calculateAnimationTiming(config.selectedScenario),
    }

    // 通知動畫系統開始車輛生成
    this.notifyObservers('onStartVehicleAnimation', animationConfig)

    return animationConfig
  }

  /**
   * 根據場景計算動畫時機
   */
  calculateAnimationTiming(scenario) {
    const timingConfig = {
      smooth: { interval: [2000, 4000], delay: [0, 1000] },
      一般: { interval: [1500, 3000], delay: [0, 1500] },
      congested: { interval: [800, 1500], delay: [0, 2000] },
    }

    return timingConfig[scenario] || timingConfig.一般
  }

  /**
   * 重置系統狀態
   */
  reset() {
    console.log('🔄 重置交通數據管理器')
    this.notifyObservers('onSystemReset', {})
  }

  /**
   * 獲取當前系統狀態
   */
  getSystemStatus() {
    return {
      isActive: this.observers.length > 0,
      observerCount: this.observers.length,
      lastUpdate: new Date().toISOString(),
    }
  }
}

export default TrafficDataManager
