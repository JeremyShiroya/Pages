<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <PlaylistsMobile />
    </template>
    <template #tabletPortrait>
      <PlaylistsTabletPortrait />
    </template>
    <template #tabletLandscape>
      <PlaylistsDesktop />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import PlaylistsDesktop from '../tablet/PlaylistsDesktop.vue'
import PlaylistsMobile from '../mobile/PlaylistsMobile.vue'
import PlaylistsTabletPortrait from '../tablet/portrait/PlaylistsTabletPortrait.vue'
import ResponsiveViewSwitch from './ResponsiveViewSwitch.vue'
</script>
