<template>
  <GoodreadsIcon v-if="source === 'goodreads'" class="rating-provider-icon" />

  <svg
    v-else-if="source === 'storygraph'"
    class="rating-provider-icon storygraph-icon"
    viewBox="0 0 24 24"
    role="img"
    aria-label="StoryGraph"
  >
    <rect width="24" height="24" rx="12" fill="#1f2024" />
    <path d="M6 16.5V13h2.2v3.5H6Zm3.25 0V8.2h2.2v8.3h-2.2Zm3.3 0v-5.8h2.2v5.8h-2.2Zm3.25 0V6h2.2v10.5h-2.2Z" fill="#fff" />
    <path d="M6 11.6 10.2 8l3.25 2.1L18 5.8" fill="none" stroke="#8b6cff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.45" />
  </svg>

  <svg
    v-else
    class="rating-provider-icon personal-icon"
    viewBox="0 0 24 24"
    role="img"
    aria-label="Personal rating"
  >
    <circle cx="12" cy="12" r="11" fill="var(--color-brand-primary, #7c5cff)" />
    <path d="m12 5.6 1.9 3.85 4.25.62-3.08 3 .73 4.23L12 15.3l-3.8 2 .73-4.23-3.08-3 4.25-.62L12 5.6Z" fill="#fff" />
  </svg>
</template>

<script setup>
import GoodreadsIcon from './GoodreadsIcon.vue'

defineProps({
  source: { type: String, default: 'personal' },
})
</script>

<style scoped>
.rating-provider-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
}
</style>
