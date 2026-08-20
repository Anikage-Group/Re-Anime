import queryAniList from '#server/utils/anilist'

export default defineEventHandler(async (event) => {
  const urlParams = getQuery(event)
  
  // 1. Establish strict Monday to Sunday Unix bounds (in seconds)
  const now = new Date()
  const dayOfWeek = now.getDay() // Sun = 0, Mon = 1, etc.
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  
  const monday = new Date(now)
  monday.setDate(now.getDate() + distanceToMonday)
  monday.setHours(0, 0, 0, 0)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const startTimestamp = urlParams.start ? parseInt(urlParams.start, 10) : Math.floor(monday.getTime() / 1000)
  const endTimestamp = urlParams.end ? parseInt(urlParams.end, 10) : Math.floor(sunday.getTime() / 1000)

  // 2. Base GraphQL Query Structure
  const graphQLQuery = `
    query (
      $page: Int,
      $perPage: Int,
      $start: Int,
      $end: Int
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
        }
        airingSchedules(
          airingAt_greater: $start
          airingAt_lesser: $end
          sort: TIME
        ) {
          id
          airingAt
          episode
          timeUntilAiring
          media {
            id
            format
            status
            description
            title {
              romaji
              english
              userPreferred
            }
            coverImage {
              large
            }
          }
        }
      }
    }
  `

  let allSchedules = []
  let currentPage = 1
  let hasNextPage = true

  try {
    // 3. Pagination loop: Keep fetching until there are no more pages for the week
    while (hasNextPage) {
      const variables = {
        page: currentPage,
        perPage: 50, // Fetch the maximum allowed per request
        start: startTimestamp,
        end: endTimestamp
      }

      const response = await queryAniList(graphQLQuery, variables)

      if (response?.errors) {
        console.error('AniList Parser Core Error Output:', JSON.stringify(response.errors, null, 2))
        throw createError({
          statusCode: 400,
          statusMessage: response.errors[0]?.message || 'AniList query validation failed.'
        })
      }

      const schedules = response?.Page?.airingSchedules || []
      allSchedules = [...allSchedules, ...schedules]

      // Check if AniList indicates another page exists for this timeframe
      hasNextPage = response?.Page?.pageInfo?.hasNextPage || false
      currentPage++
    }

    // Helper regex to strip HTML tags cleanly
    const stripHtml = (htmlString) => {
      if (!htmlString) return ''
      return htmlString.replace(/<\/?[^>]+(>|$)/g, '')
    }

    // 4. Sanitize descriptions in the final aggregated dataset
    const sanitizedSchedules = allSchedules.map(item => {
      if (item.media && item.media.description) {
        item.media.description = stripHtml(item.media.description)
      }
      return item
    })

    return {
      success: true,
      schedules: sanitizedSchedules
    }

  } catch (error) {
    console.error('Critical Schedule API Break Down:', error.message)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Upstream connection error occurred parsing air-times.'
    })
  }
})