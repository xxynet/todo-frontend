import { computed, reactive } from 'vue'
import { t } from '../i18n'

const STORAGE_KEY = 'todo-frontend/backend'

const state = reactive({ url: localStorage.getItem(STORAGE_KEY) ?? '' })

/** 校验并规范化后端地址：必须 http(s) 协议，去掉末尾斜杠 */
export function normalizeBackendUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(t('backend.required'))
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(t('backend.invalid'))
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(t('backend.protocol'))
  }
  return url.href.replace(/\/$/, '')
}

export function useBackend() {
  return {
    /** 空字符串表示使用开发代理的默认后端 */
    url: computed(() => state.url),
    apiBase: computed(() => (state.url ? `${state.url}/api/v1` : '/api/v1')),
    setUrl(url: string): void {
      state.url = url
      try {
        if (url) localStorage.setItem(STORAGE_KEY, url)
        else localStorage.removeItem(STORAGE_KEY)
      } catch {
        // 忽略存储失败
      }
    },
  }
}
