<template>
  <div class="relative inline-block" ref="dropdownRef">
    <!-- Watch page trigger -->
    <button 
      v-if="variant === 'minimal'"
      @click="toggleDropdown"
      class="bg-card-background flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3" 
      aria-label="Manage Watchlist"
      :class="{ 'text-primary': selectedStatus, 'text-white': !selectedStatus }"
    >
      <svg v-if="!selectedStatus" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5 sm:size-4" fill="none"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"></path></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5 sm:size-4" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"></path></svg>
      
      <span class="hidden text-[11px] leading-none font-semibold tracking-tight uppercase 2xl:inline 2xl:text-[0.75rem]">{{ selectedStatus ? selectedStatus : 'Add to List' }}</span> 
      
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-down hidden h-3 w-3 transition-transform 2xl:block" :class="{ 'rotate-180': dropdownOpen }"><path d="m6 9 6 6 6-6"></path></svg>
    </button>
    
    <!-- Default trigger (anime page) -->
    <button 
      v-else
      @click="toggleDropdown"
      class="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50"
    >
      <svg 
        v-if="!selectedStatus"
        xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
        class="lucide-icon lucide lucide-book-marked h-4 w-4"
      >
        <path d="M10 2v8l3-3 3 3V2"></path>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"></path>
      </svg>
      <svg 
        v-else
        xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" 
        class="lucide-icon lucide lucide-square-pen h-4 w-4"
      >
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
      </svg>
      <span>{{ selectedStatus ? (selectedStatus === 'Watching' ? 'Edit List' : selectedStatus) : 'Add to List' }}</span> 
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-down h-3 w-3 transition-transform" :class="{ 'rotate-180': dropdownOpen }">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    </button>
    
    <!-- Dropdown content -->
    <Transition 
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="dropdownOpen" 
        class="absolute z-[9999] animate-in overflow-hidden rounded-xl border border-white/[0.08] bg-black shadow-2xl shadow-black/80 duration-200 ease-out fade-in-0 outline-none zoom-in-95 left-1/2 -translate-x-1/2 origin-top top-[calc(100%+8px)]" 
        style="min-width: 14rem; width: max-content;"
      >
        <div class="dd-hatch pointer-events-none absolute inset-0 z-0 c-g4wh4e"></div> 
        <span class="dd-arc pointer-events-none absolute top-0 right-0 z-0 c-g4wh4e"></span> 
        <span class="dd-dots pointer-events-none absolute bottom-1 left-1 z-0 c-g4wh4e"></span> 
        <div class="relative z-10 h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent c-g4wh4e"></div> 
        <div class="relative z-10 p-1.5">
          <div class="dropdown-section">
            <button 
              v-for="(label, key) in statusMap" 
              :key="key"
              @click="updateWatchlistStatus(key)"
              class="dropdown-item group"
              :disabled="isUpdating"
              :class="{
                'dropdown-item-active': watchlistStatus === key || (watchlistStatus === 'reading' && key === 'watching'),
                'dropdown-item-pending': isUpdating && pendingKey === key
              }"
            >
              <!-- spinner while this specific option is saving -->
              <svg 
                v-if="isUpdating && pendingKey === key"
                class="dropdown-spinner size-4 shrink-0 text-primary"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              >
                <path d="M12 2a10 10 0 0 1 10 10"></path>
              </svg>
              <svg 
                v-else
                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                :class="['lucide-icon', 'lucide', `lucide-${statusIcons[key].name}`, 'size-4', 'shrink-0', 'text-gray-400', 'transition-colors', 'group-hover:text-primary']"
                v-html="statusIcons[key].paths"
              ></svg>

              <span>{{ label }}</span>

              <svg 
                v-if="!isUpdating && (watchlistStatus === key || (watchlistStatus === 'reading' && key === 'watching'))"
                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                class="lucide-icon lucide lucide-check ml-auto size-4 text-primary"
              >
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </button>
          </div>

          <div v-if="watchlistStatus" class="dropdown-divider"></div>

          <button 
            v-if="watchlistStatus"
            @click="removeFromList"
            class="dropdown-item dropdown-danger"
            :disabled="isUpdating"
            :class="{ 'dropdown-item-pending': isUpdating && pendingKey === 'remove' }"
          >
            <svg 
              v-if="isUpdating && pendingKey === 'remove'"
              class="dropdown-spinner size-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            >
              <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-x size-4">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
            <span>Remove from List</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWatchlist } from '~/composables/useWatchlist'
import { useAuth } from '~/composables/useAuth'

const props = defineProps({
  media: {
    type: Object,
    required: true
  },
  variant: {
    type: String,
    default: 'default'
  }
})

// Extract state and functions directly from useWatchlist()
const watchlistComposable = useWatchlist()
const { entries, setWatchlistStatus: apiSetWatchlistStatus, removeFromWatchlist, isUpdating } = watchlistComposable
const { loggedIn, openLoginModal } = useAuth()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)

// Tracks which specific option (status key, or 'remove') triggered the
// in-flight request, so we can show a spinner on just that button while
// isUpdating is true instead of dimming the whole list.
const pendingKey = ref(null)

const statusMap = {
  'watching': 'Watching',
  'planning': 'Planning',
  'completed': 'Completed',
  'paused': 'Paused',
  'dropped': 'Dropped'
}

const statusIcons = {
  'watching': {
    name: 'play',
    paths: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>'
  },
  'planning': {
    name: 'clock',
    paths: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'
  },
  'completed': {
    name: 'check',
    paths: '<path d="M20 6 9 17l-5-5"></path>'
  },
  'paused': {
    name: 'pause',
    paths: '<rect x="14" y="3" width="5" height="18" rx="1"></rect><rect x="5" y="3" width="5" height="18" rx="1"></rect>'
  },
  'dropped': {
    name: 'x',
    paths: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'
  }
}

// Read directly from the shared entries store so Vue tracks reactivity correctly
const watchlistStatus = computed(() => {
  const id = props.media?.id
  if (!id) return null
  return entries.value[String(id)]?.watchlistStatus || null
})

const selectedStatus = computed(() => {
  if (!watchlistStatus.value) return ''
  return statusMap[watchlistStatus.value] || 'Watching'
})

const toggleDropdown = () => {
  if (!loggedIn.value) {
    openLoginModal()
    return
  }
  dropdownOpen.value = !dropdownOpen.value
}

async function updateWatchlistStatus(status) {
  if (!props.media || isUpdating.value) return

  // Ensure user is authenticated before modifying watchlist
  if (!loggedIn.value) {
    openLoginModal()
    return
  }

  pendingKey.value = status
  try {
    if (
      watchlistStatus.value === status || 
      (watchlistStatus.value === 'reading' && status === 'watching')
    ) {
      await removeFromWatchlist(props.media)
    } else {
      await apiSetWatchlistStatus(props.media, status)
    }
    dropdownOpen.value = false
  } catch (err) {
    // Error is handled by composable
  } finally {
    pendingKey.value = null
  }
}

async function removeFromList() {
  if (!props.media || isUpdating.value) return

  // Ensure user is authenticated before modifying watchlist
  if (!loggedIn.value) {
    openLoginModal()
    return
  }

  pendingKey.value = 'remove'
  try {
    await removeFromWatchlist(props.media)
    dropdownOpen.value = false
  } catch (err) {
    // Error is handled by composable
  } finally {
    pendingKey.value = null
  }
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

watch(() => props.media, () => {}, { immediate: true, deep: true })

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
