<template>
  <div
    v-if="rating"
    class="book-rating goodreads-rating"
    :class="[`source-${source}`, { compact, stacked }]"
    :title="`${sourceLabel} rating`"
  >
    <RatingProviderIcon :source="source" />
    <span class="score-line goodreads-score-line">
      <span class="rating-stars goodreads-stars" :aria-label="`${formattedScore} out of ${rating.scale} from ${sourceLabel}`">
        <span v-for="star in 5" :key="star" class="rating-star goodreads-star" :class="starClass(star)">★</span>
      </span>
      <strong class="rating-score goodreads-score">{{ formattedScore }}</strong>
    </span>
  </div>
  <div v-else-if="showEmpty && source !== 'none'" class="book-rating goodreads-rating empty" :class="{ compact, stacked }">
    <RatingProviderIcon :source="source" />
    <span class="score-line goodreads-score-line">
      <span class="rating-stars goodreads-stars" aria-hidden="true">
        <span v-for="star in 5" :key="star" class="rating-star goodreads-star empty-star">★</span>
      </span>
      <span class="empty-text">Not available</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getBookRating, RATING_SOURCE_LABELS } from '~/composables/useBookRating'
import { useBookishSettings } from '~/composables/useBookishSettings'
import RatingProviderIcon from './RatingProviderIcon.vue'

const props = defineProps({
  book: { type: Object, required: true },
  source: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  stacked: { type: Boolean, default: false },
  showEmpty: { type: Boolean, default: false },
})

const { settings } = useBookishSettings()
const source = computed(() => props.source || settings.value.ratingSource)
const sourceLabel = computed(() => RATING_SOURCE_LABELS[source.value] || 'Rating')
const rating = computed(() => getBookRating(props.book, source.value, settings.value.personalRatingScale))
const formattedScore = computed(() => {
  if (!rating.value) return ''
  const score = rating.value.rating
  return source.value === 'personal'
    ? (Number.isInteger(score) ? String(score) : score.toFixed(1))
    : score.toFixed(2)
})

const starClass = (star) => {
  if (!rating.value) return 'empty-star'
  const valueOutOfFive = rating.value.rating * (5 / rating.value.scale)
  if (valueOutOfFive >= star) return 'full-star'
  if (valueOutOfFive >= star - 0.5) return 'half-star'
  return 'empty-star'
}
</script>

<style scoped>
.book-rating {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  color: var(--color-text-secondary);
}

.book-rating.stacked {
  align-items: center;
}

.score-line,
.rating-stars {
  display: inline-flex;
  align-items: center;
}

.score-line { gap: 0.4rem; }
.rating-stars { gap: 0.04rem; flex-shrink: 0; }

.rating-star {
  color: color-mix(in srgb, currentColor 22%, transparent);
  font-size: 1.1rem;
  line-height: 1;
}

.full-star,
.half-star { color: #e87400; }
.half-star { opacity: 0.65; }

.rating-score {
  color: inherit;
  font-size: 0.95rem;
  line-height: 1;
  white-space: nowrap;
}

.compact .rating-star { font-size: 0.9rem; }
.compact .rating-score { font-size: 0.82rem; }
.empty-text { color: var(--color-text-muted); font-size: 0.78rem; white-space: nowrap; }
</style>
