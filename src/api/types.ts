/** 后端 API 数据结构定义（与 app/schemas.py 对应） */

export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  nickname: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface SetupStatus {
  admin_provisioned: boolean
}

export interface ActivityDay {
  /** 本地日历日 YYYY-MM-DD */
  date: string
  count: number
}

export interface UserActivity {
  days: ActivityDay[]
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  expires_at: string
  refresh_token: string
  refresh_expires_at: string
  user: User
}

export interface Category {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export type CategoryPermissionRole = 'view' | 'edit'

export interface CategoryPermission {
  category_id: number
  user_id: string
  role: CategoryPermissionRole
  created_at: string
}

export interface Todo {
  id: number
  user_id: string
  title: string
  description: string | null
  completed: boolean
  category_id: number | null
  category: Category | null
  tags: string[]
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  created_at: string
  updated_at: string
}

export interface TodoCreatePayload {
  user_id: string
  title: string
  description?: string | null
  completed?: boolean
  category_id?: number | null
  tags?: string[]
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
}

export interface TodoUpdatePayload {
  title?: string
  description?: string | null
  completed?: boolean
  category_id?: number | null
  tags?: string[]
  scheduled_start_at?: string | null
  scheduled_end_at?: string | null
}

export interface TodoListQuery {
  completed?: boolean
  category_id?: number
  offset?: number
  limit?: number
}
