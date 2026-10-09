<template>
  <header class="mobile-top-nav" :class="{ 'preview-nav': preview }" :inert="preview" :aria-label="preview ? 'Top navigation appearance preview' : 'Primary top navigation'">
    <h1 v-if="topNavDisplay === 'title'" class="pages-brand">Pages</h1>
    <img v-else-if="topNavDisplay === 'logo'" class="pages-logo" src="/images/P Logo.png" alt="Pages" />
    <div v-else-if="topNavDisplay === 'logo-title'" class="pages-logo-title">
      <img class="pages-logo" src="/images/P Logo.png" alt="" />
      <h1 class="pages-brand">Pages</h1>
    </div>
    <button
      v-else
      class="profile-greeting"
      type="button"
      aria-label="Open profile"
      @click="openProfile"
    >
      <div class="profile-avatar" aria-hidden="true">
        <img :src="profileAvatarSrc" :alt="`${profile.displayName} avatar`" />
      </div>
      <div class="greeting-copy">
        <span>Hello {{ firstName }},</span>
        <strong>{{ isFirstBoot ? 'Welcome,' : 'Welcome Back!' }}</strong>
      </div>
    </button>

    <div class="nav-actions">
      <button v-if="showStreak" type="button" class="streak-pill" title="Open streak calendar" aria-label="Open streak calendar" @click="openStreak">
        <i class="ri-fire-fill"></i>
        <span>{{ streakCount }}</span>
      </button>
      <button
        class="mobile-menu-button"
        type="button"
        aria-label="Open settings"
        title="Open settings"
        @click="openSettings"
      >
        <i class="ri-menu-line"></i>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { BOOKISH_SETTINGS_KEY, useBookishSettings } from "~/composables/useBookishSettings";
import { useStreak } from "~/composables/useStreak";
import {
  BOOKISH_PROFILE_UPDATED_EVENT,
  useUserProfile,
} from "~/composables/useUserProfile";

defineProps({ preview: { type: Boolean, default: false } });

let currentRuntimeIsFirstBoot = null;

const router = useRouter();
const { streakCount } = useStreak();
const { settings } = useBookishSettings();
const topNavDisplay = computed(() => settings.value.mobileTopNavDisplay || 'logo-title');
const showStreak = computed(() => settings.value.showStreak !== false);
const { profile, activeAvatarPreset, loadProfile } = useUserProfile();
const isFirstBoot = ref(true);
const LAUNCHED_KEY = 'bookish:has-launched';

const profileAvatarSrc = computed(() => {
  return profile.value.avatarType === "image"
    ? profile.value.avatarValue
    : activeAvatarPreset.value.src;
});
const firstName = computed(() => {
  return profile.value.displayName.trim().split(/\s+/)[0] || "Reader";
});

const openProfile = () => {
  router.push("/profile");
};

const openSettings = () => {
  router.push("/settings");
};

const openStreak = () => {
  router.push('/streak');
};

const refreshProfile = () => {
  loadProfile();
};

onMounted(() => {
  if (currentRuntimeIsFirstBoot === null) {
    const hasPreviousLaunch = localStorage.getItem(LAUNCHED_KEY) === 'true'
      || localStorage.getItem(BOOKISH_SETTINGS_KEY) !== null;
    currentRuntimeIsFirstBoot = !hasPreviousLaunch;
    localStorage.setItem(LAUNCHED_KEY, 'true');
  }
  isFirstBoot.value = currentRuntimeIsFirstBoot;
  refreshProfile();
  window.addEventListener(BOOKISH_PROFILE_UPDATED_EVENT, refreshProfile);
});

onBeforeUnmount(() => {
  window.removeEventListener(BOOKISH_PROFILE_UPDATED_EVENT, refreshProfile);
});
</script>

<style scoped>
.mobile-top-nav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1100;
  display: none;
  height: calc(70px + env(safe-area-inset-top));
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: calc(12px + env(safe-area-inset-top)) var(--mobile-page-padding-inline) 0.75rem;
  background: var(--color-background-app);
}

.pages-brand {
  margin: 0;
  color: var(--color-brand-primary);
  font-size: clamp(1.55rem, 6vw, 1.9rem);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1;
}

.pages-logo {
  display: block;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  object-fit: contain;
}

.pages-logo-title { display: flex; min-width: 0; align-items: center; gap: 7px; }
.pages-logo-title .pages-logo { width: 38px; height: 38px; flex-basis: 38px; }
.pages-logo-title .pages-brand { font-size: clamp(1.4rem, 5.4vw, 1.75rem); }

.profile-greeting,
.nav-actions {
  display: flex;
  align-items: center;
  min-width: 0;
}

.profile-greeting {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  gap: 10px;
  text-align: left;
}

.profile-avatar {
  position: relative;
  width: var(--mobile-top-avatar-size);
  height: var(--mobile-top-avatar-size);
  flex: 0 0 var(--mobile-top-avatar-size);
  overflow: hidden;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.greeting-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  color: var(--color-text-primary);
  line-height: 1.15;
}

.greeting-copy span,
.greeting-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.greeting-copy span {
  max-width: min(42vw, 220px);
  color: var(--color-text-muted);
  font-size: var(--mobile-caption-size);
}

.greeting-copy strong {
  max-width: min(48vw, 240px);
  color: var(--color-text-primary);
  font-size: var(--mobile-body-size);
}

.nav-actions {
  gap: 8px;
  flex-shrink: 0;
}

.streak-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-width: 52px;
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: var(--color-brand-primary-muted);
  color: var(--color-brand-primary);
  font-size: var(--mobile-subtext-size);
  line-height: 1;
  cursor: pointer;
}

.streak-pill i {
  font-size: 18px;
}

.mobile-menu-button {
  display: inline-flex;
  width: var(--mobile-touch-target);
  height: var(--mobile-touch-target);
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: var(--mobile-icon-size);
}

.mobile-top-nav { display: flex; }
.mobile-top-nav.preview-nav {
  position: sticky;
  top: 0;
  height: 70px;
  padding-top: 12px;
  border-bottom: 1px solid var(--color-border-subtle);
  box-shadow: 0 8px 20px rgba(15, 23, 42, .06);
}


@media (max-width: 360px) {
  .mobile-top-nav {
    padding-right: 14px;
    padding-left: 14px;
  }

  .profile-avatar {
    width: var(--mobile-top-avatar-size);
    height: var(--mobile-top-avatar-size);
    flex-basis: var(--mobile-top-avatar-size);
  }

  .nav-actions {
    gap: 0.45rem;
  }

  .streak-pill {
    min-width: 50px;
    padding: 0 0.65rem;
  }
}
</style>
