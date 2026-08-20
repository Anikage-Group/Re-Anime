export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'anilist_token')

  if (!token) {
    return { loggedIn: false }
  }

  try {
    const query = `
      query {
        Viewer {
          id
          name
          avatar {
            large
          }
          bannerImage
          statistics {
            anime {
              count
              episodesWatched
            }
          }
          createdAt
        }
      }
    `

    const response = await $fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: { query }
    })

    const viewer = response?.data?.Viewer
    if (!viewer) {
      return { loggedIn: false }
    }

    return {
      loggedIn: true,
      user: {
        id: viewer.id,
        name: viewer.name,
        avatar: viewer.avatar?.large || '',
        bannerImage: viewer.bannerImage || '',
        animeCount: viewer.statistics?.anime?.count || 0,
        episodesWatched: viewer.statistics?.anime?.episodesWatched || 0,
        createdAt: viewer.createdAt || null,
      }
    }
  } catch (error) {
    console.error('Failed to fetch AniList profile:', error?.data || error.message)
    return { loggedIn: false }
  }
})
