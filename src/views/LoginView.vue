<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, getErrorMessage } from '../api/client'
import { getHealth, getSetupStatus, registerUser, bootstrapAdmin } from '../api/users'
import { useAuth } from '../stores/auth'
import { useBackend, normalizeBackendUrl } from '../stores/backend'
import { toast } from '../composables/toast'
import { t } from '../i18n'
import { Checked, Connection } from '@element-plus/icons-vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import LocaleSelect from '../components/LocaleSelect.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const backend = useBackend()

type Mode = 'login' | 'register' | 'bootstrap'
const mode = ref<Mode>('login')

const backendInput = ref(backend.url.value)
const connStatus = ref<'idle' | 'checking' | 'ok' | 'error'>('idle')
const connErrorDetail = ref('')
const adminProvisioned = ref<boolean | null>(null)

/** 连接提示：常规状态随语言实时切换，自定义错误细节保留原文 */
const connMessage = computed(() => {
  if (connStatus.value === 'error') return connErrorDetail.value || t('errors.generic')
  if (connStatus.value === 'ok') {
    return adminProvisioned.value === false ? t('auth.conn.notProvisioned') : t('auth.conn.ok')
  }
  return ''
})

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
  void checkConnection({ silent: true })
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
    connErrorDetail.value = ''
  }
  try {
    const normalized = normalizeBackendUrl(backendInput.value)
    backend.setUrl(normalized)
    await getHealth()
    adminProvisioned.value = (await getSetupStatus()).admin_provisioned
    connStatus.value = 'ok'
    if (!adminProvisioned.value && !options.silent) mode.value = 'bootstrap'
    return true
  } catch (error) {
    connStatus.value = 'error'
    adminProvisioned.value = null
    connErrorDetail.value =
      error instanceof ApiError && error.status === 0 ? t('errors.network') : getErrorMessage(error)
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
    connErrorDetail.value = ''
  } catch {
    adminProvisioned.value = null
  }
}

const bootstrapNote = () => {
  if (connStatus.value === 'error') return t('auth.bootstrapNote.error')
  if (adminProvisioned.value === true) return t('auth.bootstrapNote.provisioned')
  if (adminProvisioned.value === false) return t('auth.bootstrapNote.ready')
  return t('auth.bootstrapNote.idle')
}
const bootstrapDisabled = () => connStatus.value !== 'ok' || adminProvisioned.value === true

async function login(): Promise<void> {
  if (loggingIn.value) return
  loginError.value = ''
  if (!loginForm.userId.trim() || !loginForm.password) {
    loginError.value = t('auth.login.needCredentials')
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
    errors.userId = t('auth.validate.userIdRequired')
  } else if (!/^[A-Za-z0-9_.-]+$/.test(id)) {
    errors.userId = t('auth.validate.userIdPattern')
  } else if (id.length > 50) {
    errors.userId = t('auth.validate.userIdLong')
  }
  if (!form.nickname.trim()) errors.nickname = t('auth.validate.nicknameRequired')
  if (form.password.length < 8) {
    errors.password = t('auth.validate.passwordShort')
  } else if (form.password.length > 128) {
    errors.password = t('auth.validate.passwordLong')
  }
  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = t('auth.validate.confirmMismatch')
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
    toast.success(t('auth.registerSuccess'))
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
    toast.success(t('auth.bootstrapSuccess'))
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
    <div class="auth-controls">
      <ThemeToggle />
      <LocaleSelect />
    </div>

    <div class="auth-card card">
      <div class="auth-brand">
        <span class="brand-logo"><Checked class="icon icon-lg" /></span>
        <h1>{{ t('app.title') }}</h1>
        <p class="muted">{{ t('auth.subtitle') }}</p>
      </div>

      <div class="field backend-field">
        <label for="backend-url">{{ t('auth.backendUrl') }}</label>
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
            {{ connStatus === 'checking' ? t('auth.checking') : t('auth.checkConnection') }}
          </button>
        </div>
        <p class="field-hint">{{ t('auth.backendUrlHint') }}</p>
        <p v-if="connStatus !== 'idle'" class="field-hint conn-hint" :class="{ 'conn-error': connStatus === 'error' }">
          <span class="status-dot" :class="connStatus"></span>
          {{ connMessage }}
        </p>
      </div>

      <div class="segmented auth-tabs">
        <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">
          {{ t('auth.tab.login') }}
        </button>
        <button type="button" :class="{ active: mode === 'register' }" @click="mode = 'register'">
          {{ t('auth.tab.register') }}
        </button>
        <button
          type="button"
          :class="{ active: mode === 'bootstrap', 'bootstrap-alert': adminProvisioned === false }"
          @click="mode = 'bootstrap'"
        >
          {{ t('auth.tab.bootstrap') }}
        </button>
      </div>

      <form v-if="mode === 'login'" class="form" novalidate @submit.prevent="login">
        <div v-if="loginError" class="form-banner banner-error">{{ loginError }}</div>
        <div class="field">
          <label for="login-id">{{ t('auth.userId') }}</label>
          <input
            id="login-id"
            v-model="loginForm.userId"
            type="text"
            maxlength="50"
            autocomplete="username"
            :placeholder="t('placeholder.userId')"
          />
        </div>
        <div class="field">
          <label for="login-password">{{ t('auth.password') }}</label>
          <input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            maxlength="128"
            autocomplete="current-password"
            :placeholder="t('placeholder.password')"
          />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loggingIn">
          {{ loggingIn ? t('auth.loggingIn') : t('auth.loginSubmit') }}
        </button>
      </form>

      <form v-else-if="mode === 'register'" class="form" novalidate @submit.prevent="register">
        <div v-if="registerError" class="form-banner banner-error">{{ registerError }}</div>
        <div class="field">
          <label for="register-id">{{ t('auth.userId') }} <span class="required">*</span></label>
          <input
            id="register-id"
            v-model="registerForm.userId"
            type="text"
            maxlength="50"
            autocomplete="username"
            :placeholder="t('placeholder.userIdPattern')"
            :class="{ invalid: registerErrors.userId }"
          />
          <p v-if="registerErrors.userId" class="field-error">{{ registerErrors.userId }}</p>
        </div>
        <div class="field">
          <label for="register-nickname">{{ t('auth.nickname') }} <span class="required">*</span></label>
          <input
            id="register-nickname"
            v-model="registerForm.nickname"
            type="text"
            maxlength="100"
            autocomplete="nickname"
            :placeholder="t('placeholder.nickname')"
            :class="{ invalid: registerErrors.nickname }"
          />
          <p v-if="registerErrors.nickname" class="field-error">{{ registerErrors.nickname }}</p>
        </div>
        <div class="field">
          <label for="register-password">{{ t('auth.password') }} <span class="required">*</span></label>
          <input
            id="register-password"
            v-model="registerForm.password"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            :placeholder="t('placeholder.passwordMin')"
            :class="{ invalid: registerErrors.password }"
          />
          <p v-if="registerErrors.password" class="field-error">{{ registerErrors.password }}</p>
        </div>
        <div class="field">
          <label for="register-confirm">{{ t('auth.confirmPassword') }} <span class="required">*</span></label>
          <input
            id="register-confirm"
            v-model="registerForm.confirmPassword"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            :placeholder="t('placeholder.confirmPassword')"
            :class="{ invalid: registerErrors.confirmPassword }"
          />
          <p v-if="registerErrors.confirmPassword" class="field-error">{{ registerErrors.confirmPassword }}</p>
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="registering">
          {{ registering ? t('auth.registering') : t('auth.registerSubmit') }}
        </button>
      </form>

      <form v-else class="form" novalidate @submit.prevent="bootstrap">
        <p class="form-note">{{ bootstrapNote() }}</p>
        <div v-if="bootstrapError" class="form-banner banner-error">{{ bootstrapError }}</div>
        <div class="field">
          <label for="bootstrap-id">{{ t('auth.adminId') }} <span class="required">*</span></label>
          <input
            id="bootstrap-id"
            v-model="bootstrapForm.userId"
            type="text"
            maxlength="50"
            autocomplete="username"
            :placeholder="t('placeholder.userIdPattern')"
            :disabled="bootstrapDisabled()"
            :class="{ invalid: bootstrapErrors.userId }"
          />
          <p v-if="bootstrapErrors.userId" class="field-error">{{ bootstrapErrors.userId }}</p>
        </div>
        <div class="field">
          <label for="bootstrap-nickname">{{ t('auth.nickname') }} <span class="required">*</span></label>
          <input
            id="bootstrap-nickname"
            v-model="bootstrapForm.nickname"
            type="text"
            maxlength="100"
            autocomplete="nickname"
            :placeholder="t('placeholder.nickname')"
            :disabled="bootstrapDisabled()"
            :class="{ invalid: bootstrapErrors.nickname }"
          />
          <p v-if="bootstrapErrors.nickname" class="field-error">{{ bootstrapErrors.nickname }}</p>
        </div>
        <div class="field">
          <label for="bootstrap-password">{{ t('auth.password') }} <span class="required">*</span></label>
          <input
            id="bootstrap-password"
            v-model="bootstrapForm.password"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            :placeholder="t('placeholder.passwordMin')"
            :disabled="bootstrapDisabled()"
            :class="{ invalid: bootstrapErrors.password }"
          />
          <p v-if="bootstrapErrors.password" class="field-error">{{ bootstrapErrors.password }}</p>
        </div>
        <div class="field">
          <label for="bootstrap-confirm">{{ t('auth.confirmPassword') }} <span class="required">*</span></label>
          <input
            id="bootstrap-confirm"
            v-model="bootstrapForm.confirmPassword"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            :placeholder="t('placeholder.confirmPassword')"
            :disabled="bootstrapDisabled()"
            :class="{ invalid: bootstrapErrors.confirmPassword }"
          />
          <p v-if="bootstrapErrors.confirmPassword" class="field-error">{{ bootstrapErrors.confirmPassword }}</p>
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="bootstrapping || bootstrapDisabled()">
          {{ bootstrapping ? t('auth.bootstrapping') : t('auth.bootstrapSubmit') }}
        </button>
      </form>

      <footer class="auth-footer">
        <span>{{ t('auth.footer') }}</span>
      </footer>
    </div>
  </div>
</template>
