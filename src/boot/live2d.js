/**
 * Boot file for loading Live2D and PIXI libraries globally
 */

export default async (/* { app, router, ... } */) => {
  // 動態加載 PIXI 庫
  const pixiScript = document.createElement('script')
  pixiScript.src = '/libs/pixi.min.js'
  pixiScript.onload = () => {
    console.log('✅ PIXI 庫已加載')

    // 加載 Live2D Core 庫
    const live2dCoreScript = document.createElement('script')
    live2dCoreScript.src = '/libs/live2dcubismcore.min.js'
    live2dCoreScript.onload = () => {
      console.log('✅ Live2D Core 庫已加載')

      // 加載 Cubism4 庫
      const cubism4Script = document.createElement('script')
      cubism4Script.src = '/libs/cubism4.js'
      cubism4Script.onload = () => {
        console.log('✅ Cubism4 庫已加載')
      }
      cubism4Script.onerror = () => {
        console.error('❌ Cubism4 庫加載失敗')
      }
      document.head.appendChild(cubism4Script)
    }
    live2dCoreScript.onerror = () => {
      console.error('❌ Live2D Core 庫加載失敗')
    }
    document.head.appendChild(live2dCoreScript)
  }
  pixiScript.onerror = () => {
    console.error('❌ PIXI 庫加載失敗')
  }
  document.head.appendChild(pixiScript)
}
