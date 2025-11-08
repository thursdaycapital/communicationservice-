<template>
  <div id="app" class="app">
    <!-- Step 1: Wallet not connected -->
    <div v-if="!walletStore.isConnected" class="app-center">
      <div class="welcome-card">
        <h1 class="app-title">Zama Private Chat</h1>
        <p class="app-description">
          Secure, encrypted messaging powered by FHE technology on Ethereum
        </p>
        <WalletConnect />
      </div>
    </div>

    <!-- Step 2: Wrong network -->
    <div v-else-if="!walletStore.isCorrectChain" class="app-center">
      <div class="welcome-card">
        <h2>Wrong Network</h2>
        <p>Please switch to Sepolia testnet in your wallet to continue</p>
      </div>
    </div>

    <!-- Step 3: SDK not initialized -->
    <div v-else-if="!sdkStore.isInitialized" class="app-center">
      <div class="welcome-card">
        <h2>Initialize SDK</h2>
        <p>Initialize the Zama FHE SDK to start messaging</p>
        <button @click="handleInitializeSDK" class="btn btn-primary btn-lg" :disabled="isInitializing">
          <span v-if="isInitializing" class="spinner"></span>
          <span>{{ isInitializing ? 'Initializing...' : 'Initialize' }}</span>
        </button>
        <p v-if="initError" class="error-text">{{ initError }}</p>
      </div>
    </div>

    <!-- Step 4: Not logged in -->
    <div v-else-if="!sdkStore.isLoggedIn" class="app-center">
      <div class="welcome-card">
        <h2>{{ sdkStore.isRegistered ? 'Login' : 'Welcome' }}</h2>
        <p>
          {{ sdkStore.isRegistered
            ? 'Enter your password to access your messages'
            : 'Create a password to start using the app'
          }}
        </p>
        <button @click="showLoginModal = true" class="btn btn-primary btn-lg">
          {{ sdkStore.isRegistered ? 'Login' : 'Get Started' }}
        </button>
      </div>
    </div>

    <!-- Main App -->
    <div v-else class="app-main" :class="{ 'show-sidebar': showSidebar }">
      <div class="app-sidebar">
        <ContactList @select-dialogue="handleDialogueSelect" />
      </div>
      <div class="app-content">
        <ChatBox @back="handleBackToList" />
      </div>
    </div>

    <!-- Login Modal -->
    <LoginModal :show="showLoginModal" :is-new-user="!sdkStore.isRegistered" @close="showLoginModal = false"
      @success="handleLoginSuccess" />

    <!-- Global Error -->
    <Transition name="fade">
      <div v-if="sdkStore.error" class="global-error">
        <div class="error-content">
          <span>{{ sdkStore.error }}</span>
          <button @click="sdkStore.clearError" class="error-close">×</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWalletStore, useSDKStore } from './stores'
import WalletConnect from '@/components/WalletConnect.vue'
import LoginModal from '@/components/LoginModal.vue'
import ContactList from '@/components/ContactList.vue'
import ChatBox from '@/components/ChatBox.vue'

const walletStore = useWalletStore()
const sdkStore = useSDKStore()

const showLoginModal = ref(false)
const isInitializing = ref(false)
const initError = ref('')
const showSidebar = ref(true) // Default to showing sidebar on mobile
let errorTimer: ReturnType<typeof setTimeout> | null = null
let initErrorTimer: ReturnType<typeof setTimeout> | null = null

// Watch for dialogue selection to hide sidebar on mobile
watch(() => sdkStore.currentDialogue, (newDialogue) => {
  if (newDialogue && window.innerWidth <= 768) {
    showSidebar.value = false
  }
})

// Auto-dismiss global error after 5 seconds
watch(() => sdkStore.error, (newError) => {
  if (newError) {
    // Clear existing timer
    if (errorTimer) {
      clearTimeout(errorTimer)
    }
    // Set new timer to auto-dismiss after 5 seconds
    errorTimer = setTimeout(() => {
      sdkStore.clearError()
    }, 5000)
  }
})

// Auto-dismiss init error after 8 seconds (longer since it's more critical)
watch(() => initError.value, (newError) => {
  if (newError) {
    // Clear existing timer
    if (initErrorTimer) {
      clearTimeout(initErrorTimer)
    }
    // Set new timer to auto-dismiss after 8 seconds
    initErrorTimer = setTimeout(() => {
      initError.value = ''
    }, 8000)
  }
})

async function handleInitializeSDK() {
  try {
    isInitializing.value = true
    initError.value = ''
    await sdkStore.initialize()
  } catch (error: any) {
    console.error('Failed to initialize SDK:', error)
    initError.value = error.message || 'Failed to initialize SDK'
  } finally {
    isInitializing.value = false
  }
}

function handleLoginSuccess() {
  console.log('Login successful, loading data...')
}

function handleDialogueSelect() {
  // On mobile, hide sidebar when dialogue is selected
  if (window.innerWidth <= 768) {
    showSidebar.value = false
  }
}

function handleBackToList() {
  // Show sidebar when back button is clicked
  showSidebar.value = true
}
</script>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-center {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: var(--spacing-lg);
}

.welcome-card {
  max-width: 500px;
  width: 100%;
  text-align: center;
  padding: var(--spacing-2xl);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

.app-title {
  margin-bottom: var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: var(--font-size-3xl);
}

.app-description {
  margin-bottom: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.welcome-card h2 {
  margin-bottom: var(--spacing-md);
}

.welcome-card p {
  margin-bottom: var(--spacing-lg);
  color: var(--color-text-secondary);
}

.error-text {
  margin-top: var(--spacing-md);
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.app-main {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-sidebar {
  width: 360px;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
}

.app-content {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.global-error {
  position: fixed;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: var(--z-tooltip);
}

.error-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: rgba(255, 68, 68, 0.9);
  color: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-width: 400px;
}

.error-close {
  font-size: var(--font-size-2xl);
  line-height: 1;
  color: white;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity var(--transition-fast);
}

.error-close:hover {
  opacity: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .app-sidebar {
    width: 100%;
    display: none;
  }

  .app-main.show-sidebar .app-sidebar {
    display: block;
  }

  .app-main.show-sidebar .app-content {
    display: none;
  }
}
</style>
