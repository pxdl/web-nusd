/**
 * TMD (Title Metadata) Parser
 *
 * Binary format reference: https://wiibrew.org/wiki/Title_metadata
 *
 * Structure (big-endian):
 *   0x000: u32  sig_type (0x00010001 = RSA-2048)
 *   0x004: u8[256] signature
 *   0x104: u8[60]  padding
 *   0x140: u8[64]  issuer
 *   0x180: u8      version
 *   0x181: u8      ca_crl_version
 *   0x182: u8      signer_crl_version
 *   0x183: u8      vwii_title (0 = Wii, 1 = vWii)
 *   0x184: u64     ios_title_id (system version / required IOS)
 *   0x18C: u64     title_id
 *   0x194: u32     title_type
 *   0x198: u16     group_id
 *   0x19A: u8[62]  reserved
 *   0x1D8: u32     access_rights
 *   0x1DC: u16     title_version
 *   0x1DE: u16     num_contents
 *   0x1E0: u16     boot_index
 *   0x1E2: u16     padding2
 *
 * Content records start at 0x1E4, each 0x24 bytes:
 *   0x00: u32  content_id
 *   0x04: u16  index
 *   0x06: u16  type (0x0001=normal, 0x4001=DLC, 0x8001=shared)
 *   0x08: u64  size
 *   0x10: u8[20] sha1_hash
 */

import { getSignedHeaderOffset, readNullTermString, readU64Hex, readU64 } from './binary.js';

export class TMD {
  constructor(data) {
    if (!(data instanceof ArrayBuffer)) {
      throw new Error('TMD data must be an ArrayBuffer');
    }

    this.raw = data;
    this.view = new DataView(data);
    this.parse();
  }

  parse() {
    this.sigType = this.view.getUint32(0x000);
    const headerOffset = getSignedHeaderOffset(this.sigType);

    // Issuer (64 bytes, null-terminated ASCII)
    this.issuer = readNullTermString(this.raw, headerOffset, 64);

    // Header fields
    this.version = this.view.getUint8(headerOffset + 0x40);
    this.caCrlVersion = this.view.getUint8(headerOffset + 0x41);
    this.signerCrlVersion = this.view.getUint8(headerOffset + 0x42);
    this.isVWii = this.view.getUint8(headerOffset + 0x43) === 1;

    // IOS Title ID (8 bytes)
    this.iosTitleId = readU64Hex(this.view, headerOffset + 0x44);

    // Title ID (8 bytes)
    this.titleId = readU64Hex(this.view, headerOffset + 0x4C);

    this.titleType = this.view.getUint32(headerOffset + 0x54);
    this.groupId = this.view.getUint16(headerOffset + 0x58);

    this.accessRights = this.view.getUint32(headerOffset + 0x98);
    this.titleVersion = this.view.getUint16(headerOffset + 0x9C);
    this.numContents = this.view.getUint16(headerOffset + 0x9E);
    this.bootIndex = this.view.getUint16(headerOffset + 0xA0);

    // Parse content records
    const contentStart = headerOffset + 0xA4;
    this.contents = [];

    for (let i = 0; i < this.numContents; i++) {
      const offset = contentStart + i * 0x24;
      const content = {
        id: this.view.getUint32(offset + 0x00),
        index: this.view.getUint16(offset + 0x04),
        type: this.view.getUint16(offset + 0x06),
        size: readU64(this.view, offset + 0x08),
        hash: new Uint8Array(this.raw, offset + 0x10, 20),
      };

      // Content type flags
      content.isNormal = (content.type & 0xC000) === 0 && (content.type & 0x0001) !== 0;
      content.isDLC = (content.type & 0x4000) !== 0;
      content.isShared = (content.type & 0x8000) !== 0;

      // Content ID as zero-padded hex string (for NUS URL)
      content.idHex = content.id.toString(16).padStart(8, '0');

      this.contents.push(content);
    }
  }

  /** Get human-readable IOS version string */
  get iosVersion() {
    const iosNum = parseInt(this.iosTitleId.slice(8), 16);
    return `IOS${iosNum}`;
  }

  /** Total size of all contents */
  get totalSize() {
    return this.contents.reduce((sum, c) => sum + c.size, BigInt(0));
  }

  /** Get the TMD data needed for WAD packing (everything from offset 0x140 / header start) */
  get tmdForWad() {
    return new Uint8Array(this.raw);
  }
}
