import { apiRequest } from './client'
import type { SetupStatus, User, UserActivity, UserRole } from './types'
import { t } from '../i18n'

export function getSetupStatus(): Promise<SetupStatus> {
  return apiRequest<SetupStatus>('/setup/status', { anonymous: true })
}

export function getHealth(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/health', { anonymous: true })
}

export function bootstrapAdmin(payload: { id: string; nickname: string; password: string }): Promise<User> {
  return apiRequest<User>('/users/bootstrap-admin', {
    method: 'POST',
    body: { ...payload, role: 'admin' as const },
    anonymous: true,
  })
}

export function registerUser(payload: { id: string; nickname: string; password: string }): Promise<User> {
  return apiRequest<User>('/users/register', { method: 'POST', body: payload, anonymous: true })
}

export function getMe(): Promise<User> {
  return apiRequest<User>('/users/me')
}

export function updateMe(payload: { nickname?: string; password?: string }): Promise<User> {
  return apiRequest<User>('/users/me', { method: 'PATCH', body: payload })
}

/** 最近一年的每日新建待办数；tz 为本地时区相对 UTC 的偏移分钟数（东八区 480） */
export function getMyActivity(): Promise<UserActivity> {
  return apiRequest<UserActivity>('/users/me/activity', {
    query: { tz: -new Date().getTimezoneOffset() },
  })
}

export function getUser(userId: string): Promise<User> {
  return apiRequest<User>(`/users/${encodeURIComponent(userId)}`, { anonymous: true })
}

export function formatRole(role: UserRole): string {
  return t(role === 'admin' ? 'role.admin' : 'role.user')
}
