const COLLISION_CONFIG = {
  COLLISION_DISTANCE: 15,
  COLLISION_DISTANCE_VERTICAL: 25,
  DETECTION_RANGE: 300,
  STOP_LINE_OFFSET: 0,
  STOP_LINE_OFFSET_BY_DIRECTION: {
    east: 7,
    west: 3,
    north: -2,
    south: 2,
  },
}

export class CollisionController {
  constructor(vehicle, trafficController = null) {
    this.vehicle = vehicle
    this.trafficController = trafficController
    this.lastCheckTime = 0
    this.checkInterval = 5
  }

  setTrafficController(trafficController) {
    this.trafficController = trafficController
  }

  checkSimpleCollision(allVehicles) {
    const now = Date.now()
    if (now - this.lastCheckTime < this.checkInterval) {
      return null
    }
    this.lastCheckTime = now

    const frontVehicle = this._findClosestFrontVehicle(allVehicles)
    if (frontVehicle) {
      const distance = this._getDistance(this.vehicle, frontVehicle)
      const collisionDistance =
        this.vehicle.direction === 'south' || this.vehicle.direction === 'north'
          ? COLLISION_CONFIG.COLLISION_DISTANCE_VERTICAL
          : COLLISION_CONFIG.COLLISION_DISTANCE

      if (distance <= collisionDistance) {
        return {
          targetSpeed: 0,
          action: 'collision_stop',
        }
      }
    }

    if (!frontVehicle) {
      const distanceToStopLine = this._calculateDistanceToStopLine()
      if (distanceToStopLine !== null) {
        const effectiveOffset =
          COLLISION_CONFIG.STOP_LINE_OFFSET +
          (COLLISION_CONFIG.STOP_LINE_OFFSET_BY_DIRECTION[this.vehicle.direction] || 0)

        if (distanceToStopLine <= effectiveOffset) {
          return {
            targetSpeed: 0,
            action: 'align_to_stop_line',
          }
        }
      }

      const trafficLightStop = this._checkTrafficLightStop()
      if (trafficLightStop) {
        return trafficLightStop
      }
    }

    return null
  }

  _checkTrafficLightStop() {
    if (!this.trafficController) return null

    const distanceToStopLine = this._calculateDistanceToStopLine()
    if (distanceToStopLine === null) return null

    const lightState = this.trafficController.getCurrentLightState(this.vehicle.direction)

    const stopLightStates = ['red', 'allRed']
    if (stopLightStates.includes(lightState)) {
      const effectiveOffset =
        COLLISION_CONFIG.STOP_LINE_OFFSET +
        (COLLISION_CONFIG.STOP_LINE_OFFSET_BY_DIRECTION[this.vehicle.direction] || 0)

      if (distanceToStopLine <= effectiveOffset) {
        return {
          targetSpeed: 0,
          action: 'traffic_light_stop',
        }
      }
    }

    return null
  }

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
        return { type: 'x', value: centralX }
      case 'west':
        return { type: 'x', value: centralX + centralWidth }
      case 'north':
        return { type: 'y', value: centralY + centralHeight }
      case 'south':
        return { type: 'y', value: centralY }
      default:
        return null
    }
  }

  _getVehicleHeadPosition() {
    const element = this.vehicle.element
    if (!element) return null

    const rect = element.getBoundingClientRect()
    const container = document.querySelector('.crossroad-area')
    if (!container) return null
    const containerRect = container.getBoundingClientRect()

    const x = rect.left - containerRect.left
    const y = rect.top - containerRect.top
    const width = rect.width
    const height = rect.height

    switch (this.vehicle.direction) {
      case 'east':
        return { type: 'x', value: x + width }
      case 'west':
        return { type: 'x', value: x }
      case 'north':
        return { type: 'y', value: y }
      case 'south':
        return { type: 'y', value: y + height }
      default:
        return null
    }
  }

  _calculateDistanceToStopLine() {
    const stopLine = this._getStopLinePosition()
    const vehicleHead = this._getVehicleHeadPosition()

    if (!stopLine || !vehicleHead) return null

    let distance = null
    if (stopLine.type === 'x' && vehicleHead.type === 'x') {
      distance =
        this.vehicle.direction === 'east' ? stopLine.value - vehicleHead.value : vehicleHead.value - stopLine.value
    } else if (stopLine.type === 'y' && vehicleHead.type === 'y') {
      distance =
        this.vehicle.direction === 'south' ? stopLine.value - vehicleHead.value : vehicleHead.value - stopLine.value
    }

    return distance
  }

  _findClosestFrontVehicle(allVehicles) {
    let closest = null
    let minDistance = Infinity

    for (const other of allVehicles) {
      if (
        other.id === this.vehicle.id ||
        other.direction !== this.vehicle.direction ||
        other.laneNumber !== this.vehicle.laneNumber
      ) {
        continue
      }

      const distance = this._getDistance(this.vehicle, other)

      if (distance > 0 && distance < COLLISION_CONFIG.DETECTION_RANGE && distance < minDistance) {
        closest = other
        minDistance = distance
      }
    }

    return closest
  }

  _getDistance(vehicle1, vehicle2) {
    const pos1 = vehicle1.getCurrentPosition()
    const pos2 = vehicle2.getCurrentPosition()

    if (!pos1 || !pos2) return Infinity

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

    const config1 = vehicle1.getVehicleConfig()
    const config2 = vehicle2.getVehicleConfig()

    let vehicle1Length = 0
    let vehicle2Length = 0

    switch (vehicle1.direction) {
      case 'east':
      case 'west':
        vehicle1Length = config1.width
        vehicle2Length = config2.width
        break
      case 'south':
      case 'north':
        vehicle1Length = config1.height
        vehicle2Length = config2.height
        break
    }

    const actualSpacing = centerDistance - vehicle1Length / 2 - vehicle2Length / 2
    return actualSpacing
  }

  dispose() {
    this.vehicle = null
    this.trafficController = null
  }
}

export { COLLISION_CONFIG }
