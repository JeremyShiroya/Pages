<template>
  <input ref="fileInput" class="file-input" type="file" accept="image/*" aria-label="Choose profile photo" @change="onFileChange" />
  <Teleport to="body">
    <div v-if="open" class="picker-layer" role="presentation">
      <button class="picker-backdrop" type="button" aria-label="Close photo picker" @click="close"></button>
      <section class="picker-sheet" role="dialog" aria-modal="true" :aria-labelledby="stage === 'crop' ? 'avatar-crop-title' : 'avatar-source-title'">
        <header>
          <div>
            <h2 :id="stage === 'crop' ? 'avatar-crop-title' : 'avatar-source-title'">{{ stage === 'crop' ? 'Crop profile photo' : 'Choose profile picture' }}</h2>
            <p>{{ stage === 'crop' ? 'Move and zoom the photo to frame your avatar.' : 'Use a photo from your device or pick an avatar.' }}</p>
          </div>
          <button class="close-button" type="button" aria-label="Close photo picker" @click="close"><i class="ri-close-line"></i></button>
        </header>

        <template v-if="stage === 'choice'">
          <button class="source-option" type="button" @click="chooseGallery">
            <i class="ri-image-line" aria-hidden="true"></i><span><strong>Choose from Gallery</strong><small>Select and crop a photo from your device</small></span><i class="ri-arrow-right-s-line" aria-hidden="true"></i>
          </button>
          <button class="source-option" type="button" @click="choosePreset">
            <i class="ri-user-smile-line" aria-hidden="true"></i><span><strong>Select Avatar</strong><small>Choose one of the Bookish avatars</small></span><i class="ri-arrow-right-s-line" aria-hidden="true"></i>
          </button>
          <p v-if="imageError" class="picker-error" role="alert">{{ imageError }}</p>
        </template>

        <template v-else>
          <div ref="cropFrame" class="crop-frame" @pointerdown="startDrag" @pointermove="drag" @pointerup="endDrag" @pointercancel="endDrag">
            <img v-if="objectUrl" ref="cropImage" :src="objectUrl" alt="Photo to crop" draggable="false" :style="imageStyle" @load="onImageLoad" @error="imageError = 'This image could not be opened. Try another photo.'" />
            <span class="crop-guide" aria-hidden="true"></span>
          </div>
          <label class="zoom-control"><span>Zoom</span><input v-model.number="zoom" type="range" min="1" max="3" step="0.01" aria-label="Photo zoom" @input="clampOffset" /></label>
          <p v-if="imageError" class="picker-error" role="alert">{{ imageError }}</p>
          <div class="crop-actions">
            <button type="button" class="secondary" @click="backToChoices">Back</button>
            <button type="button" class="primary" :disabled="!imageReady || !!imageError" @click="saveCrop">Use photo</button>
          </div>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'presets', 'cropped'])
const fileInput = ref(null)
const cropFrame = ref(null)
const cropImage = ref(null)
const stage = ref('choice')
const objectUrl = ref('')
const imageReady = ref(false)
const imageError = ref('')
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const frameSize = ref(280)
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
let dragStart = null

const scale = computed(() => naturalWidth.value && naturalHeight.value
  ? Math.max(frameSize.value / naturalWidth.value, frameSize.value / naturalHeight.value) * zoom.value
  : 1)
const imageStyle = computed(() => ({
  width: `${naturalWidth.value * scale.value}px`,
  height: `${naturalHeight.value * scale.value}px`,
  transform: `translate(calc(-50% + ${offsetX.value}px), calc(-50% + ${offsetY.value}px))`,
}))

const clearPhoto = () => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ''
  imageReady.value = false
  imageError.value = ''
  zoom.value = 1
  offsetX.value = 0
  offsetY.value = 0
  dragStart = null
  if (fileInput.value) fileInput.value.value = ''
}
const close = () => { clearPhoto(); stage.value = 'choice'; emit('close') }
const chooseGallery = () => { imageError.value = ''; fileInput.value?.click() }
const choosePreset = () => { clearPhoto(); stage.value = 'choice'; emit('presets') }
const backToChoices = () => { clearPhoto(); stage.value = 'choice' }

const onFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) {
    imageError.value = 'Choose an image smaller than 20 MB.'
    event.target.value = ''
    return
  }
  clearPhoto()
  objectUrl.value = URL.createObjectURL(file)
  stage.value = 'crop'
  await nextTick()
  frameSize.value = cropFrame.value?.clientWidth || 280
}
const onImageLoad = () => {
  naturalWidth.value = cropImage.value?.naturalWidth || 0
  naturalHeight.value = cropImage.value?.naturalHeight || 0
  imageReady.value = naturalWidth.value > 0 && naturalHeight.value > 0
  frameSize.value = cropFrame.value?.clientWidth || 280
}
const clampOffset = () => {
  const xLimit = Math.max(0, (naturalWidth.value * scale.value - frameSize.value) / 2)
  const yLimit = Math.max(0, (naturalHeight.value * scale.value - frameSize.value) / 2)
  offsetX.value = Math.min(xLimit, Math.max(-xLimit, offsetX.value))
  offsetY.value = Math.min(yLimit, Math.max(-yLimit, offsetY.value))
}
const startDrag = (event) => {
  if (!imageReady.value) return
  cropFrame.value?.setPointerCapture(event.pointerId)
  dragStart = { x: event.clientX, y: event.clientY, offsetX: offsetX.value, offsetY: offsetY.value }
}
const drag = (event) => {
  if (!dragStart) return
  offsetX.value = dragStart.offsetX + event.clientX - dragStart.x
  offsetY.value = dragStart.offsetY + event.clientY - dragStart.y
  clampOffset()
}
const endDrag = () => { dragStart = null }
const saveCrop = () => {
  if (!imageReady.value || !cropImage.value) return
  const sourceSize = frameSize.value / scale.value
  const sourceX = (naturalWidth.value - sourceSize) / 2 - offsetX.value / scale.value
  const sourceY = (naturalHeight.value - sourceSize) / 2 - offsetY.value / scale.value
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 320
  const context = canvas.getContext('2d')
  if (!context) { imageError.value = 'Could not crop this photo.'; return }
  context.drawImage(cropImage.value, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 320, 320)
  const cropped = canvas.toDataURL('image/jpeg', 0.82)
  if (cropped.length > 1_000_000) { imageError.value = 'This photo is too large to save. Try another.'; return }
  emit('cropped', cropped)
}

watch(() => props.open, (open) => { if (!open) { clearPhoto(); stage.value = 'choice' } })
onBeforeUnmount(clearPhoto)
</script>

<style scoped>
.file-input { position: fixed; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.picker-layer { position: fixed; z-index: 4200; inset: 0; display: grid; place-items: center; padding: 20px; }
.picker-backdrop { position: absolute; inset: 0; border: 0; background: rgba(10, 8, 20, .62); backdrop-filter: blur(5px); }
.picker-sheet { position: relative; z-index: 1; width: min(460px, 100%); max-height: 90vh; overflow: auto; padding: 22px; border: 1px solid var(--color-border-card); border-radius: 24px; background: var(--color-surface-primary); color: var(--color-text-primary); box-shadow: var(--shadow-modal); }
.picker-sheet header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.picker-sheet h2 { margin: 0; font-size: 1.2rem; }
.picker-sheet p { margin: 5px 0 0; color: var(--color-text-muted); font-size: .87rem; line-height: 1.4; }
.close-button { flex: 0 0 auto; width: 36px; height: 36px; border: 0; border-radius: 50%; background: var(--color-background-app); color: var(--color-text-primary); cursor: pointer; font-size: 20px; }
.source-option { display: flex; width: 100%; min-height: 72px; align-items: center; gap: 14px; margin-top: 10px; padding: 12px 14px; border: 1px solid var(--color-border-card); border-radius: 18px; background: var(--color-settings-group); color: var(--color-text-primary); cursor: pointer; text-align: left; font: inherit; }
.source-option > i:first-child { display: grid; flex: 0 0 38px; width: 38px; height: 38px; place-items: center; border-radius: 12px; background: var(--color-brand-primary-muted); color: var(--color-brand-primary); font-size: 20px; }
.source-option > i:last-child { margin-left: auto; color: var(--color-text-muted); font-size: 20px; }
.source-option span { display: grid; gap: 3px; }
.source-option strong { font-size: .95rem; font-weight: 600; }
.source-option small { color: var(--color-text-muted); font-size: .76rem; line-height: 1.3; }
.crop-frame { position: relative; width: min(280px, calc(100vw - 72px)); aspect-ratio: 1; margin: 0 auto; overflow: hidden; border-radius: 16px; background: var(--color-background-app); touch-action: none; cursor: grab; }
.crop-frame:active { cursor: grabbing; }
.crop-frame img { position: absolute; top: 50%; left: 50%; max-width: none; max-height: none; user-select: none; pointer-events: none; }
.crop-guide { position: absolute; inset: 0; border: 2px solid rgba(255,255,255,.8); border-radius: 50%; box-shadow: 0 0 0 100px rgba(0,0,0,.26); pointer-events: none; }
.zoom-control { display: grid; gap: 8px; margin: 18px 0; font-size: .88rem; }
.zoom-control input { width: 100%; accent-color: var(--color-brand-primary); }
.picker-error { color: var(--color-danger, #b42318) !important; }
.crop-actions { display: flex; gap: 10px; margin-top: 18px; }
.crop-actions button { flex: 1; min-height: 44px; border-radius: 999px; font: inherit; font-weight: 600; cursor: pointer; }
.crop-actions .secondary { border: 1px solid var(--color-border-card); background: var(--color-background-app); color: var(--color-text-primary); }
.crop-actions .primary { border: 0; background: var(--color-brand-primary); color: var(--color-text-on-brand); }
.crop-actions button:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 600px) { .picker-layer { align-items: end; padding: 0; }.picker-sheet { width: 100%; max-height: 88vh; padding: 22px 20px calc(22px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; } }
</style>
