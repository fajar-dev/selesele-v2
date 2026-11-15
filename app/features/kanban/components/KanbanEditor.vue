<script setup lang="ts">
import type { CanvasPresence } from '#shared/model/presence'
import EditorToolbar from '~/components/ui/EditorToolbar.vue'
import type { KanbanContent, KanbanTask } from '#shared/model/content'
import type { WorkspaceMember } from '#shared/model/workspace'
import ConfirmationDialog from '~/components/ui/ConfirmationDialog.vue'
import { KanbanBoard } from '../domain/KanbanBoard'
import TaskDetails from './TaskDetails.vue'
import TaskCalendar from './TaskCalendar.vue'

const { content, members, readonly = false, canComment = false } = defineProps<{
  prepareResources?: () => Promise<void>
  itemId?: string
  collaborators?: CanvasPresence[]
  content: KanbanContent
  members: WorkspaceMember[]
  canComment?: boolean
  readonly?: boolean
}>()
const emit = defineEmits<{
  presence: [value: { cursor: null, selected: string[] }]
  comment: [id: string, type: 'task', label: string]
  change: [
        content: KanbanContent
  ]
}>()
const toast = useToast()
const search = ref(''), assignee = ref('__all'), priority = ref('__all'), layout = ref('board'), addingColumn = ref(false), columnTitle = ref('')
const selected = ref<string | null>(null), deletingTask = ref<string | null>(null), deletingColumn = ref<string | null>(null)
const route = useRoute()
watch(() => route.query.task, (value) => {
  if (typeof value === 'string') {
    selected.value = value
  }
}, { immediate: true })
defineExpose({ selectObject: (id: string) => {
  if (!content.tasks.some(task => task.id === id)) {
    return false
  }
  selected.value = id
  return true
} })
watch(selected, id => emit('presence', { cursor: null, selected: id ? [id] : [] }))
const task = computed(() => content.tasks.find(task => task.id === selected.value))
const detailOpen = computed({ get: () => !!selected.value, set: (value) => {
  if (!value) {
    selected.value = null
  }
} })
const deleteTaskOpen = computed({ get: () => !!deletingTask.value, set: (value) => {
  if (!value) {
    deletingTask.value = null
  }
} })
const deleteColumnOpen = computed({ get: () => !!deletingColumn.value, set: (value) => {
  if (!value) {
    deletingColumn.value = null
  }
} })
const visible = computed(() => content.tasks.filter(task => `${task.title} ${task.description} ${task.labels.join(' ')} #${task.number}`.toLowerCase().includes(search.value.toLowerCase()) && (assignee.value === '__all' || (task.assigneeId || '__unset') === assignee.value) && (priority.value === '__all' || task.priority === priority.value)))
const priorityColor = (value: string) => value === 'urgent' ? 'error' as const : value === 'high' ? 'warning' as const : 'neutral' as const
function command(action: (board: KanbanBoard) => KanbanContent) {
  if (readonly) {
    return
  }
  try {
    emit('change', action(new KanbanBoard(content)))
  } catch (cause) {
    toast.add({ title: 'Unable to update board', description: errorMessage(cause), color: 'error' })
    throw cause
  }
}
function createTask(columnId: string) {
  try {
    let id = ''
    command((board) => {
      const updated = board.addTask(columnId)
      id = updated.tasks.at(-1)!.id
      return updated
    })
    selected.value = id
  } catch { /* Feedback is owned by the caller; preserve the current draft or retry state. */ }
}
function createSubtask(parentId: string) {
  const parent = content.tasks.find(task => task.id === parentId)
  if (!parent) {
    return
  }
  try {
    command((board) => {
      const added = board.addTask(parent.columnId), child = added.tasks.at(-1)!
      selected.value = child.id
      return new KanbanBoard(added).updateTask({ ...child, parentId })
    })
  } catch { /* The command already reports the reason. */ }
}
function addColumn() {
  if (!columnTitle.value.trim()) {
    return
  }
  try {
    command(board => board.addColumn(columnTitle.value))
    columnTitle.value = ''
    addingColumn.value = false
  } catch { /* Feedback is owned by the caller; preserve the current draft or retry state. */ }
}
function drag(event: DragEvent, id: string) {
  if (!readonly) {
    event.dataTransfer?.setData('application/x-sele-task', id)
  }
}
function drop(event: DragEvent, columnId: string, before?: string) {
  const id = event.dataTransfer?.getData('application/x-sele-task')
  if (id && content.tasks.some(task => task.id === id)) {
    try {
      command(board => board.moveTask(id, columnId, before))
    } catch { /* Feedback is owned by the caller; preserve the current draft or retry state. */ }
  }
}
function columnActions(id: string) {
  return [{ label: 'Add task', icon: 'i-lucide-plus', onSelect: () => createTask(id) }, { label: 'Move left', icon: 'i-lucide-arrow-left', onSelect: () => command(board => board.reorderColumn(id, -1)) }, { label: 'Move right', icon: 'i-lucide-arrow-right', onSelect: () => command(board => board.reorderColumn(id, 1)) }, { label: 'Delete column', icon: 'i-lucide-trash-2', color: 'error' as const, disabled: content.columns.length === 1, onSelect: () => deletingColumn.value = id }]
}
function taskActions(entry: KanbanTask) {
  return [{ label: 'Open details', icon: 'i-lucide-panel-right', onSelect: () => selected.value = entry.id }, ...(!readonly ? [{ label: 'Move to', icon: 'i-lucide-arrow-right-left', children: content.columns.map(column => ({ label: column.title, onSelect: () => command(board => board.moveTask(entry.id, column.id)) })) }, { label: 'Duplicate', icon: 'i-lucide-copy', onSelect: () => command(board => board.duplicateTask(entry.id)) }, { label: 'Delete task', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => deletingTask.value = entry.id }] : [])]
}
</script>

<template>
  <div class="space-y-ui-xl canvas-editor">
    <EditorToolbar label="Kanban tools">
      <div
        role="group"
        aria-label="Kanban layout"
        class="flex gap-ui-xs"
      >
        <UButton
          size="sm"
          label="Board"
          icon="i-lucide-columns-3"
          color="neutral"
          :variant="layout === 'board' ? 'soft' : 'ghost'"
          :aria-pressed="layout === 'board'"
          @click="layout = 'board'"
        /><UButton
          size="sm"
          label="List"
          icon="i-lucide-list"
          color="neutral"
          :variant="layout === 'list' ? 'soft' : 'ghost'"
          :aria-pressed="layout === 'list'"
          @click="layout = 'list'"
        />
      </div>
      <UButton
        label="Calendar"
        icon="i-lucide-calendar-days"
        color="neutral"
        size="sm"
        :variant="layout === 'calendar' ? 'soft' : 'ghost'"
        :aria-pressed="layout === 'calendar'"
        @click="layout = 'calendar'"
      />
      <UInput
        v-model="search"
        size="sm"
        icon="i-lucide-search"
        placeholder="Search tasks…"
        aria-label="Search tasks"
      />
      <USelect
        v-model="assignee"
        size="sm"
        :items="[{ label: 'All assignees', value: '__all' }, { label: 'Unassigned', value: '__unset' }, ...members.map(member => ({ label: member.name || member.email, value: member.id }))]"
        aria-label="Filter by assignee"
      />
      <USelect
        v-model="priority"
        size="sm"
        :items="[{ label: 'All priorities', value: '__all' }, ...['low', 'normal', 'high', 'urgent'].map(value => ({ label: value, value }))]"
        aria-label="Filter by priority"
      />
      <template #actions>
        <span class="text-xs text-muted tabular-nums">{{ visible.length }} {{ visible.length === 1 ? 'task' : 'tasks' }}</span>
        <UButton
          v-if="!readonly"
          size="sm"
          label="Add column"
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          @click="addingColumn = !addingColumn"
        />
      </template>
    </EditorToolbar>
    <form
      v-if="addingColumn && !readonly"
      class="flex gap-ui-sm"
      @submit.prevent="addColumn"
    >
      <UInput
        v-model="columnTitle"
        size="sm"
        placeholder="Column name"
        aria-label="Column name"
        autofocus
        :maxlength="120"
      /><UButton
        size="sm"
        type="submit"
        label="Add"
        :disabled="!columnTitle.trim()"
      />
    </form>
    <TaskCalendar
      v-if="layout === 'calendar'"
      :tasks="visible"
      class="kanban-surface overflow-auto"
      @open="selected = $event"
    />
    <div
      v-else
      class="kanban-surface"
      :class="layout === 'board' ? 'flex items-start gap-ui-xl overflow-x-auto pb-ui-xl' : 'space-y-ui-lg'"
      aria-label="Kanban board"
    >
      <section
        v-for="column in content.columns"
        :key="column.id"
        :class="layout === 'board' ? 'w-ui-18xl shrink-0 min-h-ui-18xl bg-muted p-ui-md rounded-md' : ''"
        class="space-y-ui-md"
        :aria-label="column.title"
        @dragover.prevent
        @drop.prevent="drop($event, column.id)"
      >
        <header class="flex items-center gap-ui-sm py-ui-xs">
          <UIcon
            name="i-lucide-circle-dot"
            class="size-ui-md text-muted shrink-0"
          /><UInput
            :model-value="column.title"
            :readonly="readonly"
            variant="none"
            class="min-w-ui-zero flex-1 font-medium"
            :ui="{ base: 'px-ui-zero' }"
            aria-label="Column title"
            :maxlength="120"
            @change="command(board => board.updateColumn(column.id, ($event.target as HTMLInputElement).value, column.limit))"
          />
          <span
            class="text-xs tabular-nums"
            :class="column.limit && content.tasks.filter(task => task.columnId === column.id && !task.completedAt).length >= column.limit ? 'text-warning' : 'text-muted'"
          >{{ visible.filter(task => task.columnId === column.id).length }}{{ column.limit ? ` / ${column.limit}` : '' }}</span>
          <UDropdownMenu
            v-if="!readonly"
            :items="columnActions(column.id)"
          >
            <UButton
              icon="i-lucide-ellipsis"
              aria-label="Column actions"
              size="xs"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </header>
        <UPopover v-if="!readonly">
          <UButton
            :label="column.limit ? `WIP limit: ${column.limit}` : 'Set WIP limit'"
            icon="i-lucide-gauge"
            color="neutral"
            variant="ghost"
            size="xs"
            class="text-muted"
          />
          <template #content>
            <div class="p-ui-lg space-y-ui-md w-ui-15xl">
              <p class="text-sm font-medium">
                Work in progress
              </p>
              <p class="text-xs text-muted leading-relaxed">
                Limit concurrent tasks in this column. Clear the field for no limit.
              </p>
              <UInput
                :model-value="String(column.limit || '')"
                type="number"
                :min="1"
                :max="1000"
                placeholder="No limit"
                size="sm"
                aria-label="Work in progress limit"
                class="w-full"
                @change="command(board => board.updateColumn(column.id, column.title, Number(($event.target as HTMLInputElement).value) || null))"
              />
            </div>
          </template>
        </UPopover>
        <article
          v-for="entry in visible.filter(task => task.columnId === column.id)"
          :key="entry.id"
          :draggable="!readonly"
          class="group workspace-card rounded-md border border-default bg-default p-ui-lg space-y-ui-md hover:border-accented transition-colors"
          @dragstart="drag($event, entry.id)"
          @drop.stop.prevent="drop($event, column.id, entry.id)"
        >
          <div class="flex items-start gap-ui-sm">
            <button
              class="text-left text-sm font-medium leading-relaxed flex-1 break-words"
              :class="{ 'line-through text-muted': entry.completedAt }"
              @click="selected = entry.id"
            >
              {{ entry.title }}
            </button><UDropdownMenu :items="taskActions(entry)">
              <UButton
                icon="i-lucide-ellipsis"
                :aria-label="`Actions for task ${entry.number}`"
                size="xs"
                color="neutral"
                variant="ghost"
              />
            </UDropdownMenu>
          </div>
          <div
            v-if="entry.labels.length"
            class="flex gap-ui-xs flex-wrap"
          >
            <UBadge
              v-for="label in entry.labels"
              :key="label"
              :label="label"
              color="neutral"
              variant="soft"
              size="xs"
            />
          </div>
          <div class="flex flex-wrap items-center gap-ui-sm text-xs text-muted">
            <span class="font-mono">#{{ entry.number }}</span><UBadge
              v-if="entry.completedAt"
              label="Completed"
              color="success"
              variant="soft"
              size="xs"
            /><span
              v-else-if="entry.dependencies?.some(id => !content.tasks.find(task => task.id === id)?.completedAt)"
              class="text-warning"
            >Blocked</span><UIcon
              v-if="entry.repeat"
              name="i-lucide-repeat"
              class="size-ui-md"
              :aria-label="`Repeats ${entry.repeat}`"
            /><UBadge
              :label="entry.priority"
              :color="priorityColor(entry.priority)"
              variant="subtle"
              size="xs"
            /><span
              v-if="entry.dueDate"
              class="flex items-center gap-ui-xs"
            ><UIcon
              name="i-lucide-calendar"
              class="size-ui-md"
            />{{ entry.dueDate }}</span><span v-if="entry.checklist.length">{{ entry.checklist.filter(check => check.done).length }}/{{ entry.checklist.length }}</span><span
              v-if="entry.assigneeId"
              class="ms-auto truncate max-w-ui-11xl"
            >{{ members.find(member => member.id === entry.assigneeId)?.name || 'Member' }}</span>
          </div>
        </article>
        <UButton
          v-if="!readonly"
          label="Add task"
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          class="w-full justify-start text-muted"
          @click="createTask(column.id)"
        />
        <p
          v-if="readonly && !visible.some(task => task.columnId === column.id)"
          class="text-xs text-muted p-ui-lg"
        >
          No tasks
        </p>
      </section>
    </div>
    <TaskDetails
      v-if="task"
      :key="task.id"
      v-model:open="detailOpen"
      :task="task"
      :item-id="itemId"
      :prepare-resources="prepareResources"
      :tasks="content.tasks"
      :columns="content.columns"
      :members="members"
      :readonly="readonly"
      :on-save="entry => command(board => board.updateTask(entry))"
      :can-comment="canComment"
      @open-task="selected = $event"
      @subtask="createSubtask"
      @comment="(id, title) => { emit('comment', id, 'task', title); detailOpen = false }"
    />
    <ConfirmationDialog
      v-model:open="deleteTaskOpen"
      title="Delete task"
      description="The task will be removed from this board. You can recover it with undo or version history."
      :on-confirm="async () => { if (deletingTask) command(board => board.removeTask(deletingTask!)) }"
    />
    <ConfirmationDialog
      v-model:open="deleteColumnOpen"
      title="Delete column"
      description="Tasks in this column will move to the first remaining column. Work-in-progress limits still apply."
      :on-confirm="async () => { if (deletingColumn) command(board => board.removeColumn(deletingColumn!)) }"
    />
  </div>
</template>
