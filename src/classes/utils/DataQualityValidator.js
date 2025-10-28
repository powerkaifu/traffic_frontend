/**
 * 數據品質驗證與修正系統
 * ═══════════════════════════════════════════════════════════════════
 *
 * 目的：確保發送給後端的 VD 數據 100% 符合該時段的特徵範圍
 *
 * 問題背景：
 *  - 離峰時段應該 Volume_T ∈ [20-60]，但生成的數據常被限制在 [44-55]
 *  - 導致後端模型收到「不純粹」的信號，無法正確判斷時段
 *  - 結果：預測秒數不符合場景期望
 *
 * 解決方案（三層防線）：
 *  1️⃣ 驗證層：檢查每筆數據是否在時段允許範圍內
 *  2️⃣ 修正層：自動調整超出範圍的數值到合理區間
 *  3️⃣ 報告層：詳細記錄驗證結果和修正情況
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { VD_PATTERN_RANGES } from '../config/vdPatternConfig.js'

/**
 * 根據時段和路口 ID 獲取允許的數據範圍
 * @param {string} timePeriod - 時段 ('peak_hours', 'off_peak', 'late_night')
 * @param {string} vdId - 路口 ID ('VLRJM60', 'VLRJX00', 'VLRJX20')
 * @returns {Object} 允許的範圍對象
 */
export function getAllowedRangeForTimeSlot(timePeriod, vdId) {
  const config = VD_PATTERN_RANGES[timePeriod]
  if (!config || !config[vdId]) {
    // 容錯：回傳預設值
    return {
      Volume_T: [20, 60],
      Volume_M: [5, 25],
      Volume_S: [5, 30],
      Volume_L: [0, 10],
      Occupancy: [0, 100],
      Speed: [0, 130],
    }
  }
  return config[vdId].range
}

/**
 * 驗證單筆交叉路口數據是否符合時段範圍
 * @param {Object} data - 單筆 VD 數據
 * @param {string} timePeriod - 時段
 * @returns {Object} 驗證結果 { isValid, violations, details }
 */
export function validateDataForTimeSlot(data, timePeriod) {
  const vdId = data.VD_ID || 'VLRJM60'
  const allowedRange = getAllowedRangeForTimeSlot(timePeriod, vdId)

  const violations = []
  const details = {
    VD_ID: vdId,
    timePeriod: timePeriod,
    fields: {},
  }

  // 檢查每個關鍵欄位
  const fieldsToCheck = ['Volume_T', 'Volume_M', 'Volume_S', 'Volume_L', 'Occupancy', 'Speed']

  fieldsToCheck.forEach((field) => {
    const value = data[field]
    const [min, max] = allowedRange[field] || [0, 100]

    const isValid = value >= min && value <= max

    details.fields[field] = {
      value: value,
      min: min,
      max: max,
      isValid: isValid,
      deviation: isValid ? 0 : value < min ? min - value : value - max,
    }

    if (!isValid) {
      violations.push({
        field: field,
        value: value,
        expectedRange: `[${min}-${max}]`,
        deviation: value < min ? `低於最小值 ${min - value} 輛/百分比` : `超過最大值 ${value - max} 輛/百分比`,
      })
    }
  })

  return {
    isValid: violations.length === 0,
    violationCount: violations.length,
    violations: violations,
    details: details,
    compliancePercentage: ((fieldsToCheck.length - violations.length) / fieldsToCheck.length) * 100,
  }
}

/**
 * 修正超出範圍的數據到合理區間
 * @param {Object} data - 單筆 VD 數據
 * @param {string} timePeriod - 時段
 * @returns {Object} 修正後的數據 + 修正記錄
 */
export function rectifyDataForTimeSlot(data, timePeriod) {
  const vdId = data.VD_ID || 'VLRJM60'
  const allowedRange = getAllowedRangeForTimeSlot(timePeriod, vdId)

  const originalData = { ...data }
  const rectifications = []

  // 修正每個欄位
  const fieldsToRectify = ['Volume_T', 'Volume_M', 'Volume_S', 'Volume_L', 'Occupancy', 'Speed']

  fieldsToRectify.forEach((field) => {
    const value = data[field]
    const [min, max] = allowedRange[field] || [0, 100]

    if (value < min) {
      // 低於最小值：設置為 min + 隨機浮動 (±10%)
      const randomVariation = Math.random() * (max - min) * 0.1 // ±10% 範圍內浮動
      const newValue = Math.max(min, min + randomVariation)

      data[field] = Math.round(newValue * 10) / 10
      rectifications.push({
        field: field,
        original: value,
        corrected: data[field],
        reason: `低於最小值 ${min}，已調整`,
      })
    } else if (value > max) {
      // 超過最大值：設置為 max - 隨機浮動 (±10%)
      const randomVariation = Math.random() * (max - min) * 0.1 // ±10% 範圍內浮動
      const newValue = Math.min(max, max - randomVariation)

      data[field] = Math.round(newValue * 10) / 10
      rectifications.push({
        field: field,
        original: value,
        corrected: data[field],
        reason: `超過最大值 ${max}，已調整`,
      })
    }
  })

  return {
    originalData: originalData,
    rectifiedData: data,
    rectifications: rectifications,
    rectificationCount: rectifications.length,
    wasRectified: rectifications.length > 0,
  }
}

/**
 * 驗證並修正整個數據陣列
 * @param {Array} dataArray - 多筆交叉路口數據陣列
 * @param {string} timePeriod - 時段
 * @returns {Object} 完整的驗證和修正報告
 */
export function validateAndRectifyDataArray(dataArray, timePeriod) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return {
      status: 'error',
      message: '數據陣列無效或為空',
      totalRecords: 0,
      validRecords: 0,
      rectifiedRecords: 0,
      compliancePercentage: 0,
    }
  }

  const results = {
    timePeriod: timePeriod,
    totalRecords: dataArray.length,
    validRecords: 0,
    rectifiedRecords: 0,
    invalidRecords: 0,
    allDataValid: true,
    validationResults: [],
    rectificationResults: [],
    summary: {},
  }

  dataArray.forEach((data, index) => {
    // 🔍 步驟 1：驗證數據
    const validationResult = validateDataForTimeSlot(data, timePeriod)

    if (validationResult.isValid) {
      // ✅ 數據有效，無需修正
      results.validRecords++
      results.validationResults.push({
        index: index,
        status: 'valid',
        vdId: data.VD_ID,
        validation: validationResult,
      })
    } else {
      // ⚠️ 數據無效，進行修正
      results.allDataValid = false

      // 🔧 步驟 2：自動修正
      const rectifyResult = rectifyDataForTimeSlot(data, timePeriod)

      // 將修正後的數據寫回原陣列
      Object.assign(data, rectifyResult.rectifiedData)

      results.rectifiedRecords++
      results.validationResults.push({
        index: index,
        status: 'rectified',
        vdId: data.VD_ID,
        validation: validationResult,
        rectification: rectifyResult,
      })
    }
  })

  // 計算統計信息
  results.summary = {
    totalRecords: results.totalRecords,
    validCount: results.validRecords,
    rectifiedCount: results.rectifiedRecords,
    compliancePercentage: (results.validRecords / results.totalRecords) * 100,
    rectificationPercentage: (results.rectifiedRecords / results.totalRecords) * 100,
    allCompliant: results.allDataValid,
    status: results.allDataValid ? '✅ 全部合規' : `⚠️ ${results.rectifiedRecords} 筆已自動修正`,
  }

  return results
}

/**
 * 生成詳細的驗證報告用於控制台列印
 * @param {Object} validationResult - validateAndRectifyDataArray 的返回值
 * @returns {string} 格式化的報告文本
 */
export function generateValidationReport(validationResult) {
  const { timePeriod, totalRecords, validRecords, rectifiedRecords, summary, validationResults } = validationResult

  let report = `
╔════════════════════════════════════════════════════════════════════════╗
║                    📊 數據品質驗證報告 (Quality Check)                 ║
╚════════════════════════════════════════════════════════════════════════╝

📍 時段: ${timePeriod}
📦 總筆數: ${totalRecords}
✅ 合規筆數: ${validRecords}
🔧 修正筆數: ${rectifiedRecords}
📈 合規率: ${summary.compliancePercentage.toFixed(1)}%

════════════════════════════════════════════════════════════════════════

`

  // 詳細信息
  validationResults.forEach((result, index) => {
    const { vdId, status, validation, rectification } = result

    if (status === 'valid') {
      report += `✅ [交叉路口 ${index + 1}] ${vdId} - 合規\n`
      report += `   所有欄位符合 ${timePeriod} 的允許範圍\n\n`
    } else {
      report += `🔧 [交叉路口 ${index + 1}] ${vdId} - 已修正\n`
      report += `   發現 ${validation.violationCount} 個不符合項目：\n`

      validation.violations.forEach((violation) => {
        report += `     • ${violation.field}: ${violation.value} ${violation.deviation}\n`
      })

      if (rectification.rectifications.length > 0) {
        report += `   修正記錄：\n`
        rectification.rectifications.forEach((rect) => {
          report += `     • ${rect.field}: ${rect.original} → ${rect.corrected} (${rect.reason})\n`
        })
      }
      report += `\n`
    }
  })

  // 總結
  report += `════════════════════════════════════════════════════════════════════════
📌 結論: ${summary.status}
   • 可以安全地發送給後端模型
   • 所有數據已確保符合時段特徵範圍
╚════════════════════════════════════════════════════════════════════════╝
`

  return report
}

/**
 * 簡潔版驗證報告（適合實時監控）
 * @param {Object} validationResult
 * @returns {string} 簡潔文本
 */
export function generateValidationSummary(validationResult) {
  const { timePeriod, validRecords, rectifiedRecords, summary } = validationResult

  return `
🔍 【數據品質檢查】時段: ${timePeriod}
   ✅ 合規: ${validRecords} 筆 | 🔧 修正: ${rectifiedRecords} 筆 | 📈 合規率: ${summary.compliancePercentage.toFixed(1)}%
   📌 狀態: ${summary.status}
`
}

/**
 * 特殊功能：詳細分析某個時段的數據特徵
 * @param {Array} dataArray - VD 數據陣列
 * @param {string} timePeriod - 時段
 * @returns {Object} 詳細統計
 */
export function analyzeDataCharacteristics(dataArray, timePeriod) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) return null

  const stats = {
    timePeriod: timePeriod,
    recordCount: dataArray.length,
    fields: {
      Volume_T: { values: [], min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      Volume_M: { values: [], min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      Volume_S: { values: [], min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      Volume_L: { values: [], min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      Hour: { values: [], histogram: {} },
    },
  }

  dataArray.forEach((data) => {
    // 累計各欄位
    ;['Volume_T', 'Volume_M', 'Volume_S', 'Volume_L'].forEach((field) => {
      const value = data[field] || 0
      const fieldStats = stats.fields[field]

      fieldStats.values.push(value)
      fieldStats.min = Math.min(fieldStats.min, value)
      fieldStats.max = Math.max(fieldStats.max, value)
      fieldStats.sum += value
    })

    // 統計小時分布
    if (data.Hour !== undefined) {
      stats.fields.Hour.values.push(data.Hour)
      stats.fields.Hour.histogram[data.Hour] = (stats.fields.Hour.histogram[data.Hour] || 0) + 1
    }
  })

  // 計算平均值
  ;['Volume_T', 'Volume_M', 'Volume_S', 'Volume_L'].forEach((field) => {
    stats.fields[field].avg = stats.fields[field].sum / stats.recordCount
  })

  return stats
}

export default {
  getAllowedRangeForTimeSlot,
  validateDataForTimeSlot,
  rectifyDataForTimeSlot,
  validateAndRectifyDataArray,
  generateValidationReport,
  generateValidationSummary,
  analyzeDataCharacteristics,
}
