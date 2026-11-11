<script setup lang="ts">
const { isLoading } = useLoadingIndicator()

const appear = ref(false)

onMounted(() => {
  setTimeout(() => {
    appear.value = true
  }, 100)
})
</script>

<template>
  <div class="absolute inset-x-0 top-0 -z-10 overflow-hidden pointer-events-none select-none h-[600px] flex justify-center">
    <!-- Gradients -->
    <div
      class="absolute -top-[20%] w-[60%] h-[70%] rounded-full bg-primary-500/10 blur-[120px] transition-all duration-1000 ease-out transform translate-z-0"
      :class="[
        isLoading ? 'animate-pulse' : (appear ? 'opacity-100 scale-100' : 'opacity-0 scale-90')
      ]"
    />
    <div
      class="absolute -top-[10%] right-[10%] w-[50%] h-[60%] rounded-full bg-primary-400/10 blur-[100px] transition-all duration-1000 delay-300 ease-out transform translate-z-0"
      :class="[
        appear ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
      ]"
    />

    <!-- Subtle Grid Lines -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

    <!-- Fade out bottom -->
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-gray-950" />
  </div>
</template>
