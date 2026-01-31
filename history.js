import { calculateDuration } from "./utils.js";
import { parseAllData } from "./parser.js";

const HISTORY_KEY = "ivr_log_history";
const MAX_HISTORY = 15;

export function getHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
}

export function saveToHistory(rawJsonString) {
  try {
    const json = JSON.parse(rawJsonString);
    // We parse it temporarily just to extract metadata
    const { ivrLogs } = parseAllData(json);

    if (ivrLogs.length === 0) return; // Don't save empty/invalid flows

    const startTime = ivrLogs[0].fullTime;
    const endTime = ivrLogs[ivrLogs.length - 1].fullTime;
    const duration = calculateDuration(startTime, endTime);
    const startModule = ivrLogs[0].module;

    const newRecord = {
      id: Date.now().toString(), // unique id
      timestamp: new Date().toISOString(), // when it was saved
      startTime: startTime,
      duration: duration,
      startModule: startModule,
      logCount: ivrLogs.length,
      rawJson: rawJsonString,
    };

    const history = getHistory();

    // Add to top
    history.unshift(newRecord);

    // Keep only last 15
    if (history.length > MAX_HISTORY) {
      history.length = MAX_HISTORY;
    }

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      if (e.name === "QuotaExceededError") {
        // If we hit quota, try removing the last 5 items to make space
        const reducedHistory = history.slice(
          0,
          Math.max(0, history.length - 5),
        );
        localStorage.setItem(HISTORY_KEY, JSON.stringify(reducedHistory));
      }
    }
  } catch (e) {
    console.error("Failed to save history", e);
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
