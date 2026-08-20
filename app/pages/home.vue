<template>
  <div style="padding-top:65px" class="-mt-16 text-white">
    <div v-if="error" class="px-4 py-16 text-center text-sm text-muted-foreground sm:px-6">
      Couldn't load the home feed. Please try again shortly.
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
          <template v-for="(anime, index) in heroSlides" :key="anime.id">
            <div
              aria-hidden="true"
              class="absolute inset-0 hidden bg-cover bg-center sm:block"
              :style="{
                backgroundImage: `url(${anime.bannerImage || anime.coverImage?.extraLarge})`,
                opacity: index === heroActive ? 1 : 0,
                transition: 'opacity 700ms ease-in-out',
              }"
            >
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
            </div>
            <div
              aria-hidden="true"
              class="absolute inset-0 bg-cover bg-top sm:hidden"
              :style="{
                backgroundImage: `url(${anime.coverImage?.extraLarge})`,
                opacity: index === heroActive ? 1 : 0,
                transition: 'opacity 700ms ease-in-out',
              }"
            >
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            </div>
          </template>

          <div class="absolute right-0 bottom-0 left-0 p-6 sm:p-10 lg:p-16">
            <div
              v-for="(anime, index) in heroSlides"
              :key="anime.id"
              :aria-hidden="index !== heroActive"
              class="absolute right-6 bottom-6 left-6 max-w-2xl text-center sm:right-10 sm:bottom-10 sm:left-10 sm:text-left lg:right-16 lg:bottom-16 lg:left-16"
              :style="{
                opacity: index === heroActive ? 1 : 0,
                transform: index === heroActive ? 'translateY(0px)' : 'translateY(12px)',
                transition: 'opacity 500ms ease-out 150ms, transform 500ms ease-out 150ms',
                pointerEvents: index === heroActive ? 'auto' : 'none',
              }"
            >
              <div class="mb-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  v-if="formatScore(anime.meanScore)"
                  class="rounded bg-black/80 px-2 py-1 text-sm font-semibold text-primary"
                >
                  ★ {{ formatScore(anime.meanScore) }}
                </span>
                <span
                  v-for="genre in anime.genres?.slice(0, 2)"
                  :key="genre"
                  class="rounded bg-black/80 px-2 py-1 text-sm font-semibold text-primary"
                >
                  {{ genre }}
                </span>
              </div>

              <!-- Title: prefer clear-logo art when available and it hasn't failed to load -->
              <h1
                v-if="!anime.logo || failedLogos.has(anime.id)"
                class="mb-4 line-clamp-1 text-2xl leading-tight font-bold text-white sm:text-4xl lg:text-5xl"
              >
                {{ getAnimeTitle(anime.title) }}
              </h1>
              <img
                v-else
                :src="anime.logo"
                :alt="getAnimeTitle(anime.title)"
                class="clearart-shadow mx-auto mb-4 h-24 w-auto max-w-full object-contain sm:mx-0 sm:h-28 lg:h-30"
                @error="onLogoError(anime.id)"
              >

              <p v-if="getAnimeDescription(anime.description)" class="mx-auto mb-4 line-clamp-3 max-w-xl text-sm text-gray-300 sm:mx-0 sm:text-base">
                {{ getAnimeDescription(anime.description) }}
              </p>

              <div class="mt-4 flex items-center justify-center gap-3 sm:justify-start sm:gap-4 lg:gap-6">
                <NuxtLink
                  :to="getHeroWatchLink(anime.id)"
                  class="group relative flex -skew-x-12 items-center justify-center overflow-hidden bg-primary px-5 py-2 transition-all duration-300 hover:scale-105 hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-primary/50 sm:px-8 sm:py-3"
                >
                  <div class="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center bg-black/20" />
                  <div class="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center bg-white/20" />
                  <div
                    class="pointer-events-none absolute inset-0 flex h-full w-full [transform:translateX(-150%)] justify-center group-hover:[transform:translateX(150%)] group-hover:duration-1000"
                  >
                    <div class="relative h-full w-12 bg-white/40 blur-[2px]" />
                  </div>
                  <div class="relative z-10 flex skew-x-12 items-center gap-2 text-xs font-black tracking-[0.2em] text-black uppercase sm:text-sm">
                    <svg
                      aria-hidden="true"
                      class="lucide-icon lucide lucide-play size-4 fill-current sm:size-5"
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
                      <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                    </svg>
                    <span>Watch Now</span>
                  </div>
                </NuxtLink>

                <NuxtLink
                  :to="`/anime/${anime.id}`"
                  class="group relative flex -skew-x-12 items-center justify-center overflow-hidden border border-white/20 bg-black/60 px-5 py-2 transition-all duration-300 hover:scale-105 hover:border-primary/80 hover:bg-black/80 sm:px-8 sm:py-3"
                >
                  <div class="absolute top-0 right-0 h-full w-1 bg-white/10 transition-colors group-hover:bg-primary/50" />
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <div class="relative z-10 flex skew-x-12 items-center gap-2 text-xs font-bold tracking-[0.2em] text-white uppercase sm:text-sm">
                    <svg
                      aria-hidden="true"
                      class="lucide-icon lucide lucide-info size-4 transition-transform group-hover:rotate-12 sm:size-5"
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
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
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
              v-for="(anime, index) in heroSlides"
              :key="anime.id"
              :aria-label="`Go to ${getAnimeTitle(anime.title)}`"
              class="h-1.5 rounded-full bg-white/30 transition-[width,background-color] duration-300 hover:bg-white/50"
              :class="index === heroActive ? 'w-8 !bg-primary' : 'w-2'"
              @click="heroActive = index"
            />
          </div>
        </div>
      </section>

      <!-- ================= Main content + sidebar ================= -->
      <div class="grid grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-12">
        <!-- ---- Left: Latest Episodes / Top Rated / Upcoming ---- -->
        <!-- ---- Left: Latest Episodes / Top Rated / Upcoming ---- -->
        <div class="space-y-8 lg:col-span-8 xl:col-span-9">
          <!-- Continue Watching Carousel Section -->
          <section v-if="continueWatchingList.length > 0" class="mb-8">
            <div class="mb-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="h-6 w-1 rounded-full bg-primary"></div>
                <h2 class="text-xl font-bold text-white sm:text-2xl">Continue Watching</h2>
              </div>
              <NuxtLink to="/continue-watching" class="text-sm font-medium text-gray-400 transition-colors hover:text-white">View all →</NuxtLink>
            </div>
            
            <div data-slot="carousel" class="relative -ml-4" role="region" aria-roledescription="carousel">
              <div data-slot="carousel-content" class="overflow-hidden">
                <div class="flex -ms-4 ml-0 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory" data-embla-container="">
                  
                  <div v-for="anime in continueWatchingList" :key="anime.id" data-slot="carousel-item" role="group" aria-roledescription="slide" class="min-w-0 shrink-0 grow-0 ps-4 basis-[48%] pl-4 sm:basis-[48%] md:basis-1/3 lg:basis-1/4 snap-start" data-embla-slide="">
                    <NuxtLink :to="continueLink(anime)" class="group/cw relative block select-none">
                      <div class="relative cursor-pointer">
                        <div class="relative aspect-video overflow-hidden rounded-md">
                          <img loading="lazy" decoding="async" :src="anime.coverImage?.large || anime.cover" class="h-full w-full transform object-cover transition-transform duration-300 group-hover/cw:scale-105 opacity-100" :alt="getAnimeTitle(anime.title)">
                          
                          <div class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover/cw:opacity-100">
                            <button class="rounded-full bg-white p-2 shadow-md hover:bg-gray-100" aria-label="Play">
                              <svg class="h-6 w-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                            </button>
                          </div>
                          
                          <div class="absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-sm text-white">{{ anime.type === 'manga' ? 'CH' : 'EP' }} {{ anime.ch || anime.currentEpisode || (anime.progress + 1) }}</div>
                          
                          <button type="button" @click.prevent="removeContinueWatching(anime)" class="absolute top-2 right-2 rounded-md bg-black/70 p-1.5 transition-all duration-300 hover:bg-white hover:text-black md:opacity-0 md:group-hover/cw:opacity-100" aria-label="Remove from continue watching">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-x h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                          </button>
                          
                          <div class="absolute right-0 bottom-0 left-0 h-1 bg-gray-600">
                            <div class="h-full bg-red-600 transition-[width] duration-500" :style="{ width: `${anime.progressPercentage}%` }"></div>
                          </div>
                          
                          <div class="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-1 text-sm text-white">{{ anime.timeString }}</div>
                        </div>
                        <h3 class="mt-2 truncate text-sm font-medium text-white">{{ getAnimeTitle(anime.title) }}</h3>
                      </div>
                    </NuxtLink>
                  </div>
                  
                </div>
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
                class="select-none grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 transition-opacity duration-500 opacity-100 c-1od2e67"
              >
                <div v-for="anime in pagedItems(section)" :key="anime.id" class="mb-6 c-1gx8udt">
                  <MediaCard
                    :media="anime"
                    :is-flipped="flippedId === anime.id"
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
          <!-- Top Trending -->
          <div class="hud-panel min-h-[500px] c-1asbupe">
            <span aria-hidden="true" class="hud-corner hud-corner-tl c-1asbupe" />
            <span aria-hidden="true" class="hud-corner hud-corner-br c-1asbupe" />
            <span aria-hidden="true" class="hud-vents c-1asbupe" />
            <div class="relative z-[1]">
              <div class="w-full">
                <div class="top-head c-nwnyka">
                  <h2 class="pb-3 text-xl font-bold tracking-tight text-white/90">Top Trending</h2>
                  <div class="flex">
                    <button
                      v-for="range in trendingRanges"
                      :key="range.key"
                      class="top-tab c-nwnyka"
                      :class="{ 'is-active': trendingRange === range.key }"
                      @click="trendingRange = range.key"
                    >
                      {{ range.label }}
                    </button>
                  </div>
                </div>

                <div class="space-y-3">
                  <div v-for="(anime, index) in trendingList" :key="anime.id">
                    <button
                      class="group relative h-[100px] w-full overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0a] text-left transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-2 hover:-translate-y-0.5 hover:border-white/20"
                      :style="{ '--hover-color': posterColors[anime.id] || 'var(--primary)' }"
                      @click="navigateTo(`/anime/${anime.id}`)"
                    >
                      <div
                        class="absolute inset-0 z-0 opacity-0 transition-opacity duration-[800ms] group-hover:opacity-100"
                        style="box-shadow: inset 40px 0 80px -40px var(--hover-color)"
                      />
                      <img
                        v-if="anime.bannerImage"
                        :src="anime.bannerImage"
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
                            {{ getAnimeTitle(anime.title) }}
                          </h3>
                          <div class="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                            <span
                              v-if="formatScore(anime.meanScore)"
                              class="flex items-center gap-1 text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]"
                            >
                              <svg class="h-3 w-3 fill-current" viewBox="0 0 20 20">
                                <path
                                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                />
                              </svg>
                              {{ formatScore(anime.meanScore) }}
                            </span>
                            <span v-if="anime.genres?.[0]" class="text-white/50 transition-colors group-hover:text-white/70">
                              {{ anime.genres[0] }}
                            </span>
                          </div>
                        </div>
                        <div
                          class="flex h-10 w-10 shrink-0 translate-x-4 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0 group-hover:bg-white/20 group-hover:opacity-100"
                        >
                          <svg class="h-5 w-5 translate-x-0.5 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>

                  <p v-if="!trendingList.length" class="py-6 text-center text-xs text-muted-foreground">Nothing trending yet.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Schedule -->
          <div class="hud-panel c-1asbupe">
            <span aria-hidden="true" class="hud-corner hud-corner-tl c-1asbupe" />
            <span aria-hidden="true" class="hud-corner hud-corner-br c-1asbupe" />
            <span aria-hidden="true" class="hud-vents c-1asbupe" />
            <div class="relative z-[1]">
              <div class="w-full text-white">
                <div class="sched-head mb-4 flex items-center justify-between pb-4 c-1146xe6">
                  <button
                    aria-label="Previous day"
                    class="bg-zinc-850 day-tile flex size-9 cursor-pointer items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-30 c-1146xe6"
                    :disabled="selectedDayOffset === 0"
                    @click="selectedDayOffset = Math.max(0, selectedDayOffset - 1)"
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

                  <div class="flex items-center gap-4">
                    <button
                      v-for="day in visibleScheduleDays"
                      :key="day.offset"
                      class="group flex cursor-pointer flex-col items-center gap-1.5 focus:outline-none"
                      @click="selectedDayOffset = day.offset"
                    >
                      <span
                        class="text-[10px] font-bold tracking-wider uppercase transition-colors"
                        :class="day.offset === selectedDayOffset ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'"
                      >
                        {{ day.weekday }}
                      </span>
                      <span
                        class="h-badge day-tile flex w-16 items-center justify-center text-sm font-black transition-all duration-200 c-1146xe6"
                        :class="day.offset === selectedDayOffset ? 'scale-105 bg-primary text-zinc-950' : 'bg-zinc-800 text-zinc-300 group-hover:bg-zinc-700'"
                      >
                        {{ day.date }}
                      </span>
                    </button>
                  </div>

                  <button
                    aria-label="Next day"
                    class="bg-zinc-850 day-tile flex size-9 cursor-pointer items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-30 c-1146xe6"
                    :disabled="selectedDayOffset === WEEK_LENGTH - 1"
                    @click="selectedDayOffset = Math.min(WEEK_LENGTH - 1, selectedDayOffset + 1)"
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

                <div class="relative min-h-[50px]">
                  <div class="space-y-2">
                    <template v-for="(item, i) in visibleDaySchedule" :key="item.id">
                      <div v-if="i === nowMarkerIndex" aria-hidden="true" class="relative z-20 h-0 w-full">
                        <div class="absolute top-0 left-20 z-30 -mt-[4px] -ml-[4px] size-2 rotate-45 bg-primary shadow-[0_0_12px] shadow-primary" />
                        <div class="absolute top-0 right-4 left-20 z-20 h-[1px] bg-gradient-to-r from-primary/80 to-transparent" />
                      </div>
                      <NuxtLink
                        :to="`/anime/${item.id}`"
                        class="group sched-row relative mx-2 flex h-[40px] items-center justify-between px-2 transition-all duration-300 c-1146xe6"
                      >
                        <div class="flex h-full min-w-0 flex-1 items-center gap-0">
                          <span
                            class="w-12 shrink-0 text-right font-mono text-[12.5px] font-medium transition-colors duration-300"
                            :class="isPastAiring(item.airingAt) ? 'text-zinc-600 group-hover:text-primary/80' : 'text-zinc-500 group-hover:text-primary'"
                          >
                            {{ formatAirTime(item.airingAt) }}
                          </span>
                          <div class="relative flex h-full w-8 shrink-0 items-center justify-center">
                            <div
                              class="absolute top-0 bottom-0 left-1/2 -ml-[0.5px] w-[1px]"
                              :class="isPastAiring(item.airingAt) ? 'bg-primary/40' : 'bg-white/10'"
                            />
                            <div
                              class="absolute top-1/2 left-1/2 -mt-[0.5px] -ml-[2.5px] z-10 h-[1px] w-[5px] shadow-primary transition-all duration-300 group-hover:-ml-[6px] group-hover:w-[12px] group-hover:bg-primary group-hover:shadow-[0_0_8px]"
                              :class="isPastAiring(item.airingAt) ? 'bg-primary/60' : 'bg-white/20'"
                            />
                          </div>
                          <span
                            class="truncate text-[13.5px] font-medium transition-all duration-300 group-hover:translate-x-1"
                            :class="isPastAiring(item.airingAt) ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-200 group-hover:text-white'"
                          >
                            {{ getAnimeTitle(item.title) }}
                          </span>
                        </div>
                        <div
                          class="ml-4 flex shrink-0 items-center gap-2 transition-opacity duration-300"
                          :class="isPastAiring(item.airingAt) && 'opacity-50 group-hover:opacity-100'"
                        >
                          <span
                            v-if="item.genres?.[0]"
                            class="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-zinc-400 uppercase transition-colors duration-300 group-hover:text-zinc-300"
                          >
                            {{ item.genres[0] }}
                          </span>
                          <div class="flex items-center gap-1.5 text-zinc-500 transition-colors duration-300 group-hover:text-primary">
                            <span class="font-mono text-[11px] font-medium">EP {{ item.episode }}</span>
                            <svg
                              class="size-3 -translate-x-2 fill-current opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </NuxtLink>
                    </template>

                    <p v-if="!selectedDaySchedule.length" class="py-6 text-center text-xs text-muted-foreground">
                      Nothing airing that day.
                    </p>
                  </div>
                </div>

                <div class="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <span class="font-mono text-xs text-zinc-500">{{ nowLabel }}</span>
                  <button
                    v-if="selectedDaySchedule.length > SCHEDULE_COLLAPSED_LIMIT"
                    class="flex cursor-pointer items-center gap-0.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase transition-colors hover:text-primary"
                    @click="scheduleExpanded = !scheduleExpanded"
                  >
                    <span>{{ scheduleExpanded ? 'Less' : 'More' }}</span>
                    <svg
                      aria-hidden="true"
                      class="lucide-icon lucide lucide-chevron-down size-3.5 transition-transform duration-300"
                      :class="scheduleExpanded && 'rotate-180'"
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
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
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
function getAnimeTitle(title) {
  if (typeof title === 'string') return title
  return title?.english || title?.userPreferred || title?.romaji || 'Untitled'
}
function formatScore(meanScore) {
  if (meanScore === null || meanScore === undefined) return null
  return (meanScore / 10).toFixed(1)
}
function getAnimeDescription(description) {
  if (!description) return ''
  // AniList descriptions can still carry stray <br>/<i> tags and
  // "(Source: ...)" notes even with asHtml:false — strip tags and
  // collapse whitespace so it reads cleanly in a plain <p>.
  return description
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function formatAirTime(unixSeconds) {
  if (!unixSeconds) return '--:--'
  return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
import { useAuth } from '~/composables/useAuth'
import { useAniListClient } from '~/composables/useAniListClient'

const { data, pending, error } = await useFetch('/api/home')
const { loggedIn, init: initAuth } = useAuth()
const { hydrateRemote } = useWatchlist()
const continueWatchingList = ref([])

onMounted(async () => {
  await initAuth()
  await hydrateRemote()

  // Build continue-watching from the shared watchlist entries store (already fetched above)
  const { getLocalData } = useProgressSync()
  const localData = getLocalData()
  const { entries } = useWatchlist()

  if (loggedIn.value) {
    continueWatchingList.value = Object.values(entries.value)
      .filter(e => e.watchlistStatus === 'watching')
      .map(e => {
        const total = e.totalEpisodes || 0
        const prog = e.progress || 0
        const saved = localData[String(e.id)]
        const currentEp = saved?.currentEpisode || (prog + 1)

        let percentage = total > 0 ? Math.min((prog / total) * 100, 100) : (prog > 0 ? 50 : 0)
        let timeString = '0:00'

        if (saved && saved.time >= 0) {
          const m = Math.floor(saved.time / 60)
          const s = Math.floor(saved.time % 60).toString().padStart(2, '0')
          timeString = `${m}:${s}`
          if (saved.duration > 0) {
            percentage = (saved.time / saved.duration) * 100
          }
        }

        return {
          ...e,
          progressPercentage: percentage,
          currentEpisode: currentEp,
          timeString,
          coverImage: { large: e.cover }
        }
      })
  }

  // Local progress: fallback for signed-out visitors and manga reading history
  const localEntries = Object.values(localData)
    .filter(item => item.type !== 'manga' && !loggedIn.value)
    .map(item => ({
      ...item,
      id: item.id,
      title: item.extraData?.title || 'Untitled',
      cover: item.extraData?.cover || '',
      coverImage: { large: item.extraData?.cover || '' },
      progressPercentage: item.type === 'manga' ? 100 : 0,
      timeString: item.type === 'manga' ? `Page ${item.pgno || 1}` : '0:00'
    }))
  const seen = new Set(continueWatchingList.value.map(item => `${item.type || 'anime'}:${item.id}`))
  continueWatchingList.value = [...continueWatchingList.value, ...localEntries.filter(item => !seen.has(`${item.type}:${item.id}`))]
})

function continueLink(item) {
  return item.type === 'manga'
    ? `/manga/${item.id}/${item.extraData?.chId || item.ch || item.progress || 1}`
    : `/anime/${item.id}/${item.currentEpisode || (item.progress + 1)}`
}

async function removeContinueWatching(item) {
  const { removeProgress } = useProgressSync()
  await removeProgress({ type: item.type || 'anime', id: item.id })
  continueWatchingList.value = continueWatchingList.value.filter(anime => !(anime.id === item.id && (anime.type || 'anime') === (item.type || 'anime')))
}

// removed handleAddToList

// ---------------------------------------------------------------------------
// Hero carousel (trending.day)
// ---------------------------------------------------------------------------
const heroSlides = computed(() => (data.value?.trending?.day ?? []).slice(0, 10))
const heroActive = ref(0)
const heroPaused = ref(false)
let heroTimer = null

// Anime ids whose `logo` image failed to load — those slides fall back to
// the plain text <h1> instead of showing a broken image.
const failedLogos = ref(new Set())
function onLogoError(id) {
  // Replace the Set so Vue's reactivity picks up the change.
  failedLogos.value = new Set(failedLogos.value).add(id)
}

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

const heroDragging = ref(false)
const HERO_DRAG_THRESHOLD = 60 // px before a drag counts as a swipe
let heroDragStartX = 0

function getHeroWatchLink(animeId) {
  const { getLocalData } = useProgressSync()
  const saved = getLocalData()[String(animeId)]
  
  let targetEp = 1
  if (saved) {
    if (saved.currentEpisode) {
      targetEp = saved.currentEpisode
    } else {
      targetEp = Math.max(1, saved.progress + 1)
    }
  }
  return `/anime/${animeId}/${targetEp}`
}
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
// Latest Episodes / Top Rated / Upcoming grids
// (same card markup reused via nested v-for so it's only written once)
// ---------------------------------------------------------------------------
const gridSections = computed(() => [
  { key: 'latestUpdates', title: 'Latest Episodes', items: data.value?.latestUpdates ?? [] },
  { key: 'topRated', title: 'Top Rated', items: data.value?.topRated ?? [] },
  { key: 'upcoming', title: 'Upcoming', items: data.value?.upcoming ?? [] }
])
const PAGE_SIZE = 12
const pages = reactive({ latestUpdates: 0, topRated: 0, upcoming: 0 })

function pageCount(section) {
  return Math.max(1, Math.ceil(section.items.length / PAGE_SIZE))
}
function pagedItems(section) {
  const { getLocalData } = useProgressSync()
  const localData = getLocalData()
  const start = pages[section.key] * PAGE_SIZE
  return section.items.slice(start, start + PAGE_SIZE).map(item => {
    // Merge watchlistStatus from local progress cache so card backs reflect real status
    const localEntry = localData[String(item.id)]
    const watchlistStatusMap = {
      'Watching': 'watching',
      'Planning': 'planning',
      'Completed': 'completed',
      'Paused': 'paused',
      'Dropped': 'dropped'
    }
    const rawStatus = localEntry?.status
    const watchlistStatus = rawStatus ? (watchlistStatusMap[rawStatus] || rawStatus.toLowerCase()) : undefined
    return {
      id: item.id,
      href: `/anime/${item.id}`,
      title: getAnimeTitle(item.title),
      cover: item.coverImage?.large,
      score: formatScore(item.meanScore),
      ageRating: item.genres?.[0], // using ageRating slot for genre on home
      format: item.genres?.slice(0, 2).join(' · ') || '—', // using format slot for secondary text
      totalEpisodes: item.episodes,
      nextAiringEpisode: item.nextAiringEpisode,
      status: item.status,
      watchlistStatus
    }
  })
}

const flippedId = ref(null)
function toggleFlip(id) {
  flippedId.value = flippedId.value === id ? null : id
}

// ---------------------------------------------------------------------------
// Top Trending sidebar (trending.day/week/month)
// ---------------------------------------------------------------------------
const trendingRanges = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]
const trendingRange = ref('day')
const trendingList = computed(() => data.value?.trending?.[trendingRange.value] ?? [])

// Per-item accent color sampled from each poster, so the row glow isn't
// always the theme's primary color. Cached by anime id so switching
// day/week/month tabs (or re-showing the same anime) doesn't re-sample.
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
    // server (via the immediate watcher below), so bail out there and let
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
  for (const anime of list) {
    if (!anime?.id || anime.id in posterColors) continue
    const source = anime.bannerImage || anime.coverImage?.large
    const color = await extractDominantColor(source)
    posterColors[anime.id] = color // null falls back to var(--primary) in the template
  }
}

watch(trendingList, (list) => ensurePosterColors(list), { immediate: true })

// ---------------------------------------------------------------------------
// Schedule sidebar — /api/home now returns a Monday-Sunday week of airing
// schedules, bucketed here into the viewer's local calendar days.
// ---------------------------------------------------------------------------
const sortedSchedule = computed(() => [...(data.value?.schedule ?? [])].sort((a, b) => a.airingAt - b.airingAt))

const WEEK_LENGTH = 7
const VISIBLE_DAY_TILES = 3
const SCHEDULE_COLLAPSED_LIMIT = 8

function mondayOf(date) {
  // getDay(): 0=Sun..6=Sat -> days since the most recent Monday
  const daysSinceMonday = (date.getDay() + 6) % 7
  const monday = new Date(date)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - daysSinceMonday)
  return monday
}

// The 7 real days of this Mon-Sun week, each with local start/end epoch
// boundaries used to bucket `sortedSchedule` below.
const weekStart = mondayOf(new Date())
const weekDays = computed(() => {
  return Array.from({ length: WEEK_LENGTH }, (_, offset) => {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + offset)
    const startSec = Math.floor(start.getTime() / 1000)
    return {
      offset,
      weekday: start.toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
      date: start.getDate(),
      startSec,
      endSec: startSec + 86400,
    }
  })
})

// Today's position within the Mon-Sun week (0=Mon..6=Sun) — used to default
// the selection and to know when the "now" marker belongs on screen.
const todayOffset = (new Date().getDay() + 6) % 7

// Selecting a day (by tile click or by arrow) drives everything else. The
// 3-tile header window auto-centers on the selection rather than being
// scrolled independently, and clamps at the week's edges.
const selectedDayOffset = ref(todayOffset)
const dayWindowStart = computed(() =>
  Math.min(Math.max(selectedDayOffset.value - 1, 0), WEEK_LENGTH - VISIBLE_DAY_TILES)
)
const visibleScheduleDays = computed(() =>
  weekDays.value.slice(dayWindowStart.value, dayWindowStart.value + VISIBLE_DAY_TILES)
)

const selectedDaySchedule = computed(() => {
  const day = weekDays.value[selectedDayOffset.value]
  if (!day) return []
  return sortedSchedule.value.filter((item) => item.airingAt >= day.startSec && item.airingAt < day.endSec)
})

const scheduleExpanded = ref(false)
const visibleDaySchedule = computed(() =>
  scheduleExpanded.value ? selectedDaySchedule.value : selectedDaySchedule.value.slice(0, SCHEDULE_COLLAPSED_LIMIT)
)
// Reset the expand toggle whenever the selected day changes.
watch(selectedDayOffset, () => {
  scheduleExpanded.value = false
})

function isPastAiring(airingAt) {
  return airingAt <= nowSec.value
}
// Index (within `visibleDaySchedule`) right before the first not-yet-aired
// item — only meaningful when today is the selected day.
const nowMarkerIndex = computed(() => {
  if (selectedDayOffset.value !== todayOffset) return -1
  const list = visibleDaySchedule.value
  const idx = list.findIndex((item) => item.airingAt > nowSec.value)
  return idx === -1 ? list.length : idx
})

const nowSec = ref(Math.floor(Date.now() / 1000))
const nowLabel = ref('')
function updateNowLabel() {
  const now = new Date()
  nowSec.value = Math.floor(now.getTime() / 1000)
  nowLabel.value = now.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
let clockTimer = null
onMounted(() => {
  updateNowLabel()
  clockTimer = setInterval(updateNowLabel, 1000)
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>