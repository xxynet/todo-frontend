import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'todo-frontend/theme'

function detectTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // 忽略存储不可用
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const theme = ref<ThemeMode>(detectTheme())

function applyTheme(): void {
  document.documentElement.dataset.theme = theme.value
}

function setTheme(next: ThemeMode): void {
  theme.value = next
  applyTheme()
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 忽略存储失败
  }
}

function toggleTheme(): void {
  setTheme(theme.value === 'dark' ? 'light' : 'dark')
}

applyTheme()

export function useTheme() {
  return {
    theme: computed(() => theme.value),
    setTheme,
    toggleTheme,
  }
}
