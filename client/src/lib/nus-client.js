/**
 * NUS Client
 *
 * Handles communication with the NUS proxy server to download
 * title metadata, tickets, and encrypted content from Nintendo's
 * update servers.
 *
 * Supports Wii, Wii U CDN (fallback), and DSi platforms.
 * Includes retry logic for resilient downloads.
 */

const DEFAULT_PROXY = 'http://localhost:3001';
const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class NUSClient {
  constructor(proxyBase = DEFAULT_PROXY) {
    this.proxyBase = proxyBase.replace(/\/$/, '');
    this.useWiiU = true; // Wii U CDN is faster and more reliable
    this.platform = 'wii'; // 'wii', 'vwii', or 'dsi'
    this.maxRetries = DEFAULT_RETRIES;
  }

  /** Build query string for platform selection */
  _queryParams() {
    const params = [];
    if (this.platform === 'dsi') params.push('dsi=1');
    else if (this.platform === 'vwii' || this.useWiiU) params.push('wiiu=1');
    return params.length ? '?' + params.join('&') : '';
  }

  /**
   * Fetch with retry logic.
   * Retries on network errors and server errors, but not on 404s.
   */
  async fetchWithRetry(url, retries = this.maxRetries, onRetry) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          let detail = '';
          try {
            const json = await response.json();
            detail = json.detail || json.error || '';
          } catch {}
          throw new NUSError(
            `NUS request failed: ${response.status}`,
            response.status,
            detail
          );
        }
        return response;
      } catch (err) {
        lastError = err;
        // Don't retry 404s — title genuinely doesn't exist
        if (err instanceof NUSError && err.status === 404) throw err;
        if (attempt < retries) {
          const delay = RETRY_DELAY_MS * attempt;
          if (onRetry) onRetry(attempt, retries, delay);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Fetch a resource from NUS via the proxy.
   * @param {string} path - URL path after /api/nus/
   * @param {function} [onRetry] - Retry callback (attempt, maxRetries, delayMs)
   * @returns {Promise<ArrayBuffer>}
   */
  async fetch(path, onRetry) {
    const url = `${this.proxyBase}/api/nus/${path}${this._queryParams()}`;
    const response = await this.fetchWithRetry(url, this.maxRetries, onRetry);
    return response.arrayBuffer();
  }

  /**
   * Download the TMD for a title.
   * @param {string} titleId - 16-char hex title ID
   * @param {number} [version] - Specific version, or omit for latest
   * @param {function} [onRetry] - Retry callback
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadTMD(titleId, version, onRetry) {
    const path = version !== undefined
      ? `${titleId}/tmd/${version}`
      : `${titleId}/tmd`;
    return this.fetch(path, onRetry);
  }

  /**
   * Download the ticket for a title.
   * @param {string} titleId - 16-char hex title ID
   * @param {function} [onRetry] - Retry callback
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadTicket(titleId, onRetry) {
    return this.fetch(`${titleId}/cetk`, onRetry);
  }

  /**
   * Download an encrypted content file with progress tracking and retry.
   * @param {string} titleId  - 16-char hex title ID
   * @param {string} contentIdHex - 8-char hex content ID
   * @param {function} [onProgress] - Progress callback (loaded, total)
   * @param {function} [onRetry] - Retry callback (attempt, maxRetries, delayMs)
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadContent(titleId, contentIdHex, onProgress, onRetry) {
    const url = `${this.proxyBase}/api/nus/${titleId}/${contentIdHex}${this._queryParams()}`;

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new NUSError(
            `Failed to download content ${contentIdHex}`,
            response.status
          );
        }

        if (onProgress && response.headers.get('Content-Length')) {
          const total = parseInt(response.headers.get('Content-Length'));
          const reader = response.body.getReader();
          const chunks = [];
          let loaded = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;
            onProgress(loaded, total);
          }

          const combined = new Uint8Array(loaded);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          return combined.buffer;
        }

        return response.arrayBuffer();
      } catch (err) {
        lastError = err;
        if (err instanceof NUSError && err.status === 404) throw err;
        if (attempt < this.maxRetries) {
          const delay = RETRY_DELAY_MS * attempt;
          if (onRetry) onRetry(attempt, this.maxRetries, delay);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Download the standard Wii certificate chain from System Menu 4.3U.
   *
   * The cert chain is built from 3 certificates:
   *   - CA cert (from ticket, after XS cert)
   *   - CP cert (from TMD, at known offset)
   *   - XS cert (from ticket, at known offset)
   *
   * This matches libWiiPy's approach of using SM 4.3U as the cert source,
   * producing more reliable WADs than extracting certs from arbitrary TMDs.
   *
   * @param {function} [onRetry] - Retry callback
   * @returns {Promise<Uint8Array>} Certificate chain (CA + CP + XS)
   */
  async downloadCertChain(onRetry) {
    const SM_TID = '0000000100000002';
    const SM_VER = 513; // System Menu 4.3U

    const tmdData = await this.fetch(`${SM_TID}/tmd/${SM_VER}`, onRetry);
    const cetkData = await this.fetch(`${SM_TID}/cetk`, onRetry);

    const cetk = new Uint8Array(cetkData);
    const tmd = new Uint8Array(tmdData);

    // Certificate offsets (RSA-2048 signed):
    //   Ticket: XS cert at 0x2A4, length 768 bytes; CA cert follows at 0x2A4+768
    //   TMD:    CP cert at 0x328, length 768 bytes
    const XS_OFFSET = 0x2A4;
    const CERT_LEN = 768;
    const CA_OFFSET = XS_OFFSET + CERT_LEN; // 0x5A4
    const CA_LEN = 1024;
    const CP_OFFSET = 0x328;

    const caCert = cetk.slice(CA_OFFSET, CA_OFFSET + CA_LEN);
    const cpCert = tmd.slice(CP_OFFSET, CP_OFFSET + CERT_LEN);
    const xsCert = cetk.slice(XS_OFFSET, XS_OFFSET + CERT_LEN);

    // Assemble: CA + CP + XS (standard order for WAD cert chains)
    const chain = new Uint8Array(CA_LEN + CERT_LEN + CERT_LEN);
    chain.set(caCert, 0);
    chain.set(cpCert, CA_LEN);
    chain.set(xsCert, CA_LEN + CERT_LEN);

    return chain;
  }

  /**
   * Check if the proxy server is reachable.
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const res = await fetch(`${this.proxyBase}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export class NUSError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = 'NUSError';
    this.status = status;
    this.detail = detail;
  }
}
