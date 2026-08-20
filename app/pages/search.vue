<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/**
 * /api/search contract — matched to the server route you shared
 * ---------------------------------------------------------------
 * GET query params:
 *   q        free text search
 *   genre    comma-separated list, e.g. "Action,Adventure"
 *   tag      comma-separated list, e.g. "Isekai,Time Travel"
 *            NOTE: your current server route reads `tag` as a single String
 *            and passes it straight to AniList's `tag` arg (also a single
 *            String). To actually filter by multiple tags, mirror the
 *            `genre` -> `genre_in` pattern server-side: split this on ",",
 *            and use `tag_in: [String]` in the GraphQL query instead of `tag`.
 *   season   WINTER | SPRING | SUMMER | FALL
 *   format   TV | MOVIE | SPECIAL | OVA | ONA | MUSIC
 *   status   FINISHED | RELEASING | NOT_YET_RELEASED | CANCELLED
 *   country  JP | KR | CN | TW
 *   year     number
 *   sort     comma-separated MediaSort values, e.g. "POPULARITY_DESC"
 *   limit    page size (default 36)
 *   offset   pagination offset
 *
 * Response: { success, media: [...], pageInfo: { total, currentPage, lastPage, hasNextPage } }
 * Each media item: { id, title: { english, romaji }, coverImage: { large }, format, status, seasonYear, averageScore }
 */

// ---------------- static option lists ----------------
const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
  'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
]
const TAGS = [
  'Isekai', 'Time Travel', 'School', 'Military', 'Super Power', 'Vampire',
  'Tragedy', 'Revenge', 'Post-Apocalyptic', 'Female Protagonist',
  'Male Protagonist', 'Ensemble Cast', 'Video Games', 'Cyberpunk', 'Historical',
]
const SEASONS = [
  { label: 'Winter', value: 'WINTER' },
  { label: 'Spring', value: 'SPRING' },
  { label: 'Summer', value: 'SUMMER' },
  { label: 'Fall', value: 'FALL' },
]
const FORMATS = [
  { label: 'TV', value: 'TV' },
  { label: 'Movie', value: 'MOVIE' },
  { label: 'Special', value: 'SPECIAL' },
  { label: 'OVA', value: 'OVA' },
  { label: 'ONA', value: 'ONA' },
  { label: 'Music', value: 'MUSIC' },
]
const STATUSES = [
  { label: 'Finished', value: 'FINISHED' },
  { label: 'Releasing', value: 'RELEASING' },
  { label: 'Not Yet Released', value: 'NOT_YET_RELEASED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]
const ORIGINS = [
  { label: 'Japan', value: 'JP' },
  { label: 'South Korea', value: 'KR' },
  { label: 'China', value: 'CN' },
  { label: 'Taiwan', value: 'TW' },
]
const SORTS = [
  { label: 'Popularity', value: 'POPULARITY_DESC' },
  { label: 'Score', value: 'SCORE_DESC' },
  { label: 'Year', value: 'START_DATE_DESC' },
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR + 2 - 1960 }, (_, i) => CURRENT_YEAR + 1 - i)

// ---------------- filter state (single source of truth) ----------------
const filters = reactive({
  search: '',
  genres: [],
  tags: [],
  year: null,
  status: '',
  format: '',
  season: '',
  origin: '',
  sort: 'POPULARITY_DESC',
})

// Sort always has a value (the API needs one), but we only want to show it
// as a chip / highlight the sidebar section once the user actually touches it.
const sortTouched = ref(false)
let debounceTimer = null

function resetFilters() {
  filters.search = ''
  filters.genres = []
  filters.tags = []
  filters.year = null
  filters.status = ''
  filters.format = ''
  filters.season = ''
  filters.origin = ''
  filters.sort = 'POPULARITY_DESC'
  sortTouched.value = false
  applyFiltersNow()
}

// ---------------- dropdown open/close ----------------
const openDropdown = ref(null)
const dropdownEls = {}
function bindDropdown(key) {
  return (el) => { if (el) dropdownEls[key] = el }
}
function toggleDropdown(key) {
  openDropdown.value = openDropdown.value === key ? null : key
  genreSearch.value = ''
  tagSearch.value = ''
  yearSearch.value = ''
}
function closeDropdowns() { openDropdown.value = null }
function handleOutsideClick(e) {
  if (!openDropdown.value) return
  const el = dropdownEls[openDropdown.value]
  if (el && !el.contains(e.target)) closeDropdowns()
}
onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleOutsideClick))

// green ring shown on whichever trigger's panel is currently open
function ringIf(key) { return openDropdown.value === key ? 'ring-2 ring-primary' : '' }
// slighter ring shown whenever a filter has an active value (independent of open state)
function selectedRing(hasValue) { return hasValue ? 'ring-1 ring-primary/50' : '' }

// ---------------- sidebar section collapse ----------------
const sidebarOpen = reactive({ season: true, format: true, status: true, origin: true, sort: true })
function toggleSidebar(key) { sidebarOpen[key] = !sidebarOpen[key] }

// JS-driven height transition for the collapsible sidebar sections — animating
// to/from "auto" height needs the real scrollHeight, CSS alone can't do it reliably.
function onSidebarEnter(el) {
  el.style.height = '0px'
  el.style.overflow = 'hidden'
  void el.offsetHeight // force reflow so the transition actually runs
  el.style.transition = 'height 300ms ease'
  el.style.height = el.scrollHeight + 'px'
}
function onSidebarAfterEnter(el) {
  el.style.height = ''
  el.style.overflow = ''
  el.style.transition = ''
}
function onSidebarLeave(el) {
  el.style.height = el.scrollHeight + 'px'
  el.style.overflow = 'hidden'
  void el.offsetHeight
  el.style.transition = 'height 300ms ease'
  el.style.height = '0px'
}

// in-panel search boxes for the longer option lists
const genreSearch = ref('')
const tagSearch = ref('')
const yearSearch = ref('')
const filteredGenres = computed(() => {
  const q = genreSearch.value.trim().toLowerCase()
  return q ? GENRES.filter(g => g.toLowerCase().includes(q)) : GENRES
})
const filteredTags = computed(() => {
  const q = tagSearch.value.trim().toLowerCase()
  return q ? TAGS.filter(t => t.toLowerCase().includes(q)) : TAGS
})
const filteredYears = computed(() => {
  const q = yearSearch.value.trim()
  return q ? YEARS.filter(y => String(y).includes(q)) : YEARS
})

function toggleGenre(g) {
  const i = filters.genres.indexOf(g)
  if (i === -1) filters.genres.push(g); else filters.genres.splice(i, 1)
}
function toggleTag(t) {
  const i = filters.tags.indexOf(t)
  if (i === -1) filters.tags.push(t); else filters.tags.splice(i, 1)
}
function selectYear(y) { filters.year = filters.year === y ? null : y; closeDropdowns() }
function selectStatus(s) { filters.status = filters.status === s ? '' : s; closeDropdowns() }
function selectFormat(f) { filters.format = filters.format === f ? '' : f; closeDropdowns() }
function selectSeason(s) { filters.season = filters.season === s ? '' : s; closeDropdowns() }
function selectOrigin(o) { filters.origin = filters.origin === o ? '' : o; closeDropdowns() }
function selectSort(s) { filters.sort = s; sortTouched.value = true; closeDropdowns() }

function clearGenres(e) { e.stopPropagation(); filters.genres = [] }
function clearYear(e) { e.stopPropagation(); filters.year = null }

// ---------------- computed labels ----------------
const genreLabel = computed(() => filters.genres.length ? filters.genres.join(', ') : 'Any')
const tagLabel = computed(() => filters.tags.length ? filters.tags.join(', ') : 'Any')
const yearLabel = computed(() => filters.year ? String(filters.year) : 'Any')
const statusLabel = computed(() => STATUSES.find(s => s.value === filters.status)?.label || 'Any Status')
const formatLabel = computed(() => FORMATS.find(f => f.value === filters.format)?.label || 'Any Format')
const seasonLabel = computed(() => SEASONS.find(s => s.value === filters.season)?.label || 'Any Season')
const originLabel = computed(() => ORIGINS.find(o => o.value === filters.origin)?.label || 'Any Origin')
const sortLabel = computed(() => SORTS.find(s => s.value === filters.sort)?.label || 'Sort')

// ---------------- active-filter chips ----------------
const chips = computed(() => {
  const list = []
  filters.genres.forEach(g => list.push({ key: `genre-${g}`, label: g, clear: () => toggleGenre(g) }))
  filters.tags.forEach(t => list.push({ key: `tag-${t}`, label: t, clear: () => toggleTag(t) }))
  if (filters.season) list.push({ key: 'season', label: seasonLabel.value, clear: () => (filters.season = '') })
  if (filters.format) list.push({ key: 'format', label: formatLabel.value, clear: () => (filters.format = '') })
  if (filters.status) list.push({ key: 'status', label: statusLabel.value, clear: () => (filters.status = '') })
  if (filters.origin) list.push({ key: 'origin', label: originLabel.value, clear: () => (filters.origin = '') })
  if (filters.year) list.push({ key: 'year', label: String(filters.year), clear: () => (filters.year = null) })
  // sort only shows up once the user has actually picked one, not for the silent default
  if (sortTouched.value) {
    list.push({ key: 'sort', label: sortLabel.value, sort: true, clear: () => { filters.sort = 'POPULARITY_DESC'; sortTouched.value = false } })
  }
  return list
})
const hasActiveFilters = computed(() => chips.value.length > 0 || !!filters.search.trim())

// ---------------- fetching ----------------
const PAGE_SIZE = 36
const offset = ref(0)
const results = ref([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const errorMsg = ref('')

// animated "N results found" counter — counts up from 0 every time a fresh search lands
const displayedTotal = ref(0)
let countAnimFrame = null
function animateTotalFromZero(target) {
  if (countAnimFrame) cancelAnimationFrame(countAnimFrame)
  displayedTotal.value = 0
  const duration = 900
  const startTime = performance.now()
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 5) // quintic ease-out: noticeably slows as it nears the final number
    displayedTotal.value = Math.round(target * eased)
    countAnimFrame = t < 1 ? requestAnimationFrame(step) : null
  }
  countAnimFrame = requestAnimationFrame(step)
}
onBeforeUnmount(() => { if (countAnimFrame) cancelAnimationFrame(countAnimFrame) })

function buildQuery() {
  const query = {}
  if (filters.search.trim()) query.q = filters.search.trim()
  if (filters.genres.length) query.genre = filters.genres.join(',')
  if (filters.tags.length) query.tag = filters.tags.join(',') // see server-side note above re: tag_in
  if (filters.season) query.season = filters.season
  if (filters.format) query.format = filters.format
  if (filters.status) query.status = filters.status
  if (filters.origin) query.country = filters.origin
  if (filters.year) query.year = filters.year
  if (filters.sort) query.sort = filters.sort
  query.limit = PAGE_SIZE
  query.offset = offset.value
  return query
}

// ---------------- URL <-> filters sync ----------------
// Nuxt auto-imports useRoute/useRouter, no explicit import needed.
const route = useRoute()
const router = useRouter()
let restoringFromUrl = false

function loadFiltersFromUrl() {
  const q = route.query
  if (!Object.keys(q).length) return
  restoringFromUrl = true
  if (q.q) filters.search = String(q.q)
  if (q.genre) filters.genres = String(q.genre).split(',').filter(Boolean)
  if (q.tag) filters.tags = String(q.tag).split(',').filter(Boolean)
  if (q.season) filters.season = String(q.season).toUpperCase()
  if (q.format) filters.format = String(q.format).toUpperCase()
  if (q.status) filters.status = String(q.status).toUpperCase()
  if (q.country) filters.origin = String(q.country).toUpperCase()
  if (q.year) filters.year = parseInt(String(q.year), 10) || null
  if (q.sort) {
    filters.sort = String(q.sort).toUpperCase()
    sortTouched.value = true
  }
  restoringFromUrl = false
}

// Reflects the current filters into the address bar (no page reload, no new
// history entry per keystroke — this runs alongside the debounced fetch).
function syncUrl() {
  const query = {}
  if (filters.search.trim()) query.q = filters.search.trim()
  if (filters.genres.length) query.genre = filters.genres.join(',')
  if (filters.tags.length) query.tag = filters.tags.join(',')
  if (filters.season) query.season = filters.season
  if (filters.format) query.format = filters.format
  if (filters.status) query.status = filters.status
  if (filters.origin) query.country = filters.origin
  if (filters.year) query.year = filters.year
  if (sortTouched.value) query.sort = filters.sort
  router.replace({ query })
}

function humanizeFormat(f) {
  if (!f) return ''
  const found = FORMATS.find(x => x.value === f)
  if (found) return found.label
  return f.charAt(0) + f.slice(1).toLowerCase().replace(/_/g, ' ')
}

function mapAnime(item) {
  const scoreRaw = item.averageScore ?? null
  return {
    id: item.id,
    href: `/anime/${item.id}`,
    title: item.title?.english ?? item.title?.romaji ?? 'Untitled',
    cover: item.coverImage?.large ?? item.coverImage?.medium ?? '',
    score: scoreRaw != null ? (scoreRaw > 10 ? (scoreRaw / 10).toFixed(1) : Number(scoreRaw).toFixed(1)) : null,
    ageRating: item.ageRating ?? null,
    format: humanizeFormat(item.format),
    duration: item.duration ? `${item.duration}m` : '',
    subEpisodes: item.episodes?.sub ?? 0,
    dubEpisodes: item.episodes?.dub ?? 0,
    totalEpisodes: item.episodes?.total ?? (typeof item.episodes === 'number' ? item.episodes : 0),
    status: item.status ?? '',
    watchlistStatus: item.watchlistStatus ?? null,
  }
}

let requestToken = 0
async function fetchResults({ append = false, animateCounter = true } = {}) {
  const token = ++requestToken
  if (append) loadingMore.value = true; else loading.value = true
  errorMsg.value = ''
  try {
    const data = await $fetch('/api/search', { query: buildQuery() })
    if (token !== requestToken) return
    const list = data?.media ?? []
    const totalCount = data?.pageInfo?.total ?? list.length
    results.value = append ? [...results.value, ...list.map(mapAnime)] : list.map(mapAnime)
    total.value = totalCount
    if (!animateCounter) {
      // page navigation within the same filter set — total hasn't changed,
      // so just keep the counter as-is instead of re-animating it
      displayedTotal.value = totalCount
    } else if (append) {
      displayedTotal.value = totalCount // just loaded more into an existing list — snap, don't re-animate
    } else {
      animateTotalFromZero(totalCount)
    }
  } catch (err) {
    if (token !== requestToken) return
    console.error('[search] failed to fetch results', err)
    errorMsg.value = 'Something went wrong loading results. Please try again.'
  } finally {
    if (token === requestToken) { loading.value = false; loadingMore.value = false }
  }
}

function applyFiltersNow() {
  clearTimeout(debounceTimer)
  offset.value = 0
  syncUrl()
  fetchResults()
}

// ---------------- pagination (numbered pages instead of "load more") ----------------
const currentPage = computed(() => Math.floor(offset.value / PAGE_SIZE) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

function range(start, end) {
  if (end < start) return []
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

// Builds the compact page-number list, e.g. [1, 2, 3, '...', 11] or
// [1, '...', 4, 5, 6, '...', 11] once there are enough pages. One boundary
// page is kept pinned on each end. The floor/ceiling near each edge is a
// FIXED size (independent of siblingCount) so early/late pages always
// collapse to a plain "1, 2, 3, ... N" cluster; pages further into the
// middle fall through to the real page ± sibling window, showing the
// current page's immediate neighbors. Single-page gaps get filled in with
// the real number instead of an ellipsis; only genuine multi-page gaps
// collapse to "...".
const pageItems = computed(() => {
  const count = totalPages.value
  const page = currentPage.value
  const boundaryCount = 1
  const siblingCount = 1

  if (count <= boundaryCount * 2 + siblingCount * 2 + 3) {
    return range(1, count).map(value => ({ type: 'page', value }))
  }

  const startPages = range(1, boundaryCount)
  const endPages = range(count - boundaryCount + 1, count)

  const floorLow = boundaryCount + 2
  const capHigh = endPages[0] - 2

  const siblingsStart = Math.max(Math.min(page - siblingCount, capHigh), floorLow)
  const siblingsEnd = Math.min(Math.max(page + siblingCount, floorLow), capHigh)

  const items = startPages.map(value => ({ type: 'page', value }))

  if (siblingsStart > boundaryCount + 2) {
    items.push({ type: 'ellipsis', key: 'start' })
  } else if (boundaryCount + 1 < siblingsStart) {
    items.push({ type: 'page', value: boundaryCount + 1 })
  }

  items.push(...range(siblingsStart, siblingsEnd).map(value => ({ type: 'page', value })))

  if (siblingsEnd < count - boundaryCount - 1) {
    items.push({ type: 'ellipsis', key: 'end' })
  } else if (siblingsEnd < count - boundaryCount) {
    items.push({ type: 'page', value: count - boundaryCount })
  }

  items.push(...endPages.map(value => ({ type: 'page', value })))

  return items
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  offset.value = (page - 1) * PAGE_SIZE
  // same filter set, same total — don't re-trigger the count-up animation
  fetchResults({ animateCounter: false })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function goToPrevPage() { goToPage(currentPage.value - 1) }
function goToNextPage() { goToPage(currentPage.value + 1) }

watch(
  () => JSON.stringify(filters),
  () => {
    if (restoringFromUrl) return
    offset.value = 0
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      syncUrl()
      fetchResults()
    }, 350)
  }
)

loadFiltersFromUrl()
onMounted(() => fetchResults())

// ---------------- watchlist ----------------
const flippedId = ref(null)
function toggleFlip(id) { flippedId.value = flippedId.value === id ? null : id }

// removed setWatchlistStatus

// removed statusDotClass


// ---------------- mobile "more filters" (Season / Origin / Sort) ----------------
const mobileExpanded = ref(false)
function toggleMobileExpanded() { mobileExpanded.value = !mobileExpanded.value }

// ---------------- title marquee on card hover ----------------
// Titles are truncated by default (`.anime-title`, using the browser's
// native text-overflow: ellipsis). That element is left completely alone
// on hover — wrapping its text in a span or transforming it directly breaks
// native ellipsis truncation and/or just slides the whole clipped box
// (nothing new gets revealed, since a transform moves the clip region right
// along with the content it clips).
//
// Instead, `.anime-title-marquee` is a second, identically-positioned copy
// that sits invisible on top of the static title. On hover, if the title
// actually overflows, we fade to that copy and transform its inner
// `.anime-title-text` span (which is NOT itself a clipping box) to scroll
// the text within its ancestor's overflow:hidden.
// removed startTitleMarquee / stopTitleMarquee
</script>

<template>
 <body>
  <main class="min-h-screen bg-black text-white c-1gx8udt">
   <div style="padding-top:65px" class="min-h-screen xl:ml-1.5 c-1gx8udt">

    <!-- ===================== MOBILE FILTER BAR ===================== -->
    <div class="mt-3 border-b border-gray-800/50 px-4 pt-1 pb-4 lg:hidden c-1gx8udt">
     <div class="mb-4 flex flex-col gap-4 c-1gx8udt">
      <div class="grid grid-cols-2 gap-x-3 gap-y-4 c-1gx8udt">

       <!-- Search -->
       <div class="relative col-span-2 w-full c-1gx8udt">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Search Anime</div>
        <form class="relative w-full c-1gx8udt" @submit.prevent="applyFiltersNow">
         <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 c-1gx8udt">
          <svg aria-hidden="true" class="h-[14px] w-[14px] text-gray-500 c-1gx8udt" fill="none" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
           <path class="c-1gx8udt" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path>
          </svg>
         </div>
         <input v-model="filters.search" autocomplete="off" class="search-input block w-full rounded-lg border border-white/5 bg-[#141414] px-4 py-2.5 ps-9 text-sm font-medium text-gray-300 placeholder-gray-500 transition-colors focus:border-primary/50 focus:outline-none c-1gx8udt" placeholder="Type to search..." type="search"/>
        </form>
       </div>

       <!-- Genres -->
       <div class="relative w-full c-1gx8udt" :ref="bindDropdown('genres-m')">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Genres</div>
        <button type="button" @click="toggleDropdown('genres-m')" :class="['dropdown-button flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none c-1gx8udt', filters.genres.length ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-[#141414] hover:bg-[#1a1a1a]', ringIf('genres-m'), selectedRing(filters.genres.length)]">
         <span class="line-clamp-1 c-1gx8udt">{{ genreLabel }}</span>
         <div class="flex items-center gap-1.5 text-white/50 c-1gx8udt">
          <button v-if="filters.genres.length" aria-label="Clear" class="p-0.5 transition-colors hover:text-white c-1gx8udt" type="button" @click="clearGenres">
           <svg aria-hidden="true" class="lucide-icon lucide lucide-x size-[13px]" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
           </svg>
          </button>
          <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'genres-m' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
           <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
          </svg>
         </div>
        </button>
        <div v-if="openDropdown === 'genres-m'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
         <input v-model="genreSearch" type="text" placeholder="Search genres..." class="mb-2 w-full rounded-md border border-white/5 bg-black/40 px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-primary/50 focus:outline-none"/>
         <div class="max-h-56 overflow-auto">
          <label v-for="g in filteredGenres" :key="g" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
           <input type="checkbox" class="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 accent-primary" :checked="filters.genres.includes(g)" @change="toggleGenre(g)"/>
           {{ g }}
          </label>
          <p v-if="!filteredGenres.length" class="px-2 py-1.5 text-sm text-gray-500">No matches</p>
         </div>
        </div>
       </div>

       <!-- Tags (multi-select) -->
       <div class="relative w-full c-1gx8udt" :ref="bindDropdown('tags-m')">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Tags</div>
        <button type="button" @click="toggleDropdown('tags-m')" :class="['dropdown-button flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none c-1gx8udt', filters.tags.length ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-[#141414] hover:bg-[#1a1a1a]', ringIf('tags-m'), selectedRing(filters.tags.length)]">
         <span class="line-clamp-1 c-1gx8udt">{{ tagLabel }}</span>
         <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'tags-m' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
         </svg>
        </button>
        <div v-if="openDropdown === 'tags-m'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
         <input v-model="tagSearch" type="text" placeholder="Search tags..." class="mb-2 w-full rounded-md border border-white/5 bg-black/40 px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-primary/50 focus:outline-none"/>
         <div class="max-h-56 overflow-auto">
          <label v-for="t in filteredTags" :key="t" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
           <input type="checkbox" class="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 accent-primary" :checked="filters.tags.includes(t)" @change="toggleTag(t)"/>
           {{ t }}
          </label>
          <p v-if="!filteredTags.length" class="px-2 py-1.5 text-sm text-gray-500">No matches</p>
         </div>
        </div>
       </div>

       <!-- Year -->
       <div class="relative w-full c-1gx8udt" :ref="bindDropdown('year-m')">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Year</div>
        <button type="button" @click="toggleDropdown('year-m')" :class="['dropdown-button flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none c-1gx8udt', filters.year ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-[#141414] hover:bg-[#1a1a1a]', ringIf('year-m'), selectedRing(filters.year)]">
         <span class="line-clamp-1 c-1gx8udt">{{ yearLabel }}</span>
         <div class="flex items-center gap-1.5 text-white/50 c-1gx8udt">
          <button v-if="filters.year" aria-label="Clear" class="p-0.5 transition-colors hover:text-white c-1gx8udt" type="button" @click="clearYear">
           <svg aria-hidden="true" class="lucide-icon lucide lucide-x size-[13px]" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
           </svg>
          </button>
          <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'year-m' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
           <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
          </svg>
         </div>
        </button>
        <div v-if="openDropdown === 'year-m'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
         <input v-model="yearSearch" type="text" inputmode="numeric" placeholder="Search year..." class="mb-2 w-full rounded-md border border-white/5 bg-black/40 px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-primary/50 focus:outline-none"/>
         <div class="grid max-h-56 grid-cols-2 gap-1 overflow-auto">
          <button v-for="y in filteredYears" :key="y" type="button" class="rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="filters.year === y ? 'text-primary' : 'text-gray-300'" @click="selectYear(y)">{{ y }}</button>
         </div>
         <p v-if="!filteredYears.length" class="px-2 py-1.5 text-sm text-gray-500">No matches</p>
        </div>
       </div>

       <!-- Status -->
       <div class="relative w-full c-1gx8udt" :ref="bindDropdown('status-m')">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Status</div>
        <button type="button" @click="toggleDropdown('status-m')" :class="['dropdown-button flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none c-1gx8udt', filters.status ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-[#141414] hover:bg-[#1a1a1a]', ringIf('status-m'), selectedRing(filters.status)]">
         <span class="line-clamp-1 c-1gx8udt">{{ statusLabel }}</span>
         <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'status-m' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
         </svg>
        </button>
        <div v-if="openDropdown === 'status-m'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
         <button type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="!filters.status ? 'text-primary' : 'text-gray-300'" @click="selectStatus('')">Any Status</button>
         <button v-for="s in STATUSES" :key="s.value" type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="filters.status === s.value ? 'text-primary' : 'text-gray-300'" @click="selectStatus(s.value)">{{ s.label }}</button>
        </div>
       </div>

       <!-- Format -->
       <div class="relative w-full c-1gx8udt" :ref="bindDropdown('format-m')">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Format</div>
        <button type="button" @click="toggleDropdown('format-m')" :class="['dropdown-button flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none c-1gx8udt', filters.format ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-[#141414] hover:bg-[#1a1a1a]', ringIf('format-m'), selectedRing(filters.format)]">
         <span class="line-clamp-1 c-1gx8udt">{{ formatLabel }}</span>
         <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'format-m' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
         </svg>
        </button>
        <div v-if="openDropdown === 'format-m'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
         <button type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="!filters.format ? 'text-primary' : 'text-gray-300'" @click="selectFormat('')">Any Format</button>
         <button v-for="f in FORMATS" :key="f.value" type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="filters.format === f.value ? 'text-primary' : 'text-gray-300'" @click="selectFormat(f.value)">{{ f.label }}</button>
        </div>
       </div>

       <!-- Apply / Reset / Expand -->
       <div class="flex h-full w-full flex-col justify-end c-1gx8udt">
        <div class="flex h-full w-full flex-col justify-end c-1gx8udt">
         <div class="grid grid-cols-3 px-1 pb-1.5 text-center text-[11px] font-medium tracking-wide text-gray-400 c-1gx8udt">
          <span class="c-1gx8udt">Apply</span>
          <span class="c-1gx8udt">Reset</span>
          <span class="c-1gx8udt">Expand</span>
         </div>
         <div class="flex h-[42px] w-full items-center divide-x divide-white/5 overflow-hidden rounded-lg border border-white/5 bg-[#111] c-1gx8udt">
          <button aria-label="Apply" class="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95 c-1gx8udt" @click="applyFiltersNow">
           <svg aria-hidden="true" class="lucide-icon lucide lucide-funnel size-4" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path>
           </svg>
          </button>
          <button aria-label="Reset" class="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95 c-1gx8udt" @click="resetFilters">
           <svg aria-hidden="true" class="lucide-icon lucide lucide-rotate-ccw size-4" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path>
           </svg>
          </button>
          <button aria-label="Expand" class="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95 c-1gx8udt" @click="toggleMobileExpanded">
           <svg aria-hidden="true" class="lucide-icon lucide lucide-chevron-down size-4 transition-transform duration-300" :class="{ 'rotate-180': mobileExpanded }" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="m6 9 6 6 6-6"></path>
           </svg>
          </button>
         </div>
        </div>
       </div>

      </div>

      <!-- Mobile "more filters": Season / Origin / Sort -->
      <div v-if="mobileExpanded" class="grid grid-cols-2 gap-x-3 gap-y-4 c-1gx8udt">
       <div class="relative w-full c-1gx8udt" :ref="bindDropdown('season-m')">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Season</div>
        <button type="button" @click="toggleDropdown('season-m')" :class="['dropdown-button flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none c-1gx8udt', filters.season ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-[#141414] hover:bg-[#1a1a1a]', ringIf('season-m'), selectedRing(filters.season)]">
         <span class="line-clamp-1 c-1gx8udt">{{ seasonLabel }}</span>
         <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'season-m' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
         </svg>
        </button>
        <div v-if="openDropdown === 'season-m'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
         <button type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="!filters.season ? 'text-primary' : 'text-gray-300'" @click="selectSeason('')">Any Season</button>
         <button v-for="s in SEASONS" :key="s.value" type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="filters.season === s.value ? 'text-primary' : 'text-gray-300'" @click="selectSeason(s.value)">{{ s.label }}</button>
        </div>
       </div>

       <div class="relative w-full c-1gx8udt" :ref="bindDropdown('origin-m')">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Origin</div>
        <button type="button" @click="toggleDropdown('origin-m')" :class="['dropdown-button flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none c-1gx8udt', filters.origin ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-[#141414] hover:bg-[#1a1a1a]', ringIf('origin-m'), selectedRing(filters.origin)]">
         <span class="line-clamp-1 c-1gx8udt">{{ originLabel }}</span>
         <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'origin-m' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
         </svg>
        </button>
        <div v-if="openDropdown === 'origin-m'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
         <button type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="!filters.origin ? 'text-primary' : 'text-gray-300'" @click="selectOrigin('')">Any Origin</button>
         <button v-for="o in ORIGINS" :key="o.value" type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="filters.origin === o.value ? 'text-primary' : 'text-gray-300'" @click="selectOrigin(o.value)">{{ o.label }}</button>
        </div>
       </div>

       <div class="relative col-span-2 w-full c-1gx8udt" :ref="bindDropdown('sort-m')">
        <div class="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white c-1gx8udt">Sort by</div>
        <button type="button" @click="toggleDropdown('sort-m')" :class="['dropdown-button flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#1a1a1a] c-1gx8udt', ringIf('sort-m')]">
         <span class="line-clamp-1 c-1gx8udt">{{ sortLabel }}</span>
         <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'sort-m' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
         </svg>
        </button>
        <div v-if="openDropdown === 'sort-m'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
         <button v-for="s in SORTS" :key="s.value" type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="filters.sort === s.value ? 'text-primary' : 'text-gray-300'" @click="selectSort(s.value)">{{ s.label }}</button>
        </div>
       </div>
      </div>
     </div>
    </div>

    <!-- ===================== MAIN COLUMN ===================== -->
    <div class="flex h-full w-full flex-col c-1gx8udt">

     <!-- ===================== DESKTOP FILTER BAR ===================== -->
     <div class="hidden flex-row gap-6 border-b border-gray-800/50 p-4 lg:flex c-1gx8udt">
      <div class="c-1gx8udt">
       <h3 class="mb-1 text-lg font-semibold c-1gx8udt">Search</h3>
       <form class="relative rounded-xl c-1gx8udt" @submit.prevent="applyFiltersNow">
        <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 c-1gx8udt">
         <svg aria-hidden="true" class="h-4 w-4 text-gray-400 c-1gx8udt" fill="none" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path class="c-1gx8udt" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
         </svg>
        </div>
        <input v-model="filters.search" autocomplete="off" class="search-input block w-[220px] rounded-xl bg-zinc-900 px-4 py-2.5 ps-10 text-sm font-medium text-white/90 placeholder-gray-400 transition-colors duration-200 outline-none c-1gx8udt" placeholder="Search" type="search"/>
       </form>
      </div>

      <div class="relative c-1gx8udt" :ref="bindDropdown('genres-d')">
       <div class="mb-1 text-lg font-semibold c-1gx8udt">Genres</div>
       <button type="button" @click="toggleDropdown('genres-d')" :class="['dropdown-button flex w-[210px] items-center justify-between rounded-[10px] py-2.5 pr-3 pl-3 text-sm font-medium text-gray-300 transition-all duration-200 focus:outline-none c-1gx8udt', filters.genres.length ? 'border border-primary/50 bg-primary/5' : 'bg-zinc-900 hover:bg-zinc-800', ringIf('genres-d'), selectedRing(filters.genres.length)]">
        <span class="mr-0.5 line-clamp-1 c-1gx8udt">{{ genreLabel }}</span>
        <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'genres-d' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
         <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
        </svg>
       </button>
       <div v-if="openDropdown === 'genres-d'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
        <input v-model="genreSearch" type="text" placeholder="Search genres..." class="mb-2 w-full rounded-md border border-white/5 bg-black/40 px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-primary/50 focus:outline-none"/>
        <div class="max-h-60 overflow-auto">
         <label v-for="g in filteredGenres" :key="g" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
          <input type="checkbox" class="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 accent-primary" :checked="filters.genres.includes(g)" @change="toggleGenre(g)"/>
          {{ g }}
         </label>
         <p v-if="!filteredGenres.length" class="px-2 py-1.5 text-sm text-gray-500">No matches</p>
        </div>
       </div>
      </div>

      <div class="relative c-1gx8udt" :ref="bindDropdown('year-d')">
       <div class="mb-1 text-lg font-semibold c-1gx8udt">Year</div>
       <button type="button" @click="toggleDropdown('year-d')" :class="['dropdown-button flex w-[210px] items-center justify-between rounded-[10px] py-2.5 pr-3 pl-3 text-sm font-medium text-gray-300 transition-all duration-200 focus:outline-none c-1gx8udt', filters.year ? 'border border-primary/50 bg-primary/5' : 'bg-zinc-900 hover:bg-zinc-800', ringIf('year-d'), selectedRing(filters.year)]">
        <span class="mr-0.5 line-clamp-1 c-1gx8udt">{{ yearLabel }}</span>
        <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'year-d' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
         <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
        </svg>
       </button>
       <div v-if="openDropdown === 'year-d'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
        <input v-model="yearSearch" type="text" inputmode="numeric" placeholder="Search year..." class="mb-2 w-full rounded-md border border-white/5 bg-black/40 px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-primary/50 focus:outline-none"/>
        <div class="grid max-h-60 grid-cols-2 gap-1 overflow-auto">
         <button v-for="y in filteredYears" :key="y" type="button" class="rounded px-2 py-1.5 text-left text-sm hover:bg-white/5" :class="filters.year === y ? 'text-primary' : 'text-gray-300'" @click="selectYear(y)">{{ y }}</button>
        </div>
        <p v-if="!filteredYears.length" class="px-2 py-1.5 text-sm text-gray-500">No matches</p>
       </div>
      </div>

      <div class="relative c-1gx8udt" :ref="bindDropdown('tags-d')">
       <div class="mb-1 text-lg font-semibold c-1gx8udt">Tags</div>
       <button type="button" @click="toggleDropdown('tags-d')" :class="['dropdown-button flex w-[210px] items-center justify-between rounded-[10px] py-2.5 pr-3 pl-3 text-sm font-medium text-gray-300 transition-all duration-200 focus:outline-none c-1gx8udt', filters.tags.length ? 'border border-primary/50 bg-primary/5' : 'bg-zinc-900 hover:bg-zinc-800', ringIf('tags-d'), selectedRing(filters.tags.length)]">
        <span class="mr-0.5 line-clamp-1 c-1gx8udt">{{ tagLabel }}</span>
        <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === 'tags-d' }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
         <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
        </svg>
       </button>
       <div v-if="openDropdown === 'tags-d'" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-2 shadow-xl">
        <input v-model="tagSearch" type="text" placeholder="Search tags..." class="mb-2 w-full rounded-md border border-white/5 bg-black/40 px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:border-primary/50 focus:outline-none"/>
        <div class="max-h-60 overflow-auto">
         <label v-for="t in filteredTags" :key="t" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5">
          <input type="checkbox" class="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 accent-primary" :checked="filters.tags.includes(t)" @change="toggleTag(t)"/>
          {{ t }}
         </label>
         <p v-if="!filteredTags.length" class="px-2 py-1.5 text-sm text-gray-500">No matches</p>
        </div>
       </div>
      </div>

      <!-- Character / Staff / Studio: not supported by /api/search yet -->
      <div v-for="field in ['Character', 'Staff', 'Studio']" :key="field" class="relative c-1gx8udt" :ref="bindDropdown(`${field.toLowerCase()}-d`)">
       <div class="mb-1 text-lg font-semibold c-1gx8udt">{{ field }}</div>
       <button type="button" :class="['dropdown-button flex w-[210px] items-center justify-between rounded-[10px] bg-zinc-900 py-2.5 pr-3 pl-3 text-sm font-medium text-gray-300 transition-all duration-200 focus:outline-none hover:bg-zinc-800 c-1gx8udt', ringIf(`${field.toLowerCase()}-d`)]" @click="toggleDropdown(`${field.toLowerCase()}-d`)">
        <span class="mr-0.5 line-clamp-1 c-1gx8udt">Any</span>
        <svg class="transition-transform duration-300 c-1gx8udt" :class="{ 'rotate-180': openDropdown === `${field.toLowerCase()}-d` }" height="1em" viewBox="0 0 1024 1024" width="1em" xmlns="http://www.w3.org/2000/svg">
         <path class="c-1gx8udt" d="M104.704 338.752a64 64 0 0 1 90.496 0l316.8 316.8l316.8-316.8a64 64 0 0 1 90.496 90.496L557.248 791.296a64 64 0 0 1-90.496 0L104.704 429.248a64 64 0 0 1 0-90.496" fill="currentColor"></path>
        </svg>
       </button>
       <div v-if="openDropdown === `${field.toLowerCase()}-d`" class="absolute z-30 mt-2 w-full rounded-lg border border-white/10 border-t-4 border-t-primary bg-[#141414] p-3 text-xs text-gray-500 shadow-xl">
        {{ field }} filtering isn't supported by /api/search yet — add a matching GraphQL arg + query param to enable it here.
       </div>
      </div>

      <button v-if="hasActiveFilters" aria-label="Reset filters" class="flex cursor-pointer items-end text-primary transition-colors duration-200 hover:text-primary/80 c-1gx8udt" @click="resetFilters">
       <svg class="mb-2 h-6 w-6 c-1gx8udt" fill="none" stroke="currentColor" stroke-width="1.9" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path class="c-1gx8udt" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" stroke-linecap="round" stroke-linejoin="round"></path>
       </svg>
      </button>
     </div>

     <!-- ===================== SIDEBAR + RESULTS ===================== -->
     <div class="mt-6 flex h-full w-full flex-row gap-6 px-4 c-1gx8udt">

      <!-- ---------- SIDEBAR (desktop only) ---------- -->
      <div class="hidden min-w-[220px] flex-col gap-4 lg:flex c-1gx8udt">

       <div class="sidebar-section rounded-xl border-l-4 border-l-primary bg-white/[0.03] px-4 py-2 text-primary-foreground backdrop-blur-sm transition-all duration-400 hover:bg-white/[0.06] c-1gx8udt" 
          :class="{ 'border border---primary-foreground bg-primary/5': filters.season }">
        <button type="button" :aria-expanded="sidebarOpen.season" class="flex w-full items-center text-white justify-between text-lg font-semibold transition-colors duration-200 focus:outline-none c-1gx8udt" @click="toggleSidebar('season')">
         Season
         <svg class="transition-transform duration-300 c-1gx8udt" :class="sidebarOpen.season ? '-rotate-90' : 'rotate-0'" fill="none" height="1em" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="1em"><path d="M15.5 19l-7-7 7-7"></path></svg>
        </button>
        <Transition @enter="onSidebarEnter" @after-enter="onSidebarAfterEnter" @leave="onSidebarLeave">
         <div v-if="sidebarOpen.season" class="overflow-hidden c-1gx8udt">
          <ul class="mb-1 space-y-2 pt-3 c-1gx8udt">
           <li v-for="s in SEASONS" :key="s.value" class="c-1gx8udt">
            <label class="group flex cursor-pointer items-center space-x-3 c-1gx8udt">
             <input class="custom-radio h-4 w-4 cursor-pointer border-zinc-700 bg-zinc-800 text-primary c-1gx8udt" type="radio" name="radio-season" :checked="filters.season === s.value" @change="selectSeason(s.value)"/>
             <span class="text-sm font-medium text-gray-300 transition-colors duration-150 group-hover:text-white c-1gx8udt">{{ s.label }}</span>
            </label>
           </li>
          </ul>
         </div>
        </Transition>
       </div>

       <div class="sidebar-section rounded-xl border-l-4 border-l-primary bg-white/[0.03] px-4 py-2 text-primary-foreground backdrop-blur-sm transition-all duration-400 hover:bg-white/[0.06] c-1gx8udt" 
          :class="{ 'border border---primary-foreground bg-primary/5': filters.format }">
        <button type="button" :aria-expanded="sidebarOpen.format" class="flex w-full items-center text-white justify-between text-lg font-semibold transition-colors duration-200 focus:outline-none c-1gx8udt" @click="toggleSidebar('format')">
         Format
         <svg class="transition-transform duration-300 c-1gx8udt" :class="sidebarOpen.format ? '-rotate-90' : 'rotate-0'" fill="none" height="1em" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="1em"><path d="M15.5 19l-7-7 7-7"></path></svg>
        </button>
        <Transition @enter="onSidebarEnter" @after-enter="onSidebarAfterEnter" @leave="onSidebarLeave">
         <div v-if="sidebarOpen.format" class="overflow-hidden c-1gx8udt">
          <ul class="mb-1 space-y-2 pt-3 c-1gx8udt">
           <li v-for="f in FORMATS" :key="f.value" class="c-1gx8udt">
            <label class="group flex cursor-pointer items-center space-x-3 c-1gx8udt">
             <input class="custom-radio h-4 w-4 cursor-pointer border-zinc-700 bg-zinc-800 text-primary c-1gx8udt" type="radio" name="radio-format" :checked="filters.format === f.value" @change="selectFormat(f.value)"/>
             <span class="text-sm font-medium text-gray-300 transition-colors duration-150 group-hover:text-white c-1gx8udt">{{ f.label }}</span>
            </label>
           </li>
          </ul>
         </div>
        </Transition>
       </div>

       <div class="sidebar-section rounded-xl border-l-4 border-l-primary bg-white/[0.03] px-4 py-2 text-primary-foreground backdrop-blur-sm transition-all duration-400 hover:bg-white/[0.06] c-1gx8udt" 
          :class="{ 'border border---primary-foreground bg-primary/5': filters.status }">
        <button type="button" :aria-expanded="sidebarOpen.status" class="flex w-full items-center text-white justify-between text-lg font-semibold transition-colors duration-200 focus:outline-none c-1gx8udt" @click="toggleSidebar('status')">
         Status
         <svg class="transition-transform duration-300 c-1gx8udt" :class="sidebarOpen.status ? '-rotate-90' : 'rotate-0'" fill="none" height="1em" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="1em"><path d="M15.5 19l-7-7 7-7"></path></svg>
        </button>
        <Transition @enter="onSidebarEnter" @after-enter="onSidebarAfterEnter" @leave="onSidebarLeave">
         <div v-if="sidebarOpen.status" class="overflow-hidden c-1gx8udt">
          <ul class="mb-1 space-y-2 pt-3 c-1gx8udt">
           <li v-for="s in STATUSES" :key="s.value" class="c-1gx8udt">
            <label class="group flex cursor-pointer items-center space-x-3 c-1gx8udt">
             <input class="custom-radio h-4 w-4 cursor-pointer border-zinc-700 bg-zinc-800 text-primary c-1gx8udt" type="radio" name="radio-status" :checked="filters.status === s.value" @change="selectStatus(s.value)"/>
             <span class="text-sm font-medium text-gray-300 transition-colors duration-150 group-hover:text-white c-1gx8udt">{{ s.label }}</span>
            </label>
           </li>
          </ul>
         </div>
        </Transition>
       </div>

       <div class="sidebar-section rounded-xl border-l-4 border-l-primary bg-white/[0.03] px-4 py-2 text-primary-foreground backdrop-blur-sm transition-all duration-400 hover:bg-white/[0.06] c-1gx8udt" 
          :class="{ 'border border---primary-foreground bg-primary/5': filters.origin }">
        <button type="button" :aria-expanded="sidebarOpen.origin" class="flex w-full items-center text-white justify-between text-lg font-semibold transition-colors duration-200 focus:outline-none c-1gx8udt" @click="toggleSidebar('origin')">
         Origin
         <svg class="transition-transform duration-300 c-1gx8udt" :class="sidebarOpen.origin ? '-rotate-90' : 'rotate-0'" fill="none" height="1em" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="1em"><path d="M15.5 19l-7-7 7-7"></path></svg>
        </button>
        <Transition @enter="onSidebarEnter" @after-enter="onSidebarAfterEnter" @leave="onSidebarLeave">
         <div v-if="sidebarOpen.origin" class="overflow-hidden c-1gx8udt">
          <ul class="mb-1 space-y-2 pt-3 c-1gx8udt">
           <li v-for="o in ORIGINS" :key="o.value" class="c-1gx8udt">
            <label class="group flex cursor-pointer items-center space-x-3 c-1gx8udt">
             <input class="custom-radio h-4 w-4 cursor-pointer border-zinc-700 bg-zinc-800 text-primary c-1gx8udt" type="radio" name="radio-origin" :checked="filters.origin === o.value" @change="selectOrigin(o.value)"/>
             <span class="text-sm font-medium text-gray-300 transition-colors duration-150 group-hover:text-white c-1gx8udt">{{ o.label }}</span>
            </label>
           </li>
          </ul>
         </div>
        </Transition>
       </div>

       <div class="sidebar-section rounded-xl border-l-4 border-l-primary bg-white/[0.03] px-4 py-2 text-primary-foreground backdrop-blur-sm transition-all duration-400 hover:bg-white/[0.06] c-1gx8udt" 
          :class="{ 'border border---primary-foreground bg-primary/5': filters.year }">
        <button type="button" :aria-expanded="sidebarOpen.sort" class="flex w-full items-center text-white justify-between text-lg font-semibold transition-colors duration-200 focus:outline-none c-1gx8udt" @click="toggleSidebar('sort')">
         Sort by
         <svg class="transition-transform duration-300 c-1gx8udt" :class="sidebarOpen.sort ? '-rotate-90' : 'rotate-0'" fill="none" height="1em" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="1em"><path d="M15.5 19l-7-7 7-7"></path></svg>
        </button>
        <Transition @enter="onSidebarEnter" @after-enter="onSidebarAfterEnter" @leave="onSidebarLeave">
         <div v-if="sidebarOpen.sort" class="overflow-hidden c-1gx8udt">
          <ul class="mb-1 space-y-2 pt-3 c-1gx8udt">
           <li v-for="s in SORTS" :key="s.value" class="c-1gx8udt">
            <label class="group flex cursor-pointer items-center space-x-3 c-1gx8udt">
             <input class="custom-radio h-4 w-4 cursor-pointer border-zinc-700 bg-zinc-800 text-primary c-1gx8udt" type="radio" name="radio-sort" :checked="filters.sort === s.value" @change="selectSort(s.value)"/>
             <span class="text-sm font-medium text-gray-300 transition-colors duration-150 group-hover:text-white c-1gx8udt">{{ s.label }}</span>
            </label>
           </li>
          </ul>
         </div>
        </Transition>
       </div>

      </div>

      <!-- ---------- RESULTS ---------- -->
      <div class="mb-5 h-full w-full c-1gx8udt">
       <div class="flex h-full w-full flex-col c-1gx8udt">

        <!-- Chips -->
        <div v-if="chips.length" class="mb-3 flex flex-wrap gap-2 c-1gx8udt">
         <button v-for="chip in chips" :key="chip.key" type="button" :class="['chip c-1gx8udt', chip.sort ? 'chip-sort' : '']" @click="chip.clear">
          {{ chip.label }} ×
         </button>
        </div>

        <!-- Result count -->
        <div class="mb-4 text-sm text-gray-400 c-1gx8udt">
         <template v-if="loading">Searching…</template>
         <template v-else><span class="tabular-nums c-1gx8udt">{{ displayedTotal }}</span> results found</template>
        </div>

        <!-- Error state -->
        <div v-if="errorMsg" class="mb-4 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
         <span>{{ errorMsg }}</span>
         <button type="button" class="rounded bg-red-500/10 px-3 py-1 text-xs font-medium hover:bg-red-500/20" @click="applyFiltersNow">Retry</button>
        </div>

        <!-- Loading skeleton (shown for every search, not just the first) -->
        <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(165px,1fr))] c-1gx8udt">
         <div v-for="n in 36" :key="n" class="mb-6 animate-pulse c-1gx8udt">
          <div class="mb-3 aspect-[3/4] w-full rounded-lg bg-zinc-900"></div>
          <div class="h-3 w-4/5 rounded bg-zinc-900"></div>
         </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!results.length"  class="flex flex-1 flex-col justify-center py-20 items-center text-center c-1gx8udt">
          <div class="relative mb-8 h-20 w-20 c-1gx8udt">
            <div class="absolute inset-0 rounded-xl bg-zinc-900 c-1gx8udt"></div>
            <div class="absolute inset-0 flex items-center justify-center c-1gx8udt">
              <svg class="h-8 w-8 text-primary c-1gx8udt" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" class="c-1gx8udt"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65" class="c-1gx8udt"></line>
              </svg>
            </div>
          </div>
          <h3 class="mb-2 text-xl font-semibold text-white/90 c-1gx8udt">No Results Found</h3>
          <p class="mb-6 max-w-[280px] text-sm text-gray-400 c-1gx8udt">We couldn't find any anime that matches your current filters.</p>
          <button type="button" class="flex items-center rounded-xl bg-zinc-900 px-4 py-2 text-sm text-gray-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white c-1gx8udt" @click="resetFilters">
            <svg class="mr-2 h-4 w-4 c-1gx8udt" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5" class="c-1gx8udt"></path>
              <path d="M12 19l-7-7 7-7" class="c-1gx8udt"></path>
            </svg>
            Reset Filters
          </button>
        </div>



        <!-- Grid -->
        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(165px,1fr))] c-1gx8udt">
         <div v-for="anime in results" :key="anime.id" class="mb-6 c-1gx8udt">
          <MediaCard 
            :media="anime" 
            :is-flipped="flippedId === anime.id" 
            @toggle-flip="toggleFlip" 
          />
         </div>
        </div>

        <!-- Pagination -->
        <div v-if="!loading && results.length && totalPages > 1" class="mt-2 flex justify-center pb-8">
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
  </main>
 </body>
</template>

<style scoped>
/* Marquee scroll for anime titles that overflow their box on card hover.
   .anime-title (native ellipsis truncation) and .anime-title-marquee (the
   scrolling overlay) sit stacked in the same spot; JS just fades between
   them. --marquee-distance is set inline (in px) by startTitleMarquee() to
   the exact overflow amount, so the scroll distance always matches the text. */
.anime-title,
.anime-title-marquee {
  transition: opacity 150ms ease;
}

.anime-title-text {
  display: inline-block;
}

.anime-title-text.title-marquee {
  animation: title-marquee-scroll 4s ease-in-out infinite;
}

@keyframes title-marquee-scroll {
  0%, 10% { transform: translateX(0); }               /* hold at the start */
  40%, 52% { transform: translateX(calc(-1 * var(--marquee-distance, 0px))); } /* hold at the end (~0.5s) */
  85%, 100% { transform: translateX(0); }              /* back at the start, brief hold before looping */
}
</style>