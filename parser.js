import { stringToColor } from "./utils.js";

export function parseAllData(json) {
  const ivrLogs = [];
  const otherData = [];

  const keyRegex = /ATTRIBUTES\.(\d{3}):(.+?Z):(.*?):(.*)/;
  const valueRegex =
    /Ivr Point Type:\s*(.*?)\s*[,;]\s*Ivr Point Value:\s*(.*?)\s*[,;]\s*(?:Ivr Point Desc:)\s*([\s\S]*)/i;

  for (const [key, value] of Object.entries(json)) {
    const keyMatch = key.match(keyRegex);

    if (keyMatch) {
      // It's a structured IVR log
      const valMatch = value.match(valueRegex);
      let displayTime = keyMatch[2];
      try {
        // Clean up time for display: remove date T and Z, replace __ with .
        displayTime = keyMatch[2]
          .split("T")[1]
          .split("Z")[0]
          .replace("__", ".");
      } catch (e) {}

      ivrLogs.push({
        rowId: keyMatch[1],
        fullTime: keyMatch[2], // Keep full time for calculations
        time: displayTime,
        module: keyMatch[3],
        point: keyMatch[4].replace("__", "."),
        type: valMatch ? valMatch[1].trim() : "Unknown",
        val: valMatch ? valMatch[2].trim() : value,
        desc: valMatch ? valMatch[3].trim() : "",
      });
    } else {
      // It's "Other" participant data
      otherData.push({ key: key.replace("ATTRIBUTES.", ""), value: value });
    }
  }

  return {
    ivrLogs: ivrLogs.sort((a, b) => a.rowId.localeCompare(b.rowId)),
    otherData: otherData.sort((a, b) => a.key.localeCompare(b.key)),
  };
}

export function groupLogsByModule(logs) {
  const groups = [];
  if (logs.length === 0) return groups;

  let currentGroup = {
    module: logs[0].module,
    color: stringToColor(logs[0].module),
    entries: [],
  };

  logs.forEach((log) => {
    if (log.module !== currentGroup.module) {
      // Module changed! Push old group and start new one
      groups.push(currentGroup);
      currentGroup = {
        module: log.module,
        color: stringToColor(log.module),
        entries: [],
      };
    }
    currentGroup.entries.push(log);
  });

  // Push the final group
  groups.push(currentGroup);
  return groups;
}

/**
 * Filters an already-grouped list of logs.
 * Operates on groups (not the flat list) so the original grouping structure
 * is preserved — e.g. two separate runs of the same module stay as
 * two distinct groups even after filtering.
 *
 * @param {Array}  groups        Output of groupLogsByModule()
 * @param {Object} filters
 * @param {string} filters.module  Module name to keep (empty = all)
 * @param {string} filters.type    Ivr Point Type to keep (empty = all)
 * @param {string} filters.search  Free-text search (empty = all)
 */
export function filterGroups(groups, { module: moduleFilter, type: typeFilter, search: searchQuery }) {
  const q = searchQuery ? searchQuery.toLowerCase() : "";

  return groups
    .map((group) => {
      // Module filter: drop the whole group if it doesn't match
      if (moduleFilter && group.module !== moduleFilter) return null;

      let entries = group.entries;

      // Type filter
      if (typeFilter) {
        entries = entries.filter((log) => log.type === typeFilter);
      }

      // Full-text search
      if (q) {
        entries = entries.filter(
          (log) =>
            log.module.toLowerCase().includes(q) ||
            log.type.toLowerCase().includes(q) ||
            log.point.toLowerCase().includes(q) ||
            log.val.toLowerCase().includes(q) ||
            log.desc.toLowerCase().includes(q)
        );
      }

      // Drop groups that became empty
      if (entries.length === 0) return null;

      return { ...group, entries };
    })
    .filter(Boolean);
}
