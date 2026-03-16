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
// The built-in database is populated at startup from bundled NUSGet JSON files.
// This initial set serves as a fallback if the import fails.
const IOS_DANGER = 'System title — modifying IOS can brick your Wii';
const SYSMENU_DANGER = 'Installing the wrong System Menu version can brick your Wii!';

export let TITLE_DATABASE = [
  // ═══════════════════════════════════════════
  // IOS Titles (all known versions from NUSGet/WiiBrew)
  // ═══════════════════════════════════════════
  { name: 'IOS4',  titleId: '0000000100000004', versions: [65280],                                                  category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS9',  titleId: '0000000100000009', versions: [520, 521, 778, 1034],                                    category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS10', titleId: '000000010000000a', versions: [768],                                                    category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS11', titleId: '000000010000000b', versions: [256],                                                    category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS12', titleId: '000000010000000c', versions: [6, 11, 12, 269, 525, 526],                               category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS13', titleId: '000000010000000d', versions: [10, 15, 16, 273, 1031, 1032],                            category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS14', titleId: '000000010000000e', versions: [262, 263, 520, 1031, 1032],                              category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS15', titleId: '000000010000000f', versions: [257, 258, 259, 260, 265, 266, 523, 1031, 1032],          category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS16', titleId: '0000000100000010', versions: [512],                                                    category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS17', titleId: '0000000100000011', versions: [517, 518, 775, 1032],                                    category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS20', titleId: '0000000100000014', versions: [256],                                                    category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS21', titleId: '0000000100000015', versions: [514, 515, 516, 517, 522, 525, 782, 1039],                category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Base IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS22', titleId: '0000000100000016', versions: [780, 1037, 1294],                                        category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by Disc Channel',   hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS28', titleId: '000000010000001c', versions: [1293, 1550, 1807],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by many games',     hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS30', titleId: '000000010000001e', versions: [1037, 1039, 1040, 2576, 2816],                           category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS31', titleId: '000000010000001f', versions: [1037, 1039, 1040, 2576, 3088, 3092, 3349, 3607, 3608],   category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS33', titleId: '0000000100000021', versions: [1040, 2832, 3088, 3092, 3349, 3607, 3608],               category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS34', titleId: '0000000100000022', versions: [1039, 3091, 3348, 3607, 3608],                           category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS35', titleId: '0000000100000023', versions: [1040, 3088, 3092, 3349, 3607, 3608],                     category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS36', titleId: '0000000100000024', versions: [1042, 3090, 3094, 3351, 3607, 3608],                     category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by many titles',   hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS37', titleId: '0000000100000025', versions: [2070, 3609, 3612, 3869, 5662, 5663],                     category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS38', titleId: '0000000100000026', versions: [3610, 3867, 4124],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS40', titleId: '0000000100000028', versions: [3072],                                                   category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS41', titleId: '0000000100000029', versions: [3091, 3348],                                             category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS43', titleId: '000000010000002b', versions: [3091, 3348],                                             category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS45', titleId: '000000010000002d', versions: [3091, 3348],                                             category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS46', titleId: '000000010000002e', versions: [3093, 3350, 3606],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS48', titleId: '0000000100000030', versions: [4124],                                                   category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS50', titleId: '0000000100000032', versions: [5120],                                                   category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS51', titleId: '0000000100000033', versions: [4864],                                                   category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS52', titleId: '0000000100000034', versions: [5888],                                                   category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Stub IOS',               hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS53', titleId: '0000000100000035', versions: [5406, 5662, 5663],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by Wii Shop',      hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS55', titleId: '0000000100000037', versions: [5406, 5662, 5663],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Common game IOS',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS56', titleId: '0000000100000038', versions: [5405, 5661, 5662],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.3',hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS57', titleId: '0000000100000039', versions: [5661, 5918, 5919],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB 2.0 support',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS58', titleId: '000000010000003a', versions: [6175, 6176],                                             category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB 2.0 support',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS59', titleId: '000000010000003b', versions: [8993, 9249],                                             category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB Ethernet support',  hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS60', titleId: '000000010000003c', versions: [6174],                                                   category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.1',hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS61', titleId: '000000010000003d', versions: [5405, 5661, 5662],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'SD card support',       hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS62', titleId: '000000010000003e', versions: [6430],                                                   category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'USB support',            hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS70', titleId: '0000000100000046', versions: [6687, 6943, 6944],                                       category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.2',hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS80', titleId: '0000000100000050', versions: [6943, 6944],                                             category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Used by System Menu 4.3',hasTicket: true, danger: IOS_DANGER },
  { name: 'IOS236',titleId: '00000001000000ec', versions: [65535],                                                  category: CATEGORIES.IOS, region: REGIONS.ALL, description: 'Homebrew IOS (Stub)',   hasTicket: false, danger: IOS_DANGER },

  // ═══════════════════════════════════════════
  // System Menu (all versions per region)
  // ═══════════════════════════════════════════
  { name: 'System Menu (USA)',  titleId: '0000000100000002', versions: [97, 193, 225, 257, 289, 353, 385, 417, 449, 481, 513],       category: CATEGORIES.SYSTEM, region: REGIONS.USA, description: 'Wii System Menu',        hasTicket: true, danger: SYSMENU_DANGER },
  { name: 'System Menu (EUR)',  titleId: '0000000100000002', versions: [130, 162, 194, 226, 258, 290, 354, 386, 418, 450, 482, 514], category: CATEGORIES.SYSTEM, region: REGIONS.EUR, description: 'Wii System Menu',        hasTicket: true, danger: SYSMENU_DANGER },
  { name: 'System Menu (JPN)',  titleId: '0000000100000002', versions: [128, 192, 224, 256, 288, 352, 384, 416, 448, 480, 512],      category: CATEGORIES.SYSTEM, region: REGIONS.JPN, description: 'Wii System Menu',        hasTicket: true, danger: SYSMENU_DANGER },
  { name: 'System Menu (KOR)',  titleId: '0000000100000002', versions: [390, 454, 486, 518],                                         category: CATEGORIES.SYSTEM, region: REGIONS.KOR, description: 'Wii System Menu',        hasTicket: true, danger: SYSMENU_DANGER },
  { name: 'BC',                 titleId: '0000000100000100', versions: [2, 4, 5, 6],                                                 category: CATEGORIES.SYSTEM, region: REGIONS.ALL, description: 'Backwards Compatibility', hasTicket: true, danger: 'System title — required for GameCube compatibility' },
  { name: 'MIOS',               titleId: '0000000100000101', versions: [4, 5, 8, 9, 10],                                             category: CATEGORIES.SYSTEM, region: REGIONS.ALL, description: 'GameCube Compatibility',  hasTicket: true, danger: 'System title — required for GameCube compatibility' },

  // ═══════════════════════════════════════════
  // System Channels (all known versions)
  // ═══════════════════════════════════════════
  { name: 'Wii Shop Channel',          titleId: '0001000248414241', versions: [3, 4, 5, 6, 7, 8, 10, 13, 16, 17, 18, 19, 20, 21], category: CATEGORIES.CHANNELS, region: REGIONS.ALL, description: 'Wii Shop',       hasTicket: true,  danger: null },
  { name: 'Mii Channel (USA)',         titleId: '0001000248414341', versions: [2, 3, 4, 5, 6],  category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Mii Creator',    hasTicket: true,  danger: null },
  { name: 'Mii Channel (EUR)',         titleId: '0001000248414350', versions: [2, 3, 4, 5, 6],  category: CATEGORIES.CHANNELS, region: REGIONS.EUR, description: 'Mii Creator',    hasTicket: true,  danger: null },
  { name: 'Mii Channel (JPN)',         titleId: '000100024841434a', versions: [2, 3, 4, 5, 6],  category: CATEGORIES.CHANNELS, region: REGIONS.JPN, description: 'Mii Creator',    hasTicket: true,  danger: null },
  { name: 'Photo Channel 1.1 (USA)',   titleId: '0001000248415941', versions: [1, 2, 3],        category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Photo Viewer',   hasTicket: true,  danger: null },
  { name: 'Internet Channel (USA)',    titleId: '0001000148414441', versions: [1, 3, 257, 512, 1024], category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Opera Browser',  hasTicket: false, danger: null },
  { name: 'Weather Channel (USA)',     titleId: '0001000248414645', versions: [3, 5, 6, 7],     category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Weather',        hasTicket: true,  danger: null },
  { name: 'News Channel (USA)',        titleId: '0001000248414745', versions: [3, 6, 7],        category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'News',           hasTicket: true,  danger: null },
  { name: 'Everybody Votes Channel',   titleId: '0001000148414a45', versions: [1, 2, 3, 512],   category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Voting Channel', hasTicket: false, danger: null },
  { name: 'Nintendo Channel (USA)',    titleId: '0001000148415445', versions: [1, 2, 1024],     category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Game Info',      hasTicket: false, danger: null },
  { name: 'Check Mii Out Channel',     titleId: '0001000148415045', versions: [1, 2, 512],      category: CATEGORIES.CHANNELS, region: REGIONS.USA, description: 'Mii Contest',    hasTicket: false, danger: null },
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
 * Import titles from NUSGet's JSON database format.
 *
 * NUSGet uses JSON files with this structure:
 *   {
 *     "Category Name": [
 *       {
 *         "Name": "Title Name",
 *         "TID": "00000001000000XX",  // XX = region placeholder
 *         "Versions": { "World": [ver1, ver2], "USA/NTSC": [...] },
 *         "Ticket": true,
 *         "Danger": "Optional warning"
 *       }
 *     ]
 *   }
 *
 * TIDs ending in "XX" are region-varying; the last byte is replaced
 * per-region (45=USA, 50=EUR, 4A=JPN, 4B=KOR).
 *
 * @param {string} jsonText - Raw JSON content
 * @param {string} [platform='wii'] - Platform: 'wii', 'vwii', or 'dsi'
 * @returns {{ imported: number, categories: string[] }}
 */
export function importNUSGetJSON(jsonOrText, platform = 'wii') {
  const data = typeof jsonOrText === 'string' ? JSON.parse(jsonOrText) : jsonOrText;

  const regionNameMap = {
    'World': REGIONS.ALL,
    'USA/NTSC': REGIONS.USA,
    'Europe/PAL': REGIONS.EUR,
    'Japan': REGIONS.JPN,
    'Korea': REGIONS.KOR,
    'China': REGIONS.ALL,
    'Australia/NZ': REGIONS.EUR,
  };

  // Region byte to replace XX suffix in TIDs
  const regionByte = {
    'USA/NTSC': '45',
    'Europe/PAL': '50',
    'Japan': '4a',
    'Korea': '4b',
    'China': '43',
    'Australia/NZ': '55',
  };

  const imported = [];
  const categoriesFound = new Set();

  for (const [category, titles] of Object.entries(data)) {
    if (!Array.isArray(titles)) continue;

    // Map NUSGet category names to shorter display names
    let displayCategory = category;
    if (category.startsWith('Virtual Console - ')) {
      displayCategory = 'VC - ' + category.replace('Virtual Console - ', '');
    } else if (category === 'WiiWare - Demos') {
      displayCategory = 'WiiWare Demos';
    }

    if (platform === 'dsi') {
      if (category === 'System Apps') displayCategory = CATEGORIES.DSI_SYSTEM;
      else if (category === 'DSiWare') displayCategory = CATEGORIES.DSIWARE;
      else if (category === 'System') displayCategory = CATEGORIES.DSI_SYSTEM;
    }

    categoriesFound.add(displayCategory);

    for (const title of titles) {
      const baseTid = (title.TID || '').toLowerCase();
      if (!baseTid || baseTid.length !== 16) continue;

      const hasXX = baseTid.endsWith('xx');

      for (const [regionName, versions] of Object.entries(title.Versions || {})) {
        if (!Array.isArray(versions) || versions.length === 0) continue;

        let tid = baseTid;
        if (hasXX && regionByte[regionName]) {
          tid = baseTid.slice(0, 14) + regionByte[regionName];
        } else if (hasXX && regionName === 'World') {
          // For "World" entries with XX, keep as generic (use 00)
          tid = baseTid.slice(0, 14) + '00';
        }

        const region = regionNameMap[regionName] || REGIONS.ALL;
        const name = (regionName === 'World' || Object.keys(title.Versions).length === 1)
          ? title.Name
          : `${title.Name} (${regionName})`;

        imported.push({
          name,
          titleId: tid,
          versions,
          category: displayCategory,
          region,
          description: title.Danger || displayCategory,
          hasTicket: title.Ticket !== false,
          danger: title.Danger || null,
        });
      }
    }
  }

  if (imported.length === 0) {
    throw new Error('No valid titles found. Ensure the file uses NUSGet\'s JSON database format.');
  }

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
/**
 * Lookup a title by ID, optionally narrowing by version.
 * When multiple entries share the same TID (e.g., System Menu per region),
 * the version is used to find the correct region-specific entry.
 *
 * @param {string} titleId
 * @param {number|string} [version] - Version to match against
 * @returns {object|null}
 */
export function lookupTitle(titleId, version) {
  const normalized = titleId.toLowerCase().replace(/\s/g, '');
  const matches = TITLE_DATABASE.filter(t => t.titleId === normalized);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Multiple entries with same TID — try to match by version
  if (version !== undefined && version !== '') {
    const v = Number(version);
    const byVersion = matches.find(t => t.versions.includes(v));
    if (byVersion) return byVersion;
  }

  // Fallback to first match
  return matches[0];
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
