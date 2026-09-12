import { computed, ref } from 'vue'
import { zhCN } from './zh-CN'
import { en } from './en'

export type Locale = 'zh-CN' | 'en'
/** 所有可用文案键（以 zh-CN 为基准，en 必须同构） */
export type MessageKey = keyof typeof zhCN

const STORAGE_KEY = 'todo-frontend/locale'

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  en,
}

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh-CN' || stored === 'en') return stored
  } catch {
    // 忽略存储不可用（如隐私模式）
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

const locale = ref<Locale>(detectLocale())

/** 切换语言并持久化。语言名用各自母语显示（中文 / English），无需翻译 */
export function setLocale(next: Locale): void {
  locale.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 忽略存储失败
  }
}

/** 取文案。支持 {name} 形式的插值；在组件渲染上下文中随 locale 自动更新 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = dictionaries[locale.value][key] ?? dictionaries['zh-CN'][key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  )
}

export function useI18n() {
  return {
    locale: computed(() => locale.value),
    setLocale,
    t,
  }
}
