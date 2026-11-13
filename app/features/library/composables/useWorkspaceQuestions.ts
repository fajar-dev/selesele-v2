import type { KnowledgeAnswer } from '#shared/contracts/library'
import { useApi } from '~/core/http/useApi'
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'

export function useWorkspaceQuestions(workspaceId: string) {
  const { library } = useApi()
  const question = ref('')
  const submitted = ref('')
  const answer = ref<KnowledgeAnswer | null>(null)
  const busy = ref(false)
  const error = ref('')
  let active = true
  onScopeDispose(() => {
    active = false
  })
  async function ask(value = question.value) {
    if (busy.value || value.trim().length < 3) {
      return
    }
    submitted.value = value.trim()
    question.value = ''
    busy.value = true
    error.value = ''
    answer.value = null
    try {
      const result = await library.answer(submitted.value, workspaceId)
      if (active) {
        answer.value = result.data
      }
    } catch (cause) {
      if (active) {
        error.value = errorMessage(cause)
      }
    } finally {
      if (active) {
        busy.value = false
      }
    }
  }
  useFeedbackToast(error, { key: `workspace-answer:${workspaceId}`, title: 'Couldn’t prepare an answer', retry: () => active ? ask(submitted.value) : navigateTo(`/workspaces/${workspaceId}/ask`) })
  return { question, submitted, answer, busy, error, ask }
}
