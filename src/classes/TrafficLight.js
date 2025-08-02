/**
 * TrafficLight.js - 紅綠燈控制類別
 *
 * 設計模式:
 * - State Pattern (狀態模式): 管理三種燈號狀態 (red/yellow/green)
 * - Strategy Pattern (策略模式): 不同狀態下的視覺呈現策略
 * - Command Pattern (命令模式): 狀態切換命令的封裝
 * - Facade Pattern (外觀模式): 簡化 DOM 操作的複雜性
 *
 * 系統角色:
 * - 視覺指示器: 向用戶和車輛顯示當前交通狀態
 * - 狀態載體: 承載和展現交通燈的邏輯狀態
 * - UI 組件: 負責燈號的視覺呈現和動畫效果
 * - 信號發送器: 為車輛提供通行/停止的視覺信號
 */
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
