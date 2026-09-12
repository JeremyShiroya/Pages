<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <div class="app-layout compact-layout phone-layout">
        <main class="main-content">
          <div class="page-container" :class="{ 'mobile-sub-page': isMobileSubPage }"><slot /></div>
          <MobilePlayingBar />
        </main>
      </div>
    </template>

    <template #tabletPortrait>
      <div class="app-layout compact-layout tablet-portrait-layout">
        <main class="main-content">
          <div class="page-container" :class="{ 'mobile-sub-page': isMobileSubPage }"><slot /></div>
          <TabletPlayingBar />
        </main>
      </div>
    </template>

    <template #tabletLandscape>
      <div class="app-layout tablet-landscape-layout">
        <Sidebar />
        <main class="main-content">
          <div class="page-container"><slot /></div>
          <PlayingBar />
        </main>
      </div>
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '~/components/tablet/Sidebar.vue'
import MobilePlayingBar from '~/components/mobile/MobilePlayingBar.vue'
import TabletPlayingBar from '~/components/tablet/portrait/TabletPlayingBar.vue'
import PlayingBar from '~/components/shared/PlayingBar.vue'
import ResponsiveViewSwitch from '~/components/shared/ResponsiveViewSwitch.vue'

// The five tab-root pages carry their own fixed top/bottom nav bars, which
// already reserve the phone's status- and navigation-bar areas. Every OTHER
// page (details, settings, profile, …) has content in normal flow, so once the
// app draws edge-to-edge it needs the safe-area insets applied here — otherwise
// it slides up under the status bar and down under the gesture bar. The body's
// own app-coloured background then fills those bar strips, in light and dark.
const TAB_ROOT_PATHS = new Set(['/', '/books', '/series', '/favourites', '/playlists'])
const route = useRoute()
const isMobileSubPage = computed(() => !TAB_ROOT_PATHS.has(route.path))
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.main-content {
  transition: margin-left 0.3s ease;
  margin-left: var(--sidebar-width);
  background-color: var(--app);
  min-height: 100vh;
}

.page-container {
  padding: 2.5rem;
  padding-bottom: 120px; /* Account for PlayingBar (90px) + 30px breathing room */
}

.compact-layout .main-content {
  margin-left: 0;
}

.compact-layout .page-container {
  padding: 0;
}

@media (max-width: 768px),
  (orientation: portrait) and (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    margin-left: 0;
  }

  .page-container {
    padding: 0;
  }

  /* Sub-pages sit in normal flow, so they must clear the status bar (top) and
     the gesture/navigation bar (bottom) themselves. The tab-root pages are left
     untouched — their own fixed nav bars already handle those insets, and
     padding here would double it and open a gap above the bottom nav. */
  .page-container.mobile-sub-page {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  :deep(.sidebar),
  :deep(.playing-bar) {
    display: none;
  }
}
</style>
