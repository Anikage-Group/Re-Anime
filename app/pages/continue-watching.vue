<template>
  <main class="flex-1 pt-16 pb-0" @click="closeAllDropdowns">
    <div class="min-h-screen bg-[#070707] text-white">
      
      <!-- Hero Header -->
      <div class="relative -mt-16 h-56 w-full overflow-hidden border-b border-white/5 bg-[#0a0a0a] pt-16 sm:h-68">
        <div class="pointer-events-none absolute inset-0 z-0">
          <div 
            class="hero-blur-layer absolute inset-0 bg-cover bg-center opacity-20"
            :style="{ backgroundImage: `url(${heroBanner})` }"
          ></div>
          <div class="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/60 to-transparent"></div>
        </div>
        
        <div 
          class="animate-fade-in-up absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-7xl items-end justify-center p-4 sm:p-6 md:px-8"
          style="animation-delay: 100ms;"
        >
          <div class="text-center">
            <h1 class="mb-1 text-3xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl">Continue Watching</h1>
            <p class="text-xs font-medium text-gray-400 sm:text-sm">Pick up right where you left off</p>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="mx-auto min-h-screen max-w-7xl pb-12">
        
        <!-- Filter Controls Bar -->
        <div 
          class="animate-fade-in relative z-50 border-b border-white/5 bg-[#0a0a0a]/30 px-4 py-4 sm:px-6 md:px-8"
          style="animation-delay: 200ms;"
        >
          <div class="mb-4 flex flex-col gap-4 xl:grid xl:grid-cols-8 xl:gap-x-3 xl:gap-y-4">
            
            <!-- Primary Inputs Grid -->
            <div class="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4 xl:contents">
              
              <!-- Search Bar -->
              <div class="relative w-full xl:col-span-2">
                <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Search</div>
                <form class="relative w-full" @submit.prevent>
                  <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                    <svg class="h-[14px] w-[14px] text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"></path>
                    </svg>
                  </div>
                  <input 
                    v-model="filters.search"
                    class="search-input block w-full rounded-lg border border-white/5 bg-[#141414] px-4 py-2.5 ps-9 text-sm font-medium text-gray-300 placeholder-gray-500 transition-colors focus:border-primary/50 focus:outline-none" 
                    placeholder="Type to search..." 
                    autocomplete="off" 
                    type="search"
                  />
                </form>
              </div>

              <!-- Season Dropdown -->
              <div class="relative w-full" ref="seasonRef">
                <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Season</div>
                <button 
                  type="button" 
                  @click.stop="toggleDropdown('season')"
                  class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                >
                  <span class="line-clamp-1">{{ filters.season }}</span>
                  <div class="flex items-center gap-1.5 text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'season' }]">
                      <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                    </svg>
                  </div>
                </button>

                <!-- Season Menu with Zoom Transition -->
                <Transition name="zoom-top">
                  <div v-if="activeDropdown === 'season'" @click.stop class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                    <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                    <button 
                      v-for="sn in seasonOptions" 
                      :key="sn" 
                      type="button" 
                      @click="selectSeason(sn)"
                      :class="['w-full rounded-md px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-white/10 hover:text-white', filters.season === sn ? 'bg-primary/10 text-primary' : 'text-gray-400']"
                    >
                      {{ sn }}
                    </button>
                  </div>
                </Transition>
              </div>

              <!-- Genres Dropdown -->
              <div class="relative w-full" ref="genresRef">
                <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Genres</div>
                <button 
                  type="button" 
                  @click.stop="toggleDropdown('genre')"
                  :class="[
                    'dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]',
                    filters.genres.length ? 'border-primary/30 bg-primary/5' : ''
                  ]"
                >
                  <span class="line-clamp-1">
                    {{ filters.genres.length ? `${filters.genres.length} Selected` : 'Select Genres' }}
                  </span>
                  <div class="flex items-center gap-1.5 text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'genre' }]">
                      <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                    </svg>
                  </div>
                </button>

                <!-- Genres Menu with Zoom Transition -->
                <Transition name="zoom-top">
                  <div v-if="activeDropdown === 'genre'" @click.stop class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full min-w-[160px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                    <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                    <div class="no-scrollbar grid max-h-64 grid-cols-1 gap-1 overflow-y-auto">
                      <label v-for="genre in availableGenres" :key="genre" class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-white/5">
                        <input 
                          type="checkbox" 
                          :value="genre" 
                          v-model="filters.genres"
                          class="custom-checkbox size-3.5 rounded border-gray-600 bg-gray-800 text-primary"
                        />
                        <span class="text-xs font-medium text-gray-400 transition-colors group-hover:text-white">{{ genre }}</span>
                      </label>
                    </div>
                  </div>
                </Transition>
              </div>

              <!-- Action Bar (Mobile/Tablet View) -->
              <div class="flex h-full w-full flex-col justify-end xl:hidden">
                <div class="flex h-full w-full flex-col justify-end">
                  <div class="grid grid-cols-3 px-1 pb-1.5 text-center text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                    <span>Apply</span>
                    <span>Reset</span>
                    <span>Expand</span>
                  </div>
                  <div class="flex h-[42px] w-full items-center divide-x divide-white/10 overflow-hidden rounded-md border border-white/10 bg-[#141414]/80 shadow-sm backdrop-blur-md">
                    <button @click="closeAllDropdowns" class="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95" aria-label="Apply">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon size-4">
                        <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path>
                      </svg>
                    </button>
                    <button @click="resetFilters" class="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95" aria-label="Reset">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon size-4">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                      </svg>
                    </button>
                    <button @click="isExpanded = !isExpanded" class="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95" aria-label="Expand">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :class="['lucide-icon size-4 transition-transform duration-300', { 'rotate-180': isExpanded }]">
                        <path d="m6 9 6 6 6-6"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <!-- Secondary Filters Expandable Section -->
            <div class="secondary-expand xl:!contents" v-show="isExpanded">
              <div class="grid grid-cols-2 gap-x-3 gap-y-4 border-t border-white/5 pt-4 sm:grid-cols-3 lg:grid-cols-4 xl:contents">
                
                <!-- Year Filter -->
                <div class="relative w-full" ref="yearRef">
                  <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Year</div>
                  <button 
                    type="button" 
                    @click.stop="toggleDropdown('year')"
                    class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                  >
                    <span class="line-clamp-1">{{ filters.year || 'Any year' }}</span>
                    <div class="flex items-center gap-1.5 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'year' }]">
                        <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                      </svg>
                    </div>
                  </button>

                  <!-- Year Menu with Zoom Transition -->
                  <Transition name="zoom-top">
                    <div v-if="activeDropdown === 'year'" @click.stop class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full min-w-[160px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-3 shadow-2xl backdrop-blur-3xl">
                      <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      <input 
                        type="text" 
                        v-model="yearSearch"
                        placeholder="Search year..." 
                        class="search-input mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none"
                      />
                      <div class="no-scrollbar grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                        <button 
                          v-for="yr in filteredYears" 
                          :key="yr" 
                          type="button" 
                          @click="selectYear(yr)"
                          :class="['rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-white/10 hover:text-white', filters.year === yr ? 'bg-primary/10 text-primary' : 'text-gray-400']"
                        >
                          {{ yr }}
                        </button>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Status Filter -->
                <div class="relative w-full" ref="statusRef">
                  <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Status</div>
                  <button 
                    type="button" 
                    @click.stop="toggleDropdown('status')"
                    class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                  >
                    <span class="line-clamp-1">{{ filters.status }}</span>
                    <div class="flex items-center gap-1.5 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'status' }]">
                        <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                      </svg>
                    </div>
                  </button>

                  <!-- Status Menu with Zoom Transition -->
                  <Transition name="zoom-top">
                    <div v-if="activeDropdown === 'status'" @click.stop class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                      <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      <button 
                        v-for="status in statusOptions" 
                        :key="status" 
                        type="button" 
                        @click="selectStatus(status)"
                        :class="['w-full rounded-md px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-white/10 hover:text-white', filters.status === status ? 'bg-primary/10 text-primary' : 'text-gray-400']"
                      >
                        {{ status }}
                      </button>
                    </div>
                  </Transition>
                </div>

                <!-- Format Filter -->
                <div class="relative w-full" ref="formatRef">
                  <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Format</div>
                  <button 
                    type="button" 
                    @click.stop="toggleDropdown('format')"
                    class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                  >
                    <span class="line-clamp-1">{{ filters.format }}</span>
                    <div class="flex items-center gap-1.5 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'format' }]">
                        <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                      </svg>
                    </div>
                  </button>

                  <!-- Format Menu with Zoom Transition -->
                  <Transition name="zoom-top">
                    <div v-if="activeDropdown === 'format'" @click.stop class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                      <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      <button 
                        v-for="fmt in formatOptions" 
                        :key="fmt" 
                        type="button" 
                        @click="selectFormat(fmt)"
                        :class="['w-full rounded-md px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-white/10 hover:text-white', filters.format === fmt ? 'bg-primary/10 text-primary' : 'text-gray-400']"
                      >
                        {{ fmt }}
                      </button>
                    </div>
                  </Transition>
                </div>

                <!-- Sort Filter -->
                <div class="relative w-full" ref="sortRef">
                  <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Sort by</div>
                  <button 
                    type="button" 
                    @click.stop="toggleDropdown('sort')"
                    class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                  >
                    <span class="line-clamp-1">{{ filters.sort }}</span>
                    <div class="flex items-center gap-1.5 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'sort' }]">
                        <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                      </svg>
                    </div>
                  </button>

                  <!-- Sort Menu with Zoom Transition -->
                  <Transition name="zoom-top">
                    <div v-if="activeDropdown === 'sort'" @click.stop class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                      <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      <button 
                        v-for="sort in sortOptions" 
                        :key="sort" 
                        type="button" 
                        @click="selectSort(sort)"
                        :class="['w-full rounded-md px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-white/10 hover:text-white', filters.sort === sort ? 'bg-primary/10 text-primary' : 'text-gray-400']"
                      >
                        {{ sort }}
                      </button>
                    </div>
                  </Transition>
                </div>

              </div>
            </div>

          </div>
        </div>

        <!-- Continue Watching Content -->
        <div class="px-4 pt-6 pb-8">
          <template v-if="!loggedIn && !loadingData">
            <!-- Unauthenticated State -->
            <div class="flex flex-col items-center justify-center py-24 sm:py-32">
              <div class="animate-fade-in-up flex flex-col items-center text-center">
                <div class="relative mb-6 h-20 w-20">
                  <div class="absolute inset-0 rotate-6 rounded-md bg-gradient-to-tr from-primary/20 to-primary/5"></div>
                  <div class="absolute inset-0 flex -rotate-3 items-center justify-center rounded-md border border-white/10 bg-[#141414] shadow-lg transition-transform duration-300 hover:rotate-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon h-8 w-8 text-primary shadow-sm">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </div>
                </div>
                <h3 class="mb-2 text-xl font-black tracking-tight text-white">Sign In Required</h3>
                <p class="mb-6 max-w-[280px] text-sm leading-relaxed font-medium text-gray-400">
                  Connect your AniList account to manage your continue watching list.
                </p>
                <button @click="openLoginModal()" class="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Sign in with AniList
                </button>
              </div>
            </div>
          </template>
          
          <template v-else>
            <div class="animate-fade-in-up mb-4 text-sm font-medium text-gray-400" style="animation-delay: 300ms;">
              <span class="font-bold text-white tabular-nums shadow-sm">{{ filteredAnime.length }}</span> anime in progress
            </div>

            <!-- Loading State -->
            <div v-if="loadingData" class="flex items-center justify-center py-24">
              <svg class="h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredAnime.length === 0" class="flex flex-col items-center justify-center py-24 sm:py-32">
              <div class="animate-fade-in-up flex flex-col items-center text-center">
                <div class="relative mb-6 h-20 w-20">
                  <div class="absolute inset-0 rotate-6 rounded-md bg-gradient-to-tr from-primary/20 to-primary/5"></div>
                  <div class="absolute inset-0 flex -rotate-3 items-center justify-center rounded-md border border-white/10 bg-[#141414] shadow-lg transition-transform duration-300 hover:rotate-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon h-8 w-8 text-primary shadow-sm">
                      <path d="M10 2v8l3-3 3 3V2"></path>
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"></path>
                    </svg>
                  </div>
                </div>
                <h3 class="mb-2 text-xl font-black tracking-tight text-white">No Anime Found</h3>
                <p class="mb-6 max-w-[280px] text-sm leading-relaxed font-medium text-gray-400">
                  Your continue watching list is empty. Time to start exploring!
                </p>
              </div>
            </div>
            
            <!-- Anime Grid -->
            <div v-if="filteredAnime.length > 0" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 transition-opacity duration-500">
              <div 
                v-for="(anime, index) in filteredAnime" 
                :key="anime.id"
                class="group animate-fade-in-up relative mb-6"
                :style="{ animationDelay: `${index * 0.04}s` }"
              >
                <a :href="anime.watchUrl" class="group block transition-transform duration-200 hover:-translate-y-1">
                  <div class="relative mb-3 aspect-[3/4] w-full transition-transform duration-500">
                    
                    <!-- Card Image Front -->
                    <div class="absolute inset-0 overflow-hidden rounded-lg bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                      <img 
                        loading="lazy" 
                        decoding="async" 
                        :src="anime.cover" 
                        :alt="anime.title" 
                        class="h-full w-full object-cover transition-opacity duration-300"
                      >
                      
                      <!-- Top Left Badge -->
                      <span class="absolute top-2 left-2 flex h-5 items-center gap-1.5 rounded-full border border-white/10 bg-black/80 px-1.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        <div class="flex items-center gap-1 border-r border-white/10 pr-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="fill-amber-400 text-amber-400">
                            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
                          </svg>
                          <span class="translate-y-[0.5px] tabular-nums">{{ anime.rating.toFixed(1) }}</span>
                        </div>
                        <span class="translate-y-[0.5px] text-zinc-300 uppercase">{{ anime.ageRating }}</span>
                      </span>

                      <!-- Time overlay -->
                      <div class="absolute bottom-[7px] left-2 z-10 rounded border border-white/10 bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums backdrop-blur-sm">
                        {{ anime.currentTime }} / {{ anime.totalTime }}
                      </div>

                      <!-- Episode overlay -->
                      <div class="absolute right-2 bottom-2 z-10 flex h-5 items-center rounded border border-white/10 bg-black/80 px-1.5 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-sm">
                        <span>EP</span> <span class="ml-0.5 tabular-nums">{{ anime.episode }}</span>
                      </div>

                      <!-- Progress Bar -->
                      <div class="absolute right-0 bottom-0 left-0 h-[3px] bg-white/10">
                        <div class="h-full bg-primary transition-[width] duration-500" :style="{ width: `${anime.progressPercentage}%` }"></div>
                      </div>

                      <!-- Play Hover Overlay -->
                      <div class="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <div class="flex size-12 scale-80 items-center justify-center rounded-full bg-white/90 text-black transition-transform duration-200 group-hover:scale-100">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="fill-current"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>
                        </div>
                      </div>
                    </div>

                  </div>

                  <!-- Meta Details -->
                  <div class="px-0.5">
                    <div class="flex items-center gap-2">
                      <span class="size-1.5 shrink-0 rounded-full bg-green-500"></span>
                      <div class="min-w-0 flex-1 overflow-hidden">
                        <h3 class="py-1 text-[13px] font-medium whitespace-nowrap text-white truncate">
                          {{ anime.title }}
                        </h3>
                      </div>
                    </div>
                    <p class="mt-0.5 text-[11px] text-gray-400">
                      {{ anime.type }} · {{ anime.duration }}
                    </p>
                  </div>
                </a>

                <!-- Delete Action Button -->
                <button 
                  @click.stop="removeAnime(anime.id, anime.mediaType)"
                  class="absolute top-1.5 right-1.5 z-40 flex h-7 w-7 items-center justify-center rounded-md border border-white/5 bg-[#0a0a0a]/80 text-white/50 opacity-100 shadow-sm backdrop-blur-md transition-all hover:border-primary/50 hover:bg-primary/90 hover:text-white focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" 
                  aria-label="Remove from continue watching"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>

              </div>
            </div>
          </template>
        </div>

      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useAniListClient } from '~/composables/useAniListClient'

const { loggedIn, openLoginModal, init: initAuth } = useAuth()
const loadingData = ref(true)

const heroBanner = ref('https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg')
const isExpanded = ref(false)
const activeDropdown = ref(null)
const yearSearch = ref('')

// Filter State
const filters = reactive({
  search: '',
  sort: 'Last Watched',
  genres: [],
  year: '',
  status: 'Any Status',
  format: 'Any Format',
  season: 'Any Season'
})

// Menu Options derived from markup
const availableGenres = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 
  'Ecchi', 'Harem', 'Isekai', 'Mecha', 'Music', 'Psychological', 'School'
]

const yearsList = Array.from({ length: 2026 - 1977 + 1 }, (_, i) => (2026 - i).toString())

const sortOptions = ['Last Watched', 'Progress', 'Title', 'Score', 'Popularity']
const statusOptions = ['Any Status', 'Finished', 'Releasing', 'Not Yet Released', 'Cancelled']
const formatOptions = ['Any Format', 'TV', 'Movie', 'Special', 'OVA', 'ONA', 'Music']
const seasonOptions = ['Any Season', 'Winter', 'Spring', 'Summer', 'Fall']

// Sample Data
const animeList = ref([])

onMounted(async () => {
  await initAuth()
  const { getLocalData } = useProgressSync()
  const localData = getLocalData()
  let anilistEntries = []

  if (loggedIn.value) {
    try {
      const resp = await useAniListClient().fetchWatchlist()
      // fetchWatchlist returns array directly
      anilistEntries = (Array.isArray(resp) ? resp : []).filter(e => e.listStatus === 'CURRENT')
    } catch (e) {
      console.error(e)
    }
  }
  const localEntries = Object.values(localData).map(item => ({
    id: item.id,
    title: item.extraData?.title || 'Unknown',
    cover: item.extraData?.cover || '',
    bannerImage: item.extraData?.bannerImage || '',
    format: item.extraData?.format || (item.type === 'anime' ? 'TV' : 'MANGA'),
    mediaStatus: item.extraData?.mediaStatus || 'UNKNOWN',
    episodes: item.extraData?.episodes || null,
    totalEpisodes: item.extraData?.episodes || null,
    genres: item.extraData?.genres || [],
    meanScore: item.extraData?.meanScore || 0,
    seasonYear: item.extraData?.seasonYear || null,
    season: item.extraData?.season || null,
    progress: item.progress || 0,
    currentEpisode: item.currentEpisode,
    time: item.time || 0,
    duration: item.duration || 0,
    updatedAt: Math.floor(item.updatedAt / 1000) || 0,
    type: item.type // 'anime' or 'manga'
  }))

  // Merge entries (Anilist takes precedence if logged in, but preserve local time/episode)
  const mergedMap = new Map()
  localEntries.forEach(entry => mergedMap.set(entry.id, entry))
  anilistEntries.forEach(entry => {
    const existing = mergedMap.get(entry.id)
    mergedMap.set(entry.id, { 
      ...entry, 
      type: 'anime',
      time: existing?.time || 0,
      duration: existing?.duration || 0,
      currentEpisode: existing?.currentEpisode
    })
  })

  const mergedEntries = Array.from(mergedMap.values())
    .filter(entry => entry.type === 'anime')
    .sort((a, b) => b.updatedAt - a.updatedAt)

  animeList.value = mergedEntries.map(entry => {
    const total = entry.totalEpisodes || entry.episodes || 0
    const prog = entry.progress || 0
    const isManga = entry.type === 'manga'
    const currentEp = entry.currentEpisode || (prog + 1)
    
    let percentage = total > 0 ? Math.min((prog / total) * 100, 100) : (prog > 0 ? 50 : 0)
    let currentTimeStr = isManga ? `${prog} ch` : '0:00'
    let totalTimeStr = isManga ? `${total || '?'} ch` : '24:00'
    
    if (!isManga && entry.time >= 0) {
      const m = Math.floor(entry.time / 60)
      const s = Math.floor(entry.time % 60).toString().padStart(2, '0')
      currentTimeStr = `${m}:${s}`
      
      if (entry.duration > 0) {
        const d_m = Math.floor(entry.duration / 60)
        const d_s = Math.floor(entry.duration % 60).toString().padStart(2, '0')
        totalTimeStr = `${d_m}:${d_s}`
        percentage = (entry.time / entry.duration) * 100
      } else if (entry.duration === undefined || entry.duration === 0) {
        // Fallback for duration if API provided an episode duration in mins but no local duration was recorded yet
        totalTimeStr = '24:00'
      }
    }
    
    return {
      ...entry,
      watchUrl: isManga ? `/manga/${entry.id}/${entry.extraData?.chId || entry.ch || prog}` : `/anime/${entry.id}/${currentEp}`,
      rating: entry.meanScore / 10 || 0,
      ageRating: 'PG-13',
      currentTime: currentTimeStr,
      totalTime: totalTimeStr,
      episode: isManga ? prog : currentEp,
      progressPercentage: percentage,
      type: entry.format,
      mediaType: entry.type, // 'anime' or 'manga' for delete
      year: entry.seasonYear ? String(entry.seasonYear) : '?',
      status: entry.mediaStatus,
      season: entry.season ? entry.season.charAt(0).toUpperCase() + entry.season.slice(1).toLowerCase() : '?'
    }
  })

  loadingData.value = false
})

// Dropdown Handlers
const toggleDropdown = (menuName) => {
  activeDropdown.value = activeDropdown.value === menuName ? null : menuName
}

const closeAllDropdowns = () => {
  activeDropdown.value = null
}

// Click outside handling for dropdowns
const handleClickOutside = (e) => {
  if (activeDropdown.value) {
    const isDropdownButton = e.target.closest('.dropdown-button')
    const isDropdownMenu = e.target.closest('.dropdown-menu')
    if (!isDropdownButton && !isDropdownMenu) {
      closeAllDropdowns()
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const selectSort = (val) => {
  filters.sort = val
  closeAllDropdowns()
}

const selectYear = (val) => {
  filters.year = filters.year === val ? '' : val
  closeAllDropdowns()
}

const selectStatus = (val) => {
  filters.status = val
  closeAllDropdowns()
}

const selectFormat = (val) => {
  filters.format = val
  closeAllDropdowns()
}

const selectSeason = (val) => {
  filters.season = val
  closeAllDropdowns()
}

// Year Search Filter
const filteredYears = computed(() => {
  if (!yearSearch.value) return yearsList
  return yearsList.filter(y => y.includes(yearSearch.value))
})

// Filtered & Sorted Grid Output
const filteredAnime = computed(() => {
  return animeList.value
    .filter(anime => {
      // Search Title
      if (filters.search && !anime.title.toLowerCase().includes(filters.search.toLowerCase())) return false
      
      // Filter Genres
      if (filters.genres.length > 0 && !filters.genres.some(g => anime.genres.includes(g))) return false
      
      // Filter Year
      if (filters.year && anime.year !== filters.year) return false

      // Filter Status
      if (filters.status !== 'Any Status' && anime.status !== filters.status) return false

      // Filter Format
      if (filters.format !== 'Any Format' && anime.type !== filters.format) return false

      // Filter Season
      if (filters.season !== 'Any Season' && anime.season !== filters.season) return false

      return true
    })
    .sort((a, b) => {
      if (filters.sort === 'Title') return a.title.localeCompare(b.title)
      if (filters.sort === 'Progress') return b.progress - a.progress
      if (filters.sort === 'Score') return b.rating - a.rating
      return 0
    })
})

const removeAnime = async (id, type = 'anime') => {
  animeList.value = animeList.value.filter(anime => anime.id !== id)
  const { pauseProgress } = useProgressSync()
  await pauseProgress({ type, id })
}

const resetFilters = () => {
  filters.search = ''
  filters.sort = 'Last Watched'
  filters.genres = []
  filters.year = ''
  filters.status = 'Any Status'
  filters.format = 'Any Format'
  filters.season = 'Any Season'
  yearSearch.value = ''
  isExpanded.value = false
  closeAllDropdowns()
}
</script>

<style scoped>
/* Scrollbar cleanup */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Zoom Transition from Top of Element */
.zoom-top-enter-active,
.zoom-top-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top center;
}

.zoom-top-enter-from,
.zoom-top-leave-to {
  opacity: 0;
  transform: scaleY(0.85) scaleX(0.95) translateY(-6px);
}

.zoom-top-enter-to,
.zoom-top-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Keyframe Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Custom Animation Utility Classes */
.animate-fade-in-up {
  animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

/* Background Blur Layer Adjustments */
.hero-blur-layer {
  filter: blur(20px);
  transform: scale(1.1);
}
</style>