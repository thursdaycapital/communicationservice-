/**
 * Main entry point for the application
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Import global styles
import '@/assets/styles/global.css'

// Import polyfills
import { Buffer } from 'buffer'

// Make Buffer available globally for crypto libraries
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  ;(window as any).global = window
  ;(window as any).process = {
    env: {},
    version: '',
  }
}

// Create Vue app
const app = createApp(App)

// Install Pinia
const pinia = createPinia()
app.use(pinia)

// Mount app
app.mount('#app')

// Log version
console.log('Zama Private Chat v1.0.0')
console.log('Powered by FHE Technology')
