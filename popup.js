import { parseAllData, groupLogsByModule } from "./parser.js";
import {
  renderGroupedLogs,
  renderParticipantData,
  renderHistoryList,
} from "./ui.js";
import { saveToHistory, getHistory } from "./history.js";

// DOM Elements
const homeView = document.getElementById("home-view");
const visualizationView = document.getElementById("visualization-view");

const jsonInput = document.getElementById("jsonInput");
const visualizeBtn = document.getElementById("visualizeBtn");
const historyListContainer = document.getElementById("historyList");

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

    // Render Flow
    const groupedLogs = groupLogsByModule(ivrLogs);
    renderGroupedLogs(groupedLogs, timelineContainer);

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
