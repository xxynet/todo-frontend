<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Category, Todo } from '../api/types'
import { ApiError, getErrorMessage } from '../api/client'
import { createTodo, updateTodo } from '../api/todos'
import { useSession } from '../stores/session'
import { toast } from '../composables/toast'
import {
  formatDateTimeLocal,
  parseApiDate,
  sameInstant,
  toIsoDateTime,
} from '../utils/datetime'
import AppModal from './AppModal.vue'
import TagInput from './TagInput.vue'
import AppSelect, { type AppSelectOption } from './AppSelect.vue'

const props = defineProps<{
  open: boolean
  todo: Todo | null
  categories: Category[]
}>()

const emit = defineEmits<{ close: []; saved: [todo: Todo] }>()

const session = useSession()
const isEdit = computed(() => props.todo !== null)

const categoryOptions = computed<AppSelectOption<string>[]>(() => [
  { value: 'none', label: '未分类（仅自己可见）' },
  ...props.categories.map((category) => ({ value: String(category.id), label: category.name })),
])

const form = reactive({
  title: '',
  description: '',
  completed: false,
  categoryId: 'none',
  tags: [] as string[],
  startAt: '',
  endAt: '',
})

const errors = reactive({ title: '', schedule: '' })
const formError = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)

function resetForm(): void {
  const todo = props.todo
  form.title = todo?.title ?? ''
  form.description = todo?.description ?? ''
  form.completed = todo?.completed ?? false
  form.categoryId = todo?.category_id != null ? String(todo.category_id) : 'none'
  form.tags = todo ? [...todo.tags] : []
  form.startAt = todo?.scheduled_start_at
    ? formatDateTimeLocal(parseApiDate(todo.scheduled_start_at) ?? new Date())
    : ''
  form.endAt = todo?.scheduled_end_at
    ? formatDateTimeLocal(parseApiDate(todo.scheduled_end_at) ?? new Date())
    : ''
  errors.title = ''
  errors.schedule = ''
  formError.value = ''
  submitting.value = false
}

function validate(): boolean {
  errors.title = ''
  errors.schedule = ''
  const title = form.title.trim()
  if (!title) {
    errors.title = '请输入标题'
  } else if (title.length > 200) {
    errors.title = '标题不能超过 200 个字符'
  }
  if (form.endAt && !form.startAt) {
    errors.schedule = '填写结束时间时，必须同时填写开始时间'
  } else if (form.startAt && form.endAt) {
    const start = new Date(form.startAt).getTime()
    const end = new Date(form.endAt).getTime()
    if (end < start) errors.schedule = '结束时间不能早于开始时间'
  }
  return !errors.title && !errors.schedule
}

function sameTags(a: string[], b: string[]): boolean {
  const normalize = (list: string[]) => list.map((tag) => tag.trim().toLowerCase()).sort()
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}

async function submit(): Promise<void> {
  if (submitting.value || !validate()) return
  submitting.value = true
  formError.value = ''
  try {
    const saved = isEdit.value ? await patchExisting() : await createNew()
    if (saved !== null) {
      toast.success(isEdit.value ? '待办已更新' : '待办已创建')
      emit('saved', saved)
    } else {
      toast.info('内容没有变化')
      emit('close')
    }
  } catch (error) {
    formError.value = getErrorMessage(error)
  } finally {
    submitting.value = false
  }
}

async function createNew(): Promise<Todo> {
  const me = session.user.value
  if (!me) throw new ApiError(0, '登录状态已失效，请重新登录')
  return createTodo({
    user_id: me.id,
    title: form.title.trim(),
    description: form.description.trim() || null,
    completed: form.completed,
    category_id: form.categoryId === 'none' ? null : Number(form.categoryId),
    tags: [...form.tags],
    scheduled_start_at: toIsoDateTime(form.startAt),
    scheduled_end_at: toIsoDateTime(form.endAt),
  })
}

async function patchExisting(): Promise<Todo | null> {
  const original = props.todo!
  const changes: Record<string, unknown> = {}

  const title = form.title.trim()
  if (title !== original.title) changes.title = title

  const description = form.description.trim() || null
  if (description !== original.description) changes.description = description

  if (form.completed !== original.completed) changes.completed = form.completed

  const categoryId = form.categoryId === 'none' ? null : Number(form.categoryId)
  if (categoryId !== original.category_id) changes.category_id = categoryId

  if (!sameTags(form.tags, original.tags)) changes.tags = [...form.tags]

  const startIso = toIsoDateTime(form.startAt)
  const endIso = toIsoDateTime(form.endAt)
  if (!sameInstant(startIso, original.scheduled_start_at)) changes.scheduled_start_at = startIso
  if (!sameInstant(endIso, original.scheduled_end_at)) changes.scheduled_end_at = endIso

  if (Object.keys(changes).length === 0) return null
  return updateTodo(original.id, changes)
}
</script>

<template>
  <AppModal :open="open" :title="isEdit ? '编辑待办' : '新建待办'" width="600px" @close="emit('close')">
    <form class="form" novalidate @submit.prevent="submit">
      <div v-if="formError" class="form-banner banner-error">{{ formError }}</div>

      <div class="field">
        <label for="todo-title">标题 <span class="required">*</span></label>
        <input
          id="todo-title"
          v-model="form.title"
          type="text"
          maxlength="200"
          placeholder="要做什么？"
          :class="{ invalid: errors.title }"
        />
        <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
      </div>

      <div class="field">
        <label for="todo-description">描述</label>
        <textarea
          id="todo-description"
          v-model="form.description"
          rows="3"
          placeholder="补充说明（可选）"
        ></textarea>
      </div>

      <div class="form-row">
        <div class="field">
          <label>分类</label>
          <AppSelect
            v-model="form.categoryId"
            block
            :options="categoryOptions"
            placeholder="选择分类"
            aria-label="分类"
          />
        </div>
        <div class="field field-checkbox">
          <label class="checkbox-label">
            <input v-model="form.completed" type="checkbox" />
            <span>标记为已完成</span>
          </label>
        </div>
      </div>

      <div class="field">
        <label>标签</label>
        <TagInput v-model="form.tags" placeholder="输入标签后回车，最多 20 个" />
      </div>

      <div class="form-row">
        <div class="field">
          <label for="todo-start">开始时间</label>
          <input id="todo-start" v-model="form.startAt" type="datetime-local" />
        </div>
        <div class="field">
          <label for="todo-end">结束时间</label>
          <input id="todo-end" v-model="form.endAt" type="datetime-local" />
        </div>
      </div>
      <p v-if="errors.schedule" class="field-error">{{ errors.schedule }}</p>

      <footer class="form-actions">
        <button type="button" class="btn" :disabled="submitting" @click="emit('close')">取消</button>
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          <span v-if="submitting" class="spinner"></span>
          {{ submitting ? '保存中…' : isEdit ? '保存修改' : '创建待办' }}
        </button>
      </footer>
    </form>
  </AppModal>
</template>
