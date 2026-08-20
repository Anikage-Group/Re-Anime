export default cachedEventHandler(async (event) => {
  const token = getCookie(event, 'anilist_token')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  // Combined GraphQL Query: Gets the authenticated user's current list directly in ONE request
  const query = `
    query {
      Viewer {
        id
        mediaListOptions {
          scoreFormat
        }
      }
      MediaListCollection(status: CURRENT, type: ANIME) {
        lists {
          entries {
            id
            mediaId
            progress
            updatedAt
            score
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
              duration
              genres
              meanScore
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

  // Helper function with exponential backoff on HTTP 429
  async function fetchAniList(retries = 2) {
    try {
      return await $fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: { query }
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

    const entries = []
    for (const list of lists) {
      for (const entry of list.entries || []) {
        const media = entry.media
        const totalEps = media.episodes || '?'
        const epDuration = media.duration || 24

        entries.push({
          id: media.id,
          title: media.title?.english || media.title?.userPreferred || media.title?.romaji || 'Untitled',
          cover: media.coverImage?.extraLarge || media.coverImage?.large || '',
          bannerImage: media.bannerImage || '',
          format: media.format || 'TV',
          mediaStatus: media.status || 'UNKNOWN',
          episodes: media.episodes || null,
          duration: epDuration ? `${epDuration}m` : '?',
          genres: media.genres || [],
          meanScore: media.meanScore || 0,
          progress: entry.progress || 0,
          totalEpisodes: totalEps,
          score: entry.score || 0,
          updatedAt: entry.updatedAt || 0,
          nextAiringEpisode: media.nextAiringEpisode || null
        })
      }
    }

    entries.sort((a, b) => b.updatedAt - a.updatedAt)

    return { entries }
  } catch (error) {
    if (error?.statusCode) throw error
    console.error('Failed to fetch continue watching:', error?.data || error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch continue watching list' })
  }
}, {
  // Caches response for 60 seconds per user token to avoid redundant external calls
  maxAge: 160,
  swr: true,
  getKey: (event) => getCookie(event, 'anilist_token') || 'guest'
})