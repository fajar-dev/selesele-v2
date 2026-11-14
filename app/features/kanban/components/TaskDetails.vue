<script setup lang="ts">
import { canonicalJson } from '#shared/kernel/json'
import type { KanbanTask, KanbanContent } from '#shared/kernel/content'
import type { WorkspaceMember } from '#shared/contracts/workspace'
import DetailPanel from '~/components/ui/DetailPanel.vue'

const { task, columns, members, readonly = false, canComment = false, onSave } = defineProps<{
  task: KanbanTask
  columns: KanbanContent['columns']
  members: WorkspaceMember[]
  canComment?: boolean
  readonly?: boolean
  onSave: (task: KanbanTask) => void
}>()
const emit = defineEmits<{ comment: [id: string, title: string] }>()
const open = defineModel<boolean>('open', { default: false })
const draft = ref<KanbanTask>(JSON.parse(canonicalJson(task)))
const source = ref(canonicalJson(task))
const stale = computed(() => canonicalJson(task) !== source.value)
const toast = useToast()
const labels = ref(task.labels.join(', ')), entry = ref('')
watch(() => task.id, () => {
  draft.value = JSON.parse(canonicalJson(task))
  labels.value = task.labels.join(', ')
})
function comment() {
  const id = task.id, title = draft.value.title.trim() || task.title
  if (!readonly && !save()) {
    return
  }
  emit('comment', id, title)
}
function addEntry() {
  if (!entry.value.trim() || draft.value.checklist.length >= 100) {
    return
  }
  draft.value.checklist.push({ id: crypto.randomUUID(), title: entry.value.trim(), done: false })
  entry.value = ''
}
function save() {
  if (stale.value) {
    toast.add({ title: 'This task has changed', description: 'Your draft is preserved. Review the latest task before saving.', color: 'warning' })
    return false
  }
  if (!draft.value.title.trim()) {
    return false
  }
  onSave({ ...draft.value, title: draft.value.title.trim(), labels: [...new Set(labels.value.split(',').map(label => label.trim()).filter(Boolean))] })
  open.value = false
  return true
}
</script>

<template>
  <DetailPanel
    v-model:open="open"
    :title="`Task #${task.number}`"
    description="Task details and checklist"
    icon="i-lucide-square-check"
    wide
  >
    <template #body>
      <form
        class="p-ui-xl space-y-ui-xl"
        @submit.prevent="save"
      >
        <UButton
          v-if="stale && !readonly"
          label="Discard draft and load latest task"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          @click="draft = JSON.parse(canonicalJson(task)); labels = task.labels.join(', '); source = canonicalJson(task)"
        />
        <UFormField
          label="Title"
          required
        >
          <UTextarea
            v-model="draft.title"
            :readonly="readonly"
            :maxlength="255"
            autoresize
            :rows="1"
            class="w-full text-lg"
            autofocus
          />
        </UFormField>
        <div class="grid sm:grid-cols-2 gap-ui-lg">
          <UFormField label="Status">
            <USelect
              v-model="draft.columnId"
              :disabled="readonly"
              :items="columns.map(column => ({ label: column.title, value: column.id }))"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Priority">
            <USelect
              v-model="draft.priority"
              :disabled="readonly"
              :items="['low', 'normal', 'high', 'urgent']"
              class="w-full capitalize"
            />
          </UFormField>
          <UFormField label="Assignee">
            <USelect
              :model-value="draft.assigneeId || '__unset'"
              :disabled="readonly"
              :items="[{ label: 'Unassigned', value: '__unset' }, ...members.filter(member => !member.suspendedAt).map(member => ({ label: member.name || member.email, value: member.id }))]"
              class="w-full"
              @update:model-value="draft.assigneeId = $event === '__unset' ? null : String($event)"
            />
          </UFormField>
          <UFormField label="Due date">
            <UInput
              :model-value="draft.dueDate || ''"
              type="date"
              :readonly="readonly"
              class="w-full"
              @update:model-value="draft.dueDate = String($event) || null"
            />
          </UFormField>
        </div>
        <UFormField label="Description">
          <UTextarea
            v-model="draft.description"
            :readonly="readonly"
            :maxlength="20000"
            :rows="5"
            autoresize
            placeholder="What needs to happen?"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Labels"
          hint="Separate with commas"
        >
          <UInput
            v-model="labels"
            :readonly="readonly"
            placeholder="Design, research, release"
            class="w-full"
          />
        </UFormField>
        <section class="space-y-ui-md">
          <h3 class="text-sm font-medium">
            Checklist <span class="text-muted font-normal">{{ draft.checklist.filter(entry => entry.done).length }}/{{ draft.checklist.length }}</span>
          </h3>
          <div
            v-for="check in draft.checklist"
            :key="check.id"
            class="flex items-center gap-ui-sm"
          >
            <UCheckbox
              v-model="check.done"
              :disabled="readonly"
              :aria-label="check.title"
            /><UInput
              v-model="check.title"
              :readonly="readonly"
              :maxlength="255"
              variant="ghost"
              class="flex-1"
            /><UButton
              v-if="!readonly"
              icon="i-lucide-x"
              color="error"
              variant="ghost"
              aria-label="Remove checklist entry"
              @click="draft.checklist = draft.checklist.filter(entry => entry.id !== check.id)"
            />
          </div>
          <UInput
            v-if="!readonly"
            v-model="entry"
            placeholder="Add a checklist entry…"
            :maxlength="255"
            class="w-full"
            @keydown.enter.prevent="addEntry"
          />
        </section>
        <div class="flex justify-end gap-ui-sm">
          <UButton
            v-if="canComment"
            label="Comment"
            icon="i-lucide-message-square"
            color="neutral"
            variant="ghost"
            @click="comment"
          />
          <UButton
            label="Close"
            color="neutral"
            variant="ghost"
            @click="open = false"
          /><UButton
            v-if="!readonly"
            type="submit"
            label="Save task"
            :disabled="!draft.title.trim()"
          />
        </div>
      </form>
    </template>
  </DetailPanel>
</template>
