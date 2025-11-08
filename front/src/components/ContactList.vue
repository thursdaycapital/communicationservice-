<template>
  <div class="contact-list">
    <div class="contact-header">
      <h3>Messages</h3>
      <button @click="showNewChat = true" class="btn btn-ghost btn-sm" title="New Chat">
        <span class="icon">+</span>
      </button>
    </div>

    <div class="search-box">
      <input v-model="searchQuery" type="text" placeholder="Search contacts..." class="search-input" />
    </div>

    <div class="user-info">
      <div class="user-address">{{ formatAddress(walletStore.address || '') }}</div>
      <button @click="handleLogout" class="btn btn-ghost btn-sm logout-btn" title="Logout">
        Logout
      </button>
    </div>

    <div class="contact-items">
      <div v-if="isInitialLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading conversations...</p>
      </div>

      <div v-else-if="filteredDialogues.length === 0" class="empty-state">
        <p v-if="searchQuery">No results found</p>
        <p v-else>No conversations yet. Start a new chat!</p>
      </div>

      <div v-for="dialogue in filteredDialogues" :key="dialogue.dialogueAddress" class="contact-item"
        :class="{ active: isActiveDialogue(dialogue) }" @click="selectDialogue(dialogue)">
        <div class="contact-avatar">
          <div class="avatar-icon">{{ getAvatarInitial(dialogue.otherUser) }}</div>
        </div>
        <div class="contact-info">
          <div class="contact-name">
            {{ formatAddress(dialogue.otherUser) }}
          </div>
          <div v-if="dialogue.lastMessage" class="contact-message">
            {{ truncateMessage(dialogue.lastMessage.content) }}
          </div>
        </div>
        <div v-if="dialogue.unreadCount && dialogue.unreadCount > 0" class="unread-badge">
          {{ dialogue.unreadCount }}
        </div>
      </div>
    </div>

    <!-- New Chat Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showNewChat" class="modal-overlay" @click.self="showNewChat = false">
          <div class="modal-content modal-small">
            <div class="modal-header">
              <h3>New Chat</h3>
              <button @click="showNewChat = false" class="close-btn">×</button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="handleNewChat">
                <div class="form-group">
                  <label>Recipient Address</label>
                  <input v-model="newChatAddress" type="text" placeholder="0x..." required
                    pattern="^0x[a-fA-F0-9]{40}$" />
                  <small class="form-hint">Enter a valid Ethereum address</small>
                </div>
                <button type="submit" class="btn btn-primary">
                  Start Chat
                </button>
              </form>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSDKStore, useWalletStore } from '../stores'
import type { Dialogue } from '../types'

const emit = defineEmits<{
  'select-dialogue': []
}>()

const sdkStore = useSDKStore()
const walletStore = useWalletStore()

const searchQuery = ref('')
const showNewChat = ref(false)
const newChatAddress = ref('')
const isInitialLoading = ref(true) // Only show loading on first load
let dialoguesPollingTimer: ReturnType<typeof setInterval> | null = null

// Polling configuration
const DIALOGUES_POLLING_INTERVAL = 10000 // 10 seconds

const filteredDialogues = computed(() => {
  if (!searchQuery.value) {
    return sdkStore.dialogues
  }
  const query = searchQuery.value.toLowerCase()
  return sdkStore.dialogues.filter(d =>
    d.otherUser.toLowerCase().includes(query)
  )
})
function isActiveDialogue(dialogue: Dialogue): boolean {
  return sdkStore.currentDialogue?.dialogueAddress === dialogue.dialogueAddress
}

async function selectDialogue(dialogue: Dialogue) {
  try {
    sdkStore.selectDialogue(dialogue)
    await sdkStore.loadDialogueMessages(dialogue.otherUser)
    emit('select-dialogue')
  } catch (error) {
    console.error('Failed to load dialogue:', error)
  }
}

function formatAddress(address: string): string {
  if (!address) return 'Unknown'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getAvatarInitial(address: string): string {
  if (!address) return '?'
  return address.slice(2, 4).toUpperCase()
}

function truncateMessage(message: string): string {
  if (!message) return ''
  if (message.length <= 50) return message
  return message.slice(0, 50) + '...'
}

async function handleNewChat() {
  if (!newChatAddress.value) return

  try {
    // Load dialogue with the new address
    await sdkStore.loadDialogueMessages(newChatAddress.value)
    showNewChat.value = false
    newChatAddress.value = ''
    emit('select-dialogue')
  } catch (error: any) {
    console.error('Failed to start new chat:', error)
    // Use store error instead of alert for auto-dismiss
    sdkStore.error = error.message || 'Failed to start chat. Please check the address and try again.'
  }
}

async function handleLogout() {
  try {
    // Logout from SDK
    await sdkStore.logout()
    // Disconnect wallet
    await walletStore.disconnect()
  } catch (error) {
    console.error('Failed to logout:', error)
  }
}

// Refresh dialogues list (background refresh)
async function refreshDialogues() {
  if (!sdkStore.isLoggedIn) {
    return
  }

  try {
    await sdkStore.loadDialogues()
    // Mark initial loading as complete
    if (isInitialLoading.value) {
      isInitialLoading.value = false
    }
  } catch (error) {
    console.error('[ContactList] Failed to refresh dialogues:', error)
    // Mark initial loading as complete even on error
    if (isInitialLoading.value) {
      isInitialLoading.value = false
    }
  }
}

// Start polling for dialogues updates
function startDialoguesPolling() {
  stopDialoguesPolling()

  if (sdkStore.isLoggedIn) {
    console.log('[ContactList] Starting dialogues polling')
    dialoguesPollingTimer = setInterval(() => {
      refreshDialogues()
    }, DIALOGUES_POLLING_INTERVAL)
  }
}

// Stop polling
function stopDialoguesPolling() {
  if (dialoguesPollingTimer) {
    console.log('[ContactList] Stopping dialogues polling')
    clearInterval(dialoguesPollingTimer)
    dialoguesPollingTimer = null
  }
}

// Handle page visibility changes
function handleVisibilityChange() {
  if (document.hidden) {
    stopDialoguesPolling()
  } else {
    if (sdkStore.isLoggedIn) {
      refreshDialogues()
      startDialoguesPolling()
    }
  }
}

// Component lifecycle
onMounted(async () => {
  if (sdkStore.isLoggedIn) {
    // Load dialogues immediately on mount
    await refreshDialogues()
    startDialoguesPolling()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopDialoguesPolling()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.contact-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
}

.contact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.contact-header h3 {
  margin: 0;
  font-size: var(--font-size-xl);
}

.icon {
  font-size: var(--font-size-2xl);
  line-height: 1;
}

.search-box {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.search-input:focus {
  border-color: var(--color-primary);
  outline: none;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.user-address {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.logout-btn {
  color: var(--color-error);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.logout-btn:hover {
  background-color: rgba(255, 68, 68, 0.1);
  color: var(--color-error);
}

.contact-items {
  flex: 1;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.loading-state {
  gap: var(--spacing-md);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}

.contact-item:hover {
  background-color: var(--color-bg-hover);
}

.contact-item.active {
  background-color: var(--color-bg-tertiary);
  border-left: 3px solid var(--color-primary);
}

.contact-avatar {
  flex-shrink: 0;
}

.avatar-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  color: var(--color-bg);
  font-weight: 600;
  font-size: var(--font-size-lg);
  border-radius: var(--radius-full);
}

.contact-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.contact-name {
  font-weight: 500;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
  font-family: var(--font-mono);
}

.contact-message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 var(--spacing-xs);
  background-color: var(--color-primary);
  color: var(--color-bg);
  font-size: var(--font-size-xs);
  font-weight: 600;
  border-radius: var(--radius-full);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--spacing-md);
}

.modal-content {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
}

.modal-body {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-hint {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.close-btn {
  width: 32px;
  height: 32px;
  font-size: 32px;
  line-height: 1;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
}
</style>
