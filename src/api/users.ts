import { apiRequest } from './client'
import type { SetupStatus, User, UserRole } from './types'

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

export function getUser(userId: string): Promise<User> {
  return apiRequest<User>(`/users/${encodeURIComponent(userId)}`, { anonymous: true })
}

export function formatRole(role: UserRole): string {
  return role === 'admin' ? '管理员' : '普通用户'
}
