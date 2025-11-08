# Zama Whisper SDK

A TypeScript SDK for building end-to-end encrypted messaging applications on Ethereum using Zama's Fully Homomorphic Encryption (FHE) technology.

## Features

- = **End-to-End Encryption**: Messages are encrypted using FHE, ensuring complete privacy
- � **On-Chain Storage**: All messages are stored on the Ethereum blockchain
- =� **Password-Based Authentication**: Users authenticate with a password that derives their encryption keys
- =� **Browser Compatible**: Works seamlessly in modern web browsers
- = **Key Management**: Automatic encryption key generation and management
- =� **Dialogue System**: Organize messages into conversations between users

## Installation

```bash
npm install zama-whisper
# or
yarn add zama-whisper
# or
pnpm add zama-whisper
```

**That's it!** All dependencies (`@zama-fhe/relayer-sdk`, `ethers`, `crypto-js`) will be installed automatically. No additional setup required.

## Prerequisites

- Node.js >= 16
- A Web3 wallet (MetaMask, WalletConnect, etc.)
- Sepolia testnet ETH for gas fees

## Quick Start

### 1. Initialize the SDK

```typescript
import { PrivateMsgSDK, initSDK, SepoliaConfig } from 'zama-whisper'
import { createInstance } from '@zama-fhe/relayer-sdk/web'

// Step 1: Initialize WASM modules
await initSDK()

// Step 2: Create FHE instance
const fheInstance = await createInstance(SepoliaConfig)

// Step 3: Create SDK instance
const sdk = new PrivateMsgSDK()

// Step 4: Initialize with wallet provider
await sdk.initialize(fheInstance, window.ethereum)
```

### 2. User Registration & Login

```typescript
// Check if user is registered
const userAddress = '0x...'
const isRegistered = await sdk.isRegistered(userAddress)

if (!isRegistered) {
  // Register new user
  const result = await sdk.login('mySecurePassword123')
  console.log('User registered:', result.isNewUser) // true
} else {
  // Login existing user
  const result = await sdk.login('mySecurePassword123')
  console.log('Login successful:', result.success) // true
}
```

### 3. Send a Message

```typescript
// Send an encrypted message
const result = await sdk.sendMessage({
  to: '0xRecipientAddress...',
  message: 'Hello, this is a private message!',
  // password is optional if already logged in
})

console.log('Message sent:', result.transactionHash)
console.log('Dialogue address:', result.dialogueAddress)
```

### 4. Retrieve Messages

```typescript
// Get all dialogues for the current user
const dialogues = await sdk.getDialogues(userAddress)

// Get messages from a specific dialogue
const dialogue = await sdk.getDialogueWith({
  otherUser: '0xOtherUserAddress...',
  // password is optional if already logged in
})

console.log('Messages:', dialogue.messages)
```

## Configuration

### Custom Contract Address

```typescript
const sdk = new PrivateMsgSDK()
```


## API Reference

### SDK Initialization

#### `new PrivateMsgSDK(config?)`

Creates a new SDK instance.

```typescript
const sdk = new PrivateMsgSDK({
  contractAddress?: string  // Optional: Contract address
  rpcUrl?: string          // Optional: RPC URL
})
```

#### `sdk.initialize(instance, provider)`

Initializes the SDK with FHE instance and wallet provider.

- `instance`: FHE instance from `createInstance()`
- `provider`: Web3 provider (e.g., `window.ethereum`)

### Authentication

#### `sdk.login(password)`

Login or register a user with a password.

```typescript
const result = await sdk.login('password')
// Returns: { success: boolean, isNewUser: boolean, message: string }
```

#### `sdk.logout()`

Clears cached password and keys.

```typescript
sdk.logout()
```

#### `sdk.isRegistered(userAddress)`

Check if a user is registered.

```typescript
const isRegistered = await sdk.isRegistered('0x...')
```

### Messaging

#### `sdk.sendMessage(params)`

Send an encrypted message.

```typescript
await sdk.sendMessage({
  to: '0x...',              // Recipient address
  message: 'Hello!',        // Plaintext message
  password?: string,        // Optional if logged in
  dialogueKey?: bigint      // Optional: For existing conversations
})
```

#### `sdk.getDialogues(userAddress)`

Get all dialogues for a user.

```typescript
const dialogues = await sdk.getDialogues('0x...')
```

#### `sdk.getDialogueWith(params)`

Get messages from a dialogue with a specific user.

```typescript
const result = await sdk.getDialogueWith({
  otherUser: '0x...',
  password?: string  // Optional if logged in
})
// Returns: { dialogueAddress: string, messages: Message[] }
```

#### `sdk.getMessages(params)`

Get messages from a specific dialogue.

```typescript
const messages = await sdk.getMessages({
  dialogueAddress: '0x...',
  password?: string  // Optional if logged in
})
```

### Event Listeners

#### `sdk.onNewMessage(callback)`

Listen for new messages.

```typescript
const unsubscribe = sdk.onNewMessage((message) => {
  console.log('New message:', message)
})

// Later: unsubscribe()
```

### Utility Methods

#### `sdk.isInitialized()`

Check if SDK is initialized.

```typescript
const initialized = sdk.isInitialized()
```

#### `sdk.isLoggedIn()`

Check if user is logged in.

```typescript
const loggedIn = sdk.isLoggedIn()
```

#### `sdk.getContractAddress()`

Get the contract address.

```typescript
const address = sdk.getContractAddress()
```

## Type Definitions

### Message

```typescript
interface Message {
  content: string           // Decrypted message content
  encryptedContent: string  // Encrypted content
  timestamp: number         // Unix timestamp
  from: string             // Sender address
  to: string               // Recipient address
}
```

### Dialogue

```typescript
interface Dialogue {
  dialogueAddress: string      // Unique dialogue ID
  participants: string[]       // User addresses
  otherUser?: string          // The other participant
  messageCount: number        // Total messages
  lastMessage?: Message       // Last message
  encryptedPrivateKey: string // FHE encrypted key
}
```

### SendMessageResult

```typescript
interface SendMessageResult {
  transactionHash: string  // Transaction hash
  dialogueAddress: string  // Dialogue address
  blockNumber?: number     // Block number
}
```

## Advanced Usage

### Using Modules Directly

The SDK exposes internal modules for advanced use cases:

```typescript
// Access individual modules
sdk.auth       // Authentication module
sdk.keyManager // Key management module
sdk.encryption // Encryption module
sdk.message    // Message module
sdk.dialogue   // Dialogue module
```

### Custom Event Callbacks

```typescript
sdk.setCallbacks({
  onMessageSent: (message) => {
    console.log('Message sent:', message)
  },
  onMessageReceived: (message) => {
    console.log('Message received:', message)
  },
  onError: (error) => {
    console.error('Error:', error)
  }
})
```

## Error Handling

```typescript
try {
  await sdk.sendMessage({
    to: '0x...',
    message: 'Hello!'
  })
} catch (error) {
  if (error.message.includes('password')) {
    console.error('Invalid password')
  } else if (error.message.includes('network')) {
    console.error('Network error')
  } else {
    console.error('Unknown error:', error)
  }
}
```

## Best Practices

1. **Password Management**: Store passwords securely. The SDK does not persist passwords.
2. **Error Handling**: Always wrap SDK calls in try-catch blocks.
3. **Initialization**: Ensure the SDK is initialized before making any calls.
4. **Gas Optimization**: Batch messages when possible to reduce gas costs.
5. **Key Caching**: The SDK caches keys after login for better performance.

## Security Considerations

- **Password Security**: Passwords are used to derive encryption keys. Use strong passwords.
- **Key Storage**: Private keys are encrypted with FHE and stored on-chain.
- **Message Privacy**: All messages are end-to-end encrypted using FHE.
- **No Backend Required**: All encryption/decryption happens client-side.

## Network Support

Currently supports:
-  Sepolia Testnet (default)

Coming soon:
- Ethereum Mainnet
- Other EVM chains

## Examples

Check out the `/front` directory for a complete Vue.js application example using this SDK.

## Troubleshooting

### WASM Loading Issues

If you encounter WASM loading errors in production:

```typescript
// Use CDN URLs explicitly
await initSDK()
```

### Transaction Failures

- Ensure sufficient ETH balance for gas fees
- Check that you're connected to Sepolia testnet
- Verify the contract address is correct

### Decryption Errors

- Verify the password is correct
- Ensure the FHE instance is properly initialized
- Check that WASM modules loaded successfully

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [GitHub Repository](https://github.com/thursdaycapital/zama-whisper)
- [Zama Documentation](https://docs.zama.ai/)
- [Issue Tracker](https://github.com/thursdaycapital/zama-whisper/issues)
- [Website](https://www.zamacommunicationservice.com/)

## Support

For questions and support, please open an issue on GitHub.
