/**
 * Type definitions for the application
 */

export interface Message {
  content: string
  encryptedContent: string
  timestamp: number
  from: string
  to: string
}

export interface Dialogue {
  dialogueAddress: string
  otherUser: string
  lastMessage?: Message
  unreadCount?: number
  messages: Message[]
}

export interface User {
  address: string
  isRegistered: boolean
  passwordAddress?: string
}

export interface WalletState {
  address: string | null
  isConnected: boolean
  chainId: number | null
}

export interface SDKState {
  isInitialized: boolean
  isLoggedIn: boolean
  isRegistered: boolean
}
