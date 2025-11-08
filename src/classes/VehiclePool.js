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
  }

  /**
   * 從池中獲取車輛（如果池空則建立新車）
   * @param {string} direction - 車輛方向 (east/west/north/south)
   * @param {number} laneNumber - 車道號
   * @param {string} vehicleType - 車輛類型 (small/truck/bus)
   * @param {number} x - 起始X座標
   * @param {number} y - 起始Y座標
   * @returns {Vehicle} - 車輛實例
   */
  acquire(direction, laneNumber, vehicleType, x, y) {
    if (!this.poolMap.has(direction)) {
      this.poolMap.set(direction, [])
    }

    const directionPool = this.poolMap.get(direction)
    let vehicle

    if (directionPool.length > 0) {
      // ✅ 從池中取出一個車輛
      vehicle = directionPool.pop()
      // ✅ 重置車輛到新狀態
      vehicle.reset(direction, laneNumber, vehicleType, this.simulationStore)
      // ✅ 立即恢復可見性和位置
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
      console.log(`♻️ [VehiclePool] 從池中取車 ${vehicle.id}，設置位置 (${x}, ${y})`)
    } else {
      // ❌ 池空，建立新車輛
      vehicle = new Vehicle(x, y, direction, vehicleType, laneNumber, this.simulationStore)
      vehicle.addTo(this.container)
      console.log(`🆕 [VehiclePool] 創建新車 ${vehicle.id}`)
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
   * 取得池的統計信息
   */
  getStats() {
    const stats = {
      totalPooled: 0,
      totalActive: this.activeVehicles.size,
      byDirection: {},
    }

    for (const [direction, pool] of this.poolMap.entries()) {
      stats.byDirection[direction] = pool.length
      stats.totalPooled += pool.length
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
