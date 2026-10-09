<template>
  <div v-if="visible" class="cover-modal-overlay" @click="$emit('close')">
    <div class="cover-modal" @click.stop>
      <div class="cover-modal-header">
        <div>
          <h3>{{ mode === 'choice' ? 'Change Book Cover' : searchInProgress ? 'Searching for book covers' : 'Select Book Cover' }}</h3>
          <p v-if="mode === 'picker' && searchInProgress">{{ checkingImages ? 'Checking cover images...' : 'Searching the web for covers...' }}</p>
          <p v-else-if="mode === 'picker' && visibleImages.length">Found {{ visibleImages.length }} cover options</p>
          <p v-else-if="mode === 'picker'">No usable cover options found</p>
          <p v-else>Choose how you want to update the cover</p>
        </div>
        <button class="cover-modal-close" type="button" @click="$emit('close')">
          <i class="ri-close-line"></i>
        </button>
      </div>

      <div v-if="mode === 'choice'" class="cover-choice-grid">
        <button class="cover-choice-btn" type="button" @click="$emit('upload')">
          <i class="ri-upload-2-line"></i>
          <span>
            <strong>Upload Cover</strong>
            <small>Choose an image from this device</small>
          </span>
        </button>
        <button class="cover-choice-btn" type="button" @click="$emit('search')">
          <i class="ri-global-line"></i>
          <span>
            <strong>Search Web</strong>
            <small>Find covers using book metadata</small>
          </span>
        </button>
      </div>

      <div v-else class="cover-modal-body">
        <div v-if="searchInProgress" class="cover-picker-loading">
          <MultiStepLoader
            :loading="searchInProgress"
            :loading-states="coverLoadingStates"
            :duration="1300"
            :loop="false"
            eyebrow="Cover search in progress"
            detail="Checking catalog editions against the book title and author."
          />
        </div>

        <div v-else-if="visibleImages.length" class="cover-picker-grid">
          <button
            v-for="image in visibleImages"
            :key="image.url"
            class="cover-picker-item"
            type="button"
            :title="image.label"
            @click="$emit('select', image.url)"
          >
            <img :src="image.url" alt="Book cover option" loading="lazy" @error="markImageFailed(image.url)" />
            <span v-if="image.label" class="cover-picker-source" :title="image.label">
              <i class="ri-global-line"></i>
              {{ image.label }}
            </span>
            <span class="cover-picker-check">
              <i class="ri-check-line"></i>
            </span>
          </button>
        </div>

        <div v-else class="cover-empty" aria-live="polite">
          {{ checkingImages ? 'Checking cover images...' : 'No matching, usable covers found.' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import MultiStepLoader from './MultiStepLoader.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'choice' },
  loading: { type: Boolean, default: false },
  // Accepts either ["url", ...] (legacy) or [{ url, source, label }, ...] (current).
  images: { type: Array, default: () => [] },
})

const failedImages = ref(new Set())
const readyImages = ref(new Set())
const checkingImages = ref(false)
const searchInProgress = computed(() => props.loading || checkingImages.value)
let searchGeneration = 0

const coverLoadingStates = [
  { text: 'Searching book catalogs for matching editions' },
  { text: 'Checking Goodreads, Google Books, Open Library, and Kobo' },
  { text: 'Checking Apple Books and Hardcover' },
  { text: 'Removing unrelated and unavailable images' },
]

const normalizedImages = computed(() => props.images.map((image) => (
  typeof image === 'string'
    ? { url: image, source: 'unknown', label: '' }
    : image
)))

const visibleImages = computed(() => normalizedImages.value.filter((image) => readyImages.value.has(image.url) && !failedImages.value.has(image.url)))

const looksBlank = (image) => {
  if (image.naturalWidth < 90 || image.naturalHeight < 90) return true
  // A few providers return a successful image response containing only a
  // white/gray "image not available" tile. Canvas access is optional because
  // some catalog CDNs do not allow cross-origin pixel reads.
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 24
    canvas.height = 36
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0, 24, 36)
    const pixels = context.getImageData(0, 0, 24, 36).data
    let pale = 0; let vivid = 0; let dark = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]; const g = pixels[i + 1]; const b = pixels[i + 2]
      if (r > 170 && g > 170 && b > 170 && Math.max(r, g, b) - Math.min(r, g, b) < 18) pale++
      if (Math.max(r, g, b) - Math.min(r, g, b) > 35) vivid++
      if (Math.min(r, g, b) < 105) dark++
    }
    return pale > 24 * 36 * 0.88 && vivid < 8 && dark < 8
  } catch {
    return false
  }
}

watch(() => [props.images, props.visible, props.mode], () => {
  const generation = ++searchGeneration
  failedImages.value = new Set()
  readyImages.value = new Set()
  checkingImages.value = false
  if (!import.meta.client || !props.visible || props.mode !== 'picker' || !props.images.length) return
  checkingImages.value = true
  Promise.all(normalizedImages.value.map((item) => new Promise((resolve) => {
    const image = new Image()
    let settled = false
    const finish = (valid) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (generation === searchGeneration) {
        if (valid) readyImages.value = new Set([...readyImages.value, item.url])
        else markImageFailed(item.url)
      }
      resolve()
    }
    const timeout = setTimeout(() => finish(false), 8000)
    image.onload = () => {
      finish(!looksBlank(image))
    }
    image.onerror = () => finish(false)
    image.src = item.url
  }))).then(() => { if (generation === searchGeneration) checkingImages.value = false })
}, { immediate: true, flush: 'sync' })

const markImageFailed = (url) => {
  const next = new Set(failedImages.value)
  next.add(url)
  failedImages.value = next
}

defineEmits(['close', 'upload', 'search', 'select'])
</script>

<style scoped>
.cover-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-background-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3200;
  padding: 1rem;
}

.cover-modal {
  width: min(100%, 760px);
  max-height: 82vh;
  overflow: hidden;
  background: var(--color-surface-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
}

.cover-modal-header {
  flex: 0 0 auto;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border-subtle);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

/* Bounded scroll region so long cover result lists can scroll. */
.cover-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.cover-modal-header h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.2rem;
  font-weight: 400;
}

.cover-modal-header p {
  margin: 0.35rem 0 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.cover-modal-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.35rem;
}

.cover-modal-close:hover {
  background: var(--color-surface-secondary);
  color: var(--color-text-primary);
}

.cover-choice-grid {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.cover-choice-btn {
  min-height: 110px;
  padding: 1.25rem;
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
  background: var(--color-surface-primary);
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
  cursor: pointer;
}

.cover-choice-btn:hover {
  border-color: var(--color-brand-primary);
  background: var(--color-surface-secondary);
}

.cover-choice-btn i {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-active);
  color: var(--color-brand-primary);
  font-size: 1.5rem;
}

.cover-choice-btn strong,
.cover-choice-btn small {
  display: block;
}

.cover-choice-btn strong {
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 400;
}

.cover-choice-btn small {
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.cover-picker-loading,
.cover-empty {
  padding: 1.5rem;
}

.cover-empty {
  color: var(--color-text-muted);
}

.cover-picker-grid {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1rem;
}

.cover-picker-item {
  position: relative;
  border: 1px solid var(--color-border-subtle);
  border-radius: 10px;
  padding: 0;
  background: var(--color-surface-secondary);
  aspect-ratio: 2 / 3;
  overflow: hidden;
  cursor: pointer;
}

.cover-picker-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-picker-check {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--color-background-overlay-soft);
  color: var(--color-text-on-brand);
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 1.5rem;
}

.cover-picker-item:hover .cover-picker-check {
  opacity: 1;
}

.cover-picker-source {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.55rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.45) 70%, transparent);
  color: var(--color-text-on-brand);
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.cover-picker-source i {
  font-size: 0.8rem;
  flex-shrink: 0;
  opacity: 0.85;
}

@media (max-width: 640px) {
  .cover-choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
