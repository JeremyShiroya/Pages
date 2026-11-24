<template>
  <main class="settings-detail-page">
    <MobileSettingsNav title="Backup" back-to="/settings/storage" aria-label="Settings navigation" />
    <BackupSettingsPanel />
  </main>
</template>

<script setup>
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import BackupSettingsPanel from '~/components/shared/BackupSettingsPanel.vue'
</script>

<style scoped>
.settings-detail-page {
  width: 100%;
  min-height: 100vh;
  min-width: 0;
  background: var(--color-settings-background);
}
</style>
