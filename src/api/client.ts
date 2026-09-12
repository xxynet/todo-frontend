import { useSession } from '../stores/session'
import { useBackend } from '../stores/backend'

/** 带 HTTP 状态码的接口错误；status 为 0 表示网络不可达 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return '操作失败，请稍后重试'
}

type QueryValue = string | number | boolean | null | undefined
type QueryParams = Record<string, QueryValue>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: QueryParams
  body?: unknown
  /** 匿名请求：不附带 Authorization，401 也不触发会话过期处理 */
  anonymous?: boolean
}

function buildUrl(path: string, query?: QueryParams): string {
  const apiBase = useBackend().apiBase.value
  let url = `${apiBase}${path}`
  if (query) {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue
      search.set(key, String(value))
    }
    const queryString = search.toString()
    if (queryString) url += `?${queryString}`
  }
  return url
}

function extractDetail(payload: unknown, response: Response): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string' && detail) return detail
    if (Array.isArray(detail)) {
      const parts = detail.map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          const entry = item as { msg?: unknown; loc?: unknown }
          const message = typeof entry.msg === 'string' ? entry.msg : String(entry.msg)
          if (Array.isArray(entry.loc) && entry.loc.length > 1) {
            return `${entry.loc.slice(1).join('.')}: ${message}`
          }
          return message
        }
        return String(item)
      })
      const joined = parts.join('；')
      if (joined) return joined
    }
  }
  return `请求失败（HTTP ${response.status}）`
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = useSession()
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = session.token.value
  if (!options.anonymous && token) headers['Authorization'] = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, '无法连接后端。请检查地址是否正确、服务是否启动，以及后端是否已启用 CORS。')
  }

  if (response.status === 204) return undefined as T

  let payload: unknown = null
  const text = await response.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !options.anonymous) session.handleUnauthorized()
    throw new ApiError(response.status, extractDetail(payload, response))
  }

  return (payload ?? undefined) as T
}
