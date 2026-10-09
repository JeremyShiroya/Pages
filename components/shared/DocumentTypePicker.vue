<template>
  <div class="document-type-picker">
    <button type="button" class="type-trigger" aria-haspopup="dialog" :aria-expanded="open" @click="open = true">
      <span>{{ labels[modelValue] || labels.unclassified }}</span>
      <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
    </button>
    <Teleport to="body">
      <div v-if="open" class="type-overlay" @click.self="open = false" @keydown.esc="open = false">
        <div class="type-dialog" role="dialog" aria-modal="true" aria-labelledby="type-dialog-title" tabindex="-1">
          <button type="button" class="type-close" aria-label="Close" @click="open = false"><i class="ri-close-line"></i></button>
          <div class="type-icon"><i class="ri-file-list-3-line"></i></div>
          <h2 id="type-dialog-title">What kind of file is this?</h2>
          <p>Choose how Pages should organize this file. You can change it later.</p>
          <button v-for="option in options" :key="option.value" type="button" class="type-option"
            :class="{ selected: modelValue === option.value }" @click="choose(option.value)">
            <i :class="option.icon"></i>
            <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
            <i v-if="modelValue === option.value" class="ri-check-line type-check"></i>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
const props = defineProps({ modelValue: { type: String, default: 'unclassified' } })
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const options = [
  { value: 'book', label: 'Book', icon: 'ri-book-open-line', description: 'Book details and series matching can be used.' },
  { value: 'personal', label: 'Personal document', icon: 'ri-file-user-line', description: 'Keep this private file out of book metadata searches.' },
  { value: 'unclassified', label: 'Decide later', icon: 'ri-question-mark', description: 'Keep it in the library and review it later.' },
]
const labels = { book: 'Book', personal: 'Personal document', unclassified: 'Undecided' }
const choose = (value) => { emit('update:modelValue', value); open.value = false }
watch(open, async (value) => {
  if (value) { await nextTick(); document.querySelector('.type-dialog')?.focus() }
})
</script>

<style scoped>
.type-trigger{width:100%;min-height:46px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 18px;border:1px solid var(--border-color,#d7d7d7);border-radius:10px;background:var(--card-bg,#fff);color:inherit;text-align:left;font:inherit;cursor:pointer}
.type-trigger i{margin-right:4px;font-size:22px}
.type-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;background:#0009}
.type-dialog{position:relative;width:min(100%,420px);max-height:90vh;overflow:auto;padding:25px;border-radius:20px;background:var(--card-bg,#fff);color:var(--text-primary,#202020);box-shadow:0 20px 70px #0004;outline:none}
.type-close{position:absolute;right:16px;top:14px;border:0;background:transparent;color:inherit;font-size:23px;cursor:pointer}
.type-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:#8f6bc41c;color:#8f6bc4;font-size:23px}
h2{margin:14px 0 6px;font-size:20px}p{margin:0 0 18px;opacity:.7;line-height:1.4}
.type-option{width:100%;display:flex;align-items:center;gap:14px;margin-top:9px;padding:14px;border:1px solid var(--border-color,#ddd);border-radius:12px;background:transparent;color:inherit;text-align:left;cursor:pointer}
.type-option.selected{border-color:#8f6bc4;background:#8f6bc414}.type-option>i:first-child{font-size:22px;color:#8f6bc4}.type-option span{flex:1;display:grid;gap:3px}.type-option small{opacity:.65;line-height:1.3}.type-check{color:#8f6bc4}
</style>
