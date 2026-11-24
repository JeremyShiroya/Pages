<template>
  <EditBookMobile
    :key="`${seriesName}:${installment}`"
    :suggestion-series="seriesName"
    :suggestion-installment="installment"
  />
</template>

<script setup>
// Edit the stored details of a suggested installment. Everything a library book
// can edit, except reading status — there is no copy to have read.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import EditBookMobile from '~/components/mobile/EditBookMobile.vue'

const route = useRoute()
const decode = (value) => {
  try { return decodeURIComponent(String(value || '')) } catch { return String(value || '') }
}
const seriesName = computed(() => decode(route.params.series))
const installment = computed(() => decode(route.params.installment))
</script>
