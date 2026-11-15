<script setup lang="ts">
defineProps<{ favorite: boolean, loading?: boolean }>()
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <UButton
    icon="i-lucide-star"
    :aria-label="favorite ? 'Remove from favorites' : 'Add to favorites'"
    :aria-pressed="favorite"
    :variant="favorite ? 'soft' : 'ghost'"
    color="neutral"
    size="sm"
    :loading="loading"
    @click="emit('click')"
  >
    <template #leading>
      <UIcon
        v-if="loading"
        name="i-lucide-loader-circle"
        class="size-ui-lg animate-spin"
        aria-hidden="true"
      />
      <UIcon
        v-else
        name="i-lucide-star"
        mode="svg"
        class="size-ui-lg"
        :class="{ '[&_path]:fill-current': favorite }"
        aria-hidden="true"
      />
    </template>
  </UButton>
</template>
