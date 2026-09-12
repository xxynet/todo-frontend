<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Category } from '../api/types'
import { getErrorMessage } from '../api/client'
import { createCategory, updateCategory } from '../api/categories'
import { toast } from '../composables/toast'
import { t } from '../i18n'
import AppModal from './AppModal.vue'

const props = defineProps<{
  open: boolean
  /** null 表示新建 */
  category: Category | null
}>()

const emit = defineEmits<{ close: []; saved: [category: Category] }>()

const form = reactive({ name: '' })
const fieldError = ref('')
const formError = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.name = props.category?.name ?? ''
      fieldError.value = ''
      formError.value = ''
      submitting.value = false
    }
  },
)

async function submit(): Promise<void> {
  if (submitting.value) return
  fieldError.value = ''
  formError.value = ''
  const name = form.name.trim()
  if (!name) {
    fieldError.value = t('category.error.nameRequired')
    return
  }
  if (name.length > 100) {
    fieldError.value = t('category.error.nameLong')
    return
  }
  submitting.value = true
  try {
    const saved = props.category
      ? await updateCategory(props.category.id, name)
      : await createCategory(name)
    toast.success(props.category ? t('category.updated') : t('category.created'))
    emit('saved', saved)
  } catch (error) {
    formError.value = getErrorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="category ? t('category.renameTitle') : t('category.createTitle')"
    width="420px"
    @close="emit('close')"
  >
    <form class="form" novalidate @submit.prevent="submit">
      <div v-if="formError" class="form-banner banner-error">{{ formError }}</div>
      <div class="field">
        <label for="category-name">{{ t('category.nameLabel') }} <span class="required">*</span></label>
        <input
          id="category-name"
          v-model="form.name"
          type="text"
          maxlength="100"
          :placeholder="t('category.namePlaceholder')"
          :class="{ invalid: fieldError }"
          @input="fieldError = ''"
        />
        <p v-if="fieldError" class="field-error">{{ fieldError }}</p>
      </div>
      <footer class="form-actions">
        <button type="button" class="btn" :disabled="submitting" @click="emit('close')">
          {{ t('common.cancel') }}
        </button>
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          {{ submitting ? t('common.saving') : category ? t('common.save') : t('common.create') }}
        </button>
      </footer>
    </form>
  </AppModal>
</template>
