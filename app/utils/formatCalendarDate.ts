const calendarDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function formatCalendarDate(value: string): string {
  return calendarDate.format(new Date(value))
}
