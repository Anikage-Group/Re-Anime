<script setup>
definePageMeta({
  layout: 'error'
})
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

// --- NAVIGATION & TABS ---
const activeTab = ref('preferences')

const tabs = [
  { id: 'preferences', label: 'Preferences', icon: 'settings' },
  { id: 'sync', label: 'Sync', icon: 'sync' },
]

const activeIndex = computed(() => tabs.findIndex(tab => tab.id === activeTab.value))

// Offset drives the slide position of each section: 0 = current, -1 = above (prev), 1 = below (next).
// Every section transitions on this same value at once, so switching either direction slides
// naturally rather than cutting instantly — like scrolling into the next page.
const sectionOffset = (tabId) => tabs.findIndex(tab => tab.id === tabId) - activeIndex.value

const setActiveTab = (tabId) => {
  activeTab.value = tabId
}

let wheelLock = false
let wheelAccum = 0
let wheelResetTimer = null
const WHEEL_TRIGGER_DISTANCE = 420 // total accumulated scroll needed before a section change fires — stiffer, deliberate
const WHEEL_IDLE_RESET_MS = 300 // if the person pauses scrolling this long, the buildup resets

const moveSettingsSection = (delta) => {
  if (wheelLock) return

  wheelAccum += delta
  clearTimeout(wheelResetTimer)
  wheelResetTimer = window.setTimeout(() => { wheelAccum = 0 }, WHEEL_IDLE_RESET_MS)

  if (Math.abs(wheelAccum) < WHEEL_TRIGGER_DISTANCE) return

  const direction = wheelAccum > 0 ? 1 : -1
  wheelAccum = 0

  const index = tabs.findIndex(tab => tab.id === activeTab.value)
  const next = tabs[index + direction]
  if (!next) return
  wheelLock = true
  setActiveTab(next.id)
  window.setTimeout(() => { wheelLock = false }, 620)
}

// --- USER ACCOUNT STATE ---
const accountForm = reactive({
  username: 'gomivoy',
  avatar: '/rover.jpg'
})

import { useAuth } from '~/composables/useAuth'
const { user, loggedIn, login, logout, init } = useAuth()

const aniListConnected = loggedIn
const aniListUser = computed(() => user.value || {
  id: null,
  name: '',
  avatar: '',
  animeCount: '?',
  episodeCount: '?'
})

// --- RESTORED PREFERENCES STATE ---
const preferences = reactive({
  preferDub: false,
  skipIntro: false,
  skipOutro: false,
  autoNext: true,
  autoPlay: false,
  showComments: false,
  notifLang: 'eng',
  watchlistFolders: {
    watching: true,
    planning: true,
    paused: false,
    completed: true,
    dropped: false
  },
  syncThreshold: 80
})

// --- SYNC & INTEGRATIONS ---
const syncFormats = reactive({
  json: { mode: 'export' },
  xml: { mode: 'export' },
  txt: { mode: 'export' }
})

const PREFS_KEY = 'anikage:player-prefs'

const connectAniList = () => login('/settings')
const disconnectAniList = () => logout()

onMounted(() => {
  init()
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}')
    // Load all keys, supporting both naming conventions
    if (typeof saved.preferDub === 'boolean') preferences.preferDub = saved.preferDub
    const skipIntroVal = saved.skipIntro ?? saved.autoSkipIntro
    if (typeof skipIntroVal === 'boolean') preferences.skipIntro = skipIntroVal
    const skipOutroVal = saved.skipOutro ?? saved.autoSkip
    if (typeof skipOutroVal === 'boolean') preferences.skipOutro = skipOutroVal
    if (typeof saved.autoNext === 'boolean') preferences.autoNext = saved.autoNext
    if (typeof saved.autoPlay === 'boolean') preferences.autoPlay = saved.autoPlay
    if (typeof saved.showComments === 'boolean') preferences.showComments = saved.showComments
    if (typeof saved.syncThreshold === 'number') preferences.syncThreshold = saved.syncThreshold
  } catch {}
})

watch(preferences, (val) => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}')
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({
      ...saved,
      preferDub: val.preferDub,
      skipIntro: val.skipIntro,
      autoSkipIntro: val.skipIntro,  // keep both keys in sync for the player
      skipOutro: val.skipOutro,
      autoSkip: val.skipOutro,       // keep both keys in sync for the player
      autoNext: val.autoNext,
      autoPlay: val.autoPlay,
      showComments: val.showComments,
      syncThreshold: val.syncThreshold,
    }))
  } catch {}
}, { deep: true })

const toggleFormatMode = (format, mode) => {
  syncFormats[format].mode = mode
}

// The watchlist is stored keyed by status category, each holding an array of entries,
// e.g. { Watching: [{ name, link, mal_id, started_at, completed_at, ... }], Completed: [...], ... }
const WATCHLIST_STATUSES = ['Completed', 'Watching', 'Plan To Watch', 'On Hold', 'Dropped']
const MAL_STATUS_LABEL = {
  'Completed': 'Completed',
  'Watching': 'Watching',
  'Plan To Watch': 'Plan to Watch',
  'On Hold': 'On-Hold',
  'Dropped': 'Dropped'
}

const pad2 = n => String(n).padStart(2, '0')
const formatMalDate = date => (date && date.year) ? `${date.year}-${pad2(date.month)}-${pad2(date.day)}` : '0000-00-00'
const escapeCdata = str => String(str ?? '').replace(/]]>/g, ']]]]><![CDATA[>')

const buildExportContent = (format, watchlist) => {
  if (format === 'json') {
    // Mirrors the app's own watchlist shape 1:1 so it can be re-imported as-is
    return JSON.stringify(watchlist, null, 4)
  }

  if (format === 'txt') {
    return WATCHLIST_STATUSES.map(status => {
      const entries = (watchlist[status] || []).map(item => `${item.name} | ${item.link}`)
      return entries.length ? `# ${status}\n${entries.join('\n')}` : `# ${status}`
    }).join('\n\n') + '\n'
  }

  // xml — standard MyAnimeList export schema
  const animeBlocks = WATCHLIST_STATUSES.flatMap(status =>
    (watchlist[status] || []).map(item => `  <anime>
    <series_animedb_id>${item.mal_id ?? 0}</series_animedb_id>
    <series_title><![CDATA[${escapeCdata(item.name)}]]></series_title>
    <my_watched_episodes>0</my_watched_episodes>
    <my_start_date>${formatMalDate(item.started_at)}</my_start_date>
    <my_finish_date>${formatMalDate(item.completed_at)}</my_finish_date>
    <my_score>0</my_score>
    <my_status>${MAL_STATUS_LABEL[status] || status}</my_status>
    <update_on_import>1</update_on_import>
  </anime>`)
  )

  return `<?xml version="1.0" encoding="UTF-8"?>\n<myanimelist>\n  <myinfo>\n    <user_export_type>1</user_export_type>\n  </myinfo>\n\n${animeBlocks.join('\n\n')}\n</myanimelist>\n`
}

const MIME_TYPES = { json: 'application/json', xml: 'application/xml', txt: 'text/plain' }

const handleSyncAction = (format) => {
  const mode = syncFormats[format].mode
  if (mode === 'import') {
    document.getElementById('settings-import-file')?.click()
    return
  }
  const watchlist = JSON.parse(window.localStorage.getItem('reanime:watchlist') || '{}')
  const content = buildExportContent(format, watchlist)
  const blob = new Blob([content], { type: MIME_TYPES[format] })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `reanime-backup.${format}`
  link.click()
  URL.revokeObjectURL(link.href)
}

const importBackup = async event => {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const data = JSON.parse(await file.text())
    const isWatchlistShape = WATCHLIST_STATUSES.some(status => Array.isArray(data[status]))

    if (isWatchlistShape) {
      // Plain watchlist export (current format)
      window.localStorage.setItem('reanime:watchlist', JSON.stringify(data))
    } else {
      // Legacy wrapped backup { preferences, progress, watchlist }
      if (data.preferences) window.localStorage.setItem(PREFS_KEY, JSON.stringify(data.preferences))
      if (data.progress) window.localStorage.setItem('anikage:local-progress', JSON.stringify(data.progress))
      if (data.watchlist) window.localStorage.setItem('reanime:watchlist', JSON.stringify(data.watchlist))
    }
    window.location.reload()
  } catch { alert('Choose a valid Re:ANIME JSON backup.') }
  event.target.value = ''
}

const onSettingsWheel = event => {
  // Scrolling while the pointer is over the sidebar shouldn't page-switch the sections
  if (event.target instanceof Element && event.target.closest('.settings-sidebar')) return
  moveSettingsSection(event.deltaY)
}
onMounted(() => window.addEventListener('wheel', onSettingsWheel, { passive: true }))
onUnmounted(() => window.removeEventListener('wheel', onSettingsWheel))

// --- SIDEBAR-AWARE DOT VISIBILITY ---
// Dots are the mobile stand-in for the sidebar nav, so they should only ever show
// when the sidebar itself is actually not on screen (rather than relying on a
// breakpoint class that could drift out of sync with the sidebar's own CSS).
const sidebarEl = ref(null)
const sidebarHidden = ref(false)

const checkSidebarVisibility = () => {
  const el = sidebarEl.value
  if (!el) return
  const style = window.getComputedStyle(el)
  sidebarHidden.value = style.display === 'none' || el.offsetParent === null
}

onMounted(() => {
  checkSidebarVisibility()
  window.addEventListener('resize', checkSidebarVisibility)
})
onUnmounted(() => window.removeEventListener('resize', checkSidebarVisibility))

// --- SINGLE-SCROLLBAR HEIGHT SYNC ---
// Sections are absolutely positioned (for the slide), which collapses the wrapper's
// height to 0 by default. Instead of giving each section its own overflow-y: auto
// (which was creating a second, nested scrollbar), track the active section's real
// height and apply it to the wrapper so the page itself scrolls — just one scrollbar.
const pagesHeight = ref('auto')
let sectionResizeObservers = []

const syncPagesHeight = () => {
  const el = document.getElementById(`section-${activeTab.value}`)
  if (el) pagesHeight.value = `${el.scrollHeight}px`
}

onMounted(async () => {
  await nextTick()
  syncPagesHeight()
  ;['section-preferences', 'section-sync'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (id === `section-${activeTab.value}`) syncPagesHeight()
    })
    ro.observe(el)
    sectionResizeObservers.push(ro)
  })
})
onUnmounted(() => sectionResizeObservers.forEach(ro => ro.disconnect()))

watch(activeTab, async () => {
  await nextTick()
  syncPagesHeight()
})
</script>

<template>
  <main class="flex-1 pt-16 pb-20 lg:pb-0 c-1fpe2v8">
    <div class="settings-shell c-19uecn3 is-ready">
      <input id="settings-import-file" class="hidden" type="file" accept="application/json" @change="importBackup">
      <div v-show="sidebarHidden" class="scroll-indicators c-4lr38g" aria-label="Settings sections">
        <button class="scroll-dot c-4lr38g" :class="{ active: activeTab === 'preferences' }" aria-label="Go to Preferences section" @click="setActiveTab('preferences')"></button>
        <button class="scroll-dot c-4lr38g" :class="{ active: activeTab === 'sync' }" aria-label="Go to Sync section" @click="setActiveTab('sync')"></button>
        <div></div>
      </div>
      
      <!-- SIDEBAR -->
      <aside ref="sidebarEl" class="settings-sidebar animate-fade-in c-19uecn3" style="animation-delay: 50ms;">
        <div class="c-19uecn3">
          <h2 class="sidebar-label c-19uecn3">Settings</h2>
          <nav class="sidebar-nav c-19uecn3">
            <button 
              @click="setActiveTab('preferences')" 
              :class="['sidebar-nav-item c-19uecn3', { active: activeTab === 'preferences' }]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-settings" style="width: 16px; height: 16px; flex-shrink: 0;"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>
              Preferences
            </button>
            
            <button 
              @click="setActiveTab('sync')" 
              :class="['sidebar-nav-item c-19uecn3', { active: activeTab === 'sync' }]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-refresh-cw" style="width: 16px; height: 16px; flex-shrink: 0;"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
              Sync
            </button>
          </nav>
        </div>
        
        <div class="sidebar-stats c-19uecn3">
          <h3 class="sidebar-label c-19uecn3">Account Info</h3>
          <div class="stat-item c-19uecn3">
            <span class="stat-label c-19uecn3">User ID</span>
            <span class="stat-value stat-value-small c-19uecn3">
              {{ aniListConnected ? aniListUser.id : 'Anilist not Synced' }}
            </span>
          </div>
          <div class="stat-item c-19uecn3">
            <span class="stat-label c-19uecn3">Account Name</span>
            <span class="stat-value c-19uecn3">
              {{ aniListConnected ? aniListUser.name : 'Anilist not Synced' }}
            </span>
          </div>
          <div class="stat-item c-19uecn3">
            <span class="stat-label c-19uecn3">Status <span :style="{ backgroundColor: aniListConnected ? '#10b981' : '#ef4444' }" class="status-dot c-19uecn3"></span></span>
            <span class="stat-value c-19uecn3">
              {{ aniListConnected ? 'Connected' : 'Disconnected' }}
            </span>
          </div>
        </div>
      </aside>

      <!-- MAIN CONFIGURATION CONTENT -->
      <main class="settings-main c-19uecn3">
        <div class="settings-pages c-19uecn3" :style="{ height: pagesHeight }">
        
        <!-- SECTION: PREFERENCES -->
        <section
          id="section-preferences"
          class="settings-section c-19uecn3"
          :style="{ transform: `translateY(${sectionOffset('preferences') * 100}%)` }"
          :class="{ 'is-active': activeTab === 'preferences' }"
          :aria-hidden="activeTab !== 'preferences'"
          :inert="activeTab !== 'preferences'"
        >
          <div class="section-inner c-19uecn3">
            <h2 class="section-heading c-19uecn3">Preferences</h2>
            <div class="pref-grid c-19uecn3">
              <!-- Show Comments -->
              <div class="pref-item c-19uecn3">
                <div class="pref-desc c-19uecn3">
                  <h3 class="c-19uecn3">Show comments</h3>
                  <p class="c-19uecn3">Display the comments section on the watch page.</p>
                </div>
                <div class="pref-control c-19uecn3">
                  <button type="button" @click="preferences.showComments = !preferences.showComments" :class="['toggle-switch c-19uecn3', { active: preferences.showComments }]" aria-label="Toggle Show comments">
                    <span :class="['toggle-thumb c-19uecn3', { active: preferences.showComments }]"></span>
                  </button>
                  <span class="toggle-label c-19uecn3">Show comments</span>
                </div>
              </div>

              <!-- Default to Dubbed -->
              <div class="pref-item c-19uecn3">
                <div class="pref-desc c-19uecn3">
                  <h3 class="c-19uecn3">Default to Dubbed</h3>
                  <p class="c-19uecn3">When available, prefer dubbed audio over subbed.</p>
                </div>
                <div class="pref-control c-19uecn3">
                  <button type="button" @click="preferences.preferDub = !preferences.preferDub" :class="['toggle-switch c-19uecn3', { active: preferences.preferDub }]" aria-label="Toggle Default to Dub">
                    <span :class="['toggle-thumb c-19uecn3', { active: preferences.preferDub }]"></span>
                  </button>
                  <span class="toggle-label c-19uecn3">Default to Dubbed</span>
                </div>
              </div>

              <!-- Skip Intro Automatically -->
              <div class="pref-item c-19uecn3">
                <div class="pref-desc c-19uecn3">
                  <h3 class="c-19uecn3">Skip intro automatically</h3>
                  <p class="c-19uecn3">Automatically skip intro sequences when detected.</p>
                </div>
                <div class="pref-control c-19uecn3">
                  <button type="button" @click="preferences.skipIntro = !preferences.skipIntro" :class="['toggle-switch c-19uecn3', { active: preferences.skipIntro }]" aria-label="Toggle Skip intro automatically">
                    <span :class="['toggle-thumb c-19uecn3', { active: preferences.skipIntro }]"></span>
                  </button>
                  <span class="toggle-label c-19uecn3">Skip intro automatically</span>
                </div>
              </div>

              <!-- Skip Outro Automatically -->
              <div class="pref-item c-19uecn3">
                <div class="pref-desc c-19uecn3">
                  <h3 class="c-19uecn3">Skip outro automatically</h3>
                  <p class="c-19uecn3">Automatically skip outro/ending sequences when detected.</p>
                </div>
                <div class="pref-control c-19uecn3">
                  <button type="button" @click="preferences.skipOutro = !preferences.skipOutro" :class="['toggle-switch c-19uecn3', { active: preferences.skipOutro }]" aria-label="Toggle Skip outro automatically">
                    <span :class="['toggle-thumb c-19uecn3', { active: preferences.skipOutro }]"></span>
                  </button>
                  <span class="toggle-label c-19uecn3">Skip outro automatically</span>
                </div>
              </div>

              <!-- Auto Next Episode -->
              <div class="pref-item c-19uecn3">
                <div class="pref-desc c-19uecn3">
                  <h3 class="c-19uecn3">Auto next episode</h3>
                  <p class="c-19uecn3">Automatically play the next episode when current one finishes.</p>
                </div>
                <div class="pref-control c-19uecn3">
                  <button type="button" @click="preferences.autoNext = !preferences.autoNext" :class="['toggle-switch c-19uecn3', { active: preferences.autoNext }]" aria-label="Toggle Auto next episode">
                    <span :class="['toggle-thumb c-19uecn3', { active: preferences.autoNext }]"></span>
                  </button>
                  <span class="toggle-label c-19uecn3">Auto next episode</span>
                </div>
              </div>

              <!-- Auto Play -->
              <div class="pref-item c-19uecn3">
                <div class="pref-desc c-19uecn3">
                  <h3 class="c-19uecn3">Auto play</h3>
                  <p class="c-19uecn3">Automatically start playing when you navigate to a watch page.</p>
                </div>
                <div class="pref-control c-19uecn3">
                  <button type="button" @click="preferences.autoPlay = !preferences.autoPlay" :class="['toggle-switch c-19uecn3', { active: preferences.autoPlay }]" aria-label="Toggle Auto play">
                    <span :class="['toggle-thumb c-19uecn3', { active: preferences.autoPlay }]"></span>
                  </button>
                  <span class="toggle-label c-19uecn3">Auto play</span>
                </div>
              </div>

              <!-- Sync Threshold -->
              <div class="pref-item pref-full c-19uecn3" style="position: relative;">
                <div class="pref-desc c-19uecn3">
                  <h3 class="c-19uecn3">Sync threshold</h3>
                  <p class="c-19uecn3">The watch percentage required to mark progress as watched in AniList.</p>
                </div>
                <div class="sync-control c-19uecn3">
                  <input
                    type="range" min="50" max="100" step="5"
                    v-model.number="preferences.syncThreshold"
                    class="sync-slider c-19uecn3"
                    :style="{ background: `linear-gradient(to right, var(--primary) ${(preferences.syncThreshold - 50) * 2}%, rgba(255,255,255,0.1) ${(preferences.syncThreshold - 50) * 2}%)` }"
                  >
                  <span class="sync-value c-19uecn3">{{ preferences.syncThreshold }}%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION: SYNC -->
        <section
          id="section-sync"
          class="settings-section c-19uecn3"
          :style="{ transform: `translateY(${sectionOffset('sync') * 100}%)` }"
          :class="{ 'is-active': activeTab === 'sync' }"
          :aria-hidden="activeTab !== 'sync'"
          :inert="activeTab !== 'sync'"
        >
          <div class="section-inner c-19uecn3">
            <h2 class="section-heading c-19uecn3">Sync</h2>
            
            <div class="sync-grid animate-fade-in-up c-19uecn3" style="animation-delay: 150ms;">
              
              <!-- AniList Sync Integration Panel -->
              <div :class="['anilist-integrator c-19uecn3', { 'is-connected': aniListConnected }]">
                <div class="integrator-mesh c-19uecn3"></div>
                <div class="integrator-header c-19uecn3">
                  <div class="integrator-hero c-19uecn3">
                    
                    <!-- Connected Layout Structure -->
                    <template v-if="aniListConnected">
                      <div class="integrator-avatar-wrapper c-19uecn3">
                        <img class="integrator-avatar c-19uecn3" :src="aniListUser.avatar" :alt="aniListUser.name">
                        <div class="integrator-pulse-ring c-19uecn3"></div>
                        <div class="integrator-badge c-19uecn3">
                          <svg viewBox="0 0 24 24" fill="currentColor" class="anilist-check c-19uecn3">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
                          </svg>
                        </div>
                      </div>
                      <div class="integrator-title c-19uecn3">
                        <h3 class="c-19uecn3">{{ aniListUser.name }}</h3>
                        <p class="anilist-stats-text c-19uecn3">
                          <span style="color: #fff; font-weight: 700;">{{ aniListUser.animeCount }}</span> Anime 
                          <span style="opacity: 0.3; margin: 0 4px;">•</span> 
                          <span style="color: #fff; font-weight: 700;">{{ aniListUser.episodeCount }}</span> Eps
                        </p>
                      </div>
                    </template>
                    
                    <!-- Disconnected Layout Structure -->
                    <template v-else>
                      <div class="integrator-logo-wrapper c-19uecn3">
                        <img src="/anilist.svg" alt="AniList" class="integrator-logo-img c-19uecn3">
                      </div>
                      <div class="integrator-title c-19uecn3">
                        <h3 class="c-19uecn3">AniList Sync</h3>
                        <p class="anilist-stats-text c-19uecn3" style="opacity: 0.5; font-size: 13px;">Not Connected</p>
                      </div>
                    </template>
                    
                  </div>
                  
                  <!-- Integration Actions Switch -->
                  <div class="integrator-actions c-19uecn3">
                    <button 
                      v-if="aniListConnected" 
                      @click="disconnectAniList" 
                      class="btn-ghost-danger c-19uecn3" 
                      title="Disconnect AniList"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;" class="lucide-icon lucide lucide-unlink"><path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"></path><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"></path><line x1="8" x2="8" y1="2" y2="5"></line><line x1="2" x2="5" y1="8" y2="8"></line><line x1="16" x2="16" y1="19" y2="22"></line><line x1="19" x2="22" y1="16" y2="16"></line></svg>
                      Disconnect
                    </button>
                    <button 
                      v-else 
                      @click="connectAniList" 
                      class="btn-primary c-19uecn3" 
                      title="Connect AniList"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;" class="lucide-icon lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      Connect
                    </button>
                  </div>
                </div>
                

              </div>
              
              <!-- Core Explanatory Panel Details -->
              <div class="sync-info-card c-19uecn3">
                <h4 class="c-19uecn3">About Sync</h4>
                <p class="c-19uecn3">Sync your watch progress with AniList to keep your lists up to date. When you finish watching an episode, it will automatically update on AniList based on your sync threshold setting in Preferences.</p>
                <div class="sync-features c-19uecn3">
                  <div class="sync-feature c-19uecn3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;" class="lucide-icon lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
                    <span class="c-19uecn3">Automatic progress tracking</span>
                  </div>
                  <div class="sync-feature c-19uecn3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;" class="lucide-icon lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
                    <span class="c-19uecn3">Manual sync anytime</span>
                  </div>
                </div>
              </div>

              <!-- Backup Options (Data Management Panel) -->
              <div class="sync-info-card c-19uecn3" style="padding-bottom: 24px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;" class="c-19uecn3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide lucide-save text-primary" style="width: 20px; height: 20px;"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path><path d="M7 3v4a1 1 0 0 0 1 1h7"></path></svg>
                  <h4 style="margin: 0; font-size: 16px;" class="c-19uecn3">Data Management</h4>
                </div>
                <p class="data-col-desc c-19uecn3" style="margin-bottom: 24px;">Export your watchlist for backup or migrate your data by importing it into Re:ANIME.</p>
                
                <div class="format-cards-grid animate-fade-in c-19uecn3">
                  <!-- Native JSON Layout -->
                  <div class="format-card c-19uecn3">
                    <div class="fc-header c-19uecn3">
                      <div class="fc-icon c-19uecn3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;" class="lucide-icon lucide lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                      </div>
                      <div class="fc-info c-19uecn3">
                        <div class="fc-title c-19uecn3">JSON (Re:ANIME)</div>
                        <div class="fc-desc c-19uecn3">Native format with full profile data.</div>
                      </div>
                    </div>
                    <div class="relative flex w-full rounded-lg bg-white/[0.04] p-1 c-19uecn3" style="margin: 4px 0 8px;">
                      <div class="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-white/10 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] c-19uecn3" :style="{ left: syncFormats.json.mode === 'export' ? '4px' : 'calc(50%)' }"></div>
                      <button @click="toggleFormatMode('json', 'export')" :class="['relative flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold c-19uecn3', syncFormats.json.mode === 'export' ? 'text-white' : 'text-gray-500 hover:text-gray-400']">Export</button>
                      <button @click="toggleFormatMode('json', 'import')" :class="['relative flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold c-19uecn3', syncFormats.json.mode === 'import' ? 'text-white' : 'text-gray-500 hover:text-gray-400']">Import</button>
                    </div>
                    <button @click="handleSyncAction('json')" class="btn-primary c-19uecn3" style="width: 100%; justify-content: center;">
                      {{ syncFormats.json.mode === 'export' ? 'Download' : 'Upload' }}
                    </button>
                  </div>

                  <!-- MAL XML Schema Layout -->
                  <div class="format-card c-19uecn3">
                    <div class="fc-header c-19uecn3">
                      <div class="fc-icon c-19uecn3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;" class="lucide-icon lucide lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                      </div>
                      <div class="fc-info c-19uecn3">
                        <div class="fc-title c-19uecn3">XML (MyAnimeList)</div>
                        <div class="fc-desc c-19uecn3">Standard schema for tracker compatibility.</div>
                      </div>
                    </div>
                    <div class="relative flex w-full rounded-lg bg-white/[0.04] p-1 c-19uecn3" style="margin: 4px 0 8px;">
                      <div class="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-white/10 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] c-19uecn3" :style="{ left: syncFormats.xml.mode === 'export' ? '4px' : 'calc(50%)' }"></div>
                      <button @click="toggleFormatMode('xml', 'export')" :class="['relative flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold c-19uecn3', syncFormats.xml.mode === 'export' ? 'text-white' : 'text-gray-500 hover:text-gray-400']">Export</button>
                      <button @click="toggleFormatMode('xml', 'import')" :class="['relative flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold c-19uecn3', syncFormats.xml.mode === 'import' ? 'text-white' : 'text-gray-500 hover:text-gray-400']">Import</button>
                    </div>
                    <button @click="handleSyncAction('xml')" class="btn-primary c-19uecn3" style="width: 100%; justify-content: center;">
                      {{ syncFormats.xml.mode === 'export' ? 'Download' : 'Upload' }}
                    </button>
                  </div>

                  <!-- Legacy TXT Layout -->
                  <div class="format-card c-19uecn3">
                    <div class="fc-header c-19uecn3">
                      <div class="fc-icon c-19uecn3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;" class="lucide-icon lucide lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                      </div>
                      <div class="fc-info c-19uecn3">
                        <div class="fc-title c-19uecn3">Plain Text</div>
                        <div class="fc-desc c-19uecn3">Simple list format (legacy Re:ANIME).</div>
                      </div>
                    </div>
                    <div class="relative flex w-full rounded-lg bg-white/[0.04] p-1 c-19uecn3" style="margin: 4px 0 8px;">
                      <div class="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-white/10 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] c-19uecn3" :style="{ left: syncFormats.txt.mode === 'export' ? '4px' : 'calc(50%)' }"></div>
                      <button @click="toggleFormatMode('txt', 'export')" :class="['relative flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold c-19uecn3', syncFormats.txt.mode === 'export' ? 'text-white' : 'text-gray-500 hover:text-gray-400']">Export</button>
                      <button @click="toggleFormatMode('txt', 'import')" :class="['relative flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold c-19uecn3', syncFormats.txt.mode === 'import' ? 'text-white' : 'text-gray-500 hover:text-gray-400']">Import</button>
                    </div>
                    <button @click="handleSyncAction('txt')" class="btn-primary c-19uecn3" style="width: 100%; justify-content: center;">
                      {{ syncFormats.txt.mode === 'export' ? 'Download' : 'Upload' }}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
        </div>
      </main>
    </div>
  </main>
</template>

<style scoped>
.toggle-switch {
  display: inline-flex;
  width: 36px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  position: relative;
  align-items: center;
  padding: 2px;
  transition: background-color 0.2s ease;
}
.toggle-switch.active {
  background: var(--primary, #3b82f6);
}
.toggle-thumb {
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}
.toggle-thumb.active {
  transform: translateX(16px);
}
.capitalize {
  text-transform: capitalize;
}
.h1,h2,h3,h4,h5,h6 {
  color: #ffffff !important;
}
.h1 {
  color: #ffffff !important;
}
.opacity-20 {
  opacity: 0.2;
  pointer-events: none;
}
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 4px;
}
.text-green {
  color: #10b981 !important;
}
.sync-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}
.sync-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sync-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 122 207 0) / 0.25);
  transition: box-shadow 0.15s ease;
}
.sync-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  border: none;
}
.sync-value {
  min-width: 38px;
  text-align: right;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
}
.toggle-label {
  margin-left: 10px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 600;
}
.scroll-indicators {
  position: fixed;
  right: 14px;
  top: 50%;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 9px;
  transform: translateY(-50%);
}
.scroll-dot {
  width: 3px;
  height: 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(255,255,255,.28);
  transition: transform .2s, background .2s, height .2s;
}
.scroll-dot.active { background: var(--primary); height: 20px; transform: scaleX(1.3); }

.settings-pages {
  position: relative;
  overflow: hidden;
  transition: height 0.55s cubic-bezier(0.65, 0, 0.35, 1);
}
.settings-section {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transition: transform 0.55s cubic-bezier(0.65, 0, 0.35, 1);
  pointer-events: none;
}
.settings-section.is-active {
  pointer-events: auto;
}
</style>