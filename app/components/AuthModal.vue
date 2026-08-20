<template>
    <!-- Overlay Transition -->
    <Transition name="fade">
      <div 
        v-if="showAuthModal" 
        id="bits-c3"
        data-slot="dialog-overlay" 
        class="fixed inset-0 z-[10001] bg-black/95" 
        data-dialog-overlay="" 
        data-state="open"
        style="pointer-events: auto; --bits-dialog-depth: 0; --bits-dialog-nested-count: 0;"
        @click="closeModal"
      ></div>
    </Transition>

    <!-- Modal Content Transition (Grow & Fade with Cubic-Bezier) -->
    <Transition name="modal-grow">
      <div 
        v-if="showAuthModal" 
        id="bits-c4" 
        data-slot="dialog-content" 
        class="auth-panel fixed top-[50%] left-[50%] z-[10002] grid w-full max-w-[calc(100%-2rem)] gap-4 overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0b10] p-0 text-white shadow-2xl shadow-black/70 sm:max-w-[420px]" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="bits-c5" 
        aria-describedby="bits-c6" 
        data-dialog-content="" 
        data-state="open" 
        tabindex="-1" 
        style="pointer-events: auto; --bits-dialog-depth: 0; --bits-dialog-nested-count: 0; contain: layout style;"
      >
        <div class="auth-edge c-1l8dgc0"></div>
        <div class="auth-hatch c-1l8dgc0"></div>
        <span class="auth-arc c-1l8dgc0"></span>
        <span class="auth-dots c-1l8dgc0"></span>

        <div class="c-1l8dgc0 relative overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" style="min-height: 220px;">
          <div class="c-1l8dgc0 relative flex w-full items-start">
            <div class="c-1l8dgc0 pointer-events-auto absolute top-0 left-0 w-full px-7 pt-7 pb-7 opacity-100 transition-opacity duration-150 ease-linear">
              <div class="c-1l8dgc0 mb-5">
                <div class="c-1l8dgc0 text-2xl font-black tracking-tight text-white">
                  AniList Sync Required
                </div>
                <p class="c-1l8dgc0 mt-1 text-sm text-gray-500">
                  Sign in with AniList to manage your watchlist across devices.
                </p>
              </div>

              <div class="c-1l8dgc0 mt-8 flex flex-col gap-3.5">
                <button 
                  type="button" 
                  class="auth-submit c-1l8dgc0 flex w-full items-center justify-center gap-2.5 rounded-md bg-[#2b2d42] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3f415c]" 
                  @click="handleLogin"
                >
                  <img src="/anilist.svg" alt="AniList Logo" class="h-5 w-5 object-contain" />
                  Sign In with AniList
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="sr-only c-1l8dgc0">
          <div data-slot="dialog-header" class="flex flex-col gap-2 text-center sm:text-start">
            <div id="bits-c5" data-slot="dialog-title" class="text-lg font-semibold leading-none" role="heading" aria-level="2" data-dialog-title="" data-state="open">
              Sign In
            </div>
            <div id="bits-c6" data-slot="dialog-description" class="text-sm text-muted-foreground" data-dialog-description="" data-state="open">
              Sign in to your account with AniList.
            </div>
          </div>
        </div>

        <button 
          id="bits-c7" 
          type="button" 
          class="absolute top-4 end-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4" 
          data-dialog-close="" 
          tabindex="0" 
          data-state="open" 
          @click="closeModal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide-icon lucide lucide-x">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
          <span class="sr-only">Close</span>
        </button>
      </div>
    </Transition>
</template>

<script setup>
import { useAuth } from '~/composables/useAuth'

const { showAuthModal, login } = useAuth()

const closeModal = () => {
  showAuthModal.value = false
}

const handleLogin = () => {
  closeModal()
  login()
}
</script>

<style scoped>
/* Overlay Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Permanent centering — survives after transition classes are stripped */
.auth-panel {
  transform: translate(-50%, -50%);
}

/* Modal Grow & Fade Transition */
.modal-grow-enter-active,
.modal-grow-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-grow-enter-from,
.modal-grow-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.95);
}

.modal-grow-enter-to,
.modal-grow-leave-from {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
</style>