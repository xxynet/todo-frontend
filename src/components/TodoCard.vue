<script setup lang="ts">
import { computed } from 'vue'
import type { Todo } from '../api/types'
import { useSession } from '../stores/session'
import { formatDateTime, formatSchedule, parseApiDate } from '../utils/datetime'
import { t } from '../i18n'
import { Check, EditPen, Delete, AlarmClock, Folder, User } from '@element-plus/icons-vue'

const props = defineProps<{
  todo: Todo
  busy?: boolean
}>()

const emit = defineEmits<{ toggle: []; edit: []; remove: [] }>()

const session = useSession()

const isMine = computed(() => props.todo.user_id === session.user.value?.id)
const scheduleText = computed(() => formatSchedule(props.todo.scheduled_start_at, props.todo.scheduled_end_at))
const overdue = computed(() => {
  if (props.todo.completed) return false
  const end = parseApiDate(props.todo.scheduled_end_at)
  return end !== null && end.getTime() < Date.now()
})
const checkLabel = computed(() =>
  props.todo.completed ? t('todos.aria.markActive') : t('todos.aria.markDone'),
)
</script>

<template>
  <li class="todo-card card" :class="{ 'todo-completed': todo.completed }">
    <button
      type="button"
      class="todo-check"
      :class="{ checked: todo.completed }"
      :disabled="busy"
      :aria-label="checkLabel"
      @click="emit('toggle')"
    >
      <Check v-if="todo.completed" class="icon" />
    </button>

    <div class="todo-body">
      <div class="todo-title-row">
        <h3 class="todo-title">{{ todo.title }}</h3>
        <span v-if="!isMine" class="chip chip-shared" :title="t('todoCard.sharedTitle')">
          <User class="icon" />
          {{ t('todoCard.shared') }} · {{ todo.user_id }}
        </span>
        <span v-if="overdue" class="chip chip-overdue">{{ t('todoCard.overdue') }}</span>
      </div>

      <p v-if="todo.description" class="todo-description">{{ todo.description }}</p>

      <div class="todo-meta">
        <span v-if="todo.category" class="chip chip-category">
          <Folder class="icon" />
          {{ todo.category.name }}
        </span>
        <span v-for="tag in todo.tags" :key="tag" class="chip chip-tag"># {{ tag }}</span>
        <span v-if="scheduleText" class="chip chip-schedule" :class="{ 'chip-overdue-text': overdue }">
          <AlarmClock class="icon" />
          {{ scheduleText }}
        </span>
        <span class="todo-time">{{ t('todoCard.createdAt', { time: formatDateTime(todo.created_at) }) }}</span>
      </div>
    </div>

    <div class="todo-actions">
      <button type="button" class="icon-btn" :title="t('todoCard.edit')" :disabled="busy" @click="emit('edit')">
        <EditPen class="icon" />
      </button>
      <button
        type="button"
        class="icon-btn icon-btn-danger"
        :title="t('todoCard.delete')"
        :disabled="busy"
        @click="emit('remove')"
      >
        <Delete class="icon" />
      </button>
    </div>
  </li>
</template>
