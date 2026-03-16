# Web NUS Downloader

A browser-based client for downloading titles from Nintendo's Update Servers (NUS), inspired by [NUS Downloader](https://github.com/WiiDatabase/nusdownloader) by WB3000/hamachi-mp/WiiDatabase.

## Architecture

```
┌────────────────────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│     React Frontend (Vite)      │────▶│  Express Proxy     │────▶│  Nintendo NUS     │
│                                │     │  Server (Node.js)  │     │  CDN Servers      │
│  • Title database browser      │     │                    │     │                   │
│  • TMD/Ticket parsing          │     │  • CORS proxy      │     │  nus.cdn.shop.    │
│  • WAD packing (binary)        │     │  • Request relay    │     │  wii.com          │
│  • AES decryption (Web Crypto) │     │  • Error handling   │     │                   │
│  • SHA-1 verification          │     │                    │     │  ccs.cdn.wup.     │
│  • File download (Blob API)    │     │                    │     │  shop.nintendo.net│
└────────────────────────────────┘     └───────────────────┘     └──────────────────┘
        Browser (client-side)              localhost:3001            Remote servers
```

**Why a proxy?** Nintendo's CDN servers don't serve CORS headers, so browsers block direct `fetch()` requests. The Express proxy relays these requests — it's the only server-side component. All heavy lifting (parsing, crypto, packing) happens client-side.

## Features

- **Title Database** — Browse and search common Wii system titles, IOS versions, and channels
- **TMD Parsing** — Full binary parsing of Title Metadata files
- **Ticket Parsing** — Extract encrypted title keys and metadata from cetk files
- **WAD Packing** — Assemble downloaded components into installable WAD files
- **Content Decryption** — AES-128-CBC decryption using Web Crypto API (requires user-provided common key)
- **SHA-1 Verification** — Verify decrypted content integrity against TMD hashes
- **Wii U CDN Fallback** — Switch to Wii U CDN when NUS is unavailable
- **Progress Tracking** — Real-time download progress and detailed logging

## Quick Start

### Prerequisites

- Node.js 18+ (for `fetch` support in the proxy server)
- npm

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd web-nusd

# Install all dependencies
npm run install:all

# Start both server and client in development mode
npm run dev
```

This will start:
- **Proxy server** at `http://localhost:3001`
- **React app** at `http://localhost:5173`

### Manual Setup

If you prefer to run them separately:

```bash
# Terminal 1: Start the proxy server
cd server
npm install
npm run dev

# Terminal 2: Start the React frontend
cd client
npm install
npm run dev
```

## Usage

1. Open `http://localhost:5173` in your browser
2. Verify the proxy status shows "Connected" (green dot)
3. Enter a Title ID (16 hex characters) or use the Database browser
4. Optionally enter a specific version number
5. Select your options:
   - **Pack WAD** — Create a .wad file (requires ticket)
   - **Keep encrypted contents** — Save raw encrypted files
   - **Create decrypted contents** — Decrypt .app files (requires common key)
   - **Use Wii U CDN** — Use the Wii U CDN as fallback
6. Click "Start NUS Download"

### Common Title IDs

| Title | ID | Version |
|-------|-----|---------|
| System Menu 4.3U | `0000000100000002` | 513 |
| System Menu 4.3E | `0000000100000002` | 514 |
| IOS58 | `000000010000003a` | 6176 |
| IOS80 | `0000000100000050` | 6944 |

### About Decryption

Content decryption requires the **Wii Common Key**, which is not included in this project for legal reasons. You can extract it from your own Wii console using homebrew tools. The key is 16 bytes (entered as 32 hex characters).

## Project Structure

```
web-nusd/
├── server/
│   ├── index.js          # Express proxy server
│   └── package.json
├── client/
│   ├── index.html        # Entry HTML
│   ├── vite.config.js    # Vite configuration
│   ├── src/
│   │   ├── main.jsx      # React entry point
│   │   ├── App.jsx       # Main application component
│   │   └── lib/
│   │       ├── nus-client.js  # NUS API client
│   │       ├── tmd.js         # TMD binary parser
│   │       ├── ticket.js      # Ticket (cetk) parser
│   │       ├── wad.js         # WAD packer
│   │       ├── crypto.js      # AES decryption & SHA-1
│   │       └── database.js    # Title database
│   └── package.json
├── package.json          # Root workspace scripts
└── README.md
```

## Technical Details

### Binary Formats

All binary parsing uses native `ArrayBuffer`, `DataView`, and `Uint8Array` — no external dependencies needed. Formats are big-endian as per Nintendo's conventions.

### Cryptography

Uses the **Web Crypto API** (`crypto.subtle`):
- `AES-CBC` for title key decryption and content decryption
- `SHA-1` for content integrity verification

No WASM or external crypto libraries required.

### WAD File Format

WADs are structured as:
1. **Header** (0x20 bytes) — Sizes of each section
2. **Certificate Chain** — Signing certificates
3. **Ticket** — Contains encrypted title key
4. **TMD** — Title metadata with content hashes
5. **Content Data** — Encrypted content files, each aligned to 0x40 bytes

Each section is aligned to a 64-byte (0x40) boundary.

## Roadmap

- [ ] IOS patching (trucha bug, NAND permissions, etc.)
- [ ] Batch downloading via NUS scripts
- [ ] Import/export of database.xml from original NUSD
- [ ] Wii U title support
- [ ] DSi title support
- [ ] Deployable proxy (Cloudflare Worker / Vercel Edge Function)
- [ ] PWA support for offline use
- [ ] WAD unpacking / inspection tool

## Credits

- **WB3000** — Original NUS Downloader
- **hamachi-mp** — NUS Downloader v1.9 Mod
- **WiiDatabase** — NUS-Fix mod and PyNUSD
- **WiiBrew community** — Format documentation
- **grp** — Wii.py crypto reference

## License

GPL-3.0, consistent with the original NUS Downloader.
