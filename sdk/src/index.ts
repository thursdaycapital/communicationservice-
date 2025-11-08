/**
 * Zama Private Message SDK - Main Entry Point
 *
 * A TypeScript SDK for interacting with the Zama Private Message smart contract.
 * Supports user registration, message sending/receiving with end-to-end encryption using FHE.
 */

export { PrivateMsgSDK } from './PrivateMsgSDK';

// Re-export initSDK and SepoliaConfig from @zama-fhe/relayer-sdk for convenience
export { initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/web';

// Export types
export {
  type MsgSDKConfig,
  type Message,
  type EncryptedMessage,
  type Dialogue,
  type PasswordWallet,
  type RegisterResult,
  type SendMessageParams,
  type SendMessageResult,
  type GetMessagesParams,
  type GetDialogueWithParams,
  type GetDialogueWithResult,
  type MSGList,
  type EventUnsubscribe,
  type MsgSDKEventCallbacks,
  ErrorCode,
  PrivateMsgError,
} from './types-msg';

// Export constants
export {
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_RPC_URL,
  BLACKHOLE_ADDRESS,
  CODE_HASH,
  SEPOLIA_FHE_CONFIG,
  CONTRACT_ABI,
} from './constants';

// Export modules for advanced usage
export { AuthModule } from './modules/AuthModule';
export { KeyManager } from './modules/KeyManager';
export { EncryptionModule } from './modules/EncryptionModule';
export { MessageModule } from './modules/MessageModule';
export { DialogueModule } from './modules/DialogueModule';
