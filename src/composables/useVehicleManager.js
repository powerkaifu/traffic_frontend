/**
 * useVehicleManager.js - 車輛管理 Composable
 * 負責管理車輛生命週期、物件池與活躍車輛列表
 */

import { ref } from 'vue'
import { gsap } from 'gsap'
import Vehicle from '../classes/Vehicle.js'
import VehiclePool from '../classes/VehiclePool.js'
import { useVehicleEventBroadcaster } from './useVehicleEventBroadcaster.js'

export function useVehicleManager(store, vehicleContainerRef, crossroadContainerRef) {
  // ========== 狀態管理 ==========
  const activeCars = ref([]) // 維護活躍車輛列表
  let vehiclePool = null // 會在初始化時設置

  // ✨ 【新增】獲取全域事件廣播器
  const broadcaster = useVehicleEventBroadcaster()

  // ========== 物件池初始化 ==========
  /**
   * 初始化車輛物件池
   */
  function initVehiclePool() {
    if (!vehicleContainerRef.value) {
      console.error('❌ [useVehicleManager] vehicleContainer 未準備好')
      return
    }

    vehiclePool = new VehiclePool(vehicleContainerRef.value, store)
    vehiclePool = new VehiclePool(vehicleContainerRef.value, store)
    console.log('🚀 [useVehicleManager] VehiclePool 已初始化')

    // 🚨 【移除】天氣監聽已移至 Vehicle.js，避免重複更新
  }

  // 🚨 【移除】天氣監聽邏輯已移至 Vehicle.js
  // 原因：避免重複更新車輛速度，造成卡頓
  // Vehicle.js 透過 weatherSpeedChange 事件直接處理

  // ========== 車輛創建 ==========
  /**
   * 通用車輛創建函數
   * @param {number} x - X 座標
   * @param {number} y - Y 座標
   * @param {string} direction - 方向 (east/west/south/north)
   * @param {string} vehicleType - 車輛類型
   * @param {number} laneNumber - 車道編號
   * @param {number} initialProgress - 初始進度 (0-1)
   * @param {number} speed - 速度
   * @param {object} autoTrafficGenerator - 自動生成器實例（用於檢查限制）
   * @returns {Vehicle|null} 創建的車輛實例或 null
   */
  function createVehicleWithPosition(
    x,
    y,
    direction,
    vehicleType,
    laneNumber,
    initialProgress = 0,
    speed = null,
    autoTrafficGenerator = null,
  ) {
    // ✅ 【新增】檢查是否超過車輛限制
    if (autoTrafficGenerator) {
      const maxLiveVehicles = autoTrafficGenerator.config.maxLiveVehicles || 100
      const currentVehicleCount = activeCars.value.length

      if (currentVehicleCount >= maxLiveVehicles) {
        console.warn(`⚠️ [車輛限制] 當前車輛數 (${currentVehicleCount}) 已達上限 (${maxLiveVehicles})，暫停生成新車輛`)
        return null // 返回 null，不生成新車輛
      }
    }

    // 使用指定位置創建車輛
    // 🚀 改進：優先從物件池中獲取，只在池空時才創建新車輛
    let vehicle
    let isFromPool = false

    if (vehiclePool && vehiclePool.poolMap && vehiclePool.poolMap.has(direction)) {
      // ✅ 從池中取車
      vehicle = vehiclePool.acquire(direction, laneNumber, vehicleType, x, y, speed)
      isFromPool = true
    } else if (vehiclePool) {
      // ✅ 池空，創建新車輛並添加到池的管理中
      vehicle = vehiclePool.acquire(direction, laneNumber, vehicleType, x, y, speed)
      isFromPool = true
    } else {
      // 備用：池未初始化時，直接創建新車輛
      vehicle = new Vehicle(x, y, direction, vehicleType, laneNumber, store, speed)
      isFromPool = false
    }

    // 🚀 Vehicle 已經完全初始化，無需在此進行其他設置
    // （碰撞控制由 Vehicle.updateLogic 中的 CollisionFollowingController 管理）

    // 🚨 【新增】如果提供了速度，直接設置到車輛（來自 AutoTrafficGenerator）
    if (speed !== null && speed !== undefined) {
      vehicle.initialSpeed = speed
      vehicle.currentSpeed = speed
    }
    // ✅ 如果 speed 為 null，Vehicle 構造函數會自動生成隨機速度，無需警告

    // 🚨 設置初始 progress（如果提供的話）
    if (typeof initialProgress === 'number' && initialProgress !== 0) {
      vehicle.progress = initialProgress
      console.log(`🚗 [${vehicle.id}] 設置初始 progress: ${initialProgress.toFixed(3)}`)
    }

    // ✅ 【關鍵】只有新建的車輛才需要 addTo（池中的車輛已在 DOM 中）
    if (!isFromPool) {
      vehicle.addTo(vehicleContainerRef.value || crossroadContainerRef.value)
    }
    activeCars.value.push(vehicle)

    // ✅ 將車輛添加到 Store（用於自動生成系統計算 progress）
    store.addVehicle(vehicle)

    // ✅ 同步到 window.liveVehicles（供 AutoTrafficGenerator 使用）
    if (!window.liveVehicles) window.liveVehicles = []
    window.liveVehicles.push(vehicle)

    // ✨ 【新增】註冊車輛到全域事件廣播器
    broadcaster.register(vehicle)
    console.log(`📡 [${vehicle.id}] 已註冊到 VehicleEventBroadcaster`)

    // 🚀 【關鍵修復】啟動車輛動畫
    startVehicleAnimation(vehicle)

    return vehicle
  }

  // ========== 車輛動畫 ==========
  /**
   * 啟動車輛動畫
   * @param {Vehicle} vehicle - 車輛實例
   */
  async function startVehicleAnimation(vehicle) {
    if (!vehicle) return

    try {
      // 🚨【關鍵】確保從池中 acquire 的車輛可見性已生效
      // 延遲 50ms 讓 GSAP 設置完成
      await new Promise((resolve) => setTimeout(resolve, 50))

      // 確保 SVG 路徑元素已準備好
      const waitForSvgPaths = async () => {
        const maxWait = 3000 // 最多等待3秒
        const startTime = Date.now()
        const pathId = vehicle.getSvgPathId()

        while (Date.now() - startTime < maxWait) {
          const pathElement = document.querySelector(`#${pathId}`)
          if (pathElement && pathElement.getTotalLength && pathElement.getTotalLength() > 0) {
            return true
          }
          if (pathElement && pathElement.getTotalLength && pathElement.getTotalLength() > 0) {
            return true
          }
          // 🚀 優化：使用 RAF 等待下一幀，而不是 setTimeout
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }

        console.warn(`⚠️ [${vehicle.id}] SVG 路徑元素未準備好，將使用回退方式: ${pathId}`)
        return false
      }

      // 等待 SVG 路徑準備好
      await waitForSvgPaths()

      // 使用 composable 提供的 handleVehicleOutOfBounds
      await vehicle.moveAlongPath(window.trafficController, activeCars.value, handleVehicleOutOfBounds)

      // ✅ 動畫完成後的清理（此時車輛已由 handleVehicleOutOfBounds 放回池中）
      // 無需額外清理
    } catch (error) {
      console.error('❌ 自動生成車輛動畫錯誤:', error)
      // 發生錯誤時使用 composable 處理
      handleVehicleOutOfBounds(vehicle)
    }
  }

  // ========== 車輛移除 ==========
  /**
   * 統一的車輛移除方法 - 集中化車輛生命週期管理
   * @param {string} vehicleId - 車輛 ID
   */
  function removeVehicleFromSimulation(vehicleId) {
    try {
      // 1. 從 activeCars.value 移除
      const idx = activeCars.value.findIndex((v) => v.id === vehicleId)
      let vehicleToRemove = null
      if (idx !== -1) {
        vehicleToRemove = activeCars.value[idx]
        activeCars.value.splice(idx, 1)
      }

      // 2. 從 Store 移除
      store.removeVehicle(vehicleId)

      // ✨ 【新增】從 broadcaster 取消註冊
      if (vehicleToRemove) {
        broadcaster.unregister(vehicleToRemove)
        console.log(`🚫 [${vehicleToRemove.id}] 已從 VehicleEventBroadcaster 取消註冊`)
      }

      // 3. 從 window.liveVehicles 移除
      if (window.liveVehicles) {
        const liveIdx = window.liveVehicles.findIndex((v) => v.id === vehicleId)
        if (liveIdx !== -1) {
          window.liveVehicles.splice(liveIdx, 1)
        }
      }

      console.log(`✅ [removeVehicleFromSimulation] 車輛 ${vehicleId} 已從所有列表中移除`)
    } catch (error) {
      console.error(`❌ [removeVehicleFromSimulation] 移除車輛 ${vehicleId} 時發生錯誤:`, error)
    }
  }

  /**
   * 處理車輛超出邊界的回調
   * @param {Vehicle} vehicle - 車輛實例
   */
  function handleVehicleOutOfBounds(vehicle) {
    if (!vehicle) return

    const vehicleIndex = activeCars.value.findIndex((c) => c.id === vehicle.id)

    if (vehicleIndex > -1) {
      // 從列表移除
      activeCars.value.splice(vehicleIndex, 1)

      // 從 Store 移除
      store.removeVehicle(vehicle.id)

      // ✨ 【新增】從 broadcaster 取消註冊
      broadcaster.unregister(vehicle)
      console.log(`🚫 [${vehicle.id}] 已從 VehicleEventBroadcaster 取消註冊`)

      // 從 window.liveVehicles 移除
      if (window.liveVehicles) {
        const liveIdx = window.liveVehicles.findIndex((v) => v.id === vehicle.id)
        if (liveIdx !== -1) {
          window.liveVehicles.splice(liveIdx, 1)
        }
      }

      // 🚨【確保隱藏】無論如何都要隱藏車輛元素
      if (vehicle.element) {
        gsap.set(vehicle.element, {
          autoAlpha: 0,
          pointerEvents: 'none',
        })
      }

      // ✅ 放回物件池（隱藏元素但保留在 DOM 中）
      if (vehiclePool) {
        vehiclePool.release(vehicle)
      } else {
        // 備用：如果池未初始化，直接銷毀車輛以防洩漏
        // 🚨【修復】不能只 reset，必須完全清理以移除監聽器
        if (vehicle.performCleanup && typeof vehicle.performCleanup === 'function') {
          vehicle.performCleanup().catch((e) => console.warn(`⚠️ 備用清理異常: ${e.message}`))
        } else {
          vehicle.reset(vehicle.direction, vehicle.laneNumber, vehicle.vehicleType, store)
        }
      }
    } else {
      // ⚠️ 車輛已被移除，但仍收到回調，確保隱藏
      // console.warn(`⚠️ [${vehicle?.id}] 收到 handleVehicleOutOfBounds 但車輛已不在 activeCars 中`)
      if (vehicle?.element) {
        gsap.set(vehicle.element, {
          autoAlpha: 0,
          pointerEvents: 'none',
        })
      }
    }
  }

  // ========== 車輛清理 ==========
  /**
   * 清空所有車輛
   */
  function clearAllVehicles() {
    try {
      const vehicleCount = activeCars.value.length
      console.log(`🧹 開始清空所有車輛 (共 ${vehicleCount} 輛)...`)

      // 1. 停止所有車輛的動畫並移除
      activeCars.value.forEach((vehicle) => {
        if (vehicle && vehicle.remove) {
          vehicle.remove()
        }
      })

      // 2. 清空列表
      activeCars.value = []

      // 3. 清空 window.liveVehicles
      if (window.liveVehicles) {
        window.liveVehicles = []
      }

      // 4. 重置 Store 中的車輛列表
      store.clearVehicles()

      console.log(`✅ 已清空所有車輛 (${vehicleCount} 輛)`)

      return vehicleCount
    } catch (error) {
      console.error('❌ 清空車輛時發生錯誤:', error)
      throw error
    }
  }

  /**
   * 清理車輛池（在組件卸載時調用）
   */
  function disposeVehiclePool() {
    if (vehiclePool) {
      console.log('🚀 清理 VehiclePool...')
      vehiclePool.dispose()
      vehiclePool = null
    }
    // 🚨 【移除】天氣監聽已移至 Vehicle.js
  }

  /**
   * 清理所有活躍車輛（在組件卸載時調用）
   */
  function cleanupActiveVehicles() {
    activeCars.value.forEach((vehicle) => {
      if (vehicle && vehicle.remove) {
        vehicle.remove()
      }
    })
    activeCars.value = []
  }

  // ========== 返回值 ==========
  return {
    // 狀態
    activeCars,

    // 初始化
    initVehiclePool,

    // 車輛創建
    createVehicleWithPosition,

    // 車輛移除
    removeVehicleFromSimulation,
    handleVehicleOutOfBounds,

    // 車輛清理
    clearAllVehicles,
    disposeVehiclePool,
    cleanupActiveVehicles,

    // 內部狀態（供調試）
    getVehiclePool: () => vehiclePool,
  }
}
