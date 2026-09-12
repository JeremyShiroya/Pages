<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <component :is="mobilePageComponent" />
    </template>

    <template #tabletPortrait>
      <AddBookTabletPortrait />
    </template>

    <template #tabletLandscape>
      <AddBookComp />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import AddBookMobile from '~/components/mobile/AddBookMobile.vue'
import AddBookComp from '~/components/shared/AddBookComp.vue'
import AddBookTabletPortrait from '~/components/tablet/portrait/AddBookTabletPortrait.vue'
import ResponsiveViewSwitch from '~/components/shared/ResponsiveViewSwitch.vue'

const mobilePageComponent = AddBookMobile
</script>
