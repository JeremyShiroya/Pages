<template>
  <NuxtLayout>
    <NuxtPage />
    <ToastComp />
    <SpeechDownloadStatus />
    <DevicePermissionModal />
    <AppUpdateModal />
    <BackupPrompt />
  </NuxtLayout>
</template>

<script setup>
// The first-boot format choice now lives in the setup flow (pages/welcome.vue),
// which middleware/onboarding.global.js opens on first launch.
import AppUpdateModal from '~/components/shared/AppUpdateModal.vue'
import BackupPrompt from '~/components/shared/BackupPrompt.vue'
import DevicePermissionModal from '~/components/shared/DevicePermissionModal.vue'
import ToastComp from '~/components/shared/ToastComp.vue'
import SpeechDownloadStatus from '~/components/shared/SpeechDownloadStatus.vue'
</script>
