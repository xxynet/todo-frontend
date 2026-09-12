<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps<{
  open: boolean
  title: string
  width?: string
}>()

const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
    } else {
      window.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay modal-overlay-center"
      @mousedown.self="emit('close')"
    >
      <div class="modal-card" role="dialog" aria-modal="true" :style="{ maxWidth: width || '520px' }">
        <header class="modal-header">
          <h3>{{ title }}</h3>
          <button class="modal-close" aria-label="关闭" @click="emit('close')">
            <Close class="icon" />
          </button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
