/**
 * Type definitions for Zama Private Message SDK
 */

import type { Provider, Signer, Wallet } from 'ethers';

/**
 * SDK configuration options
 */
export interface MsgSDKConfig {
  /** Contract address on Sepolia */
  contractAddress?: string;
  /** RPC URL */
  rpcUrl?: string;
  /** Provider instance (if already initialized) */
  provider?: Provider;
  /** Signer instance (if already initialized) */
  signer?: Signer;
}

/**
 * Message structure
 */
export interface Message {
  /** Message content (decrypted) */
  content: string;
  /** Encrypted content (from blockchain) */
  encryptedContent: string;
  /** Timestamp */
  timestamp: number;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
}

/**
 * Encrypted message from blockchain
 */
export interface EncryptedMessage {
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Encrypted message content */
  msgContent: string;
  /** Timestamp */
  time: number;
}

/**
 * Dialogue structure
 */
export interface Dialogue {
  /** Dialogue address (unique identifier) */
  dialogueAddress: string;
  /** Participants in the dialogue */
  participants: string[];
  /** The other user in this dialogue (not the current user) */
  otherUser?: string;
  /** Number of messages */
  messageCount: number;
  /** Last message (if available) */
  lastMessage?: Message;
  /** FHE encrypted dialogue private key */
  encryptedPrivateKey: string;
}

/**
 * Generated password wallet
 */
export interface PasswordWallet {
  /** Private key */
  privateKey: string;
  /** Wallet address */
  address: string;
  /** Full wallet instance */
  wallet: Wallet;
}

/**
 * Register result
 */
export interface RegisterResult {
  /** Transaction hash */
  transactionHash: string;
  /** Password address */
  passwordAddress: string;
  /** Block number */
  blockNumber?: number;
}

/**
 * Send message parameters
 */
export interface SendMessageParams {
  /** Recipient address */
  to: string;
  /** Message content (plaintext) */
  message: string;
  /** Password for deriving password wallet */
  password: string;
  /** Optional: dialogue key for existing conversations */
  dialogueKey?: bigint;
}

/**
 * Send message result
 */
export interface SendMessageResult {
  /** Transaction hash */
  transactionHash: string;
  /** Dialogue address */
  dialogueAddress: string;
  /** Block number */
  blockNumber?: number;
}

/**
 * Get messages parameters
 */
export interface GetMessagesParams {
  /** Dialogue address */
  dialogueAddress: string;
  /** Password for decryption */
  password: string;
}

/**
 * Get dialogue with user parameters
 */
export interface GetDialogueWithParams {
  /** Other user address */
  otherUser: string;
  /** Password for decryption */
  password: string;
}

/**
 * Get dialogue with user result
 */
export interface GetDialogueWithResult {
  /** Dialogue address */
  dialogueAddress: string;
  /** Messages in the dialogue */
  messages: Message[];
}

/**
 * Message list from contract
 */
export interface MSGList {
  /** FHE encrypted private key */
  privateKey: string;
  /** Dialogue address */
  dialogueAddress: string;
  /** Sender address (one of the participants) */
  from: string;
  /** Recipient address (the other participant) */
  to: string;
  /** List of messages */
  msgList: EncryptedMessage[];
}

/**
 * Event unsubscribe function
 */
export type EventUnsubscribe = () => void;

/**
 * Event callbacks for SDK operations
 */
export interface MsgSDKEventCallbacks {
  /** Called when transaction is submitted */
  onTransactionSubmitted?: (txHash: string) => void;
  /** Called when transaction is confirmed */
  onTransactionConfirmed?: (receipt: any) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called when new message is received */
  onNewMessage?: (message: Message) => void;
}

/**
 * Error codes
 */
export enum ErrorCode {
  NOT_REGISTERED = 'NOT_REGISTERED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  DIALOGUE_NOT_FOUND = 'DIALOGUE_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  SDK_NOT_INITIALIZED = 'SDK_NOT_INITIALIZED',
}

/**
 * Custom error class
 */
export class PrivateMsgError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PrivateMsgError';
  }
}
