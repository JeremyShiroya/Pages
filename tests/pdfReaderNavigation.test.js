import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, ref, nextTick } from 'vue'
const flushPromises = async () => { for (let i = 0; i < 12; i++) { await new Promise(resolve => setTimeout(resolve, 0)); await nextTick() } }
const mount = (component, { props }) => {
  const root = document.createElement('div')
  document.body.append(root)
  const exposed = ref(null)
  const app = createApp({ render: () => h(component, { ...props, ref: exposed }) })
  app.mount(root)
  const element = el => ({
    isVisible: () => el?.style.display !== 'none',
    exists: () => !!el,
    attributes: name => el?.getAttribute(name) ?? undefined,
    trigger: async name => { el.dispatchEvent(new Event(name, { bubbles: true })); await nextTick() },
  })
  return {
    get vm() { return exposed.value },
    find: selector => element(root.querySelector(selector)),
    get: selector => element(root.querySelector(selector)),
    findAll: selector => [...root.querySelectorAll(selector)].map(element),
    unmount: () => { app.unmount(); root.remove() },
  }
}
import PdfViewer from '../components/shared/PdfViewer.vue'

vi.mock('pdfjs-dist', () => ({
  TextLayer: null,
  GlobalWorkerOptions: {},
  getDocument: () => ({ promise: Promise.resolve({
    numPages: 3,
    getPage: async () => ({
      getViewport: ({ scale }) => ({ width: 400 * scale, height: 600 * scale, transform: [scale, 0, 0, -scale, 0, 600 * scale] }),
      render: () => ({ promise: Promise.resolve() }),
    }),
  }) }),
}))

let wrapper
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform() {}, drawImage() {} })
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('original PDF continuous pages', () => {
  it('keeps every page in the strip and can scroll directly to a selected page', async () => {
    wrapper = mount(PdfViewer, { props: {
      src: new Uint8Array([1]),
      manifest: { pages: [], chunks: [{ id: 8, page: 3, text: 'Third page.' }] },
    } })
    await flushPromises()
    expect(wrapper.findAll('.pdf-page-wrap').filter(page => page.isVisible())).toHaveLength(3)
    expect(wrapper.find('.pdf-page-nav').exists()).toBe(false)
    const scrollIntoView = vi.fn()
    document.getElementById('pdf-page-3').scrollIntoView = scrollIntoView
    wrapper.vm.scrollToPage(3, 'instant')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' })
  })

})
