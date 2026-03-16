/**
 * Wii/DSi Crypto Operations
 *
 * Uses the Web Crypto API for AES-128-CBC operations.
 *
 * Key derivation:
 *   1. The ticket contains an encrypted title key (16 bytes)
 *   2. The title key is encrypted with a common key using AES-128-CBC
 *      - Wii Common Key (index 0)
 *      - Korean Key (index 1)
 *      - vWii Key (index 2)
 *      - DSi Key (for DSi titles)
 *   3. The IV for decrypting the title key is the title ID (8 bytes) + 8 zero bytes
 *   4. Once decrypted, the title key decrypts individual contents
 *   5. Each content's IV is the content index (2 bytes) + 14 zero bytes
 *
 * NOTE: Common keys are NOT embedded here for legal reasons.
 */

/**
 * AES-128-CBC decryption without PKCS7 padding.
 *
 * Web Crypto API always expects PKCS7 padding on AES-CBC. Nintendo doesn't
 * use PKCS7 padding. We work around this by appending a synthetic ciphertext
 * block that decrypts to valid PKCS7 padding (0x10 * 16), then discarding it.
 *
 * How it works:
 *   1. Encrypt a block of 0x10 bytes using the last ciphertext block as IV
 *   2. Append the result as a final ciphertext block
 *   3. When Web Crypto decrypts, the last block yields valid PKCS7 → stripped
 *   4. The remaining output is the exact plaintext with no padding artifacts
 */
async function decryptNoPadding(ciphertext, keyData, iv) {
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']
  );

  let data = ciphertext instanceof Uint8Array ? ciphertext : new Uint8Array(ciphertext);
  if (data.length === 0) return new Uint8Array(0);

  // Pad to AES block boundary if needed
  if (data.length % 16 !== 0) {
    const aligned = new Uint8Array(Math.ceil(data.length / 16) * 16);
    aligned.set(data);
    data = aligned;
  }

  // Create synthetic ciphertext block that decrypts to valid PKCS7
  const lastBlock = data.slice(data.length - 16);
  const paddingPlain = new Uint8Array(16).fill(0x10);
  const encResult = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: lastBlock }, key, paddingPlain
  );
  // encrypt() adds its own PKCS7 → 32 bytes; take first 16 as our synthetic block
  const syntheticBlock = new Uint8Array(encResult, 0, 16);

  // Append synthetic block to ciphertext
  const extended = new Uint8Array(data.length + 16);
  extended.set(data);
  extended.set(syntheticBlock, data.length);

  // Decrypt — Web Crypto strips the synthetic PKCS7, returning exact plaintext
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv }, key, extended
  );

  return new Uint8Array(decrypted);
}

/**
 * Decrypt the title key from a ticket using the common key.
 *
 * @param {Uint8Array} encryptedTitleKey - 16-byte encrypted title key from ticket
 * @param {Uint8Array} commonKey         - 16-byte common key (Wii/Korean/DSi)
 * @param {string} titleId              - 16-char hex title ID
 * @returns {Promise<Uint8Array>} Decrypted title key (16 bytes)
 */
export async function decryptTitleKey(encryptedTitleKey, commonKey, titleId) {
  // IV = title ID (8 bytes) + 8 zero bytes
  const iv = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    iv[i] = parseInt(titleId.substr(i * 2, 2), 16);
  }
  return decryptNoPadding(encryptedTitleKey, commonKey, iv);
}

/**
 * Decrypt a content file using the decrypted title key.
 *
 * @param {Uint8Array} encryptedContent - Encrypted content data
 * @param {Uint8Array} titleKey         - Decrypted 16-byte title key
 * @param {number} contentIndex         - Content index from TMD
 * @returns {Promise<Uint8Array>} Decrypted content
 */
export async function decryptContent(encryptedContent, titleKey, contentIndex) {
  // IV = content index (2 bytes, big-endian) + 14 zero bytes
  const iv = new Uint8Array(16);
  iv[0] = (contentIndex >> 8) & 0xFF;
  iv[1] = contentIndex & 0xFF;
  return decryptNoPadding(encryptedContent, titleKey, iv);
}

/**
 * Compute SHA-1 hash of data.
 *
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>} 20-byte SHA-1 hash
 */
export async function sha1(data) {
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Verify a content's SHA-1 hash against its TMD record.
 *
 * @param {Uint8Array} decryptedContent - Decrypted content data
 * @param {Uint8Array} expectedHash    - 20-byte expected hash from TMD
 * @param {bigint} expectedSize        - Expected content size from TMD
 * @returns {Promise<{valid: boolean, hash: string, expected: string}>}
 */
export async function verifyContent(decryptedContent, expectedHash, expectedSize) {
  // Trim to expected size before hashing
  const trimmed = decryptedContent.slice(0, Number(expectedSize));
  const actualHash = await sha1(trimmed);

  // Compare bytes directly for speed, build hex strings only for the result
  let valid = actualHash.length === expectedHash.length;
  if (valid) {
    for (let i = 0; i < actualHash.length; i++) {
      if (actualHash[i] !== expectedHash[i]) { valid = false; break; }
    }
  }
  const hashHex = Array.from(actualHash).map(b => b.toString(16).padStart(2, '0')).join('');
  const expectedHex = Array.from(expectedHash).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    valid: hashHex === expectedHex,
    hash: hashHex,
    expected: expectedHex,
  };
}

/**
 * Parse a common key from a hex string or binary file.
 *
 * @param {string|Uint8Array} input - Hex string (32 chars) or raw binary (16 bytes)
 * @returns {Uint8Array} 16-byte common key
 */
export function parseCommonKey(input) {
  if (typeof input === 'string') {
    const hex = input.replace(/\s/g, '');
    if (hex.length !== 32 || !/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error('Common key must be 32 hex characters (16 bytes)');
    }
    const key = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      key[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return key;
  }

  if (input instanceof Uint8Array && input.length === 16) {
    return input;
  }

  throw new Error('Common key must be 32 hex chars or 16 raw bytes');
}

/**
 * Encrypt a title key (for vWii re-encryption).
 *
 * vWii titles have their title key encrypted with the vWii common key (index 2).
 * To make WADs installable on real Wii hardware, we re-encrypt the title key
 * with the standard Wii common key (index 0).
 *
 * @param {Uint8Array} titleKey     - Decrypted 16-byte title key
 * @param {Uint8Array} commonKey    - 16-byte common key to encrypt with
 * @param {string} titleId         - 16-char hex title ID
 * @returns {Promise<Uint8Array>} Encrypted title key (16 bytes)
 */
export async function encryptTitleKey(titleKey, commonKey, titleId) {
  const iv = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    iv[i] = parseInt(titleId.substr(i * 2, 2), 16);
  }
  const key = await crypto.subtle.importKey(
    'raw', commonKey, { name: 'AES-CBC' }, false, ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv }, key, titleKey
  );
  // encrypt() adds PKCS7 padding → 32 bytes output; take first 16
  return new Uint8Array(encrypted).slice(0, 16);
}

/** Common key type names for display */
export const COMMON_KEY_NAMES = {
  0: 'Wii Common Key',
  1: 'Korean Key',
  2: 'vWii Key',
  dsi: 'DSi Key',
};
