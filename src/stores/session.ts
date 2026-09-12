import { computed, reactive } from 'vue'
import type { User } from '../api/types'
import { useBackend } from './backend'

const STORAGE_KEY = 'todo-frontend/session'

interface SessionData {
  token: string | null
  expiresAt: string | null
  user: User | null
  backend: string
}

function emptySession(): SessionData {
  return { token: null, expiresAt: null, user: null, backend: '' }
}

function parseExpiresAt(value: string | null | undefined): number | null {
  if (!value) return null
  const text = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`
  const time = new Date(text).getTime()
  return Number.isNaN(time) ? null : time
}

function loadStoredSession(): SessionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptySession()
    const parsed = JSON.parse(raw) as Partial<SessionData>
    if (typeof parsed.token !== 'string' || !parsed.token || typeof parsed.user !== 'object' || parsed.user === null) {
      return emptySession()
    }
    const expiresAtMs = parseExpiresAt(parsed.expiresAt ?? null)
    // 本地时间已过期的令牌直接丢弃（留 30 秒容差）
    if (expiresAtMs !== null && expiresAtMs <= Date.now() - 30_000) {
      localStorage.removeItem(STORAGE_KEY)
      return emptySession()
    }
    const backend = typeof parsed.backend === 'string' ? parsed.backend : ''
    if (backend) useBackend().setUrl(backend)
    return { token: parsed.token, expiresAt: parsed.expiresAt ?? null, user: parsed.user, backend }
  } catch {
    return emptySession()
  }
}

const state = reactive<SessionData>(loadStoredSession())

let unauthorizedHandler: (() => void) | null = null

function persist(): void {
  try {
    if (state.token) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: state.token,
          expiresAt: state.expiresAt,
          user: state.user,
          backend: useBackend().url.value,
        }),
      )
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // 忽略存储失败（如隐私模式）
  }
}

export function useSession() {
  return {
    token: computed(() => state.token),
    expiresAt: computed(() => state.expiresAt),
    user: computed(() => state.user),
    isAuthenticated: computed(() => state.token !== null),
    setSession(token: string, expiresAt: string, user: User): void {
      state.token = token
      state.expiresAt = expiresAt
      state.user = user
      persist()
    },
    setUser(user: User): void {
      state.user = user
      persist()
    },
    clear(): void {
      state.token = null
      state.expiresAt = null
      state.user = null
      persist()
    },
    onUnauthorized(handler: () => void): void {
      unauthorizedHandler = handler
    },
    handleUnauthorized(): void {
      unauthorizedHandler?.()
    },
  }
}
