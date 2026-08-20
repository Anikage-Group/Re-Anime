<template>
  <main class="flex-1 pt-16 pb-0">
    <div class="min-h-screen bg-[#070707] text-white">
      
      <!-- Hero Header -->
      <div class="relative -mt-16 h-56 w-full overflow-hidden border-b border-white/5 bg-[#0a0a0a] pt-16 sm:h-68">
        <div class="pointer-events-none absolute inset-0 z-0">
          <div class="hero-blur-layer absolute inset-0 bg-cover bg-center opacity-20"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/60 to-transparent"></div>
        </div>
        
        <div 
          class="animate-fade-in-up absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-7xl items-end justify-center p-4 sm:p-6 md:px-8"
          style="animation-delay: 100ms;"
        >
          <div class="text-center">
            <h1 class="mb-1 text-3xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl">Watchlist</h1>
            <p class="text-xs font-medium text-gray-400 sm:text-sm">Manage and organize your anime journey</p>
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
                    v-model="searchQuery"
                    class="search-input block w-full rounded-lg border border-white/5 bg-[#141414] px-4 py-2.5 ps-9 text-sm font-medium text-gray-300 placeholder-gray-500 transition-colors focus:border-primary/50 focus:outline-none" 
                    placeholder="Type to search..." 
                    autocomplete="off" 
                    type="search"
                  />
                </form>
              </div>

              <!-- Folder Dropdown -->
              <div class="relative w-full" ref="folderRef">
                <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Folder</div>
                <button 
                  type="button" 
                  @click="toggleDropdown('folder')"
                  class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                >
                  <span class="line-clamp-1">{{ selectedFolder }}</span>
                  <div class="flex items-center gap-1.5 text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'folder' }]">
                      <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                    </svg>
                  </div>
                </button>

                <!-- Folder Menu with Zoom Transition -->
                <Transition name="zoom-top">
                  <div v-if="activeDropdown === 'folder'" class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                    <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                    <button 
                      v-for="folder in folders" 
                      :key="folder.name" 
                      type="button" 
                      @click="selectFolder(folder.name)"
                      :class="['flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-white/10 hover:text-white', selectedFolder === folder.name ? 'bg-primary/10 text-primary' : 'text-gray-400']"
                    >
                      <svg v-if="folder.icon === 'play'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon size-3.5 text-primary">
                        <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>
                      </svg>
                      <svg v-else-if="folder.icon === 'clock'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon size-3.5 text-amber-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                      </svg>
                      <svg v-else-if="folder.icon === 'check'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon size-3.5 text-green-500">
                        <path d="M20 6 9 17l-5-5"></path>
                      </svg>
                      <svg v-else-if="folder.icon === 'pause'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon size-3.5 text-purple-500">
                        <rect x="14" y="3" width="5" height="18" rx="1"></rect>
                        <rect x="5" y="3" width="5" height="18" rx="1"></rect>
                      </svg>
                      <svg v-else-if="folder.icon === 'x'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon size-3.5 text-red-500">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                      </svg>
                      {{ folder.name }}
                    </button>
                  </div>
                </Transition>
              </div>

              <!-- Genres Dropdown -->
              <div class="relative w-full" ref="genresRef">
                <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Genres</div>
                <button 
                  type="button" 
                  @click="toggleDropdown('genres')"
                  :class="[
                    'dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]',
                    selectedGenres.length ? 'border-primary/30 bg-primary/5' : ''
                  ]"
                >
                  <span class="line-clamp-1">
                    {{ selectedGenres.length ? selectedGenres.join(', ') : 'Select Genres' }}
                  </span>
                  <div class="flex items-center gap-1.5 text-white/50">
                    <button 
                      v-if="selectedGenres.length" 
                      type="button" 
                      aria-label="Clear" 
                      @click.stop="clearGenres" 
                      class="p-0.5 transition-colors hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon size-[13px]">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                      </svg>
                    </button>
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'genres' }]">
                      <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                    </svg>
                  </div>
                </button>

                <!-- Genres Menu with Zoom Transition -->
                <Transition name="zoom-top">
                  <div v-if="activeDropdown === 'genres'" class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full min-w-[160px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                    <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                    <div class="no-scrollbar grid max-h-64 grid-cols-1 gap-1 overflow-y-auto">
                      <label v-for="genre in allGenres" :key="genre" class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-white/5">
                        <input 
                          type="checkbox" 
                          :value="genre" 
                          v-model="selectedGenres"
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
                    <button class="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95" aria-label="Apply">
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
                    @click="toggleDropdown('year')"
                    class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                  >
                    <span class="line-clamp-1">{{ selectedYear }}</span>
                    <div class="flex items-center gap-1.5 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'year' }]">
                        <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                      </svg>
                    </div>
                  </button>

                  <!-- Year Menu with Zoom Transition -->
                  <Transition name="zoom-top">
                    <div v-if="activeDropdown === 'year'" class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full min-w-[160px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-3 shadow-2xl backdrop-blur-3xl">
                      <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      <input 
                        type="text" 
                        v-model="yearSearchQuery"
                        placeholder="Search year..." 
                        class="search-input mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none"
                      />
                      <div class="no-scrollbar grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                        <button 
                          v-for="year in filteredYears" 
                          :key="year" 
                          type="button" 
                          @click="selectYear(year)"
                          :class="['rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-white/10 hover:text-white', selectedYear === String(year) ? 'bg-primary/10 text-primary' : 'text-gray-400']"
                        >
                          {{ year }}
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
                    @click="toggleDropdown('status')"
                    class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                  >
                    <span class="line-clamp-1">{{ selectedStatus }}</span>
                    <div class="flex items-center gap-1.5 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'status' }]">
                        <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                      </svg>
                    </div>
                  </button>

                  <!-- Status Menu with Zoom Transition -->
                  <Transition name="zoom-top">
                    <div v-if="activeDropdown === 'status'" class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                      <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      <button 
                        v-for="status in statusOptions" 
                        :key="status" 
                        type="button" 
                        @click="selectStatus(status)"
                        :class="['w-full rounded-md px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-white/10 hover:text-white', selectedStatus === status ? 'bg-primary/10 text-primary' : 'text-gray-400']"
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
                    @click="toggleDropdown('format')"
                    class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                  >
                    <span class="line-clamp-1">{{ selectedFormat }}</span>
                    <div class="flex items-center gap-1.5 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'format' }]">
                        <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                      </svg>
                    </div>
                  </button>

                  <!-- Format Menu with Zoom Transition -->
                  <Transition name="zoom-top">
                    <div v-if="activeDropdown === 'format'" class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                      <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      <button 
                        v-for="fmt in formatOptions" 
                        :key="fmt" 
                        type="button" 
                        @click="selectFormat(fmt)"
                        :class="['w-full rounded-md px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-white/10 hover:text-white', selectedFormat === fmt ? 'bg-primary/10 text-primary' : 'text-gray-400']"
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
                    @click="toggleDropdown('sort')"
                    class="dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a]"
                  >
                    <span class="line-clamp-1">{{ selectedSort }}</span>
                    <div class="flex items-center gap-1.5 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" :class="['transition-transform duration-300', { 'rotate-180': activeDropdown === 'sort' }]">
                        <path fill="currentColor" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496"></path>
                      </svg>
                    </div>
                  </button>

                  <!-- Sort Menu with Zoom Transition -->
                  <Transition name="zoom-top">
                    <div v-if="activeDropdown === 'sort'" class="dropdown-menu absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]/98 p-2 shadow-2xl backdrop-blur-3xl">
                      <div class="absolute top-0 right-0 left-0 z-10 h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>
                      <button 
                        v-for="sort in sortOptions" 
                        :key="sort" 
                        type="button" 
                        @click="selectSort(sort)"
                        :class="['w-full rounded-md px-2 py-1 text-left text-xs font-medium transition-colors hover:bg-white/10 hover:text-white', selectedSort === sort ? 'bg-primary/10 text-primary' : 'text-gray-400']"
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

        <!-- Watchlist Content -->
        <div class="px-4 pt-6 pb-8">
          <template v-if="!loggedIn && !loadingData && animeList.length === 0">
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
                  Connect your AniList account to manage your watchlist.
                </p>
                <button @click="login()" class="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Sign in with AniList
                </button>
              </div>
            </div>
          </template>
          
          <template v-else>
            <div class="animate-fade-in-up mb-4 text-sm font-medium text-gray-400" style="animation-delay: 300ms;">
              <span class="font-bold text-white tabular-nums shadow-sm">{{ filteredAnimeList.length }}</span> anime in watchlist
            </div>

            <!-- Loading State -->
            <div v-if="loadingData" class="flex items-center justify-center py-24">
              <svg class="h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <!-- Empty State -->
            <div v-if="animeList.length === 0 && !loadingData" class="flex flex-col items-center justify-center py-24 sm:py-32">
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
                  Your watchlist is empty. Time to start exploring!
                </p>
              </div>
            </div>
            
            <!-- Anime Grid -->
            <div v-if="filteredAnimeList.length > 0" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 transition-opacity duration-500">
              <div
                v-for="anime in filteredAnimeList"
                :key="anime.id"
                class="group animate-fade-in-up relative mb-6 c-1ttzn5w"
                style="animation-delay: 0s;"
              >
                <div class="group animate-fade-in-up relative mb-6 c-1ttzn5w" style="animation-delay: 0s;">
                  <MediaCard
                    :media="anime"
                    :is-flipped="flippedId === anime.id"
                    @toggle-flip="toggleFlip"
                  />
                  <button @click.prevent="removeFromWatchlist(anime)" class="absolute right-2 bottom-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/5 bg-black/70 text-white/40 opacity-0 shadow-sm backdrop-blur-md transition-all group-hover:opacity-100 hover:border-red-500/50 hover:bg-red-500/90 hover:text-white focus:opacity-100 disabled:opacity-50 c-1ttzn5w" aria-label="Remove from watchlist">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-trash-2 size-3"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty Filter State -->
            <div v-else-if="filteredAnimeList.length === 0 && animeList.length > 0 && !loadingData" class="flex flex-col items-center justify-center py-24">
              <h3 class="mb-2 text-xl font-bold text-white">No matches found</h3>
              <p class="text-sm text-gray-400">Try adjusting your filters.</p>
              <button @click="resetFilters" class="mt-4 rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors">Clear Filters</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useWatchlist } from '~/composables/useWatchlist'

// State variables
const { loggedIn, login, init: initAuth } = useAuth()
const { removeFromWatchlist: apiRemoveFromWatchlist, hydrateRemote, entries } = useWatchlist()
const loadingData = ref(true)
const searchQuery = ref('')
const selectedFolder = ref('All Folders')
const selectedGenres = ref([])
const selectedYear = ref('Any year')
const yearSearchQuery = ref('')
const selectedStatus = ref('Any Status')
const selectedFormat = ref('Any Format')
const selectedSort = ref('Updated')

const isExpanded = ref(true)
const activeDropdown = ref(null)
const animeList = ref([])

// Dropdown options
const folders = [
  { name: 'All Folders', icon: null },
  { name: 'Watching', icon: 'play' },
  { name: 'Planning', icon: 'clock' },
  { name: 'Completed', icon: 'check' },
  { name: 'Paused', icon: 'pause' },
  { name: 'Dropped', icon: 'x' }
]

const allGenres = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports',
  'Supernatural', 'Thriller', 'Ecchi', 'Harem', 'Isekai',
  'Mecha', 'Music', 'Psychological', 'School'
]

const years = Array.from({ length: 2026 - 1977 + 1 }, (_, i) => 2026 - i)

const statusOptions = ['Any Status', 'Finished', 'Releasing', 'Not Yet Released', 'Cancelled']
const formatOptions = ['Any Format', 'TV', 'Movie', 'Special', 'OVA', 'ONA', 'Music']
const sortOptions = ['Updated', 'Score', 'Popularity']

// Computed Properties
const filteredYears = computed(() => {
  if (!yearSearchQuery.value) return years
  return years.filter(y => String(y).includes(yearSearchQuery.value))
})

const filteredAnimeList = computed(() => {
  let list = animeList.value;

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(a => a.title.toLowerCase().includes(q));
  }

  // Folder
  if (selectedFolder.value !== 'All Folders') {
    const statusMap = {
      'Watching': 'watching',
      'Planning': 'planning',
      'Completed': 'completed',
      'Paused': 'paused',
      'Dropped': 'dropped'
    };
    const targetStatus = statusMap[selectedFolder.value];
    if (targetStatus) {
      list = list.filter(a => a.watchlistStatus === targetStatus);
    }
  }

  // Genres
  if (selectedGenres.value.length > 0) {
    list = list.filter(a => selectedGenres.value.every(g => a.genres?.includes(g)));
  }

  // Year
  if (selectedYear.value !== 'Any year') {
    const targetYear = parseInt(selectedYear.value);
    list = list.filter(a => a.seasonYear === targetYear);
  }

  // Status
  if (selectedStatus.value !== 'Any Status') {
    const mediaStatusMap = {
      'Finished': 'FINISHED',
      'Releasing': 'RELEASING',
      'Not Yet Released': 'NOT_YET_RELEASED',
      'Cancelled': 'CANCELLED'
    };
    const targetMediaStatus = mediaStatusMap[selectedStatus.value];
    if (targetMediaStatus) {
      list = list.filter(a => a.mediaStatus === targetMediaStatus);
    }
  }

  // Format
  if (selectedFormat.value !== 'Any Format') {
    const fmt = selectedFormat.value === 'Movie' ? 'MOVIE' : selectedFormat.value.toUpperCase();
    list = list.filter(a => a.format === fmt);
  }

  // Sort
  if (selectedSort.value === 'Updated') {
    list = [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } else if (selectedSort.value === 'Score') {
    list = [...list].sort((a, b) => (b.meanScore || 0) - (a.meanScore || 0));
  } else if (selectedSort.value === 'Popularity') {
    list = [...list].sort((a, b) => (b.meanScore || 0) - (a.meanScore || 0)); // fallback to score
  }

  return list;
})

// Handlers
const toggleDropdown = (name) => {
  activeDropdown.value = activeDropdown.value === name ? null : name
}

const clearGenres = () => {
  selectedGenres.value = []
}

const selectFolder = (name) => {
  selectedFolder.value = name
  activeDropdown.value = null
}

const selectYear = (year) => {
  selectedYear.value = String(year)
  activeDropdown.value = null
}

const selectStatus = (status) => {
  selectedStatus.value = status
  activeDropdown.value = null
}

const selectFormat = (fmt) => {
  selectedFormat.value = fmt
  activeDropdown.value = null
}

const selectSort = (sort) => {
  selectedSort.value = sort
  activeDropdown.value = null
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedFolder.value = 'All Folders'
  selectedGenres.value = []
  selectedYear.value = 'Any year'
  yearSearchQuery.value = ''
  selectedStatus.value = 'Any Status'
  selectedFormat.value = 'Any Format'
  selectedSort.value = 'Updated'
}

// Click outside handling
const folderRef = ref(null)
const genresRef = ref(null)
const yearRef = ref(null)
const statusRef = ref(null)
const formatRef = ref(null)
const sortRef = ref(null)

const handleClickOutside = (event) => {
  const refs = [folderRef, genresRef, yearRef, statusRef, formatRef, sortRef]
  const isInside = refs.some(r => r.value && r.value.contains(event.target))
  if (!isInside) {
    activeDropdown.value = null
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  await initAuth()
  try {
      await hydrateRemote()
      animeList.value = Object.values(entries.value)
        .filter(entry => String(entry.type || '').toUpperCase() !== 'MANGA' && !entry.isManga)
        .map(entry => {
        const statusMap = {
          'CURRENT': 'watching',
          'PLANNING': 'planning',
          'COMPLETED': 'completed',
          'PAUSED': 'paused',
          'DROPPED': 'dropped'
        };
        return {
          ...entry,
          href: `/anime/${entry.id}`,
          watchlistStatus: statusMap[entry.listStatus] || entry.status || entry.listStatus,
          format: entry.format + (entry.genres && entry.genres.length ? ' · ' + entry.genres.slice(0, 2).join(' · ') : ''),
          score: entry.score ? String(entry.score) : undefined,
          ageRating: entry.status || (entry.listStatus === 'CURRENT' ? 'Watching' : entry.listStatus === 'PLANNING' ? 'Planning' : entry.listStatus === 'COMPLETED' ? 'Completed' : entry.listStatus === 'PAUSED' ? 'Paused' : entry.listStatus === 'DROPPED' ? 'Dropped' : 'Unknown'),
          totalEpisodes: entry.episodes,
          subEpisodes: entry.progress
        }
      })
  } catch (e) {
    console.error(e)
  }
  loadingData.value = false
})

const flippedId = ref(null)
function toggleFlip(id) {
  flippedId.value = flippedId.value === id ? null : id
}

async function removeFromWatchlist(anime) {
  try {
    await apiRemoveFromWatchlist(anime)
    // locally remove from the list
    animeList.value = animeList.value.filter(a => a.id !== anime.id)
  } catch(e) {}
}

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
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
</style>
