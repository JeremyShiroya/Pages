// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { wrapSectionHtml, collectChunkSpans } from './useChunkSpans'

describe('offscreen sentence wrapping', () => {
  const html = '<h1>Chapter 1</h1><p>First sentence here. Second <em>one</em> follows.</p><p>Third line.</p>'
  const chunks = ['Chapter 1', 'First sentence here.', 'Second one follows.', 'Third line.']

  it('wraps every sentence in a numbered span without touching the page', () => {
    const before = document.body.innerHTML
    const out = wrapSectionHtml(html, chunks, 10)
    expect(document.body.innerHTML).toBe(before)
    const host = document.createElement('div')
    host.innerHTML = out
    const seen = new Map()
    expect(collectChunkSpans(host, (idx, span) => seen.set(idx, span.textContent))).toBe(4)
    expect([...seen.keys()].sort()).toEqual([10, 11, 12, 13])
    expect(seen.get(11)).toBe('First sentence here.')
    expect(host.querySelector('span[data-tts-chunk] span[data-tts-chunk]')).toBeNull()
    expect(host.textContent).toBe('Chapter 1First sentence here. Second one follows.Third line.')
  })

  it('returns the same wrapped HTML from cache for the same chapter', () => {
    expect(wrapSectionHtml(html, chunks, 10)).toBe(wrapSectionHtml(html, chunks, 10))
    expect(wrapSectionHtml(html, chunks, 20)).toContain('data-tts-chunk="20"')
  })

  it('leaves a chapter without chunks unchanged', () => {
    expect(wrapSectionHtml('<p>x</p>', [], 0)).toBe('<p>x</p>')
  })
})
