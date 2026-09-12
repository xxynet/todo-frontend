<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sunny } from '@element-plus/icons-vue'
import { t } from '../i18n'
import { useTheme } from '../stores/theme'

const { theme, toggleTheme } = useTheme()

const isDark = computed(() => theme.value === 'dark')
const title = computed(() => t(isDark.value ? 'theme.toLight' : 'theme.toDark'))
</script>

<template>
  <button type="button" class="icon-btn theme-toggle" :aria-label="title" :title="title" @click="toggleTheme">
    <Sunny v-if="isDark" class="icon" />
    <Moon v-else class="icon" />
  </button>
</template>
