// @vitest-environment node
import { IDBFactory } from 'fake-indexeddb'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineNuxtPlugin', (plugin) => plugin)
const { isRenderError, isChunkLoadError } = await import('../plugins/00.app-errors.client.js')
const { openLibraryDB, LIBRARY_DB_NAME } = await import('../composables/useLibraryStore')

describe('startup error containment', () => {
  it('treats only setup/render failures as fatal', () => {
    expect(isRenderError('https://vuejs.org/error-reference/#runtime-0')).toBe(true)
    expect(isRenderError('https://vuejs.org/error-reference/#runtime-1')).toBe(true)
    expect(isRenderError('render function')).toBe(true)
    // mounted hook, watcher callback, native event handler
    expect(isRenderError('https://vuejs.org/error-reference/#runtime-m')).toBe(false)
    expect(isRenderError('https://vuejs.org/error-reference/#runtime-3')).toBe(false)
    expect(isRenderError('https://vuejs.org/error-reference/#runtime-5')).toBe(false)
    expect(isRenderError('mounted hook')).toBe(false)
  })

  it('recognises missing code chunks', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://localhost/_nuxt/x.js'))).toBe(true)
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true)
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
  })

  it('ships an in-app recovery screen instead of the framework error page', () => {
    const page = readFileSync(new URL('../error.vue', import.meta.url), 'utf8')
    expect(page).toContain('clearError')
    expect(page).toContain('Go to library')
  })
})

describe('library database', () => {
  beforeEach(() => { globalThis.indexedDB = new IDBFactory() })

  it('still opens a database created by a newer release', async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(LIBRARY_DB_NAME, 99)
      request.onupgradeneeded = () => request.result.createObjectStore('books', { keyPath: 'id' })
      request.onsuccess = () => { request.result.close(); resolve() }
      request.onerror = () => reject(request.error)
    })
    const db = await openLibraryDB()
    expect(db.version).toBe(99)
    expect([...db.objectStoreNames]).toContain('books')
    db.close()
  })
})
