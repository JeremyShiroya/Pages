// Phone reader DOM state is deliberately owned by the mobile architecture.
// It must never retain spans created by a tablet reading surface.
export const createMobileReaderDomState = () => ({
  chunkEls: [],
  activeEl: null,
  activeWordMap: null,
  activeWordMapIdx: -1,
})
