import { useAuth } from '~/composables/useAuth'
import { useAniListClient } from '~/composables/useAniListClient'

export function useProgressSync() {
  const LOCAL_STORAGE_KEY = 'anikage:local-progress'
  const PREFS_KEY = 'anikage:player-prefs'

  const getLocalData = () => {
    if (typeof window === 'undefined') return {}
    try {
      const data = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  const setLocalData = (data) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  }

  const getSyncThreshold = () => {
    if (typeof window === 'undefined') return 80
    try {
      const prefs = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}')
      return typeof prefs.syncThreshold === 'number' ? prefs.syncThreshold : 80
    } catch {
      return 80
    }
  }

  /**
   * @param {Object} params
   * @param {string} params.type 'anime' | 'manga'
   * @param {number|string} params.id Media ID
   * @param {number} params.progress Episode or Chapter number
   * @param {number} params.time Elapsed time in seconds (optional)
   * @param {number} params.duration Total duration in seconds (optional) — used for threshold check
   * @param {string} params.status 'Watching', 'Planning', 'Completed', etc. (optional)
   * @param {Object} params.extraData Metadata like title, image, total episodes
   */
  const saveProgress = async ({ type, id, progress, currentEpisode, time, duration, status, extraData = {} }) => {
    if (!id) return

    const { loggedIn } = useAuth()
    const stringId = type === 'manga' ? `manga:${id}` : String(id)

    // 1. Update Local Cache
    const currentData = getLocalData()
    const existing = currentData[stringId] || {}

    // Never let "progress" go backwards (e.g. don't overwrite ep3 with ep2)
    const currentProgress = existing.progress ?? 0
    const newProgress = progress ?? currentProgress
    const finalProgress = newProgress > currentProgress ? newProgress : currentProgress

    currentData[stringId] = {
      ...existing,
      id: isNaN(id) ? id : Number(id),
      type,
      manga: type === 'manga',
      progress: finalProgress,
      ch: type === 'manga' ? (currentEpisode ?? finalProgress) : existing.ch,
      pgno: type === 'manga' ? (extraData.pgno ?? existing.pgno ?? 1) : existing.pgno,
      currentEpisode: currentEpisode ?? existing.currentEpisode ?? finalProgress + 1,
      time: time ?? existing.time,
      status: status ?? existing.status,
      updatedAt: Date.now(),
      extraData: { ...existing.extraData, ...extraData }
    }
    setLocalData(currentData)

    // 2. Sync to AniList if Anime and logged in
    if (type === 'anime' && loggedIn.value) {
      // Only sync to AniList if threshold is met OR if status is being explicitly set
      const threshold = getSyncThreshold()
      let shouldSync = !!status // always sync if a status is being explicitly set (e.g. from watchlist dropdown)
      // When threshold is met, report the episode the user is currently watching.
      // (finalProgress is activeEpisode-1 for mid-episode saves, so prefer currentEpisode)
      const anilistProgress = currentEpisode ?? finalProgress

      if (!shouldSync && duration && time) {
        const watchedPercent = (time / duration) * 100
        shouldSync = watchedPercent >= threshold

        if (shouldSync && typeof window !== 'undefined') {
          // Dedup: don't re-hit AniList if we already synced this episode this session
          const dedupKey = `anikage:synced-ep:${id}`
          const alreadySynced = window.sessionStorage?.getItem(dedupKey)
          if (alreadySynced === String(anilistProgress)) {
            shouldSync = false
          } else {
            window.sessionStorage?.setItem(dedupKey, String(anilistProgress))
          }
        }
      } else if (!shouldSync && !duration) {
        // No duration known yet — only sync if this is an episode completion (progress advanced)
        shouldSync = anilistProgress > currentProgress
      }

      if (shouldSync && id && !isNaN(Number(id))) {
        try {
          await useAniListClient().saveProgress({ mediaId: Number(id), progress: anilistProgress, status })
        } catch (err) {
          console.error('Failed to sync progress to AniList:', err)
        }
      }
    }
  }

  const pauseProgress = async ({ type, id }) => {
    if (!id) return

    const { loggedIn } = useAuth()
    const stringId = type === 'manga' ? `manga:${id}` : String(id)

    // 1. Update local status to Paused
    const currentData = getLocalData()
    if (currentData[stringId]) {
      currentData[stringId].status = 'Paused'
      currentData[stringId].updatedAt = Date.now()
      setLocalData(currentData)
    }

    // 2. Sync Paused to AniList if logged in
    if (type === 'anime' && loggedIn.value && id && !isNaN(Number(id))) {
      try {
        await useAniListClient().setStatus({ mediaId: Number(id), status: 'Paused' })
      } catch (err) {
        console.error('Failed to pause on AniList:', err)
      }
    }
  }

  const removeProgress = async ({ type, id }) => {
    if (!id) return

    const { loggedIn } = useAuth()
    const stringId = type === 'manga' ? `manga:${id}` : String(id)

    // 1. Remove from Local Cache
    const currentData = getLocalData()
    if (currentData[stringId]) {
      delete currentData[stringId]
      setLocalData(currentData)
    }

    // 2. Remove from AniList if Anime and logged in
    if (type === 'anime' && loggedIn.value && id && !isNaN(Number(id))) {
      try {
        await useAniListClient().deleteProgress({ mediaId: Number(id) })
      } catch (err) {
        console.error('Failed to delete progress from AniList:', err)
      }
    }
  }

  return {
    getLocalData,
    saveProgress,
    pauseProgress,
    removeProgress
  }
}
