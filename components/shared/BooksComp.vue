<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <BooksMobile />
    </template>
    <template #tabletPortrait>
      <BooksTabletPortrait />
    </template>
    <template #tabletLandscape>
      <BooksDesktop />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import BooksDesktop from '../tablet/BooksDesktop.vue'
import BooksMobile from '../mobile/BooksMobile.vue'
import BooksTabletPortrait from '../tablet/portrait/BooksTabletPortrait.vue'
import ResponsiveViewSwitch from './ResponsiveViewSwitch.vue'
</script>
