# Riset Integrasi Binance Agent ID — Hackathon dApp (BNB Chain)

**Tanggal riset:** 19 November 2026 (WIB)
**Status:** Riset saja — tidak ada deploy, tidak ada dana disentuh, tidak ada akun/API key baru.
**Metode:** semua klaim on-chain diverifikasi langsung via RPC BSC mainnet (`https://bsc-dataseed.binance.org/`) dan BSC testnet; ABI dibaca dari source terverifikasi (Sourcify exact match); pengumuman resmi Binance dibaca penuh; docs SPACE ID dibaca langsung.

---

## Ringkasan Eksekutif

1. **Cek kepemilikan resmi menurut Binance: `balanceOf(address) > 0`** pada kontrak `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (BSC mainnet). Itu satu-satunya cara yang diakui pengumuman — dan sudah cukup untuk gating.
2. **Kontraknya bukan ERC-721 biasa, melainkan `HandleRegistry` (soulbound):** ada fungsi khusus yang jauh lebih berguna dari `balanceOf` — `handleOf(address) → string` (alamat → nama, mis. `"arzen"`) dan `ownerOfHandle(string) → address` (nama → alamat). Token ID = `uint256(keccak256(bytes(handle)))`.
3. **Tidak ada `tokenOfOwnerByIndex` / `totalSupply`:** kontrak TIDAK implement ERC721Enumerable (dicek live: `supportsInterface(0x780e9d63) = false`; `tokenOfOwnerByIndex` revert). Jadi jangan pakai pola enumerable — pakai `handleOf` untuk dapat nama + token ID.
4. **Resolusi nama `.ai` TIDAK lewat SID Registry ENS-style (`.bnb`):** `.ai` diselesaikan langsung di kontrak `HandleRegistry` itu sendiri (`handleOf` / `ownerOfHandle`). SID Registry `0x08CEd32a7f3eeC915Ba84415e9C07a7286977956` adalah sistem `.bnb` yang berbeda — jangan dicampur.
5. **BSC testnet (chainId 97): kontrak Agent ID TIDAK ADA** — `eth_getCode` di `0x60b9…022f` mengembalikan `0x` (dicek live 19 Nov 2026). Testing gating wajib pakai **mock contract** (deploy tiruan `HandleRegistry` minimal) di testnet, atau fork mainnet lokal.
6. **Penilaian juri:** "Agent ID Application Depth" bobot **30%** — terbesar. Kriteria resminya: Agent ID harus terintegrasi ke **core functionality dan business flow**, bukan sekadar cek di frontend. Artinya gating harus **on-chain (modifier di kontrak)**, bukan cuma cek `balanceOf` di UI. Syarat kelayakan hadiah: **minimal 30 alamat holder Agent ID** berinteraksi dengan kontrak selama periode submit.
7. **Pola proyek lain yang sudah terbukti:** Ptah Proof of Agent (mint kartu soulbound gratis, gas only, digate Agent ID) dan presale/free-mint "agent-only" (mis. MALTA, YAMA) — semuanya gating **on-chain** di kontrak sale/mint, bukan di frontend.
8. **Check-in/streak game yang direncanakan cocok secara aturan:** gratis (gas only), gating on-chain via modifier, leaderboard on-chain dari event — tapi butuh strategi nyata mendatangkan 30+ holder Agent ID yang check-in selama 18 Nov–9 Des 2026, karena tanpa itu tidak eligible hadiah apa pun.

---

## 1. Cek Kepemilikan Agent ID On-Chain dari Smart Contract

### 1.1 Kontrak

| Item | Nilai |
|---|---|
| Nama kontrak | `HandleRegistry` (nama token: "SPACE ID Agent ID", simbol: `AI`) |
| Alamat (BSC mainnet, chainId 56) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` |
| Standar | ERC-721, **soulbound / non-transferable** |
| Compiler | Solidity 0.8.24 |
| Verifikasi source | **Exact match di Sourcify** + terverifikasi di BscScan (pengumuman Binance menyatakan source terverifikasi & open-source di BscScan) |
| Owner kontrak | `0x457C1fd14750c6c30886A2f2B57F1eF44B095882` (juga `signer()` yang sama — pemegang kunci registrasi) |
| `baseURI` / `uriSuffix` | `https://agentid.prd.space.id/metadata/` / `.json` |

### 1.2 Cara resmi (dari pengumuman Binance)

> "Check if an address holds an Agent ID: Call `balanceOf(address)` on the contract; a return value greater than 0 indicates the address holds an Agent ID."

### 1.3 Fungsi-fungsi relevan (dari ABI terverifikasi, 33 fungsi)

**Gating / kepemilikan — pakai ini:**

| Fungsi | Signature | Selector | Kegunaan |
|---|---|---|---|
| `balanceOf(address)` | `balanceOf(address) → uint256` | `0x70a08231` | Cara resmi Binance. `> 0` = holder. Murah, standar ERC-721. |
| `handleOf(address)` | `handleOf(address) → string` | `0xc50a1514` | **Paling berguna.** Alamat → nama handle (tanpa `.ai`), mis. `"arzen"`. Public mapping. Satu-satunya cara dapat nama dari alamat tanpa tahu token ID. |
| `ownerOfHandle(string)` | `ownerOfHandle(string) → address` | `0x1da94fb4` | Nama → alamat. `ownerOfHandle("arzen")` = `0x94ce…bD`. |
| `ownerOf(uint256)` | `ownerOf(uint256) → address` | `0x6352211e` | Butuh token ID. Token ID = `uint256(keccak256(bytes(handle)))`. |
| `isValidHandle(string)` | `isValidHandle(string) → bool` | `0x3ff4dbc2` | Validasi format nama: panjang `minLen`–`maxLen`, hanya `[a-z0-9]`. |
| `tokenURI(uint256)` | `tokenURI(uint256) → string` | `0xc87b56dd` | Mengembalikan `baseURI + handle + ".json"`, mis. `https://agentid.prd.space.id/metadata/arzen.json`. |

**Fungsi yang TIDAK ADA / tidak bisa dipakai:**

| Fungsi | Hasil cek live |
|---|---|
| `tokenOfOwnerByIndex(address,uint256)` | **Tidak ada** — kontrak tidak implement ERC721Enumerable. `supportsInterface(0x780e9d63)` = `false`, call revert. |
| `totalSupply()` | **Tidak ada** — call revert. Tidak ada cara on-chain menghitung jumlah total Agent ID. |
| `tokenByIndex(uint256)` | Tidak ada (bukan enumerable). |

**Fungsi registrasi & admin (bukan untuk dApp kita, tapi penting dipahami):**

| Fungsi | Keterangan |
|---|---|
| `register(string handle, uint256 deadline, bytes sig)` | Mint oleh user dengan tanda tangan EIP-712 dari `signer` resmi (Binance/SPACE ID). DApp pihak ketiga **tidak bisa** mendaftarkan nama. |
| `adminRegister(string, address)` | `onlyOwner` — mint langsung oleh owner kontrak. |
| `setSigner(address)`, `setLengthBounds(uint8,uint8)`, `setURIParts(string,string)` | `onlyOwner`. Owner = `0x457C1f…5882`. |
| `minLen()` / `maxLen()` | Saat ini **3 / 20** (dicek live). `LEN_CEILING()` = 64. Nama claim via Binance App: 3–15 karakter (aturan produk, lebih ketat dari kontrak). |
| `approve(address,uint256)` / `setApprovalForAll(address,bool)` | **Selalu revert `Soulbound()`** (dideklarasi `pure`). Tidak ada approval yang bisa diberikan. |
| `transferFrom` / `safeTransferFrom` | Ada di ABI (warisan OpenZeppelin ERC721) tapi `_update()` di-override: **revert `Soulbound()` kalau token sudah dimiliki siapa pun** — jadi transfer mustahil setelah mint. |

### 1.4 Mekanisme soulbound (dari source `HandleRegistry.sol`, baris kunci)

```solidity
/// @notice Permanent, one-to-one soulbound handle registry.
contract HandleRegistry is ERC721, EIP712, Ownable2Step {
    mapping(address => string) public handleOf;   // alamat -> nama
    address public signer;
    ...
    function _mintHandle(string calldata handle, bytes32 label, address to) private {
        if (bytes(handleOf[to]).length != 0) revert AddressHasHandle(); // 1 alamat = 1 nama
        if (_ownerOf(uint256(label)) != address(0)) revert HandleTaken(); // 1 nama = 1 alamat
        handleOf[to] = handle;
        _mint(to, uint256(label));   // tokenId = uint256(keccak256(bytes(handle)))
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert Soulbound(); // blokir semua transfer
        return super._update(to, tokenId, auth);
    }

    function approve(address, uint256) public pure override { revert Soulbound(); }
    function setApprovalForAll(address, bool) public pure override { revert Soulbound(); }
}
```

**Implikasi untuk gating:** karena 1 alamat = tepat 1 nama, permanen, dan tidak bisa pindah tangan, `balanceOf > 0` adalah bukti identitas yang kuat dan tidak bisa "dipinjam" dengan transfer. `handleOf` sekaligus memberi nama untuk ditampilkan di leaderboard tanpa perlu resolver eksternal.

### 1.5 Verifikasi live (19 Nov 2026, RPC BSC mainnet)

| Panggilan | Hasil |
|---|---|
| `name()` / `symbol()` | `"SPACE ID Agent ID"` / `"AI"` |
| `balanceOf(0x94ceb32225c5e214B655F22fF3a4e57f99C85EbD)` | `1` ✅ (sesuai konteks: wallet ini punya 1 Agent ID) |
| `handleOf(0x94ce…bD)` | `"arzen"` ✅ |
| `ownerOfHandle("arzen")` | `0x94ceb32225c5e214B655F22fF3a4e57f99C85EbD` ✅ (round-trip cocok) |
| `tokenId = keccak256("arzen")` | `82964826208426035034924331665817549301220581345502130128977256921519648096768` |
| `ownerOf(tokenId)` | `0x94ce…bD` ✅ |
| `tokenURI(tokenId)` | `https://agentid.prd.space.id/metadata/arzen.json` |
| Metadata JSON di URL itu | `{"name": "arzen", "image": "https://agentid-nft.prd.space.id/prd/<tokenId>/image.png", "description": "Binance Agent Id"}` |
| `supportsInterface(ERC721 0x80ac58cd)` | `true` |
| `supportsInterface(Enumerable 0x780e9d63)` | `false` |
| `supportsInterface(Metadata 0x5b5e139f)` | `true` |

### 1.6 Apakah ada cara lebih robust dari `balanceOf`?

- **Untuk gating, `balanceOf > 0` sudah cara yang diakui Binance — tidak perlu lebih.** Tapi pola yang lebih robust untuk dApp yang menampilkan nama:
  1. **On-chain (kontrak):** `balanceOf(msg.sender) > 0` di modifier — murah dan cukup.
  2. **On-chain + nama:** `bytes(handleOf[msg.sender]).length > 0` — sekaligus membuktikan holder DAN mengambil namanya dalam satu call. Karena `handleOf` adalah mapping publik, ini bisa dibaca dari kontrak lain tanpa interface ERC-721. Ini pola yang direkomendasikan untuk kontrak check-in: simpan `handle` di event/storage leaderboard.
  3. **Cross-check nama → alamat:** `ownerOfHandle(handle) == msg.sender` — berguna kalau user mengklaim nama tertentu (mis. untuk mencegah satu alamat memakai nama orang lain di leaderboard).
- **Tidak ada "SPACE ID registry" terpisah untuk `.ai`.** Jangan cari `resolver(node)` / `addr(node)` ala ENS untuk `.ai` — arsitektur `.ai` memang beda (lihat bagian 2). Satu-satunya registry `.ai` adalah kontrak `HandleRegistry` ini sendiri.
- **Catatan kehati-hatian:** jangan mengandalkan `tokenURI`/metadata off-chain (`agentid.prd.space.id`) untuk keputusan on-chain — itu hanya untuk tampilan (nama + gambar kartu). Keputusan akses harus selalu dari state kontrak.

---

## 2. Resolve Nama `.ai` ke Alamat (dan Sebaliknya)

### 2.1 Penting: `.ai` ≠ `.bnb` — dua sistem berbeda

| | `.ai` (Agent ID) | `.bnb` (SPACE ID klasik) |
|---|---|---|
| Kontrak | `HandleRegistry` `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` | SID Registry + Public Resolver (arsitektur ENS-style) |
| Resolusi | Langsung di kontrak: `handleOf` / `ownerOfHandle` | `SIDRegistry.resolver(nodehash)` → `PublicResolver.addr(nodehash)` |
| Token ID | `keccak256(handle)` | `keccak256(label)` di bawah base node `.bnb` |
| Nama | Tanpa TLD di kontrak (`"arzen"`); tampilan `"arzen.ai"` | `namehash("nama.bnb")` |

SID Registry BSC mainnet `0x08CEd32a7f3eeC915Ba84415e9C07a7286977956` (dari dokumentasi Binance Oracle) **terverifikasi ada bytecode-nya di mainnet** (dicek live, code length 6200 hex chars), tapi itu registry untuk `.bnb`, **bukan** untuk `.ai`. Jangan pakai SID Registry untuk resolve `.ai`.

### 2.2 Resolusi `.ai` — cara yang benar (terverifikasi live)

**Nama → alamat (forward):**

```solidity
// Solidity — di dalam kontrak dApp
interface IAgentID {
    function balanceOf(address account) external view returns (uint256);
    function handleOf(address account) external view returns (string memory);
    function ownerOfHandle(string calldata handle) external view returns (address);
}

IAgentID constant AGENT_ID = IAgentID(0x60b9262456de011f7d15a54cdd8c48baaa8b022f);

function resolveName(string calldata handle) external view returns (address) {
    return AGENT_ID.ownerOfHandle(handle); // address(0) kalau nama belum terdaftar
}
```

```javascript
// JavaScript (ethers v6) — frontend / backend
import { ethers } from "ethers";
const AGENT_ID = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";
const ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function handleOf(address) view returns (string)",
  "function ownerOfHandle(string) view returns (address)",
  "function ownerOf(uint256) view returns (address)",
];
const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
const agentId = new ethers.Contract(AGENT_ID, ABI, provider);

// nama -> alamat
const addr = await agentId.ownerOfHandle("arzen");
// "arzen.ai" -> strip ".ai" dulu: handle = name.replace(/\.ai$/, "")
```

**Alamat → nama (reverse):**

```solidity
// Solidity
function resolveAddress(address account) external view returns (string memory) {
    return AGENT_ID.handleOf(account); // "" kalau alamat tidak punya Agent ID
}
```

```javascript
// JavaScript
const handle = await agentId.handleOf("0x94ceb32225c5e214B655F22fF3a4e57f99C85EbD");
const displayName = handle ? `${handle}.ai` : null; // "arzen.ai"
```

**Alamat → token ID → metadata (gambar kartu):**

```javascript
const tokenId = ethers.solidityPackedKeccak256(["string"], ["arzen"]); // = uint256(keccak256("arzen"))
const uri = await agentId.tokenURI(tokenId);
// "https://agentid.prd.space.id/metadata/arzen.json"
// JSON-nya: { "name": "arzen", "image": "https://agentid-nft.prd.space.id/prd/<tokenId>/image.png", "description": "Binance Agent Id" }
```

### 2.3 SPACE ID Web3 Name SDK — opsi off-chain (untuk `.bnb`/`.eth`, BUKAN jalur utama `.ai`)

SPACE ID menyediakan **Web3 Name SDK** (`@web3-name-sdk/core`, pakai `viem`) untuk resolusi nama generik:

```javascript
import { createWeb3Name } from "@web3-name-sdk/core";
const web3name = createWeb3Name();

// nama -> alamat (contoh resmi: .bnb, .lens, .crypto, .manta)
const address = await web3name.getAddress("spaceid.bnb");

// alamat -> nama (bisa filter chain / TLD)
const name = await web3name.getDomainName({
  address: "0x2886D6792503e04b19640C1f1430d23219AF177F",
  queryChainIdList: [56],      // 56 = BSC mainnet
});
// atau filter TLD:
const name2 = await web3name.getDomainName({
  address: "0x2886D6792503e04b19640C1f1430d23219AF177F",
  queryTldList: ["bnb"],
});
```

**Peringatan penting (fakta, bukan asumsi):** dokumentasi SDK yang dibaca (docs SPACE ID via mirror Manta/Gnosis) mencontohkan `.bnb`, `.eth`, `.arb`, `.lens`, `.crypto`, `.manta`, `.gno` — **tidak ada satu pun contoh atau pernyataan resmi yang ditemukan bahwa SDK ini mendukung TLD `.ai` / Agent ID**. SDK ini dibangun di atas SID Registry ENS-style, sedangkan `.ai` memakai `HandleRegistry` yang arsitekturnya berbeda. Jadi:

- **Untuk `.ai`: pakai direct contract call (`handleOf` / `ownerOfHandle`) seperti bagian 2.2 — ini yang terverifikasi.**
- SDK boleh dipakai sebagai pelengkap untuk `.bnb`, tapi jangan jadikan satu-satunya jalur resolusi `.ai` tanpa menguji `getAddress("arzen.ai")` sendiri terlebih dahulu. (Tidak diuji dalam riset ini karena butuh instalasi SDK; laporkan sebagai hal yang belum terverifikasi, bukan sebagai fakta.)

### 2.4 Alamat kontrak terkait (BSC mainnet, chainId 56)

| Kontrak | Alamat | Kegunaan |
|---|---|---|
| Agent ID (`HandleRegistry`) | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` | Satu-satunya kontrak `.ai`: gating + resolusi nama |
| SID Registry (`.bnb`) | `0x08CEd32a7f3eeC915Ba84415e9C07a7286977956` | Registry ENS-style untuk `.bnb` (sumber: Binance Oracle docs; bytecode terverifikasi ada di mainnet). **Bukan untuk `.ai`.** |
| Metadata Agent ID | `https://agentid.prd.space.id/metadata/<handle>.json` | Off-chain JSON: nama + gambar kartu NFT |
| Gambar kartu NFT | `https://agentid-nft.prd.space.id/prd/<tokenId>/image.png` | Off-chain, untuk tampilan |

**Testnet (chainId 97):** tidak ditemukan alamat registry/resolver `.ai` apa pun — lihat bagian 4.

---

## 3. Pola Integrasi yang Dipakai Proyek Lain

### 3.1 Apa kata aturan resmi hackathon (pengumuman Binance, dibaca penuh 19 Nov 2026)

- **Kriteria penilaian juri (100 poin):**

  | Dimensi | Bobot | Isi kriteria |
  |---|---|---|
  | Agent ID Application Depth | **30%** | Apakah Agent ID sungguh terintegrasi ke **core functionality dan business flow** produk, dan apakah menunjukkan nilai aplikasi nyata |
  | Practicality & Feasibility | 25% | Apakah menyelesaikan kebutuhan nyata, use case masuk akal & feasible |
  | Product Completion | 25% | Apakah produk live, core feature lengkap dan bisa dicoba user |
  | Innovation | 20% | Apakah mengeksplorasi use case Agent ID baru yang diferensiatif |

- **Dua kategori hadiah, masing-masing 29.000 USDC untuk 10 proyek** (total proyek 58.000 USDC + 2.000 USDC kampanye komunitas):
  - *Ecosystem Pioneer Award* — ranking berdasarkan **data on-chain nyata**: jumlah alamat holder Agent ID yang berinteraksi, volume transaksi, jumlah transaksi. Top 10.
  - *Agent Application Innovation Award* — skor panel juri (kriteria di atas). Top 10.
  - Pemenang masing-masing kategori juga dapat 1 slot klaim **Agent ID 2 digit**.
- **Syarat kelayakan (eligibility) keras:** produk harus **sudah live**, dan **minimal 30 alamat holder Agent ID** berinteraksi dengan kontrak yang disubmit **selama Submission Period**. Di bawah itu = tidak eligible hadiah, berapa pun skornya.
- **Periode submit:** 18 Nov 2026 08:00 UTC → 9 Des 2026 08:00 UTC. Review internal 9–17 Des, public review 17–20 Des, distribusi ≤14 hari kerja setelah pengumuman.
- **Red lines (diskualifikasi langsung):** no web QR login; no bypass konfirmasi transaksi user; no transfer tanpa izin; kontrak open-source + owner permission jelas; no impersonasi brand Binance/BNB; no kumpulin seed/private key/API secret/pairing code; no janji return ("passive income" dilarang); produk trading wajib risk warning; **Agent ID dilarang dipakai sebagai tool "ngintip wallet orang lain"** (dilarang membungkus lookup nama→alamat sebagai fitur utama produk).

### 3.2 Pola umum proyek yang sudah integrasi Agent ID

Riset ini menemukan **belum ada dokumentasi pola integrasi resmi dari Binance/SPACE ID khusus Agent ID** (tidak ada "Agent ID integration guide" di docs yang ditemukan — yang ada adalah docs Web3 Name SDK untuk `.bnb` dkk, lihat 2.3). Pola yang ada dipelajari dari proyek third-party yang sudah live dan diverifikasi pihak ketiga (AirdropBuzz, pengecekan 9 Nov 2026):

| Proyek | Pola gating | On-chain / off-chain | Catatan |
|---|---|---|---|
| **Ptah Proof of Agent** (`ptah.trade/poa`) | Mint 1 kartu soulbound per wallet Agent ID, gratis (gas only); nomor Agent (#4854, #6441, #7562, dst.) dipakai untuk raffle harian via posting X | **On-chain** — kontrak mint mengecek kepemilikan Agent ID di registry | Proyek third-party (BUKAN Binance). Campaign 26 Okt–9 Nov 2026, sudah berakhir. Pola paling dekat dengan konsep check-in/streak: aksi harian + identitas on-chain + reward raffle. |
| **AGENT MALTA / YAMA PROJECT** (presale "agent-only") | Kontrak sale memberi **1 share gratis pertama** hanya untuk wallet Agent ID; share berikutnya 0.001 BNB | **On-chain** — kontrak sale membaca registry Agent ID | Pola "Agent ID = akses + benefit ekonomi". Catatan risiko: vault owner bisa withdraw BNB (YAMA) — contoh pola owner permission yang harus didokumentasikan dengan jelas (red line hackathon). |
| **PACTA, NOVRA, MOLT AGENT, PATRA GENESYS, BOOB** | Free allocation untuk Agent ID | On-chain | Alokasi gratisnya **sudah habis** per 9 Nov 2026 — menunjukkan demand riil, tapi juga persaingan memperebutkan holder yang sama. |
| **BNBbaby "Open Casting"** | "Agents Only — each agent can claim 1 free copy" | On-chain (kontrak `0xD0079025a9Bb66a7a1de991De2E4326FABA35729`) | Pola mint gratis gated Agent ID. |

**Kesimpulan pola umum:**

1. **Semua proyek yang serius melakukan gating ON-CHAIN** (kontrak sale/mint membaca registry Agent ID langsung). Tidak ditemukan proyek yang hanya cek `balanceOf` di frontend — karena cek frontend tidak bisa dipercaya juri (bisa di-bypass) dan tidak menghasilkan data on-chain yang dihitung Binance (interaksi harus dengan kontrak yang disubmit).
2. **"Kedalaman integrasi" (30%) menurut kriteria resmi = Agent ID ada di core business flow.** Untuk check-in game, itu berarti:
   - ✅ `checkIn()` revert kalau `msg.sender` bukan holder (modifier on-chain).
   - ✅ Streak, leaderboard, dan reward memakai **nama `.ai` dari `handleOf`** sebagai identitas (bukan alamat 0x mentah).
   - ✅ Event on-chain mencatat `handle` agar interaksi holder mudah dihitung Binance.
   - ❌ Sekadar menampilkan "arzen.ai" di header setelah cek `balanceOf` di frontend = integrasi dangkal, hampir pasti skor depth rendah.
3. **Gratis (gas only) adalah pola yang sudah terbukti menarik holder** (Ptah, MALTA first-share, BNBbaby). Check-in gratis selaras dengan pola ini dan menghindari red line "janji return" — selama tidak ada iming-iming hadiah uang yang dijanjikan.
4. **Risiko pola "free mint untuk Agent ID":** banyak proyek berebut holder yang sama (alokasi habis cepat). Diferensiasi check-in game harus di **retensi harian (streak)** — bukan sekadar sekali klaim.

### 3.3 Pola integrasi yang direkomendasikan untuk konsep check-in/streak

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentID {
    function balanceOf(address account) external view returns (uint256);
    function handleOf(address account) external view returns (string memory);
}

contract AgentCheckIn {
    IAgentID public constant AGENT_ID =
        IAgentID(0x60b9262456de011f7d15a54cdd8c48baaa8b022f);

    mapping(address => uint256) public lastCheckInDay;
    mapping(address => uint256) public streak;
    mapping(address => string) public handleOfPlayer;

    event CheckedIn(address indexed player, string handle, uint256 indexed day, uint256 streak);

    modifier onlyAgentHolder() {
        require(AGENT_ID.balanceOf(msg.sender) > 0, "Agent ID required");
        _;
    }

    function checkIn() external onlyAgentHolder {
        uint256 today = block.timestamp / 1 days;
        require(lastCheckInDay[msg.sender] != today, "Already checked in today");
        string memory handle = AGENT_ID.handleOf(msg.sender);
        if (lastCheckInDay[msg.sender] == today - 1) {
            streak[msg.sender] += 1;
        } else {
            streak[msg.sender] = 1;
        }
        lastCheckInDay[msg.sender] = today;
        handleOfPlayer[msg.sender] = handle;
        emit CheckedIn(msg.sender, handle, today, streak[msg.sender]);
    }
}
```

**Kenapa pola ini dinilai "dalam" oleh juri:**
- Gating di **modifier kontrak** (bukan frontend) — tidak bisa di-bypass.
- **Identitas `.ai` dipakai sebagai identitas produk** (leaderboard menampilkan `handle`, bukan `0x…`), bukan sekadar syarat masuk.
- Semua interaksi tercatat on-chain (event `CheckedIn` + storage) — Binance bisa menghitung 30+ alamat holder yang berinteraksi dari data on-chain.
- **Streak = business flow yang hanya bermakna dengan identitas permanen** (soulbound, 1 alamat = 1 nama, tidak bisa transfer) — ini argumen "real application value" untuk kriteria 30%.

**Yang harus dihindari (red lines):**
- Jangan membuat fitur "cari alamat dari nama `.ai`" sebagai fitur produk (dilarang eksplisit).
- Jangan pakai nama/domain mengandung "Binance"/"BNB".
- Jangan janjikan return/hadiah uang ("passive income", "daily earning") — kalau ada reward, framing-nya poin/poin streak, bukan uang.
- Kontrak harus open-source + terverifikasi di BscScan, dan semua permission owner (mis. `pause`, `setReward`) didokumentasikan.

---

## 4. BSC Testnet (chainId 97) — Apakah Agent ID Ada di Sana?

### 4.1 Jawaban: TIDAK ADA (terverifikasi live)

| Pengecekan | Hasil (19 Nov 2026) |
|---|---|
| `eth_getCode(0x60b9262456de011f7d15a54cdd8c48baaa8b022f)` di BSC testnet (`https://bsc-testnet-dataseed.bnbchain.org`, chainId `0x61` = 97) | **`0x`** — tidak ada bytecode, alamat kosong |
| Endpoint testnet lain (`https://testnet.bnbchain.org`) | HTTP 403 dari VM ini (tidak bisa disimpulkan apa-apa dari endpoint ini) |
| Endpoint testnet lama (`https://data-seed-prebsc-1-s1.bnbchain.org:8545`) | Timeout (tidak bisa disimpulkan apa-apa dari endpoint ini) |

**Kesimpulan:** kontrak Agent ID resmi **tidak di-deploy di BSC testnet**. Ini konsisten dengan desainnya: registrasi nama `.ai` hanya bisa lewat Binance App (butuh tanda tangan `signer` resmi) dan nama bersifat permanen — tidak ada alur testnet-nya. Tidak ditemukan pengumuman/dokumentasi resmi apa pun tentang deployment testnet Agent ID.

### 4.2 Cara test gating di testnet (fakta + rekomendasi teknis)

Karena kontrak asli tidak ada di testnet, opsinya:

**Opsi A — Mock contract (direkomendasikan, paling praktis).**
Deploy tiruan minimal `HandleRegistry` di testnet dengan fungsi yang sama persis (`balanceOf`, `handleOf`, `ownerOfHandle`, `isValidHandle`) tapi mint bebas (fungsi `mintTest(handle, to)` tanpa tanda tangan EIP-712). Kontrak dApp menerima alamat registry sebagai parameter constructor — di testnet isi alamat mock, di mainnet isi alamat resmi `0x60b9…022f`.

```solidity
// MockAgentID.sol — HANYA untuk testnet, jangan deploy di mainnet
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockAgentID is ERC721 {
    mapping(address => string) public handleOf;
    constructor() ERC721("SPACE ID Agent ID", "AI") {}
    function mintTest(string calldata handle, address to) external {
        handleOf[to] = handle;
        _mint(to, uint256(keccak256(bytes(handle))));
    }
    function ownerOfHandle(string calldata handle) external view returns (address) {
        return _ownerOf(uint256(keccak256(bytes(handle))));
    }
    function isValidHandle(string calldata handle) external pure returns (bool) {
        bytes memory b = bytes(handle);
        if (b.length < 3 || b.length > 20) return false;
        for (uint i; i < b.length; ++i) {
            uint8 c = uint8(b[i]);
            if (!((c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39))) return false;
        }
        return true;
    }
}
```

**Opsi B — Fork mainnet lokal (paling akurat).** Jalankan Anvil/Hardhat fork dari BSC mainnet (`--fork-url https://bsc-dataseed.binance.org/`), sehingga kontrak Agent ID asli + state aslinya (termasuk `arzen.ai` milik `0x94ce…bD`) tersedia di lingkungan lokal. Cocok untuk integration test sebelum deploy mainnet. Tidak butuh testnet sama sekali.

**Opsi C — Deploy langsung ke BSC mainnet dengan biaya kecil.** Karena check-in gratis (gas only) dan kontrak sederhana, biaya deploy + verifikasi BscScan di mainnet murah (puluhan sen dalam BNB). Hackathon mensyaratkan kontrak **di BNB Chain mainnet** + source terverifikasi — testnet tidak dihitung. Jadi testnet hanya untuk latihan; submission tetap mainnet.

**Peringatan:** jangan "mengaku" mock sebagai Agent ID resmi di UI testnet — beri label jelas "TEST MOCK — bukan Agent ID resmi" agar tidak menyesatkan.

---

## 5. Keputusan / Rekomendasi untuk Konsep Check-in/Streak

1. **Gating on-chain wajib** — modifier `onlyAgentHolder` pakai `balanceOf > 0` (cara resmi Binance) + simpan `handleOf(msg.sender)` untuk leaderboard.
2. **Jangan andalkan enumerable** — tidak ada `tokenOfOwnerByIndex`/`totalSupply`; ambil nama via `handleOf`, token ID via `keccak256(handle)`.
3. **Test di testnet pakai mock (Opsi A) atau fork mainnet lokal (Opsi B)** — kontrak asli tidak ada di testnet.
4. **Angka yang menentukan menang/kalah: 30 alamat holder Agent ID** harus berinteraksi dengan kontrak selama 18 Nov–9 Des 2026. Tanpa distribusi/ajakan ke komunitas Agent ID, kontrak sebagus apa pun tidak eligible. Ini risiko terbesar konsep ini, bukan teknisnya.
5. **Jangan bangun fitur lookup nama→alamat sebagai fitur** (red line). Lookup hanya internal untuk leaderboard pemain yang sudah check-in.
6. **Perlu diverifikasi sebelum build (belum terjawab dalam riset ini):** apakah Web3 Name SDK mendukung `.ai` (kemungkinan besar belum — pakai direct call saja), dan bagaimana cara submit resmi (form/link submit tidak ada di pengumuman; hanya disebut "submit project name, website, contract addresses…" selama Submission Period — cek kanal resmi Binance Wallet/BNB Chain untuk tautan submit).

---

## 6. Daftar Link Sumber

| # | Sumber | URL |
|---|---|---|
| 1 | Pengumuman resmi Binance — Agent ID Hackathon (aturan, kriteria 30/25/25/20, red lines, hadiah, alamat kontrak, cara cek `balanceOf`) | https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf |
| 2 | BscScan — kontrak Agent ID `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (token page; akses langsung dari VM ini diblokir — 000, jadi ABI diambil via Sourcify) | https://bscscan.com/token/0x60b9262456de011f7d15a54cdd8c48baaa8b022f |
| 3 | Sourcify — source terverifikasi exact match + ABI lengkap `HandleRegistry` (chain 56) | https://sourcify.dev/server/v2/contract/56/0x60b9262456de011f7d15a54cdd8c48baaa8b022f?fields=sources,metadata |
| 4 | SPACE ID docs — Web3 Name SDK (pola `getAddress` / `getDomainName`, TLD `.bnb`/`.eth`/dll) — dibaca via mirror Manta (konten sama dengan docs SPACE ID) | https://docs.manta.network/docs/manta-pacific/Space%20ID |
| 5 | SPACE ID docs — Web3 Name SDK (mirror Gnosis Chain) | https://docs.gnosischain.com/tools/web3-name-sdk |
| 6 | SPACE ID docs — root (HTTP 200, diverifikasi hidup 19 Nov 2026) | https://docs.space.id/ |
| 7 | Binance Oracle docs — SPACE ID: SID Registry & Public Resolver, alamat registry BSC | https://oracle.binance.com/docs/knowledge-base/space-id/ |
| 8 | npm — `@web3-name-sdk/core` (SDK resolusi SPACE ID) | https://socket.dev/npm/package/@web3-name-sdk/core/overview/0.4.0-beta.1 |
| 9 | Ptah Proof of Agent — contoh proyek third-party gated Agent ID (mint kartu soulbound, raffle harian) | https://ptah.trade/poa |
| 10 | AirdropBuzz — Binance Agent ID guide: verifikasi proyek third-party (MALTA, YAMA, Ptah, dll.), pola gating on-chain, status alokasi | https://airdropbuzz.com/airdrop/binance-agent-id-guide |
| 11 | Blog — Binance Agent ID claim (format nama, 1 per user, non-transferable, Yi He `heyi.ai`) | https://newdailycurrentafairs.blogspot.com/2026/10/binance-agent-id-claim-your-free-ai.html |
| 12 | Tutorial Agentic Wallet + Agent ID (aturan nama 3–15 karakter, klaim via Binance App) | https://monsterblockhk.com/en/binance-agentic-wallet-guide/ |
| 13 | Metadata Agent ID (contoh live) | https://agentid.prd.space.id/metadata/arzen.json |
| 14 | Binance Square — pengumuman hackathon (ringkasan, pembagian 58.000 + 2.000 USDC) | https://www.binance.com/en-BH/square/post/11-18-2026-binance-wallet-and-bnb-chain-to-host-agent-id-hackathon-with-60-000-usdc-in-rewards-389517706162185 |

### Catatan akses & batas riset

- **BscScan page/API dari VM ini tidak bisa diakses langsung** (`browser.open` ke bscscan.com gagal; `api.bscscan.com` tanpa API key mengembalikan respons kosong; `api.etherscan.io/v2` butuh API key — "Missing/Invalid API Key"). ABI + source lengkap didapat dari **Sourcify exact match** (200 OK, 187 KB, `contractName: HandleRegistry`, compiler 0.8.24) dan **semua fungsi kunci diverifikasi ulang live via RPC mainnet** — jadi kesimpulan tidak bergantung pada BscScan.
- **BscScan testnet endpoint `testnet.bnbchain.org` mengembalikan 403** dan endpoint `data-seed-prebsc-1-s1` timeout dari VM ini; kesimpulan "tidak ada kontrak di testnet" didasarkan pada `eth_getCode` = `0x` via `https://bsc-testnet-dataseed.bnbchain.org` (endpoint yang berhasil menjawab, chainId 0x61 = 97).
- **Tidak ditemukan** dalam riset ini: (a) panduan integrasi Agent ID resmi dari Binance/SPACE ID; (b) bukti Web3 Name SDK mendukung TLD `.ai`; (c) tautan/form submit hackathon (tidak ada di pengumuman); (d) alamat registry/resolver `.ai` di testnet. Keempatnya dicatat sebagai "belum terverifikasi", bukan diasumsikan ada.
- Tidak ada deploy, transaksi, dana, akun, atau API key yang dibuat/disentuh dalam riset ini. Semua panggilan hanya `eth_call` (read-only) + HTTP GET publik.
