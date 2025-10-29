/**
 * Lumo Live2D Quick Status Check
 * 快速狀態檢查 - 在 Vue 組件中使用
 */

export const LumoStatusCheck = {
  /**
   * 檢查所有必要的庫是否已加載
   */
  checkLibraries() {
    return {
      pixi: typeof window.PIXI !== 'undefined',
      pixiLive2d: window.PIXI?.live2d !== undefined,
      live2dModel: window.PIXI?.live2d?.Live2DModel !== undefined,
      live2dCore: typeof window.Live2D !== 'undefined',
      cubism: typeof window.PIXI?.live2d !== 'undefined',
    }
  },

  /**
   * 檢查資源文件是否可訪問
   */
  async checkResources() {
    const resources = [
      '/libs/pixi.min.js',
      '/libs/live2dcubismcore.min.js',
      '/libs/cubism4.js',
      '/Lumo/Resources/robot/robot.model3.json',
      '/Lumo/Resources/robot/robot.moc3',
      '/Lumo/Resources/robot/robot.1024/texture_00.png',
    ]

    const results = {}
    for (const resource of resources) {
      try {
        const response = await fetch(resource, { method: 'HEAD' })
        results[resource] = response.ok
      } catch {
        results[resource] = false
      }
    }
    return results
  },

  /**
   * 完整的狀態報告
   */
  async getFullStatus() {
    const libraries = this.checkLibraries()
    const resources = await this.checkResources()

    return {
      timestamp: new Date().toISOString(),
      libraries,
      resources,
      allLibrariesLoaded: Object.values(libraries).every((v) => v),
      allResourcesAvailable: Object.values(resources).every((v) => v),
      ready: Object.values(libraries).every((v) => v) && Object.values(resources).every((v) => v),
    }
  },

  /**
   * 打印友好的狀態報告
   */
  async printStatus() {
    const status = await this.getFullStatus()

    console.log(
      '%c🔍 Lumo Live2D Status Report %c' + status.timestamp,
      'color: #00aa00; font-weight: bold; font-size: 14px',
      'color: #666; font-size: 12px',
    )

    console.log('%c📚 Libraries:', 'color: #0066cc; font-weight: bold')
    for (const [lib, loaded] of Object.entries(status.libraries)) {
      console.log(`  ${loaded ? '✅' : '❌'} ${lib}`)
    }

    console.log('%c🗂️  Resources:', 'color: #0066cc; font-weight: bold')
    for (const [resource, available] of Object.entries(status.resources)) {
      console.log(`  ${available ? '✅' : '❌'} ${resource}`)
    }

    console.log('')
    if (status.ready) {
      console.log('%c✅ All systems ready! Lumo is ready to load.', 'color: #00aa00; font-weight: bold')
    } else {
      console.log('%c⚠️  Not ready. Check the items marked with ❌ above.', 'color: #ff6600; font-weight: bold')
    }
    console.log('')

    return status
  },
}

// 在全局作用域中暴露（用於控制台調試）
if (typeof window !== 'undefined') {
  window.LumoStatus = LumoStatusCheck
}
