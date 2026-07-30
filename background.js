import { isAllowedGenesysHost, toApiHost, API_TIMEOUT_MS } from './genesys.js';

/**
 * Background service worker — proxies Genesys Cloud API calls
 * from the popup/visualizer to bypass CORS restrictions.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'validate_token') {
    handleValidateToken(message, sendResponse);
    return true; // Keep the message channel open for async response
  }

  if (message.action === 'fetch_conversation') {
    handleFetchConversation(message, sendResponse);
    return true;
  }

  return false;
});

/**
 * Validates a token by calling GET /api/v2/users/me
 * @param {Object} message - { action, environment, token }
 * @param {Function} sendResponse
 */
function handleValidateToken(message, sendResponse) {
  const { environment, token } = message;

  if (!environment || !token) {
    sendResponse({ success: false, error: 'Missing environment or token.' });
    return;
  }

  if (!isAllowedGenesysHost(environment)) {
    sendResponse({ success: false, error: `Unrecognized host: ${environment}` });
    return;
  }

  const apiHost = toApiHost(environment);
  const apiUrl = `https://${apiHost}/api/v2/users/me`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    signal: controller.signal
  })
    .then((response) => {
      if (response.status === 401) {
        throw new Error('Session expired or token invalid (401).');
      }
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then((data) => sendResponse({ success: true, data }))
    .catch((error) => {
      const errMessage = error.name === 'AbortError' ? 'Request timed out.' : error.message;
      console.error('Token validation failed:', errMessage);
      sendResponse({ success: false, error: errMessage });
    })
    .finally(() => clearTimeout(timeoutId));
}

/**
 * Fetches a conversation by ID via GET /api/v2/conversations/{id}
 * @param {Object} message - { action, environment, token, conversationId }
 * @param {Function} sendResponse
 */
function handleFetchConversation(message, sendResponse) {
  const { environment, token, conversationId } = message;

  if (!environment || !token || !conversationId) {
    sendResponse({ success: false, error: 'Missing environment, token, or conversation ID.' });
    return;
  }

  if (!isAllowedGenesysHost(environment)) {
    sendResponse({ success: false, error: `Unrecognized host: ${environment}` });
    return;
  }

  const apiHost = toApiHost(environment);
  const apiUrl = `https://${apiHost}/api/v2/conversations/${encodeURIComponent(conversationId)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    signal: controller.signal
  })
    .then((response) => {
      if (response.status === 401) {
        throw new Error('Session expired or token invalid (401).');
      }
      if (response.status === 404) {
        throw new Error('Conversation not found.');
      }
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then((data) => sendResponse({ success: true, data }))
    .catch((error) => {
      const errMessage = error.name === 'AbortError' ? 'Request timed out.' : error.message;
      console.error('Conversation fetch failed:', errMessage);
      sendResponse({ success: false, error: errMessage });
    })
    .finally(() => clearTimeout(timeoutId));
}
