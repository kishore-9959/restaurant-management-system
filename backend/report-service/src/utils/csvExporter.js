/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CSV EXPORT UTILITY
 * File: backend/report-service/src/utils/csvExporter.js
 * Description: Generates RFC-4180 compliant CSV streams from report data.
 * ============================================================================
 */

/**
 * Escapes a cell value for RFC-4180 CSV compliance.
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC-4180 CSV string from columns and rows.
 * @param {Array<Object>} columns - [{ header: 'Date', key: 'SaleDate' }]
 * @param {Array<Object>} rows - Data objects
 * @returns {string}
 */
function generateCsv({ columns, rows = [] }) {
  const headerLine = columns.map(c => escapeCsvValue(c.header)).join(',');
  const lines = [headerLine];

  for (const row of rows) {
    const rowValues = columns.map(c => escapeCsvValue(row[c.key]));
    lines.push(rowValues.join(','));
  }

  return lines.join('\r\n');
}

module.exports = {
  generateCsv,
};

