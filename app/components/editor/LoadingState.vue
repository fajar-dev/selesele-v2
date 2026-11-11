<template>
  <div
    class="min-h-screen"
    aria-label="Loading page"
    aria-busy="true"
  >
    <AppHeader />
    <div class="mx-auto max-w-4xl space-y-6 p-4 sm:p-14">
      <USkeleton class="h-12 w-3/4" />
      <div
        v-for="paragraph in 3"
        :key="paragraph"
        class="space-y-3"
      >
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-2/3" />
      </div>
    </div>
  </div>
</template>
