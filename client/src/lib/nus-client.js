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
    this.useWiiU = false;
    this.platform = 'wii'; // 'wii' or 'dsi'
    this.maxRetries = DEFAULT_RETRIES;
  }

  /** Build query string for platform selection */
  _queryParams() {
    const params = [];
    if (this.platform === 'dsi') params.push('dsi=1');
    else if (this.useWiiU) params.push('wiiu=1');
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
