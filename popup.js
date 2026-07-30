import { parseAllData, extractAttributesFromConversation } from "./parser.js";
import {
  setupFilters,
  renderParticipantData,
  renderHistoryList,
} from "./ui.js";
import { saveToHistory, getHistory } from "./history.js";
import { checkAuthAndUpdateIcon, getCachedSession } from "./auth.js";

// DOM Elements
const homeView = document.getElementById("home-view");
const visualizationView = document.getElementById("visualization-view");

const modeToggleContainer = document.getElementById("modeToggleContainer");
const showFetchModeBtn = document.getElementById("showFetchMode");
const showPasteModeBtn = document.getElementById("showPasteMode");
const fetchSection = document.getElementById("fetchSection");
const pasteSection = document.getElementById("pasteSection");

const jsonInput = document.getElementById("jsonInput");
const visualizeBtn = document.getElementById("visualizeBtn");
const historyListContainer = document.getElementById("historyList");

const conversationIdInput = document.getElementById("conversationIdInput");
const purposeSelect = document.getElementById("purposeSelect");
const fetchBtn = document.getElementById("fetchBtn");
const authStatus = document.getElementById("authStatus");

const backBtn = document.getElementById("backBtn");
const timelineContainer = document.getElementById("timeline");
const participantBody = document.getElementById("participantBody");

// State Management
function showHome() {
  homeView.classList.remove("hidden");
  visualizationView.classList.add("hidden");

  // Refresh history list when showing home
  const history = getHistory();
  renderHistoryList(history, historyListContainer, (item) => {
    // On selection of a history item
    jsonInput.value = item.rawJson;
    handleVisualize(item.rawJson);
  });
}

function showVisualization() {
  homeView.classList.add("hidden");
  visualizationView.classList.remove("hidden");
}

const orgNameLabel = document.getElementById("orgNameLabel");

// Auth and Mode Management
async function initAuth() {
  const { isAuthenticated, session, error } = await checkAuthAndUpdateIcon();
  
  modeToggleContainer.classList.remove("hidden");
  
  if (isAuthenticated) {
    if (session && session.orgName) {
      orgNameLabel.textContent = `${session.orgName} (${session.environment})`;
      orgNameLabel.classList.remove("hidden");
    }
    authStatus.textContent = "🟢 Connected";
    authStatus.title = "Connected to Genesys Cloud";
    authStatus.className = "auth-badge connected";
    fetchBtn.disabled = false;
    showMode("fetch");
  } else {
    orgNameLabel.classList.add("hidden");
    authStatus.innerHTML = `🔴 Not Connected <span style="font-size: 9px; display: block; font-weight: normal; margin-top: 2px;">(${error || 'Unknown error'})</span>`;
    authStatus.title = error || 'Unknown error';
    authStatus.className = "auth-badge disconnected";
    fetchBtn.disabled = true;
    showMode("paste");
  }
}

function showMode(mode) {
  if (mode === "fetch") {
    fetchSection.classList.remove("hidden");
    pasteSection.classList.add("hidden");
    showFetchModeBtn.classList.add("active");
    showPasteModeBtn.classList.remove("active");
  } else {
    pasteSection.classList.remove("hidden");
    fetchSection.classList.add("hidden");
    showPasteModeBtn.classList.add("active");
    showFetchModeBtn.classList.remove("active");
  }
}

showFetchModeBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showMode("fetch");
});

showPasteModeBtn.addEventListener("click", (e) => {
  e.preventDefault();
  showMode("paste");
});

// Main Visualization Routing
async function handleVisualize(inputJsonString) {
  const settings = await chrome.storage.local.get({ visMode: "tab" }); // Default to tab
  const mode = settings.visMode;

  // Save for the external view to pick up
  if (mode === "tab" || mode === "window") {
    await chrome.storage.local.set({ pending_log_data: inputJsonString });
  }

  if (mode === "tab") {
    chrome.tabs.create({ url: "visualizer.html" });
  } else if (mode === "window") {
    chrome.windows.create({
      url: "visualizer.html",
      type: "popup",
      width: 1200,
      height: 800,
    });
  } else {
    // Popup Mode (Default fallback or explicit)
    if (visualizeLogInPopup(inputJsonString)) {
      showVisualization();
    }
  }
}

// In-Popup Rendering (Renamed from original visualizeLog)
function visualizeLogInPopup(inputJsonString) {
  timelineContainer.innerHTML = "";
  participantBody.innerHTML = "";

  try {
    const json = JSON.parse(inputJsonString);
    const { ivrLogs, otherData } = parseAllData(json);

    // Render Flow (with search + filter bar)
    setupFilters(ivrLogs, timelineContainer);

    // Render Participant Data
    renderParticipantData(otherData, participantBody);

    return true; // Success
  } catch (e) {
    // If error, we still show visualization view but with error message
    showVisualization();
    timelineContainer.innerHTML = `<div class="error">Invalid JSON: ${e.message}</div>`;
    return false;
  }
}

// Event: Visualize Button
visualizeBtn.addEventListener("click", () => {
  const input = jsonInput.value;
  // We validate basic JSON structure before saving/routing
  try {
    JSON.parse(input);
    saveToHistory(input);
    handleVisualize(input);
  } catch (e) {
    alert("Invalid JSON format");
  }
});

// Event: Fetch Button
fetchBtn.addEventListener("click", () => {
  const conversationId = conversationIdInput.value.trim();
  if (!conversationId) {
    alert("Please enter a conversation ID.");
    return;
  }

  const session = getCachedSession();
  if (!session) {
    alert("Not authenticated with Genesys Cloud.");
    return;
  }

  const purpose = purposeSelect.value;
  fetchBtn.textContent = "Fetching...";
  fetchBtn.disabled = true;

  chrome.runtime.sendMessage(
    {
      action: "fetch_conversation",
      environment: session.environment,
      token: session.token,
      conversationId: conversationId,
    },
    (response) => {
      fetchBtn.textContent = "Fetch Participant Data";
      fetchBtn.disabled = false;

      if (chrome.runtime.lastError) {
        alert("Extension communication error.");
        return;
      }

      if (!response.success) {
        alert(`Failed to fetch: ${response.error}`);
        if (response.error.includes("401")) {
          // Token expired, re-check auth to update UI
          initAuth();
        }
        return;
      }

      const attributes = extractAttributesFromConversation(response.data, purpose);
      
      if (Object.keys(attributes).length === 0) {
        alert(`No attributes found for purpose: ${purpose}`);
        return;
      }

      const rawJsonString = JSON.stringify(attributes, null, 2);
      
      try {
        JSON.parse(rawJsonString);
        saveToHistory(rawJsonString, conversationId);
        handleVisualize(rawJsonString);
      } catch (e) {
        alert("Failed to process attributes JSON.");
      }
    }
  );
});

// Event: Back Button
backBtn.addEventListener("click", () => {
  showHome();
});

// Tab Switching Logic
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn, .tab-content")
      .forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// Initialize
showHome();
initAuth();

