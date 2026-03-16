# Web NUS Downloader

A browser-based client for downloading titles from Nintendo's Update Servers (NUS). Supports Wii, vWii, and DSi platforms with a complete title database, WAD/TAD packing, content decryption, and IOS patching.

![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **1800+ titles** — Bundled NUSGet databases for Wii (903 titles), vWii (39), and DSi (18), with searchable tree browser
- **WAD / TAD packing** — Assemble downloads into installable archives with proper certificate chains
- **Content decryption** — AES-128-CBC via Web Crypto API with SHA-1 verification
- **IOS patching** — Trucha Bug, ES_Identify, NAND Permissions, Version Patch
- **vWii support** — Optional title key re-encryption for Wii hardware compatibility
- **Batch downloads** — Load `.nus` script files to download multiple titles
- **WAD Tools** — Unpack existing WAD files, export individual components
- **Shareable URLs** — Title ID, version, platform encoded in URL for easy sharing
- **Version picker** — Browse all known versions for each title with one-click selection
- **Database import** — Load NUSGet JSON or original NUSD XML databases

## Architecture

```
Browser (React + Vite)          Express Proxy (Node.js)         Nintendo CDN
─────────────────────           ───────────────────────         ────────────
• Title database                • CORS proxy                    • nus.cdn.shop.wii.com
• Binary parsing (TMD/Ticket)   • Wii/Wii U/DSi routing         • ccs.cdn.wup.shop.nintendo.net
• AES decryption (Web Crypto)   • User-agent handling           • nus.cdn.t.shop.nintendowifi.net
• WAD/TAD/ZIP packing           • Request relay
• UI and downloads
```

**Why a proxy?** Nintendo's CDN doesn't serve CORS headers. The Express server relays requests — all crypto, parsing, and packing happens client-side in the browser.

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/web-nusd.git
cd web-nusd
npm run install:all

# Start both proxy server and React app
npm run dev
```

Opens at `http://localhost:5173` with the proxy at `http://localhost:3001`.

## Usage

1. **Select a platform** — Wii, vWii, or DSi (loads the appropriate title database)
2. **Pick a title** — Browse the tree or search by name/TID, or switch to manual entry for custom title IDs
3. **Choose a version** — Click a version chip or leave blank for latest
4. **Set options** — Pack WAD, keep encrypted, decrypt contents, IOS patches
5. **Download** — Click "Start NUS Download"

### Decryption

Content decryption and IOS patching require a **common key** (Wii, Korean, vWii, or DSi depending on the title). Keys are not included for legal reasons — extract from your own console using homebrew tools. Enter as 32 hex characters.

### Shareable Links

All configuration is encoded in the URL. Share a link like:
```
http://localhost:5173/?tid=0000000100000002&ver=513&console=wii
```

## Project Structure

```
web-nusd/
├── client/
│   ├── src/
│   │   ├── App.jsx              # Main UI component
│   │   ├── styles.css           # Animations and interactive styles
│   │   ├── data/                # Bundled NUSGet databases (JSON)
│   │   │   ├── wii-database.json
│   │   │   ├── vwii-database.json
│   │   │   └── dsi-database.json
│   │   └── lib/
│   │       ├── binary.js        # Shared binary parsing utilities
│   │       ├── crypto.js        # AES-CBC encryption/decryption, SHA-1
│   │       ├── database.js      # Title database with NUSGet/NUSD import
│   │       ├── ios-patcher.js   # IOS binary patching (4 patch types)
│   │       ├── nus-client.js    # NUS API client with retry logic
│   │       ├── script-parser.js # .nus batch script parser
│   │       ├── tmd.js           # Title Metadata parser
│   │       ├── ticket.js        # Ticket (cetk) parser
│   │       ├── wad.js           # WAD/TAD packer and unpacker
│   │       └── zip.js           # Minimal ZIP file creator
│   └── index.html
├── server/
│   └── index.js                 # Express CORS proxy
├── LICENSE
└── README.md
```

## Technical Notes

- **No external crypto dependencies** — Uses the browser's native Web Crypto API for AES-128-CBC and SHA-1
- **No-padding AES-CBC** — Nintendo doesn't use PKCS7 padding; we work around Web Crypto's requirement by appending a synthetic padding block
- **Certificate chain** — Downloaded from System Menu 4.3U (CA + CP + XS), with fallback to TMD extraction
- **boot2 support** — TID `0000000100000001` uses WAD type `"ib"` instead of `"Is"`
- **TAD format** — DSi archives swap the Meta and Content sections relative to WAD
- **vWii re-encryption** — Decrypts title key with vWii common key, re-encrypts with Wii common key for hardware compatibility

## Credits

- **[WB3000](https://github.com/WB3000/nusdownloader)** — Original NUS Downloader
- **hamachi-mp** — NUS Downloader v1.9 Mod
- **[WiiDatabase](https://github.com/WiiDatabase/nusdownloader)** — NUSD fork with Wii U CDN support
- **[NinjaCheetah / NUSGet](https://github.com/NinjaCheetah/NUSGet)** — Title databases and feature reference
- **[WiiBrew](https://wiibrew.org)** / **[DSiBrew](https://dsibrew.org)** — Format documentation

## License

[MIT](LICENSE)
