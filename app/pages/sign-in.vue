<script setup lang="ts">
const route = useRoute()
const failed = computed(() => route.query.error === 'microsoft')
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-default">
    <section class="flex flex-col px-6 sm:px-12 xl:px-20 py-7 min-h-screen">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5 font-semibold text-lg tracking-tight text-highlighted">
          <img
            src="/logo.png"
            alt=""
            class="size-9 object-contain grayscale"
          >SeleSele<span class="text-primary -ml-2">.</span>
        </div><UColorModeButton color="neutral" />
      </div>
      <div class="flex flex-1 items-center justify-center py-12">
        <div class="w-full max-w-sm app-enter">
          <div class="eyebrow inline-flex items-center gap-2 mb-6">
            <UIcon
              name="i-lucide-notebook-pen"
              class="size-3.5"
            /> A home for your ideas
          </div>
          <h1 class="text-4xl sm:text-[2.75rem] font-semibold tracking-[-0.045em] leading-[1.12] text-highlighted">
            Less scattered.<br>More together<span class="text-primary">.</span>
          </h1>
          <p class="text-muted leading-relaxed mt-5 mb-8 text-sm">
            Your notes, projects, and people. One thoughtful workspace to bring it all together.
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
            color="neutral"
            variant="outline"
            class="w-full justify-center py-3 bg-elevated hover:bg-muted border-default"
          >
            <template #leading>
              <svg
                viewBox="0 0 21 21"
                class="w-5 h-5"
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
            </template>
            Continue with Microsoft
          </UButton>
          <div class="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted">
            <UIcon
              name="i-lucide-lock-keyhole"
              class="size-3"
            /> Secure sign-in with your organization
          </div>
        </div>
      </div>
      <p class="text-xs text-muted">
        A little space. A lot of possibility.
      </p>
    </section>
    <section class="hidden lg:flex flex-col justify-center border-l border-default px-12 xl:px-20 bg-default">
      <div class="max-w-md w-full mx-auto">
        <p class="eyebrow mb-6">
          Think clearly. Work together.
        </p>
        <h2 class="text-5xl font-semibold tracking-[-0.045em] leading-[1.12] text-highlighted">
          Everything starts<br>with a page.
        </h2>
        <p class="text-sm leading-relaxed text-muted mt-6 mb-12">
          One place to organize your knowledge and move your team's work forward.
        </p>
        <div class="border-t border-default">
          <div
            v-for="feature in [
              { icon: 'i-lucide-panels-top-left', title: 'A workspace for your team', description: 'Bring your people and projects together.' },
              { icon: 'i-lucide-folder', title: 'A place for every page', description: 'Keep your notes organized in folders.' },
              { icon: 'i-lucide-pencil-line', title: 'Ideas, in sync', description: 'Write and collaborate in real time.' }
            ]"
            :key="feature.title"
            class="flex gap-4 py-6 border-b border-default"
          >
            <UIcon
              :name="feature.icon"
              class="size-5 shrink-0 mt-0.5 text-highlighted"
            />
            <div>
              <h3 class="text-sm font-medium text-highlighted">
                {{ feature.title }}
              </h3><p class="text-sm text-muted mt-1">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
