const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatRelativeTime(value: string | null, now = Date.now()): string {
  if (!value) {
    return 'Unknown'
  }

  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) {
    return 'Unknown'
  }

  const seconds = Math.round((time - now) / 1000)
  if (Math.abs(seconds) < 60) {
    return 'Just now'
  }

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ]

  const [unit, duration] = units.find(([, size]) => Math.abs(seconds) >= size)!
  return formatter.format(Math.round(seconds / duration), unit)
}
