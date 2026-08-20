<template>
  <div style="background: #000">
    <div class="flex min-h-[100dvh] flex-col c-1fpe2v8">
      <main class="relative z-[100] mx-auto mt-[8vh] flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 pt-24 pb-16">
        
        <div class="animate-fade-in pointer-events-none absolute inset-0 z-[-1] opacity-30 select-none md:opacity-40 c-qou2n9" style="mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);">
          <img 
            src="/collage.png" 
            alt="Search background" 
            class="h-full w-full scale-110 object-cover blur-[15px] md:blur-[20px]"
          >
          <div class="absolute inset-0 bg-[#050505]/40 md:bg-[#050505]/30"></div>
        </div>

        <img src="/logo.png" alt="Re:ANIME Logo" class="animate-fade-in mb-8 h-12 w-auto md:h-16 lg:h-20 c-qou2n9">
        
        <h1 class="animate-slide-up mb-8 text-center text-3xl font-medium text-white md:text-4xl c-qou2n9" style="animation-delay: 0.1s;">
          Watch Free Anime Online
        </h1>

        <div 
          v-click-outside="closeSearchPanel"
          class="animate-slide-up relative z-50 mb-6 w-full max-w-3xl c-qou2n9" 
          style="animation-delay: 0.15s;"
        >
          <form @submit.prevent="handleViewAllRedirect" class="relative w-full">
            <div class="search-container relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all focus-within:border-white/30 focus-within:bg-black/70">
              <div class="pl-4 text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-search">
                  <path d="m21 21-4.34-4.34"></path>
                  <circle cx="11" cy="11" r="8"></circle>
                </svg>
              </div>
              
              <input 
                v-model="searchQuery"
                type="text" 
                id="landing-search-input" 
                ref="searchInput"
                placeholder="Search anime" 
                class="w-full border-none bg-transparent py-4 pr-36 pl-3 text-base text-white shadow-none placeholder:text-zinc-600 focus:ring-0 focus:outline-none c-qou2n9" 
                autocomplete="off"
                @focus="isFocused = true"
              >
              
              <button 
                v-if="searchQuery.length > 0"
                type="button" 
                @click="clearSearchQuery"
                class="absolute top-1/2 right-[105px] flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-x">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
              
              <button type="submit" class="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110">
                Filter
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-funnel">
                  <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path>
                </svg>
              </button>
            </div>

              <Transition name="search-panel">
                <div 
                  v-if="isFocused && searchQuery.trim() && (isLoading || results.length > 0 || !isLoading)"
                  class="absolute top-full right-0 left-0 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]/98 text-left shadow-2xl shadow-black/60 backdrop-blur-2xl" 
                  style="z-index: 50;"
                >
                  <div v-if="isLoading" class="flex items-center justify-center py-8">
                    <div class="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-primary"></div>
                  </div>

                  <ul v-else class="flex max-h-[320px] flex-col overflow-y-auto">
                    
                    <template v-if="displayedResults.length > 0">
                      <li 
                        v-for="item in displayedResults" 
                        :key="item.id"
                        @click="router.push(`/anime/${item.id}`)"
                        class="flex cursor-pointer items-center gap-3 border-b border-white/5 px-4 py-3 transition-colors last:border-b-0 hover:bg-white/5"
                      >
                        <img 
                          class="h-14 w-10 shrink-0 rounded bg-zinc-800 object-cover" 
                          loading="lazy" 
                          :src="item.coverImage" 
                          :alt="item.title"
                        > 
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-medium text-white">{{ item.title }}</p> 
                          <p class="truncate text-xs text-zinc-500">{{ item.type }} · {{ item.status }} · {{ item.year }}</p>
                        </div> 
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right size-4 shrink-0 text-zinc-600">
                          <path d="m9 18 6-6-6-6"></path>
                        </svg>
                      </li>

                      <li class="border-t border-white/5">
                        <button 
                          @click.prevent="handleViewAllRedirect"
                          type="button"
                          class="flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          View All Results ({{ totalResults }}) 
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-chevron-right size-3">
                            <path d="m9 18 6-6-6-6"></path>
                          </svg>
                        </button>
                      </li>
                    </template>

                    <li v-else class="px-4 py-6 text-center">
                      <p class="text-sm font-medium text-zinc-400">No anime found</p> 
                      <p class="mt-1 text-xs text-zinc-600">Try different keywords</p>
                    </li>

                  </ul>
                </div>
              </Transition>
          </form>
        </div>

        <div class="animate-slide-up mb-8 max-w-lg text-center text-[13px] leading-relaxed text-zinc-500 c-qou2n9" style="animation-delay: 0.2s;">
          Suggestion:
          <a href="/search?q=One Piece" class="ml-1 inline-block transition-colors hover:text-primary">One Piece</a>
          <a href="/search?q=Solo Leveling" class="ml-1 inline-block transition-colors hover:text-primary">Solo Leveling</a>
          <a href="/search?q=Jujutsu Kaisen" class="ml-1 inline-block transition-colors hover:text-primary">Jujutsu Kaisen</a>
          <a href="/search?q=Oshi No Ko" class="ml-1 inline-block transition-colors hover:text-primary">Oshi No Ko</a>
          <a href="/search?q=Mashle" class="ml-1 inline-block transition-colors hover:text-primary">Mashle</a>
        </div>

        <div class="animate-slide-up flex w-full flex-row items-center justify-center gap-2.5 px-2 sm:gap-4 c-qou2n9" style="animation-delay: 0.25s;">
          <a href="/home" class="flex max-w-[160px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-3 text-sm font-semibold whitespace-nowrap text-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] transition-all hover:scale-102 active:scale-95 sm:max-w-none sm:flex-none sm:gap-2 sm:px-8 sm:py-3.5 sm:text-base">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-play ml-[-2px] shrink-0">
              <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
            </svg>
            Watch now
          </a>
          <a href="/schedule" class="flex max-w-[160px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-3 text-sm font-semibold whitespace-nowrap text-white transition-all hover:scale-102 hover:border-white/20 hover:bg-white/5 active:scale-95 sm:max-w-none sm:flex-none sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-base">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-calendar shrink-0 text-zinc-400">
              <path d="M8 2v4"></path>
              <path d="M16 2v4"></path>
              <rect width="18" height="18" x="3" y="4" rx="2"></rect>
              <path d="M3 10h18"></path>
            </svg>
            <span class="hidden sm:inline">View Schedule</span>
            <span class="sm:hidden">Schedule</span>
          </a>
        </div>
      </main>

      <section class="animate-slide-up relative z-10 mx-auto w-full max-w-5xl px-6 py-16 lg:py-24 c-qou2n9" style="animation-delay: 0.3s;">
        <div class="grid items-center gap-16 md:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <h2 class="mb-4 text-xs font-black tracking-[0.3em] text-primary uppercase">
              About Re:ANIME
            </h2>
            <p class="mb-8 text-2xl leading-tight font-light text-white lg:text-3xl">
              A quiet, high-performance portal that
              <span class="font-medium text-primary">respects the medium</span>
              and the viewer.
            </p>
            <p class="mb-5 text-sm leading-relaxed text-zinc-400">
              Anime is more than entertainment — it's a gateway to worlds full of emotion, creativity, and storytelling. From intense battles to unforgettable romantic moments, anime has become essential for millions of fans worldwide.
            </p>
            <p class="text-sm leading-relaxed text-zinc-400">
              Re:ANIME was built because the Internet has become too loud. Anime sites have become a minefield of ads, pop-ups, and clutter. We don't want your data. We don't want your attention for anything other than the show you came to watch.
            </p>
          </div>
          <div class="relative mx-auto h-[360px] w-full max-w-[300px] md:ml-auto md:h-[420px]">
            <div class="absolute top-0 right-0 aspect-[3/4] w-[55%] overflow-hidden rounded-xl border border-white/5 shadow-2xl shadow-black/60" style="transform: rotate(4deg);">
              <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21-ELSYx3yMPcKM.jpg" alt="" class="h-full w-full object-cover" loading="lazy">
            </div>
            <div class="absolute bottom-0 left-0 aspect-[3/4] w-[55%] overflow-hidden rounded-xl border border-white/5 shadow-2xl shadow-black/60" style="transform: rotate(-5deg);">
              <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx178789-hNXjKFzUq7mk.jpg" alt="" class="h-full w-full object-cover" loading="lazy">
            </div>
            <div class="absolute top-1/2 left-1/2 z-10 aspect-[3/4] w-[50%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-primary/30 shadow-2xl shadow-black/80">
              <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx182205-q2AeO1owuQbO.jpg" alt="" class="h-full w-full object-cover" loading="lazy">
            </div>
            <div class="absolute top-4 left-4 h-2 w-2 rounded-full bg-primary"></div>
            <div class="absolute right-4 bottom-4 h-2 w-2 rounded-full bg-primary/60"></div>
          </div>
        </div>
      </section>

      <section class="animate-slide-up relative z-10 mx-auto w-full max-w-5xl px-6 py-16 lg:py-24 c-qou2n9" style="animation-delay: 0.4s;">
        <div class="grid items-center gap-16 md:grid-cols-[1fr_1fr] lg:gap-24">
          <div class="relative order-2 mx-auto flex h-[380px] w-full items-center justify-center md:order-1 md:h-[460px]">
            <div class="absolute inset-0 rounded-full bg-primary/20 opacity-60 blur-[80px]"></div>
            <div class="absolute z-20 h-[300px] w-[180px] overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/80 transition-transform duration-500 hover:scale-105 md:h-[360px] md:w-[220px]">
              <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx269-d2GmRkJbMopq.png" alt="" class="h-full w-full object-cover" loading="lazy">
            </div>
            <div class="absolute top-[5%] left-4 z-10 h-[170px] w-[130px] overflow-hidden rounded-2xl border border-white/10 opacity-80 shadow-xl transition-transform duration-500 hover:scale-105 hover:opacity-100 md:-left-4" style="transform: rotate(-12deg);">
              <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx97940-fyh8o7gNbha0.png" alt="" class="h-full w-full object-cover" loading="lazy">
            </div>
            <div class="absolute right-4 bottom-[5%] z-30 h-[110px] w-[150px] overflow-hidden rounded-2xl border border-white/10 opacity-90 shadow-xl transition-transform duration-500 hover:scale-105 hover:opacity-100 md:-right-4" style="transform: rotate(8deg);">
              <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx195600-moI0UFArtOme.jpg" alt="" class="h-full w-full object-cover" loading="lazy">
            </div>
            <div class="absolute top-[20%] -right-4 z-40 flex items-center gap-3 rounded-2xl border border-white/20 bg-black/60 p-4 shadow-2xl backdrop-blur-xl md:-right-12">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-star">
                  <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                </svg>
              </div>
              <div>
                <div class="mb-0.5 text-xs font-medium text-zinc-400 font-sans">Top Rated</div>
                <div class="text-sm font-bold text-white font-sans">1080p Quality</div>
              </div>
            </div>
          </div>
          <div class="order-1 md:order-2">
            <h2 class="mb-4 text-xs font-black tracking-[0.3em] text-primary uppercase">
              Why Re:ANIME?
            </h2>
            <p class="mb-10 text-2xl leading-tight font-light text-white lg:text-3xl">
              Engineered for
              <span class="font-medium text-primary">performance</span>
              and pure enjoyment.
            </p>
            <div class="grid gap-6">
              <div class="group flex gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-zap">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="mb-1 font-medium text-white">AV1 Support</h3>
                  <p class="text-sm leading-relaxed text-zinc-500">
                    We will let you choose AV1 streaming when available on compatible devices.
                  </p>
                </div>
              </div>
              <div class="group flex gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-shield">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="mb-1 font-medium text-white">Secure Stream</h3>
                  <p class="text-sm leading-relaxed text-zinc-500">
                    No ad trackers. Optional AniList sync with client-side encrypted tokens.
                  </p>
                </div>
              </div>
              <div class="group flex gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-hash">
                    <line x1="4" x2="20" y1="9" y2="9"></line>
                    <line x1="4" x2="20" y1="15" y2="15"></line>
                    <line x1="10" x2="8" y1="3" y2="21">
                    </line>
                    <line x1="16" x2="14" y1="3" y2="21">
                    </line>
                  </svg>
                </div>
                <div>
                  <h3 class="mb-1 font-medium text-white">Deep Index</h3>
                  <p class="text-sm leading-relaxed text-zinc-500">
                    Complete catalog from 1970 onwards with rich, accurate metadata.
                  </p>
                </div>
              </div>
              <div class="group flex gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-tv">
                    <path d="m17 2-5 5-5-5"></path>
                    <rect width="20" height="15" x="2" y="7" rx="2"></rect>
                  </svg>
                </div>
                <div>
                  <h3 class="mb-1 font-medium text-white">HD Quality</h3>
                  <p class="text-sm leading-relaxed text-zinc-500">
                    Stream in pristine 1080p with minimal buffering on any device, anywhere.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="animate-slide-up relative z-10 mx-auto w-full max-w-5xl px-6 py-16 lg:py-24 c-qou2n9" style="animation-delay: 0.5s;">
        <div class="grid items-center gap-16 md:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <h2 class="mb-4 text-xs font-black tracking-[0.3em] text-primary uppercase">
              Infinite Library
            </h2>
            <p class="mb-8 text-2xl leading-tight font-light text-white lg:text-3xl">
              Every genre, every era.
              <span class="font-medium text-primary">All in one place.</span>
            </p>
            <p class="mb-8 text-sm leading-relaxed text-zinc-400">
              Whether you're looking for the latest seasonal hits airing right now in Japan, or a nostalgic classic from the 90s, our deep index has you covered. Everything is meticulously organized with rich metadata and instant streaming availability.
            </p>
            <a href="/search" class="group inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-primary">
              Explore the Catalog
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-arrow-right transition-transform group-hover:translate-x-1">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </a>
          </div>
          <div class="relative mx-auto h-[360px] w-full overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a]/30 shadow-2xl md:h-[420px]">
            <div class="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
            <div class="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#050505] via-transparent to-transparent opacity-50"></div>
            <div class="pointer-events-none absolute top-1/2 left-1/2 flex w-[160%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] justify-center gap-3 md:gap-4">
              <div class="flex -translate-y-12 flex-col gap-3 md:gap-4">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21-ELSYx3yMPcKM.jpg" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-40 grayscale md:h-[180px] md:w-[130px]">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx178789-hNXjKFzUq7mk.jpg" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-70 md:h-[180px] md:w-[130px]">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx182205-q2AeO1owuQbO.jpg" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-40 grayscale md:h-[180px] md:w-[130px]">
              </div>
              <div class="flex translate-y-8 flex-col gap-3 md:gap-4">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx269-d2GmRkJbMopq.png" alt="" class="h-[170px] w-[120px] rounded-xl object-cover shadow-2xl md:h-[220px] md:w-[160px]">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx97940-fyh8o7gNbha0.png" alt="" class="z-20 h-[170px] w-[120px] rounded-xl border border-primary/30 object-cover shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] md:h-[220px] md:w-[160px]">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx195600-moI0UFArtOme.jpg" alt="" class="h-[170px] w-[120px] rounded-xl object-cover shadow-2xl md:h-[220px] md:w-[160px]">
              </div>
              <div class="flex -translate-y-4 flex-col gap-3 md:gap-4">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx182300-IYkq5KrkQq1V.jpg" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-60 md:h-[180px] md:w-[130px]">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx196187-cXhET893v3Ag.png" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-80 md:h-[180px] md:w-[130px]">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx166873-xO0BRPkmwFll.png" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-40 grayscale md:h-[180px] md:w-[130px]">
              </div>
              <div class="flex translate-y-12 flex-col gap-3 md:gap-4">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx1735-kGfVm0YqCPcu.png" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-30 grayscale md:h-[180px] md:w-[130px]">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx187538-fXVXKYUA3VV6.jpg" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-50 md:h-[180px] md:w-[130px]">
                <img src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx20-dE6UHbFFg1A5.jpg" alt="" class="h-[140px] w-[100px] rounded-xl object-cover opacity-30 grayscale md:h-[180px] md:w-[130px]">
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>  
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'lander'
})

useHead({
  title: 'Re:ANIME - Watch Free Anime Online'
})

const router = useRouter()

const searchQuery = ref('')
const results = ref([])
const totalResults = ref(0)
const isLoading = ref(false)
const debounceTimeout = ref(null)
const searchInput = ref(null)
const isMac = ref(false)

// Focus condition state tracking for outside click management
const isFocused = ref(false)

onMounted(() => {
  isMac.value = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  window.addEventListener('keydown', handleGlobalKeyDown)
})

// Display maximum of 3 items
const displayedResults = computed(() => {
  return results.value.slice(0, 3)
})

// Basic Anime Search Trigger
const fetchSearchResults = async (query) => {
  if (!query.trim()) {
    results.value = []
    totalResults.value = 0
    return
  }
  
  isLoading.value = true
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=anime`)
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
  } catch (error) {
    console.error("Search execution failure:", error)
    results.value = []
    totalResults.value = 0
  } finally {
    isLoading.value = false
  }
}

const handleGlobalKeyDown = (e) => {
  const isMatch = isMac.value ? e.metaKey : e.ctrlKey
  if (isMatch && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (searchInput.value) {
      searchInput.value.focus()
      isFocused.value = true
    }
  }
}

const handleViewAllRedirect = () => {
  if (!searchQuery.value.trim()) return
  router.push({
    path: '/search',
    query: { q: searchQuery.value }
  })
}

// Handler functions for contextual panel interaction states
const closeSearchPanel = () => {
  isFocused.value = false
}

const clearSearchQuery = () => {
  searchQuery.value = ''
  results.value = []
  totalResults.value = 0
  if (searchInput.value) {
    searchInput.value.focus()
  }
}

watch(searchQuery, (newQuery) => {
  clearTimeout(debounceTimeout.value)
  debounceTimeout.value = setTimeout(() => {
    fetchSearchResults(newQuery)
  }, 250)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
  clearTimeout(debounceTimeout.value)
})

// Inlined custom directive configuration mapping click-outside interactions
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}
</script>

<style scoped>
/* Vue panel translation classes executing the box animations */
.search-panel-enter-active,
.search-panel-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.search-panel-enter-from,
.search-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.995);
}
</style>