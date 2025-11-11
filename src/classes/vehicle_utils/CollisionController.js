/**
 * 碰撞控制器 - 簡化版 v2
 * 負責：
 * 1. 檢查燈號停止（紅燈、黃燈、全紅時停止）
 * 2. 檢查前方碰撞（距離 < 30px）
 * 3. 返回停止或蠕行的指令
 */

// 🎯 可配置參數（全局）
// 📌 如何調整蠕動跟隨避免重疊？詳見 CRAWL_FOLLOW_ADJUSTMENT_GUIDE.md
const COLLISION_CONFIG = {
  TRAFFIC_LIGHT_CHECK_DISTANCE: 100, // 燈號停止距離：當車距離停止線 < 此值時，檢查燈號是否需要停止
  STOP_TRIGGER_DISTANCE: 15, // 🛑 退出蠕動、進入停止的距離 - 東西向
  STOP_TRIGGER_DISTANCE_VERTICAL: 30, // 🛑 退出蠕動、進入停止的距離 - 南北向
  CRAWL_TRIGGER_DISTANCE: 20, // 🎯 進入蠕動的距離（外層觸發）- 東西向，距離 > 此值時進入蠕動
  CRAWL_TRIGGER_DISTANCE_VERTICAL: 35, // 🎯 進入蠕動的距離 - 南北向
  CRAWL_SPEED: 0.01, // 蠕動速度：在 CRAWL_TRIGGER_DISTANCE 和 STOP_TRIGGER_DISTANCE 之間的跟隨速度

  DETECTION_RANGE: 300, // 碰撞檢測範圍：檢查前方最多 300px 內的車輛

  STOP_LINE_OFFSET: 0,
  STOP_LINE_OFFSET_BY_DIRECTION: {
    east: 7, // 🔴 東向：第3輪診斷 -6.84px (後) → 調整 +7px
    west: 3, // 🔵 西向：第3輪診斷 -2.95px (後) → 調整 +3px
    north: -2, // 🟡 北向：第3輪診斷 2.10px (前) → 調整 -2px
    south: 2, // 🟢 南向：第3輪診斷 -2.19px (後) → 調整 +2px
  },
  // 🔧 停止線位置配置（從 HTML 元素計算）
  // STOP_LINE_POSITIONS: {
  //   east: null, // 東向停止線 X 座標
  //   west: null, // 西向停止線 X 座標
  //   north: null, // 北向停止線 Y 座標
  //   south: null, // 南向停止線 Y 座標
  // },
}

export class CollisionController {
  constructor(vehicle, trafficController = null) {
    this.vehicle = vehicle
    this.trafficController = trafficController
    this.lastCheckTime = 0
    // 🔧 碰撞檢查頻率（影響蠕動流暢度和精確性）
    // 📌 如果有重疊且很頻繁：試試提高間隔（例 5 → 10）但會降低精度
    this.checkInterval = 5 // 每 5ms 檢查一次（200Hz），2倍提升精準捕捉停止位置
    // 可選值：
    //   5 - 高頻（當前值，200Hz）
    //   10 - 中高頻（100Hz）
    //   20 - 中頻（50Hz）
    //   50 - 低頻（20Hz）
    // 註：降低檢查頻率會影響停止線對齁精度！

    this.isLocked = false // 🔒 停止鎖定標誌：防止停止後抖動
    this.lockedDistance = null // 鎖定的目標距離
  }

  /**
   * 設置交通燈控制器（外部注入）
   */
  setTrafficController(trafficController) {
    this.trafficController = trafficController
  }

  /**
   * 🔧 內部計算：獲取停止線位置
   * 直接從 DOM 計算，確保精度
   */
  _getStopLinePosition() {
    const centralRef = document.querySelector('.central-reference')
    const container = document.querySelector('.crossroad-area')
    if (!centralRef || !container) return null

    const centralRect = centralRef.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const centralX = centralRect.left - containerRect.left
    const centralY = centralRect.top - containerRect.top
    const centralWidth = centralRect.width
    const centralHeight = centralRect.height

    switch (this.vehicle.direction) {
      case 'east':
        return { type: 'x', value: centralX } // 東向停止線在中央矩形左邊界
      case 'west':
        return { type: 'x', value: centralX + centralWidth } // 西向停止線在中央矩形右邊界
      case 'north':
        return { type: 'y', value: centralY + centralHeight } // 北向停止線在中央矩形下邊界
      case 'south':
        return { type: 'y', value: centralY } // 南向停止線在中央矩形上邊界
      default:
        return null
    }
  }

  /**
   * 🔧 內部計算：獲取車頭位置
   * 直接從車輛元素計算，確保精度
   */
  _getVehicleHeadPosition() {
    const element = this.vehicle.element
    if (!element) return null

    const rect = element.getBoundingClientRect()
    const container = document.querySelector('.crossroad-area')
    if (!container) return null
    const containerRect = container.getBoundingClientRect()

    // 車輛在容器中的相對位置
    const x = rect.left - containerRect.left
    const y = rect.top - containerRect.top
    const width = rect.width
    const height = rect.height

    switch (this.vehicle.direction) {
      case 'east':
        return { type: 'x', value: x + width } // 東向車頭在右側
      case 'west':
        return { type: 'x', value: x } // 西向車頭在左側
      case 'north':
        return { type: 'y', value: y } // 北向車頭在上方
      case 'south':
        return { type: 'y', value: y + height } // 南向車頭在下方
      default:
        return null
    }
  }

  /**
   * 🔧 內部計算：直接計算距離停止線的距離
   * 不依賴外部方法，完全控制精度
   *
   * ⚠️ 重要：此方法計算的是「原始距離」（不包含偏移調整）
   * 偏移調整在 checkSimpleCollision() 和 _checkTrafficLightStop() 中進行
   */
  _calculateDistanceToStopLine() {
    const stopLine = this._getStopLinePosition()
    const vehicleHead = this._getVehicleHeadPosition()

    if (!stopLine || !vehicleHead) return null

    // ✅ 計算原始距離：停止線位置 - 車頭位置（不含偏移）
    let distance = null
    if (stopLine.type === 'x' && vehicleHead.type === 'x') {
      // 東西向
      if (this.vehicle.direction === 'east') {
        // 東向：距離 = 停止線 - 車頭
        distance = stopLine.value - vehicleHead.value
      } else {
        // 西向：距離 = 車頭 - 停止線
        distance = vehicleHead.value - stopLine.value
      }
    } else if (stopLine.type === 'y' && vehicleHead.type === 'y') {
      // 南北向
      if (this.vehicle.direction === 'south') {
        // 南向：距離 = 停止線 - 車頭
        distance = stopLine.value - vehicleHead.value
      } else {
        // 北向：距離 = 車頭 - 停止線
        distance = vehicleHead.value - stopLine.value
      }
    }

    return distance
  }

  /**
   * 簡化版碰撞檢查
   * 邏輯：
   * 1. 燈號停止（紅/黃/全紅）→ 停止
   * 2. 距離停止線太近（< 停止線偏移）→ 停止（精準對齐）
   * 3. 距離 < TARGET_SPACING → 停止（前車碰撞檢測）
   * 4. 距離 >= TARGET_SPACING → 自由加速
   *
   * 返回值：{ targetSpeed, reason, distance, frontVehicle, ... } 或 null
   */
  checkSimpleCollision(allVehicles) {
    const now = Date.now()
    if (now - this.lastCheckTime < this.checkInterval) {
      return null
    }
    this.lastCheckTime = now

    // 🎯 優先級調整（重要！）：
    // 1️⃣ 前方碰撞檢查（優先級最高，因為直接關係安全）
    // 2️⃣ 停止線對齁檢查（次優先級）
    // 3️⃣ 燈號停止檢查（優先級最低，前車狀態更重要）

    // 第一步：檢查前方碰撞（優先級最高）
    // 🔴 重要：必須先檢查前方是否有車，有的話就返回前車相關指令
    // 這樣才能實現蠕動跟隨功能
    const frontVehicle = this._findClosestFrontVehicle(allVehicles)
    if (frontVehicle) {
      // 有前車，執行碰撞邏輯
      const distance = this._getDistance(this.vehicle, frontVehicle)
      const frontSpeed = frontVehicle.movementTimeline?.timeScale() || 0

      // 🎯 根據方向選擇不同的觸發距離（雙觸發點滯後機制）
      // 南北向車更短，需要稍大的間距保持視覺一致
      const crawlTriggerDistance =
        this.vehicle.direction === 'south' || this.vehicle.direction === 'north'
          ? COLLISION_CONFIG.CRAWL_TRIGGER_DISTANCE_VERTICAL
          : COLLISION_CONFIG.CRAWL_TRIGGER_DISTANCE

      const stopTriggerDistance =
        this.vehicle.direction === 'south' || this.vehicle.direction === 'north'
          ? COLLISION_CONFIG.STOP_TRIGGER_DISTANCE_VERTICAL
          : COLLISION_CONFIG.STOP_TRIGGER_DISTANCE

      // 🎯 三段邏輯（滯後機制）：
      // 1. 距離 >= CRAWL_TRIGGER_DISTANCE：自由加速
      // 2. CRAWL_TRIGGER_DISTANCE > 距離 > STOP_TRIGGER_DISTANCE：蠕動跟隨
      // 3. 距離 <= STOP_TRIGGER_DISTANCE：停止（防止重疊）

      if (distance > crawlTriggerDistance) {
        // 距離很遠：自由加速
        return {
          targetSpeed: undefined, // 允許自由加速
          reason: `自由：距離${distance.toFixed(1)}px > 蠕動觸發${crawlTriggerDistance}px`,
          distance: distance,
          frontVehicle: frontVehicle,
          frontVehicleIsMoving: frontSpeed > 0.01,
          action: 'free',
        }
      } else if (distance > stopTriggerDistance) {
        // 距離中等：蠕動跟隨
        // 🐌 雙觸發滯後機制：
        //   - 當距離 > CRAWL_TRIGGER_DISTANCE 時進入「自由」狀態
        //   - 當距離 < STOP_TRIGGER_DISTANCE 時進入「停止」狀態
        //   - 在中間區域進行蠕動跟隨
        //   - 這樣防止狀態頻繁抖動，也防止重疊
        //
        return {
          targetSpeed: COLLISION_CONFIG.CRAWL_SPEED,
          reason: `蠕行跟隨：距離${distance.toFixed(1)}px 在蠕動區間[${stopTriggerDistance}, ${crawlTriggerDistance}]px，以${COLLISION_CONFIG.CRAWL_SPEED}速度跟隨`,
          distance: distance,
          frontVehicle: frontVehicle,
          frontVehicleIsMoving: frontSpeed > 0.01,
          action: 'crawl_follow',
        }
      } else {
        // 距離很近：停止（防止重疊）
        // 🛑 當距離 <= STOP_TRIGGER_DISTANCE 時，立即停止
        //    不再進行蠕動跟隨，完全停止
        //    這是防止重疊的最後一道防線
        //
        return {
          targetSpeed: 0,
          reason: `停止（防重疊）：距離${distance.toFixed(1)}px <= 停止觸發${stopTriggerDistance}px，停止跟隨以防重疊`,
          distance: distance,
          frontVehicle: frontVehicle,
          frontVehicleIsMoving: frontSpeed > 0.01,
          action: 'collision_stop',
        }
      }
    }

    // 沒有前車時，檢查停止線對齁
    // 第二步：檢查距離停止線是否太近（精準對齁）
    // 🔧 使用內部計算的距離，確保精度
    const distanceToStopLine = this._calculateDistanceToStopLine()
    if (distanceToStopLine !== null && distanceToStopLine !== undefined) {
      // 🔧 激進的停止邏輯：嚴格模式，容差 = 0
      const effectiveOffset =
        COLLISION_CONFIG.STOP_LINE_OFFSET +
        (COLLISION_CONFIG.STOP_LINE_OFFSET_BY_DIRECTION[this.vehicle.direction] || 0)

      // ✅ 改進版停止判斷：
      // 1. 激進停止：距離 <= 偏移量（無容差）
      // 2. 停止鎖定：一旦停止就持續返回停止指令，防止抖動
      if (distanceToStopLine <= effectiveOffset) {
        this.isLocked = true
        this.lockedDistance = effectiveOffset
        return {
          targetSpeed: 0,
          reason: `停止線對齁（鎖定）：距離${distanceToStopLine.toFixed(2)}px，目標${effectiveOffset}px`,
          distance: distanceToStopLine,
          action: 'align_to_stop_line_locked',
        }
      }
    }

    // 解除鎖定條件：距離恢復到很遠時
    if (this.isLocked && distanceToStopLine !== null && distanceToStopLine > this.lockedDistance + 20) {
      this.isLocked = false
      this.lockedDistance = null
    }

    // 第三步：檢查燈號停止（優先級最低，只在沒有前車時檢查）
    // 🔴 重要：只有在沒有前車時才檢查燈號
    // 有前車時，已經在前面返回過了，不會執行到這裡
    const trafficLightStop = this._checkTrafficLightStop()
    if (trafficLightStop) {
      return trafficLightStop
    }

    // 沒有碰撞，沒有停止線限制，也沒有燈號限制
    // 返回「無碰撞」狀態
    return {
      targetSpeed: undefined, // 允許自由加速
      reason: `無碰撞：沒有前車，可以自由加速`,
      distance: null,
      frontVehicle: null,
      action: 'free',
    }
  }

  /**
   * 檢查燈號停止規則
   * 規則：
   * - 紅燈/全紅且接近停止線時 → 停止
   * - 黃燈 → 允許繼續走
   * - 綠燈、左轉綠燈 → 放行
   * 返回值：{ targetSpeed, reason, distance, action } 或 null
   */
  _checkTrafficLightStop() {
    if (!this.trafficController) {
      return null
    }

    // 🔧 使用內部計算的距離
    const distanceToStopLine = this._calculateDistanceToStopLine()
    if (distanceToStopLine === null || distanceToStopLine === undefined) {
      return null
    }

    // 獲取當前燈號狀態
    const lightState = this.trafficController.getCurrentLightState(this.vehicle.direction)

    // 黃燈：允許繼續走
    if (lightState === 'yellow') {
      return null
    }

    // 紅燈/全紅：接近停止線時停止
    const stopLightStates = ['red', 'allRed']
    if (stopLightStates.includes(lightState)) {
      const effectiveOffset =
        COLLISION_CONFIG.STOP_LINE_OFFSET +
        (COLLISION_CONFIG.STOP_LINE_OFFSET_BY_DIRECTION[this.vehicle.direction] || 0)

      // ✅ 改進版停止邏輯：無容差，激進停止
      if (distanceToStopLine <= effectiveOffset) {
        this.isLocked = true
        this.lockedDistance = effectiveOffset
        return {
          targetSpeed: 0,
          reason: `燈號停止（${lightState}）（鎖定）：距離${distanceToStopLine.toFixed(2)}px，目標${effectiveOffset}px`,
          distance: distanceToStopLine,
          lightState: lightState,
          action: 'traffic_light_stop_locked',
        }
      }

      return null
    }

    // 綠燈或左轉綠燈：允許通過
    return null
  }

  /**
   * 找前方最近的車輛
   */
  _findClosestFrontVehicle(allVehicles) {
    let closest = null
    let minDistance = Infinity

    const myPos = this.vehicle.getCurrentPosition()
    if (!myPos) return null

    for (const other of allVehicles) {
      // 同方向同車道
      if (
        other.id === this.vehicle.id ||
        other.direction !== this.vehicle.direction ||
        other.laneNumber !== this.vehicle.laneNumber
      ) {
        continue
      }

      const otherPos = other.getCurrentPosition()
      if (!otherPos) continue

      const distance = this._getDistance(this.vehicle, other)

      // 只看前方的車（距離 > 0）且在檢查範圍內（< DETECTION_RANGE）
      if (distance > 0 && distance < COLLISION_CONFIG.DETECTION_RANGE && distance < minDistance) {
        closest = other
        minDistance = distance
      }
    }

    return closest
  }

  /**
   * 計算兩車之間的距離（中心到中心）
   * 然後根據車寬度調整為「邊界到邊界的實際間距」
   *
   * ⚠️ 重要：南北向和東西向車的長度不同
   * 東西向：width = 25-35px（長軸）
   * 南北向：height = 15-20px（短軸，旋轉後作為長軸）
   * 為保持一致的視覺間距，我們基於前車的方向來計算長度
   */
  _getDistance(vehicle1, vehicle2) {
    const pos1 = vehicle1.getCurrentPosition()
    const pos2 = vehicle2.getCurrentPosition()

    if (!pos1 || !pos2) return Infinity

    // 中心到中心的距離
    let centerDistance = 0
    switch (vehicle1.direction) {
      case 'east':
        centerDistance = pos2.x - pos1.x
        break
      case 'west':
        centerDistance = pos1.x - pos2.x
        break
      case 'south':
        centerDistance = pos2.y - pos1.y
        break
      case 'north':
        centerDistance = pos1.y - pos2.y
        break
      default:
        return Infinity
    }

    // 獲取兩車的配置
    const config1 = vehicle1.getVehicleConfig()
    const config2 = vehicle2.getVehicleConfig()

    // 根據方向確定「縱軸長度」（前進方向的長度）
    let vehicle1Length = 0
    let vehicle2Length = 0

    switch (vehicle1.direction) {
      case 'east':
      case 'west':
        // 水平移動：width 是縱軸（前進方向的長度）
        vehicle1Length = config1.width
        vehicle2Length = config2.width
        break
      case 'south':
      case 'north':
        // 垂直移動：height 是縱軸（旋轉後為前進方向的長度）
        vehicle1Length = config1.height
        vehicle2Length = config2.height
        break
    }

    // 實際間距 = 中心距離 - 車1後半長 - 車2前半長
    const actualSpacing = centerDistance - vehicle1Length / 2 - vehicle2Length / 2

    return actualSpacing
  }

  /**
   * 檢查該車是否是最接近停止線的車
   * 用途：判斷該車是否是同方向同車道的首車
   */
  isClosestToStopLine(allVehicles) {
    const myDistance = this.vehicle.position?.distance || Infinity

    // 遍歷所有車輛
    for (const other of allVehicles) {
      // 同方向同車道的其他車
      if (
        other.id === this.vehicle.id ||
        other.direction !== this.vehicle.direction ||
        other.laneNumber !== this.vehicle.laneNumber
      ) {
        continue
      }

      const otherDistance = other.position?.distance || Infinity

      // 如果有其他車距離停止線更近，則我不是最接近的
      if (otherDistance > 0 && otherDistance < myDistance) {
        return false
      }
    }

    return true
  }

  /**
   * 清理資源（用於車輛銷毀時）
   */
  dispose() {
    // 簡化版碰撞控制器沒有需要清理的外部資源
    // 只需將引用置空
    this.vehicle = null
    this.trafficController = null
  }
}

// 🔧 導出配置供其他模塊使用
export { COLLISION_CONFIG }

// ⚠️ 碰撞檢查邏輯（雙觸發點滯後機制）：
//
// 📊 三段流程：
//
//   距離 ←─────────────────────────────────────→
//        ↑                                    ↑
//    STOP_TRIGGER              CRAWL_TRIGGER
//    (20/30px)                 (50/60px)
//
//   1️⃣ 距離 > CRAWL_TRIGGER      → 自由加速 🟢
//   2️⃣ CRAWL_TRIGGER > 距離 > STOP_TRIGGER → 蠕動跟隨 🟡
//   3️⃣ 距離 <= STOP_TRIGGER     → 停止 🔴
//
// 💡 為什麼使用雙觸發點？
//
//    舊方案（單觸發點）：
//    - 一個 TARGET_SPACING = 50px
//    - 距離 > 50 → 自由
//    - 距離 < 50 → 蠕動
//    - 問題：距離在 50px 附近頻繁切換，容易抖動和重疊
//
//    新方案（雙觸發點滯後）：
//    - 進入觸發點：CRAWL_TRIGGER = 50px（進入蠕動的距離）
//    - 退出觸發點：STOP_TRIGGER = 20px（退出蠕動的距離）
//    - 優點：
//      ✅ 防止抖動：距離在 50px 附近不會頻繁切換
//      ✅ 防止重疊：距離 < 20px 時立即停止
//      ✅ 蠕動穩定：蠕動區間 [20, 50] 清晰明確
//      ✅ 可用更快的蠕動速度：因為有停止距離保護
