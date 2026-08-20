import { useCookie } from '#app'

/**
 * useAniListClient composable
 * Provides wrapper functions for Anilist GraphQL API with built‑in rate‑limit handling and
 * automatic token retrieval from the secure `anilist_token` cookie.
 * All requests are performed client‑side (for UI) or server‑side via `$fetch` with the same logic.
 */
export const useAniListClient = () => {
  const token = useCookie('anilist_token')

  // Helper: generic GraphQL request with exponential backoff on 429
  const gqlRequest = async (query, variables = {}, retries = 2) => {
    try {
      return await $fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: token?.value ? `Bearer ${token.value}` : undefined,
        },
        body: { query, variables },
      })
    } catch (err) {
      // If rate limited, retry after the suggested wait time
      if (err?.status === 429 && retries > 0) {
        const retryAfter = (Number(err?.response?.headers?.get('Retry-After')) || 2) * 1000
        await new Promise((res) => setTimeout(res, retryAfter))
        return gqlRequest(query, variables, retries - 1)
      }
      throw err
    }
  }

  const fetchUser = async () => {
    const query = `query { Viewer { id name avatar { large } mediaListOptions { scoreFormat } } }`
    const res = await gqlRequest(query)
    return res?.data?.Viewer
  }

  const fetchWatchlist = async () => {
    // AniList requires userId or userName on MediaListCollection
    // Fetch viewer first, then query their list
    const viewerRes = await gqlRequest(`query { Viewer { id } }`)
    const userId = viewerRes?.data?.Viewer?.id
    if (!userId) throw new Error('Not authenticated')

    const query = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            name
            status
            entries {
              id
              mediaId
              status
              score
              progress
              updatedAt
              media {
                id
                title { english userPreferred romaji }
                coverImage { large }
              }
            }
          }
        }
      }
    `
    const res = await gqlRequest(query, { userId })
    const lists = res?.data?.MediaListCollection?.lists || []
    const entries = []
    for (const list of lists) {
      for (const entry of list.entries || []) {
        const media = entry.media
        entries.push({
          id: media.id,
          listEntryId: entry.id,
          title: media.title?.english || media.title?.userPreferred || media.title?.romaji || 'Untitled',
          cover: media.coverImage?.large || '',
          listStatus: entry.status,
          score: entry.score || 0,
          progress: entry.progress || 0,
          updatedAt: entry.updatedAt || 0,
        })
      }
    }
    return entries
  }


  const updateProgress = async (listEntryId, progress) => {
    const mutation = `mutation ($listEntryId: Int, $progress: Int) { SaveMediaListEntry (id: $listEntryId, progress: $progress) { id progress } }`
    const variables = { listEntryId, progress }
    const res = await gqlRequest(mutation, variables)
    return res?.data?.SaveMediaListEntry
  }

  // Map UI status names to AniList MediaListStatus enum values
  const toAniListStatus = (status) => {
    const map = {
      'watching': 'CURRENT',
      'reading': 'CURRENT',
      'planning': 'PLANNING',
      'completed': 'COMPLETED',
      'paused': 'PAUSED',
      'dropped': 'DROPPED',
    }
    return map[String(status).toLowerCase()] || String(status).toUpperCase()
  }

  const addToList = async (mediaId, status = 'PLANNING') => {
    const mutation = `mutation ($mediaId: Int, $status: MediaListStatus) { SaveMediaListEntry (mediaId: $mediaId, status: $status) { id } }`
    const variables = { mediaId, status }
    const res = await gqlRequest(mutation, { mediaId, status: toAniListStatus(status) })
    return res?.data?.SaveMediaListEntry?.id
  }

  const removeFromList = async (listEntryId) => {
    const mutation = `mutation ($listEntryId: Int) { DeleteMediaListEntry (id: $listEntryId) { deleted } }`
    const variables = { listEntryId }
    await gqlRequest(mutation, variables)
    return true
  }

  const syncProgressPercent = async (listEntryId, percent) => {
    // Directly set progress to the supplied percent (episode count)
    return updateProgress(listEntryId, percent)
  }

  // Saves/updates the viewer's score for a media entry. `status` is optional —
  // pass it only when creating a brand-new list entry (no prior status), since
  // omitting it on an update leaves the existing status untouched.
  const saveScore = async (mediaId, score, status) => {
    const mutation = `
      mutation ($mediaId: Int, $score: Float, $status: MediaListStatus) {
        SaveMediaListEntry (mediaId: $mediaId, score: $score, status: $status) {
          id
          score
          status
        }
      }
    `
    const variables = { mediaId, score, ...(status ? { status } : {}) }
    const res = await gqlRequest(mutation, variables)
    return res?.data?.SaveMediaListEntry
  }

  // Looks up the viewer's existing list entry (score/status) for a single
  // media item. Returns null if the viewer isn't authenticated or has no
  // entry yet for this media (AniList returns a GraphQL "Not Found" error
  // in that case, which we treat as "no rating yet" rather than a failure).
  const fetchMediaListEntry = async (mediaId) => {
    const viewerRes = await gqlRequest(`query { Viewer { id } }`)
    const userId = viewerRes?.data?.Viewer?.id
    if (!userId) return null

    const query = `
      query ($mediaId: Int, $userId: Int) {
        MediaList(mediaId: $mediaId, userId: $userId) {
          id
          score
          status
        }
      }
    `
    try {
      const res = await gqlRequest(query, { mediaId, userId })
      return res?.data?.MediaList || null
    } catch (err) {
      // No entry for this media yet — not a real error.
      return null
    }
  }

  const fetchNotifications = async () => {
    const query = `
      query {
        Page(page: 1, perPage: 15) {
          notifications(resetNotificationCount: true) {
            ... on AiringNotification {
              id
              type
              contexts
              episode
              createdAt
              anime { id title { userPreferred } coverImage { large } }
            }
            ... on RelatedMediaAdditionNotification {
              id
              type
              context
              createdAt
              media { id title { userPreferred } coverImage { large } }
            }
            ... on FollowingNotification {
              id
              type
              context
              createdAt
              user { id name avatar { large } }
            }
          }
        }
      }
    `
    const res = await gqlRequest(query)
    const raw = res?.data?.Page?.notifications || []
    
    return raw.map(n => {
      let title = ''
      let image = ''
      let url = '#'

      if (n.type === 'AIRING') {
        title = n.contexts[0] + n.episode + n.contexts[1] + n.anime.title.userPreferred + n.contexts[2]
        image = n.anime.coverImage?.large
        url = `/anime/${n.anime.id}/${n.episode}`
      } else if (n.type === 'RELATED_MEDIA_ADDITION') {
        title = n.media.title.userPreferred + ' ' + n.context
        image = n.media.coverImage?.large
        url = `/anime/${n.media.id}`
      } else if (n.type === 'FOLLOWING') {
        title = n.user.name + ' ' + n.context
        image = n.user.avatar?.large
        url = '#'
      }
      
      return {
        id: n.id,
        title,
        image,
        url,
        createdAt: n.createdAt
      }
    }).filter(n => n.title) // filter out unsupported types
  }

  return { fetchUser, fetchWatchlist, updateProgress, addToList, removeFromList, syncProgressPercent, fetchNotifications,
    saveScore, fetchMediaListEntry, setStatus: updateProgress }
}