<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Checked, Folder, List, User } from '@element-plus/icons-vue'
import { useSession } from './stores/session'
import { toast } from './composables/toast'
import { t, useI18n } from './i18n'
import ToastHost from './components/ToastHost.vue'
import ConfirmHost from './components/ConfirmHost.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import LocaleSelect from './components/LocaleSelect.vue'
import UserMenu from './components/UserMenu.vue'

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

const navItems = computed<{ path: string; label: string; icon: Component }[]>(() => [
  { path: '/todos', label: t('nav.todos'), icon: List },
  { path: '/categories', label: t('nav.categories'), icon: Folder },
  { path: '/profile', label: t('nav.profile'), icon: User },
])
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
            :aria-label="item.label"
          >
            <component :is="item.icon" class="icon" />
            <span class="nav-label">{{ item.label }}</span>
          </RouterLink>
        </nav>

        <div class="header-user">
          <ThemeToggle />
          <LocaleSelect />
          <UserMenu />
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
