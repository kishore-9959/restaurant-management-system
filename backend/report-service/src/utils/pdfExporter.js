/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - PDF EXPORT UTILITY
 * File: backend/report-service/src/utils/pdfExporter.js
 * Description: Generates styled printable PDF reports using PDFKit.
 * ============================================================================
 */

const PDFDocument = require('pdfkit');

/**
 * Generates a formatted PDF report document buffer.
 * @param {Object} options
 * @param {string} options.title - Report Title
 * @param {Array<Object>} options.columns - [{ header: 'Date', key: 'SaleDate', width: 80 }]
 * @param {Array<Object>} options.rows - Data objects
 * @param {Object} options.metadata - Metadata (branch, date range)
 * @returns {Promise<Buffer>}
 */
function generatePdfReport({ title, columns, rows = [], metadata = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'portrait' });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // Header Banner
      doc
        .rect(40, 40, 515, 45)
        .fill('#1E293B');

      doc
        .fillColor('#FFFFFF')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(title.toUpperCase(), 50, 50, { width: 495, align: 'center' });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text('RESTAURANT MANAGEMENT SYSTEM (RMS) - CONFIDENTIAL INTELLIGENCE', 50, 70, { width: 495, align: 'center' });

      doc.moveDown(2);

      // Metadata section
      let y = 100;
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Generated: `, 40, y, { continued: true })
        .font('Helvetica')
        .text(`${new Date().toISOString()} | Branch: ${metadata.branchId || 'All Branches'} | Window: ${metadata.startDate || 'N/A'} to ${metadata.endDate || 'N/A'}`);

      y += 20;

      // Table Header
      doc.rect(40, y, 515, 20).fill('#3B82F6');
      let x = 45;
      const colWidth = Math.floor(505 / columns.length);

      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      columns.forEach(col => {
        doc.text(col.header, x, y + 5, { width: colWidth, align: col.format === 'currency' ? 'right' : 'left' });
        x += colWidth;
      });

      y += 20;

      // Table Rows
      doc.font('Helvetica').fontSize(8);
      const rowHeight = 18;

      rows.forEach((row, index) => {
        // Page overflow protection
        if (y + rowHeight > 780) {
          doc.addPage();
          y = 40;
        }

        const isEven = index % 2 === 0;
        if (isEven) {
          doc.rect(40, y, 515, rowHeight).fill('#F8FAFC');
        }

        let cellX = 45;
        doc.fillColor('#1E293B');

        columns.forEach(col => {
          let val = row[col.key];
          if (val === undefined || val === null) val = '-';
          if (col.format === 'currency' && typeof val === 'number') {
            val = `₹${val.toFixed(2)}`;
          }

          doc.text(String(val), cellX, y + 4, {
            width: colWidth - 5,
            align: col.format === 'currency' ? 'right' : 'left',
            ellipsis: true,
          });
          cellX += colWidth;
        });

        y += rowHeight;
      });

      // Footer
      doc
        .fontSize(8)
        .fillColor('#94A3B8')
        .text('Page 1 of 1 - RMS Analytics Engine', 40, 800, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePdfReport,
};

