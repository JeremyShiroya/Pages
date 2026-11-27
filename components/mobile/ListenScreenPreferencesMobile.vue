<template>
  <div class="choice-page">
    <MobileSettingsNav title="Listen Screen" :back-to="backTo" aria-label="Listen screen settings navigation" />
    <main class="choice-body">
      <!-- Live preview of what the Listen player shows. -->
      <div class="listen-preview" :class="`is-${settings.listenVisual}`" aria-hidden="true">
        <template v-if="settings.listenVisual === 'orb'">
          <video
            v-if="settings.listenOrbBackground !== 'flat'"
            class="listen-preview-wash"
            :class="`is-${settings.listenOrbBackground || 'blur'}`"
            :src="orb.video"
            :poster="orb.poster"
            autoplay
            loop
            muted
            playsinline
            disablepictureinpicture
          ></video>
          <span class="listen-preview-orb" :class="{ ringed: settings.listenOrbRing === true, glowing: settings.listenOrbHalo === true }">
            <video :src="orb.video" :poster="orb.poster" autoplay loop muted playsinline disablepictureinpicture></video>
          </span>
        </template>
        <template v-else>
          <img
            v-if="previewCover && settings.listenCoverBlur !== false"
            class="listen-preview-backdrop"
            :src="previewCover"
            alt=""
          />
          <img
            v-if="previewCover"
            class="listen-preview-cover-img"
            :src="previewCover"
            :alt="previewBook?.title ? `${previewBook.title} cover` : 'Book cover'"
            @error="previewCoverFailed = true"
          />
          <span v-else class="listen-preview-cover" :class="{ blurred: settings.listenCoverBlur !== false }">
            <i class="ri-book-2-line"></i>
          </span>
        </template>
      </div>

      <SettingsOptionGroupMobile
        title="Player Shows"
        :model-value="settings.listenVisual"
        :options="visualOptions"
        footnote="The orb belongs to the narrator you listen with and moves as they speak."
        @update:model-value="updateSettings({ listenVisual: $event })"
      />

      <SettingsOptionGroupMobile
        v-if="settings.listenVisual === 'orb'"
        title="Background"
        :model-value="settings.listenOrbBackground || 'blur'"
        :options="orbBackgroundOptions"
        footnote="How much of the orb's colour bleeds into the screen behind the player."
        @update:model-value="updateSettings({ listenOrbBackground: $event })"
      />

      <section v-if="settings.listenVisual === 'orb'">
        <div class="toggle-group">
          <div class="toggle-card">
            <div class="toggle-copy">
              <span class="toggle-label">Ring</span>
            </div>
            <button
              type="button"
              class="toggle"
              role="switch"
              aria-label="Ring around the orb"
              :aria-checked="settings.listenOrbRing === true"
              :class="{ on: settings.listenOrbRing === true }"
              @click="updateSettings({ listenOrbRing: settings.listenOrbRing !== true })"
            >
              <span class="knob"></span>
            </button>
          </div>
          <div class="toggle-card">
            <div class="toggle-copy">
              <span class="toggle-label">Glow</span>
            </div>
            <button
              type="button"
              class="toggle"
              role="switch"
              aria-label="Glow and shadow around the orb"
              :aria-checked="settings.listenOrbHalo === true"
              :class="{ on: settings.listenOrbHalo === true }"
              @click="updateSettings({ listenOrbHalo: settings.listenOrbHalo !== true })"
            >
              <span class="knob"></span>
            </button>
          </div>
        </div>
        <p class="footnote">The ring pulses out as the narrator speaks. The glow is the soft light and shadow around the orb.</p>
      </section>

      <section v-if="settings.listenVisual === 'cover'">
        <div class="toggle-card">
          <div class="toggle-copy">
            <span class="toggle-label">Blurred Cover Background</span>
          </div>
          <button
            type="button"
            class="toggle"
            role="switch"
            aria-label="Blurred cover in Listen mode"
            :aria-checked="settings.listenCoverBlur !== false"
            :class="{ on: settings.listenCoverBlur !== false }"
            @click="updateSettings({ listenCoverBlur: settings.listenCoverBlur === false })"
          >
            <span class="knob"></span>
          </button>
        </div>
        <p class="footnote">Show a soft blurred book cover behind the player.</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useState } from '#app'
import { usePagesSettings } from '~/composables/usePagesSettings'
import { useBooks } from '~/composables/useBooks'
import { narratorOrb } from '~/utils/narratorOrbs'
import MobileSettingsNav from './MobileSettingsNav.vue'

// Opened from the player's Listen settings, Back returns there.
const listenRoute = useRoute()
const backTo = computed(() => {
  const from = String(listenRoute.query.from || '')
  return from.startsWith('/listen-settings/') ? from : '/settings/preferences'
})
import SettingsOptionGroupMobile from './SettingsOptionGroupMobile.vue'

const { settings, updateSettings } = usePagesSettings()

const visualOptions = [
  { value: 'orb', label: 'Narrator Orb', hint: 'A light wash of the orb\'s colours behind the player.' },
  { value: 'cover', label: 'Book Cover', hint: 'The cover, with an optional blurred backdrop.' },
]

const orbBackgroundOptions = [
  { value: 'flat', label: 'Flat', hint: 'A plain background, no colour from the orb.' },
  { value: 'soft', label: 'Soft Bleed', hint: 'A light wash of the orb\'s colours.' },
  { value: 'blur', label: 'Full Bleed', hint: 'The orb\'s colours fill the screen, softly blurred.' },
]

// The cover preview uses a real book from the library: the one being listened
// to, else the most recently read (or added) book that has a cover. The plain
// icon only shows for an empty library.
const { books, initialized, fetchAllData } = useBooks()
const nowPlaying = useState('tts:book', () => null)
const previewCoverFailed = ref(false)
const previewBook = computed(() => {
  if (nowPlaying.value?.cover) return nowPlaying.value
  const withCovers = (books.value || []).filter((book) => book?.cover)
  return withCovers
    .slice()
    .sort((a, b) => new Date(b.lastReadAt || b.createdAt || 0) - new Date(a.lastReadAt || a.createdAt || 0))[0] || null
})
const previewCover = computed(() => (previewCoverFailed.value ? '' : previewBook.value?.cover || ''))
onMounted(() => {
  if (!initialized?.value && !(books.value || []).length) fetchAllData?.().catch?.(() => {})
})

const orb = computed(() => narratorOrb(settings.value.ttsVoice))
</script>

<style scoped>
.choice-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.choice-body { display: grid; gap: var(--settings-section-gap); max-width: 600px; margin: 0 auto; padding: 18px var(--settings-gutter) calc(60px + env(safe-area-inset-bottom)); }

.listen-preview {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 150px;
  overflow: hidden;
  border-radius: var(--settings-radius);
  background: var(--color-settings-group);
}

/* Same light wash the Listen player uses in orb mode. */
.listen-preview-wash {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.22;
  transform: scale(1.4);
}

.listen-preview-wash.is-blur {
  opacity: 0.6;
  filter: blur(22px) saturate(1.35);
  transform: scale(1.6);
}

.listen-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--color-settings-group) 60%, transparent) 100%);
  pointer-events: none;
}

.listen-preview-orb {
  position: relative;
  z-index: 1;
  display: block;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border-radius: 50%;
}

.listen-preview-orb {
  overflow: visible;
}

.listen-preview-orb.glowing {
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
}

.listen-preview-orb.ringed {
  outline: 1px solid color-mix(in srgb, var(--color-text-primary) 35%, transparent);
  outline-offset: 5px;
}

.listen-preview-orb video {
  border-radius: 50%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.04);
}

.listen-preview-cover {
  position: relative;
  z-index: 1;
  display: grid;
  width: 70px;
  height: 100px;
  place-items: center;
  border-radius: 6px;
  background: var(--color-brand-primary-muted);
  color: var(--color-brand-primary);
  font-size: 28px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.listen-preview-cover-img {
  position: relative;
  z-index: 1;
  display: block;
  width: auto;
  height: 112px;
  max-width: 90px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

/* Same blurred-cover backdrop the Listen player uses. */
.listen-preview-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(22px) saturate(150%);
  transform: scale(1.35);
}

.listen-preview.is-cover:has(.blurred) {
  background:
    radial-gradient(circle at 50% 40%, var(--color-brand-primary-muted), transparent 70%),
    var(--color-settings-group);
}

.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: var(--settings-switch-row-min);
  padding: 0 var(--settings-row-inset);
  border-radius: var(--settings-radius);
  background: var(--color-settings-group);
}

.toggle-label { font-size: var(--settings-label-size); }

/* Two switches bundled in one card, divided like the Settings list. */
.toggle-group {
  overflow: hidden;
  border-radius: var(--settings-radius);
  background: var(--color-settings-group);
}

.toggle-group .toggle-card {
  border-radius: 0;
  background: transparent;
}

.toggle-group .toggle-card + .toggle-card {
  box-shadow: inset 0 1px 0 var(--color-border-subtle);
}

.toggle {
  position: relative;
  flex: none;
  width: var(--settings-switch-width);
  height: var(--settings-switch-height);
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--color-border-card);
  cursor: pointer;
  transition: background 0.2s ease;
}

.toggle.on { background: var(--color-switch-on); }
.toggle.on .knob { background: var(--color-switch-knob-on); }

.toggle .knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: var(--settings-switch-knob);
  height: var(--settings-switch-knob);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.25);
  transition: transform 0.2s ease;
}

.toggle.on .knob { transform: translateX(calc(var(--settings-switch-width) - var(--settings-switch-knob) - 4px)); }

.footnote {
  margin: 10px var(--settings-row-inset) 0;
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.4;
}
</style>
