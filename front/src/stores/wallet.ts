/**
 * Wallet Store
 * Manages Web3Modal wallet connection state
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { createWeb3Modal, defaultConfig, useWeb3ModalAccount, useDisconnect } from '@web3modal/ethers/vue'
import type { WalletState } from '../types'

const projectId = 'c61d825936ee0c313c074b0cb3575fc6'

// Define Sepolia testnet
const sepolia = {
  chainId: 11155111,
  name: 'Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://1rpc.io/sepolia'
}

// Create Web3Modal instance
const metadata = {
  name: 'Zama Private Chat',
  description: 'Encrypted messaging on blockchain',
  url: 'https://zama-chat.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const modal = createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [sepolia],
  projectId,
  enableAnalytics: false,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#ffd208',
    '--w3m-border-radius-master': '4px',
  }
})

export const useWalletStore = defineStore('wallet', () => {
  // Use Web3Modal composables
  const { address: web3Address, chainId: web3ChainId, isConnected: web3IsConnected } = useWeb3ModalAccount()
  const { disconnect: web3Disconnect } = useDisconnect()

  // State
  const address = ref<string | null>(null)
  const chainId = ref<number | null>(null)

  // Computed
  const isConnected = computed(() => web3IsConnected.value && address.value !== null)
  const isCorrectChain = computed(() => chainId.value === 11155111)

  const state = computed<WalletState>(() => ({
    address: address.value,
    isConnected: isConnected.value,
    chainId: chainId.value,
  }))

  // Watch Web3Modal state changes
  watch(web3Address, (newAddress) => {
    address.value = newAddress || null
  }, { immediate: true })

  watch(web3ChainId, (newChainId) => {
    chainId.value = typeof newChainId === 'number' ? newChainId : (typeof newChainId === 'string' ? parseInt(newChainId) : null)
  }, { immediate: true })

  // Actions
  function connect() {
    modal.open()
  }

  async function disconnect() {
    await web3Disconnect()
    address.value = null
    chainId.value = null
  }

  return {
    // State
    address,
    chainId,

    // Computed
    isConnected,
    isCorrectChain,
    state,

    // Actions
    connect,
    disconnect,
  }
})
