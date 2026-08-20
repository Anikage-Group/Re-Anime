export default defineNuxtConfig({
  css: [
    '@/assets/css/styles.css'
  ],

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      title: 'Re:ANIME — Stream Anime Free Online',
      titleTemplate: '%s | Re:ANIME',
      meta: [
        { name: 'description', content: 'Watch free anime online in HD. Stream the latest seasonal hits, classic series, and everything in between — with no ads, no clutter, just anime.' },
        { property: 'og:site_name', content: 'Re:ANIME' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Re:ANIME — Stream Anime Free Online' },
        { property: 'og:description', content: 'Watch free anime online in HD. Stream the latest seasonal hits, classic series, and everything in between — with no ads, no clutter, just anime.' },
        { property: 'og:image', content: '/og.webp' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/og.webp' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  runtimeConfig: {
    anilistClientSecret: process.env.ANILIST_CLIENT_SECRET || '',
    public: {
      anilistClientId: process.env.ANILIST_CLIENT_ID || '',
      anilistRedirectUri: process.env.ANILIST_REDIRECT_URI || '',
      mangaVaultApiBase: process.env.MANGA_VAULT_API_BASE || '',
      proxyApiBase: process.env.PROXY_API_BASE || '',
      restatusUrl: process.env.RESTATUS_URL || '',
      flixCloudMapUrl: process.env.FLIXCLOUDMAP_URL || '',
    }
  }
})