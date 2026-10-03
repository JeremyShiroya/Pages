<template>
  <ReaderMobile v-bind="$attrs" tablet-mode />
</template>

<script setup>
import ReaderMobile from '~/components/mobile/ReaderMobile.vue'

defineOptions({ inheritAttrs: false })
</script>
