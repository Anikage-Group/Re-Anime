<template>
  <Teleport to="body">
  <div
    class="rpage-root"
    ref="readerRoot"
    :class="{ 'is-fullscreen': isFullscreen, 'rpage-root--flow': settings.direction === 'ttb' && !loadingManga && !mangaError }"
  >
    <!-- Loading manga -->
    <div v-if="loadingManga" class="rpage-state">
      <div class="rpage-spinner" aria-hidden="true"></div>
      <p>Loading manga…</p>
    </div>
    <!-- Manga failed to load -->
    <div v-else-if="mangaError" class="rpage-state">
      <p>{{ mangaError }}</p>
      <button type="button" class="rpage-retry" @click="loadManga">Try again</button>
    </div>
    <!-- Chapter number doesn't exist -->
    <div v-else-if="!currentGroup" class="rpage-state">
      <p>Chapter {{ chapterNum }} couldn't be found for {{ manga?.title }}.</p>
      <NuxtLink :to="`/manga/${mangaId}`" class="rpage-retry">Back to manga</NuxtLink>
    </div>
    <template v-else>
      <!-- Reader viewport -->
      <div 
        class="rpage-viewport" 
        ref="readerViewport"
        :class="{ 'rpage-viewport--scrollable': settings.direction === 'ttb' }"
        @click="onViewportClick" 
        @mousedown="onDragStart"
        @mousemove="onDragMove"
        @mouseup="onDragEnd"
        @mouseleave="onDragEnd"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div v-if="loadingPages" class="rpage-state rpage-state--overlay">
          <div class="rpage-spinner" aria-hidden="true"></div>
          <p>Loading pages…</p>
        </div>
        <div v-else-if="pagesError" class="rpage-state rpage-state--overlay">
          <p>{{ pagesError }}</p>
          <button type="button" class="rpage-retry" @click="loadPages">Try again</button>
        </div>
        <div v-else-if="!pages.length" class="rpage-state rpage-state--overlay">
          <p>No pages found for this chapter.</p>
        </div>
        <!-- Continuous top-to-bottom mode -->
        <div v-else-if="settings.direction === 'ttb'" class="rpage-stage rpage-stage--ttb" :style="{ zoom: zoomLevel }">
          <div
            v-for="(src, i) in pages"
            :key="src + i"
            class="rpage-page"
            :ref="el => (pageEls[i] = el)"
            :data-index="i"
          >
            <img
              :src="src"
              :alt="`Page ${i + 1}`"
              class="rpage-page-img"
              :class="{ 'is-greyscale': settings.greyscale }"
              draggable="false"
              loading="lazy"
            />
          </div>
          <div class="rpage-boundary rpage-boundary--ttb">
            <div class="rpage-boundary__buttons">
              <button type="button" class="rpage-boundary__btn" v-if="prevChapterLabel" @click.stop="goPrevChapter">
                &laquo; Ch. {{ prevChapterLabel }}
              </button>
              <button type="button" class="rpage-boundary__btn" v-if="nextChapterLabel" @click.stop="goNextChapter">
                Ch. {{ nextChapterLabel }} &raquo;
              </button>
            </div>
            <p class="rpage-boundary__comments">Comments coming soon</p>
          </div>
        </div>
        <!-- Paginated LTR / RTL mode with interactive swipe animations -->
        <div v-else class="rpage-stage rpage-stage--paged" :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`, transformOrigin: 'center center' }">
          <div 
            class="rpage-swipe-track" 
            :style="{ 
              transform: `translateX(${visualX}px)`
            }"
          >
            <div 
              v-for="slot in visibleSlots" 
              :key="slot.key" 
              class="rpage-spread-slot"
              :style="{ 
                transform: `translateX(${slot.offset * 100}%)`
              }"
            >
              <!-- Boundary Page -->
              <div v-if="slot.isBoundary" class="rpage-boundary">
                <div class="rpage-boundary__buttons">
                  <button type="button" class="rpage-boundary__btn" v-if="prevChapterLabel" @click.stop="goPrevChapter">
                    &laquo; Ch. {{ prevChapterLabel }}
                  </button>
                  <button type="button" class="rpage-boundary__btn" v-if="nextChapterLabel" @click.stop="goNextChapter">
                    Ch. {{ nextChapterLabel }} &raquo;
                  </button>
                </div>
                <p class="rpage-boundary__comments">Comments coming soon</p>
              </div>
              <!-- Standard Spread -->
              <div v-else-if="slot.pages.length" class="rpage-spread" :class="`rpage-spread--${slot.forceSingle ? 'single' : settings.layout}`">
                <img
                  v-for="(src, si) in slot.pages"
                  :key="slot.key + '-' + src + si"
                  :src="src"
                  :alt="`Page ${slot.targetIdx + 1}`"
                  class="rpage-page-img"
                  :class="{ 'is-greyscale': settings.greyscale }"
                  draggable="false"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-if="settings.dim > 0 && pages.length" class="rpage-dim-overlay" :style="{ opacity: settings.dim / 100 }"></div>
      </div>
      <!-- Expandable Progress Sidebar -->
      <div
        v-if="settings.progressPos !== 'off' && pages.length"
        class="rpage-progress"
        :class="[`rpage-progress--${settings.progressPos}`]"
        aria-label="Page progress"
        @dblclick.stop
      >
        <button
          v-for="(src, i) in pages"
          :key="src + i"
          type="button"
          class="rpage-progress__seg"
          :class="{ 'is-active': isPageActive(i), 'is-read': isPageRead(i) }"
          :title="`Page ${i + 1}`"
          :aria-label="`Go to page ${i + 1}`"
          @click.stop="gotoRawPage(i)"
        ></button>
      </div>
      <!-- Current page indicator -->
      <div
        v-if="settings.progressPos !== 'off' && pages.length"
        class="rpage-progress-current mono"
        :class="{ 'is-hidden': controlsHidden && !anyPanelOpen }"
      >
        {{ currentPageLabel }}
      </div>
      <!-- Bottom Right Zoom & Autoscroll Controls -->
      <div class="rpage-zoomctl" :class="{ 'is-hidden': controlsHidden && !anyPanelOpen }">
        <button 
          v-if="settings.direction === 'ttb' && settings.autoScroll"
          type="button" 
          class="rpage-zoomctl__btn" 
          :class="{ 'is-active': autoScrollActive }"
          :title="autoScrollActive ? 'Pause Auto Scroll' : 'Start Auto Scroll'"
          @click="toggleAutoScroll"
        >
          <svg v-if="!autoScrollActive" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        </button>
        <div class="rpage-zoomctl__divider" v-if="settings.direction === 'ttb' && settings.autoScroll"></div>
        <button type="button" class="rpage-zoomctl__btn" title="Zoom In" aria-label="Zoom in" @click="zoomIn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
        <button type="button" class="rpage-zoomctl__btn rpage-zoomctl__val" title="Reset Zoom" @click="resetZoom">
          {{ Math.round(zoomLevel * 100) }}%
        </button>
        <button type="button" class="rpage-zoomctl__btn" title="Zoom Out" aria-label="Zoom out" @click="zoomOut">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
      </div>
      <!-- Floating Controls -->
      <div
        class="rpage-floatctl"
        role="toolbar"
        aria-label="Reader controls"
        :class="{ 'is-hidden': controlsHidden && !anyPanelOpen }"
      >
        <div class="rpage-floatctl__row">
          <button
            type="button"
            class="rpage-floatctl__btn"
            :disabled="!hasPrevChapter"
            aria-label="Previous chapter"
            title="Previous chapter"
            @click="goPrevChapter"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"></path></svg>
          </button>
          <button type="button" class="rpage-floatctl__chap" aria-label="Chapter list" title="Chapter list" @click="togglePanel('chapters')">
            <span class="mono">Ch.{{ chapterNum }}</span>
            <span class="rpage-floatctl__chap-total mono"> / {{ chapterIds.length }}</span>
          </button>
          <button
            type="button"
            class="rpage-floatctl__btn"
            :disabled="!hasNextChapter"
            aria-label="Next chapter"
            title="Next chapter"
            @click="goNextChapter"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>
          </button>
        </div>
        <div class="rpage-floatctl__col">
          <NuxtLink to="/manga" class="rpage-floatctl__btn" aria-label="Home" title="Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"></path></svg>
          </NuxtLink>
          <NuxtLink :to="`/manga/${mangaId}`" class="rpage-floatctl__btn" aria-label="Manga page" title="Manga page">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5a1 1 0 0 1 1-1h6a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H3a1 1 0 0 1-1-1V5z"></path><path d="M22 5a1 1 0 0 0-1-1h-6a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h6a1 1 0 0 1 1-1V5z"></path></svg>
          </NuxtLink>
          <button
            type="button"
            class="rpage-floatctl__btn"
            :class="{ 'is-active': showChapters }"
            aria-label="Chapter list"
            title="Chapter list"
            @click="togglePanel('chapters')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle></svg>
          </button>
          <button
            type="button"
            class="rpage-floatctl__btn rpage-floatctl__btn--fs"
            :class="{ 'is-active': isFullscreen }"
            :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
            :title="isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'"
            @click="toggleFullscreen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 4 4 4 4 9"></polyline><polyline points="15 4 20 4 20 9"></polyline><polyline points="4 15 4 20 9 20"></polyline><polyline points="20 15 20 20 15 20"></polyline></svg>
          </button>
          <button
            type="button"
            class="rpage-floatctl__btn"
            :class="{ 'is-active': showSettings }"
            aria-label="Settings"
            title="Settings"
            @click="togglePanel('settings')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path></svg>
          </button>
          <button
            type="button"
            class="rpage-floatctl__btn"
            :class="{ 'is-active': showHelp }"
            aria-label="Help"
            title="Help (?)"
            @click="togglePanel('help')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-.8.8-1.8 1.3-1.8 2.3"></path><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"></circle></svg>
          </button>
        </div>
      </div>
      <!-- Settings Panel -->
      <Transition
        appear
        enter-active-class="transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        enter-from-class="opacity-0 -translate-y-12 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-4 scale-95"
        @after-enter="onTransitionAfterEnter"
      >
        <div v-if="showSettings" class="rpage-modal-overlay">
        <div class="rpage-settings__panel" role="dialog" aria-label="Reader settings">
          <header class="rpage-modal__head">
            <h3 class="rpage-modal__title">Settings</h3>
            <button type="button" class="rpage-modal__close" aria-label="Close settings" @click="showSettings = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"></path></svg>
            </button>
          </header>
          <div class="rpage-settings__body">
            <section class="rpage-settings__group">
              <h3 class="rpage-settings__title mono">Reading direction</h3>
              <div class="rpage-dir2" role="radiogroup" aria-label="Reading direction">
                <button type="button" role="radio" :aria-checked="settings.direction === 'ltr'" class="rpage-dir2__btn" :class="{ 'is-on': settings.direction === 'ltr' }" @click="settings.direction = 'ltr'">
                  <span class="rpage-dir2__arrow" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h12"></path><path d="M13 7l5 5-5 5"></path><path d="M21 5v14"></path></svg></span>
                  <span>Left to right</span>
                </button>
                <button type="button" role="radio" :aria-checked="settings.direction === 'rtl'" class="rpage-dir2__btn" :class="{ 'is-on': settings.direction === 'rtl' }" @click="settings.direction = 'rtl'">
                  <span class="rpage-dir2__arrow" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"></path><path d="M19 12H7"></path><path d="M11 7l-5 5 5 5"></path></svg></span>
                  <span>Right to left</span>
                </button>
                <button type="button" role="radio" :aria-checked="settings.direction === 'ttb'" class="rpage-dir2__btn" :class="{ 'is-on': settings.direction === 'ttb' }" @click="settings.direction = 'ttb'">
                  <span class="rpage-dir2__arrow" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21h14"></path><path d="M12 17V5"></path><path d="M7 13l5 5 5-5"></path></svg></span>
                  <span>Top to bottom</span>
                </button>
              </div>
            </section>
            <!-- Auto Scroll Settings -->
            <section class="rpage-settings__group" :class="{ 'is-disabled': settings.direction !== 'ttb' }">
              <h3 class="rpage-settings__title mono">Auto Scroll</h3>
              <div class="rpage-settings__opts">
                <label class="rpage-opt rpage-opt--toggle" :class="{ 'is-on': settings.autoScroll }">
                  <input type="checkbox" v-model="settings.autoScroll">
                  <span class="rpage-opt__check" aria-hidden="true">
                    <svg v-if="settings.autoScroll" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"></path></svg>
                  </span>
                  <span>Enable Auto Scroll</span>
                </label>
              </div>
              <div class="rpage-slider" v-if="settings.autoScroll">
                <div class="rpage-slider__row">
                  <span class="rpage-disp__label">Speed</span>
                  <input min="1" max="10" step="1" aria-label="Auto scroll speed" type="range" v-model.number="settings.autoScrollSpeed">
                  <span class="rpage-slider__val mono">{{ settings.autoScrollSpeed }}x</span>
                </div>
              </div>
            </section>
            <section class="rpage-settings__group" :class="{ 'is-disabled': settings.direction === 'ttb' }">
              <h3 class="rpage-settings__title mono">Page layout</h3>
              <div class="rpage-disp" role="radiogroup" aria-label="Page layout">
                <button type="button" role="radio" :aria-checked="settings.layout === 'single'" class="rpage-disp__card" :class="{ 'is-on': settings.layout === 'single' }" @click="settings.layout = 'single'">
                  <span class="rpage-disp__diagram rpage-disp__diagram--single" aria-hidden="true"><span class="rpage-disp__sheet"></span></span>
                  <span class="rpage-disp__label">Single</span>
                </button>
                <button type="button" role="radio" :aria-checked="settings.layout === 'double'" class="rpage-disp__card" :class="{ 'is-on': settings.layout === 'double' }" @click="settings.layout = 'double'">
                  <span class="rpage-disp__diagram rpage-disp__diagram--double" aria-hidden="true"><span class="rpage-disp__sheet"></span><span class="rpage-disp__sheet"></span></span>
                  <span class="rpage-disp__label">Double</span>
                </button>
              </div>
              <div class="rpage-settings__opts" v-if="settings.layout === 'double'">
                <label class="rpage-opt rpage-opt--toggle" :class="{ 'is-on': settings.doubleOffset }">
                  <input type="checkbox" v-model="settings.doubleOffset" :disabled="settings.autoDetectSpread">
                  <span class="rpage-opt__check" aria-hidden="true">
                    <svg v-if="settings.doubleOffset" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"></path></svg>
                  </span>
                  <span>Page offset (show page 1 alone)</span>
                </label>
                <label class="rpage-opt rpage-opt--toggle" :class="{ 'is-on': settings.autoDetectSpread }">
                  <input type="checkbox" v-model="settings.autoDetectSpread">
                  <span class="rpage-opt__check" aria-hidden="true">
                    <svg v-if="settings.autoDetectSpread" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"></path></svg>
                  </span>
                  <span>Auto-detect spreads & offset</span>
                </label>
              </div>
            </section>
            <section class="rpage-settings__group">
              <h3 class="rpage-settings__title mono">Progress bar</h3>
              <div class="rpage-pb" role="radiogroup" aria-label="Progress bar position">
                <button
                  v-for="opt in progressOptions"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="settings.progressPos === opt.value"
                  :title="opt.label"
                  :aria-label="`Progress bar ${opt.label}`"
                  class="rpage-pb__btn"
                  :class="{ 'is-on': settings.progressPos === opt.value }"
                  @click="settings.progressPos = opt.value"
                  v-html="opt.icon"
                ></button>
              </div>
            </section>
            <section class="rpage-settings__group">
              <h3 class="rpage-settings__title mono">Preload images</h3>
              <div class="rpage-settings__opts">
                <label class="rpage-opt" :class="{ 'is-on': settings.preload === 'some' }">
                  <input type="radio" value="some" v-model="settings.preload" name="preload">
                  <span class="rpage-opt__dot" aria-hidden="true"></span><span>Preload some</span>
                </label>
                <label class="rpage-opt" :class="{ 'is-on': settings.preload === 'all' }">
                  <input type="radio" value="all" v-model="settings.preload" name="preload">
                  <span class="rpage-opt__dot" aria-hidden="true"></span><span>Preload all</span>
                </label>
              </div>
            </section>
            <section class="rpage-settings__group">
              <div class="rpage-settings__opts">
                <label class="rpage-opt rpage-opt--toggle" :class="{ 'is-on': settings.greyscale }">
                  <input type="checkbox" v-model="settings.greyscale">
                  <span class="rpage-opt__check" aria-hidden="true">
                    <svg v-if="settings.greyscale" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"></path></svg>
                  </span>
                  <span>Greyscale pages</span>
                </label>
              </div>
            </section>
            <section class="rpage-settings__group">
              <h3 class="rpage-settings__title mono">Dim pages</h3>
              <div class="rpage-slider">
                <div class="rpage-slider__row">
                  <input min="0" max="100" step="1" aria-label="Dim amount" type="range" v-model.number="settings.dim">
                  <span class="rpage-slider__val mono">{{ settings.dim }}%</span>
                </div>
              </div>
            </section>
          </div>
        </div>
        </div>
      </Transition>
      <!-- Chapter List Panel -->
      <Transition
        appear
        enter-active-class="transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        enter-from-class="opacity-0 -translate-y-12 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-4 scale-95"
        @after-enter="onTransitionAfterEnter"
      >
        <div v-if="showChapters" class="rpage-modal-overlay">
        <div class="rpage-settings__panel rpage-chapters__panel" role="dialog" aria-label="Chapter list">
          <header class="rpage-modal__head">
            <h3 class="rpage-modal__title">Chapters</h3>
            <button type="button" class="rpage-modal__close" aria-label="Close chapter list" @click="showChapters = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"></path></svg>
            </button>
          </header>
          <div class="rpage-chapters__header" v-if="availableScanlators.length">
            <div class="rpage-chapters__providers">
              <button 
                type="button"
                @click="activeScanId = ALL_PROVIDERS_KEY"
                class="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                :class="effectiveScanId === ALL_PROVIDERS_KEY ? 'bg-primary text-black' : 'bg-white/5 text-gray-400 hover:text-white'"
              >
                All Providers
              </button>
              <button 
                v-for="group in availableScanlators" 
                :key="group.scanId"
                type="button"
                @click="activeScanId = group.scanId"
                class="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                :class="effectiveScanId === group.scanId ? 'bg-primary text-black' : 'bg-white/5 text-gray-400 hover:text-white'"
              >
                {{ group.name }}
              </button>
            </div>
            <div class="rpage-chapters__searchrow">
              <div class="rpage-chapters__search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  type="text"
                  v-model="chapterSearchQuery"
                  placeholder="Search chapter…"
                  aria-label="Search chapters"
                  class="rpage-chapters__search-input"
                />
                <button
                  v-if="chapterSearchQuery"
                  type="button"
                  class="rpage-chapters__search-clear"
                  aria-label="Clear search"
                  @click="chapterSearchQuery = ''"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"></path></svg>
                </button>
              </div>
              <button 
                @click="toggleSortOrder"
                class="inline-flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-800/50 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 flex-shrink-0"
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
          <div class="rpage-chapters__body" ref="chaptersBodyEl">

            <!-- All Providers mode: show every scanlator's version of each chapter, tagged -->
            <template v-if="effectiveScanId === ALL_PROVIDERS_KEY">
              <div
                v-for="g in filteredChapterGroups"
                :key="g.number"
                class="rpage-chapters__group"
              >
                <div class="rpage-chapters__numlabel mono">Chapter {{ g.number }}</div>
                <div class="rpage-chapters__variants">
                  <button
                    v-for="entry in g.entries"
                    :key="entry.id"
                    type="button"
                    class="rpage-chapters__variant"
                    :class="{ 'is-current': currentChapter && entry.id === currentChapter.id }"
                    @click="goToChapter(entry.id)"
                  >
                    <span class="rpage-chapters__variant-name">{{ scanlatorName(entry.scanId) }}</span>
                    <span class="rpage-chapters__pages mono">{{ entry.pageCount }}p</span>
                  </button>
                </div>
              </div>
              <p v-if="!filteredChapterGroups.length" class="rpage-chapters__empty">No chapters match "{{ chapterSearchQuery }}"</p>
            </template>

            <!-- Single-provider mode: one row per chapter number -->
            <template v-else>
              <button
                v-for="g in filteredChapterGroups"
                :key="g.number"
                type="button"
                class="rpage-chapters__item"
                :class="{ 'is-current': currentGroup && g.number === currentGroup.number }"
                @click="goToChapter(g.entries[0].id)"
              >
                <span>Chapter {{ g.number }}</span>
                <span class="rpage-chapters__pages mono">{{ g.entries[0].pageCount }}p</span>
              </button>
              <p v-if="!filteredChapterGroups.length" class="rpage-chapters__empty">No chapters match "{{ chapterSearchQuery }}"</p>
            </template>
          </div>
        </div>
        </div>
      </Transition>
      <!-- Help Panel -->
      <Transition
        appear
        enter-active-class="transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        enter-from-class="opacity-0 -translate-y-12 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-4 scale-95"
        @after-enter="onTransitionAfterEnter"
      >
        <div v-if="showHelp" class="rpage-modal-overlay">
        <div class="rpage-settings__panel rpage-help__panel" role="dialog" aria-label="Help">
          <header class="rpage-modal__head">
            <h3 class="rpage-modal__title">Shortcuts</h3>
            <button type="button" class="rpage-modal__close" aria-label="Close help" @click="showHelp = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"></path></svg>
            </button>
          </header>
          <div class="rpage-help__body">
            <div class="rpage-help__row"><span class="rpage-help__keys"><kbd>←</kbd><kbd>→</kbd></span><span>Turn page</span></div>
            <div class="rpage-help__row"><span class="rpage-help__keys"><kbd>+</kbd><kbd>-</kbd></span><span>Zoom in / out</span></div>
            <div class="rpage-help__row"><span class="rpage-help__keys"><kbd>F</kbd></span><span>Fullscreen</span></div>
            <div class="rpage-help__row"><span class="rpage-help__keys"><kbd>?</kbd></span><span>This menu</span></div>
            <div class="rpage-help__row"><span class="rpage-help__keys"><kbd>Esc</kbd></span><span>Close panel</span></div>
            <div class="rpage-help__row"><span>Drag / Swipe</span><span>Interactive page move</span></div>
            <div class="rpage-help__row"><span>Drag while zoomed</span><span>Pan around page</span></div>
            <div class="rpage-help__row"><span>Tap center</span><span>Show / hide controls</span></div>
          </div>
        </div>
        </div>
      </Transition>
    </template>
  </div>
  </Teleport>
</template>
<script setup>
definePageMeta({
  layout: 'lander'
})
const config = useRuntimeConfig()
const API_BASE = config.public.mangaVaultApiBase
const route = useRoute()
const mangaId = computed(() => String(route.params.id))
const chapterParam = computed(() => String(route.params.ch))
// ---------------------------------------------------------------------------
// Manga + Chapter Data
// ---------------------------------------------------------------------------
const manga = ref(null)
const loadingManga = ref(true)
const mangaError = ref('')
const pages = ref([])
const imageDimensions = reactive({})
const loadingPages = ref(true)
const pagesError = ref('')
const activeScanId = ref(null)
const ALL_PROVIDERS_KEY = '__all__'

// `manga.scanlators` is a positional array (e.g. ["Alpha","Gamma","Thunder"]).
// The Nth unique scanId encountered (in chapter list order) maps to scanlators[N].
const availableScanlators = computed(() => {
  if (!manga.value?.chapters) return []
  const seen = []
  for (const c of manga.value.chapters) {
    if (!seen.includes(c.scanId)) seen.push(c.scanId)
  }
  const names = manga.value.scanlators || []
  return seen.map((scanId, idx) => ({
    scanId,
    name: names[idx] || `Scanlator ${idx + 1}`
  }))
})
const scanlatorNameMap = computed(() => {
  const map = new Map()
  availableScanlators.value.forEach(s => map.set(s.scanId, s.name))
  return map
})
function scanlatorName(scanId) {
  return scanlatorNameMap.value.get(scanId) || 'Unknown'
}

const effectiveScanId = computed(() => {
  if (activeScanId.value !== null) return activeScanId.value
  
  // Set initial based on current chapter
  const currentCh = manga.value?.chapters?.find(c => c.id === chapterParam.value)
  if (currentCh) return currentCh.scanId
  
  return availableScanlators.value.length > 0 ? availableScanlators.value[0].scanId : null
})
// Full, unfiltered chapter groups — this is what the reader's actual state
// (current chapter, prev/next nav, chapter count) is derived from, so
// switching the provider filter in the panel never breaks the open chapter.
const allChapterGroups = computed(() => {
  if (!manga.value?.chapters) return []
  const scanOrder = availableScanlators.value.map(s => s.scanId)
  const map = new Map()
  for (const c of manga.value.chapters) {
    if (!map.has(c.number)) map.set(c.number, [])
    map.get(c.number).push(c)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, entries]) => ({
      number,
      entries: [...entries].sort((a, b) => scanOrder.indexOf(a.scanId) - scanOrder.indexOf(b.scanId))
    }))
})
// Filtered chapter groups — only used to decide what's shown in the chapter
// list panel. Purely a display concern, decoupled from reader state.
const chapterGroups = computed(() => {
  if (effectiveScanId.value === ALL_PROVIDERS_KEY) return allChapterGroups.value
  return allChapterGroups.value
    .map(g => ({ ...g, entries: g.entries.filter(e => e.scanId === effectiveScanId.value) }))
    .filter(g => g.entries.length)
})
const chapterIds = computed(() => allChapterGroups.value.map(g => g.entries[0].id))
const chapterSearchQuery = ref('')
const sortOrder = ref('asc')
function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}
const filteredChapterGroups = computed(() => {
  const q = chapterSearchQuery.value.trim().toLowerCase()
  let list = chapterGroups.value
  if (q) {
    list = list.filter(g => {
      if (String(g.number).toLowerCase().includes(q)) return true
      return g.entries.some(e => (e.title || '').toLowerCase().includes(q))
    })
  }
  // chapterGroups is always ascending by number already
  return sortOrder.value === 'desc' ? [...list].reverse() : list
})
const currentGroup = computed(() => {
  if (!allChapterGroups.value.length) return null
  return allChapterGroups.value.find(g => g.entries.some(e => e.id === chapterParam.value)) || null
})
const currentChapterIndex = computed(() =>
  currentGroup.value ? allChapterGroups.value.findIndex(g => g.number === currentGroup.value.number) : -1
)
const currentChapter = computed(() => {
  const group = currentGroup.value
  if (!group) return null
  return group.entries.find(e => e.id === chapterParam.value) || group.entries[0]
})
const chapterNum = computed(() => currentGroup.value?.number ?? chapterParam.value)
const hasPrevChapter = computed(() => currentChapterIndex.value > 0)
const hasNextChapter = computed(() =>
  currentChapterIndex.value !== -1 && currentChapterIndex.value < chapterIds.value.length - 1
)
const prevChapterLabel = computed(() => hasPrevChapter.value ? allChapterGroups.value[currentChapterIndex.value - 1].number : null)
const nextChapterLabel = computed(() => hasNextChapter.value ? allChapterGroups.value[currentChapterIndex.value + 1].number : null)
function goToChapter(id) {
  showChapters.value = false
  navigateTo(`/manga/${mangaId.value}/${id}`)
}
function goPrevChapter() {
  if (hasPrevChapter.value) goToChapter(chapterIds.value[currentChapterIndex.value - 1])
}
function goNextChapter() {
  if (hasNextChapter.value) goToChapter(chapterIds.value[currentChapterIndex.value + 1])
}
async function loadManga() {
  loadingManga.value = true
  mangaError.value = ''
  try {
    const res = await $fetch(`${API_BASE}/atsu/manga/${mangaId.value}/details`)
    manga.value = res.data
  } catch (e) {
    console.error('[reader] failed to load manga details', e)
    mangaError.value = "Couldn't load this manga. It may not exist, or the source is unreachable."
  } finally {
    loadingManga.value = false
  }
}
function processImageDimensions() {
  if (settings.autoDetectSpread && pages.value.length) {
    pages.value.forEach((src, i) => {
      if (!imageDimensions[i]) {
        const img = new Image()
        img.onload = () => { imageDimensions[i] = { w: img.width, h: img.height } }
        img.src = src
      }
    })
  }
}
async function loadPages() {
  pageEls.value = []
  activeRawIndex.value = 0
  currentPageIndex.value = 0
  Object.keys(imageDimensions).forEach(k => delete imageDimensions[k])
  if (!currentChapter.value) {
    pages.value = []
    loadingPages.value = false
    return
  }
  loadingPages.value = true
  pagesError.value = ''
  pages.value = []
  try {
    const res = await $fetch(`${API_BASE}/atsu/manga/${mangaId.value}/chapter/${currentChapter.value.id}/images`)
    pages.value = res.data || []
    processImageDimensions()
  } catch (e) {
    console.error('[reader] failed to load chapter pages', e)
    pagesError.value = "Couldn't load pages for this chapter."
  } finally {
    loadingPages.value = false
    nextTick(() => {
      scrollReaderTop()
      setupObserver()
    })
  }
}
const { saveProgress } = useProgressSync()
let watchTime = 0
let watchInterval = null
const syncCurrentMangaProgress = async () => {
  if (manga.value && currentChapter.value) {
    await saveProgress({
      type: 'manga',
      id: mangaId.value,
      progress: Number(chapterNum.value),
      currentEpisode: Number(chapterNum.value),
      time: watchTime,
      status: 'Reading',
      extraData: {
        title: manga.value.title,
        cover: manga.value.cover || manga.value.coverImage,
        pgno: currentPageIndex.value + 1,
        mediaStatus: 'UNKNOWN',
        mangaId: mangaId.value,
        chId: currentChapter.value.id,
        imgUrl: manga.value.cover || manga.value.coverImage,
      }
    })
  }
}
watch(chapterParam, () => {
  watchTime = 0 
  loadPages()
  syncCurrentMangaProgress()
})
onMounted(() => {
  watchInterval = setInterval(() => {
    watchTime += 1
    if (watchTime % 30 === 0) {
      syncCurrentMangaProgress()
    }
  }, 1000)
  watch(manga, (val) => {
    if (val) syncCurrentMangaProgress()
  }, { once: true })
})
onUnmounted(() => {
  if (watchInterval) clearInterval(watchInterval)
  syncCurrentMangaProgress()
})
useHead(() => ({
  title: manga.value ? `${manga.value.title} - Chapter ${chapterNum.value} - Re:ANIME` : 'Manga Reader - Re:ANIME',
  titleTemplate: '%s',
  meta: [
    { name: 'description', content: `Read ${manga.value?.title || 'manga'} chapter ${chapterNum.value} free online on Re:ANIME.` },
    { property: 'og:image', content: manga.value?.coverImage || manga.value?.cover || '/og.webp' }
  ]
}))
// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const settings = reactive({
  direction: 'ltr',
  layout: 'single',
  doubleOffset: false,
  autoDetectSpread: false,
  progressPos: 'left',
  preload: 'some',
  greyscale: false,
  dim: 0,
  autoScroll: false,
  autoScrollSpeed: 3
})
const SETTINGS_KEY = 'rpage:settings'
function restoreSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) Object.assign(settings, JSON.parse(raw))
    // 'right' used to be selectable but now overlaps the TTB scrollbar; migrate old saves
    if (settings.progressPos === 'right') settings.progressPos = 'left'
  } catch {}
}
watch(settings, (val) => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(val)) } catch {}
}, { deep: true })
watch(() => settings.autoDetectSpread, (val) => {
  if (val) processImageDimensions()
})
const progressOptions = [
  { value: 'left', label: 'Left', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"></path><path d="M19 12H7"></path><path d="M11 7l-5 5 5 5"></path></svg>' },
  { value: 'top', label: 'Top', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14"></path><path d="M12 7v12"></path><path d="M7 11l5-5 5 5"></path></svg>' },
  { value: 'bottom', label: 'Bottom', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21h14"></path><path d="M12 17V5"></path><path d="M7 13l5 5 5-5"></path></svg>' },
  { value: 'off', label: 'Off', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"></circle><line x1="6.5" y1="6.5" x2="17.5" y2="17.5"></line></svg>' }
]
// ---------------------------------------------------------------------------
// Zoom Controls
// ---------------------------------------------------------------------------
const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)
function clampPan(x, y) {
  const vp = readerViewport.value
  const vw = vp?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 0)
  const vh = vp?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 0)
  const maxX = Math.max(0, (vw * (zoomLevel.value - 1)) / 2)
  const maxY = Math.max(0, (vh * (zoomLevel.value - 1)) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y))
  }
}
function zoomIn() { if (zoomLevel.value < 10) zoomLevel.value = parseFloat((zoomLevel.value + 0.25).toFixed(2)) }
function zoomOut() { if (zoomLevel.value > 0.5) zoomLevel.value = parseFloat((zoomLevel.value - 0.25).toFixed(2)) }
function resetZoom() { zoomLevel.value = 1 }
watch(zoomLevel, (val) => {
  if (val <= 1) {
    panX.value = 0
    panY.value = 0
  } else {
    const clamped = clampPan(panX.value, panY.value)
    panX.value = clamped.x
    panY.value = clamped.y
  }
})
// ---------------------------------------------------------------------------
// Auto Scroll Engine
// ---------------------------------------------------------------------------
const autoScrollActive = ref(false)
let autoScrollTimer = null
function startAutoScroll() {
  stopAutoScroll()
  autoScrollActive.value = true
  autoScrollTimer = requestAnimationFrame(performAutoScroll)
}
function stopAutoScroll() {
  autoScrollActive.value = false
  if (autoScrollTimer) { cancelAnimationFrame(autoScrollTimer); autoScrollTimer = null }
}
function toggleAutoScroll() { autoScrollActive.value ? stopAutoScroll() : startAutoScroll() }
function performAutoScroll() {
  if (!autoScrollActive.value) return
  window.scrollBy(0, settings.autoScrollSpeed * 0.8)
  autoScrollTimer = requestAnimationFrame(performAutoScroll)
}
watch(() => settings.autoScroll, (val) => {
  if (val && settings.direction === 'ttb') startAutoScroll()
  else stopAutoScroll()
})
watch(() => settings.direction, (val) => { if (val !== 'ttb') stopAutoScroll() })
// ---------------------------------------------------------------------------
// Pagination & Offscreen Neighbor Compute
// ---------------------------------------------------------------------------
const displayGroups = computed(() => {
  const out = []
  if (settings.layout === 'double') {
    let i = 0
    let applyOffset = settings.doubleOffset
    // Integrate Auto-Offset logic for Page 1 based on autoDetectSpread
    if (settings.autoDetectSpread && pages.value.length > 0) {
      const dim = imageDimensions[0]
      if (dim) {
        // If height > width, it's a portrait image (likely a cover), set offset to true.
        applyOffset = dim.h > dim.w
      } else {
        // Fallback default to offset true if dimensions aren't loaded yet
        applyOffset = true
      }
    }
    if (applyOffset && pages.value.length) {
      out.push({ pages: [pages.value[0]], rawStart: 0, forceSingle: true })
      i = 1
    }
    
    while (i < pages.value.length) {
      let isWide = false;
      if (settings.autoDetectSpread && imageDimensions[i]) {
        isWide = imageDimensions[i].w > imageDimensions[i].h * 1.1;
      }
      if (isWide) {
        out.push({ pages: [pages.value[i]], rawStart: i, forceSingle: true })
        i += 1
      } else if (i + 1 < pages.value.length) {
        let nextIsWide = false;
        if (settings.autoDetectSpread && imageDimensions[i+1]) {
          nextIsWide = imageDimensions[i+1].w > imageDimensions[i+1].h * 1.1;
        }
        if (nextIsWide) {
          out.push({ pages: [pages.value[i]], rawStart: i, forceSingle: false })
          i += 1
        } else {
          out.push({ pages: pages.value.slice(i, i + 2), rawStart: i, forceSingle: false })
          i += 2
        }
      } else {
        out.push({ pages: [pages.value[i]], rawStart: i, forceSingle: false })
        i += 1
      }
    }
  } else {
    pages.value.forEach((src, i) => out.push({ pages: [src], rawStart: i, forceSingle: false }))
  }
  if (pages.value.length > 0) {
    out.push({ isBoundary: true, pages: [], rawStart: pages.value.length, forceSingle: true })
  }
  return out
})
const totalDisplayPages = computed(() => displayGroups.value.length)
const currentPageIndex = ref(0)
const currentDisplayPages = computed(() => displayGroups.value[currentPageIndex.value]?.pages || [])
function findDisplayIndexForRaw(rawIndex) {
  const groups = displayGroups.value
  for (let idx = 0; idx < groups.length; idx++) {
    const g = groups[idx]
    if (g.isBoundary) continue
    if (rawIndex >= g.rawStart && rawIndex < g.rawStart + g.pages.length) return idx
  }
  return 0
}
const visibleSlots = computed(() => {
  const slots = []
  const isRtl = settings.direction === 'rtl'
  
  for (let offset = -2; offset <= 2; offset++) {
    const pageDelta = isRtl ? -offset : offset
    const targetIdx = currentPageIndex.value + pageDelta
    const group = (targetIdx >= 0 && targetIdx < displayGroups.value.length)
      ? displayGroups.value[targetIdx]
      : null
    const pagesList = group
      ? (isRtl && group.pages.length > 1 ? [...group.pages].reverse() : group.pages)
      : []
    slots.push({
      offset,
      targetIdx,
      pages: pagesList,
      isBoundary: group?.isBoundary,
      forceSingle: group?.forceSingle,
      key: `slot-${offset}-${targetIdx}`
    })
  }
  return slots
})
function stepPage(delta) {
  const next = currentPageIndex.value + delta
  if (next < 0) return 
  if (next >= totalDisplayPages.value) return 
  currentPageIndex.value = next
  panX.value = 0
  panY.value = 0
  scrollReaderTop()
}
let lastRawIndex = 0
watch(currentPageIndex, (idx) => {
  const g = displayGroups.value[idx]
  if (g && !g.isBoundary) lastRawIndex = g.rawStart
}, { immediate: true })
watch([() => settings.layout, () => settings.doubleOffset, () => settings.autoDetectSpread], () => {
  nextTick(() => {
    const newIdx = findDisplayIndexForRaw(lastRawIndex)
    currentPageIndex.value = Math.max(0, Math.min(newIdx, totalDisplayPages.value - 1))
  })
})
// ---------------------------------------------------------------------------
// Robust Multi-Page Gesture & Physics Animation System
// ---------------------------------------------------------------------------
const isDragging = ref(false)
const isAnimating = ref(false)
const visualX = ref(0)
const hasDraggedFar = ref(false)
let dragStartX = 0
let lastX = 0
let lastTime = 0
let currentVelocityX = 0
let touchStartTime = 0
// Zoomed-pan gesture state
const isPanning = ref(false)
let dragStartY = 0
let panStartX = 0
let panStartY = 0
let overscrollX = 0
function turnPageFromOverscroll(amount) {
  const OVER_THRESHOLD = 70
  if (Math.abs(amount) < OVER_THRESHOLD) return
  const isRtl = settings.direction === 'rtl'
  const steps = Math.sign(amount)
  const pageDelta = isRtl ? -steps : steps
  const targetPageIndex = currentPageIndex.value - pageDelta
  if (targetPageIndex < 0) return
  if (targetPageIndex >= totalDisplayPages.value) return
  currentPageIndex.value = targetPageIndex
  panX.value = 0
  panY.value = 0
  scrollReaderTop()
}
function handleStart(x, y) {
  if (settings.direction === 'ttb') return
  if (isAnimating.value) return
  touchStartTime = performance.now()
  if (zoomLevel.value > 1) {
    isPanning.value = true
    hasDraggedFar.value = false
    dragStartX = x
    dragStartY = y
    panStartX = panX.value
    panStartY = panY.value
    overscrollX = 0
    return
  }
  isDragging.value = true
  hasDraggedFar.value = false
  dragStartX = x
  lastX = x
  lastTime = performance.now()
  currentVelocityX = 0
}
function handleMove(x, y) {
  if (isPanning.value) {
    const dx = x - dragStartX
    const dy = y - dragStartY
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) hasDraggedFar.value = true
    const rawX = panStartX + dx
    const rawY = panStartY + dy
    const clamped = clampPan(rawX, rawY)
    panX.value = clamped.x
    panY.value = clamped.y
    overscrollX = rawX - clamped.x
    return
  }
  if (!isDragging.value) return
  const now = performance.now()
  const dt = now - lastTime
  const dx = x - dragStartX
  
  if (Math.abs(dx) > 8) {
    hasDraggedFar.value = true
  }
  
  if (dt > 0) {
    const instVelocity = (lastX - x) / dt
    currentVelocityX = currentVelocityX * 0.5 + instVelocity * 0.5
  }
  
  lastX = x
  lastTime = now
  visualX.value = dx
}
function handleEnd() {
  if (isPanning.value) {
    isPanning.value = false
    turnPageFromOverscroll(overscrollX)
    overscrollX = 0
    return
  }
  if (!isDragging.value) return
  isDragging.value = false
  
  const viewportWidth = readerViewport.value?.clientWidth || window.innerWidth
  const currentV = visualX.value
  const absV = Math.abs(currentV)
  const absVelocity = Math.abs(currentVelocityX)
  
  const DISTANCE_THRESHOLD = viewportWidth * 0.18
  const VELOCITY_THRESHOLD = 0.25
  
  const isRtl = settings.direction === 'rtl'
  
  if (absV > DISTANCE_THRESHOLD || absVelocity > VELOCITY_THRESHOLD) {
    const rawStep = Math.round(currentV / viewportWidth)
    const stepDirection = Math.sign(currentV) || (currentVelocityX > 0 ? 1 : -1)
    const steps = rawStep !== 0 ? rawStep : stepDirection
    
    const targetX = steps * viewportWidth
    const pageDelta = isRtl ? -steps : steps
    const targetPageIndex = currentPageIndex.value - pageDelta
    
    if (targetPageIndex < 0) {
      animateTo(0)
      return
    }
    
    if (targetPageIndex >= totalDisplayPages.value) {
      animateTo(0)
      return
    }
    
    animateTo(targetX, () => {
      currentPageIndex.value = targetPageIndex
      visualX.value = 0
      panX.value = 0
      panY.value = 0
      scrollReaderTop()
    })
  } else {
    animateTo(0)
  }
}
function animateTo(targetX, callback) {
  isAnimating.value = true
  const startX = visualX.value
  const dist = targetX - startX
  const duration = Math.min(380, Math.max(200, Math.abs(dist) * 0.45))
  const startTime = performance.now()
  
  function step(now) {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / duration)
    const ease = 1 - Math.pow(1 - progress, 3)
    visualX.value = startX + dist * ease
    
    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      visualX.value = targetX
      isAnimating.value = false
      if (callback) callback()
    }
  }
  
  requestAnimationFrame(step)
}
function onDragStart(e) { 
  if (e.button === 0) {
    e.preventDefault()
    handleStart(e.clientX, e.clientY) 
  }
}
function onDragMove(e) { 
  if (isDragging.value || isPanning.value) {
    e.preventDefault()
    handleMove(e.clientX, e.clientY) 
  }
}
function onDragEnd() { handleEnd() }
function onTouchStart(e) { 
  if (e.touches.length === 1) {
    handleStart(e.touches[0].clientX, e.touches[0].clientY) 
  }
}
function onTouchMove(e) { 
  if ((isDragging.value || isPanning.value) && e.touches.length === 1) {
    handleMove(e.touches[0].clientX, e.touches[0].clientY) 
  }
}
function onTouchEnd() {
 handleEnd() 
}
// ---------------------------------------------------------------------------
// Viewport & Panelling
// ---------------------------------------------------------------------------
const readerViewport = ref(null)
function scrollReaderTop() {
  if (settings.direction === 'ttb') {
    window.scrollTo({ top: 0, behavior: 'instant' })
  } else {
    readerViewport.value?.scrollTo({ top: 0, behavior: 'instant' })
  }
}
const showSettings = ref(false)
const showChapters = ref(false)
const showHelp = ref(false)
const anyPanelOpen = computed(() => showSettings.value || showChapters.value || showHelp.value)
function togglePanel(name) {
  const map = { settings: showSettings, chapters: showChapters, help: showHelp }
  const willOpen = !map[name].value
  showSettings.value = false
  showChapters.value = false
  showHelp.value = false
  if (willOpen) map[name].value = true
}
function onTransitionAfterEnter() {
  if (showChapters.value) {
    chaptersBodyEl.value?.querySelector('.is-current')?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }
}
const chaptersBodyEl = ref(null)
function closeAllPanels() {
  showSettings.value = false
  showChapters.value = false
  showHelp.value = false
}
// Fullscreen
const readerRoot = ref(null)
const isFullscreen = ref(false)
function toggleFullscreen() {
  if (!document.fullscreenElement) readerRoot.value?.requestFullscreen?.()
  else document.exitFullscreen?.()
}
function onFullscreenChange() { isFullscreen.value = !!document.fullscreenElement }
function applyBodyScrollLock() {
  if (typeof document === 'undefined') return
  // In TTB mode we want the browser's own page scrollbar to drive scrolling,
  // so don't lock document/body overflow there. Paginated modes keep the lock
  // since they use swipe/drag instead of scrolling.
  const lock = settings.direction !== 'ttb'
  document.documentElement.style.overflow = lock ? 'hidden' : ''
  document.body.style.overflow = lock ? 'hidden' : ''
}
watch(() => settings.direction, () => applyBodyScrollLock())
// Progress Bar Helpers
const activeRawIndex = ref(0)
function isPageActive(rawIndex) {
  if (settings.direction === 'ttb') return rawIndex === activeRawIndex.value
  const group = displayGroups.value[currentPageIndex.value]
  if (!group || group.isBoundary) return false
  return rawIndex >= group.rawStart && rawIndex < group.rawStart + group.pages.length
}
function isPageRead(rawIndex) {
  if (settings.direction === 'ttb') return rawIndex < activeRawIndex.value
  const group = displayGroups.value[currentPageIndex.value]
  if (!group) return false
  if (group.isBoundary) return true
  return rawIndex < group.rawStart
}
function gotoRawPage(rawIndex) {
  if (settings.direction === 'ttb') {
    scrollToPageEl(rawIndex)
  } else {
    currentPageIndex.value = findDisplayIndexForRaw(rawIndex)
    panX.value = 0
    panY.value = 0
    scrollReaderTop()
  }
}
// Current-page label shown outside the progress bar (avoids clutter on long chapters)
const currentPageLabel = computed(() => {
  if (!pages.value.length) return ''
  if (settings.direction === 'ttb') {
    return `${activeRawIndex.value + 1} / ${pages.value.length}`
  }
  const group = displayGroups.value[currentPageIndex.value]
  if (!group || group.isBoundary) return `${pages.value.length} / ${pages.value.length}`
  const start = group.rawStart + 1
  const end = group.rawStart + group.pages.length
  return start === end ? `${start} / ${pages.value.length}` : `${start}-${end} / ${pages.value.length}`
})
// Observer for continuous TTB
const pageEls = ref([])
let observer = null
function setupObserver() {
  if (observer) { observer.disconnect(); observer = null }
  if (settings.direction !== 'ttb' || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver((entries) => {
    let best = null
    for (const entry of entries) {
      if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) best = entry
    }
    if (best) activeRawIndex.value = Number(best.target.dataset.index)
  }, { threshold: [0.25, 0.5, 0.75] })
  pageEls.value.forEach(el => el && observer.observe(el))
}
watch(() => settings.direction, () => nextTick(setupObserver))
function scrollToPageEl(idx) { pageEls.value[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
// Tap zones
const controlsHidden = ref(false)
function onViewportClick(e) {
  if (hasDraggedFar.value) {
    hasDraggedFar.value = false
    return
  }
  if (anyPanelOpen.value) { closeAllPanels(); return }
  if (e.target.closest && e.target.closest('button, a, input, textarea')) return
  if (settings.direction === 'ttb') {
    controlsHidden.value = !controlsHidden.value
    return
  }
  if (zoomLevel.value > 1) {
    controlsHidden.value = !controlsHidden.value
    return
  }
  
  const rect = (e.currentTarget || readerViewport.value).getBoundingClientRect()
  const clientX = e.clientX ?? 0
  const x = clientX - rect.left
  const third = rect.width / 3
  
  if (x < third) {
    settings.direction === 'rtl' ? stepPage(1) : stepPage(-1)
  } else if (x > third * 2) {
    settings.direction === 'rtl' ? stepPage(-1) : stepPage(1)
  } else {
    controlsHidden.value = !controlsHidden.value
  }
}
// Preloading
watch([pages, () => settings.preload, currentPageIndex], () => {
  if (!pages.value.length || typeof Image === 'undefined') return
  const count = settings.preload === 'all' ? pages.value.length : 4
  const start = settings.direction === 'ttb' ? 0 : currentPageIndex.value * (settings.layout === 'double' ? 2 : 1)
  pages.value.slice(start, start + count).forEach(src => { const img = new Image(); img.src = src })
}, { immediate: true })
// Keyboard shortcuts
function onKeydown(e) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  switch (e.key) {
    case 'ArrowRight': settings.direction === 'rtl' ? stepPage(-1) : stepPage(1); break
    case 'ArrowLeft': settings.direction === 'rtl' ? stepPage(1) : stepPage(-1); break
    case 'f': case 'F': toggleFullscreen(); break
    case '?': togglePanel('help'); break
    case 'Escape': closeAllPanels(); break
    case '+': case '=': zoomIn(); break
    case '-': case '_': zoomOut(); break
  }
}
onMounted(async () => {
  restoreSettings()
  applyBodyScrollLock()
  await loadManga()
  await loadPages()
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  }
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  stopAutoScroll()
  if (observer) observer.disconnect()
})
</script>
<style scoped>
.rpage-root {
  --rp-accent: #7abb00;
  --rp-accent-dim: rgba(122, 187, 0, 0.16);
  --rp-bg: #050505;
  --rp-text: #ffffff;
  --rp-panel-bg: rgba(10, 10, 10, 0.92);
  --rp-panel-border: rgba(255, 255, 255, 0.08);
  position: fixed;
  inset: 0;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  background: var(--rp-bg);
  color: var(--rp-text);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  overflow: hidden;
  z-index: 2147483000;
}
.rpage-root--flow {
  position: relative;
  height: auto;
  min-height: 100vh;
  overflow: visible;
}
.mono { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
/* ---------- Loading / Error States ---------- */
.rpage-state {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; text-align: center; padding: 24px; color: rgba(255, 255, 255, 0.75);
}
.rpage-state--overlay { position: absolute; inset: 0; background: var(--rp-bg); z-index: 5; }
.rpage-spinner {
  width: 34px; height: 34px; border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.12); border-top-color: var(--rp-accent);
  animation: rp-spin 0.8s linear infinite;
}
@keyframes rp-spin { to { transform: rotate(360deg); } }
.rpage-retry {
  padding: 9px 20px; border-radius: 999px; border: 1px solid var(--rp-accent);
  background: var(--rp-accent-dim); color: var(--rp-accent); cursor: pointer;
  font-size: 0.85rem; font-weight: 600; text-decoration: none; display: inline-block;
  transition: background 0.15s ease;
}
.rpage-retry:hover { background: rgba(122, 187, 0, 0.28); }
.rpage-retry:disabled { opacity: 0.35; cursor: default; }
/* ---------- Reader Viewport & Stage ---------- */
.rpage-viewport { 
  position: absolute; inset: 0; overflow: hidden; cursor: grab;
  scrollbar-width: none;
  -ms-overflow-style: none;
  touch-action: none;
}
.rpage-viewport::-webkit-scrollbar { display: none; }
.rpage-viewport--scrollable {
  position: static;
  height: auto;
  min-height: 100vh;
  overflow: visible;
  touch-action: pan-y;
}
.rpage-viewport:active { cursor: grabbing; }
.rpage-stage { position: relative; min-height: 100%; overflow: hidden; }
.rpage-stage--paged { display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; }
.rpage-stage--ttb { display: flex; flex-direction: column; align-items: center; }
/* Offscreen peek swipe track */
.rpage-swipe-track {
  position: absolute; inset: 0; width: 100%; height: 100%;
  will-change: transform;
}
.rpage-spread-slot {
  position: absolute; inset: 0; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.7);
  backface-visibility: hidden;
}
.rpage-page { width: 100%; max-width: 1100px; line-height: 0; }
.rpage-page-img { display: block; width: 100%; height: auto; user-select: none; -webkit-user-drag: none; }
.rpage-page-img.is-greyscale { filter: grayscale(1); }
.rpage-spread {
  display: flex; align-items: center; justify-content: center; gap: 0;
  height: 100%; width: 100%; max-height: 100vh; max-width: 100vw;
}
.rpage-spread--single .rpage-page-img {
  max-height: 100vh; max-width: 100vw; height: 100%; width: auto; object-fit: contain;
}
.rpage-spread--double .rpage-page-img {
  max-height: 100vh; max-width: 50vw; height: 100%; width: auto; object-fit: contain;
}
/* Boundary Pages (End of Chapter) */
.rpage-boundary {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; width: 100%; gap: 16px; text-align: center; color: var(--rp-text);
  padding: 40px 20px;
}
.rpage-boundary--ttb { min-height: 50vh; }
.rpage-boundary__buttons { display: flex; gap: 16px; align-items: center; justify-content: center; flex-wrap: wrap; }
.rpage-boundary__btn {
  padding: 10px 24px; border-radius: 999px; border: 1px solid var(--rp-accent);
  background: var(--rp-accent-dim); color: var(--rp-accent); cursor: pointer;
  font-size: 0.9rem; font-weight: 600; text-decoration: none; display: inline-block;
  transition: background 0.15s ease;
}
.rpage-boundary__btn:hover { background: rgba(122, 187, 0, 0.28); }
.rpage-boundary__comments { font-size: 0.85rem; color: rgba(255, 255, 255, 0.4); margin-top: 10px; }
.rpage-dim-overlay { position: fixed; inset: 0; background: #000; pointer-events: none; z-index: 4; }
/* ---------- Expandable Sidebar Progress Bar ---------- */
.rpage-progress {
  position: fixed; z-index: 55; display: flex; gap: 2px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
  margin: 0; padding: 0;
}
/* Precise Edge Mounting */
.rpage-progress--left { left: 0 !important; top: 0; bottom: 0; height: 100vh; flex-direction: column; width: 8px; }
.rpage-progress--left:hover { width: 20px; }
.rpage-progress--top { top: 0 !important; left: 0; right: 0; width: 100vw; flex-direction: row; height: 8px; }
.rpage-progress--top:hover { height: 16px; }
.rpage-progress--bottom { bottom: 0 !important; left: 0; right: 0; width: 100vw; flex-direction: row; height: 8px; }
.rpage-progress--bottom:hover { height: 16px; }
.rpage-progress__seg {
  width: 100%; flex: 1; min-width: 1px; min-height: 1px; padding: 0; border: none;
  background: rgba(255, 255, 255, 0.14); cursor: pointer;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  transition: background 0.15s ease;
}
.rpage-progress__seg:hover { background: rgba(122, 187, 0, 0.8) !important; }
.rpage-progress__seg.is-read { background: rgba(122, 187, 0, 0.35); }
.rpage-progress__seg.is-active { background: var(--rp-accent); }
/* ---------- Current-page indicator (outside the progress bar) ---------- */
.rpage-progress-current {
  position: fixed; z-index: 56; pointer-events: none;
  top: 20px; left: 20px;
  background: rgba(15, 15, 15, 0.74); backdrop-filter: blur(16px) saturate(150%); -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid var(--rp-panel-border); border-radius: 999px;
  padding: 8px 14px; font-size: 0.8rem; color: rgba(255, 255, 255, 0.9); font-weight: 600;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.rpage-progress-current.is-hidden { opacity: 0; transform: translateY(-12px); pointer-events: none; }
/* ---------- Zoom Controls ---------- */
.rpage-zoomctl {
  position: fixed; right: 20px; bottom: 24px; z-index: 60;
  display: flex; align-items: center; gap: 4px;
  background: rgba(15, 15, 15, 0.74); backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid var(--rp-panel-border); padding: 4px 8px; border-radius: 999px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.rpage-zoomctl.is-hidden { opacity: 0; transform: translateY(12px); pointer-events: none; }
.rpage-zoomctl__btn {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: transparent; color: var(--rp-text); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.15s ease, color 0.15s ease;
}
.rpage-zoomctl__btn:hover { background: var(--rp-accent-dim); color: var(--rp-accent); }
.rpage-zoomctl__btn.is-active { background: var(--rp-accent); color: #000; }
.rpage-zoomctl__divider { width: 1px; height: 16px; background: rgba(255, 255, 255, 0.15); margin: 0 4px; }
.rpage-zoomctl__val {
  width: auto; padding: 0 6px; border-radius: 12px;
  font-size: 0.75rem; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
/* ---------- Floating Controls ---------- */
.rpage-floatctl {
  position: fixed; right: 20px; top: 20px; z-index: 60;
  display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.rpage-floatctl.is-hidden { opacity: 0; transform: translateY(-12px); pointer-events: none; }
.rpage-floatctl__row, .rpage-floatctl__col {
  display: flex; align-items: center; gap: 6px;
  background: rgba(15, 15, 15, 0.74); backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid var(--rp-panel-border); padding: 6px; border-radius: 999px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
}
.rpage-floatctl__col { flex-direction: column; }
.rpage-floatctl__btn {
  width: 36px; height: 36px; flex-shrink: 0; border-radius: 50%; border: none;
  background: transparent; color: var(--rp-text); display: flex; align-items: center; justify-content: center;
  cursor: pointer; text-decoration: none; transition: background 0.15s ease, color 0.15s ease;
}
.rpage-floatctl__btn:hover:not(:disabled) { background: var(--rp-accent-dim); color: var(--rp-accent); }
.rpage-floatctl__btn.is-active { background: var(--rp-accent-dim); color: var(--rp-accent); }
.rpage-floatctl__btn:disabled { opacity: 0.3; cursor: default; }
.rpage-floatctl__chap {
  display: flex; align-items: center; gap: 3px; height: 36px; padding: 0 16px; border-radius: 999px;
  background: var(--rp-accent-dim); border: 1px solid rgba(122, 187, 0, 0.3);
  color: var(--rp-accent); font-size: 0.8rem; cursor: pointer; white-space: nowrap;
}
.rpage-floatctl__chap-total { color: rgba(255, 255, 255, 0.45); }
/* ---------- Shared Panel Chrome ---------- */
.rpage-modal-overlay {
  position: fixed; inset: 0; z-index: 80;
  display: flex; align-items: center; justify-content: center;
  padding: 20px; pointer-events: none;
}
.rpage-settings__panel {
  pointer-events: auto;
  background: var(--rp-panel-bg);
  backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid var(--rp-panel-border); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  width: min(360px, calc(100vw - 40px));
  max-height: min(620px, calc(100vh - 80px)); overflow-y: auto; border-radius: 28px;
}
.rpage-modal__head {
  position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 10px; background: inherit; z-index: 2;
}
.rpage-modal__title { margin: 0; font-size: 0.95rem; font-weight: 700; }
.rpage-modal__close {
  width: 30px; height: 30px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.06);
  color: var(--rp-text); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.rpage-modal__close:hover { background: rgba(255, 255, 255, 0.12); }
.rpage-settings__body { padding: 4px 18px 18px; display: flex; flex-direction: column; gap: 20px; }
.rpage-settings__group { display: flex; flex-direction: column; gap: 10px; transition: opacity 0.15s ease; }
.rpage-settings__group.is-disabled { opacity: 0.35; pointer-events: none; }
.rpage-settings__title { margin: 0; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255, 255, 255, 0.5); }
/* Reading direction */
.rpage-dir2 { display: grid; grid-template-columns: 1fr; gap: 8px; }
.rpage-dir2__btn {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 16px;
  border: 1px solid var(--rp-panel-border); background: rgba(255, 255, 255, 0.03); color: var(--rp-text);
  cursor: pointer; font-size: 0.85rem; text-align: left;
}
.rpage-dir2__btn.is-on { border-color: var(--rp-accent); background: var(--rp-accent-dim); color: var(--rp-accent); }
.rpage-dir2__arrow { display: flex; }
/* Page layout */
.rpage-disp { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rpage-disp__card {
  display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px;
  border-radius: 18px; border: 1px solid var(--rp-panel-border); background: rgba(255, 255, 255, 0.03);
  color: var(--rp-text); cursor: pointer;
}
.rpage-disp__card.is-on { border-color: var(--rp-accent); background: var(--rp-accent-dim); }
.rpage-disp__diagram { display: flex; gap: 3px; height: 34px; }
.rpage-disp__sheet { width: 22px; height: 100%; border-radius: 3px; background: rgba(255, 255, 255, 0.25); }
.rpage-disp__card.is-on .rpage-disp__sheet { background: var(--rp-accent); }
.rpage-disp__label { font-size: 0.78rem; }
/* Options toggle */
.rpage-settings__opts { display: flex; flex-direction: column; gap: 6px; }
.rpage-opt {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 14px;
  cursor: pointer; font-size: 0.85rem; color: rgba(255, 255, 255, 0.75);
}
.rpage-opt:hover { background: rgba(255, 255, 255, 0.04); }
.rpage-opt input { position: absolute; opacity: 0; width: 0; height: 0; }
.rpage-opt__dot {
  width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.25); flex-shrink: 0;
}
.rpage-opt.is-on .rpage-opt__dot { border-color: var(--rp-accent); background: radial-gradient(var(--rp-accent) 0 40%, transparent 42%); }
.rpage-opt.is-on { color: var(--rp-text); }
.rpage-opt--toggle .rpage-opt__check {
  width: 18px; height: 18px; border-radius: 6px; border: 2px solid rgba(255, 255, 255, 0.25);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--rp-bg);
}
.rpage-opt--toggle.is-on .rpage-opt__check { border-color: var(--rp-accent); background: var(--rp-accent); }
/* Progress bar position */
.rpage-pb { display: flex; gap: 8px; }
.rpage-pb__btn {
  width: 40px; height: 40px; border-radius: 14px; border: 1px solid var(--rp-panel-border);
  background: rgba(255, 255, 255, 0.03); color: var(--rp-text); display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.rpage-pb__btn.is-on { border-color: var(--rp-accent); background: var(--rp-accent-dim); color: var(--rp-accent); }
/* Slider */
.rpage-slider__row { display: flex; align-items: center; gap: 12px; }
.rpage-slider input[type="range"] { flex: 1; accent-color: var(--rp-accent); height: 4px; }
.rpage-slider__val { min-width: 38px; text-align: right; font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); }
.rpage-settings__group--mobile-only { display: none; }
@media (max-width: 720px) { .rpage-settings__group--mobile-only { display: flex; } }
/* ---------- Chapter List Panel ---------- */
.rpage-chapters__panel {
  display: flex; flex-direction: column; overflow: hidden;
}
.rpage-chapters__panel .rpage-modal__head { flex-shrink: 0; }
.rpage-chapters__header { flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; padding: 0 14px 10px; }
.rpage-chapters__providers { display: flex; flex-wrap: wrap; gap: 6px; }
.rpage-chapters__searchrow { display: flex; align-items: center; gap: 6px; }
.rpage-chapters__body { padding: 4px 12px 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; min-height: 0; }
.rpage-chapters__item {
  display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 14px;
  border: none; background: transparent; color: var(--rp-text); cursor: pointer; font-size: 0.85rem;
}
.rpage-chapters__item:hover { background: rgba(255, 255, 255, 0.05); }
.rpage-chapters__item.is-current { background: var(--rp-accent-dim); color: var(--rp-accent); }
.rpage-chapters__pages { color: rgba(255, 255, 255, 0.4); font-size: 0.75rem; }
.rpage-chapters__search {
  flex: 1; display: flex; align-items: center; gap: 6px; padding: 3px 9px; height: 36px; box-sizing: border-box;
  border-radius: 10px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--rp-panel-border);
  color: rgba(255, 255, 255, 0.4); min-width: 0;
}
.rpage-chapters__search-input {
  flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: var(--rp-text);
  font-size: 0.78rem; font-family: inherit;
}
.rpage-chapters__search-input::placeholder { color: rgba(255, 255, 255, 0.35); }
.rpage-chapters__search-clear {
  background: transparent; border: none; color: rgba(255, 255, 255, 0.4); cursor: pointer;
  display: flex; align-items: center; justify-content: center; padding: 2px; flex-shrink: 0;
}
.rpage-chapters__search-clear:hover { color: var(--rp-text); }
.rpage-chapters__empty { padding: 24px 14px; text-align: center; font-size: 0.85rem; color: rgba(255, 255, 255, 0.4); }
/* All Providers grouped chapter list */
.rpage-chapters__group { display: flex; flex-direction: column; gap: 4px; padding: 6px 4px 10px; }
.rpage-chapters__numlabel { font-size: 0.72rem; color: rgba(255, 255, 255, 0.45); padding: 4px 10px 0; }
.rpage-chapters__variants { display: flex; flex-direction: column; gap: 3px; }
.rpage-chapters__variant {
  display: flex; align-items: center; justify-content: space-between; padding: 8px 14px;
  border-radius: 12px; border: none; background: rgba(255, 255, 255, 0.03); color: var(--rp-text);
  cursor: pointer; font-size: 0.8rem;
}
.rpage-chapters__variant:hover { background: rgba(255, 255, 255, 0.06); }
.rpage-chapters__variant.is-current { background: var(--rp-accent-dim); color: var(--rp-accent); }
.rpage-chapters__variant-name { font-weight: 600; }
/* ---------- Help Panel ---------- */
.rpage-help__body { padding: 4px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.rpage-help__row { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; gap: 16px; }
.rpage-help__keys { display: flex; gap: 4px; }
.rpage-help__row kbd {
  display: inline-flex; align-items: center; justify-content: center; min-width: 22px; padding: 3px 7px;
  border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12);
  font-family: inherit; font-size: 0.75rem;
}
/* ---------- Mobile Adjustments ---------- */
@media (max-width: 640px) {
  .rpage-floatctl { right: 12px; top: 12px; }
  .rpage-zoomctl { right: 12px; bottom: 20px; }
  .rpage-settings__panel { width: calc(100vw - 24px); max-height: calc(100vh - 60px); }
}
</style>
