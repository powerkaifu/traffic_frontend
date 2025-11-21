/**
 * 救護車偵測範圍調整工具
 *
 * 使用方法：
 * 在瀏覽器控制台執行以下命令來動態調整範圍
 */

// 🎯 快速調整預設值
window.setAmbulanceRanges = {
  /**
   * 設置車道階段範圍（A/B 階段）
   * @param {number} opposing - 對向車輛範圍 (預設 300)
   * @param {number} perpendicular - 垂直車輛範圍 (預設 350)
   * @param {number} sameDirection - 同向車輛範圍 (預設 200)
   */
  onLane: (opposing = 300, perpendicular = 350, sameDirection = 200) => {
    console.log(`🔵 設置車道階段範圍:`)
    console.log(`  對向: ${opposing}px`)
    console.log(`  垂直: ${perpendicular}px`)
    console.log(`  同向: ${sameDirection}px`)

    // 注意：這需要重新導入配置，實際上需要修改源文件並重新加載
    console.warn('⚠️ 注意：修改配置後需要重新加載頁面才能生效')
    console.log('📝 請修改文件: src/classes/config/ambulanceConfig.js')
    console.log(`   INFLUENCE_RANGE.ON_LANE = {`)
    console.log(`     OPPOSING: ${opposing},`)
    console.log(`     PERPENDICULAR: ${perpendicular},`)
    console.log(`     SAME_DIRECTION: ${sameDirection},`)
    console.log(`   }`)
  },

  /**
   * 設置路口中央範圍（C 階段）
   * @param {number} opposing - 對向車輛範圍 (預設 600)
   * @param {number} perpendicular - 垂直車輛範圍 (預設 600)
   * @param {number} sameDirection - 同向車輛範圍 (預設 400)
   */
  inIntersection: (opposing = 600, perpendicular = 600, sameDirection = 400) => {
    console.log(`🔴 設置路口中央範圍:`)
    console.log(`  對向: ${opposing}px`)
    console.log(`  垂直: ${perpendicular}px`)
    console.log(`  同向: ${sameDirection}px`)

    console.warn('⚠️ 注意：修改配置後需要重新加載頁面才能生效')
    console.log('📝 請修改文件: src/classes/config/ambulanceConfig.js')
    console.log(`   INFLUENCE_RANGE.IN_INTERSECTION = {`)
    console.log(`     OPPOSING: ${opposing},`)
    console.log(`     PERPENDICULAR: ${perpendicular},`)
    console.log(`     SAME_DIRECTION: ${sameDirection},`)
    console.log(`   }`)
  },

  /**
   * 顯示當前配置
   */
  show: () => {
    // 由於配置在模塊中，無法直接訪問，需要通過控制器
    console.log('📊 當前救護車偵測範圍配置:')
    console.log('請查看 ambulanceConfig.js 文件')
    console.log(
      '或在控制台執行: import("./classes/config/ambulanceConfig.js").then(c => console.log(c.INFLUENCE_RANGE))',
    )
  },

  /**
   * 推薦配置預設值
   */
  presets: {
    conservative: () => {
      console.log('🛡️ 保守配置（安全優先，範圍較大）')
      console.log('車道: 對向400, 垂直450, 同向300')
      console.log('路口: 對向800, 垂直800, 同向500')
    },

    moderate: () => {
      console.log('⚖️ 適中配置（當前預設）')
      console.log('車道: 對向300, 垂直350, 同向200')
      console.log('路口: 對向600, 垂直600, 同向400')
    },

    minimal: () => {
      console.log('⚡ 最小配置（流暢優先，範圍較小）')
      console.log('車道: 對向200, 垂直250, 同向150')
      console.log('路口: 對向400, 垂直400, 同向250')
    },
  },
}

// 🎯 使用說明
console.log('═══════════════════════════════════════════════════')
console.log('🚑 救護車偵測範圍調整工具已加載')
console.log('═══════════════════════════════════════════════════')
console.log('')
console.log('📖 使用方法:')
console.log('  1. 查看預設配置:')
console.log('     window.setAmbulanceRanges.presets.conservative()')
console.log('     window.setAmbulanceRanges.presets.moderate()')
console.log('     window.setAmbulanceRanges.presets.minimal()')
console.log('')
console.log('  2. 修改配置文件:')
console.log('     編輯 src/classes/config/ambulanceConfig.js')
console.log('     修改 INFLUENCE_RANGE 中的數值')
console.log('     重新加載頁面即可生效')
console.log('')
console.log('  3. 查看當前配置:')
console.log('     window.setAmbulanceRanges.show()')
console.log('')
console.log('═══════════════════════════════════════════════════')
