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
    // Facade Pattern: 簡化DOM操作的複雜性，提供統一接口
    this.element = element

    // State Pattern: 定義交通燈的初始狀態，管理三種燈號狀態
    this.currentState = 'green' // 初始狀態：green, yellow, red

    // Facade Pattern: 封裝DOM查詢操作，隱藏複雜的DOM結構
    this.imgElement = element.querySelector('img')
  }

  // State Pattern + Strategy Pattern: 狀態設置方法
  setState(state) {
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
    }
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
