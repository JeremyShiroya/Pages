<template>
  <section class="sog" :class="{ titled: !!title }" :aria-label="title || undefined">
    <h2 v-if="title" class="sog-title">{{ title }}</h2>
    <div class="sog-card" role="radiogroup" :aria-label="title || ariaLabel">
      <button
        v-for="option in options"
        :key="String(option.value)"
        type="button"
        role="radio"
        class="sog-row"
        :aria-checked="option.value === modelValue"
        :disabled="disabled"
        @click="choose(option.value)"
      >
        <span class="sog-copy">
          <span class="sog-label">{{ option.label }}</span>
          <span v-if="option.hint" class="sog-hint">{{ option.hint }}</span>
        </span>
        <span class="sog-radio" :class="{ on: option.value === modelValue }" aria-hidden="true"></span>
      </button>
    </div>
    <p v-if="footnote" class="sog-footnote">{{ footnote }}</p>
  </section>
</template>

<script setup>
// One card of radio choices in the system settings style: an optional section
// title above, rows of label + radio with no dividers, and a footnote below.
const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: null },
  options: { type: Array, required: true },
  title: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Options' },
  footnote: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const choose = (value) => {
  if (value !== props.modelValue) emit('update:modelValue', value)
}
</script>

<style scoped>
.sog-title {
  margin: 0 0 var(--settings-header-gap) var(--settings-row-inset);
  color: var(--color-text-muted);
  font-size: var(--settings-header-size);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.sog-card {
  display: grid;
  padding: 8px 0;
  border-radius: var(--settings-radius);
  background: var(--color-settings-group);
}

.sog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 54px;
  padding: 8px var(--settings-row-inset);
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.sog-row:active {
  background: var(--color-surface-hover);
}

.sog-row:disabled {
  opacity: 0.55;
  cursor: default;
}

.sog-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.sog-label {
  font-size: var(--settings-label-size);
}

.sog-hint {
  color: var(--color-text-muted);
  font-size: var(--settings-caption-size);
}

/* Same radio as the Ratings choice: an empty ring, or a purple ring with a
   purple dot for the chosen option. */
.sog-radio {
  position: relative;
  flex: none;
  width: 22px;
  height: 22px;
  border: 2px solid color-mix(in srgb, var(--color-text-muted) 45%, transparent);
  border-radius: 50%;
  transition: border-color 0.15s ease;
}

.sog-radio::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--color-brand-primary);
  transform: scale(0);
  transition: transform 0.15s ease;
}

.sog-radio.on {
  border-color: var(--color-brand-primary);
}

.sog-radio.on::after {
  transform: scale(1);
}

.sog-footnote {
  margin: 10px var(--settings-row-inset) 0;
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.4;
}
</style>
