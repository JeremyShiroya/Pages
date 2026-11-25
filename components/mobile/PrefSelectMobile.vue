<template>
  <div ref="rootRef" class="pref-select" :class="{ open }">
    <button
      type="button"
      class="pref-select-button"
      :class="{ open }"
      :disabled="disabled"
      :aria-label="`${label}: ${current?.label || ''}`"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open = !open"
    >
      <i v-if="icon" :class="icon" aria-hidden="true"></i>
      <span>{{ current?.label }}</span>
      <i class="ri-arrow-down-s-line pref-select-arrow" :class="{ rotated: open }" aria-hidden="true"></i>
    </button>

    <Transition name="pref-select">
      <div v-if="open" class="pref-select-panel" role="listbox" :aria-label="label">
        <p class="pref-select-heading"><i v-if="icon" :class="icon" aria-hidden="true"></i>{{ label }}</p>
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="option"
          class="pref-select-option"
          :class="{ active: option.value === modelValue }"
          :aria-selected="option.value === modelValue"
          @click="choose(option.value)"
        >
          <span class="pref-select-copy">
            <span>{{ option.label }}</span>
            <small v-if="option.hint">{{ option.hint }}</small>
          </span>
          <i v-if="option.value === modelValue" class="ri-check-line" aria-hidden="true"></i>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
// A Preferences choice as a compact dropdown, styled after the Books filter
// dropdown: an outlined button with the current value, opening a panel of
// options with a check on the chosen one.
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: null },
  options: { type: Array, required: true },
  label: { type: String, required: true },
  icon: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)
const current = computed(() => props.options.find((option) => option.value === props.modelValue) || props.options[0])

const choose = (value) => {
  open.value = false
  if (value !== props.modelValue) emit('update:modelValue', value)
}

const onPointerDown = (event) => {
  if (!rootRef.value?.contains(event.target)) open.value = false
}
const onKey = (event) => {
  if (event.key === 'Escape') open.value = false
}
const listen = (attach) => {
  const method = attach ? 'addEventListener' : 'removeEventListener'
  document[method]('pointerdown', onPointerDown)
  document[method]('keydown', onKey)
}
watch(open, listen)
onBeforeUnmount(() => { if (open.value) listen(false) })
</script>

<style scoped>
.pref-select { position: relative; flex: 0 0 auto; }

.pref-select-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 34px;
  padding: 0 10px 0 12px;
  border: 1px solid var(--color-border-card);
  border-radius: var(--mobile-control-radius, 10px);
  background: var(--color-surface-card);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--mobile-caption-size, 13px);
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}
.pref-select-button.open {
  border-color: var(--color-brand-primary);
  background: var(--color-brand-primary-faint);
  color: var(--color-text-primary);
}
.pref-select-button:disabled { opacity: 0.55; cursor: default; }
.pref-select-button > i:first-child { color: var(--color-text-secondary); font-size: 1rem; }
.pref-select-button.open > i:first-child { color: var(--color-brand-primary); }
.pref-select-arrow { color: var(--color-text-muted); font-size: 1rem; transition: transform 0.2s ease; }
.pref-select-arrow.rotated { transform: rotate(180deg); }

.pref-select-panel {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 50;
  display: grid;
  gap: 2px;
  min-width: 220px;
  padding: 0.5rem;
  border: 1px solid var(--color-border-card);
  border-radius: 14px;
  background: var(--color-background-app);
  box-shadow: var(--shadow-modal);
  transform-origin: top right;
}
.pref-select-heading {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.35rem 0.5rem 0.45rem;
  color: var(--color-text-muted);
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.pref-select-heading i { color: var(--color-brand-primary); font-size: 0.85rem; opacity: 0.75; }

.pref-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.pref-select-option:active { background: var(--color-surface-hover); }
.pref-select-option.active {
  border-color: var(--color-brand-primary);
  background: var(--color-surface-hover);
  color: var(--color-brand-primary);
}
.pref-select-copy { display: grid; gap: 1px; min-width: 0; }
.pref-select-copy small { color: var(--color-text-muted); font-size: 11.5px; }
.pref-select-option > i { font-size: 17px; }

.pref-select-enter-active, .pref-select-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.pref-select-enter-from, .pref-select-leave-to { opacity: 0; transform: translateY(-4px) scale(0.98); }
</style>
