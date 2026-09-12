import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

const toasts = ref<ToastItem[]>([])
let nextId = 1

function dismiss(id: number): void {
  const index = toasts.value.findIndex((item) => item.id === id)
  if (index >= 0) toasts.value.splice(index, 1)
}

function show(kind: ToastKind, message: string, duration: number): void {
  const id = nextId++
  // 同一条消息只保留一个，避免重复报错时堆叠
  const existing = toasts.value.find((item) => item.kind === kind && item.message === message)
  if (existing) {
    dismiss(existing.id)
  }
  toasts.value.push({ id, kind, message })
  window.setTimeout(() => dismiss(id), duration)
}

export const toast = {
  success(message: string): void {
    show('success', message, 3000)
  },
  error(message: string): void {
    show('error', message, 5000)
  },
  info(message: string): void {
    show('info', message, 3000)
  },
  warning(message: string): void {
    show('warning', message, 4000)
  },
  dismiss,
}

export function useToasts() {
  return { toasts }
}
