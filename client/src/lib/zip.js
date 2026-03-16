/**
 * Minimal ZIP file creator
 *
 * Creates uncompressed (stored) ZIP archives entirely in the browser.
 * No external dependencies — uses only ArrayBuffer and DataView.
 *
 * ZIP format reference: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 */

// Pre-computed CRC-32 lookup table (IEEE 802.3 polynomial)
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

/**
 * Compute CRC-32 checksum.
 * @param {Uint8Array} data
 * @returns {number} CRC-32 as unsigned 32-bit integer
 */
function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Create a ZIP file from an array of named files.
 *
 * @param {Array<{name: string, data: Uint8Array}>} files - Files to include
 * @param {string} [folder] - Optional folder prefix (e.g., "titleId/")
 * @returns {Uint8Array} Complete ZIP file data
 */
export function createZip(files, folder) {
  const encoder = new TextEncoder();
  const entries = [];
  let dataOffset = 0;

  // Build entries with local headers
  for (const file of files) {
    const name = folder ? `${folder}${file.name}` : file.name;
    const nameBytes = encoder.encode(name);
    const crc = crc32(file.data);
    const size = file.data.length;

    entries.push({
      nameBytes,
      crc,
      size,
      data: file.data,
      localHeaderOffset: dataOffset,
    });

    // Local header size: 30 + name length
    // Data size: file size
    dataOffset += 30 + nameBytes.length + size;
  }

  // Calculate central directory
  let centralDirSize = 0;
  for (const entry of entries) {
    centralDirSize += 46 + entry.nameBytes.length;
  }

  // Total: local entries + central directory + end record (22 bytes)
  const totalSize = dataOffset + centralDirSize + 22;
  const result = new Uint8Array(totalSize);
  const view = new DataView(result.buffer);
  let pos = 0;

  // Write local file headers + data
  for (const entry of entries) {
    // Local file header signature
    view.setUint32(pos, 0x04034b50, true); pos += 4;
    // Version needed (2.0)
    view.setUint16(pos, 20, true); pos += 2;
    // General purpose bit flag
    view.setUint16(pos, 0, true); pos += 2;
    // Compression method (0 = stored)
    view.setUint16(pos, 0, true); pos += 2;
    // Last mod time
    view.setUint16(pos, 0, true); pos += 2;
    // Last mod date
    view.setUint16(pos, 0x0021, true); pos += 2; // 1980-01-01
    // CRC-32
    view.setUint32(pos, entry.crc, true); pos += 4;
    // Compressed size
    view.setUint32(pos, entry.size, true); pos += 4;
    // Uncompressed size
    view.setUint32(pos, entry.size, true); pos += 4;
    // File name length
    view.setUint16(pos, entry.nameBytes.length, true); pos += 2;
    // Extra field length
    view.setUint16(pos, 0, true); pos += 2;
    // File name
    result.set(entry.nameBytes, pos); pos += entry.nameBytes.length;
    // File data
    result.set(entry.data, pos); pos += entry.size;
  }

  // Write central directory
  const centralDirOffset = pos;
  for (const entry of entries) {
    // Central directory header signature
    view.setUint32(pos, 0x02014b50, true); pos += 4;
    // Version made by
    view.setUint16(pos, 20, true); pos += 2;
    // Version needed
    view.setUint16(pos, 20, true); pos += 2;
    // Flags
    view.setUint16(pos, 0, true); pos += 2;
    // Compression
    view.setUint16(pos, 0, true); pos += 2;
    // Mod time
    view.setUint16(pos, 0, true); pos += 2;
    // Mod date
    view.setUint16(pos, 0x0021, true); pos += 2;
    // CRC-32
    view.setUint32(pos, entry.crc, true); pos += 4;
    // Compressed size
    view.setUint32(pos, entry.size, true); pos += 4;
    // Uncompressed size
    view.setUint32(pos, entry.size, true); pos += 4;
    // File name length
    view.setUint16(pos, entry.nameBytes.length, true); pos += 2;
    // Extra field length
    view.setUint16(pos, 0, true); pos += 2;
    // File comment length
    view.setUint16(pos, 0, true); pos += 2;
    // Disk number start
    view.setUint16(pos, 0, true); pos += 2;
    // Internal file attributes
    view.setUint16(pos, 0, true); pos += 2;
    // External file attributes
    view.setUint32(pos, 0, true); pos += 4;
    // Local header offset
    view.setUint32(pos, entry.localHeaderOffset, true); pos += 4;
    // File name
    result.set(entry.nameBytes, pos); pos += entry.nameBytes.length;
  }

  // End of central directory record
  view.setUint32(pos, 0x06054b50, true); pos += 4;
  // Disk number
  view.setUint16(pos, 0, true); pos += 2;
  // Disk with central dir
  view.setUint16(pos, 0, true); pos += 2;
  // Entries on this disk
  view.setUint16(pos, entries.length, true); pos += 2;
  // Total entries
  view.setUint16(pos, entries.length, true); pos += 2;
  // Central dir size
  view.setUint32(pos, centralDirSize, true); pos += 4;
  // Central dir offset
  view.setUint32(pos, centralDirOffset, true); pos += 4;
  // Comment length
  view.setUint16(pos, 0, true); pos += 2;

  return result;
}
