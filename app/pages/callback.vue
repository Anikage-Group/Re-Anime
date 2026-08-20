<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useCookie } from '#app';
import { useAuth } from '~/composables/useAuth';

const router = useRouter();
const route = useRoute();

// AniList OAuth token endpoint
const TOKEN_URL = 'https://anilist.co/api/v2/oauth/token';
const config = useRuntimeConfig();
const CLIENT_ID = config.public.anilistClientId;
// Normally client secret should be stored securely server-side; for demo we assume it is available as env variable
const CLIENT_SECRET = import.meta.env.VITE_ANILIST_CLIENT_SECRET || '';
const REDIRECT_URI = config.public.anilistRedirectUri;

const handleCallback = async () => {
  const code = route.query.code as string | undefined;
  if (!code) {
    // No code – redirect to home
    router.push('/');
    return;
  }
  try {
    const payload = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code,
    });
    const response = await $fetch(TOKEN_URL, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const token = response?.access_token;
    if (token) {
      // Store token in cookie (httpOnly not possible client‑side)
      const cookie = useCookie('anilist_token');
      cookie.value = token;
      // Re‑initialise auth state
      const { init } = useAuth();
      await init();
    }
  } catch (e) {
    console.error('OAuth callback error:', e);
  } finally {
    router.push('/');
  }
};

handleCallback();
</script>

<template>
  <div class="flex items-center justify-center min-h-screen text-gray-200">
    <p>Signing you in...</p>
  </div>
</template>
