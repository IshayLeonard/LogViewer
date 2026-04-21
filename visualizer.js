import { parseAllData, groupLogsByModule, filterGroups } from "./parser.js";
import { renderGroupedLogs, renderParticipantData, renderFilterBar } from "./ui.js";

const filterBarContainer  = document.getElementById("filterBar");
const timelineGroups      = document.getElementById("timelineGroups");
const participantBody     = document.getElementById("participantBody");

// Full unfiltered groups – kept in module scope so the filter callback can access them
let allGroups = [];

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
  } else {
    timelineGroups.innerHTML =
      '<div class="error">No data found to visualize.</div>';
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

function visualizeLog(inputJsonString) {
  timelineGroups.innerHTML = "";
  participantBody.innerHTML = "";

  try {
    const json = JSON.parse(inputJsonString);
    const { ivrLogs, otherData } = parseAllData(json);

    allGroups = groupLogsByModule(ivrLogs);

    // Render filter bar – options are always built from the full dataset
    renderFilterBar(allGroups, filterBarContainer, (filters) => {
      const filtered = filterGroups(allGroups, filters);
      renderGroupedLogs(filtered, timelineGroups);

      // Update the log count shown in the bar
      const visibleCount = filtered.reduce((sum, g) => sum + g.entries.length, 0);
      filterBarContainer.updateCount(visibleCount);
    });

    // Initial render (no filters active)
    renderGroupedLogs(allGroups, timelineGroups);

    // Render Participant Data
    renderParticipantData(otherData, participantBody);
  } catch (e) {
    timelineGroups.innerHTML = `<div class="error">Invalid JSON: ${e.message}</div>`;
  }
}
