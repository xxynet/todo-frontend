import { computed, reactive } from 'vue'
import type { User } from '../api/types'
import { useBackend } from './backend'

const STORAGE_KEY = 'todo-frontend/session'

interface SessionData {
  token: string | null
  expiresAt: string | null
  refreshToken: string | null
  refreshExpiresAt: string | null
  user: User | null
  backend: string
}

function emptySession(): SessionData {
  return { token: null, expiresAt: null, refreshToken: null, refreshExpiresAt: null, user: null, backend: '' }
}

function parseExpiresAt(value: string | null | undefined): number | null {
  if (!value) return null
  const text = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`
  const time = new Date(text).getTime()
  return Number.isNaN(time) ? null : time
}

function readStoredSession(): SessionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptySession()
    const parsed = JSON.parse(raw) as Partial<SessionData>
    if (typeof parsed.token !== 'string' || !parsed.token || typeof parsed.user !== 'object' || parsed.user === null) {
      return emptySession()
    }
    const expiresAtMs = parseExpiresAt(parsed.expiresAt ?? null)
    const refreshExpiresAtMs = parseExpiresAt(parsed.refreshExpiresAt ?? null)
    // 留 30 秒容差：刷新令牌过期（或旧格式数据没有刷新令牌且访问令牌已过期）才丢弃整个会话；
    // 仅访问令牌过期时保留会话，由请求层在 401 后自动用刷新令牌续期
    const expired = (ms: number | null): boolean => ms !== null && ms <= Date.now() - 30_000
    if (expired(refreshExpiresAtMs) || (refreshExpiresAtMs === null && expired(expiresAtMs))) {
      localStorage.removeItem(STORAGE_KEY)
      return emptySession()
    }
    const backend = typeof parsed.backend === 'string' ? parsed.backend : ''
    return {
      token: parsed.token,
      expiresAt: parsed.expiresAt ?? null,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      refreshExpiresAt: parsed.refreshExpiresAt ?? null,
      user: parsed.user,
      backend,
    }
  } catch {
    return emptySession()
  }
}

function loadStoredSession(): SessionData {
  const data = readStoredSession()
  if (data.backend) useBackend().setUrl(data.backend)
  return data
}

const state = reactive<SessionData>(loadStoredSession())

// 其他标签页刷新/清除会话时同步到本页，避免用过期令牌互相踢下线
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    Object.assign(state, readStoredSession())
  })
}

let unauthorizedHandler: (() => void) | null = null

function persist(): void {
  try {
    if (state.token) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: state.token,
          expiresAt: state.expiresAt,
          refreshToken: state.refreshToken,
          refreshExpiresAt: state.refreshExpiresAt,
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
    refreshToken: computed(() => state.refreshToken),
    refreshExpiresAt: computed(() => state.refreshExpiresAt),
    user: computed(() => state.user),
    isAuthenticated: computed(() => state.token !== null),
    setSession(
      token: string,
      expiresAt: string,
      refreshToken: string,
      refreshExpiresAt: string,
      user: User,
    ): void {
      state.token = token
      state.expiresAt = expiresAt
      state.refreshToken = refreshToken
      state.refreshExpiresAt = refreshExpiresAt
      state.user = user
      persist()
    },
    /** 刷新令牌轮换后仅更新令牌对，用户信息保持不变 */
    setTokens(
      token: string,
      expiresAt: string,
      refreshToken: string,
      refreshExpiresAt: string,
    ): void {
      state.token = token
      state.expiresAt = expiresAt
      state.refreshToken = refreshToken
      state.refreshExpiresAt = refreshExpiresAt
      persist()
    },
    setUser(user: User): void {
      state.user = user
      persist()
    },
    clear(): void {
      Object.assign(state, emptySession())
      persist()
    },
    /**
     * 若其他标签页已轮换令牌（本地存储与内存不一致），采纳存储中的新令牌。
     * 返回是否发生了采纳；用于刷新失败时避免误登出。
     */
    adoptStoredTokensIfChanged(): boolean {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return false
        const parsed = JSON.parse(raw) as { token?: unknown }
        if (typeof parsed.token !== 'string' || parsed.token === state.token) return false
      } catch {
        return false
      }
      Object.assign(state, readStoredSession())
      return state.token !== null
    },
    onUnauthorized(handler: () => void): void {
      unauthorizedHandler = handler
    },
    handleUnauthorized(): void {
      unauthorizedHandler?.()
    },
  }
}
