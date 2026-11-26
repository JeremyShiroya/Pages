<template>
  <div class="choice-page">
    <MobileSettingsNav title="Reading Streak" back-to="/settings/preferences" aria-label="Streak settings navigation" />
    <main class="choice-body">
      <!-- Live preview of the pill as it will appear in the top bar. -->
      <div class="streak-preview" aria-hidden="true">
        <span class="streak-preview-pill" :class="{ plain: !settings.streakBackground, off: settings.showStreak === false }">
          <i :class="iconClass"></i>
          <span>{{ streakCount }}</span>
        </span>
      </div>

      <section>
        <div class="toggle-card">
          <div class="toggle-copy">
            <span class="toggle-label">Show Streak</span>
          </div>
          <button
            type="button"
            class="toggle"
            role="switch"
            aria-label="Show streak"
            :aria-checked="settings.showStreak !== false"
            :class="{ on: settings.showStreak !== false }"
            @click="updateSettings({ showStreak: settings.showStreak === false })"
          >
            <span class="knob"></span>
          </button>
        </div>
        <p class="footnote">Show your reading streak at the top of Home, Books, Series and Profile.</p>
      </section>

      <SettingsOptionGroupMobile
        title="Icon"
        :model-value="settings.streakIcon"
        :options="iconOptions"
        :disabled="settings.showStreak === false"
        @update:model-value="updateSettings({ streakIcon: $event })"
      />

      <SettingsOptionGroupMobile
        title="Background"
        :model-value="settings.streakBackground !== false"
        :options="backgroundOptions"
        :disabled="settings.showStreak === false"
        footnote="With a background, the streak sits in a tinted capsule. Without one, only the icon and count are shown."
        @update:model-value="updateSettings({ streakBackground: $event })"
      />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePagesSettings } from '~/composables/usePagesSettings'
import { useStreak } from '~/composables/useStreak'
import MobileSettingsNav from './MobileSettingsNav.vue'
import SettingsOptionGroupMobile from './SettingsOptionGroupMobile.vue'

const { settings, updateSettings } = usePagesSettings()
const { streakCount } = useStreak()

const iconOptions = [
  { value: 'flame', label: 'Flame' },
  { value: 'lightning', label: 'Lightning' },
]
const backgroundOptions = [
  { value: true, label: 'With Background' },
  { value: false, label: 'No Background' },
]
const iconClass = computed(() => (settings.value.streakIcon === 'lightning' ? 'ri-flashlight-fill' : 'ri-fire-fill'))
</script>

<style scoped>
.choice-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.choice-body { display: grid; gap: var(--settings-section-gap); max-width: 600px; margin: 0 auto; padding: 18px var(--settings-gutter) calc(60px + env(safe-area-inset-bottom)); }

.streak-preview {
  display: grid;
  place-items: center;
  min-height: 96px;
  border-radius: var(--settings-radius);
  background: var(--color-settings-group);
}

.streak-preview-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--color-brand-primary-muted);
  color: var(--color-brand-primary);
  font-size: var(--mobile-subtext-size);
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.streak-preview-pill i { font-size: 18px; }
.streak-preview-pill.plain { padding: 0 6px; background: transparent; }
.streak-preview-pill.off { opacity: 0.3; }

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
