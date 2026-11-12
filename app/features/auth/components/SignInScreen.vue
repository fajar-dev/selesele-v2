<script setup lang="ts">
import AppBrand from '~/components/shell/AppBrand.vue'
import AuthWorkspacePreview from './AuthWorkspacePreview.vue'

const route = useRoute()
const failed = computed(() => route.query.error === 'microsoft')
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
        <p class="auth-entry-description text-sm leading-6 text-muted mt-5 mb-8 max-w-80">
          One home for your notes, your projects, and the people you build with.
        </p>
        <UAlert
          v-if="failed"
          color="error"
          variant="soft"
          title="Microsoft sign-in failed"
          description="Your sign-in was cancelled, expired, or could not be verified. Please try again."
          class="mb-5"
        />
        <UButton
          to="/api/auth/microsoft"
          external
          size="lg"
          class="w-full justify-center min-h-12 gap-3 auth-sign-in"
        >
          <template #leading>
            <span class="auth-microsoft-mark">
              <svg
                viewBox="0 0 21 21"
                class="size-4"
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
              class="size-4 ms-auto opacity-70"
            />
          </template>
        </UButton>
        <div class="auth-account-note">
          <UIcon
            name="i-lucide-shield-check"
            class="size-4 shrink-0 mt-0.5 text-muted"
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
.auth-screen { position: relative; height: 100svh; overflow: clip; background: var(--ui-bg); }
.auth-header { position: absolute; inset: 0 0 auto; z-index: 2; display: flex; align-items: center; justify-content: space-between; height: 72px; padding-inline: 20px; }
.auth-brand { color: var(--ui-text-highlighted); }
.auth-story { display: none; }
.auth-entry { height: 100%; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 100px 28px 24px; }
.auth-entry-content { width: 100%; max-width: 360px; margin: auto; }
.auth-entry h1 { color: var(--ui-text-highlighted); font-size: 34px; font-weight: 600; line-height: 1.15; letter-spacing: -1.3px; }
.auth-microsoft-mark { display: grid; place-items: center; width: 26px; height: 26px; background: #fff; border-radius: 3px; flex-shrink: 0; }
.auth-sign-in { padding-inline: 14px; font-size: 14px; }
.auth-account-note { display: flex; gap: 10px; border-top: 1px solid var(--ui-border-muted); padding-top: 23px; margin-top: 26px; font-size: 11px; line-height: 1.8; color: var(--ui-text-toned); }
.auth-entry-footer { text-align: center; font-size: 11px; color: var(--ui-text-muted); }
@media (min-width: 1024px) {
  .auth-screen { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
  .auth-header { padding-inline: 40px; }
  .auth-brand :deep(img) { filter: grayscale(1) invert(1); }
  .auth-entry h1 { font-size: 38px; }
  .auth-brand { color: #fff; }
  .auth-story { position: relative; display: flex; flex-direction: column; justify-content: center; overflow: hidden; min-height: 0; height: 100%; background: #242424; color: #fff; padding: 112px clamp(40px, 5vw, 84px) 25px; }
  .auth-story-content { width: 100%; max-width: 540px; margin: auto; }
  .auth-story-label { display: flex; align-items: center; gap: 10px; margin-bottom: 25px; font-size: 10px; letter-spacing: 0.4px; color: #bbb; }
  .auth-story-rule { width: 23px; height: 1px; background: #888; }
  .auth-story h2 { font-size: clamp(38px, 3.8vw, 54px); font-weight: 500; line-height: 1.12; letter-spacing: -1.8px; }
  .auth-story h2 span { color: #c5c5c5; }
  .auth-story-description { margin-top: 20px; color: #b8b8b8; font-size: 13px; line-height: 1.8; }
  .auth-story-features { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-top: 46px; color: #c6c6c6; font-size: 10px; }
  .auth-story-features > span { display: inline-flex; align-items: center; gap: 7px; }
  .auth-story-features :deep(.iconify) { width: 14px; height: 14px; }
  .auth-story-footer { margin-top: 45px; color: #8f8f8f; font-size: 10px; }
  .auth-entry { padding: 110px 50px 25px; }
}
@media (min-width: 1600px) {
  .auth-story { padding-inline: 100px; }
  .auth-header { padding-inline: 40px; }
}
@media (max-height: 850px) {
  .auth-story-label { margin-bottom: 18px; }
  .auth-story-description { margin-top: 14px; }
  .auth-story-features { margin-top: 35px; }
  .auth-story-footer { margin-top: 25px; }
}
@media (max-height: 720px) {
  .auth-story { padding-top: 95px; }
  .auth-story-features, .auth-story-footer { display: none; }
  .auth-entry-description { font-size: 13px; line-height: 1.7; margin-top: 12px; margin-bottom: 20px; }
  .auth-account-note { padding-top: 16px; margin-top: 18px; }
}
@media (max-height: 600px) {
  .auth-entry { padding-top: 85px; padding-bottom: 18px; }
  .auth-entry-footer { display: none; }
  .auth-story-description { display: none; }
}
@media (max-height: 430px) {
  .auth-entry { padding-top: 72px; padding-bottom: 12px; }
  .auth-entry h1 { font-size: 28px; line-height: 1.15; margin-bottom: 18px; }
  .auth-entry-description, .auth-account-note { display: none; }
  .auth-story h2 { font-size: 34px; }
}
@media (min-width: 640px) {
  .auth-header { padding-inline: 40px; }
}
</style>
