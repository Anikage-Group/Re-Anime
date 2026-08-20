export default defineEventHandler(async (event) => {
  // Clear the anilist_token cookie
  deleteCookie(event, 'anilist_token', {
    path: '/',
  })

  return { loggedIn: false }
})
