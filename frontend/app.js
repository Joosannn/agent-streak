// Agent Streak frontend — static, no build step, ethers v6 via CDN.
// Pure logic (aggregateLeaderboard) is exported for Node testing; all DOM
// work only runs in a browser (guarded by typeof window / document).

const CONFIG_REF = (typeof window !== "undefined" && window.CONFIG) || null;

/* ------------------------------------------------------------------ */
/* Pure logic — no DOM, no wallet. Testable with plain Node.           */
/* ------------------------------------------------------------------ */

// One decoded CheckedIn event:
//   { player: "0x...", handle: "arzen", day: 20400, streak: 7, blockNumber: 123 }
// Returns rows sorted by streak desc, then totalCheckIns desc, then handle asc.
// `limit` caps the returned rows (default 10).
function aggregateLeaderboard(events, limit = 10) {
  const byPlayer = new Map(); // address (lowercase) -> { player, handle, streak, total, lastDay }
  for (const ev of events) {
    const key = String(ev.player).toLowerCase();
    const day = Number(ev.day);
    const streak = Number(ev.streak);
    const prev = byPlayer.get(key);
    if (!prev) {
      byPlayer.set(key, {
        player: ev.player,
        handle: ev.handle || "",
        streak,
        total: 1,
        lastDay: day,
      });
    } else {
      prev.total += 1;
      // Keep the state from the latest day; ties broken by higher streak,
      // then by later block (events are processed in log order).
      if (day > prev.lastDay || (day === prev.lastDay && streak >= prev.streak)) {
        prev.streak = streak;
        prev.lastDay = day;
        if (ev.handle) prev.handle = ev.handle;
      }
    }
  }
  const rows = [...byPlayer.values()];
  rows.sort((a, b) =>
    b.streak - a.streak ||
    b.total - a.total ||
    (a.handle || "").localeCompare(b.handle || "")
  );
  return rows.slice(0, limit);
}

// Most recent check-ins, newest first (log order reversed), capped.
function recentCheckIns(events, limit = 10) {
  return [...events].reverse().slice(0, limit);
}

// Display name: contract stores the handle without ".ai" (e.g. "arzen").
function displayHandle(handle) {
  if (!handle) return "—";
  return handle.endsWith(".ai") ? handle : `${handle}.ai`;
}

// UTC day number used by the contract: floor(timestamp / 86400).
function utcDayNumber(date = new Date()) {
  return Math.floor(date.getTime() / 1000 / 86400);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { aggregateLeaderboard, recentCheckIns, displayHandle, utcDayNumber };
}

/* ------------------------------------------------------------------ */
/* Browser app — only runs when window/document exist.                 */
/* ------------------------------------------------------------------ */

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const $ = (id) => document.getElementById(id);

  let provider = null;      // ethers BrowserProvider (wallet)
  let readProvider = null;  // ethers JsonRpcProvider (public RPC, read-only)
  let signer = null;
  let account = null;
  let chainId = null;
  let chainCfg = null;
  let streakContract = null; // signer-connected, when deployed
  let streakRead = null;     // read-only contract instance

  function chainConfig(id) {
    return (CONFIG_REF && CONFIG_REF.chains && CONFIG_REF.chains[id]) || null;
  }

  function setText(id, text) { const el = $(id); if (el) el.textContent = text; }
  function show(id, on) { const el = $(id); if (el) el.classList.toggle("hidden", !on); }

  function shortAddr(addr) {
    return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
  }

  async function initReadProvider(id) {
    const cfg = chainConfig(id);
    if (!cfg) return null;
    try {
      return new ethers.JsonRpcProvider(cfg.rpcUrl);
    } catch (e) {
      console.warn("read provider failed", e);
      return null;
    }
  }

  // --- Wallet ------------------------------------------------------

  async function connectWallet() {
    if (!window.ethereum) {
      setText("agent-status", "No wallet detected. Install MetaMask or another EVM wallet, then reload this page.");
      return;
    }
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      account = accounts[0];
      signer = await provider.getSigner();
      const net = await provider.getNetwork();
      chainId = Number(net.chainId);
      await onChainChanged();
      $("connect-btn").textContent = shortAddr(account);
      window.ethereum.on("accountsChanged", (accs) => {
        account = accs[0] || null;
        if (!account) { location.reload(); return; }
        signer = null;
        provider.getSigner().then((s) => { signer = s; refreshAll(); });
      });
      window.ethereum.on("chainChanged", () => location.reload());
    } catch (e) {
      console.error(e);
      setText("agent-status", "Wallet connection failed: " + (e && e.message ? e.message : e));
    }
  }

  async function switchNetwork(targetChainId) {
    if (!window.ethereum) return;
    const hex = "0x" + targetChainId.toString(16);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e) {
      // 4902 = chain not added to the wallet: add it, then switch.
      if (e && e.code === 4902) {
        const cfg = chainConfig(targetChainId);
        if (!cfg) return;
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hex,
            chainName: cfg.name,
            rpcUrls: [cfg.rpcUrl],
            blockExplorerUrls: [cfg.explorer],
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          }],
        });
      } else {
        console.error(e);
        setText("agent-status", "Network switch failed: " + (e && e.message ? e.message : e));
      }
    }
  }

  function updateChainUI() {
    chainCfg = chainId ? chainConfig(chainId) : null;
    const badge = $("chain-badge");
    if (chainCfg) {
      badge.textContent = chainCfg.name + (chainCfg.isTestnet ? " (testnet)" : "");
      badge.classList.remove("hidden");
    } else {
      badge.textContent = chainId ? `Unsupported chain (${chainId})` : "Not connected";
      badge.classList.remove("hidden");
    }
    show("testnet-banner", !!(chainCfg && chainCfg.isTestnet));
    // Switch button: offer the other supported network.
    const sw = $("switch-btn");
    if (chainCfg && chainCfg.isTestnet) {
      sw.textContent = "Switch to BSC Mainnet";
      sw.onclick = () => switchNetwork(56);
      sw.classList.remove("hidden");
    } else if (chainCfg && !chainCfg.isTestnet) {
      sw.textContent = "Switch to BSC Testnet";
      sw.onclick = () => switchNetwork(97);
      sw.classList.remove("hidden");
    } else if (account) {
      sw.textContent = "Switch to BSC Mainnet";
      sw.onclick = () => switchNetwork(56);
      sw.classList.remove("hidden");
    } else {
      sw.classList.add("hidden");
    }
    // Deployed? Show the TBD banner when the streak contract is unknown.
    show("not-deployed", !!(chainCfg && !chainCfg.streakContract));
  }

  // --- Agent ID status ----------------------------------------------

  async function refreshAgentStatus() {
    const statusEl = $("agent-status");
    const handleEl = $("agent-handle");
    if (!account || !chainCfg) {
      setText("agent-status", "Connect your wallet to check your Agent ID.");
      handleEl.classList.add("hidden");
      return;
    }
    if (!chainCfg.agentIdRegistry) {
      setText("agent-status", chainCfg.isTestnet
        ? "Mock Agent ID is not deployed on this testnet yet (address TBD). Check contracts/DEPLOY-NOTES.md."
        : "Agent ID registry address is not configured for this network.");
      handleEl.classList.add("hidden");
      return;
    }
    const rp = readProvider || provider;
    try {
      const registry = new ethers.Contract(chainCfg.agentIdRegistry, CONFIG_REF.agentIdAbi, rp);
      const bal = await registry.balanceOf(account);
      if (bal > 0n) {
        const handle = await registry.handleOf(account);
        handleEl.textContent = displayHandle(handle);
        handleEl.classList.remove("hidden");
        setText("agent-status", "✅ You hold an Agent ID. You can check in.");
      } else {
        handleEl.classList.add("hidden");
        setText("agent-status", "You need an Agent ID to check in — claim a free one in the Binance App (Wallet > Agent ID).");
      }
    } catch (e) {
      console.error(e);
      setText("agent-status", "Could not read Agent ID status: " + (e && e.message ? e.message : e));
    }
  }

  // --- My streak ------------------------------------------------------

  async function refreshMyStreak() {
    if (!account || !streakRead) {
      setText("my-handle", "—"); setText("my-streak", "—");
      setText("my-total", "—"); setText("my-last", "—");
      return;
    }
    try {
      const p = await streakRead.getPlayer(account);
      setText("my-handle", displayHandle(p.handle));
      setText("my-streak", String(p.streak));
      setText("my-total", String(p.totalCheckIns));
      setText("my-last", p.lastCheckInDay === 0n ? "never" : `day ${p.lastCheckInDay} (UTC)`);
    } catch (e) {
      console.error(e);
      setText("my-streak", "error");
    }
  }

  // --- Check-in -------------------------------------------------------

  async function doCheckIn() {
    const btn = $("checkin-btn");
    if (!signer || !streakContract) return;
    btn.disabled = true;
    setText("tx-status", "Waiting for wallet confirmation…");
    $("tx-link").innerHTML = "";
    try {
      const tx = await streakContract.checkIn();
      setText("tx-status", "Transaction sent — waiting for confirmation…");
      const receipt = await tx.wait();
      setText("tx-status", receipt.status === 1 ? "✅ Checked in! Streak updated." : "❌ Transaction failed on-chain.");
      const url = chainCfg.explorerTx + tx.hash;
      $("tx-link").innerHTML = `<a href="${url}" target="_blank" rel="noopener">View on explorer ↗ ${tx.hash.slice(0, 10)}…</a>`;
      await refreshAll();
    } catch (e) {
      console.error(e);
      const msg = (e && e.reason) || (e && e.message) || String(e);
      setText("tx-status", "Check-in failed: " + msg);
    } finally {
      btn.disabled = false;
    }
  }

  // --- Leaderboard + recent (from CheckedIn events) -------------------

  async function loadLeaderboard() {
    const lbEl = $("leaderboard");
    const recentEl = $("recent-list");
    lbEl.innerHTML = "";
    recentEl.innerHTML = "";
    if (!streakRead) {
      setText("lb-status", "Leaderboard unavailable — contract not deployed on this network yet.");
      setText("recent-status", "Unavailable — contract not deployed yet.");
      return;
    }
    setText("lb-status", "Loading…");
    setText("recent-status", "Loading…");
    try {
      const rp = readProvider || provider;
      const latest = await rp.getBlockNumber();
      const fromBlock = chainCfg.streakDeployBlock != null
        ? chainCfg.streakDeployBlock
        : Math.max(0, latest - CONFIG_REF.logScanBlocks);
      const iface = new ethers.Interface(CONFIG_REF.streakAbi);
      const topic = iface.getEvent("CheckedIn").topicHash;
      const logs = await rp.getLogs({
        address: chainCfg.streakContract,
        topics: [topic],
        fromBlock,
        toBlock: latest,
      });
      const events = [];
      for (const log of logs) {
        try {
          const parsed = iface.parseLog(log);
          events.push({
            player: parsed.args.player,
            handle: parsed.args.handle,
            day: Number(parsed.args.day),
            streak: Number(parsed.args.streak),
            blockNumber: log.blockNumber,
          });
        } catch (e) { console.warn("unparsable log", e); }
      }
      // Leaderboard
      const rows = aggregateLeaderboard(events, 10);
      if (rows.length === 0) {
        setText("lb-status", "No check-ins yet — be the first!");
      } else {
        setText("lb-status", "");
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const li = document.createElement("li");
          li.innerHTML = `<span class="rank">#${i + 1}</span>
            <span class="lb-handle">${displayHandle(r.handle)}</span>
            <span class="lb-addr muted">${shortAddr(r.player)}</span>
            <span class="lb-streak">🔥 ${r.streak} day${r.streak === 1 ? "" : "s"}</span>
            <span class="lb-total muted">${r.total} check-in${r.total === 1 ? "" : "s"}</span>`;
          lbEl.appendChild(li);
        }
      }
      // Recent check-ins
      const recent = recentCheckIns(events, 10);
      if (recent.length === 0) {
        setText("recent-status", "No check-ins yet.");
      } else {
        setText("recent-status", "");
        for (const ev of recent) {
          const li = document.createElement("li");
          li.innerHTML = `<span class="lb-handle">${displayHandle(ev.handle)}</span>
            <span class="muted">checked in — streak ${ev.streak}, UTC day ${ev.day}</span>`;
          recentEl.appendChild(li);
        }
      }
    } catch (e) {
      console.error(e);
      setText("lb-status", "Could not load leaderboard: " + (e && e.message ? e.message : e));
      setText("recent-status", "Could not load recent check-ins.");
    }
  }

  // --- Orchestration --------------------------------------------------

  async function refreshAll() {
    updateChainUI();
    await refreshAgentStatus();
    await refreshMyStreak();
    await loadLeaderboard();
    // Enable check-in only when wallet + supported chain + deployed contract.
    $("checkin-btn").disabled = !(account && chainCfg && chainCfg.streakContract && signer);
  }

  async function onChainChanged() {
    chainCfg = chainId ? chainConfig(chainId) : null;
    readProvider = await initReadProvider(chainId);
    if (chainCfg && chainCfg.streakContract && signer) {
      streakContract = new ethers.Contract(chainCfg.streakContract, CONFIG_REF.streakAbi, signer);
    } else {
      streakContract = null;
    }
    if (chainCfg && chainCfg.streakContract) {
      streakRead = new ethers.Contract(chainCfg.streakContract, CONFIG_REF.streakAbi, readProvider || provider);
    } else {
      streakRead = null;
    }
    await refreshAll();
  }

  // --- Boot -----------------------------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    $("connect-btn").addEventListener("click", connectWallet);
    $("checkin-btn").addEventListener("click", doCheckIn);
    // Read-only mode: show the leaderboard for mainnet even before connecting.
    (async () => {
      chainId = 56;
      chainCfg = chainConfig(56);
      readProvider = await initReadProvider(56);
      if (chainCfg && chainCfg.streakContract) {
        streakRead = new ethers.Contract(chainCfg.streakContract, CONFIG_REF.streakAbi, readProvider);
      }
      updateChainUI();
      await loadLeaderboard();
    })();
  });
}
