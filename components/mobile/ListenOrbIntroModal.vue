<template>
  <Teleport to="body">
    <Transition name="loi" appear>
      <div v-if="open" class="loi-layer" @click.self="finish">
        <!-- One-time introduction to the Narrator Orb (shown the first time
             Listen opens after the update). The choice applies straight away;
             Continue just closes it. -->
        <section class="loi-card" role="dialog" aria-modal="true" aria-labelledby="loi-title" aria-describedby="loi-body">
          <h2 id="loi-title">Meet the Narrator Orb</h2>
          <p id="loi-body" class="loi-body">
            Listen mode can now show your narrator as a living orb that moves as they speak, instead of the book cover.
          </p>

          <div class="loi-options" role="radiogroup" aria-label="Listen screen shows">
            <button
              type="button"
              role="radio"
              class="loi-option"
              :class="{ active: choice === 'orb' }"
              :aria-checked="choice === 'orb'"
              @click="choose('orb')"
            >
              <span class="loi-art loi-art-orb">
                <span class="loi-badge">New</span>
                <span class="loi-orb" :style="{ backgroundImage: `url('${orbPoster}')` }"></span>
              </span>
              <span class="loi-label">Narrator Orb</span>
              <i class="loi-check" :class="choice === 'orb' ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'" aria-hidden="true"></i>
            </button>

            <button
              type="button"
              role="radio"
              class="loi-option"
              :class="{ active: choice === 'cover' }"
              :aria-checked="choice === 'cover'"
              @click="choose('cover')"
            >
              <span class="loi-art loi-art-cover">
                <img v-if="coverUrl" class="loi-cover" :src="coverUrl" alt="" />
                <span v-else class="loi-cover loi-cover-blank"><i class="ri-book-2-line"></i></span>
              </span>
              <span class="loi-label">Book Cover</span>
              <i class="loi-check" :class="choice === 'cover' ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'" aria-hidden="true"></i>
            </button>
          </div>

          <p class="loi-hint">
            You can change this any time: tap <i class="ri-more-2-fill" aria-label="More"></i> in Listen mode, or go to Settings → Preferences → Listen Screen.
          </p>

          <button type="button" class="loi-continue" @click="finish">Continue</button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { usePagesSettings } from '~/composables/usePagesSettings'

defineProps({
  open: { type: Boolean, default: false },
  orbPoster: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
})

const { settings, updateSettings } = usePagesSettings()
const choice = computed(() => (settings.value.listenVisual === 'cover' ? 'cover' : 'orb'))
const choose = (visual) => updateSettings({ listenVisual: visual })
const finish = () => updateSettings({ listenOrbIntroSeen: true })
</script>

<style scoped>
.loi-layer {
  --loi-bg: #f2f2f7;
  --loi-card: #ffffff;
  --loi-text: #000000;
  --loi-muted: #6c6c70;
  --loi-line: rgba(60, 60, 67, 0.16);
  position: fixed;
  inset: 0;
  z-index: 3200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
  font-family: var(--mobile-font-family);
}

:global(html[data-theme="dark"] .loi-layer) {
  --loi-bg: #2c2c2e;
  --loi-card: #3a3a3c;
  --loi-text: #ffffff;
  --loi-muted: #a1a1a6;
  --loi-line: rgba(84, 84, 88, 0.6);
}

.loi-card {
  width: 100%;
  max-width: 400px;
  padding: 26px 22px 18px;
  border-radius: 28px;
  background: var(--loi-bg);
  color: var(--loi-text);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
}

.loi-card h2 {
  margin: 0 0 10px;
  font-size: 21px;
  font-weight: 400 !important;
  text-align: center;
}

.loi-body {
  margin: 0 4px 18px;
  font-size: 15px;
  line-height: 1.45;
  text-align: center;
}

.loi-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.loi-option {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 10px 10px 12px;
  border: 2px solid transparent;
  border-radius: 18px;
  background: var(--loi-card);
  color: var(--loi-text);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.loi-option.active {
  border-color: var(--color-brand-primary);
}

/* Each option is a tiny Listen screen. */
.loi-art {
  position: relative;
  display: grid;
  width: 100%;
  aspect-ratio: 3 / 4;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  background: color-mix(in srgb, var(--loi-text) 6%, transparent);
}

.loi-art-orb {
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--color-brand-primary) 26%, transparent), transparent 70%),
    color-mix(in srgb, var(--loi-text) 6%, transparent);
}

.loi-orb {
  width: 62%;
  aspect-ratio: 1;
  border-radius: 50%;
  background-position: center;
  background-size: cover;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  animation: loi-breathe 2.4s ease-in-out infinite;
}

.loi-cover {
  width: 58%;
  aspect-ratio: 2 / 3;
  border-radius: 6px;
  object-fit: cover;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.loi-cover-blank {
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--loi-text) 12%, transparent);
  color: var(--loi-muted);
  font-size: 26px;
}

.loi-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-brand-primary);
  color: var(--color-text-on-brand);
  font-size: 11px;
  font-weight: 600 !important;
  letter-spacing: 0.02em;
}

.loi-label {
  font-size: 15px;
}

.loi-check {
  color: var(--loi-muted);
  font-size: 22px;
  line-height: 1;
}

.loi-option.active .loi-check {
  color: var(--color-brand-primary);
}

.loi-hint {
  margin: 16px 4px 18px;
  color: var(--loi-muted);
  font-size: 13.5px;
  line-height: 1.45;
  text-align: center;
}

.loi-hint i {
  color: var(--loi-text);
  vertical-align: -2px;
}

.loi-continue {
  width: 100%;
  min-height: 50px;
  border: 0;
  border-radius: 14px;
  background: var(--color-brand-primary);
  color: var(--color-text-on-brand);
  font: inherit;
  font-size: 17px;
  cursor: pointer;
}

.loi-continue:active {
  background: var(--color-brand-primary-hover);
}

@keyframes loi-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.loi-enter-active,
.loi-leave-active {
  transition: opacity 0.2s ease;
}

.loi-enter-active .loi-card {
  transition: transform 0.26s cubic-bezier(0.2, 1.2, 0.4, 1), opacity 0.26s ease;
}

.loi-enter-from,
.loi-leave-to {
  opacity: 0;
}

.loi-enter-from .loi-card {
  opacity: 0;
  transform: scale(1.06);
}

@media (prefers-reduced-motion: reduce) {
  .loi-orb { animation: none; }
  .loi-enter-active .loi-card { transition: none; }
}
</style>
