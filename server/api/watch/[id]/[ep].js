export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const ep = getRouterParam(event, 'ep')

  const config = useRuntimeConfig()
  try {
    // Fetch data from the external API dynamically
    const data = await $fetch(`${config.public.flixCloudMapUrl}/${id}/${ep}`)
    
    // Return the servers payload (or empty object if servers aren't present)
    return data?.servers || {}
  } catch (error) {
    // Handle potential API or network errors gracefully
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: 'Failed to fetch server data',
    })
  }
})