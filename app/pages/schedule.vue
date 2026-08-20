<template>
  <div style="background-color: #000">
    <div style="padding-top:65px" class="schedule-page min-h-screen w-full">
      <div class="relative -mt-16 h-56 w-full overflow-visible pt-16 sm:h-64">
        <div class="pointer-events-none absolute inset-0 -bottom-32 z-0 overflow-hidden">
          <div 
            class="hero-blur-layer absolute inset-0 transition-opacity duration-700 ease-in-out c-69m9mo" 
            :style="{ 
              backgroundImage: bgA.cover1 ? `url(${bgA.cover1})` : 'none', 
              opacity: bgA.visible && bgA.cover1 ? 0.15 : 0 
            }"
          ></div>
          <div 
            class="hero-blur-layer absolute inset-0 transition-opacity duration-700 ease-in-out c-69m9mo" 
            :style="{ 
              backgroundImage: bgA.cover2 ? `url(${bgA.cover2})` : 'none', 
              opacity: bgA.visible && bgA.cover2 ? 0.15 : 0 
            }"
          ></div>

          <div 
            class="hero-blur-layer absolute inset-0 transition-opacity duration-700 ease-in-out c-69m9mo" 
            :style="{ 
              backgroundImage: bgB.cover1 ? `url(${bgB.cover1})` : 'none', 
              opacity: bgB.visible && bgB.cover1 ? 0.15 : 0 
            }"
          ></div>
          <div 
            class="hero-blur-layer absolute inset-0 transition-opacity duration-700 ease-in-out c-69m9mo" 
            :style="{ 
              backgroundImage: bgB.cover2 ? `url(${bgB.cover2})` : 'none', 
              opacity: bgB.visible && bgB.cover2 ? 0.15 : 0 
            }"
          ></div>

          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
        </div>
        
        <div class="absolute inset-x-0 bottom-0 z-10 flex items-end justify-center px-4 pb-8">
          <div class="text-center">
            <h1 class="animate-fade-in-up mb-2 text-4xl font-extrabold tracking-tight text-white drop-shadow-md md:text-5xl" style="animation-delay: 0ms;">
              Weekly Schedule
            </h1>
            <p class="animate-fade-in-up text-sm font-medium text-gray-400" style="animation-delay: 80ms;">
              Keep track of your favorite anime airing times
            </p>
          </div>
        </div>
      </div>

      <div class="px-4 py-8 md:py-12">
        <div v-if="error" class="text-center py-12 text-red-400">
          {{ error }}
        </div>

        <div v-else>
          <div 
            class="animate-fade-in-up tabs-container -mx-4 -mt-4 mb-16 no-scrollbar flex items-center justify-start gap-2 overflow-x-auto pt-4 pr-4 pb-4 pl-[12px] md:justify-center md:px-4 c-69m9mo" 
            role="tablist" 
            style="animation-delay: 160ms;"
          >
            <button 
              v-for="day in weekDays" 
              :key="day.dateString"
              :aria-label="day.dateString" 
              class="tab-btn c-69m9mo"
              :class="{ 'is-active': activeDateString === day.dateString }"
              @click="activeDateString = day.dateString"
            >
              <span v-if="day.isToday" aria-hidden="true" class="tab-today c-69m9mo"></span>
              <span class="tab-day c-69m9mo">{{ day.dayName }}</span>
              <span class="tab-date c-69m9mo">{{ day.dayOfMonth }}</span>
            </button>
          </div>

          <div class="timeline-container animate-fade-in relative mx-auto w-full max-w-7xl md:px-10" style="animation-delay: 100ms;">
            <div class="relative flex flex-col gap-12 pb-20">
              <div class="timeline-line absolute top-4 bottom-0 left-[28px] z-0 w-[1px] bg-white/[0.08] md:left-[50%] md:-translate-x-1/2"></div>
              
              <div v-if="filteredSchedules.length === 0" class="text-center py-12 text-gray-500">
                No anime scheduled for this day.
              </div>

              <div 
                v-for="(item, index) in filteredSchedules" 
                :key="item.id"
                class="animate-fade-in-up relative z-10 w-full"
                :class="{ 'mt-10 md:mt-2': isNextAiring(item) }"
                :style="{ animationDelay: `${index * 0.06}s` }"
              >
                <div class="absolute top-[34px] left-[20px] z-20 flex flex-col items-center md:top-1/2 md:left-[50%] md:-translate-x-1/2 md:-translate-y-1/2">
                  <div v-if="isNextAiring(item)" class="absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2">
                    <div class="next-badge c-69m9mo">Airing Next</div>
                    <div class="next-badge-stem c-69m9mo"></div>
                  </div>
                  <div class="relative z-10 py-1">
                    <div class="node c-69m9mo" :class="{ 'node-next': isNextAiring(item) }">
                      <span class="node-core c-69m9mo"></span>
                    </div>
                  </div>
                </div>

                <div 
                  class="timeline-item c-13qhxpu"
                  :class="[
                    index % 2 === 0 ? 'align-right' : 'align-left',
                    { 
                      'is-aired': item.timeUntilAiring < 0,
                      'is-airing-next': isNextAiring(item)
                    }
                  ]"
                >
                  <div class="time-section c-13qhxpu">
                    <div class="time-desktop c-13qhxpu" :class="index % 2 === 0 ? 'text-start' : 'text-end'">
                      <span class="time-value c-13qhxpu">{{ formatTime(item.airingAt) }}</span>
                      <div class="flex items-center gap-1.5" :class="index % 2 === 0 ? 'justify-start' : 'justify-end'">
                        <span class="time-episode c-13qhxpu">Episode {{ item.episode }}</span>
                      </div>
                    </div>
                    <div class="time-mobile c-13qhxpu">
                      <span class="time-value-mobile c-13qhxpu">{{ formatTime(item.airingAt) }}</span>
                      <span class="time-episode-pill c-13qhxpu">EP {{ item.episode }}</span>
                    </div>
                  </div>

                  <div class="card-section c-13qhxpu">
                    <a class="card-link c-13qhxpu" :href="`/anime/${item.media.id}`">
                      <span aria-hidden="true" class="card-arc c-13qhxpu"></span>
                      <span aria-hidden="true" class="card-dots c-13qhxpu"></span>
                      
                      <div class="card-inner c-13qhxpu">
                        <div class="thumbnail-wrap c-13qhxpu">
                          <img 
                            :alt="getMediaTitle(item.media)" 
                            class="thumbnail-img c-13qhxpu loaded" 
                            loading="lazy" 
                            :src="item.media.coverImage.large"
                          />
                        </div>
                        
                        <div class="card-details c-13qhxpu">
                          <h3 class="card-title c-13qhxpu">
                            {{ getMediaTitle(item.media) }}
                          </h3>
                          
                          <div class="card-description c-13qhxpu">
                            {{ item.media.description || 'No description available.' }}
                          </div>
                          
                          <div class="genres-wrap c-13qhxpu">
                            <span class="genre-tag c-13qhxpu" role="button" tabindex="0">
                              {{ item.media.format }}
                            </span>
                            <span class="genre-tag c-13qhxpu" role="button" tabindex="0">
                              {{ item.media.status }}
                            </span>
                          </div>
                          
                          <div class="status-mobile c-13qhxpu">
                            <span>{{ getStatusText(item) }}</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>  
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const activeDateString = ref('') // Format: YYYY-MM-DD

// Helper function to format a Date object into YYYY-MM-DD local string safely
const formatDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dateVal = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${dateVal}`
}

// 1. Nuxt 4 Top-level Fetch: This blocks rendering until resolved.
// Your red global loading indicator will automatically show on transitions.
const { data: apiResponse, error } = await useFetch('/api/schedule')

// Map returned data to reactive schedules ref
const schedules = computed(() => {
  return apiResponse.value?.success ? apiResponse.value.schedules : []
})

// Initialize active date string
activeDateString.value = formatDateString(new Date())

// Generate the 7-day week centered around the ACTUAL current day
const weekDays = computed(() => {
  const today = new Date()
  
  // Find Monday of the current week
  const dayOfWeek = today.getDay() 
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + distanceToMonday)

  const days = []
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday)
    current.setDate(monday.getDate() + i)
    
    const dateString = formatDateString(current)

    days.push({
      dayName: dayNames[current.getDay()],
      dayOfMonth: current.getDate(),
      dateString,
      isToday: current.toDateString() === today.toDateString()
    })
  }
  return days
})

const filteredSchedules = computed(() => {
  return schedules.value.filter(item => {
    const airingDate = new Date(item.airingAt * 1000)
    const dateString = formatDateString(airingDate)
    return dateString === activeDateString.value
  }).sort((a, b) => a.airingAt - b.airingAt)
})

const airingNextItem = computed(() => {
  const upcoming = schedules.value
    .filter(item => item.timeUntilAiring > 0 && item.media?.status !== 'HIATUS')
    .sort((a, b) => a.airingAt - b.airingAt)
    
  return upcoming[0] || null
})

// Returns true only if it matches the single next global upcoming anime
const isNextAiring = (item) => {
  return airingNextItem.value && airingNextItem.value.id === item.id
}

// Get Dynamic covers for the top Hero Banner background
const heroCover1 = computed(() => {
  return filteredSchedules.value[0]?.media?.coverImage?.large || ''
})

const heroCover2 = computed(() => {
  return filteredSchedules.value[1]?.media?.coverImage?.large || ''
})

// --- Smooth Crossfading Background Buffers ---
const bgA = ref({ cover1: '', cover2: '', visible: false })
const bgB = ref({ cover1: '', cover2: '', visible: false })
const useBgA = ref(true)

watch(
  () => [heroCover1.value, heroCover2.value],
  ([newCover1, newCover2]) => {
    if (useBgA.value) {
      bgA.value.cover1 = newCover1
      bgA.value.cover2 = newCover2
      bgA.value.visible = true
      bgB.value.visible = false
    } else {
      bgB.value.cover1 = newCover1
      bgB.value.cover2 = newCover2
      bgB.value.visible = true
      bgA.value.visible = false
    }
    useBgA.value = !useBgA.value
  },
  { immediate: true }
)

const getMediaTitle = (media) => {
  return media.title.english || media.title.userPreferred || media.title.romaji
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

const getStatusText = (item) => {
  if (item.timeUntilAiring < 0) return 'Aired'
  if (isNextAiring(item)) return 'Airing Next'
  return 'Upcoming'
}
</script>