/**
 * VehiclePool.js - 車輛物件池
 *
 * 目的：通過回收車輛物件而不是銷毀它們，來消除 DOM 堆積和 GC 壓力
 *
 * 工作流：
 * 1. acquire() - 從池中取車輛，如果池空則建立新車輛
 * 2. release() - 使用完後放回池中（隱藏元素，不移除 DOM）
 * 3. dispose() - 銷毀整個池（應用關閉時）
 */
import { gsap } from 'gsap'
import Vehicle from './Vehicle.js'

export class VehiclePool {
  constructor(container, simulationStore) {
    this.container = container
    this.simulationStore = simulationStore
    this.poolMap = new Map() // 按方向分組：{ direction: [vehicle1, vehicle2, ...] }
    this.activeVehicles = new Set() // 追蹤所有活躍的車輛
    this.maxSize = 120 // 🚗 最大容量：4 方向 × 24 輛停車位 + 24 緩衝 = 120
  }

  /**
   * 從池中獲取車輛（如果池空則建立新車）
   * @param {string} direction - 車輛方向 (east/west/north/south)
   * @param {number} laneNumber - 車道號
   * @param {string} vehicleType - 車輛類型 (small/truck/bus)
   * @param {number} x - 起始X座標
   * @param {number} y - 起始Y座標
   * @param {number} speed - 車輛速度（來自 AutoTrafficGenerator）
   * @returns {Vehicle} - 車輛實例
   */
  acquire(direction, laneNumber, vehicleType, x, y, speed = null) {
    if (!this.poolMap.has(direction)) {
      this.poolMap.set(direction, [])
    }

    // 🚨 檢查是否超過最大容量
    const totalVehicles = this.activeVehicles.size + this.getTotalPooled()
    if (totalVehicles >= this.maxSize) {
      console.warn(
        `⚠️ [VehiclePool] 已達最大容量 ${this.maxSize}，無法創建新車輛。活躍: ${this.activeVehicles.size}, 空閒: ${this.getTotalPooled()}`,
      )
      return null
    }

    const directionPool = this.poolMap.get(direction)
    let vehicle

    if (directionPool.length > 0) {
      // ✅ 從池中取出一個車輛
      vehicle = directionPool.pop()
      // ✅ 重置車輛到新狀態
      vehicle.reset(direction, laneNumber, vehicleType, this.simulationStore)

      // 🚨 【新增】如果提供了速度，設置到重置的車輛
      if (speed !== null && speed !== undefined) {
        vehicle.initialSpeed = speed
        vehicle.currentSpeed = speed
      }

      // ✅ 立即恢復可見性和位置
      // console.log(`♻️ [VehiclePool.acquire] 從池中取出 ${vehicle.id}，重置完成，現在恢復可見性和位置 (${x}, ${y})`)

      // 🚨【重要】確保 GSAP killTweensOf 完全生效後再設置 autoAlpha: 1
      // 使用同步 set，但立即清除任何殘留的動畫狀態
      gsap.killTweensOf(vehicle.element) // 再次確保沒有動畫
      gsap.set(vehicle.element, {
        clearProps: 'autoAlpha', // 清除任何殘留屬性
      })

      gsap.set(vehicle.element, {
        autoAlpha: 1, // 👈 【關鍵】恢復可見性
        x: x,
        y: y,
        rotation: 0,
      })
      vehicle.currentX = x
      vehicle.currentY = y
      // 🚨 標記位置已設置，防止 moveAlongPath 中的路徑起始點邏輯覆蓋
      vehicle.isJustReset = true

      // 🚀 效能優化：激活車輛，允許處理事件
      vehicle.isActive = true

      // console.log(`✅ [VehiclePool.acquire] ${vehicle.id} 可見性已恢復，位置設置為 (${x}, ${y})，autoAlpha=1`)
    } else {
      // ❌ 池空，建立新車輛
      vehicle = new Vehicle(x, y, direction, vehicleType, laneNumber, this.simulationStore, speed)
      vehicle.addTo(this.container)
      // console.log(`🆕 [VehiclePool.acquire] 創建新車 ${vehicle.id}`)
    }

    this.activeVehicles.add(vehicle)
    return vehicle
  }

  /**
   * 將使用完的車輛放回池中
   * @param {Vehicle} vehicle - 要回收的車輛
   */
  release(vehicle) {
    if (!vehicle) return

    // ✅【關鍵】確保元素被隱藏
    if (vehicle.element) {
      gsap.set(vehicle.element, {
        autoAlpha: 0, // 徹底隱藏
        pointerEvents: 'none', // 禁止交互
      })
    }

    // ✅ 隱藏元素但不移除 DOM
    vehicle.reset(vehicle.direction, vehicle.laneNumber, vehicle.vehicleType, this.simulationStore)

    // ✅ 將車輛放回對應方向的池中
    if (!this.poolMap.has(vehicle.direction)) {
      this.poolMap.set(vehicle.direction, [])
    }
    this.poolMap.get(vehicle.direction).push(vehicle)

    // ✅ 從活躍集合中移除
    this.activeVehicles.delete(vehicle)
  }

  /**
   * 銷毀整個物件池
   */
  dispose() {
    for (const [, pool] of this.poolMap.entries()) {
      for (const vehicle of pool) {
        try {
          vehicle.performCleanup()
          if (vehicle.element && vehicle.element.parentNode) {
            vehicle.element.parentNode.removeChild(vehicle.element)
          }
        } catch (e) {
          console.warn(`⚠️ VehiclePool dispose error for ${vehicle.id}:`, e.message)
        }
      }
    }
    this.poolMap.clear()
    this.activeVehicles.clear()
  }

  /**
   * 取得池中空閒車輛總數
   */
  getTotalPooled() {
    let total = 0
    for (const pool of this.poolMap.values()) {
      total += pool.length
    }
    return total
  }

  /**
   * 取得池的統計信息
   */
  getStats() {
    const stats = {
      maxSize: this.maxSize,
      totalPooled: this.getTotalPooled(),
      totalActive: this.activeVehicles.size,
      byDirection: {},
    }

    for (const [direction, pool] of this.poolMap.entries()) {
      stats.byDirection[direction] = pool.length
    }

    return stats
  }

  /**
   * 清空所有空閒車輛（除了活躍的）
   */
  cleanup() {
    for (const [, pool] of this.poolMap.entries()) {
      while (pool.length > 0) {
        const vehicle = pool.pop()
        try {
          if (vehicle.element && vehicle.element.parentNode) {
            vehicle.element.parentNode.removeChild(vehicle.element)
          }
        } catch (e) {
          console.warn(`⚠️ VehiclePool cleanup error for ${vehicle.id}:`, e.message)
        }
      }
    }
  }
}

export default VehiclePool
