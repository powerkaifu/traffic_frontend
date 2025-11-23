/**
 * logger.js - 統一日誌工具
 * 在開發環境顯示所有日誌，生產環境只顯示錯誤
 */

// 檢測是否為開發環境
const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'

/**
 * 統一日誌介面
 * 開發環境: 顯示所有日誌
 * 生產環境: 只顯示錯誤日誌
 */
export const logger = {
  /**
   * 一般訊息日誌（僅開發環境）
   */
  log: (...args) => {
    if (isDev) console.log(...args)
  },

  /**
   * 警告日誌（僅開發環境）
   */
  warn: (...args) => {
    if (isDev) console.warn(...args)
  },

  /**
   * 錯誤日誌（始終顯示）
   */
  error: (...args) => {
    console.error(...args)
  },

  /**
   * 性能追蹤日誌（僅開發環境）
   */
  perf: (label, ...args) => {
    if (isDev) console.log(`[PERF] ${label}`, ...args)
  },

  /**
   * 調試日誌（已禁用以減少控制台噪音）
   */
  debug: (label, ...args) => {
    // logger.debug 已禁用以保持控制台清潔
    // if (isDev) console.log(`[DEBUG] ${label}`, ...args)
  },

  /**
   * 分組日誌（僅開發環境）
   */
  group: (label) => {
    if (isDev) console.group(label)
  },

  groupEnd: () => {
    if (isDev) console.groupEnd()
  },
}

export default logger
