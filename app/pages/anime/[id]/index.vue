<template>
  <main class="flex-1 pt-16 pb-0 c-1fpe2v8">
    <Transition name="slide-fade" appear>
      <!-- Page waits naturally for resolved anime data; global progress bar operates in background -->
      <div v-if="anime" class="relative -mt-16 flex min-h-screen w-full flex-col items-center gap-5 px-4 pt-16 md:px-12">
        
        <!-- Banner Background -->
        <div class="animate-fade-in absolute top-0 left-0 w-full c-1ndqx91">
          <div class="absolute inset-0 z-10 h-[280px] w-full bg-gradient-to-t from-black from-10% to-transparent"></div> 
          <img 
            :alt="anime.title.english" 
            class="absolute top-0 left-0 z-0 h-[250px] w-screen object-cover blur-[2px] brightness-[80%]" 
            :src="anime.bannerImage"
          />
        </div> 

        <!-- Content Body -->
        <div class="z-30 flex w-full flex-col gap-5 duration-700 lg:max-w-screen-xl lg:px-0 xl:max-w-screen-2xl">
          <div class="mt-[60px] flex w-full flex-col gap-6 md:mt-[120px] md:flex-row md:items-stretch">
            
            <!-- Left Sidebar -->
            <div class="animate-fade-in-up flex flex-col gap-6 md:w-[250px] md:flex-shrink-0 c-1ndqx91" style="animation-delay: 100ms;">
              <div class="flex flex-shrink-0 justify-center md:block">
                <img 
                  class="h-[350px] w-[250px] rounded-lg object-cover shadow-lg" 
                  :src="anime.coverImage.extraLarge" 
                  :alt="anime.title.english"
                />
              </div> 
              
              <!-- Sidebar Info -->
              <div class="hidden flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-white shadow md:block">
                <div class="flex h-max flex-col gap-4 select-none">
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Type</p> 
                    <span class="text-sm text-gray-300">{{ anime.format || '?' }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Episodes</p> 
                    <span class="text-sm text-gray-300">{{ anime.episodes ?? '?' }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Duration</p> 
                    <span class="text-sm text-gray-300">{{ anime.duration ? anime.duration + ' min' : '?' }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Status</p> 
                    <span class="text-sm text-gray-300">{{ anime.status || '?' }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Start Date</p> 
                    <span class="text-sm text-gray-300">{{ formatDate(anime.startDate) }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Season</p> 
                    <span class="text-sm text-gray-300 capitalize">{{ anime.season ? anime.season.toLowerCase() : '?' }} {{ anime.startDate && anime.startDate.year ? anime.startDate.year : '?' }}</span>
                  </div> 
                </div>
              </div>
            </div> 

            <!-- Right content -->
            <div class="mt-4 flex min-w-0 flex-grow flex-col gap-6 md:mt-0">
              <div class="animate-fade-in-up relative z-10 flex flex-col gap-4 c-1ndqx91" style="animation-delay: 200ms;">
                
                <!-- Titles -->
                <div class="flex flex-col gap-2">
                  <h1 class="text-center text-lg font-bold text-white md:text-left md:text-2xl">
                    {{ anime.title.english || '?' }}
                  </h1> 
                  <h2 class="mx-auto w-3/4 text-center text-sm font-bold italic md:w-full md:text-left md:text-lg" style="color: var(--primary);">
                    {{ anime.title.romaji || '?' }}
                  </h2>
                </div> 

                <!-- Description Section -->
                <div class="relative">
                  <!-- Fade + button only render when the text actually overflows 3 lines -->
                  <div 
                    v-if="!isExpanded && showReadMoreButton"
                    class="absolute top-0 z-30 flex h-full w-full items-end justify-center bg-gradient-to-b from-transparent to-black to-95% transition-all duration-1500 ease-[cubic-bezier(0.25,1,0.5,1)] opacity-100 c-1ndqx91"
                  >
                    <button @click="isExpanded = true" type="button" class="w-full py-1 text-center font-bold text-gray-200">Read More</button>
                  </div>
                  
                  <div v-else-if="isExpanded && showReadMoreButton" class="absolute bottom-0 z-30 flex w-full justify-center c-1ndqx91">
                    <button @click="isExpanded = false" type="button" class="w-full py-1 text-center font-bold text-gray-200">Show Less</button>
                  </div>

                  <div 
                    class="relative overflow-hidden transition-all duration-1500 ease-[cubic-bezier(0.25,1,0.5,1)] description-wrapper grid"
                    :class="(isExpanded || !showReadMoreButton) ? 'grid-rows-[1fr] max-h-[2000px] pb-8' : 'grid-rows-[160px] max-h-[160px]'"
                  >
                    <div class="pb-1 min-h-0">
                      <p 
                        ref="descriptionRef"
                        class="mx-2 text-center text-sm leading-6 font-light text-white md:mx-0 md:text-start md:text-base description-clamped"
                        :class="{ 'clamped': showReadMoreButton && !isExpanded }"
                        v-html="anime.description"
                      ></p>
                    </div>
                  </div>
                </div>

                <!-- Genre Tags -->
                <div class="flex flex-wrap justify-center gap-2 md:justify-start">
                  <a 
                    v-for="genre in anime.genres" 
                    :key="genre"
                    class="genre-tag rounded-full px-2 py-2 text-sm transition-all c-13qhxpu" 
                    :href="'/search?genre=' + genre"
                  >
                    {{ genre }}
                  </a>
                </div>

                <!-- Actions -->
                <div class="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <a 
                    class="inline-flex h-9 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow transition-all" 
                    style="background: var(--primary); color: black;" 
                    @click.prevent="handleWatch"
                    href="#"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" style="fill: black;">
                      <path d="M8 5v14l11-7z"></path>
                    </svg> 
                    Watch Now
                  </a>

                  <!-- Add / Edit List Dropdown -->
                  <WatchlistDropdown :media="anime" variant="default" />

                  <!-- Share Link -->
                  <button 
                    @click="openShareDialog"
                    class="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                      <polyline points="16,6 12,2 8,6"></polyline>
                      <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg> 
                    Share
                  </button> 
                </div> 

                <!-- Badges / Tags -->
                <div class="flex flex-wrap justify-center gap-2 md:justify-start">
                  <div class="badge-tag rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-xs font-medium text-white">
                    {{ anime.format || '?' }}
                  </div>
                  <div class="badge-tag rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-xs font-medium text-white">
                    {{ anime.episodes != null ? anime.episodes + ' episodes' : '? episodes' }}
                  </div>
                  <div class="badge-tag rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-xs font-medium text-white">
                    {{ anime.duration ? anime.duration + ' min' : '?' }}
                  </div>
                  <div class="badge-tag rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-xs font-medium text-white">
                    {{ anime.status || '?' }}
                  </div>
                  <div class="badge-tag rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-xs font-medium capitalize text-white">
                    {{ anime.season ? anime.season.toLowerCase() : '?' }} {{ anime.startDate && anime.startDate.year ? anime.startDate.year : '?' }}
                  </div>
                </div>

              </div> 

              <!-- Mobile Metadata Details -->
              <div class="animate-fade-in-up w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-white shadow md:hidden c-1ndqx91" style="animation-delay: 300ms;">
                <div role="region" aria-label="Anime information" class="flex gap-x-6 overflow-x-hidden pb-2 select-none md:pb-0" style="cursor: grab;">
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Type</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ anime.format || '?' }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Episodes</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ anime.episodes ?? '?' }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Duration</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ anime.duration ? anime.duration + ' min' : '?' }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Status</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ anime.status || '?' }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Start Date</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ formatDate(anime.startDate) }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Season</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300 capitalize">{{ anime.season ? anime.season.toLowerCase() : '?' }} {{ anime.startDate && anime.startDate.year ? anime.startDate.year : '?' }}</span>
                  </div> 
                </div>
              </div> 

              <!-- Metadata Subcards -->
              <div class="animate-fade-in-up w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow c-1ndqx91" style="animation-delay: 400ms;">
                
                <!-- Alternative Titles -->
                <div class="mb-6">
                  <h2 class="mb-2 text-lg font-semibold text-white">Alternative Titles</h2> 
                  <div class="flex flex-wrap gap-2">
                    <span 
                      v-if="anime.title.native" 
                      class="rounded bg-zinc-800/50 px-2 py-1 text-sm text-gray-400"
                    >
                      {{ anime.title.native }}
                    </span>
                    <span 
                      v-for="synonym in anime.synonyms" 
                      :key="synonym" 
                      class="rounded bg-zinc-800/50 px-2 py-1 text-sm text-gray-400"
                    >
                      {{ synonym }}
                    </span>
                  </div>
                </div>

                <!-- Studios -->
                <div class="mb-6">
                  <h2 class="mb-2 text-lg font-semibold text-white">Studios</h2> 
                  <div class="flex flex-wrap gap-2">
                    <a 
                      v-for="studio in anime.studios.edges" 
                      :key="studio.node.id"
                      class="rounded bg-zinc-800/50 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-zinc-700/50 hover:text-white" 
                      :href="'/search?studio=' + encodeURIComponent(studio.node.name)"
                    >
                      {{ studio.node.name || '?' }}
                    </a>
                  </div>
                </div>

                <!-- Stats Grid -->
                <div class="mb-6">
                  <h2 class="mb-2 text-lg font-semibold text-white">Stats</h2> 
                  <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div class="flex flex-col items-center rounded-lg bg-zinc-800/50 p-3">
                      <span class="text-xs text-gray-400">Episodes</span> 
                      <span class="text-xl font-bold text-white">{{ anime.episodes ?? '?' }}</span>
                    </div> 
                    <div class="flex flex-col items-center rounded-lg bg-zinc-800/50 p-3">
                      <span class="text-xs text-gray-400">Duration</span> 
                      <span class="text-xl font-bold text-white">{{ anime.duration != null ? anime.duration + 'm' : '?' }}</span>
                    </div> 
                    <div class="flex flex-col items-center rounded-lg bg-zinc-800/50 p-3">
                      <span class="text-xs text-gray-400">Status</span> 
                      <span class="text-xl font-bold text-white">{{ anime.status || '?' }}</span>
                    </div> 
                    <div class="flex flex-col items-center rounded-lg bg-zinc-800/50 p-3">
                      <span class="text-xs text-gray-400">Type</span> 
                      <span class="text-xl font-bold text-white">{{ anime.format || '?' }}</span>
                    </div>
                  </div>
                </div> 

                <!-- Related Entries Carousel -->
                <div class="mt-6 border-t border-zinc-800/80 pt-6" v-if="anime.relations && anime.relations.edges && anime.relations.edges.length">
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mr-2 h-5 w-5 text-primary" fill="currentColor">
                        <path fill="none" d="M0 0h24v24H0z"></path>
                        <path d="M21 3H3c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2H3V5h18v8h2V5a2 2 0 0 0-2-2zm-8 7V7h-2v3H8v2h3v3h2v-3h3v-2h-3zm11 8-4.5 4.5L18 21l3-3-3-3 1.5-1.5L24 18z"></path>
                      </svg> 
                      <h3 class="text-sm font-semibold tracking-wider text-white uppercase">RELATED SEASONS &amp; SERIES</h3>
                    </div> 
                    <span class="text-xs font-semibold text-zinc-500">{{ anime.relations.edges.length }} ENTRIES</span>
                  </div> 

                  <div class="relative w-full">
                    <div class="relative group/carousel w-full" role="region" aria-roledescription="carousel">
                      <div class="overflow-hidden">
                        <div 
                          ref="carouselTrackRef"
                          @scroll="onCarouselScroll"
                          class="carousel-track flex -ms-4 overflow-x-auto scroll-smooth"
                        >
                          <div 
                            v-for="(relation, itemIndex) in anime.relations.edges" 
                            :key="relation.node.id"
                            :ref="el => setItemRef(el, itemIndex)"
                            role="group" 
                            aria-roledescription="slide"
                            class="min-w-0 grow-0 ps-4 w-[186px] shrink-0 basis-auto pl-4"
                          >
                            <a 
                              :href="'/anime/' + relation.node.id" 
                              class="group relative flex h-[80px] w-full items-center justify-center overflow-hidden rounded-[10px] transition-all duration-300 hover:scale-[1.02] focus:z-10 focus:scale-[1.02] focus:ring-2 focus:ring-primary focus:outline-none border"
                              :class="relation.node.id === anime.id 
                                ? 'active-season-card pointer-events-none cursor-default border-2' 
                                : 'cursor-pointer border-zinc-800/80'"
                              :style="relation.node.id === anime.id 
                                ? 'border-color: var(--primary); box-shadow: 0 0 20px color-mix(in oklch, var(--primary) 20%, transparent);' 
                                : ''"
                            >
                              <div class="absolute inset-0 z-0">
                                <img 
                                  loading="lazy" 
                                  :src="relation.node.coverImage.medium || relation.node.coverImage.large" 
                                  :alt="relation.node.title.english || relation.node.title.romaji" 
                                  class="h-full w-full object-cover blur-[2px] brightness-[0.45] transition-all duration-300 group-hover:brightness-[0.55]"
                                />
                              </div> 
                              <div style="background-image: radial-gradient(circle, #ffffff33 1.2px, transparent 1.2px); background-size: 6px 6px;" class="pointer-events-none absolute inset-0 z-10 opacity-40 transition-opacity duration-300 group-hover:opacity-50"></div> 
                              
                              <div class="relative z-20 w-full max-w-full overflow-hidden px-3 text-center transition-opacity duration-300 opacity-100">
                                <span class="block truncate text-[9px] font-bold tracking-widest text-primary drop-shadow-lg" style="text-shadow: 0 1px 3px rgba(0,0,0,0.9);">
                                  {{ relation.relationType || '?' }}
                                </span> 
                                <h4 class="mt-0.5 line-clamp-1 text-xs font-semibold tracking-wide text-zinc-100 drop-shadow-lg transition-colors duration-300 group-hover:text-white" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                                  {{ relation.node.title.english || relation.node.title.romaji || '?' }}
                                </h4> 
                                <div class="mt-0.5 flex items-center justify-center gap-1.5 text-[9px] font-medium text-zinc-400" style="text-shadow: 0 1px 2px rgba(0,0,0,0.9);">
                                  <span>{{ relation.node.format || '?' }}</span>
                                  <span>•</span>
                                  <span>{{ relation.node.seasonYear || (relation.node.startDate && relation.node.startDate.year) || '?' }}</span>
                                </div>
                              </div>
                            </a>
                          </div>
                        </div>
                      </div>

                      <!-- Previous Button -->
                      <button 
                        @click="scrollPrev"
                        :disabled="!canScrollPrev"
                        type="button"
                        class="focus-visible:border-ring focus-visible:ring-ring/50 size-7 touch-manipulation -start-12 absolute top-1/2 left-2 z-30 hidden h-9 w-9 -translate-y-1/2 transform-gpu [-webkit-backface-visibility:hidden] [backface-visibility:hidden] will-change-transform items-center justify-center rounded-full border border-zinc-800/40 bg-zinc-950/20 text-zinc-300 opacity-0 shadow-lg backdrop-blur-3xl transition-all group-hover/carousel:opacity-100 hover:bg-zinc-900/40 hover:text-white md:flex disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span :class="{ 'animate-bounce-down': arrowBounce.prev }" class="inline-flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-chevron-left">
                            <path d="m15 18-6-6 6-6"></path>
                          </svg>
                          <span class="sr-only">Previous slide</span>
                        </span>
                      </button> 

                      <!-- Next Button -->
                      <button 
                        @click="scrollNext"
                        :disabled="!canScrollNext"
                        type="button"
                        class="focus-visible:border-ring focus-visible:ring-ring/50 size-7 touch-manipulation -end-12 absolute top-1/2 right-2 z-30 hidden h-9 w-9 -translate-y-1/2 transform-gpu [-webkit-backface-visibility:hidden] [backface-visibility:hidden] will-change-transform items-center justify-center rounded-full border border-zinc-800/40 bg-zinc-950/20 text-zinc-300 opacity-0 shadow-lg backdrop-blur-3xl transition-all group-hover/carousel:opacity-100 hover:bg-zinc-900/40 hover:text-white md:flex disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span :class="{ 'animate-bounce-down': arrowBounce.next }" class="inline-flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-chevron-right">
                            <path d="m9 18 6-6-6-6"></path>
                          </svg>
                          <span class="sr-only">Next slide</span>
                        </span>
                      </button>
                    </div>
                  </div> 

                  <!-- Dots - one per card position -->
                  <div 
                    v-if="totalDots > 0 && dotsFit" 
                    ref="dotsContainerRef"
                    class="mt-4 flex justify-center gap-2"
                  >
                    <button 
                      v-for="(_, index) in totalDots" 
                      :key="index"
                      @click="scrollToCardIndex(index)"
                      type="button"
                      :aria-label="'Scroll to card ' + (index + 1)"
                      class="h-1.5 rounded-full transition-all duration-300"
                      :class="currentCardIndex === index ? 'w-6 bg-primary' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'"
                    ></button>
                  </div>
                </div>

              </div>

            </div> 
          </div>
        </div>
      </div>
    </Transition>

    <!-- Share Dialog -->
    <Teleport to="body">
      <Transition 
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="shareDialogOpen" 
          class="fixed inset-0 z-[10001] bg-black/70 backdrop-blur-xl"
          @click="closeShareDialog"
        ></div>
      </Transition>

      <Transition 
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div 
          v-if="shareDialogOpen"
          class="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-[10002] grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg overflow-hidden border border-white/[0.08] bg-[#0a0a0a] p-0 text-white shadow-2xl shadow-black/60 sm:max-w-[420px]"
          role="dialog" 
          aria-modal="true"
          tabindex="-1"
        >
          <div class="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div> 
          <div class="relative overflow-hidden px-7 pt-7 pb-5">
            <div class="pointer-events-none absolute -top-10 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"></div> 
            <div class="relative">
              <div class="sr-only">
                <div class="flex flex-col gap-2 text-center sm:text-start">
                  <div class="text-lg leading-none font-semibold" role="heading" aria-level="2">Share Anime</div> 
                  <div class="text-sm text-muted-foreground">Share this anime with your friends.</div>
                </div>
              </div> 
              <div class="text-2xl font-black tracking-tight text-white">Share Anime</div> 
              <p class="mt-1 line-clamp-1 text-sm text-gray-500">Share "{{ anime?.title?.english || anime?.title?.romaji || '?' }}" with your friends.</p>
            </div>
          </div> 

          <div class="px-7 pb-7">
            <div class="mb-6 grid grid-cols-4 gap-3">
              <button 
                @click="shareToX"
                type="button"
                class="group relative flex h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/50"
              >
                <div class="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top, rgba(255,255,255,0.05) 0%, transparent 60%);"></div> 
                <div class="relative z-10 flex flex-col items-center gap-2 text-gray-400 transition-colors duration-300 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="size-6 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                  </svg> 
                  <span class="text-[10px] font-semibold tracking-wider text-gray-500 uppercase transition-colors duration-300 group-hover:text-gray-300">X</span>
                </div>
              </button> 

              <button 
                @click="shareToFacebook"
                type="button"
                class="group relative flex h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/50"
              >
                <div class="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top, rgba(24,119,242,0.15) 0%, transparent 60%);"></div> 
                <div class="relative z-10 flex flex-col items-center gap-2 text-gray-400 transition-colors duration-300 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="size-6 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(24,119,242,0.6)]">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                  </svg> 
                  <span class="text-[10px] font-semibold tracking-wider text-gray-500 uppercase transition-colors duration-300 group-hover:text-gray-300">Facebook</span>
                </div>
              </button> 

              <button 
                @click="shareToWhatsApp"
                type="button"
                class="group relative flex h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/50"
              >
                <div class="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top, rgba(37,211,102,0.15) 0%, transparent 60%);"></div> 
                <div class="relative z-10 flex flex-col items-center gap-2 text-gray-400 transition-colors duration-300 group-hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-message-circle size-6 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(37,211,102,0.6)]">
                    <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path>
                  </svg> 
                  <span class="text-[10px] font-semibold tracking-wider text-gray-500 uppercase transition-colors duration-300 group-hover:text-gray-300">WhatsApp</span>
                </div>
              </button> 

              <button 
                @click="shareToTelegram"
                type="button"
                class="group relative flex h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/50"
              >
                <div class="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top, rgba(0,136,204,0.15) 0%, transparent 60%);"></div> 
                <div class="relative z-10 flex flex-col items-center gap-2 text-gray-400 transition-colors duration-300 group-hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-send size-6 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(0,136,204,0.6)]">
                    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
                    <path d="m21.854 2.147-10.94 10.939"></path>
                  </svg> 
                  <span class="text-[10px] font-semibold tracking-wider text-gray-500 uppercase transition-colors duration-300 group-hover:text-gray-300">Telegram</span>
                </div>
              </button>
            </div> 

            <div class="flex flex-col gap-1.5">
              <label for="share-link" class="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">Copy Link</label> 
              <div class="flex items-center gap-2">
                <input 
                  class="flex w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs ring-offset-background outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 h-11 border-white/[0.08] bg-white/[0.04] text-gray-300 transition-colors focus-visible:border-primary/60 focus-visible:ring-0" 
                  type="text" 
                  id="share-link" 
                  :value="shareUrl"
                  readonly
                /> 
                <button 
                  @click="copyShareLink"
                  type="button"
                  title="Copy to clipboard" 
                  class="flex h-11 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] px-4 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-white/[0.15] hover:bg-white/[0.08] hover:shadow-lg active:scale-95 text-gray-400 hover:text-white"
                >
                  <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-copy size-5 transition-transform duration-300 group-hover:scale-110">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-check size-5 text-primary">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div> 

          <button 
            @click="closeShareDialog"
            type="button"
            class="absolute end-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-x">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg> 
            <span class="sr-only">Close</span>
          </button>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const animeId = ref(route.params.id)

const anime = ref(null)
const error = ref(null)
const isExpanded = ref(false)

const descriptionRef = ref(null)
const showReadMoreButton = ref(false)

const checkDescriptionOverflow = () => {
  nextTick(() => {
    const el = descriptionRef.value
    if (!el) return

    const clone = el.cloneNode(true)
    clone.classList.remove('clamped')
    clone.style.position = 'absolute'
    clone.style.visibility = 'hidden'
    clone.style.pointerEvents = 'none'
    clone.style.height = 'auto'
    clone.style.maxHeight = 'none'
    clone.style.webkitLineClamp = 'unset'
    clone.style.width = `${el.clientWidth}px`
    document.body.appendChild(clone)
    const fullHeight = clone.scrollHeight
    document.body.removeChild(clone)

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24
    const fourLineHeight = lineHeight * 4

    showReadMoreButton.value = fullHeight > fourLineHeight + 1
  })
}

const carouselTrackRef = ref(null)
const dotsContainerRef = ref(null)
const itemRefs = ref([])
const currentCardIndex = ref(0)
const totalDots = ref(0)
const visibleCardsPerStep = ref(1)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)
const dotsFit = ref(true)
let carouselResizeObserver = null

const setItemRef = (el, idx) => {
  if (el) itemRefs.value[idx] = el
}

// Gap between cards (matches the ps-4 / -ms-4 spacing in the template)
const CARD_GAP = 16
const FALLBACK_CARD_WIDTH = 186 // matches w-[186px]

// Measure the real per-card scroll step from the DOM instead of trusting
// a hardcoded constant — this is what was causing the dot-count mismatch.
const getCardStep = () => {
  const firstItem = itemRefs.value[0]
  if (firstItem) return firstItem.getBoundingClientRect().width + CARD_GAP
  return FALLBACK_CARD_WIDTH + CARD_GAP
}

// Calculate how many cards fit in the viewport, and how many dots we need
const calculateVisibleCards = () => {
  const track = carouselTrackRef.value
  if (!track) return

  const cardWidth = getCardStep()
  const containerWidth = track.clientWidth
  const totalCards = itemRefs.value.length
  const maxScroll = Math.max(0, track.scrollWidth - containerWidth)

  const visible = Math.max(1, Math.floor(containerWidth / cardWidth))
  visibleCardsPerStep.value = visible

  // Base the dot count on the actual scrollable distance (maxScroll), not on
  // "totalCards - visible + 1". That formula assumes scrollWidth is exactly
  // totalCards * cardWidth, but the track's -ms-4 offsets the first card's
  // ps-4 gutter, so scrollWidth ends up one gutter short — the old formula
  // produced a dot for a scroll position that was never actually reachable,
  // which is the "extra" dot you were seeing.
  totalDots.value = totalCards <= visible
    ? 0
    : Math.round(maxScroll / cardWidth) + 1

  checkDotsFit()
}

const checkDotsFit = () => {
  nextTick(() => {
    const container = dotsContainerRef.value
    if (!container) {
      dotsFit.value = true
      return
    }
    
    const parentWidth = container.parentElement?.clientWidth || 0
    const totalDotsWidth = totalDots.value * 14 - 8
    dotsFit.value = totalDotsWidth <= parentWidth
  })
}

const updateScrollState = () => {
  const track = carouselTrackRef.value
  if (!track) return
  const maxScroll = track.scrollWidth - track.clientWidth
  canScrollPrev.value = track.scrollLeft > 4
  canScrollNext.value = track.scrollLeft < maxScroll - 4
}

const onCarouselScroll = () => {
  updateScrollState()

  const track = carouselTrackRef.value
  if (!track) return

  const cardWidth = getCardStep()
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
  const currentScroll = track.scrollLeft

  // Snap to the last dot once we're within a couple px of the true max
  // scroll — the final step is usually shorter than a full card width, so
  // rounding alone would land one dot short and never light up the last one.
  if (currentScroll >= maxScroll - 2) {
    currentCardIndex.value = Math.max(0, totalDots.value - 1)
  } else {
    currentCardIndex.value = Math.min(
      Math.round(currentScroll / cardWidth),
      Math.max(0, totalDots.value - 1)
    )
  }
}

const scrollToCardIndex = (cardIndex) => {
  const track = carouselTrackRef.value
  if (!track) return

  const cardWidth = getCardStep()
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
  const scrollPosition = Math.min(cardIndex * cardWidth, maxScroll)

  track.scrollTo({ 
    left: scrollPosition, 
    behavior: 'smooth' 
  })

  currentCardIndex.value = Math.min(cardIndex, Math.max(0, totalDots.value - 1))
}

const arrowBounce = ref({ prev: false, next: false })
const triggerArrowBounce = (key) => {
  arrowBounce.value[key] = false
  nextTick(() => {
    arrowBounce.value[key] = true
    setTimeout(() => { arrowBounce.value[key] = false }, 350)
  })
}

const scrollPrev = () => {
  triggerArrowBounce('prev')
  const newIndex = Math.max(0, currentCardIndex.value - 1)
  scrollToCardIndex(newIndex)
}

const scrollNext = () => {
  triggerArrowBounce('next')
  const maxIndex = Math.max(0, totalDots.value - 1)
  const newIndex = Math.min(maxIndex, currentCardIndex.value + 1)
  scrollToCardIndex(newIndex)
}

const initCarouselState = () => {
  nextTick(() => {
    itemRefs.value = itemRefs.value.filter(Boolean)
    calculateVisibleCards()
    updateScrollState()
    currentCardIndex.value = 0
  })
}

const shareDialogOpen = ref(false)
const copied = ref(false)
const shareUrl = computed(() => (typeof window !== 'undefined' ? window.location.href : ''))

const openShareDialog = () => {
  shareDialogOpen.value = true
}

const closeShareDialog = () => {
  shareDialogOpen.value = false
  copied.value = false
}

const shareToX = () => {
  const text = encodeURIComponent(`Check out ${anime.value?.title?.english || anime.value?.title?.romaji || ''} on Re:ANIME!`)
  const url = encodeURIComponent(shareUrl.value)
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
}

const shareToFacebook = () => {
  const url = encodeURIComponent(shareUrl.value)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer')
}

const shareToWhatsApp = () => {
  const text = encodeURIComponent(`Check out ${anime.value?.title?.english || anime.value?.title?.romaji || ''} on Re:ANIME! ${shareUrl.value} `)
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
}

const shareToTelegram = () => {
  const text = encodeURIComponent(`Check out ${anime.value?.title?.english || anime.value?.title?.romaji || ''} on Re:ANIME!`)
  const url = encodeURIComponent(shareUrl.value)
  window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer')
}

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

const handleShareEscape = (event) => {
  if (event.key === 'Escape') closeShareDialog()
}

watch(shareDialogOpen, (open) => {
  if (open) {
    window.addEventListener('keydown', handleShareEscape)
  } else {
    window.removeEventListener('keydown', handleShareEscape)
  }
})

const fetchAnimeData = async () => {
  if (!animeId.value) return
  error.value = null
  try {
    const response = await fetch(`/api/anime/${animeId.value}`)
    if (!response.ok) throw new Error('Network error fetching anime details.')
    itemRefs.value = []
    const data = await response.json()
    anime.value = hydrateMedia(data)
    await hydrateRemote()
    checkDescriptionOverflow()
    initCarouselState()
  } catch (err) {
    error.value = err.message
  }
}

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      animeId.value = newId
      isExpanded.value = false
      fetchAnimeData()
    }
  }
)

const handleWatch = () => {
  if (anime.value) {
    const { getLocalData } = useProgressSync()
    const saved = getLocalData()[String(animeId.value)]
    
    let targetEp = 1
    if (saved) {
      if (saved.currentEpisode) {
        targetEp = saved.currentEpisode
      } else {
        targetEp = Math.max(1, saved.progress + 1)
      }
    }
    
    if (anime.value.episodes) {
      targetEp = Math.min(targetEp, anime.value.episodes)
    }
    
    window.location.href = `/anime/${animeId.value}/${targetEp}`
  }
}

import { useWatchlist } from '~/composables/useWatchlist'
const { hydrateMedia, hydrateRemote } = useWatchlist()
const { getLocalData } = useProgressSync()

useHead(() => {
  const title = anime.value?.title?.english || anime.value?.title?.romaji || 'Anime'
  const releaseTitle = anime.value?.startDate?.year ? `${title} (${anime.value.startDate.year})` : title
  const episodes = anime.value?.episodes || '?'
  const genres = (anime.value?.genres || []).slice(0, 3).join(', ') || 'anime'
  const description = `Watch ${title} free online on Re:ANIME. Stream ${genres} anime with ${episodes} episodes in HD with English subs and dubs on reanime.to.`
  return {
    title: `${releaseTitle} - Watch Online Free | Re:ANIME`,
    titleTemplate: '%s',
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: `${releaseTitle} - Watch Online Free | Re:ANIME` },
      { property: 'og:description', content: description },
      { property: 'og:image', content: anime.value?.coverImage?.extraLarge || '/og.webp' }
    ]
  }
})

const formatDate = (dateObj) => {
  if (!dateObj || !dateObj.year) return '?'
  return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`
}

const handleResize = () => {
  checkDescriptionOverflow()
  calculateVisibleCards()
  updateScrollState()
}

onMounted(() => {
  fetchAnimeData()
  window.addEventListener('resize', handleResize)

  if (carouselTrackRef.value && typeof ResizeObserver !== 'undefined') {
    carouselResizeObserver = new ResizeObserver(() => {
      calculateVisibleCards()
      updateScrollState()
    })
    carouselResizeObserver.observe(carouselTrackRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleShareEscape)
  carouselResizeObserver?.disconnect()
})
</script>

<style scoped>
@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translate3d(0, 40px, 0) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  will-change: transform, opacity;
}

.genre-tag {
  background: color-mix(in oklch, var(--primary) 10%, transparent);
  border: transparent;
  color: var(--primary);
}
.genre-tag:hover {
  background: color-mix(in oklch, var(--primary) 20%, transparent);
  color: var(--primary);
}
.carousel-track {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.carousel-track::-webkit-scrollbar {
  display: none;
}

@keyframes bounce-down {
  0% {
    transform: translateY(0) scale(1);
  }
  40% {
    transform: translateY(10px) scale(0.95);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}
.animate-bounce-down {
  display: inline-block;
  animation: bounce-down 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.description-clamped.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>