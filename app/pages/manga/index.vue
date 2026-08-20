<template>
  <div style="padding-top:65px" class="-mt-16 text-white">
    <div v-if="error" class="px-4 py-16 text-center text-sm text-muted-foreground sm:px-6">
      Couldn't load the manga feed. Please try again shortly.
    </div>

    <template v-else>
      <!-- ================= Hero ================= -->
      <div v-if="pending" class="h-[70vh] w-full animate-pulse bg-zinc-900 sm:h-[60vh] lg:h-[70vh]" />
      <section v-else class="mb-8">
        <div
          aria-label="Hero carousel"
          class="relative h-[70vh] w-full overflow-hidden select-none sm:h-[60vh] lg:h-[70vh] cursor-grab touch-pan-y"
          :class="heroDragging && 'cursor-grabbing'"
          role="region"
          @mouseenter="heroPaused = true"
          @mouseleave="heroPaused = false"
          @pointerdown="onHeroDragStart"
          @pointermove="onHeroDragMove"
          @pointerup="onHeroDragEnd"
          @pointercancel="onHeroDragEnd"
          @pointerleave="onHeroDragEnd"
        >
          <template v-for="(manga, index) in heroSlides" :key="manga.id">
            <!-- Mobile: full-bleed cover, unchanged treatment -->
            <div
              aria-hidden="true"
              class="absolute inset-0 bg-cover bg-top sm:hidden"
              :style="{
                backgroundImage: `url(${getThumbnail(manga)})`,
                opacity: index === heroActive ? 1 : 0,
                transition: 'opacity 700ms ease-in-out',
              }"
            >
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            </div>

            <!-- Desktop / landscape: blurred cover backdrop + sharp poster on the right -->
            <div
              aria-hidden="true"
              class="absolute inset-0 hidden sm:block"
              :style="{
                opacity: index === heroActive ? 1 : 0,
                transition: 'opacity 700ms ease-in-out',
              }"
            >
              <div
                class="absolute inset-0 scale-110 bg-cover bg-center blur-3xl brightness-[0.5]"
                :style="{ backgroundImage: `url(${getThumbnail(manga)})` }"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
              <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/30 to-transparent" />

              <div class="absolute inset-0 hidden items-center justify-center sm:flex">
                <div class="relative">
                  <div
                    aria-hidden="true"
                    class="absolute -inset-6 rounded-full opacity-40 blur-3xl"
                    :style="{ backgroundColor: posterColors[manga.id] || 'var(--primary)' }"
                  />
                  <img
                    :src="getThumbnail(manga)"
                    :alt="getMangaTitle(manga.title)"
                    loading="lazy"
                    decoding="async"
                    class="relative aspect-[2/3] h-[320px] rounded-xl object-cover shadow-2xl ring-1 ring-white/10 sm:h-[400px] lg:h-[500px] xl:h-[560px]"
                  />
                </div>
              </div>
            </div>
          </template>

          <div class="absolute right-0 bottom-0 left-0 p-6 sm:p-10 lg:p-16">
            <div
              v-for="(manga, index) in heroSlides"
              :key="manga.id"
              :aria-hidden="index !== heroActive"
              class="absolute right-6 bottom-6 left-6 max-w-2xl text-center sm:right-10 sm:bottom-10 sm:left-10 sm:max-w-sm sm:text-left md:max-w-md lg:right-16 lg:bottom-16 lg:left-16 lg:max-w-xl"
              :style="{
                opacity: index === heroActive ? 1 : 0,
                transform: index === heroActive ? 'translateY(0px)' : 'translateY(12px)',
                transition: 'opacity 500ms ease-out 150ms, transform 500ms ease-out 150ms',
                pointerEvents: index === heroActive ? 'auto' : 'none',
              }"
            >
              <div class="mb-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  v-if="manga.type"
                  class="rounded bg-black/80 px-2 py-1 text-sm font-semibold text-primary uppercase"
                >
                  {{ manga.type }}
                </span>
                <span
                  v-if="manga.isAdult"
                  class="rounded bg-red-600/90 px-2 py-1 text-sm font-semibold text-white"
                >
                  18+
                </span>
              </div>

              <h1 class="mb-6 line-clamp-2 text-2xl leading-tight font-bold text-white sm:text-4xl lg:text-5xl">
                {{ getMangaTitle(manga.title) }}
              </h1>

              <div class="mt-4 flex flex-nowrap items-center justify-center gap-3 sm:justify-start sm:gap-4 lg:gap-6">
                <NuxtLink
                  :to="`/manga/${manga.slug}`"
                  class="group relative flex -skew-x-12 items-center justify-center overflow-hidden bg-primary px-5 py-2 transition-all duration-300 hover:scale-105 hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-primary/50 sm:px-8 sm:py-3"
                >
                  <div class="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center bg-black/20" />
                  <div class="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center bg-white/20" />
                  <div
                    class="pointer-events-none absolute inset-0 flex h-full w-full [transform:translateX(-150%)] justify-center group-hover:[transform:translateX(150%)] group-hover:duration-1000"
                  >
                    <div class="relative h-full w-12 bg-white/40 blur-[2px]" />
                  </div>
                  <div class="relative z-10 flex whitespace-nowrap skew-x-12 items-center gap-2 text-xs font-black tracking-[0.2em] text-black uppercase sm:text-sm">
                    <svg
                      aria-hidden="true"
                      class="lucide-icon lucide lucide-book-open size-4 sm:size-5"
                      fill="none"
                      height="24"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 7v14" />
                      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                    </svg>
                    <span>Read Now</span>
                  </div>
                </NuxtLink>

                <NuxtLink
                  :to="`/manga/${manga.slug}`"
                  class="group relative flex -skew-x-12 items-center justify-center overflow-hidden border border-white/20 bg-black/60 px-5 py-2 transition-all duration-300 hover:scale-105 hover:border-primary/80 hover:bg-black/80 sm:px-8 sm:py-3"
                >
                  <div class="absolute top-0 right-0 h-full w-1 bg-white/10 transition-colors group-hover:bg-primary/50" />
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <div class="relative z-10 flex whitespace-nowrap skew-x-12 items-center gap-2 text-xs font-bold tracking-[0.2em] text-white uppercase sm:text-sm">
                    <svg
                      aria-hidden="true"
                      class="lucide-icon lucide lucide-plus size-4 transition-transform group-hover:rotate-90 sm:size-5"
                      fill="none"
                      height="24"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                      width="24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                    <span>Details</span>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </div>

          <div class="absolute top-20 right-4 z-40 flex gap-2">
            <button
              aria-label="Previous slide"
              class="rounded border border-white/10 bg-black/60 p-2 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/80"
              @click="heroPrev"
            >
              <svg
                aria-hidden="true"
                class="lucide-icon lucide lucide-chevron-left size-5"
                fill="none"
                height="24"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              aria-label="Next slide"
              class="rounded border border-white/10 bg-black/60 p-2 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/80"
              @click="heroNext"
            >
              <svg
                aria-hidden="true"
                class="lucide-icon lucide lucide-chevron-right size-5"
                fill="none"
                height="24"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="absolute right-6 bottom-6 hidden items-center gap-2 sm:right-10 sm:bottom-10 sm:flex">
            <button
              v-for="(manga, index) in heroSlides"
              :key="manga.id"
              :aria-label="`Go to ${getMangaTitle(manga.title)}`"
              class="h-1.5 rounded-full bg-white/30 transition-[width,background-color] duration-300 hover:bg-white/50"
              :class="index === heroActive ? 'w-8 !bg-primary' : 'w-2'"
              @click="heroActive = index"
            />
          </div>
        </div>
      </section>

      <!-- ================= Main content + sidebar ================= -->
      <div class="grid grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-12">
        <!-- ---- Left: Hot Updates / Recently Updated / Top Rated / Popular / Recently Added ---- -->
        <div class="space-y-8 lg:col-span-8 xl:col-span-9">
          <!-- Continue Reading Section -->
          <section v-if="continueReadingManga.length > 0">
            <div class="mb-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="h-6 w-1 rounded-full bg-primary" />
                <h2 class="relative inline-flex items-center text-xl font-bold text-white sm:text-2xl">
                  Continue Reading
                </h2>
              </div>
              <NuxtLink to="/continue-reading" class="text-sm font-medium text-gray-400 transition-colors hover:text-white">View all →</NuxtLink>
            </div>
              <div class="flex -ms-4 ml-0 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4">
                <div v-for="item in continueReadingManga" :key="item.id" data-slot="carousel-item" role="group" aria-roledescription="slide" class="min-w-0 shrink-0 grow-0 ps-4 basis-[48%] pl-4 sm:basis-[48%] md:basis-1/3 lg:basis-1/4 snap-start" data-embla-slide="">
                  <NuxtLink :to="item.href" class="group/cw relative block select-none">
                    <div class="relative cursor-pointer">
                      <div class="relative aspect-video overflow-hidden rounded-md">
                        <img loading="lazy" decoding="async" :src="item.cover" class="h-full w-full transform object-cover transition-transform duration-300 group-hover/cw:scale-105 opacity-100" :alt="item.title">
                        
                        <div class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover/cw:opacity-100">
                          <button class="rounded-full bg-white p-2 shadow-md hover:bg-gray-100" aria-label="Read">
                            <svg class="h-6 w-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                          </button>
                        </div>
                        
                        <div class="absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-sm text-white">{{ item.ageRating }}</div>
                        
                        <button type="button" @click.prevent="removeContinueReading(item)" class="absolute top-2 right-2 rounded-md bg-black/70 p-1.5 transition-all duration-300 hover:bg-white hover:text-black md:opacity-0 md:group-hover/cw:opacity-100" aria-label="Remove from continue reading">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-x h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                        </button>
                        
                        <div class="absolute right-0 bottom-0 left-0 h-1 bg-gray-600">
                          <div class="h-full bg-red-600 transition-[width] duration-500" :style="{ width: `${item.progressPercentage}%` }"></div>
                        </div>
                        
                        <div class="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-1 text-sm text-white">{{ item.timeString }}</div>
                      </div>
                      <h3 class="mt-2 truncate text-sm font-medium text-white">{{ item.title }}</h3>
                    </div>
                  </NuxtLink>
                </div>
              </div>
          </section>

          <section v-for="section in gridSections" :key="section.key">
            <div class="mb-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="h-6 w-1 rounded-full bg-primary" />
                <h2 class="relative inline-flex items-center text-xl font-bold text-white sm:text-2xl">
                  {{ section.title }}
                </h2>
              </div>
              <div class="flex items-center gap-1">
                <button
                  aria-label="Previous"
                  class="flex size-7 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/40 disabled:pointer-events-none disabled:opacity-30"
                  :disabled="pages[section.key] === 0"
                  @click="pages[section.key]--"
                >
                  <svg
                    aria-hidden="true"
                    class="lucide-icon lucide lucide-chevron-left size-4"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  aria-label="Next"
                  class="flex size-7 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white/40 disabled:pointer-events-none disabled:opacity-30"
                  :disabled="pages[section.key] >= pageCount(section) - 1"
                  @click="pages[section.key]++"
                >
                  <svg
                    aria-hidden="true"
                    class="lucide-icon lucide lucide-chevron-right size-4"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="relative">
              <div
                class="grid select-none grid-cols-2 gap-4 opacity-100 transition-opacity duration-500 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6"
              >
                <div v-for="item in pagedItems(section)" :key="item.id" class="mb-6 c-1gx8udt">
                  <MediaCard
                    :media="item"
                    :is-flipped="flippedId === item.id"
                    @toggle-flip="toggleFlip"
                  />
                </div>
              </div>

              <p v-if="!section.items.length" class="py-10 text-center text-sm text-muted-foreground">
                Nothing to show right now.
              </p>
            </div>
          </section>
        </div>

        <!-- ---- Right: sidebar ---- -->
        <div class="hidden space-y-6 md:col-span-4 md:block xl:col-span-3">
          <!-- Most Bookmarked -->
          <div class="hud-panel min-h-[500px] c-1asbupe">
            <span aria-hidden="true" class="hud-corner hud-corner-tl c-1asbupe" />
            <span aria-hidden="true" class="hud-corner hud-corner-br c-1asbupe" />
            <span aria-hidden="true" class="hud-vents c-1asbupe" />
            <div class="relative z-[1]">
              <div class="w-full">
                <div class="top-head c-nwnyka">
                  <h2 class="pb-3 text-xl font-bold tracking-tight text-white/90">Most Bookmarked</h2>
                </div>

                <div class="space-y-3">
                  <div v-for="(manga, index) in mostBookmarkedList" :key="manga.id">
                    <button
                      class="group relative h-[100px] w-full overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0a] text-left transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-2 hover:-translate-y-0.5 hover:border-white/20"
                      :style="{ '--hover-color': posterColors[manga.id] || 'var(--primary)' }"
                      @click="navigateTo(`/manga/${manga.slug}`)"
                    >
                      <div
                        class="absolute inset-0 z-0 opacity-0 transition-opacity duration-[800ms] group-hover:opacity-100"
                        style="box-shadow: inset 40px 0 80px -40px var(--hover-color)"
                      />
                      <img
                        v-if="manga.cover || getThumbnail(manga)"
                        :src="getThumbnail(manga)"
                        alt=""
                        class="absolute inset-0 z-0 h-full w-full object-cover opacity-20 mix-blend-screen grayscale-[0.8] transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:opacity-70 group-hover:grayscale-0"
                      />
                      <div class="absolute inset-0 z-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent" />
                      <div class="absolute inset-0 z-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                      <div
                        class="absolute top-0 bottom-0 left-0 z-10 w-1.5 bg-[var(--hover-color)] opacity-0 shadow-[0_0_20px_var(--hover-color)] transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100"
                      />
                      <div class="relative z-10 flex h-full items-center px-4">
                        <div class="relative flex w-12 shrink-0 items-center justify-center">
                          <span
                            class="absolute top-1/2 -left-3 -translate-y-1/2 text-[80px] leading-none font-black italic opacity-10 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:-translate-y-1/2 group-hover:scale-[1.15] group-hover:opacity-30"
                            style="color: transparent; -webkit-text-stroke: 2px var(--hover-color)"
                          >{{ index + 1 }}</span>
                          <span
                            class="relative z-10 text-3xl font-black text-white italic drop-shadow-md transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:scale-[1.15] group-hover:text-[var(--hover-color)]"
                          >{{ index + 1 }}</span>
                        </div>
                        <div class="ml-5 flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                          <h3
                            class="line-clamp-1 text-[15px] font-bold text-white/90 drop-shadow-sm transition-colors duration-300 group-hover:text-white"
                          >
                            {{ getMangaTitle(manga.title) }}
                          </h3>
                          <div class="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                            <span
                              v-if="manga.type"
                              class="text-white/50 uppercase transition-colors group-hover:text-white/70"
                            >
                              {{ manga.type }}
                            </span>
                            <span
                              v-if="manga.isAdult"
                              class="rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] font-bold text-white"
                            >
                              18+
                            </span>
                          </div>
                        </div>
                        <div
                          class="flex h-10 w-10 shrink-0 translate-x-4 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0 group-hover:bg-white/20 group-hover:opacity-100"
                        >
                          <svg
                            aria-hidden="true"
                            class="lucide-icon lucide lucide-book-open h-5 w-5"
                            fill="none"
                            height="24"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            viewBox="0 0 24 24"
                            width="24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M12 7v14" />
                            <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>

                  <p v-if="!mostBookmarkedList.length" class="py-6 text-center text-xs text-muted-foreground">
                    Nothing bookmarked yet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="h-8" />
    </template>
  </div>
</template>

<script setup>
// ---------------------------------------------------------------------------
// Formatting helpers (kept local since this is a single-file component)
// ---------------------------------------------------------------------------
function getMangaTitle(title) {
  if (typeof title === 'string') return title
  return title?.english || title?.userPreferred || title?.romaji || 'Untitled'
}

const config = useRuntimeConfig()

// ---------------------------------------------------------------------------
// Data — pulled straight from the manga-vault home endpoint. useFetch runs
// this server-side during SSR (no CORS issue there) and hydrates the client
// from the same payload, so no separate API proxy route is needed here.
// ---------------------------------------------------------------------------
const API_URL = `${config.public.mangaVaultApiBase}/atsu/home`
const { data: response, pending, error } = await useFetch(API_URL)
const homeData = computed(() => response.value?.data)

function handleAddToList(mangaId) {
  // Hook this up to a real bookmarks/library endpoint once one exists —
  // the home feed doesn't return bookmark state, so this is just a stub.
  console.log('add to list', mangaId)
}

// ---------------------------------------------------------------------------
// Hero carousel (trending_carousel, capped at 10 slides)
// ---------------------------------------------------------------------------
const HERO_LIMIT = 10
const heroSlides = computed(() => (homeData.value?.trending_carousel?.items ?? []).slice(0, HERO_LIMIT))
const heroActive = ref(0)
const heroPaused = ref(false)
let heroTimer = null

function heroNext() {
  if (!heroSlides.value.length) return
  heroActive.value = (heroActive.value + 1) % heroSlides.value.length
}
function heroPrev() {
  if (!heroSlides.value.length) return
  heroActive.value = (heroActive.value - 1 + heroSlides.value.length) % heroSlides.value.length
}

onMounted(() => {
  heroTimer = setInterval(() => {
    if (!heroPaused.value) heroNext()
  }, 6000)
})
onBeforeUnmount(() => {
  if (heroTimer) clearInterval(heroTimer)
})

// drag-to-navigate (mouse + touch, via the Pointer Events API)
const heroDragging = ref(false)
const HERO_DRAG_THRESHOLD = 60 // px before a drag counts as a swipe
let heroDragStartX = 0
let heroDragMoved = false

function onHeroDragStart(evt) {
  // Don't start drag-tracking on top of a button/link — let its own click
  // behave normally instead of being swallowed by the drag gesture.
  if (evt.target?.closest?.('a, button')) return
  heroDragging.value = true
  heroDragMoved = false
  heroDragStartX = evt.clientX
  heroPaused.value = true
}
function onHeroDragMove(evt) {
  if (!heroDragging.value) return
  if (Math.abs(evt.clientX - heroDragStartX) > 5) heroDragMoved = true
}
function onHeroDragEnd(evt) {
  if (!heroDragging.value) return
  const delta = evt.clientX - heroDragStartX
  if (heroDragMoved && Math.abs(delta) > HERO_DRAG_THRESHOLD) {
    if (delta < 0) heroNext()
    else heroPrev()
  }
  heroDragging.value = false
  heroPaused.value = false
}

// ---------------------------------------------------------------------------
// Grid sections — Hot Updates / Recently Updated / Top Rated / Popular /
// Recently Added, each paginated client-side (same card markup reused via
// nested v-for so it's only written once).
// ---------------------------------------------------------------------------
const GRID_SECTION_KEYS = [
  { key: 'hot_updates', fallbackTitle: 'Hot Updates' },
  { key: 'recently_updated', fallbackTitle: 'Recently Updated' },
  { key: 'top_rated', fallbackTitle: 'Top Rated' },
  { key: 'popular', fallbackTitle: 'Popular' },
  { key: 'recently_added', fallbackTitle: 'Recently Added' },
]
const gridSections = computed(() =>
  GRID_SECTION_KEYS.map(({ key, fallbackTitle }) => ({
    key,
    title: homeData.value?.[key]?.title || fallbackTitle,
    items: homeData.value?.[key]?.items ?? [],
  }))
)
const PAGE_SIZE = 12
const pages = reactive({
  hot_updates: 0,
  recently_updated: 0,
  top_rated: 0,
  popular: 0,
  recently_added: 0,
})

function pageCount(section) {
  return Math.max(1, Math.ceil(section.items.length / PAGE_SIZE))
}
function pagedItems(section) {
  const start = pages[section.key] * PAGE_SIZE
  return section.items.slice(start, start + PAGE_SIZE).map(item => ({
    id: item.id,
    href: `/manga/${item.slug || item.id}`,
    title: getMangaTitle(item.title),
    cover: getThumbnail(item),
    ageRating: item.type,
    format: item.isAdult ? '18+' : undefined,
    type: 'MANGA',
    isManga: true,
    isAdult: item.isAdult
  }))
}

const flippedId = ref(null)
function toggleFlip(id) {
  flippedId.value = flippedId.value === id ? null : id
}

// ---------------------------------------------------------------------------
// Continue Reading (Local Data)
// ---------------------------------------------------------------------------
const continueReadingManga = ref([])

onMounted(() => {
  const { getLocalData } = useProgressSync()
  const localData = getLocalData()
  
  const localEntries = Object.values(localData).map(item => ({
    id: item.id,
    title: item.extraData?.title || 'Unknown',
    cover: item.extraData?.cover || '',
    progress: item.progress || 0,
    chId: item.extraData?.chId || item.ch,
    pgno: item.pgno || item.extraData?.pgno || 1,
    updatedAt: Math.floor(item.updatedAt / 1000) || 0,
    type: item.type,
    slug: item.id
  }))

  const mergedEntries = localEntries
    .filter(entry => entry.type === 'manga')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4)

  continueReadingManga.value = mergedEntries.map(entry => {
    return {
      ...entry,
      id: entry.id,
      href: `/manga/${entry.id}/${entry.chId || entry.progress}`,
      title: getMangaTitle(entry.title),
      cover: getThumbnail(entry),
      ageRating: `Ch. ${entry.progress}`,
      type: 'MANGA',
      isManga: true,
      timeString: `Page ${entry.pgno}`,
      progressPercentage: 100
    }
  })
})

async function removeContinueReading(item) {
  const { removeProgress } = useProgressSync()
  await removeProgress({ type: 'manga', id: item.id })
  continueReadingManga.value = continueReadingManga.value.filter(m => m.id !== item.id)
}

// ---------------------------------------------------------------------------
// Most Bookmarked sidebar list
// ---------------------------------------------------------------------------
const mostBookmarkedList = computed(() => (homeData.value?.most_bookmarked?.items ?? []).slice(0, 10))

// Per-item accent color sampled from each cover, so the row/poster glow
// isn't always the theme's primary color. Cached by manga id so switching
// sections (or re-showing the same title) doesn't re-sample.
const posterColors = reactive({})

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = ((g - b) / d) % 6
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l }
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

function extractDominantColor(imageUrl) {
  return new Promise((resolve) => {
    // Image/canvas are browser-only — this also runs during setup() on the
    // server (via the immediate watchers below), so bail out there and let
    // the client-side re-run do the real extraction after hydration.
    if (!imageUrl || !import.meta.client) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        const { data: pixels } = ctx.getImageData(0, 0, size, size)

        // Quantize into coarse buckets (16 levels/channel). The panel
        // background is black, so dark pixels would produce a glow that
        // barely shows up — filter those out harder than near-white ones.
        const buckets = new Map()
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]
          if (a < 200) continue

          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const lightness = (max + min) / 2
          if (lightness > 250 || lightness < 90) continue

          const key = `${r >> 4}-${g >> 4}-${b >> 4}`
          const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 }
          bucket.r += r
          bucket.g += g
          bucket.b += b
          bucket.count += 1
          buckets.set(key, bucket)
        }

        // Score every bucket by population, saturation, *and* how close it
        // is to a light-but-still-colorful tone (targeting ~0.72 lightness
        // rather than mid-gray) — the goal is a bright, visible glow, not
        // just "vibrant" in the abstract.
        let best = null
        let bestScore = -1
        for (const bucket of buckets.values()) {
          if (bucket.count < 3) continue
          const r = bucket.r / bucket.count
          const g = bucket.g / bucket.count
          const b = bucket.b / bucket.count
          const { s, l } = rgbToHsl(r, g, b)
          const lightnessWeight = Math.max(0.15, 1 - Math.abs(l - 0.72) * 1.6)
          const score = bucket.count * Math.pow(s, 1.4) * lightnessWeight
          if (score > bestScore) {
            bestScore = score
            best = { r, g, b }
          }
        }

        if (!best) {
          resolve(null)
          return
        }

        // Push the winning color into a bright, saturated range so it
        // glows clearly against the black panel rather than disappearing
        // into it.
        const hsl = rgbToHsl(best.r, best.g, best.b)
        const vibrant = hslToRgb(
          hsl.h,
          Math.min(1, hsl.s * 1.15 + 0.2),
          Math.min(0.82, Math.max(0.62, hsl.l))
        )
        resolve(`rgb(${vibrant.r}, ${vibrant.g}, ${vibrant.b})`)
      } catch {
        // Canvas got CORS-tainted or something else went wrong — fall
        // back to the theme color rather than breaking the row.
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = imageUrl
  })
}

async function ensurePosterColors(list) {
  for (const manga of list) {
    if (!manga?.id || manga.id in posterColors) continue
    const coverUrl = getThumbnail(manga)
    const color = await extractDominantColor(coverUrl)
    posterColors[manga.id] = color // null falls back to var(--primary) in the template
  }
}

// ---------------------------------------------------------------------------
// Thumbnail resolution via search (matching item ID)
// ---------------------------------------------------------------------------
const thumbnailMap = reactive({})

function getThumbnail(item) {
  if (!item) return ''
  let raw = ''
  if (item.id && thumbnailMap[item.id]) {
    raw = thumbnailMap[item.id]
  } else if (item.cover) {
    raw = item.cover
  }
  if (!raw) return ''
  
  if (raw.includes('/posters/') && !raw.includes('/static/posters/')) {
    raw = raw.replace('/posters/', '/static/posters/')
  }
  if (raw.includes('/banners/') && !raw.includes('/static/banners/')) {
    raw = raw.replace('/banners/', '/static/banners/')
  }

  if (raw.startsWith(config.public.proxyApiBase)) return raw
  
  if (raw.startsWith('/')) {
    raw = 'https://cdn.atsu.moe' + raw
  } else if (raw.startsWith('https://atsu.moe/')) {
    raw = raw.replace('https://atsu.moe/', 'https://cdn.atsu.moe/')
  }
  
  return `${config.public.proxyApiBase}/proxy?url=${encodeURIComponent(raw)}&ref=https://www.atsu.moe`
}

async function fetchThumbnailForManga(item) {
  if (!item || !item.id) return
  const title = getMangaTitle(item.title)
  if (!title) return
  try {
    const res = await fetch(`${config.public.mangaVaultApiBase}/atsu/search?keyword=${encodeURIComponent(title)}`)
    if (!res.ok) return
    const json = await res.json()
    const match = json?.data?.items?.find(i => i.id === item.id || i.slug === item.slug || i.id === item.slug)
    if (match?.cover) {
      thumbnailMap[item.id] = match.cover
      const color = await extractDominantColor(match.cover)
      if (color) posterColors[item.id] = color
    }
  } catch (e) {
    // network or search failure, getThumbnail fallback handles replace('/posters/', '/static/posters/')
  }
}

async function resolveAllThumbnails() {
  if (!homeData.value) return
  const allItems = [
    ...(homeData.value.trending_carousel?.items ?? []),
    ...(homeData.value.most_bookmarked?.items ?? []),
    ...(homeData.value.hot_updates?.items ?? []),
    ...(homeData.value.recently_updated?.items ?? []),
    ...(homeData.value.top_rated?.items ?? []),
    ...(homeData.value.popular?.items ?? []),
    ...(homeData.value.recently_added?.items ?? []),
  ]

  const uniqueMap = new Map()
  for (const item of allItems) {
    if (item?.id && !uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item)
    }
  }

  const itemsToFetch = Array.from(uniqueMap.values())
  const batchSize = 5
  for (let i = 0; i < itemsToFetch.length; i += batchSize) {
    const batch = itemsToFetch.slice(i, i + batchSize)
    await Promise.all(batch.map(item => fetchThumbnailForManga(item)))
  }
}

watch(homeData, () => {
  if (homeData.value) {
    resolveAllThumbnails()
  }
}, { immediate: true })

watch(heroSlides, (list) => ensurePosterColors(list), { immediate: true })
watch(mostBookmarkedList, (list) => ensurePosterColors(list), { immediate: true })
</script>
