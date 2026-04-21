import {
  highlightErrorWords,
  highlightWarningWords,
  getLogHighlights,
} from "./highlighter.js";

export function renderGroupedLogs(groups, container) {
  container.innerHTML = "";
  if (groups.length === 0) {
    container.innerHTML = '<div class="info">No matching IVR logs found.</div>';
    return;
  }

  groups.forEach((group) => {
    // Create the Section Container
    const section = document.createElement("div");
    section.className = "module-section";
    section.style.borderLeftColor = group.color; // The colored stripe

    // Header
    const header = document.createElement("div");
    header.className = "module-header";
    header.style.color = group.color;
    header.innerHTML = `
            <span class="module-title">${group.module}</span>
            <span class="module-count">${group.entries.length} steps</span>
        `;
    section.appendChild(header);

    // Steps Container
    const stepsContainer = document.createElement("div");
    stepsContainer.className = "module-steps";

    group.entries.forEach((log) => {
      const step = document.createElement("div");
      step.className = "log-step";

      // ── Cross-field highlight checks ──
      const highlights = getLogHighlights(log);

      // ── Highlight type text ──
      const typeHtml = highlightErrorWords(log.type);

      // ── Highlight value text ──
      let valHtml;
      if (highlights.isReturnCodeError) {
        // Entire val is the error indicator (e.g. "8")
        valHtml = `<span class="highlight-error">${log.val}</span>`;
      } else if (highlights.isScheduleWarning) {
        // Only the warning words inside val get highlighted (no error scan needed)
        valHtml = highlightWarningWords(log.val);
      } else {
        // Apply both: errors first, then warnings on the same text
        valHtml = highlightWarningWords(highlightErrorWords(log.val));
      }

      // ── Highlight desc text ──
      let descHtml = highlightWarningWords(highlightErrorWords(log.desc));

      // ── Wrap complex / long content in code-block ──
      if (log.val.includes("{") || log.val.length > 50) {
        valHtml = `<div class="code-block">${valHtml}</div>`;
      }
      if (log.desc.includes("{")) {
        descHtml = `<div class="code-block">${descHtml}</div>`;
      }

      step.innerHTML = `
                <div class="step-meta">
                    <span class="step-id">#${log.rowId}</span>
                    <span class="step-time">${log.time}</span>
                </div>
                <div class="step-main">
                    <div class="step-header">
                        <span class="step-type">${typeHtml}</span>
                        <span class="step-point">${log.point}</span>
                    </div>
                    <div class="step-body">
                        <div class="step-row">
                            <span class="label">Val:</span> 
                            <span class="value">${valHtml}</span>
                        </div>
                        <div class="step-row">
                            <span class="label">Desc:</span> 
                            <span class="value">${descHtml}</span>
                        </div>
                    </div>
                </div>
            `;
      stepsContainer.appendChild(step);
    });

    section.appendChild(stepsContainer);
    container.appendChild(section);
  });
}

export function renderParticipantData(data, container) {
  data.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td class="p-key">${item.key}</td>
            <td class="p-value">${item.value}</td>
        `;
    container.appendChild(row);
  });
}

export function renderHistoryList(historyData, container, onSelect) {
  container.innerHTML = "";
  if (historyData.length === 0) {
    container.innerHTML = '<div class="info">No history yet.</div>';
    return;
  }

  historyData.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";

    // Format saved time
    const savedDate = new Date(item.timestamp).toLocaleString();

    div.innerHTML = `
            <div class="h-main">
                <span class="h-module">${item.startModule}</span>
                <span class="h-time">${savedDate}</span>
            </div>
            <div class="h-meta">
                <span>Steps: ${item.logCount}</span>
                <span>Duration: ${item.duration}</span>
            </div>
        `;

    div.onclick = () => onSelect(item);
    container.appendChild(div);
  });
}

/**
 * Renders the search + filter bar above the timeline.
 *
 * @param {Array}    allGroups       Full (unfiltered) grouped logs — used to
 *                                   populate dropdown options.
 * @param {Element}  container       The #filterBar DOM element.
 * @param {Function} onFilter        Called with { module, type, search } whenever
 *                                   any control changes.
 */
export function renderFilterBar(allGroups, container, onFilter) {
  // ── Collect unique modules and types from the full dataset ──
  const modules = [...new Set(allGroups.map((g) => g.module))].sort();
  const types = [
    ...new Set(allGroups.flatMap((g) => g.entries.map((e) => e.type))),
  ].sort();

  const totalLogs = allGroups.reduce((sum, g) => sum + g.entries.length, 0);

  container.innerHTML = `
    <div class="filter-bar">
      <input
        type="text"
        id="filterSearch"
        class="filter-input"
        placeholder="Search logs…"
        autocomplete="off"
      />
      <select id="filterModule" class="filter-select">
        <option value="">All Modules</option>
        ${modules.map((m) => `<option value="${m}">${m}</option>`).join("")}
      </select>
      <select id="filterType" class="filter-select">
        <option value="">All Types</option>
        ${types.map((t) => `<option value="${t}">${t}</option>`).join("")}
      </select>
      <button id="filterClear" class="filter-clear-btn" title="Clear filters">✕</button>
      <span id="filterCount" class="filter-count">${totalLogs} logs</span>
    </div>
  `;

  const searchInput = container.querySelector("#filterSearch");
  const moduleSelect = container.querySelector("#filterModule");
  const typeSelect = container.querySelector("#filterType");
  const clearBtn = container.querySelector("#filterClear");
  const countEl = container.querySelector("#filterCount");

  // Debounce helper – avoids re-rendering on every keystroke
  let debounceTimer;
  const triggerFilter = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const filters = {
        module: moduleSelect.value,
        type: typeSelect.value,
        search: searchInput.value.trim(),
      };
      const hasFilter = filters.module || filters.type || filters.search;
      clearBtn.style.opacity = hasFilter ? "1" : "0.4";
      onFilter(filters);
    }, 200);
  };

  // Update the results counter (called from outside via closure update)
  container.updateCount = (visibleLogs) => {
    countEl.textContent =
      visibleLogs === totalLogs
        ? `${totalLogs} logs`
        : `${visibleLogs} / ${totalLogs} logs`;
    countEl.classList.toggle("filter-count--active", visibleLogs !== totalLogs);
  };

  searchInput.addEventListener("input", triggerFilter);
  moduleSelect.addEventListener("change", triggerFilter);
  typeSelect.addEventListener("change", triggerFilter);

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    moduleSelect.value = "";
    typeSelect.value = "";
    clearBtn.style.opacity = "0.4";
    triggerFilter();
  });

  // Initial state: clear button dimmed
  clearBtn.style.opacity = "0.4";
}
