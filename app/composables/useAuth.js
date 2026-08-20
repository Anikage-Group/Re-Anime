import { useCookie } from '#app'
import { useAniListClient } from '~/composables/useAniListClient'
import { computed } from 'vue'

export const useAuth = () => {
  const user = useState('auth_user', () => null)
  const token = useState('anilist_token', () => null)
  const loggedIn = computed(() => !!token.value)
  const loading = useState('auth_loading', () => true)
  const showAuthModal = useState('auth_modal_visible', () => false)

  const init = async () => {
    const cookie = useCookie('anilist_token')
    token.value = cookie?.value || null
    if (token.value) {
      try {
        const data = await useAniListClient().fetchUser()
        user.value = data || null
      } catch {
        user.value = null
      }
    }
    loading.value = false
  }

  // Open auth modal (used by UI components)
  const openLoginModal = () => {
    showAuthModal.value = true
  }

  // Actual AniList OAuth redirect (used by AuthModal)
  const login = () => {
    if (import.meta.client) {
      window.location.href = '/api/auth/anilist/login'
    }
  }

  const signOutAnilist = async () => {
    await $fetch('/api/auth/anilist/logout', { method: 'POST', credentials: 'include' })
    const cookie = useCookie('anilist_token')
    cookie.value = null
    token.value = null
    user.value = null
  }


  const logout = signOutAnilist

  return { user, token, loggedIn, loading, showAuthModal, openLoginModal, signOutAnilist, login, logout, init }
}
