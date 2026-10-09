<template>
  <main class="profile-page">
    <MobileSettingsNav title="Edit Profile" back-to="/profile" aria-label="Edit profile navigation" />

    <section class="profile-hero" aria-label="Profile details">
      <div class="profile-identity">
        <button
          class="profile-avatar-button"
          type="button"
          aria-label="Choose avatar"
          @click="avatarSourceOpen = true"
        >
          <span class="profile-avatar-ring">
            <img :src="profileAvatarSrc" :alt="`${profile.displayName} avatar`" />
          </span>
          <span class="avatar-edit-badge"><i class="ri-camera-line"></i></span>
        </button>

        <div class="profile-title">
          <p>Your reading profile</p>
          <h2>{{ profileDraftName || 'Reader' }}</h2>
        </div>
      </div>

      <div class="profile-form-card">
        <label class="profile-field" for="profile-display-name">
          <span>Display name</span>
          <div class="profile-name-control">
            <input
              id="profile-display-name"
              v-model="profileDraftName"
              type="text"
              maxlength="32"
              placeholder="Reader"
              @keyup.enter="saveProfileDetails"
            />
          </div>
        </label>

        <!-- The avatar is changed by tapping the camera badge on the avatar
             itself, so a separate "Change avatar" button was redundant — as was
             the check button beside the name input, which did what Save does. -->
        <fieldset class="profile-text-choice">
          <legend>Profile message</legend>
          <label><input v-model="profileTextModeDraft" type="radio" value="compliment" @change="chooseProfileTextMode" /> Daily compliments</label>
          <label><input v-model="profileTextModeDraft" type="radio" value="bio" @change="chooseProfileTextMode" /> My own bio</label>
        </fieldset>
        <label v-if="profileTextModeDraft === 'bio'" class="profile-field" for="profile-bio">
          <span>Bio · {{ bioDraft.length }}/240</span>
          <textarea id="profile-bio" v-model="bioDraft" maxlength="240" rows="3" placeholder="Write something about yourself and your reading..." />
        </label>
        <p v-if="bioError" class="profile-bio-error" role="alert">{{ bioError }}</p>

        <div class="profile-actions">
          <button class="profile-action primary" type="button" :disabled="!canSaveProfile" @click="saveProfileDetails">
            <i class="ri-save-3-line"></i>
            <span>Save profile</span>
          </button>
        </div>
      </div>
    </section>

    <section class="appearance-panel" aria-labelledby="appearance-title">
      <div>
        <h2 id="appearance-title">Appearance</h2>
        <p>This is how your profile appears when Avatar and greeting is selected.</p>
      </div>

      <div class="profile-preview-card">
        <img :src="profileAvatarSrc" :alt="`${profileDraftName || 'Reader'} preview avatar`" />
        <div>
          <span>Welcome back</span>
          <strong>{{ firstName }}</strong>
        </div>
        <i class="ri-arrow-right-s-line"></i>
      </div>
    </section>

    <AvatarSourcePicker :open="avatarSourceOpen" @close="avatarSourceOpen = false" @presets="openPresetPicker" @cropped="saveGalleryAvatar" />

    <Teleport to="body">
      <div v-if="avatarModalOpen" class="avatar-modal-layer" role="presentation">
        <button class="avatar-modal-backdrop" type="button" aria-label="Close avatar picker" @click="avatarModalOpen = false"></button>
        <section class="avatar-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-title">
          <header>
            <div>
              <h2 id="avatar-modal-title">Choose an avatar</h2>
              <p>Select the image Pages uses for your profile.</p>
            </div>
            <button type="button" aria-label="Close avatar picker" @click="avatarModalOpen = false">
              <i class="ri-close-line"></i>
            </button>
          </header>

          <div class="avatar-grid">
            <button
              v-for="avatar in avatarPresets"
              :key="avatar.id"
              type="button"
              :aria-label="`Use ${avatar.label}`"
              :class="{ active: selectedAvatar === avatar.src }"
              @click="selectAvatar(avatar.src)"
            >
              <img :src="avatar.src" :alt="avatar.label" />
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from '~/composables/useToast'
import { useUserProfile } from '~/composables/useUserProfile'
import { canSaveProfileDraft, profileDraftChanged } from '~/utils/profileDraft'
import AvatarSourcePicker from '~/components/shared/AvatarSourcePicker.vue'

const { addToast } = useToast()
const {
  profile,
  avatarPresets,
  activeAvatarPreset,
  loadProfile,
  updateProfile,
} = useUserProfile()

const avatarSourceOpen = ref(false)
const avatarModalOpen = ref(false)
const profileDraftName = ref('Reader')
const profileTextModeDraft = ref('compliment')
const bioDraft = ref('')
const bioError = ref('')
const savingProfile = ref(false)
const selectedAvatar = ref('/images/User%20Avatars/default-user.jpeg')
const savedProfile = ref({ ...profile.value })
const draftInitialized = ref(false)

const profileAvatarSrc = computed(() => {
  return selectedAvatar.value || activeAvatarPreset.value.src
})

const firstName = computed(() => {
  return profileDraftName.value.trim().split(/\s+/)[0] || 'Reader'
})

const profileDraft = computed(() => ({
  displayName: profileDraftName.value,
  profileTextMode: profileTextModeDraft.value,
  bio: bioDraft.value,
  avatarValue: selectedAvatar.value,
}))
const canSaveProfile = computed(() => !savingProfile.value && canSaveProfileDraft(profileDraft.value, savedProfile.value))

const syncProfileDraft = (nextProfile = profile.value) => {
  savedProfile.value = { ...nextProfile }
  profileDraftName.value = nextProfile.displayName || 'Reader'
  profileTextModeDraft.value = nextProfile.profileTextMode || 'compliment'
  bioDraft.value = nextProfile.bio || ''
  bioError.value = ''
  selectedAvatar.value = nextProfile.avatarValue || '/images/User%20Avatars/default-user.jpeg'
}

const persistProfile = async (patch, toastMessage) => {
  savingProfile.value = true
  try {
    await updateProfile({
      displayName: profileDraftName.value,
      avatarType: 'image',
      avatarValue: selectedAvatar.value,
      ...patch,
    })
    syncProfileDraft()
    if (toastMessage) addToast(toastMessage, 'success')
  } catch (error) {
    console.error('[Profile] Failed to save profile:', error)
    addToast(error?.message || 'Could not save profile', 'error')
  } finally {
    savingProfile.value = false
  }
}

const saveProfileDetails = () => {
  if (!canSaveProfile.value) return
  if (profileTextModeDraft.value === 'bio' && !bioDraft.value.trim()) {
    bioError.value = 'Write a bio before selecting My own bio.'
    return
  }
  bioError.value = ''
  return persistProfile({
    profileTextMode: profileTextModeDraft.value,
    bio: bioDraft.value,
  }, 'Profile updated')
}

const chooseProfileTextMode = async () => {
  const mode = profileTextModeDraft.value
  if (savingProfile.value || mode === savedProfile.value.profileTextMode) return
  if (mode === 'bio' && !bioDraft.value.trim()) return
  savingProfile.value = true
  try {
    await updateProfile({ profileTextMode: mode })
    savedProfile.value = { ...profile.value }
    bioError.value = ''
  } catch (error) {
    profileTextModeDraft.value = savedProfile.value.profileTextMode
    addToast(error?.message || 'Could not update profile message', 'error')
  } finally {
    savingProfile.value = false
  }
}

const selectAvatar = async (avatarSrc) => {
  selectedAvatar.value = avatarSrc
  avatarModalOpen.value = false
  await persistProfile({ avatarValue: avatarSrc }, 'Avatar updated')
}

const openPresetPicker = () => {
  avatarSourceOpen.value = false
  avatarModalOpen.value = true
}

const saveGalleryAvatar = async (cropped) => {
  savingProfile.value = true
  try {
    await updateProfile({ displayName: profileDraftName.value, avatarType: 'image', avatarValue: cropped })
    syncProfileDraft(profile.value)
    avatarSourceOpen.value = false
    addToast('Profile photo updated', 'success')
  } catch (error) {
    addToast(error?.message || 'Could not update profile photo', 'error')
  } finally {
    savingProfile.value = false
  }
}

watch(profile, (nextProfile) => {
  const preserveDraft = draftInitialized.value && profileDraftChanged(profileDraft.value, savedProfile.value)
  savedProfile.value = { ...nextProfile }
  if (!preserveDraft) syncProfileDraft(nextProfile)
  draftInitialized.value = true
}, { immediate: true })

onMounted(async () => {
  await loadProfile()
})
</script>

<style scoped>
.profile-text-choice {
  display: flex;
  flex-wrap: wrap;
  gap: .65rem 1rem;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--color-text-secondary);
  font-size: .84rem;
}
.profile-text-choice legend {
  width: 100%;
  margin-bottom: .35rem;
  color: var(--color-text-muted);
  font-size: .8rem;
}
.profile-text-choice label { display: inline-flex; align-items: center; gap: .4rem; cursor: pointer; }
.profile-text-choice input { accent-color: var(--color-brand-primary); }
.profile-field textarea {
  width: 100%;
  min-height: 82px;
  padding: .75rem .9rem;
  border: 1px solid var(--color-border-subtle);
  border-radius: 9px;
  background: var(--color-surface-input);
  color: var(--color-text-primary);
  font: inherit;
  resize: vertical;
}
.profile-bio-error { margin: 0; color: var(--color-text-danger, #b42318); font-size: .8rem; }
.profile-page {
  width: 100%;
  min-height: calc(100vh - 88px - env(safe-area-inset-bottom));
  background: var(--color-settings-background);
  color: var(--color-text-primary);
}

.profile-hero,
.appearance-panel {
  border-radius: 14px;
}

.profile-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(280px, 1fr);
  gap: 1.25rem;
  align-items: stretch;
  padding: 1.1rem;
}

.profile-identity {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 0;
  gap: 1.2rem;
  padding: 0.5rem;
}

.profile-avatar-button {
  position: relative;
  width: 112px;
  height: 112px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.profile-avatar-ring {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  padding: 6px;
  background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.profile-avatar-ring img {
  width: 100%;
  height: 100%;
  border: 4px solid var(--color-background-app);
  border-radius: 50%;
  object-fit: cover;
  background: var(--color-surface-primary);
}

.avatar-edit-badge {
  position: absolute;
  right: 2px;
  bottom: 10px;
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-background-app);
  border-radius: 50%;
  background: var(--color-brand-primary);
  color: var(--color-text-on-brand);
}

.profile-title p,
.profile-title h2,
.appearance-panel h2,
.appearance-panel p,
.avatar-modal h2,
.avatar-modal p {
  margin: 0;
}

.profile-title p {
  color: var(--color-brand-primary-hover);
  font-size: 0.82rem;
}

.profile-title h2 {
  margin-top: 0.25rem;
  color: var(--color-text-primary);
  font-size: clamp(1.75rem, 4vw, 2.6rem);
  line-height: 1.02;
}

.appearance-panel p,
.avatar-modal p {
  display: block;
  margin-top: 0.4rem;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

.profile-form-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  border: 0;
  border-radius: 12px;
  padding: 1rem;
  background: var(--color-settings-group, var(--color-surface-primary));
}

.profile-field {
  display: block;
  min-width: 0;
}

.profile-field > span {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.profile-name-control {
  display: grid;
}

.profile-name-control input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 0;
  border-radius: 9px;
  background: var(--color-surface-input);
  color: var(--color-text-primary);
  padding: 0 0.9rem;
}

.profile-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: var(--color-surface-card);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.profile-actions {
  display: grid;
  gap: 0.6rem;
}

.profile-action {
  min-height: 44px;
  gap: 0.45rem;
  padding: 0 0.8rem;
}

.profile-action.primary {
  border-color: var(--color-brand-primary);
  background: var(--color-brand-primary);
  color: var(--color-text-on-brand);
}
.profile-action.primary:disabled {
  border-color: var(--color-border-subtle);
  background: var(--color-surface-secondary);
  color: var(--color-text-muted);
  cursor: default;
  box-shadow: none;
}

.appearance-panel {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 1rem;
  align-items: center;
  padding: 1rem;
}

.appearance-panel h2 {
  color: var(--color-text-primary);
  font-size: 1.1rem;
}

.profile-preview-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 0.75rem;
  min-height: 68px;
  border: 0;
  border-radius: 12px;
  padding: 0.65rem;
  background: var(--color-settings-group, var(--color-surface-primary));
}

.profile-preview-card img {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-preview-card div {
  min-width: 0;
}

.profile-preview-card span,
.profile-preview-card strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-preview-card span {
  color: var(--color-text-muted);
  font-size: 0.76rem;
}

.profile-preview-card strong {
  color: var(--color-text-primary);
  font-size: 1rem;
}

.profile-preview-card i {
  color: var(--color-text-muted);
}

.avatar-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 1250;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.avatar-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.42);
}

.avatar-modal {
  position: relative;
  width: min(100%, 520px);
  max-height: min(78vh, 620px);
  overflow: auto;
  border-radius: 18px 18px 0 0;
  background: var(--color-background-app);
  padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
  box-shadow: var(--shadow-modal);
}

.avatar-modal header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.avatar-modal h2 {
  color: var(--color-text-primary);
  font-size: 1.05rem;
}

.avatar-modal header button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: var(--color-surface-input);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.2rem;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.avatar-grid button {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 16px;
  background: var(--color-surface-input);
  cursor: pointer;
  padding: 0.45rem;
  color: var(--color-text-secondary);
}

.avatar-grid button.active {
  border-color: var(--color-brand-primary);
  background: var(--color-brand-primary-faint);
}

.avatar-grid img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  object-fit: cover;
}

  .profile-page {
    font-family: var(--mobile-font-family);
  }

  .profile-hero,
  .appearance-panel {
    grid-template-columns: 1fr;
    border-radius: var(--mobile-card-radius);
    padding: 16px;
  }

  .profile-hero {
    gap: 16px;
  }

  .profile-identity {
    flex-direction: row;
    align-items: center;
    min-height: 0;
    gap: 16px;
    padding: 0;
  }

  .profile-avatar-button {
    width: 116px;
    height: 116px;
  }

  .profile-title p,
  .profile-title span,
  .appearance-panel p,
  .avatar-modal p {
    font-size: var(--mobile-subtext-size);
  }

  .profile-title h2 {
    font-size: 28px;
    line-height: 1.08;
  }

  .profile-form-card {
    gap: 16px;
    border-radius: var(--mobile-control-radius);
    padding: 16px;
  }

  .profile-field > span {
    font-size: var(--mobile-subtext-size);
  }

  .profile-name-control input {
    min-height: var(--mobile-touch-target);
    border-radius: var(--mobile-control-radius);
    padding: 0 12px;
    font-size: var(--mobile-body-size);
  }

  .profile-action {
    border-radius: var(--mobile-control-radius);
    font-size: var(--mobile-body-size);
  }

  .profile-actions {
    gap: 8px;
  }

  .profile-action {
    min-height: var(--mobile-touch-target);
  }

  .appearance-panel {
    gap: 16px;
    margin-top: 16px;
  }

  .appearance-panel h2 {
    font-size: var(--mobile-section-title-size);
    line-height: 1.25;
  }

  .profile-preview-card {
    grid-template-columns: var(--mobile-list-icon-size) minmax(0, 1fr) 20px;
    gap: 12px;
    min-height: 68px;
    border-radius: var(--mobile-control-radius);
    padding: 12px;
  }

  .profile-preview-card img {
    width: var(--mobile-list-icon-size);
    height: var(--mobile-list-icon-size);
  }

  .profile-preview-card span {
    font-size: var(--mobile-caption-size);
  }

  .profile-preview-card strong {
    font-size: var(--mobile-body-size);
  }

  .avatar-modal {
    border-radius: var(--mobile-card-radius) var(--mobile-card-radius) 0 0;
    padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  }

  .avatar-modal h2 {
    font-size: var(--mobile-section-title-size);
  }

  .avatar-modal header button {
    width: var(--mobile-touch-target);
    height: var(--mobile-touch-target);
    font-size: var(--mobile-icon-size);
  }

  .avatar-grid {
    gap: 12px;
  }

  .avatar-grid button {
    border-radius: var(--mobile-panel-radius);
    padding: 8px;
  }

@media (max-width: 430px) {
  .avatar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

</style>
