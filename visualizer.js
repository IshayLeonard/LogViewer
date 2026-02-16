import { parseAllData, groupLogsByModule } from "./parser.js";
import { renderGroupedLogs, renderParticipantData } from "./ui.js";

const timelineContainer = document.getElementById("timeline");
const participantBody = document.getElementById("participantBody");

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Load Settings (Wide View)
  const settings = await chrome.storage.local.get({ wideView: false });
  if (settings.wideView) {
    document.body.classList.add("wide-view");
  }

  // 2. Load Data
  const data = await chrome.storage.local.get("pending_log_data");
  if (data.pending_log_data) {
    visualizeLog(data.pending_log_data);
    // Optional: Clear after loading so it doesn't persist forever?
    // Usually better to keep it so refresh works.
  } else {
    timelineContainer.innerHTML =
      '<div class="error">No data found to visualize.</div>';
  }
});

// Tab Switching Logic (Copied from popup.js - logic is identical)
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn, .tab-content")
      .forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

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
  } catch (e) {
    timelineContainer.innerHTML = `<div class="error">Invalid JSON: ${e.message}</div>`;
  }
}
