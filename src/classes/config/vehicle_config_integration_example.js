/**
 * vehicle_config_integration_example.js
 *
 * 這個檔案展示如何在 Vehicle.js 中整合使用新的配置系統
 * 將硬編碼的值替換為可配置的參數
 *
 * 📝 使用步驟：
 * 1. 將下面的範例程式碼複製到 Vehicle.js 對應位置
 * 2. 逐步替換硬編碼的數值
 * 3. 測試確保行為正常
 */

// ===== 1. 在 Vehicle.js 檔案頂部加入匯入語句 =====
/*
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import {
  ANIMATION_CONFIG,
  DISTANCE_CONFIG,
  FOLLOWING_CONFIG,
  TRAFFIC_LIGHT_CONFIG,
  speedConfig
} from './config'

gsap.registerPlugin(MotionPathPlugin)
*/

// ===== 2. 替換 Vehicle 類別中的靜態屬性 =====
/*
export default class Vehicle {
  // ⚡ 使用配置檔案中的動畫設定
  static timeMultiplier = ANIMATION_CONFIG.TIME_MULTIPLIER

  // 🚨 使用配置檔案中的冷卻時間設定
  static antiShakeGlobalCooldown = ANIMATION_CONFIG.COOLDOWN_TIMES.GLOBAL_ANTI_SHAKE
  static lastGlobalAdjustTime = 0
*/

// ===== 3. 替換建構子中的硬編碼值 =====
/*
constructor(x, y, direction = 'east', vehicleType = 'large', laneNumber = 1) {
  // ... 其他程式碼 ...

  // ⏱️ 使用配置檔案中的冷卻時間設定
  this.positionAdjustCooldown = ANIMATION_CONFIG.COOLDOWN_TIMES.POSITION_ADJUST
  this.timeScaleDebounceDelay = ANIMATION_CONFIG.COOLDOWN_TIMES.TIMESCALE_DEBOUNCE

  // ... 其他程式碼 ...
}
*/

// ===== 4. 替換跟車行為中的硬編碼值 =====
/*
checkFollowingBehavior() {
  // 🚗 使用配置檔案中的跟車設定
  const frontVehicle = this.getFrontVehicle(DISTANCE_CONFIG.BASE_DISTANCES.SAFE_FOLLOWING)

  if (frontVehicle) {
    const distance = this.getDistanceToVehicle(frontVehicle)
    const requiredSafeDistance = DISTANCE_CONFIG.BASE_DISTANCES.REQUIRED_SAFETY

    if (distance < requiredSafeDistance) {
      this.adjustSpeedForFollowing(frontVehicle, distance)
    }
  }
}
*/

// ===== 5. 替換交通燈響應中的硬編碼值 =====
/*
respondToTrafficLight() {
  const lightState = this.trafficLightController.getCurrentState(this.direction)

  if (lightState === 'yellow') {
    // 🟡 使用配置檔案中的黃燈設定
    const distanceToStopLine = this.getDistanceToStopLine()
    const accelerateDistance = TRAFFIC_LIGHT_CONFIG.YELLOW_LIGHT.ACCELERATE_DISTANCE
    const stopDistance = TRAFFIC_LIGHT_CONFIG.YELLOW_LIGHT.STOP_DISTANCE

    if (distanceToStopLine > accelerateDistance) {
      // 距離較遠，加速通過
      const multiplier = TRAFFIC_LIGHT_CONFIG.YELLOW_LIGHT.ACCELERATE_MULTIPLIER.AGGRESSIVE
      this.adjustSpeed(this.currentSpeed * multiplier)
    } else if (distanceToStopLine < stopDistance) {
      // 距離較近，停車
      this.stopForRedLight()
    }
  }
}
*/

// ===== 6. 替換碰撞檢測中的硬編碼值 =====
/*
checkCollisionAhead() {
  // 🎯 使用配置檔案中的碰撞檢測設定
  const frontCheckDistance = COLLISION_CONFIG.DETECTION_DISTANCES.FRONT_CHECK
  const nearbyVehicles = this.getNearbyVehicles(frontCheckDistance)

  nearbyVehicles.forEach(vehicle => {
    const distance = this.getDistanceToVehicle(vehicle)
    const minGap = DISTANCE_CONFIG.BASE_DISTANCES.MIN_GAP

    if (distance < minGap) {
      // 執行碰撞避免邏輯
      this.avoidCollision(vehicle)
    }
  })
}
*/

// ===== 7. 替換速度調整中的硬編碼值 =====
/*
adjustSpeedForFollowing(frontVehicle, distance) {
  // 📊 使用配置檔案中的跟車速度設定
  let speedRatio
  const baseDistance = DISTANCE_CONFIG.BASE_DISTANCES.MIN_GAP

  if (distance < baseDistance) {
    // 很接近
    const ratios = FOLLOWING_CONFIG.SPEED_RATIOS.VERY_CLOSE
    speedRatio = ratios.front * frontVehicle.currentSpeed + ratios.self * this.currentSpeed
  } else if (distance < baseDistance * 2) {
    // 接近
    const ratios = FOLLOWING_CONFIG.SPEED_RATIOS.CLOSE
    speedRatio = ratios.front * frontVehicle.currentSpeed + ratios.self * this.currentSpeed
  } else {
    // 正常距離
    const ratios = FOLLOWING_CONFIG.SPEED_RATIOS.NORMAL
    speedRatio = ratios.front * frontVehicle.currentSpeed + ratios.self * this.currentSpeed
  }

  // 確保不低於最低速度
  const minRatio = FOLLOWING_CONFIG.SPEED_RATIOS.MIN_SPEED_RATIO
  speedRatio = Math.max(speedRatio, this.initialSpeed * minRatio)

  this.adjustSpeed(speedRatio)
}
*/

// ===== 8. 替換動畫持續時間中的硬編碼值 =====
/*
adjustSpeed(newSpeed, duration = null) {
  // ⚡ 使用配置檔案中的動畫時間設定
  let animationDuration = duration

  if (!animationDuration) {
    const speedDiff = Math.abs(newSpeed - this.currentSpeed)

    if (speedDiff < 5) {
      animationDuration = ANIMATION_CONFIG.SPEED_CHANGE_DURATION.INSTANT
    } else if (speedDiff < 15) {
      animationDuration = ANIMATION_CONFIG.SPEED_CHANGE_DURATION.FAST
    } else {
      animationDuration = ANIMATION_CONFIG.SPEED_CHANGE_DURATION.NORMAL
    }
  }

  // 執行速度調整動畫
  gsap.to(this, {
    currentSpeed: newSpeed,
    duration: animationDuration,
    ease: ANIMATION_CONFIG.EASING.NONE
  })
}
*/

/**
 * 🎯 整合完成後的效益：
 *
 * ✅ 統一管理：所有設定集中在配置檔案中
 * ✅ 易於調整：修改參數不需要深入程式碼邏輯
 * ✅ 可維護性：清楚的註解說明每個參數的作用
 * ✅ 類型安全：TypeScript 友好的配置結構
 * ✅ 測試便利：可以輕鬆切換不同的配置組合
 *
 * 🔧 下一步建議：
 * 1. 逐步替換 Vehicle.js 中的硬編碼值
 * 2. 測試每個功能確保行為正確
 * 3. 根據實際使用情況調整配置參數
 * 4. 建立配置參數的單元測試
 */
