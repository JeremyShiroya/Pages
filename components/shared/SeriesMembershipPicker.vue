<template>
  <!-- One grouped card of radio rows, styled like the choices in Settings. -->
  <div class="series-membership-picker" role="radiogroup" aria-label="Series membership">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="membership-row"
      :aria-checked="modelValue === option.value"
      @click="$emit('update:modelValue', option.value)"
    >
      <span class="membership-copy">
        <span class="membership-label">{{ option.label }}</span>
        <span class="membership-hint">{{ option.description }}</span>
      </span>
      <span class="membership-radio" :class="{ on: modelValue === option.value }" aria-hidden="true"></span>
    </button>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: 'unknown' } })
defineEmits(['update:modelValue'])

const options = [
  { value: 'unknown', label: 'Not sure yet', description: 'Keep the series open for later.' },
  { value: 'standalone', label: 'Standalone', description: 'This book is complete on its own.' },
  { value: 'series', label: 'Part of a series', description: 'Add its series name and position.' },
]
</script>

<style scoped>
.series-membership-picker {
  display: grid;
  padding: 6px 0;
  border-radius: var(--settings-radius, 14px);
  background: var(--color-settings-group, var(--color-surface-secondary));
}

.membership-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 54px;
  padding: 8px var(--settings-row-inset, 16px);
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.membership-row:active {
  background: var(--color-surface-hover);
}

.membership-row:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: -2px;
}

.membership-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.membership-label {
  font-size: var(--settings-label-size, 16px);
  font-weight: 400;
}

.membership-hint {
  color: var(--color-text-muted);
  font-size: var(--settings-caption-size, 13px);
  line-height: 1.35;
}

/* Same radio as SettingsOptionGroupMobile: ring, filled dot when chosen. */
.membership-radio {
  position: relative;
  flex: none;
  width: 22px;
  height: 22px;
  border: 2px solid color-mix(in srgb, var(--color-text-muted) 45%, transparent);
  border-radius: 50%;
  transition: border-color 0.15s ease;
}

.membership-radio.on {
  border-color: var(--color-brand-primary);
}

.membership-radio.on::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--color-brand-primary);
}
</style>
