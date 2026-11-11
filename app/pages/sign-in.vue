<script setup lang="ts">
const route = useRoute()
const failed = computed(() => route.query.error === 'microsoft')
</script>

<template>
  <div class="h-screen flex items-center justify-center px-4 relative overflow-hidden">
    <HeroBackground />

    <UContainer class="max-w-md relative z-10">
      <div
        class="p-5"
      >
        <div class="space-y-6 text-center">
          <div class="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Sele-Sele Logo"
              class="h-16 w-auto object-contain transition-transform hover:scale-110 duration-300"
            >
          </div>

          <div class="space-y-2">
            <h1 class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              SeleSele
            </h1>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              Notion alternative with AI-powered completions and real-time collaboration
            </p>
          </div>

          <UAlert
            v-if="failed"
            color="error"
            variant="soft"
            title="Microsoft sign-in failed"
            description="Your sign-in was cancelled, expired, or could not be verified. Please try again."
          />
          <UButton
            to="/api/auth/microsoft"
            external
            variant="soft"
            size="lg"
            color="neutral"
            class="w-full justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
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
            <span class="font-medium">Continue with Microsoft</span>
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>
