<template>
  <UDashboardToolbar :ui="{ root: 'px-0 sm:px-0 min-h-11 gap-3 border-muted', left: 'min-w-0 flex-1 overflow-x-auto py-1.5', right: 'shrink-0 flex items-center gap-1.5 py-1.5' }">
    <template #left>
      <slot name="left" />
    </template>
    <template #right>
      <slot name="right" />
    </template>
  </UDashboardToolbar>
</template>
