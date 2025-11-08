# PrivateMsg SDK 设计文档

## 1. 合约概述

PrivateMsg 是一个基于 Zama FHE (Fully Homomorphic Encryption) 的链上加密消息系统。它结合了 FHE 和 DES 加密技术，实现了端到端加密的消息传递。

### 核心特性
- 用户可以使用密码派生地址注册账户
- 消息内容使用 DES 加密
- 对话私钥使用 FHE 加密存储在链上
- 只有对话双方可以解密消息
- 支持双向通信和多人对话

## 2. 核心概念

### 2.1 三层地址体系

1. **用户地址 (User Address)**
   - 用户的钱包地址
   - 用于发送交易、支付 gas

2. **密码地址 (Password Address)**
   - 通过用户输入的密码派生的地址
   - 公式：`keccak256(userAddress + userPassword)` → 私钥 → 地址
   - 用于解密对话私钥（FHE 授权）

3. **对话地址 (Dialogue Address)**
   - 两个用户之间唯一的对话标识
   - 公式：`keccak256(address0, address1, CODE_HASH)`（地址排序后）

### 2.2 双层加密机制

```
明文消息
    ↓ DES 加密（使用对话私钥明文）
DES 加密的消息 → 存储在链上
    ↑
对话私钥（明文）
    ↓ FHE 加密
FHE 加密的对话私钥 → 存储在链上
    ↓ FHE 解密（需要密码地址授权）
对话私钥（明文）
```

### 2.3 工作流程

#### 用户注册流程
```
用户输入密码
    ↓
生成密码私钥 = keccak256(userAddress + password)
    ↓
派生密码地址 = Wallet(密码私钥).address
    ↓
调用 register(passwordAddress)
    ↓
合约授权 passwordAddress 访问所有对话私钥
```

#### 发送消息流程
```
Alice 发送消息给 Bob
    ↓
生成对话地址 = getMsgID(Alice, Bob)
    ↓
第一条消息？
    ├─ 是：生成对话私钥（随机数）
    │      ↓ FHE 加密
    │      存储到 dialoguePrivateKeys[对话地址]
    │      授权给 Alice 和 Bob 的 passwordAddress
    └─ 否：使用已有的对话私钥
    ↓
用对话私钥（明文）DES 加密消息内容
    ↓
提交交易：sendMsg(to, fheEncryptedKey, desEncryptedMsg, proof)
    ↓
消息存储在 dialogue[对话地址]
```

#### 读取消息流程
```
Bob 读取消息
    ↓
调用 getMsgList(Bob) 获取所有对话
    ↓
遍历每个对话：
    ├─ 获取 FHE 加密的对话私钥
    ├─ 使用密码钱包解密对话私钥
    ├─ 使用对话私钥 DES 解密每条消息
    └─ 返回明文消息列表
```

## 3. SDK 架构设计

### 3.1 模块划分

```
PrivateMsgSDK
├── AuthModule          # 认证模块
├── KeyManager          # 密钥管理
├── MessageModule       # 消息收发
├── EncryptionModule    # 加密/解密
└── ContractInterface   # 合约交互
```

### 3.2 核心类设计

#### 3.2.1 SDK 主类

```typescript
class PrivateMsgSDK {
    constructor(
        provider: Provider,
        contractAddress: string,
        signer?: Signer
    )

    // 设置用户钱包
    setSigner(signer: Signer): void

    // 认证相关
    auth: AuthModule

    // 消息相关
    message: MessageModule

    // 对话相关
    dialogue: DialogueModule
}
```

#### 3.2.2 认证模块

```typescript
class AuthModule {
    // 注册用户（使用密码派生地址）
    async register(password: string): Promise<TransactionReceipt>

    // 检查用户是否已注册
    async isRegistered(userAddress: string): Promise<boolean>

    // 获取密码地址
    async getPasswordAddress(userAddress: string): Promise<string>

    // 本地生成密码钱包（不上链）
    generatePasswordWallet(
        userAddress: string,
        password: string
    ): Wallet

    // 验证密码（通过对比密码地址）
    async verifyPassword(
        userAddress: string,
        password: string
    ): Promise<boolean>
}
```

#### 3.2.3 密钥管理模块

```typescript
class KeyManager {
    // 生成随机对话私钥
    generateDialogueKey(): bigint

    // FHE 加密对话私钥
    async encryptDialogueKey(
        key: bigint,
        contractAddress: string,
        userAddress: string
    ): Promise<EncryptedInput>

    // FHE 解密对话私钥
    async decryptDialogueKey(
        encryptedKey: string,
        contractAddress: string,
        passwordWallet: Wallet
    ): Promise<bigint>

    // 计算对话地址
    getDialogueAddress(
        address1: string,
        address2: string
    ): string

    // 缓存解密后的对话私钥（可选）
    cacheDialogueKey(dialogueAddress: string, key: bigint): void
    getCachedDialogueKey(dialogueAddress: string): bigint | null
}
```

#### 3.2.4 消息模块

```typescript
interface Message {
    content: string          // 明文内容
    encryptedContent: string // 加密内容
    timestamp: number
    from: string            // 发送者地址
    to: string             // 接收者地址
}

class MessageModule {
    // 发送消息
    async sendMessage(
        to: string,
        message: string,
        dialogueKey?: bigint  // 可选，首次发送需要生成
    ): Promise<{
        tx: TransactionReceipt
        dialogueAddress: string
    }>

    // 获取用户所有对话列表
    async getDialogues(
        userAddress: string
    ): Promise<Dialogue[]>

    // 获取指定对话的所有消息
    async getMessages(
        dialogueAddress: string,
        password: string
    ): Promise<Message[]>

    // 获取与指定用户的对话
    async getDialogueWith(
        otherUser: string,
        password: string
    ): Promise<{
        dialogueAddress: string
        messages: Message[]
    }>

    // 监听新消息
    onNewMessage(
        callback: (message: Message) => void
    ): EventUnsubscribe
}
```

#### 3.2.5 对话模块

```typescript
interface Dialogue {
    dialogueAddress: string
    participants: string[]  // 参与者地址
    messageCount: number
    lastMessage?: Message
    encryptedPrivateKey: string
}

class DialogueModule {
    // 获取对话详情
    async getDialogue(
        dialogueAddress: string
    ): Promise<Dialogue>

    // 列出用户的所有对话
    async listUserDialogues(
        userAddress: string
    ): Promise<Dialogue[]>

    // 解析对话参与者（从对话地址反推）
    // 注意：这个需要链下数据库支持，因为合约不存储参与者列表
    async getParticipants(
        dialogueAddress: string
    ): Promise<string[]>
}
```

#### 3.2.6 加密模块

```typescript
class EncryptionModule {
    // DES 加密
    encryptMessageDES(
        message: string,
        key: string
    ): string

    // DES 解密
    decryptMessageDES(
        encryptedMessage: string,
        key: string
    ): string

    // 批量解密消息
    decryptMessages(
        messages: EncryptedMessage[],
        key: bigint
    ): Message[]
}
```

## 4. SDK 使用示例

### 4.1 初始化 SDK

```typescript
import { PrivateMsgSDK } from '@zama-msg/sdk'
import { ethers } from 'ethers'

// 连接到区块链
const provider = new ethers.JsonRpcProvider('http://localhost:8545')
const signer = await provider.getSigner()

// 初始化 SDK
const sdk = new PrivateMsgSDK(
    provider,
    '0x...contractAddress',
    signer
)
```

### 4.2 用户注册

```typescript
// 用户输入密码
const password = 'mySecurePassword123'

// 注册账户
const receipt = await sdk.auth.register(password)
console.log('Registered successfully:', receipt.hash)

// 检查是否已注册
const isRegistered = await sdk.auth.isRegistered(signer.address)
console.log('Is registered:', isRegistered)
```

### 4.3 发送消息

```typescript
// 发送第一条消息（会自动生成对话私钥）
const result = await sdk.message.sendMessage(
    '0x...bobAddress',
    'Hello Bob, this is Alice!'
)

console.log('Message sent, dialogue address:', result.dialogueAddress)

// 发送后续消息（使用已有对话私钥）
await sdk.message.sendMessage(
    '0x...bobAddress',
    'How are you?'
)
```

### 4.4 读取消息

```typescript
// 获取所有对话
const dialogues = await sdk.message.getDialogues(signer.address)
console.log('Total dialogues:', dialogues.length)

// 获取与特定用户的对话
const password = 'mySecurePassword123'
const { dialogueAddress, messages } = await sdk.message.getDialogueWith(
    '0x...aliceAddress',
    password
)

// 打印消息
messages.forEach(msg => {
    console.log(`[${new Date(msg.timestamp * 1000).toLocaleString()}]`)
    console.log(`From: ${msg.from}`)
    console.log(`Message: ${msg.content}`)
    console.log('---')
})
```

### 4.5 监听新消息

```typescript
// 监听新消息事件
const unsubscribe = sdk.message.onNewMessage(async (message) => {
    console.log('New message received!')
    console.log('From:', message.from)

    // 解密消息
    const password = 'mySecurePassword123'
    const dialogueAddress = await sdk.keyManager.getDialogueAddress(
        message.from,
        signer.address
    )

    const passwordWallet = sdk.auth.generatePasswordWallet(
        signer.address,
        password
    )

    const key = await sdk.keyManager.decryptDialogueKey(
        message.encryptedContent,
        contractAddress,
        passwordWallet
    )

    const content = sdk.encryption.decryptMessageDES(
        message.encryptedContent,
        key.toString()
    )

    console.log('Content:', content)
})

// 取消监听
// unsubscribe()
```

### 4.6 完整示例：双向对话

```typescript
async function chatExample() {
    // Alice 初始化
    const aliceSigner = await provider.getSigner(0)
    const aliceSDK = new PrivateMsgSDK(provider, contractAddress, aliceSigner)
    const alicePassword = 'alicePassword123'

    // Bob 初始化
    const bobSigner = await provider.getSigner(1)
    const bobSDK = new PrivateMsgSDK(provider, contractAddress, bobSigner)
    const bobPassword = 'bobPassword456'

    // 注册
    await aliceSDK.auth.register(alicePassword)
    await bobSDK.auth.register(bobPassword)

    // Alice 发送消息给 Bob
    await aliceSDK.message.sendMessage(
        bobSigner.address,
        'Hi Bob, how are you?'
    )

    // Bob 读取消息
    const bobMessages = await bobSDK.message.getDialogueWith(
        aliceSigner.address,
        bobPassword
    )
    console.log('Bob received:', bobMessages.messages[0].content)

    // Bob 回复
    await bobSDK.message.sendMessage(
        aliceSigner.address,
        'Hi Alice, I am fine!'
    )

    // Alice 读取回复
    const aliceMessages = await aliceSDK.message.getDialogueWith(
        bobSigner.address,
        alicePassword
    )
    console.log('Alice received:', aliceMessages.messages[1].content)
}
```

## 5. 高级功能

### 5.1 密钥缓存策略

为了避免每次读取消息都需要 FHE 解密（消耗资源），可以实现密钥缓存：

```typescript
class KeyCache {
    private cache: Map<string, bigint> = new Map()
    private ttl: number = 3600000 // 1小时

    set(dialogueAddress: string, key: bigint): void {
        this.cache.set(dialogueAddress, key)

        // 设置过期时间
        setTimeout(() => {
            this.cache.delete(dialogueAddress)
        }, this.ttl)
    }

    get(dialogueAddress: string): bigint | null {
        return this.cache.get(dialogueAddress) || null
    }

    clear(): void {
        this.cache.clear()
    }
}
```

### 5.2 批量消息处理

```typescript
class MessageModule {
    async sendBatchMessages(
        recipients: string[],
        message: string
    ): Promise<TransactionReceipt[]> {
        const promises = recipients.map(to =>
            this.sendMessage(to, message)
        )
        return Promise.all(promises)
    }

    async getAllMessages(
        password: string
    ): Promise<Map<string, Message[]>> {
        const dialogues = await this.getDialogues(this.signer.address)
        const result = new Map<string, Message[]>()

        for (const dialogue of dialogues) {
            const messages = await this.getMessages(
                dialogue.dialogueAddress,
                password
            )
            result.set(dialogue.dialogueAddress, messages)
        }

        return result
    }
}
```

### 5.3 离线消息加密

用户可以在离线状态下准备消息，稍后再发送：

```typescript
interface OfflineMessage {
    to: string
    encryptedContent: string
    dialogueKey: bigint
    timestamp: number
}

class MessageModule {
    // 准备离线消息
    prepareOfflineMessage(
        to: string,
        message: string,
        dialogueKey?: bigint
    ): OfflineMessage {
        const key = dialogueKey || this.keyManager.generateDialogueKey()
        const encrypted = this.encryption.encryptMessageDES(
            message,
            key.toString()
        )

        return {
            to,
            encryptedContent: encrypted,
            dialogueKey: key,
            timestamp: Date.now()
        }
    }

    // 发送离线消息
    async sendOfflineMessage(
        offlineMsg: OfflineMessage
    ): Promise<TransactionReceipt> {
        // FHE 加密对话私钥
        const encryptedKey = await this.keyManager.encryptDialogueKey(
            offlineMsg.dialogueKey,
            this.contractAddress,
            this.signer.address
        )

        // 发送到合约
        return this.sendMessage(offlineMsg.to, offlineMsg.encryptedContent)
    }
}
```

## 6. 错误处理

### 6.1 常见错误类型

```typescript
enum ErrorCode {
    NOT_REGISTERED = 'NOT_REGISTERED',
    INVALID_PASSWORD = 'INVALID_PASSWORD',
    DECRYPTION_FAILED = 'DECRYPTION_FAILED',
    DIALOGUE_NOT_FOUND = 'DIALOGUE_NOT_FOUND',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    INSUFFICIENT_GAS = 'INSUFFICIENT_GAS'
}

class PrivateMsgError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public details?: any
    ) {
        super(message)
        this.name = 'PrivateMsgError'
    }
}
```

### 6.2 错误处理示例

```typescript
try {
    const messages = await sdk.message.getDialogueWith(
        '0x...address',
        'password'
    )
} catch (error) {
    if (error instanceof PrivateMsgError) {
        switch (error.code) {
            case ErrorCode.NOT_REGISTERED:
                console.error('User not registered')
                // 引导用户注册
                break
            case ErrorCode.INVALID_PASSWORD:
                console.error('Invalid password')
                // 提示用户重新输入
                break
            case ErrorCode.DECRYPTION_FAILED:
                console.error('Failed to decrypt message')
                // 密钥可能已过期或损坏
                break
            default:
                console.error('Unknown error:', error.message)
        }
    } else {
        console.error('Unexpected error:', error)
    }
}
```

## 7. 性能优化建议

### 7.1 减少链上查询

```typescript
class MessageCache {
    private dialogueCache: Map<string, Dialogue> = new Map()

    async getDialogue(
        dialogueAddress: string,
        forceRefresh = false
    ): Promise<Dialogue> {
        if (!forceRefresh && this.dialogueCache.has(dialogueAddress)) {
            return this.dialogueCache.get(dialogueAddress)!
        }

        const dialogue = await this.fetchFromChain(dialogueAddress)
        this.dialogueCache.set(dialogueAddress, dialogue)
        return dialogue
    }
}
```

### 7.2 批量操作

```typescript
// 批量获取对话信息
async getMultipleDialogues(
    dialogueAddresses: string[]
): Promise<Dialogue[]> {
    // 使用 multicall 模式一次性获取
    const contract = this.getContract()

    const calls = dialogueAddresses.map(addr =>
        contract.dialogue.staticCall(addr)
    )

    return Promise.all(calls)
}
```

### 7.3 惰性加载消息

```typescript
interface PaginatedMessages {
    messages: Message[]
    hasMore: boolean
    nextCursor: number
}

async getMessagesPaginated(
    dialogueAddress: string,
    password: string,
    limit = 20,
    cursor = 0
): Promise<PaginatedMessages> {
    const allMessages = await this.getMessages(dialogueAddress, password)
    const start = cursor
    const end = cursor + limit

    return {
        messages: allMessages.slice(start, end),
        hasMore: end < allMessages.length,
        nextCursor: end
    }
}
```

## 8. 安全建议

### 8.1 密码管理

1. **不要在代码中硬编码密码**
2. **使用安全的密码存储方案**（如 KeyStore、硬件钱包）
3. **考虑实现密码强度检查**

```typescript
class PasswordValidator {
    static readonly MIN_LENGTH = 8

    static validate(password: string): {
        valid: boolean
        errors: string[]
    } {
        const errors: string[] = []

        if (password.length < this.MIN_LENGTH) {
            errors.push(`Password must be at least ${this.MIN_LENGTH} characters`)
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain uppercase letter')
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain lowercase letter')
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain number')
        }

        return {
            valid: errors.length === 0,
            errors
        }
    }
}
```

### 8.2 密钥生成

```typescript
// 使用更安全的密钥派生
class SecureKeyDerivation {
    static derivePasswordKey(
        userAddress: string,
        password: string,
        salt?: string
    ): string {
        // 使用 PBKDF2 或类似算法增强安全性
        const combinedSalt = salt || userAddress
        // 注意：这里简化了，实际应使用 PBKDF2
        return ethers.keccak256(
            ethers.toUtf8Bytes(`${combinedSalt}${password}`)
        )
    }
}
```

### 8.3 会话管理

```typescript
class SessionManager {
    private sessionKey: string | null = null
    private sessionExpiry: number = 0

    startSession(password: string, duration = 3600000): void {
        this.sessionKey = password
        this.sessionExpiry = Date.now() + duration
    }

    isSessionValid(): boolean {
        return this.sessionKey !== null && Date.now() < this.sessionExpiry
    }

    getSessionKey(): string | null {
        if (!this.isSessionValid()) {
            this.endSession()
            return null
        }
        return this.sessionKey
    }

    endSession(): void {
        this.sessionKey = null
        this.sessionExpiry = 0
    }
}
```

## 9. 测试建议

### 9.1 单元测试

```typescript
describe('PrivateMsgSDK', () => {
    describe('AuthModule', () => {
        it('should register user successfully', async () => {
            const receipt = await sdk.auth.register('password123')
            expect(receipt).toBeDefined()
        })

        it('should prevent duplicate registration', async () => {
            await sdk.auth.register('password123')
            await expect(
                sdk.auth.register('password123')
            ).rejects.toThrow('Already registered')
        })
    })

    describe('MessageModule', () => {
        it('should send and receive message', async () => {
            const result = await sdk.message.sendMessage(
                bobAddress,
                'Hello'
            )
            expect(result.dialogueAddress).toBeDefined()

            const messages = await sdk.message.getDialogueWith(
                aliceAddress,
                'password'
            )
            expect(messages.messages[0].content).toBe('Hello')
        })
    })
})
```

## 10. 部署与分发

### 10.1 NPM 包结构

```
@zama-msg/sdk/
├── src/
│   ├── modules/
│   │   ├── auth.ts
│   │   ├── message.ts
│   │   ├── dialogue.ts
│   │   ├── encryption.ts
│   │   └── keyManager.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── index.ts
├── dist/
├── package.json
└── README.md
```

### 10.2 package.json

```json
{
  "name": "@zama-msg/sdk",
  "version": "1.0.0",
  "description": "SDK for PrivateMsg encrypted messaging system",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublish": "npm run build"
  },
  "dependencies": {
    "ethers": "^6.0.0",
    "@fhevm/hardhat-plugin": "^0.1.0",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}
```

## 11. 文档和示例

建议提供：
1. **快速开始指南**
2. **完整 API 文档**
3. **集成示例**（React、Vue、Node.js）
4. **常见问题解答**
5. **最佳实践指南**

---

## 附录：合约接口参考

```solidity
// 注册用户
function register(address passwordAddress) external

// 获取用户密码地址
function getUser(address user) public view returns (address)

// 发送消息
function sendMsg(
    address to,
    externalEuint256 _privateKey,
    bytes memory msgContent,
    bytes memory inputProof
) external

// 获取对话ID
function getMsgID(address tokenA, address tokenB) public pure returns (address)

// 获取用户消息列表
function getMsgList(address user) public view returns (MSGList[] memory)

// 获取对话私钥
function dialoguePrivateKeys(address dialogueAddress) public view returns (euint256)

// 获取对话消息
function dialogue(address dialogueAddress) public view returns (MSG[] memory)

// 获取用户对话地址列表
function userMsg(address user) public view returns (address[] memory)
```
