export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code' })
  }

  const config = useRuntimeConfig()

  // Exchange the authorization code for an access token
  const tokenResponse = await $fetch('https://anilist.co/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: {
      grant_type: 'authorization_code',
      client_id: config.public.anilistClientId,
      client_secret: config.anilistClientSecret,
      redirect_uri: config.public.anilistRedirectUri,
      code: code,
    }
  }).catch((err) => {
    console.error('AniList token exchange failed:', err?.data || err.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to exchange authorization code' })
  })

  const accessToken = tokenResponse?.access_token
  if (!accessToken) {
    throw createError({ statusCode: 500, statusMessage: 'No access token received from AniList' })
  }

  // Set the token as an HTTP-only cookie
  setCookie(event, 'anilist_token', accessToken, {
    httpOnly: false,
    secure: false, // set to true in production with HTTPS
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year (AniList tokens don't expire)
    sameSite: 'lax',
  })

  // Redirect back to the page the user came from
  const redirectCookie = getCookie(event, 'auth_redirect_back')
  const redirectTo = redirectCookie || '/settings'
  
  // Clear the redirect cookie
  setCookie(event, 'auth_redirect_back', '', { maxAge: -1, path: '/' })
  
  return sendRedirect(event, String(redirectTo))
})
