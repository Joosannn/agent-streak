# Agent Streak

A free daily check-in game for Agent ID holders. Check in once per day (UTC),
build your streak, and climb the on-chain leaderboard. Your streak is tied to
your soulbound `.ai` identity — one address, one name, non-transferable — so a
streak actually means something. Gas only. No promised returns.

## How Agent ID works in this product

- **On-chain gating:** the `AgentStreak` contract only lets Agent ID holders
  check in. Its `checkIn()` function reverts unless
  `balanceOf(msg.sender) > 0` on the Agent ID registry
  (`0x60b9262456de011f7d15a54cdd8c48baaa8b022f` on BSC mainnet) — the official
  check from the hackathon announcement. The check lives in the contract, not
  just in the UI, so it cannot be bypassed from the frontend.
- **Identity on the leaderboard:** the contract reads `handleOf(msg.sender)`
  from the registry and stores the handle with every check-in
  (`CheckedIn(player, handle, day, streak)` event). The leaderboard shows
  `handle.ai` names, not raw `0x…` addresses.
- **Streaks are meaningful because Agent ID is soulbound:** one address holds
  exactly one handle, permanently, and it cannot be transferred — so a streak
  cannot be lent, sold, or farmed by passing an identity around.

## Contracts

| Contract | Network | Address |
|---|---|---|
| Agent ID registry (`HandleRegistry`) | BSC mainnet (56) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` |
| AgentStreak | BSC mainnet (56) | TBD — see `contracts/DEPLOY-NOTES.md` |
| MockAgentID (test only) | BSC testnet (97) | TBD — see `contracts/DEPLOY-NOTES.md` |
| AgentStreak | BSC testnet (97) | TBD — see `contracts/DEPLOY-NOTES.md` |

The Agent ID registry does **not** exist on BSC testnet (verified: no code at
the registry address on chain 97). Testnet uses a `MockAgentID` contract with
the same interface (`balanceOf` / `handleOf` / `ownerOfHandle`); the frontend
labels testnet clearly as "TESTNET — Mock Agent ID, not the official Agent ID".

- BscScan, Agent ID registry:
  https://bscscan.com/token/0x60b9262456de011f7d15a54cdd8c48baaa8b022f
- Hackathon announcement:
  https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf
- Integration research: `research/agent-id-integration.md`

## Run the frontend locally

Static site — no build step, no framework. The only external asset is the
ethers v6 CDN script.

```bash
cd frontend
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly via `file://` sometimes breaks wallet injection
in MetaMask, so use `http.server` (or any static server) instead.

## Test on testnet

1. Switch your wallet to BSC Testnet (chain 97) — the app has a switch button.
2. Mint a mock handle first: call `mintTest("<handle>", <your address>)` on the
   MockAgentID contract (address TBD in `contracts/DEPLOY-NOTES.md`).
3. Connect your wallet in the app, confirm your mock handle shows up, then
   hit **Check In**. The transaction link opens in the testnet explorer.

## Tests

Leaderboard aggregation logic is pure JS and tested without a browser:

```bash
cd frontend
node --check app.js && node --check config.js
node --test test-aggregation.js   # 9 tests, all passing
```

## Notes

- One check-in per address per UTC day; missing a day resets the streak to 1.
- The leaderboard reads `CheckedIn` events via `eth_getLogs` (last 20,000
  blocks, or since the deployment block once known) and ranks by current
  streak, then total check-ins.
- The frontend never implements a name → address lookup as a feature. The
  leaderboard only shows players who have already checked in.
- No promised returns: check-ins are free (gas only) and earn points/streaks,
  not money.
