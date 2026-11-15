<script setup lang="ts">
const { tasks } = defineProps<{
  tasks: {
    id: string
    title: string
    dueDate: string | null
    completedAt?: string | null
  }[]
}>()
const emit = defineEmits<{
  open: [
        id: string
  ]
}>()
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const days = computed(() => {
  const start = new Date(month.value), offset = (start.getDay() + 6) % 7
  start.setDate(1 - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    const date = key(day)
    return { date, day: day.getDate(), current: day.getMonth() === month.value.getMonth(), today: date === key(new Date()), tasks: tasks.filter(task => task.dueDate === date) }
  })
})
function navigate(offset: number) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + offset, 1)
}
</script>

<template>
  <section
    aria-label="Task calendar"
    class="space-y-ui-md"
  >
    <div class="flex items-center gap-ui-sm">
      <UButton
        icon="i-lucide-chevron-left"
        aria-label="Previous month"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="navigate(-1)"
      /><h3 class="text-sm font-medium">
        {{ month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }}
      </h3><UButton
        icon="i-lucide-chevron-right"
        aria-label="Next month"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="navigate(1)"
      /><UButton
        label="Today"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="month = new Date(new Date().getFullYear(), new Date().getMonth(), 1)"
      /><span class="ms-auto text-xs text-muted">{{ tasks.filter(task => !task.dueDate).length }} unscheduled</span>
    </div>
    <div class="grid grid-cols-7 gap-ui-xs">
      <span
        v-for="name in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
        :key="name"
        class="text-xs text-muted text-center"
      >{{ name }}</span>
      <div
        v-for="day in days"
        :key="day.date"
        class="min-h-ui-10xl rounded-sm border border-muted p-ui-xs space-y-ui-xs"
        :class="{ 'opacity-50': !day.current, 'ring-1 ring-primary': day.today }"
        :aria-label="day.date"
      >
        <p class="text-xs text-muted">
          {{ day.day }}
        </p><button
          v-for="task in day.tasks"
          :key="task.id"
          type="button"
          class="block w-full rounded-sm bg-muted p-ui-xs text-left text-xs hover:bg-accented focus-visible:outline-primary"
          :class="{ 'line-through text-muted': task.completedAt }"
          @click="emit('open', task.id)"
        >
          {{ task.title }}
        </button>
      </div>
    </div>
  </section>
</template>
