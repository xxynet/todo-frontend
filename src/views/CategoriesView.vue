<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Category } from '../api/types'
import { getErrorMessage } from '../api/client'
import { deleteCategory, listCategories } from '../api/categories'
import { useSession } from '../stores/session'
import { toast } from '../composables/toast'
import { confirmDialog } from '../composables/confirm'
import { formatDateTime } from '../utils/datetime'
import CategoryModal from '../components/CategoryModal.vue'
import PermissionModal from '../components/PermissionModal.vue'
import {
  Plus,
  View,
  User,
  EditPen,
  Delete,
  FolderOpened,
} from '@element-plus/icons-vue'

const router = useRouter()
const session = useSession()

const isAdmin = computed(() => session.user.value?.role === 'admin')

const categories = ref<Category[]>([])
const loading = ref(false)

const editorOpen = ref(false)
const editingCategory = ref<Category | null>(null)

const permissionOpen = ref(false)
const permissionCategory = ref<Category | null>(null)

onMounted(load)

async function load(): Promise<void> {
  loading.value = true
  try {
    categories.value = await listCategories()
  } catch (error) {
    toast.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editingCategory.value = null
  editorOpen.value = true
}

function openRename(category: Category): void {
  editingCategory.value = category
  editorOpen.value = true
}

function onSaved(saved: Category): void {
  const index = categories.value.findIndex((item) => item.id === saved.id)
  if (index >= 0) {
    categories.value.splice(index, 1, saved)
    categories.value.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  } else {
    categories.value.push(saved)
    categories.value.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  }
  editorOpen.value = false
}

async function removeCategory(category: Category): Promise<void> {
  const confirmed = await confirmDialog({
    title: '删除分类',
    message: `确定删除分类「${category.name}」吗？该分类下的待办将变为未分类（仍归原所有者），相关协作权限会一并移除。`,
    confirmText: '删除',
    danger: true,
  })
  if (!confirmed) return
  try {
    await deleteCategory(category.id)
    categories.value = categories.value.filter((item) => item.id !== category.id)
    toast.success('分类已删除')
  } catch (error) {
    toast.error(getErrorMessage(error))
  }
}

function openPermissions(category: Category): void {
  permissionCategory.value = category
  permissionOpen.value = true
}

function viewTodos(category: Category): void {
  void router.push({ path: '/todos', query: { category: String(category.id) } })
}
</script>

<template>
  <div class="page categories-page">
    <header class="todos-header">
      <div>
        <h1>分类管理</h1>
        <p class="muted">
          {{
            isAdmin
              ? '管理员可以创建分类、重命名、删除，并管理各分类的协作权限'
              : '以下是通过协作权限与您共享的分类（仅管理员可创建分类）'
          }}
        </p>
      </div>
      <button v-if="isAdmin" type="button" class="btn btn-primary" @click="openCreate">
        <Plus class="icon" />
        新建分类
      </button>
    </header>

    <div v-if="loading" class="empty-state">
      <span class="spinner spinner-lg"></span>
      <p class="muted">加载中…</p>
    </div>

    <div v-else-if="categories.length === 0" class="empty-state card">
      <div class="empty-icon"><FolderOpened class="icon icon-xl" /></div>
      <p class="empty-title">还没有可访问的分类</p>
      <p v-if="isAdmin" class="muted">创建一个分类，即可在其中整理共享待办</p>
      <p v-else class="muted">请联系管理员为您授权分类访问</p>
      <button v-if="isAdmin" type="button" class="btn btn-primary" @click="openCreate">
        <Plus class="icon" />
        新建分类
      </button>
    </div>

    <ul v-else class="category-list">
      <li v-for="category in categories" :key="category.id" class="category-item card">
        <div class="category-info">
          <h3 class="category-name">{{ category.name }}</h3>
          <p class="muted">
            分类 #{{ category.id }} · 创建于 {{ formatDateTime(category.created_at) }}
          </p>
        </div>
        <div class="category-actions">
          <button type="button" class="btn btn-sm" @click="viewTodos(category)">
            <View class="icon" />
            查看待办
          </button>
          <template v-if="isAdmin">
            <button type="button" class="btn btn-sm" @click="openPermissions(category)">
              <User class="icon" />
              协作权限
            </button>
            <button type="button" class="btn btn-sm" @click="openRename(category)">
              <EditPen class="icon" />
              重命名
            </button>
            <button type="button" class="btn btn-sm btn-danger-outline" @click="removeCategory(category)">
              <Delete class="icon" />
              删除
            </button>
          </template>
        </div>
      </li>
    </ul>

    <CategoryModal
      :open="editorOpen"
      :category="editingCategory"
      @close="editorOpen = false"
      @saved="onSaved"
    />
    <PermissionModal
      :open="permissionOpen"
      :category="permissionCategory"
      @close="permissionOpen = false"
    />
  </div>
</template>
