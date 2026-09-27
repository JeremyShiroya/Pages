<template>
  <span class="actions-preview" :class="`mode-${mode}`" aria-hidden="true">
    <span class="mock-cover"></span>
    <span class="mock-copy">
      <span class="mock-title"></span>
      <span class="mock-line short"></span>
      <span class="mock-line"></span>
      <span v-if="mode === 'visible'" class="mock-actions">
        <i class="ri-heart-fill favourite-heart-icon"></i>
        <i class="ri-play-list-2-line"></i>
        <i class="ri-edit-line"></i>
      </span>
    </span>
    <span v-if="mode === 'minimal'" class="mock-more">
      <i class="ri-more-2-fill"></i>
    </span>
  </span>
</template>

<script setup>
defineProps({
  mode: {
    type: String,
    default: 'minimal',
  },
})
</script>

<style scoped>
.actions-preview {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 9px;
  width: 100%;
  height: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #39294b, #17121f);
}

.mock-cover {
  flex: 0 0 38px;
  border-radius: 4px;
  background: linear-gradient(145deg, #a168dd, #59317f);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.28);
}

.mock-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  padding-top: 3px;
}

.mock-title,
.mock-line {
  display: block;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
}

.mock-title { width: 76%; height: 7px; }
.mock-line { width: 62%; background: rgba(255, 255, 255, 0.38); }
.mock-line.short { width: 45%; }

.mock-actions {
  display: flex;
  gap: 4px;
  margin-top: auto;
}

.mock-actions i,
.mock-more {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 5px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
}

.mock-more {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
