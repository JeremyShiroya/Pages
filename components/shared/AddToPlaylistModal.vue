<template>
  <div class="playlist-overlay" role="presentation" @click="emit('close')">
    <section
      class="playlist-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-sheet-title"
      @click.stop
    >
      <span class="sheet-grabber" aria-hidden="true"></span>

      <!-- Title bar: the title centred, Done on the right, as a system sheet. -->
      <header class="sheet-bar">
        <span class="bar-side" aria-hidden="true"></span>
        <h2 id="playlist-sheet-title">Add to Playlist</h2>
        <button type="button" class="bar-done" :disabled="saving" @click="finish">
          {{ creating && newPlaylistName.trim() ? 'Create' : 'Done' }}
        </button>
      </header>

      <div class="book-preview">
        <img :src="coverUrl" :alt="leadBook.title" @error="handleCoverError" />
        <div>
          <strong>{{ isBulk ? `${targetBooks.length} books` : leadBook.title }}</strong>
          <span>{{ isBulk ? 'Selected in your library' : (leadBook.author || 'Unknown author') }}</span>
        </div>
      </div>

      <!-- Tap a playlist to toggle the book in or out; the sheet stays open so
           one book can be filed into several playlists in a row. Done closes. -->
      <div class="playlist-list" role="group" aria-label="Your playlists">
        <!-- No separate Create button: typing a name and pressing Done (or the
             keyboard's enter) creates the playlist with this book in it. -->
        <div v-if="creating" class="list-row new-playlist-row">
          <span class="row-art accent"><i class="ri-add-line"></i></span>
          <input
            ref="newPlaylistInput"
            :value="newPlaylistName"
            type="text"
            maxlength="100"
            placeholder="Playlist Name"
            enterkeyhint="done"
            @input="newPlaylistName = $event.target.value"
            @keydown.enter.prevent="createAndAdd"
            @keydown.esc="cancelCreating"
          />
          <button type="button" class="row-ghost" aria-label="Cancel new playlist" @click="cancelCreating">
            <i class="ri-close-circle-fill"></i>
          </button>
        </div>

        <button v-else type="button" class="list-row new-playlist-toggle" @click="startCreating">
          <span class="row-art accent"><i class="ri-add-line"></i></span>
          <span class="row-copy"><strong>New Playlist…</strong></span>
        </button>

        <button
          v-for="playlist in playlists"
          :key="playlist.id"
          type="button"
          class="list-row playlist-row"
          :class="{ added: playlist.alreadyHas }"
          :disabled="saving"
          :aria-pressed="playlist.alreadyHas"
          @click="togglePlaylist(playlist)"
        >
          <span class="row-art"><i class="ri-play-list-2-fill"></i></span>
          <span class="row-copy">
            <strong>{{ playlist.name }}</strong>
            <small>{{ playlist.bookIds?.length || 0 }} {{ (playlist.bookIds?.length || 0) === 1 ? 'book' : 'books' }}</small>
          </span>
          <i v-if="playlist.alreadyHas" class="ri-check-line row-check" aria-hidden="true"></i>
        </button>
      </div>

      <p v-if="!playlists.length && !creating" class="playlist-empty">
        You have no playlists yet. Tap New Playlist to create your first one.
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { useBooks } from '~/composables/useBooks'
import { useToast } from '~/composables/useToast'

const props = defineProps({
  book: {
    type: Object,
    default: null,
  },
  // Bulk selection files several books at once. One book or many is the only
  // difference — the sheet, the toggling and the create-and-add flow are the
  // same, so they share one component rather than two that drift apart.
  books: {
    type: Array,
    default: null,
  },
})

const emit = defineEmits(['close', 'saved'])
const { collections, createPlaylist, addBookToPlaylist, removeBookFromPlaylist } = useBooks()
const { addToast } = useToast()

const creating = ref(false)
const newPlaylistName = ref('')
const newPlaylistInput = ref(null)
const saving = ref(false)

const targetBooks = computed(() => (props.books?.length ? props.books : [props.book].filter(Boolean)))
const isBulk = computed(() => targetBooks.value.length > 1)
const leadBook = computed(() => targetBooks.value[0] || { title: 'Book' })

// "Already has" means EVERY selected book is in it — a partial playlist still
// offers to take the rest.
const playlists = computed(() => collections.value.map(playlist => {
  const ids = (playlist.bookIds || []).map(String)
  return {
    ...playlist,
    alreadyHas: targetBooks.value.length > 0
      && targetBooks.value.every((book) => ids.includes(String(book.id))),
  }
}))

const generateCoverPlaceholder = (title) => {
  const safeTitle = String(title || 'Book')
  const initial = safeTitle.trim()[0]?.toUpperCase() || '?'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280"><rect width="200" height="280" fill="#6A0DAD"/><text x="100" y="145" font-family="serif" font-size="96" fill="rgba(255,255,255,.48)" text-anchor="middle" dominant-baseline="middle">${initial}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const coverUrl = computed(() => leadBook.value.cover || generateCoverPlaceholder(leadBook.value.title))
const handleCoverError = (event) => {
  event.target.src = generateCoverPlaceholder(leadBook.value.title)
}

const startCreating = async () => {
  creating.value = true
  newPlaylistName.value = ''
  await nextTick()
  newPlaylistInput.value?.focus()
}

const cancelCreating = () => {
  creating.value = false
  newPlaylistName.value = ''
}

// Tap toggles membership and leaves the sheet open, so the book can be filed
// into several playlists (or pulled back out) without reopening.
const togglePlaylist = async (playlist) => {
  if (saving.value) return
  saving.value = true
  try {
    if (playlist.alreadyHas) {
      for (const book of targetBooks.value) await removeBookFromPlaylist(playlist.id, book.id)
      addToast(`Removed from "${playlist.name}"`, 'success')
    } else {
      for (const book of targetBooks.value) await addBookToPlaylist(playlist.id, book.id)
      addToast(`Added to "${playlist.name}"`, 'success')
    }
    emit('saved')
  } catch (error) {
    console.error('Playlist update failed:', error)
    addToast('Failed to update playlist', 'error')
  } finally {
    saving.value = false
  }
}

const createAndAdd = async () => {
  const name = newPlaylistName.value.trim()
  if (!name || saving.value) return false
  saving.value = true
  try {
    const playlist = await createPlaylist({ name })
    for (const book of targetBooks.value) await addBookToPlaylist(playlist.id, book.id)
    addToast(`Added to "${name}"`, 'success')
    emit('saved')
    // Back to the playlist list (now including the new one) rather than
    // closing, so more playlists can be picked in the same pass.
    creating.value = false
    newPlaylistName.value = ''
    return true
  } catch (error) {
    console.error('Playlist create failed:', error)
    addToast('Failed to create playlist', 'error')
    return false
  } finally {
    saving.value = false
  }
}

// The single Done button: if a new playlist name is pending, create it (with
// this book in it) as part of finishing — no separate Create step.
const finish = async () => {
  if (creating.value && newPlaylistName.value.trim()) {
    const created = await createAndAdd()
    if (!created) return // keep the sheet open so the name isn't lost
  }
  emit('close')
}
</script>

<style scoped>
.playlist-overlay {
  --pl-bg: #f2f2f7;
  --pl-card: #ffffff;
  --pl-text: #000;
  --pl-muted: #8a8a8e;
  --pl-line: rgba(60, 60, 67, 0.16);
  --pl-press: rgba(60, 60, 67, 0.08);
  --pl-fill: rgba(118, 118, 128, 0.12);
  --pl-blue: #007aff;
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.32);
  font-family: var(--mobile-font-family);
  animation: pl-fade 0.2s ease both;
}

:global(html[data-theme="dark"] .playlist-overlay) {
  --pl-bg: #1c1c1e;
  --pl-card: #2c2c2e;
  --pl-text: #fff;
  --pl-muted: #98989f;
  --pl-line: rgba(84, 84, 88, 0.6);
  --pl-press: rgba(255, 255, 255, 0.07);
  --pl-fill: rgba(118, 118, 128, 0.24);
  --pl-blue: #0a84ff;
}

.playlist-sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 86vh;
  padding: 0 16px calc(20px + env(safe-area-inset-bottom));
  border-radius: 16px 16px 0 0;
  background: var(--pl-bg);
  color: var(--pl-text);
  animation: pl-rise 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.sheet-grabber {
  display: block;
  flex: none;
  width: 36px;
  height: 5px;
  margin: 6px auto 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pl-muted) 55%, transparent);
}

.sheet-bar {
  display: grid;
  flex: none;
  grid-template-columns: 64px minmax(0, 1fr) 64px;
  align-items: center;
  min-height: 52px;
}

.sheet-bar h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 450 !important;
  text-align: center;
}

.bar-done {
  justify-self: end;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--pl-blue);
  font: inherit;
  font-size: 17px;
  font-weight: 450 !important;
  cursor: pointer;
}

.bar-done:disabled { opacity: 0.5; }

.book-preview {
  display: flex;
  flex: none;
  align-items: center;
  gap: 12px;
  padding: 4px 4px 16px;
}

.book-preview img {
  width: 40px;
  height: 60px;
  border-radius: 5px;
  object-fit: cover;
}

.book-preview div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.book-preview strong,
.book-preview span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-preview strong { font-size: 15px; font-weight: 500 !important; }
.book-preview span { color: var(--pl-muted); font-size: 13px; }

/* One grouped list: rows divided by hairlines inset past the artwork. */
.playlist-list {
  overflow-y: auto;
  border-radius: 12px;
  background: var(--pl-card);
  overscroll-behavior: contain;
}

.list-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  padding: 8px 16px 8px 12px;
  border: 0;
  background: transparent;
  color: var(--pl-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.list-row + .list-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 68px;
  height: 1px;
  background: var(--pl-line);
}

.list-row:active { background: var(--pl-press); }
.list-row:disabled { cursor: default; }

.row-art {
  display: grid;
  flex: none;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  background: var(--pl-fill);
  color: var(--pl-muted);
  font-size: 22px;
}

.row-art.accent { color: var(--pl-blue); }

.row-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.row-copy strong {
  overflow: hidden;
  font-size: 17px;
  font-weight: 400 !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-playlist-toggle .row-copy strong { color: var(--pl-blue); }
.row-copy small { color: var(--pl-muted); font-size: 13px; }

.row-check {
  flex: none;
  color: var(--pl-blue);
  font-size: 22px;
}

.new-playlist-row input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--pl-text);
  font: inherit;
  font-size: 17px;
}

.new-playlist-row input::placeholder { color: var(--pl-muted); }

.row-ghost {
  display: grid;
  flex: none;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pl-muted);
  font-size: 20px;
  cursor: pointer;
}

.playlist-empty {
  margin: 10px 16px 0;
  color: var(--pl-muted);
  font-size: 13px;
  line-height: 1.4;
}

@keyframes pl-fade { from { opacity: 0; } }
@keyframes pl-rise { from { transform: translateY(100%); } }

@media (prefers-reduced-motion: reduce) {
  .playlist-overlay,
  .playlist-sheet { animation: none; }
}
</style>
