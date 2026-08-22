<script setup>
/**
 * pages/anime/[id]/[epno].vue
 * Converted from the rendered watch-page HTML output.
 * All original Tailwind utility classes + the leftover scoped-style hash
 * classes (c-1u7mu3r, c-8446c5, c-g2w5l3, c-40b04a, c-1fpe2v8, ...) are kept
 * verbatim on every element, exactly as they appeared in the source markup.
 * Those hashes come from this component's own <style scoped> block in the
 * original project (not included in the HTML capture this was built from),
 * so they're preserved as-is rather than regenerated.
 *
 * Route: /anime/:id/:epno
 * Data:
 *  - `/api/anime/{id}`         -> anime metadata (title, images, genres, relations...)
 *  - `/api/watch/{id}`         -> episode list (titles, air dates, filler flags,
 *                                 thumbnails) sourced from TVDB, falling back to
 *                                 Jikan when TVDB has no mapping.
 *  - `/api/watch/ep/{id}/{epno}` -> per-server embed stream URLs, shaped as
 *                                 { "hard-sub": { "HD-1": url, ... }, "soft-sub": {...}, "dub": {...} }.
 *                                 SUB servers are sourced from "hard-sub".
 * Episode switching does NOT depend on route-param reactivity at all — it
 * was unreliable in this app's actual runtime (episode stuck on 1, and/or
 * the whole page remounting + refetching everything on every click).
 * Instead `activeEpisode` (a plain ref) is the single source of truth for
 * what's displayed/playing. Clicking an episode sets it directly and
 * synchronously, and syncs the address bar via `history.pushState` only —
 * that call can never trigger navigation, a remount, or a data refetch by
 * itself. The ONLY thing that reacts to an episode change is the stream
 * fetch that feeds the player (`watch(activeEpisode, fetchStream)`); anime
 * metadata and the episode list are fetched once on mount and never again.
 * Browser back/forward is still supported via a `popstate` listener that
 * re-derives `activeEpisode` from the URL. Theater mode renders the exact
 * same <iframe> node — the iframe is never re-created/re-sourced when
 * toggling it, so playback is never interrupted. It's teleported
 * (`<Teleport to="body">`) to the end of <body> and pinned with
 * `fixed inset-0 z-[9999]` rather than done via a page-layout swap, so it
 * can never trigger a remount/refetch and can't get trapped inside a
 * transformed ancestor's box (see the comment above
 * `watch(theaterMode, ...)` for the full story). It renders as a centered,
 * rounded 16:9 box over a dim backdrop, with a small "X" button pinned to
 * the screen corner, outside the rounded box, that exits it.
 * The Comments block only keeps its heading — the full comment list/composer
 * UI was intentionally left out.
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useWatchlist } from '~/composables/useWatchlist'
import { useAuth } from '~/composables/useAuth'
import { useAniListClient } from '~/composables/useAniListClient'

const route = useRoute()
const id = computed(() => route.params.id)
const epno = computed(() => Number(route.params.epno) || 1)

// ---------------------------------------------------------------------------
// `activeEpisode` — NOT derived from the route. It's the single source of
// truth for which episode is displayed/highlighted/playing, set directly
// and synchronously on click (see goToEpisode). The URL is kept in sync as
// a side effect via history.pushState, which only updates the address bar
// and can never trigger a navigation, remount, or data refetch on its own.
// This exists because relying on route-param reactivity for this was
// unreliable in this app's actual runtime (episode always fell back to 1,
// and/or the page was fully remounting on every click).
// ---------------------------------------------------------------------------
// `route.params.epno` is only trustworthy at the very first hydration. Every
// episode switch after that goes through goToEpisode(), which updates the
// address bar via history.pushState only — it deliberately never touches
// vue-router, so route.params.epno can freeze at whatever it was on initial
// load. On mobile, backgrounding the tab for a while and coming back can
// resume this component without a real full navigation (bfcache restore, or
// the app re-mounting the page), and if that init read from `epno` again it
// would silently snap back to episode 1. Reading the real address bar path
// instead sidesteps that entirely, since pushState always keeps it correct.
function parseEpnoFromLocation() {
  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(/\/anime\/[^/]+\/(\d+)/)
    if (match) return Number(match[1]) || 1
  }
  // Pathname didn't parse (shouldn't normally happen) — fall back to the
  // last episode we know this anime was on before trusting the route default.
  return recalledLastEpisode() ?? epno.value
}

const activeEpisode = ref(parseEpnoFromLocation())

function syncEpisodeFromUrl() {
  activeEpisode.value = parseEpnoFromLocation()
}

function rememberLastEpisode(num) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`anikage:last-episode:${id.value}`, String(num))
  } catch (err) {
    // Storage unavailable (private browsing, quota) — non-fatal.
  }
}

function recalledLastEpisode() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`anikage:last-episode:${id.value}`)
    const num = raw ? Number(raw) : null
    return Number.isFinite(num) ? num : null
  } catch (err) {
    return null
  }
}

// Take the URL seriously: if something else navigates to this page via the
// router (an external link using <NuxtLink>/router.push, e.g. from a
// "continue watching" card elsewhere in the app) with a different episode
// number, respect it. This never fires for our own in-page clicks — those
// go through goToEpisode/history.pushState, which doesn't touch
// route.params at all, so there's no risk of it fighting itself.
watch(epno, (newVal) => {
  if (newVal !== activeEpisode.value) {
    activeEpisode.value = newVal
  }
})

// ---------------------------------------------------------------------------
// Lightweight sessionStorage cache for this page's API calls. Session-scoped
// (not localStorage) on purpose: a real new visit/tab still gets fresh data,
// but backgrounding the tab and coming back to it reads the cached response
// first for an instant paint, then quietly revalidates over the network —
// so reopening the app doesn't look/feel like it "reset."
// ---------------------------------------------------------------------------
function cacheGet(key, maxAgeMs) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (maxAgeMs && Date.now() - parsed.ts > maxAgeMs) return null
    return parsed.value
  } catch (err) {
    return null
  }
}
function cacheSet(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }))
  } catch (err) {
    // Storage full/unavailable (private browsing) — non-fatal, just skip caching.
  }
}

const ANIME_CACHE_MAX_AGE = 30 * 60 * 1000 // 30 min — metadata barely changes
const EPISODES_CACHE_MAX_AGE = 30 * 60 * 1000
const STREAM_CACHE_MAX_AGE = 15 * 60 * 1000 // shorter — stream URLs can be time-limited

// ---------------------------------------------------------------------------
// Anime metadata
// ---------------------------------------------------------------------------
const anime = ref(null)
const pending = ref(true)
const error = ref(null)
const { setWatchlistStatus, removeFromWatchlist, statusFor, hydrateMedia, hydrateRemote } = useWatchlist()
const { loggedIn, openLoginModal, user } = useAuth()
const { saveScore, fetchMediaListEntry } = useAniListClient()

async function fetchAnime() {
  const cacheKey = `anikage:cache:anime:${id.value}`
  const cached = cacheGet(cacheKey, ANIME_CACHE_MAX_AGE)
  if (cached) {
    anime.value = cached
    pending.value = false
  } else {
    pending.value = true
  }
  error.value = null
  try {
    const res = await $fetch(`/api/anime/${id.value}`)
    anime.value = res
    await hydrateRemote()
    hydrateMedia(anime.value)
    cacheSet(cacheKey, res)
  } catch (err) {
    if (!cached) error.value = err
  } finally {
    pending.value = false
  }
}

const displayTitle = computed(
  () => anime.value?.title?.english || anime.value?.title?.romaji || anime.value?.title?.native || ''
)

useHead(() => ({
  title: `${displayTitle.value || 'Anime'} - Episode ${activeEpisode.value} - Re:ANIME`,
  titleTemplate: '%s',
  meta: [
    { name: 'description', content: `Watch ${displayTitle.value || 'anime'} episode ${activeEpisode.value} free online in HD on Re:ANIME.` },
    { property: 'og:title', content: `${displayTitle.value || 'Anime'} - Episode ${activeEpisode.value} - Re:ANIME` },
    { property: 'og:image', content: anime.value?.coverImage?.extraLarge || '/og.webp' }
  ]
}))

const genres = computed(() => anime.value?.genres || [])
const categories = computed(() => anime.value?.categories || [])

const studioList = computed(() => anime.value?.studios?.edges || [])

const premieredLabel = computed(() => {
  if (!anime.value?.season || !anime.value?.startDate?.year) return ''
  return `${anime.value.season} ${anime.value.startDate.year}`
})

const startDateLabel = computed(() => {
  const d = anime.value?.startDate
  if (!d || !d.month || !d.day) return ''
  const mm = String(d.month).padStart(2, '0')
  const dd = String(d.day).padStart(2, '0')
  return `${mm}.${dd}`
})

const relationEdges = computed(() => anime.value?.relations?.edges || [])

// Desktop "Related Anime" list shows the first 5, with a "Show N More" toggle
const showAllRelated = ref(false)
const visibleRelated = computed(() =>
  showAllRelated.value ? relationEdges.value : relationEdges.value.slice(0, 5)
)
const hiddenRelatedCount = computed(() => Math.max(relationEdges.value.length - 5, 0))

// Mobile "Watch more seasons of this anime" strip: shows 4 entries by default,
// with a "Show More"/"Show Less" toggle. Toggling smooth-scrolls the strip
// into view so expanding/collapsing never leaves the user stranded looking
// at an empty spot on the page.
const MOBILE_SEASONS_VISIBLE_COUNT = 4
const showAllMobileSeasons = ref(false)
const visibleMobileSeasons = computed(() =>
  showAllMobileSeasons.value ? relationEdges.value : relationEdges.value.slice(0, MOBILE_SEASONS_VISIBLE_COUNT)
)
const hiddenMobileSeasonsCount = computed(() => Math.max(relationEdges.value.length - MOBILE_SEASONS_VISIBLE_COUNT, 0))
const showMobileSeasonsToggle = computed(() => relationEdges.value.length > MOBILE_SEASONS_VISIBLE_COUNT)
const mobileSeasonsRef = ref(null)

function toggleMobileSeasons() {
  showAllMobileSeasons.value = !showAllMobileSeasons.value
  nextTick(() => {
    mobileSeasonsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function relationLabel(type) {
  if (!type) return ''
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

// ---------------------------------------------------------------------------
// Episodes — /api/watch/{id} (TVDB, falls back to Jikan). Falls back further
// to a bare numbered placeholder if that request hasn't landed yet or fails,
// so the grid is never empty.
// ---------------------------------------------------------------------------
const episodes = ref([])
const episodesSource = ref(null)
const episodesPending = ref(true)
const episodesError = ref(null)

async function fetchEpisodes() {
  const cacheKey = `anikage:cache:episodes:${id.value}`
  const cached = cacheGet(cacheKey, EPISODES_CACHE_MAX_AGE)
  if (cached) {
    episodes.value = cached.episodes || []
    episodesSource.value = cached.source || null
    episodesPending.value = false
  } else {
    episodesPending.value = true
  }
  episodesError.value = null
  try {
    const res = await $fetch(`/api/watch/${id.value}`)
    // Normalize episode numbers to a season-relative 1..N sequence.
    // Some sources (TVDB in particular) number episodes absolutely/continuing
    // across "parts" of a season — e.g. a Part 2 whose real episodes are
    // 14-25 rather than 1-12. Every other API this page talks to (AniSkip
    // skip times, continue-reading progress, thumbnail proxy keys, share
    // links, the range grouping/search UI) assumes episode numbers start at
    // 1 for whatever's currently airing, so we remap right at the source
    // instead of threading "is this absolute or relative" through the rest
    // of the app. The original number is kept as `absoluteNumber` in case
    // it's ever needed (e.g. to cross-reference a thumbnail keyed by the
    // TVDB episode id).
    const rawEpisodes = res?.episodes || []
    episodes.value = rawEpisodes
      .slice()
      .sort((a, b) => (epNum(a) ?? 0) - (epNum(b) ?? 0))
      .map((e, i) => ({
        ...e,
        absoluteNumber: epNum(e),
        number: i + 1
      }))
    episodesSource.value = res?.source || null
    cacheSet(cacheKey, { episodes: episodes.value, source: episodesSource.value })
    // TEMP DIAGNOSTIC — remove once episode navigation is confirmed working.
    // eslint-disable-next-line no-console
    console.log('[ep-debug] episodes fetched:', episodes.value.length, 'sample item:', episodes.value[0])
  } catch (err) {
    if (!cached) {
      episodesError.value = err
      episodes.value = []
    }
  } finally {
    episodesPending.value = false
  }
}

onMounted(() => {
  // TEMP DIAGNOSTIC — remove once episode navigation is confirmed working.
  // If this line logs again every time you click an episode, the whole page
  // is remounting (likely a `<NuxtPage :key="route.fullPath">` in app.vue),
  // not just re-rendering — that's a separate, layout-level fix.
  // eslint-disable-next-line no-console
  console.log('[ep-debug] page mounted. route:', route.fullPath)
  fetchAnime()
  fetchEpisodes()
  fetchStream()
  loadPreferences()
  loadUserRating()
  countdownInterval = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
  window.addEventListener('popstate', syncEpisodeFromUrl)
  // Mobile browsers commonly freeze a backgrounded tab and restore it from
  // bfcache rather than re-running the app from scratch. Both events below
  // fire on that kind of resume — re-derive activeEpisode from the URL each
  // time so a phone reopened after a few minutes never appears to "jump
  // back" to episode 1.
  window.addEventListener('pageshow', syncEpisodeFromUrl)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('message', onCommentTimestampClick)
  // Teleported range menu: keep it glued to the button on scroll/resize
  // (capture:true so scrolling happens inside any nested scroll container
  // too, not just the window), and close it on outside clicks since it's
  // no longer nested where a natural click-outside-the-relative-wrapper
  // would catch it.
  window.addEventListener('resize', handleRangeReposition)
  window.addEventListener('scroll', handleRangeReposition, true)
  document.addEventListener('click', handleRangeOutsideClick, true)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  if (typeof window !== 'undefined') {
    window.removeEventListener('popstate', syncEpisodeFromUrl)
    window.removeEventListener('pageshow', syncEpisodeFromUrl)
    window.removeEventListener('message', onCommentTimestampClick)
    window.removeEventListener('resize', handleRangeReposition)
    window.removeEventListener('scroll', handleRangeReposition, true)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('click', handleRangeOutsideClick, true)
  }
})

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') syncEpisodeFromUrl()
}

const episodeCount = computed(() => episodes.value.length || anime.value?.episodes || 100)

const displayEpisodes = computed(() => {
  if (episodes.value.length) return episodes.value
  return Array.from({ length: episodeCount.value }, (_, i) => ({
    number: i + 1,
    title: `Episode ${i + 1}`,
    airDate: null,
    thumbnail: null,
    filler: false,
    recap: false
  }))
})

// Episode numbers are read defensively — different episode-list sources
// (TVDB vs Jikan, or future API changes) may not all use the same field
// name, and a silent mismatch here is what causes "always shows episode 1"
// bugs. Add more field names here if your API uses something else.
function epNum(e) {
  if (!e) return null
  const raw = e.number ?? e.episode ?? e.episodeNumber ?? e.ep
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

const currentEpisode = computed(
  () => displayEpisodes.value.find((e) => epNum(e) === activeEpisode.value) || displayEpisodes.value[0]
)
const currentEpisodeNumber = computed(() => epNum(currentEpisode.value) ?? activeEpisode.value)

// ---- Live "next episode" countdown — also rendered inside theater/fullscreen ----
const nowTick = ref(Date.now())
let countdownInterval = null

const nextEpisodeAiringAtMs = computed(() => {
  const airingAt = anime.value?.nextAiringEpisode?.airingAt
  return airingAt ? airingAt * 1000 : null
})

const nextEpisodeDateLabel = computed(() => {
  if (!nextEpisodeAiringAtMs.value) return ''
  return new Date(nextEpisodeAiringAtMs.value).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
})

const nextEpisodeCountdownLabel = computed(() => {
  if (!nextEpisodeAiringAtMs.value) return ''
  const diff = nextEpisodeAiringAtMs.value - nowTick.value
  if (diff <= 0) return ''
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`
})

function episodeHref(num) {
  return `/anime/${id.value}/${num}`
}

// Switching episodes updates `activeEpisode` directly — a plain ref
// assignment, synchronous, with no dependency on router/route reactivity.
// The URL is updated via history.pushState only, which changes the address
// bar without ever navigating, reloading, or remounting anything.
function goToEpisode(num) {
  // TEMP DIAGNOSTIC — remove once episode navigation is confirmed working.
  // eslint-disable-next-line no-console
  console.log('[ep-debug] goToEpisode clicked:', num, 'current was:', currentEpisodeNumber.value)
  if (num === currentEpisodeNumber.value) return
  activeEpisode.value = num
  if (typeof window !== 'undefined' && window.history?.pushState) {
    window.history.pushState({}, '', episodeHref(num))
  }
}

function formatAirDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Thumbnail fallback chain: episode thumbnail -> anime banner -> anime cover -> null (shows "EP N")
function episodeThumbnail(ep) {
  return ep.thumbnail || anime.value?.bannerImage || anime.value?.coverImage?.extraLarge || null
}

// ---- Search + 100-episode range grouping (matches the "1-100" dropdown) ----
const episodeSearch = ref('')
const rangeOpen = ref(false)
const activeRangeIndex = ref(0)
const rangeShowAll = ref(false)

// Some episode-list sources (TVDB in particular) number episodes with an
// absolute/continuing scheme rather than starting at 1 — e.g. a "Part 2"
// season whose episodes are numbered 14-25 instead of 1-12. Anchoring the
// range groups at a hardcoded `1` breaks that case entirely: the group
// becomes {1, episodeCount} (e.g. {1, 12}), every real episode number (14-25)
// falls outside it, and the grid renders as "No episodes found" even though
// the episodes loaded fine. Anchor at the actual min episode number present
// in the data instead.
const episodeNumberBounds = computed(() => {
  const nums = displayEpisodes.value.map((e) => epNum(e)).filter((n) => n !== null)
  if (!nums.length) return { min: 1, max: episodeCount.value }
  return { min: Math.min(...nums), max: Math.max(...nums) }
})

const rangeGroups = computed(() => {
  const { min, max } = episodeNumberBounds.value
  const groups = []
  for (let start = min; start <= max; start += 100) {
    groups.push({ start, end: Math.min(start + 99, max) })
  }
  return groups.length ? groups : [{ start: min, end: max }]
})

const activeRangeLabel = computed(() => {
  if (rangeShowAll.value) return 'All Eps'
  const g = rangeGroups.value[activeRangeIndex.value] || rangeGroups.value[0]
  return g ? `${g.start}-${g.end}` : ''
})

function selectRange(i) {
  activeRangeIndex.value = i
  rangeShowAll.value = false
  rangeOpen.value = false
}

function selectAllRange() {
  rangeShowAll.value = true
  rangeOpen.value = false
}

// The range panel is teleported straight to <body> (see the template) and
// positioned with `fixed` + coordinates read off the button's own
// bounding box. It CANNOT stay inline where the button sits: that button
// lives inside the horizontally-scrolling episodes-panel header row
// (`overflow-x-auto`), and per the CSS spec, setting overflow-x to
// anything but `visible` forces overflow-y to compute as `auto` too — so
// that row silently clips anything, absolutely-positioned children
// included, that extends past its own height. That's why the panel used
// to "not open": `rangeOpen` was flipping fine, the panel was just being
// rendered invisibly inside a 1-line-tall clipped box. Teleporting it out
// from under that ancestor is what actually fixes it.
const rangeButtonRef = ref(null)
const rangeMenuRef = ref(null)
const rangeMenuStyle = ref({})

function updateRangeMenuPosition() {
  const btn = rangeButtonRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  rangeMenuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`
  }
}

function toggleRangeOpen() {
  rangeOpen.value = !rangeOpen.value
  if (rangeOpen.value) {
    nextTick(updateRangeMenuPosition)
  }
}

function handleRangeReposition() {
  if (rangeOpen.value) updateRangeMenuPosition()
}

function handleRangeOutsideClick(e) {
  if (!rangeOpen.value) return
  if (rangeButtonRef.value?.contains(e.target)) return
  if (rangeMenuRef.value?.contains(e.target)) return
  rangeOpen.value = false
}

// Keep the visible range synced to whatever episode is currently playing —
// but only while a specific range is selected; "All Eps" stays sticky.
watch(
  currentEpisodeNumber,
  (num) => {
    if (rangeShowAll.value) return
    const idx = rangeGroups.value.findIndex((g) => num >= g.start && num <= g.end)
    if (idx !== -1) activeRangeIndex.value = idx
  },
  { immediate: true }
)

function matchesAudioFilter(e) {
  if (audioFilter.value === 'sub') return episodeHasSub(e)
  if (audioFilter.value === 'dub') return episodeHasDub(e)
  return true
}

const filteredEpisodes = computed(() => {
  const q = episodeSearch.value.trim().toLowerCase()
  if (q) {
    return displayEpisodes.value.filter(
      (e) =>
        (String(epNum(e) ?? '').includes(q) || e.title?.toLowerCase().includes(q)) && matchesAudioFilter(e)
    )
  }
  if (rangeShowAll.value) {
    return displayEpisodes.value.filter((e) => matchesAudioFilter(e))
  }
  const group = rangeGroups.value[activeRangeIndex.value] || rangeGroups.value[0]
  return displayEpisodes.value.filter(
    (e) => epNum(e) >= group.start && epNum(e) <= group.end && matchesAudioFilter(e)
  )
})

function clearEpisodeSearch() {
  episodeSearch.value = ''
}

// Whether the current visible episode range includes filler / recap episodes
// — used to decide whether to show the legend below the episode list.
const hasFillerEpisodes = computed(() => filteredEpisodes.value.some((e) => e.filler))
const hasRecapEpisodes = computed(() => filteredEpisodes.value.some((e) => e.recap))


// ---- Episode panel view mode + spoiler shield ----
const episodeViewMode = ref('grid') // 'grid' | 'list'
const spoilerShield = ref(false)

// ---- Sub / Dub audio filter ----
// Episodes may (or may not) carry hasSub/hasDub flags depending on source
// (TVDB vs Jikan). When a flag is missing we treat that audio track as
// "unknown" rather than "absent" so the filter never hides an episode we
// simply don't have data for.
const audioFilter = ref('all') // 'all' | 'sub' | 'dub'

function episodeHasSub(ep) {
  const v = ep?.hasSub ?? ep?.sub
  return v === undefined ? true : !!v
}
function episodeHasDub(ep) {
  const v = ep?.hasDub ?? ep?.dub
  return v === undefined ? false : !!v
}
function episodeAudioLabel(ep) {
  const sub = episodeHasSub(ep)
  const dub = episodeHasDub(ep)
  if (sub && dub) return 'Sub • Dub'
  if (dub) return 'Dub'
  return 'Sub'
}
function setAudioFilter(mode) {
  audioFilter.value = mode
}

function toggleViewMode() {
  episodeViewMode.value = episodeViewMode.value === 'grid' ? 'list' : 'grid'
  savePreferences()
}

function toggleSpoilerShield() {
  spoilerShield.value = !spoilerShield.value
  savePreferences()
}

function isSpoiler(ep) {
  return spoilerShield.value
}

// ---------------------------------------------------------------------------
// Player controls
// ---------------------------------------------------------------------------
const theaterMode = ref(false)
// `theaterMode` is the logical on/off switch (drives scroll-lock, Esc
// handling, the toolbar's active state, etc.) and flips instantly.
// `theaterRendered` controls whether the player box actually uses the
// fixed/centered theater DOM layout, and `theaterAnimating` controls the
// scale/opacity "settled" state. These two lag `theaterMode` on exit so the
// box can play its zoom-out/fade-out transition BEFORE it snaps back to the
// normal inline layout — see `watch(theaterMode, ...)` below.
const theaterRendered = ref(false)
const theaterAnimating = ref(false)
const THEATER_ANIM_MS = 300
let theaterAnimTimeout = null
// Refs onto the actual player DOM nodes — needed so the enter animation can
// force a synchronous style flush (see `watch(theaterMode, ...)` below).
const playerBoxRef = ref(null)
const theaterBoxRef = ref(null)
const autoPlay = ref(false)
const autoNext = ref(true)
const autoSkipIntro = ref(false)
const autoSkip = ref(false) // autoSkipOutro
const preferDub = ref(false)
const showComments = ref(false)

function toggleTheater() {
  theaterMode.value = !theaterMode.value
}
function toggleAutoPlay() {
  autoPlay.value = !autoPlay.value
  savePreferences()
}
function toggleAutoNext() {
  autoNext.value = !autoNext.value
  savePreferences()
}
function toggleAutoSkipIntro() {
  autoSkipIntro.value = !autoSkipIntro.value
  sendMessage({ type: 'setAutoSkipIntro', value: autoSkipIntro.value })
  savePreferences()
}
function toggleAutoSkip() {
  autoSkip.value = !autoSkip.value
  sendMessage({ type: 'setAutoSkipOutro', value: autoSkip.value })
  savePreferences()
}

// Theater mode reuses the SAME iframe node (only wrapper CSS/DOM position
// change — the iframe is never re-created or re-sourced), so the embed
// never reloads and playback is never interrupted.
// It's implemented in the template as a client-only <Teleport to="body">
// that moves the whole player block to the end of <body> and pins it with
// `position: fixed; inset: 0; z-index: 9999`. That's deliberate instead of
// a page-layout swap (e.g. Nuxt's `setPageLayout`):
//  - A layout swap can trigger a remount/refetch of page-level data, which
//    is what caused the "reloads the page" bug.
//  - `.watch-page-enter` (the wrapper around this whole page's content) and
//    a few other elements use CSS transforms for their enter/hover
//    animations. Any ancestor with a `transform` becomes a new containing
//    block for descendant `position: fixed` elements per spec — so the old
//    fixed-inset-0 theater box was being confined to that ancestor's box
//    instead of the real viewport, which is why it "didn't work" (wrong
//    size/position, sometimes clipped or scrollable).
// Teleporting straight to <body> sidesteps both problems: no data refetch,
// and no transformed ancestor left in the chain to hijack `fixed`.
//  - Body scroll is still locked while theater mode is on.
watch(theaterMode, async (isTheater) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isTheater ? 'hidden' : ''

  if (theaterAnimTimeout) {
    clearTimeout(theaterAnimTimeout)
    theaterAnimTimeout = null
  }

  if (isTheater) {
    // Enter: switch to the fixed/centered theater layout first, starting
    // from the "unsettled" (scaled-down, transparent) state.
    theaterRendered.value = true
    theaterAnimating.value = false
    // `nextTick` makes sure Vue has actually patched the DOM with the
    // "unsettled" classes above before we do anything else. That alone
    // isn't enough though — forcing a layout reflow (e.g. reading
    // `offsetHeight`) only computes layout, it does NOT force the browser
    // to *paint*, so the unsettled frame can still get silently merged
    // with the very next state change and never actually render (which is
    // what caused it to just pop open). A genuine double
    // `requestAnimationFrame` is what guarantees a real paint happens in
    // between: the first rAF fires right before the browser paints the
    // unsettled frame that nextTick just committed; requesting a SECOND
    // rAF from inside that callback defers to the frame after THAT paint
    // has happened, so flipping to the settled state there is guaranteed
    // to be a genuine, visible transition instead of an instant jump.
    await nextTick()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        theaterAnimating.value = true
      })
    })
  } else {
    // Exit: play the zoom-out/fade-out first (still in the fixed theater
    // layout), then drop back to the normal inline layout once that
    // transition has actually finished — otherwise the box would just
    // vanish/snap instead of animating back out.
    theaterAnimating.value = false
    theaterAnimTimeout = setTimeout(() => {
      theaterRendered.value = false
      theaterAnimTimeout = null
    }, THEATER_ANIM_MS)
  }
})

// Esc closes theater mode, same as any other modal/overlay.
function handleTheaterKeydown(e) {
  if (e.key === 'Escape' && theaterMode.value) {
    toggleTheater()
  }
}
onMounted(() => {
  window.addEventListener('keydown', handleTheaterKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleTheaterKeydown)
  if (theaterAnimTimeout) clearTimeout(theaterAnimTimeout)
})

// ---- Watchlist ----
// Route IDs may be provider slugs; AniList/watchlist state is keyed by the
// resolved media ID returned by the anime endpoint.
// Watchlist state is handled by the WatchlistDropdown component.

// ---- Watch2Gether: generates a shareable room link and copies it ----
const w2gCopied = ref(false)
async function createW2GRoom() {
  const roomCode = Math.random().toString(36).slice(2, 8)
  const url = `${window.location.origin}/anime/${id.value}/${currentEpisodeNumber.value}?room=${roomCode}`
  try {
    await navigator.clipboard.writeText(url)
  } catch (err) {
    // Clipboard API can fail (permissions, insecure context) — non-fatal.
  }
  w2gCopied.value = true
  setTimeout(() => (w2gCopied.value = false), 2000)
}

// ---------------------------------------------------------------------------
// Embed servers — /api/watch/ep/{id}/{epno} returns per-server stream URLs:
//   { "hard-sub": { "HD-1": url, ... }, "soft-sub": { ... }, "dub": { ... } }
// The SUB switcher is sourced from "hard-sub". Switching a server (or the
// sub/dub track) updates the iframe src via `activeEmbedUrl`; toggling
// theater mode never touches this element, so the embed is never reloaded.
// ---------------------------------------------------------------------------
const streamData = ref(null)
const streamPending = ref(true)
const streamError = ref(null)

async function fetchStream() {
  const epNum = activeEpisode.value
  const cacheKey = `anikage:cache:stream:${id.value}:${epNum}`
  const cached = cacheGet(cacheKey, STREAM_CACHE_MAX_AGE)
  if (cached) {
    streamData.value = cached
    streamPending.value = false
  } else {
    streamPending.value = true
  }
  streamError.value = null
  try {
    const res = await $fetch(`/api/watch/${id.value}/${epNum}`)
    streamData.value = res
    cacheSet(cacheKey, res)
  } catch (err) {
    if (!cached) {
      streamError.value = err
      streamData.value = null
    }
  } finally {
    streamPending.value = false
  }
  // Once THIS episode's servers are in (from cache or network), warm the
  // cache for the next one in the background. It's fire-and-forget and
  // never touches streamData/streamPending/streamError — it's not for
  // display, it's just so that when autoNext (or a manual click) reaches
  // that episode, fetchStream() finds it already cached and resolves
  // instantly instead of waiting on a fresh round-trip.
  prefetchStream(epNum + 1)
}

async function prefetchStream(epNum) {
  if (epNum > episodeCount.value) return
  const cacheKey = `anikage:cache:stream:${id.value}:${epNum}`
  if (cacheGet(cacheKey, STREAM_CACHE_MAX_AGE)) return // already warm
  try {
    const res = await $fetch(`/api/watch/${id.value}/${epNum}`)
    cacheSet(cacheKey, res)
  } catch (err) {
    // Best-effort — if this fails, the real fetchStream() call whenever
    // that episode is actually reached just falls back to a normal fetch.
  }
}

// Refetch stream servers whenever the episode changes (e.g. /1 -> /2) — this
// is the ONLY thing that refetches on episode change. Nothing else does.
const { saveProgress, getLocalData } = useProgressSync()
const watchTime = ref(0)
const watchDuration = ref(0) // total episode duration from player
let watchInterval = null

// "Watched" episodes for the grey-out treatment below (grid) and the
// `is-watched` state (list) are derived from the same AniList-style
// `progress` marker syncCurrentProgress() already writes — i.e. the
// highest episode number confirmed watched-through, same semantics
// AniList itself uses ("progress: 9" = watched through ep 9). There's no
// separate per-episode watched SET tracked anywhere else in the app, so
// this is the same simplification the rest of the site already relies on
// (e.g. "continue watching" cards): everything at or below that number
// reads as watched, the currently-open episode is excluded since it
// already gets its own "now playing" highlight.
// Recomputed off the existing 1s `nowTick` heartbeat (declared below)
// rather than threading a refresh call through every syncCurrentProgress()
// call site — local storage isn't reactive on its own, so this just
// re-reads it once a second, which is plenty responsive for a grey-out.
const watchedThroughEpisode = computed(() => {
  nowTick.value // dependency only — forces a re-read every tick
  try {
    const localData = getLocalData()
    return localData?.[String(id.value)]?.progress || 0
  } catch (err) {
    return 0
  }
})

function isEpisodeWatched(ep) {
  const num = epNum(ep)
  if (num == null) return false
  return num <= watchedThroughEpisode.value && num !== currentEpisodeNumber.value
}

const syncCurrentProgress = async (isComplete = false) => {
  if (anime.value) {
    const timeToSave = isComplete ? 0 : (watchTime.value > 0 ? watchTime.value : undefined)
    await saveProgress({
      type: 'anime',
      id: id.value,
      progress: isComplete ? activeEpisode.value : Math.max(0, activeEpisode.value - 1),
      currentEpisode: activeEpisode.value,
      time: timeToSave,
      duration: watchDuration.value || undefined,
      status: 'Watching',
      extraData: {
        title: anime.value.title.english || anime.value.title.romaji,
        cover: anime.value.coverImage.extraLarge || anime.value.coverImage.large,
        bannerImage: anime.value.bannerImage,
        format: anime.value.format,
        mediaStatus: anime.value.status,
        episodes: anime.value.episodes,
        genres: anime.value.genres,
        meanScore: anime.value.meanScore,
        seasonYear: anime.value.seasonYear,
        season: anime.value.season
      }
    })
  }
}

// hasSeeked tracks whether we've restored the saved timestamp for the CURRENT
// episode. It starts false and is set true after we seek on the 'ready' message.
// On episode SWITCH we set it to true immediately — this prevents restoring the
// PREVIOUS episode's timestamp into the new episode's player.
let hasSeeked = false
watch(activeEpisode, (newVal, oldVal) => {
  // TEMP DIAGNOSTIC — remove once episode navigation is confirmed working.
  // eslint-disable-next-line no-console
  console.log('[ep-debug] activeEpisode changed:', oldVal, '->', newVal, '(refetching player only)')
  rememberLastEpisode(newVal)
  watchTime.value = 0
  watchDuration.value = 0
  // Mark as already seeked so the new episode starts from the beginning.
  // The only place hasSeeked=false is the very first load (above, initialised at
  // declaration) — episode switches should always start fresh.
  hasSeeked = true
  fetchStream()
  syncCurrentProgress()
})

const iframeRef = ref(null)

function sendMessage(msg) {
  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.postMessage({ source: 'anikage-player-host', ...msg }, '*')
  }
}

// ---------------------------------------------------------------------------
// Best-effort native-fullscreen continuity across an autoplay-triggered
// episode switch. Theater mode needs nothing extra here — it's keyed off
// the `theaterMode` ref, which goToEpisode() never touches, so it just
// stays on through the switch on its own.
// Real browser Fullscreen is different: changing the iframe's `src` (how an
// episode switch updates the SAME node) counts as navigating that frame,
// and some browsers exit the Fullscreen API when the fullscreen element
// navigates. There's no way to guarantee re-entering fullscreen from
// script — the Fullscreen API requires a user gesture, and a postMessage
// 'ended'/'ready' event doesn't count as one in every browser — so this is
// deliberately best-effort: if we were fullscreen right before autoplaying
// into the next episode, remember that and try to restore it once the new
// episode's player reports 'ready'. Where a browser blocks the re-request,
// the person just briefly drops out of fullscreen instead of erroring.
let pendingFullscreenRestore = false

// The player is NEVER told to start playing except right after an
// autoNext-triggered episode switch. `pendingAutoPlayStart` is set true at
// the exact moment 'ended' fires goToEpisode(nextEp) (see the 'ended'
// branch below), and consumed — sending one `{ type: 'play' }` — the next
// time that new episode's player reports 'ready'. A manual click, browser
// back/forward, or the very first load of the page never sets this flag,
// so the player is left exactly as it comes up (paused) in every other
// case — no unsolicited play command.
let pendingAutoPlayStart = false

function isPlayerFullscreen() {
  if (typeof document === 'undefined') return false
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement
  return !!fsEl && (fsEl === iframeRef.value || !!fsEl.contains?.(iframeRef.value))
}

function requestPlayerFullscreen() {
  const el = iframeRef.value
  if (!el) return
  const request = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen
  if (request) {
    Promise.resolve(request.call(el)).catch(() => {
      // Blocked (no active user gesture, etc.) — nothing more we can do.
    })
  }
}

watch(autoSkip, (val) => {
  sendMessage({ type: 'setAutoSkipOutro', value: val })
})

watch(autoSkipIntro, (val) => {
  sendMessage({ type: 'setAutoSkipIntro', value: val })
})

// Deliberately no watch(autoPlay, ...) here — toggling "Auto Play" is a
// local preference only (see toggleAutoPlay/savePreferences) and never
// messages the embedded player by itself. The player only ever gets an
// explicit play command in the one place that actually needs it: right
// after an autoNext-triggered episode switch (see pendingAutoPlayStart).

// ---------------------------------------------------------------------------
// Global keyboard shortcuts — the "Keys" toolbar button's popover lists
// these. Skipped while focus is inside a text field (search boxes, settings
// inputs, etc.) so typing isn't hijacked, and skipped while any modifier is
// held so OS/browser shortcuts (Ctrl+F, Cmd+K, ...) keep working normally.
// These only reach `window` while focus is on the page itself — once the
// iframe is focused (e.g. after clicking inside the player) the browser
// hands keyboard events to that cross-origin frame instead, which is why
// clicking back out on the page is what restores them (see the popover's
// footnote).
// Play/pause is sent as `{ type: 'togglePlay' }`, following the same naming
// convention as the existing `setAutoSkipIntro`/`setAutoSkipOutro`/`play`
// messages — this assumes the embedded player recognizes that message
// type; if it doesn't, the player simply ignores it (same best-effort
// spirit as the fullscreen-restore logic above).
// ---------------------------------------------------------------------------
function seekBy(deltaSeconds) {
  const target = Math.max(0, watchTime.value + deltaSeconds)
  sendMessage({ type: 'seek', time: watchDuration.value ? Math.min(target, watchDuration.value) : target })
}
function seekToPercent(tenths) {
  if (!watchDuration.value) return
  sendMessage({ type: 'seek', time: (watchDuration.value * tenths) / 10 })
}
function togglePlayback() {
  sendMessage({ type: 'togglePlay' })
}
function toggleFullscreen() {
  if (isPlayerFullscreen()) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen
    exit?.call(document)
  } else {
    requestPlayerFullscreen()
  }
}
function goToNextEpisode() {
  const next = activeEpisode.value + 1
  if (next <= episodeCount.value) goToEpisode(next)
}
function goToPreviousEpisode() {
  const prev = activeEpisode.value - 1
  if (prev >= 1) goToEpisode(prev)
}

function handlePlayerShortcuts(e) {
  const target = e.target
  const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  if (isTyping || e.ctrlKey || e.metaKey || e.altKey) return

  switch (e.key) {
    case ' ':
    case 'k':
    case 'K':
      e.preventDefault()
      togglePlayback()
      break
    case 'ArrowLeft':
      e.preventDefault()
      seekBy(-5)
      break
    case 'ArrowRight':
      e.preventDefault()
      seekBy(5)
      break
    case 'j':
    case 'J':
      seekBy(-10)
      break
    case 'l':
    case 'L':
      seekBy(10)
      break
    case 'f':
    case 'F':
      toggleFullscreen()
      break
    case 't':
    case 'T':
      toggleTheater()
      break
    case 'n':
    case 'N':
      goToNextEpisode()
      break
    case 'p':
    case 'P':
      goToPreviousEpisode()
      break
    default:
      if (e.key >= '0' && e.key <= '9') {
        seekToPercent(Number(e.key))
      }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handlePlayerShortcuts)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handlePlayerShortcuts)
})

function switchServer() {
  const map = streamData.value?.[activeCategory.value] || {}
  const labels = Object.keys(map)
  if (!labels.length) return
  const currentIdx = activeServerIndexByCategory.value[activeCategory.value] || 0
  if (currentIdx + 1 < labels.length) {
    selectServer(activeCategory.value, currentIdx + 1)
  }
}

const handlePlayerMessage = (e) => {
  if (e.data?.source !== 'anikage-player') return
  
  const { type, payload, currentTime, duration } = e.data
  
  if (type === 'time' && currentTime !== undefined) {
    watchTime.value = currentTime
    if (duration) watchDuration.value = duration
    syncCurrentProgress()
  } else if (type === 'ready') {
    if (duration) watchDuration.value = duration
    sendMessage({ type: 'setAutoSkipIntro', value: autoSkipIntro.value })
    sendMessage({ type: 'setAutoSkipOutro', value: autoSkip.value })
    
    const localData = getLocalData()
    const saved = localData[String(id.value)]
    
    if (saved && saved.time > 0 && !hasSeeked) {
      const isMatchingEpisode = saved.currentEpisode
        ? saved.currentEpisode === activeEpisode.value
        : (saved.progress === Math.max(0, activeEpisode.value - 1) || saved.progress === activeEpisode.value)
        
      if (isMatchingEpisode) {
        sendMessage({ type: 'seek', time: saved.time })
        hasSeeked = true
      }
    }

    if (pendingFullscreenRestore) {
      pendingFullscreenRestore = false
      requestPlayerFullscreen()
    }

    // The ONE place the player is ever told to start playing: right after
    // an autoNext-triggered switch (flag set in the 'ended' branch below).
    // Every other 'ready' — manual click, back/forward, first load — never
    // sets this flag, so nothing is sent and the player is left as-is.
    if (pendingAutoPlayStart) {
      pendingAutoPlayStart = false
      sendMessage({ type: 'play' })
    }
  } else if (type === 'status') {
    if (payload?.ok === true) {
      sendMessage({ type: 'setAutoSkipIntro', value: autoSkip.value })
      sendMessage({ type: 'setAutoSkipOutro', value: autoSkip.value })
    } else if (payload?.ok === false) {
      switchServer()
    }
  } else if (type === 'ended') {
    if (duration) watchDuration.value = duration
    syncCurrentProgress(true)
    if (autoNext.value) {
      const nextEp = activeEpisode.value + 1
      if (nextEp <= episodeCount.value) {
        // Same server/category: activeCategory + activeServerIndexByCategory
        // aren't reset on episode change, and the watch(streamData, ...)
        // below re-matches the same-named server once the new episode's
        // list loads — so this naturally continues on the same server.
        // Theater mode: stays on by itself (see comment above).
        // Native fullscreen: remember it, restore attempted on 'ready' above.
        pendingFullscreenRestore = isPlayerFullscreen()
        // Prefetching (see fetchStream/prefetchStream) means this next
        // episode's servers are very likely already cached, so this whole
        // switch — goToEpisode -> fetchStream cache-hit -> new iframe src
        // -> 'ready' -> the play send above — happens back-to-back with no
        // visible network wait: an instant switch into playback.
        pendingAutoPlayStart = true
        goToEpisode(nextEp)
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('message', handlePlayerMessage)
  
  // Initial sync once anime is fetched
  watch(anime, (val) => {
    if (val) syncCurrentProgress()
  }, { once: true })
})

onUnmounted(() => {
  window.removeEventListener('message', handlePlayerMessage)
  syncCurrentProgress() // Final sync on leave
})

// The API is free to return any set of category names at the top level of
// the /api/watch/{id}/{epno} payload — e.g. "h-sub", "e-sub", "hard-sub",
// "soft-dub", "e-dub", "dub", or anything else. Nothing here is hardcoded to
// "sub"/"dub"; every category the API sends back gets its own row of server
// buttons, in the order the API returned them.

// Only categories that actually have at least one server are shown. No
// placeholder/default servers are shown while waiting — the site-wide
// loading bar communicates that a fetch is in flight.
const streamCategories = computed(() => {
  const data = streamData.value || {}
  return Object.keys(data).filter((key) => data[key] && Object.keys(data[key]).length > 0)
})

const displayCategories = computed(() => streamCategories.value)

function categoryServerLabels(category) {
  return Object.keys(streamData.value?.[category] || {})
}

// Turns an API category key into a display label, e.g. "hard-sub" -> "HARD-SUB",
// "e_dub" -> "E-DUB". Works for whatever naming convention the API uses.
function categoryLabel(category) {
  return String(category).replace(/_/g, '-').toUpperCase()
}

const activeCategory = ref('sub')
const activeServerIndexByCategory = ref({})
// Remembers the actual server NAME (e.g. "HD-1"), not just its index — a
// server list can be reordered/trimmed episode to episode, so matching by
// name is what actually keeps "the same server" selected across an
// autoplay-triggered episode switch. Index is still what `activeEmbedUrl`
// and the button highlighting use day-to-day; this is only consulted below
// when a fresh episode's server list comes in.
const activeServerLabelByCategory = ref({})

function selectServer(category, index) {
  activeCategory.value = category
  const labels = categoryServerLabels(category)
  activeServerIndexByCategory.value = { ...activeServerIndexByCategory.value, [category]: index }
  activeServerLabelByCategory.value = { ...activeServerLabelByCategory.value, [category]: labels[index] }
}

// Keep activeCategory pointed at something that actually exists once the API
// responds (categories can differ episode to episode) — default to whichever
// category the API listed first.
watch(
  streamCategories,
  (cats) => {
    if (cats.length && !cats.includes(activeCategory.value)) {
      activeCategory.value = preferDub.value
        ? (cats.find(category => category.toLowerCase().includes('dub')) || cats[0])
        : cats[0]
    }
  },
  { immediate: true }
)

// Whenever a new episode's servers load (including the automatic switch
// from `autoNext` above), re-point every category at the SAME NAMED server
// the person was already watching — e.g. stay on "HD-2" sub across episode
// 4 -> 5 — falling back to the first server for that category if it isn't
// offered this episode.
watch(streamData, () => {
  for (const category of streamCategories.value) {
    const labels = categoryServerLabels(category)
    if (!labels.length) continue
    const preferredLabel = activeServerLabelByCategory.value[category]
    const matchedIdx = preferredLabel ? labels.indexOf(preferredLabel) : -1
    const idx = matchedIdx !== -1 ? matchedIdx : 0
    activeServerIndexByCategory.value = { ...activeServerIndexByCategory.value, [category]: idx }
    activeServerLabelByCategory.value = { ...activeServerLabelByCategory.value, [category]: labels[idx] }
  }
})

const activeEmbedUrl = computed(() => {
  const map = streamData.value?.[activeCategory.value] || {}
  const labels = Object.keys(map)
  if (!labels.length) return ''
  const idx = activeServerIndexByCategory.value[activeCategory.value] || 0
  const label = labels[idx] || labels[0]
  return map[label] || ''
})

const commentMalId = computed(
  () =>
    streamData.value?.malId ??
    streamData.value?.mal_id ??
    streamData.value?.malID ??
    anime.value?.idMal ??
    anime.value?.malId ??
    null
)

// Tracks the actual network/exec lifecycle of the embed script, instead of
// just "we tried to append it once" — see loadCommentScript() below for why.
// 'idle' -> 'loading' -> 'loaded' | 'error'
let commentScriptState = 'idle'
let commentScriptRetries = 0
const COMMENT_SCRIPT_MAX_RETRIES = 3

function loadCommentScript(container) {
  commentScriptState = 'loading'

  // Cache-busting query param, keyed to the current 30-minute window.
  // Without this, the script URL never changes, so a hard refresh can
  // silently reuse a stale or corrupted cached copy of embed.js from disk
  // cache (very common on iOS Safari over flaky mobile connections) forever
  // — the exact bug that used to require the user to manually clear site
  // data to fix. Bucketing by a 30-minute window still lets the browser
  // cache a good copy normally within that window instead of refetching on
  // every single refresh, while guaranteeing a fresh fetch (on next page
  // refresh) at least every 30 minutes.
  const THIRTY_MIN_MS = 30 * 60 * 1000
  const cacheBuster = Math.floor(Date.now() / THIRTY_MIN_MS)

  const script = document.createElement('script')
  script.src = `https://theanimecommunity.com/embed.js?v=${cacheBuster}`
  script.id = 'anime-community-script'
  // Dynamically-inserted scripts ignore `defer` (it only applies to scripts
  // present in the initial HTML) and load async by default anyway — set it
  // explicitly so that's not left implicit.
  script.async = true

  script.onload = () => {
    commentScriptState = 'loaded'
    commentScriptRetries = 0
  }

  script.onerror = () => {
    script.remove()
    commentScriptState = 'error'
    if (commentScriptRetries < COMMENT_SCRIPT_MAX_RETRIES) {
      commentScriptRetries += 1
      // Short backoff, then let syncCommentSection() re-attempt — covers
      // transient network blips without hammering the endpoint.
      setTimeout(() => syncCommentSection(), 1000 * commentScriptRetries)
    }
  }

  container.appendChild(script)
}

function syncCommentSection() {
  if (typeof window === 'undefined') return
  if (!id.value) return // need at least the AniList id to mount

  window.theAnimeCommunityConfig = {
    AniList_ID: String(id.value),
    ...(commentMalId.value ? { MAL_ID: String(commentMalId.value) } : {}),
    episodeChapterNumber: String(currentEpisodeNumber.value),
    mediaType: 'anime',
    removeBorder: 'true',
    colorScheme: {
      primaryColor: '#000000',
      backgroundColor: '#000000',
      dropDownTextColor: '#ffffff',
      strongTextColor: '#7ccf00',
      primaryTextColor: '#ffffff',
      secondaryTextColor: '#a1a1aa',
      iconColor: '#7ccf00',
      accentColor: '#7ccf00'
    }
  }

  // Previously this flag was set synchronously right after appendChild,
  // before the script had even fetched — so a failed/corrupted load looked
  // identical to a successful one, and every future call would just no-op
  // on `window.theAnimeCommunity?.reload?.()` with nothing there to reload.
  if (commentScriptState === 'loaded') {
    window.theAnimeCommunity?.reload?.()
    return
  }
  if (commentScriptState === 'loading') return // in-flight; onload/onerror will settle it

  const container = document.getElementById('anime-community-comment-section')
  if (!container) return

  // Clear out any stale/broken tag left over from a previous failed attempt
  // before appending a fresh one.
  const existing = document.getElementById('anime-community-script')
  if (existing) existing.remove()

  loadCommentScript(container)
}

// Mount once the DOM is ready (see onMounted), then reload whenever the
// episode changes or a MAL id shows up afterward.
// The container div lives inside `<template v-if="anime">`, so it doesn't
// exist in the DOM until anime actually loads — mount right after that
// happens (nextTick ensures Vue has patched the DOM first), then let the
// watch below handle reloads on episode change / a MAL id showing up later.
watch(anime, async (val) => {
  if (!val) return
  await nextTick()
  syncCommentSection()
})

watch([commentMalId, currentEpisodeNumber], syncCommentSection)

function onCommentTimestampClick(event) {
  if (event?.data?.type === 'TAC-TIMESTAMP-CLICK' && typeof event.data.time === 'number') {
    sendMessage({ type: 'seek', time: event.data.time })
  }
}

// The comment widget (theanimecommunity.com/embed.js) injects its markup
// straight into #anime-community-comment-section — a plain div in OUR
// page, not a sandboxed iframe. Its timestamp links fire the
// TAC-TIMESTAMP-CLICK postMessage above from an onclick handler, but they
// don't call preventDefault() on the click itself, and they're plain
// `<a href="#">` placeholders (no real destination). So every timestamp
// click ALSO triggers the browser's normal default action for a bare `#`
// href — jump to the top of the document — right alongside the seek.
// Delegating a capturing click listener on the container lets us swallow
// just that default navigation (only for placeholder hrefs — real links
// the widget renders, e.g. user profiles or "read more", are left alone)
// without touching the widget's own click handling, since preventDefault()
// stops the browser's default action but never stops their handler from
// running or the postMessage above from firing.
function preventCommentTimestampJump(event) {
  const anchor = event.target?.closest?.('a')
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (href === '#' || href === '' || href === null) {
    event.preventDefault()
  }
}

// ---- Rating widget (backed by AniList) ----
// `userRating` stays in the same "half-star units, 1-10" scale the template
// already renders (2 units = 1 star, 10 = 5 stars) — which is numerically
// identical to AniList's default POINT_10 score. For AniList users on a
// different score format (100-point, 5-star, or the 3-point smiley scale),
// `toAniListScore`/`fromAniListScore` convert both ways so the stars still
// mean the same thing regardless of how the viewer's AniList list is set up.
const userRating = ref(0)
// AniList's `meanScore`/`averageScore` are 0-100, scaled to /10 to match
// this widget. `meanScore` is checked first, `averageScore` as a fallback —
// same precedence the `recommendations` list below already uses. AniList
// doesn't expose a raw "number of scorers" field, so `popularity` (users
// who have this on a list) stands in for the vote count.
const baseAvg = computed(() => {
  const raw = anime.value?.meanScore ?? anime.value?.averageScore
  return raw ? raw / 10 : 0
})
const baseVotes = computed(() => anime.value?.popularity ?? 0)
const ratingSyncing = ref(false)
const ratingError = ref(false)
// Whether the viewer already has a MediaList entry for this anime (any
// status). Only known once loadUserRating() has run. Used so that rating
// something for the first time creates the entry with status CURRENT
// (they're actively watching it here), while rating an existing entry
// never silently overwrites its status.
const hasExistingListEntry = ref(false)

const displayAvg = computed(() => baseAvg.value.toFixed(1))
const displayVotes = computed(() => baseVotes.value)

// Hover state for the star row: while the pointer is over a zone, the stars
// preview that value instead of the saved one — reverts on mouseleave.
// Otherwise the stars are purely YOUR rating — no fallback to AniList's
// average, so an anime you haven't rated just shows empty stars.
const hoverRating = ref(0)
const ratingPreviewValue = computed(() => hoverRating.value || userRating.value)

// The signed-in AniList user's configured score format (Settings > List >
// Scoring System): POINT_100, POINT_10_DECIMAL, POINT_10, POINT_5, or
// POINT_3. Defaults to POINT_10 (our widget's own native scale) when the
// viewer isn't loaded yet or isn't signed in.
const ratingScoreFormat = computed(() => user.value?.mediaListOptions?.scoreFormat || 'POINT_10')

function toAniListScore(value) {
  switch (ratingScoreFormat.value) {
    case 'POINT_100':
      return value * 10
    case 'POINT_5':
      return value / 2 // stars, 0.5–5 — matches AniList's 5-star field directly
    case 'POINT_3':
      // Smiley scale: 1 = sad, 2 = neutral, 3 = happy
      return value <= 4 ? 1 : value <= 7 ? 2 : 3
    case 'POINT_10':
    case 'POINT_10_DECIMAL':
    default:
      return value
  }
}

function fromAniListScore(score) {
  if (!score) return 0
  switch (ratingScoreFormat.value) {
    case 'POINT_100':
      return Math.round(score / 10)
    case 'POINT_5':
      return Math.round(score * 2)
    case 'POINT_3':
      return score >= 3 ? 10 : score === 2 ? 6 : 2
    case 'POINT_10':
    case 'POINT_10_DECIMAL':
    default:
      return Math.round(score)
  }
}

// Renders the widget's 1-10 half-star value the way it'll actually look on
// the viewer's AniList profile — "55/100", "5.5/10", "5/10", "3/5", or a
// smiley — instead of always assuming the 10-point scale.
function formatRatingLabel(value) {
  if (!value) return ''
  const score = toAniListScore(value)
  switch (ratingScoreFormat.value) {
    case 'POINT_100':
      return `${Math.round(score)}/100`
    case 'POINT_5':
      return `${Number.isInteger(score) ? score : score.toFixed(1)}/5`
    case 'POINT_3':
      return score === 3 ? '🙂 Happy' : score === 2 ? '😐 Neutral' : '🙁 Sad'
    case 'POINT_10':
    case 'POINT_10_DECIMAL':
    default:
      return `${score}/10`
  }
}

async function rate(value) {
  if (!loggedIn.value) {
    openLoginModal()
    return
  }
  const previous = userRating.value
  userRating.value = value // optimistic — snap the stars immediately
  ratingSyncing.value = true
  ratingError.value = false
  try {
    await saveScore(
      Number(id.value),
      toAniListScore(value),
      hasExistingListEntry.value ? undefined : 'CURRENT'
    )
    hasExistingListEntry.value = true
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`anikage:rating:${id.value}`, String(value))
    }
  } catch (err) {
    // Roll back so the stars never claim a rating that didn't actually save.
    userRating.value = previous
    ratingError.value = true
  } finally {
    ratingSyncing.value = false
  }
}

// Pre-fill the stars from the viewer's real AniList score once we know
// who's signed in. Falls back to the last-known local value (logged out,
// or the lookup fails) so the widget never looks emptier than it should.
async function loadUserRating() {
  if (typeof window !== 'undefined') {
    const cached = window.localStorage.getItem(`anikage:rating:${id.value}`)
    if (cached) userRating.value = Number(cached)
  }
  if (!loggedIn.value) return
  try {
    const entry = await fetchMediaListEntry(Number(id.value))
    if (entry) {
      hasExistingListEntry.value = true
      if (entry.score) userRating.value = fromAniListScore(entry.score)
    }
  } catch (err) {
    // Lookup failed — keep whatever we already have from cache.
  }
}

// Clears the "Your rating" state — zeroes the score on AniList (if a list
// entry already exists there) without touching status/progress, and wipes
// the local cache. No-ops if there's nothing to clear.
async function clearRating() {
  if (!userRating.value) return
  const previous = userRating.value
  userRating.value = 0
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(`anikage:rating:${id.value}`)
  }
  if (!loggedIn.value || !hasExistingListEntry.value) return
  ratingSyncing.value = true
  ratingError.value = false
  try {
    await saveScore(Number(id.value), 0)
  } catch (err) {
    userRating.value = previous
    ratingError.value = true
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`anikage:rating:${id.value}`, String(previous))
    }
  } finally {
    ratingSyncing.value = false
  }
}

watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn) loadUserRating()
})

// ---- Preferences persistence (localStorage) ----
function savePreferences() {
  if (typeof window === 'undefined') return
  try {
    const existing = JSON.parse(window.localStorage.getItem('anikage:player-prefs') || '{}')
    window.localStorage.setItem(
      'anikage:player-prefs',
      JSON.stringify({
        ...existing,
        autoPlay: autoPlay.value,
        autoNext: autoNext.value,
        autoSkipIntro: autoSkipIntro.value,
        autoSkip: autoSkip.value,
        skipIntro: autoSkipIntro.value,
        skipOutro: autoSkip.value,
        episodeViewMode: episodeViewMode.value,
        spoilerShield: spoilerShield.value
      })
    )
  } catch (err) {}
}
function loadPreferences() {
  if (typeof window === 'undefined') return
  try {
    const saved = JSON.parse(window.localStorage.getItem('anikage:player-prefs') || '{}')
    if (typeof saved.autoPlay === 'boolean') autoPlay.value = saved.autoPlay
    if (typeof saved.autoNext === 'boolean') autoNext.value = saved.autoNext
    if (typeof saved.preferDub === 'boolean') preferDub.value = saved.preferDub
    if (typeof saved.showComments === 'boolean') showComments.value = saved.showComments
    // Support both the player's own key and the settings page key
    const skipIntroVal = saved.autoSkipIntro ?? saved.skipIntro
    if (typeof skipIntroVal === 'boolean') autoSkipIntro.value = skipIntroVal
    const skipOutroVal = saved.autoSkip ?? saved.skipOutro
    if (typeof skipOutroVal === 'boolean') autoSkip.value = skipOutroVal
    if (saved.episodeViewMode) episodeViewMode.value = saved.episodeViewMode
    if (typeof saved.spoilerShield === 'boolean') spoilerShield.value = saved.spoilerShield
  } catch (err) {
    // Ignore malformed storage.
  }
  // Rating is handled by loadUserRating() (localStorage cache, then AniList).
}

const recommendations = computed(() => {
  const nodes = anime.value?.recommendations?.nodes || anime.value?.recommendations?.edges || []
  
  return nodes.map((entry) => {
    // Handles both node lists and edge lists from AniList API structures
    const media = entry.mediaRecommendation || entry.node || entry
    
    return {
      href: `/anime/${media.id}`,
      title: media.title?.english || media.title?.romaji || media.title?.native || 'Untitled',
      image: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '',
      format: media.format || 'TV',
      score: media.meanScore 
        ? (media.meanScore / 10).toFixed(1) 
        : media.averageScore 
          ? (media.averageScore / 10).toFixed(1) 
          : 'N/A'
    }
  })
})
</script>

<template>
  <main style="color: white;" class="flex-1 pt-16 pb-0 c-1fpe2v8">
    <div class="watch-page-enter mt-4 px-2 lg:px-4 xl:px-8 c-1u7mu3r">
      <template v-if="anime">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-stretch c-1u7mu3r">
          <!-- ============ SIDEBAR (desktop) ============ -->
          <div
            v-if="!theaterMode"
            class="watch-sidebar-enter relative hidden shrink-0 lg:flex lg:w-[clamp(220px,20vw,320px)] lg:self-stretch c-1u7mu3r"
          >
            <div class="bg-card-background relative flex min-h-full w-full flex-col overflow-hidden rounded-xl border border-white/5 shadow-xl c-1u7mu3r">
              <div
                class="absolute inset-x-0 top-0 z-0 h-[320px] scale-110 bg-cover bg-center bg-no-repeat opacity-40 blur-[16px] c-1u7mu3r"
                :style="{ backgroundImage: `url(&quot;${anime.coverImage?.extraLarge}&quot;)` }"
              ></div>
              <div class="from-card-background/30 via-card-background/95 to-card-background absolute inset-0 z-0 bg-gradient-to-b c-1u7mu3r"></div>
              <div class="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col gap-3 p-4 xl:gap-4 xl:p-5 c-1u7mu3r">
                <div class="relative z-10 flex shrink-0 flex-col items-center gap-4 c-1u7mu3r">
                  <div class="relative aspect-[2/3] w-full max-w-[170px] overflow-hidden rounded-lg border border-white/10 shadow-2xl xl:max-w-[200px] c-1u7mu3r">
                    <img
                      :alt="displayTitle"
                      class="h-full w-full object-cover transition-transform duration-500 hover:scale-105 c-1u7mu3r"
                      loading="lazy"
                      :src="anime.coverImage?.extraLarge"
                    />
                  </div>
                  <div class="w-full text-center c-1u7mu3r">
                    <h2 class="line-clamp-2 text-lg leading-tight font-bold text-white xl:text-xl c-1u7mu3r" :title="displayTitle">
                      {{ displayTitle }}
                    </h2>
                  </div>
                </div>

                <div class="relative z-10 flex shrink-0 flex-wrap justify-center gap-2 border-b border-white/5 pb-4 c-1u7mu3r">
                  <div class="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-3 py-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black c-1u7mu3r">
                    <div class="absolute top-0 right-0 h-full w-1 bg-white/10 c-1u7mu3r"></div>
                    <div class="relative z-10 flex skew-x-12 items-center gap-1.5 text-[11px] font-black tracking-wider text-primary uppercase c-1u7mu3r">
                      <svg aria-hidden="true" class="lucide-icon lucide lucide-captions size-3.5" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                        <rect height="14" rx="2" ry="2" width="18" x="3" y="5"></rect>
                        <path d="M7 15h4M15 15h2M7 11h2M13 11h4"></path>
                      </svg>
                      <span class="c-1u7mu3r">{{ episodeCount }}</span>
                    </div>
                  </div>
                  <div class="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-3 py-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black c-1u7mu3r">
                    <div class="absolute top-0 right-0 h-full w-1 bg-white/10 c-1u7mu3r"></div>
                    <div class="relative z-10 flex skew-x-12 items-center justify-center text-[11px] font-black tracking-wider text-primary uppercase c-1u7mu3r">
                      {{ anime.format }}
                    </div>
                  </div>
                  <div
                    v-for="cat in categories"
                    :key="`cat-${cat}`"
                    class="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-3 py-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black c-1u7mu3r"
                  >
                    <div class="absolute top-0 right-0 h-full w-1 bg-white/10 c-1u7mu3r"></div>
                    <div class="relative z-10 flex skew-x-12 items-center justify-center text-[11px] font-black tracking-wider text-primary uppercase c-1u7mu3r">
                      {{ cat }}
                    </div>
                  </div>
                </div>

                <div class="relative z-10 no-scrollbar max-h-16 shrink-0 overflow-y-auto text-[13px] leading-relaxed font-medium tracking-wide text-zinc-200/90 c-1u7mu3r">
                  <div class="pb-2 c-1u7mu3r" style="white-space: pre-line">{{ anime.description }}</div>
                </div>

                <div class="relative z-10 flex shrink-0 flex-col gap-2.5 border-t border-white/5 pt-4 text-[13px] c-1u7mu3r">
                  <div class="flex gap-2 c-1u7mu3r">
                    <span class="w-[70px] shrink-0 font-medium text-zinc-500 c-1u7mu3r">Start Date:</span>
                    <span class="truncate text-zinc-200 c-1u7mu3r">
                      <a class="transition-colors hover:text-primary c-1u7mu3r" :href="`/search?year=${anime.startDate?.year}`">{{ anime.startDate?.year }}</a>
                      <template v-if="startDateLabel">.{{ startDateLabel }}</template>
                    </span>
                  </div>
                  <div class="flex gap-2 c-1u7mu3r">
                    <span class="w-[70px] shrink-0 font-medium text-zinc-500 c-1u7mu3r">Genres:</span>
                    <span class="line-clamp-2 text-zinc-200 c-1u7mu3r">
                      <template v-for="(genre, i) in genres" :key="genre">
                        <a class="transition-colors hover:text-primary c-1u7mu3r" :href="`/search?genre=${genre}`">{{ genre }}</a><template v-if="i < genres.length - 1">, </template>
                      </template>
                    </span>
                  </div>
                  <div class="flex gap-2 c-1u7mu3r">
                    <span class="w-[70px] shrink-0 font-medium text-zinc-500 c-1u7mu3r">Premiered:</span>
                    <span class="text-zinc-200 capitalize c-1u7mu3r">{{ premieredLabel }}</span>
                  </div>
                  <div class="flex gap-2 c-1u7mu3r">
                    <span class="w-[70px] shrink-0 font-medium text-zinc-500 c-1u7mu3r">Duration:</span>
                    <span class="text-zinc-200 c-1u7mu3r">{{ anime.duration }} min</span>
                  </div>
                  <div class="flex gap-2 c-1u7mu3r">
                    <span class="w-[70px] shrink-0 font-medium text-zinc-500 c-1u7mu3r">Studios:</span>
                    <span class="truncate text-zinc-200 c-1u7mu3r">
                      <template v-for="(edge, i) in studioList" :key="edge.node.id">
                        <a class="transition-colors hover:text-primary c-1u7mu3r" :href="`/search?studio=${encodeURIComponent(edge.node.name)}`">{{ edge.node.name }}</a><template v-if="i < studioList.length - 1">, </template>
                      </template>
                    </span>
                  </div>
                </div>

                <div class="relative z-10 mt-3 shrink-0 c-1u7mu3r">
                  <div class="anime-rating c-8446c5" :class="{ 'is-rated': userRating > 0 }">
                    <span aria-hidden="true" class="ar-arc c-8446c5"></span>
                    <span aria-hidden="true" class="ar-dots c-8446c5"></span>
                    <div class="ar-head c-8446c5">
                      <span class="ar-tag c-8446c5">{{ userRating ? `Your rating · ${formatRatingLabel(userRating)}` : 'Rate this anime' }}</span>
                      <span class="ar-side c-8446c5">
                        <button v-if="userRating" type="button" class="ar-clear c-8446c5" aria-label="Remove rating" @click="clearRating">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-x size-3">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                          </svg>
                        </button>
                      </span>
                    </div>
                    <div aria-label="Rate this anime from 1 to 10 (half a star = 1 point)" class="ar-stars c-8446c5" role="group" @mouseleave="hoverRating = 0">
                      <div class="ar-star c-8446c5" v-for="n in 5" :key="n">
                        <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-6 text-zinc-700" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                        </svg>
                        <span v-if="ratingPreviewValue >= n * 2" class="ar-fill c-8446c5">
                          <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-6 fill-amber-400 text-amber-400" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                          </svg>
                        </span>
                        <span v-else-if="ratingPreviewValue === n * 2 - 1" class="ar-fill ar-fill-half c-8446c5">
                          <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-6 fill-amber-400 text-amber-400" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                          </svg>
                        </span>
                        <button :aria-label="`Rate ${n * 2 - 1} out of 10`" class="ar-zone ar-zone-l c-8446c5" @click="rate(n * 2 - 1)" @mouseenter="hoverRating = n * 2 - 1"></button>
                        <button :aria-label="`Rate ${n * 2} out of 10`" class="ar-zone ar-zone-r c-8446c5" @click="rate(n * 2)" @mouseenter="hoverRating = n * 2"></button>
                      </div>
                    </div>
                    <div class="ar-caption c-8446c5">
                      <template v-if="hoverRating">
                        <span class="ar-hover-label text-[11px] font-semibold tracking-wide text-amber-400 c-8446c5">{{ formatRatingLabel(hoverRating) }}</span>
                      </template>
                      <template v-else>
                        <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-3 fill-amber-400 text-amber-400" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                        </svg>
                        <span class="ar-avg c-8446c5">{{ displayAvg }}</span>
                        <span class="ar-votes c-8446c5">· {{ displayVotes }} votes</span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ============ MAIN COLUMN ============ -->
          <div class="flex w-full min-w-0 flex-1 flex-col c-1u7mu3r">
            <nav aria-label="Breadcrumb" class="mb-2.5 flex min-w-0 items-center gap-1.5 px-0.5 text-[11px] font-medium tracking-wide text-zinc-500 c-1u7mu3r">
              <a class="shrink-0 transition-colors hover:text-primary c-1u7mu3r" href="/home">Home</a>
              <svg aria-hidden="true" class="lucide-icon lucide lucide-chevron-right size-3 shrink-0 text-zinc-600" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
              <a class="truncate text-zinc-300 transition-colors hover:text-primary c-1u7mu3r" :href="`/anime/${id}`">{{ displayTitle }}</a>
              <svg aria-hidden="true" class="lucide-icon lucide lucide-chevron-right size-3 shrink-0 text-zinc-600" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
              <span class="shrink-0 text-primary c-1u7mu3r">Episode {{ currentEpisodeNumber }}</span>
            </nav>

            <!-- Video player: theater mode reuses this SAME iframe node in the
                 SAME DOM position at all times — only CSS classes/inline
                 styles change. This is deliberately NOT a <Teleport>: moving
                 an <iframe> to a new DOM parent (which is what Teleport does
                 under the hood, even without touching `src`) makes the
                 browser treat it as a fresh navigation and reload the embed.
                 Server URLs come from /api/watch/ep/{id}/{epno}.
                 `neutralizeFixedBlockers`/`restoreFixedBlockers` (see
                 `watch(theaterMode, ...)`) temporarily strip any `transform`
                 (etc.) off this element's ancestors while theater mode is on,
                 so `fixed inset-0 z-[9999]` below actually pins to the real
                 viewport instead of getting trapped inside e.g.
                 `.watch-page-enter`'s enter-animation transform. -->
            <div
              ref="playerBoxRef"
              class="bg-black c-1u7mu3r"
              :class="
                theaterRendered
                  ? [
                      'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-8 transition-opacity duration-300 ease-out',
                      theaterAnimating ? 'opacity-100' : 'opacity-0',
                    ]
                  : 'relative aspect-video w-full overflow-hidden rounded-lg'
              "
            >
              <!-- Close button sits OUTSIDE the rounded video box, pinned to
                   the screen corner — not clipped by the box's overflow-hidden. -->
              <button
                v-if="theaterRendered"
                aria-label="Close Theater Mode"
                class="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20 hover:text-white md:top-6 md:right-6 c-av2l7s"
                type="button"
                @click="toggleTheater"
              >
                <svg class="h-6 w-6 c-av2l7s" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" class="c-av2l7s"></path>
                </svg>
              </button>

              <div
                ref="theaterBoxRef"
                class="overflow-hidden bg-black c-1u7mu3r"
                :class="[
                  theaterRendered
                    ? [
                        'relative rounded-2xl shadow-2xl transition-transform duration-300 ease-out',
                        theaterAnimating ? 'scale-100' : 'scale-90',
                      ]
                    : 'absolute inset-0 rounded-lg',
                ]"
                :style="
                  theaterRendered
                    ? {
                        aspectRatio: '16 / 9',
                        width: '100%',
                        maxHeight: '98vh', // or '100%' if constrained by parent height
                        maxWidth: 'calc(98vh * 16 / 9)',
                      }
                    : {}
                "
              >
                <!-- Loading overlay while stream is fetching -->
                <div v-if="streamPending" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black c-1u7mu3r">
                  <div class="h-16 w-16 animate-spin rounded-full border-t-4 border-primary c-1u7mu3r"></div>
                  <p class="mt-4 text-sm text-white c-1u7mu3r">Loading player...</p>
                </div>
                <iframe
                  ref="iframeRef"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowfullscreen
                  webkitallowfullscreen
                  mozallowfullscreen
                  class="h-full w-full border-0 c-1u7mu3r"
                  frameborder="0"
                  id="video-player"
                  marginheight="0"
                  marginwidth="0"
                  scrolling="no"
                  :src="activeEmbedUrl || 'about:blank'"
                  style="display: block; background: black; visibility: visible"
                  :title="`Episode ${currentEpisodeNumber} - ${displayTitle}`"
                ></iframe>
              </div>
            </div>

            <div class="mt-1.5 flex flex-col c-1u7mu3r">
              <div class="mt-1 mb-2.5 flex items-center gap-2 rounded-md bg-primary/30 px-3 py-2 text-xs opacity-90 lg:text-sm c-1u7mu3r">
                <svg class="size-4 c-1u7mu3r" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path class="c-1u7mu3r" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                <p class="c-1u7mu3r">If episode is not working, please report it, and we will fix it as soon as possible.</p>
              </div>

              <div class="flex w-full flex-row items-center justify-between c-1u7mu3r">
                <div class="bg-card-background relative flex items-center justify-center gap-2 overflow-hidden rounded-md px-2.5 py-1 sm:px-3 sm:py-1 c-1u7mu3r">
                  <div class="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent c-1u7mu3r"></div>
                  <div class="relative flex h-1.5 w-1.5 items-center justify-center c-1u7mu3r">
                    <span class="absolute inline-flex h-full w-full animate-ping bg-primary opacity-60 c-1u7mu3r"></span>
                    <span class="relative inline-flex h-1 w-1 bg-primary c-1u7mu3r"></span>
                  </div>
                  <div class="flex items-baseline font-mono tracking-wider c-1u7mu3r">
                    <span class="text-[11px] font-bold text-primary uppercase tracking-wide sm:text-xs c-1u7mu3r" style="text-shadow: 0 0 5px color-mix(in oklch, var(--primary) 30%, transparent)">Watching</span>
                  </div>
                </div>

                <div class="watch-controls-enter flex flex-row flex-wrap items-center justify-end gap-1 sm:gap-1.5 md:gap-2 xl:flex-nowrap xl:gap-1.5 2xl:gap-3 c-1u7mu3r">
                  <div class="group relative hidden xl:block c-1u7mu3r">
                    <button
                      aria-label="Theater Mode"
                      class="bg-card-background flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 hover:bg-card-background/80 c-1u7mu3r"
                      :class="{ 'text-primary': theaterMode }"
                      type="button"
                      @click="toggleTheater"
                    >
                      <svg class="sm:h-4 sm:w-4 c-1u7mu3r" fill="currentColor" height="14" viewBox="0 -960 960 960" width="14" xmlns="http://www.w3.org/2000/svg">
                        <path class="c-1u7mu3r" d="M560-280h200v-200h-80v120H560v80ZM200-480h80v-120h120v-80H200v200Zm-40 320q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"></path>
                      </svg>
                      <span class="hidden text-[11px] leading-none font-semibold tracking-tight uppercase 2xl:inline 2xl:text-[0.75rem] c-1u7mu3r">Theater</span>
                    </button>
                    <div class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 transform rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block c-1u7mu3r">
                      {{ theaterMode ? 'Disable Theater Mode' : 'Enable Theater Mode' }}
                      <div class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-zinc-700 c-1u7mu3r"></div>
                    </div>
                  </div>

                  <div class="group relative hidden xl:block c-av2l7s">
                    <button
                      aria-label="Keyboard Shortcuts"
                      class="bg-card-background hover:bg-card-background/80 flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 c-av2l7s"
                      type="button"
                    >
                      <svg aria-hidden="true" class="lucide-icon lucide lucide-keyboard h-3.5 w-3.5 sm:size-4 c-av2l7s" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 8h.01"></path>
                        <path d="M12 12h.01"></path>
                        <path d="M14 8h.01"></path>
                        <path d="M16 12h.01"></path>
                        <path d="M18 8h.01"></path>
                        <path d="M6 8h.01"></path>
                        <path d="M7 16h10"></path>
                        <path d="M8 12h.01"></path>
                        <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      </svg>
                      <span class="hidden text-[11px] leading-none font-semibold tracking-tight uppercase 2xl:inline 2xl:text-[0.75rem] c-av2l7s">Keys</span>
                    </button>
                    <div class="pointer-events-none absolute right-0 bottom-full z-50 mb-2 rounded-lg border border-zinc-700 bg-black p-4 text-left opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 c-av2l7s">
                      <p class="mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase c-av2l7s">Keyboard Shortcuts</p>
                      <div class="text-xs whitespace-nowrap text-zinc-300 c-av2l7s" style="display:grid; grid-template-columns:auto 1fr; column-gap:1rem; row-gap:8px; align-items:center;">
                        <span class="c-av2l7s" style="display:flex; align-items:center; gap:4px;"><kbd class="kbd-chip c-av2l7s">Space</kbd><kbd class="kbd-chip c-av2l7s">K</kbd></span>
                        <span class="c-av2l7s">Play / Pause</span>

                        <span class="c-av2l7s" style="display:flex; align-items:center; gap:4px;"><kbd class="kbd-chip c-av2l7s">←</kbd><kbd class="kbd-chip c-av2l7s">→</kbd></span>
                        <span class="c-av2l7s">Seek 5s</span>

                        <span class="c-av2l7s" style="display:flex; align-items:center; gap:4px;"><kbd class="kbd-chip c-av2l7s">J</kbd><kbd class="kbd-chip c-av2l7s">L</kbd></span>
                        <span class="c-av2l7s">Seek 10s</span>

                        <span class="c-av2l7s" style="display:flex; align-items:center; gap:4px;"><kbd class="kbd-chip c-av2l7s">0</kbd>–<kbd class="kbd-chip c-av2l7s">9</kbd></span>
                        <span class="c-av2l7s">Jump to 0–90%</span>

                        <span class="c-av2l7s" style="display:flex; align-items:center; gap:4px;"><kbd class="kbd-chip c-av2l7s">F</kbd></span>
                        <span class="c-av2l7s">Fullscreen</span>

                        <span class="c-av2l7s" style="display:flex; align-items:center; gap:4px;"><kbd class="kbd-chip c-av2l7s">T</kbd></span>
                        <span class="c-av2l7s">Theater mode</span>

                        <span class="c-av2l7s" style="display:flex; align-items:center; gap:4px;"><kbd class="kbd-chip c-av2l7s">N</kbd><kbd class="kbd-chip c-av2l7s">P</kbd></span>
                        <span class="c-av2l7s">Next / Previous episode</span>
                      </div>
                      <p class="mt-4 max-w-[230px] text-[10px] leading-snug whitespace-normal text-zinc-500 c-av2l7s">
                        Shortcuts pause after clicking inside the player — click anywhere on the page to get them back.
                      </p>
                      <div class="absolute top-full right-4 h-0 w-0 border-t-4 border-r-4 border-l-4 border-transparent border-t-zinc-700 c-av2l7s"></div>
                    </div>
                  </div>

                  <div class="group relative c-1u7mu3r">
                    <button
                      aria-label="Auto Play"
                      class="bg-card-background flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 hover:bg-card-background/80 c-1u7mu3r"
                      :class="{ 'text-primary': autoPlay }"
                      type="button"
                      @click="toggleAutoPlay"
                    >
                      <svg class="h-3.5 w-3.5 sm:size-4 c-1u7mu3r" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path class="c-1u7mu3r" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653z" stroke-linecap="round" stroke-linejoin="round"></path>
                      </svg>
                      <span class="hidden text-[11px] leading-none font-semibold tracking-tight uppercase 2xl:inline 2xl:text-[0.75rem] c-1u7mu3r">Auto Play</span>
                    </button>
                    <div class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 transform rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block c-1u7mu3r">
                      {{ autoPlay ? 'Disable Auto Play' : 'Enable Auto Play' }}
                      <div class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-zinc-700 c-1u7mu3r"></div>
                    </div>
                  </div>

                  <div class="group relative c-1u7mu3r">
                    <button
                      aria-label="Auto Next"
                      class="bg-card-background flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 c-1u7mu3r"
                      :class="autoNext ? 'text-primary' : 'hover:bg-card-background/80'"
                      type="button"
                      @click="toggleAutoNext"
                    >
                      <svg class="h-3.5 w-3.5 sm:size-4 c-1u7mu3r" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path class="c-1u7mu3r" d="M3 5v14l12-7L3 5zM21 5v14" stroke-linecap="round" stroke-linejoin="round"></path>
                      </svg>
                      <span class="hidden text-[11px] leading-none font-semibold tracking-tight uppercase 2xl:inline 2xl:text-[0.75rem] c-1u7mu3r">Auto Next</span>
                    </button>
                    <div class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 transform rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block c-1u7mu3r">
                      {{ autoNext ? 'Disable Auto Next' : 'Enable Auto Next' }}
                      <div class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-zinc-700 c-1u7mu3r"></div>
                    </div>
                  </div>

                  <!-- Auto Skip Intro -->
                  <div class="group relative c-1u7mu3r">
                    <button
                      aria-label="Auto Skip Intro"
                      class="bg-card-background flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 hover:bg-card-background/80 c-1u7mu3r"
                      :class="{ 'text-primary': autoSkipIntro }"
                      type="button"
                      @click="toggleAutoSkipIntro"
                    >
                        <svg class="h-3.5 w-3.5 sm:size-4 c-1u7mu3r" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24" xmlns="http://www.w3.org/2000/svg" transform="scale(-1, 1)">
                          <path class="c-1u7mu3r" d="M760-120 480-400l-94 94q8 15 11 32t3 34q0 66-47 113T240-80q-66 0-113-47T80-240q0-66 47-113t113-47q17 0 34 3t32 11l94-94-94-94q-15 8-32 11t-34 3q-66 0-113-47T80-720q0-66 47-113t113-47q66 0 113 47t47 113q0 17-3 34t-11 32l494 494v40H760ZM600-520l-80-80 240-240h120v40L600-520ZM240-640q33 0 56.5-23.5T320-720q0-33-23.5-56.5T240-800q-33 0-56.5 23.5T160-720q0 33 23.5 56.5T240-640Zm240 180q8 0 14-6t6-14q0-8-6-14t-14-6q-8 0-14 6t-6 14q0 8 6 14t14 6ZM240-160q33 0 56.5-23.5T320-240q0-33-23.5-56.5T240-320q-33 0-56.5 23.5T160-240q0 33 23.5 56.5T240-160Z"></path>
                        </svg>
                      <span class="hidden text-[11px] leading-none font-semibold tracking-tight uppercase 2xl:inline 2xl:text-[0.75rem] c-1u7mu3r">Skip Intro</span>
                    </button>
                    <div class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 transform rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block c-1u7mu3r">
                      {{ autoSkipIntro ? 'Disable Auto Skip Intro' : 'Enable Auto Skip Intro' }}
                      <div class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-zinc-700 c-1u7mu3r"></div>
                    </div>
                  </div>

                  <div class="group relative c-1u7mu3r">
                    <button
                      aria-label="Auto Skip Outro"
                      class="bg-card-background flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 hover:bg-card-background/80 c-1u7mu3r"
                      :class="{ 'text-primary': autoSkip }"
                      type="button"
                      @click="toggleAutoSkip"
                    >
                      <svg class="h-3.5 w-3.5 sm:size-4 c-1u7mu3r" fill="currentColor" height="24" viewBox="0 -960 960 960" width="24" xmlns="http://www.w3.org/2000/svg">
                        <path class="c-1u7mu3r" d="M760-120 480-400l-94 94q8 15 11 32t3 34q0 66-47 113T240-80q-66 0-113-47T80-240q0-66 47-113t113-47q17 0 34 3t32 11l94-94-94-94q-15 8-32 11t-34 3q-66 0-113-47T80-720q0-66 47-113t113-47q66 0 113 47t47 113q0 17-3 34t-11 32l494 494v40H760ZM600-520l-80-80 240-240h120v40L600-520ZM240-640q33 0 56.5-23.5T320-720q0-33-23.5-56.5T240-800q-33 0-56.5 23.5T160-720q0 33 23.5 56.5T240-640Zm240 180q8 0 14-6t6-14q0-8-6-14t-14-6q-8 0-14 6t-6 14q0 8 6 14t14 6ZM240-160q33 0 56.5-23.5T320-240q0-33-23.5-56.5T240-320q-33 0-56.5 23.5T160-240q0 33 23.5 56.5T240-160Z"></path>
                      </svg>
                      <span class="hidden text-[11px] leading-none font-semibold tracking-tight uppercase 2xl:inline 2xl:text-[0.75rem] c-1u7mu3r">Skip Outro</span>
                    </button>
                    <div class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 transform rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block c-1u7mu3r">
                      {{ autoSkip ? 'Disable Auto Skip Outro' : 'Enable Auto Skip Outro' }}
                      <div class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-zinc-700 c-1u7mu3r"></div>
                    </div>
                  </div>

                  <WatchlistDropdown v-if="anime" :media="anime" variant="minimal" class="c-1u7mu3r" />
                </div>
              </div>

              <div class="my-3 border-t border-solid border-gray-300/10 c-1u7mu3r"></div>

              <!-- Watch info + server switcher, side by side at xl (matches
                   reference layout): "You are Watching Episode N" panel on
                   the left, category/server switcher filling the rest.
                   Below xl the info panel collapses into a compact heading
                   inside the switcher card instead of taking its own row. -->
              <div class="watch-servers-enter flex h-full flex-col items-start gap-3 rounded-lg xl:flex-row xl:items-stretch xl:gap-2 c-1u7mu3r">
                <div class="bg-card-background hidden h-full w-full flex-col items-center justify-center rounded-lg p-4 xl:flex xl:w-2/6 c-1u7mu3r">
                  <span class="text-xs text-zinc-400 xl:text-sm c-1u7mu3r">You are Watching</span>
                  <span class="mt-0.5 text-sm font-medium md:text-white c-1u7mu3r">Episode {{ currentEpisodeNumber }}</span>
                  <span class="mt-1 flex flex-col items-center justify-center text-center text-xs !leading-tight text-zinc-500 xl:text-sm c-1u7mu3r">
                    If current server doesn't work please try other servers beside.
                  </span>
                </div>

                <!-- Server / category switcher — renders directly under the video
                     player, one row per category the API returns (h-sub, e-sub,
                     hard-sub, soft-dub, e-dub, dub, or anything else). Buttons
                     wrap onto new lines instead of forcing equal widths or
                     overflowing the container, so this holds up no matter how
                     many categories/servers or how long their labels are. No
                     fallback/default servers are rendered — this only shows
                     once real data is available. -->
                <div class="w-full flex-1 c-1u7mu3r">
                  <div v-if="streamPending" class="bg-card-background flex w-full flex-col gap-3 rounded-lg px-4 py-3 sm:px-5 sm:py-4 c-1u7mu3r">
                    <!-- Skeleton rows while servers load -->
                    <div class="flex w-full flex-col gap-1.5 c-1u7mu3r">
                      <div class="h-3 w-16 animate-pulse rounded bg-white/10 c-1u7mu3r"></div>
                      <div class="flex gap-2 c-1u7mu3r">
                        <div class="h-7 w-16 animate-pulse rounded-md bg-white/10 c-1u7mu3r"></div>
                        <div class="h-7 w-16 animate-pulse rounded-md bg-white/10 c-1u7mu3r"></div>
                        <div class="h-7 w-16 animate-pulse rounded-md bg-white/10 c-1u7mu3r"></div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="displayCategories.length" class="bg-card-background flex h-full w-full flex-col justify-center gap-2.5 rounded-lg px-4 py-3 sm:px-5 sm:py-4 c-1u7mu3r">
                    <!-- Compact "You are watching" heading, shown only below
                         xl since the side panel takes over above that. -->
                    <div class="flex flex-col items-center gap-1 pb-0.5 text-center xl:hidden c-1u7mu3r">
                      <span class="text-sm font-bold text-white c-1u7mu3r">
                        You are watching
                        <span class="text-primary c-1u7mu3r"> Episode {{ currentEpisodeNumber }}</span>
                      </span>
                      <span class="text-center text-[11px] leading-relaxed text-zinc-500 c-1u7mu3r">
                        If the current server is not working, please try switching to other servers.
                      </span>
                    </div>

                    <!-- Top row: category tabs (SUB / DUB / ...) -->
                    <div class="flex w-full flex-row items-center gap-3 c-1u7mu3r">
                      <span class="flex w-[70px] flex-shrink-0 flex-row items-center gap-1.5 text-xs font-bold tracking-wider text-zinc-400 c-1u7mu3r">
                        <svg viewBox="0 0 32 32" class="h-4 w-4 c-1u7mu3r" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.6661 6.66699C4.29791 6.66699 3.99943 6.96547 3.99943 7.33366V24.667C3.99943 25.0352 4.29791 25.3337 4.6661 25.3337H27.3328C27.701 25.3337 27.9994 25.0352 27.9994 24.667V7.33366C27.9994 6.96547 27.701 6.66699 27.3328 6.66699H4.6661ZM8.66667 21.3333C8.29848 21.3333 8 21.0349 8 20.6667V11.3333C8 10.9651 8.29848 10.6667 8.66667 10.6667H14C14.3682 10.6667 14.6667 10.9651 14.6667 11.3333V12.6667C14.6667 13.0349 14.3682 13.3333 14 13.3333H10.8C10.7264 13.3333 10.6667 13.393 10.6667 13.4667V18.5333C10.6667 18.607 10.7264 18.6667 10.8 18.6667H14C14.3682 18.6667 14.6667 18.9651 14.6667 19.3333V20.6667C14.6667 21.0349 14.3682 21.3333 14 21.3333H8.66667ZM18 21.3333C17.6318 21.3333 17.3333 21.0349 17.3333 20.6667V11.3333C17.3333 10.9651 17.6318 10.6667 18 10.6667H23.3333C23.7015 10.6667 24 10.9651 24 11.3333V12.6667C24 13.0349 23.7015 13.3333 23.3333 13.3333H20.1333C20.0597 13.3333 20 13.393 20 13.4667V18.5333C20 18.607 20.0597 18.6667 20.1333 18.6667H23.3333C23.7015 18.6667 24 18.9651 24 19.3333V20.6667C24 21.0349 23.7015 21.3333 23.3333 21.3333H18Z" fill="currentColor" class="c-1u7mu3r"></path></svg>
                        Category:
                      </span>
                      <div class="flex flex-1 flex-wrap items-center gap-2 c-1u7mu3r">
                        <button
                          v-for="category in displayCategories"
                          :key="`cat-tab-${category}`"
                          type="button"
                          :aria-label="`Switch to ${categoryLabel(category)} servers`"
                          class="server-btn-enhanced cursor-pointer rounded-md border px-5 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 c-1u7mu3r"
                          :class="
                            activeCategory === category
                              ? 'border-primary/50 bg-primary text-black shadow-md'
                              : 'border-white/5 bg-white/[0.06] text-zinc-400 hover:bg-white/10 hover:text-white'
                          "
                          @click="selectServer(category, activeServerIndexByCategory[category] || 0)"
                        >
                          {{ categoryLabel(category) }}
                        </button>
                      </div>
                    </div>

                    <!-- Bottom row: episode/server buttons for the active category -->
                    <div v-if="categoryServerLabels(activeCategory).length" class="flex w-full flex-row items-center gap-3 c-1u7mu3r">
                      <span class="flex w-[70px] flex-shrink-0 flex-row items-center gap-1.5 text-xs font-bold tracking-wider text-zinc-400 c-1u7mu3r">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 c-1u7mu3r" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m7 9c0 3.53-2.61 6.44-6 6.93V21h-2v-3.07c-3.39-.49-6-3.4-6-6.93h2a5 5 0 0 0 5 5a5 5 0 0 0 5-5z" class="c-1u7mu3r"></path></svg>
                        {{ categoryLabel(activeCategory) }}:
                      </span>
                      <div class="flex flex-1 flex-wrap items-center gap-2 c-1u7mu3r">
                        <button
                          v-for="(label, idx) in categoryServerLabels(activeCategory)"
                          :key="`${activeCategory}-${idx}`"
                          type="button"
                          :aria-label="`Switch to ${label} server`"
                          class="server-btn-enhanced cursor-pointer rounded-md border px-5 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 c-1u7mu3r"
                          :class="
                            (activeServerIndexByCategory[activeCategory] || 0) === idx
                              ? 'border-primary/50 bg-primary text-black shadow-md'
                              : 'border-white/5 bg-white/[0.06] text-zinc-400 hover:bg-white/10 hover:text-white'
                          "
                          @click="selectServer(activeCategory, idx)"
                        >
                          {{ label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Next-episode countdown — full-width row below the
                   watch-info/server-switcher panel, only when relevant. -->
              <div
                v-if="nextEpisodeAiringAtMs"
                class="watch-servers-enter flex w-full flex-col rounded-xl px-5 py-4 c-a8yjwc"
                style="background: color-mix(in oklch, var(--primary) 10%, black)"
              >
              <div class="flex w-full flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4 c-a8yjwc">
                <div class="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left c-1u7mu3r">
                  <svg aria-hidden="true" class="lucide-icon lucide lucide-calendar-clock hidden h-5 w-5 flex-shrink-0 text-primary sm:block" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 14v2.2l1.6 1"></path>
                    <path d="M16 2v4"></path>
                    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"></path>
                    <path d="M3 10h5"></path>
                    <path d="M8 2v4"></path>
                    <circle cx="16" cy="16" r="6"></circle>
                  </svg>
                  <div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5 c-a8yjwc">
                    <span class="text-xs font-medium text-zinc-400 sm:text-sm c-a8yjwc">The next episode is expected to be released on</span>
                    <span class="text-sm font-bold tracking-wide text-white c-a8yjwc">{{ nextEpisodeDateLabel }}</span>
                  </div>
                </div>
                <span class="text-center text-[13px] font-medium text-primary sm:text-right sm:text-sm c-a8yjwc">{{ nextEpisodeCountdownLabel }}</span>
              </div>
              </div>
              

              <!-- Mobile: related seasons/entries strip -->
              <div ref="mobileSeasonsRef" class="mt-0.5 scroll-mt-4 lg:hidden c-1u7mu3r">
                <div class="mb-3 flex items-center justify-between c-1u7mu3r">
                  <h3 class="text-[10px] font-bold tracking-[0.22em] text-zinc-500 uppercase c-1u7mu3r">Watch more seasons of this anime</h3>
                  <span class="text-[9px] font-semibold text-zinc-500 c-1u7mu3r">{{ relationEdges.length }} ENTRIES</span>
                </div>
                <div class="flex flex-wrap gap-2.5 c-1u7mu3r">
                  <a
                    v-for="edge in visibleMobileSeasons"
                    :key="`mobile-${edge.node.id}`"
                    class="group relative flex h-[75px] w-[calc(50%-5px)] items-center justify-center overflow-hidden rounded-[10px] transition-all duration-300 hover:scale-[1.02] focus:z-10 focus:scale-[1.02] focus:ring-2 focus:ring-primary focus:outline-none border border-zinc-800 c-1u7mu3r"
                    :href="`/anime/${edge.node.id}/1`"
                  >
                    <div class="absolute inset-0 z-0 c-1u7mu3r">
                      <img
                        :alt="edge.node.title.english || edge.node.title.romaji"
                        class="h-full w-full object-cover blur-[2px] brightness-[0.45] transition-all duration-300 group-hover:brightness-[0.55] c-1u7mu3r"
                        loading="lazy"
                        referrerpolicy="no-referrer"
                        :src="edge.node.coverImage?.large"
                      />
                    </div>
                    <div class="pointer-events-none absolute inset-0 z-10 opacity-40 transition-opacity duration-300 group-hover:opacity-50 c-1u7mu3r" style="background-image: radial-gradient(circle, #ffffff33 1.2px, transparent 1.2px); background-size: 6px 6px"></div>
                    <div class="pointer-events-none relative z-20 w-full max-w-full overflow-hidden px-2.5 text-center c-1u7mu3r">
                      <span class="block truncate text-[8px] font-bold tracking-widest text-primary drop-shadow-lg c-1u7mu3r" style="text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9)">{{ edge.node.format }}</span>
                      <h4 class="mt-0.5 line-clamp-1 text-[10px] font-semibold tracking-wide text-zinc-100 drop-shadow-lg transition-colors duration-300 group-hover:text-white c-1u7mu3r" style="text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8)">
                        {{ edge.node.title.english || edge.node.title.romaji }}
                      </h4>
                      <div class="mt-0.5 flex items-center justify-center gap-1 text-[8px] font-medium text-zinc-400 c-1u7mu3r" style="text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9)">
                        <span class="c-1u7mu3r">{{ edge.node.format }}</span>
                        <span class="c-1u7mu3r">•</span>
                        <span class="c-1u7mu3r">{{ relationLabel(edge.relationType) }}</span>
                      </div>
                    </div>
                  </a>
                </div>
                <button
                  v-if="showMobileSeasonsToggle"
                  type="button"
                  class="mt-3 w-full rounded-lg border border-zinc-800/80 bg-zinc-900/30 py-2.5 text-xs font-semibold tracking-wide text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white c-1u7mu3r"
                  @click="toggleMobileSeasons"
                >
                  {{ showAllMobileSeasons ? 'Show Less' : `Show ${hiddenMobileSeasonsCount} More` }}
                </button>
              </div>
            </div>
          </div>

          <!-- ============ EPISODES PANEL (desktop) ============ -->
          <div class="!lg:mr-4 watch-episodes-enter relative w-full shrink-0 lg:w-[clamp(300px,28vw,420px)] lg:self-stretch c-a8yjwc">
            <div class="mr-2 flex h-full flex-col lg:absolute lg:inset-x-0 lg:top-0 lg:max-h-full c-a8yjwc">
              <div class="mb-3 flex flex-col gap-3 c-a8yjwc">
                <div class="flex flex-row flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar c-a8yjwc">
                  <div class="flex min-w-0 flex-shrink items-center gap-2 c-a8yjwc">
                    <h1 class="flex-shrink-0 text-lg font-medium xl:text-xl c-a8yjwc">Episodes</h1>
                    <span class="flex-shrink-0 rounded-md border border-white/[0.07] bg-white/[0.05] px-2 py-0.5 text-xs font-semibold text-white/70 c-a8yjwc">{{ episodeCount }}</span>
                    <div v-if="episodeCount > 100" class="relative flex-shrink-0 c-a8yjwc">
                      <button
                        ref="rangeButtonRef"
                        class="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/[0.08] c-a8yjwc"
                        @click="toggleRangeOpen"
                      >
                        <span class="c-a8yjwc">{{ activeRangeLabel }}</span>
                        <svg
                          class="h-4 w-4 transform transition-transform c-a8yjwc"
                          :class="{ 'rotate-180': rangeOpen }"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path class="c-a8yjwc" d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                        </svg>
                      </button>
                      <Teleport to="body">
                        <div
                          v-if="rangeOpen"
                          ref="rangeMenuRef"
                          class="no-scrollbar fixed z-[9999] max-h-60 w-28 overflow-y-auto rounded-md border border-white/[0.08] bg-black shadow-lg c-a8yjwc"
                          :style="rangeMenuStyle"
                        >
                          <button
                            v-for="(group, i) in rangeGroups"
                            :key="`range-${i}`"
                            class="block w-full px-3 py-2 text-left text-sm whitespace-nowrap transition-colors hover:bg-white/[0.06] c-a8yjwc"
                            :class="!rangeShowAll && i === activeRangeIndex ? 'bg-primary/10 text-primary' : 'text-zinc-300'"
                            @click="selectRange(i)"
                          >
                            {{ group.start }}-{{ group.end }}
                          </button>
                          <button
                            v-if="rangeGroups.length > 1"
                            class="block w-full px-3 py-2 text-left text-sm whitespace-nowrap transition-colors hover:bg-white/[0.06] c-a8yjwc"
                            :class="rangeShowAll ? 'bg-primary/10 text-primary' : 'text-zinc-300'"
                            @click="selectAllRange()"
                          >
                            All Eps
                          </button>
                        </div>
                      </Teleport>
                    </div>
                  </div>

                  <div class="flex flex-shrink-0 flex-row items-center gap-2 c-a8yjwc">

                    <button
                      aria-label="Toggle episode view"
                      class="text-zinc-400 transition-colors hover:text-white c-a8yjwc"
                      @click="toggleViewMode"
                    >
                      <svg
                        v-if="episodeViewMode === 'grid'"
                        aria-hidden="true"
                        class="lucide-icon lucide lucide-rows-3 h-5 w-5"
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
                        <rect height="18" rx="2" width="18" x="3" y="3"></rect>
                        <path d="M21 9H3"></path>
                        <path d="M21 15H3"></path>
                      </svg>
                      <svg
                        v-else
                        aria-hidden="true"
                        class="lucide-icon lucide lucide-grid-2x2 h-5 w-5"
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
                        <path d="M12 3v18"></path>
                        <path d="M3 12h18"></path>
                        <rect height="18" rx="2" width="18" x="3" y="3"></rect>
                      </svg>
                    </button>
                    <button
                      aria-label="Toggle spoiler shield"
                      class="transition-colors c-a8yjwc"
                      :class="spoilerShield ? 'text-primary hover:text-white' : 'text-zinc-400 hover:text-white'"
                      :title="spoilerShield ? 'Disable spoiler shield' : 'Enable spoiler shield'"
                      @click="toggleSpoilerShield"
                    >
                      <svg v-if="!spoilerShield" aria-hidden="true" class="lucide-icon lucide lucide-eye h-5 w-5" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <svg v-else aria-hidden="true" class="lucide-icon lucide lucide-eye-off h-5 w-5" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path>
                        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path>
                        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path>
                        <path d="m2 2 20 20"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="relative w-full c-a8yjwc">
                  <input
                    v-model="episodeSearch"
                    class="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/60 px-3 py-2 pr-10 text-xs font-medium text-white placeholder-zinc-400 transition-all duration-200 outline-none focus:border-primary/50 focus:bg-zinc-800/80 focus:ring-2 focus:ring-primary/20 c-a8yjwc"
                    placeholder="Search episodes..."
                    type="text"
                  />
                  <div class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transform c-a8yjwc">
                    <svg class="h-4 w-4 text-zinc-400 c-a8yjwc" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path class="c-a8yjwc" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <!-- Filler/Recap legend — only shown when relevant episodes are visible -->
              <div
                v-if="hasFillerEpisodes || hasRecapEpisodes"
                class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[10px] font-medium text-zinc-500 c-a8yjwc"
              >
                <span v-if="hasFillerEpisodes" class="flex items-center gap-1 c-a8yjwc">
                  <span class="h-2 w-2 rounded-full bg-yellow-400 c-a8yjwc"></span>
                  Filler episode
                </span>
                <span v-if="hasRecapEpisodes" class="flex items-center gap-1 c-a8yjwc">
                  <span class="h-2 w-2 rounded-full bg-zinc-400 c-a8yjwc"></span>
                  Recap episode
                </span>
              </div>
              <div class="relative flex min-h-0 min-h-[200px] w-full flex-1 flex-col c-a8yjwc">
                <!-- No results for the current search -->
                <div v-if="!episodesPending && filteredEpisodes.length === 0" class="col-span-full flex flex-col items-center justify-center py-8 text-center c-a8yjwc">
                  <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/30 c-a8yjwc">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-zinc-500 c-a8yjwc" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" class="c-a8yjwc"></path>
                    </svg>
                  </div>
                  <h3 class="mb-2 text-lg font-medium text-white c-a8yjwc">No episodes found</h3>
                  <p class="mb-4 text-sm text-zinc-400 c-a8yjwc">Try searching with different keywords</p>
                  <button class="rounded-lg bg-primary/20 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/30 c-a8yjwc" @click="clearEpisodeSearch">
                    Clear search
                  </button>
                </div>

                <template v-else>
                  <!-- Grid view: hexagon-cut episode cells -->
                  <div
                    v-if="episodeViewMode === 'grid'"
                    class="no-scrollbar h-full max-h-[26rem] !w-full !max-w-full overflow-y-auto lg:max-h-full lg:flex-1 grid grid-cols-5 content-start gap-1.5 p-0.5 pt-1 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-10 transition-all duration-300 c-a8yjwc"
                    data-episodes-container=""
                    style="width: 100%"
                  >
                    <a
                      v-for="ep in filteredEpisodes"
                      :key="ep.number"
                      class="episode-grid-stagger grid-ep-hover relative flex h-10 w-full items-center justify-center text-[12px] font-bold tracking-widest c-a8yjwc"
                      :class="[
                        epNum(ep) === currentEpisodeNumber
                          ? 'episode-playing pointer-events-none border border-primary bg-primary text-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
                          : ep.filler
                            ? 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-400/70 hover:bg-amber-500/20 hover:text-amber-200'
                            : 'border border-white/[0.06] bg-black text-zinc-400 hover:border-primary/40 hover:bg-white/[0.04] hover:text-white',
                        isEpisodeWatched(ep) ? 'opacity-60 hover:opacity-100' : ''
                      ]"
                      style="clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)"
                      :data-episode="ep.number"
                      data-no-preload="true"
                      :href="episodeHref(ep.number)"
                      :title="isSpoiler(ep) ? `Episode ${ep.number}` : (ep.filler ? `Ep ${ep.number} - Filler` : episodeAudioLabel(ep))"
                      @click.prevent="goToEpisode(ep.number)"
                    >
                      <div
                        class="absolute top-0 left-0 h-1 w-1 border-t border-l c-a8yjwc"
                        :class="epNum(ep) === currentEpisodeNumber ? 'border-black/50' : ep.filler ? 'border-amber-500/40' : 'border-white/20'"
                      ></div>
                      <div
                        class="absolute right-0 bottom-0 h-1 w-1 border-r border-b c-a8yjwc"
                        :class="epNum(ep) === currentEpisodeNumber ? 'border-black/50' : ep.filler ? 'border-amber-500/40' : 'border-white/20'"
                      ></div>
                      {{ ep.number }}
                    </a>
                  </div>

                  <!-- List view: cinematic ep-cards with bg thumbnail, scrim, progress -->
                  <div
                    v-else
                    class="no-scrollbar h-full max-h-[26rem] !w-full !max-w-full overflow-y-auto lg:max-h-full lg:flex-1 flex flex-col lg:gap-0 transition-all duration-300 c-a8yjwc"
                    data-episodes-container=""
                    style="width: 100%"
                  >
                    <div v-for="ep in filteredEpisodes" :key="ep.number" class="ep-collapse episode-stagger w-full shrink-0 c-a8yjwc">
                      <div class="ep-collapse-inner c-a8yjwc">
                        <a
                          class="ep-card group mb-2 w-full c-a8yjwc"
                          :class="{ 'is-playing pointer-events-none': epNum(ep) === currentEpisodeNumber, 'is-watched': isEpisodeWatched(ep) }"
                          :data-episode="ep.number"
                          data-no-preload="true"
                          :href="episodeHref(ep.number)"
                          @click.prevent="goToEpisode(ep.number)"
                        >
                          <div
                            v-if="episodeThumbnail(ep)"
                            class="ep-bg c-a8yjwc"
                            :class="{ 'blur-sm': isSpoiler(ep) }"
                            :style="{ backgroundImage: `url(&quot;${episodeThumbnail(ep)}&quot;)` }"
                          ></div>
                          <div class="ep-scrim c-a8yjwc"></div>
                          <span v-if="epNum(ep) === currentEpisodeNumber" class="ep-arc c-a8yjwc"></span>
                          <span v-if="epNum(ep) === currentEpisodeNumber" class="ep-notch c-a8yjwc"></span>
                          <div class="ep-inner c-a8yjwc">
                            <div class="ep-thumb c-a8yjwc">
                              <img
                                v-if="episodeThumbnail(ep)"
                                loading="lazy"
                                :alt="ep.title"
                                class="h-full w-full object-cover transition-opacity duration-200 opacity-100 c-a8yjwc"
                                :class="{ 'blur-sm': isSpoiler(ep) }"
                                :src="episodeThumbnail(ep)"
                              />
                              <div v-else class="flex h-full w-full items-center justify-center bg-zinc-900 text-[10px] font-semibold text-zinc-600 c-a8yjwc">
                                EP {{ ep.number }}
                              </div>
                              <div class="ep-play c-a8yjwc">
                                <div class="ep-play-chip c-a8yjwc">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 translate-x-[1px] c-a8yjwc" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" class="c-a8yjwc"></path>
                                  </svg>
                                </div>
                              </div>
                              <div v-if="epNum(ep) === currentEpisodeNumber" class="ep-progress c-a8yjwc">
                                <div class="ep-progress-fill c-a8yjwc" style="width: 6.36%"></div>
                              </div>
                            </div>
                            <div class="ep-info c-a8yjwc">
                              <div class="ep-head c-a8yjwc">
                                <span class="ep-num c-a8yjwc">EP {{ String(ep.number).padStart(2, '0') }}</span>
                              </div>
                              <h4 class="ep-title c-a8yjwc">{{ isSpoiler(ep) ? `Episode ${ep.number}` : ep.title }}</h4>
                              <div class="ep-foot c-a8yjwc">
                                <div class="ep-tags c-a8yjwc">
                                  <span v-if="episodeHasSub(ep)" class="ep-tag sub c-a8yjwc" title="Subbed">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-captions h-2.5 w-2.5"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"></rect><path d="M7 15h4M15 15h2M7 11h2M13 11h4"></path></svg>
                                    Sub
                                  </span>
                                  <span v-if="episodeHasDub(ep)" class="ep-tag dub c-a8yjwc" title="Dubbed">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-mic h-2.5 w-2.5"><path d="M12 19v3"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><rect x="9" y="2" width="6" height="13" rx="3"></rect></svg>
                                    Dub
                                  </span>
                                  <span v-if="ep.filler" class="ep-tag filler c-a8yjwc">Filler</span>
                                  <span v-else-if="ep.recap" class="ep-tag c-a8yjwc">Recap</span>
                                </div>
                                <span v-if="formatAirDate(ep.airDate)" class="ep-aired c-a8yjwc">{{ formatAirDate(ep.airDate).toUpperCase() }}</span>
                              </div>
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Mobile duplicate: "About Anime" card -->
            <div class="watch-info-enter mt-8 flex flex-col lg:hidden c-1u7mu3r">
              <div class="mb-3 flex items-center gap-2 px-1 c-1u7mu3r">
                <h2 class="text-lg font-medium text-white c-1u7mu3r">About Anime</h2>
              </div>
              <div class="flex w-full flex-col gap-4 rounded-lg border border-white/5 bg-zinc-900/40 p-4 c-1u7mu3r">
                <div class="flex flex-row items-start gap-4 c-1u7mu3r">
                  <div class="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-md border border-white/10 c-1u7mu3r">
                    <img :alt="displayTitle" class="h-full w-full object-cover c-1u7mu3r" loading="lazy" :src="anime.coverImage?.extraLarge" />
                  </div>
                  <div class="flex flex-1 flex-col c-1u7mu3r">
                    <h3 class="line-clamp-2 text-base leading-tight font-bold text-white c-1u7mu3r">{{ displayTitle }}</h3>
                    <div class="mt-3 flex flex-wrap gap-1.5 c-1u7mu3r">
                      <div class="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-2 py-0.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black c-1u7mu3r">
                        <div class="absolute top-0 right-0 h-full w-1 bg-white/10 c-1u7mu3r"></div>
                        <div class="relative z-10 flex skew-x-12 items-center gap-1.5 text-[10px] font-black tracking-wider text-primary uppercase c-1u7mu3r">
                          <svg aria-hidden="true" class="lucide-icon lucide lucide-captions size-3" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                            <rect height="14" rx="2" ry="2" width="18" x="3" y="5"></rect>
                            <path d="M7 15h4M15 15h2M7 11h2M13 11h4"></path>
                          </svg>
                          <span class="c-1u7mu3r">{{ episodeCount }}</span>
                        </div>
                      </div>
                      <div class="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-2 py-0.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black c-1u7mu3r">
                        <div class="absolute top-0 right-0 h-full w-1 bg-white/10 c-1u7mu3r"></div>
                        <div class="relative z-10 flex skew-x-12 items-center justify-center text-[10px] font-black tracking-wider text-primary uppercase c-1u7mu3r">{{ anime.format }}</div>
                      </div>
                      <div
                        v-for="cat in categories"
                        :key="`about-cat-${cat}`"
                        class="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-2 py-0.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black c-1u7mu3r"
                      >
                        <div class="absolute top-0 right-0 h-full w-1 bg-white/10 c-1u7mu3r"></div>
                        <div class="relative z-10 flex skew-x-12 items-center justify-center text-[10px] font-black tracking-wider text-primary uppercase c-1u7mu3r">{{ cat }}</div>
                      </div>
                    </div>
                    <div class="mt-3 line-clamp-4 text-[11.5px] leading-relaxed text-zinc-400 c-1u7mu3r" style="white-space: pre-line">{{ anime.description }}</div>
                  </div>
                </div>
                <div class="mt-1 flex w-full flex-col gap-3 text-sm text-zinc-300 c-1u7mu3r">
                  <div class="flex flex-col gap-2 rounded border border-white/5 bg-black/40 p-3 text-[12px] c-1u7mu3r">
                    <div class="flex gap-2 c-1u7mu3r">
                      <span class="w-[60px] shrink-0 font-medium text-zinc-500 c-1u7mu3r">Studio:</span>
                      <span class="line-clamp-1 text-zinc-200 c-1u7mu3r">
                        <template v-for="(edge, i) in studioList" :key="`about-${edge.node.id}`">
                          <a class="transition-colors hover:text-primary c-1u7mu3r" :href="`/search?studio=${encodeURIComponent(edge.node.name)}`">{{ edge.node.name }}</a><template v-if="i < studioList.length - 1">, </template>
                        </template>
                      </span>
                    </div>
                    <div class="flex gap-2 c-1u7mu3r">
                      <span class="w-[60px] shrink-0 font-medium text-zinc-500 c-1u7mu3r">Aired:</span>
                      <span class="truncate text-zinc-200 c-1u7mu3r">
                        <a class="transition-colors hover:text-primary c-1u7mu3r" :href="`/search?year=${anime.startDate?.year}`">{{ anime.startDate?.year }}</a>
                      </span>
                    </div>
                    <div class="flex gap-2 c-1u7mu3r">
                      <span class="w-[60px] shrink-0 font-medium text-zinc-500 c-1u7mu3r">Genres:</span>
                      <span class="line-clamp-1 text-zinc-200 c-1u7mu3r">
                        <template v-for="(genre, i) in genres" :key="`about-genre-${genre}`">
                          <a class="transition-colors hover:text-primary c-1u7mu3r" :href="`/search?genre=${genre}`">{{ genre }}</a><template v-if="i < genres.length - 1">, </template>
                        </template>
                      </span>
                    </div>
                  </div>

                  <div class="anime-rating c-8446c5" :class="{ 'is-rated': userRating > 0 }">
                    <span aria-hidden="true" class="ar-arc c-8446c5"></span>
                    <span aria-hidden="true" class="ar-dots c-8446c5"></span>
                    <div class="ar-head c-8446c5">
                      <span class="ar-tag c-8446c5">{{ userRating ? `Your rating · ${formatRatingLabel(userRating)}` : 'Rate this anime' }}</span>
                      <span class="ar-side c-8446c5">
                        <button v-if="userRating" type="button" class="ar-clear c-8446c5" aria-label="Remove rating" @click="clearRating">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-x size-3">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                          </svg>
                        </button>
                      </span>
                    </div>
                    <div aria-label="Rate this anime from 1 to 10 (half a star = 1 point)" class="ar-stars c-8446c5" role="group" @mouseleave="hoverRating = 0">
                      <div class="ar-star c-8446c5" v-for="n in 5" :key="n">
                        <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-6 text-zinc-700" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                        </svg>
                        <span v-if="ratingPreviewValue >= n * 2" class="ar-fill c-8446c5">
                          <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-6 fill-amber-400 text-amber-400" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                          </svg>
                        </span>
                        <span v-else-if="ratingPreviewValue === n * 2 - 1" class="ar-fill ar-fill-half c-8446c5">
                          <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-6 fill-amber-400 text-amber-400" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                          </svg>
                        </span>
                        <button :aria-label="`Rate ${n * 2 - 1} out of 10`" class="ar-zone ar-zone-l c-8446c5" @click="rate(n * 2 - 1)" @mouseenter="hoverRating = n * 2 - 1"></button>
                        <button :aria-label="`Rate ${n * 2} out of 10`" class="ar-zone ar-zone-r c-8446c5" @click="rate(n * 2)" @mouseenter="hoverRating = n * 2"></button>
                      </div>
                    </div>
                    <div class="ar-caption c-8446c5">
                      <template v-if="hoverRating">
                        <span class="ar-hover-label text-[11px] font-semibold tracking-wide text-amber-400 c-8446c5">{{ formatRatingLabel(hoverRating) }}</span>
                      </template>
                      <template v-else>
                        <svg aria-hidden="true" class="lucide-icon lucide lucide-star size-3 fill-amber-400 text-amber-400" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                        </svg>
                        <span class="ar-avg c-8446c5">{{ displayAvg }}</span>
                        <span class="ar-votes c-8446c5">· {{ displayVotes }} votes</span>
                      </template>
                    </div>
                  </div>
                </div>
                <a
                  :href="`/anime/${id}`"
                  class="group relative z-10 mx-auto mt-1 flex h-10 w-[98%] items-center justify-center overflow-hidden border border-white/10 bg-white/5 transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 c-1u7mu3r"
                  style="transform: skew(-10deg)"
                >
                  <div class="flex flex-row items-center justify-center gap-2 c-1u7mu3r" style="transform: skew(10deg)">
                    <span class="relative z-10 text-[11px] font-bold tracking-widest text-zinc-300 uppercase transition-colors group-hover:text-white c-1u7mu3r">View Details</span>
                    <svg class="relative z-10 h-3.5 w-3.5 text-zinc-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white c-1u7mu3r" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                  <div class="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-[150%] c-1u7mu3r"></div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="my-5 border-t border-solid border-gray-300/10 c-1u7mu3r"></div>

        <!-- ============ COMMENTS + RELATED/RECOMMENDATIONS ROW ============ -->
        <div class="flex gap-5 c-1u7mu3r">
          <div class="flex-grow c-1u7mu3r" data-comments-section="">
            <div class="@container flex w-full flex-col pb-20 md:pb-0 c-g2w5l3">
              
              <!-- Comment Header (Visible when expanded) -->
              <div 
                v-show="showComments" 
                class="flex items-center justify-between border-b border-zinc-800/50 p-4 bg-black c-g2w5l3"
              >
                <div class="flex items-center c-g2w5l3">
                  <h2 class="text-xl font-bold text-zinc-100 c-g2w5l3">COMMENTS</h2>
                </div>
              </div>

              <!-- Persistent Comment Section Container -->
              <div class="relative">
                <!-- Single Comment Div (Never unmounts or reloads) -->
                <div 
                  id="anime-community-comment-section" 
                  class="p-4 c-g2w5l3 transition-all duration-300"
                  :class="{
                    'blur-md max-h-60 overflow-hidden pointer-events-none select-none': !showComments
                  }"
                  @click.capture="preventCommentTimestampJump"
                ></div>

                <!-- Overlay Button (Shown only when collapsed) -->
                <div 
                  v-if="!showComments" 
                  class="absolute inset-0 flex items-center justify-center backdrop-blur-[1px]"
                >
                  <button 
                    @click="showComments = true" 
                    class="rounded-xl border border-zinc-700 bg-zinc-900/90 px-6 py-3 text-sm font-bold text-zinc-100 shadow-xl transition-all hover:bg-zinc-800 hover:scale-105 active:scale-95"
                  >
                    Show Comments
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar: Related Anime + Recommendations -->
          <div class="watch-episodes-enter hidden shrink-0 flex-col lg:flex lg:w-[360px] xl:w-[440px] c-1u7mu3r">
            <div class="scrollbar-hide flex-col overflow-hidden rounded-lg c-1u7mu3r">
              <div class="mb-3 flex items-center gap-2 leading-tight c-1u7mu3r">
                <span class="ml-0.5 h-6 w-[.35rem] rounded-md bg-white md:w-[.3rem] c-1u7mu3r"></span>
                <h2 class="text-lg font-medium xl:text-xl c-1u7mu3r">Related Anime</h2>
              </div>
              <div class="relative min-h-[100px] w-full c-1u7mu3r">
                <div class="space-y-2 transition-all duration-300 c-1u7mu3r">
                  <a v-for="edge in visibleRelated" :key="`related-${edge.node.id}`" class="c-1u7mu3r" :href="`/anime/${edge.node.id}/1`">
                    <div class="bg-card-background mb-3 flex h-[5.4rem] gap-2 overflow-hidden rounded-lg pr-1 transition-all duration-300 ease-out md:gap-3 hover:scale-[0.975] hover:bg-[#27272c] c-1u7mu3r">
                      <div class="h-full w-[65px] flex-shrink-0 rounded-lg c-1u7mu3r">
                        <img
                          :alt="edge.node.title.english || edge.node.title.romaji"
                          class="h-full w-full rounded-lg object-cover c-1u7mu3r"
                          height="90"
                          referrerpolicy="no-referrer"
                          :src="edge.node.coverImage?.large"
                          width="70"
                        />
                      </div>
                      <div class="flex h-full min-w-0 flex-grow flex-col justify-center gap-0.5 c-1u7mu3r">
                        <p class="line-clamp-2 text-sm font-medium opacity-90 c-1u7mu3r">{{ edge.node.title.english || edge.node.title.romaji }}</p>
                        <p class="mt-1 flex items-center text-[10px] font-medium text-zinc-400 c-1u7mu3r">
                          <span class="line-clamp-1 tracking-widest text-primary uppercase drop-shadow-sm c-1u7mu3r">{{ edge.node.format }}</span>
                          <span class="mx-1.5 opacity-40 c-1u7mu3r">•</span>
                          <span class="shrink-0 c-1u7mu3r">{{ relationLabel(edge.relationType) }}</span>
                        </p>
                      </div>
                    </div>
                  </a>
                </div>
                <button
                  v-if="!showAllRelated && hiddenRelatedCount > 0"
                  class="mt-2 w-full rounded-lg border border-zinc-800/80 bg-zinc-900/30 py-2.5 text-xs font-semibold tracking-wide text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white c-1u7mu3r"
                  @click="showAllRelated = true"
                >
                  Show {{ hiddenRelatedCount }} More
                </button>
              </div>
            </div>

            <div class="scrollbar-hide flex-col overflow-y-hidden rounded-lg mt-5 c-1u7mu3r">
              <div class="mb-3 flex items-center gap-2 leading-tight c-1u7mu3r">
                <span class="ml-0.5 h-6 w-[.35rem] rounded-md bg-white md:w-[.3rem] c-1u7mu3r"></span>
                <h2 class="text-lg font-medium xl:text-xl c-1u7mu3r">Recommendations</h2>
              </div>
              <div class="relative min-h-[100px] w-full c-1u7mu3r">
                <div class="no-scrollbar flex max-h-[18rem] w-full flex-col overflow-y-scroll transition-all duration-300 lg:max-h-[25rem] c-1u7mu3r">
                  <a v-for="rec in recommendations" :key="rec.href" class="c-1u7mu3r" :href="rec.href">
                    <div class="bg-card-background mb-3 flex h-[5.4rem] gap-2 overflow-hidden rounded-lg pr-1 transition-all duration-300 ease-out hover:scale-[0.975] hover:bg-[#27272c] md:gap-3 c-1u7mu3r">
                      <div class="h-full w-[65px] flex-shrink-0 rounded-lg c-1u7mu3r">
                        <img :alt="rec.title" class="h-full w-full rounded-lg object-cover c-1u7mu3r" height="90" :src="rec.image" width="70" />
                      </div>
                      <div class="flex h-full flex-grow flex-col justify-center gap-0.5 c-1u7mu3r">
                        <p class="line-clamp-2 text-sm font-medium opacity-90 c-1u7mu3r">{{ rec.title }}</p>
                        <p class="flex items-center text-xs text-[#ffffffb2] c-1u7mu3r">
                          {{ rec.format }}
                          <span class="mx-1 c-1u7mu3r">•</span>
                          <svg class="mr-0.5 h-3 w-3 text-yellow-500 c-1u7mu3r" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                          </svg>
                          {{ rec.score }}
                        </p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Error state (no local "loading" placeholder — the site-wide loading
           bar covers that while `anime` is still null/pending). -->
      <div v-else-if="error" class="flex min-h-[300px] w-full items-center justify-center text-sm text-red-400 c-1u7mu3r">Failed to load anime.</div>
    </div>
  </main>
</template>