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
      <div class="reader-tablet-landscape-layout">
        <slot />
      </div>
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import ResponsiveViewSwitch from '~/components/shared/ResponsiveViewSwitch.vue'
</script>

<style scoped>
.reader-mobile-layout {
  min-height: 100vh;
  overflow-x: hidden;
}

.reader-tablet-portrait-layout {
  min-height: 100vh;
  overflow-x: hidden;
}

.reader-tablet-landscape-layout {
  min-height: 100vh;
  overflow-x: hidden;
}
</style>
