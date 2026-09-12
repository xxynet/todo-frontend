<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Category } from '../api/types'
import { getErrorMessage } from '../api/client'
import { createCategory, updateCategory } from '../api/categories'
import { toast } from '../composables/toast'
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
    fieldError.value = '请输入分类名称'
    return
  }
  if (name.length > 100) {
    fieldError.value = '分类名称不能超过 100 个字符'
    return
  }
  submitting.value = true
  try {
    const saved = props.category
      ? await updateCategory(props.category.id, name)
      : await createCategory(name)
    toast.success(props.category ? '分类已更新' : '分类已创建')
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
    :title="category ? '重命名分类' : '新建分类'"
    width="420px"
    @close="emit('close')"
  >
    <form class="form" novalidate @submit.prevent="submit">
      <div v-if="formError" class="form-banner banner-error">{{ formError }}</div>
      <div class="field">
        <label for="category-name">分类名称 <span class="required">*</span></label>
        <input
          id="category-name"
          v-model="form.name"
          type="text"
          maxlength="100"
          placeholder="例如：工作、学习"
          :class="{ invalid: fieldError }"
          @input="fieldError = ''"
        />
        <p v-if="fieldError" class="field-error">{{ fieldError }}</p>
      </div>
      <footer class="form-actions">
        <button type="button" class="btn" :disabled="submitting" @click="emit('close')">取消</button>
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          {{ submitting ? '保存中…' : category ? '保存' : '创建' }}
        </button>
      </footer>
    </form>
  </AppModal>
</template>
