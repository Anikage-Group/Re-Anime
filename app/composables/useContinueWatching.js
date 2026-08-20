import { ref, onMounted, watch } from 'vue'
import { useCookie } from '#app'

/**
 * useContinueWatching composable
 * Manages the "Continue Watching" slots.
 * - For unauthenticated users: up to 4 slots.
 * - For authenticated (Anilist) users: unlimited slots (fetched from Anilist watching list).
 * Timestamps (progress) are persisted in localStorage under a namespaced key.
 */
export const useContinueWatching = () => {
  const MAX_GUEST_SLOTS = 4
  const STORAGE_KEY = 'continue_watching_slots'
  const tokenCookie = useCookie('anilist_token')
  const isAuthenticated = !!tokenCookie?.value

  const slots = ref([]) // each slot: { mediaId, progress, updatedAt }

  const loadLocal = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) slots.value = JSON.parse(raw)
    } catch {}
  }

  const saveLocal = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slots.value))
    } catch {}
  }

  const init = async () => {
    if (isAuthenticated) {
      const { useAniListClient } = await import('@/composables/useAniListClient')
      const client = useAniListClient()
      const list = await client.fetchWatchlist()
      // filter entries with status "CURRENT" (watching)
      slots.value = list.filter(e => e.listStatus === 'CURRENT')
    } else {
      loadLocal()
    }
  }

  const addOrUpdate = (mediaId, progress) => {
    const existing = slots.value.find(s => s.mediaId === mediaId)
    if (existing) {
      existing.progress = progress
      existing.updatedAt = Date.now()
    } else {
      slots.value.push({ mediaId, progress, updatedAt: Date.now() })
    }
    // enforce guest limit
    if (!isAuthenticated && slots.value.length > MAX_GUEST_SLOTS) {
      slots.value = slots.value.slice(-MAX_GUEST_SLOTS) // keep newest
    }
    saveLocal()
  }

  const remove = (mediaId) => {
    slots.value = slots.value.filter(s => s.mediaId !== mediaId)
    saveLocal()
  }

  // keep local storage in sync when slots change (guest only)
  watch(slots, () => {
    if (!isAuthenticated) saveLocal()
  })

  onMounted(init)

  return { slots, addOrUpdate, remove, isAuthenticated }
}
