<template>
  <!-- Alert card: a left-aligned title and message, then plain text buttons
       at the bottom right — Cancel in the normal ink, Delete in red. -->
  <div class="delete-overlay" role="presentation" @click="closeModal">
    <section
      class="delete-sheet"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      @click.stop
    >
      <div class="delete-body">
        <h2 id="delete-title">{{ isBulk ? `Delete ${count} Books` : 'Delete Book' }}</h2>
        <!-- Books imported from the phone's storage own the original file, so
             the message says that file goes too: deleting it is permanent. -->
        <p id="delete-description" class="delete-description">
          Are you sure you want to delete {{ isBulk ? 'these books' : 'this book' }}{{ removesDeviceFile ? ` and ${isBulk ? 'their' : 'its'} ${formatLabel} file on your device` : '' }}? Once deleted, {{ isBulk ? 'they' : 'it' }} cannot be restored.
        </p>
      </div>

      <div class="delete-actions">
        <button type="button" class="delete-cancel" @click="closeModal">Cancel</button>
        <button type="button" class="delete-confirm" @click="confirmDelete">Delete</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'

const props = defineProps({
  book: {
    type: Object,
    required: true,
  },
  // Bulk delete reuses this sheet with the first selected book as the face of
  // the pile: the warning and its list of consequences are identical, and a
  // second near-copy of them would be the thing that drifts.
  count: {
    type: Number,
    default: 1,
  },
})

const emit = defineEmits(['close', 'confirm'])

const isBulk = computed(() => props.count > 1)

const formatLabel = computed(() => (props.book.format || 'book').toUpperCase())

// Books auto-imported from device storage own the original document on the
// phone; deleting the book deletes that file too.
const removesDeviceFile = computed(() => Boolean(
  props.book.deviceImport && props.book.deviceImportPath && isNativeCapacitorPlatform(),
))

const closeModal = () => emit('close')
const confirmDelete = () => emit('confirm')
</script>

<style scoped>
.delete-overlay {
  --dc-bg: #f2f2f7;
  --dc-text: #000000;
  --dc-press: rgba(0, 0, 0, 0.06);
  --dc-red: #ff3b30;
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
  font-family: var(--mobile-font-family);
  animation: dc-fade 0.18s ease both;
}

:global(html[data-theme="dark"] .delete-overlay) {
  --dc-bg: #2c2c2e;
  --dc-text: #ffffff;
  --dc-press: rgba(255, 255, 255, 0.08);
  --dc-red: #ff453a;
}

.delete-sheet {
  width: 100%;
  max-width: 400px;
  overflow: hidden;
  padding: 26px 24px 14px;
  border-radius: 28px;
  background: var(--dc-bg);
  color: var(--dc-text);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
  animation: dc-pop 0.24s cubic-bezier(0.2, 1.2, 0.4, 1) both;
}

.delete-body {
  text-align: left;
}

.delete-body h2 {
  margin: 0 0 14px;
  color: var(--dc-text);
  font-size: 20px;
  font-weight: 400 !important;
  line-height: 1.25;
}

.delete-description {
  margin: 0;
  color: var(--dc-text);
  font-size: 16px;
  line-height: 1.45;
}

.delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 26px;
}

.delete-confirm,
.delete-cancel {
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  font: inherit;
  font-size: 17px;
  font-weight: 400 !important;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.delete-cancel {
  color: var(--dc-text);
}

.delete-confirm {
  color: var(--dc-red);
}

.delete-confirm:active,
.delete-cancel:active {
  background: var(--dc-press);
}

@keyframes dc-fade { from { opacity: 0; } }
@keyframes dc-pop { from { opacity: 0; transform: scale(1.06); } }

@media (prefers-reduced-motion: reduce) {
  .delete-overlay,
  .delete-sheet { animation: none; }
}
</style>
