import { getGenesysSession } from './session.js';

let cachedSession = null;

/**
 * Checks authentication status by extracting the session and validating the token.
 * Updates the extension icon based on the result.
 * 
 * @returns {Promise<{isAuthenticated: boolean, session: Object|null}>}
 */
export async function checkAuthAndUpdateIcon() {
  const session = await getGenesysSession();
  
  if (!session) {
    setAuthIcon(false);
    cachedSession = null;
    return { isAuthenticated: false, session: null, error: 'No active session found in tabs' };
  }

  // Validate the token via background worker
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { 
        action: 'validate_token', 
        environment: session.environment, 
        token: session.token 
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Token validation failed (communication error):', chrome.runtime.lastError);
          setAuthIcon(false);
          cachedSession = null;
          resolve({ isAuthenticated: false, session: null, error: chrome.runtime.lastError.message });
          return;
        }

        if (!response || !response.success) {
          console.warn('Token validation failed:', response?.error);
          setAuthIcon(false);
          cachedSession = null;
          resolve({ isAuthenticated: false, session: null, error: response?.error || 'Unknown error' });
          return;
        }

        // Token is valid
        setAuthIcon(true);
        cachedSession = session;
        resolve({ isAuthenticated: true, session });
      }
    );
  });
}

/**
 * Returns the last successfully validated session.
 * @returns {Object|null}
 */
export function getCachedSession() {
  return cachedSession;
}

/**
 * Sets the extension toolbar icon.
 * @param {boolean} isAuthenticated 
 */
function setAuthIcon(isAuthenticated) {
  const iconPath = isAuthenticated ? 'icon_authonticated.png' : 'icon.png';
  // Use the action API (Manifest V3)
  if (chrome.action && chrome.action.setIcon) {
    chrome.action.setIcon({ path: iconPath }).catch(e => console.error("Error setting icon", e));
  }
}
