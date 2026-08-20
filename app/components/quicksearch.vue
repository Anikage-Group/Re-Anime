<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'open'])

// Default the search tab to whichever section the user is currently browsing
const getDefaultTab = () => (route.path.startsWith('/manga') ? 'manga' : 'anime')

// Component State Controls
const searchQuery = ref('')
const activeTab = ref(getDefaultTab()) // 'anime' | 'manga'
const results = ref([])
const totalResults = ref(0)
const isLoading = ref(false)
const debounceTimeout = ref(null)
const searchInput = ref(null)
const isMac = ref(false)

const config = useRuntimeConfig()
const MANGA_SEARCH_ENDPOINT = `${config.public.mangaVaultApiBase}/atsu/search`

// Roving keyboard-selection index: -1 = nothing highlighted, 0..N-1 = a
// result row, and (for the anime tab) one index past the last result is
// the "View All Results" row.
const activeIndex = ref(-1)
const resultRefs = ref([])

// Check operating system on mount to update UI labels
onMounted(() => {
  isMac.value = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  window.addEventListener('keydown', handleGlobalKeyDown)
})

// Computed style mapping for the skewed selection tab tracking marker
const tabIndicatorStyle = computed(() => {
  return {
    transform: activeTab.value === 'anime' 
      ? 'translateX(0%) skewX(-8deg)' 
      : 'translateX(100%) skewX(-8deg)'
  }
})

// Enforce display cap limit: Slice list to show exactly 5 records max
const displayedResults = computed(() => {
  return results.value.slice(0, 5)
})

// Whether the "View All Results" row is present — shown for either tab
// once there's actually something to view.
const showViewAllRow = computed(() => displayedResults.value.length > 0)

// Total number of keyboard-selectable rows (results + the View All row).
const selectableCount = computed(() => displayedResults.value.length + (showViewAllRow.value ? 1 : 0))

// Background cover texture is fixed strictly to the first result item (results[0])
const firstResultBackgroundCover = computed(() => {
  if (results.value.length > 0 && results.value[0]?.coverImage) {
    return results.value[0].coverImage
  }
  return ''
})

// --- Live Search Integration targeting API ---
const fetchSearchResults = async (query, category) => {
  if (!query.trim()) {
    results.value = []
    totalResults.value = 0
    return
  }
  
  isLoading.value = true
  try {
    if (category === 'manga') {
      const response = await fetch(`${MANGA_SEARCH_ENDPOINT}?keyword=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data && data.success) {
        results.value = (data.data?.items || []).map(item => ({
          id: item.id,
          title: item.title || 'Unknown Title',
          type: item.type || 'Manga',
          status: item.status || 'UNKNOWN',
          year: item.year || '',
          coverImage: item.cover || ''
        }))

        totalResults.value = data.data?.found ?? results.value.length
      } else {
        results.value = []
        totalResults.value = 0
      }
    } else {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${category}`)
      const data = await response.json()

      if (data && data.success) {
        results.value = (data.media || []).map(item => ({
          id: item.id,
          title: item.title?.english || item.title?.romaji || 'Unknown Title',
          type: item.format || 'TV',
          status: item.status || 'UNKNOWN',
          year: item.seasonYear || '',
          coverImage: item.coverImage?.large || ''
        }))

        totalResults.value = data.pageInfo?.total || results.value.length
      } else {
        results.value = []
        totalResults.value = 0
      }
    }
  } catch (error) {
    console.error("Search extraction failure:", error)
    results.value = []
    totalResults.value = 0
  } finally {
    isLoading.value = false
  }
}

// Redirect client to search dashboard page routing standard parameter payloads
const handleViewAllRedirect = () => {
  if (!searchQuery.value.trim()) return

  const path = activeTab.value === 'manga' ? '/manga/search' : '/search'

  router.push({
    path,
    query: { q: searchQuery.value }
  })
  handleClose()
}

// Navigate to a specific result and close the modal behind it.
const selectResult = (item) => {
  if (!item) return
  const path = activeTab.value === 'manga' ? `/manga/${item.id}` : `/anime/${item.id}`
  router.push(path)
  handleClose()
}

// Move the roving highlight up/down, wrapping around at either end.
const moveActiveIndex = (delta) => {
  if (selectableCount.value === 0) return
  const next = activeIndex.value + delta
  if (next < 0) activeIndex.value = selectableCount.value - 1
  else if (next >= selectableCount.value) activeIndex.value = 0
  else activeIndex.value = next
  scrollActiveIntoView()
}

const scrollActiveIntoView = async () => {
  await nextTick()
  const el = resultRefs.value[activeIndex.value]
  el?.scrollIntoView?.({ block: 'nearest' })
}

// Enter either activates whatever's highlighted, or falls back to "View
// All" when nothing's highlighted yet.
const handleInputEnter = () => {
  if (activeIndex.value === -1) {
    handleViewAllRedirect()
    return
  }
  if (activeIndex.value < displayedResults.value.length) {
    selectResult(displayedResults.value[activeIndex.value])
  } else {
    handleViewAllRedirect()
  }
}

// Watchers capturing updates mapping inputs dynamically with custom 250ms debouncing layer
watch([searchQuery, activeTab], ([newQuery, newTab]) => {
  activeIndex.value = -1
  clearTimeout(debounceTimeout.value)
  debounceTimeout.value = setTimeout(() => {
    fetchSearchResults(newQuery, newTab)
  }, 250)
})

// Focus helper engine
const focusSearchInput = async () => {
  await nextTick()
  if (searchInput.value) {
    searchInput.value.focus()
    // Places cursor at the end of pre-existing text (if any)
    const len = searchInput.value.value.length
    searchInput.value.setSelectionRange(len, len)
  }
}

// Run focus logic specifically once the entrance transition finishes
const onTransitionAfterEnter = () => {
  focusSearchInput()
}

// Fallback focus check in case transitions are bypassed/instant.
// Also re-syncs the default tab to whichever section (anime/manga) the
// user is currently browsing each time the modal is opened.
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    activeTab.value = getDefaultTab()
    focusSearchInput()
  }
})

const handleClose = () => {
  searchQuery.value = ''
  results.value = []
  totalResults.value = 0
  activeIndex.value = -1
  emit('close')
}

// Global Keydown Handler Capture Layer Engine
const handleGlobalKeyDown = (e) => {
  const isMatch = isMac.value ? e.metaKey : e.ctrlKey
  
  if (isMatch && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (props.isOpen) {
      focusSearchInput()
    } else {
      emit('open')
    }
  }
  if (e.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
  clearTimeout(debounceTimeout.value)
})
</script>

<template>
  <!-- Backdrop wrapper layer remains instant -->
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-[20000] flex min-h-full items-start justify-center bg-black/95 p-4 text-center sm:items-center backdrop-blur-sm"
    role="dialog" 
    aria-modal="true"
    @click.self="handleClose"
  >
    <!-- Isolated transition wraps only the content card container element -->
    <Transition
      appear
      enter-active-class="transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
      enter-from-class="opacity-0 -translate-y-12 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="duration-0 ease-linear"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      @after-enter="onTransitionAfterEnter"
    >
      <div class="max-h-[68dvh] w-full max-w-2xl transform text-left transition-all">
        <div class="relative mx-auto flex max-w-[600px] flex-col rounded-lg shadow-2xl">
          
          <!-- Header Access Action Navigation -->
          <div class="flex justify-between py-1 bg-black/40 rounded-t-lg border-b border-white/[0.03]">
            <div class="flex items-center gap-2 px-2">
              <p class="my-1 text-[11px] font-bold tracking-[0.18em] text-gray-400 uppercase">Quick access</p>
              <div class="search-key c-qbvsd5">{{ isMac ? 'CMD' : 'CTRL' }}</div>
              <span class="text-gray-500 text-xs">+</span>
              <div class="search-key c-qbvsd5">S</div>
            </div>
            <button @click="handleClose" class="px-2 text-gray-400 transition-colors hover:text-white" aria-label="Close search">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
                <path d="M18 6 6 18M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Input Shell Block Wrapper Box -->
          <div class="search-panel search-panel--edge relative flex flex-col overflow-hidden c-qbvsd5">
            <div class="search-hatch pointer-events-none absolute inset-0 c-qbvsd5"></div>
            <div class="search-arc search-arc--input pointer-events-none c-qbvsd5"></div>
            <div class="search-input-dots pointer-events-none c-qbvsd5"></div>
            <div class="search-ruler pointer-events-none c-qbvsd5"></div>
            
            <div class="search-tabs relative flex border-b border-white/[0.07] bg-black/25 z-10">
              <button 
                @click="activeTab = 'anime'"
                type="button"
                class="flex-1 py-2.5 text-[13px] font-bold tracking-[0.12em] uppercase transition-colors duration-200 z-20"
                :class="activeTab === 'anime' ? 'text-primary' : 'text-gray-400 hover:text-white'"
              >
                Anime
              </button>
              <button 
                @click="activeTab = 'manga'"
                type="button"
                class="flex-1 py-2.5 text-[13px] font-bold tracking-[0.12em] uppercase transition-colors duration-200 z-20"
                :class="activeTab === 'manga' ? 'text-primary' : 'text-gray-400 hover:text-white'"
              >
                Manga
              </button>
              
              <div 
                class="tab-indicator c-qbvsd5 absolute bottom-0 left-0 h-[2px] w-1/2 bg-primary transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-10"
                :style="tabIndicatorStyle"
              />
            </div>

            <div class="relative flex items-center z-10">
              <input 
                v-model="searchQuery"
                class="w-full border-0 bg-transparent p-4 pr-14 font-sans text-white placeholder-gray-500 outline-none focus:ring-0 focus:outline-none"
                autocomplete="off" 
                type="text" 
                :placeholder="activeTab === 'anime' ? 'Search Anime...' : 'Search Manga...'"
                ref="searchInput"
                @keydown.enter="handleInputEnter"
                @keydown.down.prevent="moveActiveIndex(1)"
                @keydown.up.prevent="moveActiveIndex(-1)"
              />
            </div>
          </div>

          <!-- Dynamic Content Response Dropdown Tray (Hidden completely when nothing is typed) -->
          <div 
            v-if="searchQuery.trim()"
            class="search-panel relative mt-2 overflow-hidden c-qbvsd5 min-h-[120px] flex flex-col justify-between"
          >
            
            <!-- Background Cover Fading Layer - Always tied to index 0 -->
            <div class="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500">
              <div 
                class="search-blur-layer absolute inset-0 c-qbvsd5 bg-cover bg-center transition-all duration-500 blur-md scale-105"
                :style="{ 
                  backgroundImage: firstResultBackgroundCover ? `url(${firstResultBackgroundCover})` : 'none',
                  opacity: firstResultBackgroundCover ? 0.25 : 0 
                }"
              />
              <div class="search-scrim absolute inset-0 c-qbvsd5"></div>
              <div class="search-arc c-qbvsd5"></div>
              <div class="search-dots c-qbvsd5"></div>
            </div>

            <!-- Scrollable Result List Container -->
            <ul 
              v-if="displayedResults.length > 0 && !isLoading" 
              class="scrollbar-thin relative z-10 flex max-h-[50dvh] flex-col overflow-y-auto c-qbvsd5 w-full"
            >
              <li 
                v-for="(item, index) in displayedResults"
                :key="item.id"
                :ref="el => (resultRefs[index] = el)"
                class="search-row flex cursor-pointer items-center space-x-4 border-b border-white/[0.05] px-4 py-3 last:border-b-0 transition-colors duration-150 hover:bg-white/[0.02] c-qbvsd5"
                :style="index === activeIndex ? { backgroundColor: 'rgba(255,255,255,0.03)' } : null"
                role="option"
                :aria-selected="index === activeIndex"
                tabindex="0"
                @click="selectResult(item)"
                @mouseenter="activeIndex = index"
                @keydown.enter="selectResult(item)"
              >
                <div v-if="item.coverImage" class="flex-shrink-0">
                  <img class="h-16 w-12 rounded bg-zinc-800 object-cover shadow-lg" loading="lazy" :src="item.coverImage" :alt="item.title">
                </div>

                <div class="min-w-0 flex-1">
                  <div class="mb-1 flex items-center">
                    <h3 class="truncate text-base font-medium text-white">{{ item.title }}</h3>
                  </div>
                  <p class="truncate text-sm text-gray-400">
                    {{ item.type }} &middot; {{ item.status }} <span v-if="item.year">&middot; {{ item.year }}</span>
                  </p>
                </div>

                <div class="flex-shrink-0 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </div>
              </li>

              <!-- Integrated Bottom View All Results Button - No sticky property, scrolls natively -->
              <li 
                v-if="showViewAllRow"
                :ref="el => (resultRefs[displayedResults.length] = el)"
                class="border-t border-white/[0.05] bg-black/40"
                :style="activeIndex === displayedResults.length ? { backgroundColor: 'rgba(255,255,255,0.05)' } : null"
                @mouseenter="activeIndex = displayedResults.length"
              >
                <button 
                  @click="handleViewAllRedirect"
                  type="button"
                  class="group flex w-full cursor-pointer items-center justify-center space-x-2 px-4 py-4 transition-all duration-200 hover:bg-primary/10"
                >
                  <span class="text-sm font-semibold text-primary group-hover:text-primary/80">View All Results ({{ totalResults }})</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-primary transition-transform group-hover:translate-x-1">
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </button>
              </li>
            </ul>

            <!-- Centered Loading State Indicator -->
            <div v-else-if="isLoading" class="relative z-10 flex flex-col items-center justify-center p-12 space-y-3 w-full grow">
              <div class="size-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <p class="text-xs font-medium tracking-wider text-gray-400 uppercase">Fetching matches...</p>
            </div>

            <!-- Fallback Empty Placeholders Layout -->
            <div v-else class="relative z-10 p-12 text-center text-sm text-gray-500 w-full grow">
              No results found tracking "{{ searchQuery }}"
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>