<template>
  <nav class="bn lg:hidden c-58ojq9">
    <div class="bn-row c-58ojq9">
      <button 
        v-for="item in navItems" 
        :key="item.id"
        type="button"
        class="bn-item c-58ojq9" 
        :class="{ 'is-active': route.path === item.path }"
        @click="navigateTo(item.path)"
      >
        <span class="bn-icon c-58ojq9">
          <svg v-if="item.id === 'home'" aria-hidden="true" class="lucide-icon lucide lucide-house size-5" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>

          <svg v-if="item.id === 'search'" aria-hidden="true" class="lucide-icon lucide lucide-search size-5" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="m21 21-4.34-4.34"></path>
            <circle cx="11" cy="11" r="8"></circle>
          </svg>

          <svg v-if="item.id === 'schedule'" aria-hidden="true" class="lucide-icon lucide lucide-calendar size-5" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2v4"></path>
            <path d="M16 2v4"></path>
            <rect height="18" rx="2" width="18" x="3" y="4"></rect>
            <path d="M3 10h18"></path>
          </svg>

          <svg v-if="item.id === 'manga'" aria-hidden="true" class="lucide-icon lucide lucide-library-big size-5" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)">
            <rect width="8" height="18" x="3" y="3" rx="1"></rect>
            <path d="M7 3v18"></path>
            <path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"></path>
          </svg>


          <svg v-if="item.id === 'settings'" aria-hidden="true" class="lucide-icon lucide lucide-settings size-5" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          
          <span v-if="item.badge" class="bn-badge c-58ojq9">
            {{ item.badge }}
          </span>
        </span>
        <span class="bn-label c-58ojq9">
          {{ item.label }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps({
  mangaBadgeCount: {
    type: [Number, String],
    default: null
  }
});

// Access the active routing ecosystem
const route = useRoute();
const router = useRouter();

// Configured nav tracking array mapped with exact path routes
const navItems = computed(() => [
  { id: 'home', label: 'Home', path: '/home', badge: null },
  { id: 'search', label: 'Search', path: '/search', badge: null },
  { id: 'schedule', label: 'Schedule', path: '/schedule', badge: null },
  { id: 'manga', label: 'Manga', path: '/manga', badge: props.mangaBadgeCount || null },
  { id: 'settings', label: 'Settings', path: '/settings', badge: null }
]);

const navigateTo = (path) => {
  router.push(path);
};
</script>

