// Normalise a raw media object from AniList into the shape expected by UI components.
const hydrateMedia = (media) => {
  if (!media) return {}
  const title = media.title?.english || media.title?.userPreferred || media.title?.romaji || 'Untitled'
  const cover = media.coverImage?.large || media.coverImage?.extraLarge || ''
  return {
    id: media.id,
    href: `/anime/${media.id}`,
    title,
    cover,
    ageRating: media.ageRating || '',
    format: media.format || '',
    totalEpisodes: media.episodes,
    nextAiringEpisode: media.nextAiringEpisode,
    status: media.status,
    // Preserve any additional fields for flexibility
    ...media,
  }
}

// Convert AniList enum → UI status name (e.g. CURRENT → watching)
const fromAniListStatus = (s) => {
  if (!s) return null
  const map = {
    'CURRENT': 'watching',
    'PLANNING': 'planning',
    'COMPLETED': 'completed',
    'PAUSED': 'paused',
    'DROPPED': 'dropped',
  }
  return map[String(s).toUpperCase()] || String(s).toLowerCase()
}

/**
 * Centralised watchlist store.
 * All data is fetched from and persisted to AniList – no local storage.
 * UI components (media cards, watchlist page, continue-watching page) share this store.
 */
export const useWatchlist = () => {
  const { loggedIn, showAuthModal } = useAuth()
  const entries = useState('watchlist_entries', () => ({}))
  const isUpdating = ref(false)
  const error = ref(null)

  /** Open auth modal (for components that need sign-in) */
  const signInAnilist = () => {
    showAuthModal.value = true
  }

  /** Fetch remote watchlist and populate the store */
  const hydrateRemote = async () => {
    if (!loggedIn.value) {
      entries.value = {}
      return entries.value
    }
    try {
      const remoteEntries = await useAniListClient().fetchWatchlist()
      const map = {}
      remoteEntries.forEach(item => {
        map[String(item.id)] = {
          id: item.id,
          listEntryId: item.listEntryId,
          title: item.title,
          cover: item.cover,
          status: fromAniListStatus(item.listStatus),
          watchlistStatus: fromAniListStatus(item.listStatus),
          score: item.score,
          progress: item.progress,
          updatedAt: item.updatedAt,
        }
      })
      entries.value = map
    } catch (e) {
      console.warn('[watchlist] fetch error', e)
      error.value = e.message || 'Failed to load watchlist'
    }
    return entries.value
  }

  /** Get the UI status name for a given media object or id */
  const statusFor = (mediaOrId) => {
    const id = typeof mediaOrId === 'object' ? mediaOrId.id : mediaOrId
    return entries.value[String(id)]?.watchlistStatus || null
  }

  /** Update watchlist status (add, change, or remove). */
  const setWatchlistStatus = async (media, status) => {
    if (!media) return
    const key = String(media.id)
    const previous = entries.value[key]
    // Keep as UI name (watching/planning/etc.) for local state
    const nextStatus = status ? String(status).toLowerCase() : null

    // Optimistic UI update
    if (nextStatus) {
      entries.value = { ...entries.value, [key]: { ...previous, ...media, watchlistStatus: nextStatus, status: nextStatus } }
    } else if (previous) {
      const { [key]: _, ...rest } = entries.value
      entries.value = rest
    }

    // If not logged in, stop – UI reflects optimistic change only
    if (!loggedIn.value) return

    isUpdating.value = true
    error.value = null
    try {
      if (nextStatus) {
        // addToList handles the UI→AniList mapping internally
        const newEntryId = await useAniListClient().addToList(media.id, nextStatus)
        if (newEntryId) {
          entries.value = {
            ...entries.value,
            [key]: { ...entries.value[key], listEntryId: newEntryId }
          }
        }
      } else if (previous) {
        await useAniListClient().removeFromList(previous.listEntryId)
      }
    } catch (e) {
      // Rollback on failure
      if (previous) {
        entries.value = { ...entries.value, [key]: previous }
      } else {
        const { [key]: _, ...rest } = entries.value
        entries.value = rest
      }
      error.value = e.message || 'Failed to update watchlist'
      throw e
    } finally {
      isUpdating.value = false
    }
  }

  const removeFromWatchlist = async (media) => {
    await setWatchlistStatus(media, null)
  }

  return {
    entries, // raw useState ref — components read entries.value[id] reactively
    isUpdating,
    error,
    statusFor,
    hydrateRemote,
    setWatchlistStatus,
    removeFromWatchlist,
    hydrateMedia,
    signInAnilist,
  }
}
