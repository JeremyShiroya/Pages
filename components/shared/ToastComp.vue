<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <!-- Frosted capsule: a small blurred-glass pill at the top centre with a
           coloured icon, as iOS shows "AirPods Connected". Tap to dismiss. -->
      <button
        v-for="toast in toasts"
        :key="toast.id"
        type="button"
        class="toast"
        :class="toast.type"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        :aria-label="`${toast.message}. Tap to dismiss.`"
        @click="removeToast(toast.id)"
      >
        <i class="toast-icon" :class="iconFor(toast.type)" aria-hidden="true"></i>
        <span class="toast-message">{{ toast.message }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '~/composables/useToast';

const { toasts, removeToast } = useToast();

const iconFor = (type) => (
  type === 'success' ? 'ri-checkbox-circle-fill'
    : type === 'error' ? 'ri-error-warning-fill'
      : 'ri-information-fill'
);
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 12px);
  right: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
}

/* Glassmorphism: a mostly see-through pane that blurs and saturates whatever
   is behind it, with a light rim and a soft top highlight like real glass. */
.toast {
  --toast-glass: rgba(255, 255, 255, 0.42);
  --toast-rim: rgba(255, 255, 255, 0.65);
  --toast-sheen: rgba(255, 255, 255, 0.55);
  --toast-ink: #111114;
  --toast-hairline: rgba(60, 60, 67, 0.1);
  --toast-green: #34c759;
  --toast-red: #ff3b30;
  --toast-blue: #007aff;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(100%, 420px);
  padding: 10px 18px 10px 14px;
  border: 1px solid var(--toast-rim);
  border-radius: 999px;
  background:
    linear-gradient(180deg, var(--toast-sheen) 0%, transparent 55%),
    var(--toast-glass);
  color: var(--toast-ink);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.14),
    0 0 0 0.5px var(--toast-hairline),
    inset 0 1px 0 var(--toast-sheen);
  backdrop-filter: blur(28px) saturate(1.8);
  -webkit-backdrop-filter: blur(28px) saturate(1.8);
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

:global(html[data-theme="dark"] .toast-container .toast) {
  --toast-glass: rgba(40, 40, 42, 0.45);
  --toast-rim: rgba(255, 255, 255, 0.14);
  --toast-sheen: rgba(255, 255, 255, 0.1);
  --toast-ink: #f5f5f7;
  --toast-hairline: rgba(84, 84, 88, 0.55);
  --toast-green: #30d158;
  --toast-red: #ff453a;
  --toast-blue: #0a84ff;
}

.toast.success .toast-icon { color: var(--toast-green); }
.toast.error .toast-icon { color: var(--toast-red); }
.toast.info .toast-icon { color: var(--toast-blue); }

.toast-icon {
  flex: none;
  font-size: 18px;
  line-height: 1;
}

.toast-message {
  font-size: 14px;
  font-weight: 450 !important;
  line-height: 1.3;
}

/* Drops in from under the status bar with a slight spring. */
.toast-enter-active {
  transition: opacity 0.3s ease, transform 0.45s cubic-bezier(0.2, 1.25, 0.4, 1);
}

.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease, filter 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.96);
}

.toast-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(-8px) scale(0.98);
}

.toast-move {
  transition: transform 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.2s ease;
  }
}
</style>
