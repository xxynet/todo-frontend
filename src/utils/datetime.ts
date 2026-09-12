/** 解析后端返回的时间字符串。SQLite 可能返回不带时区的字符串；
 *  前端始终以 UTC 发送时间，因此无时区标记时按 UTC 解析。 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const text = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value.trim()) ? value.trim() : `${value.trim()}Z`
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** 2026-09-12 19:52 */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseApiDate(value)
  if (!date) return '—'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseApiDate(value)
  if (!date) return '—'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** datetime-local 输入框的值（本地时区） */
export function formatDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** datetime-local 值 → UTC ISO 字符串；空值返回 null */
export function toIsoDateTime(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/** 比较两个 API 时间字符串是否为同一时刻 */
export function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  const da = parseApiDate(a)
  const db = parseApiDate(b)
  return da !== null && db !== null && da.getTime() === db.getTime()
}

function dayLabel(date: Date): string {
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOf(date) - startOf(now)) / 86_400_000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === -1) return '昨天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function timeLabel(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 排期展示文本：同一天合并显示，带 今天/明天 等前缀 */
export function formatSchedule(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
): string {
  const start = parseApiDate(startAt)
  if (!start) return ''
  const end = parseApiDate(endAt)
  const sameDay =
    end !== null &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  if (end === null) return `${dayLabel(start)} ${timeLabel(start)} 开始`
  if (sameDay) return `${dayLabel(start)} ${timeLabel(start)} ~ ${timeLabel(end)}`
  return `${dayLabel(start)} ${timeLabel(start)} ~ ${dayLabel(end)} ${timeLabel(end)}`
}
