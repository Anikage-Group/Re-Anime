// server/api/watch/[id].js
// GET /api/watch/:id  ->  { source, tvdbId, malId, episodes: [...] }
//
// Primary source: TVDB, reached via AniZip (api.ani.zip), which maps
// AniList ids to TheTVDB series/episodes. This gives episode titles,
// air dates and thumbnails while still keying off the AniList id used
// everywhere else in the app.
//
// Fallback: Jikan (unofficial MyAnimeList API), used whenever AniZip
// has no mapping or the request fails. Jikan doesn't accept AniList
// ids, so we resolve a MAL id by title search first. Jikan's episode
// list conveniently includes `filler`/`recap` flags (scraped from
// MAL's own episode page), but it rarely has thumbnails.
//
// Even on the TVDB happy path, filler/recap flags are merged in from
// Jikan (best-effort, matched by episode number) since TVDB has no
// concept of filler episodes at all.

const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes
const cache = new Map() // anilistId -> { expires, data }

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing anime id' })
  }

  const cached = cache.get(id)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  let result = null

  try {
    result = await fetchFromTvdbViaAniZip(id)
  } catch (err) {
    result = null
  }

  if (result && result.episodes.length) {
    // Best-effort filler/recap merge — never let this fail the request.
    try {
      if (result.malId) {
        const fillerMap = await fetchJikanFillerMap(result.malId)
        result.episodes = result.episodes.map((ep) => {
          const flags = fillerMap.get(ep.number)
          return {
            ...ep,
            filler: flags?.filler ?? false,
            recap: flags?.recap ?? false
          }
        })
      }
    } catch (err) {
      // Ignore — episodes still have names/dates/thumbnails from TVDB.
    }
  } else {
    try {
      result = await fetchFromJikanFallback(id)
    } catch (err) {
      result = null
    }
  }

  if (!result || !result.episodes.length) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Unable to fetch episode data from TVDB or Jikan'
    })
  }

  cache.set(id, { expires: Date.now() + CACHE_TTL_MS, data: result })
  return result
})

/**
 * AniZip maps an AniList id to TheTVDB's series/episode records, so this
 * is effectively "TVDB episode data, keyed by AniList id".
 * https://api.ani.zip/mappings?anilist_id=21
 */
async function fetchFromTvdbViaAniZip(anilistId) {
  const data = await $fetch('https://api.ani.zip/mappings', {
    query: { anilist_id: anilistId }
  })

  const episodeEntries = Object.values(data?.episodes || {})
  if (!episodeEntries.length) return null

  const episodes = episodeEntries
    .map((ep) => {
      const number = Number(ep.episodeNumber ?? ep.episode)
      return {
        number,
        title:
          ep.title?.en ||
          ep.title?.['x-jat'] ||
          (Number.isFinite(number) ? `Episode ${number}` : 'Episode'),
        airDate: ep.airDate || ep.airDateUtc || null,
        thumbnail: ep.image || null,
        overview: ep.overview || null,
        filler: false,
        recap: false
      }
    })
    .filter((ep) => Number.isFinite(ep.number))
    .sort((a, b) => a.number - b.number)

  if (!episodes.length) return null

  return {
    source: 'tvdb',
    tvdbId: data?.mappings?.thetvdb_id ?? null,
    malId: data?.mappings?.mal_id ?? null,
    episodes
  }
}

/**
 * Fallback path: resolve a MAL id by searching Jikan for the anime's
 * title (fetched from AniList), then pull its full episode list.
 */
async function fetchFromJikanFallback(anilistId) {
  const anilistResponse = await $fetch('https://graphql.anilist.co', {
    method: 'POST',
    body: {
      query: `query ($id: Int) { Media(id: $id) { title { romaji english } } }`,
      variables: { id: Number(anilistId) }
    }
  }).catch(() => null)

  const title =
    anilistResponse?.data?.Media?.title?.english ||
    anilistResponse?.data?.Media?.title?.romaji

  if (!title) return null

  const search = await $fetch('https://api.jikan.moe/v4/anime', {
    query: { q: title, limit: 1 }
  }).catch(() => null)

  const malId = search?.data?.[0]?.mal_id
  if (!malId) return null

  const jikanEpisodes = await fetchAllJikanEpisodes(malId)
  if (!jikanEpisodes.length) return null

  return {
    source: 'jikan',
    tvdbId: null,
    malId,
    episodes: jikanEpisodes.map((ep) => ({
      number: ep.mal_id,
      title: ep.title || `Episode ${ep.mal_id}`,
      airDate: ep.aired || null,
      // Jikan's episode list rarely includes thumbnails.
      thumbnail: null,
      overview: null,
      filler: !!ep.filler,
      recap: !!ep.recap
    }))
  }
}

async function fetchJikanFillerMap(malId) {
  const episodes = await fetchAllJikanEpisodes(malId)
  const map = new Map()
  for (const ep of episodes) {
    map.set(ep.mal_id, { filler: !!ep.filler, recap: !!ep.recap })
  }
  return map
}

async function fetchAllJikanEpisodes(malId) {
  const all = []
  let page = 1
  let hasNext = true

  // Jikan paginates ~100 episodes per page; capped defensively.
  while (hasNext && page <= 20) {
    const res = await $fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes`, {
      query: { page }
    })
    all.push(...(res?.data || []))
    hasNext = !!res?.pagination?.has_next_page
    page += 1
  }

  return all
}