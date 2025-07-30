// TrafficLight.js - 紅綠燈控制類別
export default class TrafficLight {
  constructor(element) {
    this.element = element
    this.currentState = 'green' // 初始狀態：green, yellow, red
    this.imgElement = element.querySelector('img')
  }

  // 設置紅綠燈狀態
  setState(state) {
    this.currentState = state

    switch (state) {
      case 'green':
        this.imgElement.src = '/images/light/greenLight.png'
        break
      case 'yellow':
        this.imgElement.src = '/images/light/yellowLight.png'
        break
      case 'red':
        this.imgElement.src = '/images/light/redLight.png'
        break
    }
  }

  // 獲取當前狀態
  getState() {
    return this.currentState
  }

  // 綠燈 -> 黃燈 -> 紅燈的循環
  async changeToNext() {
    switch (this.currentState) {
      case 'green':
        this.setState('yellow')
        break
      case 'yellow':
        this.setState('red')
        break
      case 'red':
        this.setState('green')
        break
    }
  }
}
