import queryAniList from '#server/utils/anilist'

export default defineCachedEventHandler(async (event) => {
  const urlParams = getQuery(event)

  const searchQuery = urlParams.q ? String(urlParams.q).trim() : null

  // CHANGED: genre is now split into an array for genre_in
  const genreFilter = urlParams.genre
    ? String(urlParams.genre).split(',').map(g => g.trim()).filter(Boolean)
    : null

  const seasonFilter = urlParams.season ? String(urlParams.season).toUpperCase().trim() : null
  const formatFilter = urlParams.format ? String(urlParams.format).toUpperCase().trim() : null
  const statusFilter = urlParams.status ? String(urlParams.status).toUpperCase().trim() : null
  const countryFilter = urlParams.country ? String(urlParams.country).toUpperCase().trim() : null
  const yearFilter = urlParams.year ? parseInt(urlParams.year, 10) : null
  const tagFilter = urlParams.tag ? String(urlParams.tag).trim() : null

  const limit = urlParams.limit ? parseInt(urlParams.limit, 10) : 36
  const offset = urlParams.offset ? parseInt(urlParams.offset, 10) : 0
  const pageNum = Math.floor(offset / limit) + 1

  // CHANGED: sort now actually reads from the query string, supports comma-separated multi-sort
  const sortParam = urlParams.sort
    ? String(urlParams.sort).split(',').map(s => s.trim().toUpperCase())
    : null
  const sortOption = sortParam || (searchQuery ? ['SEARCH_MATCH', 'POPULARITY_DESC'] : ['POPULARITY_DESC'])

  const graphQLQuery = `
    query ( 
      $page: Int, 
      $perPage: Int, 
      $search: String, 
      $genre_in: [String],
      $season: MediaSeason,
      $format: MediaFormat,
      $status: MediaStatus,
      $country: CountryCode,
      $year: Int,
      $tag: String,
      $sort: [MediaSort]
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
        }
        media(
          type: ANIME,
          search: $search, 
          genre_in: $genre_in,
          season: $season,
          format: $format,
          status: $status,
          countryOfOrigin: $country,
          seasonYear: $year,
          tag: $tag,
          sort: $sort
        ) {
          id
          title {
            english
            romaji
          }
          coverImage {
            large
          }
          format
          status
          seasonYear
          averageScore
        }
      }
    }
  `

  const rawVariables = {
    page: pageNum,
    perPage: limit,
    sort: sortOption,
    search: searchQuery,
    genre_in: genreFilter, // CHANGED: was `genre: genreFilter`
    season: seasonFilter,
    format: formatFilter,
    status: statusFilter,
    country: countryFilter,
    year: yearFilter,
    tag: tagFilter
  }

  const variables = {}
  for (const [key, value] of Object.entries(rawVariables)) {
    if (value !== null && value !== undefined && value !== "" &&
        !(Array.isArray(value) && value.length === 0)) { // CHANGED: guard against empty arrays
      variables[key] = value
    }
  }

  try {
    const response = await queryAniList(graphQLQuery, variables)

    return {
      success: true,
      media: response?.Page?.media || [],
      pageInfo: response?.Page?.pageInfo || {}
    }
  } catch (error) {
    console.error('Advanced Search Filter Engine Error:', error.message)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fetch filtered catalog rows.'
    })
  }
}, {
  maxAge: 60 * 5, // 5 minutes
  name: 'search',
  getKey: (event) => {
    const q = getQuery(event)
    return Object.entries(q).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&') || 'default'
  }
})