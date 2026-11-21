// Deploy MockAgentID + AgentStreak to BSC testnet (chainId 97).
// NEVER mainnet. Deployer key comes ONLY from env var TESTNET_PRIVATE_KEY.
// If the env var is empty, this script prints instructions and stops —
// it never generates or stores a key on its own.
// Run: TESTNET_PRIVATE_KEY=0x... node scripts/deploy-testnet.js
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC = "https://bsc-testnet.publicnode.com";
const CHAIN_ID = 97;

async function main() {
  const pk = process.env.TESTNET_PRIVATE_KEY;
  if (!pk) {
    console.log("STOP: TESTNET_PRIVATE_KEY env var is empty.");
    console.log("This script needs a BSC TESTNET deployer key (testnet only, never mainnet).");
    console.log("Get free tBNB from the BSC testnet faucet: https://testnet.bnbchain.org/faucet-smart");
    console.log("Then run: TESTNET_PRIVATE_KEY=0x<your-testnet-key> node scripts/deploy-testnet.js");
    console.log("Do NOT use a mainnet wallet key here. Use a fresh testnet-only key.");
    process.exit(2);
  }
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(pk, provider);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== CHAIN_ID) throw new Error(`Wrong chain: ${net.chainId}, expected ${CHAIN_ID}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} tBNB`);
  if (balance === 0n) {
    console.log("BLOCKER: deployer balance is 0 tBNB — cannot deploy.");
    console.log("Fund this testnet address from https://testnet.bnbchain.org/faucet-smart and re-run.");
    process.exit(3);
  }

  const ART = path.join(__dirname, "..", "contracts", "artifacts");
  const mockArt = JSON.parse(fs.readFileSync(path.join(ART, "MockAgentID.json"), "utf8"));
  const streakArt = JSON.parse(fs.readFileSync(path.join(ART, "AgentStreak.json"), "utf8"));

  const mock = await new ethers.ContractFactory(mockArt.abi, mockArt.bytecode, wallet).deploy();
  await mock.waitForDeployment();
  const mockAddr = await mock.getAddress();
  console.log(`MockAgentID deployed: ${mockAddr} (tx ${mock.deploymentTransaction().hash})`);

  const streak = await new ethers.ContractFactory(streakArt.abi, streakArt.bytecode, wallet).deploy(mockAddr);
  await streak.waitForDeployment();
  const streakAddr = await streak.getAddress();
  console.log(`AgentStreak deployed: ${streakAddr} (tx ${streak.deploymentTransaction().hash})`);
  console.log(`AgentStreak registry (mock): ${mockAddr}`);
  console.log(`Verify on BscScan testnet: https://testnet.bscscan.com/address/${streakAddr}`);
}

main().catch((e) => { console.error("DEPLOY FAILED:", e.message); process.exit(1); });
