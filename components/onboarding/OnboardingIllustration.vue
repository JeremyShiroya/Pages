<template>
  <div class="ob-ill" :class="[`size-${size}`, { glow }]" aria-hidden="true">
    <div class="ob-ill-float">
      <img
        v-if="source"
        :src="source"
        alt=""
        width="400"
        height="400"
        decoding="async"
        class="ob-ill-img"
        :style="{ transform: `scale(${fill})` }"
      />
      <!-- Until a 3D check is added, the celebration screen draws its own. -->
      <svg v-else viewBox="0 0 200 200" class="ob-ill-check">
        <defs>
          <linearGradient id="ob-check-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#efe6ff" />
            <stop offset="0.55" stop-color="#c7a8ff" />
            <stop offset="1" stop-color="#8a5cf6" />
          </linearGradient>
          <linearGradient id="ob-check-side" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#7c4ddb" />
            <stop offset="1" stop-color="#4c2a96" />
          </linearGradient>
        </defs>
        <path d="M34 108 l44 44 l92 -98" class="check-side" />
        <path d="M30 100 l44 44 l92 -98" class="check-face" />
      </svg>
    </div>
    <span class="ob-ill-shadow"></span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: String, default: 'large' },
  glow: { type: Boolean, default: false },
})

// Art lives in public/images. Add a file and its name here to use it.
const ILLUSTRATION_SOURCES = {
  welcome: '/images/Book.png',
  account: '/images/Google.png',
  backup: '/images/Copy.png',
  restore: '/images/Find.png',
  books: '/images/Files.png',
  trash: '/images/Trash.png',
  done: null,
}

const source = computed(() => ILLUSTRATION_SOURCES[props.name] || null)

// The source PNGs have a lot of empty canvas, and different amounts of it.
// Scale each so the objects look the same size on screen.
const FILL = { '/images/Book.png': 1.12, '/images/Copy.png': 1.38, '/images/Find.png': 1.36, '/images/Files.png': 1.2, '/images/Trash.png': 1.14, '/images/Google.png': 0.86 }
const fill = computed(() => FILL[source.value] || 1)
</script>

<style scoped>
.ob-ill {
  position: relative;
  display: grid;
  place-items: center;
  margin: 0 auto;
}
.size-large { width: min(68vw, 280px); height: min(68vw, 280px); }
.size-medium { width: min(52vw, 210px); height: min(52vw, 210px); }
.size-small { width: min(34vw, 132px); height: min(34vw, 132px); }

/* A soft halo behind the object on dark screens. */
.glow::before {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 167, 255, 0.38) 0%, rgba(201, 167, 255, 0) 68%);
}

.ob-ill-float {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}
.ob-ill-img,
.ob-ill-check {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  overflow: visible;
}
.ob-ill-check { padding: 14%; }
.check-face,
.check-side {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 30;
}
.check-face { stroke: url(#ob-check-face); }
.check-side { stroke: url(#ob-check-side); }

.ob-ill-shadow {
  position: absolute;
  bottom: 6%;
  left: 50%;
  width: 46%;
  height: 7%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(20, 16, 28, 0.2), rgba(20, 16, 28, 0));
  transform: translateX(-50%);
}
.glow .ob-ill-shadow { background: radial-gradient(closest-side, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0)); }

@media (prefers-reduced-motion: no-preference) {
  .ob-ill-float {
    animation:
      ob-ill-in 0.85s cubic-bezier(0.2, 1.4, 0.35, 1) both,
      ob-ill-float 5.5s ease-in-out 0.85s infinite;
  }
  .ob-ill-shadow { animation: ob-ill-shadow 5.5s ease-in-out 0.85s infinite; }
  .ob-ill-check .check-face,
  .ob-ill-check .check-side {
    stroke-dasharray: 260;
    stroke-dashoffset: 260;
    animation: ob-ill-draw 0.7s cubic-bezier(0.6, 0, 0.3, 1) 0.35s forwards;
  }
}

@keyframes ob-ill-in {
  from { opacity: 0; transform: translateY(18px) scale(0.72) rotate(-8deg); }
  to { opacity: 1; transform: none; }
}
@keyframes ob-ill-float {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-9px) rotate(1.5deg); }
}
@keyframes ob-ill-shadow {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
  50% { transform: translateX(-50%) scale(0.82); opacity: 0.7; }
}
@keyframes ob-ill-draw { to { stroke-dashoffset: 0; } }
</style>
