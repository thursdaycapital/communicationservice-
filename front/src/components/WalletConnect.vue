<template>
  <div class="wallet-connect">
    <div v-if="!walletStore.isConnected" class="connect-section">
      <!-- Use Web3Modal button component -->
      <w3m-button />
      <p class="connect-hint">Connect your wallet to start messaging</p>
    </div>

    <div v-else class="connected-section">
      <div class="wallet-info">
        <div class="wallet-address">
          <span class="address-label">Connected:</span>
          <span class="address-value">{{ shortAddress }}</span>
        </div>
        <button @click="handleDisconnect" class="btn btn-ghost btn-sm">
          Disconnect
        </button>
      </div>

      <div v-if="!walletStore.isCorrectChain" class="network-warning">
        <p class="warning-text">⚠️ Please switch to Sepolia testnet</p>
        <button @click="switchNetwork" class="btn btn-primary btn-sm">
          Switch Network
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWalletStore } from '@/stores'

const walletStore = useWalletStore()

const shortAddress = computed(() => {
  if (!walletStore.address) return ''
  const addr = walletStore.address
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
})

async function handleDisconnect() {
  await walletStore.disconnect()
}

async function switchNetwork() {
  try {
    await walletStore.switchToSepolia()
  } catch (error) {
    console.error('Failed to switch network:', error)
    alert('Failed to switch network. Please switch manually in your wallet.')
  }
}
</script>

<style scoped>
.wallet-connect {
  padding: var(--spacing-lg);
}

.connect-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-2xl);
}

.connect-hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.connected-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.wallet-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.wallet-address {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.address-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.address-value {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.network-warning {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(255, 170, 0, 0.1);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
}

.warning-text {
  color: var(--color-warning);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
