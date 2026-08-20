<template>
  <main class="flex-1 pt-16 pb-0 c-1fpe2v8">
    <Transition name="slide-fade" appear>
      <!-- Page waits naturally for resolved manga data; global progress bar operates in background -->
      <div v-if="manga" class="relative -mt-16 flex min-h-screen w-full flex-col items-center gap-5 px-4 pt-16 md:px-12">

        <!-- Upper Image / Banner Background -->
        <div class="animate-fade-in absolute top-0 left-0 w-full c-1ndqx91">
          <div class="absolute inset-0 z-10 h-[280px] w-full bg-gradient-to-t from-black from-10% to-transparent"></div> 
          <img 
            :alt="manga.title" 
            class="absolute top-0 left-0 z-0 h-[250px] w-screen object-cover blur-[2px] brightness-[80%]" 
            :src="bannerUrl"
          />
        </div> 

        <!-- Content Body -->
        <div class="z-30 flex w-full flex-col gap-5 duration-700 lg:max-w-screen-xl lg:px-0 xl:max-w-screen-2xl">
          <div class="mt-[60px] flex w-full flex-col gap-6 md:mt-[120px] md:flex-row md:items-stretch">

            <!-- Left Sidebar (Vertical Poster) -->
            <div class="animate-fade-in-up flex flex-col gap-6 md:w-[250px] md:flex-shrink-0 md:self-start md:sticky md:top-24 c-1ndqx91" style="animation-delay: 100ms;">
              <div class="flex flex-shrink-0 justify-center md:block">
                <img 
                  class="h-[350px] w-[250px] rounded-lg object-cover shadow-lg" 
                  :src="posterUrl" 
                  :alt="manga.title"
                />
              </div> 

              <!-- Sidebar Info -->
              <div class="hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-white shadow md:block">
                <div class="flex h-max flex-col gap-4 select-none">
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Type</p> 
                    <span class="text-sm text-gray-300">{{ manga.type }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Chapters</p> 
                    <span class="text-sm text-gray-300">{{ totalChapterCount }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Average Pages</p> 
                    <span class="text-sm text-gray-300">{{ avgPages }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Views</p> 
                    <span class="text-sm text-gray-300">{{ manga.views }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Release Date</p> 
                    <span class="text-sm text-gray-300">{{ formatReleaseDate(manga.released) }}</span>
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
                    {{ manga.title }}
                  </h1> 
                  <h2 class="mx-auto w-3/4 text-center text-sm font-bold italic md:w-full md:text-left md:text-lg" style="color: var(--primary);">
                    {{ manga.type }}
                  </h2>
                </div> 

                <!-- Actions -->
                <div class="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <a 
                    class="inline-flex h-9 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow transition-all" 
                    style="background: var(--primary); color: black;" 
                    @click.prevent="handleRead"
                    href="#"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg> 
                    Read Now
                  </a>

                  <!-- Add to List Dropdown -->
                  <div v-if="false" class="relative inline-block" ref="dropdownRef">
                    <button 
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
                        xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                        class="lucide-icon lucide lucide-square-pen h-4 w-4"
                      >
                        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
                      </svg>
                      <span>{{ selectedStatus ? 'Edit List' : 'Add to List' }}</span> 
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-chevron-down h-3 w-3 transition-transform" :class="{ 'rotate-180': dropdownOpen }">
                        <path d="m6 9 6 6 6-6"></path>
                      </svg>
                    </button>

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
                        class="absolute z-[9999] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/95 shadow-2xl shadow-black/80 backdrop-blur-2xl outline-none left-1/2 -translate-x-1/2 origin-top top-[calc(100%+8px)]"
                        style="min-width: 14rem; width: max-content;"
                      >
                        <div class="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div> 
                        <div class="p-1.5">
                          <div class="flex flex-col gap-1">
                            <button 
                              v-for="status in listStatuses" 
                              :key="status"
                              :disabled="selectedStatus === status"
                              @click="selectStatus(status)"
                              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-300 transition-colors hover:bg-zinc-800 hover:text-white group disabled:opacity-50 disabled:cursor-not-allowed"
                              :class="{ 'bg-zinc-800 text-white font-medium': selectedStatus === status }"
                            >
                              <span>{{ status }}</span>
                              <svg 
                                v-if="selectedStatus === status"
                                xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                                class="lucide-icon lucide lucide-check ml-auto size-4 text-primary"
                              >
                                <path d="M20 6 9 17l-5-5"></path>
                              </svg>
                            </button>
                          </div>

                          <div class="my-1.5 h-px bg-white/[0.08]"></div>

                          <button 
                            v-if="selectedStatus"
                            @click="removeFromList"
                            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-x size-4">
                              <path d="M18 6 6 18"></path>
                              <path d="m6 6 12 12"></path>
                            </svg>
                            <span>Remove from List</span>
                          </button>
                        </div>
                      </div>
                    </Transition>
                  </div>

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
                    {{ manga.type }}
                  </div>
                  <div class="badge-tag rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-xs font-medium text-white">
                    {{ totalChapterCount }} chapters
                  </div>
                  <div class="badge-tag rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-xs font-medium text-white">
                    {{ manga.views }} views
                  </div>
                  <div class="badge-tag rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-xs font-medium text-white">
                    {{ formatReleaseDate(manga.released) }}
                  </div>
                </div>

              </div> 

              <!-- Mobile Metadata Details -->
              <div class="animate-fade-in-up w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-white shadow md:hidden c-1ndqx91" style="animation-delay: 300ms;">
                <div role="region" aria-label="Manga information" class="flex gap-x-6 overflow-x-hidden pb-2 select-none md:pb-0" style="cursor: grab;">
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Type</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ manga.type }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Chapters</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ totalChapterCount }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Average Pages</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ avgPages }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Views</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ manga.views }}</span>
                  </div> 
                  <div class="flex flex-col gap-1">
                    <p class="text-xs font-medium text-gray-500">Release Date</p> 
                    <span class="text-sm whitespace-nowrap text-gray-300">{{ formatReleaseDate(manga.released) }}</span>
                  </div> 
                </div>
              </div> 

              <!-- Chapter List -->
              <div class="animate-fade-in-up w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow c-1ndqx91" style="animation-delay: 400ms;">

                <div class="mb-4 flex items-center justify-between">
                  <h2 class="text-lg font-semibold text-white">Chapters</h2> 
                  <span class="text-xs font-semibold text-zinc-500">{{ activeGroup ? activeGroup.chapters.length : 0 }} CHAPTERS</span>
                </div>

                <!-- Chapter Controls -->
                <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <!-- Scanlator Filter -->
                  <div class="flex flex-wrap gap-2" v-if="groupedByScanlator.length > 1">
                    <button 
                      type="button"
                      @click="selectScanlator(ALL_PROVIDERS_KEY)"
                      class="genre-tag rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                      :class="{ 'scanlator-active': effectiveScanId === ALL_PROVIDERS_KEY }"
                    >
                      All Providers <span class="opacity-60">({{ manga.chapters.length }})</span>
                    </button>
                    <button 
                      v-for="group in groupedByScanlator" 
                      :key="group.scanId"
                      type="button"
                      @click="selectScanlator(group.scanId)"
                      class="genre-tag rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                      :class="{ 'scanlator-active': effectiveScanId === group.scanId }"
                    >
                      {{ group.name }} <span class="opacity-60">({{ group.chapters.length }})</span>
                    </button>
                  </div>

                  <!-- Search & Sort -->
                  <div class="flex items-center gap-2 md:ml-auto">
                    <div class="relative flex items-center w-full md:w-64">
                      <!-- Added flex items-center, removed absolute, left-2.5, top-2.5 -->
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-search absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                      </svg>
                      <input 
                        v-model="searchQuery"
                        type="text" 
                        placeholder="Search chapter..." 
                        class="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1 pl-9 text-sm text-white shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <button 
                      @click="toggleSortOrder"
                      class="inline-flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-800/50 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
                      :title="sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'"
                    >
                      <svg v-if="sortOrder === 'desc'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-arrow-down-up h-4 w-4">
                        <path d="m3 16 4 4 4-4"></path>
                        <path d="M7 20V4"></path>
                        <path d="m21 8-4-4-4 4"></path>
                        <path d="M17 4v16"></path>
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-arrow-up-down h-4 w-4">
                        <path d="m21 16-4 4-4-4"></path>
                        <path d="M17 20V4"></path>
                        <path d="m3 8 4-4 4 4"></path>
                        <path d="M7 4v16"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Chapter Rows -->
                <div class="flex flex-col gap-2">
                  <a 
                    v-for="chapter in paginatedChapters" 
                    :key="chapter.id"
                    :href="`/manga/${mangaId}/${chapter.id}`"
                    class="flex items-center justify-between gap-3 rounded-lg bg-zinc-800/50 px-3 py-2.5 transition-colors hover:bg-zinc-700/50"
                  >
                    <span class="flex-shrink-0 text-sm font-semibold text-white">Ch. {{ chapter.number }}</span>
                    <span class="min-w-0 flex-1 truncate text-center text-sm text-gray-400">{{ chapter.title }}</span>
                    <span v-if="effectiveScanId === ALL_PROVIDERS_KEY" class="flex-shrink-0 truncate text-xs" style="color: var(--primary);">{{ chapter.providerName }}</span>
                    <span class="flex-shrink-0 text-xs text-gray-500">{{ chapter.pageCount }}p</span>
                  </a>
                  <p v-if="!paginatedChapters.length" class="py-6 text-center text-sm text-gray-500">
                    No chapters available.
                  </p>
                </div>

                <!-- Pagination -->
                <div v-if="!loading && activeGroup && activeGroup.chapters.length && totalPages > 1" class="mt-2 flex justify-center pb-2">
                  <div class="flex items-center gap-2 c-1gx8udt">

                    <button
                      type="button"
                      aria-label="Previous page"
                      :disabled="currentPage === 1"
                      :class="['flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 c-1gx8udt', currentPage === 1 ? 'cursor-not-allowed bg-zinc-800/50 text-white/40' : 'bg-zinc-800 text-white/80 hover:bg-zinc-700']"
                      @click="goToPrevPage"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4 c-1gx8udt">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" class="c-1gx8udt"></path>
                      </svg>
                    </button>

                    <template v-for="item in pageItems" :key="item.type === 'page' ? `page-${item.value}` : `ellipsis-${item.key}`">
                      <button
                        v-if="item.type === 'page'"
                        type="button"
                        :class="['flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 c-1gx8udt', item.value === currentPage ? 'bg-primary text-black' : 'bg-zinc-800 text-white/80 hover:bg-zinc-700']"
                        @click="goToPage(item.value)"
                      >
                        {{ item.value }}
                      </button>
                      <button
                        v-else
                        type="button"
                        disabled
                        class="flex h-10 w-10 cursor-default items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white/80 c-1gx8udt"
                      >
                        ...
                      </button>
                    </template>

                    <button
                      type="button"
                      aria-label="Next page"
                      :disabled="currentPage === totalPages"
                      :class="['flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 c-1gx8udt', currentPage === totalPages ? 'cursor-not-allowed bg-zinc-800/50 text-white/40' : 'bg-zinc-800 text-white/80 hover:bg-zinc-700']"
                      @click="goToNextPage"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4 c-1gx8udt">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" class="c-1gx8udt"></path>
                      </svg>
                    </button>

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
                  <div class="text-lg leading-none font-semibold" role="heading" aria-level="2">Share Manga</div> 
                  <div class="text-sm text-muted-foreground">Share this manga with your friends.</div>
                </div>
              </div> 
              <div class="text-2xl font-black tracking-tight text-white">Share Manga</div> 
              <p class="mt-1 line-clamp-1 text-sm text-gray-500">Share "{{ manga?.title || '?' }}" with your friends.</p>
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

    <!-- Error State (loading itself is handled by the app's global progress bar) -->
    <div v-if="!manga && error" class="flex min-h-screen items-center justify-center text-sm text-red-400">
      {{ error }}
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mangaId = ref(route.params.id)

const manga = ref(null)
const error = ref(null)

useHead(() => {
  const title = manga.value?.title || 'Manga'
  const description = `Read ${title} free online on Re:ANIME.`
  return {
    title: `${title} - Read Online Free | Re:ANIME`, titleTemplate: '%s',
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: `${title} - Read Online Free | Re:ANIME` },
      { property: 'og:description', content: description },
      { property: 'og:image', content: manga.value?.cover || manga.value?.coverImage || '/og.webp' }
    ]
  }
})
const loading = ref(true)
const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const selectedStatus = ref('')

const searchQuery = ref('')
const sortOrder = ref('desc')

const shareDialogOpen = ref(false)
const copied = ref(false)
const shareUrl = computed(() => (typeof window !== 'undefined' ? window.location.href : ''))

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  currentPage.value = 1
}

// Fallbacks if primary details API lacks image URLs
const fallbackPoster = ref(null)
const fallbackBanner = ref(null)

const apiStatusMap = {
  'Reading': 'reading',
  'Plan to Read': 'planning',
  'Completed': 'completed',
  'On Hold': 'paused',
  'Dropped': 'dropped'
}

const reverseStatusMap = {
  'reading': 'Reading',
  'planning': 'Plan to Read',
  'completed': 'Completed',
  'paused': 'On Hold',
  'dropped': 'Dropped'
}

const listStatuses = ['Reading', 'Plan to Read', 'Completed', 'On Hold', 'Dropped']

const ALL_PROVIDERS_KEY = '__all__'
const perPage = 50
const activeScanId = ref(null)
const currentPage = ref(1)

// URL resolution function
const config = useRuntimeConfig()

function imgUrl(u) {
  if (!u) return '';
  let s = String(u);

  if (s.includes('/posters/') && !s.includes('/static/posters/')) {
    s = s.replace('/posters/', '/static/posters/');
  }
  if (s.includes('/banners/') && !s.includes('/static/banners/')) {
    s = s.replace('/banners/', '/static/banners/');
  }

  if (s.startsWith(config.public.proxyApiBase)) return s;

  if (s.startsWith('/')) {
    s = 'https://cdn.atsu.moe' + s
  } else if (s.startsWith('https://atsu.moe/')) {
    s = s.replace('https://atsu.moe/', 'https://cdn.atsu.moe/')
  }

  return `${config.public.proxyApiBase}/proxy?url=${encodeURIComponent(s)}&ref=https://www.atsu.moe`;
}

// Fallback search to find missing images
const fetchFallbackImages = async (title, id) => {
  if (!title || !id) return
  try {
    const response = await fetch(`${config.public.mangaVaultApiBase}/atsu/search?keyword=${encodeURIComponent(title)}`)
    if (!response.ok) return
    const json = await response.json()
    const match = json?.data?.items?.find(item => item.id === id)
    if (match?.cover) fallbackPoster.value = match.cover
    if (match?.banner) fallbackBanner.value = match.banner
  } catch (err) {
    console.error('Fallback image lookup failed:', err)
  }
}

// Vertical image acts as the poster (left sidebar)
const posterUrl = computed(() => {
  return imgUrl(manga.value?.cover || fallbackPoster.value)
})

// Upper image acts as the banner (top background)
const bannerUrl = computed(() => {
  return imgUrl(manga.value?.banner || fallbackBanner.value || manga.value?.cover || fallbackPoster.value)
})

const fetchMangaData = async () => {
  if (!mangaId.value) return
  error.value = null
  loading.value = true
  try {
    const response = await fetch(`${config.public.mangaVaultApiBase}/atsu/manga/${mangaId.value}/details`)
    if (!response.ok) throw new Error('Network error fetching manga details.')
    const json = await response.json()
    manga.value = json.data
    
    // Set initial watchlist status if available
    if (manga.value.mediaListEntry?.status) {
      selectedStatus.value = reverseStatusMap[manga.value.mediaListEntry.status.toLowerCase()] || ''
    }

    // Only fetch search API if cover or banner is missing from the normal details page
    if (!manga.value?.cover || !manga.value?.banner) {
      fetchFallbackImages(manga.value?.title, mangaId.value)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      mangaId.value = newId
      activeScanId.value = null
      currentPage.value = 1
      manga.value = null
      fallbackPoster.value = null
      fallbackBanner.value = null
      fetchMangaData()
    }
  }
)

// Chapters come back as one flat list where consecutive runs belong to each
// scanlator in the order they're listed under `manga.scanlators`. Group them
// back into per-scanlator lists, matching group order to scanlator order.
const groupedByScanlator = computed(() => {
  if (!manga.value?.chapters?.length) return []
  const order = []
  const map = {}
  for (const chapter of manga.value.chapters) {
    if (!map[chapter.scanId]) {
      map[chapter.scanId] = []
      order.push(chapter.scanId)
    }
    map[chapter.scanId].push(chapter)
  }
  return order.map((scanId, idx) => ({
    scanId,
    name: manga.value.scanlators?.[idx] || `Scanlator ${idx + 1}`,
    chapters: [...map[scanId]].sort((a, b) => b.number - a.number)
  }))
})

// Flattened view across every scanlator, tagged with which provider each
// chapter came from (duplicate chapter numbers are expected here).
const allProvidersGroup = computed(() => {
  if (!groupedByScanlator.value.length) return null
  const chapters = groupedByScanlator.value
    .flatMap(group => group.chapters.map(chapter => ({ ...chapter, providerName: group.name })))
    .sort((a, b) => b.number - a.number)
  return { scanId: ALL_PROVIDERS_KEY, name: 'All Providers', chapters }
})

const effectiveScanId = computed(() => activeScanId.value || groupedByScanlator.value[0]?.scanId || null)

const activeGroup = computed(() => {
  let group
  if (effectiveScanId.value === ALL_PROVIDERS_KEY) group = allProvidersGroup.value
  else group = groupedByScanlator.value.find(g => g.scanId === effectiveScanId.value) || null

  if (!group) return null

  let chapters = [...group.chapters]

  // Filter by search query
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    chapters = chapters.filter(c => 
      c.title?.toLowerCase().includes(q) || 
      String(c.number).includes(q) ||
      c.providerName?.toLowerCase().includes(q)
    )
  }

  // Sort according to sortOrder (groupedByScanlator provides desc initially)
  if (sortOrder.value === 'asc') {
    chapters = chapters.sort((a, b) => a.number - b.number)
  } else {
    chapters = chapters.sort((a, b) => b.number - a.number)
  }

  return { ...group, chapters }
})

const totalChapterCount = computed(() => {
  if (!groupedByScanlator.value.length) return 0
  return Math.max(...groupedByScanlator.value.map(group => group.chapters.length))
})

const avgPages = computed(() => {
  const chapters = activeGroup.value?.chapters
  if (!chapters || !chapters.length) return 0
  const total = chapters.reduce((sum, c) => sum + (c.pageCount || 0), 0)
  return Math.round(total / chapters.length)
})

const totalPages = computed(() => {
  if (!activeGroup.value || !activeGroup.value.chapters.length) return 1
  return Math.max(1, Math.ceil(activeGroup.value.chapters.length / perPage))
})

const paginatedChapters = computed(() => {
  if (!activeGroup.value) return []
  const start = (currentPage.value - 1) * perPage
  return activeGroup.value.chapters.slice(start, start + perPage)
})

// Builds a compact page list with ellipsis gaps, e.g. 1 … 4 5 6 … 12
const pageItems = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const items = []

  if (total <= 7) {
    for (let page = 1; page <= total; page++) items.push({ type: 'page', value: page })
    return items
  }

  items.push({ type: 'page', value: 1 })
  if (current > 4) items.push({ type: 'ellipsis', key: 'start' })

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let page = start; page <= end; page++) items.push({ type: 'page', value: page })

  if (current < total - 3) items.push({ type: 'ellipsis', key: 'end' })
  items.push({ type: 'page', value: total })

  return items
})

const selectScanlator = (scanId) => {
  activeScanId.value = scanId
  currentPage.value = 1
}

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

const goToPrevPage = () => goToPage(currentPage.value - 1)
const goToNextPage = () => goToPage(currentPage.value + 1)

const handleRead = () => {
  if (!activeGroup.value?.chapters?.length) return
  const firstChapter = [...activeGroup.value.chapters].sort((a, b) => a.number - b.number)[0]
  window.location.href = `/manga/${mangaId.value}/${firstChapter.id}`
}

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

import { useWatchlist } from '~/composables/useWatchlist'
const { setWatchlistStatus, removeFromWatchlist } = useWatchlist()

const selectStatus = async (status) => {
  selectedStatus.value = status
  dropdownOpen.value = false
  
  if (manga.value) {
    const apiStatus = apiStatusMap[status]
    if (apiStatus) {
      // Create a unified media object for the composable
      const mediaItem = {
        id: manga.value.id,
        title: manga.value.title,
        cover: manga.value.cover || fallbackPoster.value,
        type: 'MANGA',
        isManga: true
      }
      await setWatchlistStatus(mediaItem, apiStatus)
    }
  }
}

const removeFromList = async () => {
  dropdownOpen.value = false
  if (manga.value) {
    const mediaItem = { id: manga.value.id }
    await removeFromWatchlist(mediaItem)
  }
  selectedStatus.value = ''
}

const openShareDialog = () => {
  shareDialogOpen.value = true
}

const closeShareDialog = () => {
  shareDialogOpen.value = false
  copied.value = false
}

const shareToX = () => {
  const text = encodeURIComponent(`Check out ${manga.value?.title || ''} on Re:ANIME!`)
  const url = encodeURIComponent(shareUrl.value)
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
}

const shareToFacebook = () => {
  const url = encodeURIComponent(shareUrl.value)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer')
}

const shareToWhatsApp = () => {
  const text = encodeURIComponent(`Check out ${manga.value?.title || ''} on Re:ANIME! ${shareUrl.value}`)
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
}

const shareToTelegram = () => {
  const text = encodeURIComponent(`Check out ${manga.value?.title || ''} on Re:ANIME!`)
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

const formatReleaseDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  fetchMangaData()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.genre-tag {
  background:color-mix(in oklch,var(--primary) 10%,transparent);
  border:transparent;
  color:var(--primary)
}
.genre-tag:hover {
  background:color-mix(in oklch,var(--primary) 20%,transparent);
  color:var(--primary)
}
.scanlator-active {
  background: var(--primary) !important;
  color: black !important;
}
</style>
