import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// NUS CDN base URLs
const NUS_BASE = 'http://nus.cdn.shop.wii.com/ccs/download';
const WII_U_CDN_BASE = 'http://ccs.cdn.wup.shop.nintendo.net/ccs/download';
const DSI_CDN_BASE = 'http://nus.cdn.t.shop.nintendowifi.net/ccs/download';

// User-Agent strings (required by Nintendo CDN)
const WII_USER_AGENT = 'wii libnup/1.0';
const DSI_USER_AGENT = 'Opera/9.50 (Nintendo; Opera/154; U; Nintendo DS; en)';

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * Proxy endpoint for NUS downloads.
 *
 * Routes:
 *   GET /api/nus/:titleId/tmd           → TMD (latest version)
 *   GET /api/nus/:titleId/tmd/:version  → TMD for specific version
 *   GET /api/nus/:titleId/cetk          → Ticket
 *   GET /api/nus/:titleId/:contentId    → Encrypted content
 *
 * Query params:
 *   ?wiiu=1  → Use Wii U CDN (for Wii titles when original NUS is down)
 *   ?dsi=1   → Use DSi CDN with DSi user-agent
 */
app.get('/api/nus/:titleId/:resource/:extra?', async (req, res) => {
  const { titleId, resource, extra } = req.params;
  const useWiiU = req.query.wiiu === '1';
  const useDSi = req.query.dsi === '1';

  // Select CDN and user-agent based on platform
  let base, userAgent;
  if (useDSi) {
    base = DSI_CDN_BASE;
    userAgent = DSI_USER_AGENT;
  } else if (useWiiU) {
    base = WII_U_CDN_BASE;
    userAgent = WII_USER_AGENT;
  } else {
    base = NUS_BASE;
    userAgent = WII_USER_AGENT;
  }

  // Validate title ID format (16 hex chars)
  if (!/^[0-9a-fA-F]{16}$/.test(titleId)) {
    return res.status(400).json({ error: 'Invalid title ID. Must be 16 hex characters.' });
  }

  let url;
  if (resource === 'tmd') {
    url = extra ? `${base}/${titleId}/tmd.${extra}` : `${base}/${titleId}/tmd`;
  } else if (resource === 'cetk') {
    url = `${base}/${titleId}/cetk`;
  } else {
    // Content file (e.g., 00000000, 00000001, etc.)
    url = `${base}/${titleId}/${resource}`;
  }

  const platform = useDSi ? 'DSi' : useWiiU ? 'WiiU' : 'Wii';
  console.log(`[NUS Proxy] [${platform}] ${req.method} → ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `NUS returned ${response.status}`,
        detail: response.status === 404
          ? 'Title/resource not found on NUS'
          : response.status === 401
            ? 'Unauthorized — title may require authentication'
            : 'Unknown error from NUS',
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': buffer.length,
      'X-NUS-URL': url,
    });

    res.send(buffer);
  } catch (err) {
    console.error(`[NUS Proxy] Error fetching ${url}:`, err.message);
    res.status(502).json({
      error: 'Failed to reach NUS servers',
      detail: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║      Web NUS Downloader — Proxy Server   ║
  ║      http://localhost:${PORT}               ║
  ╚══════════════════════════════════════════╝
  `);
});
