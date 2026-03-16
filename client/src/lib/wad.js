/**
 * WAD Packer
 *
 * Creates installable WAD files from NUS components.
 *
 * WAD Structure (all big-endian):
 *   Header (0x20 bytes):
 *     0x00: u32 header_size    = 0x20
 *     0x02: u16 type           = 0x4973 ("Is") for installable
 *     0x04: u16 padding        = 0x0000
 *     0x08: u32 cert_chain_size
 *     0x0C: u32 reserved       = 0x00000000
 *     0x10: u32 ticket_size
 *     0x14: u32 tmd_size
 *     0x18: u32 data_size      (total encrypted content size with alignment)
 *     0x1C: u32 footer_size    = 0x00000000
 *
 *   Then sections in order, each aligned to 0x40 bytes:
 *     1. Certificate chain
 *     2. Ticket
 *     3. TMD
 *     4. Encrypted content data (contents concatenated, each aligned to 0x40)
 *     5. Footer (optional, usually empty)
 *
 * Reference: https://wiibrew.org/wiki/WAD_files
 */

const ALIGNMENT = 0x40;

/** Align a size to the nearest multiple of ALIGNMENT */
function align(size) {
  const remainder = size % ALIGNMENT;
  return remainder === 0 ? size : size + (ALIGNMENT - remainder);
}

/** Create padding bytes to align a section */
function createPadding(currentSize) {
  const aligned = align(currentSize);
  const padLen = aligned - currentSize;
  return new Uint8Array(padLen);
}

/**
 * Pack components into a WAD file.
 *
 * @param {Uint8Array} certChain  - Certificate chain data
 * @param {Uint8Array} ticket     - Raw ticket (cetk) data
 * @param {Uint8Array} tmd        - Raw TMD data
 * @param {Uint8Array[]} contents - Array of encrypted content blobs (in TMD order)
 * @returns {Uint8Array} The complete WAD file
 */
export function packWAD(certChain, ticket, tmd, contents) {
  // Calculate content data size (each content aligned to 0x40)
  let dataSize = 0;
  for (let i = 0; i < contents.length; i++) {
    dataSize += align(contents[i].length);
  }

  // Build WAD header (0x20 bytes)
  const header = new ArrayBuffer(0x20);
  const hv = new DataView(header);
  hv.setUint32(0x00, 0x00000020);        // header size
  hv.setUint16(0x04, 0x4973);            // "Is" — installable WAD type
  hv.setUint16(0x06, 0x0000);            // padding
  hv.setUint32(0x08, certChain.length);   // cert chain size
  hv.setUint32(0x0C, 0x00000000);        // reserved
  hv.setUint32(0x10, ticket.length);      // ticket size
  hv.setUint32(0x14, tmd.length);         // TMD size
  hv.setUint32(0x18, dataSize);           // data size
  hv.setUint32(0x1C, 0x00000000);        // footer size

  // Calculate total WAD size
  const totalSize =
    align(0x20) +                    // header
    align(certChain.length) +        // cert chain
    align(ticket.length) +           // ticket
    align(tmd.length) +              // TMD
    dataSize;                        // content data (already aligned per-content)

  // Assemble WAD
  const wad = new Uint8Array(totalSize);
  let offset = 0;

  // 1. Header
  wad.set(new Uint8Array(header), offset);
  offset += align(0x20);

  // 2. Certificate chain
  wad.set(certChain, offset);
  offset += align(certChain.length);

  // 3. Ticket
  wad.set(ticket, offset);
  offset += align(ticket.length);

  // 4. TMD
  wad.set(tmd, offset);
  offset += align(tmd.length);

  // 5. Content data
  for (const content of contents) {
    wad.set(content, offset);
    offset += align(content.length);
  }

  return wad;
}

/**
 * Generate a default certificate chain.
 * In the original NUSD, certs are collected from NUS on first boot.
 * For our purposes, we can build one from the ticket and TMD cert chains.
 *
 * The cert chain for a standard Wii WAD consists of:
 *   - CA certificate (signed by Root)
 *   - CP certificate (signs TMD, signed by CA)
 *   - XS certificate (signs Ticket, signed by CA)
 *
 * Since we download from NUS, the TMD and ticket already contain
 * their signing certificates appended. We can extract them.
 */

/**
 * Extract certificates from raw TMD data.
 * Certificates are appended after the TMD content records.
 *
 * @param {Uint8Array} tmdData - Full TMD data including appended certs
 * @param {number} numContents - Number of content records
 * @returns {Uint8Array|null} Certificate chain or null if not found
 */
export function extractCertsFromTMD(tmdData, numContents) {
  // TMD structure: sig(4) + sig_data(256) + pad(60) + header(0xA4) + contents(numContents * 0x24)
  // = 0x140 + 0xA4 + numContents * 0x24
  const sigType = new DataView(tmdData.buffer, tmdData.byteOffset).getUint32(0);

  let headerSize;
  switch (sigType) {
    case 0x00010000: headerSize = 4 + 512 + 60; break;
    case 0x00010001: headerSize = 4 + 256 + 60; break;
    case 0x00010002: headerSize = 4 + 60 + 64; break;
    default: headerSize = 0x140;
  }

  const tmdBodyEnd = headerSize + 0xA4 + numContents * 0x24;

  if (tmdData.length > tmdBodyEnd) {
    return tmdData.slice(tmdBodyEnd);
  }

  return null;
}

/**
 * Build a minimal cert chain from TMD and Ticket certificate data.
 * The standard WAD cert chain order is: CA, CP, XS
 * But many tools accept whatever order the certs come in.
 */
export function buildCertChain(tmdCerts, ticketCerts) {
  if (tmdCerts && ticketCerts) {
    // Concatenate — TMD certs typically have CA+CP, ticket has CA+XS
    // We want CA + CP + XS. For simplicity, just concat unique certs.
    const combined = new Uint8Array(tmdCerts.length + ticketCerts.length);
    combined.set(tmdCerts, 0);
    combined.set(ticketCerts, tmdCerts.length);
    return combined;
  }

  return tmdCerts || ticketCerts || new Uint8Array(0);
}

/**
 * Generate a WAD filename from title info.
 *
 * @param {string} titleId - 16-char hex title ID
 * @param {number} version - Title version number
 * @param {string} [name]  - Optional title name from database
 * @returns {string} Suggested filename
 */
export function generateWadFilename(titleId, version, name) {
  const tidUpper = titleId.toUpperCase();
  const vStr = `v${version}`;

  if (name) {
    // Sanitize name for filesystem
    const safeName = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    return `${safeName}-${tidUpper}-${vStr}.wad`;
  }

  return `${tidUpper}-${vStr}.wad`;
}
