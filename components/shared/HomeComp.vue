<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <HomeMobile />
    </template>
    <template #tabletPortrait>
      <HomeTabletPortrait />
    </template>
    <template #tabletLandscape>
      <HomeDesktop />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import HomeDesktop from '../tablet/HomeDesktop.vue'
import HomeMobile from '../mobile/HomeMobile.vue'
import HomeTabletPortrait from '../tablet/portrait/HomeTabletPortrait.vue'
import ResponsiveViewSwitch from './ResponsiveViewSwitch.vue'
</script>
