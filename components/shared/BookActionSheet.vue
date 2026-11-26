<template>
  <Teleport to="body">
    <Transition name="bas" appear>
      <div v-if="open" class="bas-layer" @keydown.esc="close">
        <button type="button" class="bas-backdrop" aria-label="Close book options" @click="close"></button>

        <section
          ref="sheetRef"
          class="bas-sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="`Options for ${book.title}`"
          :style="dragOffset ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <span class="bas-grabber" aria-hidden="true"></span>

          <!-- What the actions apply to: the cover, the title, and the series
               (or author) under it. -->
          <header class="bas-head">
            <img class="bas-cover" :src="coverUrl" alt="" @error="$emit('cover-error', $event)" />
            <div class="bas-head-copy">
              <p class="bas-title">{{ book.title }}</p>
              <p class="bas-subtitle">{{ subtitle }}</p>
            </div>
          </header>

          <!-- Highlights and notes, only when the book has some: tiles with the
               icon over the label and a count, under the header. -->
          <div v-if="annotationTiles.length" class="bas-tiles" role="group" aria-label="Highlights and notes">
            <button
              v-for="tile in annotationTiles"
              :key="tile.id"
              type="button"
              class="bas-tile"
              @click="openAnnotations(tile.path)"
            >
              <i :class="tile.icon" aria-hidden="true"></i>
              <span class="bas-tile-label">{{ tile.label }}</span>
              <span class="bas-tile-count">{{ tile.count }}</span>
            </button>
          </div>

          <!-- Groups, top to bottom, by what an action does to the book:
               1. Collect: keep it somewhere (favourites, a playlist).
               2. Details: look at or change the book itself.
               3. Share: send it to someone else.
               4. Remove: take it out of the library view, from reversible
                  (hide) to permanent (delete, the only red action). -->
          <div v-for="group in groups" :key="group.id" class="bas-group" role="group" :aria-label="group.label">
            <button
              v-for="item in group.items"
              :key="item.action"
              type="button"
              class="bas-item"
              :class="{ destructive: item.destructive }"
              @click="choose(item.action)"
            >
              <i :class="item.icon" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
// The book detail page's "more" actions as a bottom sheet modelled on the
// iOS / Apple TV action sheet: grabber, a header naming the item, and
// full-width groups of icon + label rows divided by hairlines.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { countAnnotations } from '~/composables/useAnnotations'

const props = defineProps({
  open: { type: Boolean, default: false },
  book: { type: Object, required: true },
  coverUrl: { type: String, default: '' },
  inPlaylist: { type: Boolean, default: false },
  shareable: { type: Boolean, default: true },
})
const emit = defineEmits(['close', 'action', 'cover-error'])

const sheetRef = ref(null)

const subtitle = computed(() => {
  const { series, seriesInstallment, author } = props.book || {}
  if (series) return seriesInstallment ? `${series} · Book ${seriesInstallment}` : series
  return author || 'Book'
})

const groups = computed(() => [
  {
    id: 'collect',
    label: 'Collect',
    items: [
      {
        action: 'favourite',
        icon: props.book.isFavourite ? 'ri-heart-fill' : 'ri-heart-line',
        label: props.book.isFavourite ? 'Remove from Favourites' : 'Add to Favourites',
      },
      {
        action: 'playlist',
        icon: props.inPlaylist ? 'ri-play-list-2-fill' : 'ri-play-list-add-line',
        label: 'Add to Playlist',
      },
    ],
  },
  {
    id: 'details',
    label: 'Details',
    items: [
      { action: 'edit', icon: 'ri-edit-line', label: 'Edit Book' },
      { action: 'analytics', icon: 'ri-bar-chart-2-line', label: 'View Analytics' },
    ],
  },
  ...(props.shareable ? [{
    id: 'share',
    label: 'Share',
    items: [{ action: 'share', icon: 'ri-share-line', label: 'Share Book' }],
  }] : []),
  {
    id: 'remove',
    label: 'Remove',
    items: [
      { action: 'hide', icon: 'ri-eye-off-line', label: 'Hide Book' },
      { action: 'delete', icon: 'ri-delete-bin-line', label: 'Delete Book', destructive: true },
    ],
  },
])

// Counted when the sheet opens (a quick indexed read, not the shared list).
const router = useRouter()
const annotationCounts = ref({ highlights: 0, notes: 0 })
watch(() => [props.open, props.book?.id], async ([open, id]) => {
  if (!open || !id) return
  const counts = await countAnnotations(id)
  if (props.open && props.book?.id === id) annotationCounts.value = counts
}, { immediate: true })

const annotationTiles = computed(() => {
  const id = encodeURIComponent(String(props.book?.id ?? ''))
  const { highlights, notes } = annotationCounts.value
  return [
    highlights && { id: 'highlights', icon: 'ri-mark-pen-line', label: 'Highlights', count: highlights, path: `/highlights/${id}` },
    notes && { id: 'notes', icon: 'ri-sticky-note-line', label: 'Notes', count: notes, path: `/notes/${id}` },
  ].filter(Boolean)
})

const openAnnotations = (path) => {
  emit('close')
  router.push(path)
}

const close = () => emit('close')
const choose = (action) => {
  emit('close')
  emit('action', action)
}

// Pull the sheet down to dismiss it.
const dragOffset = ref(0)
let startY = null
const onTouchStart = (event) => { startY = event.touches[0].clientY }
const onTouchMove = (event) => {
  if (startY === null) return
  dragOffset.value = Math.max(0, event.touches[0].clientY - startY)
}
const onTouchEnd = () => {
  const height = sheetRef.value?.offsetHeight || 400
  if (dragOffset.value > Math.min(140, height * 0.3)) close()
  dragOffset.value = 0
  startY = null
}

const onKey = (event) => { if (event.key === 'Escape') close() }
watch(() => props.open, (open) => {
  if (open) {
    document.addEventListener('keydown', onKey)
    nextTick(() => sheetRef.value?.querySelector('.bas-item')?.focus({ preventScroll: true }))
  } else {
    document.removeEventListener('keydown', onKey)
  }
}, { immediate: true })
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* Every label in the sheet is regular weight (400), titles included. */
.bas-layer,
.bas-layer :is(h2, h3, strong, button, span, small, p) {
  font-weight: 400 !important;
}

.bas-layer {
  --bas-bg: #f2f2f7;
  --bas-text: #000;
  --bas-muted: #8a8a8e;
  --bas-line: rgba(60, 60, 67, 0.16);
  --bas-press: rgba(60, 60, 67, 0.1);
  --bas-tint: var(--color-brand-primary);
  --bas-tile-bg: #ffffff;
  --bas-destructive: #ff3b30;
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: flex;
  align-items: flex-end;
  font-family: var(--mobile-font-family);
}

:global(html[data-theme="dark"] .bas-layer) {
  --bas-bg: #1c1c1e;
  --bas-text: #fff;
  --bas-muted: #98989f;
  --bas-line: rgba(84, 84, 88, 0.55);
  --bas-press: rgba(255, 255, 255, 0.08);
  --bas-tint: var(--color-brand-primary);
  --bas-tile-bg: rgba(255, 255, 255, 0.07);
  --bas-destructive: #ff453a;
}

.bas-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, 0.32);
}

.bas-sheet {
  position: relative;
  width: 100%;
  max-height: 88vh;
  overflow-y: auto;
  padding: 0 0 calc(18px + env(safe-area-inset-bottom));
  border-radius: 20px 20px 0 0;
  background: var(--bas-bg);
  color: var(--bas-text);
  transition: transform 0.2s ease;
  overscroll-behavior: contain;
}

.bas-grabber {
  display: block;
  width: 36px;
  height: 5px;
  margin: 6px auto 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bas-muted) 55%, transparent);
}

.bas-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 19px 18px;
}

.bas-cover {
  flex: none;
  width: 44px;
  height: 66px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--bas-press);
}

.bas-head-copy {
  min-width: 0;
}

/* Text runs half a step heavier (450) than the app's global 400, which main.css
   enforces with !important on p/span/button, hence the !important here. */
.bas-title {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-size: 17px;
  font-weight: 400 !important;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.bas-subtitle {
  overflow: hidden;
  margin: 3px 0 0;
  color: var(--bas-muted);
  font-size: 14px;
  font-weight: 400 !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Full-width hairlines between groups, none between rows inside one. */
/* Highlights / notes tiles: rounded squares with the icon over the label and
   the count under it, sitting between the header and the first group. */
.bas-tiles {
  display: grid;
  /* Always two equal columns: a lone Highlights (or Notes) tile keeps its
     half width instead of stretching across the sheet. */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 19px 16px;
}

.bas-tile {
  display: grid;
  justify-items: center;
  gap: 3px;
  min-height: 82px;
  padding: 12px 8px;
  border: 0;
  border-radius: 16px;
  background: var(--bas-tile-bg);
  color: var(--bas-text);
  cursor: pointer;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.bas-tile:active {
  background: var(--bas-press);
}

.bas-tile i {
  color: var(--bas-tint);
  font-size: 20px;
  line-height: 1.2;
}

.bas-tile-label {
  font-size: 15px;
}

.bas-tile-count {
  color: var(--bas-muted);
  font-size: 13px;
}

.bas-group {
  display: grid;
  padding: 7px 0;
  border-top: 1px solid var(--bas-line);
}

.bas-item {
  display: flex;
  align-items: center;
  gap: 15px;
  min-height: 41px;
  padding: 0 19px;
  border: 0;
  background: transparent;
  color: var(--bas-text);
  cursor: pointer;
  font: inherit;
  font-size: 17px;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.bas-item span {
  font-weight: 400 !important;
}

.bas-item:active {
  background: var(--bas-press);
}

.bas-item i {
  width: 22px;
  color: var(--bas-tint);
  font-size: 22px;
  line-height: 1;
  text-align: center;
}

.bas-item.destructive,
.bas-item.destructive i {
  color: var(--bas-destructive);
}

.bas-item:focus-visible {
  outline: 2px solid var(--bas-tint);
  outline-offset: -2px;
}

.bas-enter-active,
.bas-leave-active {
  transition: opacity 0.22s ease;
}

.bas-enter-active .bas-sheet,
.bas-leave-active .bas-sheet {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.bas-enter-from,
.bas-leave-to {
  opacity: 0;
}

.bas-enter-from .bas-sheet,
.bas-leave-to .bas-sheet {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .bas-enter-active .bas-sheet,
  .bas-leave-active .bas-sheet {
    transition: none;
  }
}
</style>
