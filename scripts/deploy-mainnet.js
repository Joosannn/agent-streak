// Deploy AgentStreak to BSC MAINNET (chainId 56) from fund EOA 0x6946.
// User approved option A (switch deployer from agentic to fund EOA) 19 Nov 2026.
// Key is read ONLY from ~/workspace/wallets/fund-0x6946.json (chmod 600).
// The key is NEVER printed or logged.
// Safety gates: chainId must be 56, deployer must be 0x6946..., balance >= 0.001 BNB,
// gas estimate < 1,000,000, gasPrice <= 1 gwei (approved max ~$0.36 @1 gwei).
// Run: node scripts/deploy-mainnet.js
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC = "https://bsc-dataseed.binance.org/";
const CHAIN_ID = 56;
const EXPECTED_DEPLOYER = "0x6946B7deDC00764399A21B27B7628bd6aE4dF792";
const REGISTRY = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f"; // official Agent ID HandleRegistry
const MAX_GAS_PRICE_WEI = 1_000_000_000n; // 1 gwei
const MIN_BALANCE_WEI = ethers.parseEther("0.001");
const MAX_GAS = 1_000_000n;

async function main() {
  const walletFile = JSON.parse(
    fs.readFileSync(path.join(process.env.HOME, "workspace", "wallets", "fund-0x6946.json"), "utf8")
  );
  const pk = walletFile.private_key;
  if (!pk || !pk.startsWith("0x") || pk.length !== 66) {
    throw new Error("fund-0x6946.json does not contain a valid private_key");
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(pk, provider);

  if (wallet.address.toLowerCase() !== EXPECTED_DEPLOYER.toLowerCase()) {
    throw new Error(`Deployer mismatch: ${wallet.address}, expected ${EXPECTED_DEPLOYER}`);
  }

  const net = await provider.getNetwork();
  if (Number(net.chainId) !== CHAIN_ID) {
    throw new Error(`Wrong chain: ${net.chainId}, expected ${CHAIN_ID}`);
  }

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} BNB`);
  if (balance < MIN_BALANCE_WEI) {
    throw new Error("BLOCKER: balance below 0.001 BNB minimum");
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log(`Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  if (gasPrice > MAX_GAS_PRICE_WEI) {
    throw new Error(`BLOCKER: gas price ${ethers.formatUnits(gasPrice, "gwei")} gwei exceeds 1 gwei cap — aborting, no tx sent`);
  }

  const art = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "contracts", "artifacts", "AgentStreak.json"), "utf8")
  );
  const factory = new ethers.ContractFactory(art.abi, art.bytecode, wallet);

  const deployTx = await factory.getDeployTransaction(REGISTRY);
  const gasEstimate = await provider.estimateGas(deployTx);
  console.log(`Gas estimate: ${gasEstimate}`);
  if (gasEstimate > MAX_GAS) {
    throw new Error(`BLOCKER: gas estimate ${gasEstimate} exceeds ${MAX_GAS} cap — aborting, no tx sent`);
  }
  const estCost = gasEstimate * gasPrice;
  console.log(`Estimated cost: ${ethers.formatEther(estCost)} BNB`);

  console.log("Sending deployment transaction...");
  const contract = await factory.deploy(REGISTRY, { gasPrice });
  const txHash = contract.deploymentTransaction().hash;
  console.log(`Deploy tx sent: ${txHash}`);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  const receipt = await provider.getTransactionReceipt(txHash);
  const actualCost = receipt.gasUsed * receipt.gasPrice;
  console.log(`AgentStreak deployed: ${addr}`);
  console.log(`Tx: ${txHash}`);
  console.log(`Block: ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed}`);
  console.log(`Actual cost: ${ethers.formatEther(actualCost)} BNB`);
  console.log(`Verify on BscScan: https://bscscan.com/address/${addr}`);
  console.log(`Tx link: https://bscscan.com/tx/${txHash}`);

  const out = {
    contract: "AgentStreak",
    address: addr,
    txHash,
    blockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed.toString(),
    gasPriceWei: receipt.gasPrice.toString(),
    costBNB: ethers.formatEther(actualCost),
    deployer: wallet.address,
    registry: REGISTRY,
    chainId: CHAIN_ID,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "contracts", "DEPLOY-MAINNET.json"),
    JSON.stringify(out, null, 2)
  );
  console.log("Saved: contracts/DEPLOY-MAINNET.json");
}

main().catch((e) => { console.error("DEPLOY FAILED:", e.message); process.exit(1); });
