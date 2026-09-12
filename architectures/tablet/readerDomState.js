// Tablet reader DOM state is deliberately independent from the phone state.
// Portrait/landscape remounts clear this state before mapping the new surface.
export const createTabletReaderDomState = () => ({
  chunkEls: [],
  activeEl: null,
  activeWordMap: null,
  activeWordMapIdx: -1,
})
