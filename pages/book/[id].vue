<template>
  <ResponsiveViewSwitch>
    <template #phone><BookDetailMobile /></template>
    <template #tabletPortrait><BookDetailTabletPortrait /></template>
    <template #tabletLandscape><BookDetailTabletPortrait /></template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import ResponsiveViewSwitch from '~/components/shared/ResponsiveViewSwitch.vue'
import BookDetailMobile from '~/components/mobile/BookDetailMobile.vue'
import BookDetailTabletPortrait from '~/components/tablet/portrait/BookDetailTabletPortrait.vue'
</script>