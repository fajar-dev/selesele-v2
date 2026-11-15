<script setup lang="ts">
const { text, query } = defineProps<{
  text: string
  query: string
}>()
const parts = computed(() => {
  if (!query.trim()) {
    return [{ text, match: false }]
  }
  const needle = query.toLocaleLowerCase(), lower = text.toLocaleLowerCase(), values: {
    text: string
    match: boolean
  }[] = []
  let cursor = 0, index = lower.indexOf(needle)
  while (index >= 0) {
    if (index > cursor) {
      values.push({ text: text.slice(cursor, index), match: false })
    }
    values.push({ text: text.slice(index, index + query.length), match: true })
    cursor = index + query.length
    index = lower.indexOf(needle, cursor)
  }
  values.push({ text: text.slice(cursor), match: false })
  return values
})
</script>

<template>
  <span><template
    v-for="(part, index) in parts"
    :key="index"
  ><mark
    v-if="part.match"
    class="bg-primary/15 text-highlighted rounded-sm"
  >{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
</template>
