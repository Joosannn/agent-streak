// Compile AgentStreak.sol + MockAgentID.sol with solc-js (0.8.28).
// Writes ABI + bytecode to contracts/artifacts/<Name>.json
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const ROOT = path.join(__dirname, "..");
const CONTRACTS_DIR = path.join(ROOT, "contracts");
const OUT_DIR = path.join(CONTRACTS_DIR, "artifacts");

function compileOne(fileName) {
  const source = fs.readFileSync(path.join(CONTRACTS_DIR, fileName), "utf8");
  const input = {
    language: "Solidity",
    sources: { [fileName]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // paris = no PUSH0 opcode: runs on ganache default hardfork and on BSC.
      evmVersion: "paris",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === "error");
    for (const e of output.errors) console.log(`[${e.severity}] ${e.formattedMessage}`);
    if (fatal.length > 0) throw new Error(`Compilation failed for ${fileName}`);
  }
  return output.contracts[fileName];
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const file of ["AgentStreak.sol", "MockAgentID.sol"]) {
  const contracts = compileOne(file);
  for (const [name, c] of Object.entries(contracts)) {
    const artifact = {
      contractName: name,
      abi: c.abi,
      bytecode: "0x" + c.evm.bytecode.object,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(artifact, null, 2));
    console.log(`OK ${name}: bytecode ${c.evm.bytecode.object.length / 2} bytes, ABI entries ${c.abi.length}`);
  }
}
console.log(`Artifacts written to ${OUT_DIR}`);
