import { useState } from '#app'

const STORAGE_KEY = 'pages:sidebar-collapsed'

export const useSidebarState = () => {
  const collapsed = useState('layout:sidebar-collapsed', () => false)
  const hydrated = useState('layout:sidebar-hydrated', () => false)

  if (import.meta.client && !hydrated.value) {
    collapsed.value = localStorage.getItem(STORAGE_KEY) === 'true'
    hydrated.value = true
  }

  const setCollapsed = (value) => {
    collapsed.value = value === true
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, String(collapsed.value))
  }

  const toggleCollapsed = () => setCollapsed(!collapsed.value)

  return { collapsed, setCollapsed, toggleCollapsed }
}
