<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Checked, SwitchButton } from '@element-plus/icons-vue'
import { useSession } from './stores/session'
import { useAuth } from './stores/auth'
import { toast } from './composables/toast'
import { getErrorMessage } from './api/client'
import { t, useI18n } from './i18n'
import ToastHost from './components/ToastHost.vue'
import ConfirmHost from './components/ConfirmHost.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import LocaleSelect from './components/LocaleSelect.vue'

const route = useRoute()
const router = useRouter()
const session = useSession()
const { locale } = useI18n()

// 后端返回 401 时统一清除本地会话并回到登录页
session.onUnauthorized(() => {
  const wasAuthenticated = session.isAuthenticated.value
  session.clear()
  if (wasAuthenticated) {
    toast.warning(t('errors.sessionExpired'))
  }
  if (route.path !== '/login') {
    void router.push({
      path: '/login',
      query: route.fullPath !== '/' ? { redirect: route.fullPath } : undefined,
    })
  }
})

// 同步浏览器标签标题与 html lang 属性
watchEffect(() => {
  document.title = t('app.title')
  document.documentElement.lang = locale.value
})

const showChrome = computed(() => route.meta.chrome === true && session.isAuthenticated.value)

const avatarText = computed(() => {
  const nickname = session.user.value?.nickname ?? ''
  return nickname ? nickname.slice(0, 1).toUpperCase() : '?'
})

const navItems = computed(() => [
  { path: '/todos', label: t('nav.todos') },
  { path: '/categories', label: t('nav.categories') },
  { path: '/profile', label: t('nav.profile') },
])

async function logout(): Promise<void> {
  try {
    await useAuth().logout()
    toast.success(t('common.loggedOut'))
  } catch (error) {
    toast.error(getErrorMessage(error))
    session.clear()
  }
  await router.replace('/login')
}
</script>

<template>
  <div class="app">
    <header v-if="showChrome" class="app-header">
      <div class="app-container header-inner">
        <RouterLink to="/todos" class="brand">
          <span class="brand-logo"><Checked class="icon" /></span>
          <span class="brand-name">TODO</span>
        </RouterLink>

        <nav class="app-nav">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            active-class="active"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="header-user">
          <ThemeToggle />
          <LocaleSelect />
          <RouterLink to="/profile" class="user-chip" :title="t('nav.profile')">
            <span class="avatar avatar-sm">{{ avatarText }}</span>
            <span class="user-name">{{ session.user.value?.nickname }}</span>
            <span v-if="session.user.value?.role === 'admin'" class="chip chip-role-edit">
              {{ t('role.admin') }}
            </span>
          </RouterLink>
          <button type="button" class="btn btn-sm" @click="logout">
            <SwitchButton class="icon" />
            {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </header>

    <main class="app-main" :class="{ 'app-main-full': !showChrome }">
      <RouterView />
    </main>

    <ToastHost />
    <ConfirmHost />
  </div>
</template>
