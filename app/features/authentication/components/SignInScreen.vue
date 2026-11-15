<script setup lang="ts">
import { useFeedbackToast } from '~/core/feedback/useFeedbackToast'
import AppBrand from '~/components/shell/AppBrand.vue'
import AuthWorkspacePreview from './AuthWorkspacePreview.vue'

const route = useRoute()
const failed = computed(() => route.query.error === 'microsoft')

useFeedbackToast(() => failed.value ? 'Your sign-in was cancelled, expired, or could not be verified. Please try again.' : null, { key: 'microsoft-sign-in', title: 'Microsoft sign-in failed' })
</script>

<template>
  <main class="auth-screen">
    <header class="auth-header">
      <AppBrand class="auth-brand" />
      <UColorModeButton
        size="sm"
        color="neutral"
        variant="ghost"
      />
    </header>
    <section
      class="auth-story"
      aria-label="A home for your ideas"
    >
      <div class="auth-story-content">
        <div class="auth-story-label">
          <span class="auth-story-rule" /> A little space. A lot of possibility.
        </div>
        <h2>Great ideas deserve<br>a place to <span>grow.</span></h2>
        <p class="auth-story-description">
          From the first thought to the next big thing.<br>Bring it all together in SeleSele.
        </p>
        <AuthWorkspacePreview />
        <div class="auth-story-features">
          <span><UIcon name="i-lucide-pencil-line" /> Write freely</span>
          <span><UIcon name="i-lucide-folders" /> Stay organized</span>
          <span><UIcon name="i-lucide-users" /> Think together</span>
        </div>
      </div>
      <p class="auth-story-footer">
        A quieter place for your best work.
      </p>
    </section>
    <section class="auth-entry">
      <div class="auth-entry-content app-enter">
        <h1>Good work<br>starts here<span class="text-dimmed">.</span></h1>
        <p class="auth-entry-description text-sm leading-relaxed text-muted mt-ui-xl mb-ui-4xl max-w-ui-18xl">
          One home for your notes, your projects, and the people you build with.
        </p>

        <UButton
          to="/api/auth/microsoft"
          external
          size="lg"
          class="w-full justify-center min-h-ui-6xl gap-ui-md auth-sign-in"
        >
          <template #leading>
            <span class="auth-microsoft-mark">
              <svg
                viewBox="0 0 21 21"
                class="size-ui-lg"
                aria-hidden="true"
              >
                <path
                  fill="#f25022"
                  d="M0 0h10v10H0z"
                />
                <path
                  fill="#7fba00"
                  d="M11 0h10v10H11z"
                />
                <path
                  fill="#00a4ef"
                  d="M0 11h10v10H0z"
                />
                <path
                  fill="#ffb900"
                  d="M11 11h10v10H11z"
                />
              </svg>
            </span>
          </template>
          Continue with Microsoft
          <template #trailing>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-ui-lg ms-auto opacity-70"
            />
          </template>
        </UButton>
        <div class="auth-account-note">
          <UIcon
            name="i-lucide-shield-check"
            class="size-ui-lg shrink-0 mt-ui-2xs text-muted"
          />
          <p>Use your organization’s Microsoft account.<br><span class="text-muted">Your team’s space is just one sign-in away.</span></p>
        </div>
      </div>
      <p class="auth-entry-footer">
        Less scattered. More together.
      </p>
    </section>
  </main>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.auth-screen { position: relative; height: var(--spacing-viewport); overflow: clip; background: var(--ui-bg); }
.auth-header { position: absolute; inset: 0 0 auto; z-index: 2; display: flex; align-items: center; justify-content: space-between; height: var(--spacing-ui-8xl); padding-inline: var(--spacing-ui-xl); }
.auth-brand { color: var(--ui-text-highlighted); }
.auth-story { display: none; }
.auth-entry { height: 100%; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: var(--spacing-ui-10xl) var(--spacing-ui-3xl) var(--spacing-ui-2xl); }
.auth-entry-content { width: 100%; max-width: var(--container-auth-form); margin: auto; }
.auth-entry h1 { color: var(--ui-text-highlighted); font-size: var(--text-4xl); font-weight: var(--font-weight-semibold); line-height: var(--leading-tight); letter-spacing: var(--tracking-tight); }
.auth-microsoft-mark { display: grid; place-items: center; width: var(--spacing-ui-2xl); height: var(--spacing-ui-2xl); background: var(--color-white); border-radius: var(--radius-xs); flex-shrink: 0; }
.auth-sign-in { padding-inline: var(--spacing-ui-md); font-size: var(--text-sm); }
.auth-account-note { display: flex; gap: var(--spacing-ui-sm); border-top: var(--app-border-thin) solid var(--ui-border-muted); padding-top: var(--spacing-ui-2xl); margin-top: var(--spacing-ui-2xl); font-size: var(--text-xs); line-height: var(--leading-loose); color: var(--ui-text-toned); }
.auth-entry-footer { text-align: center; font-size: var(--text-xs); color: var(--ui-text-muted); }
@variant lg {
  .auth-screen { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
  .auth-header { padding-inline: var(--spacing-ui-5xl); }
  .auth-brand :deep(img) { filter: grayscale(1) invert(1); }
  .auth-entry h1 { font-size: var(--text-4xl); }
  .auth-brand { color: var(--color-white); }
  .auth-story { position: relative; display: flex; flex-direction: column; justify-content: center; overflow: hidden; min-height: 0; height: 100%; background: var(--color-neutral-800); color: var(--color-white); padding: var(--spacing-ui-11xl) var(--spacing-auth-inset) var(--spacing-ui-2xl); }
  .auth-story-content { width: 100%; max-width: var(--container-auth-story); margin: auto; }
  .auth-story-label { display: flex; align-items: center; gap: var(--spacing-ui-sm); margin-bottom: var(--spacing-ui-2xl); font-size: var(--text-xs); letter-spacing: var(--tracking-widest); color: var(--color-neutral-400); }
  .auth-story-rule { width: var(--spacing-ui-2xl); height: var(--app-border-thin); background: var(--color-neutral-500); }
  .auth-story h2 { font-size: var(--text-auth-display); font-weight: var(--font-weight-medium); line-height: var(--leading-tight); letter-spacing: var(--tracking-tight); }
  .auth-story h2 span { color: var(--color-neutral-300); }
  .auth-story-description { margin-top: var(--spacing-ui-xl); color: var(--color-neutral-400); font-size: var(--text-xs); line-height: var(--leading-loose); }
  .auth-story-features { display: flex; flex-wrap: wrap; gap: var(--spacing-ui-md) var(--spacing-ui-2xl); margin-top: var(--spacing-ui-6xl); color: var(--color-neutral-300); font-size: var(--text-xs); }
  .auth-story-features > span { display: inline-flex; align-items: center; gap: var(--spacing-ui-sm); }
  .auth-story-features :deep(.iconify) { width: var(--spacing-ui-md); height: var(--spacing-ui-md); }
  .auth-story-footer { margin-top: var(--spacing-ui-6xl); color: var(--color-neutral-400); font-size: var(--text-xs); }
  .auth-entry { padding: var(--spacing-ui-11xl) var(--spacing-ui-6xl) var(--spacing-ui-2xl); }
}
@variant 2xl {
  .auth-story { padding-inline: var(--spacing-ui-10xl); }
  .auth-header { padding-inline: var(--spacing-ui-5xl); }
}
@variant viewport-short {
  .auth-story-label { margin-bottom: var(--spacing-ui-lg); }
  .auth-story-description { margin-top: var(--spacing-ui-md); }
  .auth-story-features { margin-top: var(--spacing-ui-4xl); }
  .auth-story-footer { margin-top: var(--spacing-ui-2xl); }
}
@variant viewport-compact {
  .auth-story { padding-top: var(--spacing-ui-10xl); }
  .auth-story-features, .auth-story-footer { display: none; }
  .auth-entry-description { font-size: var(--text-xs); line-height: var(--leading-relaxed); margin-top: var(--spacing-ui-md); margin-bottom: var(--spacing-ui-xl); }
  .auth-account-note { padding-top: var(--spacing-ui-lg); margin-top: var(--spacing-ui-lg); }
}
@variant viewport-low {
  .auth-entry { padding-top: var(--spacing-ui-9xl); padding-bottom: var(--spacing-ui-lg); }
  .auth-entry-footer { display: none; }
  .auth-story-description { display: none; }
}
@variant viewport-landscape {
  .auth-entry { padding-top: var(--spacing-ui-8xl); padding-bottom: var(--spacing-ui-md); }
  .auth-entry h1 { font-size: var(--text-3xl); line-height: var(--leading-tight); margin-bottom: var(--spacing-ui-lg); }
  .auth-entry-description, .auth-account-note { display: none; }
  .auth-story h2 { font-size: var(--text-4xl); }
}
@variant sm {
  .auth-header { padding-inline: var(--spacing-ui-5xl); }
}
</style>
