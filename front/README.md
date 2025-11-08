# Zama Private Chat - Frontend

A decentralized messaging DApp built with Vue 3, featuring end-to-end encryption powered by Zama's FHE (Fully Homomorphic Encryption) technology.

## Features

- 🔐 **End-to-End Encrypted**: Messages are encrypted using FHE technology
- ⛓️ **On-Chain**: All messages stored securely on Ethereum blockchain
- 🛡️ **Privacy First**: Only you and your recipient can read the messages
- 🎨 **Modern UI**: Dark theme with beautiful Web3 styling
- 📱 **Responsive**: Works on desktop and mobile devices

## Prerequisites

- Node.js >= 18
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH (for gas fees)

## Installation

1. Install dependencies:
```bash
cd front
npm install
```

2. Make sure the SDK is built:
```bash
cd ../sdk
npm run build
cd ../front
```

3. WalletConnect is pre-configured:
   - The project uses `@web3modal/ethers/vue` for wallet connection
   - A demo Project ID is included (for development only)
   - For production, get your own Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Update `src/stores/wallet.ts` line 12 with your Project ID

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage Guide

### 1. Connect Wallet
- Click "Connect Wallet" button
- Approve the connection in your Web3 wallet
- Make sure you're on Sepolia testnet

### 2. Register/Login
- If you're a new user, create a password (minimum 8 characters)
- If you're returning, enter your password
- **Important**: Your password encrypts your private keys and cannot be recovered!

### 3. Start Chatting
- Click the "+" button to start a new chat
- Enter the recipient's Ethereum address
- Type your message and press Enter to send

### 4. View Messages
- Your conversations appear in the left sidebar
- Click on a conversation to view messages
- Messages are automatically decrypted using your password

## Architecture

```
front/
├── src/
│   ├── assets/          # Global styles and assets
│   ├── components/      # Vue components
│   │   ├── WalletConnect.vue    # Wallet connection
│   │   ├── LoginModal.vue       # Login/Register modal
│   │   ├── ContactList.vue      # Conversation list
│   │   └── ChatBox.vue          # Message interface
│   ├── stores/          # Pinia state management
│   │   ├── wallet.ts    # Wallet state
│   │   └── sdk.ts       # SDK state
│   ├── types/           # TypeScript definitions
│   ├── App.vue          # Main app component
│   └── main.ts          # Application entry point
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Technology Stack

- **Vue 3**: Progressive JavaScript framework
- **TypeScript**: Type-safe development
- **Pinia**: State management
- **Vite**: Fast build tool
- **Ethers.js**: Ethereum library
- **Web3Modal**: Wallet connection
- **Zama SDK**: FHE encryption
- **Custom SDK**: Private messaging logic

## Security Notes

⚠️ **Important Security Considerations**:

1. **Password Protection**: Your password encrypts your private keys. Losing it means losing access to your messages forever.
2. **Testnet Only**: This is currently configured for Sepolia testnet. Do NOT use on mainnet without proper audits.
3. **No Backend**: All data is stored on-chain. Be mindful of gas costs and blockchain limitations.
4. **Privacy**: While messages are encrypted, transaction data (sender, recipient addresses) is publicly visible on the blockchain.

## Troubleshooting

### "Failed to initialize SDK"
- Make sure you're connected to Sepolia testnet
- Check that you have enough testnet ETH
- Try refreshing the page

### "Cannot find module 'zama-whisper'"
- Make sure the SDK is built: `cd ../sdk && npm run build`
- Re-install dependencies: `npm install`

### Web3Modal errors
- Make sure you've configured your WalletConnect Project ID
- Check that your wallet extension is installed and unlocked

## Development Tips

- Use browser DevTools to inspect store state (Vue DevTools)
- Check console for detailed error messages
- Use MetaMask's test networks for development

## License

MIT

## Links

- [Zama](https://www.zama.ai/)
- [Documentation](https://docs.zama.ai/)
