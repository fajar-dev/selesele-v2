import type { MaybeRefOrGetter } from 'vue'

interface FeedbackOptions {
  key: string
  title: string
  color?: 'error' | 'warning' | 'neutral'
  retry?: () => unknown | Promise<unknown>
  recovered?: MaybeRefOrGetter<boolean>
}

/** Shared query notices are announced once per failure, including across consumers. */
export function useFeedbackToast(source: MaybeRefOrGetter<unknown>, options: FeedbackOptions) {
  const toast = useToast()
  const announced = useState<Record<string, string>>('feedback-announcements', () => ({}))
  let retrying = false
  const show = (cause: unknown) => {
    const message = typeof cause === 'string' ? cause : errorMessage(cause)
    if (announced.value[options.key] === message) {
      return
    }
    announced.value[options.key] = message
    toast.add({
      id: `feedback:${options.key}`,
      title: options.title,
      description: message,
      color: options.color || 'error',
      ...(options.retry
        ? { actions: [{ label: 'Try again', color: 'neutral' as const, variant: 'outline' as const, onClick: async () => {
            if (retrying) {
              return
            }
            retrying = true
            Reflect.deleteProperty(announced.value, options.key)
            try {
              await options.retry!()
            } catch (error) {
              show(error)
            } finally {
              retrying = false
            }
          } }] }
        : {})
    })
  }
  onMounted(() => {
    watch([() => toValue(source), () => options.recovered ? toValue(options.recovered) : !toValue(source)], ([cause, recovered]) => {
      if (cause) {
        show(cause)
      } else if (recovered) {
        Reflect.deleteProperty(announced.value, options.key)
      }
    }, { immediate: true, flush: 'sync' })
  })
}
