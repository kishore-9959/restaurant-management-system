/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - EXCEL EXPORT UTILITY
 * File: backend/report-service/src/utils/excelExporter.js
 * Description: Generates styled Excel spreadsheets (.xlsx) from report datasets.
 * ============================================================================
 */

const ExcelJS = require('exceljs');

/**
 * Creates and formats an Excel workbook for streaming download.
 * @param {Object} options
 * @param {string} options.title - Report title
 * @param {string} options.sheetName - Worksheet name
 * @param {Array<Object>} options.columns - [{ header: 'Date', key: 'SaleDate', width: 15 }]
 * @param {Array<Object>} options.rows - Array of data objects
 * @param {Object} options.metadata - Report generation metadata (filters, branch, date)
 * @returns {Promise<Buffer>}
 */
async function generateExcelWorkbook({ title, sheetName = 'Report', columns, rows = [], metadata = {} }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Restaurant Management System (RMS)';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  // Title Row
  worksheet.mergeCells('A1', `${String.fromCharCode(64 + Math.max(columns.length, 3))}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate-800
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  // Metadata Row
  worksheet.mergeCells('A2', `${String.fromCharCode(64 + Math.max(columns.length, 3))}2`);
  const metaCell = worksheet.getCell('A2');
  const metaText = `Generated: ${new Date().toISOString()} | Branch: ${metadata.branchId || 'All Branches'} | Range: ${metadata.startDate || 'N/A'} to ${metadata.endDate || 'N/A'}`;
  metaCell.value = metaText;
  metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(2).height = 18;

  // Blank row
  worksheet.addRow([]);

  // Column Headers (Row 4)
  const headerRow = worksheet.addRow(columns.map(c => c.header));
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }, // Primary Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF1D4ED8' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Data Rows
  rows.forEach((row, rowIndex) => {
    const values = columns.map(col => {
      const val = row[col.key];
      return val !== undefined && val !== null ? val : '';
    });
    const dataRow = worksheet.addRow(values);
    dataRow.height = 20;

    // Alternate row shading (Zebra striping)
    const isEven = rowIndex % 2 === 0;
    dataRow.eachCell((cell, colIndex) => {
      cell.font = { name: 'Arial', size: 9.5 };
      cell.alignment = { vertical: 'middle' };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }, // Slate-50
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Currency / Number formatting
      const colDef = columns[colIndex - 1];
      if (colDef && colDef.format === 'currency') {
        cell.numFmt = '"₹"#,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (colDef && colDef.format === 'number') {
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
  });

  // Set explicit column widths
  columns.forEach((col, i) => {
    worksheet.getColumn(i + 1).width = col.width || Math.max(col.header.length + 4, 14);
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generateExcelWorkbook,
};

