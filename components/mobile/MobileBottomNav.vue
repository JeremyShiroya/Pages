<template>
  <nav
    class="mobile-bottom-nav"
    :class="[
      { 'standard-nav': settings.mobileNavStyle === 'standard', 'compact-nav': settings.mobileNavSize === 'compact', 'titles-hidden': !settings.mobileNavShowTitles, 'avatar-indicator-hidden': settings.mobileNavProfileDisplay === 'avatar' && indicatorIndex === 3, 'nav-transition-ready': transitionReady, 'preview-nav': preview },
      `material-${settings.mobileNavMaterial}`,
      `highlight-${settings.mobileNavHighlight}`,
    ]"
    :aria-label="preview ? 'Bottom navigation appearance preview' : 'Primary mobile navigation'"
    :style="navStyle"
  >
    <span v-if="displayIndex >= 0" class="active-indicator" aria-hidden="true"></span>
    <template v-if="preview">
    <button
      v-for="(item, index) in items"
      :key="`preview-${item.path}`"
      type="button"
      class="mobile-nav-item"
      :class="{ active: displayIndex === index }"
      :aria-label="item.label"
      :aria-pressed="displayIndex === index"
      @click="selectPreview(index)"
    >
      <img v-if="item.path === '/profile' && settings.mobileNavProfileDisplay === 'avatar'" class="nav-avatar" :src="profileAvatarSrc" alt="" />
      <i v-else :class="iconFor(item, index)"></i>
      <span v-if="settings.mobileNavShowTitles">{{ item.label }}</span>
    </button>
    </template>
    <template v-else>
    <NuxtLink
      v-for="(item, index) in items"
      :key="item.path"
      :to="item.path"
      class="mobile-nav-item"
      :class="{ active: displayIndex === index }"
      :aria-label="item.label"
      :aria-current="isActive(item) ? 'page' : undefined"
      @click="rememberOrigin"
    >
      <img v-if="item.path === '/profile' && settings.mobileNavProfileDisplay === 'avatar'" class="nav-avatar" :src="profileAvatarSrc" alt="" />
      <i v-else :class="iconFor(item, index)"></i>
      <span v-if="settings.mobileNavShowTitles">{{ item.label }}</span>
    </NuxtLink>
    </template>
  </nav>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useBookishSettings } from '~/composables/useBookishSettings';
import { useUserProfile } from '~/composables/useUserProfile';

const props = defineProps({ preview: { type: Boolean, default: false } });
const route = useRoute();
const { settings } = useBookishSettings();
const { profile, activeAvatarPreset } = useUserProfile();
const profileAvatarSrc = computed(() => profile.value.avatarType === 'image'
  ? profile.value.avatarValue : activeAvatarPreset.value.src);

const items = [
  { label: "Home", path: "/", icon: "ri-home-smile-2-line" },
  { label: "Books", path: "/books", icon: "ri-book-open-line" },
  { label: "Series", path: "/series", icon: "ri-book-shelf-line" },
  { label: "Profile", path: "/profile", icon: "ri-user-smile-line" },
];

const isActive = (item) => {
  if (item.path === "/") return route.path === "/";
  return route.path.startsWith(item.path);
};

const activeIndex = computed(() => items.findIndex(isActive));
const previousIndex = useState('mobile-bottom-nav-previous-index', () => null);
const previewIndex = ref(0);
const displayIndex = computed(() => props.preview ? previewIndex.value : activeIndex.value);
const indicatorIndex = ref(props.preview ? displayIndex.value : (previousIndex.value ?? displayIndex.value));
const transitionReady = ref(false);
const iconFor = (item, index) => (
  displayIndex.value === index && settings.value.mobileNavActiveIconStyle === 'fill'
    ? item.icon.replace('-line', '-fill')
    : item.icon
);
const selectPreview = (index) => {
  transitionReady.value = true;
  previewIndex.value = index;
  indicatorIndex.value = index;
};
const keyboardOffset = ref(0);
const navStyle = computed(() => ({
  '--active-offset': `${indicatorIndex.value * 100}%`,
  '--nav-opacity': `${settings.value.mobileNavOpacity}%`,
  '--nav-frost-opacity': `${Math.round(settings.value.mobileNavOpacity * .7)}%`,
  '--nav-blur': `${settings.value.mobileNavBlur}px`,
  '--keyboard-offset': `${keyboardOffset.value}px`,
}));
let glideTimer;
let settleTimer;
let viewportBaseline = 0;
let keyboardEngaged = false;

const viewportHeight = () => Math.min(
  window.innerHeight,
  (window.visualViewport?.height || window.innerHeight) + (window.visualViewport?.offsetTop || 0),
);
const syncKeyboard = () => {
  const height = viewportHeight();
  const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
  if (!editing && !keyboardEngaged) viewportBaseline = height;
  if (height > viewportBaseline) viewportBaseline = height;
  const gap = viewportBaseline - height;
  if (editing && gap > 120) keyboardEngaged = true;
  if (gap <= 120) keyboardEngaged = false;
  keyboardOffset.value = keyboardEngaged ? gap : 0;
};

const rememberOrigin = () => {
  if (activeIndex.value >= 0) previousIndex.value = indicatorIndex.value;
};

onMounted(() => {
  viewportBaseline = viewportHeight();
  window.addEventListener('resize', syncKeyboard);
  window.visualViewport?.addEventListener('resize', syncKeyboard);
  window.visualViewport?.addEventListener('scroll', syncKeyboard);
  if (props.preview) return;
  if (activeIndex.value >= 0 && previousIndex.value !== null && previousIndex.value !== activeIndex.value) {
    indicatorIndex.value = previousIndex.value;
    // Let the destination page render first; then the pill visibly travels.
    glideTimer = window.setTimeout(() => {
      transitionReady.value = true;
      indicatorIndex.value = activeIndex.value;
      settleTimer = window.setTimeout(() => {
        previousIndex.value = activeIndex.value;
      }, 650);
    }, 240);
  } else {
    previousIndex.value = activeIndex.value;
  }
});

onBeforeUnmount(() => {
  clearTimeout(glideTimer);
  clearTimeout(settleTimer);
  window.removeEventListener('resize', syncKeyboard);
  window.visualViewport?.removeEventListener('resize', syncKeyboard);
  window.visualViewport?.removeEventListener('scroll', syncKeyboard);
});
</script>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom) - var(--keyboard-offset));
  left: 12px;
  z-index: 1100;
  isolation: isolate;
  display: none;
  width: min(720px, calc(100% - 24px));
  height: 72px;
  margin-inline: auto;
  padding: 6px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--color-border-card) var(--nav-opacity), transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--nav-surface-color, var(--color-background-app)) var(--nav-opacity), transparent);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(var(--nav-blur));
}

.mobile-bottom-nav.material-frosted {
  border-color: color-mix(in srgb, var(--color-text-primary) 18%, transparent);
  background: linear-gradient(160deg, rgba(255, 255, 255, .2), transparent 54%),
    color-mix(in srgb, var(--nav-surface-color, var(--color-background-app)) var(--nav-frost-opacity), transparent);
  box-shadow: inset 0 1px rgba(255, 255, 255, .36), 0 9px 28px rgba(15, 23, 42, .17);
  backdrop-filter: blur(var(--nav-blur)) saturate(140%);
}

.mobile-bottom-nav.compact-nav {
  width: min(600px, calc(100% - 80px));
  height: 64px;
  padding: 4px;
}

.compact-nav .active-indicator {
  top: 4px;
  left: 4px;
  width: calc((100% - 8px) / 4);
  height: 54px;
}

.compact-nav .mobile-nav-item {
  height: 54px;
  gap: 2px;
  font-size: 11px;
}

.compact-nav .mobile-nav-item i { font-size: 21px; }
.compact-nav .mobile-nav-item.active i { font-size: 23px; }

.material-frosted .mobile-nav-item { color: var(--color-text-secondary); }
.material-frosted .mobile-nav-item.active { color: var(--color-text-primary); }
.material-frosted.highlight-soft .active-indicator { background: color-mix(in srgb, var(--color-text-primary) 12%, transparent); }

.mobile-bottom-nav.standard-nav {
  right: 0;
  bottom: calc(0px - var(--keyboard-offset));
  left: 0;
  width: 100%;
  height: calc(70px + env(safe-area-inset-bottom));
  padding: 0 12px env(safe-area-inset-bottom);
  border: 0;
  border-radius: 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, .05);
}
.mobile-bottom-nav.standard-nav.compact-nav {
  width: 100%;
  height: calc(60px + env(safe-area-inset-bottom));
  padding: 0 12px env(safe-area-inset-bottom);
}
.standard-nav .mobile-nav-item { height: 70px; margin-inline: 4px; }
.standard-nav.compact-nav .mobile-nav-item { height: 60px; }
.standard-nav .active-indicator { display: none; }

:global(html:not([data-theme="dark"]) .mobile-bottom-nav) {
  border-color: color-mix(in srgb, var(--color-text-primary) 16%, transparent);
}

.active-indicator {
  position: absolute;
  z-index: 1;
  top: 6px;
  left: 6px;
  width: calc((100% - 12px) / 4);
  height: 60px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-brand-primary-muted) var(--nav-opacity), transparent);
  opacity: 1;
  transform: translateX(var(--active-offset));
  transition: none;
  pointer-events: none;
}
.highlight-none .active-indicator { display: none; }
.avatar-indicator-hidden .active-indicator { opacity: 0; }
.nav-transition-ready .active-indicator {
  transition: transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease;
}

.mobile-nav-item {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 60px;
  border-radius: 999px;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  font-size: var(--mobile-caption-size);
  line-height: 1;
}

.mobile-nav-item i {
  font-size: var(--mobile-icon-size);
  line-height: 1;
}

.nav-avatar {
  display: block;
  width: 26px;
  height: 26px;
  border: 2px solid transparent;
  border-radius: 50%;
  object-fit: cover;
  transition: width 180ms ease, height 180ms ease;
}
.mobile-nav-item.active .nav-avatar { border-color: currentColor; }
.compact-nav .nav-avatar { width: 22px; height: 22px; }
.titles-hidden .mobile-nav-item.active .nav-avatar { width: 32px; height: 32px; }
.compact-nav.titles-hidden .nav-avatar { width: 28px; height: 28px; }
.compact-nav.titles-hidden .mobile-nav-item.active .nav-avatar { width: 28px; height: 28px; }
.titles-hidden .mobile-nav-item { gap: 0; }

.mobile-nav-item.active {
  color: var(--color-brand-primary);
}

@media (prefers-reduced-motion: reduce) {
  .active-indicator { transition: none; }
}

.mobile-nav-item.active i {
  font-size: var(--mobile-active-icon-size);
}

@media (width <= 768px),
  (orientation: portrait) and (min-width: 769px) and (max-width: 1024px) {
  .mobile-bottom-nav {
    display: grid;
  }
}

.mobile-bottom-nav.preview-nav { display: grid; }
@media (min-width: 769px) and (orientation: landscape) {
  .mobile-bottom-nav.preview-nav { bottom: calc(104px + env(safe-area-inset-bottom) - var(--keyboard-offset)); }
}
@media (prefers-reduced-transparency: reduce) {
  .mobile-bottom-nav.material-frosted { background: var(--nav-surface-color, var(--color-background-app)); backdrop-filter: none; }
}

@media (max-width: 480px) {
  .mobile-nav-item {
    font-size: var(--mobile-tiny-size);
  }
}
</style>
