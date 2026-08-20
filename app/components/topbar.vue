<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import QuickSearchModal from './quicksearch.vue' // Adjust path based on your directory layout
import { useAuth } from '~/composables/useAuth'
import { useWatchlist } from '~/composables/useWatchlist'
import { useAniListClient } from '~/composables/useAniListClient'

const { user, loggedIn, openLoginModal, logout, init } = useAuth()
const { fetchNotifications } = useAniListClient()
const restatusUrl = useRuntimeConfig().public.restatusUrl

const isMenuOpen = ref(false)
const isProfileOpen = ref(false) // Controls visibility of the Profile Menu
const isNotificationOpen = ref(false) // Controls visibility of the Notification Menu
const scrollRatio = ref(0)       // Tracks scroll progress (0 at top, 1 at 250px)
const isSearchOpen = ref(false)  // Controls visibility of the Quick Search Modal

// Template refs to track menu containers for outside-click logic
const navigationMenuRef = ref(null)
const profileMenuRef = ref(null)
const notificationMenuRef = ref(null)

// Handle scroll logic (interpolates scroll between 0px and 250px)
const handleScroll = () => {
  const maxScroll = 250 // Adjust this to complete the fade earlier (e.g., 200px) or later (e.g., 300px)
  scrollRatio.value = Math.min(window.scrollY / maxScroll, 1)
}

// Keyboard shortcut logic
const handleKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    isSearchOpen.value = !isSearchOpen.value
  }
}

// Global click handler to close menus when clicking elsewhere
const handleClickOutside = (event) => {
  if (
    isMenuOpen.value && 
    navigationMenuRef.value && 
    !navigationMenuRef.value.contains(event.target)
  ) {
    isMenuOpen.value = false
  }

  if (
    isProfileOpen.value && 
    profileMenuRef.value && 
    !profileMenuRef.value.contains(event.target)
  ) {
    isProfileOpen.value = false
  }

  if (
    isNotificationOpen.value && 
    notificationMenuRef.value && 
    !notificationMenuRef.value.contains(event.target)
  ) {
    isNotificationOpen.value = false
  }
}

const handleSignOut = async () => {
  await logout()
  isProfileOpen.value = false
}

const { hydrateRemote } = useWatchlist()
const notifications = ref([])
const loadingNotifications = ref(false)

const loadNotifications = async () => {
  if (!loggedIn.value || loadingNotifications.value) return
  loadingNotifications.value = true
  try {
    notifications.value = await fetchNotifications()
  } catch (err) {
    console.error('Failed to load notifications', err)
  } finally {
    loadingNotifications.value = false
  }
}

watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    hydrateRemote()
    loadNotifications()
  }
}, { immediate: true })

const timeAgo = (timestamp) => {
  if (!timestamp) return ''
  const seconds = Math.floor((new Date() - timestamp * 1000) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  return Math.floor(seconds) + ' seconds ago'
}

onMounted(() => {
  init()
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleClickOutside)
  // Call immediately in case page loads scrolled down
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header 
    class="fixed top-0 left-0 right-0 z-[9999] border-b c-ow202j"
    :style="{
      backgroundColor: `rgba(0, 0, 0, ${scrollRatio * 0.8})`,
      borderColor: `rgba(255, 255, 255, ${scrollRatio * 0.1})`,
      backdropFilter: `blur(${scrollRatio * 40}px)`,
      webkitBackdropFilter: `blur(${scrollRatio * 40}px)`
    }"
  >
    <div class="pointer-events-none absolute inset-y-0 left-0 z-[-2] w-64 bg-gradient-to-r from-black/80 to-transparent md:w-[400px] c-ow202j" style="mask-image: linear-gradient(black 50%, transparent 100%);"></div>
    <div class="pointer-events-none absolute inset-y-0 right-0 z-[-2] w-48 bg-gradient-to-l from-black/80 to-transparent md:w-64 c-ow202j" style="mask-image: linear-gradient(black 50%, transparent 100%);"></div>

    <div class="relative z-10 flex w-full items-center justify-between px-4 py-3 sm:px-6 c-ow202j">
      <div class="flex items-center gap-2 sm:gap-3 lg:gap-3 c-ow202j">
        
        <div ref="navigationMenuRef" class="relative shrink-0 c-ow202j">
          <button 
            @click="isMenuOpen = !isMenuOpen"
            aria-label="Navigation menu" 
            class="hud-menu-btn c-ow202j" 
            :class="{ 'is-open': isMenuOpen }"
            :aria-expanded="isMenuOpen"
          >
            <span class="hud-glyph c-ow202j" :class="{ 'is-open': isMenuOpen }">
              <span class="c-ow202j"></span> 
              <span class="c-ow202j"></span> 
              <span class="c-ow202j"></span>
            </span>
          </button> 
          
          <div v-show="isMenuOpen" class="hud-menu c-ow202j">
            <span class="hud-menu-hatch c-ow202j" aria-hidden="true"></span> 
            <span class="hud-menu-arc c-ow202j" aria-hidden="true"></span> 
            
            <div class="hud-menu-head lg:hidden c-ow202j">
              <span class="hud-menu-seam c-ow202j" aria-hidden="true"></span> 
              <span class="hud-menu-head-text c-ow202j">Browse</span> 
              <span class="hud-menu-ruler c-ow202j" aria-hidden="true"></span>
            </div> 
            
            <nav class="hud-menu-group lg:hidden c-ow202j" @click="isMenuOpen = false">
              <NuxtLink to="/home" active-class="is-active" class="hud-menu-item c-ow202j">
                <span class="hud-menu-icon c-ow202j">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-house size-4"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                </span> 
                <span class="hud-menu-label c-ow202j">Home</span> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right hud-menu-chev size-3.5"><path d="m9 18 6-6-6-6"></path></svg>
              </NuxtLink>
              <NuxtLink to="/search" active-class="is-active" class="hud-menu-item c-ow202j">
                <span class="hud-menu-icon c-ow202j">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-search size-4"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
                </span> 
                <span class="hud-menu-label c-ow202j">Search</span> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right hud-menu-chev size-3.5"><path d="m9 18 6-6-6-6"></path></svg>
              </NuxtLink>
              <NuxtLink to="/schedule" active-class="is-active" class="hud-menu-item c-ow202j">
                <span class="hud-menu-icon c-ow202j">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-calendar size-4"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg>
                </span> 
                <span class="hud-menu-label c-ow202j">Schedule</span> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right hud-menu-chev size-3.5"><path d="m9 18 6-6-6-6"></path></svg>
              </NuxtLink>
              <NuxtLink to="/manga" active-class="is-active" class="hud-menu-item c-ow202j">
                <span class="hud-menu-icon c-ow202j">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-library-big size-5"><rect width="8" height="18" x="3" y="3" rx="1"></rect><path d="M7 3v18"></path><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"></path></svg>
                </span> 
                <span class="hud-menu-label c-ow202j">Manga</span> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right hud-menu-chev size-3.5"><path d="m9 18 6-6-6-6"></path></svg>
              </NuxtLink>
            </nav> 
            
            <div class="hud-menu-head c-ow202j">
              <span class="hud-menu-seam c-ow202j" aria-hidden="true"></span> 
              <span class="hud-menu-head-text c-ow202j">More</span> 
              <span class="hud-menu-ruler c-ow202j" aria-hidden="true"></span>
            </div> 
            
            <nav class="hud-menu-group c-ow202j" @click="isMenuOpen = false">
              <NuxtLink to="/settings" active-class="is-active" class="hud-menu-item c-ow202j">
                <span class="hud-menu-icon c-ow202j">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-settings size-5"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </span> 
                <span class="hud-menu-label c-ow202j">Settings</span> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right hud-menu-chev size-3.5"><path d="m9 18 6-6-6-6"></path></svg>
              </NuxtLink>
              <a target="_blank" rel="noopener noreferrer" class="hud-menu-item c-ow202j" :href="restatusUrl">
                <span class="hud-menu-icon c-ow202j">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-download size-4"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg>
                </span> 
                <span class="hud-menu-label c-ow202j">Source Code</span> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right hud-menu-chev size-3.5"><path d="m9 18 6-6-6-6"></path></svg>
              </a>
              <NuxtLink to="/" active-class="is-active" class="hud-menu-item c-ow202j">
                <span class="hud-menu-icon c-ow202j">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-life-buoy size-4"><circle cx="12" cy="12" r="10"></circle><path d="m4.93 4.93 4.24 4.24"></path><path d="m14.83 9.17 4.24-4.24"></path><path d="m14.83 14.83 4.24 4.24"></path><path d="m9.17 14.83-4.24 4.24"></path><circle cx="12" cy="12" r="4"></circle></svg>
                </span> 
                <span class="hud-menu-label c-ow202j">Lander</span> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right hud-menu-chev size-3.5"><path d="m9 18 6-6-6-6"></path></svg>
              </NuxtLink>
              <a target="_blank" rel="noopener noreferrer" class="hud-menu-item c-ow202j" :href="restatusUrl">
                <span class="hud-menu-icon c-ow202j">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-activity size-4"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>
                </span> 
                <span class="hud-menu-label c-ow202j">Status</span> 
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right hud-menu-chev size-3.5"><path d="m9 18 6-6-6-6"></path></svg>
              </a>
            </nav>
          </div>
        </div> 

        <NuxtLink to="/home" class="group -mr-2 flex shrink-0 items-center lg:-ml-3 c-ow202j">
          <img src="/logo.png" alt="Re:ANIME" class="h-10 w-auto transition-transform duration-300 group-hover:scale-102 sm:h-12 lg:h-14 c-ow202j">
        </NuxtLink>

        <button 
          @click="isSearchOpen = true"
          class="hidden min-w-[260px] items-center gap-3 rounded-xl border border-white/20 bg-black/40 px-4 py-2.5 text-left text-gray-300 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-black/60 hover:text-white sm:flex xl:min-w-[320px] c-ow202j"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-search size-5 text-gray-400 transition-colors group-hover:text-primary"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
          <span class="text-base font-medium c-ow202j">Search anime...</span>
          <div class="ml-auto flex items-center gap-1 text-xs text-gray-500 c-ow202j">
            <kbd class="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium c-ow202j">⌘</kbd>
            <kbd class="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium c-ow202j">S</kbd>
          </div>
        </button>
      </div>

      <div class="flex items-center gap-1 c-ow202j">
        <button 
          @click="isSearchOpen = true"
          class="group p-2 text-gray-400 transition-colors duration-300 hover:text-primary sm:hidden c-ow202j" 
          aria-label="Search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-search size-5 transition-transform duration-300 group-hover:scale-110"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
        </button>
        
        <template v-if="loggedIn && user">
          <!-- Notification Dropdown -->
          <div ref="notificationMenuRef" class="relative mr-2 flex items-center c-ow202j">
            <button 
              @click="isNotificationOpen = !isNotificationOpen"
              class="group relative p-2 text-gray-400 transition-all duration-300 outline-none hover:text-primary c-ow202j"
              :aria-expanded="isNotificationOpen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-bell size-5 transition-transform duration-300 group-hover:scale-110"><path d="M10.268 21a2 2 0 0 0 3.464 0"></path><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path></svg>
            </button>

            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-2"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-2"
            >
              <div 
                v-if="isNotificationOpen"
                class="absolute top-[calc(100%+8px)] -right-2 z-50 flex w-64 origin-top-right flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/95 shadow-2xl shadow-black/80 backdrop-blur-2xl outline-none c-ow202j"
              >
                <div class="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 c-ow202j"></div> 
                <div class="relative flex border-b border-white/10 bg-black/40 c-ow202j">
                  <button class="relative z-10 flex-1 overflow-hidden py-3 text-xs font-medium transition-colors sm:text-sm text-gray-400 hover:text-gray-200 c-ow202j"><span class="relative z-10 capitalize c-ow202j">community</span></button>
                  <button class="relative z-10 flex-1 overflow-hidden py-3 text-xs font-medium transition-colors sm:text-sm text-primary c-ow202j"><span class="relative z-10 capitalize c-ow202j">anime</span> <span class="absolute inset-0 bg-primary/10 c-ow202j"></span></button>
                  <button class="relative z-10 flex-1 overflow-hidden py-3 text-xs font-medium transition-colors sm:text-sm text-gray-400 hover:text-gray-200 c-ow202j"><span class="relative z-10 capitalize c-ow202j">system</span></button> 
                  <span class="absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 ease-out c-ow202j" style="width: 33.333%; transform: translateX(100%);"></span>
                </div> 
                <div class="border-b border-white/5 bg-black/20 p-1.5 c-ow202j">
                  <button class="flex w-full items-center justify-center rounded py-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase transition-colors hover:bg-white/[0.03] hover:text-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent c-ow202j">Mark all as read</button>
                </div> 
                <div class="scrollbar-thin max-h-[350px] min-h-[150px] overflow-y-auto c-ow202j relative">
                  <div v-if="loadingNotifications" class="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/50 backdrop-blur-sm z-10">
                    <svg class="size-6 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                  <div v-if="!loadingNotifications && notifications.length === 0" class="flex flex-col items-center justify-center p-8 text-center text-gray-500">
                    <svg class="lucide lucide-inbox mb-2 size-8 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
                    <p class="text-xs font-medium">No new notifications</p>
                  </div>
                  <NuxtLink 
                    v-for="notif in notifications" 
                    :key="notif.id"
                    :to="notif.url"
                    class="block w-full border-b border-white/5 text-left transition-colors hover:bg-white/[0.03] bg-primary/[0.02] c-ow202j"
                    @click="isNotificationOpen = false"
                  >
                    <div class="p-4 c-ow202j">
                      <div class="flex gap-3 c-ow202j">
                        <img v-if="notif.image" :alt="notif.title" :src="notif.image" class="h-14 w-10 rounded-md shrink-0 object-cover ring-1 ring-white/10 c-ow202j">
                        <div v-else class="h-14 w-10 rounded-md shrink-0 bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
                          <svg class="size-4 text-white/30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        </div>
                        <div class="min-w-0 flex-1 c-ow202j">
                          <p class="line-clamp-2 text-[13px] leading-snug font-medium text-gray-200 c-ow202j">{{ notif.title }}</p> 
                          <p class="mt-1.5 text-[11px] font-medium tracking-wide text-primary/70 c-ow202j">{{ timeAgo(notif.createdAt) }}</p>
                        </div> 
                        <div class="mt-1.5 size-2 shrink-0 rounded-full bg-primary c-ow202j"></div>
                      </div>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </Transition>
          </div>

          <!-- User Profile Dropdown -->
          <div ref="profileMenuRef" class="relative c-ow202j">
            <button 
              @click="isProfileOpen = !isProfileOpen"
              class="flex items-center gap-2 px-1 py-1 transition-all duration-200 hover:opacity-80 c-ow202j" 
              aria-label="User Menu" 
              :aria-expanded="isProfileOpen"
            >
              <img class="size-7 rounded-full object-cover ring-1 ring-white/15 c-ow202j" :src="user.avatar?.large || '/rover.jpg'" :alt="user.name">
            </button> 
            
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-2"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-2"
            >
              <div 
                v-if="isProfileOpen" 
                class="absolute top-[calc(100%+8px)] -right-4 z-50 w-60 origin-top-right overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/95 shadow-2xl shadow-black/80 backdrop-blur-2xl outline-none c-ow202j"
              >
                <div class="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 c-ow202j"></div> 
                <div class="p-1.5 c-ow202j">
                  <div class="relative mb-1 overflow-hidden rounded-lg px-3 py-3 c-ow202j">
                    <div class="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl c-ow202j"></div> 
                    <div class="relative z-10 flex items-center gap-3 c-ow202j">
                      <img class="size-10 shrink-0 rounded-full object-cover ring-2 ring-primary/30 c-ow202j" :src="user.avatar?.large || '/rover.jpg'" :alt="user.name"> 
                      <div class="flex min-w-0 flex-col c-ow202j">
                        <span class="truncate text-sm font-semibold text-white drop-shadow-sm c-ow202j">{{ user.name }}</span> 
                        <span class="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-primary/60 c-ow202j">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-calendar size-3 shrink-0"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg>
                          Joined {{ user.createdAt ? new Date(user.createdAt * 1000).toLocaleDateString() : 'Unknown' }}
                        </span>
                      </div>
                    </div>
                  </div> 
                  
                  <div class="mx-2 my-1 h-[1px] bg-white/[0.06] c-ow202j"></div> 
                  
                  <div class="mt-1 flex flex-col gap-0.5 c-ow202j" @click="isProfileOpen = false">
                    <NuxtLink to="/profile" active-class="is-active" class="group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-300 transition-all duration-200 hover:bg-primary/10 hover:text-primary c-ow202j">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-user size-4 text-gray-400 transition-colors group-hover:text-primary"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      Profile
                    </NuxtLink> 
                    <NuxtLink to="/watchlist" active-class="is-active" class="group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-300 transition-all duration-200 hover:bg-primary/10 hover:text-primary c-ow202j">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-book-marked size-4 text-gray-400 transition-colors group-hover:text-primary"><path d="M10 2v8l3-3 3 3V2"></path><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"></path></svg>
                      Watchlist
                    </NuxtLink> 
                    <NuxtLink to="/continue-watching" active-class="is-active" class="group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-300 transition-all duration-200 hover:bg-primary/10 hover:text-primary c-ow202j">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-history size-4 text-gray-400 transition-colors group-hover:text-primary"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
                      Continue Watching
                    </NuxtLink> 
                    <NuxtLink to="/continue-reading" active-class="is-active" class="group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-300 transition-all duration-200 hover:bg-primary/10 hover:text-primary c-ow202j">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-book-open size-4 text-gray-400 transition-colors group-hover:text-primary"><path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path></svg>
                      Continue Reading
                    </NuxtLink>
                  </div> 
                  
                  <div class="mx-2 my-1 h-[1px] bg-white/[0.06] c-ow202j"></div> 
                  
                  <button 
                    @click="handleSignOut"
                    class="group mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-400/90 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 focus:bg-red-500/10 focus:outline-none c-ow202j"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-log-out size-4 text-red-400/70 transition-colors group-hover:text-red-400"><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path></svg> 
                    Sign Out
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <button @click="openLoginModal()" class="header-cta c-ow202j ml-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black transition-all hover:bg-primary/90">Sign In</button>
        </template>
      </div>
    </div>
  </header>

  <Transition
    enter-active-class="transition duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
    enter-from-class="opacity-0 -translate-y-8 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="duration-0 ease-linear"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <QuickSearchModal 
      v-if="isSearchOpen"
      :is-open="isSearchOpen" 
      @close="isSearchOpen = false" 
      @open="isSearchOpen = true"
    />
  </Transition>
</template>