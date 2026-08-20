import queryAniList from '#server/utils/anilist'

const MEDIA_FIELDS = `
  id
  title {
    english
    romaji
    userPreferred
  }
  description(asHtml: false)
  coverImage {
    large
    extraLarge
  }
  bannerImage
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
  genres
  meanScore
`

const GRID_PAGE_ITEMS = 24
const SCHEDULE_MAX_PAGES = 6
const SCHEDULE_PER_PAGE = 50

// Translated Python logo fetcher into JS
async function getClearLogo(anilistId) {
  const url = `https://api.ani.zip/mappings?anilist_id=${anilistId}`
  try {
    // using global fetch, standard in modern Node/Nuxt environments
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) return null
    
    const data = await response.json()
    const containers = []
    
    if (Array.isArray(data.images)) containers.push(...data.images)
    if (Array.isArray(data.artwork)) containers.push(...data.artwork)

    for (const item of containers) {
      if (!item || typeof item !== 'object') continue

      const imgType = String(
        item.coverType || item.type || item.image_type || ''
      ).toLowerCase()

      if (imgType.includes('clearlogo') || imgType.includes('logo')) {
        return item.url || item.image || null
      }
    }
    return null
  } catch (error) {
    console.error(`Error fetching clearLogo for ID ${anilistId}:`, error.message)
    return null
  }
}

export default defineCachedEventHandler(async (event) => {
  const now = Math.floor(Date.now() / 1000)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const daysSinceMonday = (todayStart.getDay() + 6) % 7
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - daysSinceMonday)
  const weekStartSec = Math.floor(weekStart.getTime() / 1000)

  const scheduleWindowStart = weekStartSec - 86400
  const scheduleWindowEnd = weekStartSec + 8 * 86400

  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth()

  const getSeason = (m) => {
    if (m === 11 || m <= 1) return 'WINTER'
    if (m >= 2 && m <= 4) return 'SPRING'
    if (m >= 5 && m <= 7) return 'SUMMER'
    return 'FALL'
  }
  const season = getSeason(month)

  const mainQuery = `
    query ($now: Int, $season: MediaSeason, $seasonYear: Int, $gridPerPage: Int) {
      topDay: Page(page: 1, perPage: 10) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          ...mediaFields
        }
      }
      topWeek: Page(page: 1, perPage: 10) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false, status: RELEASING) {
          ...mediaFields
        }
      }
      topMonth: Page(page: 1, perPage: 10) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false, season: $season, seasonYear: $seasonYear) {
          ...mediaFields
        }
      }
      topRated: Page(page: 1, perPage: $gridPerPage) {
        media(sort: SCORE_DESC, type: ANIME, isAdult: false) {
          ...mediaFields
        }
      }
      upcoming: Page(page: 1, perPage: $gridPerPage) {
        media(status: NOT_YET_RELEASED, sort: START_DATE, type: ANIME, isAdult: false) {
          ...mediaFields
        }
      }
      latestUpdates: Page(page: 1, perPage: $gridPerPage) {
        airingSchedules(airingAt_lesser: $now, sort: TIME_DESC) {
          episode
          airingAt
          media {
            ...mediaFields
          }
        }
      }
    }

    fragment mediaFields on Media {
      ${MEDIA_FIELDS}
    }
  `

  const mainVariables = {
    now,
    season,
    seasonYear: year,
    gridPerPage: GRID_PAGE_ITEMS,
  }

  const scheduleQuery = `
    query ($page: Int, $perPage: Int, $start: Int, $end: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
        }
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          episode
          airingAt
          media {
            ...mediaFields
          }
        }
      }
    }

    fragment mediaFields on Media {
      ${MEDIA_FIELDS}
    }
  `

  async function fetchFullWeekSchedule() {
    const items = []
    let page = 1

    while (page <= SCHEDULE_MAX_PAGES) {
      const res = await queryAniList(scheduleQuery, {
        page,
        perPage: SCHEDULE_PER_PAGE,
        start: scheduleWindowStart,
        end: scheduleWindowEnd,
      })

      const schedules = res?.Page?.airingSchedules || []
      items.push(...schedules)

      if (!res?.Page?.pageInfo?.hasNextPage) break
      page += 1
    }

    return items
  }

  const [response, scheduleSchedules] = await Promise.all([
    queryAniList(mainQuery, mainVariables),
    fetchFullWeekSchedule(),
  ])

  // --- NEW LOGIC: Fetch logos for top trending day in parallel ---
  const rawTopDay = response.topDay?.media || []
  const topDayWithLogos = await Promise.all(
    rawTopDay.map(async (anime) => {
      const logo = await getClearLogo(anime.id)
      // Attach the logo property to the anime object
      return { ...anime, logo }
    })
  )

  const formatSchedule = (schedules) => {
    if (!schedules) return []
    return schedules.map((item) => ({
      episode: item.episode,
      airingAt: item.airingAt,
      ...item.media,
    }))
  }

  return {
    trending: {
      day: topDayWithLogos, // Returning the new array mapping the logo inside
      week: response.topWeek?.media || [],
      month: response.topMonth?.media || [],
    },
    schedule: formatSchedule(scheduleSchedules),
    latestUpdates: formatSchedule(response.latestUpdates?.airingSchedules),
    topRated: response.topRated?.media || [],
    upcoming: response.upcoming?.media || [],
  }
}, {
  maxAge: 60 * 10, // 10 minutes
  name: 'home',
  getKey: () => 'home'
})