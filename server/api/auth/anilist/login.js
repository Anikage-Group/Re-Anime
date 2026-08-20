import { defineEventHandler, sendRedirect, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const clientId = config.public.anilistClientId
  const redirectUri = config.public.anilistRedirectUri

  if (!clientId || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: 'AniList OAuth configuration is missing' })
  }

  const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`

  return sendRedirect(event, authUrl, 302)
})
