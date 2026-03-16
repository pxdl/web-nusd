/**
 * NUS Client
 *
 * Handles communication with the NUS proxy server to download
 * title metadata, tickets, and encrypted content from Nintendo's
 * update servers.
 */

const DEFAULT_PROXY = 'http://localhost:3001';

export class NUSClient {
  constructor(proxyBase = DEFAULT_PROXY) {
    this.proxyBase = proxyBase.replace(/\/$/, '');
    this.useWiiU = false; // Use Wii U CDN as fallback
  }

  /**
   * Fetch a resource from NUS via the proxy.
   * @param {string} path - URL path after /api/nus/
   * @returns {Promise<ArrayBuffer>}
   */
  async fetch(path) {
    const sep = this.useWiiU ? '&' : '?';
    const wiiuParam = this.useWiiU ? 'wiiu=1' : '';
    const url = `${this.proxyBase}/api/nus/${path}${wiiuParam ? '?' + wiiuParam : ''}`;

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

    return response.arrayBuffer();
  }

  /**
   * Download the TMD for a title.
   * @param {string} titleId - 16-char hex title ID
   * @param {number} [version] - Specific version, or omit for latest
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadTMD(titleId, version) {
    const path = version !== undefined
      ? `${titleId}/tmd/${version}`
      : `${titleId}/tmd`;
    return this.fetch(path);
  }

  /**
   * Download the ticket for a title.
   * @param {string} titleId - 16-char hex title ID
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadTicket(titleId) {
    return this.fetch(`${titleId}/cetk`);
  }

  /**
   * Download an encrypted content file.
   * @param {string} titleId  - 16-char hex title ID
   * @param {string} contentIdHex - 8-char hex content ID (e.g., "00000000")
   * @param {function} [onProgress] - Progress callback (loaded, total)
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadContent(titleId, contentIdHex, onProgress) {
    const wiiuParam = this.useWiiU ? '?wiiu=1' : '';
    const url = `${this.proxyBase}/api/nus/${titleId}/${contentIdHex}${wiiuParam}`;

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

      // Combine chunks
      const combined = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      return combined.buffer;
    }

    return response.arrayBuffer();
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
