<template>
  <div class="theme-page">
    <MobileSettingsNav title="Theme" back-to="/settings" aria-label="Theme navigation" />

    <main class="theme-body">
      <!-- Appearance: three outlined cards, the chosen one inked in. -->
      <section aria-labelledby="theme-mode-title">
        <h2 id="theme-mode-title" class="theme-section-title">Appearance</h2>
        <div class="mode-cards" role="radiogroup" aria-labelledby="theme-mode-title">
          <button
            v-for="mode in modes"
            :key="mode.id"
            type="button"
            role="radio"
            class="mode-card"
            :class="{ active: settings.themeMode === mode.id }"
            :aria-checked="settings.themeMode === mode.id"
            @click="updateSettings({ themeMode: mode.id })"
          >
            <i :class="mode.icon" aria-hidden="true"></i>
            <span>{{ mode.label }}</span>
          </button>
        </div>
        <p class="theme-footnote">System follows your phone's light and dark setting.</p>
      </section>

      <!-- Accent: tints every control, icon and highlight that was purple. -->
      <section aria-labelledby="theme-accent-title">
        <h2 id="theme-accent-title" class="theme-section-title">Accent Colour</h2>
        <div class="accent-card">
          <div class="accent-grid" role="radiogroup" aria-labelledby="theme-accent-title">
            <button
              v-for="accent in accents"
              :key="accent.id"
              type="button"
              role="radio"
              class="accent-option"
              :class="{ active: settings.accentColor === accent.id }"
              :aria-checked="settings.accentColor === accent.id"
              :aria-label="accent.label"
              @click="chooseAccent(accent.id)"
            >
              <span class="accent-swatch" :class="{ mono: accent.id === 'mono' }" :style="{ '--swatch': isDark ? accent.dark : accent.light, '--swatch-ring': accent.ring || (isDark ? accent.dark : accent.light) }">
                <i v-if="settings.accentColor === accent.id" class="ri-check-line" aria-hidden="true"></i>
              </span>
              <span class="accent-name">{{ accent.label }}</span>
            </button>
          </div>
        </div>
        <p class="theme-footnote">Buttons, icons, progress and highlights take this colour.</p>
      </section>

      <!-- App Icon: the home-screen launcher only (the logo inside the app follows
           the accent). It
           follows the accent until one is picked here; it never changes the
           accent itself. -->
      <section aria-labelledby="theme-icon-title">
        <h2 id="theme-icon-title" class="theme-section-title">App Icon</h2>
        <div class="icon-card">
          <button type="button" class="icon-match" role="radio" :aria-checked="followsAccent" @click="chooseIcon('accent')">
            <img class="icon-match-img" :src="logoFor(settings.accentColor)" alt="" />
            <span class="icon-match-label">Match Accent</span>
            <span class="icon-match-value">{{ accentLabel(settings.accentColor) }}</span>
            <i v-if="followsAccent" class="ri-check-line icon-check" aria-hidden="true"></i>
          </button>
        </div>
        <div class="accent-card">
          <div class="accent-grid" role="radiogroup" aria-labelledby="theme-icon-title">
            <button
              v-for="accent in accents"
              :key="accent.id"
              type="button"
              role="radio"
              class="accent-option icon-option"
              :class="{ active: settings.launcherIcon === accent.id }"
              :aria-checked="settings.launcherIcon === accent.id"
              :aria-label="accent.label + ' icon'"
              @click="chooseIcon(accent.id)"
            >
              <img class="icon-img" :src="logoFor(accent.id)" alt="" />
              <span class="accent-name">{{ accent.label }}</span>
            </button>
          </div>
        </div>
        <p class="theme-footnote">Changes the icon on your home screen and the launch screen.</p>
      </section>
    </main>

    <!-- What changing the icon involves, before it happens (same alert card as
         Delete). -->
    <Teleport to="body">
      <div v-if="pendingIcon" class="icon-alert-layer" @click.self="pendingIcon = null">
        <section class="icon-alert" role="alertdialog" aria-modal="true" aria-labelledby="icon-alert-title" aria-describedby="icon-alert-body">
          <h2 id="icon-alert-title">Change App Icon?</h2>
          <div id="icon-alert-body" class="icon-alert-body">
            <img :src="logoFor(pendingIconTarget)" alt="" />
            <p>Your home screen icon changes to <strong>{{ accentLabel(pendingIconTarget) }}</strong> in the background, as soon as you leave Pages.</p>
          </div>
          <ul class="icon-alert-points">
            <li>It takes a few seconds for the new icon to appear.</li>
            <li>Your phone may close Pages once while it swaps the icon. Nothing is lost: open it again from the new icon.</li>
            <li>If a book is being read aloud, it waits until narration stops.</li>
            <li>A home screen shortcut to the old icon may need adding again.</li>
          </ul>
          <div class="icon-alert-actions">
            <button type="button" @click="pendingIcon = null">Cancel</button>
            <button type="button" class="confirm" @click="confirmIcon">Change Icon</button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import { effectiveLauncherIcon, usePagesSettings } from '~/composables/usePagesSettings'
import { ACCENT_SWATCHES, accentLabel } from '~/utils/accentPalette'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'
import { useToast } from '~/composables/useToast'

const { settings, updateSettings } = usePagesSettings()
const isDark = computed(() => settings.value.readerTheme === 'dark')

const modes = [
  { id: 'system', label: 'System', icon: 'ri-contrast-line' },
  { id: 'light', label: 'Light', icon: 'ri-sun-line' },
  { id: 'dark', label: 'Dark', icon: 'ri-moon-line' },
]

// Swatches show each accent as it will look in the current theme (the dark
// theme uses brighter shades).
const accents = ACCENT_SWATCHES

const logoFor = (id) => '/images/logos/' + (id || 'purple') + '.png'
const followsAccent = computed(() => !settings.value.launcherIcon || settings.value.launcherIcon === 'accent')
const native = isNativeCapacitorPlatform()
const { addToast } = useToast()

// Accent changes recolour the app straight away; when the icon follows the
// accent it changes too, in the background, which a toast says.
const chooseAccent = (id) => {
  const before = effectiveLauncherIcon(settings.value)
  updateSettings({ accentColor: id })
  const after = effectiveLauncherIcon(settings.value)
  if (native && followsAccent.value && before !== after) {
    addToast('Your app icon will change to ' + accentLabel(after) + ' when you leave Pages.', 'info')
  }
}

// Picking an icon explains what happens first (on the phone; the web app has
// no home screen icon to swap, only the logo inside the app).
const pendingIcon = ref(null)
const pendingIconTarget = computed(() => (pendingIcon.value === 'accent' ? settings.value.accentColor : pendingIcon.value))
const chooseIcon = (id) => {
  const target = id === 'accent' ? settings.value.accentColor : id
  if (target === effectiveLauncherIcon(settings.value) || !native) {
    updateSettings({ launcherIcon: id })
    return
  }
  pendingIcon.value = id
}
const confirmIcon = () => {
  updateSettings({ launcherIcon: pendingIcon.value })
  pendingIcon.value = null
}
</script>

<style scoped>
.theme-page {
  min-height: 100vh;
  background: var(--color-settings-background);
  color: var(--color-text-primary);
  font-family: var(--mobile-font-family);
}

.theme-body {
  display: grid;
  gap: var(--settings-section-gap, 30px);
  max-width: 600px;
  margin: 0 auto;
  padding: 18px var(--settings-gutter) calc(60px + env(safe-area-inset-bottom));
}

.theme-section-title {
  margin: 0 0 var(--settings-header-gap, 8px) var(--settings-row-inset, 16px);
  color: var(--color-text-muted);
  font-size: var(--settings-header-size);
  font-weight: 400;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.theme-footnote {
  margin: 10px var(--settings-row-inset, 16px) 0;
  color: var(--color-text-muted);
  font-size: var(--settings-caption-size, 13px);
  line-height: 1.4;
}

/* ── Appearance cards ── */
.mode-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mode-card {
  display: grid;
  align-content: space-between;
  justify-items: start;
  gap: 18px;
  min-height: 96px;
  padding: 14px 14px 13px;
  border: 1.5px solid color-mix(in srgb, var(--color-text-primary) 14%, transparent);
  border-radius: 16px;
  background: var(--color-settings-group);
  color: color-mix(in srgb, var(--color-text-primary) 34%, transparent);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, color 0.16s ease;
  -webkit-tap-highlight-color: transparent;
}

.mode-card i {
  font-size: 24px;
  line-height: 1;
}

.mode-card span {
  font-size: 16px;
}

.mode-card.active {
  border-color: var(--color-text-primary);
  border-width: 2px;
  padding: 13.5px 13.5px 12.5px;
  color: var(--color-text-primary);
}

.mode-card.active span {
  font-weight: 600 !important;
}

.mode-card:active {
  transform: scale(0.98);
}

/* ── Accent swatches ── */
.accent-card {
  padding: 16px 10px 8px;
  border-radius: var(--settings-radius, 14px);
  background: var(--color-settings-group);
}

.accent-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  row-gap: 12px;
}

.accent-option {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 0 0 6px;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.accent-swatch {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 50%;
  background: var(--swatch);
  color: #fff;
  font-size: 22px;
  transition: box-shadow 0.16s ease, transform 0.16s ease;
}

/* The chosen swatch: a gap, then a ring in its own colour. */
.accent-option.active .accent-swatch {
  box-shadow: 0 0 0 2.5px var(--color-settings-group), 0 0 0 4.5px var(--swatch-ring);
}

/* Black & White: outlined, so both halves show on light and dark cards. */
.accent-swatch.mono { box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.55); }
.accent-option.active .accent-swatch.mono { box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.55), 0 0 0 2.5px var(--color-settings-group), 0 0 0 4.5px var(--swatch-ring); }

.accent-option:active .accent-swatch {
  transform: scale(0.92);
}

.accent-name {
  font-size: 11.5px;
  line-height: 1.2;
  text-align: center;
}

.accent-option.active .accent-name {
  color: var(--color-text-primary);
}

/* ── App icon ── */
.icon-card {
  overflow: hidden;
  margin-bottom: 12px;
  border-radius: var(--settings-radius, 14px);
  background: var(--color-settings-group);
}
.icon-match {
  display: grid;
  width: 100%;
  grid-template-columns: 30px minmax(0, 1fr) auto 22px;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 0 var(--settings-row-inset, 16px);
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.icon-match:active { background: var(--color-surface-hover); }
.icon-match-img { width: 30px; height: 30px; }
.icon-match-label { font-size: var(--settings-label-size); }
.icon-match-value { color: var(--color-text-muted); font-size: var(--settings-label-size); }
.icon-check { color: var(--color-brand-primary); font-size: 22px; }
.icon-img { width: 46px; height: 46px; padding: 2px; border-radius: 14px; transition: box-shadow 0.16s ease, transform 0.16s ease; }
.icon-option.active .icon-img { box-shadow: 0 0 0 2px var(--color-brand-primary); }
.icon-option:active .icon-img { transform: scale(0.92); }

/* ── Icon alert (the Delete alert's card) ── */
.icon-alert-layer {
  --ia-bg: #f2f2f7;
  --ia-text: #000;
  --ia-muted: #6c6c70;
  --ia-press: rgba(0, 0, 0, 0.06);
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
  font-family: var(--mobile-font-family);
}
:global(html[data-theme="dark"] .icon-alert-layer) {
  --ia-bg: #2c2c2e;
  --ia-text: #fff;
  --ia-muted: #a1a1a6;
  --ia-press: rgba(255, 255, 255, 0.08);
}
.icon-alert { width: 100%; max-width: 400px; padding: 26px 24px 14px; border-radius: 28px; background: var(--ia-bg); color: var(--ia-text); box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2); }
.icon-alert h2 { margin: 0 0 14px; font-size: 20px; font-weight: 400 !important; }
.icon-alert-body { display: flex; align-items: center; gap: 14px; }
.icon-alert-body img { flex: none; width: 52px; height: 52px; }
.icon-alert-body p { margin: 0; font-size: 16px; line-height: 1.4; }
.icon-alert-body strong { font-weight: 600 !important; }
.icon-alert-points { display: grid; gap: 6px; margin: 16px 0 0; padding-left: 18px; color: var(--ia-muted); font-size: 14px; line-height: 1.4; }
.icon-alert-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 22px; }
.icon-alert-actions button { min-height: 44px; padding: 0 16px; border: 0; border-radius: 12px; background: transparent; color: var(--ia-text); font: inherit; font-size: 17px; font-weight: 400 !important; cursor: pointer; }
.icon-alert-actions button.confirm { color: var(--color-brand-primary); }
.icon-alert-actions button:active { background: var(--ia-press); }

@media (max-width: 340px) {
  .accent-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
