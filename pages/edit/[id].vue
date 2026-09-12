<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <component :is="mobilePageComponent" :book-id="bookId" />
    </template>

    <template #tabletPortrait>
      <EditBookTabletPortrait :book-id="bookId" />
    </template>

    <template #tabletLandscape>
      <EditBookComp :book-id="bookId" />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import { useRoute } from 'vue-router'
import EditBookMobile from '~/components/mobile/EditBookMobile.vue'
import EditBookComp from '~/components/shared/EditBookComp.vue'
import EditBookTabletPortrait from '~/components/tablet/portrait/EditBookTabletPortrait.vue'
import ResponsiveViewSwitch from '~/components/shared/ResponsiveViewSwitch.vue'

const mobilePageComponent = EditBookMobile
const route = useRoute()
const bookId = route.params.id
</script>
