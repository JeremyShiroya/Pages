<template>
  <NuxtLink to="/settings/backup" class="backup-row" :class="`tone-${status.tone}`">
    <span class="backup-row-icon"><i :class="[status.icon, { spin: run.running && run.kind === 'backup' }]"></i></span>
    <span class="backup-row-copy">
      <strong>Backup</strong>
      <span>{{ subtitle }}</span>
    </span>
    <i class="ri-arrow-right-s-line backup-row-chevron"></i>
  </NuxtLink>
</template>

<script setup>
import { computed } from 'vue'
import { useAccount } from '~/composables/useAccount'
import { formatRelativeTime, useCloudBackup } from '~/composables/useCloudBackup'

const { signedIn } = useAccount()
const { status, prefs, run } = useCloudBackup()

const subtitle = computed(() => {
  if (!signedIn.value) return 'Off · create an account to back up your library'
  if (run.running && run.kind === 'backup') return run.phase || 'Backing up…'
  if (prefs.value.lastError) return prefs.value.lastError
  return `${status.value.label} · ${formatRelativeTime(prefs.value.lastBackupAt).toLowerCase()}`
})
</script>

<style scoped>
.backup-row {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 760px;
  margin: 16px auto 0;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--color-settings-group);
  color: var(--color-text-primary);
  font-family: var(--mobile-font-family);
  text-decoration: none;
  transition: transform .15s ease;
}
.backup-row:active { transform: scale(.985); }
.backup-row-icon { display: grid; flex: none; place-items: center; width: 42px; height: 42px; border-radius: 50%; background: var(--color-brand-primary-soft); color: var(--color-brand-primary); font-size: 21px; }
.tone-ok .backup-row-icon { background: rgba(22, 163, 74, .12); color: #16a34a; }
.tone-error .backup-row-icon { background: rgba(220, 38, 38, .12); color: #dc2626; }
.backup-row-copy { display: grid; flex: 1; gap: 2px; min-width: 0; }
.backup-row-copy strong { font-size: 15px; }
.backup-row-copy span { overflow: hidden; color: var(--color-text-muted); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.backup-row-chevron { color: var(--color-text-muted); font-size: 22px; }
.spin { display: inline-block; animation: backup-row-spin 1s linear infinite; }
@keyframes backup-row-spin { to { transform: rotate(360deg); } }
</style>
