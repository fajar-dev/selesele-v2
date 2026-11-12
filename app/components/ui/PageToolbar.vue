<template>
  <UDashboardToolbar :ui="{ root: 'px-ui-zero sm:px-ui-zero min-h-ui-5xl gap-ui-md border-muted', left: 'min-w-ui-zero flex-1 overflow-x-auto py-ui-xs', right: 'shrink-0 flex items-center gap-ui-xs py-ui-xs' }">
    <template #left>
      <slot name="left" />
    </template>
    <template #right>
      <slot name="right" />
    </template>
  </UDashboardToolbar>
</template>
