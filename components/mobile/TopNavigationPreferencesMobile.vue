<template>
  <main class="top-nav-settings">
    <MobileSettingsNav title="Top navigation" back-to="/settings/preferences" aria-label="Top navigation settings" />
    <MobileTopNav preview />

    <div class="settings-scroll">
      <p class="intro">The header above updates as you choose. Its buttons are inactive here, so you can compare each style.</p>

      <section class="setting-card" aria-labelledby="display-title">
        <div class="section-heading">
          <h2 id="display-title">Header display</h2>
          <p>Shown at the top of Home, Books, and Series.</p>
        </div>
        <div class="choice-list" role="radiogroup" aria-label="Top navigation display">
          <button
            v-for="choice in displayChoices"
            :key="choice.value"
            type="button"
            class="visual-choice"
            :class="{ selected: settings.mobileTopNavDisplay === choice.value }"
            role="radio"
            :aria-checked="settings.mobileTopNavDisplay === choice.value"
            @click="updateSettings({ mobileTopNavDisplay: choice.value })"
          >
            <span class="choice-art" aria-hidden="true">
              <span v-if="choice.value === 'logo-title'" class="art-logo-title">
                <img class="art-logo" src="/images/P Logo.png" alt="" />
                <strong class="art-title">Pages</strong>
              </span>
              <span v-else class="art-greeting">
                <img :src="profileAvatarSrc" alt="" />
                <span><small>Hello {{ firstName }},</small><strong>Welcome Back!</strong></span>
              </span>
              <span class="art-actions"><span><i class="ri-fire-fill"></i> 1</span><i class="ri-menu-line"></i></span>
            </span>
            <span class="choice-label">{{ choice.label }}<i v-if="settings.mobileTopNavDisplay === choice.value" class="ri-check-line"></i></span>
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useBookishSettings } from '~/composables/useBookishSettings'
import { useUserProfile } from '~/composables/useUserProfile'
import MobileSettingsNav from './MobileSettingsNav.vue'
import MobileTopNav from './MobileTopNav.vue'

const { settings, updateSettings } = useBookishSettings()
const { profile, activeAvatarPreset } = useUserProfile()
const profileAvatarSrc = computed(() => profile.value.avatarType === 'image' ? profile.value.avatarValue : activeAvatarPreset.value.src)
const firstName = computed(() => profile.value.displayName.trim().split(/\s+/)[0] || 'Reader')
const displayChoices = [
  { value: 'logo-title', label: 'Logo and title' },
  { value: 'greeting', label: 'Avatar and greeting' },
]
</script>

<style scoped>
.top-nav-settings { min-height: 100dvh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.settings-scroll { display: grid; gap: 24px; width: min(760px, 100%); box-sizing: border-box; margin: 0 auto; padding: 20px 16px calc(env(safe-area-inset-bottom) + 32px); }
.intro { margin: 0; color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; }
.setting-card { display: grid; gap: 16px; padding: 18px; border: 1px solid var(--color-border-card); border-radius: 22px; background: var(--color-settings-group); }
.section-heading h2 { margin: 0; font-size: 17px; font-weight: 600; }
.section-heading p { margin: 5px 0 0; color: var(--color-text-muted); font-size: 12px; line-height: 1.4; }
.choice-list { display: grid; gap: 10px; }
.visual-choice { display: grid; gap: 8px; min-width: 0; padding: 9px; border: 1px solid var(--color-border-card); border-radius: 17px; background: var(--color-surface-card); color: var(--color-text-primary); cursor: pointer; text-align: left; }
.visual-choice.selected { border-color: var(--color-brand-primary); box-shadow: 0 0 0 1px var(--color-brand-primary); }
.choice-art { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 12px; border: 1px solid var(--color-border-subtle); border-radius: 11px; background: var(--color-background-app); }
.art-title { color: var(--color-brand-primary); font-size: 23px; letter-spacing: -.05em; }
.art-logo { display: block; width: 38px; height: 38px; object-fit: contain; }
.art-logo-title, .art-greeting, .art-actions { display: flex; align-items: center; gap: 7px; }
.art-greeting img { width: 33px; height: 33px; border-radius: 50%; object-fit: cover; }
.art-greeting > span { display: grid; gap: 1px; }
.art-greeting small { color: var(--color-text-muted); font-size: 10px; }
.art-greeting strong { font-size: 12px; }
.art-actions { flex: 0 0 auto; font-size: 20px; }
.art-actions span { display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; border-radius: 999px; background: var(--color-brand-primary-muted); color: var(--color-brand-primary); font-size: 11px; }
.art-actions span i { font-size: 13px; }
.choice-label { display: flex; align-items: center; gap: 6px; padding: 0 3px; color: var(--color-text-secondary); font-size: 13px; font-weight: 550; }
.visual-choice.selected .choice-label { color: var(--color-brand-primary); }
@media (min-width: 769px) and (orientation: landscape) { .top-nav-settings :deep(.mobile-top-nav.preview-nav) { max-width: 760px; margin: 0 auto; } }
</style>
