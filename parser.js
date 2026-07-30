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
      } catch (e) { }

      ivrLogs.push({
        rowId: keyMatch[1],
        fullTime: keyMatch[2], // Keep full time for calculations
        time: displayTime,
        module: keyMatch[3],
        point: keyMatch[4].replaceAll("__", "."),
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
 * Extracts participant attributes from a conversation API response based on the desired purpose.
 * @param {Object} conversationJson - The raw JSON response from GET /api/v2/conversations/{id}
 * @param {string} targetPurpose - The target participant purpose (e.g. "External", "Internal", "customer")
 * @returns {Object} A formatted object ready for `parseAllData`, or empty object if none found.
 */
export function extractAttributesFromConversation(conversationJson, targetPurpose) {
  if (!conversationJson || !Array.isArray(conversationJson.participants)) {
    return {};
  }

  // Find the first participant matching the target purpose (or participantType for older compatibility)
  const participant = conversationJson.participants.find(p => 
    p.purpose === targetPurpose || p.participantType === targetPurpose
  );

  if (participant && participant.attributes) {
    // Format to match the structure that `parseAllData` expects ({"ATTRIBUTES...": "..."})
    const formatted = {};
    for (const [key, value] of Object.entries(participant.attributes)) {
      formatted[`ATTRIBUTES.${key}`] = value;
    }
    return formatted;
  }

  return {};
}
