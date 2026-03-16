import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// NUS CDN base URLs
const NUS_BASE = 'http://nus.cdn.shop.wii.com/ccs/download';
const WII_U_CDN_BASE = 'http://ccs.cdn.wup.shop.nintendo.net/ccs/download';

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * Proxy endpoint for NUS downloads.
 * Routes:
 *   GET /api/nus/:titleId/tmd           → fetches TMD (latest version)
 *   GET /api/nus/:titleId/tmd/:version  → fetches TMD for specific version
 *   GET /api/nus/:titleId/cetk          → fetches ticket
 *   GET /api/nus/:titleId/:contentId    → fetches encrypted content
 */
app.get('/api/nus/:titleId/:resource/:extra?', async (req, res) => {
  const { titleId, resource, extra } = req.params;
  const useWiiU = req.query.wiiu === '1';
  const base = useWiiU ? WII_U_CDN_BASE : NUS_BASE;

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

  console.log(`[NUS Proxy] ${req.method} → ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'wii libnup/1.0',
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
