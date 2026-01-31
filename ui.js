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

      // Check if value is complex (JSON)
      let valHtml = log.val;
      if (log.val.includes("{") || log.val.length > 50) {
        valHtml = `<div class="code-block">${log.val}</div>`;
      }

      // Check if desc is complex (JSON)
      let descHtml = log.desc;
      if (log.desc.includes("{")) {
        descHtml = `<div class="code-block">${log.desc}</div>`;
      }

      step.innerHTML = `
                <div class="step-meta">
                    <span class="step-id">#${log.rowId}</span>
                    <span class="step-time">${log.time}</span>
                </div>
                <div class="step-main">
                    <div class="step-header">
                        <span class="step-type">${log.type}</span>
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
