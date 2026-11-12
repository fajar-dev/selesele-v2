<template>
  <div
    class="min-h-screen"
    aria-label="Loading page"
    aria-busy="true"
  >
    <AppHeader />
    <WorkspacesContent>
      <div class="flex items-center gap-3">
        <USkeleton class="size-10 rounded-[5px]" />
        <USkeleton class="h-9 w-2/3" />
      </div>
      <div
        v-for="paragraph in 3"
        :key="paragraph"
        class="space-y-3"
      >
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-2/3" />
      </div>
    </WorkspacesContent>
  </div>
</template>
