document.getElementById('visualizeBtn').addEventListener('click', () => {
    const input = document.getElementById('jsonInput').value;
    const timelineContainer = document.getElementById('timeline');
    const participantBody = document.getElementById('participantBody');
    
    timelineContainer.innerHTML = ''; 
    participantBody.innerHTML = '';

    try {
        const json = JSON.parse(input);
        const { ivrLogs, otherData } = parseAllData(json);
        
        // Render Flow
        const groupedLogs = groupLogsByModule(ivrLogs);
        renderGroupedLogs(groupedLogs, timelineContainer);
        
        // Render Participant Data
        renderParticipantData(otherData, participantBody);
        
    } catch (e) {
        timelineContainer.innerHTML = `<div class="error">Invalid JSON: ${e.message}</div>`;
    }
});

// Tab Switching Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

function parseAllData(json) {
    const ivrLogs = [];
    const otherData = [];

    const keyRegex = /ATTRIBUTES\.(\d{3}):(.+?Z):(.*?):(.*)/;
    const valueRegex = /Ivr Point Type:\s*(.*?)\s*[,;]\s*Ivr Point Value:\s*(.*?)\s*[,;]\s*(?:Ivr Point Desc:)\s*([\s\S]*)/i;

    for (const [key, value] of Object.entries(json)) {
        const keyMatch = key.match(keyRegex);

        if (keyMatch) {
            // It's a structured IVR log
            const valMatch = value.match(valueRegex);
            let displayTime = keyMatch[2];
            try { displayTime = keyMatch[2].split('T')[1].split('Z')[0].replace('__', '.'); } catch(e) {}

            ivrLogs.push({
                rowId: keyMatch[1],
                time: displayTime,
                module: keyMatch[3],
                point: keyMatch[4].replace('__', '.'),
                type: valMatch ? valMatch[1].trim() : "Unknown",
                val: valMatch ? valMatch[2].trim() : value,
                desc: valMatch ? valMatch[3].trim() : ""
            });
        } else {
            // It's "Other" participant data
            otherData.push({ key: key.replace('ATTRIBUTES.', ''), value: value });
        }
    }

    return { 
        ivrLogs: ivrLogs.sort((a, b) => a.rowId.localeCompare(b.rowId)),
        otherData: otherData.sort((a, b) => a.key.localeCompare(b.key))
    };
}

function renderParticipantData(data, container) {
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-key">${item.key}</td>
            <td class="p-value">${item.value}</td>
        `;
        container.appendChild(row);
    });
}

// NEW FUNCTION: Groups sequential logs if they belong to the same Module
function groupLogsByModule(logs) {
    const groups = [];
    if (logs.length === 0) return groups;

    let currentGroup = {
        module: logs[0].module,
        color: stringToColor(logs[0].module),
        entries: []
    };

    logs.forEach(log => {
        if (log.module !== currentGroup.module) {
            // Module changed! Push old group and start new one
            groups.push(currentGroup);
            currentGroup = {
                module: log.module,
                color: stringToColor(log.module),
                entries: []
            };
        }
        currentGroup.entries.push(log);
    });
    
    // Push the final group
    groups.push(currentGroup);
    return groups;
}

function renderGroupedLogs(groups, container) {
    if (groups.length === 0) {
        container.innerHTML = '<div class="info">No matching IVR logs found.</div>';
        return;
    }

    groups.forEach(group => {
        // Create the Section Container
        const section = document.createElement('div');
        section.className = 'module-section';
        section.style.borderLeftColor = group.color; // The colored stripe

        // Header
        const header = document.createElement('div');
        header.className = 'module-header';
        header.style.color = group.color;
        header.innerHTML = `
            <span class="module-title">${group.module}</span>
            <span class="module-count">${group.entries.length} steps</span>
        `;
        section.appendChild(header);

        // Steps Container
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'module-steps';

        group.entries.forEach(log => {
            const step = document.createElement('div');
            step.className = 'log-step';

            // Check if value is complex (JSON)
            let valHtml = log.val;
            if(log.val.includes('{') || log.val.length > 50) {
                valHtml = `<div class="code-block">${log.val}</div>`;
            }
            
            // Check if desc is complex (JSON)
            let descHtml = log.desc;
            if(log.desc.includes('{')) {
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

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to get a Hue between 0 and 360
    const hue = Math.abs(hash % 360);
    
    // Saturation at 70%, Lightness at 50% ensures it's colorful but not white
    return `hsl(${hue}, 70%, 50%)`;
}
