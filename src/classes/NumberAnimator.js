/**
 * NumberAnimator.js - 數字動畫管理類
 * 使用 GSAP 實現數字平滑過渡動畫
 * 支援多種動畫類型，易於擴充
 */

import { gsap } from 'gsap'

export class NumberAnimator {
  constructor() {
    this.animations = new Map() // 追蹤各個元素的動畫
    // ✅ 精簡：移除 elementMap 和 valueStore（未使用）
  }

  /**
   * 輔助方法：格式化數字（千位分隔符）
   * @param {number} value - 要格式化的數值
   * @param {number} decimals - 小數位數
   * @param {string} delimiter - 千位分隔符
   * @returns {string} - 格式化後的字符串
   */
  formatNumber(value, decimals = 0, delimiter = ',') {
    const fixed = Number(value).toFixed(decimals)
    const parts = fixed.split('.')
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, delimiter)
    return decimals > 0 ? `${intPart}.${parts[1]}` : intPart
  }

  /**
   * 類型 1：數字滾動計數器（推薦）
   * 效果：數字從舊值平滑滾動到新值
   *
   * @param {HTMLElement|string} target - DOM 元素或 CSS 選擇器
   * @param {number} targetValue - 目標值
   * @param {Object} options - 配置選項
   *   - duration: 動畫時長（秒），預設 0.8
   *   - decimals: 小數位數，預設 0
   *   - prefix: 前綴（如 "$"），預設 ''
   *   - suffix: 後綴（如 "%"），預設 ''
   *   - delimiter: 千位分隔符，預設 ','
   *   - ease: 緩動函數，預設 'power2.out'
   *   - onComplete: 完成回調函數
   */
  animateCounter(target, targetValue, options = {}) {
    const {
      duration = 3.5, // ✅ 改為 0.8（與實際使用一致，而非 1.2）
      decimals = 0,
      prefix = '',
      suffix = '',
      ease = 'power2.out',
      delimiter = ',',
      onComplete = null,
    } = options

    // ✨ 支援選擇器或 DOM 元素
    let element = target
    if (typeof target === 'string') {
      element = document.querySelector(target)
    }

    if (!element) {
      console.warn('❌ NumberAnimator.animateCounter: element not found')
      return
    }

    // 取得當前值（若無則為 0）
    const current = parseFloat(element.dataset.value) || 0
    const targetNum = Number(targetValue) || 0

    // 若已有動畫在執行，先中斷
    if (this.animations.has(element)) {
      this.animations.get(element).kill()
      this.animations.delete(element)
    }

    // 若目標值與當前值相同，不進行動畫
    if (current === targetNum) {
      element.textContent = `${prefix}${this.formatNumber(targetNum, decimals, delimiter)}${suffix}`
      element.dataset.value = targetNum
      return
    }

    // 建立動畫物件
    const animationObj = { value: current }

    // GSAP 動畫
    const timeline = gsap.to(animationObj, {
      value: targetNum,
      duration,
      ease,
      onUpdate: () => {
        // 格式化數字並更新 DOM
        const formattedValue = this.formatNumber(animationObj.value, decimals, delimiter)
        element.textContent = `${prefix}${formattedValue}${suffix}`
      },
      onComplete: () => {
        // 儲存最終值
        element.dataset.value = targetNum
        if (onComplete) onComplete()
        this.animations.delete(element)
      },
    })

    // 儲存動畫引用
    this.animations.set(element, timeline)
  }

  /**
   * 類型 2：縮放 + 顏色閃爍（未來擴充）
   * 效果：數字同時變大、變色、再縮小回原大小
   *
   * @param {HTMLElement} element - 要更新的 DOM 元素
   * @param {number} targetValue - 目標值
   */
  // eslint-disable-next-line no-unused-vars
  animateScalePulse(element, targetValue) {
    // TODO: 未來實作
    console.warn('⚠️ animateScalePulse 功能開發中...')
  }

  /**
   * ✨ 通用動畫方法：用於 Vue watch 或直接綁定
   * 直接傳入變數值，自動創建臨時元素或更新現有元素
   *
   * 用法 1：傳入 DOM 元素
   *   const el = document.querySelector('.my-number')
   *   numberAnimator.updateValue(el, newValue, { suffix: ' km/h' })
   *
   * 用法 2：傳入 CSS 選擇器
   *   numberAnimator.updateValue('[data-key="east-speed"]', newValue)
   *
   * 用法 3：只有變數 ref，自動管理元素
   *   const valueRef = ref(123)
   *   const elementRef = numberAnimator.updateValue(valueRef, { suffix: '%' })
   *
   * @param {HTMLElement|string|Ref} target - DOM 元素、CSS 選擇器或 Vue ref
   * @param {number|Object} valueOrOptions - 新值或配置物件
   * @param {Object} optionsArg - 配置選項（第二個參數是值時使用）
   * @returns {HTMLElement|void} - 如果是 Ref 會建立臨時元素
   */
  updateValue(target, valueOrOptions = {}, optionsArg = {}) {
    let element = target
    let newValue
    let options = {}

    // 判斷參數類型
    if (typeof valueOrOptions === 'number' || valueOrOptions === null) {
      // updateValue(element, 123, { suffix: '%' })
      newValue = valueOrOptions
      options = optionsArg
    } else {
      // updateValue(element, { suffix: '%', duration: 1 })
      newValue = valueOrOptions.value !== undefined ? valueOrOptions.value : 0
      options = valueOrOptions
    }

    // 處理選擇器
    if (typeof target === 'string') {
      element = document.querySelector(target)
      if (!element) {
        console.warn(`❌ NumberAnimator.updateValue: element not found for selector "${target}"`)
        return
      }
    }

    // 處理 Vue ref
    if (target && typeof target === 'object' && 'value' in target) {
      // 這是一個 Vue ref，建立臨時元素
      element = document.createElement('span')
      element.style.display = 'none' // 隱藏
      document.body.appendChild(element)
      newValue = target.value
    }

    if (!element) {
      console.warn('❌ NumberAnimator.updateValue: invalid target')
      return element
    }

    // 呼叫 animateCounter 進行動畫
    this.animateCounter(element, newValue, {
      duration: 0.8,
      decimals: 0,
      delimiter: ',',
      ease: 'power2.out',
      ...options, // 允許覆蓋預設選項
    })

    return element
  }

  /**
   * 停止特定元素的動畫
   * @param {HTMLElement} element - 要停止動畫的元素
   */
  stop(element) {
    if (this.animations.has(element)) {
      this.animations.get(element).kill()
      this.animations.delete(element)
    }
  }

  /**
   * 停止所有動畫
   */
  stopAll() {
    this.animations.forEach((animation) => {
      if (animation && animation.kill) {
        animation.kill()
      }
    })
    this.animations.clear()
  }

  /**
   * 取得動畫狀態（用於調試）
   * @returns {number} - 當前正在執行的動畫數量
   */
  getActiveAnimationsCount() {
    return this.animations.size
  }
}

// 建立全局單例實例
export const numberAnimator = new NumberAnimator()
