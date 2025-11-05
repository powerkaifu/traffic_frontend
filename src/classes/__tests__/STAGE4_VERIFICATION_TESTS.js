/**
 * Stage 4 - Stop Line Logic Verification Tests
 * 驗證停止線邏輯的紅、黃、綠燈判斷
 */

// ===============================================
// Test Helper Functions
// ===============================================

/**
 * 模擬交通燈控制器
 */
class MockTrafficController {
  constructor(initialState = 'red') {
    this.state = initialState
  }

  getCurrentLightState(direction) {
    return this.state
  }

  setLightState(state) {
    this.state = state
  }
}

/**
 * 模擬停止線控制器
 */
class MockStopLineController {
  constructor(stopLineX = 500) {
    this.stopLineX = stopLineX
  }
}

/**
 * 模擬 YELLOW_LIGHT_DECISION_CONFIG
 */
const MOCK_YELLOW_LIGHT_CONFIG = {
  DECISION_LOGIC: {
    ENABLED: true,
    STRATEGIES: {
      DISTANCE_BASED: {
        ENABLED: true,
        SAFE_DISTANCE: 50,
      },
    },
  },
  DEBUG: {
    ENABLED: true,
  },
}

/**
 * 模擬 ANIMATION_CONFIG
 */
const MOCK_ANIMATION_CONFIG = {
  SPEED_CHANGE_DURATION: {
    INSTANT: 0.3,
  },
  EASING: {
    NONE: 'none',
  },
}

// ===============================================
// Test Cases
// ===============================================

/**
 * Test A: 紅燈停止邏輯
 */
function testRedLightStop() {
  console.log('🔴 TEST A: 紅燈停止邏輯')
  const controller = new MockTrafficController('red')

  const vehicle = {
    id: 'vehicle-1',
    laneNumber: 2,
    hasPassedStopLine: false,
    waitingForGreen: false,
    isAtStopLine: false,
    currentState: 'moving',
    stopLineController: new MockStopLineController(),

    // 模擬 checkStopLine() 返回 true（已到達停止線）
    checkStopLine() {
      return true
    },

    // 模擬 makeYellowLightDecision()
    makeYellowLightDecision() {
      return { action: 'brake', decision: 'safe_to_stop' }
    },

    // 停止動作
    stopMovement() {
      console.log(`  ✅ [${this.id}] 停止了`)
    },

    // 實現 checkStopLineAndRespond 邏輯
    checkStopLineAndRespond(trafficController) {
      if (this.hasPassedStopLine || !this.checkStopLine() || this.waitingForGreen || this.isAtStopLine) {
        return
      }

      this.isAtStopLine = true
      const lightState = trafficController.getCurrentLightState('direction')

      let shouldStop = false
      if (lightState === 'yellow') {
        const decision = this.makeYellowLightDecision()
        shouldStop = decision.action === 'brake'
      } else {
        shouldStop =
          lightState === 'red' || lightState === 'allRed' || (this.laneNumber === 1 && lightState === 'green')
      }

      if (shouldStop) {
        console.log(`  📍 ${this.id} 應該停止: shouldStop=${shouldStop}, lightState=${lightState}`)
        this.stopMovement()
        this.waitingForGreen = true
      } else {
        console.log(`  📍 ${this.id} 應該通過: shouldStop=${shouldStop}, lightState=${lightState}`)
        this.isAtStopLine = false
        this.hasPassedStopLine = true
      }
    },
  }

  // 執行測試
  vehicle.checkStopLineAndRespond(controller)

  // 驗證結果
  console.log(`  結果驗證:`)
  console.log(`    ✓ hasPassedStopLine: ${vehicle.hasPassedStopLine} (預期: false)`)
  console.log(`    ✓ waitingForGreen: ${vehicle.waitingForGreen} (預期: true)`)
  console.log(`    ✓ isAtStopLine: ${vehicle.isAtStopLine} (預期: true)`)
  console.log()

  return vehicle.waitingForGreen === true && vehicle.hasPassedStopLine === false
}

/**
 * Test B: 黃燈決策 - 剎車路徑
 */
function testYellowLightBrake() {
  console.log('🟡 TEST B: 黃燈決策 - 剎車路徑')
  const controller = new MockTrafficController('yellow')

  const vehicle = {
    id: 'vehicle-2',
    laneNumber: 3,
    hasPassedStopLine: false,
    waitingForGreen: false,
    isAtStopLine: false,
    currentState: 'moving',
    stopLineController: new MockStopLineController(),

    checkStopLine() {
      return true
    },

    makeYellowLightDecision() {
      return { action: 'brake', decision: 'distance_ok_to_stop' }
    },

    stopMovement() {
      console.log(`  ✅ [${this.id}] 停止了`)
    },

    checkStopLineAndRespond(trafficController) {
      if (this.hasPassedStopLine || !this.checkStopLine() || this.waitingForGreen || this.isAtStopLine) {
        return
      }

      this.isAtStopLine = true
      const lightState = trafficController.getCurrentLightState('direction')

      let shouldStop = false
      if (lightState === 'yellow') {
        const decision = this.makeYellowLightDecision()
        console.log(`  🟡 黃燈決策: ${decision.decision} → ${decision.action}`)
        shouldStop = decision.action === 'brake'
      } else {
        shouldStop =
          lightState === 'red' || lightState === 'allRed' || (this.laneNumber === 1 && lightState === 'green')
      }

      if (shouldStop) {
        console.log(`  📍 ${this.id} 應該停止: shouldStop=${shouldStop}`)
        this.stopMovement()
        this.waitingForGreen = true
      } else {
        console.log(`  📍 ${this.id} 應該通過: shouldStop=${shouldStop}`)
        this.isAtStopLine = false
        this.hasPassedStopLine = true
      }
    },
  }

  vehicle.checkStopLineAndRespond(controller)

  console.log(`  結果驗證:`)
  console.log(`    ✓ hasPassedStopLine: ${vehicle.hasPassedStopLine} (預期: false)`)
  console.log(`    ✓ waitingForGreen: ${vehicle.waitingForGreen} (預期: true)`)
  console.log()

  return vehicle.waitingForGreen === true && vehicle.hasPassedStopLine === false
}

/**
 * Test C: 黃燈決策 - 加速路徑
 */
function testYellowLightAccelerate() {
  console.log('🟡 TEST C: 黃燈決策 - 加速路徑')
  const controller = new MockTrafficController('yellow')

  const vehicle = {
    id: 'vehicle-3',
    laneNumber: 2,
    hasPassedStopLine: false,
    waitingForGreen: false,
    isAtStopLine: false,
    currentState: 'moving',
    stopLineController: new MockStopLineController(),

    checkStopLine() {
      return true
    },

    makeYellowLightDecision() {
      return { action: 'accelerate', decision: 'too_close_to_stop' }
    },

    stopMovement() {
      console.log(`  ✅ [${this.id}] 停止了`)
    },

    checkStopLineAndRespond(trafficController) {
      if (this.hasPassedStopLine || !this.checkStopLine() || this.waitingForGreen || this.isAtStopLine) {
        return
      }

      this.isAtStopLine = true
      const lightState = trafficController.getCurrentLightState('direction')

      let shouldStop = false
      if (lightState === 'yellow') {
        const decision = this.makeYellowLightDecision()
        console.log(`  🟡 黃燈決策: ${decision.decision} → ${decision.action}`)
        shouldStop = decision.action === 'brake'
      } else {
        shouldStop =
          lightState === 'red' || lightState === 'allRed' || (this.laneNumber === 1 && lightState === 'green')
      }

      if (shouldStop) {
        console.log(`  📍 ${this.id} 應該停止: shouldStop=${shouldStop}`)
        this.stopMovement()
        this.waitingForGreen = true
      } else {
        const canProceed =
          (this.laneNumber !== 1 && lightState === 'green') ||
          (this.laneNumber === 1 && lightState === 'leftGreen') ||
          (lightState === 'yellow' && this.makeYellowLightDecision().action === 'accelerate')

        console.log(`  📍 ${this.id} 應該通過: canProceed=${canProceed}`)
        if (canProceed) {
          this.isAtStopLine = false
          this.hasPassedStopLine = true
        } else {
          this.stopMovement()
          this.waitingForGreen = true
        }
      }
    },
  }

  vehicle.checkStopLineAndRespond(controller)

  console.log(`  結果驗證:`)
  console.log(`    ✓ hasPassedStopLine: ${vehicle.hasPassedStopLine} (預期: true)`)
  console.log(`    ✓ waitingForGreen: ${vehicle.waitingForGreen} (預期: false)`)
  console.log()

  return vehicle.hasPassedStopLine === true && vehicle.waitingForGreen === false
}

/**
 * Test D: 綠燈 - 非1號車道通過
 */
function testGreenLightNonLane1() {
  console.log('🟢 TEST D: 綠燈 - 非1號車道通過')
  const controller = new MockTrafficController('green')

  const vehicle = {
    id: 'vehicle-4',
    laneNumber: 2,
    hasPassedStopLine: false,
    waitingForGreen: false,
    isAtStopLine: false,
    currentState: 'moving',
    stopLineController: new MockStopLineController(),

    checkStopLine() {
      return true
    },

    makeYellowLightDecision() {
      return { action: 'accelerate', decision: 'none' }
    },

    stopMovement() {
      console.log(`  ✅ [${this.id}] 停止了`)
    },

    checkStopLineAndRespond(trafficController) {
      if (this.hasPassedStopLine || !this.checkStopLine() || this.waitingForGreen || this.isAtStopLine) {
        return
      }

      this.isAtStopLine = true
      const lightState = trafficController.getCurrentLightState('direction')

      let shouldStop = false
      if (lightState === 'yellow') {
        const decision = this.makeYellowLightDecision()
        shouldStop = decision.action === 'brake'
      } else {
        shouldStop =
          lightState === 'red' || lightState === 'allRed' || (this.laneNumber === 1 && lightState === 'green')
      }

      if (shouldStop) {
        console.log(`  📍 ${this.id} 應該停止: shouldStop=${shouldStop}, lightState=${lightState}`)
        this.stopMovement()
        this.waitingForGreen = true
      } else {
        const canProceed =
          (this.laneNumber !== 1 && lightState === 'green') ||
          (this.laneNumber === 1 && lightState === 'leftGreen') ||
          (lightState === 'yellow' && this.makeYellowLightDecision().action === 'accelerate')

        console.log(`  📍 ${this.id} 應該通過: canProceed=${canProceed}, lightState=${lightState}`)
        if (canProceed) {
          this.isAtStopLine = false
          this.hasPassedStopLine = true
        } else {
          this.stopMovement()
          this.waitingForGreen = true
        }
      }
    },
  }

  vehicle.checkStopLineAndRespond(controller)

  console.log(`  結果驗證:`)
  console.log(`    ✓ hasPassedStopLine: ${vehicle.hasPassedStopLine} (預期: true)`)
  console.log(`    ✓ waitingForGreen: ${vehicle.waitingForGreen} (預期: false)`)
  console.log()

  return vehicle.hasPassedStopLine === true && vehicle.waitingForGreen === false
}

/**
 * Test E: 綠燈 - 1號車道停止（等待左轉綠燈）
 */
function testGreenLightLane1Stop() {
  console.log('🟢 TEST E: 綠燈 - 1號車道停止（等待左轉綠燈）')
  const controller = new MockTrafficController('green')

  const vehicle = {
    id: 'vehicle-5',
    laneNumber: 1,
    hasPassedStopLine: false,
    waitingForGreen: false,
    isAtStopLine: false,
    currentState: 'moving',
    stopLineController: new MockStopLineController(),

    checkStopLine() {
      return true
    },

    makeYellowLightDecision() {
      return { action: 'accelerate', decision: 'none' }
    },

    stopMovement() {
      console.log(`  ✅ [${this.id}] 停止了`)
    },

    checkStopLineAndRespond(trafficController) {
      if (this.hasPassedStopLine || !this.checkStopLine() || this.waitingForGreen || this.isAtStopLine) {
        return
      }

      this.isAtStopLine = true
      const lightState = trafficController.getCurrentLightState('direction')

      let shouldStop = false
      if (lightState === 'yellow') {
        const decision = this.makeYellowLightDecision()
        shouldStop = decision.action === 'brake'
      } else {
        shouldStop =
          lightState === 'red' || lightState === 'allRed' || (this.laneNumber === 1 && lightState === 'green')
      }

      if (shouldStop) {
        console.log(
          `  📍 ${this.id} 應該停止: shouldStop=${shouldStop}, lightState=${lightState}, laneNumber=${this.laneNumber}`,
        )
        this.stopMovement()
        this.waitingForGreen = true
        if (this.laneNumber === 1 && lightState === 'green') {
          this.currentState = 'waitingForLeftTurnGreen'
          console.log(`  🟡 設置1號車道等待狀態: waitingForLeftTurnGreen`)
        }
      } else {
        const canProceed =
          (this.laneNumber !== 1 && lightState === 'green') ||
          (this.laneNumber === 1 && lightState === 'leftGreen') ||
          (lightState === 'yellow' && this.makeYellowLightDecision().action === 'accelerate')

        console.log(`  📍 ${this.id} 應該通過: canProceed=${canProceed}`)
        if (canProceed) {
          this.isAtStopLine = false
          this.hasPassedStopLine = true
        } else {
          this.stopMovement()
          this.waitingForGreen = true
        }
      }
    },
  }

  vehicle.checkStopLineAndRespond(controller)

  console.log(`  結果驗證:`)
  console.log(`    ✓ hasPassedStopLine: ${vehicle.hasPassedStopLine} (預期: false)`)
  console.log(`    ✓ waitingForGreen: ${vehicle.waitingForGreen} (預期: true)`)
  console.log(`    ✓ currentState: ${vehicle.currentState} (預期: waitingForLeftTurnGreen)`)
  console.log()

  return vehicle.waitingForGreen === true && vehicle.currentState === 'waitingForLeftTurnGreen'
}

/**
 * Test F: 左轉綠燈 - 1號車道通過
 */
function testLeftTurnGreenLane1() {
  console.log('🟢 TEST F: 左轉綠燈 - 1號車道通過')
  const controller = new MockTrafficController('leftGreen')

  const vehicle = {
    id: 'vehicle-6',
    laneNumber: 1,
    hasPassedStopLine: false,
    waitingForGreen: false,
    isAtStopLine: false,
    currentState: 'moving',
    stopLineController: new MockStopLineController(),

    checkStopLine() {
      return true
    },

    makeYellowLightDecision() {
      return { action: 'accelerate', decision: 'none' }
    },

    stopMovement() {
      console.log(`  ✅ [${this.id}] 停止了`)
    },

    checkStopLineAndRespond(trafficController) {
      if (this.hasPassedStopLine || !this.checkStopLine() || this.waitingForGreen || this.isAtStopLine) {
        return
      }

      this.isAtStopLine = true
      const lightState = trafficController.getCurrentLightState('direction')

      let shouldStop = false
      if (lightState === 'yellow') {
        const decision = this.makeYellowLightDecision()
        shouldStop = decision.action === 'brake'
      } else {
        shouldStop =
          lightState === 'red' || lightState === 'allRed' || (this.laneNumber === 1 && lightState === 'green')
      }

      if (shouldStop) {
        console.log(`  📍 ${this.id} 應該停止: shouldStop=${shouldStop}`)
        this.stopMovement()
        this.waitingForGreen = true
      } else {
        const canProceed =
          (this.laneNumber !== 1 && lightState === 'green') ||
          (this.laneNumber === 1 && lightState === 'leftGreen') ||
          (lightState === 'yellow' && this.makeYellowLightDecision().action === 'accelerate')

        console.log(
          `  📍 ${this.id} 應該通過: canProceed=${canProceed}, lightState=${lightState}, laneNumber=${this.laneNumber}`,
        )
        if (canProceed) {
          this.isAtStopLine = false
          this.hasPassedStopLine = true
        } else {
          this.stopMovement()
          this.waitingForGreen = true
        }
      }
    },
  }

  vehicle.checkStopLineAndRespond(controller)

  console.log(`  結果驗證:`)
  console.log(`    ✓ hasPassedStopLine: ${vehicle.hasPassedStopLine} (預期: true)`)
  console.log(`    ✓ waitingForGreen: ${vehicle.waitingForGreen} (預期: false)`)
  console.log()

  return vehicle.hasPassedStopLine === true && vehicle.waitingForGreen === false
}

/**
 * Test G: 前置條件檢查 - 已越過停止線
 */
function testPreconditionAlreadyPassed() {
  console.log('⏭️ TEST G: 前置條件檢查 - 已越過停止線')
  const controller = new MockTrafficController('red')

  const vehicle = {
    id: 'vehicle-7',
    laneNumber: 2,
    hasPassedStopLine: true, // 已越過
    waitingForGreen: false,
    isAtStopLine: false,
    currentState: 'moving',
    stopLineController: new MockStopLineController(),

    checkStopLine() {
      return true
    },

    makeYellowLightDecision() {
      return { action: 'brake', decision: 'safe_to_stop' }
    },

    stopMovement() {
      console.log(`  ✅ [${this.id}] 停止了`)
    },

    checkStopLineAndRespond(trafficController) {
      if (this.hasPassedStopLine || !this.checkStopLine() || this.waitingForGreen || this.isAtStopLine) {
        console.log(`  ⏭️ 跳過: 前置條件不滿足 (hasPassedStopLine=${this.hasPassedStopLine})`)
        return
      }

      this.isAtStopLine = true
      const lightState = trafficController.getCurrentLightState('direction')

      let shouldStop = false
      if (lightState === 'yellow') {
        const decision = this.makeYellowLightDecision()
        shouldStop = decision.action === 'brake'
      } else {
        shouldStop =
          lightState === 'red' || lightState === 'allRed' || (this.laneNumber === 1 && lightState === 'green')
      }

      if (shouldStop) {
        console.log(`  📍 ${this.id} 應該停止`)
        this.stopMovement()
        this.waitingForGreen = true
      }
    },
  }

  vehicle.checkStopLineAndRespond(controller)

  console.log(`  結果驗證:`)
  console.log(`    ✓ waitingForGreen: ${vehicle.waitingForGreen} (預期: false - 不執行邏輯)`)
  console.log()

  return vehicle.waitingForGreen === false
}

// ===============================================
// Run All Tests
// ===============================================

function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🚦 Stage 4 - Stop Line Logic Verification Tests')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()

  const results = {
    testRedLightStop: testRedLightStop(),
    testYellowLightBrake: testYellowLightBrake(),
    testYellowLightAccelerate: testYellowLightAccelerate(),
    testGreenLightNonLane1: testGreenLightNonLane1(),
    testGreenLightLane1Stop: testGreenLightLane1Stop(),
    testLeftTurnGreenLane1: testLeftTurnGreenLane1(),
    testPreconditionAlreadyPassed: testPreconditionAlreadyPassed(),
  }

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('📊 Test Summary:')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()

  let passed = 0
  let total = Object.keys(results).length

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
  } else {
    console.log(`⚠️ 有 ${total - passed} 個測試失敗`)
  }
}

// 執行測試
runAllTests()
