<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <ProfilePage />
    </template>
    <template #tabletPortrait>
      <ProfilePage />
    </template>
    <template #tabletLandscape>
      <ProfilePage />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import ProfilePage from '~/components/shared/ProfilePage.vue'
import ResponsiveViewSwitch from '~/components/shared/ResponsiveViewSwitch.vue'
</script>
