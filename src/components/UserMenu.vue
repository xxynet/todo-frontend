<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, SwitchButton, User } from '@element-plus/icons-vue'
import { useSession } from '../stores/session'
import { useAuth } from '../stores/auth'
import { toast } from '../composables/toast'
import { getErrorMessage } from '../api/client'
import { t } from '../i18n'

const router = useRouter()
const session = useSession()

const open = ref(false)
const highlightedIndex = ref(0)
const rootRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLDivElement | null>(null)
let outsideHandlerInstalled = false

const avatarText = computed(() => {
  const nickname = session.user.value?.nickname ?? ''
  return nickname ? nickname.slice(0, 1).toUpperCase() : '?'
})

function itemElements(): HTMLElement[] {
  return Array.from(panelRef.value?.querySelectorAll<HTMLElement>('.user-menu-item') ?? [])
}

function openPanel(): void {
  if (open.value) return
  open.value = true
  highlightedIndex.value = 0
  installOutsideHandler()
}

function closePanel(refocus = true): void {
  if (!open.value) return
  open.value = false
  uninstallOutsideHandler()
  if (refocus) triggerRef.value?.focus()
}

function toggle(): void {
  if (open.value) closePanel()
  else openPanel()
}

function moveHighlight(delta: number): void {
  const count = itemElements().length
  if (count === 0) return
  highlightedIndex.value = (highlightedIndex.value + delta + count) % count
}

function onKeydown(event: KeyboardEvent): void {
  const { key } = event
  if (!open.value) {
    if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      openPanel()
    }
    return
  }
  if (key === 'ArrowDown') {
    event.preventDefault()
    moveHighlight(1)
  } else if (key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(-1)
  } else if (key === 'Enter' || key === ' ') {
    event.preventDefault()
    itemElements()[highlightedIndex.value]?.click()
  } else if (key === 'Escape') {
    event.preventDefault()
    closePanel()
  } else if (key === 'Tab') {
    closePanel(false)
  }
}

function onOutsideMousedown(event: MouseEvent): void {
  if (rootRef.value && event.target instanceof Node && !rootRef.value.contains(event.target)) {
    closePanel(false)
  }
}

function installOutsideHandler(): void {
  if (outsideHandlerInstalled) return
  window.addEventListener('mousedown', onOutsideMousedown, true)
  outsideHandlerInstalled = true
}

function uninstallOutsideHandler(): void {
  if (!outsideHandlerInstalled) return
  window.removeEventListener('mousedown', onOutsideMousedown, true)
  outsideHandlerInstalled = false
}

onBeforeUnmount(uninstallOutsideHandler)

async function logout(): Promise<void> {
  closePanel(false)
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
  <div ref="rootRef" class="user-menu" :class="{ 'user-menu--open': open }" @keydown="onKeydown">
    <button
      ref="triggerRef"
      type="button"
      class="user-chip"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="t('nav.account')"
      @click="toggle"
    >
      <span class="avatar avatar-sm">{{ avatarText }}</span>
      <span class="user-name">{{ session.user.value?.nickname }}</span>
      <span v-if="session.user.value?.role === 'admin'" class="chip chip-role-edit">
        {{ t('role.admin') }}
      </span>
      <ArrowDown class="user-menu-chevron" />
    </button>

    <div v-show="open" ref="panelRef" class="user-menu-panel" role="menu">
      <RouterLink
        to="/profile"
        class="user-menu-item"
        :class="{ 'is-highlighted': highlightedIndex === 0 }"
        role="menuitem"
        @click="closePanel(false)"
        @mousemove="highlightedIndex = 0"
      >
        <User class="icon" />
        <span>{{ t('nav.profile') }}</span>
      </RouterLink>
      <button
        type="button"
        class="user-menu-item user-menu-item--danger"
        :class="{ 'is-highlighted': highlightedIndex === 1 }"
        role="menuitem"
        @click="logout"
        @mousemove="highlightedIndex = 1"
      >
        <SwitchButton class="icon" />
        <span>{{ t('nav.logout') }}</span>
      </button>
    </div>
  </div>
</template>
