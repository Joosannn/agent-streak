# Agent Streak — Deploy Notes

**Tanggal:** 19 November 2026 (WIB)
**Status:** Kontrak selesai, compile + test lokal 9/9 PASS. Deploy testnet TERBLOKIR (saldo tBNB 0). Deploy mainnet BELUM dilakukan — butuh persetujuan user.

## Kontrak

| Kontrak | File | Keterangan |
|---|---|---|
| AgentStreak | `contracts/AgentStreak.sol` | Ownerless — tanpa fungsi admin/pause/withdraw/mint. Gating on-chain via `onlyAgentHolder` (`balanceOf > 0` di registry Agent ID). |
| MockAgentID | `contracts/MockAgentID.sol` | **TEST MOCK, bukan Agent ID resmi.** Hanya untuk testnet/lokal. Jangan deploy di mainnet, jangan klaim sebagai registry resmi di UI. |

- Solidity `^0.8.24`, SPDX MIT, tanpa import eksternal (interface `IAgentID` inline).
- Compiler: solc 0.8.28, optimizer 200 runs, `evmVersion: "paris"` (tanpa PUSH0 — perlu agar jalan di ganache default hardfork; tetap kompatibel dengan BSC).
- Artifact (ABI + bytecode): `contracts/artifacts/AgentStreak.json`, `contracts/artifacts/MockAgentID.json`.

## Alamat Ter-deploy

### BSC Mainnet (chainId 56) — ✅ DEPLOYED 19 Nov 2026 ~19:16 WIB

| Item | Nilai |
|---|---|
| Kontrak | AgentStreak — `0x914EdE540AF6fAAf1826BBa1db162d60bFa3b254` |
| Tx deploy | `0xbcd8e00c6584dab8ea5799669f7a2dfea86afcbd7369681b812fc62bd8c65021` |
| Block | 134501770 |
| Deployer | fund EOA `0x6946B7deDC00764399A21B27B7628bd6aE4dF792` (opsi A, user approve ganti dari agentic karena baw tidak bisa deploy) |
| Constructor arg | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (Agent ID HandleRegistry resmi) |
| Gas used | 601,934 @ 0.05 gwei |
| Biaya aktual | **0.0000300967 BNB ≈ $0.018** (jauh di bawah estimasi max $0.36) |
| Verifikasi | Sourcify **exact_match** (creation + runtime), 19 Nov 2026 12:23:32 UTC — diteruskan otomatis ke BscScan (Etherscan guid `aa2gm1ccxfq9urhzsa5eg9aunjrpcn5dghfqe3uqpgsbuh4yr8`). Status BscScan belum bisa dikonfirmasi via API (tidak ada BscScan API key; fetch halaman BscScan diblokir 403 Cloudflare) — cek manual di https://bscscan.com/address/0x914EdE540AF6fAAf1826BBa1db162d60bFa3b254. Jika belum tampil verified, verifikasi manual dengan: solc 0.8.28, optimizer 200 runs, evmVersion paris, license MIT, constructor arg di atas. |
| Verifikasi on-chain | `agentId()` = registry resmi; `totalPlayers()` = 0; `checkIn` dari non-holder revert "Agent ID required"; `checkIn` dari holder (agentic wallet, arzen.ai) staticCall OK |
| Frontend | `frontend/config.js` sudah diisi: streakContract + streakDeployBlock 134501770 |
| Detail | `contracts/DEPLOY-MAINNET.json` |

### Lokal (ganache, chainId 1337 — chain ephemeral, mati saat test selesai)

| Kontrak | Alamat |
|---|---|
| MockAgentID | `0x6874ee5b0f623f1C0e388F02f83cd64d4A435F4e` |
| AgentStreak | `0xc412C3A9a8ff0363B7Ab1Aff27EE1536331E9Ec4` |

Alamat lokal berubah tiap run test (bukan alamat permanen).

### BSC Testnet (chainId 97)

**BELUM TER-DEPLOY — BLOCKER:** deployer wallet kosong.
- `0x6946B7deDC00764399A21B27B7628bd6aE4dF792` (fund EOA): **0.0 tBNB** (dicek live 19 Nov via `https://bsc-testnet.publicnode.com`)
- `0x94ceb32225c5e214B655F22fF3a4e57f99C85EbD` (agentic): **0.0 tBNB** (dicek live 19 Nov)
- Script `scripts/deploy-testnet.js` menolak jalan tanpa `TESTNET_PRIVATE_KEY` dan berhenti kalau saldo 0. Faucet: https://testnet.bnbchain.org/faucet-smart — butuh interaksi manual (captcha) dari user, atau user isi tBNB ke alamat testnet-only baru.
- **Tidak ada private key user yang dipakai atau disentuh.** Tidak ada key baru yang di-generate.

## Hasil Test Lokal (`npm test` — ganache in-process)

**9/9 PASS** (19 Nov 2026):

| # | Kasus | Hasil |
|---|---|---|
| (a) | Non-holder `checkIn` revert `"Agent ID required"` | PASS |
| setup | `mintTest` alice/bob, `balanceOf` = 1 | PASS |
| (b) | Holder `checkIn` sukses, streak=1, handle `"alice"` tersimpan | PASS |
| (c) | Check-in kedua di hari yang sama revert `"Already checked in today"` | PASS |
| (d) | +1 hari (`evm_increaseTime`) → streak=2 | PASS |
| (e) | +2 hari (skip 1 hari) → streak reset ke 1, total=3 | PASS |
| (f) | `getPlayer` benar: handle=alice, streak=1, lastDay=20779, total=3, totalPlayers=1, totalCheckInsAll=3 | PASS |
| (g) | Event `CheckedIn` ter-emit, handle=`"bob"`, streak=1 | PASS |
| (h) | Pemain kedua check-in → totalPlayers=2, totalCheckInsAll=4 | PASS |

Catatan debug: compile pertama gagal karena solc 0.8.28 menolak pragma exact `0.8.24` (diubah ke `^0.8.24`); test pertama gagal karena bytecode default mengandung PUSH0 yang tidak didukung ganache default hardfork (diperbaiki dengan `evmVersion: "paris"`); revert reason ganache tidak terbaca lewat `estimateGas`, jadi test assert revert via `staticCall`.

## Estimasi Gas

Diukur dari `eth_estimateGas` / receipt lokal (bytecode sama dengan yang akan di-deploy):

| Operasi | Gas |
|---|---|
| Deploy MockAgentID | 581,636 |
| Deploy AgentStreak | 601,934 |
| `checkIn` pertama (cold storage) | 166,403 |
| `checkIn` repeat (warm storage) | 132,203 |

Harga BNB: **$592.00** (CoinGecko, 19 Nov 2026).

| Operasi | @ 0.05 gwei (gasPrice RPC BSC saat ini) | @ 1 gwei (tarif realistis BSC) |
|---|---|---|
| Deploy AgentStreak | 0.000030 BNB ≈ **$0.018** | 0.000602 BNB ≈ **$0.36** |
| `checkIn` pertama | 0.000008 BNB ≈ **$0.005** | 0.000166 BNB ≈ **$0.10** |
| `checkIn` repeat | 0.000007 BNB ≈ **$0.004** | 0.000132 BNB ≈ **$0.08** |

Deploy mainnet total (kontrak saja, sekali): **~$0.02–$0.36** tergantung gas price saat deploy. Check-in per user per hari: **~$0.004–$0.10**.

## Preview Deploy Mainnet (BELUM DIJALANKAN — butuh persetujuan user)

- **Kontrak:** AgentStreak (`contracts/AgentStreak.sol`)
- **Constructor arg:** `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (Agent ID `HandleRegistry` resmi, BSC mainnet, chainId 56)
- **Deploy wallet:** TBD — butuh persetujuan + wallet yang dipilih user
- **Biaya deploy:** ~0.0006 BNB (~$0.36 @ 1 gwei) + verifikasi source di BscScan (gratis)
- **Setelah deploy:** verifikasi source di BscScan, lalu catat alamat kontrak di sini + submit ke hackathon
- **Yang TIDAK ada di kontrak:** owner, admin, pause, withdraw, mint token, janji return/hadiah uang. Streak = poin leaderboard saja.

## Cara Menjalankan Ulang

```bash
cd ~/workspace/agent-id-hackathon
npm install          # ethers v6, solc 0.8.28, ganache
npm run compile      # -> contracts/artifacts/
npm test             # ganache lokal, 9 checks
TESTNET_PRIVATE_KEY=0x<testnet-only-key> npm run deploy:testnet
```

## Blocker / Yang Masih Terbuka

1. **Deploy testnet terblokir funding:** kedua wallet 0 tBNB. Perlu tBNB dari faucet (manual, captcha) ke alamat testnet-only — atau user putuskan skip testnet dan langsung mainnet.
2. **Deploy mainnet:** menunggu persetujuan user + wallet deployer yang dipilih.
3. **Verifikasi BscScan:** setelah deploy mainnet (source + constructor arg di atas).
