/**
 * Encryption Module
 * Handles message encryption and decryption using AES-256-CBC from crypto-js
 */

import * as CryptoJS from 'crypto-js';
import { hexlify } from 'ethers';
import type { EncryptedMessage, Message } from '../types-msg';

export class EncryptionModule {
  /**
   * Encrypt message using AES-256-CBC from crypto-js
   * @param message Plaintext message
   * @param key Encryption key (bigint from dialogue private key)
   * @returns Encrypted message (hex string with 0x prefix)
   */
  async encryptMessage(message: string, key: bigint): Promise<string> {
    try {
      // Convert bigint key to hex string (32 bytes = 64 hex chars for AES-256)
      const keyHex = key.toString(16).padStart(64, '0');

      // Convert hex key to WordArray for crypto-js
      const keyWordArray = CryptoJS.enc.Hex.parse(keyHex);

      // Generate random IV (16 bytes for AES)
      const iv = CryptoJS.lib.WordArray.random(16);

      // Encrypt using AES-256-CBC
      const encrypted = CryptoJS.AES.encrypt(message, keyWordArray, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Combine IV + ciphertext
      const combined = iv.concat(encrypted.ciphertext);

      // Convert to hex with 0x prefix
      const hexString = combined.toString(CryptoJS.enc.Hex);

      return '0x' + hexString;
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt message using AES-256-CBC from crypto-js
   * @param encryptedMessage Encrypted message (hex string with 0x prefix)
   * @param key Decryption key (bigint from dialogue private key)
   * @returns Decrypted plaintext message
   */
  async decryptMessage(encryptedMessage: string, key: bigint): Promise<string> {
    try {
      // Remove 0x prefix if present
      const hexString = encryptedMessage.startsWith('0x')
        ? encryptedMessage.slice(2)
        : encryptedMessage;

      // Convert bigint key to hex string
      const keyHex = key.toString(16).padStart(64, '0');

      // Convert hex key to WordArray
      const keyWordArray = CryptoJS.enc.Hex.parse(keyHex);

      // Parse the combined hex (IV + ciphertext)
      const combined = CryptoJS.enc.Hex.parse(hexString);

      // Extract IV (first 16 bytes = 32 hex chars) and ciphertext
      const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
      const ciphertext = CryptoJS.lib.WordArray.create(
        combined.words.slice(4),
        combined.sigBytes - 16
      );

      // Create cipherParams object for decryption
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: ciphertext
      });

      // Decrypt using AES-256-CBC
      const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Convert to UTF-8 string
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

      if (!plaintext) {
        throw new Error('Decryption produced empty result');
      }

      return plaintext;
    } catch (error) {
      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Batch decrypt messages
   * @param messages Array of encrypted messages
   * @param key Decryption key
   * @returns Array of decrypted messages
   */
  async decryptMessages(
    messages: EncryptedMessage[],
    key: bigint
  ): Promise<Message[]> {
    const decryptedMessages: Message[] = [];

    for (const msg of messages) {
      try {
        const content = await this.decryptMessage(msg.msgContent, key);
        decryptedMessages.push({
          content,
          encryptedContent: msg.msgContent,
          timestamp: msg.time,
          from: msg.from,
          to: msg.to,
        });
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        // Skip messages that fail to decrypt
        decryptedMessages.push({
          content: '[Decryption failed]',
          encryptedContent: msg.msgContent,
          timestamp: msg.time,
          from: msg.from,
          to: msg.to,
        });
      }
    }

    return decryptedMessages;
  }

}
