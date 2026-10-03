<template>
  <main class="bottom-nav-settings">
    <MobileSettingsNav title="Bottom navigation" back-to="/settings/preferences" aria-label="Bottom navigation settings" />

    <div class="settings-scroll">
      <p class="intro">Adjust the navigation bar below. Changes appear there as you make them.</p>

      <section class="setting-card" aria-labelledby="layout-title">
        <div class="section-heading"><h2 id="layout-title">Bar layout</h2><p>Float above the page or use the original edge-to-edge bar.</p></div>
        <div class="choice-grid" role="group" aria-label="Bar layout">
          <button v-for="choice in layoutChoices" :key="choice.value" type="button" class="visual-choice" :class="{ selected: settings.mobileNavStyle === choice.value }" :aria-pressed="settings.mobileNavStyle === choice.value" @click="set('mobileNavStyle', choice.value)">
            <span class="choice-art" :class="`art-layout-${choice.value}`" aria-hidden="true"><span class="art-lines"><i></i><i></i></span><span class="art-bar"><i></i><i></i><i></i><i></i></span></span>
            <span class="choice-label">{{ choice.label }}<i v-if="settings.mobileNavStyle === choice.value" class="ri-check-line"></i></span>
          </button>
        </div>
      </section>

      <section class="setting-card" aria-labelledby="size-title">
        <div class="section-heading"><h2 id="size-title">Size</h2><p>Keep the full-size bar or use a more contained, compact bar.</p></div>
        <div class="choice-grid" role="group" aria-label="Bottom navigation size">
          <button v-for="choice in sizeChoices" :key="choice.value" type="button" class="visual-choice" :class="{ selected: settings.mobileNavSize === choice.value }" :aria-pressed="settings.mobileNavSize === choice.value" @click="set('mobileNavSize', choice.value)">
            <span class="choice-art art-size" :class="`art-size-${choice.value}`" aria-hidden="true"><span class="size-bar"><i></i><i></i><i></i><i></i></span></span>
            <span class="choice-label">{{ choice.label }}<i v-if="settings.mobileNavSize === choice.value" class="ri-check-line"></i></span>
          </button>
        </div>
      </section>

      <section class="setting-card" aria-labelledby="material-title">
        <div class="section-heading"><h2 id="material-title">Bar material</h2><p>Choose the surface behind the tabs.</p></div>
        <div class="choice-grid material-grid" role="group" aria-label="Bar material">
          <button v-for="choice in materialChoices" :key="choice.value" type="button" class="visual-choice" :class="{ selected: settings.mobileNavMaterial === choice.value }" :aria-pressed="settings.mobileNavMaterial === choice.value" @click="set('mobileNavMaterial', choice.value)">
            <span class="choice-art art-material" :class="`art-material-${choice.value}`" aria-hidden="true"><span class="material-orb"></span><span class="material-surface"></span></span>
            <span class="choice-label">{{ choice.label }}<i v-if="settings.mobileNavMaterial === choice.value" class="ri-check-line"></i></span>
          </button>
        </div>
      </section>

      <section v-if="settings.mobileNavStyle === 'floating'" class="setting-card" aria-labelledby="highlight-title">
        <div class="section-heading"><h2 id="highlight-title">Selected tab</h2><p>Choose the background that glides between tabs.</p></div>
        <div class="choice-grid highlight-grid" role="group" aria-label="Selected tab background">
          <button v-for="choice in highlightChoices" :key="choice.value" type="button" class="visual-choice" :class="{ selected: settings.mobileNavHighlight === choice.value }" :aria-pressed="settings.mobileNavHighlight === choice.value" @click="set('mobileNavHighlight', choice.value)">
            <span class="choice-art art-highlight" :class="`art-highlight-${choice.value}`" aria-hidden="true"><span class="highlight-sample"><i class="ri-home-smile-2-line"></i></span></span>
            <span class="choice-label">{{ choice.label }}<i v-if="settings.mobileNavHighlight === choice.value" class="ri-check-line"></i></span>
          </button>
        </div>

      </section>

      <section class="setting-card" aria-labelledby="icon-style-title">
        <div class="section-heading"><h2 id="icon-style-title">Active icon</h2><p>Show the selected tab as an outline or a filled icon.</p></div>
        <div class="choice-grid" role="group" aria-label="Active icon style">
          <button v-for="choice in iconChoices" :key="choice.value" type="button" class="visual-choice icon-choice" :class="{ selected: settings.mobileNavActiveIconStyle === choice.value }" :aria-pressed="settings.mobileNavActiveIconStyle === choice.value" @click="set('mobileNavActiveIconStyle', choice.value)">
            <span class="icon-choice-art" aria-hidden="true"><i :class="choice.value === 'fill' ? 'ri-home-smile-2-fill' : 'ri-home-smile-2-line'"></i></span>
            <span class="choice-label">{{ choice.label }}<i v-if="settings.mobileNavActiveIconStyle === choice.value" class="ri-check-line"></i></span>
          </button>
        </div>
      </section>

      <section class="setting-card" aria-labelledby="profile-tab-title">
        <div class="section-heading"><h2 id="profile-tab-title">Profile tab</h2><p>Show a profile icon or your avatar.</p></div>
        <div class="choice-grid" role="group" aria-label="Profile tab appearance">
          <button v-for="choice in profileChoices" :key="choice.value" type="button" class="visual-choice" :class="{ selected: settings.mobileNavProfileDisplay === choice.value }" :aria-pressed="settings.mobileNavProfileDisplay === choice.value" @click="set('mobileNavProfileDisplay', choice.value)">
            <span class="icon-choice-art" aria-hidden="true"><img v-if="choice.value === 'avatar'" class="choice-avatar" :src="profileAvatarSrc" alt="" /><i v-else class="ri-user-smile-line"></i></span>
            <span class="choice-label">{{ choice.label }}<i v-if="settings.mobileNavProfileDisplay === choice.value" class="ri-check-line"></i></span>
          </button>
        </div>
      </section>

      <section class="setting-card" aria-labelledby="titles-title">
        <div class="section-heading"><h2 id="titles-title">Tab titles</h2><p>Show or hide Home, Books, Series and Profile beneath the icons.</p></div>
        <div class="choice-grid" role="group" aria-label="Tab titles">
          <button v-for="choice in titleChoices" :key="choice.value" type="button" class="visual-choice" :class="{ selected: settings.mobileNavShowTitles === choice.value }" :aria-pressed="settings.mobileNavShowTitles === choice.value" @click="set('mobileNavShowTitles', choice.value)">
            <span class="title-choice-art" aria-hidden="true"><i class="ri-home-smile-2-fill"></i><small v-if="choice.value">Home</small></span>
            <span class="choice-label">{{ choice.label }}<i v-if="settings.mobileNavShowTitles === choice.value" class="ri-check-line"></i></span>
          </button>
        </div>
      </section>

      <section class="setting-card" aria-labelledby="clarity-title">
        <div class="section-heading"><h2 id="clarity-title">Transparency &amp; blur</h2><p>Control how much of the page shows through the glass.</p></div>
        <label class="range-row"><span>Opacity <strong>{{ settings.mobileNavOpacity }}%</strong></span><input type="range" min="50" max="100" step="1" :value="settings.mobileNavOpacity" @input="set('mobileNavOpacity', Number($event.target.value))" /></label>
        <label class="range-row"><span>Background blur <strong>{{ settings.mobileNavBlur }} px</strong></span><input type="range" min="0" max="30" step="1" :value="settings.mobileNavBlur" @input="set('mobileNavBlur', Number($event.target.value))" /></label>
        <button type="button" class="reset-clarity" @click="restoreClarity">Restore opacity &amp; blur defaults</button>
      </section>

      <button type="button" class="reset-all" @click="restoreAll">Restore all navigation defaults</button>
    </div>

    <MobileBottomNav preview />
  </main>
</template>

<script setup>
import { DEFAULT_BOOKISH_SETTINGS, useBookishSettings } from '~/composables/useBookishSettings'
import MobileBottomNav from './MobileBottomNav.vue'
import MobileSettingsNav from './MobileSettingsNav.vue'
import { useUserProfile } from '~/composables/useUserProfile'

const { settings, updateSettings } = useBookishSettings()
const { profile, activeAvatarPreset } = useUserProfile()
const profileAvatarSrc = computed(() => profile.value.avatarType === 'image' ? profile.value.avatarValue : activeAvatarPreset.value.src)
const set = (key, value) => updateSettings({ [key]: value })
const layoutChoices = [{ value: 'standard', label: 'Standard' }, { value: 'floating', label: 'Floating' }]
const sizeChoices = [{ value: 'standard', label: 'Standard' }, { value: 'compact', label: 'Compact' }]
const materialChoices = [{ value: 'current', label: 'Flat' }, { value: 'frosted', label: 'Frosted glass' }]
const highlightChoices = [{ value: 'soft', label: 'Soft' }, { value: 'none', label: 'None' }]
const iconChoices = [{ value: 'fill', label: 'Fill' }, { value: 'line', label: 'Line' }]
const profileChoices = [{ value: 'icon', label: 'Icon' }, { value: 'avatar', label: 'Avatar' }]
const titleChoices = [{ value: true, label: 'Show' }, { value: false, label: 'Hide' }]
const restoreClarity = () => updateSettings({ mobileNavOpacity: DEFAULT_BOOKISH_SETTINGS.mobileNavOpacity, mobileNavBlur: DEFAULT_BOOKISH_SETTINGS.mobileNavBlur })
const restoreAll = () => updateSettings(Object.fromEntries(
  Object.entries(DEFAULT_BOOKISH_SETTINGS).filter(([key]) => key.startsWith('mobileNav')),
))
</script>

<style scoped>
.bottom-nav-settings { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.settings-scroll { display: grid; gap: 28px; width: min(760px, 100%); margin: 0 auto; padding: 8px 16px calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom) + 28px); }
.intro { margin: 0 0 2px; color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; }
.setting-card { display: grid; gap: 16px; padding: 18px; border: 1px solid var(--color-border-card); border-radius: 22px; background: var(--color-settings-group); }
.section-heading h2 { margin: 0; font-size: 17px; font-weight: 600; }
.section-heading p { margin: 5px 0 0; color: var(--color-text-muted); font-size: 12px; line-height: 1.4; }
.choice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.visual-choice { display: grid; min-width: 0; gap: 7px; padding: 6px; border: 1px solid var(--color-border-card); border-radius: 17px; background: var(--color-surface-card); color: var(--color-text-primary); cursor: pointer; text-align: left; }
.visual-choice.selected { border-color: var(--color-brand-primary); box-shadow: 0 0 0 1px var(--color-brand-primary); }
.choice-art { position: relative; display: block; height: 74px; overflow: hidden; border-radius: 11px; background: var(--color-background-app); }
.art-lines { display: grid; gap: 6px; padding: 12px; }.art-lines i { width: 70%; height: 6px; border-radius: 20px; background: var(--color-border-card); }.art-lines i + i { width: 45%; }
.art-bar { position: absolute; right: 7px; bottom: 5px; left: 7px; display: grid; grid-template-columns: repeat(4, 1fr); height: 27px; align-items: center; border: 1px solid var(--color-border-card); border-radius: 99px; background: var(--color-settings-group); box-shadow: 0 3px 8px #0002; }.art-bar i { width: 8px; height: 8px; justify-self: center; border-radius: 50%; background: var(--color-text-muted); }.art-bar i:first-child { width: 75%; height: 21px; background: var(--color-brand-primary-muted); }
.art-layout-standard .art-bar { right: 0; bottom: 0; left: 0; border-radius: 0; }.art-layout-standard .art-bar i:first-child { width: 8px; height: 8px; background: var(--color-brand-primary); }
.art-size { display: grid; place-items: end center; padding-bottom: 9px; }
.size-bar { display: grid; width: 91%; height: 30px; grid-template-columns: repeat(4, 1fr); align-items: center; border: 1px solid var(--color-border-card); border-radius: 99px; background: var(--color-settings-group); box-shadow: 0 3px 8px #0002; }
.size-bar i { width: 8px; height: 8px; justify-self: center; border-radius: 50%; background: var(--color-text-muted); }
.size-bar i:first-child { width: 70%; height: 23px; background: var(--color-brand-primary-muted); }
.art-size-compact .size-bar { width: 76%; height: 24px; }
.art-size-compact .size-bar i { width: 7px; height: 7px; }
.art-size-compact .size-bar i:first-child { width: 72%; height: 19px; }
.choice-label { display: flex; align-items: center; justify-content: space-between; gap: 2px; min-height: 26px; padding: 0 3px; font-size: 11px; line-height: 1.2; }.choice-label i { color: var(--color-brand-primary); font-size: 16px; }
.art-material { background: linear-gradient(125deg, #062f3a, #26a6b5 55%, #083137); }.material-orb { position: absolute; top: 8px; right: 16px; width: 42px; height: 42px; border-radius: 50%; background: #b9f5ff88; filter: blur(5px); }.material-surface { position: absolute; right: 8px; bottom: 10px; left: 8px; height: 26px; border-radius: 99px; background: #eafcffeb; }
.art-material-frosted .material-surface { background: #eafcff88; border: 1px solid #fff9; backdrop-filter: blur(8px); box-shadow: 0 3px 7px #0003; }
.art-highlight { display: grid; place-items: center; background: linear-gradient(125deg, #092e3d, #4a7891); }.highlight-sample { display: grid; width: 64%; height: 46px; place-items: center; border-radius: 99px; color: #fff; font-size: 22px; }.art-highlight-soft .highlight-sample { background: #ffffff35; }
.icon-choice-art { display: grid; height: 58px; place-items: center; border-radius: 11px; background: var(--color-background-app); color: var(--color-brand-primary); font-size: 28px; }
.choice-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
.title-choice-art { display: flex; height: 58px; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 11px; background: var(--color-background-app); color: var(--color-brand-primary); font-size: 24px; }
.title-choice-art small { color: var(--color-text-secondary); font-size: 10px; }
.range-row { display: grid; gap: 7px; font-size: 13px; }.range-row span { display: flex; justify-content: space-between; }.range-row strong { color: var(--color-brand-primary); }.range-row input { width: 100%; accent-color: var(--color-brand-primary); }
.reset-clarity, .reset-all { min-height: 42px; padding: 0 16px; border: 1px solid var(--color-border-card); border-radius: 20px; background: var(--color-surface-card); color: var(--color-brand-primary); font: inherit; cursor: pointer; }.reset-clarity { justify-self: start; }.reset-all { justify-self: stretch; }
@media (max-width: 390px) { .choice-grid { gap: 7px; }.choice-label { font-size: 10px; } }
</style>
