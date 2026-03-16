/**
 * Wii / DSi Title Database
 *
 * A curated database of common titles with support for importing
 * the full database.xml from the original NUS Downloader.
 *
 * Categories:
 *   Wii: System Titles, IOS, Channels, Virtual Console (11 platforms), WiiWare
 *   DSi: DSi System, DSiWare
 */

export const CATEGORIES = {
  SYSTEM: 'System Titles',
  IOS: 'IOS',
  CHANNELS: 'Channels',
  VC_NES: 'VC - NES',
  VC_SNES: 'VC - SNES',
  VC_N64: 'VC - N64',
  VC_GEN: 'VC - Mega Drive/Genesis',
  VC_TG16: 'VC - TurboGrafx-16',
  VC_NEO: 'VC - Neo Geo',
  VC_SMS: 'VC - Master System',
  VC_C64: 'VC - Commodore 64',
  VC_MSX: 'VC - MSX',
  VC_ARC: 'VC - Arcade',
  VC_TGCD: 'VC - TurboGrafx-CD',
  WIIWARE: 'WiiWare',
  DSI_SYSTEM: 'DSi System',
  DSIWARE: 'DSiWare',
};

export const REGIONS = {
  ALL: 'All Regions',
  USA: 'USA (NTSC-U)',
  EUR: 'Europe (PAL)',
  JPN: 'Japan (NTSC-J)',
  KOR: 'Korea',
};

// Region code → region mapping for database.xml import
const REGION_CODE_MAP = {
  '41': REGIONS.ALL,
  '44': REGIONS.EUR, // Germany (grouped under EUR)
  '45': REGIONS.USA,
  '46': REGIONS.EUR, // France
  '4A': REGIONS.JPN,
  '4B': REGIONS.KOR,
  '4C': REGIONS.EUR, // Italy
  '50': REGIONS.EUR,
  '51': REGIONS.EUR, // Spain
};

// XML tag → category mapping for database.xml import
const XML_CATEGORY_MAP = {
  SYS: CATEGORIES.SYSTEM,
  IOS: CATEGORIES.IOS,
  WW: CATEGORIES.WIIWARE,
  DSISYSTEM: CATEGORIES.DSI_SYSTEM,
  DSIWARE: CATEGORIES.DSIWARE,
  // VC sub-platforms
  C64: CATEGORIES.VC_C64,
  GEN: CATEGORIES.VC_GEN,
  MSX: CATEGORIES.VC_MSX,
  N64: CATEGORIES.VC_N64,
  NEO: CATEGORIES.VC_NEO,
  NES: CATEGORIES.VC_NES,
  SMS: CATEGORIES.VC_SMS,
  SNES: CATEGORIES.VC_SNES,
  TG16: CATEGORIES.VC_TG16,
  TGCD: CATEGORIES.VC_TGCD,
  ARC: CATEGORIES.VC_ARC,
  // The generic VC tag maps to NES as a fallback
  VC: CATEGORIES.VC_NES,
};

/**
 * Title database entries.
 *
 * Each entry:
 *   name, titleId, versions[], category, region, description,
 *   hasTicket (bool), danger (string|null)
 */
export let TITLE_DATABASE = [
  // ═══════════════════════════════════════════
  // IOS Titles
  // ═══════════════════════════════════════════
  { name: 'IOS4',    titleId: '0000000100000004', versions: [65280],category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS9',    titleId: '0000000100000009', versions: [1034], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS10',   titleId: '000000010000000a', versions: [768],  category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS11',   titleId: '000000010000000b', versions: [256],  category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS12',   titleId: '000000010000000c', versions: [526],  category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS13',   titleId: '000000010000000d', versions: [1032], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS14',   titleId: '000000010000000e', versions: [1032], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS15',   titleId: '000000010000000f', versions: [1032], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS16',   titleId: '0000000100000010', versions: [512],  category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS17',   titleId: '0000000100000011', versions: [1032], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS20',   titleId: '0000000100000014', versions: [256],  category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS21',   titleId: '0000000100000015', versions: [1039], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',              hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS22',   titleId: '0000000100000016', versions: [1294], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by Disc Channel',  hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS28',   titleId: '000000010000001c', versions: [1807], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by many games',    hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS30',   titleId: '000000010000001e', versions: [2816], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS31',   titleId: '000000010000001f', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS33',   titleId: '0000000100000021', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS34',   titleId: '0000000100000022', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS35',   titleId: '0000000100000023', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS36',   titleId: '0000000100000024', versions: [3608], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by many titles',   hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS37',   titleId: '0000000100000025', versions: [5663], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS38',   titleId: '0000000100000026', versions: [4124], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS40',   titleId: '0000000100000028', versions: [3072], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS41',   titleId: '0000000100000029', versions: [3348], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS43',   titleId: '000000010000002b', versions: [3348], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS45',   titleId: '000000010000002d', versions: [3348], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS46',   titleId: '000000010000002e', versions: [3606], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS48',   titleId: '0000000100000030', versions: [4124], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS50',   titleId: '0000000100000032', versions: [5120], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS51',   titleId: '0000000100000033', versions: [4864], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS52',   titleId: '0000000100000034', versions: [5888], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS53',   titleId: '0000000100000035', versions: [5663], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by Wii Shop',      hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS55',   titleId: '0000000100000037', versions: [5663], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS56',   titleId: '0000000100000038', versions: [5662], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.3',hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS57',   titleId: '0000000100000039', versions: [5919], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB 2.0 support',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS58',   titleId: '000000010000003a', versions: [6176], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB 2.0 support',       hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS59',   titleId: '000000010000003b', versions: [9249], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB Ethernet support',   hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS60',   titleId: '000000010000003c', versions: [6174], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.1',hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS61',   titleId: '000000010000003d', versions: [5662], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'SD card support',        hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS62',   titleId: '000000010000003e', versions: [6430], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB support',            hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS70',   titleId: '0000000100000046', versions: [6944], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.2',hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS80',   titleId: '0000000100000050', versions: [6944], category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.3',hasTicket: true, danger: 'System title — modifying IOS can brick your Wii' },
  { name: 'IOS236',  titleId: '00000001000000ec', versions: [65535],category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Homebrew IOS (Stub)',    hasTicket: false, danger: 'System title — modifying IOS can brick your Wii' },

  // ═══════════════════════════════════════════
  // System Menu
  // ═══════════════════════════════════════════
  { name: 'System Menu 4.3U', titleId: '0000000100000002', versions: [513], category: CATEGORIES.SYSTEM, region: REGIONS.USA, description: 'Latest USA System Menu', hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.3E', titleId: '0000000100000002', versions: [514], category: CATEGORIES.SYSTEM, region: REGIONS.EUR, description: 'Latest EUR System Menu', hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.3J', titleId: '0000000100000002', versions: [512], category: CATEGORIES.SYSTEM, region: REGIONS.JPN, description: 'Latest JPN System Menu', hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.3K', titleId: '0000000100000002', versions: [518], category: CATEGORIES.SYSTEM, region: REGIONS.KOR, description: 'Latest KOR System Menu', hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.2U', titleId: '0000000100000002', versions: [481], category: CATEGORIES.SYSTEM, region: REGIONS.USA, description: 'USA System Menu 4.2',    hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.2E', titleId: '0000000100000002', versions: [482], category: CATEGORIES.SYSTEM, region: REGIONS.EUR, description: 'EUR System Menu 4.2',    hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.2J', titleId: '0000000100000002', versions: [480], category: CATEGORIES.SYSTEM, region: REGIONS.JPN, description: 'JPN System Menu 4.2',    hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.1U', titleId: '0000000100000002', versions: [449], category: CATEGORIES.SYSTEM, region: REGIONS.USA, description: 'USA System Menu 4.1',    hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.1E', titleId: '0000000100000002', versions: [450], category: CATEGORIES.SYSTEM, region: REGIONS.EUR, description: 'EUR System Menu 4.1',    hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 4.1J', titleId: '0000000100000002', versions: [448], category: CATEGORIES.SYSTEM, region: REGIONS.JPN, description: 'JPN System Menu 4.1',    hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 3.4U', titleId: '0000000100000002', versions: [290], category: CATEGORIES.SYSTEM, region: REGIONS.USA, description: 'USA System Menu 3.4',    hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'System Menu 3.4E', titleId: '0000000100000002', versions: [290], category: CATEGORIES.SYSTEM, region: REGIONS.EUR, description: 'EUR System Menu 3.4',    hasTicket: true, danger: 'Installing the wrong System Menu version can brick your Wii!' },
  { name: 'BC',               titleId: '0000000100000100', versions: [6],   category: CATEGORIES.SYSTEM, region: REGIONS.ALL, description: 'Backwards Compatibility',  hasTicket: true, danger: 'System title — required for GameCube compatibility' },
  { name: 'MIOS',             titleId: '0000000100000101', versions: [10],  category: CATEGORIES.SYSTEM, region: REGIONS.ALL, description: 'GameCube Compatibility',   hasTicket: true, danger: 'System title — required for GameCube compatibility' },

  // ═══════════════════════════════════════════
  // System Channels
  // ═══════════════════════════════════════════
  { name: 'Wii Shop Channel (USA)',     titleId: '0001000248414241', versions: [21], category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Wii Shop',       hasTicket: true,  danger: null },
  { name: 'Wii Shop Channel (EUR)',     titleId: '0001000248414241', versions: [21], category: CATEGORIES.CHANNELS, region: REGIONS.EUR, description: 'Wii Shop',       hasTicket: true,  danger: null },
  { name: 'Wii Shop Channel (JPN)',     titleId: '0001000248414241', versions: [21], category: CATEGORIES.CHANNELS, region: REGIONS.JPN, description: 'Wii Shop',       hasTicket: true,  danger: null },
  { name: 'Mii Channel (USA)',          titleId: '0001000248414341', versions: [6],  category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Mii Creator',    hasTicket: true,  danger: null },
  { name: 'Mii Channel (EUR)',          titleId: '0001000248414350', versions: [6],  category: CATEGORIES.CHANNELS, region: REGIONS.EUR, description: 'Mii Creator',    hasTicket: true,  danger: null },
  { name: 'Mii Channel (JPN)',         titleId: '000100024841434a', versions: [6],  category: CATEGORIES.CHANNELS, region: REGIONS.JPN, description: 'Mii Creator',    hasTicket: true,  danger: null },
  { name: 'Photo Channel 1.1 (USA)',    titleId: '0001000248415941', versions: [3],  category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Photo Viewer',   hasTicket: true,  danger: null },
  { name: 'Internet Channel (USA)',     titleId: '0001000148414441', versions: [],   category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Opera Browser',  hasTicket: false, danger: null },
  { name: 'Weather Channel (USA)',      titleId: '0001000248414645', versions: [7],  category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Weather',        hasTicket: true,  danger: null },
  { name: 'News Channel (USA)',         titleId: '0001000248414745', versions: [7],  category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'News',           hasTicket: true,  danger: null },
  { name: 'Everybody Votes Channel',    titleId: '0001000148414a45', versions: [],   category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Voting Channel', hasTicket: false, danger: null },
  { name: 'Nintendo Channel (USA)',     titleId: '0001000148415445', versions: [],   category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Game Info',      hasTicket: false, danger: null },
  { name: 'Check Mii Out Channel',      titleId: '0001000148415045', versions: [],   category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Mii Contest',   hasTicket: false, danger: null },
];

/**
 * Import titles from a database.xml file (original NUSD format).
 *
 * XML structure:
 *   <database version="1">
 *     <SYS>
 *       <title>
 *         <name>System Menu</name>
 *         <titleID>0000000100000002</titleID>
 *         <version>0,2,33,97,...</version>
 *         <region>41</region>
 *         <ticket>True</ticket>
 *         <danger>Warning text</danger>
 *       </title>
 *     </SYS>
 *     <IOS>...</IOS>
 *     <NES>...</NES>
 *     ...
 *   </database>
 *
 * @param {string} xmlText - Raw XML content
 * @returns {{ imported: number, categories: string[] }} Import stats
 */
export function importDatabaseXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML: ' + parseError.textContent.slice(0, 200));
  }

  const imported = [];
  const categoriesFound = new Set();

  // Process each known tag
  for (const [tag, category] of Object.entries(XML_CATEGORY_MAP)) {
    const sections = doc.querySelectorAll(tag);
    for (const section of sections) {
      const titleElements = section.querySelectorAll(':scope > title');
      if (titleElements.length === 0) continue;

      categoriesFound.add(category);

      for (const el of titleElements) {
        const name = el.querySelector('name')?.textContent?.trim() || '';
        const titleId = el.querySelector('titleID')?.textContent?.trim().toLowerCase() || '';
        const versionStr = el.querySelector('version')?.textContent || '';
        const regionStr = el.querySelector('region')?.textContent || '';
        const ticketStr = el.querySelector('ticket')?.textContent || '';
        const danger = el.querySelector('danger')?.textContent?.trim() || null;

        if (!titleId || titleId.length !== 16) continue;

        const versions = versionStr
          .split(',')
          .map(v => parseInt(v.trim()))
          .filter(v => !isNaN(v));

        const regionCodes = regionStr.split(',').map(r => r.trim());
        const region = REGION_CODE_MAP[regionCodes[0]] || REGIONS.ALL;
        const hasTicket = ticketStr.toLowerCase() === 'true';

        imported.push({
          name: name || titleId,
          titleId,
          versions,
          category,
          region,
          description: danger || category,
          hasTicket,
          danger,
        });
      }
    }
  }

  // Also try UPD tag (update scripts) — add as System category
  const updSections = doc.querySelectorAll('UPD');
  for (const section of updSections) {
    const titleElements = section.querySelectorAll(':scope > title');
    for (const el of titleElements) {
      const name = el.querySelector('name')?.textContent?.trim() || '';
      const titleId = el.querySelector('titleID')?.textContent?.trim().toLowerCase() || '';
      if (!titleId || titleId.length !== 16) continue;

      const versionStr = el.querySelector('version')?.textContent || '';
      const versions = versionStr.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));

      imported.push({
        name: name || titleId,
        titleId,
        versions,
        category: CATEGORIES.SYSTEM,
        region: REGIONS.ALL,
        description: 'Update Script',
        hasTicket: true,
        danger: null,
      });
    }
  }

  if (imported.length === 0) {
    throw new Error('No valid titles found in XML. Ensure the file uses the NUSD database.xml format.');
  }

  // Replace database with imported titles (keep existing as fallback)
  TITLE_DATABASE = imported;

  return {
    imported: imported.length,
    categories: [...categoriesFound],
  };
}

/**
 * Merge imported titles into the existing database (additive).
 *
 * @param {Array} newTitles - Titles to add
 * @returns {number} Number of new titles added
 */
export function mergeTitles(newTitles) {
  const existingIds = new Set(TITLE_DATABASE.map(t => `${t.titleId}_${t.versions.join(',')}`));
  let added = 0;
  for (const title of newTitles) {
    const key = `${title.titleId}_${title.versions.join(',')}`;
    if (!existingIds.has(key)) {
      TITLE_DATABASE.push(title);
      existingIds.add(key);
      added++;
    }
  }
  return added;
}

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
    // DSi title types
    case '00030004': return 'DSiWare';
    case '00030015': return 'DSi System Channel';
    case '00030017': return 'DSi System Title';
    default: return 'Unknown';
  }
}

/**
 * Get all unique categories present in the current database.
 */
export function getActiveCategories() {
  const cats = new Set();
  for (const title of TITLE_DATABASE) {
    cats.add(title.category);
  }
  return [...cats];
}
