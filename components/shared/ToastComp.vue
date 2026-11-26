<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <!-- Flat capsule at the top centre with a coloured icon. Tap to dismiss,
           or swipe it away in any direction (left, right, up or down). -->
      <button
        v-for="toast in toasts"
        :key="toast.id"
        type="button"
        class="toast"
        :class="[toast.type, { dragging: drag.id === toast.id && drag.axis, flung: flung.has(toast.id) }]"
        :style="styleFor(toast.id)"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        :aria-label="`${toast.message}. Tap or swipe to dismiss.`"
        @pointerdown="onPointerDown($event, toast.id)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @click="onClick(toast.id)"
      >
        <i class="toast-icon" :class="iconFor(toast.type)" aria-hidden="true"></i>
        <span class="toast-message">{{ toast.message }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useToast } from '~/composables/useToast';

const { toasts, removeToast } = useToast();

const iconFor = (type) => (
  type === 'success' ? 'ri-checkbox-circle-fill'
    : type === 'error' ? 'ri-error-warning-fill'
      : 'ri-information-fill'
);

// ── Swipe to dismiss ──────────────────────────────────────────────────────
// The first 8px of travel decide the axis; past the distance (or a quick
// flick) the toast flies off that way, otherwise it springs back.
const AXIS_LOCK_PX = 8;
const DISMISS_PX = 64;
const FLICK_PX_PER_MS = 0.45;
const FLING_MS = 200;

const drag = reactive({ id: null, pointerId: null, x0: 0, y0: 0, t0: 0, dx: 0, dy: 0, axis: null });
const offsets = reactive({}); // id -> { x, y, opacity, animate }
const flung = ref(new Set());
let suppressClick = false;

const styleFor = (id) => {
  const o = offsets[id];
  if (!o) return undefined;
  return {
    transform: `translate3d(${o.x}px, ${o.y}px, 0)`,
    opacity: o.opacity,
    transition: o.animate ? `transform ${FLING_MS}ms ease-out, opacity ${FLING_MS}ms ease-out` : 'none',
  };
};

const onPointerDown = (event, id) => {
  if (event.button !== undefined && event.button > 0) return;
  Object.assign(drag, { id, pointerId: event.pointerId, x0: event.clientX, y0: event.clientY, t0: performance.now(), dx: 0, dy: 0, axis: null });
  event.currentTarget.setPointerCapture?.(event.pointerId);
};

const onPointerMove = (event) => {
  if (drag.id === null || event.pointerId !== drag.pointerId) return;
  drag.dx = event.clientX - drag.x0;
  drag.dy = event.clientY - drag.y0;
  if (!drag.axis) {
    if (Math.max(Math.abs(drag.dx), Math.abs(drag.dy)) < AXIS_LOCK_PX) return;
    drag.axis = Math.abs(drag.dx) >= Math.abs(drag.dy) ? 'x' : 'y';
  }
  const travel = drag.axis === 'x' ? drag.dx : drag.dy;
  offsets[drag.id] = {
    x: drag.axis === 'x' ? drag.dx : 0,
    y: drag.axis === 'y' ? drag.dy : 0,
    opacity: Math.max(0.25, 1 - Math.abs(travel) / 240),
    animate: false,
  };
};

const finishDrag = (cancelled) => {
  const { id, axis } = drag;
  drag.id = null;
  drag.pointerId = null;
  if (id === null || !axis) return;
  suppressClick = true; // a swipe is not a tap
  const travel = axis === 'x' ? drag.dx : drag.dy;
  const speed = Math.abs(travel) / Math.max(1, performance.now() - drag.t0);
  if (!cancelled && (Math.abs(travel) > DISMISS_PX || speed > FLICK_PX_PER_MS)) {
    const dir = Math.sign(travel) || 1;
    const far = axis === 'x' ? window.innerWidth : 160;
    offsets[id] = { x: axis === 'x' ? dir * far : 0, y: axis === 'y' ? dir * far : 0, opacity: 0, animate: true };
    flung.value = new Set(flung.value).add(id);
    setTimeout(() => {
      removeToast(id);
      delete offsets[id];
      const next = new Set(flung.value);
      next.delete(id);
      flung.value = next;
    }, FLING_MS);
    return;
  }
  // Not far enough: spring back.
  offsets[id] = { x: 0, y: 0, opacity: 1, animate: true };
  setTimeout(() => { if (drag.id !== id) delete offsets[id]; }, FLING_MS);
};

const onPointerUp = (event) => {
  if (event.pointerId !== drag.pointerId) return;
  finishDrag(false);
};

const onPointerCancel = (event) => {
  if (event.pointerId !== drag.pointerId) return;
  finishDrag(true);
};

const onClick = (id) => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  removeToast(id);
};
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

/* Flat, solid capsule. Colours come from the theme tokens, so it follows a
   theme switch the moment it happens. */
.toast {
  --toast-surface: var(--color-surface-modal, #fff);
  --toast-ink: var(--color-text-primary, #111114);
  --toast-border: var(--color-border-card, rgba(60, 60, 67, 0.14));
  --toast-green: #34c759;
  --toast-red: #ff3b30;
  --toast-tint: var(--color-brand-primary);
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(100%, 420px);
  padding: 10px 18px 10px 14px;
  border: 1px solid var(--toast-border);
  border-radius: 999px;
  background: var(--toast-surface);
  color: var(--toast-ink);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

:global(html[data-theme="dark"] .toast-container .toast) {
  --toast-green: #30d158;
  --toast-red: #ff453a;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

.toast.success .toast-icon { color: var(--toast-green); }
.toast.error .toast-icon { color: var(--toast-red); }
.toast.info .toast-icon { color: var(--toast-tint); }

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
  transition: opacity 0.25s ease, transform 0.25s ease;
}

/* A swiped toast already animated itself off screen. */
.toast-leave-active.flung {
  transition: none;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.96);
}

.toast-leave-to {
  opacity: 0;
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
