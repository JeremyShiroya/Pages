<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <div class="reader-mobile-layout">
        <slot />
      </div>
    </template>

    <template #tabletPortrait>
      <div class="reader-tablet-portrait-layout">
        <slot />
      </div>
    </template>

    <template #tabletLandscape>
      <div class="reader-layout">
        <Sidebar />
        <div class="reader-main">
          <slot />
        </div>
        <PlayingBar />
      </div>
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import Sidebar from '~/components/tablet/Sidebar.vue'
import PlayingBar from '~/components/shared/PlayingBar.vue'
import ResponsiveViewSwitch from '~/components/shared/ResponsiveViewSwitch.vue'
</script>

<style scoped>
.reader-layout {
  min-height: 100vh;
  display: flex;
}

.reader-mobile-layout {
  min-height: 100vh;
  overflow-x: hidden;
}

.reader-tablet-portrait-layout {
  min-height: 100vh;
  overflow-x: hidden;
}

.reader-main {
  flex: 1;
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  overflow-x: hidden;
  padding-bottom: 90px;
}

@media (max-width: 768px),
  (orientation: portrait) and (min-width: 769px) and (max-width: 1024px) {
  .reader-layout {
    display: block;
  }

  .reader-layout :deep(.sidebar),
  .reader-layout :deep(.playing-bar) {
    display: none !important;
  }

  .reader-main {
    margin-left: 0;
    width: 100%;
    padding-bottom: 0;
  }
}
</style>
