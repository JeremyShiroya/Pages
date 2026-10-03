<template>
  <link
    href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css"
    rel="stylesheet"
  />
  <aside class="sidebar" :class="{ collapsed }">
    <div class="top">
      <router-link to="/" class="brand-link">
        <div class="logo-container">
          <div class="logo">
            <img src="/images/P Logo.png" alt="Pages" class="logo-image" />
          </div>
          <h1 class="title">Pages</h1>
        </div>
      </router-link>
      <button
        type="button"
        class="collapse-toggle"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleCollapsed"
      >
        <i :class="collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-left-s-line'"></i>
      </button>
    </div>
    <nav class="nav-menu" ref="navRef" @mouseleave="hoverIndex = -1">
      <button
        v-if="collapsed"
        type="button"
        class="menu-item collapsed-expand"
        aria-label="Expand sidebar"
        title="Expand sidebar"
        @click="toggleCollapsed"
      >
        <i class="ri ri-arrow-right-s-line"></i>
        <span>Expand sidebar</span>
      </button>
      <div
        class="highlight-pill"
        :style="highlightStyle"
        :class="{ 'is-active': isHighlightActive }"
      ></div>

      <ul class="menu-list">
        <li v-for="(item, index) in menuItems" :key="item.name">
          <router-link
            :to="item.path"
            class="menu-item"
            :class="{ active: isMenuItemActive(index) }"
            active-class="active"
            @mouseenter="hoverIndex = index"
          >
            <i class="ri" :class="item.icon"></i>
            <span>{{ item.name }}</span>
          </router-link>
        </li>
      </ul>
      <!-- Settings at bottom -->
      <div class="settings">
        <router-link
          :to="settingsItem.path"
          class="menu-item"
          :class="{ active: isSettingsActive }"
          active-class="active"
          @mouseenter="hoverIndex = menuItems.length"
        >
          <i class="ri" :class="settingsItem.icon"></i>
          <span>{{ settingsItem.name }}</span>
        </router-link>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useSidebarState } from '~/composables/useSidebarState'

const route = useRoute();
const navRef = ref(null);
const { collapsed, toggleCollapsed } = useSidebarState()

const menuItems = [
  { name: "Home", icon: "ri-home-smile-2-line", path: "/" },
  { name: "Books", icon: "ri-book-open-line", path: "/books" },
  { name: "Series", icon: "ri-book-shelf-line", path: "/series" },
  // { name: "Genres", icon: "ri-price-tag-3-line", path: "/genres" },
  { name: "Authors", icon: "ri-team-line", path: "/authors" },
  { name: "Playlists", icon: "ri-play-list-2-line", path: "/playlists" },
  { name: "Favourites", icon: "ri-heart-line", path: "/favourites" },
];

const settingsItem = {
  name: "Settings",
  icon: "ri-settings-3-line",
  path: "/settings",
};

const hoverIndex = ref(-1);
const highlightStyle = ref({ top: "0px", height: "0px", opacity: 0 });
const isHighlightActive = ref(false);

const getActiveRouteIndex = () => {
  if (route.path.startsWith("/settings")) return menuItems.length;
  if (route.path === "/") return 0;
  if (
    route.path === "/add" ||
    route.path.startsWith("/edit") ||
    route.path.startsWith("/reader")
  ) {
    return menuItems.findIndex((item) => item.path === "/books");
  }
  if (route.path.startsWith("/author/")) {
    return menuItems.findIndex((item) => item.path === "/authors");
  }
  if (route.path.startsWith("/playlist/")) {
    return menuItems.findIndex((item) => item.path === "/playlists");
  }
  if (route.path.startsWith("/serie/")) {
    return menuItems.findIndex((item) => item.path === "/series");
  }
  const idx = menuItems.findIndex(
    (item) => item.path !== "/" && route.path.startsWith(item.path),
  );
  return idx !== -1 ? idx : 0;
};

const isMenuItemActive = (index) => getActiveRouteIndex() === index;
const isSettingsActive = computed(() => getActiveRouteIndex() === menuItems.length);

const updateHighlight = async () => {
  await nextTick();
  if (!navRef.value) return;

  let targetIndex = hoverIndex.value;
  let isActive = false;

  const activeRouteIndex = getActiveRouteIndex();

  if (targetIndex === -1) {
    targetIndex = activeRouteIndex;
    isActive = true;
  } else if (targetIndex === activeRouteIndex) {
    isActive = true;
  }

  isHighlightActive.value = isActive;

  let targetEl;
  if (targetIndex >= 0 && targetIndex < menuItems.length) {
    const listEl = navRef.value.querySelector(".menu-list");
    if (listEl && listEl.children[targetIndex]) {
      targetEl = listEl.children[targetIndex];
    }
  } else if (targetIndex === menuItems.length) {
    targetEl = navRef.value.querySelector(".settings");
  }

  if (targetEl) {
    const itemEl = targetEl.querySelector(".menu-item") || targetEl;

    let currentEl = itemEl;
    let absoluteTop = 0;
    while (currentEl && currentEl !== navRef.value) {
      absoluteTop += currentEl.offsetTop;
      currentEl = currentEl.offsetParent;
    }

    highlightStyle.value = {
      top: `${absoluteTop}px`,
      height: `${itemEl.offsetHeight}px`,
      opacity: 1,
    };
  } else {
    highlightStyle.value.opacity = 0;
  }
};

onMounted(() => {
  // Slight delay to ensure fonts/layout are fully rendered
  setTimeout(updateHighlight, 100);
  window.addEventListener("resize", updateHighlight);
});

watch(() => route.path, updateHighlight);
watch(hoverIndex, updateHighlight);
</script>

<style scoped>
.sidebar {
  background-color: var(--purple-sidebar);
  width: var(--sidebar-width);
  height: calc(100vh - var(--layout-playing-bar-height));
  position: fixed;
  left: 0;
  top: 0;
  padding: 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
  transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.top {
  display: flex;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 10px;
  gap: 8px;
}

.brand-link {
  color: var(--purple-logo);
  text-decoration: none;
}

.logo-container {
  display: flex;
  align-items: center;
}

.collapse-toggle {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: var(--purple-ul-hover);
  color: var(--purple-li);
  cursor: pointer;
  font-size: 20px;
}

.collapse-toggle:hover {
  color: var(--color-brand-primary);
}

.logo {
  width: 40px;
  height: 40px;
  overflow: hidden;
  margin-right: 5px;
}

.logo-image {
  width: 40px;
  height: 100%;
  object-fit: cover;
}

.title {
  font-size: 1.2rem;
  font-weight: 400;
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  scrollbar-width: none;
  position: relative;
}

.nav-menu::-webkit-scrollbar {
  display: none;
}

.highlight-pill {
  position: absolute;
  left: 10px;
  right: 10px;
  border-radius: 10px;
  background-color: var(--purple-ul-hover);
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  pointer-events: none;
  z-index: 0;
}

.highlight-pill.is-active {
  background-color: var(--color-brand-primary);
}

.menu-list {
  list-style-type: none;
  padding: 0 10px;
  margin: 0;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 15px 20px;
  text-decoration: none;
  color: var(--purple-li);
  font-weight: 400;
  border-radius: 10px;
  transition: color 0.3s ease;
  cursor: pointer;
  z-index: 1;
}

.menu-item.active {
  color: #fff;
  background: var(--color-brand-primary);
}
.menu-item:not(.active):hover { color: var(--color-brand-primary); }

.menu-item i {
  margin-right: 10px;
  font-size: 20px;
}

.settings {
  margin-top: auto;
  padding: 10px;
  /* border-top: 1px solid var(--color-border-on-image); */
  position: relative;
}

.sidebar.collapsed {
  width: 76px;
}

.sidebar.collapsed .top {
  flex-direction: column;
  justify-content: center;
  padding: 0 10px;
  margin-bottom: 14px;
}

.sidebar.collapsed .logo {
  margin-right: 0;
}

.sidebar.collapsed .title,
.sidebar.collapsed .menu-item span {
  display: none;
}

.sidebar.collapsed .collapse-toggle {
  display: none;
}

.collapsed-expand {
  width: calc(100% - 20px);
  min-height: 50px;
  flex: 0 0 auto;
  justify-content: center;
  margin: 0 10px 4px;
  padding: 0;
  border: 0;
  background: transparent;
}

.collapsed-expand:hover {
  background: var(--purple-ul-hover);
  color: var(--color-brand-primary);
}

.sidebar.collapsed .menu-list,
.sidebar.collapsed .settings {
  padding-inline: 10px;
}

.sidebar.collapsed .menu-item {
  justify-content: center;
  padding-inline: 0;
}

.sidebar.collapsed .menu-item i {
  margin-right: 0;
}

</style>
