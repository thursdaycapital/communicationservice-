/**
 * Authentication Module
 * Handles user registration, password wallet generation, and verification
 */

import { keccak256, toUtf8Bytes, Wallet, Contract } from 'ethers';
import type { PasswordWallet, RegisterResult } from '../types-msg';
import { ErrorCode, PrivateMsgError } from '../types-msg';

export class AuthModule {
  contract: Contract | null = null;
  signerAddress: string | null = null;

  /**
   * Initialize the auth module
   * @param contract Contract instance
   * @param signerAddress Current signer address
   */
  initialize(contract: any, signerAddress: string): void {
    this.contract = contract;
    this.signerAddress = signerAddress;
  }

  /**
   * Generate password wallet from user address and password
   * @param userAddress User's wallet address
   * @param password User's password
   * @returns Password wallet information
   */
  generatePasswordWallet(userAddress: string, password: string): PasswordWallet {
    try {
      // Derive private key: keccak256(userAddress + password)
      const combined = userAddress.toLowerCase() + password;
      const privateKey = keccak256(toUtf8Bytes(combined));

      // Create wallet from private key
      const wallet = new Wallet(privateKey);

      return {
        privateKey: wallet.privateKey,
        address: wallet.address,
        wallet: wallet,
      };
    } catch (error) {
      throw new Error(`Failed to generate password wallet: ${(error as Error).message}`);
    }
  }

  /**
   * Register user (store password address on-chain)
   * @param password User's password
   * @returns Registration result
   */
  async register(password: string): Promise<RegisterResult> {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'AuthModule not initialized. Call initialize() first.'
      );
    }

    if (!this.signerAddress) {
      throw new Error('Signer address not available');
    }

    try {
      // Check if already registered
      const isRegistered = await this.isRegistered(this.signerAddress);
      if (isRegistered) {
        throw new Error('User already registered');
      }

      // Generate password wallet
      const passwordWallet = this.generatePasswordWallet(this.signerAddress, password);

      // Call register function
      const tx = await this.contract.register(passwordWallet.address);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.hash,
        passwordAddress: passwordWallet.address,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      throw new Error(`Registration failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if user is registered
   * @param userAddress User's wallet address
   * @returns True if registered, false otherwise
   */
  async isRegistered(userAddress: string): Promise<boolean> {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'AuthModule not initialized. Call initialize() first.'
      );
    }

    try {
      const passwordAddress = await this.contract.getUser(userAddress);
      // If password address is zero address, user is not registered
      return passwordAddress !== '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.error('Failed to check registration:', error);
      return false;
    }
  }

  /**
   * Get password address for a user
   * @param userAddress User's wallet address
   * @returns Password address or null if not registered
   */
  async getPasswordAddress(userAddress: string): Promise<string | null> {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'AuthModule not initialized. Call initialize() first.'
      );
    }

    try {
      const passwordAddress = await this.contract.getUser(userAddress);
      if (passwordAddress === '0x0000000000000000000000000000000000000000') {
        return null;
      }
      return passwordAddress;
    } catch (error) {
      console.error('Failed to get password address:', error);
      return null;
    }
  }

  /**
   * Verify password by comparing derived address with stored address
   * @param userAddress User's wallet address
   * @param password Password to verify
   * @returns True if password is correct, false otherwise
   */
  async verifyPassword(userAddress: string, password: string): Promise<boolean> {
    if (!this.contract) {
      throw new PrivateMsgError(
        ErrorCode.SDK_NOT_INITIALIZED,
        'AuthModule not initialized. Call initialize() first.'
      );
    }

    try {
      // Get stored password address
      const storedPasswordAddress = await this.getPasswordAddress(userAddress);
      if (!storedPasswordAddress) {
        throw new PrivateMsgError(
          ErrorCode.NOT_REGISTERED,
          'User not registered'
        );
      }

      // Generate password wallet and compare addresses
      const passwordWallet = this.generatePasswordWallet(userAddress, password);
      return passwordWallet.address.toLowerCase() === storedPasswordAddress.toLowerCase();
    } catch (error) {
      if (error instanceof PrivateMsgError) {
        throw error;
      }
      throw new Error(`Password verification failed: ${(error as Error).message}`);
    }
  }
}
