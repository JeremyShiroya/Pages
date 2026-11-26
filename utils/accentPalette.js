// The accent colours offered on the Theme page (and reused for highlights).
// `light` / `dark` are the swatch shown in each theme and mirror the palettes
// in assets/css/main.css (`:root[data-accent=…]`), which is what actually
// recolours the app. Black & White ("mono") is drawn half and half.
export const ACCENT_SWATCHES = Object.freeze([
  { id: 'purple', label: 'Purple', light: '#8a2be2', dark: '#a855f7' },
  { id: 'pastel-purple', label: 'Pastel Purple', light: '#a685e2', dark: '#c9b3f5' },
  { id: 'pastel-blue', label: 'Pastel Blue', light: '#5f9fd8', dark: '#a9cdf0' },
  { id: 'pastel-pink', label: 'Pastel Pink', light: '#e2789f', dark: '#f4a7c4' },
  { id: 'pastel-yellow', label: 'Pastel Yellow', light: '#d4b13e', dark: '#f3df8f' },
  { id: 'burgundy', label: 'Burgundy', light: '#8c1c3a', dark: '#c94b64' },
  { id: 'sage', label: 'Sage', light: '#6f8f6a', dark: '#9cb897' },
  { id: 'green', label: 'Green', light: '#2ea44f', dark: '#30d158' },
  { id: 'pastel-green', label: 'Pastel Green', light: '#5fb87e', dark: '#98e0ad' },
  {
    id: 'mono',
    label: 'Black & White',
    light: 'linear-gradient(135deg, #1c1c1e 50%, #f2f2f7 50%)',
    dark: 'linear-gradient(135deg, #1c1c1e 50%, #f2f2f7 50%)',
    // Solid colours where a gradient cannot go (the selection ring, a highlight).
    ring: '#8e8e93',
    solidLight: '#1c1c1e',
    solidDark: '#f2f2f7',
  },
])

export const accentLabel = (id) => ACCENT_SWATCHES.find((accent) => accent.id === id)?.label || 'Purple'

// One solid colour per accent and theme (for highlights and other tints).
export const accentSolid = (id, dark) => {
  const accent = ACCENT_SWATCHES.find((item) => item.id === id) || ACCENT_SWATCHES[0]
  return dark ? (accent.solidDark || accent.dark) : (accent.solidLight || accent.light)
}
