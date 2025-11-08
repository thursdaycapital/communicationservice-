/**
 * SDK Store
 * Manages Zama Private Message SDK instance and state
 */

import { defineStore } from 'pinia'
import { ref, computed, toValue } from 'vue'
import { PrivateMsgSDK } from 'zama-whisper'
import { createInstance, initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/web'
import type { SDKState, Dialogue } from '../types'
import { useWalletStore } from './wallet'
import { useWeb3ModalProvider } from '@web3modal/ethers/vue'
const { walletProvider } = useWeb3ModalProvider()
export const useSDKStore = defineStore('sdk', () => {
  const walletStore = useWalletStore()

  // State
  const sdk = ref<PrivateMsgSDK | null>(null)
  const fheInstance = ref<any>(null)
  const isInitialized = ref(false)
  const isLoggedIn = ref(false)
  const isRegistered = ref(false)
  const dialogues = ref<Dialogue[]>([])
  const currentDialogue = ref<Dialogue | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const state = computed<SDKState>(() => ({
    isInitialized: isInitialized.value,
    isLoggedIn: isLoggedIn.value,
    isRegistered: isRegistered.value,
  }))

  // Actions
  async function initialize() {
    if (isInitialized.value) {
      console.log('SDK already initialized')
      return
    }

    if (!walletStore.isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      isLoading.value = true
      error.value = null

      console.log('Initializing Zama FHE SDK...')
      if (import.meta.env.DEV) {
        await initSDK({
          tfheParams: 'https://cdn.zama.ai/relayer-sdk-js/0.2.0/tfhe_bg.wasm',
          kmsParams: 'https://cdn.zama.ai/relayer-sdk-js/0.2.0/kms_lib_bg.wasm',
        })
      } else {
        await initSDK()
      }

      console.log('Creating FHE instance...')
      fheInstance.value = await createInstance({
        // ACL_CONTRACT_ADDRESS (FHEVM Host chain)
        aclContractAddress: '0x687820221192C5B662b25367F70076A37bc79b6c',
        // KMS_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
        kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
        // INPUT_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
        inputVerifierContractAddress: '0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4',
        // DECRYPTION_ADDRESS (Gateway chain)
        verifyingContractAddressDecryption:
          '0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1',
        // INPUT_VERIFICATION_ADDRESS (Gateway chain)
        verifyingContractAddressInputVerification:
          '0x7048C39f048125eDa9d678AEbaDfB22F7900a29F',
        // FHEVM Host chain id
        chainId: 11155111,
        // Gateway chain id
        gatewayChainId: 55815,
        // Optional RPC provider to host chain
        network: 'https://1rpc.io/sepolia',
        // Relayer URL
        relayerUrl: 'https://relayer.testnet.zama.cloud',
      })

      console.log('Creating PrivateMsgSDK instance...')
      sdk.value = new PrivateMsgSDK()

      console.log('Initializing SDK with provider...')

      if (!walletProvider.value) {
        throw new Error('Wallet provider not available')
      }
      await sdk.value.initialize(fheInstance.value, walletProvider.value)

      isInitialized.value = true
      console.log('SDK initialized successfully')

      // Check if user is registered
      const userAddress = toValue(walletStore.address)
      if (userAddress) {
        isRegistered.value = await sdk.value.isRegistered(userAddress)
      }
    } catch (err: any) {
      console.error('Failed to initialize SDK:', err)
      error.value = err.message || 'Failed to initialize SDK'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function login(password: string) {
    if (!sdk.value) {
      throw new Error('SDK not initialized')
    }

    try {
      isLoading.value = true
      error.value = null

      const result = await sdk.value.login(password)

      if (result.success) {
        isLoggedIn.value = true
        isRegistered.value = true
        console.log(result.isNewUser ? 'User registered successfully' : 'User logged in successfully')

        // Load dialogues after successful login
        await loadDialogues()
      } else {
        throw new Error(result.message)
      }

      return result
    } catch (err: any) {
      console.error('Login failed:', err)
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    if (sdk.value) {
      sdk.value.logout()
    }
    isLoggedIn.value = false
    dialogues.value = []
    currentDialogue.value = null
  }

  async function loadDialogues() {
    const userAddress = toValue(walletStore.address)
    if (!sdk.value || !userAddress) {
      return
    }

    try {
      isLoading.value = true
      const dialogueList = await sdk.value.getDialogues(userAddress)

      // Transform dialogue data
      dialogues.value = dialogueList.map((d: any) => ({
        dialogueAddress: d.dialogueAddress,
        otherUser: d.otherUser,
        lastMessage: d.lastMessage,
        unreadCount: 0,
        messages: [],
      }))

      console.log(`Loaded ${dialogues.value.length} dialogues`)
    } catch (err: any) {
      console.error('Failed to load dialogues:', err)
      error.value = err.message || 'Failed to load dialogues'
    } finally {
      isLoading.value = false
    }
  }

  async function loadDialogueMessages(otherUser: string) {
    if (!sdk.value || !isLoggedIn.value) {
      throw new Error('SDK not initialized or user not logged in')
    }

    try {
      isLoading.value = true

      const result = await sdk.value.getDialogueWith({
        otherUser,
      })

      // Find or create dialogue
      let dialogue = dialogues.value.find((d: Dialogue) => d.otherUser === otherUser)

      if (!dialogue) {
        dialogue = {
          dialogueAddress: result.dialogueAddress,
          otherUser,
          messages: result.messages,
          unreadCount: 0,
        }
        dialogues.value.push(dialogue)
      } else {
        dialogue.messages = result.messages
      }

      currentDialogue.value = dialogue

      return result
    } catch (err: any) {
      console.error('Failed to load dialogue messages:', err)
      error.value = err.message || 'Failed to load messages'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function sendMessage(to: string, content: string) {
    if (!sdk.value || !isLoggedIn.value) {
      throw new Error('SDK not initialized or user not logged in')
    }

    try {
      isLoading.value = true

      const result = await sdk.value.sendMessage({
        to,
        message: content,
      })

      // Reload dialogue messages
      await loadDialogueMessages(to)

      return result
    } catch (err: any) {
      console.error('Failed to send message:', err)
      error.value = err.message || 'Failed to send message'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function selectDialogue(dialogue: Dialogue) {
    currentDialogue.value = dialogue
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    sdk,
    fheInstance,
    isInitialized,
    isLoggedIn,
    isRegistered,
    dialogues,
    currentDialogue,
    isLoading,
    error,

    // Computed
    state,

    // Actions
    initialize,
    login,
    logout,
    loadDialogues,
    loadDialogueMessages,
    sendMessage,
    selectDialogue,
    clearError,
  }
})
