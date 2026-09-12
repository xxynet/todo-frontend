import { apiRequest } from './client'
import type { Todo, TodoCreatePayload, TodoListQuery, TodoUpdatePayload } from './types'

export function listTodos(params: TodoListQuery = {}): Promise<Todo[]> {
  return apiRequest<Todo[]>('/todos', { query: { ...params } })
}

export function getTodo(todoId: number): Promise<Todo> {
  return apiRequest<Todo>(`/todos/${todoId}`)
}

export function createTodo(payload: TodoCreatePayload): Promise<Todo> {
  return apiRequest<Todo>('/todos', { method: 'POST', body: payload })
}

export function updateTodo(todoId: number, payload: TodoUpdatePayload): Promise<Todo> {
  return apiRequest<Todo>(`/todos/${todoId}`, { method: 'PATCH', body: payload })
}

export function deleteTodo(todoId: number): Promise<void> {
  return apiRequest<void>(`/todos/${todoId}`, { method: 'DELETE' })
}
