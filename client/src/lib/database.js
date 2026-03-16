/**
 * Wii Title Database
 *
 * A curated database of common Wii system titles.
 * Based on the WiiBrew Title Database and IOS History.
 *
 * Categories:
 *   - System Titles (System Menu, BC, MIOS)
 *   - IOS versions
 *   - System Channels (Shop, Photo, Weather, News, etc.)
 */

export const CATEGORIES = {
  SYSTEM: 'System Titles',
  IOS: 'IOS',
  CHANNELS: 'Channels',
};

export const REGIONS = {
  ALL: 'All Regions',
  USA: 'USA (NTSC-U)',
  EUR: 'Europe (PAL)',
  JPN: 'Japan (NTSC-J)',
  KOR: 'Korea',
};

/**
 * Title database entries.
 * Each entry has: id, name, titleId, versions[], category, region, description
 */
export const TITLE_DATABASE = [
  // ═══════════════════════════════════════════
  // IOS Titles
  // ═══════════════════════════════════════════
  { name: 'IOS9',    titleId: '0000000100000009', versions: [1034], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS' },
  { name: 'IOS12',   titleId: '000000010000000c', versions: [526],  category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS' },
  { name: 'IOS13',   titleId: '000000010000000d', versions: [1032], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS' },
  { name: 'IOS14',   titleId: '000000010000000e', versions: [1032], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS' },
  { name: 'IOS15',   titleId: '000000010000000f', versions: [1032], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS' },
  { name: 'IOS17',   titleId: '0000000100000011', versions: [1032], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS' },
  { name: 'IOS21',   titleId: '0000000100000015', versions: [1039], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS' },
  { name: 'IOS22',   titleId: '0000000100000016', versions: [1294], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by Disc Channel' },
  { name: 'IOS28',   titleId: '000000010000001c', versions: [1807], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by many games' },
  { name: 'IOS31',   titleId: '000000010000001f', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS' },
  { name: 'IOS33',   titleId: '0000000100000021', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS' },
  { name: 'IOS34',   titleId: '0000000100000022', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS' },
  { name: 'IOS35',   titleId: '0000000100000023', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS' },
  { name: 'IOS36',   titleId: '0000000100000024', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by many titles' },
  { name: 'IOS37',   titleId: '0000000100000025', versions: [5663], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS' },
  { name: 'IOS38',   titleId: '0000000100000026', versions: [4124], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS' },
  { name: 'IOS53',   titleId: '0000000100000035', versions: [5663], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by Wii Shop' },
  { name: 'IOS55',   titleId: '0000000100000037', versions: [5663], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS' },
  { name: 'IOS56',   titleId: '0000000100000038', versions: [5662], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.3' },
  { name: 'IOS57',   titleId: '0000000100000039', versions: [5919], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB 2.0 support' },
  { name: 'IOS58',   titleId: '000000010000003a', versions: [6176], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB 2.0 support' },
  { name: 'IOS61',   titleId: '000000010000003d', versions: [5662], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'SD card support' },
  { name: 'IOS70',   titleId: '0000000100000046', versions: [6944], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.2' },
  { name: 'IOS80',   titleId: '0000000100000050', versions: [6944], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.3' },

  // ═══════════════════════════════════════════
  // System Menu
  // ═══════════════════════════════════════════
  { name: 'System Menu 4.3U', titleId: '0000000100000002', versions: [513], category: CATEGORIES.SYSTEM, region: REGIONS.USA, description: 'Latest USA System Menu' },
  { name: 'System Menu 4.3E', titleId: '0000000100000002', versions: [514], category: CATEGORIES.SYSTEM, region: REGIONS.EUR, description: 'Latest EUR System Menu' },
  { name: 'System Menu 4.3J', titleId: '0000000100000002', versions: [512], category: CATEGORIES.SYSTEM, region: REGIONS.JPN, description: 'Latest JPN System Menu' },
  { name: 'System Menu 4.3K', titleId: '0000000100000002', versions: [518], category: CATEGORIES.SYSTEM, region: REGIONS.KOR, description: 'Latest KOR System Menu' },
  { name: 'System Menu 4.2U', titleId: '0000000100000002', versions: [481], category: CATEGORIES.SYSTEM, region: REGIONS.USA, description: 'USA System Menu 4.2' },
  { name: 'System Menu 4.2E', titleId: '0000000100000002', versions: [482], category: CATEGORIES.SYSTEM, region: REGIONS.EUR, description: 'EUR System Menu 4.2' },
  { name: 'System Menu 4.2J', titleId: '0000000100000002', versions: [480], category: CATEGORIES.SYSTEM, region: REGIONS.JPN, description: 'JPN System Menu 4.2' },
  { name: 'System Menu 4.1U', titleId: '0000000100000002', versions: [449], category: CATEGORIES.SYSTEM, region: REGIONS.USA, description: 'USA System Menu 4.1' },
  { name: 'System Menu 4.1E', titleId: '0000000100000002', versions: [450], category: CATEGORIES.SYSTEM, region: REGIONS.EUR, description: 'EUR System Menu 4.1' },
  { name: 'System Menu 4.1J', titleId: '0000000100000002', versions: [448], category: CATEGORIES.SYSTEM, region: REGIONS.JPN, description: 'JPN System Menu 4.1' },
  { name: 'BC',               titleId: '0000000100000100', versions: [6],   category: CATEGORIES.SYSTEM, region: REGIONS.ALL, description: 'Backwards Compatibility' },
  { name: 'MIOS',             titleId: '0000000100000101', versions: [10],  category: CATEGORIES.SYSTEM, region: REGIONS.ALL, description: 'GameCube Compatibility' },

  // ═══════════════════════════════════════════
  // System Channels
  // ═══════════════════════════════════════════
  { name: 'Wii Shop Channel (USA)',     titleId: '0001000248414241', versions: [21], category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Wii Shop' },
  { name: 'Wii Shop Channel (EUR)',     titleId: '0001000248414241', versions: [21], category: CATEGORIES.CHANNELS, region: REGIONS.EUR, description: 'Wii Shop' },
  { name: 'Mii Channel (USA)',          titleId: '0001000248414341', versions: [6],  category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Mii Creator' },
  { name: 'Photo Channel 1.1 (USA)',    titleId: '0001000248415941', versions: [3],  category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Photo Viewer' },
  { name: 'Internet Channel (USA)',     titleId: '0001000148414441', versions: [],   category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Opera Browser' },
];

/**
 * Search the title database.
 * @param {string} query - Search term
 * @param {string} [category] - Filter by category
 * @param {string} [region] - Filter by region
 * @returns {Array} Matching titles
 */
export function searchTitles(query, category, region) {
  const q = query.toLowerCase().trim();

  return TITLE_DATABASE.filter(title => {
    // Category filter
    if (category && title.category !== category) return false;

    // Region filter
    if (region && region !== REGIONS.ALL && title.region !== region && title.region !== REGIONS.ALL) return false;

    // Text search
    if (!q) return true;
    return (
      title.name.toLowerCase().includes(q) ||
      title.titleId.includes(q) ||
      title.description.toLowerCase().includes(q)
    );
  });
}

/**
 * Lookup a title by exact title ID.
 * @param {string} titleId
 * @returns {object|null}
 */
export function lookupTitle(titleId) {
  const normalized = titleId.toLowerCase().replace(/\s/g, '');
  return TITLE_DATABASE.find(t => t.titleId === normalized) || null;
}

/**
 * Get title type description from the upper 4 bytes of the title ID.
 * @param {string} titleId
 * @returns {string}
 */
export function getTitleType(titleId) {
  const upper = titleId.slice(0, 8);
  switch (upper) {
    case '00000001': return 'System Title';
    case '00010000': return 'Disc-based Game';
    case '00010001': return 'Downloaded Channel';
    case '00010002': return 'System Channel';
    case '00010004': return 'Game with Channel';
    case '00010005': return 'DLC';
    case '00010008': return 'Hidden Channel';
    default: return 'Unknown';
  }
}
