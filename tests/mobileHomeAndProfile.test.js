import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = resolve(process.cwd())
const read = (path) => readFileSync(resolve(root, path), 'utf8')

describe('mobile home and profile refinements', () => {
  test('mobile home shows two series cards', () => {
    const home = read('components/mobile/HomeMobile.vue')

    expect(home).toContain('const mobileSeries = computed(() => seriesList.value.slice(0, 2));')
    expect(home).not.toContain('const mobileSeries = computed(() => seriesList.value.slice(0, 3));')
  })

  test('mobile home currently reading follows reading activity, not narration', () => {
    const home = read('components/mobile/HomeMobile.vue')

    // `ttsBook` first made this card "last listened to": it outranked a book
    // being actively scrolled or swiped through. Reading activity leads now,
    // with narration only as the fallback.
    expect(home).toContain('const currentReadingBook = computed(() => recentlyReadBooks.value[0] || ttsBook.value || null)')
    expect(home).toContain(':book="currentReadingBook"')
    expect(home).not.toContain('const continueReadingBooks = computed')
    expect(home).not.toContain(':book="continueReadingBooks[0]"')
  })

  test('profile page has the redesigned layout structure', () => {
    const profile = read('components/mobile/ProfileMobile.vue')

    expect(profile).toContain('profile-hero')
    expect(profile).toContain('profile-avatar-ring')
    expect(profile).toContain('profile-actions')
    expect(profile).toContain('profile-preview-card')
    expect(profile).toContain('appearance-panel')

    // Avatars are shown as images only, and the two redundant controls (the
    // check button beside the name, and the "Change avatar" button — the camera
    // badge on the avatar already opens the picker) are gone.
    expect(profile).not.toContain('avatar-option-name')
    expect(profile).not.toContain('<span>Change avatar</span>')
    expect(profile).not.toContain('ri-image-line')
    expect(profile).not.toContain('ri-check-line')
    // The camera badge remains the way in.
    expect(profile).toContain('avatar-edit-badge')
    expect(profile).toContain('ri-camera-line')
  })

  test('profile hub exposes metrics, library tabs, avatar updates, and the editor route', () => {
    const hub = read('components/shared/ProfilePage.vue')
    const route = read('pages/profile.vue')
    const editor = read('pages/editprofilepage.vue')
    const bottomNav = read('components/mobile/MobileBottomNav.vue')

    for (const label of ['Books', 'Unread', 'Read', 'Reading']) expect(hub).toContain(`label: '${label}'`)
    expect(hub).toContain("id: 'favourites'")
    expect(hub).toContain("id: 'playlists'")
    expect(hub).toContain("to=\"/editprofilepage\"")
    expect(hub).toContain('update-avatar-button')
    expect(hub).toContain("router.push('/streak')")
    expect(hub).toContain("router.push('/settings')")
    expect(hub).toContain('profile-overview')
    expect(hub.indexOf('avatar-button')).toBeLessThan(hub.indexOf('class="metrics"'))
    expect(hub.indexOf('class="metrics"')).toBeLessThan(hub.indexOf('profile-details'))
    expect(hub).toMatch(/\.profile-nav\s*\{(?:(?!border-bottom).)*\}/s)
    expect(hub).toMatch(/\.metrics\s*\{(?:(?!border).)*\}/s)
    expect(hub).toContain('background: var(--color-background-app)')
    expect(hub).toContain("settings.value.profileFavouritesLayout || 'grid'")
    expect(hub).toContain(':collapse-actions="profileFavouritesLayout === \'list\'"')
    expect(hub).toContain('<SelectionActionsBar')
    expect(hub).toContain('useLongPress')
    expect(hub).toContain("profile.profileTextMode === 'bio' && profile.bio ? profile.bio : dailyCompliment")
    expect(route).toContain('<ProfilePage />')
    expect(editor).toContain('<ProfileMobile />')
    expect(bottomNav).toContain('ri-user-smile-line')
    expect(bottomNav).not.toContain('label: "Favourites"')
    expect(bottomNav).not.toContain('label: "Playlists"')
  })

  test('edit profile uses the settings palette through the Android system bars', () => {
    expect(read('layouts/default.vue')).toContain("route.path.startsWith('/editprofilepage')")
    expect(read('plugins/system-bars.client.js')).toContain("window.location.pathname.startsWith('/editprofilepage')")
    expect(read('plugins/settings-system-bars.client.js')).toContain("pathname.startsWith('/editprofilepage')")
  })

  test('profile follows the app palette while pure-dark Books keeps its body transparent', () => {
    const layout = read('layouts/default.vue')
    const genericBars = read('plugins/system-bars.client.js')
    const settingsBars = read('plugins/settings-system-bars.client.js')
    const mobileBooks = read('components/mobile/BooksMobile.vue')
    const desktopBooks = read('components/tablet/BooksDesktop.vue')

    expect(layout).not.toContain("|| route.path.startsWith('/profile')")
    expect(genericBars).not.toContain("|| window.location.pathname.startsWith('/profile')")
    expect(settingsBars).not.toContain("|| pathname.startsWith('/profile')")
    for (const books of [mobileBooks, desktopBooks]) {
      expect(books).toContain(':root[data-theme="dark"][data-dark-app-background="dark"] .view-container.is-card')
      expect(books).toMatch(/data-dark-app-background="dark"\][^{]*\.view-container\.is-card\s*\{\s*background:\s*transparent;/s)
    }
  })
})
