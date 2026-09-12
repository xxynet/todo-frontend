<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Checked, SwitchButton } from '@element-plus/icons-vue'
import { useSession } from './stores/session'
import { useAuth } from './stores/auth'
import { toast } from './composables/toast'
import { getErrorMessage } from './api/client'
import ToastHost from './components/ToastHost.vue'
import ConfirmHost from './components/ConfirmHost.vue'

const route = useRoute()
const router = useRouter()
const session = useSession()

// 后端返回 401 时统一清除本地会话并回到登录页
session.onUnauthorized(() => {
  const wasAuthenticated = session.isAuthenticated.value
  session.clear()
  if (wasAuthenticated) {
    toast.warning('登录已过期，请重新登录')
  }
  if (route.path !== '/login') {
    void router.push({
      path: '/login',
      query: route.fullPath !== '/' ? { redirect: route.fullPath } : undefined,
    })
  }
})

const showChrome = computed(() => route.meta.chrome === true && session.isAuthenticated.value)

const avatarText = computed(() => {
  const nickname = session.user.value?.nickname ?? ''
  return nickname ? nickname.slice(0, 1).toUpperCase() : '?'
})

const navItems = [
  { path: '/todos', label: '待办事项' },
  { path: '/categories', label: '分类' },
  { path: '/profile', label: '个人中心' },
]

async function logout(): Promise<void> {
  try {
    await useAuth().logout()
    toast.success('已退出登录')
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
          <RouterLink to="/profile" class="user-chip" title="个人中心">
            <span class="avatar avatar-sm">{{ avatarText }}</span>
            <span class="user-name">{{ session.user.value?.nickname }}</span>
            <span v-if="session.user.value?.role === 'admin'" class="chip chip-role-edit">管理员</span>
          </RouterLink>
          <button type="button" class="btn btn-sm" @click="logout">
            <SwitchButton class="icon" />
            退出
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
