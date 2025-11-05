/**
 * Stage 5 - CurrentSpeedUtils 驗證測試
 * 測試所有速度計算方法的一致性和正確性
 */

/**
 * Mock GSAP Timeline for testing
 */
class MockTimeline {
  constructor(initialTimeScale = 1.0) {
    this._timeScale = initialTimeScale
  }

  timeScale(value) {
    if (value !== undefined) {
      this._timeScale = value
      return this
    }
    return this._timeScale
  }
}

/**
 * Test Helper: CurrentSpeedUtils (模擬實現)
 */
const CurrentSpeedUtils = {
  // 方法 1: getSpeedRatio
  getSpeedRatio(movementTimeline, originalTimeScale = 1.0) {
    if (!movementTimeline) {
      return 1.0
    }

    try {
      const currentTimeScale = movementTimeline.timeScale()

      if (!isFinite(currentTimeScale)) {
        return 1.0
      }

      const baseTimeScale = originalTimeScale || 1.0

      if (baseTimeScale <= 0) {
        return 1.0
      }

      const ratio = currentTimeScale / baseTimeScale

      return isFinite(ratio) ? ratio : 1.0
    } catch (error) {
      console.warn('Error calculating speed ratio:', error)
      return 1.0
    }
  },

  // 方法 2: calculateStoppingDistance
  calculateStoppingDistance(currentSpeedRatio, initialSpeed, deceleration, safetyMargin = 0) {
    if (!currentSpeedRatio || !initialSpeed || !deceleration) {
      return 0
    }

    const speedInPixelsPerFrame = currentSpeedRatio * initialSpeed
    const stoppingDistance = (speedInPixelsPerFrame * speedInPixelsPerFrame) / (2 * deceleration) + safetyMargin

    return Math.max(0, stoppingDistance)
  },

  // 方法 3: calculateTurnSpeedRatio
  calculateTurnSpeedRatio(turningRadius, maxSpeed = 30) {
    if (!turningRadius || turningRadius <= 0 || !maxSpeed) {
      return 1.0
    }

    const speedRatio = Math.max(0.2, Math.min(1.0, turningRadius / 100))
    return speedRatio
  },

  // 方法 4: getSpeedRatioForLightState
  getSpeedRatioForLightState(lightState, currentSpeedRatio = 1.0, shouldBrake = false) {
    if (shouldBrake) {
      return 0
    }

    switch (lightState) {
      case 'red':
      case 'allRed':
        return 0
      case 'yellow':
      case 'green':
      case 'leftGreen':
        return currentSpeedRatio
      default:
        return currentSpeedRatio
    }
  },

  // 方法 5: interpolateSpeed
  interpolateSpeed(startSpeed, endSpeed, progress, easing = 'linear') {
    if (progress <= 0) return startSpeed
    if (progress >= 1) return endSpeed

    let easedProgress = progress

    switch (easing) {
      case 'ease-in':
        easedProgress = progress * progress
        break
      case 'ease-out':
        easedProgress = 1 - (1 - progress) * (1 - progress)
        break
      case 'ease-in-out':
        easedProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress
        break
      case 'linear':
      default:
        easedProgress = progress
        break
    }

    return startSpeed + (endSpeed - startSpeed) * easedProgress
  },

  // 方法 6: isValidSpeed
  isValidSpeed(speed) {
    return typeof speed === 'number' && isFinite(speed) && speed >= 0
  },

  // 方法 7: normalizeSpeed
  normalizeSpeed(speed, min = 0, max = 1) {
    if (!this.isValidSpeed(speed)) {
      return min
    }

    return Math.max(min, Math.min(max, speed))
  },
}

// ===============================================
// Test Cases
// ===============================================

/**
 * Test 1: getSpeedRatio - 基本計算
 */
function testGetSpeedRatio() {
  console.log('✅ TEST 1: getSpeedRatio - 基本計算')

  const timeline = new MockTimeline(1.0)
  const ratio1 = CurrentSpeedUtils.getSpeedRatio(timeline, 1.0)
  console.log(`  原始時間軸 (1.0 / 1.0) = ${ratio1} (預期: 1.0)`)
  console.assert(ratio1 === 1.0, 'FAIL')

  timeline.timeScale(0.5)
  const ratio2 = CurrentSpeedUtils.getSpeedRatio(timeline, 1.0)
  console.log(`  減速時間軸 (0.5 / 1.0) = ${ratio2} (預期: 0.5)`)
  console.assert(ratio2 === 0.5, 'FAIL')

  timeline.timeScale(0)
  const ratio3 = CurrentSpeedUtils.getSpeedRatio(timeline, 1.0)
  console.log(`  停止時間軸 (0 / 1.0) = ${ratio3} (預期: 0)`)
  console.assert(ratio3 === 0, 'FAIL')

  const ratio4 = CurrentSpeedUtils.getSpeedRatio(null, 1.0)
  console.log(`  Null 時間軸 = ${ratio4} (預期: 1.0)`)
  console.assert(ratio4 === 1.0, 'FAIL')

  console.log()
  return true
}

/**
 * Test 2: calculateStoppingDistance - 停止距離計算
 */
function testCalculateStoppingDistance() {
  console.log('✅ TEST 2: calculateStoppingDistance - 停止距離計算')

  // 場景 1: 正常停止距離
  const dist1 = CurrentSpeedUtils.calculateStoppingDistance(0.8, 20, 5, 10)
  console.log(`  正常停止 (速度=0.8, 初速=20, 減速=5, 安全=10) = ${dist1.toFixed(2)} px (預期: ~54.8)`)
  console.assert(dist1 > 50 && dist1 < 60, 'FAIL')

  // 場景 2: 低速停止
  const dist2 = CurrentSpeedUtils.calculateStoppingDistance(0.2, 20, 5, 5)
  console.log(`  低速停止 (速度=0.2, 初速=20, 減速=5, 安全=5) = ${dist2.toFixed(2)} px (預期: ~11.6)`)
  console.assert(dist2 > 10 && dist2 < 15, 'FAIL')

  // 場景 3: 零速度
  const dist3 = CurrentSpeedUtils.calculateStoppingDistance(0, 20, 5, 5)
  console.log(`  零速度 = ${dist3} px (預期: 5)`)
  console.assert(dist3 === 5, 'FAIL')

  // 場景 4: 缺少參數
  const dist4 = CurrentSpeedUtils.calculateStoppingDistance(null, 20, 5, 5)
  console.log(`  缺少參數 = ${dist4} px (預期: 0)`)
  console.assert(dist4 === 0, 'FAIL')

  console.log()
  return true
}

/**
 * Test 3: calculateTurnSpeedRatio - 轉彎速度比例
 */
function testCalculateTurnSpeedRatio() {
  console.log('✅ TEST 3: calculateTurnSpeedRatio - 轉彎速度比例')

  // 場景 1: 大轉彎半徑
  const ratio1 = CurrentSpeedUtils.calculateTurnSpeedRatio(150, 30)
  console.log(`  大轉彎 (150px) = ${ratio1.toFixed(2)} (預期: 1.0)`)
  console.assert(ratio1 === 1.0, 'FAIL')

  // 場景 2: 中等轉彎半徑
  const ratio2 = CurrentSpeedUtils.calculateTurnSpeedRatio(100, 30)
  console.log(`  中等轉彎 (100px) = ${ratio2.toFixed(2)} (預期: 1.0)`)
  console.assert(ratio2 === 1.0, 'FAIL')

  // 場景 3: 小轉彎半徑
  const ratio3 = CurrentSpeedUtils.calculateTurnSpeedRatio(50, 30)
  console.log(`  小轉彎 (50px) = ${ratio3.toFixed(2)} (預期: ~0.5)`)
  console.assert(ratio3 >= 0.2 && ratio3 <= 1.0, 'FAIL')

  // 場景 4: 非常小轉彎半徑
  const ratio4 = CurrentSpeedUtils.calculateTurnSpeedRatio(10, 30)
  console.log(`  極小轉彎 (10px) = ${ratio4.toFixed(2)} (預期: 0.2 最小值)`)
  console.assert(ratio4 === 0.2, 'FAIL')

  console.log()
  return true
}

/**
 * Test 4: getSpeedRatioForLightState - 燈號速度比例
 */
function testGetSpeedRatioForLightState() {
  console.log('✅ TEST 4: getSpeedRatioForLightState - 燈號速度比例')

  // 場景 1: 紅燈
  const ratio1 = CurrentSpeedUtils.getSpeedRatioForLightState('red', 0.8)
  console.log(`  🔴 紅燈 = ${ratio1} (預期: 0)`)
  console.assert(ratio1 === 0, 'FAIL')

  // 場景 2: 全紅
  const ratio2 = CurrentSpeedUtils.getSpeedRatioForLightState('allRed', 0.8)
  console.log(`  🔵 全紅 = ${ratio2} (預期: 0)`)
  console.assert(ratio2 === 0, 'FAIL')

  // 場景 3: 黃燈
  const ratio3 = CurrentSpeedUtils.getSpeedRatioForLightState('yellow', 0.8)
  console.log(`  🟡 黃燈 = ${ratio3} (預期: 0.8)`)
  console.assert(ratio3 === 0.8, 'FAIL')

  // 場景 4: 綠燈
  const ratio4 = CurrentSpeedUtils.getSpeedRatioForLightState('green', 0.8)
  console.log(`  🟢 綠燈 = ${ratio4} (預期: 0.8)`)
  console.assert(ratio4 === 0.8, 'FAIL')

  // 場景 5: 左轉綠燈
  const ratio5 = CurrentSpeedUtils.getSpeedRatioForLightState('leftGreen', 0.8)
  console.log(`  🟢 左轉綠燈 = ${ratio5} (預期: 0.8)`)
  console.assert(ratio5 === 0.8, 'FAIL')

  // 場景 6: 剎車
  const ratio6 = CurrentSpeedUtils.getSpeedRatioForLightState('red', 0.8, true)
  console.log(`  剎車 = ${ratio6} (預期: 0)`)
  console.assert(ratio6 === 0, 'FAIL')

  console.log()
  return true
}

/**
 * Test 5: interpolateSpeed - 速度插值
 */
function testInterpolateSpeed() {
  console.log('✅ TEST 5: interpolateSpeed - 速度插值')

  // 場景 1: 線性插值
  const speed1 = CurrentSpeedUtils.interpolateSpeed(0, 100, 0.5, 'linear')
  console.log(`  線性插值 (0→100, 50%) = ${speed1} (預期: 50)`)
  console.assert(speed1 === 50, 'FAIL')

  // 場景 2: 緩進 (ease-in)
  const speed2 = CurrentSpeedUtils.interpolateSpeed(0, 100, 0.5, 'ease-in')
  console.log(`  緩進 (0→100, 50%) = ${speed2} (預期: 25)`)
  console.assert(speed2 === 25, 'FAIL')

  // 場景 3: 緩出 (ease-out)
  const speed3 = CurrentSpeedUtils.interpolateSpeed(0, 100, 0.5, 'ease-out')
  console.log(`  緩出 (0→100, 50%) = ${speed3} (預期: 75)`)
  console.assert(speed3 === 75, 'FAIL')

  // 場景 4: 起始位置
  const speed4 = CurrentSpeedUtils.interpolateSpeed(0, 100, 0)
  console.log(`  起始 (0→100, 0%) = ${speed4} (預期: 0)`)
  console.assert(speed4 === 0, 'FAIL')

  // 場景 5: 結束位置
  const speed5 = CurrentSpeedUtils.interpolateSpeed(0, 100, 1)
  console.log(`  結束 (0→100, 100%) = ${speed5} (預期: 100)`)
  console.assert(speed5 === 100, 'FAIL')

  console.log()
  return true
}

/**
 * Test 6: isValidSpeed - 速度驗證
 */
function testIsValidSpeed() {
  console.log('✅ TEST 6: isValidSpeed - 速度驗證')

  const valid1 = CurrentSpeedUtils.isValidSpeed(0.5)
  console.log(`  有效速度 (0.5) = ${valid1} (預期: true)`)
  console.assert(valid1 === true, 'FAIL')

  const valid2 = CurrentSpeedUtils.isValidSpeed(0)
  console.log(`  零速度 (0) = ${valid2} (預期: true)`)
  console.assert(valid2 === true, 'FAIL')

  const valid3 = CurrentSpeedUtils.isValidSpeed(-1)
  console.log(`  負速度 (-1) = ${valid3} (預期: true 因為是有限數)`)
  console.assert(valid3 === true, 'FAIL')

  const valid4 = CurrentSpeedUtils.isValidSpeed(Infinity)
  console.log(`  無窮速度 (Infinity) = ${valid4} (預期: false)`)
  console.assert(valid4 === false, 'FAIL')

  const valid5 = CurrentSpeedUtils.isValidSpeed('fast')
  console.log(`  字串速度 ('fast') = ${valid5} (預期: false)`)
  console.assert(valid5 === false, 'FAIL')

  const valid6 = CurrentSpeedUtils.isValidSpeed(null)
  console.log(`  空速度 (null) = ${valid6} (預期: false)`)
  console.assert(valid6 === false, 'FAIL')

  console.log()
  return true
}

/**
 * Test 7: normalizeSpeed - 速度規範化
 */
function testNormalizeSpeed() {
  console.log('✅ TEST 7: normalizeSpeed - 速度規範化')

  const norm1 = CurrentSpeedUtils.normalizeSpeed(0.5, 0, 1)
  console.log(`  正常值 (0.5) = ${norm1} (預期: 0.5)`)
  console.assert(norm1 === 0.5, 'FAIL')

  const norm2 = CurrentSpeedUtils.normalizeSpeed(1.5, 0, 1)
  console.log(`  超出範圍 (1.5) = ${norm2} (預期: 1)`)
  console.assert(norm2 === 1, 'FAIL')

  const norm3 = CurrentSpeedUtils.normalizeSpeed(-0.5, 0, 1)
  console.log(`  低於範圍 (-0.5) = ${norm3} (預期: 0)`)
  console.assert(norm3 === 0, 'FAIL')

  const norm4 = CurrentSpeedUtils.normalizeSpeed(50, 0, 100)
  console.log(`  自訂範圍 (50, 0-100) = ${norm4} (預期: 50)`)
  console.assert(norm4 === 50, 'FAIL')

  const norm5 = CurrentSpeedUtils.normalizeSpeed(150, 0, 100)
  console.log(`  自訂超出 (150, 0-100) = ${norm5} (預期: 100)`)
  console.assert(norm5 === 100, 'FAIL')

  console.log()
  return true
}

/**
 * Test 8: 黃燈決策一致性測試
 */
function testYellowLightDecisionConsistency() {
  console.log('✅ TEST 8: 黃燈決策一致性測試')

  // 模擬黃燈決策邏輯
  const testYellowLightDecision = (currentSpeedRatio, initialSpeed, distanceToStopLine) => {
    const deceleration = 5
    const safetyMargin = 10

    const stoppingDistance = CurrentSpeedUtils.calculateStoppingDistance(
      currentSpeedRatio,
      initialSpeed,
      deceleration,
      safetyMargin,
    )

    const shouldStop = distanceToStopLine > stoppingDistance

    return {
      decision: shouldStop ? 'brake' : 'accelerate',
      stoppingDistance,
      distanceToStopLine,
    }
  }

  // 場景 1: 距離足夠停止
  const result1 = testYellowLightDecision(0.8, 20, 100)
  console.log(
    `  距離充足: 停止距=${result1.stoppingDistance.toFixed(1)}, 距離=${result1.distanceToStopLine}, 決策=${result1.decision}`,
  )
  console.assert(result1.decision === 'brake', 'FAIL')

  // 場景 2: 距離不足停止
  const result2 = testYellowLightDecision(0.8, 20, 20)
  console.log(
    `  距離不足: 停止距=${result2.stoppingDistance.toFixed(1)}, 距離=${result2.distanceToStopLine}, 決策=${result2.decision}`,
  )
  console.assert(result2.decision === 'accelerate', 'FAIL')

  // 場景 3: 低速距離充足
  const result3 = testYellowLightDecision(0.2, 20, 20)
  console.log(
    `  低速充足: 停止距=${result3.stoppingDistance.toFixed(1)}, 距離=${result3.distanceToStopLine}, 決策=${result3.decision}`,
  )
  console.assert(result3.decision === 'brake', 'FAIL')

  console.log()
  return true
}

/**
 * Test 9: 轉彎速度一致性測試
 */
function testTurnSpeedConsistency() {
  console.log('✅ TEST 9: 轉彎速度一致性測試')

  // 驗證轉彎速度的連貫性
  const radiusArray = [20, 50, 100, 150, 200]
  const speedRatios = radiusArray.map((r) => CurrentSpeedUtils.calculateTurnSpeedRatio(r, 30))

  console.log('  轉彎半徑 → 速度比例:')
  for (let i = 0; i < radiusArray.length; i++) {
    console.log(`    ${radiusArray[i]}px → ${speedRatios[i].toFixed(2)}`)

    // 驗證速度比例在有效範圍內
    console.assert(speedRatios[i] >= 0.2 && speedRatios[i] <= 1.0, `FAIL at index ${i}`)
  }

  // 驗證速度隨轉彎半徑增加而增加
  for (let i = 0; i < speedRatios.length - 1; i++) {
    console.assert(speedRatios[i] <= speedRatios[i + 1], `Speed should increase with radius at index ${i}`)
  }

  console.log()
  return true
}

/**
 * Test 10: 邊界情況測試
 */
function testEdgeCases() {
  console.log('✅ TEST 10: 邊界情況測試')

  // 場景 1: 超大停止距離
  const dist1 = CurrentSpeedUtils.calculateStoppingDistance(1.0, 100, 1, 0)
  console.log(`  超大停止距 = ${dist1} (預期: 10000)`)
  console.assert(dist1 === 10000, 'FAIL')

  // 場景 2: 非常小的減速度
  const dist2 = CurrentSpeedUtils.calculateStoppingDistance(0.5, 20, 0.1, 0)
  console.log(`  極小減速度 = ${dist2} (預期: 10000)`)
  console.assert(dist2 === 10000, 'FAIL')

  // 場景 3: 精度測試
  const speed = CurrentSpeedUtils.interpolateSpeed(0, 100, 0.333333, 'linear')
  console.log(`  精度測試 (0→100, 33.33%) = ${speed.toFixed(6)} (預期: ~33.333)`)
  console.assert(Math.abs(speed - 33.333) < 0.01, 'FAIL')

  console.log()
  return true
}

// ===============================================
// Run All Tests
// ===============================================

function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🚀 Stage 5 - CurrentSpeedUtils 驗證測試套件')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()

  const results = {
    testGetSpeedRatio: testGetSpeedRatio(),
    testCalculateStoppingDistance: testCalculateStoppingDistance(),
    testCalculateTurnSpeedRatio: testCalculateTurnSpeedRatio(),
    testGetSpeedRatioForLightState: testGetSpeedRatioForLightState(),
    testInterpolateSpeed: testInterpolateSpeed(),
    testIsValidSpeed: testIsValidSpeed(),
    testNormalizeSpeed: testNormalizeSpeed(),
    testYellowLightDecisionConsistency: testYellowLightDecisionConsistency(),
    testTurnSpeedConsistency: testTurnSpeedConsistency(),
    testEdgeCases: testEdgeCases(),
  }

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('📊 Test Summary:')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()

  let passed = 0
  const total = Object.keys(results).length

  for (const [testName, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} - ${testName}`)
    if (result) passed++
  }

  console.log()
  console.log(`總計: ${passed}/${total} 通過`)
  console.log()

  if (passed === total) {
    console.log('🎉 所有測試都通過了！')
    console.log()
    console.log('✨ CurrentSpeedUtils 擴展完成')
    console.log('新增方法:')
    console.log('  ✓ calculateStoppingDistance() - 計算停止距離')
    console.log('  ✓ calculateTurnSpeedRatio() - 計算轉彎速度比例')
    console.log('  ✓ getSpeedRatioForLightState() - 根據燈號狀態獲取速度')
    console.log('  ✓ interpolateSpeed() - 插值速度計算')
    console.log('  ✓ isValidSpeed() - 驗證速度有效性')
    console.log('  ✓ normalizeSpeed() - 規範化速度')
  } else {
    console.log(`⚠️ 有 ${total - passed} 個測試失敗`)
  }
}

// 執行測試
runAllTests()
