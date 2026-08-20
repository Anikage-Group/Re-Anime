<script setup>
import { onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
const route = useRoute()
onMounted(() => {
  useAuth().init()
})

// Hook into Nuxt's loading indicator state
const { progress, isLoading } = useLoadingIndicator()

// Multiplies Nuxt's progress to make it finish faster, capped at 100%
const customProgress = computed(() => Math.min(100, progress.value * 1.35))

const pageTitle = computed(() => {
  if (route.path === '/') return 'Re:ANIME — Stream Anime Free Online'
  if (route.path === '/anime') return 'Anime - Watch Free on Re:ANIME'
  if (route.path === '/manga') return 'Manga - Read Free on Re:ANIME'
  const names = {
    '/home': 'Home', '/watchlist': 'Watchlist', '/settings': 'Settings',
    '/search': 'Search', '/schedule': 'Schedule', '/continue-watching': 'Continue Watching',
    '/terms': 'Terms', '/privacy': 'Privacy', '/source': 'Source Code'
  }
  return `${names[route.path] || 'Re:ANIME'} - Re:ANIME`
})
useHead(() => ({ title: pageTitle.value, titleTemplate: '%s' }))
</script>

<template>
  <div>
    <!-- Faster Custom Top Progress Bar -->
    <div 
      v-if="isLoading"
      class="fixed top-0 right-0 left-0 z-[70] h-1 bg-gray-200/10 c-1fpe2v8"
    >
      <div 
        class="h-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 transition-all duration-150 ease-out c-1fpe2v8"
        :style="{ width: `${customProgress}%` }"
      ></div>
    </div>

    <!-- Native Nuxt Loading Indicator -->
    <NuxtLoadingIndicator 
      color="#a3e635"
      :height="1" 
      :throttle="0"
      class="loading-progress c-ow202j z-[9999]"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <footer />
    <AuthModal />
  </div>
</template>

<style>
/* This will be applied globally across your app */
html, body {
  overflow-x: hidden;
  width: 100%;
  margin: 0;
  padding: 0;
}

*, *::before, *::after {
  box-sizing: border-box;
}
</style>