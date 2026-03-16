/**
 * Ticket (cetk) Parser
 *
 * Reference: https://wiibrew.org/wiki/Ticket
 *
 * Structure (big-endian, RSA-2048 signed):
 *   0x000: u32     sig_type
 *   0x004: u8[256] signature
 *   0x104: u8[60]  padding
 *   0x140: u8[64]  issuer
 *   0x180: u8[60]  ecdh_data
 *   0x1BC: u8[3]   padding2
 *   0x1BF: u8[16]  encrypted_title_key  ← the key we need
 *   0x1CF: u8      unknown
 *   0x1D0: u8[8]   ticket_id
 *   0x1D8: u32     console_id
 *   0x1DC: u8[8]   title_id
 *   0x1E4: u16     unknown2
 *   0x1E6: u16     title_version
 *   0x1E8: u32     permitted_titles_mask
 *   0x1EC: u32     permit_mask
 *   0x1F0: u8      title_export_allowed
 *   0x1F1: u8      common_key_index (0=common, 1=korean, 2=vWii)
 *   0x1F2: u8[48]  unknown3
 *   0x222: u8[64]  content_access_perms
 *   0x262: u16     padding3
 *   0x264: u8[...]  time limits
 */

export class Ticket {
  constructor(data) {
    if (!(data instanceof ArrayBuffer)) {
      throw new Error('Ticket data must be an ArrayBuffer');
    }

    this.raw = data;
    this.view = new DataView(data);
    this.parse();
  }

  parse() {
    this.sigType = this.view.getUint32(0x000);

    let headerOffset;
    switch (this.sigType) {
      case 0x00010000: headerOffset = 4 + 512 + 60; break; // RSA-4096
      case 0x00010001: headerOffset = 4 + 256 + 60; break; // RSA-2048
      case 0x00010002: headerOffset = 4 + 60 + 64; break;  // ECDSA
      default: headerOffset = 0x140;
    }

    this.issuer = this.readString(headerOffset, 64);

    // Encrypted title key (16 bytes at offset 0x7F from header start)
    this.encryptedTitleKey = new Uint8Array(this.raw, headerOffset + 0x7F, 16);

    this.ticketId = this.readHex(headerOffset + 0x90, 8);
    this.consoleId = this.view.getUint32(headerOffset + 0x98);
    this.titleId = this.readU64Hex(headerOffset + 0x9C);
    this.titleVersion = this.view.getUint16(headerOffset + 0xA6);
    this.commonKeyIndex = this.view.getUint8(headerOffset + 0xB1);
  }

  readString(offset, length) {
    const bytes = new Uint8Array(this.raw, offset, length);
    const nullIdx = bytes.indexOf(0);
    const end = nullIdx >= 0 ? nullIdx : length;
    return new TextDecoder('ascii').decode(bytes.slice(0, end));
  }

  readHex(offset, length) {
    const bytes = new Uint8Array(this.raw, offset, length);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  readU64Hex(offset) {
    const high = this.view.getUint32(offset).toString(16).padStart(8, '0');
    const low = this.view.getUint32(offset + 4).toString(16).padStart(8, '0');
    return high + low;
  }

  /** The raw ticket data for WAD packing */
  get ticketForWad() {
    return new Uint8Array(this.raw);
  }

  /** Get common key name */
  get commonKeyName() {
    switch (this.commonKeyIndex) {
      case 0: return 'Wii Common Key';
      case 1: return 'Korean Key';
      case 2: return 'vWii Key';
      default: return `Unknown (${this.commonKeyIndex})`;
    }
  }
}
