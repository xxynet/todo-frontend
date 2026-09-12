<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, getErrorMessage } from '../api/client'
import { getHealth, getSetupStatus, registerUser, bootstrapAdmin } from '../api/users'
import { useAuth } from '../stores/auth'
import { useBackend, normalizeBackendUrl } from '../stores/backend'
import { toast } from '../composables/toast'
import { Checked, Connection } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const backend = useBackend()

type Mode = 'login' | 'register' | 'bootstrap'
const mode = ref<Mode>('login')

const backendInput = ref(backend.url.value)
const connStatus = ref<'idle' | 'checking' | 'ok' | 'error'>('idle')
const connMessage = ref('')
const adminProvisioned = ref<boolean | null>(null)

const loginForm = reactive({ userId: '', password: '' })
const loginError = ref('')
const loggingIn = ref(false)

const registerForm = reactive({ userId: '', nickname: '', password: '', confirmPassword: '' })
const registerErrors = reactive({ userId: '', nickname: '', password: '', confirmPassword: '' })
const registerError = ref('')
const registering = ref(false)

const bootstrapForm = reactive({ userId: '', nickname: '', password: '', confirmPassword: '' })
const bootstrapErrors = reactive({ userId: '', nickname: '', password: '', confirmPassword: '' })
const bootstrapError = ref('')
const bootstrapping = ref(false)

onMounted(() => {
  const presetId = route.query.id
  if (typeof presetId === 'string' && presetId) {
    loginForm.userId = presetId
  }
  if (backendInput.value.trim()) {
    void checkConnection({ silent: true })
  }
})

watch(mode, (value) => {
  loginError.value = ''
  registerError.value = ''
  bootstrapError.value = ''
  if (value === 'register') {
    registerForm.userId = loginForm.userId
  } else if (value === 'login') {
    loginForm.userId = registerForm.userId || loginForm.userId || bootstrapForm.userId
  }
  if (value === 'bootstrap') void checkSetupStatus()
})

/** 确认后端地址：校验格式并检测连通性与初始化状态 */
async function checkConnection(options: { silent?: boolean } = {}): Promise<boolean> {
  if (!options.silent) {
    connStatus.value = 'checking'
    connMessage.value = ''
  }
  try {
    const normalized = normalizeBackendUrl(backendInput.value)
    backend.setUrl(normalized)
    await getHealth()
    adminProvisioned.value = (await getSetupStatus()).admin_provisioned
    connStatus.value = 'ok'
    connMessage.value = '后端连接成功'
    if (!adminProvisioned.value) {
      connMessage.value = '后端连接成功：尚未初始化管理员'
      if (!options.silent) mode.value = 'bootstrap'
    }
    return true
  } catch (error) {
    connStatus.value = 'error'
    adminProvisioned.value = null
    connMessage.value =
      error instanceof ApiError && error.status === 0
        ? '无法连接后端。请检查地址、服务是否启动，以及后端是否已启用 CORS。'
        : getErrorMessage(error)
    return false
  } finally {
    if (mode.value === 'bootstrap' && connStatus.value === 'ok') await checkSetupStatus()
  }
}

async function checkSetupStatus(): Promise<void> {
  try {
    normalizeBackendUrl(backendInput.value)
    backend.setUrl(normalizeBackendUrl(backendInput.value))
    adminProvisioned.value = (await getSetupStatus()).admin_provisioned
    connStatus.value = 'ok'
    connMessage.value = adminProvisioned.value ? '后端连接成功' : '后端连接成功：尚未初始化管理员'
  } catch {
    adminProvisioned.value = null
  }
}

const bootstrapNote = () => {
  if (connStatus.value === 'error') return '无法连接后端，请先确认后端地址。'
  if (adminProvisioned.value === true) return '此后端已经初始化管理员，不能再次创建。请使用登录或注册。'
  if (adminProvisioned.value === false) return '未检测到管理员，可在此一次性创建。'
  return '填写有效后端地址后，可检查是否允许初始化管理员。'
}
const bootstrapDisabled = () => connStatus.value !== 'ok' || adminProvisioned.value === true

async function login(): Promise<void> {
  if (loggingIn.value) return
  loginError.value = ''
  if (!backendInput.value.trim()) {
    loginError.value = '请先填写后端地址'
    return
  }
  if (!loginForm.userId.trim() || !loginForm.password) {
    loginError.value = '请输入用户 ID 和密码'
    return
  }
  loggingIn.value = true
  try {
    backend.setUrl(normalizeBackendUrl(backendInput.value))
    await auth.login(loginForm.userId, loginForm.password)
    const redirect = route.query.redirect
    await router.replace(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/todos')
  } catch (error) {
    loginError.value = getErrorMessage(error)
  } finally {
    loggingIn.value = false
  }
}

function validateAccount(form: {
  userId: string
  nickname: string
  password: string
  confirmPassword: string
}) {
  const errors = { userId: '', nickname: '', password: '', confirmPassword: '' }
  const id = form.userId.trim()
  if (!id) {
    errors.userId = '请输入用户 ID'
  } else if (!/^[A-Za-z0-9_.-]+$/.test(id)) {
    errors.userId = '仅支持字母、数字、下划线、点和中划线'
  } else if (id.length > 50) {
    errors.userId = '用户 ID 不能超过 50 个字符'
  }
  if (!form.nickname.trim()) errors.nickname = '请输入昵称'
  if (form.password.length < 8) {
    errors.password = '密码至少 8 位'
  } else if (form.password.length > 128) {
    errors.password = '密码不能超过 128 位'
  }
  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = '两次输入的密码不一致'
  }
  return errors
}

async function register(): Promise<void> {
  if (registering.value) return
  registerError.value = ''
  Object.assign(registerErrors, validateAccount(registerForm))
  if (Object.values(registerErrors).some(Boolean)) return
  registering.value = true
  try {
    backend.setUrl(normalizeBackendUrl(backendInput.value))
    await registerUser({
      id: registerForm.userId.trim(),
      nickname: registerForm.nickname.trim(),
      password: registerForm.password,
    })
    toast.success('账户创建成功，请登录')
    loginForm.userId = registerForm.userId.trim()
    loginForm.password = ''
    mode.value = 'login'
  } catch (error) {
    registerError.value = getErrorMessage(error)
  } finally {
    registering.value = false
  }
}

async function bootstrap(): Promise<void> {
  if (bootstrapping.value || bootstrapDisabled()) return
  bootstrapError.value = ''
  Object.assign(bootstrapErrors, validateAccount(bootstrapForm))
  if (Object.values(bootstrapErrors).some(Boolean)) return
  bootstrapping.value = true
  try {
    backend.setUrl(normalizeBackendUrl(backendInput.value))
    await bootstrapAdmin({
      id: bootstrapForm.userId.trim(),
      nickname: bootstrapForm.nickname.trim(),
      password: bootstrapForm.password,
    })
    toast.success('管理员已初始化，请登录')
    adminProvisioned.value = true
    loginForm.userId = bootstrapForm.userId.trim()
    loginForm.password = ''
    mode.value = 'login'
  } catch (error) {
    bootstrapError.value = getErrorMessage(error)
  } finally {
    bootstrapping.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-brand">
        <span class="brand-logo"><Checked class="icon icon-lg" /></span>
        <h1>TODO 工作台</h1>
        <p class="muted">连接你的 TODO API，管理任务、日程与分类协作</p>
      </div>

      <div class="field backend-field">
        <label for="backend-url">后端地址</label>
        <div class="backend-row">
          <input
            id="backend-url"
            v-model="backendInput"
            type="url"
            placeholder="http://127.0.0.1:8000"
            autocomplete="url"
            spellcheck="false"
          />
          <button type="button" class="btn" :disabled="connStatus === 'checking'" @click="checkConnection()">
            <Connection class="icon" />
            {{ connStatus === 'checking' ? '检测中…' : '检测连接' }}
          </button>
        </div>
        <p v-if="connStatus !== 'idle'" class="field-hint conn-hint" :class="{ 'conn-error': connStatus === 'error' }">
          <span class="status-dot" :class="connStatus"></span>
          {{ connMessage }}
        </p>
      </div>

      <div class="segmented auth-tabs">
        <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button type="button" :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
        <button
          type="button"
          :class="{ active: mode === 'bootstrap', 'bootstrap-alert': adminProvisioned === false }"
          @click="mode = 'bootstrap'"
        >
          初始化管理员
        </button>
      </div>

      <form v-if="mode === 'login'" class="form" novalidate @submit.prevent="login">
        <div v-if="loginError" class="form-banner banner-error">{{ loginError }}</div>
        <div class="field">
          <label for="login-id">用户 ID</label>
          <input
            id="login-id"
            v-model="loginForm.userId"
            type="text"
            maxlength="50"
            autocomplete="username"
            placeholder="例如 caleb"
          />
        </div>
        <div class="field">
          <label for="login-password">密码</label>
          <input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            maxlength="128"
            autocomplete="current-password"
            placeholder="密码"
          />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loggingIn">
          {{ loggingIn ? '正在登录…' : '安全登录' }}
        </button>
      </form>

      <form v-else-if="mode === 'register'" class="form" novalidate @submit.prevent="register">
        <div v-if="registerError" class="form-banner banner-error">{{ registerError }}</div>
        <div class="field">
          <label for="register-id">用户 ID <span class="required">*</span></label>
          <input
            id="register-id"
            v-model="registerForm.userId"
            type="text"
            maxlength="50"
            autocomplete="username"
            placeholder="字母、数字、_ . -"
            :class="{ invalid: registerErrors.userId }"
          />
          <p v-if="registerErrors.userId" class="field-error">{{ registerErrors.userId }}</p>
        </div>
        <div class="field">
          <label for="register-nickname">昵称 <span class="required">*</span></label>
          <input
            id="register-nickname"
            v-model="registerForm.nickname"
            type="text"
            maxlength="100"
            autocomplete="nickname"
            placeholder="显示名称"
            :class="{ invalid: registerErrors.nickname }"
          />
          <p v-if="registerErrors.nickname" class="field-error">{{ registerErrors.nickname }}</p>
        </div>
        <div class="field">
          <label for="register-password">密码 <span class="required">*</span></label>
          <input
            id="register-password"
            v-model="registerForm.password"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            placeholder="至少 8 位"
            :class="{ invalid: registerErrors.password }"
          />
          <p v-if="registerErrors.password" class="field-error">{{ registerErrors.password }}</p>
        </div>
        <div class="field">
          <label for="register-confirm">确认密码 <span class="required">*</span></label>
          <input
            id="register-confirm"
            v-model="registerForm.confirmPassword"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            placeholder="再次输入密码"
            :class="{ invalid: registerErrors.confirmPassword }"
          />
          <p v-if="registerErrors.confirmPassword" class="field-error">{{ registerErrors.confirmPassword }}</p>
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="registering">
          {{ registering ? '正在创建…' : '创建账户' }}
        </button>
      </form>

      <form v-else class="form" novalidate @submit.prevent="bootstrap">
        <p class="form-note">{{ bootstrapNote() }}</p>
        <div v-if="bootstrapError" class="form-banner banner-error">{{ bootstrapError }}</div>
        <div class="field">
          <label for="bootstrap-id">管理员 ID <span class="required">*</span></label>
          <input
            id="bootstrap-id"
            v-model="bootstrapForm.userId"
            type="text"
            maxlength="50"
            autocomplete="username"
            placeholder="字母、数字、_ . -"
            :disabled="bootstrapDisabled()"
            :class="{ invalid: bootstrapErrors.userId }"
          />
          <p v-if="bootstrapErrors.userId" class="field-error">{{ bootstrapErrors.userId }}</p>
        </div>
        <div class="field">
          <label for="bootstrap-nickname">昵称 <span class="required">*</span></label>
          <input
            id="bootstrap-nickname"
            v-model="bootstrapForm.nickname"
            type="text"
            maxlength="100"
            autocomplete="nickname"
            placeholder="显示名称"
            :disabled="bootstrapDisabled()"
            :class="{ invalid: bootstrapErrors.nickname }"
          />
          <p v-if="bootstrapErrors.nickname" class="field-error">{{ bootstrapErrors.nickname }}</p>
        </div>
        <div class="field">
          <label for="bootstrap-password">密码 <span class="required">*</span></label>
          <input
            id="bootstrap-password"
            v-model="bootstrapForm.password"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            placeholder="至少 8 位"
            :disabled="bootstrapDisabled()"
            :class="{ invalid: bootstrapErrors.password }"
          />
          <p v-if="bootstrapErrors.password" class="field-error">{{ bootstrapErrors.password }}</p>
        </div>
        <div class="field">
          <label for="bootstrap-confirm">确认密码 <span class="required">*</span></label>
          <input
            id="bootstrap-confirm"
            v-model="bootstrapForm.confirmPassword"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            placeholder="再次输入密码"
            :disabled="bootstrapDisabled()"
            :class="{ invalid: bootstrapErrors.confirmPassword }"
          />
          <p v-if="bootstrapErrors.confirmPassword" class="field-error">{{ bootstrapErrors.confirmPassword }}</p>
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="bootstrapping || bootstrapDisabled()">
          {{ bootstrapping ? '正在初始化…' : '初始化管理员' }}
        </button>
      </form>

      <footer class="auth-footer">
        <span>访问令牌仅保存在此浏览器的 localStorage，退出登录或令牌到期后自动清除。</span>
      </footer>
    </div>
  </div>
</template>
