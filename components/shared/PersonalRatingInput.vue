<template>
  <div class="personal-rating-input">
    <div class="rating-buttons" role="radiogroup" :aria-label="`Personal rating out of ${scale}`">
      <button
        v-for="value in scale"
        :key="value"
        type="button"
        class="rating-button"
        :class="{ active: value <= displayedValue }"
        :aria-checked="displayedValue === value"
        role="radio"
        @click="select(value)"
      ><i :class="value <= displayedValue ? 'ri-star-fill' : 'ri-star-line'"></i></button>
    </div>
    <span>{{ displayedValue || 0 }}/{{ scale }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { personalRatingForScale, personalRatingFromScale } from '~/composables/useBookRating'
import { useBookishSettings } from '~/composables/useBookishSettings'

const props = defineProps({ modelValue: { type: [Number, String], default: 0 } })
const emit = defineEmits(['update:modelValue'])
const { settings } = useBookishSettings()
const scale = computed(() => Number(settings.value.personalRatingScale) === 5 ? 5 : 10)
const displayedValue = computed(() => personalRatingForScale(props.modelValue, scale.value))
const select = (value) => emit('update:modelValue', personalRatingFromScale(value, scale.value))
</script>

<style scoped>
.personal-rating-input,
.rating-buttons {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.personal-rating-input { flex-wrap: wrap; color: var(--color-text-secondary); }
.rating-buttons { gap: 0.08rem; }
.rating-button {
  display: grid;
  width: 27px;
  height: 32px;
  padding: 0;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--color-text-subtle);
  cursor: pointer;
  font-size: 1.08rem;
}
.rating-button.active { color: var(--color-brand-primary); }
</style>
