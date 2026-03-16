/**
 * Wii Crypto Operations
 *
 * Uses the Web Crypto API for AES-128-CBC operations.
 *
 * Key derivation for Wii content:
 *   1. The ticket contains an encrypted title key (16 bytes)
 *   2. The title key is encrypted with the Wii Common Key using AES-128-CBC
 *   3. The IV for decrypting the title key is the title ID (8 bytes) + 8 zero bytes
 *   4. Once decrypted, the title key is used to decrypt individual contents
 *   5. Each content's IV is the content index (2 bytes) + 14 zero bytes
 *
 * NOTE: The Wii Common Key is NOT embedded here for legal reasons.
 * Users must provide their own key file (from their own Wii console).
 */

/**
 * Decrypt the title key from a ticket using the common key.
 *
 * @param {Uint8Array} encryptedTitleKey - 16-byte encrypted title key from ticket
 * @param {Uint8Array} commonKey         - 16-byte Wii common key
 * @param {string} titleId              - 16-char hex title ID
 * @returns {Promise<Uint8Array>} Decrypted title key (16 bytes)
 */
export async function decryptTitleKey(encryptedTitleKey, commonKey, titleId) {
  // IV = title ID (8 bytes) + 8 zero bytes
  const iv = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    iv[i] = parseInt(titleId.substr(i * 2, 2), 16);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    commonKey,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    cryptoKey,
    encryptedTitleKey
  );

  // AES-CBC with Web Crypto API applies PKCS7 padding removal automatically.
  // The title key is exactly 16 bytes, but the output may be 16 bytes if
  // no padding was applied (raw AES block). We take the first 16 bytes.
  return new Uint8Array(decrypted).slice(0, 16);
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

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    titleKey,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  // Content must be padded to 16-byte boundary for AES
  let paddedContent = encryptedContent;
  if (encryptedContent.length % 16 !== 0) {
    paddedContent = new Uint8Array(
      Math.ceil(encryptedContent.length / 16) * 16
    );
    paddedContent.set(encryptedContent);
  }

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      paddedContent
    );
    return new Uint8Array(decrypted);
  } catch {
    // Web Crypto's AES-CBC expects PKCS7 padding by default.
    // Wii contents don't use PKCS7 padding, so we may need to
    // manually perform CBC decryption for raw blocks.
    return await decryptContentRaw(paddedContent, titleKey, iv);
  }
}

/**
 * Raw AES-CBC decryption without PKCS7 padding removal.
 * Needed because Wii content doesn't use standard PKCS7 padding.
 *
 * We decrypt in ECB mode block-by-block and XOR with previous ciphertext
 * to simulate CBC without padding expectations.
 */
async function decryptContentRaw(data, keyData, iv) {
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  // Add a dummy block at the end to satisfy PKCS7 expectations
  const padded = new Uint8Array(data.length + 16);
  padded.set(data);
  // Fill last block with 0x10 (PKCS7 padding for a full block)
  for (let i = data.length; i < padded.length; i++) {
    padded[i] = 0x10;
  }

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    key,
    padded
  );

  // Return only the original data length (remove dummy padding block)
  return new Uint8Array(decrypted).slice(0, data.length);
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
