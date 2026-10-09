import { describe, expect, it } from 'vitest'
import { canSaveProfileDraft, profileDraftChanged } from './profileDraft.js'

const saved = {
  displayName: 'Reader', profileTextMode: 'compliment', bio: '', avatarValue: '/avatar.png',
}

describe('profile draft save state', () => {
  it('enables a changed name and returns to disabled when it matches the saved name', () => {
    expect(canSaveProfileDraft(saved, saved)).toBe(false)
    expect(canSaveProfileDraft({ ...saved, displayName: 'New Reader' }, saved)).toBe(true)
    expect(canSaveProfileDraft({ ...saved, displayName: ' Reader ' }, saved)).toBe(false)
  })

  it('keeps an empty custom bio disabled until text is entered', () => {
    const modeOnly = { ...saved, profileTextMode: 'bio' }
    expect(profileDraftChanged(modeOnly, saved)).toBe(true)
    expect(canSaveProfileDraft(modeOnly, saved)).toBe(false)
    expect(canSaveProfileDraft({ ...modeOnly, displayName: 'New Reader' }, saved)).toBe(false)
    expect(canSaveProfileDraft({ ...modeOnly, bio: 'Books keep me curious.' }, saved)).toBe(true)
  })

  it('ignores hidden bio edits in compliment mode and enables a changed avatar', () => {
    expect(canSaveProfileDraft({ ...saved, bio: 'Hidden draft' }, saved)).toBe(false)
    expect(canSaveProfileDraft({ ...saved, avatarValue: '/another.png' }, saved)).toBe(true)
  })
})
