/**
 * Message Module
 * Handles message sending, retrieval, and event listening
 */

import { Contract } from 'ethers';
import type {
  Message,
  Dialogue,
  SendMessageParams,
  SendMessageResult,
  GetMessagesParams,
  GetDialogueWithParams,
  GetDialogueWithResult,
  MSGList,
  EventUnsubscribe,
  MsgSDKEventCallbacks,
} from '../types-msg';
import { ErrorCode, PrivateMsgError } from '../types-msg';
import { KeyManager } from './KeyManager';
import { EncryptionModule } from './EncryptionModule';
import { AuthModule } from './AuthModule';

export class MessageModule {
  contract: Contract | null = null;
  keyManager: KeyManager;
  encryption: EncryptionModule;
  auth: AuthModule;
  signerAddress: string | null = null;
  callbacks: MsgSDKEventCallbacks = {};

  constructor(
    keyManager: KeyManager,
    encryption: EncryptionModule,
    auth: AuthModule
  ) {
    this.keyManager = keyManager;
    this.encryption = encryption;
    this.auth = auth;
  }

  /**
   * Initialize the message module
   * @param contract Contract instance
   * @param signerAddress Current signer address
   */
  initialize(contract: Contract, signerAddress: string): void {
    this.contract = contract;
    this.signerAddress = signerAddress;
  }

  /**
   * Set event callbacks
   * @param callbacks Event callback functions
   */
  setCallbacks(callbacks: MsgSDKEventCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Send a message to another user
   * @param params Send message parameters
   * @returns Send message result
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    if (!this.contract || !this.signerAddress) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'MessageModule not initialized. Call initialize() first.'
      );
    }

    try {
      // Check if sender is registered
      const isRegistered = await this.auth.isRegistered(this.signerAddress);
      if (!isRegistered) {
        throw new PrivateMsgError(
          ErrorCode.NOT_REGISTERED,
          'Sender not registered. Call auth.register() first.'
        );
      }

      // Note: We don't check if recipient is registered
      // The contract will handle this, or the recipient can see messages after registering

      // Get or generate dialogue key
      let dialogueKey = params.dialogueKey;
      const dialogueAddress = await this.contract.getMsgID(this.signerAddress, params.to);

      if (!dialogueKey) {
        // First, check cache (fast and free)
        const cachedKey = this.keyManager.getCachedDialogueKey(dialogueAddress);

        if (cachedKey) {
          // Use cached key
          dialogueKey = cachedKey;
        } else {
          // Cache miss, check if dialogue already exists on-chain
          const existingKey = await this.contract.dialoguePrivateKeys(dialogueAddress);

          if (existingKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // Dialogue exists, decrypt the key
            const passwordWallet = this.auth.generatePasswordWallet(
              this.signerAddress,
              params.password
            );
            dialogueKey = await this.keyManager.decryptDialogueKey(
              existingKey,
              passwordWallet.wallet
            );
            // Cache for future use
            this.keyManager.cacheDialogueKey(dialogueAddress, dialogueKey);
          } else {
            // Generate new dialogue key (first message)
            dialogueKey = this.keyManager.generateDialogueKey();
            // Cache it
            this.keyManager.cacheDialogueKey(dialogueAddress, dialogueKey);
          }
        }
      }

      // Encrypt message content
      const encryptedContent = await this.encryption.encryptMessage(
        params.message,
        dialogueKey
      );

      // Encrypt dialogue key with FHE
      const { handles, inputProof } = await this.keyManager.encryptDialogueKey(
        dialogueKey,
        this.signerAddress
      );

      // Send message transaction
      const tx = await this.contract.sendMsg(
        params.to,
        handles[0], // FHE encrypted dialogue key
        encryptedContent, // DES/AES encrypted message content
        inputProof
      );

      this.callbacks.onTransactionSubmitted?.(tx.hash);

      const receipt = await tx.wait();
      this.callbacks.onTransactionConfirmed?.(receipt);

      return {
        transactionHash: receipt.hash,
        dialogueAddress,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      console.log(error)
      if (error instanceof PrivateMsgError) {
        this.callbacks.onError?.(error);
        throw error;
      }
      const err = new Error(`Send message failed: ${(error as Error).message}`);
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Get all dialogues for a user
   * @param userAddress User's wallet address
   * @returns Array of dialogues
   */
  async getDialogues(userAddress: string): Promise<Dialogue[]> {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'MessageModule not initialized. Call initialize() first.'
      );
    }

    try {
      // Get message list from contract
      const msgListData: MSGList[] = await this.contract.getMsgList(userAddress);

      const dialogues: Dialogue[] = msgListData.map((msgList) => {
        const lastMsg = msgList.msgList[msgList.msgList.length - 1];

        // Determine the other user in this dialogue
        const otherUser = msgList.from.toLowerCase() === userAddress.toLowerCase()
          ? msgList.to
          : msgList.from;

        return {
          dialogueAddress: msgList.dialogueAddress,
          participants: [msgList.from, msgList.to],
          otherUser, // Add the other user's address
          messageCount: msgList.msgList.length,
          encryptedPrivateKey: msgList.privateKey,
          lastMessage: msgList.msgList.length > 0
            ? {
              content: '[Encrypted]',
              encryptedContent: lastMsg.msgContent,
              timestamp: lastMsg.time,
              from: lastMsg.from,
              to: lastMsg.to,
            }
            : undefined,
        };
      });

      return dialogues;
    } catch (error) {
      throw new Error(`Failed to get dialogues: ${(error as Error).message}`);
    }
  }

  /**
   * Get messages from a specific dialogue
   * @param params Get messages parameters
   * @returns Array of decrypted messages
   */
  async getMessages(params: GetMessagesParams): Promise<Message[]> {
    if (!this.contract || !this.signerAddress) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'MessageModule not initialized. Call initialize() first.'
      );
    }

    try {
      // Get message detail using new getMsgDetail function
      const msgDetail: MSGList = await this.contract.getMsgDetail(params.dialogueAddress);
      console.log(msgDetail)
      // Check if dialogue exists (first time chatting)
      if (!msgDetail.privateKey || msgDetail.privateKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        // Return empty array for first time dialogue (no messages yet)
        return [];
      }

      // Check cache first
      let dialogueKey = this.keyManager.getCachedDialogueKey(params.dialogueAddress);

      if (!dialogueKey) {
        // Decrypt dialogue key using password wallet
        const passwordWallet = this.auth.generatePasswordWallet(
          this.signerAddress,
          params.password
        );

        // Verify password
        const isValid = await this.auth.verifyPassword(this.signerAddress, params.password);
        if (!isValid) {
          throw new PrivateMsgError(
            ErrorCode.INVALID_PASSWORD,
            'Invalid password'
          );
        }

        dialogueKey = await this.keyManager.decryptDialogueKey(
          msgDetail.privateKey,
          passwordWallet.wallet
        );

        // Cache for future use
        this.keyManager.cacheDialogueKey(params.dialogueAddress, dialogueKey);
      }

      // Decrypt all messages
      const messages: Message[] = [];

      for (const msg of msgDetail.msgList) {
        try {
          const content = await this.encryption.decryptMessage(
            msg.msgContent,
            dialogueKey
          );

          messages.push({
            content,
            encryptedContent: msg.msgContent,
            timestamp: Number(msg.time),
            from: msg.from,
            to: msg.to,
          });
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          // Skip messages that fail to decrypt
          messages.push({
            content: '[Decryption failed]',
            encryptedContent: msg.msgContent,
            timestamp: Number(msg.time),
            from: msg.from,
            to: msg.to,
          });
        }
      }

      return messages;
    } catch (error) {
      if (error instanceof PrivateMsgError) {
        throw error;
      }
      throw new Error(`Failed to get messages: ${(error as Error).message}`);
    }
  }

  /**
   * Get dialogue and messages with a specific user
   * @param params Get dialogue with user parameters
   * @returns Dialogue address and messages
   */
  async getDialogueWith(params: GetDialogueWithParams): Promise<GetDialogueWithResult> {
    if (!this.contract || !this.signerAddress) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'MessageModule not initialized. Call initialize() first.'
      );
    }

    try {
      // Get dialogue address
      const dialogueAddress = await this.contract.getMsgID(
        this.signerAddress,
        params.otherUser
      );

      // Get messages
      const messages = await this.getMessages({
        dialogueAddress,
        password: params.password,
      });

      return {
        dialogueAddress,
        messages,
      };
    } catch (error) {
      if (error instanceof PrivateMsgError) {
        throw error;
      }
      throw new Error(`Failed to get dialogue with user: ${(error as Error).message}`);
    }
  }

  /**
   * Listen for new message events
   * Note: This requires contract events to be properly defined
   * @param callback Callback function for new messages
   * @returns Unsubscribe function
   */
  onNewMessage(callback: (message: Message) => void): EventUnsubscribe {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'MessageModule not initialized. Call initialize() first.'
      );
    }

    // Note: This assumes there's a MessageSent event in the contract
    // The actual event name and parameters would depend on the contract implementation
    const filter = this.contract.filters.MessageSent?.();

    if (!filter) {
      console.warn('MessageSent event not found in contract ABI');
      return () => { };
    }

    const listener = (from: string, to: string) => {
      // Only notify if message is for current user
      if (this.signerAddress && (to === this.signerAddress || from === this.signerAddress)) {
        const message: Message = {
          content: '[Encrypted - call getMessages to decrypt]',
          encryptedContent: '',
          timestamp: Math.floor(Date.now() / 1000),
          from,
          to,
        };
        callback(message);
      }
    };

    this.contract.on(filter, listener);

    // Return unsubscribe function
    return () => {
      if (this.contract) {
        this.contract.off(filter, listener);
      }
    };
  }
}
