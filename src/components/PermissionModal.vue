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
import { t } from '../i18n'
import AppModal from './AppModal.vue'
import AppSelect, { type AppSelectOption } from './AppSelect.vue'

const roleOptions = computed<AppSelectOption<CategoryPermissionRole>[]>(() => [
  { value: 'view', label: t('permissions.roleView') },
  { value: 'edit', label: t('permissions.roleEdit') },
])

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
  if (lookup.status === 'loading') return t('permissions.lookup.loading')
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
    grantError.value = t('permissions.error.userIdRequired')
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
      error instanceof ApiError && error.status === 404
        ? t('permissions.lookup.notFound')
        : getErrorMessage(error)
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
    toast.success(
      t('permissions.granted', {
        nickname: user.nickname,
        role: form.role === 'edit' ? t('permissions.roleEditShort') : t('permissions.roleViewShort'),
      }),
    )
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
    title: t('permissions.revokeTitle'),
    message: t('permissions.revokeMessage', { userId: permission.user_id, name: props.category.name }),
    confirmText: t('permissions.remove'),
    danger: true,
  })
  if (!confirmed) return
  try {
    await deletePermission(props.category.id, permission.user_id)
    toast.success(t('permissions.revoked'))
    await loadPermissions()
  } catch (error) {
    toast.error(getErrorMessage(error))
  }
}

function roleLabel(role: CategoryPermissionRole): string {
  return role === 'edit' ? t('permissions.roleEditShort') : t('permissions.roleViewShort')
}
</script>

<template>
  <AppModal
    :open="open"
    :title="t('permissions.title', { name: category?.name ?? '' })"
    width="640px"
    @close="emit('close')"
  >
    <div class="permission-panel">
      <p class="panel-hint">{{ t('permissions.hint') }}</p>

      <section class="permission-list">
        <h4>{{ t('permissions.authorizedTitle') }}</h4>
        <div v-if="loading" class="muted">{{ t('common.loading') }}</div>
        <div v-else-if="listError" class="form-banner banner-error">{{ listError }}</div>
        <div v-else-if="permissions.length === 0" class="empty-line">{{ t('permissions.empty') }}</div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>{{ t('permissions.colUser') }}</th>
              <th>{{ t('permissions.colRole') }}</th>
              <th>{{ t('permissions.colGrantedAt') }}</th>
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
                  {{ t('permissions.remove') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="permission-grant">
        <h4>{{ t('permissions.addTitle') }}</h4>
        <form class="grant-form" novalidate @submit.prevent="grant">
          <div class="grant-fields">
            <div class="field">
              <label for="grant-user">{{ t('permissions.colUser') }}</label>
              <input
                id="grant-user"
                v-model="form.userId"
                type="text"
                :placeholder="t('placeholder.userId')"
                @input="onUserIdInput"
              />
              <p v-if="lookup.status !== 'idle'" class="field-hint" :class="{ 'lookup-error': lookup.status === 'error' }">
                {{ lookupLabel }}
              </p>
            </div>
            <div class="field">
              <label>{{ t('permissions.roleLabel') }}</label>
              <AppSelect
                v-model="form.role"
                block
                :options="roleOptions"
                :placeholder="t('permissions.rolePlaceholder')"
                :aria-label="t('permissions.roleAria')"
              />
            </div>
            <button type="submit" class="btn btn-primary grant-submit" :disabled="grantSubmitting">
              {{ grantSubmitting ? t('permissions.granting') : t('permissions.grant') }}
            </button>
          </div>
          <p v-if="grantError" class="field-error">{{ grantError }}</p>
        </form>
      </section>
    </div>
  </AppModal>
</template>
