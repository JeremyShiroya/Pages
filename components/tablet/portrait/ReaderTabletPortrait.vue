<template>
  <ReaderMobile v-bind="$attrs" />
</template>

<script setup>
import ReaderMobile from '~/components/mobile/ReaderMobile.vue'

defineOptions({ inheritAttrs: false })
</script>
