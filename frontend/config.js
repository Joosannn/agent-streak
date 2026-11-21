// Agent Streak — single place to change contract addresses.
// Fill in the AgentStreak addresses once contracts/DEPLOY-NOTES.md exists.
// Agent ID registry (mainnet) is the official HandleRegistry address.

const CONFIG = {
  // Chain definitions
  chains: {
    56: {
      name: "BSC Mainnet",
      chainId: 56,
      rpcUrl: "https://bsc-dataseed.binance.org/",
      explorer: "https://bscscan.com",
      explorerTx: "https://bscscan.com/tx/",
      explorerAddress: "https://bscscan.com/address/",
      // Official Agent ID registry (HandleRegistry, soulbound ERC-721)
      agentIdRegistry: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
      // AgentStreak mainnet deploy 19 Nov 2026 (tx 0xbcd8e00c6584dab8ea5799669f7a2dfea86afcbd7369681b812fc62bd8c65021)
      streakContract: "0x914EdE540AF6fAAf1826BBa1db162d60bFa3b254",
      // First block of the AgentStreak deployment
      streakDeployBlock: 134501770,
      isTestnet: false,
    },
    97: {
      name: "BSC Testnet",
      chainId: 97,
      rpcUrl: "https://bsc-testnet-dataseed.bnbchain.org/",
      explorer: "https://testnet.bscscan.com",
      explorerTx: "https://testnet.bscscan.com/tx/",
      explorerAddress: "https://testnet.bscscan.com/address/",
      // NOTE: the official Agent ID contract does NOT exist on testnet
      // (verified: eth_getCode at 0x60b9...022f returns 0x on chain 97).
      // Use the MockAgentID address from contracts/DEPLOY-NOTES.md.
      // TODO: fill from contracts/DEPLOY-NOTES.md after mock deploy
      agentIdRegistry: null,
      // TODO: fill from contracts/DEPLOY-NOTES.md after testnet deploy
      streakContract: null,
      streakDeployBlock: null,
      isTestnet: true,
    },
  },

  // How many blocks back to scan for CheckedIn events when no deploy block is known
  logScanBlocks: 20000,

  // Minimal ABI for AgentStreak
  streakAbi: [
    "function checkIn() external",
    "function getPlayer(address player) external view returns (string handle, uint256 streak, uint256 lastCheckInDay, uint256 totalCheckIns)",
    "function totalPlayers() external view returns (uint256)",
    "function totalCheckInsAll() external view returns (uint256)",
    "event CheckedIn(address indexed player, string handle, uint256 indexed day, uint256 streak)",
  ],

  // Minimal ABI for the Agent ID registry (real or mock — same interface)
  agentIdAbi: [
    "function balanceOf(address account) external view returns (uint256)",
    "function handleOf(address account) external view returns (string)",
    "function ownerOfHandle(string handle) external view returns (address)",
  ],
};

// Browser global (app.js reads window.CONFIG); Node test harness reads module.exports.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG };
}
