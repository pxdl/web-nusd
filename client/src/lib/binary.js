/**
 * Shared binary parsing utilities for Wii/DSi signed data structures.
 *
 * TMD, Ticket, and WAD files all use the same signature envelope format:
 *   [4 bytes sig_type] [signature] [padding] [header/body...]
 *
 * The signature size and padding vary by type, but the mapping is always
 * the same. These utilities eliminate that duplication.
 */

/**
 * Compute the byte offset where the signed header/body begins,
 * given the signature type field value.
 *
 * @param {number} sigType - Signature type (first 4 bytes of the structure)
 * @returns {number} Byte offset of the header that follows the signature
 */
export function getSignedHeaderOffset(sigType) {
  switch (sigType) {
    case 0x00010000: return 4 + 512 + 60; // RSA-4096
    case 0x00010001: return 4 + 256 + 60; // RSA-2048 (most common)
    case 0x00010002: return 4 + 60 + 64;  // ECDSA
    default:         return 0x140;         // Fallback (RSA-2048)
  }
}

/**
 * Read a null-terminated ASCII string from an ArrayBuffer.
 *
 * @param {ArrayBuffer} buffer
 * @param {number} offset - Byte offset
 * @param {number} maxLength - Maximum number of bytes to read
 * @returns {string}
 */
export function readNullTermString(buffer, offset, maxLength) {
  const bytes = new Uint8Array(buffer, offset, maxLength);
  const nullIdx = bytes.indexOf(0);
  const end = nullIdx >= 0 ? nullIdx : maxLength;
  return new TextDecoder('ascii').decode(bytes.slice(0, end));
}

/**
 * Read a big-endian 64-bit value as a hex string (16 chars, zero-padded).
 *
 * @param {DataView} view
 * @param {number} offset
 * @returns {string} 16-character lowercase hex string
 */
export function readU64Hex(view, offset) {
  const high = view.getUint32(offset).toString(16).padStart(8, '0');
  const low = view.getUint32(offset + 4).toString(16).padStart(8, '0');
  return high + low;
}

/**
 * Read a big-endian 64-bit value as a BigInt.
 *
 * @param {DataView} view
 * @param {number} offset
 * @returns {bigint}
 */
export function readU64(view, offset) {
  const high = view.getUint32(offset);
  const low = view.getUint32(offset + 4);
  return BigInt(high) * BigInt(0x100000000) + BigInt(low);
}

/**
 * Convert a Uint8Array to a lowercase hex string.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
