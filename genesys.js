/**
 * Shared configuration and validation constants for Genesys Cloud environments.
 */

export const ALLOWED_ROOT_DOMAINS = [
  'mypurecloud.com',
  'mypurecloud.ie',
  'mypurecloud.jp',
  'mypurecloud.de',
  'mypurecloud.com.au',
  'pure.cloud'
];

export const STORAGE_KEYS = {
  USER_METADATA: 'gcucc-ui-auth-user',
  AUTH_PAYLOAD: 'pc_auth'
};

export const API_TIMEOUT_MS = 10000;

/**
 * Validates whether a given hostname belongs to a legitimate Genesys Cloud root domain.
 * @param {string} hostname - The browser or URL hostname to check.
 * @returns {boolean} True if the host matches allowed domains.
 */
export function isAllowedGenesysHost(hostname) {
  return ALLOWED_ROOT_DOMAINS.some(
    (root) => hostname === root || hostname.endsWith(`.${root}`)
  );
}

/**
 * Normalizes a UI shell hostname into its API gateway counterpart.
 * e.g. "apps.mypurecloud.ie" → "api.mypurecloud.ie"
 * @param {string} hostname - Raw location hostname.
 * @returns {string} The normalized API domain.
 */
export function toApiHost(hostname) {
  if (hostname.startsWith('api.')) return hostname;
  if (hostname.startsWith('apps.')) return hostname.replace(/^apps\./, 'api.');
  return `api.${hostname}`;
}
