/**
 * Boot 模組：注入碰撞診斷工具
 *
 * 作用：
 * 1. 在開發環境載入碰撞間距診斷工具
 * 2. 提供 F12 Console 快速命令
 *
 * 使用：
 * F12 Console:
 *   window.runSpacingDiagnostic()  // 執行間距診斷
 *   window.showCollisionConfig()   // 顯示碰撞配置
 */

import { defineBoot } from '#q-app/wrappers'

export default defineBoot(({ app }) => {
  // 只在開發環境注入診斷工具
  if (process.env.NODE_ENV === 'development') {
    console.log('[診斷工具] 正在載入碰撞診斷工具...')

    // 動態載入診斷腳本（來自 public 目錄）
    const loadDiagnosticScript = () => {
      const script = document.createElement('script')
      script.src = '/collision-spacing-diagnostic.js'
      script.onload = () => {
        console.log('[診斷工具] ✅ 公共診斷腳本已載入')
      }
      script.onerror = () => {
        console.warn('[診斷工具] ⚠️ 無法載入公共診斷腳本，使用備用方案')
      }
      document.head.appendChild(script)
    }

    // 延遲載入（確保 DOM 已準備好）
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadDiagnosticScript)
    } else {
      loadDiagnosticScript()
    }

    window.getDiagnosticInfo = function () {
      return {
        environment: process.env.NODE_ENV,
        hasTrafficController: !!window.trafficLightController,
        hasCollisionConfig: !!window.getCollisionConfig,
        timestamp: new Date().toISOString(),
      }
    }

    // 新增到全域 app 上下文
    app.config.globalProperties.$diagnosticTools = {
      getDiagnosticInfo: window.getDiagnosticInfo,
      note: '執行 window.runSpacingDiagnostic() 來診斷間距問題',
    }

    console.log('[診斷工具] ✅ 已初始化')
    console.log('[診斷工具] 可用命令：')
    console.log('  - window.runSpacingDiagnostic()  // 分析各方向間距')
    console.log('  - window.showCollisionConfig()   // 顯示碰撞配置')
  }
})
