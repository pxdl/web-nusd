import { useState, useCallback, useRef, useEffect } from 'react';
import { NUSClient, NUSError } from './lib/nus-client.js';
import { TMD } from './lib/tmd.js';
import { Ticket } from './lib/ticket.js';
import { packWAD, extractCertsFromTMD, generateWadFilename } from './lib/wad.js';
import { decryptTitleKey, decryptContent, verifyContent, parseCommonKey } from './lib/crypto.js';
import { TITLE_DATABASE, CATEGORIES, REGIONS, searchTitles, getTitleType } from './lib/database.js';

// ─── Styles ───────────────────────────────────────────────
const COLORS = {
  bg: '#0a0e17',
  surface: '#111827',
  surfaceLight: '#1a2236',
  accent: '#00d4ff',
  accentDim: '#006b80',
  accentGlow: 'rgba(0, 212, 255, 0.15)',
  warning: '#ffb020',
  error: '#ff4060',
  success: '#00e878',
  text: '#e2e8f0',
  textDim: '#64748b',
  border: '#1e293b',
};

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  const [titleId, setTitleId] = useState('');
  const [version, setVersion] = useState('');
  const [packWad, setPackWad] = useState(true);
  const [keepEncrypted, setKeepEncrypted] = useState(false);
  const [decryptContents, setDecryptContents] = useState(false);
  const [commonKeyHex, setCommonKeyHex] = useState('');
  const [useWiiUCDN, setUseWiiUCDN] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('http://localhost:3001');

  const [logs, setLogs] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total, label }
  const [tmdInfo, setTmdInfo] = useState(null);
  const [showDatabase, setShowDatabase] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [dbCategory, setDbCategory] = useState('');
  const [proxyStatus, setProxyStatus] = useState('unknown'); // unknown, ok, error

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

  // ─── Database Selection ─────────────────────
  const selectTitle = (title) => {
    setTitleId(title.titleId);
    if (title.versions.length > 0) {
      setVersion(String(title.versions[title.versions.length - 1]));
    } else {
      setVersion('');
    }
    setShowDatabase(false);
    log(`Selected: ${title.name} (${title.titleId})`, 'info');
  };

  // ─── Download Handler ───────────────────────
  const handleDownload = async () => {
    const tid = titleId.trim().toLowerCase();
    if (!/^[0-9a-f]{16}$/.test(tid)) {
      log('Error: Title ID must be 16 hex characters.', 'error');
      return;
    }

    setIsDownloading(true);
    setLogs([]);
    setTmdInfo(null);
    setProgress(null);

    const client = new NUSClient(proxyUrl);
    client.useWiiU = useWiiUCDN;

    try {
      // ── Step 1: Download TMD ──
      log(`Downloading TMD for ${tid.toUpperCase()}...`);
      const tmdVer = version.trim() ? parseInt(version) : undefined;
      const tmdData = await client.downloadTMD(tid, tmdVer);
      const tmd = new TMD(tmdData);

      log(`TMD parsed: ${tmd.numContents} content(s), v${tmd.titleVersion}`, 'success');
      log(`  Title ID: ${tmd.titleId.toUpperCase()}`);
      log(`  Type: ${getTitleType(tmd.titleId)}`);
      log(`  Required: ${tmd.iosVersion}`);
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
        ticketData = await client.downloadTicket(tid);
        ticket = new Ticket(ticketData);
        log(`Ticket obtained (${ticket.commonKeyName})`, 'success');
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
        });

        log(`Downloading content ${content.idHex} [${i + 1}/${tmd.contents.length}]...`);

        const contentData = await client.downloadContent(
          tid,
          content.idHex,
          (loaded, total) => {
            const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
            setProgress(prev => ({ ...prev, pct }));
          }
        );

        contentBuffers.push(new Uint8Array(contentData));
        log(`  ✓ ${content.idHex} downloaded (${formatSize(contentData.byteLength)})`, 'success');
      }

      // ── Step 4: Pack WAD ──
      if (packWad && ticket) {
        log('Packing WAD...');

        // Extract cert chain from TMD
        const tmdBytes = new Uint8Array(tmdData);
        const certs = extractCertsFromTMD(tmdBytes, tmd.numContents);

        let certChain;
        if (certs && certs.length > 0) {
          certChain = certs;
          log(`  Certificate chain extracted (${certs.length} bytes)`);
        } else {
          // Minimal empty cert chain — WAD will still work with most tools
          certChain = new Uint8Array(0);
          log('  No certificate chain found in TMD', 'warning');
        }

        const ticketBytes = new Uint8Array(ticketData);
        const wadData = packWAD(certChain, ticketBytes, tmdBytes, contentBuffers);

        const filename = generateWadFilename(tid, tmd.titleVersion);
        downloadBlob(wadData, filename);
        log(`WAD packed and saved: ${filename} (${formatSize(wadData.length)})`, 'success');
      }

      // ── Step 5: Save individual files if requested ──
      if (keepEncrypted) {
        log('Saving encrypted contents...');
        for (let i = 0; i < tmd.contents.length; i++) {
          downloadBlob(contentBuffers[i], tmd.contents[i].idHex);
        }
        // Save TMD and ticket too
        downloadBlob(new Uint8Array(tmdData), 'tmd');
        if (ticketData) downloadBlob(new Uint8Array(ticketData), 'cetk');
        log('Encrypted files saved.', 'success');
      }

      // ── Step 6: Decrypt contents if requested ──
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
              log(`  ✓ ${content.idHex}.app verified (SHA-1 match)`, 'success');
            } else {
              log(`  ✗ ${content.idHex}.app hash mismatch!`, 'warning');
              log(`    Expected: ${verification.expected}`);
              log(`    Got:      ${verification.hash}`);
            }

            downloadBlob(decrypted, `${content.idHex}.app`);
          }

          log('Decrypted contents saved.', 'success');
        } catch (err) {
          log(`Decryption failed: ${err.message}`, 'error');
        }
      }

      setProgress(null);
      log('═══ Download complete! ═══', 'success');

    } catch (err) {
      log(`Error: ${err.message}`, 'error');
      if (err.detail) log(`  Detail: ${err.detail}`, 'error');
      setProgress(null);
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── Render ─────────────────────────────────
  const filteredTitles = searchTitles(dbSearch, dbCategory);

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoArea}>
            <div style={styles.logoIcon}>⬡</div>
            <div>
              <h1 style={styles.title}>Web NUS Downloader</h1>
              <p style={styles.subtitle}>Browser-based Nintendo Update Server client</p>
            </div>
          </div>
          <div style={styles.statusArea}>
            <span style={{
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

      <main style={styles.main}>
        {/* ── Left Panel: Controls ── */}
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Title Configuration</h2>

          {/* Title ID Input */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Title ID</label>
            <div style={styles.inputRow}>
              <input
                style={styles.input}
                type="text"
                placeholder="0000000100000002"
                maxLength={16}
                value={titleId}
                onChange={e => setTitleId(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                disabled={isDownloading}
              />
              <button
                style={styles.btnSecondary}
                onClick={() => setShowDatabase(!showDatabase)}
                disabled={isDownloading}
              >
                📋 Database
              </button>
            </div>
            {titleId.length > 0 && titleId.length < 16 && (
              <span style={styles.hint}>{16 - titleId.length} more characters needed</span>
            )}
          </div>

          {/* Version */}
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

          {/* Options */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Options</label>
            <div style={styles.checkboxGroup}>
              <Checkbox checked={packWad} onChange={setPackWad} label="Pack WAD" disabled={isDownloading} />
              <Checkbox checked={keepEncrypted} onChange={setKeepEncrypted} label="Keep encrypted contents" disabled={isDownloading} />
              <Checkbox checked={decryptContents} onChange={setDecryptContents} label="Create decrypted contents (.app)" disabled={isDownloading} />
              <Checkbox checked={useWiiUCDN} onChange={setUseWiiUCDN} label="Use Wii U CDN" disabled={isDownloading} />
            </div>
          </div>

          {/* Common Key (only when decrypt is on) */}
          {decryptContents && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Common Key <span style={styles.optional}>(32 hex chars)</span></label>
              <input
                style={styles.input}
                type="password"
                placeholder="Enter your Wii common key..."
                value={commonKeyHex}
                onChange={e => setCommonKeyHex(e.target.value)}
                disabled={isDownloading}
              />
              <span style={styles.hint}>
                Extract from your own Wii console. Not included for legal reasons.
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
              opacity: isDownloading || proxyStatus !== 'ok' ? 0.5 : 1,
            }}
            onClick={handleDownload}
            disabled={isDownloading || proxyStatus !== 'ok'}
          >
            {isDownloading ? '⏳ Downloading...' : '⬇ Start NUS Download'}
          </button>

          {proxyStatus === 'error' && (
            <div style={styles.errorBanner}>
              Proxy server is not reachable. Make sure the server is running at {proxyUrl}
            </div>
          )}
        </section>

        {/* ── Right Panel: Log + Info ── */}
        <section style={styles.panelWide}>
          {/* TMD Info */}
          {tmdInfo && (
            <div style={styles.infoCard}>
              <h3 style={styles.infoTitle}>Title Info</h3>
              <div style={styles.infoGrid}>
                <InfoRow label="Title ID" value={tmdInfo.titleId.toUpperCase()} />
                <InfoRow label="Version" value={`v${tmdInfo.version}`} />
                <InfoRow label="Type" value={tmdInfo.type} />
                <InfoRow label="Contents" value={String(tmdInfo.numContents)} />
                <InfoRow label="Required IOS" value={tmdInfo.iosVersion} />
                <InfoRow label="Total Size" value={formatSize(Number(tmdInfo.totalSize))} />
              </div>
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div style={styles.progressArea}>
              <div style={styles.progressLabel}>
                {progress.label} ({progress.current}/{progress.total})
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Log Output */}
          <h3 style={styles.panelTitle}>Output Log</h3>
          <div ref={logRef} style={styles.logBox}>
            {logs.length === 0 && (
              <div style={styles.logEmpty}>
                Ready. Select a title and press "Start NUS Download".
              </div>
            )}
            {logs.map((entry, i) => (
              <div key={i} style={{
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
        <div style={styles.modalOverlay} onClick={() => setShowDatabase(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Title Database</h2>
              <button style={styles.btnClose} onClick={() => setShowDatabase(false)}>✕</button>
            </div>

            <div style={styles.modalFilters}>
              <input
                style={styles.input}
                type="text"
                placeholder="Search titles..."
                value={dbSearch}
                onChange={e => setDbSearch(e.target.value)}
                autoFocus
              />
              <select
                style={styles.select}
                value={dbCategory}
                onChange={e => setDbCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {Object.values(CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={styles.modalList}>
              {filteredTitles.map((title, i) => (
                <div
                  key={i}
                  style={styles.dbRow}
                  onClick={() => selectTitle(title)}
                >
                  <div style={styles.dbRowName}>{title.name}</div>
                  <div style={styles.dbRowMeta}>
                    <span style={styles.dbRowTid}>{title.titleId}</span>
                    <span style={styles.dbRowRegion}>{title.region}</span>
                    {title.versions.length > 0 && (
                      <span style={styles.dbRowVersion}>v{title.versions[title.versions.length - 1]}</span>
                    )}
                  </div>
                  <div style={styles.dbRowDesc}>{title.description}</div>
                </div>
              ))}
              {filteredTitles.length === 0 && (
                <div style={styles.logEmpty}>No titles match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer style={styles.footer}>
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
      <span style={{
        ...styles.checkboxBox,
        backgroundColor: checked ? COLORS.accent : 'transparent',
        borderColor: checked ? COLORS.accent : COLORS.textDim,
      }}>
        {checked && '✓'}
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
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
}

function downloadBlob(data, filename) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Styles ───────────────────────────────────────────────
const styles = {
  root: {
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    borderBottom: `1px solid ${COLORS.border}`,
    background: `linear-gradient(180deg, ${COLORS.surfaceLight} 0%, ${COLORS.bg} 100%)`,
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
    filter: `drop-shadow(0 0 8px ${COLORS.accent})`,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.accent,
    letterSpacing: '0.02em',
  },
  subtitle: {
    margin: 0,
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
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
    borderRadius: 8,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  panelWide: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 0,
  },
  panelTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
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
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: '8px 12px',
    color: COLORS.text,
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: '8px 12px',
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
    width: 16,
    height: 16,
    borderRadius: 3,
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.bg,
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  btnPrimary: {
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`,
    color: COLORS.bg,
    border: 'none',
    borderRadius: 6,
    padding: '12px 20px',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    transition: 'all 0.2s',
    marginTop: 8,
  },
  btnSecondary: {
    background: COLORS.surfaceLight,
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: '8px 12px',
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
    borderRadius: 4,
    padding: '4px 10px',
    fontFamily: 'inherit',
    fontSize: 11,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  btnClose: {
    background: 'transparent',
    color: COLORS.textDim,
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  errorBanner: {
    background: 'rgba(255, 64, 96, 0.1)',
    border: `1px solid ${COLORS.error}`,
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  // Log
  logBox: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: 12,
    fontFamily: 'inherit',
    fontSize: 12,
    lineHeight: 1.6,
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
    height: 4,
    background: COLORS.bg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.success})`,
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  // Info card
  infoCard: {
    background: COLORS.accentGlow,
    border: `1px solid ${COLORS.accentDim}`,
    borderRadius: 6,
    padding: 14,
  },
  infoTitle: {
    margin: '0 0 10px 0',
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
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
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 24,
  },
  modal: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
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
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.accent,
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
  },
  dbRowMeta: {
    display: 'flex',
    gap: 10,
    fontSize: 11,
    marginBottom: 2,
  },
  dbRowTid: {
    color: COLORS.accent,
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
  // Footer
  footer: {
    borderTop: `1px solid ${COLORS.border}`,
    padding: '12px 24px',
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
