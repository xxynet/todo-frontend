import { apiRequest } from './client'
import type { LoginResponse } from './types'

export function login(payload: { user_id: string; password: string }): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload, anonymous: true })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}
