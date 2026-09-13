<script setup lang="ts">
import { computed } from 'vue'
import type { ActivityDay } from '../api/types'
import { t, useI18n } from '../i18n'

/** GitHub 风格的贡献热力图：列为周、行为星期，颜色深浅表示当日新建待办数 */
const props = defineProps<{ days: ActivityDay[] }>()

const { locale } = useI18n()

/** "YYYY-MM-DD" → 本地时区的 Date（直接 new Date(str) 会按 UTC 解析导致日期偏移） */
function toLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function isoDay(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** null 表示范围外的补位格（不渲染颜色） */
interface HeatCell {
  date: string
  count: number
}
type HeatWeek = (HeatCell | null)[]

const weeks = computed<HeatWeek[]>(() => {
  if (props.days.length === 0) return []
  const cells: (HeatCell | null)[] = []
  // 首列对齐到周日（getDay(): 周日 = 0），不足一周的前导补空
  const leading = toLocalDate(props.days[0].date).getDay()
  for (let i = 0; i < leading; i += 1) cells.push(null)
  for (const day of props.days) cells.push({ date: day.date, count: day.count })
  while (cells.length % 7 !== 0) cells.push(null)

  const columns: HeatWeek[] = []
  for (let start = 0; start < cells.length; start += 7) {
    columns.push(cells.slice(start, start + 7))
  }
  return columns
})

function levelOf(count: number): number {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 4) return 2
  if (count <= 6) return 3
  return 4
}

const monthLabels = computed<string[]>(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, { month: 'short' })
  let labeledMonth = -1
  return weeks.value.map((week) => {
    const first = week.find((cell): cell is HeatCell => cell !== null)
    if (!first) return ''
    const month = toLocalDate(first.date).getMonth()
    if (month === labeledMonth) return ''
    labeledMonth = month
    return formatter.format(toLocalDate(first.date))
  })
})

/** 首行为周日；标签放在周一 / 周三 / 周五行（grid-row 从 1 计） */
const weekdayLabels = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' })
  const sunday = new Date(2026, 0, 4)
  return [2, 4, 6].map((row) => ({
    row,
    label: formatter.format(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + row - 1)),
  }))
})

const summaryText = computed(() => {
  const total = props.days.reduce((sum, day) => sum + day.count, 0)
  const activeDays = props.days.filter((day) => day.count > 0).length
  return t('profile.heatmap.summary', { total, days: activeDays })
})

function cellTitle(cell: HeatCell): string {
  const dateText = new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(
    toLocalDate(cell.date),
  )
  if (cell.count > 0) return t('profile.heatmap.tip', { date: dateText, count: cell.count })
  return t('profile.heatmap.tipEmpty', { date: dateText })
}
</script>

<template>
  <section class="card profile-section profile-heatmap-card">
    <h3>{{ t('profile.heatmap.title') }}</h3>
    <p class="muted heatmap-summary">{{ summaryText }}</p>
    <div class="heatmap-scroll">
      <div class="heatmap-body">
        <div class="heatmap-weekdays" aria-hidden="true">
          <span
            v-for="item in weekdayLabels"
            :key="item.row"
            class="heatmap-weekday"
            :style="{ gridRow: item.row }"
          >{{ item.label }}</span>
        </div>
        <div>
          <div class="heatmap-months" aria-hidden="true">
            <span v-for="(label, index) in monthLabels" :key="index" class="heatmap-month">{{ label }}</span>
          </div>
          <div class="heatmap-grid" role="img" :aria-label="summaryText">
            <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="heatmap-week">
              <span
                v-for="(cell, cellIndex) in week"
                :key="cellIndex"
                class="heatmap-cell"
                :class="cell ? `heatmap-level-${levelOf(cell.count)}` : 'heatmap-cell-empty'"
                :title="cell ? cellTitle(cell) : undefined"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="heatmap-legend">
        <span class="muted">{{ t('profile.heatmap.less') }}</span>
        <span
          v-for="level in 5"
          :key="level"
          class="heatmap-cell"
          :class="`heatmap-level-${level - 1}`"
        />
        <span class="muted">{{ t('profile.heatmap.more') }}</span>
      </div>
    </div>
  </section>
</template>
