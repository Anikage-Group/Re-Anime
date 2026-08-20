import queryAniList from '#server/utils/anilist'

export default defineCachedEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id

        # 1. Images
        bannerImage
        coverImage {
          extraLarge
        }
        
        # 2. Titles & Translations
        title {
          english
          romaji
          native
        }
        synonyms
        
        # 3. Text Descriptions & Metadata
        description
        genres
        format
        duration
        episodes
        status
        season
        seasonYear


        meanScore
        averageScore
        popularity

        # 3b. Next episode airing (for currently-airing shows only —
        # null once the series has finished)
        nextAiringEpisode {
          airingAt
          episode
          timeUntilAiring
        }
        
        # 4. Dates
        startDate {
          year
          month
          day
        }
        
        # 5. Production Studio Relational Map
        studios {
          edges {
            isMain
            node {
              id
              name
            }
          }
        }
        
        # 6. Related Seasons & Series (Sequels, Prequels, Spin-offs)
        relations {
          edges {
            relationType
            node {
              id
              title {
                english
                romaji
                native
              }
              format
              coverImage {
                large
              }
            }
          }
        }

        # 7. Recommendations (Limited to 5)
        recommendations(perPage: 5, sort: [RATING_DESC]) {
          nodes {
            mediaRecommendation {
              id
              format
              type
              averageScore
              coverImage {
                large
                extraLarge
              }
              title {
                english
                romaji
                native
              }
            }
          }
        }
      }
    }
  `

  const data = await queryAniList(query, { id: parseInt(id) })
  const media = data?.Media

  // If a description exists, strip the HTML tags out of it
  if (media && media.description) {
    media.description = media.description
      .replace(/<br\s*\/?>/gi, '\n') // Optional: Turn <br> tags into actual line breaks
      .replace(/<[^>]*>/g, '')       // Remove all remaining HTML tags
      .trim()                        // Trim any leading/trailing whitespace
  }

  return media
}, {
  maxAge: 60 * 30, // 30 minutes
  name: 'anime-detail',
  getKey: (event) => getRouterParam(event, 'id')
})