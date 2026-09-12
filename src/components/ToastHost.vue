<script setup lang="ts">
import type { Component } from 'vue'
import { useToasts, toast, type ToastKind } from '../composables/toast'
import {
  SuccessFilled,
  CircleCloseFilled,
  WarningFilled,
  InfoFilled,
  Close,
} from '@element-plus/icons-vue'

const { toasts } = useToasts()

const icons: Record<ToastKind, Component> = {
  success: SuccessFilled,
  error: CircleCloseFilled,
  warning: WarningFilled,
  info: InfoFilled,
}

function iconFor(kind: ToastKind): Component {
  return icons[kind]
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-host" aria-live="polite">
      <div
        v-for="item in toasts"
        :key="item.id"
        class="toast"
        :class="`toast-${item.kind}`"
        role="status"
      >
        <component :is="iconFor(item.kind)" class="icon toast-icon" />
        <span class="toast-message">{{ item.message }}</span>
        <button class="toast-close" aria-label="关闭提示" @click="toast.dismiss(item.id)">
          <Close class="icon" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
