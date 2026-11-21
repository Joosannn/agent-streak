# Agent Streak — Submission Materials (FINAL)

## Project name

Agent Streak

## Description

Agent Streak is a free daily check-in game for Agent ID holders: check in once
per day, build a streak, and climb an on-chain leaderboard. Your streak is tied
to your soulbound `.ai` identity, so it cannot be transferred, lent, or faked.
Gas only — no promised returns.

## How Agent ID is used

- **On-chain gating:** `checkIn()` reverts unless the caller holds an Agent ID
  (`balanceOf(msg.sender) > 0` on the official registry). The gate lives in
  the contract, not just the frontend.
- **Identity on the leaderboard:** the contract reads `handleOf(msg.sender)`
  and records the handle in every `CheckedIn` event, so the leaderboard shows
  `handle.ai` names instead of raw addresses.
- **Streaks are meaningful because Agent ID is soulbound:** one address holds
  exactly one handle, permanently and non-transferably — a streak is proof of
  one person's daily habit, not a rented identity.

## Website

https://prompt-oboe-m8u4fig.tmp.now

⚠️ TEMPORARY Vercel URL — expires 60 min after deploy (19 Nov 2026 ~20:00 WIB)
unless claimed. Claim it (user, Vercel login required — do NOT share the claim
link publicly):
https://vercel.com/claim-deployment?code=eeac74f0-5eeb-4b2a-a3ba-d666df1b94c7
After claiming, update this URL to the permanent *.vercel.app address.
Alternative permanent home: GitHub Pages (repo `joosannn/agent-streak` still
to be created by the user — GitHub App cannot create repos, 403).

## Contract addresses

| Contract | Network | Address |
|---|---|---|
| AgentStreak | BSC mainnet (56) | `0x914EdE540AF6fAAf1826BBa1db162d60bFa3b254` |
| Agent ID registry | BSC mainnet (56) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` |
| AgentStreak (test) | BSC testnet (97) | not deployed (testnet skipped) |
| MockAgentID (test only) | BSC testnet (97) | not deployed (testnet skipped) |

- Deploy tx: https://bscscan.com/tx/0xbcd8e00c6584dab8ea5799669f7a2dfea86afcbd7369681b812fc62bd8c65021
  (block 134501770, deployer fund EOA 0x6946, cost 0.0000300967 BNB ≈ $0.018)
- Contract: https://bscscan.com/address/0x914EdE540AF6fAAf1826BBa1db162d60bFa3b254
- Source verified: Sourcify exact_match (creation + runtime bytecode).
  BscScan "verified" badge display to be confirmed manually (no API key,
  page fetch blocked by Cloudflare).
- Contract source is open-source (repo `~/workspace/agent-id-hackathon/`,
  MIT, no external imports, ownerless — no admin/pause/withdraw/mint).

## Reward receiving address (for the submission form)

Fund EOA `0x6946B7deDC00764399A21B27B7628bd6aE4dF792` (deployer; user to
confirm this is the address to receive any USDC prize).

## Notes for reviewers

- No promised returns: check-ins are free (gas only) and earn streak points,
  not money or yield.
- No name → address lookup feature: the leaderboard only lists players who
  have already checked in.
- Testnet skipped: the official Agent ID registry does not exist on BSC
  testnet; local tests 9/9 PASS on ganache instead.
- Hackathon announcement:
  https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf

## Submission status (21 Nov 2026)

✅ FORM FOUND — the announcement's "Submit Project Now" button points to the project-submission survey:
https://app.binance.com/uni-qr/user-survey/fb26d2bd25e04329b1ba77c7b3811d23
(direct form URL after redirect: https://www.binance.com/en/survey/fb26d2bd25e04329b1ba77c7b3811d23 — title "Agent ID Hackathon Project Submission Form"; **requires Binance login before the fields are visible**, so the field list could not be read from the server side.)
(verified 2026-11-21 by inspecting the button; not clicked, no form filled, no sign-in done.)
ACTION NEEDED (user): open that link and submit the materials above before 9 Dec 2026 08:00 UTC. Do NOT use the community-promotion survey (ff6832f8d2984af289068c9450a3c98c) for the project — that one is only for X post links.


## FORM ANSWERS — Section 1 (项目基本信息), drafted 2026-11-21
Form is in Chinese; answers in English (hackathon standard, project materials are English).

1. 项目名称 (Project name):
Agent Streak

2. 项目简介 (Project intro, 1-3 sentences):
Agent Streak is a free daily check-in game on BNB Chain for Agent ID holders. A holder of a .ai Agent ID name checks in once per day to build an on-chain streak — each check-in is a real transaction that proves Agent ID is actually used, not just held. It turns the soulbound .ai identity into a daily habit, with a public leaderboard ranked by streak.

3. 项目合约地址 (Contract address — BscScan link):
https://bscscan.com/address/0x914EdE540AF6fAAf1826BBa1db162d60bFa3b254
(Source verified on Sourcify exact_match at deploy, 2026-11-19. Live re-check 2026-11-21 blocked: BscScan page fetch refused, BscScan/Etherscan APIs redirect or require a key from this server. The link itself is what the field asks for; judges open it and see the verified source.)

4. 项目官网 / 产品入口 (Website / product entry):
https://prompt-oboe-m8u4fig.tmp.now
(Verified live 2026-11-21: "Check in daily. Keep the streak alive.")

5. 项目社交媒体链接 (X) (Social media link):
https://x.com/0xyibo/status/2123396728841998652
(Launch post from @0xyibo — the project has no separate X account. Profile: https://x.com/0xyibo)


## FORM ANSWERS — Section 2 (Agent ID 集成信息), drafted 2026-11-21

6. 请描述项目如何使用 Agent ID (3-5 sentences):
Agent Streak gates its core action behind Agent ID: the checkIn() function only succeeds if the caller's wallet holds a .ai Agent ID name, checked on-chain against the Agent ID registry (0x60b9262456de011f7d15a54cdd8c48baaa8b022f). The Agent ID name itself becomes the player's handle — the streak, total check-ins, and leaderboard ranking are all tied to that soulbound identity, not to a disposable wallet address. Because Agent ID is non-transferable, a streak cannot be bought, lent, or faked; it is proof that one specific agent showed up every day. For users, this turns their .ai name into a persistent on-chain reputation they build one day at a time, for free apart from gas.

7. Agent ID 在项目中的主要应用场景 (pick 1-5):
- ✅ 身份识别 / 身份验证 (identity verification — must hold an Agent ID to play)
- ✅ 权限管理 / 访问控制 (access control — only Agent ID holders can check in)
- ✅ Agent 身份绑定 / 识别 (identity binding — streak bound to the .ai name)
- ❌ 支付 / 结算 — no
- ❌ 交易 / DeFi 交互 — no
- ❌ 其他 — not needed

8. 产品是否已经上线并可供用户体验? (Is the product live?)
Yes


## FORM ANSWERS — Section 3 (BNB Chain 合约信息), drafted 2026-11-21

9. BNB Chain 合约地址 (all project contracts for activity stats; no token contract exists):
0x914EdE540AF6fAAf1826BBa1db162d60bFa3b254
(Only the AgentStreak contract — the Agent ID registry 0x60b9262456de011f7d15a54cdd8c48baaa8b022f is Binance's platform contract, not a project contract, so it is NOT listed here.)

10. BscScan 合约验证链接 (verification link):
https://bscscan.com/address/0x914EdE540AF6fAAf1826BBa1db162d60bFa3b254#code

11. 是否已完成 Agent ID 集成并产生链上交互? (Integration done + on-chain interactions?)
Yes — live check-ins on-chain (e.g. arzen.ai, streak 3, verified via getPlayer).


## FORM ANSWERS — Section 4 (项目展示材料), drafted 2026-11-21

12. 产品演示视频 (demo video, ~60s) — ✅ LINK READY 2026-11-21:
https://drive.google.com/file/d/1UuQVHC8-juocD___3F46TPZ7xlCYQCVh/view?usp=drivesdk
(Stickman Agent Streak promo, 60s, uploaded to user's Google Drive as "Agent Streak Demo.mp4", shared anyone-with-link reader. Original file: ~/workspace/stickman-story/out/agent-streak-doc.mp4. Note: promo, not a screen demo of actual usage — a real screen demo would be stronger if he wants to improve before the 9 Dec deadline.)

13. 代码仓库链接 (code repo link) — ⚠️ GAP, repo is local-only:
- Local repo ~/workspace/agent-id-hackathon/ has NO git remote and no GitHub URL yet (contracts, frontend, docs, README all complete).
- Fix: user creates an empty PUBLIC repo on github.com (e.g. Joosannn/agent-streak), then agent pushes. GitHub App cannot create repos (403), so the creation click must be the user's.
- Planned repo URL once pushed: https://github.com/Joosannn/agent-streak

14. 其他补充材料 (supplementary, optional):
Live demo: https://prompt-oboe-m8u4fig.tmp.now
Launch post: https://x.com/0xyibo/status/2123396728841998652
