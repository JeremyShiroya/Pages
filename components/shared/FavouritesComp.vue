<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <FavouritesMobile />
    </template>
    <template #tabletPortrait>
      <FavouritesTabletPortrait />
    </template>
    <template #tabletLandscape>
      <FavouritesDesktop />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import FavouritesDesktop from '../tablet/FavouritesDesktop.vue'
import FavouritesMobile from '../mobile/FavouritesMobile.vue'
import FavouritesTabletPortrait from '../tablet/portrait/FavouritesTabletPortrait.vue'
import ResponsiveViewSwitch from './ResponsiveViewSwitch.vue'
</script>
