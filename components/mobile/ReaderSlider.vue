<template>
  <!-- An iOS-style slider: thin track, accent fill, plain white knob, with an
       optional glyph at each end. The knob follows the finger directly
       (pointer capture, positioned by percentage); the value is reported live
       through `input` and committed once through `change` on release, so the
       caller can keep expensive work — re-laying-out a book — off the drag. -->
  <div class="rs" :class="{ dragging }">
    <span v-if="$slots.start" class="rs-end" aria-hidden="true"><slot name="start" /></span>
    <div
      ref="trackRef"
      class="rs-track"
      role="slider"
      tabindex="0"
      :aria-label="label"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="current"
      :aria-valuetext="valueText"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onCancel"
      @lostpointercapture="onCancel"
      @keydown="onKey"
    >
      <span class="rs-rail" aria-hidden="true">
        <span class="rs-fill" :style="{ width: `${percent}%` }"></span>
      </span>
      <span class="rs-knob" :style="{ left: `${percent}%` }" aria-hidden="true"></span>
    </div>
    <span v-if="$slots.end" class="rs-end" aria-hidden="true"><slot name="end" /></span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  label: { type: String, default: '' },
  valueText: { type: String, default: undefined },
})
const emit = defineEmits(['input', 'change'])

const trackRef = ref(null)
const dragging = ref(false)
// The knob's own value while dragging; otherwise it mirrors the prop.
const local = ref(props.modelValue)
watch(() => props.modelValue, (value) => { if (!dragging.value) local.value = value })

const current = computed(() => local.value)
const percent = computed(() => {
  const span = props.max - props.min || 1
  return Math.max(0, Math.min(100, ((local.value - props.min) / span) * 100))
})

const clampStep = (value) => {
  const stepped = Math.round((value - props.min) / props.step) * props.step + props.min
  const decimals = (String(props.step).split('.')[1] || '').length
  return Math.max(props.min, Math.min(props.max, Number(stepped.toFixed(decimals))))
}

let rect = null
let startX = 0
let moved = false
let frame = null
const valueAtX = (x) => {
  const ratio = Math.max(0, Math.min(1, (x - rect.left) / Math.max(1, rect.width)))
  return clampStep(props.min + ratio * (props.max - props.min))
}
const report = () => {
  frame = null
  emit('input', local.value)
}
const setLocal = (value) => {
  if (value === local.value) return
  local.value = value
  // At most one live update per frame, however fast the pointer events come.
  if (frame === null) frame = requestAnimationFrame(report)
}

const onDown = (event) => {
  if (event.button !== undefined && event.button !== 0) return
  rect = trackRef.value.getBoundingClientRect()
  startX = event.clientX
  moved = false
  dragging.value = true
  trackRef.value.setPointerCapture?.(event.pointerId)
  setLocal(valueAtX(event.clientX))
}
const onMove = (event) => {
  if (!dragging.value) return
  if (Math.abs(event.clientX - startX) > 2) moved = true
  setLocal(valueAtX(event.clientX))
}
const finish = (commit) => {
  if (!dragging.value) return
  dragging.value = false
  if (frame !== null) { cancelAnimationFrame(frame); frame = null; emit('input', local.value) }
  if (commit && local.value !== props.modelValue) emit('change', local.value)
  else if (!commit) local.value = props.modelValue
}
const onUp = () => finish(true)
// The browser took the gesture (a vertical scroll): keep what was reached if
// the finger had really dragged the knob, otherwise put it back.
const onCancel = () => finish(moved)

const onKey = (event) => {
  const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key]
  if (!delta) return
  event.preventDefault()
  const next = clampStep(local.value + delta * props.step)
  local.value = next
  emit('input', next)
  emit('change', next)
}
</script>

<style scoped>
.rs {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.rs-end {
  display: grid;
  flex: none;
  min-width: 20px;
  place-items: center;
  color: var(--rs-end-color, currentColor);
  line-height: 1;
}

/* Tall hit area, thin visible rail. Horizontal drags belong to the slider;
   vertical ones still scroll the sheet. */
.rs-track {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 36px;
  cursor: pointer;
  touch-action: pan-y;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.rs-rail {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--rs-track, rgba(120, 120, 128, 0.2));
  transform: translateY(-50%);
}

.rs-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--rs-fill, var(--color-brand-primary));
}

.rs-knob {
  position: absolute;
  top: 50%;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.16);
  transform: translate(-50%, -50%);
  transition: transform 0.12s ease;
  will-change: left;
}

.rs.dragging .rs-knob {
  transform: translate(-50%, -50%) scale(1.06);
}

.rs-track:focus-visible .rs-knob {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-primary) 35%, transparent), 0 3px 8px rgba(0, 0, 0, 0.16);
}
</style>
