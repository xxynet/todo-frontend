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
  return parsed ? formatDateTime(parsed) : '未知'
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
    nicknameError.value = '昵称不能为空'
    return
  }
  if (nickname.length > 100) {
    nicknameError.value = '昵称不能超过 100 个字符'
    return
  }
  if (nickname === user.value?.nickname) {
    toast.info('昵称没有变化')
    return
  }
  nicknameSaving.value = true
  try {
    const updated = await updateMe({ nickname })
    session.setUser(updated)
    toast.success('昵称已更新')
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
    passwordErrors.password = '密码至少 8 位'
    return
  }
  if (passwordForm.password.length > 128) {
    passwordErrors.password = '密码不能超过 128 位'
    return
  }
  if (passwordForm.confirmPassword !== passwordForm.password) {
    passwordErrors.confirmPassword = '两次输入的密码不一致'
    return
  }
  passwordSaving.value = true
  try {
    await updateMe({ password: passwordForm.password })
    toast.success('密码已修改，下次登录请使用新密码')
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
    title: '退出登录',
    message: '确定退出当前账号吗？',
    confirmText: '退出登录',
    danger: true,
  })
  if (!confirmed) return
  await auth.logout()
  toast.success('已退出登录')
  await router.replace('/login')
}
</script>

<template>
  <div class="page profile-page" v-if="user">
    <header class="todos-header">
      <div>
        <h1>个人中心</h1>
        <p class="muted">管理您的账号信息</p>
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
            {{ user.role === 'admin' ? '管理员' : '普通用户' }}
          </span>
        </div>
        <dl class="profile-facts">
          <div>
            <dt>注册时间</dt>
            <dd>{{ formatDateTime(user.created_at) }}</dd>
          </div>
          <div>
            <dt>资料更新时间</dt>
            <dd>{{ formatDateTime(user.updated_at) }}</dd>
          </div>
          <div>
            <dt>登录凭证有效期至</dt>
            <dd>{{ tokenExpiresAt }}</dd>
          </div>
        </dl>
      </section>

      <section class="card profile-section">
        <h3>修改昵称</h3>
        <form class="form" novalidate @submit.prevent="saveNickname">
          <div class="field">
            <label for="profile-nickname">昵称</label>
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
            {{ nicknameSaving ? '保存中…' : '保存昵称' }}
          </button>
        </form>
      </section>

      <section class="card profile-section">
        <h3>修改密码</h3>
        <form class="form" novalidate @submit.prevent="savePassword">
          <div class="field">
            <label for="profile-password">新密码</label>
            <input
              id="profile-password"
              v-model="passwordForm.password"
              type="password"
              maxlength="128"
              autocomplete="new-password"
              placeholder="至少 8 位"
              :class="{ invalid: passwordErrors.password }"
            />
            <p v-if="passwordErrors.password" class="field-error">{{ passwordErrors.password }}</p>
          </div>
          <div class="field">
            <label for="profile-confirm">确认新密码</label>
            <input
              id="profile-confirm"
              v-model="passwordForm.confirmPassword"
              type="password"
              maxlength="128"
              autocomplete="new-password"
              placeholder="再次输入新密码"
              :class="{ invalid: passwordErrors.confirmPassword }"
            />
            <p v-if="passwordErrors.confirmPassword" class="field-error">
              {{ passwordErrors.confirmPassword }}
            </p>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="passwordSaving">
            {{ passwordSaving ? '保存中…' : '修改密码' }}
          </button>
        </form>
      </section>

      <section class="card profile-section profile-danger">
        <h3>会话</h3>
        <p class="muted">退出后将返回登录页，需要重新输入密码。</p>
        <button type="button" class="btn btn-danger" @click="logout">
          <SwitchButton class="icon" />
          退出登录
        </button>
      </section>
    </div>
  </div>
</template>
