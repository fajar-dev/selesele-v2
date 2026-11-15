<template>
  <div
    class="auth-preview"
    aria-hidden="true"
  >
    <div class="auth-preview-back" />
    <UCard
      class="auth-preview-item"
      :ui="{ body: 'p-ui-zero sm:p-ui-zero' }"
    >
      <div class="auth-preview-path">
        <UIcon
          name="i-lucide-panels-top-left"
          class="size-ui-md"
        /> Product studio
        <UIcon
          name="i-lucide-chevron-right"
          class="size-ui-md opacity-50"
        /> Team notes
        <UIcon
          name="i-lucide-ellipsis"
          class="size-ui-lg ms-auto"
        />
      </div>
      <div class="auth-preview-document">
        <div class="flex items-center justify-between mb-ui-xl">
          <UIcon
            name="i-lucide-sprout"
            class="size-ui-3xl"
          />
          <span class="auth-preview-status"><span /> Shared with your team</span>
        </div>
        <p class="auth-preview-title">
          The next big thing.
        </p>
        <p class="auth-preview-copy">
          A small idea today. Something wonderful tomorrow.
        </p>
        <div class="auth-preview-note">
          Make something worth sharing.
        </div>
        <div class="auth-preview-task">
          <UIcon
            name="i-lucide-square-check"
            class="size-ui-lg"
          /><span>Give the idea a home</span><span class="ms-auto text-xs text-neutral-400">Done</span>
        </div>
        <div class="auth-preview-task">
          <UIcon
            name="i-lucide-square"
            class="size-ui-lg text-neutral-400"
          /><span>Bring your people along</span>
        </div>
      </div>
    </UCard>
    <div class="auth-preview-comment">
      <div class="auth-preview-comment-icon">
        <UIcon
          name="i-lucide-message-square"
          class="size-ui-lg"
        />
      </div>
      <div>
        <p class="font-medium text-xs">
          Better, together.
        </p><p class="text-xs text-neutral-500 mt-ui-xs">
          A conversation around every idea.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.auth-preview { position: relative; margin-top: var(--spacing-ui-4xl); padding-right: var(--spacing-ui-md); max-width: var(--container-auth-preview); color: var(--color-neutral-800); }
.auth-preview-back { position: absolute; inset: var(--spacing-ui-sm) var(--spacing-ui-sm) calc(-1 * var(--spacing-ui-sm)) var(--spacing-ui-sm); background: var(--color-neutral-700); border: var(--app-border-thin) solid var(--color-neutral-600); border-radius: var(--radius-sm); transform: var(--app-preview-rotation); }
.auth-preview-item { position: relative; background: var(--color-white); color: var(--color-neutral-800); border-radius: var(--radius-sm); box-shadow: var(--app-preview-shadow); }
.auth-preview-path { display: flex; align-items: center; gap: var(--spacing-ui-sm); padding: var(--spacing-ui-md) var(--spacing-ui-lg); border-bottom: var(--app-border-thin) solid var(--color-neutral-200); color: var(--color-neutral-500); font-size: var(--text-xs); }
.auth-preview-document { padding: var(--spacing-ui-2xl) var(--spacing-ui-3xl) var(--spacing-ui-3xl); }
.auth-preview-status { display: inline-flex; align-items: center; gap: var(--spacing-ui-xs); color: var(--color-neutral-500); font-size: var(--text-xs); }
.auth-preview-status > span { width: var(--spacing-ui-xs); height: var(--spacing-ui-xs); background: var(--color-neutral-500); border-radius: 50%; }
.auth-preview-title { font-size: var(--text-2xl); font-weight: var(--font-weight-semibold); letter-spacing: var(--tracking-tight); }
.auth-preview-copy { margin-top: var(--spacing-ui-sm); font-size: var(--text-xs); line-height: var(--leading-relaxed); color: var(--color-neutral-500); }
.auth-preview-note { border-left: var(--app-border-emphasis) solid var(--color-neutral-300); margin-block: var(--spacing-ui-xl); padding: var(--spacing-ui-sm) var(--spacing-ui-md); font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: var(--text-sm); color: var(--color-neutral-600); }
.auth-preview-task { display: flex; align-items: center; gap: var(--spacing-ui-sm); margin-top: var(--spacing-ui-md); font-size: var(--text-xs); color: var(--color-neutral-600); }
.auth-preview-comment { position: absolute; right: calc(-1 * var(--spacing-ui-md)); bottom: calc(-1 * var(--spacing-ui-2xl)); display: flex; align-items: center; gap: var(--spacing-ui-md); padding: var(--spacing-ui-md) var(--spacing-ui-lg); background: var(--color-stone-100); border: var(--app-border-thin) solid var(--color-stone-200); border-radius: var(--radius-sm); color: var(--color-neutral-700); box-shadow: var(--app-preview-shadow); }
.auth-preview-comment-icon { display: grid; place-items: center; width: var(--spacing-ui-4xl); height: var(--spacing-ui-4xl); background: var(--color-stone-200); border-radius: var(--radius-sm); }
@variant 2xl {
  .auth-preview-document { padding-block: var(--spacing-ui-3xl) var(--spacing-ui-4xl); }
}
@variant viewport-short {
  .auth-preview { margin-top: var(--spacing-ui-2xl); }
  .auth-preview-document { padding: var(--spacing-ui-lg) var(--spacing-ui-2xl) var(--spacing-ui-xl); }
  .auth-preview-document > div:first-child { margin-bottom: var(--spacing-ui-md); }
  .auth-preview-path { padding-block: var(--spacing-ui-sm); }
  .auth-preview-title { font-size: var(--text-xl); }
  .auth-preview-note { margin-block: var(--spacing-ui-md); padding-block: var(--spacing-ui-xs); }
  .auth-preview-task { margin-top: var(--spacing-ui-sm); }
}
@variant viewport-low {
  .auth-preview { margin-top: var(--spacing-ui-xl); }
  .auth-preview-note, .auth-preview-task, .auth-preview-comment { display: none; }
}
@variant viewport-landscape {
  .auth-preview { display: none; }
}
</style>
