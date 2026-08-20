import { defineEventHandler, deleteCookie } from 'h3'

export default defineEventHandler(async (event) => {
  // Clear the anilist_token cookie (HttpOnly, SameSite=Strict)
  deleteCookie(event, 'anilist_token', { path: '/', httpOnly: true, sameSite: 'strict', maxAge: 0 })
  return { loggedIn: false }
})
