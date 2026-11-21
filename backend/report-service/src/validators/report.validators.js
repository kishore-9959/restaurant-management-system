/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - REPORT REQUEST VALIDATORS
 * File: backend/report-service/src/validators/report.validators.js
 * ============================================================================
 */

function sanitizeDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseInteger(val, defaultVal = null, min = 1, max = 1000) {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = parseInt(val, 10);
  if (isNaN(num)) return defaultVal;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

function validateReportParams(req) {
  const errors = [];
  const query = req.query || {};

  // Date validations
  if (query.startDate && !sanitizeDate(query.startDate)) {
    errors.push({ field: 'startDate', message: 'startDate must be a valid ISO-8601 date string.' });
  }
  if (query.endDate && !sanitizeDate(query.endDate)) {
    errors.push({ field: 'endDate', message: 'endDate must be a valid ISO-8601 date string.' });
  }

  // BranchId validation
  if (query.branchId && isNaN(parseInt(query.branchId, 10))) {
    errors.push({ field: 'branchId', message: 'branchId must be a valid integer.' });
  }

  // Interval validation
  if (query.interval && !['HOUR', 'DAY', 'WEEK', 'MONTH'].includes(query.interval.toUpperCase())) {
    errors.push({ field: 'interval', message: 'interval must be one of: HOUR, DAY, WEEK, MONTH.' });
  }

  // Format validation
  if (query.format && !['excel', 'xlsx', 'csv', 'pdf'].includes(query.format.toLowerCase())) {
    errors.push({ field: 'format', message: 'format must be one of: excel, csv, pdf.' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      branchId: query.branchId ? parseInt(query.branchId, 10) : null,
      restaurantId: query.restaurantId ? parseInt(query.restaurantId, 10) : null,
      categoryId: query.categoryId ? parseInt(query.categoryId, 10) : null,
      ingredientId: query.ingredientId ? parseInt(query.ingredientId, 10) : null,
      year: query.year ? parseInt(query.year, 10) : new Date().getFullYear(),
      topN: parseInteger(query.topN, 10, 1, 100),
      interval: query.interval ? query.interval.toUpperCase() : 'DAY',
      startDate: sanitizeDate(query.startDate),
      endDate: sanitizeDate(query.endDate),
      format: (query.format || 'excel').toLowerCase(),
      page: parseInteger(query.page, 1, 1, 10000),
      limit: parseInteger(query.limit, 20, 1, 100),
      category: query.category ? String(query.category).trim() : null,
      type: query.type ? String(query.type).trim() : null,
    },
  };
}

module.exports = {
  validateReportParams,
  parseInteger,
  sanitizeDate,
};

