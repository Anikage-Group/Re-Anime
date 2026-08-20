<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps({
  error: {
    type: Object as () => NuxtError,
    required: true
  }
})

// Clear the error and redirect back home
const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <NuxtLayout name="error">
    <div 
      class="flex w-full min-h-screen flex-col items-center justify-center text-white" 
      style="font-family: system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'"
    >
      <div class="text-center">
        <div class="flex items-center justify-center">
          <!-- Dynamic Status Code -->
          <h1 class="m-0 mr-5 inline-block border-r border-white/30 pr-6 align-top text-2xl leading-[49px] font-medium tracking-tight">
            {{ error?.statusCode || 500 }}
          </h1> 
          
          <!-- Dynamic Message -->
          <div class="inline-block h-[49px] text-left align-middle leading-[49px]">
            <h2 class="m-0 text-sm leading-[49px] font-semibold">
              {{ 
                error?.statusCode === 404 
                  ? "We couldn't find the page you're looking for, please try again later." 
                  : (error?.statusMessage || "An unexpected error occurred.") 
              }}
            </h2>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>