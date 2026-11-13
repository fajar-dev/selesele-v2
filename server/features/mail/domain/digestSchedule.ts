/** Daily summaries are delivered at 08:00 Asia/Jakarta (01:00 UTC). */
export function nextDigestAt(now: Date): Date {
  const next = new Date(now)
  next.setUTCHours(1, 0, 0, 0)
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return next
}
