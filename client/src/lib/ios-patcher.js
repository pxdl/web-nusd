/**
 * IOS Patcher
 *
 * Applies homebrew patches to decrypted IOS content data.
 *
 * Three patches are available (matching the original NUSD):
 *   1. Trucha Bug (Fake Signing) — allows installing unsigned/modified content
 *   2. ES_Identify — allows title impersonation via ES_Identify syscall
 *   3. NAND Permissions — bypasses filesystem access restrictions
 *
 * Reference: libWiiSharp IosPatcher.cs
 */

export const PATCHES = {
  trucha: {
    name: 'Trucha Bug (Fake Signing)',
    description: 'Allows installing unsigned content',
    patterns: [
      // Original NUSD patterns (some IOS versions)
      { search: [0x32, 0x07, 0x23, 0xA2], offset: 1, replace: [0x00] },
      { search: [0x32, 0x07, 0x4B, 0x0B], offset: 1, replace: [0x00] },
      // libWiiPy patterns (other IOS versions)
      { search: [0x20, 0x07, 0x23, 0xA2], offset: 1, replace: [0x00] },
      { search: [0x20, 0x07, 0x4B, 0x0B], offset: 1, replace: [0x00] },
    ],
  },
  esIdentify: {
    name: 'ES_Identify',
    description: 'Allows title impersonation',
    patterns: [
      { search: [0x28, 0x03, 0xD1, 0x23], offset: 2, replace: [0x00, 0x00] },
    ],
  },
  nandPermissions: {
    name: 'NAND Permissions',
    description: 'Bypasses filesystem access restrictions',
    patterns: [
      { search: [0x42, 0x8B, 0xD0, 0x01, 0x25, 0x66], offset: 2, replace: [0xE0] },
    ],
  },
  versionPatch: {
    name: 'Version Patch',
    description: 'Allows downgrading to older versions',
    patterns: [
      { search: [0xD2, 0x01, 0x4E, 0x56], offset: 0, replace: [0xE0] },
    ],
  },
};

/**
 * Check if a title ID belongs to an IOS title.
 * IOS title IDs are 00000001000000XX where XX > 02.
 */
export function isIOSTitle(titleId) {
  const tid = titleId.toLowerCase();
  if (!tid.startsWith('00000001000000')) return false;
  const iosNum = parseInt(tid.slice(14), 16);
  return iosNum > 2 && iosNum < 256;
}

/**
 * Get the IOS number from a title ID.
 */
export function getIOSNumber(titleId) {
  return parseInt(titleId.toLowerCase().slice(14), 16);
}

/**
 * Search for a byte pattern in data.
 * @returns {number} Index of first match, or -1
 */
function findPattern(data, pattern) {
  const len = pattern.length;
  for (let i = 0; i <= data.length - len; i++) {
    let match = true;
    for (let j = 0; j < len; j++) {
      if (data[i + j] !== pattern[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Apply selected patches to decrypted IOS content.
 *
 * @param {Uint8Array} contentData - Decrypted content data (will be modified in place)
 * @param {string[]} patchTypes   - Array of patch keys: 'trucha', 'esIdentify', 'nandPermissions'
 * @returns {{ data: Uint8Array, results: Array<{patch: string, applied: boolean, offset?: number}> }}
 */
export function patchIOS(contentData, patchTypes) {
  const data = new Uint8Array(contentData);
  const results = [];

  for (const type of patchTypes) {
    const patch = PATCHES[type];
    if (!patch) continue;

    let applied = false;
    for (const pattern of patch.patterns) {
      const idx = findPattern(data, pattern.search);
      if (idx >= 0) {
        for (let i = 0; i < pattern.replace.length; i++) {
          data[idx + pattern.offset + i] = pattern.replace[i];
        }
        results.push({ patch: patch.name, applied: true, offset: idx });
        applied = true;
        break; // Only apply first matching pattern variant
      }
    }

    if (!applied) {
      results.push({ patch: patch.name, applied: false });
    }
  }

  return { data, results };
}

