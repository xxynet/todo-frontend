<script setup lang="ts">
import { settleConfirm, useConfirmState } from '../composables/confirm'

const state = useConfirmState()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.visible"
      class="modal-overlay modal-overlay-center"
      @mousedown.self="settleConfirm(false)"
    >
      <div class="modal-card confirm-card" role="alertdialog" aria-modal="true">
        <h3 class="confirm-title">{{ state.title }}</h3>
        <p class="confirm-message">{{ state.message }}</p>
        <div class="confirm-actions">
          <button class="btn" @click="settleConfirm(false)">{{ state.cancelText }}</button>
          <button
            class="btn"
            :class="state.danger ? 'btn-danger' : 'btn-primary'"
            @click="settleConfirm(true)"
          >
            {{ state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
