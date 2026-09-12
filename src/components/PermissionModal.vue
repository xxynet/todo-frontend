<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Category, CategoryPermission, CategoryPermissionRole, User } from '../api/types'
import { ApiError, getErrorMessage } from '../api/client'
import {
  deletePermission,
  listPermissions,
  setPermission,
} from '../api/categories'
import { formatRole, getUser } from '../api/users'
import { toast } from '../composables/toast'
import { confirmDialog } from '../composables/confirm'
import { formatDateTime } from '../utils/datetime'
import AppModal from './AppModal.vue'

const props = defineProps<{
  open: boolean
  category: Category | null
}>()

const emit = defineEmits<{ close: [] }>()

const permissions = ref<CategoryPermission[]>([])
const loading = ref(false)
const listError = ref('')

const form = reactive({ userId: '', role: 'view' as CategoryPermissionRole })
const grantError = ref('')
const grantSubmitting = ref(false)

const lookup = reactive<{
  status: 'idle' | 'loading' | 'found' | 'error'
  user: User | null
  message: string
  userId: string
}>({ status: 'idle', user: null, message: '', userId: '' })

const lookupLabel = computed(() => {
  if (lookup.status === 'loading') return '查询中…'
  if (lookup.status === 'found' && lookup.user) {
    return `${lookup.user.nickname}（${formatRole(lookup.user.role)}）`
  }
  if (lookup.status === 'error') return lookup.message
  return ''
})

watch(
  () => props.open,
  (open) => {
    if (open && props.category) {
      form.userId = ''
      form.role = 'view'
      grantError.value = ''
      lookup.status = 'idle'
      lookup.user = null
      lookup.message = ''
      lookup.userId = ''
      void loadPermissions()
    }
  },
)

async function loadPermissions(): Promise<void> {
  if (!props.category) return
  loading.value = true
  listError.value = ''
  try {
    permissions.value = await listPermissions(props.category.id)
  } catch (error) {
    listError.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

function onUserIdInput(): void {
  grantError.value = ''
  if (lookup.userId !== form.userId.trim()) {
    lookup.status = 'idle'
    lookup.user = null
    lookup.message = ''
  }
}

async function findUser(): Promise<User | null> {
  const userId = form.userId.trim()
  if (!userId) {
    grantError.value = '请输入要授权的用户 ID'
    return null
  }
  lookup.userId = userId
  lookup.status = 'loading'
  try {
    const user = await getUser(userId)
    lookup.user = user
    lookup.status = 'found'
    return user
  } catch (error) {
    lookup.user = null
    lookup.status = 'error'
    lookup.message =
      error instanceof ApiError && error.status === 404 ? '未找到该用户，请确认用户 ID' : getErrorMessage(error)
    return null
  }
}

async function grant(): Promise<void> {
  if (grantSubmitting.value || !props.category) return
  grantError.value = ''
  grantSubmitting.value = true
  try {
    const user = lookup.status === 'found' ? lookup.user : await findUser()
    if (!user) {
      grantSubmitting.value = false
      return
    }
    await setPermission(props.category.id, user.id, form.role)
    toast.success(`已授权 ${user.nickname}（${form.role === 'edit' ? '可编辑' : '可查看'}）`)
    form.userId = ''
    form.role = 'view'
    lookup.status = 'idle'
    lookup.user = null
    await loadPermissions()
  } catch (error) {
    grantError.value = getErrorMessage(error)
  } finally {
    grantSubmitting.value = false
  }
}

async function revoke(permission: CategoryPermission): Promise<void> {
  if (!props.category) return
  const confirmed = await confirmDialog({
    title: '移除协作权限',
    message: `确定移除用户 ${permission.user_id} 对「${props.category.name}」的访问权限吗？其对该分类共享待办的访问将立即失效。`,
    confirmText: '移除',
    danger: true,
  })
  if (!confirmed) return
  try {
    await deletePermission(props.category.id, permission.user_id)
    toast.success('权限已移除')
    await loadPermissions()
  } catch (error) {
    toast.error(getErrorMessage(error))
  }
}

function roleLabel(role: CategoryPermissionRole): string {
  return role === 'edit' ? '可编辑' : '可查看'
}
</script>

<template>
  <AppModal
    :open="open"
    :title="`协作权限 · ${category?.name ?? ''}`"
    width="640px"
    @close="emit('close')"
  >
    <div class="permission-panel">
      <p class="panel-hint">
        被授权的用户可以在该分类下查看（view）或管理（edit）共享待办；分类本身的创建、重命名、删除仅管理员可操作。
      </p>

      <section class="permission-list">
        <h4>已授权用户</h4>
        <div v-if="loading" class="muted">加载中…</div>
        <div v-else-if="listError" class="form-banner banner-error">{{ listError }}</div>
        <div v-else-if="permissions.length === 0" class="empty-line">暂未授权任何用户</div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>用户 ID</th>
              <th>权限</th>
              <th>授权时间</th>
              <th class="table-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="permission in permissions" :key="permission.user_id">
              <td class="mono">{{ permission.user_id }}</td>
              <td>
                <span class="chip" :class="permission.role === 'edit' ? 'chip-role-edit' : 'chip-role-view'">
                  {{ roleLabel(permission.role) }}
                </span>
              </td>
              <td class="muted">{{ formatDateTime(permission.created_at) }}</td>
              <td class="table-actions">
                <button type="button" class="btn btn-sm btn-danger-outline" @click="revoke(permission)">
                  移除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="permission-grant">
        <h4>添加授权</h4>
        <form class="grant-form" novalidate @submit.prevent="grant">
          <div class="grant-fields">
            <div class="field">
              <label for="grant-user">用户 ID</label>
              <input
                id="grant-user"
                v-model="form.userId"
                type="text"
                placeholder="例如 caleb"
                @input="onUserIdInput"
              />
              <p v-if="lookup.status !== 'idle'" class="field-hint" :class="{ 'lookup-error': lookup.status === 'error' }">
                {{ lookupLabel }}
              </p>
            </div>
            <div class="field">
              <label for="grant-role">权限</label>
              <select id="grant-role" v-model="form.role">
                <option value="view">可查看（view）</option>
                <option value="edit">可编辑（edit）</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary grant-submit" :disabled="grantSubmitting">
              {{ grantSubmitting ? '授权中…' : '查找并授权' }}
            </button>
          </div>
          <p v-if="grantError" class="field-error">{{ grantError }}</p>
        </form>
      </section>
    </div>
  </AppModal>
</template>
