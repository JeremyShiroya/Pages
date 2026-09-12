<template>
  <ResponsiveViewSwitch>
    <template #phone>
      <SettingsMobile />
    </template>
    <template #tabletPortrait>
      <SettingsTabletPortrait />
    </template>
    <template #tabletLandscape>
      <SettingsDesktop />
    </template>
  </ResponsiveViewSwitch>
</template>

<script setup>
import SettingsDesktop from '../tablet/SettingsDesktop.vue'
import SettingsMobile from '../mobile/SettingsMobile.vue'
import SettingsTabletPortrait from '../tablet/portrait/SettingsTabletPortrait.vue'
import ResponsiveViewSwitch from './ResponsiveViewSwitch.vue'
</script>
