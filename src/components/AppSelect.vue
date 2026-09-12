<script setup lang="ts" generic="T extends string | number">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowDown, Check } from '@element-plus/icons-vue'
import { t } from '../i18n'

export interface AppSelectOption<T extends string | number = string> {
  value: T
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: T
    options: AppSelectOption<T>[]
    disabled?: boolean
    /** 未选中时触发器显示的灰色占位文本 */
    placeholder?: string
    /** 占满父容器宽度（表单内使用） */
    block?: boolean
    ariaLabel?: string
  }>(),
  { disabled: false, block: false, ariaLabel: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const open = ref(false)
const dropUp = ref(false)
const highlightedIndex = ref(0)
const typeaheadBuffer = ref('')
let typeaheadTimer: number | undefined
let outsideHandlerInstalled = false

const rootRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLUListElement | null>(null)

const selectedOption = computed(
  () => props.options.find((option) => option.value === props.modelValue) ?? null,
)

async function openPanel(): Promise<void> {
  if (props.disabled || open.value) return
  open.value = true
  const currentIndex = props.options.findIndex((option) => option.value === props.modelValue)
  highlightedIndex.value = currentIndex >= 0 ? currentIndex : 0
  installOutsideHandler()
  await nextTick()
  const rect = rootRef.value?.getBoundingClientRect()
  if (rect) {
    const panelHeight = panelRef.value?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom
    dropUp.value = panelHeight > spaceBelow && rect.top > panelHeight
  }
  scrollHighlightedIntoView()
}

function closePanel(refocus = true): void {
  if (!open.value) return
  open.value = false
  typeaheadBuffer.value = ''
  uninstallOutsideHandler()
  if (refocus) triggerRef.value?.focus()
}

function toggle(): void {
  if (open.value) closePanel()
  else void openPanel()
}

function selectOption(option: AppSelectOption<T>): void {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  closePanel()
}

function moveHighlight(delta: number): void {
  const count = props.options.length
  if (count === 0) return
  let index = highlightedIndex.value
  for (let step = 0; step < count; step++) {
    index = (index + delta + count) % count
    if (!props.options[index].disabled) break
  }
  highlightedIndex.value = index
  scrollHighlightedIntoView()
}

function scrollHighlightedIntoView(): void {
  void nextTick(() => {
    panelRef.value?.children[highlightedIndex.value]?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const { key } = event
  if (!open.value) {
    if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      void openPanel()
    }
    return
  }
  if (key === 'ArrowDown') {
    event.preventDefault()
    moveHighlight(1)
  } else if (key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(-1)
  } else if (key === 'Home') {
    event.preventDefault()
    highlightedIndex.value = 0
    scrollHighlightedIntoView()
  } else if (key === 'End') {
    event.preventDefault()
    highlightedIndex.value = Math.max(0, props.options.length - 1)
    scrollHighlightedIntoView()
  } else if (key === 'Enter' || key === ' ') {
    event.preventDefault()
    const option = props.options[highlightedIndex.value]
    if (option) selectOption(option)
  } else if (key === 'Escape') {
    event.preventDefault()
    closePanel()
  } else if (key === 'Tab') {
    closePanel(false)
  } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    typeaheadSearch(key)
  }
}

/** 打开状态下按字符检索选项（500ms 内的连续输入作为前缀匹配，循环查找） */
function typeaheadSearch(char: string): void {
  typeaheadBuffer.value += char.toLowerCase()
  if (typeaheadTimer) window.clearTimeout(typeaheadTimer)
  typeaheadTimer = window.setTimeout(() => {
    typeaheadBuffer.value = ''
  }, 500)
  const list = props.options
  if (list.length === 0) return
  const start = (highlightedIndex.value + 1) % list.length
  for (let offset = 0; offset < list.length; offset++) {
    const index = (start + offset) % list.length
    if (list[index].label.toLowerCase().includes(typeaheadBuffer.value)) {
      highlightedIndex.value = index
      scrollHighlightedIntoView()
      break
    }
  }
}

function onOutsideMousedown(event: MouseEvent): void {
  if (rootRef.value && event.target instanceof Node && !rootRef.value.contains(event.target)) {
    closePanel(false)
  }
}

function installOutsideHandler(): void {
  if (outsideHandlerInstalled) return
  window.addEventListener('mousedown', onOutsideMousedown, true)
  outsideHandlerInstalled = true
}

function uninstallOutsideHandler(): void {
  if (!outsideHandlerInstalled) return
  window.removeEventListener('mousedown', onOutsideMousedown, true)
  outsideHandlerInstalled = false
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closePanel(false)
  },
)

onBeforeUnmount(uninstallOutsideHandler)
</script>

<template>
  <div
    ref="rootRef"
    class="select-root"
    :class="{ 'select-block': block, 'select-root--open': open }"
    @keydown="onKeydown"
  >
    <button
      ref="triggerRef"
      type="button"
      class="select-trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      @click="toggle"
    >
      <span class="select-value" :class="{ 'is-placeholder': !selectedOption }">
        {{ selectedOption?.label ?? placeholder ?? t('common.pleaseSelect') }}
      </span>
      <ArrowDown class="select-chevron" />
    </button>

    <ul
      v-show="open"
      ref="panelRef"
      class="select-content"
      :class="{ 'select-content--up': dropUp }"
      role="listbox"
    >
      <li
        v-for="(option, index) in options"
        :key="String(option.value)"
        class="select-item"
        :class="{
          'is-highlighted': index === highlightedIndex,
          'is-selected': option.value === modelValue,
          'is-disabled': option.disabled,
        }"
        role="option"
        :aria-selected="option.value === modelValue"
        :aria-disabled="option.disabled || undefined"
        @click="selectOption(option)"
        @mousemove="highlightedIndex = index"
      >
        <span class="select-item-label">{{ option.label }}</span>
        <Check v-if="option.value === modelValue" class="select-item-check" />
      </li>
    </ul>
  </div>
</template>
