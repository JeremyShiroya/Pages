export const TABLET_DEVICE_ARCHITECTURE = Object.freeze({
  kind: 'tablet',
  readerSurface: 'tablet',
  navigationSurface: 'tablet',
  presentationForOrientation: orientation => (
    orientation === 'portrait' ? 'tablet-portrait' : 'tablet-landscape'
  ),
})
