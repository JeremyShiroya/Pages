<template>
  <canvas
    ref="canvas"
    class="searching-orb"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { M as modeFrames, p as paintFrame, r as resolvePreset } from '~/vendor/thinking-orbs/engine-core.js'

const props = defineProps({
  size: { type: Number, default: 64 },
})

const canvas = ref(null)
let context = null
let frameId = 0
let visible = true
let dark = false
let reduced = false
let intersectionObserver = null
let themeObserver = null
let themeQuery = null
let motionQuery = null

const readTheme = () => {
  const selected = document.documentElement.dataset.theme
  dark = selected === 'dark' || (!selected && Boolean(themeQuery?.matches))
  draw()
}

const draw = () => {
  if (!context) return
  const size = props.size
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, size, size)
  const preset = resolvePreset('searching', size)
  const seconds = reduced ? 0.6 : performance.now() / 1000 * preset.speed
  paintFrame(context, modeFrames[preset.mode](size, seconds, preset.opts), dark)
}

const stop = () => {
  if (frameId) cancelAnimationFrame(frameId)
  frameId = 0
}

const tick = () => {
  frameId = 0
  if (document.visibilityState === 'hidden' || !visible || reduced) return
  draw()
  frameId = requestAnimationFrame(tick)
}

const syncAnimation = () => {
  stop()
  draw()
  if (!reduced && visible && document.visibilityState !== 'hidden') {
    frameId = requestAnimationFrame(tick)
  }
}

const readMotion = () => {
  reduced = Boolean(motionQuery?.matches)
  syncAnimation()
}

const resize = () => {
  if (!canvas.value) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.value.width = Math.round(props.size * dpr)
  canvas.value.height = Math.round(props.size * dpr)
  context = canvas.value.getContext('2d')
  syncAnimation()
}

onMounted(() => {
  themeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  themeQuery.addEventListener('change', readTheme)
  motionQuery.addEventListener('change', readMotion)
  themeObserver = new MutationObserver(readTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      syncAnimation()
    })
    intersectionObserver.observe(canvas.value)
  }
  document.addEventListener('visibilitychange', syncAnimation)
  reduced = motionQuery.matches
  readTheme()
  resize()
})

watch(() => props.size, resize)

onBeforeUnmount(() => {
  stop()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  themeQuery?.removeEventListener('change', readTheme)
  motionQuery?.removeEventListener('change', readMotion)
  document.removeEventListener('visibilitychange', syncAnimation)
})
</script>

<style scoped>
.searching-orb {
  display: block;
  margin: 0 auto 1rem;
  flex: none;
}
</style>
