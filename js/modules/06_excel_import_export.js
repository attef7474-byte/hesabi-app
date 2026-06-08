/* Hesabi 1.0.67 - Excel import/export helpers module.
   This module centralizes safe CSV/Excel-adjacent import/export helpers.
   Existing item import/export functions keep their old names and delegate here. */
(function(){
  const MODULE_VERSION = '1.0.67';
  const MODULE_BUILD = 66;

  function normalizeCell(value){
    return String(value ?? '').trim().replace(/^\"|\"$/g, '');
  }

  function splitDelimitedLine(line){
    return String(line ?? '').split(/,|;|\t/).map(normalizeCell);
  }

  function parseDelimitedText(text){
    const lines = String(text ?? '').split(/\r?\n/).filter(Boolean);
    if (!lines.length) return { headers: [], rows: [], lines: [], empty: true };
    const headers = splitDelimitedLine(lines.shift());
    const rows = lines.map(splitDelimitedLine);
    return { headers, rows, lines, empty: false };
  }

  function indexOfHeader(headers, names){
    const wanted = (names || []).map(name => String(name).trim());
    return (headers || []).findIndex(header => {
      const h = String(header || '').trim();
      return wanted.includes(h) || wanted.includes(h.toLowerCase());
    });
  }

  function csvEscape(value){
    return '"' + String(value ?? '').replace(/"/g, '""') + '"';
  }

  function formatExportValue(row, column){
    const value = row ? row[column] : '';
    if (column === 'createdMs' && value) {
      try { return new Date(Number(value)).toLocaleString('ar-YE'); } catch (_) { return value; }
    }
    return value;
  }

  function buildCsv(columns, rows){
    const cols = Array.isArray(columns) ? columns : [];
    const body = (rows || []).map(row => cols.map(col => csvEscape(formatExportValue(row, col))).join(',')).join('\n');
    return '\ufeff' + cols.join(',') + '\n' + body;
  }

  function downloadBlob(filename, content, type){
    const blob = new Blob([content], { type: type || 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'hesabi-export.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return { ok: true, filename: a.download, bytes: content ? String(content).length : 0 };
  }

  function exportCsv(filename, columns, rows, options){
    const opts = options || {};
    try {
      const csv = buildCsv(columns, rows);
      const result = downloadBlob(filename, csv, 'text/csv;charset=utf-8');
      if (opts.showMessage !== false && typeof msg === 'function') msg('تم تجهيز ملف التصدير.', 'success');
      return Object.assign(result, { rows: (rows || []).length, columns: (columns || []).length });
    } catch (error) {
      const message = String(error && error.message || error);
      if (opts.showMessage !== false && typeof msg === 'function') msg('تعذر التصدير: ' + message, 'error');
      return { ok: false, error: message };
    }
  }

  function selfCheck(){
    const parsed = parseDelimitedText('name,barcode\nصنف,123');
    const csv = buildCsv(['name'], [{ name: 'صنف' }]);
    const probes = [
      { name: 'parseDelimitedText', ok: parsed.headers[0] === 'name' && parsed.rows[0] && parsed.rows[0][1] === '123' },
      { name: 'indexOfHeader', ok: indexOfHeader(['name', 'barcode'], ['barcode']) === 1 },
      { name: 'buildCsv', ok: csv.includes('"صنف"') }
    ];
    const api = window.hesabiExcelImportExport || {};
    const required = ['normalizeCell','splitDelimitedLine','parseDelimitedText','indexOfHeader','csvEscape','buildCsv','downloadBlob','exportCsv','selfCheck'];
    const missingApi = required.filter(name => typeof api[name] !== 'function');
    return { ok: missingApi.length === 0 && probes.every(item => item.ok), version: MODULE_VERSION, build: MODULE_BUILD, missingApi, probes };
  }

  window.hesabiExcelImportExport = Object.assign(window.hesabiExcelImportExport || {}, {
    version: MODULE_VERSION,
    build: MODULE_BUILD,
    normalizeCell,
    splitDelimitedLine,
    parseDelimitedText,
    indexOfHeader,
    csvEscape,
    buildCsv,
    downloadBlob,
    exportCsv,
    selfCheck
  });

  window.hesabiExcelImportExportSelfCheck = selfCheck;
})();
