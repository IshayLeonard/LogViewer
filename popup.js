import { parseAllData, groupLogsByModule } from "./parser.js";
import {
  renderGroupedLogs,
  renderParticipantData,
  renderHistoryList,
} from "./ui.js";
import { saveToHistory, getHistory, clearHistory } from "./history.js";

// DOM Elements
const visualizeBtn = document.getElementById("visualizeBtn");
const historyBtn = document.getElementById("historyBtn");
const historyModal = document.getElementById("historyModal");
const closeModal = document.getElementById("closeModal");
const historyListContainer = document.getElementById("historyList");
const timelineContainer = document.getElementById("timeline");
const participantBody = document.getElementById("participantBody");
const jsonInput = document.getElementById("jsonInput");

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
    timelineContainer.innerHTML = `<div class="error">Invalid JSON: ${e.message}</div>`;
    return false;
  }
}

// Event: Visualize Button
visualizeBtn.addEventListener("click", () => {
  const input = jsonInput.value;
  if (visualizeLog(input)) {
    // Only save to history if visualization was successful
    saveToHistory(input);
  }
});

// Event: History Button (Open Modal)
historyBtn.addEventListener("click", () => {
  const history = getHistory();
  renderHistoryList(history, historyListContainer, (item) => {
    // On selection of a history item
    jsonInput.value = item.rawJson;
    visualizeLog(item.rawJson);
    historyModal.classList.add("hidden");
  });
  historyModal.classList.remove("hidden");
});

// Event: Close Modal
closeModal.addEventListener("click", () => {
  historyModal.classList.add("hidden");
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === historyModal) {
    historyModal.classList.add("hidden");
  }
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
