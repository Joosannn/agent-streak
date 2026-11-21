// End-to-end local test for AgentStreak + MockAgentID on ganache.
// Starts its own in-process ganache chain, deploys both contracts,
// and asserts all cases (a)-(h), printing PASS/FAIL per case.
// Run: npm test
const Ganache = require("ganache");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const ART = path.join(__dirname, "..", "contracts", "artifacts");
function load(name) {
  return JSON.parse(fs.readFileSync(path.join(ART, `${name}.json`), "utf8"));
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}
function expectRevert(staticCallFn, reason) {
  // staticCallFn: () => contract.method.staticCall() — eth_call returns the
  // revert reason; ganache's estimateGas path does not, so we never rely on it.
  return staticCallFn().then(
    () => ({ reverted: false }),
    (e) => ({ reverted: true, reason: e?.revert?.args?.[0] ?? e?.reason ?? e?.message ?? "" })
  );
}

async function main() {
  const server = Ganache.server({ chain: { chainId: 1337 }, logging: { quiet: true } });
  await server.listen(8545);
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const deployerSigner = await provider.getSigner(0);
  const aliceSigner = await provider.getSigner(1);
  const bobSigner = await provider.getSigner(2);
  const carolSigner = await provider.getSigner(3);
  const deployer = await deployerSigner.getAddress();
  const alice = await aliceSigner.getAddress();
  const bob = await bobSigner.getAddress();
  const carol = await carolSigner.getAddress();

  const mockArt = load("MockAgentID");
  const streakArt = load("AgentStreak");

  const MockFactory = new ethers.ContractFactory(mockArt.abi, mockArt.bytecode, deployerSigner);
  const mock = await MockFactory.deploy();
  await mock.waitForDeployment();
  const mockAddr = await mock.getAddress();
  console.log(`MockAgentID deployed at ${mockAddr}`);

  const StreakFactory = new ethers.ContractFactory(streakArt.abi, streakArt.bytecode, deployerSigner);
  const streak = await StreakFactory.deploy(mockAddr);
  await streak.waitForDeployment();
  const streakAddr = await streak.getAddress();
  console.log(`AgentStreak deployed at ${streakAddr} (registry=${mockAddr})`);

  // Gas estimates (local, for reference)
  const mockDeployTx = await mock.deploymentTransaction();
  const streakDeployTx = await streak.deploymentTransaction();
  const mockDeployReceipt = await mockDeployTx.wait();
  const streakDeployReceipt = await streakDeployTx.wait();
  console.log(`gas deploy MockAgentID: ${mockDeployReceipt.gasUsed}`);
  console.log(`gas deploy AgentStreak: ${streakDeployReceipt.gasUsed}`);

  // (a) non-holder checkIn reverts "Agent ID required"
  {
    const r = await expectRevert(() => streak.connect(carolSigner).checkIn.staticCall());
    check("(a) non-holder checkIn reverts", r.reverted && r.reason.includes("Agent ID required"), r.reason);
  }

  // Mint test handles for alice + bob
  await (await mock.mintTest("alice", alice)).wait();
  await (await mock.mintTest("bob", bob)).wait();
  check("setup mintTest alice/bob", (await mock.balanceOf(alice)) === 1n && (await mock.balanceOf(bob)) === 1n);

  // (b) holder checkIn succeeds, streak=1, handle stored
  let checkInGas;
  {
    const tx = await streak.connect(aliceSigner).checkIn();
    const rc = await tx.wait();
    checkInGas = rc.gasUsed;
    const [handle, s, lastDay, total] = await streak.getPlayer(alice);
    const today = Math.floor(Date.now() / 1000 / 86400);
    check("(b) holder checkIn ok, streak=1, handle stored", s === 1n && handle === "alice" && total === 1n && lastDay === BigInt(today), `streak=${s} handle=${handle} total=${total}`);
    console.log(`gas checkIn (first): ${checkInGas}`);
  }

  // (c) second check-in same day reverts
  {
    const r = await expectRevert(() => streak.connect(aliceSigner).checkIn.staticCall());
    check("(c) same-day checkIn reverts", r.reverted && r.reason.includes("Already checked in today"), r.reason);
  }

  // (d) +1 day -> streak=2
  {
    await provider.send("evm_increaseTime", [86400]);
    await provider.send("evm_mine", []);
    const tx = await streak.connect(aliceSigner).checkIn();
    await tx.wait();
    const [, s] = await streak.getPlayer(alice);
    check("(d) next-day checkIn streak=2", s === 2n, `streak=${s}`);
  }

  // (e) +2 days (skip 1 day) -> streak resets to 1
  {
    await provider.send("evm_increaseTime", [2 * 86400]);
    await provider.send("evm_mine", []);
    const tx = await streak.connect(aliceSigner).checkIn();
    await tx.wait();
    const [, s, , total] = await streak.getPlayer(alice);
    check("(e) skipped-day checkIn streak resets to 1", s === 1n && total === 3n, `streak=${s} total=${total}`);
  }

  // (f) getPlayer returns correct data
  {
    const [handle, s, lastDay, total] = await streak.getPlayer(alice);
    const tp = await streak.totalPlayers();
    const tca = await streak.totalCheckInsAll();
    check("(f) getPlayer data correct", handle === "alice" && s === 1n && total === 3n && tp === 1n && tca === 3n,
      `handle=${handle} streak=${s} lastDay=${lastDay} total=${total} totalPlayers=${tp} totalCheckInsAll=${tca}`);
  }

  // (g) CheckedIn event emitted with correct handle
  {
    const tx = await streak.connect(bobSigner).checkIn();
    const rc = await tx.wait();
    const iface = new ethers.Interface(streakArt.abi);
    const logs = rc.logs.map((l) => { try { return iface.parseLog(l); } catch { return null; } }).filter(Boolean);
    const ev = logs.find((l) => l.name === "CheckedIn");
    check("(g) CheckedIn event emitted, handle correct", !!ev && ev.args.player === bob && ev.args.handle === "bob" && ev.args.streak === 1n,
      ev ? `player=${ev.args.player} handle=${ev.args.handle} day=${ev.args.day} streak=${ev.args.streak}` : "no event");
  }

  // (h) second player checked in -> leaderboard has 2 players
  {
    const tp = await streak.totalPlayers();
    const tca = await streak.totalCheckInsAll();
    const [handleB, sB] = await streak.getPlayer(bob);
    check("(h) second player check-in, 2 players total", tp === 2n && tca === 4n && handleB === "bob" && sB === 1n,
      `totalPlayers=${tp} totalCheckInsAll=${tca} bob streak=${sB}`);
  }

  // Extra sanity: estimateGas for mainnet preview (same bytecode).
  // Carol gets a handle here but only for estimation — no on-chain check-in.
  await (await mock.mintTest("carol", carol)).wait();
  const mockEstTx = await MockFactory.getDeployTransaction();
  const streakEstTx = await StreakFactory.getDeployTransaction(mockAddr);
  const mockEst = await provider.estimateGas({ ...mockEstTx, from: deployer });
  const streakEst = await provider.estimateGas({ ...streakEstTx, from: deployer });
  const checkInEst = await streak.connect(carolSigner).checkIn.estimateGas();
  console.log(`\neth_estimateGas deploy MockAgentID: ${mockEst}`);
  console.log(`eth_estimateGas deploy AgentStreak: ${streakEst}`);
  console.log(`eth_estimateGas checkIn (repeat, warm storage): ${checkInEst}`);

  await server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed > 0) { console.log("RESULT: FAIL"); process.exit(1); }
  console.log("RESULT: ALL PASS");
}

main().catch((e) => { console.error(e); process.exit(1); });
