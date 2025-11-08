<template>
  <div class="chat-box">
    <div v-if="!currentDialogue" class="empty-chat">
      <div class="empty-content">
        <h2>Zama Private Chat</h2>
        <p>Select a conversation or start a new chat to begin messaging</p>
        <div class="features">
          <div class="feature">
            <span class="feature-icon">🔐</span>
            <span>End-to-End Encrypted</span>
          </div>
          <div class="feature">
            <span class="feature-icon">⛓️</span>
            <span>On-Chain Messages</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🛡️</span>
            <span>FHE Privacy</span>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Chat Header -->
      <div class="chat-header">
        <button @click="$emit('back')" class="back-btn mobile-only" title="Back to contacts">
          ← Back
        </button>
        <div class="header-info">
          <div class="avatar-small">{{ getAvatarInitial(currentDialogue.otherUser) }}</div>
          <div>
            <div class="header-name">{{ formatAddress(currentDialogue.otherUser) }}</div>
            <div class="header-status">{{ currentDialogue.messages.length }} messages</div>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="messages-container">
        <div v-if="isInitialLoadingMessages" class="loading-messages">
          <div class="spinner"></div>
          <p>Loading messages...</p>
        </div>

        <div v-else-if="currentDialogue.messages.length === 0" class="no-messages">
          <p>No messages yet. Start the conversation!</p>
        </div>

        <div v-else class="messages-list">
          <div
            v-for="(message, index) in currentDialogue.messages"
            :key="index"
            class="message"
            :class="{ 'message-own': isOwnMessage(message) }"
          >
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              <div class="message-meta">
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="message-input-area">
        <form @submit.prevent="handleSendMessage" class="message-form">
          <textarea
            v-model="messageText"
            placeholder="Type your message..."
            rows="1"
            class="message-textarea"
            @keydown.enter.exact.prevent="handleSendMessage"
            @input="adjustTextareaHeight"
            ref="textareaRef"
            :disabled="isSending"
          ></textarea>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="!canSend"
            title="Send message"
          >
            <span v-if="isSending" class="spinner"></span>
            <span v-else class="send-icon">➤</span>
          </button>
        </form>
        <p class="input-hint">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useSDKStore, useWalletStore } from '@/stores'
import type { Message } from '@/types'

const emit = defineEmits<{
  back: []
}>()

const sdkStore = useSDKStore()
const walletStore = useWalletStore()

const messageText = ref('')
const isSending = ref(false)
const messagesContainer = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()
const isInitialLoadingMessages = ref(false) // Only show loading on first load per dialogue
let pollingTimer: ReturnType<typeof setInterval> | null = null

const currentDialogue = computed(() => sdkStore.currentDialogue)

const canSend = computed(() => {
  return messageText.value.trim().length > 0 && !isSending.value
})

// Polling configuration
const POLLING_INTERVAL = 5000 // 5 seconds

function isOwnMessage(message: Message): boolean {
  return message.from.toLowerCase() === walletStore.address?.toLowerCase()
}

function formatAddress(address: string): string {
  if (!address) return 'Unknown'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getAvatarInitial(address: string): string {
  if (!address) return '?'
  return address.slice(2, 4).toUpperCase()
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now'
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  }

  // Show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function handleSendMessage() {
  if (!canSend.value || !currentDialogue.value) return

  const content = messageText.value.trim()
  messageText.value = ''
  resetTextareaHeight()

  try {
    isSending.value = true
    await sdkStore.sendMessage(currentDialogue.value.otherUser, content)
    scrollToBottom()

    // Reset polling timer after sending to get fresh messages immediately
    startPolling()
  } catch (error: any) {
    console.error('Failed to send message:', error)
    // Use store error instead of alert for auto-dismiss
    sdkStore.error = error.message || 'Failed to send message'
    // Restore message text on error
    messageText.value = content
  } finally {
    isSending.value = false
  }
}

function adjustTextareaHeight() {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px'
}

function resetTextareaHeight() {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Refresh messages from server (background refresh)
async function refreshMessages(isInitial: boolean = false) {
  if (!currentDialogue.value || isSending.value) {
    return
  }

  try {
    if (isInitial) {
      isInitialLoadingMessages.value = true
    }

    const previousMessageCount = currentDialogue.value.messages.length
    await sdkStore.loadDialogueMessages(currentDialogue.value.otherUser)

    // Only scroll to bottom if new messages were added or it's initial load
    const newMessageCount = currentDialogue.value.messages.length
    if (isInitial || newMessageCount > previousMessageCount) {
      if (!isInitial) {
        console.log(`[ChatBox] Received ${newMessageCount - previousMessageCount} new message(s)`)
      }
      scrollToBottom()
    }
  } catch (error) {
    console.error('[ChatBox] Failed to refresh messages:', error)
    // Don't show error to user for background refresh
  } finally {
    if (isInitial) {
      isInitialLoadingMessages.value = false
    }
  }
}

// Start polling for new messages
function startPolling() {
  stopPolling() // Clear any existing timer

  if (currentDialogue.value) {
    console.log('[ChatBox] Starting message polling')
    pollingTimer = setInterval(() => {
      refreshMessages()
    }, POLLING_INTERVAL)
  }
}

// Stop polling
function stopPolling() {
  if (pollingTimer) {
    console.log('[ChatBox] Stopping message polling')
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// Watch for dialogue changes
watch(() => currentDialogue.value, async (newVal, oldVal) => {
  if (newVal) {
    // Only load if it's a different dialogue
    if (!oldVal || newVal.dialogueAddress !== oldVal.dialogueAddress) {
      await refreshMessages(true) // Initial load with loading state
    }
    startPolling() // Start polling when dialogue is selected
  } else {
    stopPolling() // Stop polling when no dialogue is selected
  }
}, { immediate: true })

// Watch for new messages
watch(() => currentDialogue.value?.messages.length, () => {
  scrollToBottom()
})

// Handle page visibility changes
function handleVisibilityChange() {
  if (document.hidden) {
    console.log('[ChatBox] Page hidden, pausing polling')
    stopPolling()
  } else {
    console.log('[ChatBox] Page visible, resuming polling')
    if (currentDialogue.value) {
      refreshMessages(false) // Background refresh when page becomes visible
      startPolling()
    }
  }
}

// Component lifecycle
onMounted(() => {
  if (currentDialogue.value) {
    startPolling()
  }

  // Listen for page visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.chat-box {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg);
}

/* Empty State */
.empty-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-2xl);
}

.empty-content {
  text-align: center;
  max-width: 500px;
}

.empty-content h2 {
  margin-bottom: var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.empty-content p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.features {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  align-items: center;
}

.feature {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.feature-icon {
  font-size: var(--font-size-xl);
}

/* Chat Header */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.back-btn {
  display: none;
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-primary);
}

@media (max-width: 768px) {
  .back-btn {
    display: block;
  }
}

.header-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.avatar-small {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
  color: var(--color-bg);
  font-weight: 600;
  border-radius: var(--radius-full);
}

.header-name {
  font-weight: 500;
  font-size: var(--font-size-lg);
  font-family: var(--font-mono);
}

.header-status {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

.loading-messages,
.no-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.message {
  display: flex;
  animation: slideIn 0.2s ease;
}

.message-own {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.message-text {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-own .message-text {
  background-color: var(--color-primary);
  color: var(--color-bg);
}

.message-meta {
  display: flex;
  justify-content: flex-end;
  padding: 0 var(--spacing-xs);
}

.message-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* Message Input */
.message-input-area {
  padding: var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.message-form {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
}

.message-textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--font-size-md);
  resize: none;
  overflow-y: auto;
  transition: border-color var(--transition-fast);
}

.message-textarea:focus {
  border-color: var(--color-primary);
  outline: none;
}

.message-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  font-size: var(--font-size-xl);
  line-height: 1;
}

.input-hint {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-align: center;
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
