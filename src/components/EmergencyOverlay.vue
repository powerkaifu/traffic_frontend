<template>
  <div class="emergency-overlay" :class="{ active: isActive }">
    <div class="overlay-border" ref="borderRef"></div>
    <div class="overlay-vignette"></div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const isActive = ref(false)
const borderRef = ref(null)
let flashTimeline = null

const start = () => {
  if (isActive.value) return
  isActive.value = true

  // 創建紅藍閃爍動畫
  if (borderRef.value) {
    // 確保先清除舊動畫
    if (flashTimeline) flashTimeline.kill()

    flashTimeline = gsap.timeline({ repeat: 2 })

    // 初始狀態：透明
    gsap.set(borderRef.value, {
      boxShadow: 'inset 0 0 0px 0px rgba(0, 0, 255, 0)',
    })

    flashTimeline
      // 藍色淡入
      .to(borderRef.value, {
        boxShadow: 'inset 0 0 100px 20px rgba(0, 0, 255, 0.6)',
        duration: 0.4,
        ease: 'power2.out',
      })
      // 藍色淡出
      .to(borderRef.value, {
        boxShadow: 'inset 0 0 50px 10px rgba(0, 0, 255, 0)',
        duration: 1,
        ease: 'power2.in',
      })
  }
}

const stop = () => {
  isActive.value = false
  if (flashTimeline) {
    flashTimeline.kill()
    flashTimeline = null
  }
  // 重置樣式
  if (borderRef.value) {
    gsap.to(borderRef.value, {
      boxShadow: 'inset 0 0 0px 0px rgba(0,0,0,0)',
      duration: 0.5,
    })
  }
}

// 組件銷毀時清理
onUnmounted(() => {
  if (flashTimeline) flashTimeline.kill()
})

// 公開方法給父組件使用
defineExpose({
  start,
  stop,
})
</script>

<style scoped>
.emergency-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none; /* 讓點擊穿透，不影響操作 */
  z-index: 9000; /* 確保在最上層，但在 Lumo 和 Notify 之下 */
  opacity: 0;
  transition: opacity 0.3s ease;
}

.emergency-overlay.active {
  opacity: 1;
}

.overlay-border {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 初始陰影由 GSAP 控制 */
}

/* 額外的暗角效果，增加沉浸感 */
.overlay-vignette {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, transparent 60%, rgba(0, 0, 0, 0.4) 100%);
}
</style>
