// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {FHE, ebool, eaddress, euint256, externalEaddress, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivateMsg is SepoliaConfig {
    bytes32 constant CODE_HASH = 0x326792ea9981945c5ee81b1b459d2a986cc13aba6f9335ce16b6dd2e2823f496;
    struct MSG {
        address from;
        address to;
        bytes msgContent;
        uint256 time;
    }
    struct MSGList {
        euint256 privateKey;
        address dialogueAddress;
        address from;
        address to;
        MSG[] msgList;
    }
    mapping(address => MSG[]) public dialogue;
    mapping(address => address[]) public userMsg;
    mapping(address => euint256) public dialoguePrivateKeys;
    mapping(address => address) private userList;

    function getMsgID(address tokenA, address tokenB) public pure returns (address) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        return address(uint160(uint256(keccak256(abi.encodePacked(token0, token1, CODE_HASH)))));
    }

    function register(address passwordAddress) external {
        require(userList[msg.sender] == address(0), "Already registered");
        userList[msg.sender] = passwordAddress;
        address[] memory dialogueAddresses = userMsg[msg.sender];
        for (uint256 i = 0; i < dialogueAddresses.length; i++) {
            FHE.allow(dialoguePrivateKeys[dialogueAddresses[i]], passwordAddress);
        }
    }

    function getUser(address user) public view returns (address _user) {
        _user = userList[user];
    }

    function sendMsg(
        address to,
        externalEuint256 _privateKey,
        bytes memory msgContent,
        bytes memory inputProof
    ) external {
        address dialogueAddress = getMsgID(msg.sender, to);

        if (dialogue[dialogueAddress].length == 0) {
            euint256 privateKey = FHE.fromExternal(_privateKey, inputProof);
            FHE.allowThis(privateKey);
            if (userList[msg.sender] != address(0)) {
                FHE.allow(privateKey, userList[msg.sender]);
            }
            if (userList[to] != address(0)) {
                FHE.allow(privateKey, userList[to]);
            }
            dialoguePrivateKeys[dialogueAddress] = privateKey;
        }
        dialogue[dialogueAddress].push(MSG({msgContent: msgContent, time: block.timestamp, from: msg.sender, to: to}));
        address[] memory senderDialogueAddresses = userMsg[msg.sender];
        address[] memory toDialogueAddresses = userMsg[to];
        bool hasSenderAddress = false;
        bool hasToAddress = false;
        for (uint256 i = 0; i < senderDialogueAddresses.length; i++) {
            if (senderDialogueAddresses[i] == dialogueAddress) {
                hasSenderAddress = true;
            }
        }
        for (uint256 i = 0; i < toDialogueAddresses.length; i++) {
            if (toDialogueAddresses[i] == dialogueAddress) {
                hasToAddress = true;
            }
        }
        if (!hasSenderAddress) {
            userMsg[msg.sender].push(dialogueAddress);
        }
        if (!hasToAddress) {
            userMsg[to].push(dialogueAddress);
        }
    }

    function getMsgDetail(address dialogueAddresses) public view returns (MSGList memory _msg) {
        _msg.privateKey = dialoguePrivateKeys[dialogueAddresses];
        _msg.dialogueAddress = dialogueAddresses;
        _msg.msgList = dialogue[dialogueAddresses];
    }

    function getMsgList(address user) public view returns (MSGList[] memory msgList) {
        address[] memory dialogueAddresses = userMsg[user];
        msgList = new MSGList[](dialogueAddresses.length);
        for (uint256 i = 0; i < dialogueAddresses.length; i++) {
            msgList[i].privateKey = dialoguePrivateKeys[dialogueAddresses[i]];
            msgList[i].dialogueAddress = dialogueAddresses[i];
            msgList[i].msgList = dialogue[dialogueAddresses[i]];
            if (msgList[i].msgList.length > 0) {
                msgList[i].from = msgList[i].msgList[0].from;
                msgList[i].to = msgList[i].msgList[0].to;
            }
        }
    }
}
