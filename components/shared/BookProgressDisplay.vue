<template>
  <!-- Playable: one pill — play/pause, a medium bar, then the percent — that
       starts or pauses narration of the book. Otherwise a plain progress row. -->
  <div
    v-if="playable"
    class="book-progress-display playable"
    :class="{ compact, complete: percent >= 100, playing, 'tablet-progress': isTablet }"
  >
    <!-- A span, not a <button>: some hosts (the Continue Reading card) are
         buttons themselves, and buttons cannot nest. -->
    <span
      class="progress-play"
      role="button"
      tabindex="0"
      :aria-label="playing ? 'Pause narration' : 'Listen'"
      :title="playing ? 'Pause' : 'Listen'"
      @click.stop.prevent="$emit('play')"
      @keydown.enter.stop.prevent="$emit('play')"
      @keydown.space.stop.prevent="$emit('play')"
    >
      <i :class="playing ? 'ri-pause-fill' : 'ri-play-fill'" aria-hidden="true"></i>
    </span>
    <span class="progress-track" aria-hidden="true">
      <span class="progress-fill" :style="{ width: `${percent}%` }"></span>
    </span>
    <span class="progress-text" :aria-label="`Reading progress ${percent}%`">{{ percent }}%</span>
  </div>

  <div
    v-else
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
  // Adds the play/pause button and draws the whole row as one pill.
  playable: { type: Boolean, default: false },
  playing: { type: Boolean, default: false },
})
defineEmits(['play'])

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

/* ── Playable pill ─────────────────────────────────────────────────────── */
/* No capsule behind it: just play icon, bar and percent on the card itself. */
.book-progress-display.playable {
  display: inline-flex;
  width: auto;
  max-width: 100%;
  gap: 8px;
  padding: 0;
  background: none;
}

/* The icon's tap target reaches past its glyph; pull it flush with the text. */
.playable .progress-play {
  margin-left: -5px;
}

.progress-play {
  display: grid;
  flex: none;
  width: 26px;
  height: 26px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 17px;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

.progress-play:active {
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.playable.playing .progress-play {
  color: var(--color-brand-primary);
}

/* Between the long card bar and a tiny stub: a fixed, medium length. */
.playable .progress-track {
  flex: 0 0 auto;
  width: 72px;
  min-width: 0;
  height: 5px;
}

.playable.compact .progress-track {
  width: 64px;
}

.playable .progress-fill {
  min-width: 5px;
}

.playable .progress-text {
  min-width: 0;
  font-size: 0.78rem;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.playable.complete .progress-text {
  color: var(--color-brand-primary);
}
</style>
