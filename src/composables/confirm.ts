import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  visible: boolean
}

const state = reactive<ConfirmState>({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
})

let resolver: ((confirmed: boolean) => void) | null = null

/** 页面内确认对话框（替代 window.confirm），返回是否点击了确认 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  resolver?.(false)
  state.title = options.title
  state.message = options.message
  state.confirmText = options.confirmText ?? '确定'
  state.cancelText = options.cancelText ?? '取消'
  state.danger = options.danger ?? false
  state.visible = true
  return new Promise<boolean>((resolve) => {
    resolver = resolve
  })
}

export function settleConfirm(confirmed: boolean): void {
  if (!state.visible) return
  state.visible = false
  const resolve = resolver
  resolver = null
  resolve?.(confirmed)
}

export function useConfirmState(): ConfirmState {
  return state
}
