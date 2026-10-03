<template>
  <div
    class="book-progress-display"
    :class="{ compact, complete: percent >= 100, 'tablet-progress': isTablet }"
    :aria-label="`Reading progress ${percent}%`"
  >
    <i v-if="percent >= 100" class="ri-checkbox-circle-fill complete-icon" aria-hidden="true"></i>
    <span v-if="percent >= 100" class="complete-text">100%</span>
    <template v-else>
      <span class="progress-track" aria-hidden="true">
        <span class="progress-fill" :style="{ width: `${percent}%` }"></span>
      </span>
      <span class="progress-text">{{ percent }}%</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDeviceArchitecture } from '~/composables/useDeviceArchitecture'

const { isTablet } = useDeviceArchitecture()

const props = defineProps({
  progress: { type: [Number, String], default: 0 },
  compact: { type: Boolean, default: false },
})

const percent = computed(() => Math.round(Math.max(0, Math.min(100, Number(props.progress) || 0))))
</script>

<style scoped>
.book-progress-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
  color: inherit;
}

.progress-track {
  display: block;
  flex: 1;
  min-width: 42px;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 18%, transparent);
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gradient-library-progress, var(--color-brand-primary));
  transition: width 0.3s ease;
}

.progress-text,
.complete-text {
  min-width: 34px;
  font-size: 0.78rem;
  text-align: right;
}

.complete-icon,
.complete-text {
  color: var(--color-brand-primary);
}

</style>
