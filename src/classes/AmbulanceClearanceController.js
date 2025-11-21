/**
 * AmbulanceClearanceController.js - 救護車路權清除控制器
 *
 * 職責：
 * - 監測所有救護車位置
 * - 判斷救護車通行階段（預警/清除/通過/恢復）
 * - 協調所有受影響車輛的速度調整
 * - 管理路權清除的完整生命週期
 *
 * 設計模式：
 * - Strategy Pattern：不同階段使用不同的處理策略
 * - Observer Pattern：監聽救護車位置變化
 * - Command Pattern：封裝車輛控制指令
 */

import {
  AMBULANCE_STAGES,
  SPEED_MULTIPLIERS,
  DISTANCE_THRESHOLDS,
  INFLUENCE_RANGE,
  RECOVERY_TIMING,
  DEBUG_CONFIG,
  getOppositeDirection,
  getPerpendicularDirections,
} from './config/ambulanceConfig.js'
import { logger } from '../utils/logger.js'

export class AmbulanceClearanceController {
  /**
   * 構造函數
   * @param {Object} trafficController - 交通燈控制器
   * @param {Object} simulationStore - 模擬狀態存儲
   */
  constructor(trafficController, simulationStore = null) {
    this.trafficController = trafficController
    this.simulationStore = simulationStore

    // 追蹤所有活躍救護車的狀態
    // key: ambulanceId, value: { stage, lastStage, affectedVehicles }
    this.activeAmbulances = new Map()

    // 受影響車輛的恢復計時器
    // key: vehicleId, value: timeoutId
    this.recoveryTimers = new Map()
  }

  /**
   * 主執行方法（由 RAF 循環調用）
   * @param {Array} allVehicles - 所有車輛陣列
   */
  execute(allVehicles) {
    if (!allVehicles || allVehicles.length === 0) return

    // 🚑 篩選出所有救護車
    const ambulances = allVehicles.filter((v) => v.vehicleType === 'ambulance' && !v.isRemoved)

    // 🚨 【多救護車支持】收集所有車輛的速度要求
    // key: vehicleId, value: { minMultiplier, shouldStop, affectedBy: Set<ambulanceId> }
    const vehicleSpeedRequirements = new Map()

    // 處理每輛救護車，收集速度要求（不立即應用）
    ambulances.forEach((ambulance) => {
      this._processAmbulance(ambulance, allVehicles, vehicleSpeedRequirements)
    })

    // 🚨 【關鍵修復】統一應用最嚴格的速度限制
    this._applyStrictestSpeedLimits(allVehicles, vehicleSpeedRequirements)

    // 清理已移除的救護車狀態
    this._cleanupRemovedAmbulances(ambulances)
  }

  /**
   * 處理單輛救護車
   * @private
   * @param {Object} vehicleSpeedRequirements - 車輛速度要求收集器
   */
  _processAmbulance(ambulance, allVehicles, vehicleSpeedRequirements) {
    const ambulanceId = ambulance.id

    // 判斷當前階段
    const currentStage = this._determineStage(ambulance)

    // 獲取或創建救護車狀態記錄
    let ambulanceState = this.activeAmbulances.get(ambulanceId)
    if (!ambulanceState) {
      ambulanceState = {
        stage: currentStage,
        lastStage: null,
        affectedVehicles: new Set(),
        hasRecovered: false, // 🚨 【新增】標記是否已執行過恢復
        hasExtendedRedLight: false, // 🚑 【新增】標記是否已延長紅燈
      }
      this.activeAmbulances.set(ambulanceId, ambulanceState)
    }

    // 檢查階段是否變化
    const stageChanged = ambulanceState.stage !== currentStage
    if (stageChanged) {
      if (DEBUG_CONFIG.LOG_STAGE_CHANGES) {
        logger.log(`🚑 [${ambulanceId}] 階段變化: ${ambulanceState.stage} → ${currentStage}`)
      }
      ambulanceState.lastStage = ambulanceState.stage
      ambulanceState.stage = currentStage
    }

    // 🚨 【修復】如果已經執行過恢復，不再執行任何清除邏輯
    // 這防止車輛在恢復後又被重新減速
    if (ambulanceState.hasRecovered) {
      // 只在完全離開追蹤範圍後才清理狀態
      if (currentStage === 'RECOVERY') {
        ambulanceState.canRemove = true
      }
      return
    }

    // 🚑 【紅燈延長】當救護車進入路口時，延長紅燈時間
    if (currentStage === 'TRANSIT' && !ambulanceState.hasExtendedRedLight) {
      if (this.trafficController && this.trafficController.extendAllRedTime) {
        this.trafficController.extendAllRedTime(5000) // 延長5秒
        ambulanceState.hasExtendedRedLight = true // 標記已延長，避免重複
        if (DEBUG_CONFIG.LOG_STAGE_CHANGES) {
          logger.log(`🚑 [${ambulanceId}] 進入路口，延長紅燈 5 秒`)
        }
      }
    }

    // 根據階段執行相應處理（改為收集速度要求，不立即應用）
    switch (currentStage) {
      case 'WARNING':
        this._handleWarningStage(ambulance, allVehicles, ambulanceState)
        break
      case 'CLEARANCE':
        this._handleClearanceStage(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements)
        break
      case 'TRANSIT':
        this._handleClearanceStage(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements) // 通過階段：維持清空狀態，繼續執行清除邏輯
        break
      case 'RECOVERY':
        // 🚨 【修復】只在第一次進入恢復階段時執行恢復
        if (!ambulanceState.hasRecovered) {
          this._handleRecoveryStage(ambulance, allVehicles, ambulanceState)
          ambulanceState.hasRecovered = true // 標記已恢復
        }
        ambulanceState.canRemove = true
        break
      default:
        // 未知階段，不處理
        break
    }
  }

  /**
   * 判斷救護車當前所處階段
   * @private
   * @param {Object} ambulance - 救護車實例
   * @returns {string} 'WARNING' | 'CLEARANCE' | 'TRANSIT' | 'RECOVERY'
   */
  _determineStage(ambulance) {
    const distance = this._getDistanceToIntersection(ambulance)

    if (distance > AMBULANCE_STAGES.WARNING_DISTANCE) {
      return 'WARNING'
    } else if (distance > AMBULANCE_STAGES.CLEARANCE_DISTANCE) {
      return 'CLEARANCE'
    } else if (distance > AMBULANCE_STAGES.RECOVERY_DISTANCE) {
      return 'TRANSIT'
    } else {
      return 'RECOVERY'
    }
  }

  /**
   * 計算救護車到路口中心停止線的方向性距離
   * @private
   * @param {Object} ambulance - 救護車實例
   * @returns {number} 距離（像素），正值表示未到達，負值表示已通過
   */
  _getDistanceToIntersection(ambulance) {
    const stopLine = ambulance.stopLineController?.getStopLinePosition()
    if (!stopLine) return Infinity

    const currentPos = ambulance.getCurrentPosition()
    if (!currentPos) return Infinity

    // 方向性距離計算
    switch (ambulance.direction) {
      case 'east':
        return stopLine.x - currentPos.x
      case 'west':
        return currentPos.x - stopLine.x
      case 'south':
        return stopLine.y - currentPos.y
      case 'north':
        return currentPos.y - stopLine.y
      default:
        return Infinity
    }
  }

  /**
   * 處理預警階段
   * @private
   */
  _handleWarningStage(ambulance, allVehicles, ambulanceState) {
    // 預警階段：僅標記衝突車道，不執行實際操作
    // 可在此添加視覺預警效果（如路口閃爍警示燈）
    if (DEBUG_CONFIG.LOG_STAGE_CHANGES && !ambulanceState.lastStage) {
      logger.log(`🚨 [${ambulance.id}] 進入預警階段，準備清空路口`)
    }
  }

  /**
   * 處理路權清除階段
   * @private
   * @param {Object} vehicleSpeedRequirements - 車輛速度要求收集器
   */
  _handleClearanceStage(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements) {
    // 分類處理不同方向的車輛（收集速度要求，不立即應用）
    this._handleOpposingVehicles(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements)
    this._handlePerpendicularVehicles(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements)
    this._handleSameDirectionVehicles(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements)
  }

  /**
   * 處理通過階段
   * @private
   */
  _handleTransitStage(ambulance, allVehicles, ambulanceState) {
    // 通過階段：維持清空狀態，繼續執行清除邏輯
    this._handleClearanceStage(ambulance, allVehicles, ambulanceState)
  }

  /**
   * 處理恢復階段
   * @private
   */
  _handleRecoveryStage(ambulance, allVehicles, ambulanceState) {
    // 恢復階段：漸進式恢復所有受影響車輛的速度
    const affectedVehicles = Array.from(ambulanceState.affectedVehicles)
      .map((id) => allVehicles.find((v) => v.id === id))
      .filter((v) => v && !v.isRemoved)

    if (affectedVehicles.length > 0 && DEBUG_CONFIG.LOG_AFFECTED_VEHICLES) {
      logger.log(`🔄 [${ambulance.id}] 開始恢復 ${affectedVehicles.length} 輛受影響車輛`)
    }

    this._gradualRecovery(affectedVehicles)

    // 清空受影響車輛記錄
    ambulanceState.affectedVehicles.clear()
  }

  /**
   * 處理對向車輛（與救護車反向同軸線）
   * @private
   * @param {Object} vehicleSpeedRequirements - 車輛速度要求收集器
   */
  _handleOpposingVehicles(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements) {
    const oppositeDirection = getOppositeDirection(ambulance.direction)

    // 🚨 三階段判定：車道上 (A/B) vs 路口中央 (C)
    const distanceToStopLine = this._getDistanceToIntersection(ambulance)
    const isInIntersection =
      distanceToStopLine <= INFLUENCE_RANGE.INTERSECTION_BOUNDS.ENTRY_THRESHOLD &&
      distanceToStopLine > INFLUENCE_RANGE.INTERSECTION_BOUNDS.EXIT_THRESHOLD
    const influenceRange = isInIntersection
      ? INFLUENCE_RANGE.IN_INTERSECTION.OPPOSING // C: 路口中央 - 大範圍
      : INFLUENCE_RANGE.ON_LANE.OPPOSING // A/B: 車道上 - 小範圍

    allVehicles.forEach((vehicle) => {
      if (vehicle.direction !== oppositeDirection || vehicle.isRemoved || vehicle.id === ambulance.id) {
        return
      }

      // 🚨 【關鍵修復】檢查車輛距離救護車的實際距離
      const distanceToAmbulance = this._getDistanceBetweenVehicles(ambulance, vehicle)
      if (distanceToAmbulance > influenceRange) {
        return // 距離太遠，不影響
      }

      const distanceToIntersection = vehicle.getDistanceToIntersectionCenter?.() ?? Infinity

      // 根據距離收集速度要求（不立即應用）
      if (distanceToIntersection < DISTANCE_THRESHOLDS.OPPOSING_EMERGENCY_THRESHOLD) {
        // 路口內：緊急剎車
        this._collectSpeedRequirement(
          vehicle,
          SPEED_MULTIPLIERS.OPPOSING_EMERGENCY_BRAKE,
          ambulance.id,
          ambulanceState,
          vehicleSpeedRequirements,
        )
      } else if (distanceToIntersection < DISTANCE_THRESHOLDS.OPPOSING_SLOW_THRESHOLD) {
        // 接近路口：減速
        this._collectSpeedRequirement(
          vehicle,
          SPEED_MULTIPLIERS.OPPOSING_SLOW,
          ambulance.id,
          ambulanceState,
          vehicleSpeedRequirements,
        )
      }
    })
  }

  /**
   * 處理垂直車道車輛（與救護車垂直方向）
   * @private
   * @param {Object} vehicleSpeedRequirements - 車輛速度要求收集器
   */
  _handlePerpendicularVehicles(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements) {
    const perpendicularDirections = getPerpendicularDirections(ambulance.direction)

    // 🚨 三階段判定：車道上 (A/B) vs 路口中央 (C)
    const distanceToStopLine = this._getDistanceToIntersection(ambulance)
    const isInIntersection =
      distanceToStopLine <= INFLUENCE_RANGE.INTERSECTION_BOUNDS.ENTRY_THRESHOLD &&
      distanceToStopLine > INFLUENCE_RANGE.INTERSECTION_BOUNDS.EXIT_THRESHOLD
    const influenceRange = isInIntersection
      ? INFLUENCE_RANGE.IN_INTERSECTION.PERPENDICULAR // C: 路口中央 - 大範圍
      : INFLUENCE_RANGE.ON_LANE.PERPENDICULAR // A/B: 車道上 - 小範圍

    allVehicles.forEach((vehicle) => {
      if (!perpendicularDirections.includes(vehicle.direction) || vehicle.isRemoved || vehicle.id === ambulance.id) {
        return
      }

      // 🚨 【關鍵修復】檢查車輛距離救護車的實際距離
      const distanceToAmbulance = this._getDistanceBetweenVehicles(ambulance, vehicle)
      if (distanceToAmbulance > influenceRange) {
        return // 距離太遠，不影響
      }

      const distanceToIntersection = vehicle.getDistanceToIntersectionCenter?.() ?? Infinity
      const lightState = this.trafficController?.getCurrentLightState(vehicle.direction)

      // 只處理綠燈行進中的車輛
      if (lightState === 'green' || lightState === 'leftGreen') {
        if (distanceToIntersection < DISTANCE_THRESHOLDS.PERPENDICULAR_ACCELERATE_THRESHOLD) {
          // 距離很近：加速通過以清空路口（實際已禁用，閾值=0）
          this._collectSpeedRequirement(
            vehicle,
            SPEED_MULTIPLIERS.PERPENDICULAR_ACCELERATE,
            ambulance.id,
            ambulanceState,
            vehicleSpeedRequirements,
          )
        } else if (distanceToIntersection < DISTANCE_THRESHOLDS.PERPENDICULAR_STOP_THRESHOLD) {
          // 中距離：緊急停車
          this._collectStopRequirement(vehicle, ambulance.id, ambulanceState, vehicleSpeedRequirements)
        } else {
          // 遠距離：減速觀望
          this._collectSpeedRequirement(
            vehicle,
            SPEED_MULTIPLIERS.PERPENDICULAR_SLOW,
            ambulance.id,
            ambulanceState,
            vehicleSpeedRequirements,
          )
        }
      }
      // 紅燈車輛無需處理（已停止）
    })
  }

  /**
   * 處理同向車輛（與救護車同方向）
   * @private
   * @param {Object} vehicleSpeedRequirements - 車輛速度要求收集器
   */
  _handleSameDirectionVehicles(ambulance, allVehicles, ambulanceState, vehicleSpeedRequirements) {
    // 🚨 三階段判定：車道上 (A/B) vs 路口中央 (C)
    const distanceToStopLine = this._getDistanceToIntersection(ambulance)
    const isInIntersection =
      distanceToStopLine <= INFLUENCE_RANGE.INTERSECTION_BOUNDS.ENTRY_THRESHOLD &&
      distanceToStopLine > INFLUENCE_RANGE.INTERSECTION_BOUNDS.EXIT_THRESHOLD
    const influenceRange = isInIntersection
      ? INFLUENCE_RANGE.IN_INTERSECTION.SAME_DIRECTION // C: 路口中央 - 大範圍
      : INFLUENCE_RANGE.ON_LANE.SAME_DIRECTION // A/B: 車道上 - 小範圍

    allVehicles.forEach((vehicle) => {
      if (vehicle.direction !== ambulance.direction || vehicle.isRemoved || vehicle.id === ambulance.id) {
        return
      }

      // 判斷是否在救護車前方
      const isAhead = this._isVehicleAhead(ambulance, vehicle)
      if (isAhead) {
        // 🚨 【關鍵修復】檢查車輛距離救護車的實際距離
        const distanceToAmbulance = this._getDistanceBetweenVehicles(ambulance, vehicle)
        if (distanceToAmbulance > influenceRange) {
          return // 距離太遠，不影響
        }

        // 前方車輛：減速靠邊避讓
        this._collectSpeedRequirement(
          vehicle,
          SPEED_MULTIPLIERS.SAME_DIRECTION_YIELD,
          ambulance.id,
          ambulanceState,
          vehicleSpeedRequirements,
        )
      }
    })
  }

  /**
   * 判斷車輛是否在救護車前方
   * @private
   */
  _isVehicleAhead(ambulance, vehicle) {
    const ambPos = ambulance.getCurrentPosition()
    const vehPos = vehicle.getCurrentPosition()

    if (!ambPos || !vehPos) return false

    switch (ambulance.direction) {
      case 'east':
        return vehPos.x > ambPos.x
      case 'west':
        return vehPos.x < ambPos.x
      case 'south':
        return vehPos.y > ambPos.y
      case 'north':
        return vehPos.y < ambPos.y
      default:
        return false
    }
  }

  /**
   * 計算兩車之間的實際距離（歐幾里得距離）
   * @private
   * @param {Object} ambulance - 救護車
   * @param {Object} vehicle - 普通車輛
   * @returns {number} 距離（像素）
   */
  _getDistanceBetweenVehicles(ambulance, vehicle) {
    const ambPos = ambulance.getCurrentPosition()
    const vehPos = vehicle.getCurrentPosition()

    if (!ambPos || !vehPos) return Infinity

    const dx = vehPos.x - ambPos.x
    const dy = vehPos.y - ambPos.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🚨 【多救護車支持】速度要求收集與應用方法
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * 收集車輛速度要求（不立即應用）
   * @private
   */
  _collectSpeedRequirement(vehicle, multiplier, ambulanceId, ambulanceState, vehicleSpeedRequirements) {
    if (!vehicleSpeedRequirements.has(vehicle.id)) {
      vehicleSpeedRequirements.set(vehicle.id, {
        minMultiplier: multiplier,
        shouldStop: false,
        affectedBy: new Set([ambulanceId]),
      })
    } else {
      const req = vehicleSpeedRequirements.get(vehicle.id)
      // 取最嚴格的速度限制（最小值）
      req.minMultiplier = Math.min(req.minMultiplier, multiplier)
      req.affectedBy.add(ambulanceId)
    }

    // 同時記錄到救護車的受影響車輛列表
    ambulanceState.affectedVehicles.add(vehicle.id)
  }

  /**
   * 收集車輛停止要求（不立即應用）
   * @private
   */
  _collectStopRequirement(vehicle, ambulanceId, ambulanceState, vehicleSpeedRequirements) {
    if (!vehicleSpeedRequirements.has(vehicle.id)) {
      vehicleSpeedRequirements.set(vehicle.id, {
        minMultiplier: 0,
        shouldStop: true,
        affectedBy: new Set([ambulanceId]),
      })
    } else {
      const req = vehicleSpeedRequirements.get(vehicle.id)
      // 停止優先於任何速度調整
      req.shouldStop = true
      req.minMultiplier = 0
      req.affectedBy.add(ambulanceId)
    }

    // 同時記錄到救護車的受影響車輛列表
    ambulanceState.affectedVehicles.add(vehicle.id)
  }

  /**
   * 統一應用最嚴格的速度限制
   * 🚨 這是多救護車支持的關鍵方法
   * @private
   */
  _applyStrictestSpeedLimits(allVehicles, vehicleSpeedRequirements) {
    for (const [vehicleId, requirement] of vehicleSpeedRequirements.entries()) {
      const vehicle = allVehicles.find((v) => v.id === vehicleId)
      if (!vehicle || vehicle.isRemoved) continue

      if (requirement.shouldStop) {
        // 需要緊急停止
        if (vehicle.emergencyStop) {
          vehicle.emergencyStop()
          if (DEBUG_CONFIG.LOG_SPEED_ADJUSTMENTS) {
            logger.debug(
              'Ambulance',
              `[${vehicle.id}] 緊急停止 (受 ${Array.from(requirement.affectedBy).join(', ')} 影響)`,
            )
          }
        }
      } else {
        // 設置速度倍數
        if (vehicle.setEmergencyMultiplier) {
          vehicle.setEmergencyMultiplier(requirement.minMultiplier)
          if (DEBUG_CONFIG.LOG_SPEED_ADJUSTMENTS) {
            logger.debug(
              'Ambulance',
              `[${vehicle.id}] 速度調整至 ${requirement.minMultiplier}x (受 ${Array.from(requirement.affectedBy).join(', ')} 影響)`,
            )
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════

  /**
   * 設置車輛速度倍數
   * @private
   */
  _setVehicleSpeed(vehicle, multiplier, ambulanceState) {
    if (vehicle.setEmergencyMultiplier) {
      vehicle.setEmergencyMultiplier(multiplier)
      ambulanceState.affectedVehicles.add(vehicle.id)

      if (DEBUG_CONFIG.LOG_SPEED_ADJUSTMENTS) {
        logger.debug('Ambulance', `[${vehicle.id}] 速度調整至 ${multiplier}x`)
      }
    }
  }

  /**
   * 緊急停止車輛
   * @private
   */
  _emergencyStopVehicle(vehicle, ambulanceState) {
    if (vehicle.emergencyStop) {
      vehicle.emergencyStop()
      ambulanceState.affectedVehicles.add(vehicle.id)

      if (DEBUG_CONFIG.LOG_SPEED_ADJUSTMENTS) {
        logger.debug('Ambulance', `[${vehicle.id}] 緊急停止`)
      }
    }
  }

  /**
   * 漸進式恢復車輛速度
   * @private
   */
  _gradualRecovery(affectedVehicles) {
    const steps = [
      { multiplier: SPEED_MULTIPLIERS.RECOVERY_STEP_1, delay: 0 },
      { multiplier: SPEED_MULTIPLIERS.RECOVERY_STEP_2, delay: RECOVERY_TIMING.STEP_DELAY_MS },
      { multiplier: SPEED_MULTIPLIERS.RECOVERY_STEP_3, delay: RECOVERY_TIMING.STEP_DELAY_MS * 2 },
    ]

    affectedVehicles.forEach((vehicle) => {
      // 清除之前的恢復計時器
      if (this.recoveryTimers.has(vehicle.id)) {
        clearTimeout(this.recoveryTimers.get(vehicle.id))
      }

      // 🚨 【修復】如果車輛是緊急停止的，立即恢復 timeline 運行
      // 不要等到最後一步才恢復，否則車輛會一直停止不動
      if (vehicle.isEmergencyStopped && vehicle.movementTimeline) {
        vehicle.movementTimeline.play()
        vehicle.isEmergencyStopped = false
        if (DEBUG_CONFIG.LOG_SPEED_ADJUSTMENTS) {
          logger.debug('Ambulance', `[${vehicle.id}] 恢復 timeline 運行`)
        }
      }

      // 執行分步恢復速度
      steps.forEach((step, index) => {
        const timerId = setTimeout(() => {
          if (!vehicle.isRemoved && vehicle.setEmergencyMultiplier) {
            vehicle.setEmergencyMultiplier(step.multiplier)

            if (DEBUG_CONFIG.LOG_SPEED_ADJUSTMENTS) {
              logger.debug('Ambulance', `[${vehicle.id}] 恢復步驟 ${index + 1}/3: ${step.multiplier}x`)
            }
          }

          // 最後一步：移除計時器記錄
          if (step.multiplier === 1.0) {
            this.recoveryTimers.delete(vehicle.id)
          }
        }, step.delay)

        if (step.delay > 0) {
          this.recoveryTimers.set(vehicle.id, timerId)
        }
      })
    })
  }

  /**
   * 清理已移除的救護車狀態
   * @private
   */
  _cleanupRemovedAmbulances(currentAmbulances) {
    const currentIds = new Set(currentAmbulances.map((a) => a.id))

    for (const [ambulanceId, state] of this.activeAmbulances.entries()) {
      // 如果救護車不在當前列表中，或標記為可移除，則清理
      if (!currentIds.has(ambulanceId) || state.canRemove) {
        this.activeAmbulances.delete(ambulanceId)
        if (DEBUG_CONFIG.LOG_STAGE_CHANGES) {
          logger.log(`🧹 [${ambulanceId}] 清理狀態記錄`)
        }
      }
    }
  }

  /**
   * 停止控制器並清理資源
   */
  destroy() {
    // 清除所有恢復計時器
    for (const timerId of this.recoveryTimers.values()) {
      clearTimeout(timerId)
    }
    this.recoveryTimers.clear()

    // 清空救護車狀態
    this.activeAmbulances.clear()

    logger.log('🛑 AmbulanceClearanceController 已停止')
  }
}
