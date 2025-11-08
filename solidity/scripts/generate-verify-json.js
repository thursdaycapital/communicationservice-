const fs = require('fs');
const path = require('path');

// 读取 build-info 文件
const buildInfoDir = path.join(__dirname, '..', 'artifacts', 'build-info');
const buildInfoFiles = fs.readdirSync(buildInfoDir);

if (buildInfoFiles.length === 0) {
  console.error('No build-info files found. Run: npx hardhat compile');
  process.exit(1);
}

// 读取最新的 build-info
const latestBuildInfo = buildInfoFiles.sort().reverse()[0];
const buildInfoPath = path.join(buildInfoDir, latestBuildInfo);
const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));

// 提取 standard JSON input
const standardInput = buildInfo.input;

// 添加必要的编译设置
const verifyInput = {
  language: standardInput.language,
  sources: standardInput.sources,
  settings: {
    ...standardInput.settings,
    outputSelection: {
      "*": {
        "*": [
          "abi",
          "evm.bytecode",
          "evm.deployedBytecode",
          "evm.methodIdentifiers"
        ],
        "": ["ast"]
      }
    }
  }
};

// 输出 JSON
const outputPath = path.join(__dirname, '..', 'standard-input.json');
fs.writeFileSync(outputPath, JSON.stringify(verifyInput, null, 2));

console.log('✅ Standard JSON Input generated successfully!');
console.log('📄 File location:', outputPath);
console.log('\n📋 Constructor Arguments (ABI-encoded):');
console.log('0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000f507269766174655472616e736665720000000000000000000000000000000000');
console.log('\n📝 Contract Name: PrivateTransfer');
console.log('📦 Compiler Version: v0.8.27+commit.40a35a09');
console.log('⚙️  Optimization: Yes, runs: 800');
console.log('🔧 EVM Version: cancun');
console.log('\n🌐 Visit: https://sepolia.etherscan.io/verifyContract?a=0x8ea2dDD9DD550d500B4cef4C560fE27cde37508D');
console.log('\nSelect: "Solidity (Standard Json Input)"');
console.log('Then paste the content of standard-input.json');
