<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Category, Todo } from '../api/types'
import { getErrorMessage } from '../api/client'
import { listCategories } from '../api/categories'
import { deleteTodo, listTodos, updateTodo } from '../api/todos'
import { toast } from '../composables/toast'
import { confirmDialog } from '../composables/confirm'
import { parseApiDate } from '../utils/datetime'
import TodoCard from '../components/TodoCard.vue'
import TodoFormModal from '../components/TodoFormModal.vue'
import {
  Plus,
  Refresh,
  Search,
  Tickets,
  Folder,
  ArrowLeft,
  ArrowRight,
} from '@element-plus/icons-vue'

const PAGE_SIZE = 10

type StatusFilter = 'all' | 'active' | 'done'
type SortKey = 'created_desc' | 'created_asc' | 'schedule_asc' | 'schedule_desc' | 'title_asc'

const route = useRoute()

const categories = ref<Category[]>([])
const todos = ref<Todo[]>([])
const loading = ref(false)

const statusFilter = ref<StatusFilter>('all')
const sortKey = ref<SortKey>('created_desc')
const categoryFilter = ref<number | 'all'>('all')
const searchQuery = ref('')

const page = ref(1)

const formOpen = ref(false)
const editingTodo = ref<Todo | null>(null)
const busyIds = reactive(new Set<number>())

/** 依据分类、状态、关键词与排序得到当前应展示的待办 */
const visibleTodos = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  const filtered = todos.value.filter((todo) => {
    if (categoryFilter.value !== 'all' && todo.category_id !== categoryFilter.value) return false
    if (statusFilter.value === 'active' && todo.completed) return false
    if (statusFilter.value === 'done' && !todo.completed) return false
    if (!query) return true
    return [todo.title, todo.description ?? '', ...todo.tags, todo.category?.name ?? '', todo.user_id]
      .join(' ')
      .toLocaleLowerCase()
      .includes(query)
  })
  const time = (value: string | null) => (value ? (parseApiDate(value)?.getTime() ?? null) : null)
  return filtered.sort((a, b) => {
    if (sortKey.value === 'created_asc') {
      return (time(a.created_at) ?? 0) - (time(b.created_at) ?? 0)
    }
    if (sortKey.value === 'schedule_asc') {
      return (time(a.scheduled_start_at) ?? Number.POSITIVE_INFINITY) - (time(b.scheduled_start_at) ?? Number.POSITIVE_INFINITY)
    }
    if (sortKey.value === 'schedule_desc') {
      return (time(b.scheduled_start_at) ?? Number.NEGATIVE_INFINITY) - (time(a.scheduled_start_at) ?? Number.NEGATIVE_INFINITY)
    }
    if (sortKey.value === 'title_asc') {
      return a.title.localeCompare(b.title, 'zh-CN')
    }
    return (time(b.created_at) ?? 0) - (time(a.created_at) ?? 0)
  })
})

const maxPage = computed(() => Math.max(1, Math.ceil(visibleTodos.value.length / PAGE_SIZE)))
const pageTodos = computed(() =>
  visibleTodos.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

/** 参考实现：首页、末页与当前页附近，间隔以省略号表示 */
const pageButtons = computed(() => {
  const pages: Array<{ page: number; gap: boolean }> = []
  const relevant = Array.from({ length: maxPage.value }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === maxPage.value || Math.abs(item - page.value) <= 1,
  )
  let previous = 0
  for (const item of relevant) {
    if (item - previous > 1) pages.push({ page: 0, gap: true })
    pages.push({ page: item, gap: false })
    previous = item
  }
  return pages
})

watch([statusFilter, categoryFilter, sortKey, searchQuery], () => {
  page.value = 1
})

watch(maxPage, (value) => {
  if (page.value > value) page.value = value
})

onMounted(() => {
  const queryCategory = Number(route.query.category)
  if (Number.isInteger(queryCategory) && queryCategory > 0) {
    categoryFilter.value = queryCategory
  }
  void refreshAll()
})

/** 全量拉取（后端单页上限 100，循环翻页取完） */
async function fetchAllTodos(): Promise<Todo[]> {
  const all: Todo[] = []
  const limit = 100
  for (let offset = 0; offset < 100_000; offset += limit) {
    const batch = await listTodos({ offset, limit })
    all.push(...batch)
    if (batch.length < limit) return all
  }
  return all
}

async function refreshAll(): Promise<void> {
  loading.value = true
  try {
    const [categoryList, todoList] = await Promise.all([listCategories(), fetchAllTodos()])
    categories.value = categoryList
    todos.value = todoList
    if (categoryFilter.value !== 'all' && !categoryList.some((item) => item.id === categoryFilter.value)) {
      categoryFilter.value = 'all'
    }
  } catch (error) {
    toast.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editingTodo.value = null
  formOpen.value = true
}

function openEdit(todo: Todo): void {
  editingTodo.value = todo
  formOpen.value = true
}

function onSaved(saved: Todo): void {
  const index = todos.value.findIndex((item) => item.id === saved.id)
  if (index >= 0) {
    todos.value.splice(index, 1, saved)
  } else {
    todos.value.unshift(saved)
  }
  formOpen.value = false
}

async function toggleCompleted(todo: Todo): Promise<void> {
  if (busyIds.has(todo.id)) return
  busyIds.add(todo.id)
  try {
    const updated = await updateTodo(todo.id, { completed: !todo.completed })
    const index = todos.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) todos.value.splice(index, 1, updated)
  } catch (error) {
    toast.error(getErrorMessage(error))
  } finally {
    busyIds.delete(todo.id)
  }
}

async function removeTodo(todo: Todo): Promise<void> {
  const confirmed = await confirmDialog({
    title: '删除待办',
    message: `确定删除「${todo.title}」吗？此操作无法撤销。`,
    confirmText: '删除',
    danger: true,
  })
  if (!confirmed) return
  try {
    await deleteTodo(todo.id)
    todos.value = todos.value.filter((item) => item.id !== todo.id)
    toast.success('待办已删除')
  } catch (error) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <div class="page todos-page">
    <aside class="todos-sidebar">
      <h2 class="sidebar-title">分类</h2>
      <nav class="sidebar-nav">
        <button
          type="button"
          class="sidebar-item"
          :class="{ active: categoryFilter === 'all' }"
          @click="categoryFilter = 'all'"
        >
          <Tickets class="icon sidebar-icon" />
          全部待办
        </button>
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="sidebar-item"
          :class="{ active: categoryFilter === category.id }"
          @click="categoryFilter = category.id"
        >
          <Folder class="icon sidebar-icon" />
          {{ category.name }}
        </button>
        <p v-if="!loading && categories.length === 0" class="sidebar-empty muted">暂无可访问的分类</p>
      </nav>
      <p class="sidebar-hint muted">仅显示您有权限访问的分类，可在「分类」页管理</p>
    </aside>

    <section class="todos-main">
      <header class="todos-header">
        <div>
          <h1>待办事项</h1>
          <p class="muted">共 {{ visibleTodos.length }} 条匹配的待办</p>
        </div>
        <button type="button" class="btn btn-primary" @click="openCreate">
          <Plus class="icon" />
          新建待办
        </button>
      </header>

      <div class="toolbar">
        <div class="segmented">
          <button type="button" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">
            全部
          </button>
          <button type="button" :class="{ active: statusFilter === 'active' }" @click="statusFilter = 'active'">
            进行中
          </button>
          <button type="button" :class="{ active: statusFilter === 'done' }" @click="statusFilter = 'done'">
            已完成
          </button>
        </div>
        <div class="search-box">
          <Search class="icon search-icon" />
          <input
            v-model="searchQuery"
            type="search"
            class="search-input"
            placeholder="搜索标题、描述、标签或分类…"
          />
        </div>
        <select v-model="sortKey" class="sort-select" aria-label="任务排序">
          <option value="created_desc">最新创建</option>
          <option value="created_asc">最早创建</option>
          <option value="schedule_asc">日程最早</option>
          <option value="schedule_desc">日程最晚</option>
          <option value="title_asc">标题 A–Z</option>
        </select>
        <button type="button" class="btn" :disabled="loading" @click="refreshAll">
          <Refresh class="icon" />
          刷新
        </button>
      </div>

      <div v-if="loading" class="empty-state">
        <span class="spinner spinner-lg"></span>
        <p class="muted">加载中…</p>
      </div>

      <div v-else-if="pageTodos.length === 0" class="empty-state card">
        <div class="empty-icon"><Tickets class="icon icon-xl" /></div>
        <p class="empty-title">{{ visibleTodos.length === 0 ? '没有符合条件的待办' : '这一页没有待办' }}</p>
        <p class="muted">换一个筛选条件，或创建一条新待办</p>
        <button type="button" class="btn btn-primary" @click="openCreate">
          <Plus class="icon" />
          新建待办
        </button>
      </div>

      <ul v-else class="todo-list">
        <TodoCard
          v-for="todo in pageTodos"
          :key="todo.id"
          :todo="todo"
          :busy="busyIds.has(todo.id)"
          @toggle="toggleCompleted(todo)"
          @edit="openEdit(todo)"
          @remove="removeTodo(todo)"
        />
      </ul>

      <footer v-if="!loading && maxPage > 1" class="pagination">
        <button
          type="button"
          class="btn btn-sm"
          :disabled="page <= 1"
          @click="page -= 1"
        >
          <ArrowLeft class="icon" />
          上一页
        </button>
        <template v-for="item in pageButtons" :key="item.gap ? `gap-${item.page}` : `page-${item.page}`">
          <span v-if="item.gap" class="page-gap">…</span>
          <button
            v-else
            type="button"
            class="page-button"
            :class="{ active: item.page === page }"
            :aria-current="item.page === page ? 'page' : undefined"
            @click="page = item.page"
          >
            {{ item.page }}
          </button>
        </template>
        <button
          type="button"
          class="btn btn-sm"
          :disabled="page >= maxPage"
          @click="page += 1"
        >
          下一页
          <ArrowRight class="icon" />
        </button>
      </footer>
    </section>

    <TodoFormModal
      :open="formOpen"
      :todo="editingTodo"
      :categories="categories"
      @close="formOpen = false"
      @saved="onSaved"
    />
  </div>
</template>
