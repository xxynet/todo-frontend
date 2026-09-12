import { apiRequest } from './client'
import type { Category, CategoryPermission, CategoryPermissionRole } from './types'

export function listCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories')
}

export function createCategory(name: string): Promise<Category> {
  return apiRequest<Category>('/categories', { method: 'POST', body: { name } })
}

export function updateCategory(categoryId: number, name: string): Promise<Category> {
  return apiRequest<Category>(`/categories/${categoryId}`, { method: 'PATCH', body: { name } })
}

export function deleteCategory(categoryId: number): Promise<void> {
  return apiRequest<void>(`/categories/${categoryId}`, { method: 'DELETE' })
}

export function listPermissions(categoryId: number): Promise<CategoryPermission[]> {
  return apiRequest<CategoryPermission[]>(`/categories/${categoryId}/permissions`)
}

export function setPermission(
  categoryId: number,
  userId: string,
  role: CategoryPermissionRole,
): Promise<CategoryPermission> {
  return apiRequest<CategoryPermission>(
    `/categories/${categoryId}/permissions/${encodeURIComponent(userId)}`,
    { method: 'PUT', body: { role } },
  )
}

export function deletePermission(categoryId: number, userId: string): Promise<void> {
  return apiRequest<void>(`/categories/${categoryId}/permissions/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}
