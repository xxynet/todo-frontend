<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getErrorMessage } from '../api/client'
import { updateMe } from '../api/users'
import { useSession } from '../stores/session'
import { useAuth } from '../stores/auth'
import { toast } from '../composables/toast'
import { confirmDialog } from '../composables/confirm'
import { formatDateTime, parseApiDate } from '../utils/datetime'
import { t } from '../i18n'
import { SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const session = useSession()
const auth = useAuth()

const user = computed(() => session.user.value)

const avatarText = computed(() => {
  const nickname = user.value?.nickname ?? ''
  return nickname ? nickname.slice(0, 1).toUpperCase() : '?'
})

const tokenExpiresAt = computed(() => {
  const parsed = parseApiDate(session.expiresAt.value)
  return parsed ? formatDateTime(parsed) : t('profile.unknown')
})

const nicknameForm = reactive({ nickname: '' })
const nicknameError = ref('')
const nicknameSaving = ref(false)

const passwordForm = reactive({ password: '', confirmPassword: '' })
const passwordErrors = reactive({ password: '', confirmPassword: '' })
const passwordSaving = ref(false)

function startEditNickname(): void {
  nicknameForm.nickname = user.value?.nickname ?? ''
}

startEditNickname()

async function saveNickname(): Promise<void> {
  if (nicknameSaving.value) return
  nicknameError.value = ''
  const nickname = nicknameForm.nickname.trim()
  if (!nickname) {
    nicknameError.value = t('profile.error.nicknameRequired')
    return
  }
  if (nickname.length > 100) {
    nicknameError.value = t('profile.error.nicknameLong')
    return
  }
  if (nickname === user.value?.nickname) {
    toast.info(t('profile.nicknameUnchanged'))
    return
  }
  nicknameSaving.value = true
  try {
    const updated = await updateMe({ nickname })
    session.setUser(updated)
    toast.success(t('profile.nicknameUpdated'))
  } catch (error) {
    nicknameError.value = getErrorMessage(error)
  } finally {
    nicknameSaving.value = false
  }
}

async function savePassword(): Promise<void> {
  if (passwordSaving.value) return
  passwordErrors.password = ''
  passwordErrors.confirmPassword = ''
  if (passwordForm.password.length < 8) {
    passwordErrors.password = t('auth.validate.passwordShort')
    return
  }
  if (passwordForm.password.length > 128) {
    passwordErrors.password = t('auth.validate.passwordLong')
    return
  }
  if (passwordForm.confirmPassword !== passwordForm.password) {
    passwordErrors.confirmPassword = t('auth.validate.confirmMismatch')
    return
  }
  passwordSaving.value = true
  try {
    await updateMe({ password: passwordForm.password })
    toast.success(t('profile.passwordUpdated'))
    passwordForm.password = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    toast.error(getErrorMessage(error))
  } finally {
    passwordSaving.value = false
  }
}

async function logout(): Promise<void> {
  const confirmed = await confirmDialog({
    title: t('profile.signOutTitle'),
    message: t('profile.signOutMessage'),
    confirmText: t('profile.signOut'),
    danger: true,
  })
  if (!confirmed) return
  await auth.logout()
  toast.success(t('common.loggedOut'))
  await router.replace('/login')
}
</script>

<template>
  <div class="page profile-page" v-if="user">
    <header class="todos-header">
      <div>
        <h1>{{ t('profile.title') }}</h1>
        <p class="muted">{{ t('profile.subtitle') }}</p>
      </div>
    </header>

    <div class="profile-grid">
      <section class="card profile-card">
        <div class="profile-identity">
          <span class="avatar">{{ avatarText }}</span>
          <div>
            <h2 class="profile-nickname">{{ user.nickname }}</h2>
            <p class="muted mono">@{{ user.id }}</p>
          </div>
          <span class="chip" :class="user.role === 'admin' ? 'chip-role-edit' : 'chip-role-view'">
            {{ user.role === 'admin' ? t('role.admin') : t('role.user') }}
          </span>
        </div>
        <dl class="profile-facts">
          <div>
            <dt>{{ t('profile.registeredAt') }}</dt>
            <dd>{{ formatDateTime(user.created_at) }}</dd>
          </div>
          <div>
            <dt>{{ t('profile.updatedAt') }}</dt>
            <dd>{{ formatDateTime(user.updated_at) }}</dd>
          </div>
          <div>
            <dt>{{ t('profile.tokenExpires') }}</dt>
            <dd>{{ tokenExpiresAt }}</dd>
          </div>
        </dl>
      </section>

      <section class="card profile-section">
        <h3>{{ t('profile.nicknameTitle') }}</h3>
        <form class="form" novalidate @submit.prevent="saveNickname">
          <div class="field">
            <label for="profile-nickname">{{ t('profile.nicknameLabel') }}</label>
            <input
              id="profile-nickname"
              v-model="nicknameForm.nickname"
              type="text"
              maxlength="100"
              :class="{ invalid: nicknameError }"
            />
            <p v-if="nicknameError" class="field-error">{{ nicknameError }}</p>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="nicknameSaving">
            {{ nicknameSaving ? t('common.saving') : t('profile.nicknameSave') }}
          </button>
        </form>
      </section>

      <section class="card profile-section">
        <h3>{{ t('profile.passwordTitle') }}</h3>
        <form class="form" novalidate @submit.prevent="savePassword">
          <div class="field">
            <label for="profile-password">{{ t('profile.passwordLabel') }}</label>
            <input
              id="profile-password"
              v-model="passwordForm.password"
              type="password"
              maxlength="128"
              autocomplete="new-password"
              :placeholder="t('placeholder.passwordMin')"
              :class="{ invalid: passwordErrors.password }"
            />
            <p v-if="passwordErrors.password" class="field-error">{{ passwordErrors.password }}</p>
          </div>
          <div class="field">
            <label for="profile-confirm">{{ t('profile.passwordConfirmLabel') }}</label>
            <input
              id="profile-confirm"
              v-model="passwordForm.confirmPassword"
              type="password"
              maxlength="128"
              autocomplete="new-password"
              :placeholder="t('placeholder.confirmNewPassword')"
              :class="{ invalid: passwordErrors.confirmPassword }"
            />
            <p v-if="passwordErrors.confirmPassword" class="field-error">
              {{ passwordErrors.confirmPassword }}
            </p>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="passwordSaving">
            {{ passwordSaving ? t('common.saving') : t('profile.passwordSubmit') }}
          </button>
        </form>
      </section>

      <section class="card profile-section profile-danger">
        <h3>{{ t('profile.sessionTitle') }}</h3>
        <p class="muted">{{ t('profile.sessionHint') }}</p>
        <button type="button" class="btn btn-danger" @click="logout">
          <SwitchButton class="icon" />
          {{ t('profile.signOut') }}
        </button>
      </section>
    </div>
  </div>
</template>
