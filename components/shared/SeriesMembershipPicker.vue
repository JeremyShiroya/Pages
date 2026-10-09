<template>
  <div class="series-membership-picker" role="radiogroup" aria-label="Series membership">
    <label v-for="option in options" :key="option.value" class="membership-option" :class="{ selected: modelValue === option.value }">
      <input type="radio" name="series-membership" :value="option.value" :checked="modelValue === option.value" @change="$emit('update:modelValue', option.value)" />
      <span class="membership-icon"><i :class="option.icon" aria-hidden="true"></i></span>
      <span class="membership-copy"><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
      <i class="membership-check" :class="modelValue === option.value ? 'ri-check-line' : 'ri-arrow-right-s-line'" aria-hidden="true"></i>
    </label>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: 'unknown' } })
defineEmits(['update:modelValue'])

const options = [
  { value: 'unknown', label: 'Not sure yet', description: 'Keep the series open for later.', icon: 'ri-question-mark' },
  { value: 'standalone', label: 'Standalone', description: 'This book is complete on its own.', icon: 'ri-book-open-line' },
  { value: 'series', label: 'Part of a series', description: 'Add its series name and position.', icon: 'ri-book-shelf-line' },
]
</script>

<style scoped>
.series-membership-picker { display: grid; gap: .55rem; }
.membership-option { position: relative; display: grid; grid-template-columns: 38px minmax(0,1fr) 20px; align-items: center; gap: .8rem; min-height: 62px; padding: .65rem .85rem; border: 1px solid var(--color-border-card); border-radius: 13px; background: var(--color-surface-card); color: var(--color-text-secondary); cursor: pointer; transition: border-color .18s, background .18s, box-shadow .18s; }
.membership-option:hover { border-color: var(--color-border-focus); }
.membership-option.selected { border-color: var(--color-brand-primary); background: var(--color-brand-primary-faint); box-shadow: inset 0 0 0 1px color-mix(in srgb,var(--color-brand-primary) 14%,transparent); }
.membership-option:focus-within { outline: 2px solid var(--color-brand-primary); outline-offset: 2px; }
.membership-option input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.membership-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 11px; background: var(--color-surface-secondary); color: var(--color-text-secondary); font-size: 1.1rem; }
.selected .membership-icon { background: var(--color-brand-primary-muted); color: var(--color-brand-primary); }
.membership-copy { display: grid; min-width: 0; gap: 2px; }
.membership-copy strong { color: var(--color-text-primary); font-size: .88rem; font-weight: 600; }
.membership-copy small { color: var(--color-text-muted); font-size: .75rem; line-height: 1.3; }
.membership-check { color: var(--color-text-muted); font-size: 1rem; }
.selected .membership-check { color: var(--color-brand-primary); }
</style>
