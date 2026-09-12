<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <SeriesMobile />
    </template>
    <template #tabletPortrait>
      <SeriesTabletPortrait />
    </template>
    <template #tabletLandscape>
      <SeriesDesktop />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import SeriesDesktop from '../tablet/SeriesDesktop.vue'
import SeriesMobile from '../mobile/SeriesMobile.vue'
import SeriesTabletPortrait from '../tablet/portrait/SeriesTabletPortrait.vue'
import ResponsiveViewSwitch from './ResponsiveViewSwitch.vue'
</script>
