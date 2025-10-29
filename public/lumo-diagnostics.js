/**
 * Lumo Live2D 加載診斷腳本
 * 在瀏覽器控制台中運行此代碼以診斷 Lumo 模型加載問題
 */

console.log('🔍 開始 Lumo Live2D 診斷...\n')

// 1. 檢查全局變量
console.log('1️⃣  檢查全局庫對象...')
console.log('  PIXI:', typeof window.PIXI !== 'undefined' ? '✅ 已加載' : '❌ 未加載')
console.log('  PIXI.live2d:', window.PIXI?.live2d ? '✅ 已加載' : '❌ 未加載')
console.log('  PIXI.live2d.Live2DModel:', window.PIXI?.live2d?.Live2DModel ? '✅ 已加載' : '❌ 未加載')
console.log('  window.Live2D:', typeof window.Live2D !== 'undefined' ? '✅ 已加載' : '❌ 未加載')
console.log('')

// 2. 檢查資源文件
console.log('2️⃣  檢查資源文件存在性...')
const resourceChecks = [
  '/libs/pixi.min.js',
  '/libs/live2dcubismcore.min.js',
  '/libs/cubism4.js',
  '/Lumo/Resources/robot/robot.model3.json',
  '/Lumo/Resources/robot/robot.moc3',
  '/Lumo/Resources/robot/robot.1024/texture_00.png',
]

resourceChecks.forEach((resource) => {
  fetch(resource, { method: 'HEAD' })
    .then((resp) => {
      console.log(`  ${resource}: ${resp.ok ? '✅ 存在 (' + resp.status + ')' : '❌ 不存在 (' + resp.status + ')'}`)
    })
    .catch((err) => {
      console.log(`  ${resource}: ❌ 檢查失敗 (${err.message})`)
    })
})

console.log('')

// 3. 檢查 Vue 組件
console.log('3️⃣  檢查 Vue 組件狀態...')
if (window.__QUASAR_DEVTOOLS__) {
  console.log('  Quasar DevTools: ✅ 可用')
} else {
  console.log('  Quasar DevTools: ℹ️  未安裝（正常）')
}

// 4. 測試模型加載
console.log('')
console.log('4️⃣  測試模型加載...')

if (typeof window.PIXI !== 'undefined' && window.PIXI.live2d && window.PIXI.live2d.Live2DModel) {
  console.log('  嘗試加載模型...')
  const modelPath = '/Lumo/Resources/robot/robot.model3.json'

  window.PIXI.live2d.Live2DModel.from(modelPath)
    .then((model) => {
      console.log('  ✅ 模型加載成功!')
      console.log('    - 模型尺寸:', model.width, 'x', model.height)
      console.log('    - 內部模型:', model.internalModel ? '✅ 可用' : '❌ 不可用')
    })
    .catch((err) => {
      console.log('  ❌ 模型加載失敗:', err.message)
      console.error('    詳細錯誤:', err)
    })
} else {
  console.log('  ❌ Live2D 庫未完全加載，無法測試模型加載')
}

console.log('')
console.log('💡 診斷完成！請檢查上面的結果。')
console.log('')
console.log('📋 故障排除建議：')
console.log('  1. 如果 PIXI 未加載：檢查 /libs/pixi.min.js 是否存在且可訪問')
console.log('  2. 如果 Live2D 未加載：檢查 boot/live2d.js 是否正確註冊')
console.log('  3. 如果模型未加載：檢查模型文件路徑和 CORS 設置')
console.log('  4. 打開瀏覽器開發者工具 (F12) 查看 Network 標籤以檢查失敗的請求')
