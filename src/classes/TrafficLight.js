/**
 * TrafficLight.js - 紅綠燈控制類別
 */
export default class TrafficLight {
  constructor(element) {
    // Facade Pattern: 簡化DOM操作的複雜性，提供統一接口
    this.element = element

    // State Pattern: 定義交通燈的初始狀態，管理三種燈號狀態
    this.currentState = 'red' // 🚦 修正：初始狀態設為紅燈，確保車輛先排隊

    // Facade Pattern: 封裝DOM查詢操作，隱藏複雜的DOM結構
    this.imgElement = element.querySelector('img')
  }

  // State Pattern + Strategy Pattern: 狀態設置方法
  setState(state) {
    console.log(`💡 [TrafficLight] setState 被調用，從 ${this.currentState} 變更為 ${state}`)

    // State Pattern: 更新當前狀態
    this.currentState = state

    // Strategy Pattern: 根據不同狀態使用不同的視覺呈現策略
    // Facade Pattern: 簡化圖片資源的管理和切換操作
    switch (state) {
      case 'green':
        // Strategy Pattern: 綠燈視覺策略
        this.imgElement.src = '/images/light/greenLight.png'
        break
      case 'yellow':
        // Strategy Pattern: 黃燈視覺策略
        this.imgElement.src = '/images/light/yellowLight.png'
        break
      case 'red':
        // Strategy Pattern: 紅燈視覺策略
        this.imgElement.src = '/images/light/redLight.png'
        break
      case 'leftGreen':
        // Strategy Pattern: 左轉綠燈視覺策略 - 使用 redLeftLight.png
        this.imgElement.src = '/images/light/redLeftLight.png'
        console.log(`💡 [TrafficLight] 左轉綠燈狀態，使用 redLeftLight.png`)
        break
      case 'leftYellow':
        // Strategy Pattern: 左轉黃燈視覺策略 - 使用 yellowLight.png
        this.imgElement.src = '/images/light/yellowLight.png'
        console.log(`💡 [TrafficLight] 左轉黃燈狀態，使用 yellowLight.png`)
        break
    }

    console.log(`💡 [TrafficLight] 狀態已更新為 ${this.currentState}，圖片路徑：${this.imgElement.src}`)
  }

  // State Pattern: 獲取當前狀態的查詢方法
  getState() {
    // State Pattern: 返回當前狀態，提供狀態查詢接口
    return this.currentState
  }

  // Command Pattern + State Pattern: 狀態循環切換命令
  async changeToNext() {
    // Command Pattern: 將狀態切換邏輯封裝為可執行的命令
    // State Pattern: 基於當前狀態決定下一個狀態的轉換規則
    switch (this.currentState) {
      case 'green':
        // State Pattern: 綠燈 -> 黃燈 狀態轉換
        this.setState('yellow')
        break
      case 'yellow':
        // State Pattern: 黃燈 -> 紅燈 狀態轉換
        this.setState('red')
        break
      case 'red':
        // State Pattern: 紅燈 -> 綠燈 狀態轉換
        this.setState('green')
        break
    }
  }
}
