<script setup lang="ts">
import { ref } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { t } from '../i18n'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    max?: number
    placeholder?: string
  }>(),
  {
    max: 20,
    placeholder: undefined,
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
    hint.value = t('tagInput.tooLong')
    return
  }
  if (props.modelValue.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
    hint.value = t('tagInput.duplicate')
    return
  }
  if (props.modelValue.length >= props.max) {
    hint.value = t('tagInput.tooMany', { max: props.max })
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
      <button
        type="button"
        class="tag-remove"
        :aria-label="t('tagInput.removeAria', { tag })"
        @click.stop="removeTag(index)"
      >
        <Close class="icon" />
      </button>
    </span>
    <input
      ref="inputElement"
      v-model="inputText"
      type="text"
      :placeholder="modelValue.length === 0 ? (placeholder || t('tagInput.placeholder')) : ''"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <span v-if="hint" class="tag-hint">{{ hint }}</span>
  </div>
</template>
