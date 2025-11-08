/**
 * Dialogue Module
 * Handles dialogue information retrieval and management
 */

import { Contract } from 'ethers';
import type { Dialogue } from '../types-msg';
import { ErrorCode, PrivateMsgError } from '../types-msg';

export class DialogueModule {
  contract: Contract | null = null;

  /**
   * Initialize the dialogue module
   * @param contract Contract instance
   */
  initialize(contract: Contract): void {
    this.contract = contract;
  }

  /**
   * Get dialogue information
   * @param dialogueAddress Dialogue address
   * @returns Dialogue information
   */
  async getDialogue(dialogueAddress: string): Promise<Dialogue> {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'DialogueModule not initialized. Call initialize() first.'
      );
    }

    try {
      // Get encrypted private key
      const encryptedPrivateKey = await this.contract.dialoguePrivateKeys(dialogueAddress);

      // Get messages for this dialogue (first message to check if exists)
      const messages = await this.contract.dialogue(dialogueAddress, 0).catch(() => null);

      if (!messages) {
        throw new PrivateMsgError(
          ErrorCode.DIALOGUE_NOT_FOUND,
          'Dialogue not found'
        );
      }

      // Note: The contract doesn't store participant list explicitly
      // This would need to be tracked off-chain or derived from events
      return {
        dialogueAddress,
        participants: [], // Would need to be populated from events or off-chain data
        messageCount: 0, // Would need to query all messages or use events
        encryptedPrivateKey,
      };
    } catch (error) {
      if (error instanceof PrivateMsgError) {
        throw error;
      }
      throw new Error(`Failed to get dialogue: ${(error as Error).message}`);
    }
  }

  /**
   * List all dialogues for a user
   * @param userAddress User's wallet address
   * @returns Array of dialogue addresses
   */
  async listUserDialogues(userAddress: string): Promise<string[]> {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'DialogueModule not initialized. Call initialize() first.'
      );
    }

    try {
      // Get user's dialogue addresses from contract
      // Note: This assumes the contract has a way to get all dialogue addresses for a user
      // Based on the ABI, we use userMsg mapping
      const dialogues: string[] = [];
      let index = 0;

      // Query until we get an error (no more dialogues)
      while (true) {
        try {
          const dialogueAddress = await this.contract.userMsg(userAddress, index);
          if (dialogueAddress === '0x0000000000000000000000000000000000000000') {
            break;
          }
          dialogues.push(dialogueAddress);
          index++;
        } catch {
          break;
        }
      }

      return dialogues;
    } catch (error) {
      console.error('Failed to list user dialogues:', error);
      return [];
    }
  }

  /**
   * Get participants in a dialogue
   * Note: The contract doesn't store participant information explicitly
   * This would need to be derived from transaction history or events
   * @param dialogueAddress Dialogue address
   * @returns Array of participant addresses (empty for now)
   */
  async getParticipants(dialogueAddress: string): Promise<string[]> {
    // This would require:
    // 1. Listening to contract events to track who sent messages
    // 2. Maintaining an off-chain database
    // 3. Or parsing the dialogue address if it encodes participant info
    console.warn('getParticipants not fully implemented - requires off-chain data or event parsing');
    return [];
  }

  /**
   * Get dialogue address between two users
   * This calls the contract's getMsgID function
   * @param user1 First user address
   * @param user2 Second user address
   * @returns Dialogue address
   */
  async getDialogueAddressBetween(user1: string, user2: string): Promise<string> {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'DialogueModule not initialized. Call initialize() first.'
      );
    }

    try {
      return await this.contract.getMsgID(user1, user2);
    } catch (error) {
      throw new Error(`Failed to get dialogue address: ${(error as Error).message}`);
    }
  }
}
