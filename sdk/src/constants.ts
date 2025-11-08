/**
 * Constants and configurations
 */

import { SepoliaConfig } from '@zama-fhe/relayer-sdk/web';

/**
 * Default contract address on Sepolia
 */
export const DEFAULT_CONTRACT_ADDRESS = '0x20B07c168EfF2D2629dA8b8A38e4a43a8882c3d3';

/**
 * Default RPC URL
 */
export const DEFAULT_RPC_URL = 'https://1rpc.io/sepolia';

/**
 * Blackhole address for type 2 deposits (anyone with password)
 */
export const BLACKHOLE_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * CODE_HASH used in dialogue address calculation
 * Must match the CODE_HASH constant in PrivateMsg.sol contract
 */
export const CODE_HASH = '0x326792ea9981945c5ee81b1b459d2a986cc13aba6f9335ce16b6dd2e2823f496';

/**
 * Sepolia FHE Configuration (imported from Zama SDK)
 */
export const SEPOLIA_FHE_CONFIG = SepoliaConfig;

/**
 * Contract ABI
 */
export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "dialogue",
    "outputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "msgContent",
        "type": "bytes"
      },
      {
        "internalType": "uint256",
        "name": "time",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "dialoguePrivateKeys",
    "outputs": [
      {
        "internalType": "euint256",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "dialogueAddresses",
        "type": "address"
      }
    ],
    "name": "getMsgDetail",
    "outputs": [
      {
        "components": [
          {
            "internalType": "euint256",
            "name": "privateKey",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "dialogueAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "from",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "to",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "msgContent",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "time",
                "type": "uint256"
              }
            ],
            "internalType": "struct PrivateMsg.MSG[]",
            "name": "msgList",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct PrivateMsg.MSGList",
        "name": "_msg",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      }
    ],
    "name": "getMsgID",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getMsgList",
    "outputs": [
      {
        "components": [
          {
            "internalType": "euint256",
            "name": "privateKey",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "dialogueAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "from",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "to",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "msgContent",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "time",
                "type": "uint256"
              }
            ],
            "internalType": "struct PrivateMsg.MSG[]",
            "name": "msgList",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct PrivateMsg.MSGList[]",
        "name": "msgList",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUser",
    "outputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "passwordAddress",
        "type": "address"
      }
    ],
    "name": "register",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "externalEuint256",
        "name": "_privateKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "msgContent",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "sendMsg",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userMsg",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
