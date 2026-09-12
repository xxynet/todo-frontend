<script setup lang="ts">
import { ref } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    max?: number
    placeholder?: string
  }>(),
  {
    max: 20,
    placeholder: '输入后回车添加',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const inputText = ref('')
const inputElement = ref<HTMLInputElement | null>(null)
const hint = ref('')

function commit(): void {
  const raw = inputText.value
  if (!raw.trim()) {
    inputText.value = ''
    return
  }
  const name = raw.trim()
  inputText.value = ''
  hint.value = ''
  if (name.length > 50) {
    hint.value = '标签最长 50 个字符'
    return
  }
  if (props.modelValue.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
    hint.value = '标签已存在'
    return
  }
  if (props.modelValue.length >= props.max) {
    hint.value = `最多添加 ${props.max} 个标签`
    return
  }
  emit('update:modelValue', [...props.modelValue, name])
}

function removeTag(index: number): void {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    commit()
  } else if (event.key === 'Backspace' && !inputText.value && props.modelValue.length > 0) {
    removeTag(props.modelValue.length - 1)
  }
}

function onBlur(): void {
  commit()
}

defineExpose({ focus: () => inputElement.value?.focus() })
</script>

<template>
  <div class="tag-input" @click="inputElement?.focus()">
    <span v-for="(tag, index) in modelValue" :key="tag" class="tag-chip">
      # {{ tag }}
      <button type="button" class="tag-remove" :aria-label="`移除标签 ${tag}`" @click.stop="removeTag(index)">
        <Close class="icon" />
      </button>
    </span>
    <input
      ref="inputElement"
      v-model="inputText"
      type="text"
      :placeholder="modelValue.length === 0 ? placeholder : ''"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <span v-if="hint" class="tag-hint">{{ hint }}</span>
  </div>
</template>
