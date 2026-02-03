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
    if (visualizeLog(item.rawJson)) {
      showVisualization();
    }
  });
}

function showVisualization() {
  homeView.classList.add("hidden");
  visualizationView.classList.remove("hidden");
}

// Main Visualization Logic
function visualizeLog(inputJsonString) {
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
  if (visualizeLog(input)) {
    saveToHistory(input);
    showVisualization();
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
