export const deliveryPolicy = Object.freeze({ maxAttempts: 6, leaseMs: 120_000, pollMs: 5000, batchSize: 10 })

export function nextDeliveryAttempt(attempts: number, now: Date): Date | null {
  if (attempts >= deliveryPolicy.maxAttempts) {
    return null
  }
  return new Date(now.getTime() + Math.min(3_600_000, 30_000 * 2 ** Math.max(0, attempts - 1)))
}
