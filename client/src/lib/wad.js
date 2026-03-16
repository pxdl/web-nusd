/**
 * WAD Packer / Unpacker
 *
 * Creates and extracts installable WAD files.
 *
 * WAD Structure (all big-endian):
 *   Header (0x20 bytes):
 *     0x00: u32 header_size    = 0x20
 *     0x04: u16 type           = 0x4973 ("Is") for installable
 *     0x06: u16 padding        = 0x0000
 *     0x08: u32 cert_chain_size
 *     0x0C: u32 reserved       = 0x00000000
 *     0x10: u32 ticket_size
 *     0x14: u32 tmd_size
 *     0x18: u32 data_size      (total encrypted content size with alignment)
 *     0x1C: u32 footer_size    = 0x00000000
 *
 *   Sections (each aligned to 0x40 bytes):
 *     1. Certificate chain
 *     2. Ticket
 *     3. TMD
 *     4. Encrypted content data (each content aligned to 0x40)
 *     5. Footer (optional)
 *
 * Reference: https://wiibrew.org/wiki/WAD_files
 */

import { getSignedHeaderOffset } from './binary.js';

const ALIGNMENT = 0x40;

/** Align a size to the nearest multiple of ALIGNMENT */
function align(size) {
  const remainder = size % ALIGNMENT;
  return remainder === 0 ? size : size + (ALIGNMENT - remainder);
}

/**
 * Pack components into a WAD file.
 *
 * @param {Uint8Array} certChain  - Certificate chain data
 * @param {Uint8Array} ticket     - Raw ticket (cetk) data
 * @param {Uint8Array} tmd        - Raw TMD data
 * @param {Uint8Array[]} contents - Array of encrypted content blobs (in TMD order)
 * @param {object} [options] - Optional settings
 * @param {string} [options.titleId] - Title ID for boot2 detection
 * @returns {Uint8Array} The complete WAD file
 */
export function packWAD(certChain, ticket, tmd, contents, options) {
  // Calculate content data size (each content aligned to 0x40)
  let dataSize = 0;
  for (let i = 0; i < contents.length; i++) {
    dataSize += align(contents[i].length);
  }

  // Build WAD header (0x20 bytes)
  const header = new ArrayBuffer(0x20);
  const hv = new DataView(header);
  // boot2 (TID 0000000100000001) uses type "ib" instead of "Is"
  const isBoot2 = options?.titleId?.toLowerCase() === '0000000100000001';
  hv.setUint32(0x00, 0x00000020);        // header size
  hv.setUint16(0x04, isBoot2 ? 0x6962 : 0x4973); // "ib" for boot2, "Is" for normal
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
 * Unpack a WAD file into its components.
 *
 * @param {Uint8Array|ArrayBuffer} wadData - Complete WAD file
 * @returns {{
 *   headerSize: number,
 *   wadType: number,
 *   certChain: Uint8Array,
 *   ticket: Uint8Array,
 *   tmd: Uint8Array,
 *   contents: Array<{id: number, idHex: string, index: number, type: number, size: number, data: Uint8Array}>,
 *   footer: Uint8Array|null,
 * }}
 */
export function unpackWAD(wadData) {
  const data = wadData instanceof Uint8Array ? wadData : new Uint8Array(wadData);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const headerSize = view.getUint32(0x00);
  const wadType = view.getUint16(0x04);
  const certChainSize = view.getUint32(0x08);
  const ticketSize = view.getUint32(0x10);
  const tmdSize = view.getUint32(0x14);
  const dataSize = view.getUint32(0x18);
  const footerSize = view.getUint32(0x1C);

  let offset = align(headerSize);

  const certChain = data.slice(offset, offset + certChainSize);
  offset += align(certChainSize);

  const ticket = data.slice(offset, offset + ticketSize);
  offset += align(ticketSize);

  const tmd = data.slice(offset, offset + tmdSize);
  offset += align(tmdSize);

  // Parse TMD to get content records
  const tmdView = new DataView(tmd.buffer, tmd.byteOffset, tmd.byteLength);
  const tmdHeaderOffset = getSignedHeaderOffset(tmdView.getUint32(0));
  const numContents = tmdView.getUint16(tmdHeaderOffset + 0x9E);

  const contents = [];
  for (let i = 0; i < numContents; i++) {
    const recOffset = tmdHeaderOffset + 0xA4 + i * 0x24;
    const contentId = tmdView.getUint32(recOffset);
    const contentIndex = tmdView.getUint16(recOffset + 0x04);
    const contentType = tmdView.getUint16(recOffset + 0x06);
    const sizeHigh = tmdView.getUint32(recOffset + 0x08);
    const sizeLow = tmdView.getUint32(recOffset + 0x0C);
    const size = sizeHigh * 0x100000000 + sizeLow;

    // Encrypted size is content size rounded up to AES block boundary
    const encSize = Math.ceil(size / 16) * 16;
    const contentData = data.slice(offset, offset + encSize);

    contents.push({
      id: contentId,
      idHex: contentId.toString(16).padStart(8, '0'),
      index: contentIndex,
      type: contentType,
      size,
      data: contentData,
    });
    offset += align(encSize);
  }

  let footer = null;
  if (footerSize > 0 && offset + footerSize <= data.length) {
    footer = data.slice(offset, offset + footerSize);
  }

  return { headerSize, wadType, certChain, ticket, tmd, contents, footer };
}

/**
 * Extract certificates from raw TMD data.
 * Certificates are appended after the TMD content records.
 *
 * @param {Uint8Array} tmdData - Full TMD data including appended certs
 * @param {number} numContents - Number of content records
 * @returns {Uint8Array|null} Certificate chain or null if not found
 */
export function extractCertsFromTMD(tmdData, numContents) {
  const headerSize = getSignedHeaderOffset(
    new DataView(tmdData.buffer, tmdData.byteOffset).getUint32(0)
  );

  const tmdBodyEnd = headerSize + 0xA4 + numContents * 0x24;

  if (tmdData.length > tmdBodyEnd) {
    return tmdData.slice(tmdBodyEnd);
  }

  return null;
}

/**
 * Pack a TAD file (DSi Title Archive).
 *
 * TAD is identical to WAD except the Meta section comes before Content.
 * When meta is empty (the common case), the output is byte-identical to WAD.
 *
 * @param {Uint8Array} certChain  - Certificate chain
 * @param {Uint8Array} ticket     - Ticket data
 * @param {Uint8Array} tmd        - TMD data
 * @param {Uint8Array[]} contents - Encrypted content blobs
 * @param {Uint8Array} [meta]     - Optional meta/footer data
 * @returns {Uint8Array} Complete TAD file
 */
export function packTAD(certChain, ticket, tmd, contents, meta) {
  const metaData = meta || new Uint8Array(0);

  let dataSize = 0;
  for (const content of contents) {
    dataSize += align(content.length);
  }

  const header = new ArrayBuffer(0x20);
  const hv = new DataView(header);
  hv.setUint32(0x00, 0x00000020);
  hv.setUint16(0x04, 0x4973);          // "Is"
  hv.setUint16(0x06, 0x0000);
  hv.setUint32(0x08, certChain.length);
  hv.setUint32(0x0C, 0x00000000);      // CRL size (unused)
  hv.setUint32(0x10, ticket.length);
  hv.setUint32(0x14, tmd.length);
  hv.setUint32(0x18, dataSize);
  hv.setUint32(0x1C, metaData.length);

  const totalSize =
    align(0x20) +
    align(certChain.length) +
    align(ticket.length) +
    align(tmd.length) +
    (metaData.length > 0 ? align(metaData.length) : 0) +
    dataSize;

  const tad = new Uint8Array(totalSize);
  let offset = 0;

  tad.set(new Uint8Array(header), offset);
  offset += align(0x20);

  tad.set(certChain, offset);
  offset += align(certChain.length);

  tad.set(ticket, offset);
  offset += align(ticket.length);

  tad.set(tmd, offset);
  offset += align(tmd.length);

  // TAD: Meta comes BEFORE Content (opposite of WAD)
  if (metaData.length > 0) {
    tad.set(metaData, offset);
    offset += align(metaData.length);
  }

  for (const content of contents) {
    tad.set(content, offset);
    offset += align(content.length);
  }

  return tad;
}

// Official WAD naming patterns from the original NUSD
const OFFICIAL_NAMES = {
  '0000000100000002': 'RVL-WiiSystemmenu-[v]',
  '0000000100000100': 'RVL-bc-[v]',
  '0000000100000101': 'RVL-mios-[v]',
};

/**
 * Generate a WAD filename.
 *
 * Supports template strings with placeholders:
 *   [v]   → version number
 *   [tid] → title ID (uppercase)
 *
 * Falls back to official naming patterns for known titles,
 * then IOS naming, then generic naming.
 *
 * @param {string} titleId  - 16-char hex title ID
 * @param {number} version  - Title version number
 * @param {string} [name]   - Optional title name from database
 * @param {string} [template] - Optional custom naming template
 * @returns {string} Suggested filename
 */
export function generateWadFilename(titleId, version, name, template) {
  const tid = titleId.toLowerCase();
  const vStr = String(version);

  // Use custom template if provided
  if (template && template.trim()) {
    return template
      .replace(/\[v\]/g, vStr)
      .replace(/\[tid\]/g, tid.toUpperCase())
      .replace(/\[name\]/g, name || tid.toUpperCase())
      + '.wad';
  }

  // Use official naming for known titles
  if (OFFICIAL_NAMES[tid]) {
    return OFFICIAL_NAMES[tid].replace('[v]', vStr) + '.wad';
  }

  // IOS titles: IOS{n}-64-v{version}.wad
  if (tid.startsWith('00000001000000') && tid !== '0000000100000001' && tid !== '0000000100000002') {
    const iosNum = parseInt(tid.slice(14), 16);
    if (iosNum > 2 && iosNum < 256) {
      return `IOS${iosNum}-64-v${vStr}.wad`;
    }
  }

  // Named titles
  if (name) {
    const safeName = sanitizeFilename(name);
    return `${safeName}-${tid.toUpperCase()}-v${vStr}.wad`;
  }

  return `${tid.toUpperCase()}-v${vStr}.wad`;
}

/** Strip characters that are invalid in filenames across platforms */
function sanitizeFilename(name) {
  return name.replace(/[/\\:*"?<>|]/g, '').trim();
}
