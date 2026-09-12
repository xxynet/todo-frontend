<script setup lang="ts">
import { computed } from 'vue'
import { t, useI18n, type Locale } from '../i18n'
import AppSelect, { type AppSelectOption } from './AppSelect.vue'

const { locale, setLocale } = useI18n()

/** 语言名用各自母语显示（中文 / English），两种界面语言下保持不变 */
const options: AppSelectOption<Locale>[] = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en', label: 'English' },
]

const model = computed<Locale>({
  get: () => locale.value,
  set: (value) => setLocale(value),
})

const ariaLabel = computed(() => t('language.aria'))
</script>

<template>
  <AppSelect v-model="model" class="locale-select" :options="options" :aria-label="ariaLabel" />
</template>
