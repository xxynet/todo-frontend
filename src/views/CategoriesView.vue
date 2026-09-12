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
import { t, useI18n } from '../i18n'
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
const { locale } = useI18n()

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

function sortCategories(): void {
  categories.value.sort((a, b) => a.name.localeCompare(b.name, locale.value))
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
  } else {
    categories.value.push(saved)
  }
  sortCategories()
  editorOpen.value = false
}

async function removeCategory(category: Category): Promise<void> {
  const confirmed = await confirmDialog({
    title: t('categories.deleteTitle'),
    message: t('categories.deleteMessage', { name: category.name }),
    confirmText: t('common.delete'),
    danger: true,
  })
  if (!confirmed) return
  try {
    await deleteCategory(category.id)
    categories.value = categories.value.filter((item) => item.id !== category.id)
    toast.success(t('categories.deleted'))
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
        <h1>{{ t('categories.title') }}</h1>
        <p class="muted">
          {{ isAdmin ? t('categories.subtitleAdmin') : t('categories.subtitleUser') }}
        </p>
      </div>
      <button v-if="isAdmin" type="button" class="btn btn-primary" @click="openCreate">
        <Plus class="icon" />
        {{ t('categories.create') }}
      </button>
    </header>

    <div v-if="loading" class="empty-state">
      <span class="spinner spinner-lg"></span>
      <p class="muted">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="categories.length === 0" class="empty-state card">
      <div class="empty-icon"><FolderOpened class="icon icon-xl" /></div>
      <p class="empty-title">{{ t('categories.emptyTitle') }}</p>
      <p v-if="isAdmin" class="muted">{{ t('categories.emptyAdminHint') }}</p>
      <p v-else class="muted">{{ t('categories.emptyUserHint') }}</p>
      <button v-if="isAdmin" type="button" class="btn btn-primary" @click="openCreate">
        <Plus class="icon" />
        {{ t('categories.create') }}
      </button>
    </div>

    <ul v-else class="category-list">
      <li v-for="category in categories" :key="category.id" class="category-item card">
        <div class="category-info">
          <h3 class="category-name">{{ category.name }}</h3>
          <p class="muted">
            {{ t('categories.meta', { id: category.id, time: formatDateTime(category.created_at) }) }}
          </p>
        </div>
        <div class="category-actions">
          <button type="button" class="btn btn-sm" @click="viewTodos(category)">
            <View class="icon" />
            {{ t('categories.viewTodos') }}
          </button>
          <template v-if="isAdmin">
            <button type="button" class="btn btn-sm" @click="openPermissions(category)">
              <User class="icon" />
              {{ t('categories.permissions') }}
            </button>
            <button type="button" class="btn btn-sm" @click="openRename(category)">
              <EditPen class="icon" />
              {{ t('categories.rename') }}
            </button>
            <button type="button" class="btn btn-sm btn-danger-outline" @click="removeCategory(category)">
              <Delete class="icon" />
              {{ t('categories.delete') }}
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
