<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="modal-overlay" @click.self="handleClose">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ isNewUser ? 'Register' : 'Login' }}</h2>
            <button @click="handleClose" class="close-btn" :disabled="isLoading">×</button>
          </div>

          <div class="modal-body">
            <p class="modal-description">
              {{ isNewUser
                ? 'Create a password to encrypt your messages. Remember it carefully!'
                : 'Enter your password to decrypt and access your messages.'
              }}
            </p>

            <form @submit.prevent="handleSubmit">
              <div class="form-group">
                <label for="password">Password</label>
                <input id="password" v-model="password" type="password" placeholder="Enter your password"
                  :disabled="isLoading" required minlength="8" />
                <small class="form-hint">
                  Minimum 8 characters. This password encrypts your private keys.
                </small>
              </div>

              <div v-if="isNewUser" class="form-group">
                <label for="confirm-password">Confirm Password</label>
                <input id="confirm-password" v-model="confirmPassword" type="password"
                  placeholder="Confirm your password" :disabled="isLoading" required />
              </div>

              <div v-if="error" class="error-message">
                {{ error }}
              </div>

              <button type="submit" class="btn btn-primary btn-lg" :disabled="isLoading || !canSubmit">
                <span v-if="isLoading" class="spinner"></span>
                <span>{{ isLoading ? 'Processing...' : (isNewUser ? 'Register' : 'Login') }}</span>
              </button>
            </form>

            <div v-if="isNewUser" class="warning-box">
              <strong>⚠️ Important:</strong>
              <p>Your password cannot be recovered. Make sure to save it securely!</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSDKStore } from '../stores'

const props = defineProps<{
  show: boolean
  isNewUser?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const sdkStore = useSDKStore()

const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const isLoading = ref(false)
let errorTimer: ReturnType<typeof setTimeout> | null = null

const canSubmit = computed(() => {
  if (!password.value || password.value.length < 8) return false
  if (props.isNewUser) {
    return password.value === confirmPassword.value
  }
  return true
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    // Reset form when modal opens
    password.value = ''
    confirmPassword.value = ''
    error.value = ''
    // Clear error timer
    if (errorTimer) {
      clearTimeout(errorTimer)
      errorTimer = null
    }
  }
})

// Auto-dismiss error after 5 seconds
watch(() => error.value, (newError) => {
  if (newError) {
    // Clear existing timer
    if (errorTimer) {
      clearTimeout(errorTimer)
    }
    // Set new timer to auto-dismiss after 5 seconds
    errorTimer = setTimeout(() => {
      error.value = ''
    }, 5000)
  }
})

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    isLoading.value = true
    error.value = ''

    await sdkStore.login(password.value)

    // Login successful
    isLoading.value = false
    emit('success')
    handleClose()
  } catch (err: any) {
    error.value = err.message || 'Login failed. Please try again.'
    isLoading.value = false
  }
}

function handleClose() {
  if (isLoading.value) return
  emit('close')
}
</script>

<style scoped>
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
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: var(--font-size-2xl);
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

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-description {
  margin-bottom: var(--spacing-lg);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
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

.error-message {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background-color: rgba(255, 68, 68, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.warning-box {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: rgba(255, 170, 0, 0.1);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.warning-box strong {
  display: block;
  margin-bottom: var(--spacing-xs);
  color: var(--color-warning);
}

.warning-box p {
  margin: 0;
  color: var(--color-text-secondary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
