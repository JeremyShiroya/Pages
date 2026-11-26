<template>
  <MobileSettingsNav title="About" back-to="/settings" aria-label="Settings navigation" />
  <main class="about-page">
    <!-- App identity, as a system About screen opens. -->
    <header class="about-hero">
      <img class="app-icon" :src="appLogo" alt="" />
      <h1>Pages</h1>
      <p class="hero-sub">Built by a reader, for readers.</p>
    </header>

    <section>
      <div class="group list">
        <div class="list-row"><span>Version</span><span class="row-value">{{ appVersion }}</span></div>
        <div class="list-row"><span>Build</span><span class="row-value">{{ buildNumber }}</span></div>
        <div class="list-row"><span>Developer</span><span class="row-value">Jeremy Shiroya</span></div>
        <div class="list-row"><span>Made in</span><span class="row-value">Kenya</span></div>
        <div class="list-row"><span>Price</span><span class="row-value">Free, always</span></div>
      </div>
    </section>

    <section>
      <h2 class="group-title">About Pages</h2>
      <div class="group prose">
        <p>
          <strong>Pages</strong> is a private mobile library for readers who value simplicity, beautiful
          design, and complete control. Keep your books, series, favourites, playlists, and reading
          progress on your device, while enjoying natural read-aloud voices in a clean, intuitive reading experience.
        </p>
      </div>
    </section>

    <section>
      <h2 class="group-title">The Story</h2>
      <div class="group prose">
        <p>
          <strong>Pages</strong> was created by <strong>Jeremy Shiroya</strong>, a Kenya-based developer
          and lifelong reader who believes reading apps should be simple, beautiful, and free. Inspired
          by his own love of books, he built Pages to offer a clean, intuitive experience that puts books first.
          Frustrated that many popular apps hide great features behind subscriptions while free
          alternatives often compromise on design, Jeremy created Pages as a different kind of
          reading app: thoughtfully designed, reader-first, and accessible to everyone.
          Pages is a statement that enjoying books shouldn't come at a price. It continues to evolve
          with new features for readers, and it always will be completely free to use.
        </p>
      </div>
    </section>

    <section>
      <h2 class="group-title">Thanks</h2>
      <div class="group prose thanks">
        <i class="ri-heart-3-fill" aria-hidden="true"></i>
        <p>
          Special thanks to my love, <strong>Hope Makena Mutinda</strong>(Pending "Shiroya"), for her encouragement, thoughtful
          feedback, and dedicated beta testing throughout the development of Pages. Her support helped
          shape the app into what it is today.
        </p>
      </div>
    </section>

    <section>
      <div class="group list">
        <NuxtLink class="list-row link" to="/settings/privacy">
          <span>Privacy Policy</span>
          <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </NuxtLink>
      </div>
    </section>

    <p class="closing">© {{ year }} Jeremy Shiroya</p>
  </main>
</template>

<script setup>
import { useAppLogo } from '~/composables/useAppLogo'
const appLogo = useAppLogo()
import { computed } from 'vue'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'

const runtimeConfig = useRuntimeConfig()
const appVersion = computed(() => runtimeConfig.public.appVersion || '0.0.0')
const buildNumber = computed(() => runtimeConfig.public.buildNumber || '—')
const year = new Date().getFullYear()
</script>

<style scoped>
.about-page {
  display: grid;
  gap: var(--settings-section-gap);
  width: 100%;
  max-width: 560px;
  min-height: calc(100vh - 70px);
  margin: 0 auto;
  padding: 8px var(--settings-gutter) 40px;
  color: var(--color-text-primary);
  background: var(--color-settings-background);
}

.about-hero { display: grid; justify-items: center; gap: 4px; padding-top: 8px; text-align: center; }
.app-icon { width: 84px; height: 84px; margin-bottom: 10px; border-radius: 20px; object-fit: contain; }
.about-hero h1 { margin: 0; font-size: 28px; font-weight: 400 !important; letter-spacing: -0.02em; }
.hero-sub { margin: 0; color: var(--color-text-muted); font-size: 15px; }

.group-title {
  margin: 0 0 var(--settings-header-gap) var(--settings-row-inset);
  color: var(--color-text-muted);
  font-size: var(--settings-header-size);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.group { border-radius: var(--settings-radius); background: var(--color-settings-group); }

.list { padding-left: var(--settings-row-inset); }
.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 12px var(--settings-row-inset) 12px 0;
  color: var(--color-text-primary);
  font-size: var(--settings-label-size);
  text-decoration: none;
}
.list-row + .list-row { border-top: 1px solid var(--color-border-subtle); }
.row-value { color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.list-row.link i { color: var(--color-text-muted); font-size: 20px; }

.prose { padding: 16px var(--settings-row-inset); }
.prose p { margin: 0; color: var(--color-text-secondary); font-size: 16px; line-height: 1.55; }
.prose strong { color: var(--color-text-primary); font-weight: 500 !important; }
.thanks { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 12px; align-items: start; }
.thanks i { margin-top: 3px; color: #ff375f; font-size: 20px; }

.closing { margin: 0; color: var(--color-text-muted); font-size: 13px; text-align: center; }
</style>
