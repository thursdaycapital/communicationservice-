/**
 * Key Manager Module
 * Handles dialogue key generation, encryption, decryption, and caching
 */

import { keccak256, Wallet, hexlify, solidityPacked, getAddress } from 'ethers';
import { CODE_HASH } from '../constants';

export class KeyManager {
  keyCache: Map<string, bigint> = new Map();
  cacheTTL: number = 3600000; // 1 hour in milliseconds
  fheInstance: any = null;
  contractAddress: string = '';

  /**
   * Initialize the key manager
   * @param fheInstance FHE instance from @zama-fhe/relayer-sdk
   * @param contractAddress Contract address
   */
  initialize(fheInstance: any, contractAddress: string): void {
    this.fheInstance = fheInstance;
    this.contractAddress = contractAddress;
  }

  /**
   * Generate a random dialogue private key
   * @returns Random bigint key
   */
  generateDialogueKey(): bigint {
    const randomWallet = Wallet.createRandom();
    return BigInt(randomWallet.privateKey);
  }

  /**
   * Calculate dialogue address from two user addresses
   * This must match the contract's getMsgID function exactly
   * @param address1 First user address
   * @param address2 Second user address
   * @returns Dialogue address
   */
  getDialogueAddress(address1: string, address2: string): string {
    // Normalize addresses to checksum format
    const addr1 = getAddress(address1);
    const addr2 = getAddress(address2);

    // Sort addresses to ensure consistency (same logic as contract)
    const [token0, token1] = addr1 < addr2 ? [addr1, addr2] : [addr2, addr1];

    // Use solidityPacked to match Solidity's abi.encodePacked
    const packed = solidityPacked(
      ['address', 'address', 'bytes32'],
      [token0, token1, CODE_HASH]
    );

    // Hash and convert to address (take lower 160 bits)
    const hash = keccak256(packed);
    const dialogueAddress = getAddress('0x' + hash.slice(-40));

    return dialogueAddress;
  }

  /**
   * FHE encrypt dialogue private key
   * @param key Dialogue private key (bigint)
   * @param userAddress User address for encryption
   * @returns Encrypted input object with handles and proof
   */
  async encryptDialogueKey(
    key: bigint,
    userAddress: string
  ): Promise<{ handles: string[]; inputProof: string }> {
    if (!this.fheInstance) {
      throw new Error('KeyManager not initialized. Call initialize() first.');
    }

    try {
      // Create encrypted input
      const input = this.fheInstance.createEncryptedInput(
        this.contractAddress,
        userAddress
      );
      input.add256(key);

      // Encrypt
      const encryptedInput = await input.encrypt();

      return {
        handles: encryptedInput.handles.map((h: any) => hexlify(h)),
        inputProof: hexlify(encryptedInput.inputProof),
      };
    } catch (error) {
      throw new Error(`Failed to encrypt dialogue key: ${(error as Error).message}`);
    }
  }

  /**
   * FHE decrypt dialogue private key
   * @param encryptedKeyHandle FHE encrypted key handle (from blockchain)
   * @param passwordWallet Password wallet for decryption authorization
   * @returns Decrypted dialogue private key
   */
  async decryptDialogueKey(
    encryptedKeyHandle: string,
    passwordWallet: Wallet
  ): Promise<bigint> {
    if (!this.fheInstance) {
      throw new Error('KeyManager not initialized. Call initialize() first.');
    }

    try {
      // Generate keypair for decryption
      const keypair = this.fheInstance.generateKeypair();

      // Prepare handle-contract pair
      const handleContractPairs = [
        { handle: encryptedKeyHandle, contractAddress: this.contractAddress },
      ];

      // Create EIP712 signature request
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [this.contractAddress];

      const eip712 = this.fheInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      // Sign with password wallet
      const signature = await passwordWallet.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      // Perform user decryption
      const result = await this.fheInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        passwordWallet.address,
        startTimeStamp,
        durationDays
      );

      // Get the decrypted key
      const decryptedKey = BigInt(result[encryptedKeyHandle].toString());
      return decryptedKey;
    } catch (error) {
      throw new Error(`Failed to decrypt dialogue key: ${(error as Error).message}`);
    }
  }

  /**
   * Cache a decrypted dialogue key
   * @param dialogueAddress Dialogue address
   * @param key Dialogue private key
   */
  cacheDialogueKey(dialogueAddress: string, key: bigint): void {
    this.keyCache.set(dialogueAddress, key);

    // Set expiration timer
    setTimeout(() => {
      this.keyCache.delete(dialogueAddress);
    }, this.cacheTTL);
  }

  /**
   * Get cached dialogue key
   * @param dialogueAddress Dialogue address
   * @returns Cached key or null if not found
   */
  getCachedDialogueKey(dialogueAddress: string): bigint | null {
    return this.keyCache.get(dialogueAddress) || null;
  }

  /**
   * Clear all cached keys
   */
  clearCache(): void {
    this.keyCache.clear();
  }

  /**
   * Set cache TTL
   * @param ttl Time to live in milliseconds
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
}
