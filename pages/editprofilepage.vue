<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <ProfileMobile />
    </template>
    <template #tabletPortrait>
      <ProfileTabletPortrait />
    </template>
    <template #tabletLandscape>
      <ProfileDesktop />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import ProfileDesktop from '~/components/tablet/ProfileDesktop.vue'
import ProfileMobile from '~/components/mobile/ProfileMobile.vue'
import ProfileTabletPortrait from '~/components/tablet/portrait/ProfileTabletPortrait.vue'
import ResponsiveViewSwitch from '~/components/shared/ResponsiveViewSwitch.vue'
</script>
