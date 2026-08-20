<script setup>
import { computed } from 'vue'
import { useWatchlist } from '~/composables/useWatchlist'
import { useAuth } from '~/composables/useAuth'

const props = defineProps({
  media: {
    type: Object,
    required: true
  },
  isFlipped: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleFlip'])

const { entries, setWatchlistStatus: apiSetWatchlistStatus, removeFromWatchlist, isUpdating } = useWatchlist()
const { loggedIn, openLoginModal } = useAuth()

// Read directly from global entries store for proper Vue reactivity tracking
const watchlistStatus = computed(() => {
  const id = props.media?.id
  if (!id) return null
  return entries.value[String(id)]?.watchlistStatus || null
})

function toggleFlip() {
  // If not signed in, prompt auth instead of flipping
  if (!loggedIn.value) {
    openLoginModal()
    return
  }
  emit('toggleFlip', props.media.id)
}

function closeFlip() {
  if (props.isFlipped) {
    emit('toggleFlip', null)
  }
}

async function updateWatchlistStatus(status) {
  // Ensure user is authenticated before modifying watchlist
  if (!loggedIn.value) {
    openLoginModal()
    return
  }
  try {
    if (
      watchlistStatus.value === status || 
      (watchlistStatus.value === 'reading' && status === 'watching')
    ) {
      await removeFromWatchlist(props.media)
    } else {
      await apiSetWatchlistStatus(props.media, status)
    }
    closeFlip()
  } catch (err) {
    // Error is handled by composable
  }
}

function statusDotClass(status) {
  switch (status) {
    case 'RELEASING': return 'bg-green-500'
    case 'NOT_YET_RELEASED': return 'bg-blue-500'
    case 'CANCELLED': return 'bg-red-500'
    default: return 'bg-zinc-500'
  }
}

// ---------------- title marquee on card hover ----------------
// State is stored on the DOM element to keep it per-instance
// (module-level vars would be shared across all cards).

function startTitleMarquee(e) {
  const root = e.currentTarget
  const staticEl = root.querySelector('.anime-title')
  const marqueeEl = root.querySelector('.anime-title-marquee')
  const textEl    = root.querySelector('.anime-title-text')
  if (!staticEl || !marqueeEl || !textEl) return

  const overflow = textEl.scrollWidth - staticEl.clientWidth
  if (overflow <= 0) return

  if (root._marqueeActive) return   // already running

  staticEl.style.opacity = '0'
  marqueeEl.style.opacity = '1'
  textEl.style.transform  = 'translateX(0)'

  root._marqueeActive = true

  const speed = 50
  const hold  = 0.6
  const dur   = Math.max(overflow / speed, 0.5)
  const ease  = 'cubic-bezier(0.65, 0, 0.35, 1)'

  textEl.style.transition = `transform ${dur}s ${ease}`

  async function loop() {
    if (!root._marqueeActive) return
    textEl.style.transform = `translateX(-${overflow}px)`
    await wait(root, dur * 1000)
    if (!root._marqueeActive) return
    await wait(root, hold * 1000)
    if (!root._marqueeActive) return
    textEl.style.transform = 'translateX(0)'
    await wait(root, dur * 1000)
    if (!root._marqueeActive) return
    await wait(root, hold * 1000)
    loop()
  }

  loop()
}

function wait(root, ms) {
  return new Promise(resolve => {
    const id = setTimeout(resolve, ms)
    if (!root._marqueeTimers) root._marqueeTimers = []
    root._marqueeTimers.push(id)
  })
}

function stopTitleMarquee(e) {
  const root     = e.currentTarget
  const staticEl = root.querySelector('.anime-title')
  const marqueeEl = root.querySelector('.anime-title-marquee')
  const textEl    = root.querySelector('.anime-title-text')

  root._marqueeActive = false
  ;(root._marqueeTimers || []).forEach(clearTimeout)
  root._marqueeTimers = []

  if (staticEl)  staticEl.style.opacity  = ''
  if (marqueeEl) marqueeEl.style.opacity = ''
  if (textEl) {
    textEl.style.transition = 'none'
    textEl.style.transform  = ''
    void textEl.offsetWidth
    textEl.style.transition = ''
  }
}
</script>

<template>
  <NuxtLink
    :to="media.href"
    class="group block hover:-translate-y-1 transition-transform duration-200 c-yufc76"
    style="perspective: 1000px;"
    @mouseenter="startTitleMarquee($event)"
    @mouseleave="stopTitleMarquee($event)"
  >
    <div class="flip-inner relative mb-3 aspect-[3/4] w-full transition-transform duration-500 c-yufc76" :style="{ transform: isFlipped ? 'rotateY(180deg)' : '' }">
      <!-- front -->
      <div class="flip-front absolute inset-0 overflow-hidden rounded-lg bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] c-yufc76">
        <img :alt="media.title" class="h-full w-full object-cover transition-opacity duration-300 opacity-100 c-yufc76" decoding="async" loading="lazy" :src="media.cover"/>

        <div v-if="!media.isManga" class="absolute top-1.5 right-1.5 z-30 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 c-yufc76">
          <button aria-label="Manage Watchlist" class="flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-all hover:bg-black/80 c-yufc76" @click.stop.prevent="toggleFlip">
            <svg aria-hidden="true" class="lucide-icon lucide lucide-plus size-4" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12h14"></path><path d="M12 5v14"></path>
            </svg>
          </button>
        </div>

        <span v-if="media.score || media.ageRating" class="rounded-4xl border py-0.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 absolute top-2 left-2 flex h-5 items-center gap-1 border-white/10 bg-black/80 px-1.5 text-[10px] font-medium text-white backdrop-blur-sm" data-slot="badge">
          <div v-if="media.score" class="flex items-center gap-1 c-yufc76" :class="{ 'border-r border-white/10 pr-1.5': media.ageRating }">
            <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-2.5 fill-amber-400 text-amber-400" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
            </svg>
            <span class="translate-y-[0.5px] leading-none tabular-nums c-yufc76">{{ media.score }}</span>
          </div>
          <span v-if="media.ageRating" class="translate-y-[0.5px] leading-none text-zinc-300 uppercase c-yufc76">{{ media.ageRating }}</span>
        </span>

        <div v-if="media.totalEpisodes || media.nextAiringEpisode" class="absolute bottom-1.5 left-1.5 flex transition-all c-yufc76">
          <span v-if="media.nextAiringEpisode" class="border py-0.5 flex h-5 items-center gap-1.5 rounded border-white/20 bg-black/90 px-1.5 text-[9px] font-medium text-white backdrop-blur-sm" data-slot="badge">
            <span class="translate-y-[1px] leading-none tabular-nums c-yufc76">EP {{ media.nextAiringEpisode.episode }}</span>
          </span>
          <span v-else-if="media.totalEpisodes" class="border py-0.5 flex h-5 items-center gap-1.5 rounded border-white/20 bg-black/90 px-1.5 text-[9px] font-medium text-white backdrop-blur-sm" data-slot="badge">
            <div class="flex items-center gap-1 c-yufc76" title="Subbed Episodes" v-if="media.subEpisodes !== undefined">
              <svg aria-hidden="true" class="lucide-icon lucide lucide-captions size-2.5 text-zinc-300" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <rect height="14" rx="2" ry="2" width="18" x="3" y="5"></rect><path d="M7 15h4M15 15h2M7 11h2M13 11h4"></path>
              </svg>
              <span class="translate-y-[1px] leading-none tabular-nums c-yufc76">{{ media.subEpisodes }}</span>
            </div>
            <span class="text-white/20 c-yufc76" v-if="media.subEpisodes !== undefined">/</span>
            <div class="flex items-center gap-1 c-yufc76" title="Dubbed Episodes" v-if="media.dubEpisodes !== undefined">
              <svg aria-hidden="true" class="lucide-icon lucide lucide-mic size-2.5 text-zinc-300" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 19v3"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><rect height="13" rx="3" width="6" x="9" y="2"></rect>
              </svg>
              <span class="translate-y-[1px] leading-none tabular-nums c-yufc76">{{ media.dubEpisodes }}</span>
            </div>
            <span class="text-white/20 c-yufc76" v-if="media.dubEpisodes !== undefined">/</span>
            <div class="flex items-center gap-1 c-yufc76" title="Total Episodes">
              <svg aria-hidden="true" class="lucide-icon lucide lucide-list-video size-2.5 text-zinc-300" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 5H3"></path><path d="M10 12H3"></path><path d="M10 19H3"></path><path d="M15 12.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z"></path>
              </svg>
              <span class="translate-y-[1px] leading-none tabular-nums c-yufc76">{{ media.totalEpisodes }}</span>
            </div>
          </span>
        </div>

        <div class="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100 c-yufc76">
          <div class="flex size-12 scale-80 items-center justify-center rounded-full bg-white/90 text-black transition-transform duration-200 group-hover:scale-100 c-yufc76">
            <svg aria-hidden="true" class="lucide-icon lucide lucide-play size-5 fill-current" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- back: add to list -->
      <div v-if="!media.isManga" class="flip-back pointer-events-auto absolute inset-0 overflow-hidden rounded-lg bg-[#0d0d0d] c-yufc76" :style="{ pointerEvents: isFlipped ? 'auto' : 'none' }">
        <div class="relative flex h-full flex-col c-yufc76">
          <div class="flex items-center justify-between px-3 pt-3 pb-2 c-yufc76">
            <span class="text-[9px] font-bold tracking-[0.15em] text-white/40 uppercase c-yufc76">Add to list</span>
            <button aria-label="Close" class="flex size-5 items-center justify-center rounded-full bg-white/8 text-white/50 transition-all hover:bg-white/15 hover:text-white c-yufc76" @click.stop.prevent="closeFlip">
              <svg class="size-2.5 c-yufc76" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>
          <div class="flex flex-1 flex-col gap-0.5 px-2 pb-3 c-yufc76" :class="{ 'opacity-50 pointer-events-none': isUpdating }">
            <button class="relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all c-yufc76" :class="watchlistStatus === 'watching' || watchlistStatus === 'reading' ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white/80'" @click.stop.prevent="updateWatchlistStatus('watching')">
              <svg aria-hidden="true" class="lucide-icon lucide lucide-play size-3 shrink-0 text-white/30" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
              </svg>
              <span class="flex-1 text-[11px] font-medium c-yufc76">{{ media.isManga ? 'Reading' : 'Watching' }}</span>
              <svg v-if="watchlistStatus === 'watching' || watchlistStatus === 'reading'" class="size-3 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/></svg>
            </button>
            <button class="relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all c-yufc76" :class="watchlistStatus === 'planning' ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white/80'" @click.stop.prevent="updateWatchlistStatus('planning')">
              <svg class="size-3 shrink-0 text-white/30 c-yufc76" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span class="flex-1 text-[11px] font-medium c-yufc76">Planning</span>
              <svg v-if="watchlistStatus === 'planning'" class="size-3 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/></svg>
            </button>
            <button class="relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all c-yufc76" :class="watchlistStatus === 'completed' ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white/80'" @click.stop.prevent="updateWatchlistStatus('completed')">
              <svg class="size-3 shrink-0 text-white/30 c-yufc76" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
              <span class="flex-1 text-[11px] font-medium c-yufc76">Completed</span>
              <svg v-if="watchlistStatus === 'completed'" class="size-3 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/></svg>
            </button>
            <button class="relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all c-yufc76" :class="watchlistStatus === 'paused' ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white/80'" @click.stop.prevent="updateWatchlistStatus('paused')">
              <svg class="size-3 shrink-0 text-white/30 c-yufc76" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect height="16" rx="1" width="4" x="14" y="4"></rect><rect height="16" rx="1" width="4" x="6" y="4"></rect>
              </svg>
              <span class="flex-1 text-[11px] font-medium c-yufc76">Paused</span>
              <svg v-if="watchlistStatus === 'paused'" class="size-3 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/></svg>
            </button>
            <button class="relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all c-yufc76" :class="watchlistStatus === 'dropped' ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white/80'" @click.stop.prevent="updateWatchlistStatus('dropped')">
              <svg class="size-3 shrink-0 text-white/30 c-yufc76" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
              </svg>
              <span class="flex-1 text-[11px] font-medium c-yufc76">Dropped</span>
              <svg v-if="watchlistStatus === 'dropped'" class="size-3 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="px-0.5 c-yufc76">
      <div class="flex items-center gap-2 c-yufc76">
        <span class="size-1.5 shrink-0 rounded-full c-yufc76" :class="statusDotClass(media.status)"></span>
        <div class="relative min-w-0 flex-1 overflow-hidden c-yufc76">
          <h3 class="anime-title py-1 text-[13px] font-medium whitespace-nowrap text-white truncate c-yufc76">{{ media.title }}</h3>
          <h3 aria-hidden="true" class="anime-title-marquee absolute inset-0 overflow-hidden py-1 text-[13px] font-medium whitespace-nowrap text-white opacity-0 c-yufc76"><span class="anime-title-text c-yufc76">{{ media.title }}</span></h3>
        </div>
      </div>
      <p class="mt-0.5 text-[11px] text-muted-foreground c-yufc76">{{ media.format }}<template v-if="media.duration">· {{ media.duration }}</template></p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.flip-inner {
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}
.flip-front,
.flip-back {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
.flip-front {
  transform: rotateY(0deg);
  -webkit-transform: rotateY(0deg);
  z-index: 2;
}
.flip-back {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
}

/* required for the marquee transform to actually take effect */
.anime-title-text {
  display: inline-block;
  will-change: transform;
}
</style>
