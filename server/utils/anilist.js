export default async function queryAniList(query, variables = {}) {
  const url = 'https://graphql.anilist.co'
  
  try {
    const response = await $fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: {
        query: query,
        variables: variables
      }
    })

    return response.data
    
  } catch (error) {
    console.error('AniList API Error:', error.statusCode, error.message)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `AniList API Request Failed: ${error.message}`
    })
  }
}