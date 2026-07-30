import { isAllowedGenesysHost, STORAGE_KEYS } from './genesys.js';

/**
 * Extracts Genesys Cloud session credentials from open browser tabs.
 * Scans all tabs for Genesys Cloud pages, injects a script to read
 * localStorage keys, and returns session details.
 *
 * @returns {Promise<{environment: string, token: string, orgName: string}|null>}
 */
export async function getGenesysSession() {
  try {
    const [allTabs, [currentActiveTab]] = await Promise.all([
      chrome.tabs.query({}),
      chrome.tabs.query({ active: true, currentWindow: true })
    ]);

    // Filter to only Genesys Cloud tabs
    let genesysTabs = allTabs.filter((tab) => tab.url && isGenesysUrl(tab.url));

    if (genesysTabs.length === 0) return null;

    // Prioritize the active tab if it's a Genesys tab
    if (currentActiveTab) {
      genesysTabs = [
        ...genesysTabs.filter((t) => t.id === currentActiveTab.id),
        ...genesysTabs.filter((t) => t.id !== currentActiveTab.id)
      ];
    }

    // Try each tab until we find a valid session
    for (const tab of genesysTabs) {
      try {
        const [injectionResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getTabStorageDetails,
          args: [STORAGE_KEYS]
        });

        const details = injectionResult?.result ?? null;
        if (details && details.token) {
          return details;
        }
      } catch (err) {
        // Tab might be protected (e.g. chrome:// pages), skip it
        console.warn(`Failed to read tab ${tab.id}:`, err);
      }
    }

    return null;
  } catch (err) {
    console.error('Session extraction failed:', err);
    return null;
  }
}

/**
 * Checks if a URL string belongs to a Genesys Cloud domain.
 * @param {string} urlString
 * @returns {boolean}
 */
function isGenesysUrl(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return isAllowedGenesysHost(hostname);
  } catch {
    return false;
  }
}

/**
 * Injected into a Genesys Cloud tab to read session data from localStorage.
 * Runs in the tab's isolated context.
 * @param {Object} KEYS - Storage keys passed from the extension context.
 * @returns {{orgName: string, environment: string, token: string}|null}
 */
function getTabStorageDetails(KEYS) {
  const userMetadataStr = window.localStorage.getItem(KEYS.USER_METADATA);
  const authPayloadStr = window.localStorage.getItem(KEYS.AUTH_PAYLOAD);

  if (!userMetadataStr && !authPayloadStr) return null;

  let orgName = 'Unknown Org';
  const environment = window.location.hostname;
  let token = null;

  try {
    if (userMetadataStr) {
      const userMetadata = JSON.parse(userMetadataStr);
      orgName = userMetadata?.orgName || orgName;
    }
    if (authPayloadStr) {
      const authPayload = JSON.parse(authPayloadStr);
      const tokenData = authPayload.authenticated || authPayload.secure;
      token = tokenData?.access_token || null;
    }
    return { orgName, environment, token };
  } catch (e) {
    return null;
  }
}
