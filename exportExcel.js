// Exports the raw JSON log to an .xlsx file.
//
// Layout (one column, A):
//   A1      {
//   A2..    "key": "value",     <- key text pure red, value text pure blue
//   A(last) }
//
// Colors are FONT colors (ARGB). Requires vendor/exceljs.min.js (window.ExcelJS).

const RED = "A31515"; // pure red
const BLUE = "0451A5"; // pure blue
const BLACK = "FF000000";
const EXCEL_CELL_LIMIT = 32767; // max characters per cell

const FONT = { name: "Consolas", size: 11 };

// Trim text so the whole cell (key + ": " + value + ",") stays under Excel's limit.
function fit(text, max) {
  return text.length > max ? text.slice(0, Math.max(0, max - 1)) + "…" : text;
}

// Strings/objects are JSON-quoted so the sheet reads like the original JSON.
function formatValue(v) {
  return JSON.stringify(v);
}


// Extract the numeric row ID from ATTRIBUTES.NNN:... keys for sorting.
// Keys that don't match (plain attributes, other data) return Infinity so they sink to the bottom.
function rowId(key) {
  const m = key.match(/^ATTRIBUTES\.(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
}

export async function exportJsonToExcel(json, fileName = "log.xlsx") {
  if (!window.ExcelJS) {
    throw new Error("ExcelJS library failed to load (vendor/exceljs.min.js).");
  }

  const workbook = new window.ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Log");
  sheet.getColumn(1).width = 120;

  // Sort by row ID (numeric), then alphabetically for non-IVR keys
  const entries = Object.entries(json).sort(([a], [b]) => {
    const idA = rowId(a);
    const idB = rowId(b);
    if (idA !== idB) return idA - idB;         // numeric sort for IVR rows
    return a.localeCompare(b);                  // alpha fallback
  });

  sheet.getCell("A1").value = "{";
  sheet.getCell("A1").font = { ...FONT, color: { argb: BLACK } };

  entries.forEach(([key, value], i) => {
    const row = i + 2;
    const comma = i < entries.length - 1 ? "," : "";
    // Budget the 32,767 limit: key and value are trimmed, never the structure.
    // Subtract 5 extra chars: 2 spaces indent + ": " + ","
    const k = fit(JSON.stringify(key), 2000);
    const v = fit(formatValue(value), EXCEL_CELL_LIMIT - k.length - 5);
    sheet.getCell(`A${row}`).value = {
      richText: [
        { text: "  ", font: { ...FONT, color: { argb: BLACK } } },
        { text: k, font: { ...FONT, color: { argb: RED } } },
        { text: ": ", font: { ...FONT, color: { argb: BLACK } } },
        { text: v, font: { ...FONT, color: { argb: BLUE } } },
        { text: comma, font: { ...FONT, color: { argb: BLACK } } },
      ],
    };
  });

  const lastRow = entries.length + 2;
  sheet.getCell(`A${lastRow}`).value = "}";
  sheet.getCell(`A${lastRow}`).font = { ...FONT, color: { argb: BLACK } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function timestampedName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `log_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.xlsx`;
}
