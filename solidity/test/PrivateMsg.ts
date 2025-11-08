import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { PrivateMsg } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import * as CryptoJS from "crypto-js";

type Signers = {
    deployer: HardhatEthersSigner;
    alice: HardhatEthersSigner;
    bob: HardhatEthersSigner;
};

// Helper function to encrypt message with DES
function encryptMessageDES(message: string, key: string): string {
    return CryptoJS.DES.encrypt(message, key).toString();
}

// Helper function to decrypt message with DES
function decryptMessageDES(encryptedMessage: string, key: string): string {
    const bytes = CryptoJS.DES.decrypt(encryptedMessage, key);
    return bytes.toString(CryptoJS.enc.Utf8);
}

async function deployFixture() {
    const factory = await ethers.getContractFactory("PrivateMsg");
    const PrivateMsgContract = await factory.deploy();
    const PrivateMsgContractAddress = await PrivateMsgContract.getAddress();
    return { PrivateMsgContract, PrivateMsgContractAddress };
}

describe("PrivateMsg", function () {
    let signers: Signers;
    let PrivateMsgContract: PrivateMsg;
    let PrivateMsgContractAddress: string;

    before(async function () {
        const ethSigners = await ethers.getSigners();
        signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    });

    beforeEach(async function () {
        if (!fhevm.isMock) {
            console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
            this.skip();
        }
        ({ PrivateMsgContract, PrivateMsgContractAddress } = await deployFixture());
    });

    it("should deploy successfully", async () => {
        expect(await PrivateMsgContract.getAddress()).to.eq(PrivateMsgContractAddress);
    });

    it("should register user with password address", async function () {
        // Generate private key for alice
        const alicePrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.alice.address}d23423lkhsd`));

        // Create wallet from private key and get address
        const alicePasswordWallet = new ethers.Wallet(alicePrivateKey);
        const alicePasswordAddress = alicePasswordWallet.address;

        console.log("Alice address:", signers.alice.address);
        console.log("Alice password address:", alicePasswordAddress);

        // Register alice
        const tx = await PrivateMsgContract.connect(signers.alice).register(alicePasswordAddress);
        await tx.wait();

        // Verify registration
        const registeredAddress = await PrivateMsgContract.getUser(signers.alice.address);
        expect(registeredAddress).to.eq(alicePasswordAddress);
    });

    it("should prevent duplicate registration", async function () {
        // Generate private key and register
        const alicePrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.alice.address}d23423lkhsd`));
        const alicePasswordWallet = new ethers.Wallet(alicePrivateKey);
        const alicePasswordAddress = alicePasswordWallet.address;

        await PrivateMsgContract.connect(signers.alice).register(alicePasswordAddress);

        // Try to register again - should fail
        await expect(
            PrivateMsgContract.connect(signers.alice).register(alicePasswordAddress)
        ).to.be.revertedWith("Already registered");
    });

    it("should send message after registration", async function () {
        // Register alice and bob
        const alicePrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.alice.address}d23423lkhsd`));
        const alicePasswordWallet = new ethers.Wallet(alicePrivateKey);
        const alicePasswordAddress = alicePasswordWallet.address;

        const bobPrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.bob.address}1231231ss`));
        const bobPasswordWallet = new ethers.Wallet(bobPrivateKey);
        const bobPasswordAddress = bobPasswordWallet.address;

        await PrivateMsgContract.connect(signers.alice).register(alicePasswordAddress);
        await PrivateMsgContract.connect(signers.bob).register(bobPasswordAddress);

        // Send message with encrypted private key
        const messagePrivateKey = 12345n;
        const encryptedInput = await fhevm
            .createEncryptedInput(PrivateMsgContractAddress, signers.alice.address)
            .add256(messagePrivateKey)
            .encrypt();

        const plainMessage = "Hello Bob!";
        const desEncryptedMessage = encryptMessageDES(plainMessage, messagePrivateKey.toString());
        const msgContent = ethers.toUtf8Bytes(desEncryptedMessage);

        const tx = await PrivateMsgContract.connect(signers.alice).sendMsg(
            signers.bob.address,
            encryptedInput.handles[0],
            msgContent,
            encryptedInput.inputProof
        );
        await tx.wait();

        // Verify message was stored
        const aliceMsgList = await PrivateMsgContract.getMsgList(signers.alice.address);
        expect(aliceMsgList.length).to.eq(1);
        expect(aliceMsgList[0].msgList.length).to.eq(1);

        console.log("Message sent successfully");
    });

    it("should allow registered user to decrypt dialogue private key", async function () {
        // Register alice and bob
        const alicePrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.alice.address}d23423lkhsd`));
        const alicePasswordWallet = new ethers.Wallet(alicePrivateKey);
        const alicePasswordAddress = alicePasswordWallet.address;

        const bobPrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.bob.address}1231231ss`));
        const bobPasswordWallet = new ethers.Wallet(bobPrivateKey);
        const bobPasswordAddress = bobPasswordWallet.address;

        await PrivateMsgContract.connect(signers.alice).register(alicePasswordAddress);
        await PrivateMsgContract.connect(signers.bob).register(bobPasswordAddress);

        // Send message
        const messagePrivateKey = 99999n;
        const encryptedInput = await fhevm
            .createEncryptedInput(PrivateMsgContractAddress, signers.alice.address)
            .add256(messagePrivateKey)
            .encrypt();

        const plainMessage = "Secret message";
        const desEncryptedMessage = encryptMessageDES(plainMessage, messagePrivateKey.toString());

        await PrivateMsgContract.connect(signers.alice).sendMsg(
            signers.bob.address,
            encryptedInput.handles[0],
            ethers.toUtf8Bytes(desEncryptedMessage),
            encryptedInput.inputProof
        );

        // Bob decrypts the dialogue private key using his password wallet
        const bobMsgList = await PrivateMsgContract.getMsgList(signers.bob.address);
        const encryptedPrivateKey = bobMsgList[0].privateKey;

        // Use bobPasswordWallet to decrypt (not signers.bob)
        const decryptedKey = await fhevm.userDecryptEuint(
            FhevmType.euint256,
            encryptedPrivateKey,
            PrivateMsgContractAddress,
            bobPasswordWallet
        );

        expect(decryptedKey).to.eq(messagePrivateKey);

        // Bob decrypts the message
        const encryptedMsg = ethers.toUtf8String(bobMsgList[0].msgList[0].msgContent);
        const decryptedMessage = decryptMessageDES(encryptedMsg, decryptedKey.toString());

        console.log("Bob decrypted message:", decryptedMessage);
        expect(decryptedMessage).to.eq(plainMessage);
    });

    it("should send message without registration", async function () {
        // Send message without registering first
        const messagePrivateKey = 54321n;
        const encryptedInput = await fhevm
            .createEncryptedInput(PrivateMsgContractAddress, signers.alice.address)
            .add256(messagePrivateKey)
            .encrypt();

        const msgContent = ethers.toUtf8Bytes("Message without registration");

        const tx = await PrivateMsgContract.connect(signers.alice).sendMsg(
            signers.bob.address,
            encryptedInput.handles[0],
            msgContent,
            encryptedInput.inputProof
        );
        await tx.wait();

        // Message should still be stored
        const msgList = await PrivateMsgContract.getMsgList(signers.alice.address);
        expect(msgList.length).to.eq(1);

        console.log("Message sent without registration");
    });

    it("should allow registration after sending message", async function () {
        // Send message first
        const messagePrivateKey = 11111n;
        const encryptedInput = await fhevm
            .createEncryptedInput(PrivateMsgContractAddress, signers.alice.address)
            .add256(messagePrivateKey)
            .encrypt();

        await PrivateMsgContract.connect(signers.alice).sendMsg(
            signers.bob.address,
            encryptedInput.handles[0],
            ethers.toUtf8Bytes("Early message"),
            encryptedInput.inputProof
        );

        // Register after sending
        const alicePrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.alice.address}d23423lkhsd`));
        const alicePasswordWallet = new ethers.Wallet(alicePrivateKey);
        const alicePasswordAddress = alicePasswordWallet.address;

        const tx = await PrivateMsgContract.connect(signers.alice).register(alicePasswordAddress);
        await tx.wait();

        // Verify registration
        const registeredAddress = await PrivateMsgContract.getUser(signers.alice.address);
        expect(registeredAddress).to.eq(alicePasswordAddress);

        console.log("Registration after message successful");
    });

    it("should support full workflow: register, send, decrypt", async function () {
        // Step 1: Generate password wallets for alice and bob
        const alicePrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.alice.address}d23423lkhsd`));
        const alicePasswordWallet = new ethers.Wallet(alicePrivateKey);
        const alicePasswordAddress = alicePasswordWallet.address;

        const bobPrivateKey = ethers.keccak256(ethers.toUtf8Bytes(`${signers.bob.address}1231231ss`));
        const bobPasswordWallet = new ethers.Wallet(bobPrivateKey);
        const bobPasswordAddress = bobPasswordWallet.address;

        console.log("Alice password address:", alicePasswordAddress);
        console.log("Bob password address:", bobPasswordAddress);

        // Step 2: Register both users
        await PrivateMsgContract.connect(signers.alice).register(alicePasswordAddress);
        await PrivateMsgContract.connect(signers.bob).register(bobPasswordAddress);

        // Step 3: Alice sends encrypted message to Bob
        const messagePrivateKey = 88888n;
        const plainMessage = "Hello Bob, this is a secret message!";
        const desEncryptedMessage = encryptMessageDES(plainMessage, messagePrivateKey.toString());

        const encryptedInput = await fhevm
            .createEncryptedInput(PrivateMsgContractAddress, signers.alice.address)
            .add256(messagePrivateKey)
            .encrypt();

        await PrivateMsgContract.connect(signers.alice).sendMsg(
            signers.bob.address,
            encryptedInput.handles[0],
            ethers.toUtf8Bytes(desEncryptedMessage),
            encryptedInput.inputProof
        );

        // Step 4: Bob retrieves and decrypts the message
        const bobMsgList = await PrivateMsgContract.getMsgList(signers.bob.address);
        expect(bobMsgList.length).to.eq(1);

        const dialoguePrivateKey = bobMsgList[0].privateKey;
        const decryptedKey = await fhevm.userDecryptEuint(
            FhevmType.euint256,
            dialoguePrivateKey,
            PrivateMsgContractAddress,
            bobPasswordWallet
        );

        expect(decryptedKey).to.eq(messagePrivateKey);

        const encryptedMsg = ethers.toUtf8String(bobMsgList[0].msgList[0].msgContent);
        const decryptedMessage = decryptMessageDES(encryptedMsg, decryptedKey.toString());

        console.log("Original message:", plainMessage);
        console.log("Bob decrypted message:", decryptedMessage);
        expect(decryptedMessage).to.eq(plainMessage);

        // Step 5: Bob replies
        const bobReply = "Hi Alice, message received!";
        const bobDesEncrypted = encryptMessageDES(bobReply, messagePrivateKey.toString());

        const encryptedInput2 = await fhevm
            .createEncryptedInput(PrivateMsgContractAddress, signers.bob.address)
            .add256(messagePrivateKey)
            .encrypt();

        await PrivateMsgContract.connect(signers.bob).sendMsg(
            signers.alice.address,
            encryptedInput2.handles[0],
            ethers.toUtf8Bytes(bobDesEncrypted),
            encryptedInput2.inputProof
        );

        // Step 6: Alice reads Bob's reply
        const aliceMsgList = await PrivateMsgContract.getMsgList(signers.alice.address);
        expect(aliceMsgList[0].msgList.length).to.eq(2);

        const aliceDecryptedKey = await fhevm.userDecryptEuint(
            FhevmType.euint256,
            aliceMsgList[0].privateKey,
            PrivateMsgContractAddress,
            alicePasswordWallet
        );

        const bobEncryptedMsg = ethers.toUtf8String(aliceMsgList[0].msgList[1].msgContent);
        const bobDecryptedMsg = decryptMessageDES(bobEncryptedMsg, aliceDecryptedKey.toString());

        console.log("Bob's reply:", bobDecryptedMsg);
        expect(bobDecryptedMsg).to.eq(bobReply);
    });
});
