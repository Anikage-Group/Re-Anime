<template>
  <ClientOnly>
    <Transition name="mini-sidebar-slide">
      <div
        v-if="!isDockVisible"
        ref="miniDockRef"
        class="fixed left-0 z-40 hidden lg:flex flex-col items-start gap-0.5"
        :style="miniDockStyle"
      >
        <button
          @click="showDockAtDefault"
          class="flex h-20 w-8 items-center justify-center rounded-r-lg border-y border-r border-white/[0.08] bg-[#0a0a0a]/90 text-gray-400 shadow-lg backdrop-blur-3xl transition-all duration-500 ease-out hover:w-10 hover:bg-[#0a0a0a]/98 hover:text-white"
          title="Show dock"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <button
          @click="toggleScrollLock"
          class="flex h-8 w-8 items-center justify-center rounded-r-lg border-y border-r border-white/[0.08] bg-[#0a0a0a]/90 shadow-lg backdrop-blur-3xl transition-all duration-300 hover:w-10 hover:bg-[#0a0a0a]/98"
          :class="isScrollLockActive ? 'text-primary' : 'text-gray-400 hover:text-white'"
          :title="isScrollLockActive ? 'Unlock scroll visibility' : 'Lock dock visible'"
        >
          <component :is="isScrollLockActive ? IconLock : IconLockOpen" class="size-3.5" />
        </button>

        <NuxtLink
          :to="restatusUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex h-8 w-8 items-center justify-center rounded-r-lg border-y border-r border-white/[0.08] bg-[#0a0a0a]/90 text-gray-400 shadow-lg backdrop-blur-3xl transition-all duration-300 hover:w-10 hover:bg-[#0a0a0a]/98 hover:text-white"
          title="Status"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
          </svg>
        </NuxtLink>
      </div>
    </Transition>

    <Transition name="dock-slide">
      <aside
        v-if="isDockVisible"
        ref="dockRef"
        :style="dockStyle"
        class="fixed z-40 hidden lg:block select-none"
        :class="{'transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]': !isDragging}"
        @mousedown="initiateDrag"
      >
        <div
          role="toolbar"
          aria-label="Navigation dock"
          tabindex="-1"
          class="relative flex flex-col items-center gap-3 rounded-full border border-white/[0.08] bg-[#0a0a0a]/90 p-3 shadow-2xl backdrop-blur-3xl"
          :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
        >
          <div
            v-if="activeIndex !== -1"
            class="absolute left-3 top-3 z-0 h-[42px] w-[42px] rounded-full border border-white/5 bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            :style="{ transform: `translateY(${activeTranslateY}px)` }"
          >
            <div class="absolute top-1/2 -left-3 h-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]" />
          </div>

          <NuxtLink
            v-for="(item, index) in navItems"
            :key="item.title"
            :to="item.to"
            class="group relative z-10 flex size-[42px] items-center justify-center rounded-full transition-all duration-300"
            :class="activeIndex === index ? 'text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/90'"
            :title="item.title"
            @mousedown.stop
          >
            <div class="relative z-10 flex items-center justify-center" :style="counterRotationStyle">
              <component :is="item.icon" class="size-[20px] transition-transform duration-300 group-hover:scale-110" />
              <span
                v-if="item.badge"
                class="absolute -top-1.5 -right-2 z-20 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-none font-bold text-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
              >
                {{ item.badge }}
              </span>
            </div>
            <div
              class="pointer-events-none absolute left-full z-50 ml-4 rounded-lg border border-white/[0.08] bg-[#0a0a0a]/90 px-3 py-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-white opacity-0 shadow-2xl backdrop-blur-3xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 group-hover:opacity-100"
              :style="counterRotationStyle"
            >
              {{ item.title }}
            </div>
          </NuxtLink>

          <div class="h-px w-6 bg-white/[0.08]" />

          <NuxtLink
            to="/settings"
            class="group relative z-10 flex size-[42px] items-center justify-center rounded-full transition-all duration-300 hover:bg-white/10"
            :class="activeIndex === 4 ? 'text-white' : 'text-gray-400 hover:text-white'"
            title="Settings"
            @mousedown.stop
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-[18px]" :style="counterRotationStyle">
              <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </NuxtLink>

          <NuxtLink
            :to="restatusUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="group relative z-10 flex size-[42px] items-center justify-center rounded-full text-gray-400 transition-all duration-300 hover:bg-white/10 hover:text-white"
            title="Status"
            @mousedown.stop
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-[18px]" :style="counterRotationStyle">
              <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
            </svg>
          </NuxtLink>
          <div class="h-px w-6 bg-white/[0.08]" />
          <div v-if="!isDefaultLocation" class="h-px w-6 bg-white/[0.08]" />

          <div
            v-if="!isDefaultLocation"
            role="slider"
            aria-label="Rotate dock"
            :aria-valuenow="rotation"
            tabindex="0"
            class="flex size-11 items-center justify-center rounded-full text-gray-500 transition-colors duration-200 hover:text-primary cursor-pointer select-none"
            @mousedown.stop.prevent="initiateRotation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-[18px]" :style="counterRotationStyle">
              <circle cx="12" cy="9" r="1" />
              <circle cx="19" cy="9" r="1" />
              <circle cx="5" cy="9" r="1" />
              <circle cx="12" cy="15" r="1" />
              <circle cx="19" cy="15" r="1" />
              <circle cx="5" cy="15" r="1" />
            </svg>
          </div>

          <button
            v-if="!isDefaultLocation"
            @click="resetDock"
            class="group relative flex size-11 items-center justify-center rounded-lg text-gray-400 transition-all duration-300 hover:bg-white/10 hover:text-primary"
            title="Reset position"
            @mousedown.stop
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-[18px] transition-all duration-300 group-hover:scale-110" :style="counterRotationStyle">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          <button
            v-if="isDefaultLocation"
            @click="isDockVisible = false"
            class="group relative flex size-11 items-center justify-center rounded-lg text-gray-400 transition-all duration-300 hover:bg-white/10 hover:text-white"
            title="Hide dock"
            @mousedown.stop
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 transition-all duration-300 group-hover:scale-110" :style="counterRotationStyle">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>
      </aside>
    </Transition>
  </ClientOnly>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const restatusUrl = config.public.restatusUrl
import { ref, computed, h, onMounted, onUnmounted, nextTick } from 'vue'

// Lucide Icon structures
const IconHome = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' }), h('path', { d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' })])
const IconSearch = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'm21 21-4.34-4.34' }), h('circle', { cx: '11', cy: '11', r: '8' })])
const IconCalendar = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M8 2v4' }), h('path', { d: 'M16 2v4' }), h('rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }), h('path', { d: 'M3 10h18' })])
const IconBook = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'lucide lucide-library-big-icon lucide-library-big' }, [
  h('rect', { width: '8', height: '18', x: '3', y: '3', rx: '1' }),
  h('path', { d: 'M7 3v18' }),
  h('path', { d: 'M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z' })
]);
const IconLock = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('rect', { width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' }), h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })])
const IconLockOpen = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('rect', { width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' }), h('path', { d: 'M7 11V7a5 5 0 0 1 9.9-1' })])

const navItems = [
  { title: 'Home', icon: IconHome, to: '/home' },
  { title: 'Search', icon: IconSearch, to: '/search' },
  { title: 'Schedule', icon: IconCalendar, to: '/schedule' },
  { title: 'Manga', icon: IconBook, badge: null, to: '/manga' }
]

// Fetch Nuxt active path
const route = useRoute()

const isDockVisible = ref(false)
const rotation = ref(0)
const isScrollLockActive = ref(false)
const dockRef = ref<HTMLElement | null>(null)
const miniDockRef = ref<HTMLElement | null>(null)

const position = ref({ x: 0, y: 0 }) 
const isDragging = ref(false)
let dragStartOffset = { x: 0, y: 0 }
let lastScrollY = 0

const hasCustomPosition = ref(false)
const isDefaultLocation = computed(() => !hasCustomPosition.value)

// Dynamic detection of active index via route path (-1 if unmatched)
const activeIndex = computed(() => {
  const path = route.path
  if (path.startsWith('/home')) return 0
  if (path.startsWith('/search')) return 1
  if (path.startsWith('/schedule')) return 2
  if (path.startsWith('/manga')) return 3
  if (path.startsWith('/settings')) return 4
  return -1 // Returns fallback -1 to indicate an unlisted page
})

const getDockDimensions = () => {
  if (dockRef.value) {
    return {
      width: dockRef.value.offsetWidth,
      height: dockRef.value.offsetHeight
    }
  }
  return { width: 68, height: 370 } 
}

const clampPositionToViewport = (rawX: number, rawY: number) => {
  if (typeof window === 'undefined') return { x: rawX, y: rawY, snappedToDefault: false }

  const { width, height } = getDockDimensions()
  const maxOffScreenPercent = 0.60
  
  const minX = -(width * maxOffScreenPercent)
  const maxX = window.innerWidth - (width * (1 - maxOffScreenPercent))
  const minY = -(height * maxOffScreenPercent)
  const maxY = window.innerHeight - (height * (1 - maxOffScreenPercent))

  let finalX = Math.max(minX, Math.min(rawX, maxX))
  let finalY = Math.max(minY, Math.min(rawY, maxY))

  const defaultX = 16
  const defaultY = (window.innerHeight / 2) - (height / 2)

  let snappedToDefault = false
  if (Math.abs(finalX - defaultX) < 50 && Math.abs(finalY - defaultY) < 50) {
    finalX = defaultX
    finalY = defaultY
    snappedToDefault = true
  }

  return { x: finalX, y: finalY, snappedToDefault }
}

const calculateDefaultPosition = () => {
  if (typeof window === 'undefined') return
  const { height } = getDockDimensions()
  position.value = {
    x: 16, 
    y: (window.innerHeight / 2) - (height / 2) 
  }
}

// Fixed translation offsets to accommodate 1px separator + flex gap modifications
const activeTranslateY = computed(() => {
  if (activeIndex.value === -1) return 0
  if (activeIndex.value < 4) {
    return activeIndex.value * 54
  } else {
    // 4 steps of 54px + 13px offsets from grid-gap variations caused by separator
    return (activeIndex.value * 54) + 13
  }
})

const slideOffsetX = computed(() => {
  const { width } = getDockDimensions()
  return -(position.value.x + width + 40)
})

const dockStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  transform: `rotate(${rotation.value}deg)`,
  transformOrigin: 'center center',
  '--slide-offset-x': `${slideOffsetX.value}px`,
  '--dock-rotation': `${rotation.value}deg`
}))

const miniDockStyle = computed(() => {
  if (typeof window === 'undefined') return {}
  return { top: 'calc(50% - 89px)' }
})

const counterRotationStyle = computed(() => ({
  transform: `rotate(${-rotation.value}deg)`,
  transformOrigin: 'center center'
}))

const toggleScrollLock = () => { isScrollLockActive.value = !isScrollLockActive.value }

const resetDock = async () => {
  rotation.value = 0
  hasCustomPosition.value = false
  
  // Wait for the DOM to update so getDockDimensions() fetches correct, updated container height.
  await nextTick()
  calculateDefaultPosition()
}

const showDockAtDefault = async () => {
  rotation.value = 0
  hasCustomPosition.value = false
  
  await nextTick()
  calculateDefaultPosition()
  isDockVisible.value = true
}

const handleWindowScroll = () => {
  if (isScrollLockActive.value) return
  if (!isDefaultLocation.value) return

  const currentScrollY = window.scrollY
  
  if (currentScrollY > lastScrollY && currentScrollY > 50) {
    if (isDockVisible.value) {
      isDockVisible.value = false 
    }
  } else if (currentScrollY < lastScrollY) {
    if (!isDockVisible.value) {
      calculateDefaultPosition()
      nextTick(() => {
        isDockVisible.value = true 
      })
    }
  }
  
  lastScrollY = currentScrollY
}

const handleViewportResize = () => {
  if (hasCustomPosition.value) return
  calculateDefaultPosition()
}

const initiateDrag = (event: MouseEvent) => {
  isDragging.value = true
  hasCustomPosition.value = true
  dragStartOffset = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y
  }
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', terminateDrag)
}

const handleDrag = (event: MouseEvent) => {
  if (!isDragging.value) return
  const rawX = event.clientX - dragStartOffset.x
  const rawY = event.clientY - dragStartOffset.y
  
  const clamped = clampPositionToViewport(rawX, rawY)
  position.value.x = clamped.x
  position.value.y = clamped.y
  hasCustomPosition.value = !clamped.snappedToDefault
}

const terminateDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', terminateDrag)
}

const initiateRotation = (event: MouseEvent) => {
  if (!dockRef.value) return
  const rect = dockRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const getAngle = (clientX: number, clientY: number) => {
    return Math.atan2(clientY - centerY, clientX - centerX)
  }

  let lastAngle = getAngle(event.clientX, event.clientY)

  const onRotationMove = (moveEvent: MouseEvent) => {
    const currentAngle = getAngle(moveEvent.clientX, moveEvent.clientY)
    let deltaAngle = currentAngle - lastAngle

    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI

    rotation.value += deltaAngle * (180 / Math.PI)
    lastAngle = currentAngle
  }

  const onRotationEnd = () => {
    document.removeEventListener('mousemove', onRotationMove)
    document.removeEventListener('mouseup', onRotationEnd)
  }

  document.addEventListener('mousemove', onRotationMove)
  document.addEventListener('mouseup', onRotationEnd)
}

onMounted(() => {
  calculateDefaultPosition()
  isDockVisible.value = true

  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  window.addEventListener('resize', handleViewportResize)
  window.visualViewport?.addEventListener('resize', handleViewportResize)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleWindowScroll)
  window.removeEventListener('resize', handleViewportResize)
  window.visualViewport?.removeEventListener('resize', handleViewportResize)
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', terminateDrag)
})
</script>

<style scoped>
/* Main dynamic entry/exit slide animations */
.dock-slide-enter-active {
  transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease;
}
.dock-slide-leave-active {
  transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.7s ease;
}
.dock-slide-enter-from,
.dock-slide-leave-to {
  opacity: 1;
  transform: translate(var(--slide-offset-x, -120px), 0) rotate(var(--dock-rotation, 0deg)) !important;
}

/* Stable transitions for the mini sidebar (Pure Horizontal Alignment Only) */
.mini-sidebar-slide-enter-active {
  transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease;
}
.mini-sidebar-slide-leave-active {
  transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.7s ease;
}
.mini-sidebar-slide-enter-from,
.mini-sidebar-slide-leave-to {
  opacity: 1;
  transform: translateX(-100%) !important;
}
.mini-sidebar-slide-enter-to,
.mini-sidebar-slide-leave-from {
  opacity: 1;
  transform: translateX(0) !important;
}
</style>