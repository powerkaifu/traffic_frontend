/**
 * PerformanceOptimizer.js - 完整的性能優化系統
 *
 * 🎯 核心功能：
 * 1. 實時性能監控（FPS、動畫數、記憶體）
 * 2. 自動性能優化（分級響應）
 * 3. GSAP 動畫管理（清理、延遲、降速）
 * 4. 視口優化（視口外車輛減速、移除）
 * 5. 碰撞檢測優化（頻率限制）
 * 6. 生成管理（動態限制、暫停）
 */

import { gsap } from 'gsap'

export class PerformanceOptimizer {
  constructor(trafficGenerator, trafficController) {
    this.trafficGenerator = trafficGenerator
    this.trafficController = trafficController

    // ==================== 性能指標 ====================
    this.metrics = {
      fps: 60,
      animationCount: 0,
      vehicleCount: 0,
      memoryUsage: 0,
      lastFrameTime: Date.now(),
      frameCount: 0,
      totalFrameTime: 0,
    }

    // ==================== 性能狀態 ====================
    this.performanceState = {
      level: 'normal', // 'normal' | 'warning' | 'critical'
      isOptimizing: false,
      lastOptimizationTime: Date.now(),
      optimizationCount: 0,
    }

    // ==================== 優化參數 ====================
    this.optimizationConfig = {
      // FPS 閾值
      fpsThresholds: {
        warning: 30, // FPS < 30 = 警告
        critical: 15, // FPS < 15 = 危機
      },

      // 動畫數量限制
      animationLimits: {
        warning: 200, // 超過200個動畫 = 警告
        critical: 300, // 超過300個動畫 = 危機
        targetAfterCleanup: 150, // 清理後的目標數量
      },

      // 記憶體限制（MB）
      memoryLimits: {
        warning: 300,
        critical: 500,
      },

      // 優化間隔（毫秒）
      checkInterval: 1000,
      optimizationCooldown: 500,
    }

    // ==================== 管理對象 ====================
    this.monitoring = {
      interval: null,
      lastOptimization: 0,
      optimizationInProgress: false,
    }

    // ==================== 視口管理 ====================
    this.viewportManager = {
      viewportBuffer: 200, // 視口外多少px才移除
      slowDownBuffer: 100, // 視口外多少px才減速
      slowDownTimeScale: 0.25, // 減速到多少倍速
    }

    // ==================== 啟動監控 ====================
    this.startMonitoring()
  }

  // ==================== 監控系統 ====================

  /**
   * 啟動性能監控
   */
  startMonitoring() {
    if (this.monitoring.interval) {
      clearInterval(this.monitoring.interval)
    }

    this.monitoring.interval = setInterval(() => {
      this._updateMetrics()
      this._checkPerformanceAndOptimize()
      this._logPerformanceStatus()
    }, this.optimizationConfig.checkInterval)

    console.log('✅ 性能監控已啟動')
  }

  /**
   * 停止性能監控
   */
  stopMonitoring() {
    if (this.monitoring.interval) {
      clearInterval(this.monitoring.interval)
      this.monitoring.interval = null
    }
    console.log('⏹️ 性能監控已停止')
  }

  /**
   * 更新性能指標
   */
  _updateMetrics() {
    const now = Date.now()
    const deltaTime = now - this.metrics.lastFrameTime

    // 計算 FPS
    if (deltaTime > 0) {
      this.metrics.fps = Math.round(1000 / deltaTime)
    }

    // 計數 GSAP 動畫
    this.metrics.animationCount = gsap.getTweens().length

    // 計數活躍車輛（添加安全檢查）
    this.metrics.vehicleCount =
      window.liveVehicles && Array.isArray(window.liveVehicles) ? window.liveVehicles.length : 0

    // 估算記憶體使用
    if (performance.memory) {
      this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576)
    }

    this.metrics.lastFrameTime = now
  }

  /**
   * 檢查性能並執行優化
   */
  _checkPerformanceAndOptimize() {
    const { fps, animationCount, memoryUsage } = this.metrics
    const now = Date.now()

    // 冷卻期檢查
    if (now - this.monitoring.lastOptimization < this.optimizationConfig.optimizationCooldown) {
      return
    }

    // 評估性能等級
    let newLevel = 'normal'
    if (
      fps < this.optimizationConfig.fpsThresholds.critical ||
      animationCount > this.optimizationConfig.animationLimits.critical ||
      memoryUsage > this.optimizationConfig.memoryLimits.critical
    ) {
      newLevel = 'critical'
    } else if (
      fps < this.optimizationConfig.fpsThresholds.warning ||
      animationCount > this.optimizationConfig.animationLimits.warning ||
      memoryUsage > this.optimizationConfig.memoryLimits.warning
    ) {
      newLevel = 'warning'
    }

    // 如果性能等級改變，執行優化
    if (newLevel !== this.performanceState.level) {
      this.performanceState.level = newLevel
      this._executeOptimization(newLevel)
      this.monitoring.lastOptimization = now
      this.performanceState.optimizationCount++
    }
  }

  /**
   * 執行相應的優化策略
   */
  _executeOptimization(level) {
    console.log(`🔧 [性能優化] 級別: ${level.toUpperCase()}`)

    switch (level) {
      case 'normal':
        console.log('✅ 性能正常，無需優化')
        break

      case 'warning':
        console.log('⚠️ [性能警告] 執行常規優化')
        this._performWarningLevelOptimization()
        break

      case 'critical':
        console.log('🚨 [性能危機] 執行緊急優化')
        this._performCriticalLevelOptimization()
        break
    }
  }

  /**
   * 警告級別優化
   */
  _performWarningLevelOptimization() {
    // 1. 清理多餘動畫
    this._cleanupExcessAnimations()

    // 2. 減速遠距離車輛
    this._applyViewportBasedOptimization()

    // 3. 增加碰撞檢測間隔
    this._increaseCollisionCheckInterval(1.5)

    // 4. 略微增加生成間隔
    if (this.trafficGenerator) {
      this.trafficGenerator.maxLiveVehicles = Math.round(this.trafficGenerator.maxLiveVehicles * 0.9)
      console.log(`📉 已降低最大車輛數為: ${this.trafficGenerator.maxLiveVehicles}`)
    }
  }

  /**
   * 危機級別優化
   */
  _performCriticalLevelOptimization() {
    // 1. 強制停止車輛生成
    if (this.trafficGenerator && this.trafficGenerator.isRunning) {
      this.trafficGenerator.stop()
      console.log('🛑 已停止車輛生成')
    }

    // 2. 移除視口外的所有車輛
    this._removeOffscreenVehicles()

    // 3. 殺死超過一半的舊動畫
    this._killOldAnimations()

    // 4. 禁用碰撞檢測
    this._disableCollisionDetection()

    // 計劃恢復
    setTimeout(() => {
      if (this.trafficGenerator && !this.trafficGenerator.isRunning) {
        this.trafficGenerator.start()
        console.log('✅ 已恢復車輛生成')
      }
      this._enableCollisionDetection()
    }, 2000)
  }

  // ==================== 動畫管理 ====================

  /**
   * 清理多餘動畫
   */
  _cleanupExcessAnimations() {
    const tweens = gsap.getTweens()
    const targetCount = this.optimizationConfig.animationLimits.targetAfterCleanup
    const toRemove = tweens.length - targetCount

    if (toRemove > 0) {
      // 只移除已完成的動畫
      let removed = 0
      for (let i = tweens.length - 1; i >= 0 && removed < toRemove; i--) {
        const tween = tweens[i]
        if (tween && tween.progress() >= 1) {
          tween.kill()
          removed++
        }
      }

      // 如果完成的動畫不夠，移除最舊的
      if (removed < toRemove) {
        for (let i = 0; i < toRemove - removed; i++) {
          if (tweens[i] && tweens[i].kill) {
            tweens[i].kill()
          }
        }
      }

      console.log(`🧹 已清理 ${toRemove} 個舊動畫，當前動畫數: ${gsap.getTweens().length}`)
    }
  }

  /**
   * 殺死超過一半的舊動畫（危機模式）
   */
  _killOldAnimations() {
    const tweens = gsap.getTweens()
    const toKill = Math.round(tweens.length / 2)

    for (let i = 0; i < toKill; i++) {
      if (tweens[i] && tweens[i].kill) {
        tweens[i].kill()
      }
    }

    console.log(`💀 緊急清理：已殺死 ${toKill} 個動畫，剩餘 ${gsap.getTweens().length}`)
  }

  // ==================== 視口優化 ====================

  /**
   * 視口基礎優化：減速或移除視口外的車輛
   * ⚡ 優化：提前計算 viewport 尺寸，減少重複查詢
   */
  _applyViewportBasedOptimization() {
    if (!window.liveVehicles || window.liveVehicles.length === 0) return

    const viewportBuffer = this.viewportManager.viewportBuffer
    const slowDownBuffer = this.viewportManager.slowDownBuffer
    const slowDownTimeScale = this.viewportManager.slowDownTimeScale
    const innerHeight = window.innerHeight
    const innerWidth = window.innerWidth

    window.liveVehicles.forEach((vehicle) => {
      if (!vehicle.element) return

      // ⚡ getBoundingClientRect 是必要操作，但將 viewport 尺寸提前計算
      const rect = vehicle.element.getBoundingClientRect()

      // 檢查是否在視口外
      const isOffscreen =
        rect.bottom < -viewportBuffer ||
        rect.top > innerHeight + viewportBuffer ||
        rect.right < -viewportBuffer ||
        rect.left > innerWidth + viewportBuffer

      // 檢查是否在減速區域
      const isInSlowDownZone =
        rect.bottom < -slowDownBuffer ||
        rect.top > innerHeight + slowDownBuffer ||
        rect.right < -slowDownBuffer ||
        rect.left > innerWidth + slowDownBuffer

      if (isOffscreen) {
        // 移除視口外的車輛
        if (vehicle.remove) {
          vehicle.remove()
        }
      } else if (isInSlowDownZone && vehicle.movementTimeline) {
        // 減速
        if (vehicle.movementTimeline.timeScale() !== slowDownTimeScale) {
          gsap.to(vehicle.movementTimeline, {
            timeScale: slowDownTimeScale,
            duration: 0.3,
          })
        }
      } else if (vehicle.movementTimeline) {
        // 恢復正常速度
        const originalTimeScale = vehicle.originalTimeScale || 1
        if (Math.abs(vehicle.movementTimeline.timeScale() - originalTimeScale) > 0.1) {
          gsap.to(vehicle.movementTimeline, {
            timeScale: originalTimeScale,
            duration: 0.3,
          })
        }
      }
    })
  }

  /**
   * 移除所有視口外的車輛
   */
  _removeOffscreenVehicles() {
    if (!window.liveVehicles || window.liveVehicles.length === 0) return

    const vehiclesToRemove = window.liveVehicles.filter((vehicle) => {
      if (!vehicle || !vehicle.element) return true

      const rect = vehicle.element.getBoundingClientRect()
      return (
        rect.bottom < -100 ||
        rect.top > window.innerHeight + 100 ||
        rect.right < -100 ||
        rect.left > window.innerWidth + 100
      )
    })

    vehiclesToRemove.forEach((vehicle) => {
      if (vehicle.remove) {
        vehicle.remove()
      }
    })

    console.log(`🗑️ 已移除 ${vehiclesToRemove.length} 輛視口外車輛，剩餘 ${window.liveVehicles.length} 輛`)
  }

  // ==================== 碰撞檢測優化 ====================

  /**
   * 增加碰撞檢測間隔
   */
  _increaseCollisionCheckInterval(multiplier = 1.5) {
    if (!window.liveVehicles || window.liveVehicles.length === 0) return

    window.liveVehicles.forEach((vehicle) => {
      if (vehicle && vehicle.collisionController) {
        const originalInterval = vehicle.collisionController.collisionCheckInterval
        vehicle.collisionController.checkInterval = Math.round(originalInterval * multiplier)
      }
    })
    console.log(`⏱️ 已增加碰撞檢測間隔 ${multiplier}x`)
  }

  /**
   * 禁用碰撞檢測
   */
  _disableCollisionDetection() {
    if (!window.liveVehicles || window.liveVehicles.length === 0) return

    window.liveVehicles.forEach((vehicle) => {
      if (vehicle && vehicle.collisionController) {
        vehicle.collisionController.enabled = false
      }
    })
    console.log('🚫 已禁用碰撞檢測')
  }

  /**
   * 啟用碰撞檢測
   */
  _enableCollisionDetection() {
    if (!window.liveVehicles || window.liveVehicles.length === 0) return

    window.liveVehicles.forEach((vehicle) => {
      if (vehicle && vehicle.collisionController) {
        vehicle.collisionController.enabled = true
      }
    })
    console.log('✅ 已啟用碰撞檢測')
  }

  // ==================== 診斷和日誌 ====================

  /**
   * 記錄性能狀態
   */
  _logPerformanceStatus() {
    const { fps, animationCount, vehicleCount, memoryUsage } = this.metrics
    const level = this.performanceState.level

    // 只在性能改變或每10次檢查時記錄
    if (this.performanceState.optimizationCount % 10 === 0) {
      console.log(
        `📊 [性能狀態] FPS: ${fps}, 動畫: ${animationCount}, 車輛: ${vehicleCount}, 記憶體: ${memoryUsage}MB, 級別: ${level}`,
      )
    }
  }

  /**
   * 獲取性能診斷資訊
   */
  getDiagnostics() {
    return {
      metrics: { ...this.metrics },
      state: { ...this.performanceState },
      tweens: gsap.getTweens().length,
      vehicles: window.liveVehicles ? window.liveVehicles.length : 0,
    }
  }

  /**
   * 重置優化狀態
   */
  reset() {
    this.performanceState.level = 'normal'
    this.performanceState.isOptimizing = false
    this.performanceState.optimizationCount = 0
  }

  /**
   * ✅ 新增：完整清理方法（銷毀時調用）
   * 確保記憶體正確釋放，防止洩漏
   */
  destroy() {
    // 停止監控
    this.stopMonitoring()

    // 清空所有引用
    this.trafficGenerator = null
    this.trafficController = null

    // 清空所有狀態和配置
    this.metrics = null
    this.performanceState = null
    this.optimizationConfig = null
    this.monitoring = null
    this.viewportManager = null

    console.log('🧹 PerformanceOptimizer 已完全清理')
  }
}

export default PerformanceOptimizer
