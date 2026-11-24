<template>
  <BookDetailMobile
    :key="`${seriesName}:${installment}`"
    :suggestion-series="seriesName"
    :suggestion-installment="installment"
  />
</template>

<script setup>
// A series installment the library does not own yet, opened from the series
// page. Same detail layout as a library book; see BookDetailMobile's suggestion
// mode.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BookDetailMobile from '~/components/mobile/BookDetailMobile.vue'

const route = useRoute()
const decode = (value) => {
  try { return decodeURIComponent(String(value || '')) } catch { return String(value || '') }
}
const seriesName = computed(() => decode(route.params.series))
const installment = computed(() => decode(route.params.installment))
</script>
