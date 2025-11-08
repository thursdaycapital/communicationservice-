/**
 * Zama Private Message SDK
 *
 * This SDK provides methods to interact with the Zama Private Message smart contract
 * including user registration, message sending/receiving with end-to-end encryption.
 */

import { BrowserProvider, Contract } from 'ethers';
import type { MsgSDKConfig, MsgSDKEventCallbacks } from './types-msg';
import {
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_RPC_URL,
  CONTRACT_ABI,
} from './constants';
import { AuthModule } from './modules/AuthModule';
import { KeyManager } from './modules/KeyManager';
import { EncryptionModule } from './modules/EncryptionModule';
import { MessageModule } from './modules/MessageModule';
import { DialogueModule } from './modules/DialogueModule';

/**
 * Main SDK class for Zama Private Message
 */
export class PrivateMsgSDK {
  config: Required<MsgSDKConfig>;
  contract: Contract | null = null;
  fheInstance: any = null;
  cachedPassword: string | null = null; // Cached password after login

  // Module instances
  auth: AuthModule;
  keyManager: KeyManager;
  encryption: EncryptionModule;
  message: MessageModule;
  dialogue: DialogueModule;

  /**
   * Create a new PrivateMsgSDK instance
   * @param config SDK configuration (optional, uses defaults if not provided)
   */
  constructor(config?: MsgSDKConfig) {
    this.config = {
      contractAddress: config?.contractAddress || DEFAULT_CONTRACT_ADDRESS,
      rpcUrl: config?.rpcUrl || DEFAULT_RPC_URL,
      provider: config?.provider || null,
      signer: config?.signer || null,
    } as Required<MsgSDKConfig>;

    // Initialize modules
    this.auth = new AuthModule();
    this.keyManager = new KeyManager();
    this.encryption = new EncryptionModule();
    this.message = new MessageModule(this.keyManager, this.encryption, this.auth);
    this.dialogue = new DialogueModule();
  }

  /**
   * Initialize the SDK (must be called before using other methods)
   * @param instance FHE instance from @zama-fhe/relayer-sdk/web createInstance()
   * @param provider Browser wallet provider (e.g., window.ethereum)
   */
  async initialize(instance: any, provider: any): Promise<void> {
    try {
      if (!provider) {
        throw new Error('Provider is required. Please connect your wallet first.');
      }
      if (!instance) {
        throw new Error('instance is required.');
      }
      console.log('[PrivateMsgSDK] Initializing SDK...');
      const browserProvider = new BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      // Store FHE instance
      this.fheInstance = instance;
      console.log('[PrivateMsgSDK] ✅ FHE instance stored');
      this.config.provider = browserProvider;
      // Get signer
      this.config.signer = signer;
      // Initialize contract
      this.contract = new Contract(
        this.config.contractAddress,
        CONTRACT_ABI,
        signer
      );
      console.log('[PrivateMsgSDK] ✅ Contract initialized');

      // Get signer address
      const signerAddress = await this.config.signer.getAddress();
      console.log('[PrivateMsgSDK] Signer address:', signerAddress);

      // Initialize all modules
      this.keyManager.initialize(this.fheInstance, this.config.contractAddress);
      this.auth.initialize(this.contract, signerAddress);
      this.message.initialize(this.contract, signerAddress);
      this.dialogue.initialize(this.contract);

      console.log('[PrivateMsgSDK] ✅ All modules initialized');
      console.log('[PrivateMsgSDK] ✅ SDK initialized successfully');
    } catch (error) {
      console.error('[PrivateMsgSDK] ❌ Initialization failed:', error);
      throw new Error(`Failed to initialize SDK: ${(error as Error).message}`);
    }
  }

  /**
   * Set event callbacks for message module
   * @param callbacks Event callback functions
   */
  setCallbacks(callbacks: MsgSDKEventCallbacks): void {
    this.message.setCallbacks(callbacks);
  }

  /**
   * Get the contract address
   * @returns Contract address
   */
  getContractAddress(): string {
    return this.config.contractAddress;
  }

  /**
   * Get the current signer address
   * @returns Signer address or null if not connected
   */
  async getSignerAddress(): Promise<string | null> {
    if (!this.config.signer) {
      return null;
    }
    return await this.config.signer.getAddress();
  }

  /**
   * Check if SDK is initialized
   * @returns True if initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.contract !== null && this.fheInstance !== null;
  }

  /**
   * Get protocol ID from contract
   * @returns Protocol ID
   */
  async getProtocolId(): Promise<number> {
    if (!this.contract) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    try {
      const protocolId = await this.contract.protocolId();
      return Number(protocolId);
    } catch (error) {
      throw new Error(`Failed to get protocol ID: ${(error as Error).message}`);
    }
  }

  // ==================== Authentication & Login ====================

  /**
   * Login with password
   * - If user is not registered, automatically register
   * - If user is registered, verify password
   * - Cache password on successful login for subsequent operations
   * @param password User's password
   * @returns Login result with status
   */
  async login(password: string): Promise<{
    success: boolean;
    isNewUser: boolean;
    message: string;
  }> {
    if (!this.config.signer) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    try {
      const userAddress = await this.config.signer.getAddress();
      console.log(userAddress)
      // Check if user is registered
      const isRegistered = await this.auth.isRegistered(userAddress);

      if (!isRegistered) {
        // User not registered, register automatically
        console.log('[PrivateMsgSDK] User not registered, registering...');
        await this.auth.register(password);
        this.cachedPassword = password;

        return {
          success: true,
          isNewUser: true,
          message: 'User registered and logged in successfully',
        };
      }

      // User already registered, verify password
      const isPasswordValid = await this.auth.verifyPassword(userAddress, password);

      if (!isPasswordValid) {
        return {
          success: false,
          isNewUser: false,
          message: 'Invalid password',
        };
      }

      // Password valid, cache it
      this.cachedPassword = password;

      return {
        success: true,
        isNewUser: false,
        message: 'Logged in successfully',
      };
    } catch (error) {
      throw new Error(`Login failed: ${(error as Error).message}`);
    }
  }

  /**
   * Logout and clear cached password
   */
  logout(): void {
    this.cachedPassword = null;
    this.keyManager.clearCache(); // Also clear key cache for security
    console.log('[PrivateMsgSDK] Logged out, password cache cleared');
  }

  /**
   * Check if user is logged in (has cached password)
   * @returns True if logged in
   */
  isLoggedIn(): boolean {
    return this.cachedPassword !== null;
  }

  /**
   * Get cached password (for internal use)
   * @returns Cached password or null
   */
  getCachedPassword(): string | null {
    return this.cachedPassword;
  }

  // ==================== Convenient Methods ====================
  // These are shortcuts to module methods for better UX

  /**
   * Register user with password (shortcut to auth.register)
   * @param password User's password
   * @returns Registration result
   */
  async register(password: string) {
    return this.auth.register(password);
  }

  /**
   * Check if user is registered (shortcut to auth.isRegistered)
   * @param userAddress User's wallet address
   * @returns True if registered
   */
  async isRegistered(userAddress: string) {
    console.log(userAddress)
    return this.auth.isRegistered(userAddress);
  }

  /**
   * Verify password (shortcut to auth.verifyPassword)
   * @param userAddress User's wallet address
   * @param password Password to verify
   * @returns True if password is correct
   */
  async verifyPassword(userAddress: string, password: string) {
    return this.auth.verifyPassword(userAddress, password);
  }

  /**
   * Send a message (shortcut to message.sendMessage)
   * - If password is not provided, uses cached password from login
   * @param params Send message parameters (password optional if logged in)
   * @returns Send message result
   */
  async sendMessage(params: Omit<import('./types-msg').SendMessageParams, 'password'> & { password?: string }) {
    const password = params.password || this.cachedPassword;

    if (!password) {
      throw new Error('No password provided. Please login first or pass password parameter.');
    }

    return this.message.sendMessage({
      ...params,
      password,
    });
  }

  /**
   * Get all dialogues for a user (shortcut to message.getDialogues)
   * @param userAddress User's wallet address
   * @returns Array of dialogues
   */
  async getDialogues(userAddress: string) {
    return this.message.getDialogues(userAddress);
  }

  /**
   * Get messages from a dialogue (shortcut to message.getMessages)
   * - If password is not provided, uses cached password from login
   * @param params Get messages parameters (password optional if logged in)
   * @returns Array of messages
   */
  async getMessages(params: Omit<import('./types-msg').GetMessagesParams, 'password'> & { password?: string }) {
    const password = params.password || this.cachedPassword;

    if (!password) {
      throw new Error('No password provided. Please login first or pass password parameter.');
    }

    return this.message.getMessages({
      ...params,
      password,
    });
  }

  /**
   * Get dialogue with a specific user (shortcut to message.getDialogueWith)
   * - If password is not provided, uses cached password from login
   * @param params Get dialogue with user parameters (password optional if logged in)
   * @returns Dialogue address and messages
   */
  async getDialogueWith(params: Omit<import('./types-msg').GetDialogueWithParams, 'password'> & { password?: string }) {
    const password = params.password || this.cachedPassword;

    if (!password) {
      throw new Error('No password provided. Please login first or pass password parameter.');
    }

    return this.message.getDialogueWith({
      ...params,
      password,
    });
  }

  /**
   * Listen for new messages (shortcut to message.onNewMessage)
   * @param callback Callback function for new messages
   * @returns Unsubscribe function
   */
  onNewMessage(callback: (message: import('./types-msg').Message) => void) {
    return this.message.onNewMessage(callback);
  }

  /**
   * Get dialogue address between two users (shortcut to dialogue.getDialogueAddressBetween)
   * @param user1 First user address
   * @param user2 Second user address
   * @returns Dialogue address
   */
  async getDialogueAddressBetween(user1: string, user2: string) {
    return this.dialogue.getDialogueAddressBetween(user1, user2);
  }
}
