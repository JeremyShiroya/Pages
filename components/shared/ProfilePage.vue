<template>
  <main
    class="profile-page"
    data-system-bar-color="transparent"
    :data-system-bar-icons="settings.readerTheme === 'dark' ? 'light' : 'dark'"
  >
    <header class="profile-nav" aria-label="Profile navigation">
      <span class="nav-spacer" aria-hidden="true"></span>
      <h1>Profile</h1>
      <div class="nav-actions">
        <button v-if="showStreak" type="button" class="streak-pill" aria-label="Open streak calendar" @click="router.push('/streak')">
          <i class="ri-fire-fill"></i>
          <span>{{ streakCount }}</span>
        </button>
        <button type="button" class="menu-button" aria-label="Open settings" @click="router.push('/settings')">
          <i class="ri-menu-line"></i>
        </button>
      </div>
    </header>

    <div class="profile-content">
      <section class="profile-summary" aria-label="Reading profile">
        <div class="profile-overview">
          <button type="button" class="avatar-button" aria-label="Choose avatar" @click="openAvatarPicker">
            <span class="avatar-ring"><img :src="profileAvatar" :alt="`${profile.displayName} avatar`" /></span>
            <span class="camera-badge"><i class="ri-camera-line"></i></span>
          </button>

          <div class="metrics" aria-label="Reading metrics">
            <article v-for="metric in metrics" :key="metric.label">
              <strong>{{ metric.value }}</strong>
              <span>{{ metric.label }}</span>
            </article>
          </div>
        </div>

        <div class="profile-details">
          <h2>{{ profile.displayName || 'Reader' }}</h2>
          <p>{{ dailyCompliment }}</p>
          <NuxtLink class="edit-profile-button" to="/editprofilepage">
            <i class="ri-edit-line" aria-hidden="true"></i>
            <span>Edit profile</span>
          </NuxtLink>
        </div>
      </section>

      <section class="profile-library" aria-label="Profile library">
        <div class="profile-tabs" role="tablist" aria-label="Profile sections">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <i :class="tab.icon"></i>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <div v-if="activeTab === 'favourites'" class="tab-panel" role="tabpanel">
          <div v-if="selectionMode" class="profile-selection-row">
            <SelectionActionsBar
              :count="selectedCount"
              :actions="bulkActions"
              @action="runBulkAction"
              @clear="clearSelection"
            />
          </div>

          <div
            v-if="favourites.length"
            :class="profileFavouritesLayout === 'list' ? 'books-list' : 'books-grid'"
          >
            <LibraryBookCard
              v-for="book in favourites"
              :key="book.id"
              :book="book"
              :class="{ 'mobile-list-book-card': profileFavouritesLayout === 'list' }"
              :collapse-actions="profileFavouritesLayout === 'list'"
              :selectable="selectionMode"
              :selected="isSelected(book.id)"
              @toggle-select="toggleSelected"
              @pointerdown="(event) => onPointerDown(event, book)"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @open="openProfileBook"
              @favourite="toggleFavourite(book.id)"
              @playlist="selectedPlaylistBook = book"
              @edit="router.push(bookEditLocation(book.id, '/profile'))"
              @hide="hideProfileBook"
              @delete="bulkDeleteBooks = [book]"
            />
          </div>
          <EmptyState
            v-else
            illustration="favourites"
            title="No favourites yet"
            description="Books you favourite will appear on your profile."
          />
        </div>

        <div v-else class="tab-panel" role="tabpanel">
          <div v-if="playlistsWithBooks.length" class="playlist-grid">
            <SeriesCollageCard
              v-for="playlist in playlistsWithBooks"
              :key="playlist.id"
              variant="playlist"
              :series="playlist"
              @open="router.push(`/playlist/${playlist.id}`)"
            />
          </div>
          <EmptyState
            v-else
            illustration="playlists"
            title="No playlists yet"
            description="Create a playlist and it will appear on your profile."
          />
        </div>
      </section>
    </div>

    <AddToPlaylistModal
      v-if="selectedPlaylistBook || bulkPlaylistBooks"
      :book="selectedPlaylistBook"
      :books="bulkPlaylistBooks"
      @close="selectedPlaylistBook = null; bulkPlaylistBooks = null"
    />

    <DeleteConfirmModal
      v-if="bulkDeleteBooks?.length"
      :book="bulkDeleteBooks[0]"
      :count="bulkDeleteBooks.length"
      @close="bulkDeleteBooks = null"
      @confirm="confirmBulkDelete"
    />

    <AvatarSourcePicker :open="avatarSourceOpen" @close="avatarSourceOpen = false" @presets="openPresetPicker" @cropped="saveGalleryAvatar" />

    <Teleport to="body">
      <div v-if="avatarModalOpen" class="avatar-modal-layer" role="presentation">
        <button class="avatar-modal-backdrop" type="button" aria-label="Close avatar picker" @click="avatarModalOpen = false"></button>
        <section class="avatar-modal" role="dialog" aria-modal="true" aria-labelledby="profile-avatar-title">
          <header>
            <div>
              <h2 id="profile-avatar-title">Choose an avatar</h2>
              <p>Pick the picture shown on your profile.</p>
            </div>
            <button type="button" class="modal-close" aria-label="Close avatar picker" @click="avatarModalOpen = false">
              <i class="ri-close-line"></i>
            </button>
          </header>

          <div class="avatar-grid">
            <button
              v-for="avatar in avatarPresets"
              :key="avatar.id"
              type="button"
              :aria-label="`Select ${avatar.label}`"
              :aria-pressed="pendingAvatar === avatar.src"
              :class="{ active: pendingAvatar === avatar.src }"
              @click="pendingAvatar = avatar.src"
            >
              <img :src="avatar.src" :alt="avatar.label" />
            </button>
          </div>

          <button class="update-avatar-button" type="button" :disabled="updatingAvatar" @click="updateAvatar">
            {{ updatingAvatar ? 'Updating…' : 'Update' }}
          </button>
        </section>
      </div>
    </Teleport>

    <MobileBottomNav />
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useBooks } from '~/composables/useBooks'
import { useBookishSettings } from '~/composables/useBookishSettings'
import { bookEditLocation } from '~/composables/useBookEditNavigation'
import { useDailyCompliment } from '~/composables/useDailyCompliment'
import { useLongPress, useMultiSelect } from '~/composables/useMultiSelect'
import { useStreak } from '~/composables/useStreak'
import { useToast } from '~/composables/useToast'
import { useUserProfile } from '~/composables/useUserProfile'
import EmptyState from './EmptyState.vue'
import AddToPlaylistModal from './AddToPlaylistModal.vue'
import DeleteConfirmModal from './DeleteConfirmModal.vue'
import LibraryBookCard from './LibraryBookCard.vue'
import SelectionActionsBar from './SelectionActionsBar.vue'
import SeriesCollageCard from './SeriesCollageCard.vue'
import MobileBottomNav from '~/components/mobile/MobileBottomNav.vue'
import AvatarSourcePicker from './AvatarSourcePicker.vue'

const router = useRouter()
const { books, collections, favourites, fetchAllData, toggleFavourite, hideBook, deleteBook } = useBooks()
const { settings } = useBookishSettings()
const { compliment: dailyCompliment, loadDailyCompliment } = useDailyCompliment()
const { streakCount } = useStreak()
const { addToast } = useToast()
const { profile, avatarPresets, activeAvatarPreset, loadProfile, updateProfile } = useUserProfile()

const activeTab = ref('favourites')
const avatarSourceOpen = ref(false)
const avatarModalOpen = ref(false)
const pendingAvatar = ref('')
const updatingAvatar = ref(false)
const selectedPlaylistBook = ref(null)
const bulkPlaylistBooks = ref(null)
const bulkDeleteBooks = ref(null)
const showStreak = computed(() => settings.value.showStreak !== false)
const profileAvatar = computed(() => profile.value.avatarValue || activeAvatarPreset.value.src)
const profileFavouritesLayout = computed(() => settings.value.profileFavouritesLayout || 'grid')

const {
  selectionMode,
  selectedCount,
  isSelected,
  toggle: toggleSelect,
  start: startSelection,
  clear: clearSelection,
  retain: retainSelection,
} = useMultiSelect()
const { onPointerDown, onPointerMove, onPointerUp, consumedTap } = useLongPress((book) => startSelection(book.id))
const toggleSelected = (book) => toggleSelect(book.id)
const selectedBooks = computed(() => favourites.value.filter((book) => isSelected(book.id)))
const bulkActions = [
  { key: 'favourite', icon: 'ri-heart-fill', label: 'Remove favourite' },
  { key: 'playlist', icon: 'ri-play-list-2-line', label: 'Add to playlist' },
  { key: 'hide', icon: 'ri-eye-off-line', label: 'Hide' },
  { key: 'delete', icon: 'ri-delete-bin-line', label: 'Delete', danger: true },
]

const openProfileBook = (book) => {
  if (consumedTap()) return
  if (selectionMode.value) return toggleSelect(book.id)
  router.push(`/book/${book.id}`)
}

const hideProfileBook = async (book) => {
  await hideBook(book.id)
  addToast(`“${book.title}” is now hidden from your library.`, 'info')
}

const runBulkAction = async (key) => {
  const chosen = selectedBooks.value
  if (!chosen.length) return
  if (key === 'playlist') {
    bulkPlaylistBooks.value = chosen
    return
  }
  if (key === 'delete') {
    bulkDeleteBooks.value = chosen
    return
  }
  if (key === 'favourite') {
    for (const book of chosen) await toggleFavourite(book.id)
    addToast(`${chosen.length} book${chosen.length === 1 ? '' : 's'} removed from favourites.`, 'success')
    clearSelection()
    return
  }
  if (key === 'hide') {
    for (const book of chosen) await hideBook(book.id)
    addToast(`${chosen.length} book${chosen.length === 1 ? '' : 's'} hidden.`, 'info')
    clearSelection()
  }
}

const confirmBulkDelete = async () => {
  const chosen = bulkDeleteBooks.value || []
  bulkDeleteBooks.value = null
  for (const book of chosen) await deleteBook(book.id)
  addToast(`${chosen.length} book${chosen.length === 1 ? '' : 's'} permanently deleted.`, 'success')
  clearSelection()
}

const statusFor = (book) => {
  const status = String(book?.status || '').toLowerCase()
  const progress = Number(book?.progress) || 0
  if (status === 'read' || status === 'completed' || progress >= 100) return 'read'
  if (status === 'reading' || progress > 0) return 'reading'
  return 'unread'
}

const metrics = computed(() => {
  const counts = { unread: 0, read: 0, reading: 0 }
  books.value.forEach((book) => { counts[statusFor(book)] += 1 })
  return [
    { label: 'Books', value: books.value.length },
    { label: 'Unread', value: counts.unread },
    { label: 'Read', value: counts.read },
    { label: 'Reading', value: counts.reading },
  ]
})

const tabs = [
  { id: 'favourites', label: 'Favourites', icon: 'ri-heart-3-line' },
  { id: 'playlists', label: 'Playlists', icon: 'ri-play-list-2-line' },
]

const playlistsWithBooks = computed(() => collections.value.map((playlist) => {
  const ids = playlist.bookIds || []
  const playlistBooks = ids
    .map((id) => books.value.find((book) => String(book.id) === String(id)))
    .filter(Boolean)
  return { ...playlist, bookCount: ids.length, books: playlistBooks }
}))

watch(favourites, (current) => retainSelection(current.map((book) => book.id)))
watch(activeTab, (tab) => { if (tab !== 'favourites') clearSelection() })

const openAvatarPicker = () => {
  avatarSourceOpen.value = true
}

const openPresetPicker = () => {
  avatarSourceOpen.value = false
  pendingAvatar.value = profileAvatar.value
  avatarModalOpen.value = true
}

const saveGalleryAvatar = async (cropped) => {
  if (updatingAvatar.value) return
  updatingAvatar.value = true
  try {
    await updateProfile({ avatarType: 'image', avatarValue: cropped })
    avatarSourceOpen.value = false
    addToast('Profile photo updated', 'success')
  } catch (error) {
    addToast(error?.message || 'Could not update profile photo', 'error')
  } finally {
    updatingAvatar.value = false
  }
}

const updateAvatar = async () => {
  if (!pendingAvatar.value || updatingAvatar.value) return
  updatingAvatar.value = true
  try {
    await updateProfile({ avatarType: 'image', avatarValue: pendingAvatar.value })
    avatarModalOpen.value = false
    addToast('Avatar updated', 'success')
  } catch (error) {
    addToast(error?.message || 'Could not update avatar', 'error')
  } finally {
    updatingAvatar.value = false
  }
}

onMounted(async () => {
  loadDailyCompliment()
  await Promise.all([loadProfile(), fetchAllData()])
})
</script>

<style scoped>
.profile-page {
  min-height: 100dvh;
  background: var(--color-background-app);
  color: var(--color-text-primary);
}

.profile-nav {
  position: sticky;
  top: 0;
  z-index: 1100;
  display: grid;
  grid-template-columns: minmax(100px, 1fr) auto minmax(100px, 1fr);
  align-items: center;
  min-height: 70px;
  padding: 0 24px;
  background: color-mix(in srgb, var(--color-background-app) 92%, transparent);
  backdrop-filter: blur(16px);
}

.profile-nav h1 { margin: 0; font-size: 1.15rem; font-weight: 600; text-align: center; }
.nav-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.streak-pill, .menu-button { display: inline-flex; align-items: center; justify-content: center; border: 0; color: var(--color-text-primary); cursor: pointer; }
.streak-pill { gap: 4px; min-height: 36px; padding: 0 12px; border-radius: 999px; background: var(--color-brand-primary-muted); color: var(--color-brand-primary); }
.menu-button { width: 44px; height: 44px; padding: 0; background: transparent; font-size: 22px; }
.profile-content { width: min(1040px, 100%); margin: 0 auto; padding: 32px 28px 120px; }
.profile-summary { width: min(720px, 100%); margin: 0 auto; }
.profile-overview { display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 42px; }
.avatar-button { position: relative; padding: 0; border: 0; background: transparent; cursor: pointer; }
.avatar-ring { display: block; width: 136px; height: 136px; overflow: hidden; border-radius: 50%; }
.avatar-ring img { width: 100%; height: 100%; object-fit: cover; }
.camera-badge { position: absolute; right: 5px; bottom: 5px; display: grid; width: 36px; height: 36px; place-items: center; border: 3px solid var(--color-background-app); border-radius: 50%; background: var(--color-brand-primary); color: var(--color-text-on-brand); font-size: 17px; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.metrics article { display: grid; gap: 4px; text-align: center; }
.metrics strong { font-size: 1.35rem; }
.metrics span { color: var(--color-text-muted); font-size: 0.8rem; }
.profile-details { margin-top: 20px; }
.profile-details h2 { margin: 0; font-size: 1.2rem; font-weight: 650; }
.profile-details p { margin: 5px 0 0; color: var(--color-text-muted); font-size: 0.9rem; }
.edit-profile-button { display: flex; width: 100%; min-height: 40px; align-items: center; justify-content: center; gap: 7px; margin-top: 16px; padding: 0 18px; border: 1px solid var(--color-border-card); border-radius: var(--mobile-control-radius); background: var(--color-settings-group); color: var(--color-text-primary); text-decoration: none; font-size: 0.86rem; font-weight: 600; }
.edit-profile-button:active { background: var(--color-surface-hover); }
:root[data-theme="dark"] .edit-profile-button { border-color: transparent; }
.profile-library { margin-top: 28px; }
.profile-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-bottom: 1px solid var(--color-border-subtle); }
.profile-tabs button { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 54px; border: 0; background: transparent; color: var(--color-text-muted); cursor: pointer; font: inherit; font-size: 0.9rem; }
.profile-tabs button.active { color: var(--color-brand-primary); font-weight: 600; }
.profile-tabs button.active::after { position: absolute; right: 14%; bottom: -1px; left: 14%; height: 2px; border-radius: 99px; background: var(--color-brand-primary); content: ''; }
.tab-panel { padding-top: 24px; }
.books-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 14px; }
.books-list { display: grid; grid-template-columns: 1fr; gap: 16px; }
.profile-selection-row { display: flex; min-height: 44px; align-items: center; justify-content: flex-end; margin-bottom: 14px; padding: 5px 0; }
.playlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
.avatar-modal-layer { position: fixed; z-index: 4000; inset: 0; display: grid; place-items: center; padding: 20px; }
.avatar-modal-backdrop { position: absolute; inset: 0; border: 0; background: rgba(10, 8, 20, 0.62); backdrop-filter: blur(5px); }
.avatar-modal { position: relative; z-index: 1; width: min(520px, 100%); max-height: min(720px, 88vh); overflow: auto; padding: 24px; border: 1px solid var(--color-border-card); border-radius: 20px; background: var(--color-surface-primary); box-shadow: var(--shadow-modal); }
.avatar-modal header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.avatar-modal h2 { margin: 0; font-size: 1.25rem; }
.avatar-modal p { margin: 5px 0 0; color: var(--color-text-muted); font-size: 0.87rem; }
.modal-close { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border: 0; border-radius: 50%; background: var(--color-surface-secondary); color: var(--color-text-primary); cursor: pointer; font-size: 20px; }
.avatar-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 24px 0; }
.avatar-grid button { aspect-ratio: 1; overflow: hidden; padding: 3px; border: 2px solid transparent; border-radius: 50%; background: transparent; cursor: pointer; }
.avatar-grid button.active { border-color: var(--color-brand-primary); }
.avatar-grid img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.update-avatar-button { width: 100%; min-height: 48px; border: 0; border-radius: 12px; background: var(--gradient-brand-primary); color: var(--color-text-on-brand); cursor: pointer; font: inherit; font-weight: 600; }
.update-avatar-button:disabled { opacity: 0.65; cursor: wait; }

@media (max-width: 768px), (orientation: portrait) and (min-width: 769px) and (max-width: 1024px) {
  .profile-page { padding-bottom: calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom)); }
  .profile-nav { position: fixed; right: 0; left: 0; height: calc(70px + env(safe-area-inset-top)); padding: env(safe-area-inset-top) var(--mobile-page-padding-inline) 0; grid-template-columns: minmax(92px, 1fr) auto minmax(92px, 1fr); }
  .profile-content { padding: calc(96px + env(safe-area-inset-top)) var(--mobile-page-padding-inline) 32px; }
  .profile-overview { grid-template-columns: 96px minmax(0, 1fr); gap: 18px; }
  .avatar-ring { width: 92px; height: 92px; }
  .camera-badge { width: 33px; height: 33px; }
  .metrics strong { font-size: 1.15rem; }
  .metrics span { font-size: 0.7rem; }
  .profile-details { margin-top: 18px; }
  .profile-library { margin-top: 18px; }
  .tab-panel { padding-top: 18px; }
  .books-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px 12px; }
  .playlist-grid { grid-template-columns: 1fr; }
  .avatar-modal-layer { align-items: end; padding: 0; }
  .avatar-modal { width: 100%; max-height: 82vh; padding: 22px 20px calc(22px + env(safe-area-inset-bottom)); border-radius: 22px 22px 0 0; }
  .avatar-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 380px) {
  .profile-nav { grid-template-columns: minmax(82px, 1fr) auto minmax(82px, 1fr); padding-inline: 12px; }
  .streak-pill { padding: 0 9px; }
  .menu-button { width: 38px; }
  .metrics span { font-size: 0.64rem; }
}
</style>
