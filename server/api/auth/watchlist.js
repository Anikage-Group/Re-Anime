export default cachedEventHandler(async (event) => {
  const token = getCookie(event, 'anilist_token')

  if (!token) {
    return { entries: [] }
  }

  // Single GraphQL query: Passing token automatically fetches the authenticated user's list
  const listQuery = `
    query {
      MediaListCollection(type: ANIME) {
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
            startedAt { year month day }
            completedAt { year month day }
            media {
              id
              title {
                english
                romaji
                userPreferred
              }
              coverImage {
                large
                extraLarge
              }
              bannerImage
              format
              status
              episodes
              genres
              meanScore
              seasonYear
              season
              nextAiringEpisode {
                airingAt
                episode
              }
            }
          }
        }
      }
    }
  `

  // Helper with exponential backoff retry for HTTP 429 rate limits
  async function fetchAniList(retries = 2) {
    try {
      return await $fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: { query: listQuery }
      })
    } catch (err) {
      if (err?.status === 429 && retries > 0) {
        const retryAfter = (err.response?.headers?.get('Retry-After') || 2) * 1000
        await new Promise((res) => setTimeout(res, retryAfter))
        return fetchAniList(retries - 1)
      }
      throw err
    }
  }

  try {
    const listRes = await fetchAniList()
    const lists = listRes?.data?.MediaListCollection?.lists || []

    // Flatten and normalize all entries
    const entries = []
    for (const list of lists) {
      for (const entry of list.entries || []) {
        const media = entry.media
        entries.push({
          id: media.id,
          listEntryId: entry.id,
          title: media.title?.english || media.title?.userPreferred || media.title?.romaji || 'Untitled',
          cover: media.coverImage?.large || media.coverImage?.extraLarge || '',
          bannerImage: media.bannerImage || '',
          format: media.format || 'TV',
          mediaStatus: media.status || 'UNKNOWN',
          episodes: media.episodes || null,
          genres: media.genres || [],
          meanScore: media.meanScore || 0,
          seasonYear: media.seasonYear || null,
          season: media.season || null,
          // User's list data
          listStatus: entry.status,
          score: entry.score || 0,
          progress: entry.progress || 0,
          updatedAt: entry.updatedAt || 0,
          nextAiringEpisode: media.nextAiringEpisode || null
        })
      }
    }

    return { entries }
  } catch (error) {
    if (error?.statusCode) throw error
    console.error('Failed to fetch watchlist:', error?.data || error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch watchlist' })
  }
}, {
  // Caches response for 60 seconds per user token to reduce external API overhead
  maxAge: 160,
  swr: true,
  getKey: (event) => getCookie(event, 'anilist_token') || 'guest'
})