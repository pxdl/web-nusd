import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { NUSClient, NUSError } from './lib/nus-client.js';
import { TMD } from './lib/tmd.js';
import { Ticket } from './lib/ticket.js';
import { packWAD, packTAD, unpackWAD, extractCertsFromTMD, generateWadFilename } from './lib/wad.js';
import { decryptTitleKey, decryptContent, encryptTitleKey, verifyContent, parseCommonKey, COMMON_KEY_NAMES } from './lib/crypto.js';
import { TITLE_DATABASE, CATEGORIES, REGIONS, searchTitles, getTitleType, lookupTitle, importDatabaseXML, importNUSGetJSON, getActiveCategories } from './lib/database.js';
import { getSignedHeaderOffset } from './lib/binary.js';
import { isIOSTitle, getIOSNumber, patchIOS, PATCHES } from './lib/ios-patcher.js';
import { parseNUSScript } from './lib/script-parser.js';
import { createZip } from './lib/zip.js';
import wiiDatabase from './data/wii-database.json';
import vwiiDatabase from './data/vwii-database.json';
import dsiDatabase from './data/dsi-database.json';

// ─── Styles ───────────────────────────────────────────────
const COLORS = {
  bg: '#eef4f8',
  surface: '#ffffff',
  surfaceLight: '#f4f8fb',
  accent: '#009ec2',
  accentDim: '#007a9a',
  accentGlow: 'rgba(0, 158, 194, 0.12)',
  warning: '#e8a317',
  error: '#d94040',
  success: '#28a060',
  text: '#2c3a48',
  textDim: '#6a7f90',
  border: '#c8d8e4',
  danger: '#d94040',
  dangerBg: 'rgba(217, 64, 64, 0.06)',
};

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  // Mode: 'download', 'batch', 'wadtools'
  const [mode, setMode] = useState('download');

  // Download config
  const [titleId, setTitleId] = useState('');
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('wii'); // 'wii', 'vwii', or 'dsi'
  const [packWad, setPackWad] = useState(true);
  const [keepEncrypted, setKeepEncrypted] = useState(false);
  const [decryptContents, setDecryptContents] = useState(false);
  const [commonKeyHex, setCommonKeyHex] = useState('');
  const [useWiiUCDN, setUseWiiUCDN] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('http://localhost:3001');
  const [availableVersions, setAvailableVersions] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [wadNameTemplate, setWadNameTemplate] = useState('');

  // IOS patching
  const [patchTrucha, setPatchTrucha] = useState(false);
  const [patchESIdentify, setPatchESIdentify] = useState(false);
  const [patchNAND, setPatchNAND] = useState(false);
  const [patchVersion, setPatchVersion] = useState(false);

  // vWii re-encryption
  const [vwiiReencrypt, setVwiiReencrypt] = useState(false);
  const [wiiCommonKeyHex, setWiiCommonKeyHex] = useState('');

  // State
  const [logs, setLogs] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [tmdInfo, setTmdInfo] = useState(null);
  const [showDatabase, setShowDatabase] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [dbCategory, setDbCategory] = useState('');
  const [proxyStatus, setProxyStatus] = useState('unknown');
  const [commonKeyNeeded, setCommonKeyNeeded] = useState(null);
  const [dangerWarning, setDangerWarning] = useState(null);

  // Batch download
  const [batchQueue, setBatchQueue] = useState([]);
  const [batchProgress, setBatchProgress] = useState(null);

  // WAD tools
  const [wadUnpackResult, setWadUnpackResult] = useState(null);

  // Modal close animation
  const [dbClosing, setDbClosing] = useState(false);
  const closeDatabase = useCallback(() => {
    setDbClosing(true);
    setTimeout(() => {
      setShowDatabase(false);
      setDbClosing(false);
    }, 150);
  }, []);

  // Database version counter — incremented to force re-render after import
  const [dbVersion, setDbVersion] = useState(0);

  // Database tree: track which categories are expanded
  const [expandedCats, setExpandedCats] = useState({});

  const logRef = useRef(null);

  const log = useCallback((msg, type = 'info') => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Parse shareable URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tid')) setTitleId(params.get('tid'));
    if (params.get('ver')) setVersion(params.get('ver'));
    if (params.get('console')) setPlatform(params.get('console'));
    if (params.get('mode')) setMode(params.get('mode'));
    if (params.get('manual') === '1') setManualEntry(true);
  }, []);

  // After database loads, try to match the current title ID to a database entry.
  // If no match and there's a TID present, switch to manual mode to preserve it.
  useEffect(() => {
    if (titleId.length === 16 && !selectedTitle) {
      const match = lookupTitle(titleId, version);
      if (match) {
        setSelectedTitle(match);
        setAvailableVersions(match.versions || []);
        setManualEntry(false);
      } else if (titleId) {
        // TID doesn't match database — preserve it in manual mode
        setManualEntry(true);
      }
    }
  }, [dbVersion]); // runs when database is loaded/changed

  // Update URL when config changes (shareable links), debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (titleId) params.set('tid', titleId);
      if (version) params.set('ver', version);
      if (platform !== 'wii') params.set('console', platform);
      if (mode !== 'download') params.set('mode', mode);
      if (manualEntry) params.set('manual', '1');
      const search = params.toString();
      const url = search ? `?${search}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    }, 300);
    return () => clearTimeout(timer);
  }, [titleId, version, platform, mode, manualEntry]);

  // Check proxy on mount and when URL changes
  useEffect(() => {
    const check = async () => {
      try {
        const client = new NUSClient(proxyUrl);
        const ok = await client.healthCheck();
        setProxyStatus(ok ? 'ok' : 'error');
      } catch {
        setProxyStatus('error');
      }
    };
    check();
  }, [proxyUrl]);

  // Load the appropriate title database for the selected platform
  useEffect(() => {
    const databases = { wii: wiiDatabase, vwii: vwiiDatabase, dsi: dsiDatabase };
    const db = databases[platform] || wiiDatabase;
    // Clear stale selection from previous platform's database
    setSelectedTitle(null);
    setAvailableVersions([]);
    try {
      importNUSGetJSON(db, platform);
      setDbVersion(v => v + 1);
    } catch { /* keep existing database on error */ }
  }, [platform]);

  // Lock page scroll when modal is open
  useEffect(() => {
    const html = document.documentElement;
    if (showDatabase) {
      html.style.overflow = 'hidden';
      // scrollbar-gutter: stable on html keeps the gutter reserved,
      // so no padding compensation needed
    } else {
      html.style.overflow = '';
    }
    return () => { html.style.overflow = ''; };
  }, [showDatabase]);

  // Check for danger warnings when title/version/database changes
  useEffect(() => {
    if (titleId.length === 16) {
      const title = lookupTitle(titleId, version);
      setDangerWarning(title?.danger || null);
    } else {
      setDangerWarning(null);
    }
  }, [titleId, version, dbVersion]);

  // ─── Database Selection ─────────────────────
  const selectTitle = (title) => {
    setTitleId(title.titleId);
    setAvailableVersions(title.versions || []);
    setSelectedTitle(title);
    setManualEntry(false);
    if (title.versions.length > 0) {
      setVersion(String(title.versions[title.versions.length - 1]));
    } else {
      setVersion('');
    }
    closeDatabase();
    log(`Selected: ${title.name} (${title.titleId})`, 'info');

    // Auto-detect platform from title ID
    const upper = title.titleId.slice(0, 8);
    if (upper.startsWith('00030')) {
      setPlatform('dsi');
    }
  };

  // ─── Database Import ─────────────────────────
  const handleImportDB = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        let result;
        if (file.name.endsWith('.json')) {
          result = importNUSGetJSON(text, platform);
          log(`Imported ${result.imported} titles from ${file.name} (NUSGet JSON)`, 'success');
        } else {
          result = importDatabaseXML(text);
          log(`Imported ${result.imported} titles from ${file.name} (NUSD XML)`, 'success');
        }
        log(`  Categories: ${result.categories.join(', ')}`);
        setDbVersion(v => v + 1);
      } catch (err) {
        log(`Import failed: ${err.message}`, 'error');
      }
    };
    input.click();
  };

  // ─── Single Download Handler ────────────────
  const handleDownload = async () => {
    const tid = titleId.trim().toLowerCase();
    if (!/^[0-9a-f]{16}$/.test(tid)) {
      log('Error: Title ID must be 16 hex characters.', 'error');
      return;
    }

    if (!packWad && !keepEncrypted && !decryptContents) {
      log('Error: Select at least one output option (Pack WAD, Keep encrypted, or Decrypt).', 'error');
      return;
    }

    setIsDownloading(true);
    setLogs([]);
    setTmdInfo(null);
    setProgress(null);
    setCommonKeyNeeded(null);

    const client = new NUSClient(proxyUrl);
    client.useWiiU = useWiiUCDN;
    client.platform = platform;

    const onRetry = (attempt, max, delay) => {
      log(`  Retry ${attempt}/${max} in ${delay}ms...`, 'warning');
    };

    try {
      // ── Step 1: Download TMD ──
      log(`Downloading TMD for ${tid.toUpperCase()}...`);
      const tmdVer = version.trim() ? parseInt(version) : undefined;
      const tmdData = await client.downloadTMD(tid, tmdVer, onRetry);
      const tmd = new TMD(tmdData);

      log(`TMD parsed: ${tmd.numContents} content(s), v${tmd.titleVersion}`, 'success');
      log(`  Title ID: ${tmd.titleId.toUpperCase()}`);
      log(`  Type: ${getTitleType(tmd.titleId)}`);
      if (platform !== 'dsi') log(`  Required: ${tmd.iosVersion}`);
      log(`  Total size: ${formatSize(Number(tmd.totalSize))}`);

      setTmdInfo({
        titleId: tmd.titleId,
        version: tmd.titleVersion,
        numContents: tmd.numContents,
        iosVersion: tmd.iosVersion,
        totalSize: tmd.totalSize,
        type: getTitleType(tmd.titleId),
      });

      // ── Step 2: Download Ticket ──
      let ticketData = null;
      let ticket = null;
      try {
        log('Downloading ticket (cetk)...');
        ticketData = await client.downloadTicket(tid, onRetry);
        ticket = new Ticket(ticketData);
        const keyName = COMMON_KEY_NAMES[platform === 'dsi' ? 'dsi' : ticket.commonKeyIndex] || `Unknown (${ticket.commonKeyIndex})`;
        log(`Ticket obtained (${keyName})`, 'success');
        setCommonKeyNeeded(platform === 'dsi' ? 'dsi' : ticket.commonKeyIndex);
      } catch (err) {
        if (err.status === 404) {
          log('Ticket not available (title may require purchase).', 'warning');
          if (packWad) {
            log('Cannot pack WAD without ticket. Downloading contents only.', 'warning');
          }
        } else {
          throw err;
        }
      }

      // ── Step 3: Download Contents ──
      const contentBuffers = [];
      for (let i = 0; i < tmd.contents.length; i++) {
        const content = tmd.contents[i];
        setProgress({
          current: i + 1,
          total: tmd.contents.length,
          label: `Content ${content.idHex} (${formatSize(Number(content.size))})`,
          pct: 0,
        });

        log(`Downloading content ${content.idHex} [${i + 1}/${tmd.contents.length}]...`);

        let lastPct = -1;
        const contentData = await client.downloadContent(
          tid,
          content.idHex,
          (loaded, total) => {
            const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
            if (pct !== lastPct) {
              lastPct = pct;
              setProgress(prev => prev ? { ...prev, pct } : null);
            }
          },
          onRetry
        );

        contentBuffers.push(new Uint8Array(contentData));
        log(`  Done: ${content.idHex} (${formatSize(contentData.byteLength)})`, 'success');
      }

      // ── Step 4: Pack WAD ──
      if (packWad && ticket) {
        log('Packing WAD...');

        const tmdBytes = new Uint8Array(tmdData);

        // Download proper cert chain from System Menu 4.3U
        let certChain;
        try {
          log('  Downloading certificate chain...');
          certChain = await client.downloadCertChain(onRetry);
          log(`  Certificate chain obtained (${certChain.length} bytes)`);
        } catch {
          // Fallback: extract from current title's TMD
          const certs = extractCertsFromTMD(tmdBytes, tmd.numContents);
          if (certs && certs.length > 0) {
            certChain = certs;
            log(`  Certificate chain extracted from TMD (${certs.length} bytes)`, 'warning');
          } else {
            certChain = new Uint8Array(0);
            log('  No certificate chain available', 'warning');
          }
        }

        const ticketBytes = new Uint8Array(ticketData);

        // Determine if we need to pack a patched WAD
        const isIOS = isIOSTitle(tid);
        const patchTypes = [];
        if (isIOS && patchTrucha) patchTypes.push('trucha');
        if (isIOS && patchESIdentify) patchTypes.push('esIdentify');
        if (isIOS && patchNAND) patchTypes.push('nandPermissions');
        if (isIOS && patchVersion) patchTypes.push('versionPatch');

        let iosPatchApplied = false;
        if (patchTypes.length > 0 && commonKeyHex.trim()) {
          log('  Applying IOS patches before packing...', 'info');
          try {
            const commonKey = parseCommonKey(commonKeyHex.trim());
            const titleKey = await decryptTitleKey(ticket.encryptedTitleKey, commonKey, tmd.titleId);

            // Decrypt, patch, and replace contentBuffers with patched encrypted content
            for (let i = 0; i < tmd.contents.length; i++) {
              const content = tmd.contents[i];
              let decrypted = await decryptContent(contentBuffers[i], titleKey, content.index);
              decrypted = decrypted.slice(0, Number(content.size));

              const { data: patched, results } = patchIOS(decrypted, patchTypes);
              for (const r of results) {
                if (r.applied) {
                  log(`    ${r.patch}: applied at offset 0x${r.offset.toString(16)}`, 'success');
                } else {
                  log(`    ${r.patch}: pattern not found`, 'warning');
                }
              }

              // Pad patched content back to encrypted size and use as content
              const padded = new Uint8Array(contentBuffers[i].length);
              padded.set(patched);
              contentBuffers[i] = padded;
            }
            iosPatchApplied = true;
          } catch (err) {
            log(`IOS patching failed: ${err.message}. Packing unpatched WAD.`, 'error');
          }
        }

        // vWii re-encryption: re-encrypt title key from vWii key to Wii key
        let finalTicketBytes = ticketBytes;
        if (platform === 'vwii' && vwiiReencrypt && commonKeyHex.trim() && wiiCommonKeyHex.trim()) {
          try {
            log('  Re-encrypting title key for Wii compatibility...');
            const vwiiKey = parseCommonKey(commonKeyHex.trim());
            const wiiKey = parseCommonKey(wiiCommonKeyHex.trim());
            const decTitleKey = await decryptTitleKey(ticket.encryptedTitleKey, vwiiKey, tmd.titleId);
            const reencTitleKey = await encryptTitleKey(decTitleKey, wiiKey, tmd.titleId);
            // Patch ticket: write re-encrypted key and set common key index to 0
            finalTicketBytes = new Uint8Array(ticketBytes);
            const tkHeaderOffset = getSignedHeaderOffset(ticket.sigType);
            finalTicketBytes.set(reencTitleKey, tkHeaderOffset + 0x7F); // encrypted title key
            finalTicketBytes[tkHeaderOffset + 0xB1] = 0; // commonKeyIndex = 0 (Wii)
            log('  Title key re-encrypted (vWii → Wii)', 'success');
          } catch (err) {
            log(`  Re-encryption failed: ${err.message}`, 'error');
            finalTicketBytes = ticketBytes;
          }
        }

        // Pack WAD (Wii/vWii) or TAD (DSi)
        const isDSi = platform === 'dsi';
        const archiveData = isDSi
          ? packTAD(certChain, finalTicketBytes, tmdBytes, contentBuffers)
          : packWAD(certChain, finalTicketBytes, tmdBytes, contentBuffers, { titleId: tid });
        const dbTitle = lookupTitle(tid, tmd.titleVersion);
        const ext = isDSi ? '.tad' : (iosPatchApplied ? '.patched.wad' : '.wad');
        const filename = generateWadFilename(tid, tmd.titleVersion, dbTitle?.name, wadNameTemplate).replace(/\.wad$/, ext);
        downloadBlob(archiveData, filename);
        log(`${isDSi ? 'TAD' : 'WAD'} packed and saved: ${filename} (${formatSize(archiveData.length)})`, 'success');
      }

      // ── Step 5: Save encrypted files as ZIP ──
      if (keepEncrypted) {
        log('Bundling encrypted contents into ZIP...');
        const zipFiles = [];
        zipFiles.push({ name: 'tmd', data: new Uint8Array(tmdData) });
        if (ticketData) zipFiles.push({ name: 'cetk', data: new Uint8Array(ticketData) });
        for (let i = 0; i < tmd.contents.length; i++) {
          zipFiles.push({ name: tmd.contents[i].idHex, data: contentBuffers[i] });
        }
        const folder = `${tid.toUpperCase()}_v${tmd.titleVersion}/`;
        const zipData = createZip(zipFiles, folder);
        downloadBlob(zipData, `${tid.toUpperCase()}-v${tmd.titleVersion}-encrypted.zip`);
        log('Encrypted files saved as ZIP.', 'success');
      }

      // ── Step 6: Decrypt contents ──
      if (decryptContents && ticket && commonKeyHex.trim()) {
        log('Decrypting contents...');
        try {
          const commonKey = parseCommonKey(commonKeyHex.trim());
          const titleKey = await decryptTitleKey(
            ticket.encryptedTitleKey,
            commonKey,
            tmd.titleId
          );
          log('  Title key decrypted successfully');

          const decryptedFiles = [];
          for (let i = 0; i < tmd.contents.length; i++) {
            const content = tmd.contents[i];
            log(`  Decrypting ${content.idHex}...`);

            const decrypted = await decryptContent(
              contentBuffers[i],
              titleKey,
              content.index
            );

            // Verify SHA-1
            const verification = await verifyContent(
              decrypted,
              content.hash,
              content.size
            );

            if (verification.valid) {
              log(`  ${content.idHex}.app verified (SHA-1 match)`, 'success');
            } else {
              log(`  ${content.idHex}.app hash mismatch!`, 'warning');
              log(`    Expected: ${verification.expected}`);
              log(`    Got:      ${verification.hash}`);
            }

            decryptedFiles.push({
              name: `${content.idHex}.app`,
              data: decrypted.slice(0, Number(content.size)),
            });
          }

          // Bundle decrypted files into ZIP
          const folder = `${tid.toUpperCase()}_v${tmd.titleVersion}_decrypted/`;
          const zipData = createZip(decryptedFiles, folder);
          downloadBlob(zipData, `${tid.toUpperCase()}-v${tmd.titleVersion}-decrypted.zip`);
          log('Decrypted contents saved as ZIP.', 'success');
        } catch (err) {
          log(`Decryption failed: ${err.message}`, 'error');
        }
      }

      setProgress(null);
      log('Download complete!', 'success');

    } catch (err) {
      log(`Error: ${err.message}`, 'error');
      if (err.detail) log(`  Detail: ${err.detail}`, 'error');
      setProgress(null);
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── Batch Download Handler ─────────────────
  const handleLoadScript = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.nus,.txt';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const entries = parseNUSScript(text);
      if (entries.length === 0) {
        log('No valid entries found in script file.', 'error');
        return;
      }
      setBatchQueue(entries);
      log(`Loaded ${entries.length} title(s) from ${file.name}`, 'success');
    };
    input.click();
  };

  const handleBatchDownload = async () => {
    if (batchQueue.length === 0) return;
    setIsDownloading(true);
    setLogs([]);

    const client = new NUSClient(proxyUrl);
    client.useWiiU = useWiiUCDN;
    client.platform = platform;

    const onRetry = (attempt, max, delay) => {
      log(`  Retry ${attempt}/${max} in ${delay}ms...`, 'warning');
    };

    let completed = 0;
    let failed = 0;

    for (let qi = 0; qi < batchQueue.length; qi++) {
      const entry = batchQueue[qi];
      setBatchProgress({ current: qi + 1, total: batchQueue.length });
      log(`\n[${ qi + 1}/${batchQueue.length}] Downloading ${entry.titleId.toUpperCase()} v${entry.version}...`);

      try {
        const tmdData = await client.downloadTMD(entry.titleId, entry.version, onRetry);
        const tmd = new TMD(tmdData);
        log(`  TMD: ${tmd.numContents} content(s), ${formatSize(Number(tmd.totalSize))}`);

        let ticketData = null;
        try {
          ticketData = await client.downloadTicket(entry.titleId, onRetry);
        } catch (err) {
          if (err.status === 404) {
            log('  No ticket available', 'warning');
          } else throw err;
        }

        const contentBuffers = [];
        for (let i = 0; i < tmd.contents.length; i++) {
          const content = tmd.contents[i];
          const data = await client.downloadContent(entry.titleId, content.idHex, null, onRetry);
          contentBuffers.push(new Uint8Array(data));
        }

        if (packWad && ticketData) {
          const tmdBytes = new Uint8Array(tmdData);
          const ticketBytes = new Uint8Array(ticketData);
          const certs = extractCertsFromTMD(tmdBytes, tmd.numContents) || new Uint8Array(0);
          const wadData = packWAD(certs, ticketBytes, tmdBytes, contentBuffers);
          const dbTitle = lookupTitle(entry.titleId, tmd.titleVersion);
          const filename = generateWadFilename(entry.titleId, tmd.titleVersion, dbTitle?.name);
          downloadBlob(wadData, filename);
          log(`  WAD saved: ${filename}`, 'success');
        }

        completed++;
      } catch (err) {
        log(`  FAILED: ${err.message}`, 'error');
        failed++;
      }
    }

    setBatchProgress(null);
    log(`\nBatch complete: ${completed} succeeded, ${failed} failed.`, completed > 0 ? 'success' : 'error');
    setIsDownloading(false);
  };

  // ─── WAD Unpack Handler ─────────────────────
  const handleUnpackWAD = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.wad';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        const result = unpackWAD(new Uint8Array(buffer));
        const tmd = new TMD(result.tmd.buffer.slice(result.tmd.byteOffset, result.tmd.byteOffset + result.tmd.byteLength));
        setWadUnpackResult({
          ...result,
          filename: file.name,
          tmdParsed: tmd,
        });
        log(`WAD unpacked: ${file.name}`, 'success');
        log(`  Title ID: ${tmd.titleId.toUpperCase()}`);
        log(`  Version: v${tmd.titleVersion}`);
        log(`  Contents: ${result.contents.length}`);
      } catch (err) {
        log(`Failed to unpack WAD: ${err.message}`, 'error');
      }
    };
    input.click();
  };

  const handleExportWADComponent = (data, filename) => {
    downloadBlob(data, filename);
    log(`Exported: ${filename}`, 'success');
  };

  const handleExportAllWAD = () => {
    if (!wadUnpackResult) return;
    const files = [
      { name: 'cert', data: wadUnpackResult.certChain },
      { name: 'cetk', data: wadUnpackResult.ticket },
      { name: 'tmd', data: wadUnpackResult.tmd },
      ...wadUnpackResult.contents.map(c => ({ name: c.idHex, data: c.data })),
    ];
    if (wadUnpackResult.footer) files.push({ name: 'footer', data: wadUnpackResult.footer });

    const tid = wadUnpackResult.tmdParsed.titleId.toUpperCase();
    const ver = wadUnpackResult.tmdParsed.titleVersion;
    const zipData = createZip(files, `${tid}_v${ver}/`);
    downloadBlob(zipData, `${tid}-v${ver}-unpacked.zip`);
    log('All components exported as ZIP.', 'success');
  };

  const toggleCategory = useCallback((cat) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  // ─── Render ─────────────────────────────────
  const filteredTitles = useMemo(
    () => showDatabase ? searchTitles(dbSearch, dbCategory) : [],
    [dbSearch, dbCategory, showDatabase, dbVersion]
  );
  const showIOS = isIOSTitle(titleId);
  const activeCategories = useMemo(
    () => showDatabase ? getActiveCategories() : [],
    [showDatabase, dbVersion]
  );

  // Group filtered titles by category for tree view
  const groupedTitles = useMemo(() => {
    const groups = {};
    for (const title of filteredTitles) {
      const cat = title.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(title);
    }
    return groups;
  }, [filteredTitles]);

  // When searching, auto-expand all categories; otherwise use manual state
  const isSearching = dbSearch.trim().length > 0;
  const isCatExpanded = useCallback((cat) => {
    if (isSearching) return true;
    // Default: expand first category, collapse rest
    if (expandedCats[cat] === undefined) {
      return Object.keys(groupedTitles).indexOf(cat) === 0;
    }
    return expandedCats[cat];
  }, [isSearching, expandedCats, groupedTitles]);

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <header className="nusd-header" style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoArea}>
            <div className="nusd-logo-icon" style={styles.logoIcon}>&#x2B21;</div>
            <div>
              <h1 className="nusd-title" style={styles.title}>Web NUS Downloader</h1>
              <p style={styles.subtitle}>Browser-based Nintendo Update Server client</p>
            </div>
          </div>
          <div style={styles.statusArea}>
            <span className={`nusd-status-dot ${proxyStatus === 'ok' ? 'connected' : ''}`} style={{
              ...styles.statusDot,
              backgroundColor: proxyStatus === 'ok' ? COLORS.success
                : proxyStatus === 'error' ? COLORS.error
                : COLORS.textDim
            }} />
            <span style={styles.statusText}>
              Proxy: {proxyStatus === 'ok' ? 'Connected' : proxyStatus === 'error' ? 'Offline' : 'Checking...'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Mode Tabs ── */}
      <div style={styles.tabBar}>
        <div style={styles.tabBarInner}>
          {[
            { id: 'download', label: 'Download' },
            { id: 'batch', label: 'Batch Download' },
            { id: 'wadtools', label: 'WAD Tools' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`nusd-tab ${mode === tab.id ? 'active' : ''}`}
              style={styles.tab}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="nusd-main" style={styles.main}>
        {/* ── Left Panel: Controls ── */}
        <section key={mode} className="nusd-panel nusd-panel-animated" style={styles.panel}>
          {mode === 'download' && (
            <>
              <h2 style={styles.panelTitle}>Title Configuration</h2>

              {/* Platform */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Platform</label>
                <div style={styles.toggleGroup}>
                  <button
                    className={`nusd-toggle ${platform === 'wii' ? 'active' : ''}`}
                    style={{ ...styles.toggleBtn, ...(platform === 'wii' ? styles.toggleActive : {}) }}
                    onClick={() => setPlatform('wii')}
                    disabled={isDownloading}
                  >Wii</button>
                  <button
                    className={`nusd-toggle ${platform === 'vwii' ? 'active' : ''}`}
                    style={{ ...styles.toggleBtn, ...(platform === 'vwii' ? styles.toggleActive : {}) }}
                    onClick={() => setPlatform('vwii')}
                    disabled={isDownloading}
                  >vWii</button>
                  <button
                    className={`nusd-toggle ${platform === 'dsi' ? 'active' : ''}`}
                    style={{ ...styles.toggleBtn, ...(platform === 'dsi' ? styles.toggleActive : {}) }}
                    onClick={() => setPlatform('dsi')}
                    disabled={isDownloading}
                  >DSi</button>
                </div>
              </div>

              {/* Title Selection */}
              {!manualEntry ? (
                <>
                  {/* Database selection mode (default) */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Title</label>
                    {selectedTitle ? (
                      <div className="nusd-info-card" style={styles.selectedTitleCard}>
                        <div style={styles.selectedTitleHeader}>
                          <div>
                            <div style={styles.selectedTitleName}>{selectedTitle.name}</div>
                            <div style={styles.selectedTitleMeta}>
                              <span style={{ color: COLORS.accentDim, fontFamily: 'var(--font-mono)' }}>{selectedTitle.titleId.toUpperCase()}</span>
                              <span style={{ color: COLORS.textDim }}>{selectedTitle.region}</span>
                              <span style={{ color: COLORS.textDim }}>{selectedTitle.category}</span>
                            </div>
                          </div>
                          <button
                            className="nusd-btn-secondary"
                            style={{ ...styles.btnSecondary, fontSize: 11, padding: '4px 10px' }}
                            onClick={() => setShowDatabase(true)}
                            disabled={isDownloading}
                          >Change</button>
                        </div>
                        {selectedTitle.hasTicket === false && (
                          <div style={{ fontSize: 11, color: COLORS.warning, marginTop: 6 }}>No ticket available — WAD packing and decryption won't work</div>
                        )}
                      </div>
                    ) : (
                      <button
                        className="nusd-btn-secondary"
                        style={{ ...styles.btnSecondary, width: '100%', padding: '12px', textAlign: 'center' }}
                        onClick={() => setShowDatabase(true)}
                        disabled={isDownloading}
                      >
                        Select from Database
                      </button>
                    )}
                  </div>

                  {/* Danger Warning */}
                  {dangerWarning && (
                    <div className="nusd-danger-banner" style={styles.dangerBanner}>
                      <strong>Warning:</strong> {dangerWarning}
                    </div>
                  )}

                  {/* Version chips */}
                  {selectedTitle && availableVersions.length > 0 && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Version</label>
                      <div className="nusd-version-chips" style={styles.versionChips}>
                        {availableVersions.map(v => (
                          <button
                            key={v}
                            className={`nusd-version-chip ${String(v) === version ? 'active' : ''}`}
                            style={{
                              ...styles.versionChip,
                              ...(String(v) === version ? styles.versionChipActive : {}),
                            }}
                            onClick={() => setVersion(String(v))}
                            disabled={isDownloading}
                          >
                            v{v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    style={styles.manualEntryLink}
                    onClick={() => setManualEntry(true)}
                    disabled={isDownloading}
                  >
                    Enter title ID manually
                  </button>
                </>
              ) : (
                <>
                  {/* Manual entry mode */}
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Title ID</label>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="0000000100000002"
                      maxLength={16}
                      value={titleId}
                      onChange={e => { setTitleId(e.target.value.replace(/[^0-9a-fA-F]/g, '')); setAvailableVersions([]); setSelectedTitle(null); }}
                      disabled={isDownloading}
                    />
                    {titleId.length > 0 && titleId.length < 16 && (
                      <span style={styles.hint}>{16 - titleId.length} more characters needed</span>
                    )}
                  </div>

                  {/* Danger Warning */}
                  {dangerWarning && (
                    <div className="nusd-danger-banner" style={styles.dangerBanner}>
                      <strong>Warning:</strong> {dangerWarning}
                    </div>
                  )}

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Version <span style={styles.optional}>(blank = latest)</span></label>
                    <input
                      style={{ ...styles.input, width: 120 }}
                      type="text"
                      placeholder="Latest"
                      value={version}
                      onChange={e => setVersion(e.target.value.replace(/[^0-9]/g, ''))}
                      disabled={isDownloading}
                    />
                  </div>

                  <button
                    style={styles.manualEntryLink}
                    onClick={() => {
                      setManualEntry(false);
                      // Try to match the typed title ID to a database entry
                      if (titleId.length === 16) {
                        const match = lookupTitle(titleId, version);
                        if (match) {
                          setSelectedTitle(match);
                          setAvailableVersions(match.versions || []);
                        }
                      }
                    }}
                    disabled={isDownloading}
                  >
                    Select from database instead
                  </button>
                </>
              )}

              {/* Options */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Options</label>
                <div style={styles.checkboxGroup}>
                  <Checkbox checked={packWad} onChange={setPackWad} label="Pack WAD" disabled={isDownloading} />
                  <Checkbox checked={keepEncrypted} onChange={setKeepEncrypted} label="Keep encrypted contents (ZIP)" disabled={isDownloading} />
                  <Checkbox checked={decryptContents} onChange={setDecryptContents} label="Create decrypted contents (.app)" disabled={isDownloading} />
                  {platform === 'wii' && (
                    <Checkbox checked={useWiiUCDN} onChange={setUseWiiUCDN} label="Use Wii U CDN" disabled={isDownloading} />
                  )}
                </div>
              </div>

              {/* IOS Patching */}
              {showIOS && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>IOS Patching</label>
                  <div style={styles.checkboxGroup}>
                    <Checkbox checked={patchTrucha} onChange={setPatchTrucha} label={PATCHES.trucha.name} disabled={isDownloading} />
                    <Checkbox checked={patchESIdentify} onChange={setPatchESIdentify} label={PATCHES.esIdentify.name} disabled={isDownloading} />
                    <Checkbox checked={patchNAND} onChange={setPatchNAND} label={PATCHES.nandPermissions.name} disabled={isDownloading} />
                    <Checkbox checked={patchVersion} onChange={setPatchVersion} label={PATCHES.versionPatch.name} disabled={isDownloading} />
                  </div>
                  <span style={styles.hint}>Requires common key for patching</span>
                </div>
              )}

              {/* WAD Naming */}
              {packWad && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>WAD Name <span style={styles.optional}>(blank = auto)</span></label>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="[name]-[v] or custom"
                    value={wadNameTemplate}
                    onChange={e => setWadNameTemplate(e.target.value)}
                    disabled={isDownloading}
                  />
                  <span style={styles.hint}>Placeholders: [v] = version, [tid] = title ID, [name] = title name</span>
                </div>
              )}

              {/* vWii Re-encryption */}
              {platform === 'vwii' && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>vWii Settings</label>
                  <div style={styles.checkboxGroup}>
                    <Checkbox checked={vwiiReencrypt} onChange={setVwiiReencrypt}
                      label="Re-encrypt title key for Wii compatibility" disabled={isDownloading} />
                  </div>
                  {vwiiReencrypt && (
                    <>
                      <span style={styles.hint}>Requires both vWii and Wii common keys</span>
                      <input
                        style={styles.input}
                        type="password"
                        placeholder="Wii Common Key (32 hex chars)"
                        value={wiiCommonKeyHex}
                        onChange={e => setWiiCommonKeyHex(e.target.value)}
                        disabled={isDownloading}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Common Key */}
              {(decryptContents || patchTrucha || patchESIdentify || patchNAND || patchVersion || (platform === 'vwii' && vwiiReencrypt)) && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Common Key
                    {commonKeyNeeded !== null && (
                      <span style={{ color: COLORS.accent, marginLeft: 8 }}>
                        ({COMMON_KEY_NAMES[commonKeyNeeded] || 'Unknown'} needed)
                      </span>
                    )}
                  </label>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="32 hex characters"
                    value={commonKeyHex}
                    onChange={e => setCommonKeyHex(e.target.value)}
                    disabled={isDownloading}
                  />
                  <span style={styles.hint}>
                    {platform === 'dsi'
                      ? 'Extract DSi common key from your DSi console.'
                      : 'Extract from your own Wii console. Not included for legal reasons.'}
                  </span>
                </div>
              )}

              {/* Proxy URL */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Proxy Server</label>
                <input
                  style={styles.input}
                  type="text"
                  value={proxyUrl}
                  onChange={e => setProxyUrl(e.target.value)}
                  disabled={isDownloading}
                />
              </div>

              {/* Download Button */}
              <button
                style={{
                  ...styles.btnPrimary,
                  opacity: (isDownloading || proxyStatus !== 'ok' || (!manualEntry && !selectedTitle) || (manualEntry && titleId.length !== 16)) ? 0.5 : 1,
                }}
                className="nusd-btn-primary"
                onClick={handleDownload}
                disabled={isDownloading || proxyStatus !== 'ok' || (!manualEntry && !selectedTitle) || (manualEntry && titleId.length !== 16)}
              >
                {isDownloading ? 'Downloading...' : 'Start NUS Download'}
              </button>

              {proxyStatus === 'error' && (
                <div className="nusd-error-banner" style={styles.errorBanner}>
                  Proxy server is not reachable. Make sure the server is running at {proxyUrl}
                </div>
              )}
            </>
          )}

          {mode === 'batch' && (
            <>
              <h2 style={styles.panelTitle}>Batch Download</h2>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Platform</label>
                <div style={styles.toggleGroup}>
                  <button style={{ ...styles.toggleBtn, ...(platform === 'wii' ? styles.toggleActive : {}) }}
                    onClick={() => setPlatform('wii')} disabled={isDownloading}>Wii</button>
                  <button style={{ ...styles.toggleBtn, ...(platform === 'vwii' ? styles.toggleActive : {}) }}
                    onClick={() => setPlatform('vwii')} disabled={isDownloading}>vWii</button>
                  <button style={{ ...styles.toggleBtn, ...(platform === 'dsi' ? styles.toggleActive : {}) }}
                    onClick={() => setPlatform('dsi')} disabled={isDownloading}>DSi</button>
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>NUS Script File</label>
                <button className="nusd-btn-secondary" style={styles.btnSecondary} onClick={handleLoadScript} disabled={isDownloading}>
                  Load .nus Script
                </button>
                <span style={styles.hint}>
                  Format: one title per line — "titleID versionHex"
                </span>
              </div>

              {batchQueue.length > 0 && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Queue ({batchQueue.length} titles)</label>
                  <div style={styles.batchList}>
                    {batchQueue.map((entry, i) => (
                      <div key={i} style={styles.batchItem}>
                        <span style={{ color: COLORS.accent }}>{entry.titleId}</span>
                        <span style={{ color: COLORS.textDim }}>v{entry.version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.checkboxGroup}>
                <Checkbox checked={packWad} onChange={setPackWad} label="Pack WAD" disabled={isDownloading} />
                {platform === 'wii' && (
                  <Checkbox checked={useWiiUCDN} onChange={setUseWiiUCDN} label="Use Wii U CDN" disabled={isDownloading} />
                )}
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Proxy Server</label>
                <input style={styles.input} type="text" value={proxyUrl}
                  onChange={e => setProxyUrl(e.target.value)} disabled={isDownloading} />
              </div>

              <button
                style={{
                  ...styles.btnPrimary,
                  opacity: isDownloading || batchQueue.length === 0 || proxyStatus !== 'ok' ? 0.5 : 1,
                }}
                className="nusd-btn-primary"
                onClick={handleBatchDownload}
                disabled={isDownloading || batchQueue.length === 0 || proxyStatus !== 'ok'}
              >
                {isDownloading ? 'Downloading...' : `Download ${batchQueue.length} Title(s)`}
              </button>

              {batchProgress && (
                <div style={styles.progressArea}>
                  <div style={styles.progressLabel}>
                    Title {batchProgress.current}/{batchProgress.total}
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                    }} />
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'wadtools' && (
            <>
              <h2 style={styles.panelTitle}>WAD Tools</h2>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Unpack WAD</label>
                <button className="nusd-btn-secondary" style={styles.btnSecondary} onClick={handleUnpackWAD}>
                  Select WAD File
                </button>
                <span style={styles.hint}>Extract cert chain, ticket, TMD, and contents from a WAD file.</span>
              </div>

              {wadUnpackResult && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Unpacked: {wadUnpackResult.filename}</label>

                  <div style={styles.infoCard}>
                    <InfoRow label="Title ID" value={wadUnpackResult.tmdParsed.titleId.toUpperCase()} />
                    <InfoRow label="Version" value={`v${wadUnpackResult.tmdParsed.titleVersion}`} />
                    <InfoRow label="Contents" value={String(wadUnpackResult.contents.length)} />
                    <InfoRow label="Cert Chain" value={formatSize(wadUnpackResult.certChain.length)} />
                    <InfoRow label="Ticket" value={formatSize(wadUnpackResult.ticket.length)} />
                    <InfoRow label="TMD" value={formatSize(wadUnpackResult.tmd.length)} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    <button style={styles.btnSmall} onClick={() => handleExportWADComponent(wadUnpackResult.certChain, 'cert')}>Export Certificate Chain</button>
                    <button style={styles.btnSmall} onClick={() => handleExportWADComponent(wadUnpackResult.ticket, 'cetk')}>Export Ticket</button>
                    <button style={styles.btnSmall} onClick={() => handleExportWADComponent(wadUnpackResult.tmd, 'tmd')}>Export TMD</button>
                    {wadUnpackResult.contents.map((c, i) => (
                      <button key={i} style={styles.btnSmall}
                        onClick={() => handleExportWADComponent(c.data, c.idHex)}>
                        Export Content {c.idHex} ({formatSize(c.size)})
                      </button>
                    ))}
                    <button style={{ ...styles.btnSmall, color: COLORS.accent, borderColor: COLORS.accent }}
                      onClick={handleExportAllWAD}>
                      Export All as ZIP
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Right Panel: Log + Info ── */}
        <section className="nusd-panel" style={styles.panelWide}>
          {/* TMD Info (after download) */}
          {tmdInfo && (
            <div className="nusd-info-card" style={styles.infoCard}>
              <h3 style={styles.infoTitle}>Title Info</h3>
              <div style={styles.infoGrid}>
                <InfoRow label="Title ID" value={tmdInfo.titleId.toUpperCase()} />
                <InfoRow label="Version" value={`v${tmdInfo.version}`} />
                <InfoRow label="Type" value={tmdInfo.type} />
                <InfoRow label="Contents" value={String(tmdInfo.numContents)} />
                {platform !== 'dsi' && <InfoRow label="Required IOS" value={tmdInfo.iosVersion} />}
                <InfoRow label="Total Size" value={formatSize(Number(tmdInfo.totalSize))} />
              </div>
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div style={styles.progressArea}>
              <div style={styles.progressLabel}>
                {progress.label} ({progress.current}/{progress.total})
                {progress.pct > 0 && ` — ${progress.pct}%`}
              </div>
              <div style={styles.progressBar}>
                <div className="nusd-progress-fill" style={{
                  ...styles.progressFill,
                  width: progress.pct > 0
                    ? `${progress.pct}%`
                    : `${(progress.current / progress.total) * 100}%`,
                }} />
              </div>
            </div>
          )}

          {/* Log Output */}
          <h3 style={styles.panelTitle}>Output Log</h3>
          <div ref={logRef} className="nusd-log" style={styles.logBox}>
            {logs.length === 0 && (
              <div style={styles.logEmpty}>
                Ready. Select a title and press "Start NUS Download".
              </div>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="nusd-log-line" style={{
                ...styles.logLine,
                color: entry.type === 'error' ? COLORS.error
                  : entry.type === 'warning' ? COLORS.warning
                  : entry.type === 'success' ? COLORS.success
                  : COLORS.textDim,
              }}>
                <span style={styles.logTime}>{entry.time}</span>
                {entry.msg}
              </div>
            ))}
          </div>

          {logs.length > 0 && (
            <button
              style={styles.btnSmall}
              onClick={() => setLogs([])}
            >
              Clear Log
            </button>
          )}
        </section>
      </main>

      {/* ── Database Modal ── */}
      {showDatabase && (
        <div className={`nusd-modal-overlay ${dbClosing ? 'closing' : ''}`} style={styles.modalOverlay} onClick={closeDatabase}>
          <div className={`nusd-modal ${dbClosing ? 'closing' : ''}`} style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Title Database</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.btnSmall} onClick={handleImportDB}>
                  Import DB
                </button>
                <button style={styles.btnClose} onClick={closeDatabase}>&#x2715;</button>
              </div>
            </div>

            <div style={styles.modalFilters}>
              <input
                style={{ ...styles.input, fontSize: 14 }}
                type="text"
                placeholder="Search titles..."
                value={dbSearch}
                onChange={e => setDbSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div style={styles.modalList}>
              {Object.keys(groupedTitles).length === 0 && (
                <div style={styles.logEmpty}>No titles match your search.</div>
              )}
              {Object.entries(groupedTitles).map(([category, titles]) => {
                const expanded = isCatExpanded(category);
                return (
                  <div key={category} className="nusd-tree-group">
                    <div
                      className="nusd-tree-category"
                      style={styles.treeCategory}
                      onClick={() => toggleCategory(category)}
                    >
                      <span className={`nusd-tree-arrow ${expanded ? 'expanded' : ''}`} style={styles.treeArrow}>
                        &#x25B6;
                      </span>
                      <span style={styles.treeCatName}>{category}</span>
                      <span style={styles.treeCatCount}>{titles.length}</span>
                    </div>
                    {expanded && (
                      <div className="nusd-tree-items">
                        {titles.map((title, i) => (
                          <div
                            key={i}
                            className="nusd-db-row"
                            style={{
                              ...styles.dbRow,
                              paddingLeft: 32,
                              ...(title.danger ? { borderLeft: `3px solid ${COLORS.danger}` } : {}),
                            }}
                            onClick={() => selectTitle(title)}
                          >
                            <div style={styles.dbRowName}>
                              {title.name}
                              {title.danger && <span className="nusd-tag-danger" style={styles.dangerTag}>CAUTION</span>}
                              {title.hasTicket === false && <span style={styles.noTicketTag}>No Ticket</span>}
                            </div>
                            <div style={styles.dbRowMeta}>
                              <span style={styles.dbRowTid}>{title.titleId}</span>
                              <span style={styles.dbRowRegion}>{title.region}</span>
                              {title.versions.length > 0 && (
                                <span style={styles.dbRowVersion}>v{title.versions[title.versions.length - 1]}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={styles.modalFooter}>
              {TITLE_DATABASE.length} titles loaded
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="nusd-footer" style={styles.footer}>
        <span>Web NUS Downloader — Open Source (GPL-3.0)</span>
        <span style={styles.textDim}>Based on NUS Downloader by WB3000 / hamachi-mp / WiiDatabase</span>
      </footer>
    </div>
  );
}

// ─── Components ───────────────────────────────────────────
function Checkbox({ checked, onChange, label, disabled }) {
  return (
    <label style={{
      ...styles.checkbox,
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      <span className={`nusd-checkbox-box ${checked ? 'checked' : ''}`} style={{
        ...styles.checkboxBox,
        backgroundColor: checked ? COLORS.accent : 'transparent',
        borderColor: checked ? COLORS.accent : COLORS.textDim,
      }}>
        {checked && '\u2713'}
      </span>
      {label}
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
}

function downloadBlob(data, filename) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Delay revoke to ensure browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ─── Styles ───────────────────────────────────────────────
const styles = {
  root: {
    fontFamily: '"Fira Code", "JetBrains Mono", "SF Mono", monospace',
    color: COLORS.text,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 24px',
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    fontSize: 32,
    color: COLORS.accent,
  },
  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    fontFamily: '"Rajdhani", sans-serif',
    color: COLORS.accentDim,
    letterSpacing: '0.04em',
  },
  subtitle: {
    margin: 0,
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontFamily: '"Rajdhani", sans-serif',
  },
  statusArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  // Tab bar
  tabBar: {
    borderBottom: `1px solid ${COLORS.border}`,
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(8px)',
    padding: '0 24px',
  },
  tabBarInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    gap: 0,
  },
  tab: {
    background: 'transparent',
    color: COLORS.textDim,
    border: 'none',
    borderBottom: '3px solid transparent',
    padding: '12px 20px',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: 24,
    flex: 1,
    width: '100%',
    boxSizing: 'border-box',
  },
  panel: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  panelWide: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 0,
  },
  panelTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    fontFamily: '"Rajdhani", sans-serif',
    color: COLORS.accentDim,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  optional: {
    fontWeight: 400,
    textTransform: 'none',
    color: COLORS.textDim,
    opacity: 0.6,
  },
  input: {
    background: COLORS.surfaceLight,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: '9px 14px',
    color: COLORS.text,
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: COLORS.surfaceLight,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: '9px 14px',
    color: COLORS.text,
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  hint: {
    fontSize: 11,
    color: COLORS.textDim,
    opacity: 0.7,
  },
  // Toggle buttons
  toggleGroup: {
    display: 'flex',
    gap: 0,
  },
  toggleBtn: {
    background: COLORS.surfaceLight,
    color: COLORS.textDim,
    border: `1px solid ${COLORS.border}`,
    padding: '7px 18px',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  toggleActive: {
    background: COLORS.accent,
    color: '#ffffff',
    borderColor: COLORS.accentDim,
  },
  // Checkboxes
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: COLORS.text,
    userSelect: 'none',
  },
  checkboxBox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.bg,
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  // Buttons
  btnPrimary: {
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`,
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    padding: '13px 24px',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: 8,
    overflow: 'hidden',
  },
  btnSecondary: {
    background: COLORS.surfaceLight,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontFamily: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  btnSmall: {
    background: 'transparent',
    color: COLORS.textDim,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: '5px 12px',
    fontFamily: 'inherit',
    fontSize: 11,
    cursor: 'pointer',
    alignSelf: 'flex-start',
    textAlign: 'left',
  },
  btnClose: {
    background: 'transparent',
    color: COLORS.textDim,
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  // Banners
  errorBanner: {
    background: 'rgba(255, 64, 96, 0.1)',
    border: `1px solid ${COLORS.error}`,
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  dangerBanner: {
    background: COLORS.dangerBg,
    border: `1px solid ${COLORS.danger}`,
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 12,
    color: COLORS.danger,
  },
  // Log
  logBox: {
    background: '#f6f9fc',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 14,
    fontFamily: 'inherit',
    fontSize: 12,
    lineHeight: 1.65,
    flex: 1,
    minHeight: 300,
    maxHeight: 500,
    overflowY: 'auto',
  },
  logLine: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  logTime: {
    color: COLORS.textDim,
    opacity: 0.5,
    marginRight: 8,
    fontSize: 10,
  },
  logEmpty: {
    color: COLORS.textDim,
    opacity: 0.5,
    textAlign: 'center',
    padding: 40,
  },
  // Progress
  progressArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  progressBar: {
    height: 6,
    background: '#e4ecf2',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.success})`,
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  // Info card
  infoCard: {
    background: COLORS.accentGlow,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: 16,
  },
  infoTitle: {
    margin: '0 0 10px 0',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: '"Rajdhani", sans-serif',
    color: COLORS.accentDim,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px 16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  infoLabel: {
    color: COLORS.textDim,
  },
  infoValue: {
    color: COLORS.text,
    fontWeight: 600,
  },
  // Database Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(44, 58, 72, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 24,
  },
  modal: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    width: '100%',
    maxWidth: 680,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    fontFamily: '"Rajdhani", sans-serif',
    color: COLORS.accentDim,
  },
  modalFilters: {
    display: 'flex',
    gap: 10,
    padding: '12px 18px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  modalList: {
    overflowY: 'auto',
    flex: 1,
    padding: '8px 0',
  },
  modalFooter: {
    padding: '8px 18px',
    borderTop: `1px solid ${COLORS.border}`,
    fontSize: 11,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  dbRow: {
    padding: '10px 18px',
    cursor: 'pointer',
    borderBottom: `1px solid ${COLORS.border}`,
    transition: 'background 0.1s',
  },
  dbRowName: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.text,
    marginBottom: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dbRowMeta: {
    display: 'flex',
    gap: 10,
    fontSize: 11,
    marginBottom: 2,
  },
  dbRowTid: {
    color: COLORS.accentDim,
    fontFamily: 'inherit',
  },
  dbRowRegion: {
    color: COLORS.textDim,
  },
  dbRowVersion: {
    color: COLORS.success,
  },
  dbRowDesc: {
    fontSize: 11,
    color: COLORS.textDim,
    opacity: 0.7,
  },
  dangerTag: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.danger,
    background: COLORS.dangerBg,
    padding: '1px 5px',
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  noTicketTag: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.warning,
    background: 'rgba(255, 176, 32, 0.1)',
    padding: '1px 5px',
    borderRadius: 3,
    textTransform: 'uppercase',
  },
  // Selected title card
  selectedTitleCard: {
    padding: 12,
    background: COLORS.accentGlow,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
  },
  selectedTitleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  selectedTitleName: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: '"Rajdhani", sans-serif',
    color: COLORS.text,
    marginBottom: 3,
  },
  selectedTitleMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 11,
  },
  // Manual entry link
  manualEntryLink: {
    background: 'none',
    border: 'none',
    color: COLORS.textDim,
    fontSize: 11,
    fontFamily: 'inherit',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    textUnderlineOffset: 2,
    alignSelf: 'flex-start',
  },
  // Version chips
  versionChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  versionChip: {
    background: COLORS.surfaceLight,
    color: COLORS.textDim,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: '2px 10px',
    fontFamily: '"Fira Code", monospace',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    lineHeight: 1.6,
  },
  versionChipActive: {
    background: COLORS.accent,
    color: '#ffffff',
    borderColor: COLORS.accentDim,
  },
  // Tree view
  treeCategory: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: `1px solid ${COLORS.border}`,
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: COLORS.text,
    background: COLORS.surfaceLight,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  treeArrow: {
    fontSize: 9,
    color: COLORS.textDim,
    display: 'inline-block',
    transition: 'transform 0.2s',
    flexShrink: 0,
    width: 12,
  },
  treeCatName: {
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: COLORS.accentDim,
  },
  treeCatCount: {
    fontSize: 11,
    fontFamily: '"Fira Code", monospace',
    color: COLORS.textDim,
    background: COLORS.border,
    borderRadius: 10,
    padding: '1px 8px',
    fontWeight: 500,
  },
  // Batch list
  batchList: {
    background: '#f6f9fc',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: 8,
    maxHeight: 200,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  batchItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    padding: '2px 4px',
  },
  // Footer
  footer: {
    padding: '14px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: COLORS.textDim,
    flexWrap: 'wrap',
    gap: 8,
  },
  textDim: {
    opacity: 0.5,
  },
};
