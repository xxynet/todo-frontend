import { login as loginRequest, logout as logoutRequest } from '../api/auth'
import { getMe } from '../api/users'
import { useSession } from './session'

export function useAuth() {
  const session = useSession()

  async function login(userId: string, password: string): Promise<void> {
    const result = await loginRequest({ user_id: userId.trim(), password })
    session.setSession(
      result.access_token,
      result.expires_at,
      result.refresh_token,
      result.refresh_expires_at,
      result.user,
    )
  }

  async function logout(): Promise<void> {
    try {
      await logoutRequest()
    } catch {
      // 令牌已失效等情况忽略，本地会话照常清除
    }
    session.clear()
  }

  /** 校验本地保存的令牌是否仍然有效（应用启动时调用一次） */
  async function validateStoredSession(): Promise<void> {
    if (!session.token.value) return
    try {
      session.setUser(await getMe())
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status === 401 || status === 403) session.clear()
      // 网络异常则保留会话，由页面提示连接问题
    }
  }

  return { login, logout, validateStoredSession }
}
