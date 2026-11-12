<template>
  <div
    class="auth-preview"
    aria-hidden="true"
  >
    <div class="auth-preview-back" />
    <UCard
      class="auth-preview-page"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <div class="auth-preview-path">
        <UIcon
          name="i-lucide-panels-top-left"
          class="size-3.5"
        /> Product studio
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3 opacity-50"
        /> Team notes
        <UIcon
          name="i-lucide-ellipsis"
          class="size-4 ms-auto"
        />
      </div>
      <div class="auth-preview-document">
        <div class="flex items-center justify-between mb-5">
          <UIcon
            name="i-lucide-sprout"
            class="size-7"
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
            class="size-4"
          /><span>Give the idea a home</span><span class="ms-auto text-[10px] text-neutral-400">Done</span>
        </div>
        <div class="auth-preview-task">
          <UIcon
            name="i-lucide-square"
            class="size-4 text-neutral-400"
          /><span>Bring your people along</span>
        </div>
      </div>
    </UCard>
    <div class="auth-preview-comment">
      <div class="auth-preview-comment-icon">
        <UIcon
          name="i-lucide-message-square"
          class="size-4"
        />
      </div>
      <div>
        <p class="font-medium text-xs">
          Better, together.
        </p><p class="text-[11px] text-neutral-500 mt-1">
          A conversation around every idea.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-preview { position: relative; margin-top: 34px; padding-right: 14px; max-width: 490px; color: #292929; }
.auth-preview-back { position: absolute; inset: 10px 7px -7px 9px; background: #383838; border: 1px solid #555; border-radius: 6px; transform: rotate(-2deg); }
.auth-preview-page { position: relative; background: #fff; color: #292929; border-radius: 6px; box-shadow: 0 14px 45px #0002; }
.auth-preview-path { display: flex; align-items: center; gap: 7px; padding: 13px 18px; border-bottom: 1px solid #eee; color: #777; font-size: 10px; }
.auth-preview-document { padding: 24px 28px 27px; }
.auth-preview-status { display: inline-flex; align-items: center; gap: 5px; color: #888; font-size: 9px; }
.auth-preview-status > span { width: 4px; height: 4px; background: #888; border-radius: 50%; }
.auth-preview-title { font-size: 25px; font-weight: 600; letter-spacing: -1px; }
.auth-preview-copy { margin-top: 7px; font-size: 10px; line-height: 1.7; color: #888; }
.auth-preview-note { border-left: 2px solid #ccc; margin-block: 19px; padding: 7px 12px; font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 14px; color: #666; }
.auth-preview-task { display: flex; align-items: center; gap: 8px; margin-top: 11px; font-size: 10px; color: #555; }
.auth-preview-comment { position: absolute; right: -12px; bottom: -23px; display: flex; align-items: center; gap: 11px; padding: 13px 18px; background: #f4f3f0; border: 1px solid #e1e0dd; border-radius: 5px; color: #333; box-shadow: 0 8px 24px #0002; }
.auth-preview-comment-icon { display: grid; place-items: center; width: 31px; height: 31px; background: #e8e7e3; border-radius: 4px; }
@media (min-width: 1440px) {
  .auth-preview-document { padding-block: 28px 31px; }
}
@media (max-height: 850px) {
  .auth-preview { margin-top: 25px; }
  .auth-preview-document { padding: 18px 24px 20px; }
  .auth-preview-document > div:first-child { margin-bottom: 12px; }
  .auth-preview-path { padding-block: 10px; }
  .auth-preview-title { font-size: 22px; }
  .auth-preview-note { margin-block: 13px; padding-block: 5px; }
  .auth-preview-task { margin-top: 8px; }
}
@media (max-height: 600px) {
  .auth-preview { margin-top: 20px; }
  .auth-preview-note, .auth-preview-task, .auth-preview-comment { display: none; }
}
@media (max-height: 430px) {
  .auth-preview { display: none; }
}
</style>
