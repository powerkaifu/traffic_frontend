/**
 * Boot 模块：注入碰撞诊断工具
 *
 * 作用：
 * 1. 在开发环境加载碰撞间距诊断工具
 * 2. 提供 F12 Console 快速命令
 *
 * 使用：
 * F12 Console:
 *   window.runSpacingDiagnostic()  // 运行间距诊断
 *   window.showCollisionConfig()   // 显示碰撞配置
 */

import { defineBoot } from '#q-app/wrappers'

export default defineBoot(({ app }) => {
  // 只在开发环境注入诊断工具
  if (process.env.NODE_ENV === 'development') {
    console.log('[诊断工具] 正在加载碰撞诊断工具...')

    // 动态加载诊断脚本（来自 public 目录）
    const loadDiagnosticScript = () => {
      const script = document.createElement('script')
      script.src = '/collision-spacing-diagnostic.js'
      script.onload = () => {
        console.log('[诊断工具] ✅ 公共诊断脚本已加载')
      }
      script.onerror = () => {
        console.warn('[诊断工具] ⚠️ 无法加载公共诊断脚本，使用备用方案')
      }
      document.head.appendChild(script)
    }

    // 延迟加载（确保 DOM 已准备好）
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

    // 添加到全局 app 上下文
    app.config.globalProperties.$diagnosticTools = {
      getDiagnosticInfo: window.getDiagnosticInfo,
      note: '运行 window.runSpacingDiagnostic() 来诊断间距问题',
    }

    console.log('[诊断工具] ✅ 已初始化')
    console.log('[诊断工具] 可用命令：')
    console.log('  - window.runSpacingDiagnostic()  // 分析各方向间距')
    console.log('  - window.showCollisionConfig()   // 显示碰撞配置')
  }
})
