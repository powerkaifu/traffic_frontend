/**
 * useLumoTooltip.js - Lumo 提示工具的可組合函數
 * 用於簡化在模板中重複的 @mouseenter 和 @mouseleave 事件綁定
 *
 * 使用方式（在 script setup 中）：
 *   import { useLumoTooltip } from '@/composables/useLumoTooltip'
 *   const { bindTooltip } = useLumoTooltip()
 *
 * 在模板中：
 *   <div v-bind="bindTooltip('tooltipKey')">...</div>
 *   或
 *   <button v-bind="bindTooltip('buttonKey')">...</button>
 */

import { ref } from 'vue'

// 工具方法
function getTooltipMessage(messageOrKey) {
  // Lumo 系統翻譯
  const lumoMessages = {
    logo: '🏢 AI 智慧交通控制系統中心',
    simulationBtn: '📊 場景模擬與參數設定',
    visualizationBtn: '📈 交通數據可視化分析',
    tooltipToggle: '💡 開啟/關閉 Lumo 提示',
    adminBtn: '⚙️ 進入後台管理系統',
    menuBtn: '☰ 開啟/關閉側邊選單',
    modeToggle: '🔄 切換自動/手動模式',
    peakHours: '🚀 尖峰時段 (07-09, 17-19)',
    offPeak: '🌞 離峰時段 (10-16, 20-23)',
    lateNight: '🌙 凌晨時段 (00-06)',
    dataSection: '📊 即時交通數據展示',
  }

  // 如果是已知的 key，返回對應的訊息
  if (lumoMessages[messageOrKey]) {
    return lumoMessages[messageOrKey]
  }

  // 否則直接返回訊息
  return messageOrKey
}

function showLumoTooltip(messageOrKey, isTooltipEnabled) {
  // ✅ 檢查 Tooltip 是否啟用
  if (!isTooltipEnabled) {
    return
  }

  const message = getTooltipMessage(messageOrKey)

  if (!message) {
    if (process.env.DEV) console.warn('⚠️ [Tooltip] 訊息為空，跳過顯示')
    return
  }

  if (window.lumoTooltipManager) {
    window.lumoTooltipManager.show(message)
  } else {
    if (process.env.DEV) console.warn('⚠️ [Tooltip] lumoTooltipManager 未初始化')
  }
}

function hideLumoTooltip() {
  if (window.lumoTooltipManager) {
    window.lumoTooltipManager.hide()
  }
}

/**
 * 主要的可組合函數
 * @returns {Object} 包含 bindTooltip 和其他工具方法的物件
 */
export function useLumoTooltip(isTooltipEnabled = ref(false)) {
  /**
   * 綁定 Tooltip 事件到元素上
   * @param {string} tooltipKey - Tooltip 的鍵值或訊息
   * @param {boolean} stopPropagation - 是否停止事件冒泡（預設 false）
   * @returns {Object} 可以用 v-bind 綁定的事件物件
   */
  const bindTooltip = (tooltipKey, stopPropagation = false) => {
    return {
      [stopPropagation ? '@mouseenter.stop' : '@mouseenter']: () => showLumoTooltip(tooltipKey, isTooltipEnabled.value),
      '@mouseleave': hideLumoTooltip,
    }
  }

  return {
    bindTooltip,
    showLumoTooltip: (key) => showLumoTooltip(key, isTooltipEnabled.value),
    hideLumoTooltip,
    getTooltipMessage,
  }
}

export { showLumoTooltip, hideLumoTooltip, getTooltipMessage }
