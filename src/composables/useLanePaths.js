/**
 * useLanePaths.js - 路徑管理 Composable
 * 負責管理 SVG 路徑、路徑編輯與計算
 */

import { ref } from 'vue'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { MotionPathHelper } from 'gsap/MotionPathHelper'
import { createLanePathCalculator } from '../classes/draw_utils/lanePathCalculator.js'

// 註冊 GSAP 插件
gsap.registerPlugin(MotionPathPlugin, MotionPathHelper)

export function useLanePaths() {
  // ========== 狀態管理 ==========
  const isPathVisible = ref(false)
  const isPathEditMode = ref(false)
  const pathHelpers = ref([])
  const pathObservers = ref([])
  const tempEditedPaths = ref({})
  const pathTooltip = ref({ show: false, text: '', x: 0, y: 0 })

  // 路徑計算器實例
  let lanePathCalculator = null

  // 路徑計算函數（預設值）
  const pathFunctions = ref({
    getEastLane1Path: () => 'M-200,600 L1400,600',
    getEastLane2Path: () => 'M-200,570 L1400,570',
    getEastLane3Path: () => 'M-200,540 L1400,540',
    getEastLane4Path: () => 'M-200,510 L1400,510',
    getWestLane1Path: () => 'M-200,400 L1400,400',
    getWestLane2Path: () => 'M-200,430 L1400,430',
    getWestLane3Path: () => 'M-200,460 L1400,460',
    getWestLane4Path: () => 'M-200,490 L1400,490',
    getSouthLane1Path: () => 'M500,-600 L500,1400',
    getSouthLane2Path: () => 'M470,-600 L470,1400',
    getSouthLane3Path: () => 'M440,-600 L440,1400',
    getSouthLane4Path: () => 'M410,-600 L410,1400',
    getNorthLane1Path: () => 'M530,-600 L530,1400',
    getNorthLane2Path: () => 'M560,-600 L560,1400',
    getNorthLane3Path: () => 'M590,-600 L590,1400',
    getNorthLane4Path: () => 'M620,-600 L620,1400',
  })

  // ========== 路徑初始化 ==========
  /**
   * 初始化路徑計算器
   */
  function initPathCalculator() {
    lanePathCalculator = createLanePathCalculator()

    // 更新所有路徑函數
    pathFunctions.value = {
      getEastLane1Path: lanePathCalculator.getEastLane1Path,
      getEastLane2Path: lanePathCalculator.getEastLane2Path,
      getEastLane3Path: lanePathCalculator.getEastLane3Path,
      getEastLane4Path: lanePathCalculator.getEastLane4Path,
      getWestLane1Path: lanePathCalculator.getWestLane1Path,
      getWestLane2Path: lanePathCalculator.getWestLane2Path,
      getWestLane3Path: lanePathCalculator.getWestLane3Path,
      getWestLane4Path: lanePathCalculator.getWestLane4Path,
      getSouthLane1Path: lanePathCalculator.getSouthLane1Path,
      getSouthLane2Path: lanePathCalculator.getSouthLane2Path,
      getSouthLane3Path: lanePathCalculator.getSouthLane3Path,
      getSouthLane4Path: lanePathCalculator.getSouthLane4Path,
      getNorthLane1Path: lanePathCalculator.getNorthLane1Path,
      getNorthLane2Path: lanePathCalculator.getNorthLane2Path,
      getNorthLane3Path: lanePathCalculator.getNorthLane3Path,
      getNorthLane4Path: lanePathCalculator.getNorthLane4Path,
    }

    console.log('✅ [useLanePaths] 路徑計算器已初始化')
  }

  // ========== 路徑可見性控制 ==========
  function togglePathVisibility() {
    isPathVisible.value = !isPathVisible.value
  }

  // ========== 路徑編輯功能 ==========
  /**
   * 啟用路徑編輯模式
   */
  function enablePathEditing() {
    console.log('🎯 啟用路徑編輯模式')
    tempEditedPaths.value = {}

    const editablePathIds = [
      'eastLane1Straight',
      'eastLane4Straight',
      'westLane1Straight',
      'westLane4Straight',
      'southLane1Straight',
      'southLane4Straight',
      'northLane1Straight',
      'northLane4Straight',
    ]

    console.log('🔧 開始為可編輯路徑啟用 MotionPathHelper...')

    editablePathIds.forEach((pathId) => {
      try {
        const pathElement = document.getElementById(pathId)
        if (!pathElement) {
          console.error(`❌ 找不到路徑元素: ${pathId}`)
          return
        }

        const pathData = pathElement.getAttribute('d')
        console.log(`🔍 路徑 ${pathId} 數據:`, pathData)

        if (!pathData || (!pathData.includes('C') && !pathData.includes('c'))) {
          console.warn(`⚠️ 路徑 ${pathId} 不是貝茲曲線格式，可能影響編輯功能`)
        }

        console.log(`🔧 為路徑 ${pathId} 創建 MotionPathHelper`)

        // 嘗試方法1: 使用 editPath
        try {
          const pathEditor = MotionPathHelper.editPath(pathElement, {
            selected: false,
            createPoints: false,
            handleSize: 8,
          })

          if (pathEditor) {
            pathHelpers.value.push(pathEditor)
            console.log(`✅ ${pathId} 路徑編輯器已啟用 (使用 editPath)`)
            return
          }
        } catch (editPathError) {
          console.warn(`⚠️ editPath 方法失敗，嘗試其他方法:`, editPathError.message)
        }

        // 嘗試方法2: 創建 tween 然後傳遞給 create
        try {
          const testDiv = document.createElement('div')
          testDiv.style.position = 'absolute'
          testDiv.style.left = '-9999px'
          testDiv.style.opacity = '0'
          testDiv.style.pointerEvents = 'none'
          document.body.appendChild(testDiv)

          const tween = gsap.to(testDiv, {
            duration: 1,
            motionPath: {
              path: pathElement,
              autoRotate: false,
            },
            paused: true,
          })

          const helper = MotionPathHelper.create(tween)

          if (helper) {
            pathHelpers.value.push({ helper, testDiv, tween })
            console.log(`✅ ${pathId} 路徑編輯器已啟用 (使用 create + tween)`)
            return
          }
        } catch (tweenError) {
          console.warn(`⚠️ tween 方法失敗，嘗試最後方法:`, tweenError.message)
        }

        // 嘗試方法3: 直接傳遞元素
        try {
          const helper = MotionPathHelper.create(pathElement)

          if (helper) {
            pathHelpers.value.push(helper)
            console.log(`✅ ${pathId} 路徑編輯器已啟用 (直接傳遞元素)`)
          } else {
            console.error(`❌ ${pathId} 所有方法都失敗了`)
          }
        } catch (elementError) {
          console.error(`❌ 直接傳遞元素方法也失敗:`, elementError.message)
        }
      } catch (error) {
        console.error(`❌ 無法啟用 ${pathId} 路徑編輯器:`, error)
      }
    })

    console.log(`🎯 MotionPathHelper 啟用完成，共啟用 ${pathHelpers.value.length} 個路徑編輯器`)

    setupPathChangeListeners(editablePathIds)

    if (isPathEditMode.value) {
      document.addEventListener('keydown', handleKeyDown, { capture: false, passive: true })
    }
  }

  /**
   * 停用路徑編輯模式
   */
  function disablePathEditing() {
    console.log('🔒 停用路徑編輯模式')

    // 清理所有編輯器
    pathHelpers.value.forEach((item) => {
      try {
        if (item && typeof item === 'object') {
          if (item.helper && typeof item.helper.kill === 'function') {
            item.helper.kill()
          }
          if (item.tween && typeof item.tween.kill === 'function') {
            item.tween.kill()
          }
          if (item.testDiv && item.testDiv.parentNode) {
            item.testDiv.parentNode.removeChild(item.testDiv)
          }
        } else if (item && typeof item.kill === 'function') {
          item.kill()
        } else if (item && typeof item.destroy === 'function') {
          item.destroy()
        }
      } catch (cleanupError) {
        console.warn('清理編輯器時出現錯誤:', cleanupError.message)
      }
    })
    pathHelpers.value = []

    // 清理路徑變化觀察器
    pathObservers.value.forEach((observer) => {
      try {
        observer.disconnect()
      } catch (error) {
        console.warn('清理路徑觀察器時出現錯誤:', error.message)
      }
    })
    pathObservers.value = []

    // 移除鍵盤事件監聽器
    document.removeEventListener('keydown', handleKeyDown, { capture: false })
  }

  /**
   * 設置路徑變化監聽器
   */
  function setupPathChangeListeners(pathIds) {
    console.log('🔄 設置路徑變化監聽器...')

    pathIds.forEach((pathId) => {
      const pathElement = document.getElementById(pathId)
      if (!pathElement) return

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'd') {
            const newPathData = pathElement.getAttribute('d')
            console.log(`🔄 檢測到路徑 ${pathId} 變化:`, newPathData)
            tempEditedPaths.value[pathId] = newPathData
            console.log(`📝 暫存路徑 ${pathId} 編輯結果`)
          }
        })
      })

      observer.observe(pathElement, {
        attributes: true,
        attributeFilter: ['d'],
      })

      pathObservers.value.push(observer)
    })
  }

  /**
   * 鍵盤事件處理
   */
  function handleKeyDown(e) {
    if (isPathEditMode.value) {
      if (e.ctrlKey && e.key === 'z') {
        console.log('↶ Ctrl+Z - 由 MotionPathHelper 處理撤銷')
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        console.log('🗑️ Delete/Backspace - 由 MotionPathHelper 處理刪除')
      }
    }
  }

  /**
   * 導出所有路徑數據
   */
  function exportPathData() {
    console.log('📋 導出路徑資料:')

    const pathIds = [
      'eastLane1Straight',
      'eastLane2Straight',
      'eastLane3Straight',
      'eastLane4Straight',
      'westLane1Straight',
      'westLane2Straight',
      'westLane3Straight',
      'westLane4Straight',
      'southLane1Straight',
      'southLane2Straight',
      'southLane3Straight',
      'southLane4Straight',
      'northLane1Straight',
      'northLane2Straight',
      'northLane3Straight',
      'northLane4Straight',
    ]

    const pathData = {}

    pathIds.forEach((pathId) => {
      const pathElement = document.getElementById(pathId)
      if (pathElement) {
        const pathValue = pathElement.getAttribute('d')
        pathData[pathId] = pathValue
        console.log(`${pathId}: ${pathValue}`)
      }
    })

    const jsonData = JSON.stringify(pathData, null, 2)
    navigator.clipboard
      .writeText(jsonData)
      .then(() => {
        console.log('✅ 路徑資料已複製到剪貼板')
        alert('路徑資料已複製到剪貼板！')
      })
      .catch((err) => {
        console.error('❌ 複製失敗:', err)
      })

    return pathData
  }

  // ========== Tooltip 功能 ==========
  function showPathTooltip(event, text) {
    if (!isPathEditMode.value) return

    const rect = event.target.closest('svg').getBoundingClientRect()

    if (!pathTooltip.value.show) {
      pathTooltip.value = {
        show: true,
        text: text,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
      console.log(`✅ Tooltip 已顯示: ${text}`)
    }
  }

  function hidePathTooltip() {
    if (pathTooltip.value.show) {
      pathTooltip.value.show = false
      console.log('✅ Tooltip 已隱藏')
    }
  }

  function updateTooltipPosition(event) {
    if (!pathTooltip.value.show) return

    const rect = event.target.closest('svg').getBoundingClientRect()
    pathTooltip.value.x = event.clientX - rect.left
    pathTooltip.value.y = event.clientY - rect.top
  }

  // ========== 返回值 ==========
  return {
    // 狀態
    isPathVisible,
    isPathEditMode,
    pathTooltip,
    pathFunctions,

    // 初始化
    initPathCalculator,

    // 路徑可見性
    togglePathVisibility,

    // 路徑編輯
    enablePathEditing,
    disablePathEditing,
    exportPathData,

    // Tooltip
    showPathTooltip,
    hidePathTooltip,
    updateTooltipPosition,

    // 內部狀態（供調試）
    pathHelpers,
    pathObservers,
    tempEditedPaths,
  }
}
