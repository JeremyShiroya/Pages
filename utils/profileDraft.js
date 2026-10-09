const trimmed = (value) => String(value || '').trim()

export function profileDraftChanged(draft, saved) {
  return trimmed(draft.displayName) !== trimmed(saved.displayName)
    || draft.profileTextMode !== saved.profileTextMode
    || (draft.profileTextMode === 'bio' && trimmed(draft.bio) !== trimmed(saved.bio))
    || draft.avatarValue !== saved.avatarValue
}

export function canSaveProfileDraft(draft, saved) {
  return Boolean(trimmed(draft.displayName))
    && (draft.profileTextMode !== 'bio' || Boolean(trimmed(draft.bio)))
    && profileDraftChanged(draft, saved)
}
