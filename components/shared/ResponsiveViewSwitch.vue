<template>
  <slot v-if="isPhone" name="phone">
    <slot name="mobile"></slot>
  </slot>
  <slot v-else-if="isPortrait" name="tabletPortrait">
    <slot name="mobile"></slot>
  </slot>
  <slot v-else name="tabletLandscape">
    <slot name="desktop"></slot>
  </slot>
</template>

<script setup>
import { useDeviceArchitecture } from '~/composables/useDeviceArchitecture'

const { isPhone, isPortrait } = useDeviceArchitecture()
</script>
