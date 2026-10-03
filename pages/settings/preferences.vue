<template>
  <NuxtPage v-if="route.path.startsWith('/settings/preferences/')" />
  <PreferencesMobile v-else />
</template>

<script setup>
import PreferencesMobile from '~/components/mobile/PreferencesMobile.vue'
const route = useRoute()
</script>
