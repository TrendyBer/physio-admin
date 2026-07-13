// ─────────────────────────────────────────────────────────────
// CSV Export utility
// Χρήση: exportToCsv("filename", columns, rows)
//   columns = [{ key: "name", label: "Όνομα" }, ...]
//   rows    = [{ name: "Νίκος", ... }, ...]
// Ανοίγει σωστά σε Excel με ελληνικά (UTF-8 BOM + semicolon)
// ─────────────────────────────────────────────────────────────

function escapeCell(value) {
  if (value === null || value === undefined) return "";

  // Arrays -> "a | b | c"
  if (Array.isArray(value)) value = value.join(" | ");

  // Booleans -> Ναι / Όχι
  if (typeof value === "boolean") value = value ? "Ναι" : "Όχι";

  let s = String(value);

  // Καθαρίζουμε newlines για να μη σπάσει η γραμμή
  s = s.replace(/\r?\n/g, " ");

  // Αν έχει ; ή " ή , το τυλίγουμε σε εισαγωγικά
  if (s.includes(";") || s.includes('"') || s.includes(",")) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }

  return s;
}

export function exportToCsv(filename, columns, rows) {
  const sep = ";"; // semicolon: το Excel σε ελληνικά locale το διαβάζει σωστά

  const header = columns.map(c => escapeCell(c.label)).join(sep);

  const body = rows
    .map(row => columns.map(c => escapeCell(row[c.key])).join(sep))
    .join("\r\n");

  const csv = header + "\r\n" + body;

  // BOM ώστε το Excel να δει σωστά τα ελληνικά
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `${filename}_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Βοηθητικό: μορφοποίηση ημερομηνίας για CSV
export function csvDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("el-GR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}