import {
  highlightErrorWords,
  highlightWarningWords,
  getLogHighlights,
} from "./highlighter.js";
import { groupLogsByModule } from "./parser.js";

export function renderGroupedLogs(groups, container) {
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

/**
 * Injects a search + filter bar into `timelineContainer`, then renders
 * the log entries below it. Preserves original group boundaries when
 * filtering — a module that appears in two separate runs stays as two
 * groups even when only that module is selected.
 *
 * @param {object[]} allLogs  - flat sorted array from parseAllData
 * @param {HTMLElement} timelineContainer - the #timeline element
 */
export function setupFilters(allLogs, timelineContainer) {
  timelineContainer.innerHTML = "";

  // Pre-compute original groups once — preserves module-run boundaries
  const originalGroups = groupLogsByModule(allLogs);

  // ── Filter Bar ──────────────────────────────────────────────────────
  const filterBar = document.createElement("div");
  filterBar.className = "filter-bar";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "filter-search";
  searchInput.placeholder = "Search in logs...";

  const moduleSelect = document.createElement("select");
  moduleSelect.className = "filter-select";
  moduleSelect.title = "Filter by module";

  const typeSelect = document.createElement("select");
  typeSelect.className = "filter-select";
  typeSelect.title = "Filter by IVR Point Type";

  const clearBtn = document.createElement("button");
  clearBtn.className = "filter-clear-btn";
  clearBtn.textContent = "✕ Clear";

  const resultCount = document.createElement("span");
  resultCount.className = "filter-result-count";

  filterBar.appendChild(searchInput);
  filterBar.appendChild(moduleSelect);
  filterBar.appendChild(typeSelect);
  filterBar.appendChild(clearBtn);
  filterBar.appendChild(resultCount);
  timelineContainer.appendChild(filterBar);

  // ── Entries Container ────────────────────────────────────────────────
  const logEntriesContainer = document.createElement("div");
  logEntriesContainer.className = "log-entries-container";
  timelineContainer.appendChild(logEntriesContainer);

  // ── State ────────────────────────────────────────────────────────────
  let currentSearch = "";
  let currentModule = "";
  let currentType = "";

  // ── Helpers ──────────────────────────────────────────────────────────
  function uniqueSorted(logs, key) {
    return [...new Set(logs.map((l) => l[key]))].sort();
  }

  function populateSelect(select, items, allLabel, keepVal) {
    const prev = keepVal !== undefined ? keepVal : select.value;
    select.innerHTML = `<option value="">${allLabel}</option>`;
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      if (item === prev) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function initDropdowns() {
    populateSelect(moduleSelect, uniqueSorted(allLogs, "module"), "All Modules", "");
    populateSelect(typeSelect, uniqueSorted(allLogs, "type"), "All Types", "");
  }

  // ── Core: filter entries within each original group ───────────────────
  function applyFilters() {
    const search = currentSearch.toLowerCase();

    const filteredGroups = originalGroups
      .map((group) => {
        const entries = group.entries.filter((log) => {
          const okModule = !currentModule || log.module === currentModule;
          const okType   = !currentType   || log.type   === currentType;
          const okSearch = !search ||
            [log.module, log.type, log.val, log.desc, log.point]
              .some((f) => f && f.toLowerCase().includes(search));
          return okModule && okType && okSearch;
        });
        return { ...group, entries };
      })
      .filter((g) => g.entries.length > 0);

    // Cascade: available modules = those that have any log matching current type
    const byType   = allLogs.filter((l) => !currentType   || l.type   === currentType);
    const byModule = allLogs.filter((l) => !currentModule || l.module === currentModule);
    populateSelect(moduleSelect, uniqueSorted(byType,   "module"), "All Modules", currentModule);
    populateSelect(typeSelect,   uniqueSorted(byModule, "type"),   "All Types",   currentType);

    // Result count badge
    const totalFiltered = filteredGroups.reduce((s, g) => s + g.entries.length, 0);
    const isFiltered = currentSearch || currentModule || currentType;
    resultCount.textContent = isFiltered
      ? `${totalFiltered} / ${allLogs.length} entries`
      : "";

    // Re-render
    logEntriesContainer.innerHTML = "";
    renderGroupedLogs(filteredGroups, logEntriesContainer);
  }

  // ── Events ───────────────────────────────────────────────────────────
  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value;
    applyFilters();
  });

  moduleSelect.addEventListener("change", () => {
    currentModule = moduleSelect.value;
    applyFilters();
  });

  typeSelect.addEventListener("change", () => {
    currentType = typeSelect.value;
    applyFilters();
  });

  clearBtn.addEventListener("click", () => {
    currentSearch = "";
    currentModule = "";
    currentType = "";
    searchInput.value = "";
    initDropdowns();
    applyFilters();
  });

  // ── Init ─────────────────────────────────────────────────────────────
  initDropdowns();
  applyFilters();
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
